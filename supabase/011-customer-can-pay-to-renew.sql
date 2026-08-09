-- ---------------------------------------------------------------------
-- 011 — a customer can pay for their own renewal.
--
-- Applied 9 Aug 2026.
--
-- renew_card() has always worked: it charges a wallet and pushes expires_at
-- out by one term. But it charges a WALLET, and a direct customer had no way
-- to put anything into one — /api/reseller/topup is sub_admin and main_admin
-- only. So their card would reach its year, find an empty wallet, sit in grace
-- for seven days and suspend, with nothing the owner could do about it.
--
-- The checkout page even said "Renew from your card instead", pointing at a
-- door that was never built. Third time today that a message described
-- behaviour the code did not have.
--
-- This adds the door: an order tied to a card rather than to a plan. Paying it
-- banks the money and immediately spends it on the renewal, so the balance is
-- unchanged and the ledger reads as what actually happened.
-- ---------------------------------------------------------------------

alter table public.payment_orders
  add column if not exists business_id uuid references public.businesses(id) on delete set null;

alter table public.payment_orders drop constraint if exists payment_orders_purpose_check;
alter table public.payment_orders add constraint payment_orders_purpose_check
  check (purpose in ('topup', 'plan', 'upgrade', 'renew'));

create or replace function public.renew_paid(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare o record; v_result text;
begin
  select * into o from public.payment_orders where razorpay_order_id = p_order;
  if o is null then return 'unknown order'; end if;
  if o.status = 'paid' then return 'already renewed'; end if;
  if o.business_id is null then return 'order has no card'; end if;

  -- Bank it first. renew_card() spends from the wallet, so the money has to be
  -- in there before it runs, or the renewal fails on the very balance it was
  -- just paid for.
  begin
    insert into public.wallet_transactions (profile_id, amount, kind, note, ref)
    values (o.profile_id, o.amount, 'topup', 'Renewal payment', p_payment);
  exception when unique_violation then
    null; -- retried webhook; the money is already in
  end;

  v_result := public.renew_card(o.business_id);

  update public.payment_orders
     set status = 'paid', razorpay_payment_id = p_payment, paid_at = now()
   where razorpay_order_id = p_order;

  return v_result;
end;
$function$;

create or replace function public.handle_payment(p_order text, p_payment text)
returns text language plpgsql security definer set search_path to 'public' as $function$
declare v_purpose text;
begin
  select purpose into v_purpose from public.payment_orders where razorpay_order_id = p_order;
  if v_purpose is null then return 'unknown order'; end if;

  if v_purpose = 'plan'    then return public.activate_plan(p_order, p_payment); end if;
  if v_purpose = 'upgrade' then return public.upgrade_plan(p_order, p_payment);  end if;
  if v_purpose = 'renew'   then return public.renew_paid(p_order, p_payment);    end if;

  return public.credit_topup(p_order, p_payment);
end;
$function$;
