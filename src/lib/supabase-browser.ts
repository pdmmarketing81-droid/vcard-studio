'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Supabase client for Client Components.
 *
 * Carries only the anon key, so everything it does is fenced in by RLS. It
 * writes the session into cookies rather than localStorage, which is what lets
 * the server see the same session on the next request.
 *
 * One instance per browser: a second one would keep its own auth state and the
 * two would drift apart after a token refresh.
 */
let client: ReturnType<typeof createBrowserClient> | null = null;

export function supabaseBrowser() {
  client ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client;
}
