import type { Metadata } from 'next';
import localFont from 'next/font/local';
import {
  Inter,
  Poppins,
  Outfit,
  Playfair_Display,
  Lora,
} from 'next/font/google';
import './globals.css';

/**
 * Six families, each exposed as a CSS variable. A card picks two of them
 * (body + heading), so components never name a font directly.
 *
 * Only the default family is preloaded. next/font preloads every declared
 * face by default, which meant a card using two fonts still made the browser
 * fetch all six — 840 KB of woff2 before anything rendered. With
 * preload:false the rest are fetched only when a card's CSS actually
 * references them, so a typical card pulls ~2 files instead of 36.
 *
 * `style: ['normal']` drops the italic cuts, which nothing here uses.
 */
/**
 * The default face is served from our own /public rather than fetched from
 * Google at build time.
 *
 * The build was failing to reach fonts.googleapis.com on this machine — the
 * AbortErrors in the dev log — and when that happens next/font leaves the
 * variable empty and the browser falls back to Times. The whole site rendered
 * in a serif, and whether it did depended on the network that minute.
 *
 * One 27 KB variable file covers every weight from 400 to 800, so this is also
 * fewer requests than before, not more.
 */
const jakarta = localFont({
  src: '../../public/fonts/PlusJakartaSans-latin.woff2',
  weight: '200 800',
  style: 'normal',
  display: 'swap',
  variable: '--font-jakarta',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
});
const inter = Inter({
  subsets: ['latin'], style: ['normal'], display: 'swap', variable: '--font-inter', preload: false,
});
const poppins = Poppins({
  subsets: ['latin'], style: ['normal'], weight: ['400', '600', '700'],
  display: 'swap', variable: '--font-poppins', preload: false,
});
const outfit = Outfit({
  subsets: ['latin'], style: ['normal'], display: 'swap', variable: '--font-outfit', preload: false,
});
const playfair = Playfair_Display({
  subsets: ['latin'], style: ['normal'], display: 'swap', variable: '--font-playfair', preload: false,
});
const lora = Lora({
  subsets: ['latin'], style: ['normal'], display: 'swap', variable: '--font-lora', preload: false,
});

const fontVars = [jakarta, inter, poppins, outfit, playfair, lora]
  .map((f) => f.variable)
  .join(' ');

export const metadata: Metadata = {
  title: 'vCard Studio',
  description: 'Digital business cards, live in seconds.',
};

// Where media is served from — R2 once it is configured, Supabase until then.
// Read from the environment rather than written in, because this was hardcoded
// to a project ref once already and silently went stale the day we migrated.
const MEDIA_ORIGIN = (() => {
  const src = process.env.R2_PUBLIC_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    return src ? new URL(src).origin : null;
  } catch {
    return null;
  }
})();

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <head>
        {/* The first thing every card needs is its logo, and embeds are heavy
            third parties; warming these early shaves a round trip off each. */}
        {MEDIA_ORIGIN && <link rel="preconnect" href={MEDIA_ORIGIN} crossOrigin="" />}
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://www.instagram.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
