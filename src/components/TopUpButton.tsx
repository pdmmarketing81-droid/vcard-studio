'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

const PRESETS = [500, 1000, 2000, 5000];

/**
 * Wallet top-up through Razorpay.
 *
 * The wallet is NOT credited from here. This opens the payment and then waits
 * for the webhook, which is what actually banks it. Doing it from the browser
 * would mean trusting a "payment succeeded" message that anyone could send.
 *
 * The wait is usually a second or two, so the button polls briefly rather than
 * telling the user to refresh — but it says plainly what it is doing, because
 * money that has left your account and not arrived is a frightening few
 * seconds.
 */
export default function TopUpButton({ small = false }: { small?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(1000);
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

  /** Waits for the webhook to land, then refreshes. */
  async function waitForCredit() {
    setStatus('Payment received. Adding it to your wallet…');
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1500));
      router.refresh();
    }
    setStatus(null);
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

    const res = await fetch('/api/reseller/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount }),
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
      name: 'vCard Studio',
      description: 'Wallet top-up',
      handler: () => void waitForCredit(),
      modal: {
        ondismiss: () => {
          setBusy(false);
          setStatus(null);
        },
      },
      theme: { color: '#0f172a' },
    });

    setOpen(false);
    rzp.open();
  }

  if (!open) {
    return (
      <div>
        <button
          onClick={() => setOpen(true)}
          disabled={busy}
          className={
            small
              ? 'rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50'
              : 'rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50'
          }
        >
          {busy ? 'Please wait…' : 'Top up wallet'}
        </button>
        {status && <p className="mt-2 text-sm text-slate-600">{status}</p>}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="card-panel space-y-3 p-4">
      <p className="text-sm font-semibold text-slate-800">How much?</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p}
            onClick={() => setAmount(p)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
              amount === p ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'
            }`}
          >
            ₹{p.toLocaleString('en-IN')}
          </button>
        ))}
      </div>
      <input
        type="number"
        min={100}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
      />
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={start}
          disabled={busy}
          className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? 'Opening…' : `Pay ₹${amount.toLocaleString('en-IN')}`}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
