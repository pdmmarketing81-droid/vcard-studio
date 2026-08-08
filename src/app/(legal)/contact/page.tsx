import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact · Wizart Studio',
  description: 'How to reach Wizart Studio.',
};

/*
 * ─────────────────────────────────────────────────────────────────────────────
 * BEFORE RAZORPAY REVIEW — one thing is deliberately missing from this page.
 *
 * Indian payment providers expect a merchant's legal name and operational
 * address to appear on the site. You asked for no personal name or address to
 * be published, which is a fair thing to want, so neither is here.
 *
 * Expect Razorpay to ask for them during review. Two ways through it:
 *   • give them the details privately, through the dashboard, and see whether
 *     that satisfies the reviewer; or
 *   • put a business address here that is not your home — an office, a shop,
 *     or a rented address — along with the legal name on the Razorpay account.
 *
 * Leaving it out silently would have meant a rejected review with no
 * explanation, so it is written down here instead.
 * ─────────────────────────────────────────────────────────────────────────────
 */

export default function ContactPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Contact</h1>
      <p className="text-sm text-slate-400">We reply within one working day.</p>

      <div className="my-6 space-y-3">
        <a
          href="mailto:purandardigitalmedia@gmail.com"
          className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 no-underline transition hover:bg-slate-50"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Email
            </span>
            <span className="text-slate-900">purandardigitalmedia@gmail.com</span>
          </span>
          <span className="text-slate-300">→</span>
        </a>

        <a
          href="tel:+919146919793"
          className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 no-underline transition hover:bg-slate-50"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              Phone
            </span>
            <span className="text-slate-900">+91 91469 19793</span>
          </span>
          <span className="text-slate-300">→</span>
        </a>

        <a
          href="https://wa.me/919146919793"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-xl border border-slate-200 px-5 py-4 no-underline transition hover:bg-slate-50"
        >
          <span>
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-400">
              WhatsApp
            </span>
            <span className="text-slate-900">+91 91469 19793</span>
          </span>
          <span className="text-slate-300">→</span>
        </a>
      </div>

      <h2>What to write about where</h2>
      <ul>
        <li>
          <strong>Something wrong with a card</strong> — email is best; send the card&apos;s
          link so we can look at the same thing you are.
        </li>
        <li>
          <strong>Wallet, payments or a refund</strong> — email, from the address on the
          account. See the <a href="/refunds">refunds page</a> first.
        </li>
        <li>
          <strong>Becoming a reseller</strong> — WhatsApp or call. It is a short
          conversation and easier spoken.
        </li>
        <li>
          <strong>Your card has stopped working</strong> — call. If you bought it from a
          reseller, try them first; if you cannot reach them, come to us.
        </li>
      </ul>

      <h2>Hours</h2>
      <p>
        Monday to Saturday, 10am to 7pm IST. Messages outside those hours are answered the
        next working day.
      </p>
    </>
  );
}
