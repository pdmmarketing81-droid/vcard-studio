import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import CheckoutButton from '@/components/CheckoutButton';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = { title: 'Checkout · Wizart Studio' };
export const dynamic = 'force-dynamic';

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: { plan?: string };
}) {
  const me = await currentProfile();
  if (!me) {
    redirect(`/signup?plan=${encodeURIComponent(searchParams.plan ?? '')}`);
  }

  const { data: plan } = await supabaseAdmin()
    .from('plans')
    .select('slug, name, tagline, features, price, period, audience, opening_balance, per_card_amount, visible')
    .eq('slug', searchParams.plan ?? '')
    .maybeSingle();

  if (!plan || !plan.visible) redirect('/pricing');

  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const per =
    plan.period === 'once' ? 'one time'
    : plan.period === 'yearly' ? 'per year'
    : 'per month';

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-2xl items-center gap-4 px-5 py-4">
          <Link href="/" className="font-bold text-slate-900">Wizart Studio</Link>
          <Link href="/pricing" className="ml-auto text-sm text-slate-500 hover:text-slate-900">
            ← Other plans
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-lg flex-1 px-5 py-14">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          You&apos;re getting {plan.name}
        </h1>
        <p className="mt-1 text-sm text-slate-500">Signed in as {me.email}</p>

        <div className="mt-7 rounded-2xl border border-slate-200 p-6">
          <div className="flex items-baseline justify-between">
            <span className="text-base font-bold text-slate-900">{plan.name}</span>
            <span>
              <span className="text-2xl font-bold text-slate-900">{rupees(plan.price)}</span>
              <span className="ml-1.5 text-sm text-slate-500">{per}</span>
            </span>
          </div>
          {plan.tagline && <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>}

          {features.length > 0 && (
            <ul className="mt-5 space-y-2 border-t border-slate-100 pt-5">
              {features.map((f) => (
                <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <span aria-hidden className="mt-0.5 text-slate-400">·</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-6">
          <CheckoutButton planSlug={plan.slug} planName={plan.name} price={Number(plan.price)} />
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-500">
          Payment is handled by Razorpay — we never see your card details. Your account
          switches on as soon as they confirm the payment, usually within a few seconds.
          By paying you agree to our <Link href="/terms" className="underline">terms</Link> and{' '}
          <Link href="/refunds" className="underline">refund policy</Link>.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
