import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardApi, canManageCard } from '@/lib/auth';
import { revalidateCard } from '@/lib/adminCards';

/** Lightweight toggle so the admin list doesn't have to round-trip a whole card. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;

  const { published } = await req.json().catch(() => ({ published: null }));
  if (typeof published !== 'boolean') {
    return NextResponse.json({ error: 'published must be true or false' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: card } = await db
    .from('businesses').select('owner_id').eq('id', params.id).maybeSingle();

  if (!card || !(await canManageCard(gate.profile, card.owner_id))) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const { data, error } = await db
    .from('businesses')
    .update({ published })
    .eq('id', params.id)
    .select('slug, custom_domain, published')
    .single();

  if (error) {
    console.error('[publish]', error);
    return NextResponse.json({ error: 'Could not change that.' }, { status: 500 });
  }

  revalidateCard(data.slug, data.custom_domain);
  return NextResponse.json({ ok: true, published: data.published });
}
