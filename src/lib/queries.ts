import { supabase } from './supabase';
import type { BusinessFull, ReviewBusiness } from './types';

const SELECT = `
  *,
  social_links(*),
  services(*),
  packages(*),
  testimonials(*),
  gallery_items(*),
  videos(*),
  business_hours(*)
`;

type Sortable = { sort_order: number };

function bySortOrder<T extends Sortable>(rows: T[] | null | undefined): T[] {
  return (rows ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);
}

/** Postgrest returns related rows in arbitrary order; impose ours once, here. */
function normalise(row: BusinessFull): BusinessFull {
  return {
    ...row,
    extras: row.extras ?? {},
    social_links: bySortOrder(row.social_links),
    services: bySortOrder(row.services),
    packages: bySortOrder(row.packages),
    testimonials: bySortOrder(row.testimonials),
    gallery_items: bySortOrder(row.gallery_items),
    videos: bySortOrder(row.videos),
    business_hours: (row.business_hours ?? [])
      .slice()
      .sort((a, b) => a.day_of_week - b.day_of_week),
  };
}

export async function getBusinessBySlug(slug: string): Promise<BusinessFull | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT)
    .eq('slug', slug)
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  return normalise(data as unknown as BusinessFull);
}

export async function getBusinessByDomain(domain: string): Promise<BusinessFull | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(SELECT)
    .eq('custom_domain', domain.toLowerCase())
    .eq('published', true)
    .maybeSingle();

  if (error || !data) return null;
  return normalise(data as unknown as BusinessFull);
}

/** Just the fields the review page needs — no child tables, so it loads fast. */
export async function getReviewBusiness(slug: string): Promise<ReviewBusiness | null> {
  const { data, error } = await supabase
    .from('businesses')
    .select(
      'id, slug, name, tagline, logo_url, theme_color, template, ' +
        'review_enabled, google_review_url, review_threshold, review_headline, review_thanks'
    )
    .eq('slug', slug)
    .eq('published', true)
    .eq('review_enabled', true)
    .maybeSingle();

  if (error || !data) return null;
  // Postgrest can't infer a shape from a column string, so it hands back a
  // union that never narrows. The columns above match ReviewBusiness exactly.
  return data as unknown as ReviewBusiness;
}

/** Fire-and-forget; a failed counter must never break the page render. */
export async function recordView(slug: string): Promise<void> {
  try {
    await supabase.rpc('increment_view_count', { card_slug: slug });
  } catch {
    /* ignore */
  }
}
