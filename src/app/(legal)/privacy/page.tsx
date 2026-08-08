import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy · Wizart Studio',
  description: 'What data Wizart Studio holds, why, and for how long.',
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Privacy Policy</h1>
      <p className="text-sm text-slate-400">Last updated 8 August 2026</p>

      <p>
        This describes what we hold, why we hold it, and what we do not do with it. It
        covers three different people: account holders, businesses whose card we host, and
        members of the public who visit a card.
      </p>

      <h2>If you visit a card</h2>
      <p>
        You do not need an account and we do not ask you to identify yourself. We count how
        many times a card has been opened. That count is a number on the card — it is not
        tied to you, and we do not build a profile of who visited what.
      </p>
      <p>
        We set no advertising or tracking cookies, and there is no third-party analytics on
        card pages. Cards may embed content from YouTube or Instagram; those load only when
        you scroll to them, and once loaded they are governed by those companies&apos; own
        privacy policies, not ours.
      </p>

      <h2>If you leave a review</h2>
      <p>
        Ratings above the card&apos;s threshold send you to Google, and what you write there
        is on Google, not here — we only record that a rating of that size was given.
      </p>
      <p>
        Lower ratings open a private form. What you type there, and any photos or videos you
        attach, are stored by us and emailed to the business owner. If you enter a name,
        phone number or email, they are passed on too; leave them blank and your feedback is
        anonymous.
      </p>
      <p>
        <strong>Photos you attach have their metadata removed before they are stored.</strong>{' '}
        Phone cameras write the location where a picture was taken into the file. We strip
        that out, along with the rest of the embedded metadata, so it does not travel with
        the photo.
      </p>
      <p>
        Attachments are stored on Cloudflare R2 at unguessable addresses. Anyone with the
        exact address can open the file, so please do not attach anything you would not want
        seen by whoever the business shares that email with.
      </p>

      <h2>If you have an account</h2>
      <p>We hold your email address, and whatever name, phone number and business name you give us. We also keep:</p>
      <ul>
        <li>Your role, and which reseller you belong to if you are a customer of one</li>
        <li>For resellers, the terms agreed with you and every wallet transaction</li>
        <li>A record of actions taken on the platform — who changed what, and when</li>
      </ul>
      <p>
        Passwords are handled by Supabase Auth and stored hashed. We never see them and
        cannot recover them; we can only reset them.
      </p>
      <p>
        The activity record exists so that disputes about money or access can be settled by
        looking rather than arguing. It cannot be edited or deleted, including by us.
      </p>

      <h2>Card content</h2>
      <p>
        Everything on a published card is public by design — that is what a business card
        is for. Please do not put anything on one that you would not put on a printed card
        handed to a stranger.
      </p>

      <h2>Who else sees this data</h2>
      <p>We use a small number of services, each for one job:</p>
      <ul>
        <li><strong>Supabase</strong> — database and sign-in, hosted in Mumbai</li>
        <li><strong>Cloudflare R2</strong> — images and video</li>
        <li><strong>Razorpay</strong> — payments. Card details go to them, never to us</li>
        <li>An email provider, to deliver private feedback to business owners</li>
      </ul>
      <p>
        We do not sell data. We do not share it for advertising. We do not pass it to anyone
        beyond the services above, except where the law requires it.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Card content — while the card exists, and deleted with it</li>
        <li>Private feedback — while the business&apos;s account is open, unless they delete it</li>
        <li>Wallet and payment records — as long as tax and accounting rules require</li>
        <li>Activity records — kept, as they are the record of what happened</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask what we hold about you, ask for it to be corrected, or ask us to delete
        an account and its cards. Write to{' '}
        <a href="mailto:purandardigitalmedia@gmail.com">purandardigitalmedia@gmail.com</a>{' '}
        and we will reply within seven working days.
      </p>
      <p>
        Some things we cannot delete on request: wallet and payment records, which must be
        kept for accounting, and the activity log, which would be worthless if it could be
        edited.
      </p>

      <h2>Children</h2>
      <p>
        This is a service for businesses. It is not meant for anyone under 18 and we do not
        knowingly collect their information.
      </p>

      <h2>Changes</h2>
      <p>
        If this policy changes in a way that matters, account holders will be told by email.
        The date at the top always shows the current version.
      </p>
    </>
  );
}
