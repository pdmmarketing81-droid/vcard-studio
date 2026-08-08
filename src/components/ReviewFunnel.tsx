'use client';

import { useRef, useState } from 'react';
import type { ReviewBusiness } from '@/lib/types';
import { compressImage, kb } from '@/lib/compress';

/**
 * Review screen.
 *
 * The layout deliberately mirrors the shape people already know from Google's
 * review sheet — full-bleed white, back arrow, hollow stars, a details box, a
 * tinted attach pill and one full-width action at the bottom. Familiar shape
 * means no one has to learn anything.
 *
 * The *branding* stays the business's own: its logo, its colour, its name. A
 * page that copies Google's identity would leave someone believing they had
 * posted publicly when they hadn't.
 *
 * Font is system-ui on purpose — on Android, where nearly every scan happens,
 * that resolves to Roboto natively. Same typeface, nothing to download.
 */

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024; // email attachments bounce above ~20MB

interface Picked {
  file: File;
  preview: string;
  isVideo: boolean;
}

const STAR_PATH =
  'M12 2.6l2.83 6.13 6.67.78-4.95 4.55 1.34 6.6L12 17.3l-5.89 3.36 1.34-6.6L2.5 9.51l6.67-.78L12 2.6z';

export default function ReviewFunnel({ business: b }: { business: ReviewBusiness }) {
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<Picked[]>([]);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const brand = b.theme_color || '#0f766e';

  /* A card can be saved with junk in the Google field — a phone number, a
     half-typed address. Truthiness is not enough: redirecting to a non-URL
     dumps the visitor on a broken page and the rating is lost with them.
     Anything that isn't a real http(s) address is treated as "no Google link",
     which quietly routes the visitor to the private form instead. The owner
     sees the feedback either way; nobody hits a dead end. */
  const googleUrl = (() => {
    const raw = b.google_review_url?.trim();
    if (!raw) return null;
    try {
      const u = new URL(raw);
      return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
    } catch {
      return null;
    }
  })();

  const goesToGoogle = (n: number) => n >= b.review_threshold && !!googleUrl;

  /* ---------------------------- star tap ---------------------------- */
  function pickStar(n: number) {
    if (!goesToGoogle(n)) {
      setRating(n);
      setError(null);
      return;
    }

    // Queue the rating (and anything already typed) and leave immediately.
    // sendBeacon is delivered by the browser after the page has gone, so
    // there is nothing to await before redirecting.
    try {
      navigator.sendBeacon(
        `/api/review/${b.slug}`,
        new Blob([JSON.stringify({ rating: n, went_to_google: true, message })], {
          type: 'application/json',
        })
      );
    } catch {
      /* the visitor matters more than the log — redirect regardless */
    }
    window.location.replace(googleUrl!);
  }

  /* --------------------------- attachments -------------------------- */
  async function addFiles(list: FileList | null) {
    if (!list?.length) return;
    setError(null);

    const room = MAX_FILES - files.length;
    const next: Picked[] = [];

    for (const raw of Array.from(list).slice(0, Math.max(0, room))) {
      const isVideo = raw.type.startsWith('video/');
      // Photos are resized before they leave the phone: a 4MB camera shot
      // becomes ~150KB, which keeps the email deliverable.
      const file = isVideo ? raw : (await compressImage(raw, 'gallery')).file;
      next.push({ file, preview: URL.createObjectURL(file), isVideo });
    }

    const all = [...files, ...next];
    const total = all.reduce((s, f) => s + f.file.size, 0);
    if (total > MAX_TOTAL_BYTES) {
      setError(`Attachments come to ${kb(total)} — please keep them under ${kb(MAX_TOTAL_BYTES)}.`);
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
      files.forEach((f) => fd.append('files', f.file, f.file.name));

      const res = await fetch(`/api/review/${b.slug}`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      setError('Could not send just now. Please try again.');
      setSending(false);
    }
  }

  const font =
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  /* ------------------------------ done ------------------------------ */
  if (done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-8 text-center"
        style={{ fontFamily: font }}>
        <div className="mb-5 text-5xl">🙏</div>
        <h1 className="text-lg font-medium text-[#202124]">
          {b.review_thanks || 'Thank you for your feedback.'}
        </h1>
        <p className="mt-2 text-sm text-[#5f6368]">It has gone straight to the owner.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-white" style={{ fontFamily: font }}>
      {/* ---------------------------- header ---------------------------- */}
      <header className="flex items-center px-2 py-3">
        <button
          type="button"
          onClick={() => history.length > 1 ? history.back() : window.close()}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-[#3c4043] transition hover:bg-black/5"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="flex-1 pr-11 text-center text-[16px] font-medium text-[#202124]">
          {b.name}
        </h1>
      </header>

      <main className="mx-auto w-full max-w-[520px] flex-1 px-4">
        {/* ------------------------ identity row ------------------------ */}
        <div className="flex items-center gap-3 py-2">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt=""
              className="h-10 w-10 shrink-0 rounded-full bg-white object-cover ring-1 ring-black/10" />
          ) : (
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base font-medium text-white"
              style={{ background: brand }}
            >
              {b.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[15px] font-medium leading-tight text-[#202124]">
              {b.name}
            </p>
            <p className="mt-0.5 text-[13px] leading-tight text-[#5f6368]">
              {b.review_headline || 'Share your experience'}
            </p>
          </div>
        </div>

        {/* --------------------------- stars --------------------------- */}
        <div className="flex gap-1 py-5">
          {[1, 2, 3, 4, 5].map((n) => {
            const on = n <= rating;
            return (
              <button
                key={n}
                onClick={() => pickStar(n)}
                aria-label={`${n} star${n > 1 ? 's' : ''}`}
                className="p-1 transition-transform duration-100 active:scale-90"
              >
                <svg viewBox="0 0 24 24" className="h-9 w-9"
                  fill={on ? '#f9ab00' : 'none'}
                  stroke={on ? '#f9ab00' : '#bdc1c6'}
                  strokeWidth="1.5" strokeLinejoin="round">
                  <path d={STAR_PATH} />
                </svg>
              </button>
            );
          })}
        </div>

        {/* ------------------------- details box ------------------------ */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Share details of your own experience at this place"
          className="min-h-[132px] w-full resize-none rounded-lg border border-[#dadce0] px-4 py-3.5 text-[15px] leading-relaxed text-[#202124] outline-none transition placeholder:text-[#5f6368] focus:border-[#5f6368]"
        />

        {/* ------------------------ attach button ----------------------- */}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={files.length >= MAX_FILES}
          className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-full py-3 text-[14px] font-medium transition disabled:opacity-40"
          style={{ background: `${brand}14`, color: brand }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
            strokeLinecap="round" strokeLinejoin="round" className="h-[19px] w-[19px]">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
            <circle cx="12" cy="13" r="3.2" />
          </svg>
          Add photos &amp; videos
        </button>
        <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden"
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />

        {files.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="relative h-[70px] w-[70px] overflow-hidden rounded-lg ring-1 ring-[#dadce0]">
                {f.isVideo ? (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-[#202124] text-white">
                    <span className="text-lg leading-none">▶</span>
                    <span className="mt-0.5 text-[8px] opacity-70">video</span>
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.preview} alt="" className="h-full w-full object-cover" />
                )}
                <button type="button" onClick={() => removeFile(i)} aria-label="Remove"
                  className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center bg-black/55 text-xs text-white">
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {error && <p className="mt-4 text-[13px] text-[#d93025]">{error}</p>}
      </main>

      {/* ---------------------------- footer ---------------------------- */}
      <footer className="mx-auto w-full max-w-[520px] px-4 pb-6 pt-8">
        <button
          type="button"
          onClick={post}
          disabled={rating === 0 || sending}
          className="w-full rounded-full py-3.5 text-[15px] font-medium text-white transition disabled:cursor-not-allowed"
          style={
            rating === 0 || sending
              ? { background: '#e8eaed', color: '#9aa0a6' }
              : { background: brand }
          }
        >
          {sending ? 'Posting…' : 'Post'}
        </button>
      </footer>
    </div>
  );
}
