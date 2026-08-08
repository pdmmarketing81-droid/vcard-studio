'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function out() {
    setBusy(true);
    await supabaseBrowser().auth.signOut();
    router.push('/login');
    // Without this the server components keep rendering the old session's data
    // from cache — the user appears signed out and signed in at the same time.
    router.refresh();
  }

  return (
    <button type="button" onClick={out} disabled={busy} className={className}>
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
