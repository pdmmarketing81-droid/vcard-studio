import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import UserManager, { type PersonRow } from '@/components/admin/UserManager';

export const metadata: Metadata = { title: 'People · vCard Studio' };
export const dynamic = 'force-dynamic';

/**
 * Every account in the system, and the controls to change them.
 *
 * Reads with the service_role key rather than the visitor's session, on
 * purpose: RLS deliberately hides other people's rows, and this is the one
 * screen whose whole job is to show them. The gate is requireAdmin('main_admin')
 * on the line above — RLS is not doing the guarding here, so that call is
 * load-bearing and must not be removed.
 */
export default async function PeoplePage() {
  const me = await requireAdmin('main_admin');
  const db = supabaseAdmin();

  const [{ data: profiles }, { data: authUsers }, { data: cards }] = await Promise.all([
    db.from('profiles').select('*').order('created_at'),
    db.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    db.from('businesses').select('owner_id'),
  ]);

  const emailOf = new Map(authUsers.users.map((u) => [u.id, u.email ?? '']));
  const cardCount = new Map<string, number>();
  for (const c of cards ?? []) {
    if (c.owner_id) cardCount.set(c.owner_id, (cardCount.get(c.owner_id) ?? 0) + 1);
  }

  const people: PersonRow[] = (profiles ?? []).map((p) => ({
    id: p.id,
    email: emailOf.get(p.id) ?? '(no email)',
    role: p.role,
    parent_id: p.parent_id,
    full_name: p.full_name,
    business_name: p.business_name,
    suspended: p.suspended,
    cards: cardCount.get(p.id) ?? 0,
    isMe: p.id === me.id,
  }));

  const counts = {
    main: people.filter((p) => p.role === 'main_admin').length,
    resellers: people.filter((p) => p.role === 'sub_admin').length,
    customers: people.filter((p) => p.role === 'end_user').length,
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">People</h1>
          <p className="text-sm text-slate-500">
            {counts.main} main admin · {counts.resellers} reseller
            {counts.resellers === 1 ? '' : 's'} · {counts.customers} customer
            {counts.customers === 1 ? '' : 's'}
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← Cards
        </Link>
      </div>

      <UserManager people={people} />
    </div>
  );
}
