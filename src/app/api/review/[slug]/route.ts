import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { sendMail, feedbackEmail } from '@/lib/mail';

/**
 * Records a rating from the review page, and emails the business owner when
 * the visitor left private feedback instead of going to Google.
 *
 * Every rating is stored — including the ones that went to Google — so the
 * admin can see the real distribution rather than only the complaints.
 */

const clip = (v: unknown, max: number): string | null => {
  const s = typeof v === 'string' ? v.trim() : '';
  return s === '' ? null : s.slice(0, max);
};

export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const body = await req.json().catch(() => null);
  const rating = Number(body?.rating);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
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

  const wentToGoogle = body?.went_to_google === true;
  const payload = {
    business_id: business.id,
    rating,
    name: clip(body?.name, 120),
    phone: clip(body?.phone, 40),
    email: clip(body?.email, 200),
    message: clip(body?.message, 4000),
    went_to_google: wentToGoogle,
  };

  const { data: row, error } = await db
    .from('feedback')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Visitors who went to Google left no message — nothing to forward.
  if (wentToGoogle || !business.feedback_email) {
    return NextResponse.json({ ok: true });
  }

  // The feedback is already saved. If the mail fails the visitor should still
  // see a success screen — we record the error and the admin inbox still has
  // the message.
  try {
    const mail = feedbackEmail({
      businessName: business.name,
      rating,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      message: payload.message,
    });

    await sendMail({
      to: business.feedback_email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      // Reply goes to the customer when they left an address.
      replyTo: payload.email ?? undefined,
    });

    await db.from('feedback').update({ emailed: true }).eq('id', row.id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'unknown mail error';
    await db.from('feedback').update({ email_error: msg.slice(0, 500) }).eq('id', row.id);
  }

  return NextResponse.json({ ok: true });
}
