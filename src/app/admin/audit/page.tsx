import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const metadata: Metadata = { title: 'Activity · vCard Studio' };
export const dynamic = 'force-dynamic';

const WORDS: Record<string, string> = {
  'user.create': 'created an account',
  'user.update': 'changed an account',
  'terms.update': 'changed pricing',
  'wallet.entry': 'moved wallet money',
  'card.create': 'made a card',
  'card.delete': 'deleted a card',
  'session.impersonate.start': 'signed in as someone',
  'session.impersonate.stop': 'went back to their own account',
};

const MONEY = new Set(['wallet.entry', 'terms.update', 'card.create']);

export default async function AuditPage() {
  await requireAdmin('main_admin');
  const db = supabaseAdmin();

  const [{ data: rows }, { data: profiles }, { data: users }] = await Promise.all([
    db.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200),
    db.from('profiles').select('id, full_name, business_name'),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const nameOf = new Map<string, string>();
  for (const p of profiles ?? []) {
    nameOf.set(p.id, p.business_name || p.full_name || '');
  }
  for (const u of users?.users ?? []) {
    if (!nameOf.get(u.id)) nameOf.set(u.id, u.email ?? u.id.slice(0, 8));
  }
  const who = (id: string | null) => (id ? nameOf.get(id) || id.slice(0, 8) : 'someone');

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Activity</h1>
            <p className="text-sm text-slate-500">
              The last {rows?.length ?? 0} things that happened. Nothing here can be edited
              or removed.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            ← Cards
          </Link>
        </div>

        {(rows?.length ?? 0) === 0 ? (
          <p className="card-panel p-5 text-sm text-slate-600">
            Nothing recorded yet. Change a price or move some wallet money and it will
            show up here.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {rows!.map((r) => (
              <li key={r.id} className="card-panel px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline gap-x-1.5">
                  <span className="font-semibold text-slate-800">{who(r.actor_id)}</span>
                  {/* The point of the whole table: when someone was acting as
                      another account, the real person is still named first. */}
                  {r.acting_as && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      as {who(r.acting_as)}
                    </span>
                  )}
                  <span className="text-slate-600">{WORDS[r.action] ?? r.action}</span>
                  {r.target_id && r.target_id !== r.acting_as && (
                    <span className="text-slate-500">· {who(r.target_id)}</span>
                  )}
                  <span className="ml-auto shrink-0 text-xs text-slate-400">
                    {new Date(r.created_at).toLocaleString('en-IN', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </span>
                </div>

                {MONEY.has(r.action) && Object.keys(r.detail ?? {}).length > 0 && (
                  <pre className="mt-1.5 overflow-x-auto rounded bg-slate-50 px-2 py-1.5 text-[11px] leading-relaxed text-slate-600">
                    {JSON.stringify(r.detail, null, 1)}
                  </pre>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
