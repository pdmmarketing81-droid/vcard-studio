import Link from 'next/link';

/**
 * The review funnel, explained on the landing page.
 *
 * It was missing entirely, which meant half of what a customer pays for was
 * invisible until after they had paid. Shown as the two paths a rating can
 * take, because that split is the whole product — and it is also the part a
 * shop owner immediately understands, having been burned by a public 2-star
 * before.
 */
export default function ReviewSection() {
  return (
    <section className="relative overflow-hidden border-t border-slate-200 bg-white">
      <div
        aria-hidden
        className="lp-blob pointer-events-none absolute -left-40 top-10 h-[420px] w-[420px] rounded-full opacity-50"
      />

      <div className="relative mx-auto w-full max-w-[1480px] px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3.5 py-1.5 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            Included with every card
          </span>
          <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            More Google reviews. Fewer public complaints.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            A second QR code for your counter. The customer taps a star, and what happens
            next depends on how many they tapped.
          </p>
        </div>

        <div className="mx-auto mt-14 grid max-w-5xl items-stretch gap-6 lg:grid-cols-[1fr_auto_1fr]">
          {/* ------------------------------ happy ------------------------------ */}
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-8">
            <p className="text-3xl">★★★★★</p>
            <p className="mt-4 text-lg font-bold text-slate-900">Four or five stars</p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              Straight to your Google page. No thank-you screen, no extra tap — the moment
              they choose, they are already there, while they still mean it.
            </p>
            <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-emerald-700">
              Your Google rating goes up
            </p>
          </div>

          {/* the fork */}
          <div className="flex items-center justify-center lg:flex-col lg:gap-4">
            <div className="hidden h-16 w-px bg-slate-200 lg:block" />
            <div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 shadow-sm">
              one QR
            </div>
            <div className="hidden h-16 w-px bg-slate-200 lg:block" />
          </div>

          {/* ------------------------------ unhappy ------------------------------ */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-8">
            <p className="text-3xl text-slate-300">★★★<span className="text-slate-200">★★</span></p>
            <p className="mt-4 text-lg font-bold text-slate-900">Three or fewer</p>
            <p className="mt-2.5 text-sm leading-relaxed text-slate-600">
              A private form instead. They tell you what went wrong, with photos or video
              if they like, and it lands in your inbox — not on your Google page.
            </p>
            <p className="mt-5 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              You hear it first, and can fix it
            </p>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-2xl text-center">
          <p className="text-sm leading-relaxed text-slate-500">
            Every rating is recorded either way, so you can see how you are really doing —
            not only the complaints.
          </p>
          <Link
            href="/pricing#direct"
            className="mt-6 inline-block rounded-xl bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            See plans with reviews
          </Link>
        </div>
      </div>
    </section>
  );
}
