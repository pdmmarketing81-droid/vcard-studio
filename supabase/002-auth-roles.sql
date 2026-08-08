-- =====================================================================
-- 002 — Accounts, roles and ownership
--
-- Run AFTER schema.sql, in the SQL Editor. Re-runnable.
--
-- Three kinds of user:
--   main_admin  — us. Sees and controls everything.
--   sub_admin   — reseller. Sees only the end users hanging off them.
--   end_user    — owns one or more cards. Sees only their own.
--
-- The hierarchy is one column: profiles.parent_id. An end_user points at
-- the sub_admin who sold to them. A sub_admin points at nobody.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles — one row per auth user, created automatically on signup
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,

  -- 'end_user' is the default on purpose. A new signup should arrive with
  -- the least power possible; promotion is a deliberate act by a main admin.
  role          text not null default 'end_user'
                check (role in ('main_admin', 'sub_admin', 'end_user')),

  -- Which sub_admin this user belongs to. Null for main admins and for
  -- sub_admins themselves. on delete set null, not cascade: if a reseller
  -- is removed their customers must survive so their cards can be
  -- transferred to us rather than vanishing.
  parent_id     uuid references public.profiles(id) on delete set null,

  full_name     text,
  phone         text,
  business_name text,

  -- Set when a sub_admin stops paying. Their cards then show our contact
  -- page instead of disappearing, so the end customer still reaches us.
  suspended     boolean not null default false,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists profiles_parent_idx on public.profiles (parent_id);
create index if not exists profiles_role_idx   on public.profiles (role);

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- A profile row appears the moment someone signs up. Without this an
-- account can exist in auth.users with no role anywhere, which every
-- policy below would then have to special-case.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, nullif(new.raw_user_meta_data->>'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helpers.
--
-- These are SECURITY DEFINER so they read profiles with RLS bypassed. A
-- policy on profiles that queried profiles directly would recurse for ever
-- and the table would simply stop answering.
-- ---------------------------------------------------------------------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_main_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role = 'main_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

/* True when the signed-in user may act for `target`:
     - it is them, or
     - they are a main admin, or
     - target is one of their end users.
   Every ownership policy in the app funnels through this one function, so
   the rule lives in exactly one place. */
create or replace function public.can_manage_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    target is not null
    and (
      target = auth.uid()
      or public.is_main_admin()
      or exists (
        select 1 from public.profiles p
        where p.id = target and p.parent_id = auth.uid()
      )
    );
$$;

-- ---------------------------------------------------------------------
-- Privilege guard.
--
-- Without this an end_user could simply UPDATE their own profile row and
-- set role = 'main_admin'. RLS lets them write the row; it does not care
-- which column they touched. So the sensitive columns are frozen for
-- everyone except a main admin.
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_privileges()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- No auth.uid() means this is not a browser: it is the service_role key or
  -- the SQL editor, both of which already bypass RLS completely. Blocking them
  -- here would protect nothing, and would leave no way to appoint the very
  -- first main admin. The guard exists to stop a *signed-in* user from editing
  -- their own row upwards, and such a user always has auth.uid() set.
  if auth.uid() is null or public.is_main_admin() then
    return new;
  end if;

  if new.role      is distinct from old.role
  or new.parent_id is distinct from old.parent_id
  or new.suspended is distinct from old.suspended then
    raise exception 'Only a main admin can change role, parent or suspension';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_privileges on public.profiles;
create trigger profiles_guard_privileges
  before update on public.profiles
  for each row execute function public.guard_profile_privileges();

-- ---------------------------------------------------------------------
-- RLS on profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "read reachable profiles" on public.profiles;
create policy "read reachable profiles"
  on public.profiles for select
  using (
    id = auth.uid()
    or public.is_main_admin()
    or parent_id = auth.uid()
  );

drop policy if exists "update reachable profiles" on public.profiles;
create policy "update reachable profiles"
  on public.profiles for update
  using (id = auth.uid() or public.is_main_admin() or parent_id = auth.uid())
  with check (id = auth.uid() or public.is_main_admin() or parent_id = auth.uid());

-- Inserts come from the signup trigger and from the server (service_role),
-- never from a browser, so no insert policy is granted here.

-- ---------------------------------------------------------------------
-- Ownership of cards
--
-- businesses.owner_id already exists in schema.sql and has been sitting
-- empty. The old "owners manage their cards" policy compared it to
-- auth.uid() directly, which gave a sub_admin no way to see the cards of
-- their own customers. Replaced with can_manage_user().
-- ---------------------------------------------------------------------
drop policy if exists "owners manage their cards" on public.businesses;
create policy "manage own and managed cards"
  on public.businesses for all
  using  (public.can_manage_user(owner_id))
  with check (public.can_manage_user(owner_id));

-- Same replacement for every content table.
do $$
declare t text;
begin
  foreach t in array array[
    'social_links', 'services', 'packages', 'testimonials',
    'gallery_items', 'videos', 'business_hours'
  ]
  loop
    execute format('drop policy if exists "owner writes" on public.%I', t);
    execute format($f$
      create policy "manage own and managed" on public.%I for all
      using (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id and public.can_manage_user(b.owner_id)
      ))
      with check (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id and public.can_manage_user(b.owner_id)
      ))
    $f$, t, t, t);
  end loop;
end $$;

-- Feedback is private customer data: readable by whoever may manage the
-- card, never by the public.
drop policy if exists "owners read their feedback" on public.feedback;
create policy "managers read feedback"
  on public.feedback for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = feedback.business_id and public.can_manage_user(b.owner_id)
    )
  );

-- =====================================================================
-- After this runs
--
-- 1. Create the two main admin accounts through the app's signup page (or
--    Supabase → Authentication → Add user).
--
-- 2. Promote them by hand — there is deliberately no code path that grants
--    main_admin, because anything that can grant it can be tricked into
--    granting it:
--
--      update public.profiles set role = 'main_admin'
--      where id in (select id from auth.users where email in
--                   ('...@gmail.com', '...@gmail.com'));
--
-- 3. Claim the four existing cards, which still have owner_id = null and
--    are therefore invisible to every policy above:
--
--      update public.businesses set owner_id = '<main admin uuid>'
--      where owner_id is null;
--
--    Until this is done the cards stay readable by the public (they are
--    published) and editable only through the server's service_role key,
--    which is how the current admin screen already works.
-- =====================================================================
