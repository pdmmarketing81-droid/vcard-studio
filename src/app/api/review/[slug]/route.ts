import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
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
const ALLOWED = /^(image\/(png|jpe?g|webp|gif|heic|heif)|video\/(mp4|webm|quicktime))$/i;

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s.slice(0, max);
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

  /* ------------------------- attachments ------------------------- */
  const attachments: FeedbackAttachment[] = [];
  const mailFiles: MailAttachment[] = [];
  let bytes = 0;

  for (const file of input.files) {
    if (!ALLOWED.test(file.type)) continue;
    bytes += file.size;
    if (bytes > MAX_TOTAL_BYTES) break;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() ?? 'bin').toLowerCase().slice(0, 8);
    const path = `feedback/${business.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 8)}.${ext}`;

    // Stored as well as emailed: the inbox should still show the photo months
    // later, when the email has long been deleted.
    const { error } = await db.storage
      .from('card-media')
      .upload(path, buffer, { contentType: file.type, upsert: false });

    if (!error) {
      const { data } = db.storage.from('card-media').getPublicUrl(path);
      attachments.push({
        url: data.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      });
    }

    mailFiles.push({
      filename: file.name,
      content: buffer,
      contentType: file.type,
    });
  }

  /* ---------------------------- store ---------------------------- */
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
      attachments,
    })
    .select('id')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Visitors who went to Google are counted, not forwarded.
  if (input.wentToGoogle || !business.feedback_email) {
    return NextResponse.json({ ok: true });
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
