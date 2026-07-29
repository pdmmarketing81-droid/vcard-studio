import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Copy .env.local.example to .env.local and fill them in.'
  );
}

/**
 * Public client — respects RLS. Safe to use anywhere, including the browser.
 * Can only read published cards.
 */
export const supabase = createClient(url, anonKey);

/**
 * Admin client — bypasses RLS. SERVER ONLY.
 * Importing this into a Client Component will leak the service role key,
 * so it throws loudly if it ever runs in a browser.
 */
export function supabaseAdmin() {
  if (typeof window !== 'undefined') {
    throw new Error('supabaseAdmin() must never be called in the browser.');
  }
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in the server environment.');
  }
  return createClient(url!, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
