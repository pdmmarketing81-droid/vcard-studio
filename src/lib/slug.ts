/**
 * Turns "Happy Frame Studios!" into "happy-frame-studios".
 *
 * Keeps unicode letters AND marks, so Devanagari survives. This mattered more
 * than it looks: in Hindi and Marathi the vowel signs (ी ु ा) are marks, not
 * letters, so a letters-only rule turned "मेरी दुकान" into "म-र-द-क-न" — the
 * consonants with hyphens where the vowels used to be. Unreadable, and nobody
 * would have spotted it until a shopkeeper saw their own name mangled.
 *
 * The combining-accent strip is limited to U+0300–U+036F, which is Latin
 * accents only and leaves Indic marks alone.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // Latin accents: café -> cafe
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-') // letters, numbers and marks survive
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
