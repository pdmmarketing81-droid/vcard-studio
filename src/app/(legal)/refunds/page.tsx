import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Refunds & Cancellation · Wizart Studio',
  description: 'How refunds and cancellations work at Wizart Studio.',
};

export default function RefundsPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Refunds &amp; Cancellation</h1>
      <p className="text-sm text-slate-400">Last updated 8 August 2026</p>

      <h2>What you are paying for</h2>
      <p>
        Money paid to us goes into a wallet on your reseller account. Nothing is bought at
        that moment — the balance sits there until you create or renew a card, and each one
        takes an amount out of it at your agreed rate.
      </p>

      <h2>Asking for a refund</h2>
      <p>
        We look at refund requests individually. Write to{' '}
        <a href="mailto:purandardigitalmedia@gmail.com">purandardigitalmedia@gmail.com</a>{' '}
        with the account email and what happened, and we will reply within{' '}
        <strong>seven working days</strong> with a decision and the reason for it.
      </p>
      <p>Being straight about how we look at it:</p>
      <ul>
        <li>
          <strong>Unspent balance</strong> — a genuine request for money still sitting in the
          wallet is usually agreed, particularly if it went in recently or by mistake.
        </li>
        <li>
          <strong>Something went wrong at our end</strong> — if a charge was taken twice, or
          taken for a card that was never made, we put it right. Tell us and we will fix it
          whether or not you ask for a refund.
        </li>
        <li>
          <strong>Cards already made</strong> — once a card exists it has been delivered, so
          the charge for it normally stands. If the card was made in error and taken down
          straight away, say so and we will look at it.
        </li>
        <li>
          <strong>What you charged your own customer</strong> — that payment never came to
          us and we cannot refund it. That is between you and them.
        </li>
      </ul>

      <h2>How a refund is paid</h2>
      <p>
        Back to the same method it came from, through Razorpay. Once we approve it, it is
        sent within <strong>five to seven working days</strong>; how long it then takes to
        appear depends on your bank.
      </p>

      <h2>Cancelling</h2>
      <p>
        There is nothing to cancel — no subscription runs on its own. Stop topping up and
        nothing more is charged. Cards on a term simply stop renewing when the wallet cannot
        cover them, with a grace period first.
      </p>
      <p>
        To close an account entirely, email us. We will tell you what happens to any cards
        under it before anything is removed.
      </p>

      <h2>If you bought your card from a reseller</h2>
      <p>
        You paid your reseller directly and we never saw that money, so we cannot refund it.
        Please speak to them. If you cannot reach them at all, write to us anyway — we would
        rather help you keep your card working than leave you stuck.
      </p>
    </>
  );
}
