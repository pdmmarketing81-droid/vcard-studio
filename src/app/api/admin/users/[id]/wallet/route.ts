import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { auditAction } from '@/lib/audit';

const KINDS = ['topup', 'refund', 'adjustment'];

/**
 * Putting money into (or taking it out of) a reseller's wallet by hand.
 *
 * Until Razorpay is wired up this is how a top-up happens: the reseller pays
 * us however they pay us, and a main admin records it here.
 *
 * Nothing is ever edited or deleted. A mistake is corrected by adding an
 * 'adjustment' in the other direction, so the history stays a history — you
 * can always see that something went wrong and how it was put right, which is
 * exactly what you want when an argument about money starts.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const kind = String(body.kind ?? 'topup');
  if (!KINDS.includes(kind)) {
    return NextResponse.json({ error: 'Unknown entry type.' }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    return NextResponse.json({ error: 'Enter an amount.' }, { status: 400 });
  }

  // A top-up cannot be negative and a refund cannot be positive. Getting this
  // backwards is easy at 1am and expensive afterwards.
  const signed =
    kind === 'refund' ? -Math.abs(amount)
    : kind === 'topup' ? Math.abs(amount)
    : Math.round(amount * 100) / 100;

  const db = supabaseAdmin();
  const { data: target } = await db
    .from('profiles').select('role').eq('id', params.id).maybeSingle();

  if (!target) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
  if (target.role !== 'sub_admin') {
    return NextResponse.json({ error: 'Only resellers have a wallet.' }, { status: 400 });
  }

  const { error } = await db.from('wallet_transactions').insert({
    profile_id: params.id,
    amount: Math.round(signed * 100) / 100,
    kind,
    note: body.note ? String(body.note).slice(0, 500) : null,
    created_by: gate.profile.id,
  });

  if (error) {
    console.error('[wallet]', error);
    return NextResponse.json({ error: 'Could not record that.' }, { status: 500 });
  }

  await auditAction({
    action: 'wallet.entry',
    targetType: 'wallet',
    targetId: params.id,
    detail: { kind, amount: Math.round(signed * 100) / 100, note: body.note ?? null },
  });

  const { data: balance } = await db.rpc('wallet_balance', { p_profile: params.id });
  return NextResponse.json({ ok: true, balance });
}
