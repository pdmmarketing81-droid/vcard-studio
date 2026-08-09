import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

/**
 * Is the app actually working?
 *
 * Deliberately more than "did Next.js answer". Next will happily serve a 200
 * while the database is unreachable, and every page that matters would be
 * broken — which is roughly what happened on 9 Aug 2026, when /pricing was
 * down and nothing knew until a person opened it.
 *
 * So this touches the database and reports the result. It stays cheap: one
 * indexed count, no joins.
 *
 * Public on purpose, and it says nothing a stranger could use — no versions,
 * no table names, no counts. Just up or down, so an uptime service can watch
 * it without a secret to leak.
 */
export async function GET() {
  const started = Date.now();

  try {
    const { error } = await supabaseAdmin()
      .from('plans')
      .select('id', { count: 'exact', head: true })
      .limit(1);

    if (error) throw new Error('database');

    return NextResponse.json(
      { ok: true, ms: Date.now() - started },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    // 503 rather than 500: this is "not ready", and it is what uptime checks
    // and load balancers are built to understand.
    return NextResponse.json(
      { ok: false, ms: Date.now() - started },
      { status: 503, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
