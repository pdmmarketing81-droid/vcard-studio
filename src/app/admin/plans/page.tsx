import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import PlanEditor, { type Plan } from '@/components/admin/PlanEditor';

export const metadata: Metadata = { title: 'Plans · vCard Studio' };
export const dynamic = 'force-dynamic';

export default async function PlansPage() {
  await requireAdmin('main_admin');
  const db = supabaseAdmin();

  const [{ data: plans }, { data: profiles }] = await Promise.all([
    db.from('plans').select('*').order('audience', { ascending: false }).order('sort_order'),
    db.from('profiles').select('plan_id'),
  ]);

  // How many accounts joined on each plan — shown so nobody deletes a plan
  // that people are actually on without noticing.
  const onPlan = new Map<string, number>();
  for (const p of profiles ?? []) {
    if (p.plan_id) onPlan.set(p.plan_id, (onPlan.get(p.plan_id) ?? 0) + 1);
  }

  const rows: Plan[] = (plans ?? []).map((p) => ({
    ...p,
    price: Number(p.price),
    opening_balance: Number(p.opening_balance),
    per_card_amount: Number(p.per_card_amount),
    per_card_percent: Number(p.per_card_percent),
    list_price: Number(p.list_price),
    renewal_amount: Number(p.renewal_amount),
    features: Array.isArray(p.features) ? p.features : [],
    accounts: onPlan.get(p.id) ?? 0,
  }));

  return (
    <>
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Plans</h1>
            <p className="text-sm text-slate-500">
              What people can buy on the pricing page.
            </p>
          </div>
          <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
            ← Cards
          </Link>
        </div>

        <div className="card-panel mb-4 p-4 text-sm text-slate-600">
          <p className="font-semibold text-slate-800">Changing a plan does not re-price anyone</p>
          <p className="mt-1">
            A reseller&apos;s terms are copied to their own account when they join. Raise a
            price here and only new sign-ups pay it — the ones already on it carry on
            unchanged, which is what you would want to be able to say if they asked.
          </p>
        </div>

        <PlanEditor plans={rows} />
      </div>
    </>
  );
}
