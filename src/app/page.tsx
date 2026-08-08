import Link from 'next/link';
import type { Metadata } from 'next';
import { supabase } from '@/lib/supabase';
import SiteFooter from '@/components/SiteFooter';
import CardRing, { type RingItem } from '@/components/landing/CardRing';
import ClaimLink from '@/components/landing/ClaimLink';
import ReviewSection from '@/components/landing/ReviewSection';

export const metadata: Metadata = {
  title: 'Wizart Studio — one link for your whole business',
  description:
    'A digital business card with your photos, services, contact buttons and Google reviews. One link, one QR code, live in minutes.',
};

export const revalidate = 300;

const rupees = (n: number) => `₹${Number(n).toLocaleString('en-IN')}`;

export default async function Home() {
  const [{ data: cards }, { data: plans }, { count: total }] = await Promise.all([
    supabase
      .from('businesses')
      .select('slug, name, tagline, logo_url, theme_color')
      .eq('published', true)
      .is('suspended_at', null)
      .not('logo_url', 'is', null)
      .order('view_count', { ascending: false })
      .limit(5),
    supabase.from('plans').select('price, audience').eq('visible', true),
    supabase
      .from('businesses')
      .select('*', { count: 'exact', head: true })
      .eq('published', true),
  ]);

  const showcase = (cards ?? []) as RingItem[];
  const cheapest = (plans ?? [])
    .filter((p) => p.audience === 'direct')
    .sort((a, b) => Number(a.price) - Number(b.price))[0];

  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN?.split(':')[0] || 'wizartstudio.com';

  return (
    <div className="lp-page flex min-h-screen flex-col">
      {/* ------------------------------ header ------------------------------ */}
      <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-[1480px] items-center gap-3 px-6 py-4 lg:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white shadow-lg shadow-violet-600/25">
              W
            </span>
            <span className="text-[15px] font-bold text-slate-900">Wizart Studio</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-12 text-[15px] font-medium lg:flex">
            <Link href="/pricing" className="text-slate-600 transition hover:text-slate-900">Pricing</Link>
            <Link href="/contact" className="text-slate-600 transition hover:text-slate-900">Contact</Link>
            <Link href="/login" className="text-slate-600 transition hover:text-slate-900">Sign in</Link>
          </nav>

          <Link
            href="/pricing"
            className="ml-auto rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 lg:ml-14"
          >
            Get started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* ------------------------------- hero -------------------------------
            Three background layers, all decorative: a soft violet wash on the
            right, a dot grid that fades at the edges, and a blob behind the
            mockup. None of them take pointer events. */}
        <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#ede9fe_0%,#f5f3ff_38%,#ffffff_100%)]">
          <div aria-hidden className="lp-dots pointer-events-none absolute inset-0 z-0" />
          <div aria-hidden className="lp-blob lp-glow pointer-events-none absolute -right-24 -top-48 z-0 h-[760px] w-[760px] rounded-full" />
          <div aria-hidden className="lp-blob pointer-events-none absolute -left-52 top-40 z-0 h-[560px] w-[560px] rounded-full opacity-80" />
          <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-32 bg-gradient-to-t from-white to-transparent" />

          <div className="relative z-10 mx-auto grid min-h-[calc(100vh-4.75rem)] w-full max-w-[1480px] items-center gap-12 px-6 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16 lg:px-12 lg:py-24">
            <div className="max-w-2xl">
              <span className="lp-rise lp-r1 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                The modern business card
              </span>

              <h1 className="lp-rise lp-r2 mt-7 text-[3rem] font-extrabold leading-[1.02] tracking-tight text-slate-900 sm:text-[4.6rem]">
                Your business,
                <br />
                <span className="text-violet-600">one link.</span>
              </h1>

              <p className="lp-rise lp-r3 mt-7 max-w-lg text-lg leading-relaxed text-slate-600">
                Photos, services, prices, contact buttons and Google reviews — on one page
                that opens instantly on any phone.
              </p>

              <div className="lp-rise lp-r3 mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/pricing"
                  className="rounded-xl bg-violet-600 px-7 py-4 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-700"
                >
                  Make my card →
                </Link>
                {showcase[0] && (
                  <Link
                    href={`/${showcase[0].slug}`}
                    className="rounded-xl border border-slate-300 bg-white/70 px-7 py-4 text-sm font-semibold text-slate-700 backdrop-blur transition hover:bg-white"
                  >
                    See a live card
                  </Link>
                )}
              </div>

              <div className="lp-rise lp-r3 mt-9 max-w-lg">
                <ClaimLink domain={domain} />
              </div>

              <div className="lp-rise lp-r3 mt-9 flex flex-wrap items-center gap-x-4 gap-y-3">
                {showcase.length > 1 && (
                  <div className="flex -space-x-2.5">
                    {showcase.slice(0, 4).map((c) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={c.slug}
                        src={c.logo_url!}
                        alt=""
                        className="h-9 w-9 rounded-full border-2 border-white bg-white object-cover shadow-sm"
                      />
                    ))}
                  </div>
                )}
                <div>
                  <p className="text-sm text-amber-500">★★★★★</p>
                  <p className="text-xs text-slate-500">
                    {(total ?? 0) > 3
                      ? `${total} businesses already live`
                      : 'Live for shops, clinics and studios near you'}
                    {cheapest && ` · from ${rupees(cheapest.price)} a year`}
                  </p>
                </div>
              </div>
            </div>

            <CardRing items={showcase} />
          </div>
        </section>

        {/* ----------------------------- features ----------------------------- */}
        <section className="relative border-y border-slate-200 bg-slate-50/60">
          <div className="mx-auto w-full max-w-[1480px] px-6 py-24 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                A printed card can&apos;t do this
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Everything below changes the day you change it — the QR on your board stays
                the same.
              </p>
            </div>

            <div className="mt-12 grid gap-5 md:grid-cols-3">
              {[
                ['Live in minutes', 'Fill one form. The card, the QR code and the contact download all build themselves.', 'bg-violet-100'],
                ['Change it any time', 'New price, new photo, new number. The same printed QR shows the new version.', 'bg-emerald-100'],
                ['More Google reviews', 'Happy customers go straight to Google. Complaints come privately to you first.', 'bg-amber-100'],
              ].map(([title, body, tint], i) => (
                <div
                  key={title}
                  className={`lp-rise lp-r${i + 1} rounded-2xl border border-slate-200 bg-white p-7 transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-900/5`}
                >
                  <div className={`mb-5 h-11 w-11 rounded-xl ${tint}`} />
                  <h3 className="text-lg font-bold text-slate-900">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <ReviewSection />

        {/* ---------------------------- real cards ---------------------------- */}
        {showcase.length > 1 && (
          <section className="bg-white"><div className="mx-auto w-full max-w-[1480px] px-6 py-24 lg:px-12">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900">
                Real cards, running right now
              </h2>
              <p className="mt-3 text-base text-slate-600">
                Open any of them. These are working businesses, not screenshots.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {showcase.slice(0, 4).map((c) => (
                <Link
                  key={c.slug}
                  href={`/${c.slug}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-900/5"
                >
                  <div className="h-16 w-full" style={{ background: c.theme_color }} />
                  <div className="-mt-7 px-5 pb-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.logo_url!}
                      alt=""
                      className="h-14 w-14 rounded-2xl border-4 border-white bg-white object-cover shadow-sm"
                    />
                    <p className="mt-2.5 truncate text-sm font-bold text-slate-900">{c.name}</p>
                    <p className="truncate text-xs text-slate-500">/{c.slug}</p>
                    <p className="mt-3 text-xs font-semibold text-violet-600 opacity-0 transition group-hover:opacity-100">
                      Open card →
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div></section>
        )}

        {/* ------------------------------ audiences ------------------------------ */}
        <section className="border-t border-slate-200 bg-slate-50/60">
          <div className="mx-auto grid w-full max-w-[1480px] gap-6 px-6 py-24 lg:grid-cols-2 lg:px-12">
            <div className="rounded-2xl border border-slate-200 bg-white p-9">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                For your own business
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">One card, fully yours</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Edit it whenever you like. Print the QR on your board, your bill book, your
                shop window — and change what it shows without reprinting anything.
              </p>
              <Link
                href="/pricing#direct"
                className="mt-7 inline-block rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                See what it costs
              </Link>
            </div>

            <div className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-9">
              <span className="text-xs font-bold uppercase tracking-wider text-violet-500">
                For resellers
              </span>
              <h2 className="mt-3 text-2xl font-bold text-slate-900">Sell them in your town</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Buy capacity from us and sell at your own price. What your customer pays you
                never passes through us, and we take no share of it.
              </p>
              <Link
                href="/pricing#reseller"
                className="mt-7 inline-block rounded-xl bg-violet-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-600/25 transition hover:bg-violet-700"
              >
                See reseller plans
              </Link>
            </div>
          </div>
        </section>

        {/* -------------------------------- cta -------------------------------- */}
        <section className="relative overflow-hidden border-t border-slate-200 bg-slate-900">
          <div aria-hidden className="lp-blob pointer-events-none absolute -right-20 -top-32 h-[420px] w-[420px] rounded-full opacity-70" />
          <div className="relative mx-auto max-w-3xl px-5 py-28 text-center">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Your customers already have a phone in their hand.
            </h2>
            <p className="mx-auto mt-5 max-w-md text-base leading-relaxed text-slate-300">
              Give them one link that has everything — and one QR that keeps working when
              your details change.
            </p>
            <Link
              href="/pricing"
              className="mt-9 inline-block rounded-xl bg-violet-600 px-8 py-4 text-sm font-semibold text-white shadow-xl shadow-violet-600/30 transition hover:-translate-y-0.5 hover:bg-violet-500"
            >
              Get started →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
