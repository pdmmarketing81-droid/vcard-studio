'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Role } from '@/lib/session';

export interface PersonRow {
  id: string;
  email: string;
  role: Role;
  parent_id: string | null;
  full_name: string | null;
  business_name: string | null;
  suspended: boolean;
  cards: number;
  isMe: boolean;
}

const ROLE_LABEL: Record<Role, string> = {
  main_admin: 'Main admin',
  sub_admin: 'Reseller',
  end_user: 'Customer',
};

const input =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

export default function UserManager({ people }: { people: PersonRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [made, setMade] = useState<{ email: string; password: string } | null>(null);

  const resellers = people.filter((p) => p.role === 'sub_admin');

  async function patch(id: string, body: Record<string, unknown>) {
    setBusy(id);
    setError(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) setError((await res.json().catch(() => ({}))).error ?? 'That did not work.');
    setBusy(null);
    router.refresh();
  }

  /** Become this person. The server decides where they belong afterwards. */
  async function signInAs(id: string) {
    setBusy(id);
    setError(null);
    const res = await fetch('/api/admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: id }),
    });
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? 'Could not switch.');
      setBusy(null);
      return;
    }
    router.push('/after-login');
    router.refresh();
  }

  async function create(form: FormData) {
    setBusy('new');
    setError(null);
    const password = String(form.get('password') ?? '');
    const payload = {
      email: form.get('email'),
      password,
      role: form.get('role'),
      parent_id: form.get('parent_id') || null,
      full_name: form.get('full_name'),
      business_name: form.get('business_name'),
    };
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(json.error ?? 'Could not create that account.');
    } else {
      // Shown once, right here. There is no email going out, so if this is not
      // written down now it is gone and the password has to be reset.
      setMade({ email: json.email, password });
      setAdding(false);
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
      )}

      {made && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          <p className="font-semibold">Account created — copy this now.</p>
          <p className="mt-1 font-mono text-xs">
            {made.email} · {made.password}
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            No email is sent. This password is not shown again; after this it can only be reset.
          </p>
          <button onClick={() => setMade(null)} className="mt-2 text-xs underline">
            Got it
          </button>
        </div>
      )}

      {/* ------------------------------ add ------------------------------ */}
      {adding ? (
        <form
          action={create}
          className="card-panel space-y-3 p-5"
        >
          <p className="font-semibold text-slate-800">Add someone</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input name="email" type="email" required placeholder="Email" className={input} />
            <input name="password" type="text" required minLength={8}
              placeholder="Password (8+ chars)" className={input} />
            <input name="full_name" placeholder="Name (optional)" className={input} />
            <input name="business_name" placeholder="Business (optional)" className={input} />
            <select name="role" defaultValue="end_user" className={input}>
              <option value="end_user">Customer — edits only their own card</option>
              <option value="sub_admin">Reseller — sells to their own customers</option>
              <option value="main_admin">Main admin — full control</option>
            </select>
            <select name="parent_id" defaultValue="" className={input}>
              <option value="">No reseller — directly ours</option>
              {resellers.map((r) => (
                <option key={r.id} value={r.id}>
                  Under {r.business_name || r.full_name || r.email}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              disabled={busy === 'new'}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === 'new' ? 'Creating…' : 'Create account'}
            </button>
            <button type="button" onClick={() => setAdding(false)}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white"
        >
          + Add reseller or customer
        </button>
      )}

      {/* ----------------------------- list ----------------------------- */}
      <ul className="space-y-2">
        {people.map((p) => (
          <li key={p.id} className="card-panel flex flex-wrap items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">
                {p.business_name || p.full_name || p.email}
                {p.isMe && <span className="ml-2 text-xs font-normal text-slate-400">(you)</span>}
                {p.suspended && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                    PAUSED
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-slate-500">
                {p.email} · {p.cards} card{p.cards === 1 ? '' : 's'}
                {p.parent_id && ` · under ${
                  people.find((x) => x.id === p.parent_id)?.business_name ??
                  people.find((x) => x.id === p.parent_id)?.email ?? '—'
                }`}
              </p>
            </div>

            {p.role === 'sub_admin' && (
              <Link
                href={`/admin/users/${p.id}`}
                className="text-xs font-semibold text-slate-700 underline underline-offset-2"
              >
                Wallet &amp; pricing
              </Link>
            )}

            {!p.isMe && p.role !== 'main_admin' && (
              <button
                disabled={busy === p.id}
                onClick={() => signInAs(p.id)}
                className="text-xs font-semibold text-slate-700 underline underline-offset-2 disabled:opacity-50"
              >
                Sign in as
              </button>
            )}

            {p.isMe ? (
              // Deliberately not editable. Changing your own role or pausing
              // yourself locks you out of the only screen that could undo it.
              <span className="text-xs text-slate-400">{ROLE_LABEL[p.role]}</span>
            ) : (
              <>
                <select
                  value={p.role}
                  disabled={busy === p.id}
                  onChange={(e) => patch(p.id, { role: e.target.value })}
                  className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                >
                  <option value="end_user">Customer</option>
                  <option value="sub_admin">Reseller</option>
                  <option value="main_admin">Main admin</option>
                </select>

                {p.role === 'end_user' && (
                  <select
                    value={p.parent_id ?? ''}
                    disabled={busy === p.id}
                    onChange={(e) => patch(p.id, { parent_id: e.target.value || null })}
                    className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs"
                  >
                    <option value="">Ours</option>
                    {resellers.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.business_name || r.full_name || r.email}
                      </option>
                    ))}
                  </select>
                )}

                <button
                  disabled={busy === p.id}
                  onClick={() => patch(p.id, { suspended: !p.suspended })}
                  className={`text-xs font-semibold ${
                    p.suspended ? 'text-emerald-600' : 'text-amber-600'
                  } disabled:opacity-50`}
                >
                  {p.suspended ? 'Resume' : 'Pause'}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
