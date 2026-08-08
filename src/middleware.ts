import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Two jobs, in this order.
 *
 * 1. Per-client custom domains. A client points their own domain at this app.
 *    The request arrives with Host: theirdomain.com, which is not our app
 *    domain, so it is rewritten to /d/theirdomain.com — which looks the card up
 *    by its custom_domain column and renders it at "/". The address bar never
 *    changes: the visitor just sees their own domain serving their own card.
 *
 * 2. Session refresh. Supabase access tokens are short-lived. Without a refresh
 *    on each request the cookie quietly expires and the user is thrown out
 *    mid-session. Server Components cannot write cookies, so this is the only
 *    place the refreshed token can be handed back to the browser.
 *
 * NOTE: this file must live in src/ (next to app/), not at the repo root,
 * otherwise Next.js silently never compiles it and BOTH of the above stop
 * happening with no error anywhere.
 */
export async function middleware(req: NextRequest) {
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

  /* ---------------------- 1. custom domains ---------------------- */
  if (!isPlatformHost) {
    // A custom domain serves exactly one card, at its root. "www.x.com" and
    // "x.com" are the same card, so the client only stores the bare domain.
    if (req.nextUrl.pathname === '/') {
      const bare = host.replace(/^www\./, '');
      const url = req.nextUrl.clone();
      url.pathname = `/d/${bare}`;
      return NextResponse.rewrite(url);
    }
    // Nothing on a customer's domain is behind a login, so no session work.
    return NextResponse.next();
  }

  /* ---------------------- 2. session refresh ---------------------- */
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(list) {
          // Written twice on purpose: once onto the request so anything later
          // in this same pass sees the fresh token, and once onto the response
          // so the browser actually keeps it.
          list.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          list.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // This call is the refresh. Its result is deliberately ignored — deciding who
  // may see what happens in the page itself, where the answer can be verified
  // against the database rather than against a cookie.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Everything except Next internals, the API routes and static files.
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
