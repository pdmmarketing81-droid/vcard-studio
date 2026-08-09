import Link from 'next/link';
import ImpersonationBar from '@/components/ImpersonationBar';
import SignOutButton from '@/components/SignOutButton';
import AppNav, { type NavItem } from '@/components/AppNav';
import { currentProfile, type Role } from '@/lib/session';

/**
 * The frame around every signed-in screen.
 *
 * There wasn't one. /admin, /reseller, /my and everything beneath them were
 * separate pages that each drew their own title and sign-out link, and the
 * only way from one to another was back through /admin. Going from People to
 * Plans meant two navigations and knowing that /admin was the way. Nothing was
 * broken; there was simply no map, and a person cannot learn a product they
 * cannot see the shape of.
 *
 * Deliberately not a sidebar. Most of these screens are used on a phone, in a
 * shop, one-handed — a sidebar there is a hamburger menu, which is a nav you
 * have to remember to open.
 */

const NAV: Record<Role, NavItem[]> = {
  main_admin: [
    { href: '/admin', label: 'Cards' },
    { href: '/admin/users', label: 'People', deep: true },
    { href: '/admin/plans', label: 'Plans' },
    { href: '/admin/feedback', label: 'Feedback' },
    { href: '/admin/audit', label: 'Activity' },
  ],
  sub_admin: [
    { href: '/reseller', label: 'My business' },
    { href: '/admin/new', label: 'New card' },
  ],
  end_user: [{ href: '/my', label: 'My card' }],
};

const ROLE_LABEL: Record<Role, string> = {
  main_admin: 'Main admin',
  sub_admin: 'Reseller',
  end_user: 'Customer',
};

/** Where the logo takes you: your own home, not the site's. */
const HOME: Record<Role, string> = {
  main_admin: '/admin',
  sub_admin: '/reseller',
  end_user: '/my',
};

export default async function AppShell({ children }: { children: React.ReactNode }) {
  const me = await currentProfile();

  /* No session: render the page bare. /admin/login lives inside this layout,
     and wrapping a login screen in a signed-in header would be both wrong and
     a small lie about who is signed in. */
  if (!me) return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-50/60">
      <ImpersonationBar />

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="flex items-center gap-3 py-3">
            <Link href={HOME[me.role]} className="flex shrink-0 items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-sm font-bold text-white">
                W
              </span>
              <span className="hidden text-sm font-bold text-slate-900 sm:block">
                Wizart Studio
              </span>
            </Link>

            {/* Identity sits in the header, on every screen, because with
                roles and sign-in-as in play "which account is this?" stops
                being something you can assume. */}
            <div className="ml-auto flex min-w-0 items-center gap-3">
              <div className="min-w-0 text-right">
                <p className="truncate text-xs font-semibold text-slate-700">{me.email}</p>
                <p className="text-[11px] text-slate-400">{ROLE_LABEL[me.role]}</p>
              </div>
              <SignOutButton className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50" />
            </div>
          </div>

          <div className="pb-2">
            <AppNav items={NAV[me.role]} />
          </div>
        </div>
      </header>

      {children}
    </div>
  );
}
