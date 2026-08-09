-- ---------------------------------------------------------------------
-- Money flow tests — upgrade, renewal, and the grants that gate features.
--
-- Run this in the Supabase SQL editor. It is SAFE TO RUN ON PRODUCTION:
-- every statement happens inside one block that ends with a deliberate
-- exception, so Postgres rolls the whole thing back. The results come back
-- as the text of that "error".
--
-- Expect: "ROLLED BACK ON PURPOSE — 0 failure(s)" followed by eight ok lines.
-- Any FAIL line is a real failure; the number in the message is the count.
--
-- Why written as SQL against the real functions rather than as unit tests:
-- every bug found on 9 Aug 2026 lived in the database, not in TypeScript, and
-- each one was silent — no error, just money quietly not moving. Only running
-- the actual functions catches that class.
--
-- Tests 5 and 8 are the ones that matter most. Razorpay retries a webhook
-- until it gets a 200, so every one of these paths WILL run more than once in
-- production. Charging twice would be the worst bug in the system.
--
-- Uses the existing test account rather than creating one, because profiles
-- has a foreign key to auth.users and inventing auth rows is a bigger risk
-- than reusing a row inside a transaction that cannot commit.
-- ---------------------------------------------------------------------
do $$
declare
  v_user uuid; v_card uuid; v_basic uuid; v_plus uuid;
  v_bal_before numeric; v_bal_after numeric;
  v_exp_before timestamptz; v_exp_after timestamptz;
  v_grants jsonb; v_renewal numeric;
  r text := ''; fails int := 0;
begin
  select id into v_user from auth.users where email = 'catdogmouse84964@gmail.com';
  select id into v_card from public.businesses where owner_id = v_user limit 1;
  select id into v_basic from public.plans where slug = 'card-basic';
  select id into v_plus  from public.plans where slug = 'card-plus';

  if v_user is null or v_card is null then
    raise exception 'Test account or card missing — adjust the email above.';
  end if;

  -- Put them back on the cheap plan so the upgrade under test is a real one.
  update public.profiles set plan_id = v_basic, plan_price_paid = 599 where id = v_user;
  update public.reseller_terms
     set grants = '{"reviews": false}'::jsonb, renewal_amount = 599, per_card_amount = 599
   where profile_id = v_user;

  if public.has_grant(v_user, 'reviews') then
    r := r || E'\nFAIL 1: basic plan granted reviews'; fails := fails + 1;
  else r := r || E'\nok 1: basic plan has no reviews'; end if;

  ---------------------------------------------------------------- upgrade
  v_bal_before := public.wallet_balance(v_user);

  insert into public.payment_orders (profile_id, razorpay_order_id, amount, purpose, plan_id)
  values (v_user, 'test_order_up', 400, 'upgrade', v_plus);

  perform public.handle_payment('test_order_up', 'test_pay_up');

  select grants, renewal_amount into v_grants, v_renewal
    from public.reseller_terms where profile_id = v_user;
  v_bal_after := public.wallet_balance(v_user);

  if (v_grants ->> 'reviews')::boolean then r := r || E'\nok 2: upgrade granted reviews';
  else r := r || E'\nFAIL 2: upgrade did not grant reviews'; fails := fails + 1; end if;

  if v_renewal = 999 then r := r || E'\nok 3: renewal now 999';
  else r := r || format(E'\nFAIL 3: renewal is %s, expected 999', v_renewal); fails := fails + 1; end if;

  -- The 400 bought the upgrade. Leaving it spendable would mean the customer
  -- could also put it towards a card they had not paid for.
  if v_bal_after = v_bal_before then r := r || E'\nok 4: upgrade left balance unchanged';
  else r := r || format(E'\nFAIL 4: balance moved %s -> %s', v_bal_before, v_bal_after); fails := fails + 1; end if;

  perform public.handle_payment('test_order_up', 'test_pay_up');
  if public.wallet_balance(v_user) = v_bal_after then r := r || E'\nok 5: replayed upgrade did nothing';
  else r := r || E'\nFAIL 5: replay changed the balance'; fails := fails + 1; end if;

  ---------------------------------------------------------------- renewal
  select expires_at into v_exp_before from public.businesses where id = v_card;
  v_bal_before := public.wallet_balance(v_user);

  insert into public.payment_orders (profile_id, razorpay_order_id, amount, purpose, business_id)
  values (v_user, 'test_order_ren', 999, 'renew', v_card);

  perform public.handle_payment('test_order_ren', 'test_pay_ren');

  select expires_at into v_exp_after from public.businesses where id = v_card;
  v_bal_after := public.wallet_balance(v_user);

  if v_exp_after > v_exp_before then
    r := r || format(E'\nok 6: expiry moved %s -> %s', v_exp_before::date, v_exp_after::date);
  else r := r || E'\nFAIL 6: expiry did not move'; fails := fails + 1; end if;

  if v_bal_after = v_bal_before then r := r || E'\nok 7: renewal left balance unchanged';
  else r := r || format(E'\nFAIL 7: balance moved %s -> %s', v_bal_before, v_bal_after); fails := fails + 1; end if;

  perform public.handle_payment('test_order_ren', 'test_pay_ren');
  select expires_at into v_exp_before from public.businesses where id = v_card;
  if v_exp_before = v_exp_after then r := r || E'\nok 8: replayed renewal did nothing';
  else r := r || E'\nFAIL 8: replay moved the expiry again'; fails := fails + 1; end if;

  raise exception E'ROLLED BACK ON PURPOSE — % failure(s)%', fails, r;
end $$;
