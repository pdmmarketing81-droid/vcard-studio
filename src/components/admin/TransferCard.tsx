'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Hand a card to a different account.
 *
 * Behind a confirmation because it is quiet and consequential: the card looks
 * identical afterwards, its link keeps working, and the only visible change is
 * that a different person can now edit it — and will be billed for the next
 * renewal. Mistakes here are noticed late.
 */
export default function TransferCard({
  cardId,
  currentOwner,
  owners,
}: {
  cardId: string;
  currentOwner: string | null;
  owners: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [to, setTo] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choices = owners.filter((o) => o.id !== currentOwner);
  const chosen = choices.find((o) => o.id === to);

  if (choices.length === 0) return null;

  async function go() {
    setBusy(true);
    setError(null);

    const res = await fetch(`/api/admin/cards/${cardId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: to }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? 'Could not move the card.');
      setBusy(false);
      setConfirming(false);
      return;
    }

    setBusy(false);
    setConfirming(false);
    setTo('');
    router.refresh();
  }

  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-sm font-bold text-slate-800">Move this card to another account</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        The link, the QR code and everything on the card stay exactly as they are.
        What changes is who can edit it — and who pays when it next renews. Its
        renewal date does not move.
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={to}
          onChange={(e) => { setTo(e.target.value); setConfirming(false); }}
          className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Choose an account…</option>
          {choices.map((o) => (
            <option key={o.id} value={o.id}>{o.label}</option>
          ))}
        </select>

        {!confirming ? (
          <button
            type="button"
            disabled={!to}
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-40"
          >
            Move
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={go}
              disabled={busy}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50"
            >
              {busy ? 'Moving…' : `Yes, move to ${chosen?.label ?? ''}`}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
