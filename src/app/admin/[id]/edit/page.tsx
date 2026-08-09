import Link from 'next/link';
import { notFound } from 'next/navigation';
import AdminForm from '@/components/AdminForm';
import TransferCard from '@/components/admin/TransferCard';
import { requireAdmin, canManageCard } from '@/lib/auth';
import { homeFor } from '@/lib/session';
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
  const me = await requireAdmin('main_admin', 'sub_admin', 'end_user');

  const { data } = await supabaseAdmin()
    .from('businesses')
    .select(FULL_SELECT)
    .eq('id', params.id)
    .maybeSingle();

  if (!data) notFound();

  // Someone else's card is not "forbidden", it is "not found". Telling a
  // stranger that a card exists but is off limits confirms it exists.
  if (!(await canManageCard(me, (data as { owner_id: string | null }).owner_id))) {
    notFound();
  }

  /* Asked about the card's OWNER, not about whoever is looking at it. A main
     admin opening a customer's card must see what that customer paid for —
     otherwise we would set up a funnel on a card whose plan does not include
     one, and only find out when it stopped working. */
  const { data: reviewsOk } = await supabaseAdmin().rpc('has_grant', {
    p_profile: (data as { owner_id: string | null }).owner_id,
    p_key: 'reviews',
  });

  /* Who this card could be moved to. A main admin may pick anyone; a reseller
     only their own book. Scoped in the query rather than filtered in the
     component, because a list that arrives in the browser has already left. */
  let owners: { id: string; label: string }[] = [];
  if (me.role === 'main_admin' || me.role === 'sub_admin') {
    const q = supabaseAdmin().from('profiles').select('id, role, full_name, business_name');
    const { data: people } =
      me.role === 'main_admin' ? await q : await q.or(`id.eq.${me.id},parent_id.eq.${me.id}`);

    owners = (people ?? []).map((p) => ({
      id: p.id,
      label:
        p.business_name ||
        p.full_name ||
        (p.role === 'main_admin' ? 'Main admin' : p.role === 'sub_admin' ? 'Reseller' : 'Customer') +
          ` · ${p.id.slice(0, 8)}`,
    }));
  }

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
          <Link href={homeFor(me.role)} className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            All cards
          </Link>
        </div>
      </div>

      <AdminForm initial={card} cardId={card.id} canUseReviews={reviewsOk === true} />

      {owners.length > 0 && (
        <div className="mt-8">
          <TransferCard
            cardId={card.id}
            currentOwner={(data as { owner_id: string | null }).owner_id}
            owners={owners}
          />
        </div>
      )}
    </div>
  );
}
