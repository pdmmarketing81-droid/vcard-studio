import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentProfile } from '@/lib/session';
import SignOutButton from '@/components/SignOutButton';

export const metadata: Metadata = { title: 'Account paused · vCard Studio' };

/**
 * Shown to a reseller whose account has been paused.
 *
 * Deliberately calm and free of blame — this is almost always a payment that
 * has not gone through, and the person reading it is a customer we want back.
 * Their cards are not deleted; nothing is lost by paying.
 */
export default async function SuspendedPage() {
  const profile = await currentProfile();
  if (!profile) redirect('/login');
  if (!profile.suspended) redirect('/after-login');

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="card-panel w-full max-w-md space-y-4 p-7 text-center">
        <h1 className="text-lg font-bold text-slate-800">Your account is paused</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Nothing has been deleted. Your cards and all their content are safe and will
          come straight back the moment the account is active again.
        </p>
        <p className="text-sm leading-relaxed text-slate-600">
          Please get in touch and we will sort it out.
        </p>

        <div className="rounded-xl bg-slate-50 px-4 py-3 text-sm">
          <p className="font-semibold text-slate-800">PDM Marketing</p>
          <p className="mt-1 text-slate-600">purandardigitalmedia@gmail.com</p>
        </div>

        <SignOutButton className="text-xs text-slate-500 underline underline-offset-2" />
      </div>
    </div>
  );
}
