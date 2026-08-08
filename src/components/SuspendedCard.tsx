import type { BusinessFull } from '@/lib/types';

/**
 * What a scanner sees when a card has been suspended for non-payment.
 *
 * This is the whole reason a suspended card is not simply taken down. The QR
 * code is already printed and stuck to a shop counter; a dead link there loses
 * that person for good. Here the scan still lands somewhere, and it lands on
 * *our* contact details — so the end customer reaches us directly even if the
 * reseller who sold to them has vanished.
 *
 * The business's own name is still shown, because the visitor scanned a code
 * expecting that business and being told nothing would just be confusing. What
 * is not shown is anything the business paid for: no phone, no address, no
 * services, no gallery. The page says the card is paused and offers a way
 * forward, without pretending to be the business or blaming them in front of
 * their own customer.
 */
export default function SuspendedCard({ business }: { business: BusinessFull }) {
  const brand = business.theme_color || '#0f766e';

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-12 text-center">
      <div className="w-full max-w-sm">
        {business.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={business.logo_url}
            alt=""
            className="mx-auto h-20 w-20 rounded-2xl object-cover opacity-60 ring-1 ring-black/5"
          />
        ) : (
          <div
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl text-2xl font-bold text-white opacity-60"
            style={{ background: brand }}
          >
            {business.name.slice(0, 1).toUpperCase()}
          </div>
        )}

        <h1 className="mt-5 text-xl font-bold text-slate-800">{business.name}</h1>

        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          This card is paused at the moment. Nothing has been lost — it will be back as
          soon as it is renewed.
        </p>

        <div className="mt-7 rounded-2xl bg-slate-50 px-5 py-5 text-left">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Looking for this business?
          </p>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Get in touch with us and we will put you through, or set your own card up.
          </p>

          <div className="mt-4 space-y-2">
            <a
              href="tel:+919146919793"
              className="flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white"
              style={{ background: brand }}
            >
              Call +91 91469 19793
            </a>
            <a
              href="https://wa.me/919146919793"
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              WhatsApp us
            </a>
            <a
              href="mailto:purandardigitalmedia@gmail.com"
              className="flex w-full items-center justify-center rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              purandardigitalmedia@gmail.com
            </a>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-400">PDM Marketing · Saswad</p>
      </div>
    </main>
  );
}
