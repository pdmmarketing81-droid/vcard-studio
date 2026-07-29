'use client';

import { useState } from 'react';
import { compressImage, kb } from '@/lib/compress';

export const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

/**
 * URL field with an inline uploader.
 *
 * Accepting a pasted URL *and* a file upload matters in practice: most clients
 * already have their photos on Instagram or Drive, and forcing a re-upload is
 * the slowest part of making a card.
 *
 * Uploaded images are resized and re-encoded to WebP in the browser first —
 * see lib/compress.ts for why.
 */
export default function UploadInput({
  value,
  onChange,
  folder,
  accept = 'image/*',
  placeholder = 'https://…  or upload',
  onFileType,
}: {
  value: string;
  onChange: (url: string) => void;
  folder: string;
  accept?: string;
  placeholder?: string;
  onFileType?: (type: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  async function handle(original: File) {
    setBusy(true);
    setError(null);
    setSaved(null);
    try {
      const { file, originalBytes, finalBytes, skipped } = await compressImage(original, folder);

      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Upload failed');

      onChange(json.url);
      onFileType?.(original.type);

      if (!skipped && originalBytes > finalBytes) {
        const pct = Math.round((1 - finalBytes / originalBytes) * 100);
        setSaved(`${kb(originalBytes)} → ${kb(finalBytes)}  (${pct}% smaller)`);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex gap-2">
        <input
          className={inputClass}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
        <label
          className={`shrink-0 cursor-pointer rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium transition hover:bg-slate-50 ${
            busy ? 'opacity-50' : ''
          }`}
        >
          {busy ? '…' : 'Upload'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handle(f);
              e.target.value = '';
            }}
          />
        </label>
      </div>

      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
      {saved && <p className="mt-1 text-xs font-medium text-emerald-600">✓ {saved}</p>}

      {value && accept.startsWith('image') && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value}
          alt=""
          className="mt-2 h-16 w-16 rounded-lg object-cover ring-1 ring-slate-200"
        />
      )}
    </div>
  );
}
