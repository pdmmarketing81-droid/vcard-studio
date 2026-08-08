'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/slug';

/**
 * "You have paid — now make your card."
 *
 * This exists because the buying flow used to end in silence. A customer paid,
 * the money landed in their wallet, and /my told them someone else would set
 * their card up — which for a self-serve customer was nobody. This is the step
 * that was missing between paying and having something.
 *
 * Deliberately only two decisions: the business name, and the link. Everything
 * else — photos, services, hours, the review page — is on the edit screen,
 * where there is room to explain it. Asking for all of that before the card
 * exists is how people abandon a form they have already paid for.
 */
export default function CreateMyCard({ charge }: { charge: number }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The link follows the name until the moment the person edits it themselves,
  // and then it stops moving. Overwriting a link somebody has just chosen is
  // the kind of small betrayal that makes a form feel untrustworthy.
  const link = touched ? slug : slugify(name);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;

    setBusy(true);
    setError(null);

    const res = await fetch('/api/admin/cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        slug: link,
        // Made but not live. An empty card on a public link is worse than no
        // link at all, and they are one button away from publishing once it
        // has something on it.
        published: false,
      }),
    });

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? 'Could not create the card. Please try again.');
      setBusy(false);
      return;
    }

    router.push(`/admin/${json.id}/edit`);
    router.refresh();
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-violet-200 bg-violet-50/60">
      <div className="border-b border-violet-200/70 bg-white px-6 py-5">
        <p className="text-lg font-bold text-slate-900">Let&apos;s make your card</p>
        <p className="mt-1 text-sm text-slate-600">
          Your plan is active. Give your business a name and a link to get started —
          you can change everything else afterwards.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-5 px-6 py-6">
        <div>
          <label htmlFor="biz-name" className="block text-sm font-semibold text-slate-800">
            Business name
          </label>
          <input
            id="biz-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Sharma Electronics"
            autoFocus
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
          />
        </div>

        <div>
          <label htmlFor="biz-slug" className="block text-sm font-semibold text-slate-800">
            Your link
          </label>
          <div className="mt-2 flex items-center rounded-xl border border-slate-300 bg-white px-4 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-200">
            <span className="shrink-0 text-sm text-slate-400">/</span>
            <input
              id="biz-slug"
              value={link}
              onChange={(e) => {
                setTouched(true);
                setSlug(slugify(e.target.value));
              }}
              placeholder="sharma-electronics"
              className="w-full bg-transparent py-3 pl-0.5 text-sm outline-none"
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            This goes into your QR code, so pick it carefully — changing it later stops
            any QR you have already printed from working.
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
        )}

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy || !name.trim()}
            className="rounded-xl bg-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700 disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create my card'}
          </button>
          {charge > 0 && (
            <p className="text-xs text-slate-500">
              Uses ₹{charge.toLocaleString('en-IN')} from the plan you already paid for.
              Nothing more to pay.
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
