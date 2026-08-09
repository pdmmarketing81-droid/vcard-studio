-- ---------------------------------------------------------------------
-- 009 — the ₹599 plan never included reviews. Undo 008's backfill for it.
--
-- Applied 9 Aug 2026.
--
-- 008 granted reviews to every existing plan, on the principle that a
-- migration must not take a working feature away from someone paying for it.
-- Applied to card-basic that principle was simply wrong. The plan is called
-- "Digital Card" and sits next to "Card + Reviews" at ₹999 — reviews were
-- never part of it. The backfill did not preserve a promise, it invented one,
-- and the gate built in 008 then had no effect on the one plan it existed for.
--
-- Reseller plans keep the grant. Reselling the funnel is the point of them.
-- ---------------------------------------------------------------------

update public.plans set grants = '{"reviews": false}'::jsonb where slug = 'card-basic';

-- Anyone already on that plan, so the change is not only for future buyers.
update public.reseller_terms t
   set grants = '{"reviews": false}'::jsonb
  from public.profiles p
 where p.id = t.profile_id
   and p.plan_id = (select id from public.plans where slug = 'card-basic');

-- And switch off any funnel that is now unpaid for.
update public.businesses b
   set review_enabled = false
 where b.review_enabled = true
   and b.owner_id is not null
   and not public.has_grant(b.owner_id, 'reviews');

-- ---------------------------------------------------------------------
-- Check:
--   select u.email, public.has_grant(p.id,'reviews')
--   from profiles p join auth.users u on u.id = p.id;
--
-- A reseller's customer still shows true, and that is correct — the reseller
-- bought the plan and the reseller pays, so the grant follows the payer.
-- ---------------------------------------------------------------------
