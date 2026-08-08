-- ---------------------------------------------------------------------
-- 007 — a direct customer pays for their own card.
--
-- Already applied to the live database on 8 Aug 2026. Kept here so the
-- schema can be rebuilt from these files alone.
--
-- payer_for_card() answered "who is charged for this card" with:
--
--     sub_admin -> themselves,  everyone else -> their parent
--
-- That covers the two cases it was written for: a reseller's own card, and
-- a reseller's customer. It does not cover the one that arrived later —
-- somebody who bought from the website with no reseller above them. Their
-- parent_id is null, so the payer came out null, and null is the signal for
-- "this card is ours": free, and never expiring.
--
-- The result was quiet rather than loud. A customer pays 599, activate_plan
-- correctly writes their terms (599 per card, yearly, limit 1) and credits
-- their wallet — and then the charge never happens, the 599 sits unspent,
-- and the card gets no expiry date, so no renewal ever asks for money again.
-- Nothing errors. It just becomes a free card, once, silently.
--
-- The rule that was meant all along: you pay for your own card, unless
-- somebody above you is paying for it.
-- ---------------------------------------------------------------------

create or replace function public.payer_for_card(p_business uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case
           -- Ours. Free, and never expires.
           when p.role = 'main_admin'    then null
           -- A reseller's own card comes out of their own wallet.
           when p.role = 'sub_admin'     then p.id
           -- A reseller's customer: the reseller pays.
           when p.parent_id is not null  then p.parent_id
           -- Nobody above them, so they bought it themselves.
           else p.id
         end
  from public.businesses b
  join public.profiles p on p.id = b.owner_id
  where b.id = p_business;
$$;

-- ---------------------------------------------------------------------
-- Check, after a direct customer has made their card:
--
--   select b.slug, b.expires_at, w.amount, w.kind
--   from businesses b
--   left join wallet_transactions w on w.business_id = b.id
--   where b.owner_id = '<their uuid>';
--
-- Expected: one card_charge of -599 and an expires_at about a year out.
-- Before this migration: no charge row at all, and expires_at null.
-- ---------------------------------------------------------------------
