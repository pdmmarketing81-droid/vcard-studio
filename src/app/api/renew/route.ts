import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { createOrder } from '@/lib/razorpay';
import { canManageCard } from '@/lib/auth';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

/**
 * Pay to renew one card.
 *
 * The gap this closes: renew_card() spends from a wallet, and a direct
 * customer had no way to put anything in one. Their card would reach its year,
 * find nothing, and suspend — while the checkout page told them to "renew from
 * your card", which was a door that did not exist.
 *
 * The amount comes from renewal_charge_for() in the database, never from the
 * request. Same rule as every other payment here: the browser may say which
 * card, never what it costs.
 */
export async function POST(req: Request) {
  const limit = rateLimit(callerKey(req, 'renew'), { max: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Please wait a moment.');

  const me = await currentProfile();
  if (!me) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  const { card } = await req.json().catch(() => ({ card: null }));
  if (!card) return NextResponse.json({ error: 'Which card?' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: business } = await db
    .from('businesses')
    .select('id, name, slug, owner_id, expires_at')
    .eq('id', String(card))
    .maybeSingle();

  if (!business || !(await canManageCard(me, business.owner_id))) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  /* Who the charge falls on, asked of the database rather than assumed. For a
     reseller's customer this is the reseller — and they must not be able to
     make their reseller pay by pressing a button on their own screen. */
  const { data: payer } = await db.rpc('payer_for_card', { p_business: business.id });
  if (!payer) {
    return NextResponse.json({ error: 'This card does not need renewing.' }, { status: 400 });
  }
  if (payer !== me.id) {
    return NextResponse.json(
      { error: 'This card is renewed by whoever set it up for you. Please contact them.' },
      { status: 403 }
    );
  }

  const { data: cost } = await db.rpc('renewal_charge_for', { p_profile: payer });
  const amount = Number(cost ?? 0);

  if (amount <= 0) {
    return NextResponse.json({ error: 'This card renews at no cost.' }, { status: 400 });
  }

  let order;
  try {
    order = await createOrder(amount, {
      profile_id: me.id,
      card: business.slug,
      email: me.email,
      kind: 'renew',
    });
  } catch (e) {
    console.error('[renew]', e);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 502 });
  }

  const { error } = await db.from('payment_orders').insert({
    profile_id: me.id,
    razorpay_order_id: order.id,
    amount,
    purpose: 'renew',
    business_id: business.id,
  });

  if (error) {
    console.error('[renew] could not record order', error);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 500 });
  }

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    plan_name: `Renew ${business.name}`,
  });
}
