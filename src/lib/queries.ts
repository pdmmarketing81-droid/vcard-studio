import { supabase } from './supabase';
import type { BusinessFull } from './types';

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

/** Fire-and-forget; a failed counter must never break the page render. */
export async function recordView(slug: string): Promise<void> {
  try {
    await supabase.rpc('increment_view_count', { card_slug: slug });
  } catch {
    /* ignore */
  }
}
