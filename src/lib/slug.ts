/**
 * Turns "Happy Frame Studios!" into "happy-frame-studios".
 * Keeps unicode letters so Hindi/regional business names still produce
 * a usable slug instead of collapsing to an empty string.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining accents
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, '-') // anything not a letter/number -> hyphen
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Digits only, so "+91 88824 43557" -> "918882443557" (tel/wa safe). */
export function normalisePhone(input: string): string {
  return input.replace(/\D/g, '');
}

export function waLink(number: string, text?: string): string {
  const n = normalisePhone(number);
  const base = `https://wa.me/${n}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Strips protocol/path so users can paste a full URL as a custom domain. */
export function normaliseDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}
