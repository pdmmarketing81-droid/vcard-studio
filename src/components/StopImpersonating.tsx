'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StopImpersonating({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function stop() {
    setBusy(true);
    await fetch('/api/admin/impersonate', { method: 'DELETE' });
    router.push('/admin/users');
    // Without this the server components keep serving the impersonated view
    // from cache, and the banner stays up after the cookie has gone.
    router.refresh();
  }

  return (
    <button type="button" onClick={stop} disabled={busy} className={className}>
      {busy ? 'Switching back…' : 'Back to my account'}
    </button>
  );
}
