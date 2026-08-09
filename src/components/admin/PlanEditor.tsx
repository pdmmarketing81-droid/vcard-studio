'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export interface Plan {
  id: string;
  slug: string;
  audience: 'reseller' | 'direct';
  name: string;
  tagline: string | null;
  features: string[];
  /** What the software actually switches on. `features` is only the sales copy. */
  grants: { reviews?: boolean };
  price: number;
  period: 'once' | 'monthly' | 'yearly';
  opening_balance: number;
  per_card_amount: number;
  per_card_percent: number;
  list_price: number;
  card_period: 'lifetime' | 'monthly' | 'yearly';
  renewal_amount: number;
  card_limit: number | null;
  visible: boolean;
  sort_order: number;
  accounts: number;
}

const blank = (audience: Plan['audience']): Plan => ({
  id: '', slug: '', audience, name: '', tagline: null, features: [], grants: {},
  price: 0, period: audience === 'direct' ? 'yearly' : 'once',
  opening_balance: 0, per_card_amount: 0, per_card_percent: 0, list_price: 0,
  card_period: 'yearly', renewal_amount: 0, card_limit: null,
  visible: true, sort_order: 0, accounts: 0,
});

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900';
const label = 'block text-xs font-semibold text-slate-500 mb-1';
const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default function PlanEditor({ plans }: { plans: Plan[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function save() {
    if (!editing) return;
    setBusy(true); setError(null); setNote(null);
    const isNew = !editing.id;
    const res = await fetch('/api/admin/plans', {
      method: isNew ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editing),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? 'Could not save.');
    else { setEditing(null); setNote(isNew ? 'Plan created.' : 'Plan saved.'); }
    setBusy(false);
    router.refresh();
  }

  async function remove(p: Plan) {
    if (!confirm(`Delete "${p.name}"?`)) return;
    setBusy(true); setError(null); setNote(null);
    const res = await fetch('/api/admin/plans', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: p.id }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? 'Could not delete.');
    else setNote(json.message ?? 'Plan deleted.');
    setBusy(false);
    router.refresh();
  }

  const set = (patch: Partial<Plan>) => setEditing({ ...editing!, ...patch });

  return (
    <div className="space-y-4">
      {error && <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
      {note && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{note}</p>}

      {editing ? (
        <div className="card-panel space-y-4 p-5">
          <p className="font-semibold text-slate-800">
            {editing.id ? `Editing ${editing.name}` : 'New plan'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={label}>Sold to</label>
              <select
                value={editing.audience}
                onChange={(e) => set({ audience: e.target.value as Plan['audience'] })}
                className={input}
              >
                <option value="reseller">Resellers — they sell on</option>
                <option value="direct">Shopkeepers — one card for themselves</option>
              </select>
            </div>
            <div>
              <label className={label}>Plan name</label>
              <input value={editing.name} onChange={(e) => set({ name: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label}>Tagline</label>
              <input value={editing.tagline ?? ''} onChange={(e) => set({ tagline: e.target.value })} className={input} />
            </div>
            <div>
              <label className={label}>Order on the page</label>
              <input type="number" value={editing.sort_order}
                onChange={(e) => set({ sort_order: Number(e.target.value) })} className={input} />
            </div>
            <div>
              <label className={label}>They pay ₹</label>
              <input type="number" step="0.01" value={editing.price}
                onChange={(e) => set({ price: Number(e.target.value) })} className={input} />
            </div>
            <div>
              <label className={label}>How often</label>
              <select value={editing.period}
                onChange={(e) => set({ period: e.target.value as Plan['period'] })} className={input}>
                <option value="once">Once</option>
                <option value="yearly">Every year</option>
                <option value="monthly">Every month</option>
              </select>
            </div>
          </div>

          {editing.audience === 'reseller' ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-sm font-semibold text-slate-800">What a reseller gets</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className={label}>Wallet on joining ₹</label>
                  <input type="number" step="0.01" value={editing.opening_balance}
                    onChange={(e) => set({ opening_balance: Number(e.target.value) })} className={input} />
                </div>
                <div>
                  <label className={label}>Per card ₹</label>
                  <input type="number" step="0.01" value={editing.per_card_amount}
                    onChange={(e) => set({ per_card_amount: Number(e.target.value) })} className={input} />
                </div>
                <div>
                  <label className={label}>Card limit (empty = no limit)</label>
                  <input type="number" value={editing.card_limit ?? ''}
                    onChange={(e) => set({ card_limit: e.target.value === '' ? null : Number(e.target.value) })}
                    className={input} />
                </div>
              </div>
              {editing.opening_balance > editing.price && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  They pay {rupees(editing.price)} and get {rupees(editing.opening_balance)} in the
                  wallet — {rupees(editing.opening_balance - editing.price)} more than they paid.
                  That is the reason to buy the bigger plan.
                </p>
              )}
            </div>
          ) : (
            <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              A shopkeeper plan gives one card and no wallet. They pay for the card itself and
              are asked again when it expires.
            </p>
          )}

          <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
            <div>
              <label className={label}>Card lasts</label>
              <select value={editing.card_period}
                onChange={(e) => set({ card_period: e.target.value as Plan['card_period'] })} className={input}>
                <option value="yearly">1 year</option>
                <option value="monthly">1 month</option>
                <option value="lifetime">Forever</option>
              </select>
            </div>
            <div>
              <label className={label}>Renewal ₹</label>
              <input type="number" step="0.01" value={editing.renewal_amount}
                disabled={editing.card_period === 'lifetime'}
                onChange={(e) => set({ renewal_amount: Number(e.target.value) })}
                className={`${input} disabled:bg-slate-50 disabled:text-slate-400`} />
            </div>
          </div>

          <div>
            <label className={label}>Bullet points — one per line, shown on the pricing page</label>
            <textarea
              rows={5}
              value={editing.features.join('\n')}
              onChange={(e) => set({ features: e.target.value.split('\n') })}
              className={input}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <p className={label}>Included in this plan</p>
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={editing.grants?.reviews === true}
                onChange={(e) => set({ grants: { ...editing.grants, reviews: e.target.checked } })}
              />
              <span>
                Review funnel
                <span className="mt-0.5 block text-xs text-slate-500">
                  Unticking this only affects people who buy after the change. Anyone
                  already on this plan keeps what they paid for — their terms were copied
                  when they joined and are not read from here again.
                </span>
              </span>
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={editing.visible}
              onChange={(e) => set({ visible: e.target.checked })} />
            Show on the pricing page
          </label>

          <div className="flex gap-2">
            <button onClick={save} disabled={busy}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {busy ? 'Saving…' : 'Save plan'}
            </button>
            <button onClick={() => setEditing(null)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button onClick={() => setEditing(blank('reseller'))}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white">
            + Reseller plan
          </button>
          <button onClick={() => setEditing(blank('direct'))}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700">
            + Shopkeeper plan
          </button>
        </div>
      )}

      {(['reseller', 'direct'] as const).map((aud) => {
        const list = plans.filter((p) => p.audience === aud);
        if (list.length === 0) return null;
        return (
          <div key={aud}>
            <h2 className="mb-2 mt-5 text-sm font-bold uppercase tracking-wide text-slate-400">
              {aud === 'reseller' ? 'For resellers' : 'For shopkeepers'}
            </h2>
            <ul className="space-y-2">
              {list.map((p) => (
                <li key={p.id} className="card-panel flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800">
                      {p.name}
                      {!p.visible && (
                        <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-500">
                          HIDDEN
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500">
                      {rupees(p.price)}
                      {p.period !== 'once' && ` / ${p.period === 'yearly' ? 'year' : 'month'}`}
                      {p.audience === 'reseller' &&
                        ` · ${rupees(p.opening_balance)} wallet · ${rupees(p.per_card_amount)} a card`}
                      {p.accounts > 0 && ` · ${p.accounts} on this plan`}
                    </p>
                  </div>
                  <button onClick={() => setEditing(p)}
                    className="text-xs font-semibold text-slate-700 underline underline-offset-2">
                    Edit
                  </button>
                  <button onClick={() => remove(p)}
                    className="text-xs font-semibold text-rose-600 underline underline-offset-2">
                    Delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
