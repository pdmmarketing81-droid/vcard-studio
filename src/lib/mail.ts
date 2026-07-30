import nodemailer from 'nodemailer';

/**
 * Outbound mail via the agency's own Hostinger mailbox.
 *
 * The From address is always ours, never the client's — sending as a domain
 * we don't control would fail SPF/DKIM and land in spam. The client's address
 * goes in To and Reply-To instead, so replying to a feedback mail replies to
 * the customer.
 */

let cached: nodemailer.Transporter | null = null;

function transport(): nodemailer.Transporter {
  if (cached) return cached;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    throw new Error('SMTP_HOST / SMTP_USER / SMTP_PASS are not set');
  }

  const port = Number(process.env.SMTP_PORT ?? 465);
  cached = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: port === 465,
    auth: { user, pass },
  });
  return cached;
}

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export interface MailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: MailAttachment[];
}

export async function sendMail(input: MailInput): Promise<void> {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER!;
  await transport().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
    attachments: input.attachments,
  });
}

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function feedbackEmail(opts: {
  businessName: string;
  rating: number;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  message?: string | null;
  attachmentUrls?: string[];
}): { subject: string; html: string; text: string } {
  const stars = '★'.repeat(opts.rating) + '☆'.repeat(5 - opts.rating);
  const rows: Array<[string, string]> = [
    ['Rating', `${stars}  (${opts.rating}/5)`],
    ['Name', opts.name || '—'],
    ['Phone', opts.phone || '—'],
    ['Email', opts.email || '—'],
  ];

  const subject = `${opts.rating}★ feedback for ${opts.businessName}`;

  const text = [
    `New private feedback for ${opts.businessName}`,
    '',
    ...rows.map(([k, v]) => `${k}: ${v}`),
    '',
    'Message:',
    opts.message || '(no message)',
  ].join('\n');

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1e293b">
  <p style="margin:0 0 4px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#94a3b8">Private feedback</p>
  <h2 style="margin:0 0 20px;font-size:20px">${esc(opts.businessName)}</h2>
  <div style="font-size:26px;letter-spacing:2px;color:#f59e0b;margin-bottom:18px">${stars}</div>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    ${rows
      .slice(1)
      .map(
        ([k, v]) => `<tr>
        <td style="padding:8px 0;color:#64748b;width:90px">${k}</td>
        <td style="padding:8px 0;font-weight:600">${esc(v)}</td>
      </tr>`
      )
      .join('')}
  </table>
  <div style="margin-top:18px;padding:16px;background:#f8fafc;border-radius:12px;border-left:3px solid #0f766e">
    <p style="margin:0;white-space:pre-line;line-height:1.6">${esc(opts.message || '(no message)')}</p>
  </div>
  ${
    opts.attachmentUrls?.length
      ? `<p style="margin-top:16px;font-size:13px;color:#475569">
           <strong>${opts.attachmentUrls.length} attachment${opts.attachmentUrls.length > 1 ? 's' : ''}</strong>
           — included with this email, and also here:<br>
           ${opts.attachmentUrls.map((u) => `<a href="${esc(u)}" style="color:#0f766e">${esc(u.split('/').pop() || 'file')}</a>`).join('<br>')}
         </p>`
      : ''
  }
  <p style="margin-top:24px;font-size:12px;color:#94a3b8">
    This customer left feedback privately instead of posting publicly.
    Replying to this email reaches them directly if they left an address.
  </p>
</div>`.trim();

  return { subject, html, text };
}
