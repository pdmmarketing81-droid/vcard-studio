import { NextResponse } from 'next/server';
import { guardApi } from '@/lib/auth';
import { putMedia, sniffType, mediaPath } from '@/lib/storage';
import { checkDimensions, stripMetadata } from '@/lib/imageSafety';

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const gate = await guardApi();
  if ('response' in gate) return gate.response;

  const form = await req.formData();
  const file = form.get('file');
  const folder = String(form.get('folder') ?? 'misc');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File is too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 400 }
    );
  }

  // The type is read from the file's own bytes, not from what the browser
  // claimed. Anything we don't recognise is refused rather than guessed at.
  const raw = Buffer.from(await file.arrayBuffer());
  const type = sniffType(raw);
  if (!type) {
    return NextResponse.json(
      { error: 'Unsupported file. Please upload a JPG, PNG, WebP, GIF, MP4 or WebM.' },
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
