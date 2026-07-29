import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';
import { businessRow, uniqueSlug, writeChildren, revalidateCard } from '@/lib/adminCards';

export async function POST(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: 'Business name is required' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const slug = await uniqueSlug(db, body.slug || body.name);

  const { data: business, error } = await db
    .from('businesses')
    .insert(businessRow(body, slug))
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const warnings = await writeChildren(db, business.id, body);
  revalidateCard(slug, business.custom_domain);

  return NextResponse.json(
    { ok: true, slug, id: business.id, ...(warnings.length ? { warnings } : {}) },
    { status: warnings.length ? 207 : 200 }
  );
}

export async function GET(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .select(
      'id, slug, name, tagline, logo_url, custom_domain, template, published, view_count, created_at'
    )
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ cards: data });
}

export async function DELETE(req: Request) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }
  const { id } = await req.json().catch(() => ({ id: null }));
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: card } = await db
    .from('businesses')
    .select('slug, custom_domain')
    .eq('id', id)
    .maybeSingle();

  // Child rows cascade via FK, so one delete is enough.
  const { error } = await db.from('businesses').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (card) revalidateCard(card.slug, card.custom_domain);
  return NextResponse.json({ ok: true });
}
