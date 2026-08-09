-- ---------------------------------------------------------------------
-- 001 — plans, payment orders, and the functions that bank a payment.
--
-- RECOVERED 9 Aug 2026, not written fresh.
--
-- This step was applied straight to the live database during an earlier
-- session and never written down. Everything below was read back out of
-- the running database (pg_get_functiondef, information_schema) and is
-- therefore what is actually deployed, not what someone remembers.
--
-- Why it matters: without this file, running schema.sql then 002..007 on a
-- new project gives you an app that looks complete and cannot take money.
-- /pricing would render empty, /api/checkout would fail on a missing table,
-- and the webhook would call a function that does not exist — each failing
-- somewhere far from the actual cause.
--
-- Numbered 001 because it must run before 003: reseller_terms is written by
-- activate_plan, and payment_orders is referenced by the checkout route.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Plans. What is on sale, on both sides of the business.
--   audience = 'direct'   — a shopkeeper buying one card for themselves
--   audience = 'reseller' — someone buying capacity to sell cards onward
--
-- The money columns are copied onto reseller_terms at purchase, never read
-- live. Editing a plan changes what new customers pay and leaves everyone
-- already on it exactly where they were.
-- ---------------------------------------------------------------------
create table if not exists public.plans (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  audience         text not null check (audience in ('reseller', 'direct')),
  name             text not null,
  tagline          text,

  -- Marketing copy for /pricing. NOTHING READS THIS TO DECIDE ANYTHING.
  -- If a bullet here promises a feature, something else has to enforce it.
  features         jsonb not null default '[]'::jsonb,

  price            numeric(12,2) not null default 0 check (price >= 0),
  period           text not null default 'yearly' check (period in ('once','monthly','yearly')),

  -- Reseller side: wallet they start with, and what each card costs them.
  opening_balance  numeric(12,2) not null default 0 check (opening_balance >= 0),
  per_card_amount  numeric(12,2) not null default 0 check (per_card_amount >= 0),
  per_card_percent numeric(5,2)  not null default 0
                   check (per_card_percent >= 0 and per_card_percent <= 100),
  list_price       numeric(12,2) not null default 0 check (list_price >= 0),

  card_period      text not null default 'yearly'
                   check (card_period in ('lifetime','monthly','yearly')),
  renewal_amount   numeric(12,2) not null default 0 check (renewal_amount >= 0),
  card_limit       integer check (card_limit is null or card_limit >= 0),

  visible          boolean not null default true,
  sort_order       integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Payment orders. One row per Razorpay order, created before the customer
-- ever sees the payment window.
--
-- The amount is written here by the server. The webhook reads it back from
-- here and never from anything the browser sent — which is what stops a
-- customer paying 1 rupee for a 999 plan by editing the request.
-- ---------------------------------------------------------------------
create table if not exists public.payment_orders (
  id                  uuid primary key default gen_random_uuid(),
  profile_id          uuid not null references public.profiles(id) on delete cascade,
  razorpay_order_id   text not null unique,
  razorpay_payment_id text,
  amount              numeric(12,2) not null check (amount > 0),
  status              text not null default 'created'
                      check (status in ('created','paid','failed')),
  purpose             text not null default 'topup' check (purpose in ('topup','plan')),
  plan_id             uuid references public.plans(id) on delete set null,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

alter table public.plans          enable row level security;
alter table public.payment_orders enable row level security;

-- Visible plans are public: /pricing is a public page. anon only, so that a
-- signed-in session does not pick this up on top of its own policies.
drop policy if exists "visible plans are public" on public.plans;
create policy "visible plans are public"
  on public.plans for select
  to anon
  using (visible = true);

-- payment_orders gets no policy at all. Only the server touches it, with the
-- service_role key, which bypasses RLS. No policy means no browser can read
-- anyone's payment history — including their own, which they do not need.

-- ---------------------------------------------------------------------
-- credit_topup — a reseller adding money to their wallet.
-- ---------------------------------------------------------------------
create or replace function public.credit_topup(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_profile uuid; v_amount numeric; v_status text;
begin
  select profile_id, amount, status into v_profile, v_amount, v_status
    from public.payment_orders where razorpay_order_id = p_order;

  if v_profile is null then
    return 'unknown order';
  end if;
  if v_status = 'paid' then
    return 'already credited';
  end if;

  begin
    insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
    values (v_profile, v_amount, 'topup', 'Razorpay ' || p_payment, p_payment);
  exception when unique_violation then
    -- Already banked under this payment id; make sure the order agrees and stop.
    update public.payment_orders
       set status='paid', razorpay_payment_id=p_payment, paid_at=coalesce(paid_at, now())
     where razorpay_order_id = p_order;
    return 'already credited';
  end;

  update public.payment_orders
     set status='paid', razorpay_payment_id=p_payment, paid_at=now()
   where razorpay_order_id = p_order;

  return format('credited %s', v_amount);
end;
$function$;

-- ---------------------------------------------------------------------
-- activate_plan — somebody bought a plan.
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

  /* Terms are COPIED here, not referenced. Changing the plan later must never
     re-price someone who already joined on it. */
  insert into public.reseller_terms (
    profile_id, per_card_amount, per_card_percent, list_price,
    card_period, renewal_amount, card_limit, grace_days
  ) values (
    o.profile_id,
    case when pl.audience = 'reseller' then pl.per_card_amount else pl.price end,
    pl.per_card_percent, pl.list_price,
    pl.card_period,
    case when pl.renewal_amount > 0 then pl.renewal_amount else pl.price end,
    case when pl.audience = 'direct' then 1 else pl.card_limit end,
    7
  )
  on conflict (profile_id) do update set
    per_card_amount  = excluded.per_card_amount,
    per_card_percent = excluded.per_card_percent,
    list_price       = excluded.list_price,
    card_period      = excluded.card_period,
    renewal_amount   = excluded.renewal_amount,
    card_limit       = excluded.card_limit;

  -- A reseller gets the wallet the plan promises; a shopkeeper gets exactly
  -- what they paid, which their one card then spends.
  v_credit := case when pl.audience = 'reseller' then pl.opening_balance else o.amount end;

  if v_credit > 0 then
    begin
      insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
      values (o.profile_id, v_credit, 'topup', pl.name || ' plan', p_payment);
    exception when unique_violation then
      null; -- this payment was already banked; the rest above is safe to repeat
    end;
  end if;

  update public.payment_orders
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order;

  return format('activated %s on %s', o.profile_id, pl.name);
end;
$function$;

-- ---------------------------------------------------------------------
-- handle_payment — the single door the webhook knocks on.
-- The order itself says what it was for, so the webhook never has to decide.
-- ---------------------------------------------------------------------
create or replace function public.handle_payment(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_purpose text;
begin
  select purpose into v_purpose from public.payment_orders where razorpay_order_id = p_order;
  if v_purpose is null then return 'unknown order'; end if;

  if v_purpose = 'plan' then
    return public.activate_plan(p_order, p_payment);
  end if;

  return public.credit_topup(p_order, p_payment);
end;
$function$;
