import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentProfile, homeFor } from '@/lib/session';
import { safeNext } from '@/lib/url';

export const metadata: Metadata = { title: 'Create account · Wizart Studio' };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: { plan?: string; next?: string };
}) {
  const profile = await currentProfile();
  const plan = searchParams.plan;

  if (profile) {
    // Already signed in and arriving from a pricing page: skip the form and
    // take them straight to paying for what they came for.
    if (plan) redirect(`/checkout?plan=${encodeURIComponent(plan)}`);
    redirect(profile.suspended ? '/suspended' : homeFor(profile.role));
  }

  const next = plan
    ? `/checkout?plan=${encodeURIComponent(plan)}`
    : safeNext(searchParams.next);

  return (
    <AuthForm
      mode="signup"
      next={next}
      intro={
        plan ? (
          <p className="mt-1 text-xs text-slate-500">
            Make an account first, then pay. Takes a minute.
          </p>
        ) : undefined
      }
    />
  );
}
