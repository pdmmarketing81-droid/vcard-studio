import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service · Wizart Studio',
  description: 'The terms under which Wizart Studio provides digital business cards.',
};

export default function TermsPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Terms of Service</h1>
      <p className="text-sm text-slate-400">Last updated 8 August 2026</p>

      <h2>What we provide</h2>
      <p>
        Wizart Studio makes digital business cards. A card is a web page with its own link
        and QR code, holding a business&apos;s details, photos, services and contact
        buttons. Some cards also include a review page that asks a customer for a rating
        and passes them on to Google, or takes private feedback and emails it to the
        business owner.
      </p>

      <h2>Who our customers are</h2>
      <p>There are two kinds, and the difference matters for who owes whom:</p>
      <ul>
        <li>
          <strong>Resellers</strong> buy capacity from us and sell cards to their own
          customers, at their own price. Their agreement is with us.
        </li>
        <li>
          <strong>Businesses</strong> whose card was made by a reseller are that
          reseller&apos;s customer, not ours. We host the card; what they paid, and what
          they were promised, is between them and their reseller.
        </li>
      </ul>

      <h2>How resellers pay</h2>
      <p>
        A reseller adds money to a wallet on this site. Each card they create takes an
        amount out of that wallet, at the rate agreed with them. Cards on a monthly or
        yearly term are charged again when they renew. If the wallet cannot cover a
        charge, no new card is created; for a renewal there is a grace period, after
        which the card is paused.
      </p>
      <p>
        What a reseller charges their own customer is entirely their decision. We neither
        set it nor see it, and we take no part in that payment.
      </p>

      <h2>When a card is paused</h2>
      <p>
        A paused card is not deleted and its link keeps working. It shows a short page
        saying the card is paused, with our contact details, so that anyone scanning a
        printed QR code still reaches someone. Its content is kept and returns when the
        card is renewed.
      </p>
      <p>
        If a reseller stops trading, we may take over the cards of businesses who were
        their customers, so that those cards keep working.
      </p>

      <h2>What you may not put on a card</h2>
      <ul>
        <li>Anything unlawful, or that infringes someone else&apos;s rights</li>
        <li>Images or text you do not have permission to use</li>
        <li>Content that misrepresents who the business is</li>
        <li>Anything designed to mislead, defraud or harm a visitor</li>
      </ul>
      <p>
        You keep ownership of everything you upload. You give us permission to store and
        display it for the purpose of running your card — nothing else. We do not use it
        elsewhere and we do not sell it.
      </p>

      <h2>Reviews</h2>
      <p>
        Where a card includes the review feature, it is set up by the business or their
        reseller, including the Google link it points to. The business is responsible for
        using it in line with Google&apos;s own policies on reviews. We provide the tool;
        how it is used is not in our hands.
      </p>

      <h2>Availability</h2>
      <p>
        We work to keep cards online, but we do not promise uninterrupted service. Hosting,
        storage and email all depend on third parties, and any of them can have a bad day.
        We are not liable for business lost during an outage.
      </p>

      <h2>Suspending an account</h2>
      <p>
        We may pause or close an account that breaks these terms, that we believe is being
        used fraudulently, or whose payments have not been met. Where the problem is
        payment, we will say so and give a chance to fix it first.
      </p>

      <h2>Limits of our responsibility</h2>
      <p>
        If something goes wrong and it is our fault, our responsibility is limited to what
        you paid us in the three months before it happened. We are not responsible for
        indirect losses, such as business you believe you would otherwise have won.
      </p>

      <h2>Changes</h2>
      <p>
        These terms may change. If a change materially affects resellers, we will tell them
        by email before it takes effect. The date at the top always shows the current
        version.
      </p>

      <h2>Law</h2>
      <p>
        These terms are governed by the laws of India, and the courts of India have
        jurisdiction over any dispute.
      </p>

      <h2>Getting in touch</h2>
      <p>
        Questions about these terms: <a href="mailto:purandardigitalmedia@gmail.com">
        purandardigitalmedia@gmail.com</a>. See the <a href="/contact">contact page</a> for
        everything else.
      </p>
    </>
  );
}
