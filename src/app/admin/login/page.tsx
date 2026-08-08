import { redirect } from 'next/navigation';

/**
 * The old shared-password screen. Kept only so existing bookmarks land
 * somewhere sensible instead of on a 404 — sign-in now happens at /login with
 * a real account.
 */
export default function OldAdminLogin() {
  redirect('/login');
}
