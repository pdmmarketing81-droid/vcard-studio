'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabaseBrowser } from '@/lib/supabase-browser';

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ' +
  'focus:border-slate-900 focus:ring-1 focus:ring-slate-900';

/**
 * Sign in and sign up, one component.
 *
 * A new account always lands as an end_user — the database default. Nothing on
 * this screen can ask for a higher role, and nothing behind it grants one:
 * promotion is a deliberate act by a main admin. A signup form that could hand
 * out roles is a signup form that can be tricked into handing out roles.
 */
export default function AuthForm({
  mode,
  next = '/after-login',
  intro,
}: {
  mode: 'signin' | 'signup';
  /** Where to land afterwards — used to carry someone on to checkout. */
  next?: string;
  intro?: React.ReactNode;
}) {
  const router = useRouter();
  const signup = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const supabase = supabaseBrowser();

    if (signup) {
      if (password.length < 8) {
        setError('Please use at least 8 characters.');
        setBusy(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName.trim() || null } },
      });

      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }

      // With email confirmation switched on there is no session yet, and
      // pushing the user at a dashboard would only bounce them back here.
      if (!data.session) {
        setNotice('Account created. Check your email to confirm, then sign in.');
        setBusy(false);
        return;
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Supabase says "Invalid login credentials" either way, which is right:
        // telling someone the email exists but the password is wrong hands them
        // half the answer.
        setError('Email or password is wrong.');
        setBusy(false);
        return;
      }
    }

    // Straight on to wherever they were headed — usually the server-decided
    // home, but checkout when they arrived from a pricing page.
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card-panel w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-lg font-bold text-slate-800">
            {signup ? 'Create your account' : 'Sign in'}
          </h1>
          {intro ?? (
            <p className="mt-1 text-xs text-slate-500">
              {signup ? 'You will be able to manage your own card.' : 'Welcome back.'}
            </p>
          )}
        </div>

        {signup && (
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
            autoComplete="name"
            className={inputClass}
          />
        )}

        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          autoFocus={!signup}
          autoComplete="email"
          className={inputClass}
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={signup ? 'Password (8+ characters)' : 'Password'}
          required
          autoComplete={signup ? 'new-password' : 'current-password'}
          className={inputClass}
        />

        {error && <p className="text-sm text-rose-600">{error}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <button
          disabled={busy}
          className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}
        </button>

        <p className="text-center text-xs text-slate-500">
          {signup ? 'Already have an account? ' : 'New here? '}
          <Link
            href={
              (signup ? '/login' : '/signup') +
              (next !== '/after-login' ? `?next=${encodeURIComponent(next)}` : '')
            }
            className="font-semibold text-slate-800 underline underline-offset-2"
          >
            {signup ? 'Sign in' : 'Create one'}
          </Link>
        </p>
      </form>
    </div>
  );
}
