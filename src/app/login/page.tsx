import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import { currentProfile, homeFor } from '@/lib/session';
import { safeNext } from '@/lib/url';

export const metadata: Metadata = { title: 'Sign in · Wizart Studio' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { plan?: string; next?: string };
}) {
  const profile = await currentProfile();
  const plan = searchParams.plan;

  if (profile) {
    if (plan) redirect(`/checkout?plan=${encodeURIComponent(plan)}`);
    redirect(profile.suspended ? '/suspended' : homeFor(profile.role));
  }

  const next = plan
    ? `/checkout?plan=${encodeURIComponent(plan)}`
    : safeNext(searchParams.next);

  return <AuthForm mode="signin" next={next} />;
}
