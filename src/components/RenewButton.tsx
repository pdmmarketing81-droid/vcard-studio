'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

/**
 * Pay to renew one card.
 *
 * Same shape as CheckoutButton, and deliberately so — the money still lands
 * through the webhook, not through the browser, because a customer who pays
 * and closes the tab must still get their year.
 */
export default function RenewButton({
  cardId,
  amount,
  overdue = false,
}: {
  cardId: string;
  amount: number;
  overdue?: boolean;
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

  async function afterPaid() {
    setStatus('Payment received. Renewing your card…');
    // The webhook does the work, so this waits rather than assuming.
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

    if (!(await loadScript())) {
      setError('Could not reach the payment window. Check your connection.');
      setBusy(false);
      return;
    }

    const res = await fetch('/api/renew', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ card: cardId }),
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
      description: json.plan_name,
      handler: () => void afterPaid(),
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
        className={`rounded-lg px-4 py-2 text-xs font-semibold transition disabled:opacity-50 ${
          overdue
            ? 'bg-rose-600 text-white hover:bg-rose-700'
            : 'bg-slate-900 text-white hover:bg-slate-700'
        }`}
      >
        {busy ? 'Please wait…' : `Renew · ₹${amount.toLocaleString('en-IN')}`}
      </button>
      {status && <p className="mt-2 text-xs text-slate-600">{status}</p>}
      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
    </div>
  );
}
