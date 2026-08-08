-- =====================================================================
-- vCard Studio — complete schema
--
-- Run this ONCE on a fresh Supabase project (SQL Editor → paste → Run).
-- Re-runnable: every statement is guarded, so running it twice is safe.
--
-- This file is the whole current schema. Earlier versions of it only
-- covered the first migration and drifted out of date as features were
-- added; this one is regenerated from the live database.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- businesses: one row == one live card
-- ---------------------------------------------------------------------
create table if not exists public.businesses (
  id            uuid primary key default gen_random_uuid(),

  -- NULL while this is an internal agency tool. When accounts arrive,
  -- each card gets attached to the user who owns it. The policies below
  -- are already written against this column.
  owner_id      uuid references auth.users(id) on delete cascade,

  -- routing
  slug          text not null unique,
  custom_domain text unique,

  -- identity
  name          text not null,
  tagline       text,
  about         text,

  -- media
  logo_url      text,
  cover_url     text,
  cover_type    text not null default 'image'
                check (cover_type in ('image', 'video')),

  -- contact
  email         text,
  phone         text,
  whatsapp      text,
  address       text,
  website       text,

  -- branding
  theme_color   text not null default '#0f766e',
  template      text not null default 'classic',
  -- Template-specific fields (doctor: qualifications, restaurant: cuisine …)
  extras        jsonb not null default '{}'::jsonb,
  -- Per-card design overrides — see src/lib/design.ts
  design        jsonb not null default '{}'::jsonb,

  -- review funnel
  review_enabled    boolean not null default false,
  google_review_url text,
  feedback_email    text,
  -- Ratings at or above this go to Google; below it open the private form.
  -- Kept as a column so the behaviour is a setting, not a code change.
  review_threshold  smallint not null default 4
                    check (review_threshold between 1 and 5),
  review_headline   text,
  review_thanks     text,

  -- state
  published     boolean not null default true,
  view_count    integer not null default 0,

  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists businesses_slug_idx on public.businesses (slug);
create index if not exists businesses_custom_domain_idx
  on public.businesses (custom_domain) where custom_domain is not null;
create index if not exists businesses_owner_idx on public.businesses (owner_id);

-- ---------------------------------------------------------------------
-- Content tables. All cascade-delete with their card and carry
-- sort_order, which is what the admin's drag-to-reorder writes.
-- ---------------------------------------------------------------------
create table if not exists public.social_links (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  platform    text not null,
  url         text not null,
  label       text,
  sort_order  integer not null default 0
);

create table if not exists public.services (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title       text not null,
  description text,
  image_url   text,
  sort_order  integer not null default 0
);

create table if not exists public.packages (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid not null references public.businesses(id) on delete cascade,
  title         text not null,
  description   text,
  image_url     text,
  net_price     numeric(12,2),
  selling_price numeric(12,2),
  currency      text not null default 'INR',
  badge         text,
  sort_order    integer not null default 0
);

create table if not exists public.testimonials (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  author      text not null,
  role        text,
  avatar_url  text,
  quote       text not null,
  rating      smallint check (rating between 1 and 5),
  sort_order  integer not null default 0
);

create table if not exists public.gallery_items (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  image_url   text not null,
  category    text,
  caption     text,
  sort_order  integer not null default 0
);

create table if not exists public.videos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider    text not null default 'youtube'
              check (provider in ('youtube', 'instagram', 'custom')),
  url         text not null,
  title       text,
  sort_order  integer not null default 0
);

create table if not exists public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = Sunday
  open_time   time,
  close_time  time,
  closed      boolean not null default false,
  unique (business_id, day_of_week)
);

-- ---------------------------------------------------------------------
-- feedback: private reviews captured from /r/[slug]
-- ---------------------------------------------------------------------
create table if not exists public.feedback (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses(id) on delete cascade,
  rating         smallint not null check (rating between 1 and 5),
  name           text,
  phone          text,
  email          text,
  message        text,
  attachments    jsonb not null default '[]'::jsonb,
  -- Ratings that were sent to Google are recorded too, so the admin sees
  -- the real distribution rather than only the complaints.
  went_to_google boolean not null default false,
  emailed        boolean not null default false,
  email_error    text,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------
create index if not exists social_links_business_idx  on public.social_links   (business_id, sort_order);
create index if not exists services_business_idx      on public.services       (business_id, sort_order);
create index if not exists packages_business_idx      on public.packages       (business_id, sort_order);
create index if not exists testimonials_business_idx  on public.testimonials   (business_id, sort_order);
create index if not exists gallery_business_idx       on public.gallery_items  (business_id, sort_order);
create index if not exists videos_business_idx        on public.videos         (business_id, sort_order);
create index if not exists hours_business_idx         on public.business_hours (business_id, day_of_week);
create index if not exists feedback_business_idx      on public.feedback       (business_id, created_at desc);

-- ---------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists businesses_touch_updated_at on public.businesses;
create trigger businesses_touch_updated_at
  before update on public.businesses
  for each row execute function public.touch_updated_at();

create or replace function public.increment_view_count(card_slug text)
returns void language sql security definer set search_path = public as $$
  update public.businesses set view_count = view_count + 1 where slug = card_slug;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
--
--   * anyone may READ a published card — that is the whole point
--   * nobody may WRITE with the anon key; all writes go through the
--     server using the service_role key, which bypasses RLS
--   * the owner_id policies are dormant until Auth is switched on, at
--     which point they start scoping every table to its owner with no
--     further migration
--   * feedback is never publicly readable — it is private customer data
-- ---------------------------------------------------------------------
alter table public.businesses enable row level security;

drop policy if exists "published cards are public" on public.businesses;
create policy "published cards are public"
  on public.businesses for select
  using (published = true);

drop policy if exists "owners manage their cards" on public.businesses;
create policy "owners manage their cards"
  on public.businesses for all
  using  (auth.uid() is not null and auth.uid() = owner_id)
  with check (auth.uid() is not null and auth.uid() = owner_id);

-- Same rule for every content table, applied in a loop so none is missed.
do $$
declare t text;
begin
  foreach t in array array[
    'social_links', 'services', 'packages', 'testimonials',
    'gallery_items', 'videos', 'business_hours'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format('drop policy if exists "public read via published card" on public.%I', t);
    execute format($f$
      create policy "public read via published card" on public.%I for select
      using (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id and b.published = true
      ))
    $f$, t, t);

    execute format('drop policy if exists "owner writes" on public.%I', t);
    execute format($f$
      create policy "owner writes" on public.%I for all
      using (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id
          and auth.uid() is not null and b.owner_id = auth.uid()
      ))
      with check (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id
          and auth.uid() is not null and b.owner_id = auth.uid()
      ))
    $f$, t, t, t);
  end loop;
end $$;

alter table public.feedback enable row level security;

drop policy if exists "owners read their feedback" on public.feedback;
create policy "owners read their feedback"
  on public.feedback for select
  using (
    exists (
      select 1 from public.businesses b
      where b.id = feedback.business_id
        and auth.uid() is not null
        and b.owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------
-- Storage bucket for logos, covers, gallery and feedback attachments.
-- Public read, service-role write.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('card-media', 'card-media', true)
on conflict (id) do nothing;

drop policy if exists "card media is publicly readable" on storage.objects;
create policy "card media is publicly readable"
  on storage.objects for select
  using (bucket_id = 'card-media');
