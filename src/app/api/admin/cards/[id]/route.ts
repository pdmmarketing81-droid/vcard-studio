import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardApi, canManageCard } from '@/lib/auth';
import {
  businessRow, uniqueSlug, writeChildren, revalidateCard, collectCardMedia,
} from '@/lib/adminCards';
import { deleteMedia } from '@/lib/storage';

const FULL_SELECT = `
  *,
  social_links(*),
  services(*),
  packages(*),
  testimonials(*),
  gallery_items(*),
  videos(*),
  business_hours(*)
`;

type Ctx = { params: { id: string } };

/** Full card including every child row — this is what the edit form loads. */
export async function GET(req: Request, { params }: Ctx) {
  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;

  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .select(FULL_SELECT)
    .eq('id', params.id)
    .maybeSingle();

  if (error) {
    console.error('[get card]', error);
    return NextResponse.json({ error: 'Could not load that card.' }, { status: 500 });
  }
  if (!data) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const owner = (data as { owner_id: string | null }).owner_id;
  if (!(await canManageCard(gate.profile, owner))) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  return NextResponse.json({ card: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from('businesses')
    .select('id, slug, custom_domain, owner_id')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  if (!(await canManageCard(gate.profile, existing.owner_id))) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  /* The slug is in a link that may already be printed on a card, a standee or
     a shop window. A main admin can still change it deliberately; nobody else
     can, because the person most likely to try is the one who does not know
     the QR codes are already out there. */
  const mayChangeSlug = gate.profile.role === 'main_admin';
  const slug =
    mayChangeSlug && body.slug && body.slug !== existing.slug
      ? await uniqueSlug(db, body.slug, existing.id)
      : existing.slug;

  /* The review funnel is a paid feature, so the decision is made here and not
     only in the form. The form hides the tab; a hidden tab stops an honest
     person, not a crafted request — and this is the only place both meet. */
  const { data: reviewsOk } = await db.rpc('has_grant', {
    p_profile: existing.owner_id,
    p_key: 'reviews',
  });

  /* What the card points at right now, before anything is overwritten.
     Changing a logo used to leave the old one in the bucket for ever. Nobody
     noticed, because nothing looked wrong — the card showed the new picture and
     the old file just sat there being paid for. A shop that redoes its photos
     twice a year would leave a trail nobody could ever find again. */
  const before = await collectCardMedia(db, params.id);

  const { data: updated, error } = await db
    .from('businesses')
    .update({
      ...businessRow(body, slug),
      ...(reviewsOk === true ? {} : { review_enabled: false }),
    })
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const warnings = await writeChildren(db, params.id, body, { replace: true });

  /* Anything that was there before and is not there now is nobody's file.
     Done after the write, and only on the difference — deleting first would
     mean a failed save leaves a card pointing at pictures that no longer
     exist, which is worse than paying for a few stray files. */
  const after = new Set(await collectCardMedia(db, params.id));
  const orphans = before.filter((u) => !after.has(u));
  if (orphans.length) await deleteMedia(orphans);

  revalidateCard(slug, updated.custom_domain);
  if (existing.slug !== slug) revalidateCard(existing.slug, existing.custom_domain);

  return NextResponse.json(
    { ok: true, slug, id: params.id, ...(warnings.length ? { warnings } : {}) },
    { status: warnings.length ? 207 : 200 }
  );
}
