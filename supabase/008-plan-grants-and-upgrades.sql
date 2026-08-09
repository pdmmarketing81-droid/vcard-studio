-- ---------------------------------------------------------------------
-- 008 — what a plan actually gives you, and how to move up a plan.
--
-- Two holes, both found by the owner rather than by any test.
--
-- 1. plans.features is a jsonb array of sentences printed on /pricing.
--    Nothing reads it. So "reviews included" on the 999 plan and its absence
--    from the 599 plan were decoration: every card had the review funnel
--    regardless of what anyone paid. The pricing page was making a promise
--    the software had no idea it was making.
--
-- 2. Once you had a plan, checkout refused you. That was meant to stop
--    double-buying, and it also stopped upgrading. A 599 customer who wanted
--    reviews had no route to the 999 plan at all.
--
-- The shape of the fix: a plan carries `grants`, machine-readable, alongside
-- `features`, which stays human-readable. grants is COPIED onto reseller_terms
-- at purchase, exactly like the money columns already are — so editing a plan
-- never silently adds or removes a feature from someone already on it.
-- ---------------------------------------------------------------------

alter table public.plans
  add column if not exists grants jsonb not null default '{}'::jsonb;

alter table public.reseller_terms
  add column if not exists grants jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- Nobody loses anything today.
--
-- Every existing plan and every existing customer is granted reviews,
-- because that is what they have right now. A migration that quietly took a
-- working feature away from a live customer would be a worse bug than the one
-- being fixed. Turning it off on the cheaper plan is a decision for the admin
-- screen, made deliberately, and it will only affect people who buy after.
-- ---------------------------------------------------------------------
update public.plans          set grants = '{"reviews": true}'::jsonb where grants = '{}'::jsonb;
update public.reseller_terms set grants = '{"reviews": true}'::jsonb where grants = '{}'::jsonb;

