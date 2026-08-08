import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { supabaseServer } from './supabase-server';
import { supabaseAdmin } from './supabase';
import { IMPERSONATE_COOKIE, readToken } from './impersonation';

export type Role = 'main_admin' | 'sub_admin' | 'end_user';

export interface Profile {
  id: string;
  email: string;
  role: Role;
  parent_id: string | null;
  full_name: string | null;
  phone: string | null;
  business_name: string | null;
  suspended: boolean;
}

/**
 * The signed-in user, or null.
 *
 * getUser() is used rather than getSession() on purpose. getSession() only
 * decodes whatever is in the cookie and hands it back — a forged cookie would
 * sail straight through. getUser() asks the auth server to verify the token,
 * which is the difference between "the browser claims to be Aryan" and "this
 * really is Aryan". On the server, always the second one.
 *
 * cache() keeps it to one round trip per request no matter how many components
 * ask.
 */
export const currentUser = cache(async () => {
  const { data, error } = await supabaseServer().auth.getUser();
  if (error) return null;
  return data.user ?? null;
});

/** The profile of whoever is really signed in — never the impersonated one. */
export const realProfile = cache(async (): Promise<Profile | null> => {
  const user = await currentUser();
  if (!user) return null;

  const { data } = await supabaseServer()
    .from('profiles')
    .select('id, role, parent_id, full_name, phone, business_name, suspended')
    .eq('id', user.id)
    .maybeSingle();

  if (!data) return null;
  return { ...data, email: user.email ?? '' } as Profile;
});

/**
 * Who the app should behave as. Usually the signed-in user; during
 * "sign in as", the person being viewed.
 *
 * The cookie is checked for a valid signature AND the real account is checked
 * for still being a main admin. The second is the important one — the cookie
 * alone never grants anything, so a copied cookie in someone else's browser is
 * worthless, and demoting an admin ends their impersonation on the very next
 * request without anyone clearing anything.
 */
export const currentProfile = cache(async (): Promise<Profile | null> => {
  const real = await realProfile();
  if (!real) return null;
  if (real.role !== 'main_admin') return real;

  const targetId = readToken(cookies().get(IMPERSONATE_COOKIE)?.value);
  if (!targetId || targetId === real.id) return real;

  const db = supabaseAdmin();
  const [{ data: row }, { data: authUser }] = await Promise.all([
    db.from('profiles')
      .select('id, role, parent_id, full_name, phone, business_name, suspended')
      .eq('id', targetId)
      .maybeSingle(),
    db.auth.admin.getUserById(targetId),
  ]);

  // One main admin viewing another gains nothing and only muddies the audit
  // trail, so it is refused rather than silently allowed.
  if (!row || row.role === 'main_admin') return real;

  return { ...row, email: authUser?.user?.email ?? '' } as Profile;
});

/** Set only while a main admin is signed in as someone else. */
export const impersonation = cache(async (): Promise<{ real: Profile; as: Profile } | null> => {
  const [real, effective] = await Promise.all([realProfile(), currentProfile()]);
  if (!real || !effective || real.id === effective.id) return null;
  return { real, as: effective };
});

/** Signed in, or off to the login page. */
export async function requireProfile(): Promise<Profile> {
  const profile = await currentProfile();
  if (!profile) redirect('/login');

  // A suspended reseller keeps their login but loses the dashboard. Their
  // customers' cards are handled separately — those show our contact page
  // rather than disappearing, so the end customer still reaches us.
  if (profile.suspended) redirect('/suspended');

  return profile;
}

/** Signed in *and* holding one of these roles, or off to their own home. */
export async function requireRole(...roles: Role[]): Promise<Profile> {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));
  return profile;
}

/** Where each role belongs after login. */
export function homeFor(role: Role): string {
  switch (role) {
    case 'main_admin': return '/admin';
    case 'sub_admin':  return '/reseller';
    default:           return '/my';
  }
}
