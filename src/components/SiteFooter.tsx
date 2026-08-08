import Link from 'next/link';

/**
 * The footer that must appear on every public page.
 *
 * Not decoration: a payment provider reviewing the site looks for terms,
 * privacy, refunds and a way to contact a human, and looks for them from the
 * home page. Pages that exist but are linked from nowhere do not count.
 */
export default function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center gap-x-10 gap-y-3 px-6 py-10 text-sm lg:px-12">
        <span className="font-bold text-slate-900">Wizart Studio</span>
        <nav className="flex flex-wrap gap-x-8 gap-y-2">
          <Link href="/pricing" className="text-slate-500 hover:text-slate-900">Pricing</Link>
          <Link href="/terms" className="text-slate-500 hover:text-slate-900">Terms</Link>
          <Link href="/privacy" className="text-slate-500 hover:text-slate-900">Privacy</Link>
          <Link href="/refunds" className="text-slate-500 hover:text-slate-900">Refunds</Link>
          <Link href="/contact" className="text-slate-500 hover:text-slate-900">Contact</Link>
        </nav>
        <span className="ml-auto text-xs text-slate-400">
          © {new Date().getFullYear()} Wizart Studio
        </span>
      </div>
    </footer>
  );
}
