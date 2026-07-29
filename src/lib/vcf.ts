import type { BusinessFull } from './types';

/** RFC 6350 wants CRLF line endings and escaped separators. */
function esc(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Builds a vCard 3.0 payload. 3.0 (not 4.0) on purpose — it is what
 * iOS Contacts and Android/Google Contacts both import without complaint.
 */
export function buildVCard(b: BusinessFull, cardUrl: string): string {
  const lines: string[] = ['BEGIN:VCARD', 'VERSION:3.0'];

  lines.push(`FN:${esc(b.name)}`);
  lines.push(`N:${esc(b.name)};;;;`);
  lines.push(`ORG:${esc(b.name)}`);

  if (b.tagline) lines.push(`TITLE:${esc(b.tagline)}`);
  if (b.phone) lines.push(`TEL;TYPE=WORK,VOICE:${esc(b.phone)}`);
  if (b.whatsapp && b.whatsapp !== b.phone) {
    lines.push(`TEL;TYPE=CELL:${esc(b.whatsapp)}`);
  }
  if (b.email) lines.push(`EMAIL;TYPE=WORK,INTERNET:${esc(b.email)}`);
  if (b.address) lines.push(`ADR;TYPE=WORK:;;${esc(b.address)};;;;`);
  if (b.website) lines.push(`URL:${esc(b.website)}`);

  // The card itself is always attached so the contact can re-open it.
  lines.push(`URL;TYPE=vcard:${esc(cardUrl)}`);

  for (const link of b.social_links ?? []) {
    lines.push(`X-SOCIALPROFILE;TYPE=${link.platform}:${esc(link.url)}`);
  }

  if (b.about) lines.push(`NOTE:${esc(b.about)}`);
  if (b.logo_url) lines.push(`PHOTO;VALUE=URI:${esc(b.logo_url)}`);

  lines.push(`REV:${new Date().toISOString()}`);
  lines.push('END:VCARD');

  return lines.join('\r\n');
}
