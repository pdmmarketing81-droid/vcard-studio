import { impersonation } from '@/lib/session';
import StopImpersonating from './StopImpersonating';

/**
 * A loud, permanent reminder that you are looking at someone else's account.
 *
 * Deliberately ugly and impossible to miss. The dangerous failure of a feature
 * like this is not someone breaking in — it is a main admin forgetting they
 * are signed in as a customer and changing something in the wrong account,
 * convinced they are in their own.
 */
export default async function ImpersonationBar() {
  const session = await impersonation();
  if (!session) return null;

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
      <span>
        You are signed in as{' '}
        <strong>{session.as.business_name || session.as.full_name || session.as.email}</strong>
        {' — '}anything you change here changes their account.
      </span>
      <StopImpersonating className="underline underline-offset-2" />
    </div>
  );
}
