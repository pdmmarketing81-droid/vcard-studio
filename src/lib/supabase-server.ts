import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Supabase client for the server, tied to the visitor's session cookies.
 *
 * This is the one to use when the answer should depend on *who is asking* —
 * every RLS policy in 002-auth-roles.sql keys off auth.uid(), and auth.uid()
 * only exists when the request carries a session. `supabaseAdmin()` from
 * ./supabase is the opposite: it bypasses RLS entirely and belongs only in
 * places where we have already decided the caller is allowed.
 *
 * Rule of thumb: reach for this first. Reach for supabaseAdmin() only when you
 * can say out loud why RLS must not apply.
 */
export function supabaseServer() {
  const store = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return store.getAll();
        },
        setAll(list) {
          // A Server Component is not allowed to write cookies, and Next throws
          // if you try. That is fine: the middleware refreshes the session on
          // every request, so the only writes that matter here come from Server
          // Actions and Route Handlers, where this call does work.
          try {
            list.forEach(({ name, value, options }) => store.set(name, value, options));
          } catch {
            /* Server Component — middleware has already refreshed the cookie */
          }
        },
      },
    }
  );
}