-- ---------------------------------------------------------------------
-- What is this person allowed to use?
--
-- Read from the copied terms, never from the live plan. For a reseller's
-- customer the answer comes from the reseller, because the reseller is who
-- bought the plan — the customer never had one.
-- ---------------------------------------------------------------------
create or replace function public.grants_for(p_profile uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select case
    when (select role from public.profiles where id = p_profile) = 'main_admin'
      then '{"reviews": true}'::jsonb          -- ours; everything is on
    else coalesce(
      (select t.grants from public.reseller_terms t where t.profile_id = p_profile),
      (select t.grants
         from public.profiles p
         join public.reseller_terms t on t.profile_id = p.parent_id
        where p.id = p_profile),
      '{}'::jsonb
    )
  end;
$$;

create or replace function public.has_grant(p_profile uuid, p_key text)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((public.grants_for(p_profile) ->> p_key)::boolean, false);
$$;

-- ---------------------------------------------------------------------
-- Orders can now be upgrades.
-- ---------------------------------------------------------------------
alter table public.payment_orders drop constraint if exists payment_orders_purpose_check;
alter table public.payment_orders add constraint payment_orders_purpose_check
  check (purpose in ('topup', 'plan', 'upgrade'));

-- ---------------------------------------------------------------------
-- activate_plan — unchanged except that it now copies grants across.
-- ---------------------------------------------------------------------
create or replace function public.activate_plan(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare
  o record; pl record; v_credit numeric;
begin
  select * into o from public.payment_orders where razorpay_order_id = p_order;
  if o is null then return 'unknown order'; end if;
  if o.status = 'paid' then return 'already activated'; end if;
  if o.plan_id is null then return 'order has no plan'; end if;

  select * into pl from public.plans where id = o.plan_id;
  if pl is null then return 'plan is gone'; end if;

  update public.profiles
     set role = case when pl.audience = 'reseller' then 'sub_admin' else role end,
         plan_id = pl.id,
         plan_price_paid = o.amount,
         suspended = false
   where id = o.profile_id;

  insert into public.reseller_terms (
    profile_id, per_card_amount, per_card_percent, list_price,
    card_period, renewal_amount, card_limit, grace_days, grants
  ) values (
    o.profile_id,
    case when pl.audience = 'reseller' then pl.per_card_amount else pl.price end,
    pl.per_card_percent, pl.list_price,
    pl.card_period,
    case when pl.renewal_amount > 0 then pl.renewal_amount else pl.price end,
    case when pl.audience = 'direct' then 1 else pl.card_limit end,
    7, pl.grants
  )
  on conflict (profile_id) do update set
    per_card_amount  = excluded.per_card_amount,
    per_card_percent = excluded.per_card_percent,
    list_price       = excluded.list_price,
    card_period      = excluded.card_period,
    renewal_amount   = excluded.renewal_amount,
    card_limit       = excluded.card_limit,
    grants           = excluded.grants;

  v_credit := case when pl.audience = 'reseller' then pl.opening_balance else o.amount end;

  if v_credit > 0 then
    begin
      insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
      values (o.profile_id, v_credit, 'topup', pl.name || ' plan', p_payment);
    exception when unique_violation then
      null;
    end;
  end if;

  update public.payment_orders
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order;

  return format('activated %s on %s', o.profile_id, pl.name);
end;
$function$;

-- ---------------------------------------------------------------------
-- upgrade_plan — they already have a plan and paid the difference.
--
-- Three things it deliberately does NOT do:
--
--   * it does not touch expires_at. They paid 400 to add a feature, not to
--     buy another year. Extending the year for a part payment would let
--     anyone renew cheaply by upgrading in small steps.
--   * it does not leave 400 spendable in the wallet. The money bought the
--     upgrade; it is banked and immediately spent, so the ledger shows both
--     halves and the balance is unchanged.
--   * it does not re-run card_limit. Someone on a 1-card plan who upgrades
--     stays on 1 card unless the new plan says otherwise, which it does via
--     card_limit below.
-- ---------------------------------------------------------------------
create or replace function public.upgrade_plan(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare o record; pl record;
begin
  select * into o from public.payment_orders where razorpay_order_id = p_order;
  if o is null then return 'unknown order'; end if;
  if o.status = 'paid' then return 'already upgraded'; end if;
  if o.plan_id is null then return 'order has no plan'; end if;

  select * into pl from public.plans where id = o.plan_id;
  if pl is null then return 'plan is gone'; end if;

  update public.profiles
     set plan_id = pl.id,
         -- what they are now considered to be on, for renewal pricing
         plan_price_paid = pl.price
   where id = o.profile_id;

  /* Terms move to the new plan, except grace_days which is ours to set.
     renewal_amount matters most here: next year they renew at the new
     plan's price, not the old one they upgraded away from. */
  update public.reseller_terms
     set grants          = pl.grants,
         per_card_amount = case when pl.audience = 'reseller' then pl.per_card_amount else pl.price end,
         renewal_amount  = case when pl.renewal_amount > 0 then pl.renewal_amount else pl.price end,
         card_limit      = case when pl.audience = 'direct' then 1 else pl.card_limit end
   where profile_id = o.profile_id;

  -- Banked and spent in the same breath. Two rows so the ledger can be read
  -- back as a story; distinct refs so a retried webhook cannot double either.
  begin
    insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
    values (o.profile_id, o.amount, 'topup', 'Upgrade to ' || pl.name, p_payment);

    insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
    values (o.profile_id, -o.amount, 'plan_charge', 'Upgrade to ' || pl.name,
            p_payment || ':upgrade');
  exception when unique_violation then
    null; -- already recorded; the rest of this function is safe to repeat
  end;

  update public.payment_orders
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order;

  return format('upgraded %s to %s', o.profile_id, pl.name);
end;
$function$;

-- ---------------------------------------------------------------------
-- handle_payment — one more door.
-- ---------------------------------------------------------------------
create or replace function public.handle_payment(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_purpose text;
begin
  select purpose into v_purpose from public.payment_orders where razorpay_order_id = p_order;
  if v_purpose is null then return 'unknown order'; end if;

  if v_purpose = 'plan'    then return public.activate_plan(p_order, p_payment); end if;
  if v_purpose = 'upgrade' then return public.upgrade_plan(p_order, p_payment);  end if;

  return public.credit_topup(p_order, p_payment);
end;
$function$;

-- ---------------------------------------------------------------------
-- Reviews are off for anyone who was never granted them.
--
-- Only bites cards whose owner has no reviews grant, which after the backfill
-- above is nobody. It exists so that turning the grant off on a plan and then
-- re-running this file cleans up rather than leaving funnels running for
-- people who no longer pay for them.
-- ---------------------------------------------------------------------
update public.businesses b
   set review_enabled = false
 where b.review_enabled = true
   and b.owner_id is not null
   and not public.has_grant(b.owner_id, 'reviews');
