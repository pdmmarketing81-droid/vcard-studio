'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Terms {
  plan_type: 'none' | 'monthly' | 'yearly' | 'lifetime';
  plan_amount: number;
  plan_expires_at: string | null;
  per_card_amount: number;
  per_card_percent: number;
  list_price: number;
  card_period: 'lifetime' | 'monthly' | 'yearly';
  renewal_amount: number;
  renewal_percent: number;
  card_limit: number | null;
  grace_days: number;
  notes: string | null;
}

export interface LedgerRow {
  id: string;
  amount: number;
  kind: string;
  note: string | null;
  created_at: string;
}

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900';
const label = 'block text-xs font-semibold text-slate-500 mb-1';

const rupees = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ResellerTerms({
  userId,
  terms,
  balance,
  ledger,
}: {
  userId: string;
  terms: Terms;
  balance: number;
  ledger: LedgerRow[];
}) {
  const router = useRouter();
  const [t, setT] = useState<Terms>(terms);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Shown live so there is never any doubt about what the reseller will be
  // charged — the same arithmetic the database does, in front of you.
  const perCard = t.per_card_amount + Math.round((t.list_price * t.per_card_percent) / 100 * 100) / 100;
  const renewal = t.renewal_amount + Math.round((t.list_price * t.renewal_percent) / 100 * 100) / 100;

  async function saveTerms() {
    setBusy(true); setError(null); setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}/terms`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(t),
    });
    const json = await res.json().catch(() => ({}));
    res.ok ? setMsg('Terms saved.') : setError(json.error ?? 'Could not save.');
    setBusy(false);
    router.refresh();
  }

  async function wallet(form: FormData) {
    setBusy(true); setError(null); setMsg(null);
    const res = await fetch(`/api/admin/users/${userId}/wallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: form.get('kind'),
        amount: Number(form.get('amount')),
        note: form.get('note'),
      }),
    });
    const json = await res.json().catch(() => ({}));
    res.ok ? setMsg(`Recorded. Balance is now ${rupees(Number(json.balance))}.`)
           : setError(json.error ?? 'Could not record that.');
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {msg && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{msg}</p>}

      {/* ----------------------------- wallet ----------------------------- */}
      <div className="card-panel p-5">
        <div className="mb-4 flex items-baseline justify-between">
          <p className="font-semibold text-slate-800">Wallet</p>
          <p className={`text-2xl font-bold ${balance <= 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {rupees(balance)}
          </p>
        </div>

        <form action={wallet} className="flex flex-wrap items-end gap-2">
          <div className="w-32">
            <label className={label}>Type</label>
            <select name="kind" defaultValue="topup" className={input}>
              <option value="topup">Top-up</option>
              <option value="refund">Refund</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </div>
          <div className="w-28">
            <label className={label}>Amount ₹</label>
            <input name="amount" type="number" step="0.01" required className={input} />
          </div>
          <div className="min-w-[8rem] flex-1">
            <label className={label}>Note</label>
            <input name="note" placeholder="UPI ref, cheque no…" className={input} />
          </div>
          <button
            disabled={busy}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Record
          </button>
        </form>

        {ledger.length > 0 && (
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {ledger.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-2">
                <span className="min-w-0 truncate text-slate-600">
                  {r.kind.replace('_', ' ')}
                  {r.note && <span className="text-slate-400"> · {r.note}</span>}
                </span>
                <span className="ml-3 shrink-0 text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString('en-IN')}
                </span>
                <span
                  className={`ml-3 w-24 shrink-0 text-right font-semibold ${
                    r.amount < 0 ? 'text-rose-600' : 'text-emerald-700'
                  }`}
                >
                  {r.amount < 0 ? '−' : '+'}{rupees(Math.abs(r.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ------------------------------ terms ------------------------------ */}
      <div className="card-panel space-y-4 p-5">
        <p className="font-semibold text-slate-800">What they pay us</p>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label}>Plan</label>
            <select
              value={t.plan_type}
              onChange={(e) => setT({ ...t, plan_type: e.target.value as Terms['plan_type'] })}
              className={input}
            >
              <option value="none">No plan fee</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
          <div>
            <label className={label}>Plan amount ₹</label>
            <input
              type="number" step="0.01" value={t.plan_amount}
              disabled={t.plan_type === 'none'}
              onChange={(e) => setT({ ...t, plan_amount: Number(e.target.value) })}
              className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
            />
          </div>
          <div>
            <label className={label}>Plan expires</label>
            <input
              type="date"
              value={t.plan_expires_at?.slice(0, 10) ?? ''}
              disabled={t.plan_type === 'none' || t.plan_type === 'lifetime'}
              onChange={(e) => setT({ ...t, plan_expires_at: e.target.value || null })}
              className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className={label}>Flat per card ₹</label>
            <input
              type="number" step="0.01" value={t.per_card_amount}
              onChange={(e) => setT({ ...t, per_card_amount: Number(e.target.value) })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>List price ₹</label>
            <input
              type="number" step="0.01" value={t.list_price}
              onChange={(e) => setT({ ...t, list_price: Number(e.target.value) })}
              className={input}
            />
          </div>
          <div>
            <label className={label}>% of list price</label>
            <input
              type="number" step="0.01" max={100} value={t.per_card_percent}
              onChange={(e) => setT({ ...t, per_card_percent: Number(e.target.value) })}
              className={input}
            />
          </div>
        </div>

        <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
          Each card costs them <strong>{rupees(perCard)}</strong>
          {perCard === 0 && ' — free'}
          {t.per_card_percent > 0 && (
            <span className="text-slate-500">
              {' '}({rupees(t.per_card_amount)} + {t.per_card_percent}% of {rupees(t.list_price)})
            </span>
          )}
        </p>
        <p className="text-xs text-slate-400">
          The percentage is taken from the list price you set here, not from whatever they
          actually sell at — that figure never reaches us and cannot be checked.
        </p>

        {/* --------------------------- renewal --------------------------- */}
        <div className="border-t border-slate-100 pt-4">
          <p className="mb-3 text-sm font-semibold text-slate-800">Renewal</p>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className={label}>Card lasts</label>
              <select
                value={t.card_period}
                onChange={(e) => setT({ ...t, card_period: e.target.value as Terms['card_period'] })}
                className={input}
              >
                <option value="lifetime">Forever — no renewal</option>
                <option value="yearly">1 year</option>
                <option value="monthly">1 month</option>
              </select>
            </div>
            <div>
              <label className={label}>Renewal flat ₹</label>
              <input
                type="number" step="0.01" value={t.renewal_amount}
                disabled={t.card_period === 'lifetime'}
                onChange={(e) => setT({ ...t, renewal_amount: Number(e.target.value) })}
                className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </div>
            <div>
              <label className={label}>Renewal % of list</label>
              <input
                type="number" step="0.01" max={100} value={t.renewal_percent}
                disabled={t.card_period === 'lifetime'}
                onChange={(e) => setT({ ...t, renewal_percent: Number(e.target.value) })}
                className={`${input} disabled:bg-slate-50 disabled:text-slate-400`}
              />
            </div>
          </div>

          {t.card_period !== 'lifetime' && (
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              Renewing costs them{' '}
              <strong>{rupees(renewal)}</strong> every{' '}
              {t.card_period === 'yearly' ? 'year' : 'month'}
              {renewal === 0 && ' — free'}
            </p>
          )}
          <p className="mt-2 text-xs text-slate-400">
            {t.card_period === 'lifetime'
              ? 'Cards made under these terms never expire and are never charged again.'
              : `If the wallet cannot pay, the card gets ${t.grace_days} day${
                  t.grace_days === 1 ? '' : 's'
                } of grace, then shows our contact page instead of going dead.`}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className={label}>Card limit (empty = unlimited)</label>
            <input
              type="number" min={0}
              value={t.card_limit ?? ''}
              onChange={(e) =>
                setT({ ...t, card_limit: e.target.value === '' ? null : Number(e.target.value) })
              }
              className={input}
            />
          </div>
          <div>
            <label className={label}>Grace days before pausing</label>
            <input
              type="number" min={0} max={365} value={t.grace_days}
              onChange={(e) => setT({ ...t, grace_days: Number(e.target.value) })}
              className={input}
            />
          </div>
        </div>

        <div>
          <label className={label}>Notes (only you see these)</label>
          <textarea
            value={t.notes ?? ''}
            onChange={(e) => setT({ ...t, notes: e.target.value })}
            rows={2}
            className={input}
          />
        </div>

        <button
          onClick={saveTerms}
          disabled={busy}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Save terms'}
        </button>
      </div>
    </div>
  );
}
