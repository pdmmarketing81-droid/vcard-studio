import { NextResponse } from 'next/server';
import { currentProfile } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { createOrder } from '@/lib/razorpay';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

/**
 * Starts payment for a plan.
 *
 * The price comes from the plan row, never from the request. If the browser
 * sent the amount, the browser could decide what a plan costs — and someone
 * would eventually notice and buy the Pro plan for one rupee.
 */
export async function POST(req: Request) {
  const limit = rateLimit(callerKey(req, 'checkout'), { max: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Please wait a moment.');

  const me = await currentProfile();
  if (!me) return NextResponse.json({ error: 'Please sign in first.' }, { status: 401 });

  const { plan } = await req.json().catch(() => ({ plan: null }));
  if (!plan) return NextResponse.json({ error: 'Which plan?' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: row } = await db
    .from('plans')
    .select('id, slug, name, price, audience, visible')
    .eq('slug', String(plan))
    .maybeSingle();

  if (!row || !row.visible) {
    return NextResponse.json({ error: 'That plan is not available.' }, { status: 404 });
  }
  if (Number(row.price) <= 0) {
    return NextResponse.json({ error: 'That plan cannot be bought online.' }, { status: 400 });
  }

  if (me.role === 'main_admin') {
    return NextResponse.json({ error: 'Admins do not buy plans.' }, { status: 400 });
  }

  /* A reseller cannot buy a plan at all, and this is the important one.
     activate_plan() overwrites their terms with the plan's. A reseller on a
     hand-agreed rate — ₹100 a card instead of ₹200, say — would lose that deal
     by buying a plan they did not need, and nobody would notice until the
     charges changed. Resellers top up; a change of terms is ours to make. */
  if (me.role === 'sub_admin') {
    return NextResponse.json(
      {
        error:
          'You already have a reseller account. Top up your wallet from your dashboard, ' +
          'or talk to us about changing your terms.',
      },
      { status: 400 }
    );
  }

  // Someone who already bought a card plan buying another would silently reset
  // their card's terms too. Renewal happens from the card, not from here.
  const { data: existing } = await db
    .from('profiles').select('plan_id').eq('id', me.id).maybeSingle();

  if (existing?.plan_id) {
    return NextResponse.json(
      { error: 'You already have a plan. Renew from your card instead.' },
      { status: 400 }
    );
  }

  let order;
  try {
    order = await createOrder(Number(row.price), {
      profile_id: me.id,
      plan: row.slug,
      email: me.email,
    });
  } catch (e) {
    console.error('[checkout]', e);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 502 });
  }

  const { error } = await db.from('payment_orders').insert({
    profile_id: me.id,
    razorpay_order_id: order.id,
    amount: Number(row.price),
    purpose: 'plan',
    plan_id: row.id,
  });

  if (error) {
    console.error('[checkout] could not record order', error);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 500 });
  }

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount,
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
    plan_name: row.name,
  });
}
