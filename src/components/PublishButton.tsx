'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Publish or unpublish, worded for the person who owns the card.
 *
 * The admin list already has a toggle for this, but it is a small grey pill
 * that says "Hidden" — readable if you know the system, meaningless if you
 * have just bought a card and are wondering why your link says "Card not
 * found". This one says what pressing it will do.
 */
export default function PublishButton({
  id,
  published,
}: {
  id: string;
  published: boolean;
}) {
  const router = useRouter();
  const [live, setLive] = useState(published);
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();

  async function toggle() {
    const next = !live;
    setLive(next); // optimistic
    setError(false);

    const res = await fetch(`/api/admin/cards/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: next }),
    });

    if (!res.ok) {
      setLive(!next);
      setError(true);
      return;
    }
    start(() => router.refresh());
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          live
            ? 'border border-slate-200 text-slate-600 hover:bg-slate-50'
            : 'bg-emerald-600 text-white hover:bg-emerald-700'
        }`}
      >
        {live ? 'Take offline' : 'Publish'}
      </button>
      {error && <span className="text-xs text-rose-600">Did not save</span>}
    </div>
  );
}
