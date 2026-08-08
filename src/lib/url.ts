import { headers } from 'next/headers';

/**
 * The absolute, publicly-shareable URL of the current card.
 * Derived from the incoming Host header so it is automatically correct on
 * localhost, on the platform domain, and on a client's own custom domain —
 * without any per-environment configuration.
 */
export function absoluteUrl(path = ''): string {
  const h = headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') || host.startsWith('127.') ? 'http' : 'https');
  return `${proto}://${host}${path}`;
}

/**
 * A "where to go next" value that came from the address bar, made safe.
 *
 * Anything that could send someone off this site is thrown away. Without this,
 * `?next=https://not-us.example` turns our own login page into a way to bounce
 * people somewhere else — with our domain in the link they clicked, which is
 * exactly what makes that trick work.
 *
 * Rejected: absolute URLs, protocol-relative `//evil.com`, and anything not
 * starting with a single slash. Backslashes go too — some browsers read
 * `/\evil.com` as protocol-relative.
 */
export function safeNext(value: string | undefined, fallback = '/after-login'): string {
  if (!value) return fallback;
  const v = value.trim();
  if (!v.startsWith('/')) return fallback;
  if (v.startsWith('//') || v.startsWith('/\\')) return fallback;
  if (v.includes('://')) return fallback;
  return v;
}

export function currentHost(): string {
  const h = headers();
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '')
    .split(':')[0]
    .toLowerCase();
}
