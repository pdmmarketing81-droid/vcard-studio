import Link from 'next/link';
import SiteFooter from '@/components/SiteFooter';

export const dynamic = 'force-static';

const PAGES = [
  ['/terms', 'Terms'],
  ['/privacy', 'Privacy'],
  ['/refunds', 'Refunds'],
  ['/contact', 'Contact'],
] as const;

/**
 * Shared shell for the four pages a payment provider expects to find, and that
 * a customer deciding whether to trust us will actually read.
 *
 * Written in plain language on purpose. A wall of borrowed legalese tells a
 * reseller nothing about what happens to their money, and tells a reviewer
 * that it was copied from somewhere.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="mx-auto flex max-w-2xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4">
          <Link href="/" className="font-bold text-slate-900">
            Wizart Studio
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {PAGES.map(([href, label]) => (
              <Link key={href} href={href} className="text-slate-500 hover:text-slate-900">
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-10 [&_a]:text-slate-900 [&_a]:underline [&_a]:underline-offset-2 [&_h2]:mb-2 [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-slate-900 [&_li]:mb-1.5 [&_p]:mb-3 [&_p]:leading-relaxed [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </main>

      <SiteFooter />
    </div>
  );
}
