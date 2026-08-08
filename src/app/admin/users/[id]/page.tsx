import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import ResellerTerms, { type Terms, type LedgerRow } from '@/components/admin/ResellerTerms';

export const metadata: Metadata = { title: 'Reseller · vCard Studio' };
export const dynamic = 'force-dynamic';

export default async function ResellerPage({ params }: { params: { id: string } }) {
  await requireAdmin('main_admin');
  const db = supabaseAdmin();

  const { data: profile } = await db
    .from('profiles')
    .select('id, role, full_name, business_name, phone, suspended')
    .eq('id', params.id)
    .maybeSingle();

  if (!profile) notFound();

  const [{ data: authUser }, { data: terms }, { data: balance }, { data: ledger }, { data: customers }] =
    await Promise.all([
      db.auth.admin.getUserById(params.id),
      db.from('reseller_terms').select('*').eq('profile_id', params.id).maybeSingle(),
      db.rpc('wallet_balance', { p_profile: params.id }),
      db.from('wallet_transactions')
        .select('id, amount, kind, note, created_at')
        .eq('profile_id', params.id)
        .order('created_at', { ascending: false })
        .limit(30),
      // Their own cards AND their customers' — from the main admin's side, a
      // reseller's page should answer "what has this person actually sold?" in
      // one look, without going through each customer.
      db.from('profiles').select('id, business_name, full_name').eq('parent_id', params.id),
    ]);

  const customerIds = (customers ?? []).map((c) => c.id);
  const { data: cards } = await db
    .from('businesses')
    .select('id, slug, name, logo_url, published, view_count, owner_id, expires_at, suspended_at')
    .in('owner_id', [params.id, ...customerIds])
    .order('created_at', { ascending: false });

  const customerName = new Map(
    (customers ?? []).map((c) => [c.id, c.business_name || c.full_name || 'Customer'])
  );

  const email = authUser?.user?.email ?? '(no email)';
  const isReseller = profile.role === 'sub_admin';

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {profile.business_name || profile.full_name || email}
          </h1>
          <p className="text-sm text-slate-500">
            {email} · {profile.role.replace('_', ' ')}
            {profile.suspended && <span className="ml-2 text-amber-600">paused</span>}
          </p>
        </div>
        <Link href="/admin/users" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← People
        </Link>
      </div>

      {/* Their customers and cards, whatever their role. This is the screen
          that answers "what has this person sold?" without clicking through
          each customer one at a time. */}
      <div className="card-panel mb-4 p-5">
        <div className="mb-3 flex items-baseline justify-between">
          <p className="font-semibold text-slate-800">
            Cards ({cards?.length ?? 0})
          </p>
          <p className="text-xs text-slate-400">
            {customers?.length ?? 0} customer{(customers?.length ?? 0) === 1 ? '' : 's'}
          </p>
        </div>

        {(cards?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500">No cards yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {cards!.map((c) => (
              <li key={c.id} className="flex items-center gap-3 py-2.5">
                {c.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-lg bg-slate-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    /{c.slug} · {c.view_count} views
                    {c.owner_id !== params.id && ` · ${customerName.get(c.owner_id!) ?? 'customer'}`}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  {c.suspended_at ? (
                    <span className="font-semibold text-amber-600">paused</span>
                  ) : !c.published ? (
                    <span className="text-slate-400">not live</span>
                  ) : c.expires_at ? (
                    <span className="text-slate-400">
                      till {new Date(c.expires_at).toLocaleDateString('en-IN', {
                        day: 'numeric', month: 'short', year: '2-digit',
                      })}
                    </span>
                  ) : (
                    <span className="text-slate-400">no expiry</span>
                  )}
                </div>
                <Link
                  href={`/admin/${c.id}/edit`}
                  className="shrink-0 text-xs font-semibold text-slate-500 hover:text-slate-900"
                >
                  Edit
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {isReseller ? (
        <ResellerTerms
          userId={params.id}
          terms={
            (terms ?? {
              plan_type: 'none',
              plan_amount: 0,
              plan_expires_at: null,
              per_card_amount: 0,
              per_card_percent: 0,
              list_price: 0,
              card_period: 'lifetime',
              renewal_amount: 0,
              renewal_percent: 0,
              card_limit: null,
              grace_days: 7,
              notes: null,
            }) as Terms
          }
          balance={Number(balance ?? 0)}
          ledger={(ledger ?? []) as LedgerRow[]}
        />
      ) : (
        <div className="card-panel p-5 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Not a reseller</p>
          <p className="mt-1">
            Wallets and pricing only apply to resellers. Change this account&apos;s role on the
            People screen if that is what you meant.
          </p>
        </div>
      )}
    </div>
  );
}
