import Link from 'next/link';
import AdminForm from '@/components/AdminForm';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { homeFor } from '@/lib/session';

export const dynamic = 'force-dynamic';

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default async function NewCardPage() {
  const me = await requireAdmin('main_admin', 'sub_admin');
  const db = supabaseAdmin();

  /* A reseller may only pick from themselves and their own customers. The list
     is built here, on the server, from the database — not filtered in the
     browser, where it would be a suggestion rather than a rule. The API checks
     the same thing again anyway; this list only decides what is easy to pick,
     not what is allowed. */
  const { data: people } = await db
    .from('profiles')
    .select('id, full_name, business_name, role, parent_id')
    .or(me.role === 'main_admin' ? 'id.not.is.null' : `id.eq.${me.id},parent_id.eq.${me.id}`);

  const owners = (people ?? []).map((p) => ({
    id: p.id,
    label:
      p.id === me.id
        ? 'Me'
        : p.business_name || p.full_name || `${p.role.replace('_', ' ')} account`,
  }));

  let costNote: string | null = null;
  if (me.role === 'sub_admin') {
    const [{ data: cost }, { data: balance }] = await Promise.all([
      db.rpc('card_charge_for', { p_profile: me.id }),
      db.rpc('wallet_balance', { p_profile: me.id }),
    ]);
    const c = Number(cost ?? 0);
    const b = Number(balance ?? 0);
    costNote =
      c === 0
        ? `This card is free on your plan. Wallet balance: ${rupees(b)}.`
        : b < c
          ? `This card costs ${rupees(c)} and your wallet has ${rupees(b)}. Please top up first — the card cannot be created until then.`
          : `${rupees(c)} will come out of your wallet. Balance after: ${rupees(b - c)}.`;
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">New card</h1>
        <Link
          href={homeFor(me.role)}
          className="text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          ← Back
        </Link>
      </div>
      <AdminForm owners={owners} defaultOwner={me.id} costNote={costNote} />
    </div>
  );
}
