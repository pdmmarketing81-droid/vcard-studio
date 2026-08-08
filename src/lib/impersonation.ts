import { createHmac, timingSafeEqual } from 'crypto';

export const IMPERSONATE_COOKIE = 'vs_as';

/**
 * "Signed in as someone else" for main admins.
 *
 * The cookie holds a user id and a signature. Two things guard it, and the
 * second matters more than the first:
 *
 *   1. The signature stops the id being edited to point at someone else.
 *   2. The server checks, on every request, that the REAL signed-in account is
 *      still a main admin. So even a perfectly forged cookie does nothing in
 *      the hands of someone who is not already an admin — and an admin who is
 *      demoted loses it immediately, without anyone having to remember to
 *      clear the cookie.
 *
 * Rule 2 is why this is safe. A cookie that granted power on its own would be
 * a password that never expires and can be copied out of a browser.
 */

function secret(): string | null {
  return process.env.APP_SECRET ?? null;
}

function sign(userId: string, key: string): string {
  return createHmac('sha256', key).update(userId).digest('hex');
}

export function makeToken(userId: string): string | null {
  const key = secret();
  if (!key) return null;
  return `${userId}.${sign(userId, key)}`;
}

/** The user id inside a token, or null if it has been tampered with. */
export function readToken(token: string | undefined): string | null {
  const key = secret();
  if (!token || !key) return null;

  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;

  const userId = token.slice(0, dot);
  const given = token.slice(dot + 1);
  const expected = sign(userId, key);

  const a = Buffer.from(given, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return null;

  return timingSafeEqual(a, b) ? userId : null;
}
