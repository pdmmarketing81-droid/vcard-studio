'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  /** Match sub-paths too. Off for hubs like /admin, which would match everything. */
  deep?: boolean;
}

/**
 * The row of links in the app header.
 *
 * Client-side only because of one thing: knowing which link you are on.
 * Without that the header is a list of five identical words and you have to
 * read the address bar to find out where you are — which is most of why this
 * app felt like it had no navigation even on the pages that did have links.
 */
export default function AppNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname() || '/';

  return (
    // Scrolls sideways rather than wrapping: a nav that becomes two rows on a
    // phone pushes the actual page content below the fold.
    <nav className="-mx-1 flex gap-1 overflow-x-auto pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((item) => {
        const active = item.deep
          ? pathname === item.href || pathname.startsWith(item.href + '/')
          : pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition ${
              active
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
