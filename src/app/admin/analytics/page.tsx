import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = { title: 'Analytics · Wizart Studio' };
export const dynamic = 'force-dynamic';

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;
const num = (n: number) => Number(n).toLocaleString('en-IN');

interface Stats {
  cards: number; live: number; suspended: number;
  views_total: number; views_30: number; views_prev30: number;
  people: number; resellers: number | null; customers: number | null;
  balance: number; taken: number | null; spent: number;
  expiring: number; feedback_30: number;
}

/** A number with its meaning underneath, not a number on its own. */
function Stat({
  label, value, note, tone = 'plain',
}: {
  label: string; value: string; note?: string;
  tone?: 'plain' | 'warn' | 'good';
}) {
  const colour =
    tone === 'warn' ? 'text-amber-700' : tone === 'good' ? 'text-emerald-700' : 'text-slate-900';
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold ${colour}`}>{value}</p>
      {note && <p className="mt-1 text-xs leading-relaxed text-slate-500">{note}</p>}
    </div>
  );
}

export default async function AnalyticsPage() {
  const me = await requireAdmin('main_admin', 'sub_admin');
  const db = supabaseAdmin();

  const [{ data: raw }, { data: series }] = await Promise.all([
    db.rpc('dashboard_stats', { p_profile: me.id }),
    db.rpc('views_series', { p_profile: me.id, p_days: 30 }),
  ]);

  const s = (raw ?? {}) as Partial<Stats>;
  const days = (series ?? []) as { day: string; views: number }[];
  const isMain = me.role === 'main_admin';

  const v30 = Number(s.views_30 ?? 0);
  const vPrev = Number(s.views_prev30 ?? 0);

  /* Growth against nothing is not growth. With no previous month to compare,
     a percentage would be either infinity or a confident-looking zero, and
     both read as fact. */
  const change =
    vPrev > 0 ? Math.round(((v30 - vPrev) / vPrev) * 100) : null;

  const peak = Math.max(1, ...days.map((d) => Number(d.views)));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Analytics</h1>
        <p className="mt-1 text-sm text-slate-500">
          {isMain
            ? 'Everything across the platform.'
            : 'Your cards and your customers’ cards.'}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Cards"
          value={num(s.cards ?? 0)}
          note={`${num(s.live ?? 0)} live${
            (s.suspended ?? 0) > 0 ? ` · ${num(s.suspended ?? 0)} suspended` : ''
          }`}
        />
        <Stat
          label="Views · 30 days"
          value={num(v30)}
          note={
            change === null
              ? 'No earlier month to compare with yet'
              : `${change >= 0 ? '+' : ''}${change}% vs the 30 days before`
          }
          tone={change !== null && change < 0 ? 'warn' : 'plain'}
        />
        <Stat label="Views · all time" value={num(s.views_total ?? 0)} />
        <Stat
          label="Renewing soon"
          value={num(s.expiring ?? 0)}
          note="Cards whose year runs out within 30 days"
          tone={(s.expiring ?? 0) > 0 ? 'warn' : 'plain'}
        />
      </div>

      {/* ------------------------------ chart ------------------------------ */}
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-bold text-slate-800">Views, last 30 days</p>
          <p className="text-xs text-slate-400">peak {num(peak)} in a day</p>
        </div>

        {days.every((d) => Number(d.views) === 0) ? (
          /* Day-by-day counting started with this release, so an empty chart
             here means "not measured yet", not "nobody came". Saying so is the
             difference between a quiet week and a broken feature. */
          <p className="mt-4 rounded-lg bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            Nothing recorded yet. Views started being counted by day from today —
            the all-time number above covers everything before that.
          </p>
        ) : (
          <div className="mt-5 flex h-32 items-end gap-[3px]">
            {days.map((d) => {
              const h = Math.round((Number(d.views) / peak) * 100);
              return (
                <div
                  key={d.day}
                  title={`${d.day} · ${num(d.views)} views`}
                  className="flex-1 rounded-t bg-violet-500/80 transition hover:bg-violet-600"
                  style={{ height: `${Math.max(h, 2)}%` }}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* ------------------------------ money ------------------------------ */}
      <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">
        Money
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label={isMain ? 'Taken in' : 'Wallet'}
          value={rupees(isMain ? Number(s.taken ?? 0) : Number(s.balance ?? 0))}
          note={isMain ? 'Every top-up and plan payment ever' : 'Available to spend on cards'}
        />
        <Stat
          label="Spent on cards"
          value={rupees(Number(s.spent ?? 0))}
          note={isMain ? 'Charged to resellers and customers' : 'What your cards have cost you'}
        />
        {isMain && (
          <Stat
            label="Sitting in wallets"
            value={rupees(Number(s.taken ?? 0) - Number(s.spent ?? 0))}
            note="Paid for but not yet used — owed as cards, not profit"
          />
        )}
        {!isMain && (
          <Stat label="Your customers" value={num(s.people ?? 0)} />
        )}
        <Stat
          label="Private feedback · 30 days"
          value={num(s.feedback_30 ?? 0)}
          note="Ratings that went to the private form instead of Google"
        />
      </div>

      {isMain && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-bold uppercase tracking-wide text-slate-400">
            People
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Resellers" value={num(s.resellers ?? 0)} />
            <Stat label="Customers" value={num(s.customers ?? 0)} />
          </div>
        </>
      )}

      <p className="mt-8 text-xs leading-relaxed text-slate-500">
        {isMain ? (
          <>
            &ldquo;Sitting in wallets&rdquo; is money already taken for cards not yet
            made. It is a promise outstanding, not earnings —{' '}
            <Link href="/admin/users" className="underline">
              see who is holding it
            </Link>
            .
          </>
        ) : (
          <>
            Your wallet is what you have left to make cards with.{' '}
            <Link href="/reseller" className="underline">
              Top it up
            </Link>{' '}
            before it runs out, so a customer never waits.
          </>
        )}
      </p>
    </div>
  );
}
