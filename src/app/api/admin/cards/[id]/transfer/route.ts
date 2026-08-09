import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardApi, canManageCard } from '@/lib/auth';
import { revalidateCard } from '@/lib/adminCards';
import { auditAction } from '@/lib/audit';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

/**
 * Move a card to a different account.
 *
 * Needed for the ordinary things: a shopkeeper who first bought through a
 * reseller and now deals with us directly, a reseller handing a client on, a
 * card made in the wrong account at 11pm.
 *
 * Two ownership checks, not one. You must be allowed to give the card away
 * AND allowed to receive it — otherwise a reseller could push a card onto
 * somebody else's account, and with it the renewal charges that follow.
 *
 * Money is deliberately not touched. Nothing is charged and nothing refunded;
 * expires_at stays exactly where it was, so a card transferred in month eleven
 * still renews in month twelve. What changes is who pays NEXT time, because
 * payer_for_card() reads the owner. Charging on transfer would make moving a
 * card cost money, and people would stop doing it and keep cards in the wrong
 * account instead.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const limit = rateLimit(callerKey(req, 'transfer'), { max: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many attempts. Please wait a moment.');

  const gate = await guardApi('main_admin', 'sub_admin');
  if ('response' in gate) return gate.response;
  const me = gate.profile;

  const { owner_id: target } = await req.json().catch(() => ({ owner_id: null }));
  if (!target) return NextResponse.json({ error: 'Who should own it?' }, { status: 400 });

  const db = supabaseAdmin();

  const { data: card } = await db
    .from('businesses')
    .select('id, slug, name, owner_id, custom_domain')
    .eq('id', params.id)
    .maybeSingle();

  if (!card || !(await canManageCard(me, card.owner_id))) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  if (card.owner_id === target) {
    return NextResponse.json({ error: 'It already belongs to that account.' }, { status: 400 });
  }

  const { data: to } = await db
    .from('profiles')
    .select('id, role, parent_id')
    .eq('id', String(target))
    .maybeSingle();

  if (!to) return NextResponse.json({ error: 'That account does not exist.' }, { status: 404 });

  /* A main admin may hand a card to anyone. A reseller may only move it within
     their own book — to themselves or to one of their own customers. Checked
     against the database, never against what the browser sent. */
  if (me.role !== 'main_admin' && to.id !== me.id && to.parent_id !== me.id) {
    return NextResponse.json({ error: 'That account is not yours.' }, { status: 403 });
  }

  const { error } = await db
    .from('businesses')
    .update({ owner_id: to.id })
    .eq('id', card.id);

  if (error) {
    console.error('[transfer]', error);
    return NextResponse.json({ error: 'Could not move the card.' }, { status: 500 });
  }

  /* Logged with both ends. "Whose card was this in March" is exactly the
     question a billing dispute turns on, and the card row only ever shows the
     current answer. */
  await auditAction({
    action: 'card.transfer',
    targetType: 'business',
    targetId: card.id,
    detail: { slug: card.slug, from: card.owner_id, to: to.id },
  });

  revalidateCard(card.slug, card.custom_domain);

  return NextResponse.json({ ok: true });
}
