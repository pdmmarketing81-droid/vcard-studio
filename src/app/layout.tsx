import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
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
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'], style: ['normal'], display: 'swap', variable: '--font-jakarta',
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVars}>
      <head>
        {/* Embeds are third-party and heavy; warming the connection early
            shaves a round trip off the moment they do mount. */}
        <link rel="preconnect" href="https://fgfjjlvcxlwneggfrwvk.supabase.co" />
        <link rel="dns-prefetch" href="https://www.youtube.com" />
        <link rel="dns-prefetch" href="https://www.instagram.com" />
      </head>
      <body>{children}</body>
    </html>
  );
}
