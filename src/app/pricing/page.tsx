import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SiteFooter from '@/components/SiteFooter';

export const metadata: Metadata = {
  title: 'Pricing · Wizart Studio',
  description: 'What a digital business card costs, and what it costs to sell them.',
};

export const revalidate = 300;

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

interface PlanRow {
  id: string;
  slug: string;
  audience: 'reseller' | 'direct';
  name: string;
  tagline: string | null;
  features: unknown;
  price: number;
  period: 'once' | 'monthly' | 'yearly';
  opening_balance: number;
  per_card_amount: number;
}

function PlanCard({ plan }: { plan: PlanRow }) {
  const features = Array.isArray(plan.features) ? (plan.features as string[]) : [];
  const per =
    plan.period === 'once' ? 'one time'
    : plan.period === 'yearly' ? 'per year'
    : 'per month';

  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 p-6 transition hover:border-violet-300 hover:shadow-lg hover:shadow-violet-900/5">
      <p className="text-base font-bold text-slate-900">{plan.name}</p>
      {plan.tagline && <p className="mt-1 text-sm text-slate-500">{plan.tagline}</p>}

      <p className="mt-4">
        <span className="text-3xl font-bold text-slate-900">{rupees(plan.price)}</span>
        <span className="ml-1.5 text-sm text-slate-500">{per}</span>
      </p>

      {features.length > 0 && (
        <ul className="mt-5 flex-1 space-y-2">
          {features.map((f) => (
            <li key={f} className="flex gap-2 text-sm leading-relaxed text-slate-600">
              <span aria-hidden className="mt-0.5 font-bold text-violet-500">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href={`/signup?plan=${plan.slug}`}
        className="mt-6 rounded-xl bg-violet-600 px-5 py-3 text-center text-sm font-semibold text-white shadow-lg shadow-violet-600/20 transition hover:bg-violet-700"
      >
        Get started
      </Link>
    </div>
  );
}

export default async function PricingPage() {
  const { data } = await supabase
    .from('plans')
    .select('id, slug, audience, name, tagline, features, price, period, opening_balance, per_card_amount')
    .eq('visible', true)
    .order('sort_order');

  const plans = (data ?? []) as PlanRow[];
  const direct = plans.filter((p) => p.audience === 'direct');
  const reseller = plans.filter((p) => p.audience === 'reseller');

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-5 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">W</span>
            <span className="font-bold text-slate-900">Wizart Studio</span>
          </Link>
          <nav className="ml-auto flex items-center gap-5 text-sm">
            <Link href="/login" className="text-slate-600 hover:text-slate-900">Sign in</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-4xl flex-1 px-5 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Pricing</h1>
        <p className="mt-2 max-w-lg text-base text-slate-600">
          Whether you want one card for your own business or want to sell them across your
          town.
        </p>

        {direct.length > 0 && (
          <section id="direct" className="mt-12 scroll-mt-8">
            <h2 className="text-lg font-bold text-slate-900">For your own business</h2>
            <p className="mt-1 text-sm text-slate-600">One card, yours to edit any time.</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {direct.map((p) => <PlanCard key={p.id} plan={p} />)}
            </div>
          </section>
        )}

        {reseller.length > 0 && (
          <section id="reseller" className="mt-16 scroll-mt-8">
            <h2 className="text-lg font-bold text-slate-900">To sell to others</h2>
            <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-600">
              You buy capacity from us and sell cards at whatever price you like. What your
              customer pays you never passes through us and we take no share of it.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {reseller.map((p) => <PlanCard key={p.id} plan={p} />)}
            </div>
          </section>
        )}

        {plans.length === 0 && (
          <p className="mt-10 rounded-xl border border-slate-200 p-6 text-sm text-slate-600">
            Plans are being set up. Please <Link href="/contact" className="underline">get in
            touch</Link> and we will tell you what it costs.
          </p>
        )}

        <section className="mt-16 border-t border-slate-200 pt-10">
          <h2 className="text-lg font-bold text-slate-900">Questions people ask</h2>
          <dl className="mt-5 space-y-5">
            {[
              ['Kya card baad me badal sakte hain?',
               'Haan, jitni baar chaho. QR code wahi rehta hai — usme naya content apne aap dikhne lagta hai. Chhape hue QR dobara chhapwane ki zarurat nahi.'],
              ['Reseller apne customer se kitna le sakta hai?',
               'Jitna chahe. Wo paisa seedha uske paas jaata hai, hamare beech aata hi nahi — isliye na hum use tay karte hain, na usme se kuch lete hain.'],
              ['Agar renewal na karein to card delete ho jayega?',
               'Nahi. Card ruk jaata hai par uska link chalta rehta hai — us pe hamara contact dikhta hai, taaki QR scan karne wala kahin kho na jaye. Renewal karte hi sab wapas.'],
              ['Paisa wapas milta hai?',
               'Har maamla alag dekha jaata hai, saat kaam ke din me jawab. Poori baat refunds page pe likhi hai.'],
            ].map(([q, a]) => (
              <div key={q}>
                <dt className="text-sm font-bold text-slate-900">{q}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-600">{a}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
