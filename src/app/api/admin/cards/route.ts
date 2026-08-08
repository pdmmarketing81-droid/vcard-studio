import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { supabaseServer } from '@/lib/supabase-server';
import { guardApi } from '@/lib/auth';
import { businessRow, uniqueSlug, writeChildren, revalidateCard } from '@/lib/adminCards';
import { auditAction } from '@/lib/audit';
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

export async function POST(req: Request) {
  const gate = await guardApi('main_admin', 'sub_admin');
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
  const { data: business, error } = await db
    .from('businesses')
    .insert({ ...businessRow(body, slug), owner_id: owner.ownerId, published: false })
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
     copy of a rule that already exists in the database. */
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
    .select('slug, custom_domain, owner_id')
    .eq('id', id)
    .maybeSingle();

  if (!card) return NextResponse.json({ error: 'No such card.' }, { status: 404 });

  const owner = await resolveOwner(db, gate.profile, card.owner_id);
  if ('error' in owner) {
    return NextResponse.json({ error: 'That card is not yours.' }, { status: 403 });
  }

  // Child rows cascade via FK, so one delete is enough. The wallet charge is
  // deliberately NOT refunded: the card was made, and a reseller who could
  // delete-and-recreate for free would have an unlimited free tier.
  const { error } = await db.from('businesses').delete().eq('id', id);
  if (error) {
    console.error('[delete card]', error);
    return NextResponse.json({ error: 'Could not delete that card.' }, { status: 500 });
  }

  revalidateCard(card.slug, card.custom_domain);

  await auditAction({
    action: 'card.delete',
    targetType: 'business',
    targetId: id,
    detail: { slug: card.slug, owner_id: card.owner_id },
  });

  return NextResponse.json({ ok: true });
}
