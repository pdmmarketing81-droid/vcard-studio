import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import AdminForm from '@/components/AdminForm';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { BusinessFull } from '@/lib/types';

export const dynamic = 'force-dynamic';

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

type Sortable = { sort_order: number };
const sorted = <T extends Sortable>(rows: T[] | null) =>
  (rows ?? []).slice().sort((a, b) => a.sort_order - b.sort_order);

export default async function EditCardPage({ params }: { params: { id: string } }) {
  if (!isAdmin()) redirect('/admin/login');

  const { data } = await supabaseAdmin()
    .from('businesses')
    .select(FULL_SELECT)
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();

  const raw = data as unknown as BusinessFull;
  const card: BusinessFull = {
    ...raw,
    extras: raw.extras ?? {},
    social_links: sorted(raw.social_links),
    services: sorted(raw.services),
    packages: sorted(raw.packages),
    testimonials: sorted(raw.testimonials),
    gallery_items: sorted(raw.gallery_items),
    videos: sorted(raw.videos),
    business_hours: (raw.business_hours ?? [])
      .slice()
      .sort((a, b) => a.day_of_week - b.day_of_week),
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-slate-800">{card.name}</h1>
          <p className="text-sm text-slate-500">
            /{card.slug} · {card.view_count.toLocaleString('en-IN')} views
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <Link href={`/${card.slug}`} target="_blank" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            Open ↗
          </Link>
          <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            All cards
          </Link>
        </div>
      </div>

      <AdminForm initial={card} cardId={card.id} />
    </div>
  );
}
