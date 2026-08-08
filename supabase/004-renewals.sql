-- =====================================================================
-- 004 — Card expiry, renewal and suspension
--
-- Run AFTER 003. Re-runnable.
--
-- A card now has a paid-up-to date. When it passes, the reseller's wallet is
-- charged again. If the wallet cannot pay, the card enters a grace period, and
-- only after that does it stop showing.
--
-- A suspended card is NOT taken down. It keeps its slug and keeps answering,
-- but shows our contact details instead of the business's. The QR codes are
-- already printed and stuck on shop counters; a dead link there loses the end
-- customer for good, while a page with our number turns that scan into a
-- conversation with us.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Terms: how long a card lasts and what renewing it costs
-- ---------------------------------------------------------------------
alter table public.reseller_terms
  add column if not exists card_period text not null default 'lifetime',
  add column if not exists renewal_amount numeric(12,2) not null default 0,
  add column if not exists renewal_percent numeric(5,2) not null default 0;

do $$ begin
  alter table public.reseller_terms
    add constraint reseller_terms_period_check
    check (card_period in ('lifetime', 'monthly', 'yearly'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.reseller_terms
    add constraint reseller_terms_renewal_check
    check (renewal_amount >= 0 and renewal_percent >= 0 and renewal_percent <= 100);
exception when duplicate_object then null; end $$;

-- 'lifetime' is the default so that every card that already exists carries on
-- exactly as before. A migration that starts charging people is a migration
-- that gets reverted at 2am.

-- ---------------------------------------------------------------------
-- Cards: paid up to when, and what state that leaves them in
-- ---------------------------------------------------------------------
alter table public.businesses
  add column if not exists expires_at   timestamptz,  -- null = never expires
  add column if not exists grace_until  timestamptz,  -- set when a renewal fails
  add column if not exists suspended_at timestamptz;  -- set when grace runs out

create index if not exists businesses_expiry_idx
  on public.businesses (expires_at) where expires_at is not null and suspended_at is null;

-- Renewals repeat, so they cannot share the 'card_charge' kind — that one has a
-- unique index keeping it to once per card.
alter table public.wallet_transactions drop constraint if exists wallet_transactions_kind_check;
alter table public.wallet_transactions add constraint wallet_transactions_kind_check
  check (kind in ('topup', 'card_charge', 'renewal', 'plan_charge', 'refund', 'adjustment'));

-- ---------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------
create or replace function public.period_interval(p_period text)
returns interval language sql immutable as $$
  select case p_period
           when 'monthly' then interval '1 month'
           when 'yearly'  then interval '1 year'
           else null
         end;
$$;

/* Which reseller pays for this card: the owner if they are one, otherwise the
   reseller above them. Null means the card is ours and costs nobody anything.
   Pulled out of debit_for_card so the renewal job asks the same question the
   same way. */
create or replace function public.payer_for_card(p_business uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case when p.role = 'sub_admin' then p.id else p.parent_id end
  from public.businesses b
  join public.profiles p on p.id = b.owner_id
  where b.id = p_business;
$$;

create or replace function public.renewal_charge_for(p_profile uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((
    select (renewal_amount + round(list_price * renewal_percent / 100, 2))::numeric(12,2)
    from public.reseller_terms where profile_id = p_profile
  ), 0);
$$;

-- ---------------------------------------------------------------------
-- Creating a card now also sets when it runs out.
-- Same function as before, with the expiry added.
-- ---------------------------------------------------------------------
create or replace function public.debit_for_card(p_business uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_owner uuid; v_payer uuid; v_amount numeric; v_balance numeric;
  v_limit integer; v_made integer; v_period interval;
begin
  select owner_id into v_owner from public.businesses where id = p_business;
  if v_owner is null then
    raise exception 'This card has no owner, so there is nobody to charge.';
  end if;

  v_payer := public.payer_for_card(p_business);

  -- Ours. Free, and never expires.
  if v_payer is null then return 0; end if;

  select card_limit into v_limit from public.reseller_terms where profile_id = v_payer;
  if v_limit is not null then
    select count(*) into v_made from public.businesses b
      join public.profiles p on p.id = b.owner_id
     where p.id = v_payer or p.parent_id = v_payer;
    if v_made > v_limit then
      raise exception 'Card limit reached (% of %).', v_made - 1, v_limit;
    end if;
  end if;

  select public.period_interval(card_period) into v_period
    from public.reseller_terms where profile_id = v_payer;

  v_amount := public.card_charge_for(v_payer);

  if v_amount > 0 then
    v_balance := public.wallet_balance(v_payer);
    if v_balance < v_amount then
      raise exception 'Not enough wallet balance: this card costs %, balance is %.',
        v_amount, v_balance;
    end if;

    insert into public.wallet_transactions (profile_id, amount, kind, business_id, note)
    values (v_payer, -v_amount, 'card_charge', p_business, 'Card created');
  end if;

  -- Set even when the card was free, because a free card on a yearly deal
  -- should still come up for review a year later.
  update public.businesses
     set expires_at = case when v_period is null then null else now() + v_period end,
         grace_until = null,
         suspended_at = null
   where id = p_business;

  return v_amount;
end;
$$;

-- ---------------------------------------------------------------------
-- Renewing one card. Returns what happened, in words, so the job that calls
-- it can be read by a human afterwards.
-- ---------------------------------------------------------------------
create or replace function public.renew_card(p_business uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_payer uuid; v_amount numeric; v_balance numeric;
  v_period interval; v_grace integer; v_expires timestamptz;
begin
  select expires_at into v_expires from public.businesses where id = p_business;

  v_payer := public.payer_for_card(p_business);
  if v_payer is null then return 'ours — nothing to charge'; end if;

  select public.period_interval(card_period), grace_days
    into v_period, v_grace
    from public.reseller_terms where profile_id = v_payer;

  if v_period is null then
    -- Deal changed to lifetime since the card was made. Stop expiring it.
    update public.businesses
       set expires_at = null, grace_until = null, suspended_at = null
     where id = p_business;
    return 'now on a lifetime deal';
  end if;

  v_amount  := public.renewal_charge_for(v_payer);
  v_balance := public.wallet_balance(v_payer);

  if v_amount > v_balance then
    -- Start the clock, but only once: a card already in grace keeps its
    -- original deadline rather than getting a fresh one every night.
    update public.businesses
       set grace_until = coalesce(grace_until, now() + make_interval(days => v_grace))
     where id = p_business;
    return format('unpaid — needs %s, wallet has %s', v_amount, v_balance);
  end if;

  if v_amount > 0 then
    insert into public.wallet_transactions (profile_id, amount, kind, business_id, note)
    values (v_payer, -v_amount, 'renewal', p_business, 'Renewal');
  end if;

  /* Counted from the old expiry, not from today, so renewing three days late
     does not quietly cost the customer three days. If the card has been dead
     for longer than one period, start from now instead of handing out a
     backdated term that expires immediately. */
  update public.businesses
     set expires_at = greatest(coalesce(v_expires, now()), now() - v_period) + v_period,
         grace_until = null,
         suspended_at = null
   where id = p_business;

  return format('renewed for %s', v_amount);
end;
$$;

-- ---------------------------------------------------------------------
-- The nightly pass.
--
-- Two things, in order: try to renew everything that has run out, then
-- suspend whatever is still unpaid after its grace period.
-- ---------------------------------------------------------------------
drop function if exists public.run_renewals();

create function public.run_renewals()
returns table (business_id uuid, card_slug text, outcome text)
language plpgsql security definer set search_path = public as $$
declare r record;
begin
  /* Every column is qualified with b. on purpose. The OUT parameters above
     share names with columns of businesses, and an unqualified reference is
     ambiguous — which Postgres rejects at RUN time, not when the function is
     created. Written the obvious way, this compiled cleanly and then failed
     the first night it ran. */
  for r in
    select b.id as id, b.slug as slug
      from public.businesses b
     where b.expires_at is not null
       and b.expires_at <= now()
       and b.suspended_at is null
     order by b.expires_at
  loop
    business_id := r.id; card_slug := r.slug;
    begin
      outcome := public.renew_card(r.id);
    exception when others then
      -- One bad card must not stop the other two hundred.
      outcome := 'error: ' || left(SQLERRM, 120);
    end;
    return next;
  end loop;

  for r in
    select b.id as id, b.slug as slug
      from public.businesses b
     where b.grace_until is not null
       and b.grace_until <= now()
       and b.suspended_at is null
  loop
    update public.businesses set suspended_at = now() where id = r.id;
    business_id := r.id; card_slug := r.slug; outcome := 'suspended';
    return next;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- A suspended card is still publicly readable — that is the whole point, so
-- the page can show our contact details instead of a dead link. No policy
-- change is needed: `published` stays true and the page decides what to draw.
-- ---------------------------------------------------------------------
