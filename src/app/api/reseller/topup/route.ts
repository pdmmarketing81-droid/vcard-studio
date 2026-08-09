import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createOrder } from '@/lib/razorpay';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

const MIN = 100;
const MAX = 200_000;

/**
 * Starts a wallet top-up.
 *
 * The amount is written into our own payment_orders row at the same time the
 * Razorpay order is made, so the webhook later has something trustworthy to
 * compare against. Nothing is credited here — a created order is only an
 * intention to pay, and treating it as payment is how wallets get filled for
 * free.
 */
export async function POST(req: Request) {
  /* Every call here creates a Razorpay order. Unlimited calls mean unlimited
     abandoned orders, which is noise in their dashboard and ours, and a way to
     lean on their API until they rate limit us instead. */
  const limit = rateLimit(callerKey(req, 'topup'), { max: 10, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Please wait a moment.');

  const gate = await guardApi('sub_admin', 'main_admin');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  const rupees = Math.round(Number(body?.amount));

  if (!Number.isFinite(rupees) || rupees < MIN || rupees > MAX) {
    return NextResponse.json(
      { error: `Enter an amount between ₹${MIN} and ₹${MAX.toLocaleString('en-IN')}.` },
      { status: 400 }
    );
  }

  let order;
  try {
    order = await createOrder(rupees, {
      profile_id: gate.profile.id,
      email: gate.profile.email,
    });
  } catch (e) {
    console.error('[topup]', e);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 502 });
  }

  const { error } = await supabaseAdmin().from('payment_orders').insert({
    profile_id: gate.profile.id,
    razorpay_order_id: order.id,
    amount: rupees,
  });

  if (error) {
    // The order exists at Razorpay but we have no record of it. Better to fail
    // here than to let someone pay against an order we cannot later match to a
    // wallet — an unmatched payment is a refund and an apology.
    console.error('[topup] could not record order', error);
    return NextResponse.json({ error: 'Could not start the payment.' }, { status: 500 });
  }

  return NextResponse.json({
    order_id: order.id,
    amount: order.amount, // paise, for the checkout widget
    key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  });
}
