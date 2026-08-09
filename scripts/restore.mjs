#!/usr/bin/env node
/**
 * Read a backup back, and put it back if asked.
 *
 * Default mode CHECKS ONLY. It opens the file, counts the rows, and looks for
 * the kind of damage that makes a backup useless on the day you need it — a
 * table silently empty, a child row pointing at a parent that is not in the
 * file. Nothing is written unless you say so twice.
 *
 *   node scripts/restore.mjs /var/backups/wizart/wizart-....json.gz
 *   node scripts/restore.mjs <file> --restore --yes
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS CAN AND CANNOT BRING BACK — read before you rely on it
 *
 * Can:  every business, card, service, photo reference, wallet entry, payment
 *       order, plan and terms row, into a project whose auth.users still
 *       exist. That covers the realistic disaster: a bad migration, a wrong
 *       DELETE, a table dropped at 2am.
 *
 * Cannot: recreate auth accounts with their original ids. The admin API will
 *       not let you choose a user's uuid, and profiles.id is that uuid. So a
 *       TOTAL project loss is a partial recovery — you would recreate accounts
 *       and remap ids by email, using the auth_users list in the backup.
 *
 * That gap is real and I would rather it be written here than discovered on
 * the day. If total-loss recovery has to be clean, the answer is Supabase's
 * own paid backups or a real pg_dump, not this.
 * ---------------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';
import { gunzipSync } from 'node:zlib';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function loadEnv() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const file = process.argv[2];
const doRestore = process.argv.includes('--restore') && process.argv.includes('--yes');

if (!file) {
  console.error('Usage: node scripts/restore.mjs <backup.json.gz> [--restore --yes]');
  process.exit(1);
}

/* Parents before children. A restore in any other order fails on foreign keys
   halfway through and leaves the database in a state nobody planned for. */
const ORDER = [
  'plans', 'profiles', 'reseller_terms', 'businesses',
  'social_links', 'services', 'packages', 'testimonials',
  'gallery_items', 'videos', 'business_hours', 'feedback',
  'wallet_transactions', 'payment_orders', 'card_views_daily', 'audit_log',
];

/** Child table -> the table its business_id must be found in. */
const CHILD_OF = {
  social_links: 'businesses', services: 'businesses', packages: 'businesses',
  testimonials: 'businesses', gallery_items: 'businesses', videos: 'businesses',
  business_hours: 'businesses', feedback: 'businesses', card_views_daily: 'businesses',
};

const dump = JSON.parse(gunzipSync(readFileSync(file)).toString('utf8'));

console.log(`Backup taken at: ${dump.taken_at}`);
console.log('');

let problems = 0;

for (const t of ORDER) {
  const rows = dump.tables?.[t];
  if (!Array.isArray(rows)) {
    console.log(`  ${t.padEnd(22)} MISSING FROM FILE`);
    problems++;
    continue;
  }
  console.log(`  ${t.padEnd(22)} ${String(rows.length).padStart(6)}`);
}
console.log(`  ${'auth.users'.padEnd(22)} ${String(dump.auth_users?.length ?? 0).padStart(6)}`);

// The check that actually matters: does every child point at a parent we hold?
console.log('');
const businessIds = new Set((dump.tables?.businesses ?? []).map((b) => b.id));
for (const [child, parent] of Object.entries(CHILD_OF)) {
  const rows = dump.tables?.[child] ?? [];
  const orphans = rows.filter((r) => r.business_id && !businessIds.has(r.business_id));
  if (orphans.length) {
    console.log(`  ORPHANS: ${orphans.length} row(s) in ${child} reference a ${parent} not in this file`);
    problems++;
  }
}

// A card with no owner cannot be charged or renewed — worth knowing before a restore.
const ownerless = (dump.tables?.businesses ?? []).filter((b) => !b.owner_id);
if (ownerless.length) {
  console.log(`  WARNING: ${ownerless.length} card(s) have no owner_id`);
}

console.log('');
if (problems > 0) {
  console.log(`CHECK FAILED — ${problems} problem(s). Do not restore from this file.`);
  process.exit(1);
}
console.log('CHECK OK — this file is internally consistent.');

if (!doRestore) {
  console.log('');
  console.log('Nothing was written. To actually restore:');
  console.log(`  node scripts/restore.mjs ${file} --restore --yes`);
  process.exit(0);
}

/* ------------------------------------------------------------------ write */
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log('');
console.log('RESTORING — upserting by primary key, in dependency order.');

for (const t of ORDER) {
  const rows = dump.tables[t];
  if (!rows.length) { console.log(`  ${t}: nothing to do`); continue; }

  // In batches: one 20 000-row request times out and tells you nothing about
  // how far it got.
  const SIZE = 500;
  let done = 0;
  for (let i = 0; i < rows.length; i += SIZE) {
    const chunk = rows.slice(i, i + SIZE);
    const { error } = await db.from(t).upsert(chunk, { onConflict: undefined });
    if (error) {
      console.error(`  ${t}: FAILED after ${done} rows — ${error.message}`);
      console.error('  Stopping here. Earlier tables are restored; this one is partial.');
      process.exit(1);
    }
    done += chunk.length;
  }
  console.log(`  ${t}: ${done}`);
}

console.log('');
console.log('RESTORE DONE.');
console.log('auth.users were NOT touched — see the note at the top of this file.');
