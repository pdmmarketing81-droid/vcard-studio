import { NextResponse } from 'next/server';
import { realProfile } from '@/lib/session';
import { supabaseAdmin } from '@/lib/supabase';
import { audit } from '@/lib/audit';
import { IMPERSONATE_COOKIE, makeToken } from '@/lib/impersonation';

/**
 * Start or stop being signed in as someone else.
 *
 * Guarded on realProfile(), not currentProfile(). Using the effective profile
 * would let an impersonated session start a *new* impersonation and walk from
 * account to account, with the audit trail losing track of who began it.
 */
export async function POST(req: Request) {
  const me = await realProfile();
  if (!me || me.role !== 'main_admin') {
    return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  }

  const { user_id } = await req.json().catch(() => ({ user_id: null }));
  if (!user_id || typeof user_id !== 'string') {
    return NextResponse.json({ error: 'Which account?' }, { status: 400 });
  }
  if (user_id === me.id) {
    return NextResponse.json({ error: 'That is already you.' }, { status: 400 });
  }

  const { data: target } = await supabaseAdmin()
    .from('profiles').select('id, role').eq('id', user_id).maybeSingle();

  if (!target) return NextResponse.json({ error: 'No such account.' }, { status: 404 });
  if (target.role === 'main_admin') {
    return NextResponse.json(
      { error: 'You cannot sign in as another main admin.' },
      { status: 400 }
    );
  }

  const token = makeToken(user_id);
  if (!token) {
    console.error('[impersonate] APP_SECRET is not set.');
    return NextResponse.json({ error: 'Not configured.' }, { status: 503 });
  }

  await audit({
    actor: me,
    actingAs: user_id,
    action: 'session.impersonate.start',
    targetType: 'profile',
    targetId: user_id,
    detail: { role: target.role },
  });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(IMPERSONATE_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    // Short by design. Being someone else should be something you do for a
    // task, not a state you forget you are in.
    maxAge: 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const me = await realProfile();
  if (me) {
    await audit({ actor: me, action: 'session.impersonate.stop', targetType: 'session' });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(IMPERSONATE_COOKIE);
  return res;
}
