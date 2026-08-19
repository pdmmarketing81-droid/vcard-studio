import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTemplate } from '@/lib/templates';
import { PublishToggle, DuplicateButton, DeleteButton } from '@/components/admin/CardActions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  custom_domain: string | null;
  template: string;
  published: boolean;
  view_count: number;
  owner_id: string | null;
};

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

/**
 * The main admin's home.
 *
 * It used to list every card in the system. That was fine with six and useless
 * with six hundred — once resellers are making cards, this page becomes a wall
 * of other people's work with your own three cards buried in it.
 *
 * So it shows what only you can act on: your own cards, and the resellers.
 * Their cards are not hidden, they are one click away on the reseller — which
 * is also where their wallet and terms live, so the numbers sit next to the
 * person they belong to instead of scattered down a list.
 */
export default async function AdminHome() {
  const me = await requireAdmin();
  const db = supabaseAdmin();

  const [{ data: cardData }, { data: people }] = await Promise.all([
    db
      .from('businesses')
      .select('id, slug, name, logo_url, custom_domain, template, published, view_count, owner_id')
      .order('created_at', { ascending: false }),
    db.from('profiles').select('id, role, parent_id, full_name, business_name, suspended'),
  ]);

  const cards = (cardData ?? []) as Row[];
  const profiles = people ?? [];

  const mine = cards.filter((c) => c.owner_id === me.id);
  const resellers = profiles.filter((p) => p.role === 'sub_admin');
  const directCustomers = profiles.filter((p) => p.role === 'end_user' && !p.parent_id);

  // One pass instead of a filter per reseller — with a few hundred cards the
  // difference stops being theoretical.
  const ownerOf = new Map(profiles.map((p) => [p.id, p]));
  const countFor = new Map<string, { total: number; live: number }>();
  for (const c of cards) {
    const owner = c.owner_id ? ownerOf.get(c.owner_id) : null;
    if (!owner) continue;
    const key = owner.role === 'sub_admin' ? owner.id : owner.parent_id;
    if (!key) continue;
    const cur = countFor.get(key) ?? { total: 0, live: 0 };
    cur.total += 1;
    if (c.published) cur.live += 1;
    countFor.set(key, cur);
  }

  const balances = await Promise.all(
    resellers.map((r) => db.rpc('wallet_balance', { p_profile: r.id }))
  );
  const walletOf = new Map(resellers.map((r, i) => [r.id, Number(balances[i].data ?? 0)]));

  const totalLive = cards.filter((c) => c.published).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Overview</h1>
          <p className="text-sm text-slate-500">
            {cards.length} cards on the platform · {totalLive} live · {resellers.length} resellers
          </p>
        </div>
        <Link
          href="/admin/new"
          className="shrink-0 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          + New card
        </Link>
      </div>

      {/* ---------------------------- resellers ---------------------------- */}
      <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-400">
        Resellers
      </h2>

      {resellers.length === 0 ? (
        <p className="card-panel p-5 text-sm text-slate-600">
          No resellers yet. Add one from <Link href="/admin/users" className="underline">People</Link>.
        </p>
      ) : (
        <div className="space-y-2">
          {resellers.map((r) => {
            const c = countFor.get(r.id) ?? { total: 0, live: 0 };
            const wallet = walletOf.get(r.id) ?? 0;
            return (
              <Link
                key={r.id}
                href={`/admin/users/${r.id}`}
                className="card-panel flex items-center gap-3 p-4 transition hover:border-slate-300"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-sm font-bold text-violet-700">
                  {(r.business_name || r.full_name || 'R').slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {r.business_name || r.full_name || 'Reseller'}
                    {r.suspended && (
                      <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-700">
                        paused
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {c.total} card{c.total === 1 ? '' : 's'} · {c.live} live · wallet {rupees(wallet)}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-slate-400">Open →</span>
              </Link>
            );
          })}
        </div>
      )}

      {directCustomers.length > 0 && (
        <p className="mt-3 text-xs text-slate-500">
          Plus {directCustomers.length} customer{directCustomers.length === 1 ? '' : 's'} who
          bought directly —{' '}
          <Link href="/admin/users" className="underline">see them in People</Link>.
        </p>
      )}

      {/* ----------------------------- own cards ---------------------------- */}
      <h2 className="mb-2 mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">
        Your own cards
      </h2>

      {mine.length === 0 ? (
        <p className="card-panel p-5 text-sm text-slate-600">
          None yet. Cards you make yourself appear here; cards a reseller makes appear
          under that reseller.
        </p>
      ) : (
        <div className="space-y-2">
          {mine.map((c) => (
            <div key={c.id} className="card-panel flex items-center gap-3 p-3">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo_url} alt="" className="h-11 w-11 rounded-lg object-contain" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-400">
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                  <PublishToggle id={c.id} published={c.published} />
                </div>
                <p className="truncate text-xs text-slate-400">
                  /{c.slug}
                  {c.custom_domain && ` · ${c.custom_domain}`} · {getTemplate(c.template).name} ·{' '}
                  {c.view_count} views
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <Link
                  href={`/admin/${c.id}/edit`}
                  className="text-xs font-semibold text-slate-700 transition hover:text-slate-900"
                >
                  Edit
                </Link>
                <DuplicateButton id={c.id} />
                <Link
                  href={`/${c.slug}`}
                  target="_blank"
                  className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
                >
                  Open
                </Link>
                <DeleteButton id={c.id} name={c.name} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
