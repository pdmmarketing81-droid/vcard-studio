-- ---------------------------------------------------------------------
-- 006 — stop the public-read policy from following people into their
--       own dashboard.
--
-- The bug, exactly:
--
--   schema.sql grants "published cards are public" on businesses for
--   SELECT using (published = true), with no role restriction. That is
--   what makes /<slug> work for a stranger, and it is correct for that.
--
--   Postgres ORs row-level policies together. So for a signed-in user the
--   test was really:
--
--       can_manage_user(owner_id)  OR  published = true
--
--   The second half is true for every live card in the system. /my and
--   GET /api/admin/cards both read through the visitor's own session and
--   deliberately carry no owner filter, trusting the database to scope
--   the rows. The database was scoping them — to "everything published".
--
--   A brand-new customer signed up and was shown a list of every other
--   customer's card.
--
-- What this did NOT expose, checked before writing this fix:
--   * editing — /admin/[id]/edit and both GET and PATCH on
--     /api/admin/cards/[id] each call canManageCard() and answer 404.
--     Clicking Edit on someone else's card has never done anything.
--   * unpublished cards — the policy needs published = true, so drafts
--     were never in the list.
--   * feedback — it has its own policy and no public read at all.
--
--   Every row that leaked is a page already served to anyone who asks for
--   it. This was a bad listing, not a bad disclosure. It still should not
--   have shipped.
--
-- The fix: bind the public policies to the anon role. Public pages read
-- through `supabase` in src/lib/supabase.ts, a plain client with no
-- cookie attached, so those requests are always anon and keep working —
-- including for a visitor who happens to be signed in. A request that
-- carries a session is `authenticated`, and now falls through to the
-- ownership rule alone.
--
-- Safe to run more than once. Changes no data.
-- ---------------------------------------------------------------------

drop policy if exists "published cards are public" on public.businesses;
create policy "published cards are public"
  on public.businesses for select
  to anon
  using (published = true);

-- The same leak existed on every child table, and for the same reason.
-- Looped so that adding a table later cannot quietly miss one.
do $$
declare t text;
begin
  foreach t in array array[
    'social_links', 'services', 'packages', 'testimonials',
    'gallery_items', 'videos', 'business_hours'
  ]
  loop
    execute format('drop policy if exists "public read via published card" on public.%I', t);
    execute format($f$
      create policy "public read via published card" on public.%I for select
      to anon
      using (exists (
        select 1 from public.businesses b
        where b.id = %I.business_id and b.published = true
      ))
    $f$, t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Proof. Run this as a signed-in end user, not in the SQL editor — the
-- editor is service_role and bypasses RLS, so it will always return
-- everything and tell you nothing.
--
--   select count(*) from businesses;
--
-- Expected: the number of cards that person owns. Before this migration
-- it was the number of published cards in the whole system.
-- ---------------------------------------------------------------------
