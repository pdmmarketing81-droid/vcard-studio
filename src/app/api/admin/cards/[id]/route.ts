import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';
import { businessRow, uniqueSlug, writeChildren, revalidateCard } from '@/lib/adminCards';

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
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .select(FULL_SELECT)
    .eq('id', params.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  return NextResponse.json({ card: data });
}

export async function PATCH(req: Request, { params }: Ctx) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: existing } = await db
    .from('businesses')
    .select('id, slug, custom_domain')
    .eq('id', params.id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  // The slug is part of a link that may already be printed on a card or a
  // standee, so it only changes when the admin explicitly asks for it.
  const slug = body.slug && body.slug !== existing.slug
    ? await uniqueSlug(db, body.slug, existing.id)
    : existing.slug;

  const { data: updated, error } = await db
    .from('businesses')
    .update(businessRow(body, slug))
    .eq('id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const warnings = await writeChildren(db, params.id, body, { replace: true });

  revalidateCard(slug, updated.custom_domain);
  if (existing.slug !== slug) revalidateCard(existing.slug, existing.custom_domain);

  return NextResponse.json(
    { ok: true, slug, id: params.id, ...(warnings.length ? { warnings } : {}) },
    { status: warnings.length ? 207 : 200 }
  );
}
