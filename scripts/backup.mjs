#!/usr/bin/env node
/**
 * Nightly backup of everything that cannot be rebuilt from the repo.
 *
 * Why not pg_dump: it would mean installing postgresql-client-17 on the VPS
 * (Ubuntu 24.04 ships 16, and 16 refuses to dump a 17 server), on a machine
 * that also hosts a client's live site. This uses the two SDKs the app already
 * depends on, so backups start working tonight with nothing new installed.
 *
 * What this DOES cover: every row of business data, plus the auth user list.
 * What it does NOT cover: the schema itself, and password hashes.
 *
 * That split is deliberate and worth understanding before you need it. The
 * schema lives in supabase/001..011 and is now complete — it was not on 9 Aug
 * 2026, which is exactly the kind of gap this is meant to make survivable.
 * Passwords are not exportable through the API at all; a restored project
 * sends everyone a password reset. Losing that is annoying. Losing the cards,
 * the wallet ledger and who paid what would end the business.
 *
 *   node scripts/backup.mjs
 *   node scripts/backup.mjs --local-only      # skip the R2 upload
 *
 * Reads the same .env.local the app uses.
 */

import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { gzipSync } from 'node:zlib';
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, unlinkSync, statSync } from 'node:fs';
import { join } from 'node:path';

/* ------------------------------------------------------------------ env */
function loadEnv() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}
loadEnv();

const LOCAL_DIR = process.env.BACKUP_DIR || '/var/backups/wizart';
const KEEP_DAYS = Number(process.env.BACKUP_KEEP_DAYS || 30);
const localOnly = process.argv.includes('--local-only');

/* Order matters on restore: parents before children, so a restore run in this
   order never trips a foreign key. */
const TABLES = [
  'plans',
  'profiles',
  'reseller_terms',
  'businesses',
  'social_links',
  'services',
  'packages',
  'testimonials',
  'gallery_items',
  'videos',
  'business_hours',
  'feedback',
  'wallet_transactions',
  'payment_orders',
  'card_views_daily',
  'audit_log',
];

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

/** Read a whole table in pages. A single select would silently stop at 1000. */
async function dumpTable(name) {
  const rows = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db.from(name).select('*').range(from, from + PAGE - 1);
    if (error) throw new Error(`${name}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

/** Emails and ids only — enough to recreate accounts and keep profiles joinable. */
async function dumpAuthUsers() {
  const users = [];
  for (let page = 1; ; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(`auth.users: ${error.message}`);
    users.push(
      ...data.users.map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
      }))
    );
    if (data.users.length < 200) break;
  }
  return users;
}

async function main() {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  const dump = { taken_at: new Date().toISOString(), tables: {} };

  for (const t of TABLES) {
    dump.tables[t] = await dumpTable(t);
    process.stdout.write(`${t}: ${dump.tables[t].length}\n`);
  }
  dump.auth_users = await dumpAuthUsers();
  process.stdout.write(`auth.users: ${dump.auth_users.length}\n`);

  /* A backup nobody can read is not a backup, so this is gzipped JSON rather
     than anything clever — any machine with node, or even python, can open it
     without this repo. */
  const body = gzipSync(Buffer.from(JSON.stringify(dump), 'utf8'));
  const filename = `wizart-${stamp}.json.gz`;

  mkdirSync(LOCAL_DIR, { recursive: true });
  writeFileSync(join(LOCAL_DIR, filename), body);
  process.stdout.write(`\nlocal: ${join(LOCAL_DIR, filename)} (${(body.length / 1024).toFixed(0)} KB)\n`);

  // Local retention.
  const cutoff = Date.now() - KEEP_DAYS * 86400_000;
  for (const f of readdirSync(LOCAL_DIR)) {
    const p = join(LOCAL_DIR, f);
    if (f.startsWith('wizart-') && statSync(p).mtimeMs < cutoff) {
      unlinkSync(p);
      process.stdout.write(`pruned local ${f}\n`);
    }
  }

  if (localOnly) return;

  /* Off the machine as well. A backup that only exists on the server it is
     backing up is not insurance against losing that server. */
  const bucket = process.env.R2_BUCKET;
  if (!bucket || !process.env.R2_ACCOUNT_ID) {
    process.stdout.write('\nR2 not configured — kept the local copy only.\n');
    return;
  }

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });

  const key = `backups/${filename}`;
  await s3.send(new PutObjectCommand({
    Bucket: bucket, Key: key, Body: body, ContentType: 'application/gzip',
  }));
  process.stdout.write(`r2: ${key}\n`);

  // Remote retention, same window.
  const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backups/' }));
  const old = (listed.Contents ?? []).filter((o) => o.LastModified && o.LastModified.getTime() < cutoff);
  if (old.length) {
    await s3.send(new DeleteObjectsCommand({
      Bucket: bucket,
      Delete: { Objects: old.map((o) => ({ Key: o.Key })) },
    }));
    process.stdout.write(`pruned ${old.length} old backup(s) from R2\n`);
  }
}

main().then(
  () => { process.stdout.write('\nBACKUP OK\n'); process.exit(0); },
  (e) => { process.stderr.write(`\nBACKUP FAILED: ${e.message}\n`); process.exit(1); }
);
