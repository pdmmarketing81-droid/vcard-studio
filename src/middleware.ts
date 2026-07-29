import { NextResponse, type NextRequest } from 'next/server';

/**
 * Per-client custom domains.
 *
 * A client points their own domain (e.g. happyframestudios.com) at this app.
 * The request arrives with Host: happyframestudios.com, which is NOT our app
 * domain — so we rewrite it to /d/happyframestudios.com, which looks the card
 * up by its custom_domain column and renders it at "/".
 *
 * The URL in the address bar never changes: the visitor just sees their own
 * domain serving their own card. Works identically on Vercel, Netlify,
 * Cloudflare Pages and self-hosted Node.
 *
 * NOTE: this file must live in src/ (next to app/), not at the repo root,
 * otherwise Next.js silently never compiles it.
 */
export function middleware(req: NextRequest) {
  const host = (req.headers.get('host') ?? '').split(':')[0].toLowerCase();
  const appDomain = (process.env.NEXT_PUBLIC_APP_DOMAIN ?? '')
    .split(':')[0]
    .toLowerCase();

  const isPlatformHost =
    !host ||
    host === appDomain ||
    host === `www.${appDomain}` ||
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app') ||
    host.endsWith('.pages.dev');

  if (isPlatformHost) return NextResponse.next();

  // A custom domain serves exactly one card, at its root.
  // "www.theirdomain.com" and "theirdomain.com" are the same card, so the
  // client only ever has to store the bare domain.
  if (req.nextUrl.pathname === '/') {
    const bare = host.replace(/^www\./, '');
    const url = req.nextUrl.clone();
    url.pathname = `/d/${bare}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  // Everything except Next internals, the API routes and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
