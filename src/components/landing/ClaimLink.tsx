'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'free'; slug: string }
  | { kind: 'taken'; reason: string };

/**
 * "Claim your link" — the first thing a visitor can actually do.
 *
 * It answers a real question (is my shop's name free?) before asking for
 * anything, which is a much easier first step than a sign-up form. The typing
 * is debounced so a name is checked once the person pauses, not once per
 * keystroke — the endpoint is public and rate limited, and hammering it would
 * lock the visitor out of their own answer.
 */
export default function ClaimLink({ domain }: { domain: string }) {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 3) {
      setState({ kind: 'idle' });
      return;
    }

    setState({ kind: 'checking' });
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/slug-check?slug=${encodeURIComponent(value)}`);
        const json = await res.json();
        setState(
          json.available
            ? { kind: 'free', slug: json.slug }
            : { kind: 'taken', reason: json.reason ?? 'That one is taken.' }
        );
      } catch {
        setState({ kind: 'idle' });
      }
    }, 450);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  function go(e: React.FormEvent) {
    e.preventDefault();
    if (state.kind === 'free') router.push(`/pricing?claim=${encodeURIComponent(state.slug)}`);
    else router.push('/pricing');
  }

  return (
    <form
      onSubmit={go}
      className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-lg shadow-slate-900/5 backdrop-blur sm:p-5"
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-sm font-bold text-slate-900">Claim your link</span>
        <span className="text-xs font-semibold text-violet-600">Free to check</span>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 py-1 pl-3 pr-1 focus-within:border-violet-400 focus-within:bg-white">
        <span className="hidden shrink-0 text-sm text-slate-400 sm:inline">{domain}/</span>
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="your-shop-name"
          aria-label="Your link"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          Check
        </button>
      </div>

      <p className="mt-2 min-h-[1.25rem] text-xs">
        {state.kind === 'checking' && <span className="text-slate-400">Checking…</span>}
        {state.kind === 'free' && (
          <span className="font-semibold text-emerald-600">
            {domain}/{state.slug} is free — grab it
          </span>
        )}
        {state.kind === 'taken' && <span className="text-rose-600">{state.reason}</span>}
      </p>
    </form>
  );
}
