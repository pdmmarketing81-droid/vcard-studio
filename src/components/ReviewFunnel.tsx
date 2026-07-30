'use client';

import { useState } from 'react';
import type { ReviewBusiness } from '@/lib/types';

type Stage = 'rate' | 'google' | 'form' | 'done';

const LABELS = ['', 'Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];

export default function ReviewFunnel({ business: b }: { business: ReviewBusiness }) {
  const [stage, setStage] = useState<Stage>('rate');
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const brand = b.theme_color || '#0f766e';

  /** Records the rating server-side. Never blocks the visitor. */
  function log(stars: number, wentToGoogle: boolean, extra?: Record<string, string>) {
    return fetch(`/api/review/${b.slug}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: stars, went_to_google: wentToGoogle, ...extra }),
    });
  }

  function choose(stars: number) {
    setRating(stars);
    const high = stars >= b.review_threshold && !!b.google_review_url;

    if (high) {
      setStage('google');
      // Log first, then hand off — if the visitor leaves instantly we still
      // have the rating.
      log(stars, true).catch(() => {});
      setTimeout(() => {
        window.location.href = b.google_review_url!;
      }, 1400);
    } else {
      setStage('form');
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return setError('Please tell us what happened.');

    setSending(true);
    setError(null);
    try {
      const res = await log(rating, false, { name, phone, email, message });
      if (!res.ok) throw new Error('Could not send');
      setStage('done');
    } catch {
      setError('Could not send just now. Please try again.');
      setSending(false);
    }
  }

  const input =
    'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-[15px] outline-none transition focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background: `linear-gradient(180deg, ${brand}12 0%, #f8fafc 45%, ${brand}0d 100%)`,
      }}
    >
      <div className="w-full max-w-[440px]">
        {/* ------------------------- Header ------------------------- */}
        <div className="mb-6 text-center">
          {b.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={b.logo_url}
              alt={b.name}
              className="mx-auto mb-4 h-20 w-20 rounded-2xl bg-white object-contain p-2 shadow-sm ring-1 ring-black/5"
            />
          )}
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{b.name}</h1>
          {b.tagline && <p className="mt-1 text-sm text-slate-500">{b.tagline}</p>}
        </div>

        <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/5 ring-1 ring-black/5">
          {/* -------------------- Stage: rate -------------------- */}
          {stage === 'rate' && (
            <div className="text-center">
              <h2 className="text-lg font-bold text-slate-800">
                {b.review_headline || 'How was your experience?'}
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Tap a star — it only takes a second.
              </p>

              <div
                className="mt-6 flex justify-center gap-1.5"
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const lit = n <= (hover || rating);
                  return (
                    <button
                      key={n}
                      onClick={() => choose(n)}
                      onMouseEnter={() => setHover(n)}
                      aria-label={`${n} star${n > 1 ? 's' : ''}`}
                      className="p-1 text-[2.4rem] leading-none transition-transform duration-200 hover:scale-125 active:scale-95"
                      style={{ color: lit ? '#f59e0b' : '#e2e8f0' }}
                    >
                      ★
                    </button>
                  );
                })}
              </div>

              <p className="mt-3 h-5 text-sm font-semibold" style={{ color: brand }}>
                {LABELS[hover || rating] ?? ''}
              </p>
            </div>
          )}

          {/* ------------------- Stage: to Google ------------------ */}
          {stage === 'google' && (
            <div className="py-4 text-center">
              <div className="mb-4 text-5xl">🎉</div>
              <h2 className="text-lg font-bold text-slate-800">Thank you!</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Taking you to Google so you can share it publicly…
              </p>
              <a
                href={b.google_review_url ?? '#'}
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90"
                style={{ background: brand }}
              >
                Continue to Google
              </a>
              <p className="mt-3 text-xs text-slate-400">
                Not redirected? Tap the button above.
              </p>
            </div>
          )}

          {/* -------------------- Stage: form --------------------- */}
          {stage === 'form' && (
            <form onSubmit={submit} className="space-y-3">
              <div className="mb-1 text-center">
                <div className="mb-2 text-3xl tracking-widest text-amber-400">
                  {'★'.repeat(rating)}
                  <span className="text-slate-200">{'★'.repeat(5 - rating)}</span>
                </div>
                <h2 className="text-lg font-bold text-slate-800">
                  Sorry it wasn&apos;t better.
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  Tell us what went wrong — this goes straight to the owner, privately.
                </p>
              </div>

              <textarea
                className={`${input} min-h-[120px]`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What happened?"
                autoFocus
              />
              <input
                className={input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className={input}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Phone (optional)"
                  inputMode="tel"
                />
                <input
                  className={input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional)"
                  type="email"
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}

              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-xl py-3.5 text-sm font-bold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ background: brand }}
              >
                {sending ? 'Sending…' : 'Send privately'}
              </button>
              <p className="text-center text-xs text-slate-400">
                Only the owner sees this. It is not posted anywhere.
              </p>
            </form>
          )}

          {/* -------------------- Stage: done --------------------- */}
          {stage === 'done' && (
            <div className="py-6 text-center">
              <div className="mb-4 text-5xl">🙏</div>
              <h2 className="text-lg font-bold text-slate-800">
                {b.review_thanks || 'Thank you for telling us.'}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                The owner has been notified and will look into it.
              </p>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-400">
          Powered by vCard Studio
        </p>
      </div>
    </div>
  );
}
