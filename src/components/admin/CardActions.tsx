'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/** Publish / unpublish without leaving the list. */
export function PublishToggle({ id, published }: { id: string; published: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(published);
  const [pending, start] = useTransition();

  async function toggle() {
    const next = !on;
    setOn(next); // optimistic — reverted below if the request fails
    const res = await fetch(`/api/admin/cards/${id}/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: next }),
    });
    if (!res.ok) setOn(!next);
    else start(() => router.refresh());
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      title={on ? 'Published — click to hide' : 'Hidden — click to publish'}
      className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide transition ${
        on ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {on ? 'Live' : 'Hidden'}
    </button>
  );
}

export function DuplicateButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    const res = await fetch(`/api/admin/cards/${id}/duplicate`, { method: 'POST' });
    const json = await res.json();
    setBusy(false);
    // Land straight in the copy's editor — the next thing you'll do is rename it.
    if (res.ok) router.push(`/admin/${json.id}/edit`);
  }

  return (
    <button
      onClick={run}
      disabled={busy}
      className="text-xs font-semibold text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
    >
      {busy ? '…' : 'Duplicate'}
    </button>
  );
}

export function DeleteButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setBusy(true);
    await fetch('/api/admin/cards', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    router.refresh();
    setBusy(false);
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      className="text-xs font-semibold text-rose-500 transition hover:text-rose-700 disabled:opacity-50"
    >
      {busy ? '…' : 'Delete'}
    </button>
  );
}
