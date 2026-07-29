/**
 * Turns the URLs people actually paste into embeddable iframe URLs.
 *
 * Instagram deliberately uses the /embed endpoint rather than the official
 * embed.js SDK: the SDK needs a script tag, mutates the DOM after hydration
 * and frequently fails behind content blockers. A plain iframe to /embed
 * renders the same post with zero JavaScript.
 */

export function youtubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([\w-]{11})/,
    /(?:youtu\.be\/)([\w-]{11})/,
    /(?:youtube\.com\/embed\/)([\w-]{11})/,
    /(?:youtube\.com\/shorts\/)([\w-]{11})/,
    /(?:youtube\.com\/live\/)([\w-]{11})/,
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

export function youtubeEmbed(url: string): string | null {
  const id = youtubeId(url);
  // youtube-nocookie serves the same player without setting tracking cookies
  // until the visitor actually presses play.
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

/** Thumbnail for the click-to-play facade — ~15 KB instead of ~1 MB. */
export function youtubeThumb(url: string): string | null {
  const id = youtubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

export function instagramEmbed(url: string): string | null {
  const m = url.match(/instagram\.com\/(p|reel|reels|tv)\/([\w-]+)/);
  if (!m) return null;
  // "reels" (plural) is the app's URL form; the embed endpoint wants "reel".
  const kind = m[1] === 'reels' ? 'reel' : m[1];
  return `https://www.instagram.com/${kind}/${m[2]}/embed`;
}

export function embedUrl(provider: string, url: string): string | null {
  if (provider === 'youtube') return youtubeEmbed(url);
  if (provider === 'instagram') return instagramEmbed(url);
  return url || null;
}

/** Instagram embeds are portrait; YouTube is 16:9. */
export function embedAspect(provider: string): string {
  return provider === 'instagram' ? 'aspect-[4/5]' : 'aspect-video';
}

export function formatMoney(amount: number, currency = 'INR'): string {
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}
