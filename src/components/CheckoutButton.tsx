'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Pay for a plan, then wait for the account to switch on.
 *
 * The switch happens in the webhook, not here — so after the payment window
 * closes there is a short wait while Razorpay tells our server. The page says
 * so rather than sitting silent, because a person who has just paid and sees
 * nothing happen assumes their money has gone.
 */
export default function CheckoutButton({
  planSlug,
  planName,
  price,
}: {
  planSlug: string;
  planName: string;
  price: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadScript(): Promise<boolean> {
    if (window.Razorpay) return true;
    return new Promise((resolve) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function waitForActivation() {
    setStatus('Payment received. Setting up your account…');
    for (let i = 0; i < 12; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      const res = await fetch('/api/me', { cache: 'no-store' });
      const me = await res.json().catch(() => null);
      if (me?.active) {
        router.push('/after-login');
        router.refresh();
        return;
      }
    }
    setStatus(
      'Payment went through, but the account is taking longer than usual to switch on. ' +
        'Refresh in a minute — if it still is not ready, contact us and we will sort it out.'
    );
    setBusy(false);
  }

  async function start() {
    setBusy(true);
    setError(null);
    setStatus(null);

    if (!(await loadScript())) {
      setError('Could not reach the payment window. Check your connection.');
      setBusy(false);
      return;
    }

    const res = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planSlug }),
    });
    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      setError(json.error ?? 'Could not start the payment.');
      setBusy(false);
      return;
    }

    const rzp = new window.Razorpay!({
      key: json.key_id,
      order_id: json.order_id,
      amount: json.amount,
      currency: 'INR',
      name: 'Wizart Studio',
      description: json.plan_name ?? planName,
      handler: () => void waitForActivation(),
      modal: { ondismiss: () => { setBusy(false); setStatus(null); } },
      theme: { color: '#0f172a' },
    });
    rzp.open();
  }

  return (
    <div>
      <button
        onClick={start}
        disabled={busy}
        className="w-full rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
      >
        {busy ? 'Please wait…' : `Pay ₹${price.toLocaleString('en-IN')}`}
      </button>
      {status && <p className="mt-3 text-sm text-slate-600">{status}</p>}
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </div>
  );
}
