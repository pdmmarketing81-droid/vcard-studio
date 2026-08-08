import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { putMedia, sniffType, mediaPath, extensionFor } from '@/lib/storage';
import { checkDimensions, stripMetadata } from '@/lib/imageSafety';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';
import { sendMail, feedbackEmail, type MailAttachment } from '@/lib/mail';
import type { FeedbackAttachment } from '@/lib/types';

/**
 * Records a rating from the review page, and emails the owner when the
 * visitor left private feedback instead of going to Google.
 *
 * Two shapes arrive here:
 *   • JSON via sendBeacon — fired as the visitor is redirected to Google.
 *     No files, no response anyone waits for.
 *   • multipart/form-data — the "Post" button, possibly with photos/videos.
 *
 * Every rating is stored, including the ones that went to Google, so the
 * admin sees the real distribution rather than only the complaints.
 */

const MAX_FILES = 5;
const MAX_TOTAL_BYTES = 15 * 1024 * 1024;

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s.slice(0, max);
};

/**
 * A filename chosen by an anonymous visitor ends up in an email header and in
 * the admin's list, so it is rebuilt from scratch rather than trusted: strip
 * anything that isn't plain, drop the claimed extension, and use the one that
 * matches what the bytes actually are.
 */
const safeName = (raw: string, type: string): string => {
  const stem = raw.replace(/\.[^.]*$/, '').replace(/[^a-z0-9 _-]/gi, '').trim().slice(0, 60);
  return `${stem || 'attachment'}.${extensionFor(type)}`;
};

interface Parsed {
  rating: number;
  message: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  wentToGoogle: boolean;
  files: File[];
}

async function parse(req: Request): Promise<Parsed | null> {
  const type = req.headers.get('content-type') ?? '';

  if (type.includes('multipart/form-data')) {
    const fd = await req.formData();
    const files = fd
      .getAll('files')
      .filter((f): f is File => f instanceof File)
      .slice(0, MAX_FILES);

    return {
      rating: Number(fd.get('rating')),
      message: clip(fd.get('message'), 4000),
      name: clip(fd.get('name'), 120),
      phone: clip(fd.get('phone'), 40),
      email: clip(fd.get('email'), 200),
      wentToGoogle: false,
      files,
    };
  }

  const body = await req.json().catch(() => null);
  if (!body) return null;
  return {
    rating: Number(body.rating),
    message: clip(body.message, 4000),
    name: clip(body.name, 120),
    phone: clip(body.phone, 40),
    email: clip(body.email, 200),
    wentToGoogle: body.went_to_google === true,
    files: [],
  };
}

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  /* Anyone with the QR code can reach this, with no login and no cost to them.
     Left open it is a way to fill the owner's inbox, fill our storage, and run
     up an email bill — all from one phone. Twenty in ten minutes is far more
     than any real shop sees and far less than an attack needs. */
  const limit = rateLimit(callerKey(req, 'review'), { max: 20, windowMs: 10 * 60_000 });
  if (!limit.ok) {
    return tooManyRequests(limit.retryAfter, 'Too many reviews from here. Please try again shortly.');
  }

  const input = await parse(req);
  if (!input || !Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    return NextResponse.json({ error: 'rating must be 1–5' }, { status: 400 });
  }

  const db = supabaseAdmin();
  const { data: business } = await db
    .from('businesses')
    .select('id, name, feedback_email, review_enabled, published')
    .eq('slug', params.slug)
    .maybeSingle();

  if (!business || !business.published || !business.review_enabled) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  /* ---------------------------- store ----------------------------
     Written BEFORE the uploads on purpose. Attachments can take several
     seconds on mobile data, and if the visitor closes the tab mid-upload the
     request dies with it. Saving the rating and the words first means the
     part that actually matters survives; the photos are attached after. */
  const { data: row, error } = await db
    .from('feedback')
    .insert({
      business_id: business.id,
      rating: input.rating,
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      went_to_google: input.wentToGoogle,
      attachments: [],
    })
    .select('id')
    .single();

  if (error) {
    // Postgres errors name tables, columns and constraints. Useful to us,
    // a free map of the schema to anyone else.
    console.error('[review insert]', error);
    return NextResponse.json({ error: 'Could not save your feedback.' }, { status: 500 });
  }

  // Visitors who went to Google are counted, not forwarded.
  if (input.wentToGoogle || !business.feedback_email) {
    return NextResponse.json({ ok: true });
  }

  /* ------------------------- attachments ------------------------- */
  const attachments: FeedbackAttachment[] = [];
  const mailFiles: MailAttachment[] = [];
  let bytes = 0;

  for (const file of input.files) {
    bytes += file.size;
    if (bytes > MAX_TOTAL_BYTES) break;

    // Anyone with the link can post here, so the type comes from the bytes
    // rather than from the browser's claim about them.
    const raw = Buffer.from(await file.arrayBuffer());
    const type = sniffType(raw);
    if (!type) continue;

    // Silently skipped rather than refused: the rating and the words are
    // already saved, and failing the whole submission over one odd photo
    // would lose the feedback that actually matters.
    if (checkDimensions(raw, type)) continue;

    /* This is the one that matters most on this route. A customer photographing
       a shop is standing in it, and their phone writes those coordinates into
       the file. That photo then goes into an email and onto a public URL. */
    const buffer = stripMetadata(raw, type);
    const name = safeName(file.name, type);

    // Stored as well as emailed: the inbox should still show the photo months
    // later, when the email has long been deleted. A storage failure must not
    // cost us the email, so it is caught here and the attachment still rides
    // along in the message.
    try {
      const url = await putMedia(mediaPath(`feedback/${business.id}`, type), buffer, type);
      attachments.push({ url, name, type, size: file.size });
    } catch (e) {
      console.error('[review attachment]', e);
    }

    mailFiles.push({ filename: name, content: buffer, contentType: type });
  }

  if (attachments.length) {
    await db.from('feedback').update({ attachments }).eq('id', row.id);
  }

  /* ----------------------------- mail ----------------------------- */
  // The feedback is already saved. A mail failure must not show the visitor
  // an error — we record it and the admin inbox still has everything.
  try {
    const mail = feedbackEmail({
      businessName: business.name,
      rating: input.rating,
      name: input.name,
      phone: input.phone,
      email: input.email,
      message: input.message,
      attachmentUrls: attachments.map((a) => a.url),
    });

    await sendMail({
      to: business.feedback_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: input.email ?? undefined,
      attachments: mailFiles,
    });

    await db.from('feedback').update({ emailed: true }).eq('id', row.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown mail error';
    await db.from('feedback').update({ email_error: msg.slice(0, 500) }).eq('id', row.id);
  }

  return NextResponse.json({ ok: true });
}
