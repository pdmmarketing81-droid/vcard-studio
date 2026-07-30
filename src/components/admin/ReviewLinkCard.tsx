'use client';

import { useState } from 'react';

/**
 * The shareable review link and its QR. Shown only for saved cards — an
 * unsaved card has no slug yet, so there is nothing to link to.
 */
export default function ReviewLinkCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false);

  // Built in the browser so it always matches whatever host the admin is on.
  const link =
    typeof window === 'undefined' ? `/r/${slug}` : `${window.location.origin}/r/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  }

  const waText = encodeURIComponent(
    `Hi! If you have a minute, we'd love your feedback: ${link}`
  );

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">
        Review link & QR
      </p>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/qr/${slug}?target=review`}
          alt="Review QR"
          className="h-28 w-28 shrink-0 rounded-lg bg-white p-1.5 ring-1 ring-slate-200"
        />

        <div className="min-w-0 flex-1 space-y-2">
          <code className="block truncate rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200">
            {link}
          </code>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={copy}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-slate-700"
            >
              {copied ? '✓ Copied' : 'Copy link'}
            </button>
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:bg-white"
            >
              Open
            </a>
            <a
              href={`https://wa.me/?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
            >
              Send on WhatsApp
            </a>
          </div>

          <div className="flex gap-2 pt-0.5">
            <a
              href={`/api/qr/${slug}?target=review&format=png&size=1024&download=1`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              ↓ PNG
            </a>
            <a
              href={`/api/qr/${slug}?target=review&format=svg&download=1`}
              className="text-xs font-semibold text-slate-500 hover:text-slate-900"
            >
              ↓ SVG
            </a>
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Same destination either way — the QR just encodes this link. Print it for
        the counter, or send the link on WhatsApp.
      </p>
    </div>
  );
}
