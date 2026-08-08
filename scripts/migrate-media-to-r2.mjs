#!/usr/bin/env node
/**
 * Copies every stored file out of Supabase Storage into Cloudflare R2 and
 * repoints the database at the new location.
 *
 * Nothing is deleted. The Supabase objects stay exactly where they are, so if
 * this goes wrong the old URLs still work and the fix is to put them back.
 * Delete the old project only after this has run clean and the cards have been
 * checked in a browser.
 *
 * Safe to run repeatedly: URLs already pointing at R2 are skipped, and an
 * object that already exists in the bucket is not re-uploaded.
 *
 *   node scripts/migrate-media-to-r2.mjs --dry     # report only, no writes
 *   node scripts/migrate-media-to-r2.mjs           # do it
 */

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';
import { S3Client, PutObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

const DRY = process.argv.includes('--dry');

/* ----------------------------- environment ----------------------------- */
// A plain node script gets none of Next's env loading, so .env.local is read
// here. Deliberately simple: KEY=VALUE, '#' starts a comment only at the
// beginning of a line — a '#' inside a password is part of the password.
function loadEnv(file) {
  let raw;
  try {
    raw = readFileSync(file, 'utf8');
  } catch {
    return;
  }
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    if (!process.env[key]) process.env[key] = line.slice(eq + 1).trim();
  }
}
loadEnv('.env.local');

const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`\n  Missing ${k} in .env.local — cannot continue.\n`);
    process.exit(1);
  }
  return v;
};

const SUPABASE_URL = need('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_KEY = need('SUPABASE_SERVICE_ROLE_KEY');
const R2_ACCOUNT_ID = need('R2_ACCOUNT_ID');
const R2_KEY = need('R2_ACCESS_KEY_ID');
const R2_SECRET = need('R2_SECRET_ACCESS_KEY');
const R2_PUBLIC = need('R2_PUBLIC_URL').replace(/\/+$/, '');
const BUCKET = process.env.R2_BUCKET || 'card-media';

const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_KEY, secretAccessKey: R2_SECRET },
});

/* ------------------------------- targets -------------------------------
   Every column anywhere in the schema that can hold a URL we host.
   videos.url is included because a 'custom' provider video is our own file;
   YouTube and Instagram links simply fail the pattern below and are skipped. */
const TARGETS = [
  { table: 'businesses',    columns: ['logo_url', 'cover_url'] },
  { table: 'services',      columns: ['image_url'] },
  { table: 'packages',      columns: ['image_url'] },
  { table: 'testimonials',  columns: ['avatar_url'] },
  { table: 'gallery_items', columns: ['image_url'] },
  { table: 'videos',        columns: ['url'] },
];

/** Object path inside the bucket, or null if this URL isn't ours to move. */
function storagePath(url) {
  if (typeof url !== 'string') return null;
  if (url.startsWith(R2_PUBLIC)) return null; // already moved
  const m = url.match(/\/storage\/v1\/object\/public\/[^/]+\/(.+)$/);
  if (!m) return null;
  return decodeURIComponent(m[1].split('?')[0]);
}

const EXT_TYPES = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp',
  gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm',
};

const seen = new Map(); // old URL -> new URL, so a shared image moves once
const stats = { copied: 0, skipped: 0, failed: 0, rows: 0, bytes: 0 };

async function existsInR2(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch {
    return false;
  }
}

