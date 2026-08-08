import { supabaseAdmin } from './supabase';
import { realProfile, currentProfile, type Profile } from './session';

/**
 * Writes one line to the audit log.
 *
 * Deliberately never throws. An audit write failing must not undo a top-up
 * that already happened — losing the record is bad, losing the money is worse.
 * A failure is logged to the console instead, where the deploy's own logging
 * will pick it up.
 */
export async function audit(opts: {
  /** The real human. During impersonation this is still the main admin. */
  actor: Profile | { id: string } | null;
  /** Who they were signed in as, if that is not themselves. */
  actingAs?: string | null;
  action: string;
  targetType?: 'profile' | 'business' | 'wallet' | 'session';
  targetId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  try {
    await supabaseAdmin().from('audit_log').insert({
      actor_id: opts.actor?.id ?? null,
      acting_as: opts.actingAs ?? null,
      action: opts.action,
      target_type: opts.targetType ?? null,
      target_id: opts.targetId ?? null,
      detail: opts.detail ?? {},
    });
  } catch (e) {
    console.error('[audit] could not record', opts.action, e);
  }
}

/**
 * The version routes should call.
 *
 * Works out the real actor and who they were acting as, so no route has to
 * remember to pass both — and so none of them can accidentally record the
 * impersonated account as the one that did it, which is exactly the case the
 * log exists for.
 */
export async function auditAction(opts: {
  action: string;
  targetType?: 'profile' | 'business' | 'wallet' | 'session';
  targetId?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const [real, effective] = await Promise.all([realProfile(), currentProfile()]);
  await audit({
    actor: real,
    actingAs: real && effective && real.id !== effective.id ? effective.id : null,
    ...opts,
  });
}

/**
 * Records only what changed, and never the values of anything sensitive.
 *
 * A card's contents must not end up in here — the log is readable by every
 * main admin and kept for ever, which makes it a quiet second copy of data
 * that was supposed to live in one place.
 */
export function changed<T extends Record<string, unknown>>(
  before: T | null,
  after: Partial<T>,
  fields: (keyof T)[]
): Record<string, { from: unknown; to: unknown }> {
  const out: Record<string, { from: unknown; to: unknown }> = {};
  for (const f of fields) {
    if (!(f in after)) continue;
    const from = before?.[f];
    const to = after[f];
    if (from !== to) out[String(f)] = { from, to };
  }
  return out;
}
