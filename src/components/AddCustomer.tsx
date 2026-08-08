'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

/**
 * A reseller adding one of their own customers.
 *
 * The role and the reseller are not sent from here — the server forces both.
 * A hidden field saying "end_user" would just be a suggestion the browser
 * could edit.
 */
export default function AddCustomer() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [made, setMade] = useState<{ email: string; password: string } | null>(null);

  async function create(form: FormData) {
    setBusy(true);
    setError(null);
    const password = String(form.get('password') ?? '');
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: form.get('email'),
        password,
        full_name: form.get('full_name'),
        business_name: form.get('business_name'),
        phone: form.get('phone'),
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) setError(json.error ?? 'Could not add that customer.');
    else {
      setMade({ email: json.email, password });
      setOpen(false);
    }
    setBusy(false);
    router.refresh();
  }

  if (made) {
    return (
      <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <p className="font-semibold">Customer added — send them these details.</p>
        <p className="mt-1 font-mono text-xs">{made.email} · {made.password}</p>
        <p className="mt-1 text-xs">
          No email is sent. This password is not shown again.
        </p>
        <button onClick={() => setMade(null)} className="mt-2 text-xs underline">Done</button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700"
      >
        + Add customer
      </button>
    );
  }

  return (
    <form action={create} className="card-panel space-y-3 p-5">
      <p className="font-semibold text-slate-800">Add a customer</p>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="email" type="email" required placeholder="Their email" className={input} />
        <input name="password" type="text" required minLength={8}
          placeholder="Password for them (8+)" className={input} />
        <input name="business_name" placeholder="Business name" className={input} />
        <input name="full_name" placeholder="Contact name" className={input} />
        <input name="phone" placeholder="Phone" className={input} />
      </div>
      <div className="flex gap-2">
        <button disabled={busy}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? 'Adding…' : 'Add customer'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">
          Cancel
        </button>
      </div>
    </form>
  );
}
