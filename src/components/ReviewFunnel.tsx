'use client';

import { useRef, useState } from 'react';
import type { ReviewBusiness } from '@/lib/types';
import { compressImage, kb } from '@/lib/compress';

/**
 * One screen, laid out like Google's own review dialog: stars, a details box
 * and an attach button, all visible from the start. No wizard.
 *
 * Tapping a high rating redirects to Google immediately — no confirmation
 * frame, no delay. Anything the visitor already typed is still recorded via
 * sendBeacon, which the browser delivers after the page has gone.
 */

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // email attachments get rejected above ~20MB

interface Picked {
  file: File;
  preview: string;
  isVideo: boolean;
}

export default function ReviewFunnel({ business: b }: { business: ReviewBusiness }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [files, setFiles] = useState<Picked[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = b.theme_color || '#0f766e';
  const goesToGoogle = (n: number) => n >= b.review_threshold && !!b.google_review_url;

  /* ---------------------------- star tap ---------------------------- */
  function pickStar(n: number) {
    if (!goesToGoogle(n)) {
      setRating(n);
      setError(null);
      return;
    }

    // Queue the rating (plus anything already typed) and leave straight away.
    // sendBeacon survives the navigation, so nothing has to be awaited.
    const payload = JSON.stringify({
      rating: n,
      went_to_google: true,
      message,
      name,
      phone,
    });
    try {
      navigator.sendBeacon(
        `/api/review/${b.slug}`,
        new Blob([payload], { type: 'application/json' })
      );
    } catch {
      /* if it fails we still redirect — the visitor matters more than the log */
    }
    window.location.replace(b.google_review_url!);
  }

  /* --------------------------- attachments -------------------------- */
  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    const room = MAX_FILES - files.length;
    const incoming = Array.from(list).slice(0, Math.max(0, room));
    const next: Picked[] = [];

    for (const raw of incoming) {
      const isVideo = raw.type.startsWith('video/');
      // Photos are resized before they ever leave the phone — a 4MB camera
      // shot becomes ~150KB, which keeps the email deliverable.
      const file = isVideo ? raw : (await compressImage(raw, 'gallery')).file;
      next.push({ file, preview: URL.createObjectURL(file), isVideo });
    }

    const all = [...files, ...next];
    const total = all.reduce((s, f) => s + f.file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(`Attachments total ${kb(total)} — please keep them under ${kb(MAX_TOTAL_BYTES)}.`);
      return;
    }
    setFiles(all);
  }

  function removeFile(i: number) {
    URL.revokeObjectURL(files[i].preview);
    setFiles(files.filter((_, j) => j !== i));
  }

  /* ------------------------------ post ------------------------------ */
  async function post() {
    if (rating === 0) return setError('Please tap a star first.');

    setSending(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('rating', String(rating));
      fd.append('message', message);
      fd.append('name', name);
      fd.append('phone', phone);
      files.forEach((f) => fd.append('files', f.file, f.file.name));

      const res = await fetch(`/api/review/${b.slug}`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError('Could not send just now. Please try again.');
      setSending(false);
    }
  }

  /* ------------------------------ done ------------------------------ */
  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-[480px] rounded-2xl bg-white p-10 text-center shadow-xl ring-1 ring-black/5">
          <div className="mb-4 text-5xl">🙏</div>
          <h1 className="text-lg font-semibold text-slate-900">
            {b.review_thanks || 'Thank you for your feedback.'}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            It has gone straight to the owner.
          </p>
        </div>
      </div>
    );
  }

  const canPost = rating > 0 && !sending;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <div className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        {/* ----------------------- title bar ----------------------- */}
        <div className="border-b border-slate-100 px-6 py-4 text-center">
          <h1 className="text-[15px] font-medium text-slate-900">{b.name}</h1>
        </div>

        <div className="px-6 py-5">
          {/* ------------------- identity row ------------------- */}
          <div className="flex items-center gap-3">
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={b.logo_url}
                alt=""
                className="h-11 w-11 rounded-full object-cover ring-1 ring-black/5"
              />
            ) : (
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-lg font-semibold text-white"
                style={{ background: brand }}
              >
                {b.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-[15px] font-medium text-slate-900">{b.name}</p>
              <p className="text-xs text-slate-500">
                {b.review_headline || 'Share your experience'}
              </p>
            </div>
          </div>

          {/* ---------------------- stars ---------------------- */}
          <div
            className="mt-6 flex justify-center gap-2"
            onMouseLeave={() => setHover(0)}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => pickStar(n)}
                onMouseEnter={() => setHover(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className="text-[2.6rem] leading-none transition-transform duration-150 hover:scale-110 active:scale-95"
                style={{ color: n <= (hover || rating) ? '#f9ab00' : '#dadce0' }}
              >
                ★
              </button>
            ))}
          </div>

          {/* -------------------- details box -------------------- */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share details of your own experience at this place"
            className="mt-6 min-h-[110px] w-full rounded-lg border border-slate-300 px-4 py-3 text-[15px] text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-slate-500"
          />

          <div className="mt-3 grid grid-cols-2 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone (optional)"
              inputMode="tel"
              className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-500"
            />
          </div>

          {/* -------------------- attachments -------------------- */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium transition disabled:opacity-40"
            style={{ background: `${brand}14`, color: brand }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
              <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
            Add photos &amp; videos
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {files.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {files.map((f, i) => (
                <div key={i} className="relative h-16 w-16 overflow-hidden rounded-lg ring-1 ring-slate-200">
                  {f.isVideo ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-slate-900 text-white">
                      <span className="text-lg leading-none">▶</span>
                      <span className="mt-0.5 text-[8px] opacity-70">video</span>
                    </div>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={f.preview} alt="" className="h-full w-full object-cover" />
                  )}
                  <button
                    type="button"
                    onClick={() => removeFile(i)}
                    aria-label="Remove"
                    className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-black/60 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          {/* ----------------------- actions ----------------------- */}
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setRating(0);
                setMessage('');
                setName('');
                setPhone('');
                files.forEach((f) => URL.revokeObjectURL(f.preview));
                setFiles([]);
                setError(null);
              }}
              className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={post}
              disabled={!canPost}
              className="rounded-lg px-7 py-2.5 text-sm font-semibold text-white transition disabled:opacity-40"
              style={{ background: brand }}
            >
              {sending ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
