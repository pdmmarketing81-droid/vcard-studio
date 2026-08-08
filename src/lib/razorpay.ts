import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Razorpay, server side only.
 *
 * Two secrets, and they are not interchangeable:
 *   RAZORPAY_KEY_SECRET     — signs the checkout callback the browser returns
 *   RAZORPAY_WEBHOOK_SECRET — signs the server-to-server webhook
 *
 * Mixing them up produces "signature does not match" and hours of confusion,
 * so each verifier below takes only the one it is meant to use.
 */

const API = 'https://api.razorpay.com/v1';

function auth(): string {
  const id = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error('Razorpay keys are not configured.');
  return 'Basic ' + Buffer.from(`${id}:${secret}`).toString('base64');
}

export interface RazorpayOrder {
  id: string;
  amount: number; // paise
  currency: string;
  status: string;
}

/**
 * Creates an order. `rupees` is what the human typed; Razorpay counts in paise,
 * so it is converted here at the boundary and nowhere else — a stray factor of
 * 100 in a payments system is not a bug anyone enjoys finding.
 */
export async function createOrder(
  rupees: number,
  notes: Record<string, string>
): Promise<RazorpayOrder> {
  const res = await fetch(`${API}/orders`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(rupees * 100),
      currency: 'INR',
      receipt: `topup-${Date.now()}`,
      notes,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    console.error('[razorpay] order failed', res.status, body);
    throw new Error('Could not start the payment.');
  }
  return (await res.json()) as RazorpayOrder;
}

/** Constant-time hex compare — a signature check that leaks timing is not one. */
function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(a, 'utf8');
  const y = Buffer.from(b, 'utf8');
  if (x.length !== y.length) return false;
  return timingSafeEqual(x, y);
}

/**
 * The signature the checkout widget hands back in the browser.
 * Signed over "order_id|payment_id" with the KEY secret.
 */
export function checkoutSignatureValid(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');
  return sameSignature(expected, signature);
}

/**
 * The signature on a webhook. Signed over the RAW body with the WEBHOOK secret.
 *
 * The body must be the exact bytes that arrived. Parsing to JSON and
 * re-stringifying changes key order and spacing, and the signature stops
 * matching for reasons that look like nothing at all.
 */
export function webhookSignatureValid(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  return sameSignature(expected, signature);
}
