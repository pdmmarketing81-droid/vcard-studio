'use client';

import { useState } from 'react';

/**
 * Download the card list.
 *
 * A plain link rather than a fetch-and-blob, so the browser's own download
 * machinery handles it — resumable, visible in the download bar, and no copy of
 * the whole customer list sitting in a JavaScript variable.
 *
 * The filters build a query string; the server decides what may actually be
 * read. Nothing here is a permission check.
 */
export default function ExportPanel({
  resellers,
  templates,
}: {
  resellers: { id: string; label: string }[];
  templates: { id: string; label: string }[];
}) {
  const [reseller, setReseller] = useState('');
  const [template, setTemplate] = useState('');
  const [published, setPublished] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const params = new URLSearchParams();
  if (reseller) params.set('reseller', reseller);
  if (template) params.set('template', template);
  if (published) params.set('published', published);
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const href = `/api/admin/export${params.toString() ? `?${params}` : ''}`;
  const sel =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-900';
  const lbl = 'mb-1 block text-xs font-semibold text-slate-500';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <p className="text-sm font-bold text-slate-800">Download card data</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">
        Opens in Excel or Google Sheets. Leave a filter empty to include everything.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={lbl}>Reseller</label>
          <select className={sel} value={reseller} onChange={(e) => setReseller(e.target.value)}>
            <option value="">Everyone</option>
            {resellers.map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={lbl}>Template</label>
          <select className={sel} value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="">All templates</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={lbl}>Live or not</label>
          <select className={sel} value={published} onChange={(e) => setPublished(e.target.value)}>
            <option value="">Both</option>
            <option value="yes">Live only</option>
            <option value="no">Not live only</option>
          </select>
        </div>

        <div>
          <label className={lbl}>Made from</label>
          <input type="date" className={sel} value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>

        <div>
          <label className={lbl}>Made up to</label>
          <input type="date" className={sel} value={to} onChange={(e) => setTo(e.target.value)} />
        </div>

        <div className="flex items-end">
          <a
            href={href}
            className="w-full rounded-lg bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Download CSV
          </a>
        </div>
      </div>

      {/* Said plainly, because the person downloading is the person responsible
          for the file afterwards. */}
      <p className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-800">
        This file has every customer&apos;s name, phone number and address in it. Only a main
        admin can download it, and every download is recorded in Activity with the time and
        the filters used. Once it is on your laptop, keeping it safe is on you — do not put
        it in WhatsApp or email it.
      </p>
    </div>
  );
}
