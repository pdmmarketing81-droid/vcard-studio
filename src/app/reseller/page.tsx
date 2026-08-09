import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import AddCustomer from '@/components/AddCustomer';
import TopUpButton from '@/components/TopUpButton';

export const metadata: Metadata = { title: 'Reseller · vCard Studio' };
export const dynamic = 'force-dynamic';

const rupees = (n: number) =>
  `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export default async function ResellerHome() {
  const me = await requireAdmin('sub_admin', 'main_admin');
  const db = supabaseAdmin();

  const [{ data: customers }, { data: balance }, { data: cost }, { data: terms }] =
    await Promise.all([
      db.from('profiles')
        .select('id, full_name, business_name, suspended')
        .eq('parent_id', me.id)
        .order('created_at'),
      db.rpc('wallet_balance', { p_profile: me.id }),
      db.rpc('card_charge_for', { p_profile: me.id }),
      db.from('reseller_terms').select('card_limit').eq('profile_id', me.id).maybeSingle(),
    ]);

  const ids = [me.id, ...(customers ?? []).map((c) => c.id)];
  const { data: cards } = await db
    .from('businesses')
    .select('id, slug, name, logo_url, published, view_count, owner_id')
    .in('owner_id', ids)
    .order('created_at', { ascending: false });

  const bal = Number(balance ?? 0);
  const per = Number(cost ?? 0);
  const canAfford = per === 0 || bal >= per;
  const limit = terms?.card_limit ?? null;
  const atLimit = limit !== null && (cards?.length ?? 0) >= limit;

  const nameOf = new Map(
    (customers ?? []).map((c) => [c.id, c.business_name || c.full_name || 'Customer'])
  );

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Your business</h1>
      </div>

      {/* ----------------------------- wallet ----------------------------- */}
      <div className="card-panel mb-4 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-slate-500">Wallet</p>
          <p className={`text-3xl font-bold ${canAfford ? 'text-slate-800' : 'text-rose-600'}`}>
            {rupees(bal)}
          </p>
        </div>
        <p className="mt-2 text-sm text-slate-600">
          {per === 0
            ? 'Cards are free on your plan.'
            : `Each new card costs you ${rupees(per)}.`}
          {per > 0 && canAfford && ` That is ${Math.floor(bal / per)} more card${
            Math.floor(bal / per) === 1 ? '' : 's'
          } at this balance.`}
        </p>
        {!canAfford && (
          <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            Not enough balance to make a card. Top up below — it lands in your wallet
            within a few seconds of paying.
          </p>
        )}
        <div className="mt-4">
          <TopUpButton small={canAfford} />
        </div>
        {limit !== null && (
          <p className="mt-2 text-xs text-slate-400">
            Card limit: {cards?.length ?? 0} of {limit} used.
          </p>
        )}
      </div>

      {/* ---------------------------- actions ---------------------------- */}
      <div className="mb-6 flex flex-wrap gap-2">
        {canAfford && !atLimit ? (
          <Link
            href="/admin/new"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            + New card
          </Link>
        ) : (
          <span
            title={atLimit ? 'Card limit reached' : 'Top up your wallet first'}
            className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400"
          >
            + New card
          </span>
        )}
        <AddCustomer />
      </div>

      {/* ----------------------------- cards ----------------------------- */}
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        Cards ({cards?.length ?? 0})
      </h2>
      {(cards?.length ?? 0) === 0 ? (
        <p className="card-panel p-5 text-sm text-slate-600">
          No cards yet. Add a customer, then make their card.
        </p>
      ) : (
        <ul className="space-y-2">
          {cards!.map((c) => (
            <li key={c.id} className="card-panel flex items-center gap-3 p-4">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                <p className="truncate text-xs text-slate-500">
                  /{c.slug} · {c.view_count} views
                  {c.owner_id !== me.id && ` · ${nameOf.get(c.owner_id!) ?? 'customer'}`}
                  {!c.published && ' · not live'}
                </p>
              </div>
              <Link href={`/admin/${c.id}/edit`}
                className="text-sm font-semibold text-slate-500 hover:text-slate-900">
                Edit
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* --------------------------- customers --------------------------- */}
      {(customers?.length ?? 0) > 0 && (
        <>
          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-slate-400">
            Customers ({customers!.length})
          </h2>
          <ul className="space-y-2">
            {customers!.map((c) => (
              <li key={c.id} className="card-panel flex items-center justify-between p-3 text-sm">
                <span className="text-slate-800">
                  {c.business_name || c.full_name || 'Customer'}
                </span>
                {c.suspended && <span className="text-xs text-amber-600">paused</span>}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
    </>
  );
}
