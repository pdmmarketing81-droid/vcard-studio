import { supabaseAdmin } from '@/lib/supabase';
import { guardApi } from '@/lib/auth';
import { auditAction } from '@/lib/audit';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Every card, as a CSV.
 *
 * This is the single most dangerous endpoint in the app. One request returns
 * the whole customer list — names, phone numbers, addresses, which reseller
 * they belong to — in a form built to be carried away. Every other route leaks
 * one card at worst; this one leaks the business.
 *
 * So it is main_admin only, and named as such rather than relying on any
 * default; it is rate limited far tighter than anything else, because nobody
 * legitimately exports twelve times an hour; and every call is written to the
 * audit log before the file is built, so an export that should not have
 * happened leaves a mark even if the caller never reads the response.
 */

/**
 * One CSV cell.
 *
 * The leading apostrophe on =, +, - and @ is not decoration. Excel and Sheets
 * treat a cell starting with those as a formula, so a business called
 * `=HYPERLINK(...)` — or a phone field somebody typed a formula into — would
 * execute when the owner opens the file. The export is read by the person who
 * trusts it most, on a machine that has everything else on it.
 */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

const HEADERS = [
  'Card name', 'Link', 'Live', 'Template', 'Views',
  'Business phone', 'Business email', 'WhatsApp', 'Address', 'Website',
  'Owner', 'Owner email', 'Owner role', 'Reseller', 'Reseller email',
  'Created', 'Expires', 'Suspended',
];

export async function GET(req: Request) {
  /* Six an hour. An export is a deliberate act — you do it, you open the file,
     you use it. A script hammering this is the shape of somebody emptying the
     database, and the tight limit turns that from a single request into
     something slow and noisy. */
  const limit = rateLimit(callerKey(req, 'export'), { max: 6, windowMs: 60 * 60_000 });
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, 'Too many exports. Please wait a while.');
  }

  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  const url = new URL(req.url);
  const reseller = url.searchParams.get('reseller') || '';
  const template = url.searchParams.get('template') || '';
  const published = url.searchParams.get('published') || '';
  const from = url.searchParams.get('from') || '';
  const to = url.searchParams.get('to') || '';

  const db = supabaseAdmin();

  let q = db
    .from('businesses')
    .select(
      'id, name, slug, published, template, view_count, phone, email, whatsapp, ' +
        'address, website, owner_id, created_at, expires_at, suspended_at'
    )
    .order('created_at', { ascending: false });

  if (template) q = q.eq('template', template);
  if (published === 'yes') q = q.eq('published', true);
  if (published === 'no') q = q.eq('published', false);
  if (from) q = q.gte('created_at', from);
  // The date box means "up to and including this day", so the range runs to the
  // end of it. Without this, choosing today returns nothing made today.
  if (to) q = q.lte('created_at', `${to}T23:59:59.999Z`);

  /* Typed by hand. The select list is built by concatenation, which defeats
     supabase-js's inference and leaves every column looking like an error
     string. Naming the shape here is clearer than fighting the generic. */
  interface CardRow {
    id: string; name: string; slug: string; published: boolean; template: string;
    view_count: number; phone: string | null; email: string | null;
    whatsapp: string | null; address: string | null; website: string | null;
    owner_id: string | null; created_at: string;
    expires_at: string | null; suspended_at: string | null;
  }

  const { data, error } = await q;
  const cards = (data ?? []) as unknown as CardRow[];

  if (error) {
    console.error('[export]', error);
    return NextResponse.json({ error: 'Could not build the export.' }, { status: 500 });
  }

  const { data: people } = await db
    .from('profiles')
    .select('id, role, full_name, business_name, parent_id');

  const byId = new Map((people ?? []).map((p) => [p.id, p]));

  // Emails live in auth, not in profiles, so they come from the admin API.
  const emails = new Map<string, string>();
  for (let page = 1; ; page++) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    for (const u of data?.users ?? []) if (u.email) emails.set(u.id, u.email);
    if (!data || data.users.length < 200) break;
  }

  const nameOf = (id: string | null) => {
    if (!id) return '';
    const p = byId.get(id);
    return p ? p.business_name || p.full_name || '' : '';
  };

  /* Filtering by reseller is done here rather than in the query because a
     reseller's rows are their own cards AND their customers' cards, which is a
     parent_id hop the query cannot make in one go. */
  const rows = cards.filter((c) => {
    if (!reseller) return true;
    if (c.owner_id === reseller) return true;
    const owner = c.owner_id ? byId.get(c.owner_id) : null;
    return owner?.parent_id === reseller;
  });

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || '';

  const lines = [HEADERS.join(',')];
  for (const c of rows) {
    const owner = c.owner_id ? byId.get(c.owner_id) : null;
    const resellerId = owner?.role === 'sub_admin' ? owner.id : (owner?.parent_id ?? null);

    lines.push(
      [
        c.name,
        `https://${domain}/${c.slug}`,
        c.published ? 'yes' : 'no',
        c.template,
        c.view_count,
        c.phone,
        c.email,
        c.whatsapp,
        c.address,
        c.website,
        nameOf(c.owner_id),
        c.owner_id ? (emails.get(c.owner_id) ?? '') : '',
        owner?.role ?? '',
        nameOf(resellerId),
        resellerId ? (emails.get(resellerId) ?? '') : '',
        c.created_at?.slice(0, 10),
        c.expires_at?.slice(0, 10) ?? '',
        c.suspended_at ? 'yes' : 'no',
      ]
        .map(cell)
        .join(',')
    );
  }

  await auditAction({
    action: 'data.export',
    // Not one business — the whole table. targetId stays null because there is
    // no single row this belongs to; the detail below is the record that matters.
    targetType: 'business',
    targetId: null,
    detail: { rows: rows.length, reseller, template, published, from, to },
  });

  const stamp = new Date().toISOString().slice(0, 10);

  /* The BOM is there so Excel opens it as UTF-8. Without it, a shop called
     "श्री" arrives as mojibake and the person exporting concludes the data is
     broken rather than the spreadsheet. */
  return new Response('﻿' + lines.join('\r\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="wizart-cards-${stamp}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
