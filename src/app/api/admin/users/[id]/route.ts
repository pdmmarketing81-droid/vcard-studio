import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import type { Role } from '@/lib/session';
import { auditAction } from '@/lib/audit';

const ROLES: Role[] = ['main_admin', 'sub_admin', 'end_user'];

/**
 * Changing someone's role, reseller or suspension.
 *
 * Two locks that are easy to forget and expensive to be without:
 *
 *   1. You cannot act on yourself. Demoting or suspending your own account is
 *      always a mistake, and it is one that locks you out of the screen you
 *      would need to undo it.
 *   2. The last main admin cannot be demoted. Otherwise one careless dropdown
 *      leaves the system with nobody who can appoint anyone — recoverable only
 *      by hand in the SQL editor.
 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const gate = await guardApi('main_admin');
  if ('response' in gate) return gate.response;

  if (params.id === gate.profile.id) {
    return NextResponse.json(
      { error: 'You cannot change your own role or suspend yourself.' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Bad request.' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: target } = await db
    .from('profiles').select('id, role').eq('id', params.id).maybeSingle();

  if (!target) return NextResponse.json({ error: 'No such account.' }, { status: 404 });

  const patch: Record<string, unknown> = {};

  if (body.role !== undefined) {
    const role = String(body.role) as Role;
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: 'Unknown role.' }, { status: 400 });
    }

    if (target.role === 'main_admin' && role !== 'main_admin') {
      const { count } = await db
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'main_admin');
      if ((count ?? 0) <= 1) {
        return NextResponse.json(
          { error: 'This is the last main admin. Promote someone else first.' },
          { status: 400 }
        );
      }
    }

    patch.role = role;
    // A reseller or main admin hangs off nobody. Leaving a stale parent behind
    // would quietly keep them listed as somebody's customer.
    if (role !== 'end_user') patch.parent_id = null;
  }

  if (body.parent_id !== undefined) {
    const parentId = body.parent_id ? String(body.parent_id) : null;
    if (parentId) {
      const { data: parent } = await db
        .from('profiles').select('role').eq('id', parentId).maybeSingle();
      if (!parent || parent.role !== 'sub_admin') {
        return NextResponse.json({ error: 'That reseller does not exist.' }, { status: 400 });
      }
      if (parentId === params.id) {
        return NextResponse.json({ error: 'An account cannot be its own reseller.' }, { status: 400 });
      }
    }
    patch.parent_id = parentId;
  }

  if (body.suspended !== undefined) patch.suspended = body.suspended === true;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to change.' }, { status: 400 });
  }

  const { error } = await db.from('profiles').update(patch).eq('id', params.id);
  if (error) {
    console.error('[update user]', error);
    return NextResponse.json({ error: 'Could not save that change.' }, { status: 500 });
  }

  await auditAction({
    action: 'user.update',
    targetType: 'profile',
    targetId: params.id,
    detail: { was: { role: target.role }, now: patch },
  });

  return NextResponse.json({ ok: true });
}
