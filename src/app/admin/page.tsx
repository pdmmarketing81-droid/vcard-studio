import Link from 'next/link';
import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { getTemplate } from '@/lib/templates';
import { PublishToggle, DuplicateButton, DeleteButton } from '@/components/admin/CardActions';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  custom_domain: string | null;
  template: string;
  published: boolean;
  view_count: number;
};

export default async function AdminHome() {
  if (!isAdmin()) redirect('/admin/login');

  const { data, error } = await supabaseAdmin()
    .from('businesses')
    .select('id, slug, name, logo_url, custom_domain, template, published, view_count')
    .order('created_at', { ascending: false });

  const cards = (data ?? []) as Row[];
  const live = cards.filter((c) => c.published).length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cards</h1>
          <p className="text-sm text-slate-500">
            {cards.length} total · {live} live
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/feedback"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Feedback
          </Link>
          <Link
            href="/admin/new"
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            + New card
          </Link>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error.message}</p>
      )}

      {!error && cards.length === 0 && (
        <div className="card-panel p-10 text-center">
          <p className="text-sm text-slate-500">
            No cards yet. Create your first one — it takes about a minute.
          </p>
        </div>
      )}

      <div className="space-y-2">
        {cards.map((c) => (
          <div key={c.id} className="card-panel flex items-center gap-3 p-3">
            {c.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.logo_url} alt="" className="h-11 w-11 rounded-lg object-contain" />
            ) : (
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-400">
                {c.name.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-slate-800">{c.name}</p>
                <PublishToggle id={c.id} published={c.published} />
              </div>
              <p className="truncate text-xs text-slate-400">
                /{c.slug}
                {c.custom_domain && ` · ${c.custom_domain}`} · {getTemplate(c.template).name} ·{' '}
                {c.view_count} views
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <Link
                href={`/admin/${c.id}/edit`}
                className="text-xs font-semibold text-slate-700 transition hover:text-slate-900"
              >
                Edit
              </Link>
              <DuplicateButton id={c.id} />
              <Link
                href={`/${c.slug}`}
                target="_blank"
                className="text-xs font-semibold text-slate-500 transition hover:text-slate-900"
              >
                Open
              </Link>
              <DeleteButton id={c.id} name={c.name} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
