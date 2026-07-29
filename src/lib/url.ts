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

export function currentHost(): string {
  const h = headers();
  return (h.get('x-forwarded-host') ?? h.get('host') ?? '')
    .split(':')[0]
    .toLowerCase();
}
