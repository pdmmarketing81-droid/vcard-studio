import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { guardApi } from '@/lib/auth';
import { uniqueSlug, CHILD_TABLES } from '@/lib/adminCards';

/**
 * Clones a card and everything under it.
 *
 * The point of this is repeat sales: the second photographer in a city wants
 * roughly the first one's card. Cloning turns a 20-minute job into renaming
 * a few fields.
 *
 * The copy is created unpublished and without a custom domain — a duplicate
 * silently going live on someone else's domain would be a nasty surprise.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardApi();
  if ('response' in gate) return gate.response;

  const db = supabaseAdmin();

  const { data: source, error: readError } = await db
    .from('businesses')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (readError) return NextResponse.json({ error: readError.message }, { status: 500 });
  if (!source) return NextResponse.json({ error: 'Card not found' }, { status: 404 });

  const { id: _id, created_at: _c, updated_at: _u, ...rest } = source;
  const slug = await uniqueSlug(db, `${source.slug}-copy`);

  const { data: copy, error: writeError } = await db
    .from('businesses')
    .insert({
      ...rest,
      slug,
      name: `${source.name} (copy)`,
      custom_domain: null,
      published: false,
      view_count: 0,
    })
    .select()
    .single();

  if (writeError) return NextResponse.json({ error: writeError.message }, { status: 500 });

  const warnings: string[] = [];
  for (const table of CHILD_TABLES) {
    const { data: children } = await db.from(table).select('*').eq('business_id', params.id);
    if (!children?.length) continue;

    const payload = children.map((row: Record<string, unknown>) => {
      const { id: _rowId, ...fields } = row;
      return { ...fields, business_id: copy.id };
    });

    const { error } = await db.from(table).insert(payload);
    if (error) warnings.push(`${table}: ${error.message}`);
  }

  return NextResponse.json(
    { ok: true, id: copy.id, slug, ...(warnings.length ? { warnings } : {}) },
    { status: warnings.length ? 207 : 200 }
  );
}