/** Downloads one object and puts it in R2. Returns the new URL, or null. */
async function move(oldUrl) {
  if (seen.has(oldUrl)) return seen.get(oldUrl);

  const key = storagePath(oldUrl);
  if (!key) return null;

  const newUrl = `${R2_PUBLIC}/${key}`;

  if (DRY) {
    console.log(`  would copy  ${key}`);
    stats.copied++;
    seen.set(oldUrl, newUrl);
    return newUrl;
  }

  if (await existsInR2(key)) {
    console.log(`  already there  ${key}`);
    stats.skipped++;
    seen.set(oldUrl, newUrl);
    return newUrl;
  }

  const res = await fetch(oldUrl);
  if (!res.ok) {
    console.warn(`  MISSING (${res.status})  ${oldUrl}`);
    stats.failed++;
    return null; // leave the row pointing at the old URL rather than break it
  }

  const body = Buffer.from(await res.arrayBuffer());
  const ext = key.split('.').pop()?.toLowerCase() ?? '';
  const type = res.headers.get('content-type') || EXT_TYPES[ext] || 'application/octet-stream';

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: body,
    ContentType: type,
    CacheControl: 'public, max-age=31536000, immutable',
  }));

  console.log(`  copied  ${key}  (${(body.length / 1024).toFixed(0)} KB)`);
  stats.copied++;
  stats.bytes += body.length;
  seen.set(oldUrl, newUrl);
  return newUrl;
}

/* -------------------------------- run -------------------------------- */
async function migrateTable({ table, columns }) {
  const { data, error } = await db.from(table).select(['id', ...columns].join(','));
  if (error) throw new Error(`${table}: ${error.message}`);

  console.log(`\n${table} — ${data.length} row${data.length === 1 ? '' : 's'}`);

  for (const row of data) {
    const patch = {};
    for (const col of columns) {
      const next = await move(row[col]);
      if (next && next !== row[col]) patch[col] = next;
    }
    if (Object.keys(patch).length === 0) continue;

    if (!DRY) {
      const { error: upErr } = await db.from(table).update(patch).eq('id', row.id);
      if (upErr) throw new Error(`${table} ${row.id}: ${upErr.message}`);
    }
    stats.rows++;
  }
}

/** feedback.attachments is a jsonb array of { url, name, type, size }. */
async function migrateFeedback() {
  const { data, error } = await db
    .from('feedback')
    .select('id, attachments')
    .not('attachments', 'eq', '[]');
  if (error) throw new Error(`feedback: ${error.message}`);

  console.log(`\nfeedback — ${data.length} row${data.length === 1 ? '' : 's'} with attachments`);

  for (const row of data) {
    if (!Array.isArray(row.attachments) || row.attachments.length === 0) continue;

    let changed = false;
    const next = [];
    for (const a of row.attachments) {
      const url = await move(a?.url);
      if (url && url !== a.url) changed = true;
      next.push(url ? { ...a, url } : a);
    }
    if (!changed) continue;

    if (!DRY) {
      const { error: upErr } = await db.from('feedback').update({ attachments: next }).eq('id', row.id);
      if (upErr) throw new Error(`feedback ${row.id}: ${upErr.message}`);
    }
    stats.rows++;
  }
}

(async () => {
  console.log(DRY ? '\nDRY RUN — nothing will be written.\n' : '\nMigrating media to R2.\n');
  console.log(`  from  ${SUPABASE_URL}`);
  console.log(`  to    ${R2_PUBLIC}  (bucket ${BUCKET})`);

  try {
    for (const t of TARGETS) await migrateTable(t);
    await migrateFeedback();
  } catch (e) {
    console.error(`\nStopped: ${e.message}`);
    console.error('Nothing is lost — the Supabase originals are untouched. Fix and re-run.\n');
    process.exit(1);
  }

  console.log('\n' + '─'.repeat(52));
  console.log(`  files copied     ${stats.copied}`);
  console.log(`  already in R2    ${stats.skipped}`);
  console.log(`  missing / failed ${stats.failed}`);
  console.log(`  rows updated     ${stats.rows}`);
  if (stats.bytes) console.log(`  transferred      ${(stats.bytes / 1024 / 1024).toFixed(1)} MB`);
  console.log('─'.repeat(52));

  if (stats.failed) {
    console.log('\n  Some files were missing at the source. Those rows still point at');
    console.log('  the old URLs and were left alone — check them before deleting');
    console.log('  the old Supabase project.\n');
  } else if (!DRY) {
    console.log('\n  Done. Open every card in a browser and confirm the images load');
    console.log('  from R2 before deleting the old project.\n');
  }
})();
