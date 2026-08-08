-- =====================================================================
-- 005 — Audit log
--
-- Run AFTER 004. Re-runnable.
--
-- Who did what, to whom, when. Needed the day someone says "I never got that
-- money" or "I didn't suspend them" — and needed most on the day a main admin
-- was signed in as someone else, because then the person the system *thinks*
-- acted is not the person who acted.
--
-- Append-only. Nothing may edit or delete a row here, including us: a log that
-- can be tidied up is a log nobody can rely on.
-- =====================================================================

create table if not exists public.audit_log (
  id          uuid primary key default gen_random_uuid(),

  -- The real human. During impersonation this stays the main admin.
  actor_id    uuid references public.profiles(id) on delete set null,
  -- Who they were pretending to be, if anyone. Null in the normal case.
  acting_as   uuid references public.profiles(id) on delete set null,

  action      text not null,            -- 'wallet.topup', 'user.role', 'card.create' …
  target_type text,                     -- 'profile' | 'business' | 'wallet'
  target_id   uuid,

  -- Enough to reconstruct what changed, never enough to leak a card's contents.
  detail      jsonb not null default '{}'::jsonb,

  created_at  timestamptz not null default now()
);

create index if not exists audit_actor_idx  on public.audit_log (actor_id, created_at desc);
create index if not exists audit_target_idx on public.audit_log (target_type, target_id, created_at desc);
create index if not exists audit_time_idx   on public.audit_log (created_at desc);

alter table public.audit_log enable row level security;

-- Readable only by a main admin, and only through their own session. No insert,
-- update or delete policy exists for anybody: writes come from the server with
-- the service_role key, and there is deliberately no way to remove a row.
drop policy if exists "main admins read the audit log" on public.audit_log;
create policy "main admins read the audit log"
  on public.audit_log for select
  using (public.is_main_admin());

-- ---------------------------------------------------------------------
-- Deletion protection.
--
-- The service_role key bypasses RLS, so policies alone would not stop a stray
-- delete from our own server code. A trigger does, because triggers run for
-- everyone.
-- ---------------------------------------------------------------------
create or replace function public.audit_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'The audit log is append-only: rows cannot be % .', lower(TG_OP);
end;
$$;

drop trigger if exists audit_no_update on public.audit_log;
create trigger audit_no_update before update on public.audit_log
  for each row execute function public.audit_is_append_only();

drop trigger if exists audit_no_delete on public.audit_log;
create trigger audit_no_delete before delete on public.audit_log
  for each row execute function public.audit_is_append_only();
