import { NextResponse } from 'next/server';

/**
 * Retired.
 *
 * This used to accept a single shared password and set a cookie that granted
 * full admin. Nothing checks that cookie any more, but the endpoint is answered
 * explicitly rather than deleted so that an old client, a stale tab or a
 * bookmarked script gets a clear answer instead of a confusing 404 — and so
 * that anyone reading the code sees that the shared password is gone on
 * purpose, not by accident.
 *
 * The old cookie is cleared on the way out; there is no reason to leave a
 * stale credential sitting in anyone's browser.
 */
function gone() {
  const res = NextResponse.json(
    { error: 'The shared admin password has been removed. Please sign in at /login.' },
    { status: 410 }
  );
  res.cookies.delete('vs_admin');
  return res;
}

export const POST = gone;
export const DELETE = gone;
