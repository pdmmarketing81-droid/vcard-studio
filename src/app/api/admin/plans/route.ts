import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { auditAction } from '@/lib/audit';
import { slugify } from '@/lib/slug';

const AUDIENCES = ['reseller', 'direct'];
const PERIODS = ['once', 'monthly', 'yearly'];
const CARD_PERIODS = ['lifetime', 'monthly', 'yearly'];

const money = (v: unknown, max = 1_000_000): number | null => {
  const n = Number(v ?? 0);
  if (!Number.isFinite(n) || n < 0 || n > max) return null;
  return Math.round(n * 100) / 100;
};

/**
 * Builds the row both create and update need, or a complaint.
 *
 * Money is validated here rather than trusted, because these numbers become
 * what people are charged. A stray character in a form field should produce a
 * message, not a plan that bills someone ten times over.
 */
function build(body: Record<string, unknown>): { row: Record<string, unknown> } | { error: string } {
  const audience = String(body.audience ?? 'reseller');
  if (!AUDIENCES.includes(audience)) return { error: 'Unknown audience.' };

  const period = String(body.period ?? 'yearly');
  if (!PERIODS.includes(period)) return { error: 'Unknown billing period.' };

  const cardPeriod = String(body.card_period ?? 'yearly');
  if (!CARD_PERIODS.includes(cardPeriod)) return { error: 'Unknown card period.' };

  const name = String(body.name ?? '').trim();
  if (!name) return { error: 'Give the plan a name.' };

  const price = money(body.price);
  const opening = money(body.opening_balance);
  const perCard = money(body.per_card_amount);
  const listPrice = money(body.list_price);
  const percent = money(body.per_card_percent, 100);
  const renewal = money(body.renewal_amount);

  if ([price, opening, perCard, listPrice, percent, renewal].some((v) => v === null)) {
    return { error: 'Those numbers do not look right.' };
  }

  const rawLimit = body.card_limit;
  const cardLimit =
    rawLimit === null || rawLimit === '' || rawLimit === undefined
      ? null
      : Number.isInteger(Number(rawLimit)) && Number(rawLimit) >= 0
        ? Number(rawLimit)
        : undefined;
  if (cardLimit === undefined) return { error: 'Card limit must be a whole number, or empty.' };

  const features = Array.isArray(body.features)
    ? body.features.map((f) => String(f).slice(0, 120)).filter(Boolean).slice(0, 12)
    : [];

  /* features is the sentence a customer reads; grants is what the software
     obeys. They are kept apart on purpose — the list used to be the only
     record of what a plan included, which meant it could promise the review
     funnel while nothing anywhere switched it on. Writing a bullet is now a
     separate act from granting the thing it describes. */
  const asked = (body.grants ?? {}) as Record<string, unknown>;
  const grants = { reviews: asked.reviews === true };

  return {
    row: {
      audience,
      name: name.slice(0, 80),
      tagline: body.tagline ? String(body.tagline).slice(0, 160) : null,
      features,
      grants,
      price,
      period,
      opening_balance: audience === 'reseller' ? opening : 0,
      per_card_amount: audience === 'reseller' ? perCard : 0,
      per_card_percent: audience === 'reseller' ? percent : 0,
      list_price: audience === 'reseller' ? listPrice : 0,
      card_period: cardPeriod,
      renewal_amount: renewal,
      card_limit: audience === 'direct' ? 1 : cardLimit,
      visible: body.visible !== false,
      sort_order: Number(body.sort_order ?? 0) || 0,
    },
  };
}

export async function POST(req: Request) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const built = build(body);
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const db = supabaseAdmin();
  const base = slugify(String(body.slug || built.row.name));
  let slug = base;
  for (let n = 2; n < 50; n++) {
    const { data } = await db.from('plans').select('id').eq('slug', slug).maybeSingle();
    if (!data) break;
    slug = `${base}-${n}`;
  }

  const { data, error } = await db
    .from('plans').insert({ ...built.row, slug }).select('id').single();

  if (error) {
    console.error('[plan create]', error);
    return NextResponse.json({ error: 'Could not create that plan.' }, { status: 500 });
  }

  await auditAction({ action: 'plan.create', targetId: data.id, detail: { slug, ...built.row } });
  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(req: Request) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: 'Which plan?' }, { status: 400 });

  const built = build(body);
  if ('error' in built) return NextResponse.json({ error: built.error }, { status: 400 });

  const { error } = await supabaseAdmin()
    .from('plans').update(built.row).eq('id', String(body.id));

  if (error) {
    console.error('[plan update]', error);
    return NextResponse.json({ error: 'Could not save that plan.' }, { status: 500 });
  }

  /* Note for whoever reads this later: changing a plan does NOT re-price the
     resellers already on it. Their terms were copied into their own row when
     they signed up. That is deliberate — a price rise should never reach
     someone silently, through a screen they never saw. */
  await auditAction({ action: 'plan.update', targetId: String(body.id), detail: built.row });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: 'Which plan?' }, { status: 400 });

  const db = supabaseAdmin();
  const { count } = await db
    .from('profiles').select('*', { count: 'exact', head: true }).eq('plan_id', id);

  // Deleting would erase which plan an existing account joined on. Hiding it
  // takes it off the pricing page and leaves that history intact.
  if ((count ?? 0) > 0) {
    await db.from('plans').update({ visible: false }).eq('id', id);
    await auditAction({ action: 'plan.hide', targetId: String(id), detail: { accounts: count } });
    return NextResponse.json({
      ok: true,
      hidden: true,
      message: `${count} account${count === 1 ? ' is' : 's are'} on this plan, so it was hidden rather than deleted.`,
    });
  }

  const { error } = await db.from('plans').delete().eq('id', id);
  if (error) {
    console.error('[plan delete]', error);
    return NextResponse.json({ error: 'Could not delete that plan.' }, { status: 500 });
  }

  await auditAction({ action: 'plan.delete', targetId: String(id) });
  return NextResponse.json({ ok: true });
}
