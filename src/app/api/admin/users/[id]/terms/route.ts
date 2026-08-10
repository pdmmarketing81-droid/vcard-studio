import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { auditAction } from '@/lib/audit';

const PLANS = ['none', 'monthly', 'yearly', 'lifetime'];

const money = (v: unknown, max = 1_000_000): number | null => {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 100) / 100;
};

/** What one reseller pays us. Main admin only. */
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: target } = await db
    .from('profiles').select('role').eq('id', params.id).maybeSingle();

  if (!target) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
  if (target.role !== 'sub_admin') {
    return NextResponse.json({ error: 'Only resellers have terms.' }, { status: 400 });
  }

  const planType = String(body.plan_type ?? 'none');
  if (!PLANS.includes(planType)) {
    return NextResponse.json({ error: 'Unknown plan.' }, { status: 400 });
  }

  const planAmount = money(body.plan_amount ?? 0);
  const perCard = money(body.per_card_amount ?? 0);
  const listPrice = money(body.list_price ?? 0);
  const percent = money(body.per_card_percent ?? 0, 100);
  const renewAmount = money(body.renewal_amount ?? 0);
  const renewPercent = money(body.renewal_percent ?? 0, 100);

  if (
    planAmount === null || perCard === null || listPrice === null ||
    percent === null || renewAmount === null || renewPercent === null
  ) {
    return NextResponse.json({ error: 'Those numbers do not look right.' }, { status: 400 });
  }

  const cardPeriod = String(body.card_period ?? 'lifetime');
  if (!['lifetime', 'monthly', 'yearly'].includes(cardPeriod)) {
    return NextResponse.json({ error: 'Unknown card period.' }, { status: 400 });
  }

  // null means unlimited, which is different from 0 (meaning "no cards at all").
  // An empty box has to mean unlimited, or every new reseller starts blocked.
  const rawLimit = body.card_limit;
  const cardLimit =
    rawLimit === null || rawLimit === '' || rawLimit === undefined
      ? null
      : Number.isInteger(Number(rawLimit)) && Number(rawLimit) >= 0
        ? Number(rawLimit)
        : undefined;

  if (cardLimit === undefined) {
    return NextResponse.json({ error: 'Card limit must be a whole number, or empty for unlimited.' }, { status: 400 });
  }

  const graceDays = Number(body.grace_days ?? 7);
  if (!Number.isInteger(graceDays) || graceDays < 0 || graceDays > 365) {
    return NextResponse.json({ error: 'Grace days must be between 0 and 365.' }, { status: 400 });
  }

  /* What this reseller is allowed to sell.
     Missing until now, and it mattered: this upsert rewrites the whole row, so
     a terms edit was quietly resetting grants to the column default — and any
     reseller set up by hand never had one in the first place. Their review QR
     said "not part of your plan", theirs and every customer's beneath them,
     while the reseller believed they had bought it. */
  const grants = { reviews: body.grants?.reviews === true };

  const { error } = await db.from('reseller_terms').upsert({
    profile_id: params.id,
    grants,
    plan_type: planType,
    plan_amount: planAmount,
    plan_expires_at: body.plan_expires_at || null,
    per_card_amount: perCard,
    per_card_percent: percent,
    list_price: listPrice,
    card_period: cardPeriod,
    renewal_amount: renewAmount,
    renewal_percent: renewPercent,
    card_limit: cardLimit,
    grace_days: graceDays,
    notes: body.notes ? String(body.notes).slice(0, 2000) : null,
  });

  if (error) {
    console.error('[terms]', error);
    return NextResponse.json({ error: 'Could not save those terms.' }, { status: 500 });
  }

  await auditAction({
    action: 'terms.update',
    targetType: 'profile',
    targetId: params.id,
    detail: {
      plan: planType, plan_amount: planAmount,
      per_card: perCard, list_price: listPrice, percent,
      card_period: cardPeriod, renewal: renewAmount, renewal_percent: renewPercent,
      card_limit: cardLimit, grace_days: graceDays, grants,
    },
  });

  return NextResponse.json({ ok: true });
}
