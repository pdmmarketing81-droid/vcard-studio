import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isAdminRequest } from '@/lib/auth';
import { revalidateCard } from '@/lib/adminCards';

/** Lightweight toggle so the admin list doesn't have to round-trip a whole card. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { published } = await req.json().catch(() => ({ published: null }));
  if (typeof published !== 'boolean') {
    return NextResponse.json({ error: 'published must be true or false' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .update({ published })
    .eq('id', params.id)
    .select('slug, custom_domain, published')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  revalidateCard(data.slug, data.custom_domain);
  return NextResponse.json({ ok: true, published: data.published });
}
