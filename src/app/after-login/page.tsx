import { redirect } from 'next/navigation';
import { currentProfile, homeFor } from '@/lib/session';

/**
 * The only landing point after signing in.
 *
 * The browser never chooses its own destination — it comes here and the server
 * looks up the role and sends it on. Doing it the other way round would mean
 * trusting a value the browser supplied about how much power it has.
 */
export default async function AfterLogin() {
  const profile = await currentProfile();
  if (!profile) redirect('/login');
  if (profile.suspended) redirect('/suspended');
  redirect(homeFor(profile.role));
}
