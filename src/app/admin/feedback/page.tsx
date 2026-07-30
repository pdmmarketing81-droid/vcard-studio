import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  rating: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  message: string | null;
  went_to_google: boolean;
  emailed: boolean;
  email_error: string | null;
  created_at: string;
  businesses: { name: string; slug: string } | null;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap text-sm">
      <span className="text-amber-400">{'★'.repeat(n)}</span>
      <span className="text-slate-200">{'★'.repeat(5 - n)}</span>
    </span>
  );
}

export default async function FeedbackInbox() {
  if (!isAdmin()) redirect('/admin/login');

  const { data, error } = await supabaseAdmin()
    .from('feedback')
    .select('*, businesses(name, slug)')
    .order('created_at', { ascending: false })
    .limit(200);

  const rows = (data ?? []) as unknown as Row[];
  // Ratings that went to Google carry no message — they're counted, not listed.
  const messages = rows.filter((r) => !r.went_to_google);
  const total = rows.length;
  const avg = total ? (rows.reduce((s, r) => s + r.rating, 0) / total).toFixed(1) : '—';
  const toGoogle = rows.filter((r) => r.went_to_google).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Feedback</h1>
          <p className="text-sm text-slate-500">
            {total} ratings · {avg} average · {toGoogle} sent to Google
          </p>
        </div>
        <Link href="/admin" className="text-sm font-semibold text-slate-500 hover:text-slate-900">
          ← All cards
        </Link>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</p>
      )}

      {!error && messages.length === 0 && (
        <div className="card-panel p-10 text-center">
          <p className="text-sm text-slate-500">
            No private feedback yet. Ratings of {' '}
            <span className="font-semibold">4★ and above</span> go straight to Google and
            leave no message — only lower ratings appear here.
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {messages.map((f) => (
          <article key={f.id} className="card-panel p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Stars n={f.rating} />
                {f.businesses && (
                  <Link
                    href={`/${f.businesses.slug}`}
                    target="_blank"
                    className="text-xs font-bold text-slate-700 hover:underline"
                  >
                    {f.businesses.name}
                  </Link>
                )}
              </div>
              <div className="flex items-center gap-2">
                {f.email_error ? (
                  <span
                    title={f.email_error}
                    className="rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold uppercase text-rose-600"
                  >
                    Email failed
                  </span>
                ) : f.emailed ? (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">
                    Emailed
                  </span>
                ) : null}
                <time className="text-[11px] text-slate-400">
                  {new Date(f.created_at).toLocaleString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
            </div>

            {f.message && (
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">
                {f.message}
              </p>
            )}

            {(f.name || f.phone || f.email) && (
              <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
                {f.name && <span>{f.name}</span>}
                {f.phone && <a href={`tel:${f.phone}`} className="hover:text-slate-700">{f.phone}</a>}
                {f.email && <a href={`mailto:${f.email}`} className="hover:text-slate-700">{f.email}</a>}
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
