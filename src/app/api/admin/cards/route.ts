import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { supabaseServer } from '@/lib/supabase-server';
import { guardApi } from '@/lib/auth';
import {
  businessRow, uniqueSlug, writeChildren, revalidateCard, collectCardMedia,
} from '@/lib/adminCards';
import { auditAction } from '@/lib/audit';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';
import { deleteMedia } from '@/lib/storage';
import type { Profile } from '@/lib/session';

/**
 * Who a new card may belong to.
 *
 * A main admin can hand a card to anyone. A reseller can only put it in their
 * own name or one of their own customers' — asked for anyone else, we do not
 * argue, we just refuse. This is checked against the database rather than
 * against anything the browser sent, because the browser sent the id we are
 * being asked to trust.
 */
async function resolveOwner(
  db: ReturnType<typeof supabaseAdmin>,
  me: Profile,
  requested: unknown
): Promise<{ ownerId: string } | { error: string }> {
  const wanted = requested ? String(requested) : me.id;

  if (wanted === me.id) return { ownerId: me.id };

  // A customer has nobody under them, so there is no owner they could name
  // except themselves. Said plainly here rather than left to fall through the
  // reseller branch below and fail for a reason that reads like a bug.
  if (me.role === 'end_user') {
    return { error: 'You can only make a card for yourself.' };
  }

  if (me.role === 'main_admin') {
    const { data } = await db.from('profiles').select('id').eq('id', wanted).maybeSingle();
    return data ? { ownerId: wanted } : { error: 'That account does not exist.' };
  }

  const { data } = await db
    .from('profiles').select('id, parent_id').eq('id', wanted).maybeSingle();

  if (!data || data.parent_id !== me.id) {
    return { error: 'That customer is not yours.' };
  }
  return { ownerId: wanted };
}

/* end_user is here because somebody who buys a card from the website has to be
   able to make it. They were left out at first, when every card was made by an
   admin or a reseller — which meant a paying customer landed on an empty page
   with money in their wallet and no way to spend it.

   Letting them in is safe on its own terms: resolveOwner() pins the card to
   them, and debit_for_card() enforces the card_limit their plan set (1 for the
   direct plan), so this cannot become a way to mint cards. */
export async function POST(req: Request) {
  /* Creating a card spends money from a wallet. The balance is the real limit,
     but a loop against this endpoint would drain a reseller's wallet in seconds
     if their account were ever taken, and leave a trail of live cards behind. */
  const limit = rateLimit(callerKey(req, 'card-create'), { max: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many cards at once. Please wait a moment.');

  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;
  const me = gate.profile;

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const owner = await resolveOwner(db, me, body.owner_id);
  if ('error' in owner) return NextResponse.json({ error: owner.error }, { status: 403 });

  const slug = await uniqueSlug(db, body.slug || body.name);

  /* The card is created unpublished no matter what was asked for, then charged,
     then published. Doing it the other way round would put a card in front of
     the public that has not been paid for — and taking it back down afterwards
     is a worse conversation than never showing it. */
  const { data: reviewsOk } = await db.rpc('has_grant', {
    p_profile: owner.ownerId,
    p_key: 'reviews',
  });

  const { data: business, error } = await db
    .from('businesses')
    .insert({
      ...businessRow(body, slug),
      ...(reviewsOk === true ? {} : { review_enabled: false }),
      owner_id: owner.ownerId,
      published: false,
    })
    .select()
    .single();

  if (error) {
    console.error('[create card]', error);
    return NextResponse.json({ error: 'Could not create the card.' }, { status: 500 });
  }

  const { data: charged, error: chargeError } = await db.rpc('debit_for_card', {
    p_business: business.id,
  });

  if (chargeError) {
    // Nothing was paid, so nothing should remain. Removing it here keeps the
    // reseller from finding a half-made card they cannot explain.
    await db.from('businesses').delete().eq('id', business.id);
    return NextResponse.json(
      { error: chargeError.message.replace(/^.*?:\s*/, '') },
      { status: 402 }
    );
  }

  const warnings = await writeChildren(db, business.id, body);

  const shouldPublish = body.published !== false;
  if (shouldPublish) {
    await db.from('businesses').update({ published: true }).eq('id', business.id);
  }

  revalidateCard(slug, business.custom_domain);

  await auditAction({
    action: 'card.create',
    targetType: 'business',
    targetId: business.id,
    detail: { slug, owner_id: owner.ownerId, charged: Number(charged ?? 0) },
  });

  return NextResponse.json(
    {
      ok: true,
      slug,
      id: business.id,
      charged: Number(charged ?? 0),
      ...(warnings.length ? { warnings } : {}),
    },
    { status: warnings.length ? 207 : 200 }
  );
}

export async function GET() {
  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;

  /* Read through the visitor's own session so the row-level policies decide
     what comes back. supabaseAdmin() would return every card in the system to
     whoever asked, and the scoping would have to be rewritten here — a second
     copy of a rule that already exists in the database.

     This only became true with migration 006. Until then the public-read
     policy on businesses applied to signed-in users too, and since policies
     are ORed, this endpoint handed every published card to every role. */
  const { data, error } = await supabaseServer()
    .from('businesses')
    .select(
      'id, slug, name, tagline, logo_url, custom_domain, template, published, view_count, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[list cards]', error);
    return NextResponse.json({ error: 'Could not load cards.' }, { status: 500 });
  }
  return NextResponse.json({ cards: data });
}

export async function DELETE(req: Request) {
  const gate = await guardApi('main_admin', 'sub_admin');
  if ('response' in gate) return gate.response;

  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: card } = await db
    .from('businesses')
    .select('slug, custom_domain, owner_id, logo_url, cover_url')
    .eq('id', id)
    .maybeSingle();

  if (!card) return NextResponse.json({ error: 'No such card.' }, { status: 404 });

  const owner = await resolveOwner(db, gate.profile, card.owner_id);
  if ('error' in owner) {
    return NextResponse.json({ error: 'That card is not yours.' }, { status: 403 });
  }

  /* Gathered BEFORE the delete, because the rows that name these files are
     about to cascade away and there is no second chance to find out what this
     card owned. Until this existed, deleting a card removed the row and left
     every photo and video in the bucket for ever — storage nobody could see,
     nobody could reach, and nobody stopped paying for. */
  const media = await collectCardMedia(db, id);

  // Child rows cascade via FK, so one delete is enough. The wallet charge is
  // deliberately NOT refunded: the card was made, and a reseller who could
  // delete-and-recreate for free would have an unlimited free tier.
  const { error } = await db.from('businesses').delete().eq('id', id);
  if (error) {
    console.error('[delete card]', error);
    return NextResponse.json({ error: 'Could not delete that card.' }, { status: 500 });
  }

  // After the row is gone, so a storage hiccup can never leave a card that is
  // half-deleted — files missing but the card still listed.
  const removed = await deleteMedia(media);

  revalidateCard(card.slug, card.custom_domain);

  await auditAction({
    action: 'card.delete',
    targetType: 'business',
    targetId: id,
    detail: { slug: card.slug, owner_id: card.owner_id, files_removed: removed },
  });

  return NextResponse.json({ ok: true, files_removed: removed });
}
