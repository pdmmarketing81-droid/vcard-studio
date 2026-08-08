import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { Role } from '@/lib/session';
import { auditAction } from '@/lib/audit';

const ROLES: Role[] = ['main_admin', 'sub_admin', 'end_user'];

/**
 * Creating an account on someone else's behalf.
 *
 * Only a main admin gets here, and the check is the first thing that happens —
 * before the body is even read, so a malformed request cannot reach any of the
 * logic below.
 *
 * The password is set by the main admin and shown back once. There is no email
 * involved: outbound mail is not reliable here, and an invite that never
 * arrives is worse than a password handed over on WhatsApp.
 */
export async function POST(req: Request) {
  const gate = await guardApi('main_admin', 'sub_admin');
  if ('response' in gate) return gate.response;
  const me = gate.profile;

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');

  /* A reseller may only ever create customers, and only under themselves. Both
     are forced here rather than validated — there is no request they can send
     that produces any other outcome, so there is no rule to get wrong. */
  const isReseller = me.role === 'sub_admin';
  const role = isReseller ? ('end_user' as Role) : (String(body.role ?? 'end_user') as Role);
  const parentId = isReseller ? me.id : body.parent_id ? String(body.parent_id) : null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'That email does not look right.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!ROLES.includes(role)) {
    return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });
  }

  const db = supabaseAdmin();

  // A parent only means something for an end user, and it must point at a real
  // reseller. Silently accepting a bad one would leave a customer attached to
  // nobody, invisible to the reseller who is paying for them.
  if (parentId) {
    const { data: parent } = await db
      .from('profiles').select('role').eq('id', parentId).maybeSingle();
    if (!parent || parent.role !== 'sub_admin') {
      return NextResponse.json({ error: 'That reseller does not exist.' }, { status: 400 });
    }
  }

  const { data: created, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // no working mailbox flow yet; confirming here avoids a dead end
  });

  if (error) {
    const taken = /already|exists|registered/i.test(error.message);
    if (!taken) console.error('[create user]', error);
    return NextResponse.json(
      { error: taken ? 'Someone already uses that email.' : 'Could not create the account.' },
      { status: taken ? 409 : 500 }
    );
  }

  // The signup trigger has already made the profile row at the default role;
  // this raises it to what was asked for.
  const { error: pErr } = await db
    .from('profiles')
    .update({
      role,
      parent_id: role === 'end_user' ? parentId : null,
      full_name: body.full_name ? String(body.full_name).slice(0, 120) : null,
      phone: body.phone ? String(body.phone).slice(0, 40) : null,
      business_name: body.business_name ? String(body.business_name).slice(0, 160) : null,
    })
    .eq('id', created.user.id);

  if (pErr) {
    // Half a user is worse than none: the account would exist, be signable-into,
    // and carry the wrong role. Roll it back.
    await db.auth.admin.deleteUser(created.user.id);
    console.error('[create user profile]', pErr);
    return NextResponse.json({ error: 'Could not create the account.' }, { status: 500 });
  }

  await auditAction({
    action: 'user.create',
    targetType: 'profile',
    targetId: created.user.id,
    detail: { email, role, parent_id: parentId, created_by_role: me.role },
  });

  return NextResponse.json({ id: created.user.id, email });
}
