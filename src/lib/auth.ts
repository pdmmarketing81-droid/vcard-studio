import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import { currentProfile, homeFor, type Profile, type Role } from './session';

/**
 * Who may use the admin screens.
 *
 * This used to be a single shared password hashed into a cookie. That worked
 * while this was one person's internal tool and stops working the moment there
 * is more than one kind of user: a shared secret cannot tell a reseller from
 * their customer, cannot be revoked for one person, and leaves no trace of who
 * did what. Both are now decided by the signed-in account's role.
 *
 * The password path has been removed rather than left as a fallback. A back
 * door that still works is not a back door you have closed.
 */

/** For Server Components: the profile, or off to login / their own home. */
export async function requireAdmin(...allowed: Role[]): Promise<Profile> {
  const roles = allowed.length ? allowed : (['main_admin'] as Role[]);
  const profile = await currentProfile();

  if (!profile) redirect('/login');
  if (profile.suspended) redirect('/suspended');
  if (!roles.includes(profile.role)) redirect(homeFor(profile.role));

  return profile;
}

/**
 * For Route Handlers. Returns either the profile or a ready-made response to
 * hand straight back — so a forgotten check reads as a type error rather than
 * as an open endpoint.
 *
 *   const gate = await guardApi();
 *   if ('response' in gate) return gate.response;
 *   // gate.profile is available from here
 */
export async function guardApi(
  ...allowed: Role[]
): Promise<{ profile: Profile } | { response: NextResponse }> {
  const roles = allowed.length ? allowed : (['main_admin'] as Role[]);
  const profile = await currentProfile();

  if (!profile) {
    return { response: NextResponse.json({ error: 'Please sign in.' }, { status: 401 }) };
  }
  if (profile.suspended) {
    return { response: NextResponse.json({ error: 'Account paused.' }, { status: 403 }) };
  }
  if (!roles.includes(profile.role)) {
    return { response: NextResponse.json({ error: 'Not allowed.' }, { status: 403 }) };
  }

  return { profile };
}

/**
 * May this person act on a card owned by `ownerId`?
 *
 * The same question the database asks in can_manage_user(), asked again here
 * because the admin screens read with the service_role key, which switches RLS
 * off. Two copies of one rule is a smell, but the alternative — trusting that
 * every one of those reads remembered to scope itself — is worse. If this ever
 * disagrees with the SQL, the SQL is right.
 */
export async function canManageCard(me: Profile, ownerId: string | null): Promise<boolean> {
  if (me.role === 'main_admin') return true;
  if (!ownerId) return false;          // unclaimed cards are ours alone
  if (ownerId === me.id) return true;
  if (me.role !== 'sub_admin') return false;

  const { supabaseAdmin } = await import('./supabase');
  const { data } = await supabaseAdmin()
    .from('profiles').select('parent_id').eq('id', ownerId).maybeSingle();

  return data?.parent_id === me.id;
}
