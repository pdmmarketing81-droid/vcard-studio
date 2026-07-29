import { createHash } from 'crypto';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'vs_admin';

function expectedToken(): string {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) throw new Error('ADMIN_PASSWORD is not set in the environment.');
  return createHash('sha256').update(pw).digest('hex');
}

export function tokenFor(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

/** Constant-time-ish compare; both sides are fixed-length hex digests. */
export function isValidToken(token: string | undefined): boolean {
  if (!token) return false;
  const expected = expectedToken();
  if (token.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) {
    diff |= token.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

export function isAdmin(): boolean {
  return isValidToken(cookies().get(ADMIN_COOKIE)?.value);
}

/** For API routes: reads the cookie off the raw Request. */
export function isAdminRequest(req: Request): boolean {
  const raw = req.headers.get('cookie') ?? '';
  const match = raw.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`));
  return isValidToken(match?.[1]);
}
