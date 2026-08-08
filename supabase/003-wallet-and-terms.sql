-- =====================================================================
-- 003 — Reseller terms and the wallet
--
-- Run AFTER 002-auth-roles.sql. Re-runnable.
--
-- How the money moves:
--
--   reseller tops up  ->  wallet (a ledger, not a number)
--   reseller makes a card -> our charge is debited, before the card goes live
--   reseller collects from their own customer, directly, in cash or UPI
--
-- We never see that last payment and cannot verify it. So nothing here tries
-- to: there is no "maximum resale price", because such a rule would be a
-- number in our database that the real world simply ignores. What the reseller
-- owes us is computed only from figures we set ourselves.
-- =====================================================================

-- ---------------------------------------------------------------------
-- reseller_terms — what one reseller pays us. One row per sub_admin.
--
-- Every knob can be zero. A reseller on a free deal has a row where nothing
-- is charged, which is different from having no row at all, and easier to
-- read later than a special case in code.
-- ---------------------------------------------------------------------
create table if not exists public.reseller_terms (
  profile_id      uuid primary key references public.profiles(id) on delete cascade,

  -- Recurring part. 'none' means they pay nothing just for existing.
  plan_type       text not null default 'none'
                  check (plan_type in ('none', 'monthly', 'yearly', 'lifetime')),
  plan_amount     numeric(12,2) not null default 0 check (plan_amount >= 0),
  plan_started_at timestamptz,
  plan_expires_at timestamptz,          -- null for 'none' and 'lifetime'

  -- Per-card part. The two add up, so a deal can be flat, percentage, both,
  -- or neither.
  per_card_amount  numeric(12,2) not null default 0 check (per_card_amount >= 0),
  per_card_percent numeric(5,2)  not null default 0
                   check (per_card_percent >= 0 and per_card_percent <= 100),

  -- The percentage is taken from THIS, not from whatever the reseller says
  -- they sold it for. A reseller who sells at 500 and reports 300 would
  -- otherwise quietly halve our cut, and we would never know.
  list_price       numeric(12,2) not null default 0 check (list_price >= 0),

  card_limit      integer check (card_limit is null or card_limit >= 0), -- null = unlimited
  grace_days      integer not null default 7 check (grace_days >= 0),

  notes           text,
  updated_at      timestamptz not null default now()
);

drop trigger if exists reseller_terms_touch on public.reseller_terms;
create trigger reseller_terms_touch
  before update on public.reseller_terms
  for each row execute function public.touch_updated_at();

-- Every sub_admin gets a terms row the moment they become one, so no screen
-- ever has to cope with it being missing.
create or replace function public.ensure_reseller_terms()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role = 'sub_admin' then
    insert into public.reseller_terms (profile_id) values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_ensure_terms on public.profiles;
create trigger profiles_ensure_terms
  after insert or update of role on public.profiles
  for each row execute function public.ensure_reseller_terms();

-- Backfill for resellers who already exist.
insert into public.reseller_terms (profile_id)
select id from public.profiles where role = 'sub_admin'
on conflict (profile_id) do nothing;

-- ---------------------------------------------------------------------
-- wallet_transactions — the ledger.
--
-- Append-only by intent. There is no balance column anywhere: the balance is
-- the sum of these rows. A stored balance drifts — one missed update, one
-- retry counted twice, and months later the number is wrong with no way to
-- tell where it went wrong. A sum cannot drift.
--
-- Corrections are made by adding an 'adjustment' row, never by editing history.
-- ---------------------------------------------------------------------
create table if not exists public.wallet_transactions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,

  -- Positive puts money in, negative takes it out. One column rather than
  -- separate credit/debit ones, so the balance is a plain sum().
  amount      numeric(12,2) not null,

  kind        text not null
              check (kind in ('topup', 'card_charge', 'plan_charge', 'refund', 'adjustment')),

  business_id uuid references public.businesses(id) on delete set null,
  note        text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists wallet_profile_idx on public.wallet_transactions (profile_id, created_at desc);

-- One card can only ever be charged for once. This is the safety net for a
-- double-submitted form or a retried request — without it, a network hiccup
-- costs the reseller real money.
create unique index if not exists wallet_one_charge_per_card
  on public.wallet_transactions (business_id) where kind = 'card_charge';

-- ---------------------------------------------------------------------
-- Reading the wallet
-- ---------------------------------------------------------------------
create or replace function public.wallet_balance(p_profile uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0)::numeric(12,2)
  from public.wallet_transactions where profile_id = p_profile;
$$;

/* What one more card costs this reseller, right now. */
create or replace function public.card_charge_for(p_profile uuid)
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((
    select (per_card_amount + round(list_price * per_card_percent / 100, 2))::numeric(12,2)
    from public.reseller_terms where profile_id = p_profile
  ), 0);
$$;

-- ---------------------------------------------------------------------
-- Charging for a card.
--
-- Runs inside the caller's transaction, so the debit and the card either both
-- happen or neither does. Raises rather than returning a flag: a failure here
-- must stop everything, and an exception cannot be forgotten the way a return
-- value can.
-- ---------------------------------------------------------------------
create or replace function public.debit_for_card(p_business uuid)
returns numeric language plpgsql security definer set search_path = public as $$
declare
  v_owner   uuid;
  v_payer   uuid;
  v_amount  numeric;
  v_balance numeric;
  v_limit   integer;
  v_made    integer;
begin
  select owner_id into v_owner from public.businesses where id = p_business;
  if v_owner is null then
    raise exception 'This card has no owner, so there is nobody to charge.';
  end if;

  -- Who pays: the reseller. That is the owner themselves when a reseller makes
  -- a card in their own name, otherwise the reseller they hang off.
  select case when p.role = 'sub_admin' then p.id else p.parent_id end
    into v_payer
    from public.profiles p where p.id = v_owner;

  -- Nobody above them means the card is ours. Ours are free.
  if v_payer is null then return 0; end if;

  select card_limit into v_limit from public.reseller_terms where profile_id = v_payer;
  if v_limit is not null then
    select count(*) into v_made
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
     where p.id = v_payer or p.parent_id = v_payer;
    if v_made > v_limit then
      raise exception 'Card limit reached (% of %).', v_made - 1, v_limit;
    end if;
  end if;

  v_amount := public.card_charge_for(v_payer);
  if v_amount <= 0 then return 0; end if;

  v_balance := public.wallet_balance(v_payer);
  if v_balance < v_amount then
    raise exception 'Not enough wallet balance: this card costs %, balance is %.',
      v_amount, v_balance;
  end if;

  insert into public.wallet_transactions (profile_id, amount, kind, business_id, note)
  values (v_payer, -v_amount, 'card_charge', p_business, 'Card created');

  return v_amount;
end;
$$;

-- ---------------------------------------------------------------------
-- RLS
--
-- A reseller may READ their own terms and their own ledger — they should be
-- able to see what they are paying and why. Nobody writes either from a
-- browser: top-ups and terms are set by a main admin through the server, and
-- charges are made by debit_for_card(). No insert or update policy is granted
-- to anyone, so the only way in is the service_role key.
-- ---------------------------------------------------------------------
alter table public.reseller_terms enable row level security;
alter table public.wallet_transactions enable row level security;

drop policy if exists "read own terms" on public.reseller_terms;
create policy "read own terms" on public.reseller_terms for select
  using (profile_id = auth.uid() or public.is_main_admin());

drop policy if exists "read own ledger" on public.wallet_transactions;
create policy "read own ledger" on public.wallet_transactions for select
  using (profile_id = auth.uid() or public.is_main_admin());
