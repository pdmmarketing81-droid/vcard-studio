import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { putMedia, sniffType, mediaPath } from '@/lib/storage';
import { checkDimensions, stripMetadata } from '@/lib/imageSafety';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

export const MAX_BYTES = 8 * 1024 * 1024;

/* Multipart wrapping — the boundary lines and the part headers — adds a little
   to the wire size, so a file exactly on the limit arrives slightly over it.
   Without this slack an 8 MB file would be refused for being 8 MB. */
const WIRE_SLACK = 64 * 1024;

export async function POST(req: Request) {
  /* This is the one authenticated route that writes to storage we pay for.
     A signed-in account looping uploads fills the bucket and the bill, and a
     card only ever needs a handful of files — 60 in ten minutes is generous
     for a real person and useless for a script. */
  const limit = rateLimit(callerKey(req, 'upload'), { max: 60, windowMs: 10 * 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Too many uploads. Please wait a moment.');

  /* Roles named explicitly. guardApi() with no arguments does NOT mean "anyone
     signed in" — it falls back to main_admin only. Called bare, as it was here,
     this route answered 403 to every reseller and every customer, so nobody but
     the owner of the platform could put a photo on a card. It looked like an
     upload bug and was a permissions default. */
  const gate = await guardApi('main_admin', 'sub_admin', 'end_user');
  if ('response' in gate) return gate.response;

  /* Size is checked from the header FIRST, before a single byte is parsed.
     It used to be checked after req.formData(), which meant a 60 MB video was
     read entirely into memory and only then called too large — and often the
     connection died first, so the browser got Traefik's "Bad Gateway" instead
     of our message. The uploader then showed
     `Unexpected token 'B', "Bad Gateway" is not valid JSON`, which tells the
     person nothing about the actual problem: their file is too big.

     A missing or lying Content-Length still gets caught by the second check
     below; this one exists so the honest case never has to buffer at all. */
  const declared = Number(req.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES + WIRE_SLACK) {
    return NextResponse.json(
      {
        error:
          `That file is ${(declared / 1024 / 1024).toFixed(1)} MB. ` +
          `The limit is ${MAX_BYTES / 1024 / 1024} MB — try a shorter video, ` +
          `or upload it to YouTube and paste the link instead.`,
      },
      { status: 413 }
    );
  }

  const form = await req.formData();
  const file = form.get('file');
  const folder = String(form.get('folder') ?? 'misc');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
          `The limit is ${MAX_BYTES / 1024 / 1024} MB.`,
      },
      { status: 413 }
    );
  }

  // The type is read from the file's own bytes, not from what the browser
  // claimed. Anything we don't recognise is refused rather than guessed at.
  const raw = Buffer.from(await file.arrayBuffer());
  const type = sniffType(raw);
  if (!type) {
    return NextResponse.json(
      { error: 'Unsupported file. Please upload a JPG, PNG, WebP, GIF, MP4, WebM, MP3, M4A or WAV.' },
      { status: 400 }
    );
  }

  // A small file can still declare enormous dimensions. Caught from the header,
  // before anything tries to draw it.
  const tooBig = checkDimensions(raw, type);
  if (tooBig) return NextResponse.json({ error: tooBig }, { status: 400 });

  // EXIF out. Business photos are usually taken on a phone, and phones write
  // the location into the file.
  const buffer = stripMetadata(raw, type);

  try {
    const url = await putMedia(mediaPath(folder, type), buffer, type);
    return NextResponse.json({ url });
  } catch (e) {
    // The underlying message can name buckets, keys and hosts. It belongs in
    // our logs, not in a response anyone can trigger.
    console.error('[upload]', e);
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 });
  }
}
