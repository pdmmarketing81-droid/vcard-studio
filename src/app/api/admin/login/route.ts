import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, tokenFor, isValidToken } from '@/lib/auth';

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: '' }));
  const token = tokenFor(String(password ?? ''));

  if (!isValidToken(token)) {
    // Small delay blunts trivial brute-forcing of the shared password.
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(ADMIN_COOKIE);
  return res;
}
