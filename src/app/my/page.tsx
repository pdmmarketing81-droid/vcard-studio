import ImpersonationBar from '@/components/ImpersonationBar';
import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseServer } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';
import SignOutButton from '@/components/SignOutButton';
import CreateMyCard from '@/components/CreateMyCard';

export const metadata: Metadata = { title: 'My card · vCard Studio' };
export const dynamic = 'force-dynamic';

/**
 * The end user's home.
 *
 * No filter on owner_id here: the query asks for every card and the database
 * returns only the ones this person may see. That is true — but only since
 * migration 006.
 *
 * Before it, businesses also carried an unrestricted "published cards are
 * public" policy, and Postgres ORs policies together, so this query returned
 * every live card in the system to whoever asked. The comment that used to sit
 * here asserted the opposite and was believed for weeks. Leaning on the
 * database is still right; leaning on it without reading every policy on the
 * table is not.
 */
export default async function MyCards() {
  const me = await requireAdmin('end_user', 'sub_admin', 'main_admin');

  const { data } = await supabaseServer()
    .from('businesses')
    .select('id, slug, name, logo_url, published, view_count')
    .order('created_at', { ascending: false });

  const cards = data ?? [];

  /* Whether this person is allowed to make a card themselves.
     Terms sit on whoever pays. A customer who bought from the website has them
     on their own profile; a customer a reseller signed up has none, because the
     reseller pays and the reseller makes their card. So the presence of a terms
     row is exactly the question "did you buy this yourself", and no extra flag
     is needed to tell the two apart. */
  const db = supabaseAdmin();
  const [{ data: terms }, { data: charge }] = await Promise.all([
    db.from('reseller_terms').select('card_limit').eq('profile_id', me.id).maybeSingle(),
    db.rpc('card_charge_for', { p_profile: me.id }),
  ]);

  const limit = terms?.card_limit ?? null;
  const mayCreate = !!terms && (limit === null || cards.length < limit);

  return (
    <>
      <ImpersonationBar />
      <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          {cards.length === 1 ? 'Your card' : 'Your cards'}
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          {me.email}
          <span className="mx-1.5">·</span>
          <SignOutButton className="underline underline-offset-2 hover:text-slate-600" />
        </p>
      </div>

      {/* First thing on the page, above the list, and not behind a button. The
          whole failure this replaces was a paid customer not finding the way
          forward — so it is the way forward, sitting in plain sight. */}
      {mayCreate && (
        <div className="mb-6">
          <CreateMyCard charge={Number(charge ?? 0)} />
        </div>
      )}

      {cards.length === 0 ? (
        !mayCreate && (
          <div className="card-panel p-6 text-sm text-slate-600">
            <p className="font-semibold text-slate-800">No card yet.</p>
            <p className="mt-1">
              Whoever set up your account will add it. Once it is ready it will appear here
              and you will be able to edit it yourself.
            </p>
          </div>
        )
      ) : (
        <>
        <p className="mb-3 text-sm text-slate-600">
          Everything on your card is yours to change — photos, services, prices, contact
          buttons, and the review page. Edit it as often as you like; the printed QR code
          keeps working.
        </p>
        <ul className="space-y-3">
          {cards.map((c) => (
            <li key={c.id} className="card-panel flex items-center gap-4 p-4">
              {c.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.logo_url} alt="" className="h-12 w-12 rounded-xl object-cover" />
              ) : (
                <div className="h-12 w-12 rounded-xl bg-slate-100" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{c.name}</p>
                <p className="truncate text-xs text-slate-500">
                  /{c.slug} · {c.view_count} views
                  {!c.published && ' · not live'}
                </p>
              </div>
              {/* Edit first, and in the darker colour. This is the customer's
                  own dashboard — the thing they came here to do is change
                  their card, not look at it. */}
              <Link
                href={`/admin/${c.id}/edit`}
                className="rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                Edit card
              </Link>
              <Link
                href={`/${c.slug}`}
                target="_blank"
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Open ↗
              </Link>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
    </>
  );
}
