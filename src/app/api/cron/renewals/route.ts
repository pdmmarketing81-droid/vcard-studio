import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { timingSafeEqual } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * The nightly renewal pass.
 *
 * Charges every card that has run out, starts a grace period where the wallet
 * cannot pay, and suspends whatever is still unpaid after that.
 *
 * Guarded by a shared secret, not by a login. This is called by a machine, so
 * there is no session to check — and it must not be reachable by anyone else:
 * whoever can call it can move other people's money.
 *
 * Set CRON_SECRET in the environment and call it as:
 *   curl -H "x-cron-secret: <secret>" https://your-domain/api/cron/renewals
 *
 * Running it twice in one day is harmless. A card that has already been
 * renewed no longer has an expiry in the past, so the second pass simply
 * finds nothing to do.
 */

/** Constant-time compare, so the secret cannot be guessed a character at a time. */
function matches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function run(req: Request) {
  const expected = process.env.CRON_SECRET;

  // Refusing to run without a secret is deliberate. Falling back to "no secret
  // configured means no check" is how an endpoint like this ends up open in
  // production because someone forgot one environment variable.
  if (!expected) {
    console.error('[cron] CRON_SECRET is not set — refusing to run.');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  const given = req.headers.get('x-cron-secret') ?? '';
  if (!matches(given, expected)) {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { data, error } = await supabaseAdmin().rpc('run_renewals');

  if (error) {
    console.error('[cron] renewals failed', error);
    return NextResponse.json({ error: 'Renewal pass failed.' }, { status: 500 });
  }

  const rows = (data ?? []) as { business_id: string; card_slug: string; outcome: string }[];
  const summary = {
    processed: rows.length,
    renewed: rows.filter((r) => r.outcome.startsWith('renewed')).length,
    unpaid: rows.filter((r) => r.outcome.startsWith('unpaid')).length,
    suspended: rows.filter((r) => r.outcome === 'suspended').length,
    errors: rows.filter((r) => r.outcome.startsWith('error')).length,
  };

  // Logged in full even though the response is a summary: when a card is
  // suspended the owner will ask why, and this is the only record of it.
  if (rows.length) console.log('[cron] renewals', JSON.stringify(rows));

  return NextResponse.json({ ok: true, ...summary, details: rows });
}

export const GET = run;
export const POST = run;
