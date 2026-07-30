import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from './supabase';
import { slugify, normaliseDomain } from './slug';

export type Db = ReturnType<typeof supabaseAdmin>;

export const str = (v: unknown): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s;
};

export const num = (v: unknown): number | null => {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Every child table, in the order they're written. */
export const CHILD_TABLES = [
  'social_links',
  'services',
  'packages',
  'testimonials',
  'gallery_items',
  'videos',
  'business_hours',
] as const;

/** Appends -2, -3 ... until the slug is free, ignoring the card being edited. */
export async function uniqueSlug(
  db: Db,
  base: string,
  excludeId?: string
): Promise<string> {
  const root = slugify(base) || 'card';
  let candidate = root;
  for (let n = 2; n < 200; n++) {
    const query = db.from('businesses').select('id').eq('slug', candidate);
    const { data } = await (excludeId ? query.neq('id', excludeId) : query).maybeSingle();
    if (!data) return candidate;
    candidate = `${root}-${n}`;
  }
  return `${root}-${Date.now()}`;
}

type Body = Record<string, unknown>;

/** Maps the admin form payload onto a businesses row. */
export function businessRow(body: Body, slug: string) {
  return {
    slug,
    name: String(body.name).trim(),
    tagline: str(body.tagline),
    about: str(body.about),
    logo_url: str(body.logo_url),
    cover_url: str(body.cover_url),
    cover_type: body.cover_type === 'video' ? 'video' : 'image',
    email: str(body.email),
    phone: str(body.phone),
    whatsapp: str(body.whatsapp),
    address: str(body.address),
    website: str(body.website),
    custom_domain: body.custom_domain ? normaliseDomain(String(body.custom_domain)) : null,
    theme_color: (body.theme_color as string) || '#0f766e',
    template: (body.template as string) || 'classic',
    extras: body.extras && typeof body.extras === 'object' ? body.extras : {},
    design: body.design && typeof body.design === 'object' ? body.design : {},
    published: body.published !== false,

    review_enabled: body.review_enabled === true,
    google_review_url: str(body.google_review_url),
    feedback_email: str(body.feedback_email),
    review_threshold: Math.min(5, Math.max(1, num(body.review_threshold) ?? 4)),
    review_headline: str(body.review_headline),
    review_thanks: str(body.review_thanks),
  };
}

async function insertChildren<T extends Record<string, unknown>>(
  db: Db,
  table: string,
  businessId: string,
  rows: T[] | undefined,
  keep: (row: T) => boolean
): Promise<string | null> {
  const usable = (Array.isArray(rows) ? rows : []).filter(keep);
  if (usable.length === 0) return null;

  const payload = usable.map((row, i) => ({ ...row, business_id: businessId, sort_order: i }));
  const { error } = await db.from(table).insert(payload);
  return error ? `${table}: ${error.message}` : null;
}

/**
 * Replaces every child collection for a card.
 *
 * Editing deletes the old rows and re-inserts, rather than diffing. The rows
 * carry no identity the user cares about (no external references, no history),
 * so a diff would be more code for the same result. Ordering is derived from
 * array position, which makes the admin's drag-to-reorder trivially correct.
 */
export async function writeChildren(
  db: Db,
  businessId: string,
  body: Body,
  { replace = false }: { replace?: boolean } = {}
): Promise<string[]> {
  if (replace) {
    for (const table of CHILD_TABLES) {
      await db.from(table).delete().eq('business_id', businessId);
    }
  }

  const rows = <T>(key: string) => (Array.isArray(body[key]) ? (body[key] as T[]) : []);

  const problems = (
    await Promise.all([
      insertChildren(
        db,
        'social_links',
        businessId,
        rows<Body>('social_links').map((l) => ({
          platform: l.platform,
          url: str(l.url),
          label: str(l.label),
        })),
        (r) => !!r.url
      ),
      insertChildren(
        db,
        'services',
        businessId,
        rows<Body>('services').map((s) => ({
          title: str(s.title),
          description: str(s.description),
          image_url: str(s.image_url),
        })),
        (r) => !!r.title
      ),
      insertChildren(
        db,
        'packages',
        businessId,
        rows<Body>('packages').map((p) => ({
          title: str(p.title),
          description: str(p.description),
          image_url: str(p.image_url),
          net_price: num(p.net_price),
          selling_price: num(p.selling_price),
          currency: str(p.currency) ?? 'INR',
          badge: str(p.badge),
        })),
        (r) => !!r.title
      ),
      insertChildren(
        db,
        'testimonials',
        businessId,
        rows<Body>('testimonials').map((t) => ({
          author: str(t.author),
          role: str(t.role),
          avatar_url: str(t.avatar_url),
          quote: str(t.quote),
          rating: num(t.rating),
        })),
        (r) => !!r.author && !!r.quote
      ),
      insertChildren(
        db,
        'gallery_items',
        businessId,
        rows<Body>('gallery_items').map((g) => ({
          image_url: str(g.image_url),
          category: str(g.category),
          caption: str(g.caption),
        })),
        (r) => !!r.image_url
      ),
      insertChildren(
        db,
        'videos',
        businessId,
        rows<Body>('videos').map((v) => ({
          provider: v.provider === 'instagram' ? 'instagram' : 'youtube',
          url: str(v.url),
          title: str(v.title),
        })),
        (r) => !!r.url
      ),
    ])
  ).filter((p): p is string => !!p);

  // business_hours is keyed by day, not ordered, so it doesn't use insertChildren.
  const hours = rows<Body>('business_hours')
    .filter((h) => h && h.day_of_week != null)
    .map((h) => ({
      business_id: businessId,
      day_of_week: Number(h.day_of_week),
      open_time: h.closed ? null : str(h.open_time),
      close_time: h.closed ? null : str(h.close_time),
      closed: !!h.closed,
    }));

  if (hours.length) {
    const { error } = await db.from('business_hours').insert(hours);
    if (error) problems.push(`business_hours: ${error.message}`);
  }

  return problems;
}

/**
 * Cards are cached for 60s. Without this, an edit would appear to do nothing
 * for up to a minute — which reads as a bug, not a cache.
 */
export function revalidateCard(slug: string, customDomain?: string | null) {
  try {
    revalidatePath(`/${slug}`);
    if (customDomain) revalidatePath(`/d/${customDomain}`);
  } catch {
    /* revalidation is best-effort */
  }
}
