import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { supabaseAdmin } from './supabase';

/**
 * Media storage.
 *
 * Files go to Cloudflare R2 when it is configured, and to Supabase Storage
 * otherwise. R2 is the destination we actually want: 10 GB free, and — the part
 * that matters — no egress charge at all. Supabase's 5 GB/month of bandwidth is
 * the ceiling this project would have hit first, well before the 1 GB of
 * storage, because every card scan pulls a logo, a cover and a gallery.
 *
 * The Supabase branch is not dead code. It keeps uploads working while R2 is
 * being set up, and it is what the existing media is being migrated *away* from.
 */

const BUCKET = process.env.R2_BUCKET || 'card-media';

let client: S3Client | null = null;

function r2(): S3Client | null {
  const id = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!id || !key || !secret || !process.env.R2_PUBLIC_URL) return null;

  client ??= new S3Client({
    region: 'auto',
    endpoint: `https://${id}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
  return client;
}

export function storageBackend(): 'r2' | 'supabase' {
  return r2() ? 'r2' : 'supabase';
}

/** Public URL for an object path, on whichever backend is live. */
export function publicUrl(path: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (base) return `${base.replace(/\/+$/, '')}/${path}`;
  return supabaseAdmin().storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * Stores a file and returns its public URL. Throws on failure — every caller
 * already has a place to put the error, and a silent half-upload is worse than
 * a loud one.
 */
export async function putMedia(
  path: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  const s3 = r2();

  if (s3) {
    await s3.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: path,
        Body: body,
        ContentType: contentType,
        // A year: paths carry a timestamp and a random suffix, so an object at a
        // given key never changes. Long caching is free correctness here.
        CacheControl: 'public, max-age=31536000, immutable',
      })
    );
    return publicUrl(path);
  }

  const { error } = await supabaseAdmin()
    .storage.from(BUCKET)
    .upload(path, body, { contentType, upsert: false });

  if (error) throw new Error(error.message);
  return publicUrl(path);
}

/* --------------------------------------------------------------------------
   Type checking

   A browser's reported MIME type is whatever the client felt like sending, so
   it decides nothing on its own. We read the first few bytes and use what the
   file actually is. SVG is absent from this list deliberately: it is a script
   container, and one served from our own domain would run with our origin.
   -------------------------------------------------------------------------- */

const SIGNATURES: Array<{ type: string; test: (b: Buffer) => boolean }> = [
  { type: 'image/png',  test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { type: 'image/jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { type: 'image/gif',  test: (b) => b.subarray(0, 6).toString('latin1') === 'GIF87a' || b.subarray(0, 6).toString('latin1') === 'GIF89a' },
  { type: 'image/webp', test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP' },
  { type: 'video/webm', test: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
  // MP4 and friends: a size field, then 'ftyp', then the brand.
  { type: 'video/mp4',  test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
];

/** The file's real type from its magic bytes, or null if we don't accept it. */
export function sniffType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null;
  return SIGNATURES.find((s) => s.test(buffer))?.type ?? null;
}

/** Extension matching the sniffed type, so the stored name can't lie either. */
export function extensionFor(type: string): string {
  switch (type) {
    case 'image/png': return 'png';
    case 'image/jpeg': return 'jpg';
    case 'image/gif': return 'gif';
    case 'image/webp': return 'webp';
    case 'video/mp4': return 'mp4';
    case 'video/webm': return 'webm';
    default: return 'bin';
  }
}

/** Collision-resistant object path. Timestamp keeps listings roughly ordered. */
export function mediaPath(folder: string, type: string): string {
  // 80 leaves room for "feedback/" plus a 36-character UUID; anything shorter
  // would silently truncate the id and scatter one card's files across folders.
  const safe = folder.replace(/[^a-z0-9/_-]/gi, '').slice(0, 80) || 'misc';
  const rand = Math.random().toString(36).slice(2, 10);
  return `${safe}/${Date.now()}-${rand}.${extensionFor(type)}`;
}
