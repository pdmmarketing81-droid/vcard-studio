import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { webhookSignatureValid } from '@/lib/razorpay';

export const dynamic = 'force-dynamic';

/**
 * Razorpay's server-to-server notification. This — not the browser — is what
 * actually credits a wallet.
 *
 * The browser callback cannot be the source of truth: a customer who pays and
 * then closes the tab never sends it, and anything the browser sends can be
 * replayed. The webhook comes from Razorpay's servers, is signed, and is
 * retried until we answer 200.
 *
 * Because it is retried, crediting must be safe to repeat. It is: the ledger
 * has a unique index on `ref`, so a second delivery of the same payment id
 * cannot add a second line.
 *
 * Set this up at Razorpay → Settings → Webhooks:
 *   URL     https://<your-domain>/api/webhooks/razorpay
 *   events  payment.captured
 *   secret  → paste into RAZORPAY_WEBHOOK_SECRET
 */
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[razorpay webhook] RAZORPAY_WEBHOOK_SECRET is not set — refusing.');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  // The exact bytes that arrived. Parsing and re-serialising would change key
  // order and whitespace, and the signature would never match again.
  const raw = await req.text();
  const signature = req.headers.get('x-razorpay-signature') ?? '';

  if (!webhookSignatureValid(raw, signature)) {
    // Anyone can POST here. Without this check, "payment.captured" from a
    // stranger would top up any wallet they liked, for free.
    console.warn('[razorpay webhook] bad signature, ignored');
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: 'Bad payload.' }, { status: 400 });
  }

  // Anything else is acknowledged and ignored: replying 200 stops Razorpay
  // retrying an event we were never going to act on.
  if (event.event !== 'payment.captured') {
    return NextResponse.json({ ok: true, ignored: event.event });
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id || !payment.order_id) {
    return NextResponse.json({ ok: true, ignored: 'no order on payment' });
  }

  /* One call for both kinds of payment. The database looks up what the order
     was for — a wallet top-up or a new plan — and does the right thing. Deciding
     that here would mean a second copy of the rule, in the one place that must
     never disagree with the first. */
  const { data, error } = await supabaseAdmin().rpc('handle_payment', {
    p_order: payment.order_id,
    p_payment: payment.id,
  });

  if (error) {
    // A 500 makes Razorpay retry, which is what we want — the payment is real
    // and the wallet is not credited yet.
    console.error('[razorpay webhook] credit failed', error);
    return NextResponse.json({ error: 'Could not credit.' }, { status: 500 });
  }

  console.log('[razorpay webhook]', payment.order_id, payment.id, data);
  return NextResponse.json({ ok: true, result: data });
}
