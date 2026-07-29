import type { SocialPlatform } from '@/lib/types';

const BRAND: Record<SocialPlatform, string> = {
  facebook: '#1877F2',
  instagram: '#E1306C',
  linkedin: '#0A66C2',
  x: '#000000',
  youtube: '#FF0000',
  whatsapp: '#25D366',
  custom: '#475569',
};

/** "custom" is drawn inline below, so it is excluded here. */
const PATHS: Record<Exclude<SocialPlatform, 'custom'>, string> = {
  facebook:
    'M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z',
  instagram:
    'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63c-.79.3-1.46.72-2.12 1.38C1.36 2.67.94 3.34.63 4.14.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.72 1.46 1.38 2.12.66.66 1.33 1.08 2.12 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.3 1.46-.72 2.12-1.38.66-.66 1.08-1.33 1.38-2.12.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91-.3-.79-.72-1.46-1.38-2.12C21.33 1.36 20.66.94 19.86.63 19.1.33 18.22.13 16.95.07 15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 100 12.32 6.16 6.16 0 000-12.32zm0 10.16a4 4 0 110-8 4 4 0 010 8zm7.85-10.4a1.44 1.44 0 11-2.88 0 1.44 1.44 0 012.88 0z',
  linkedin:
    'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.07 2.07 0 110-4.14 2.07 2.07 0 010 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z',
  x: 'M18.9 1.15h3.68l-8.04 9.19L24 22.85h-7.41l-5.8-7.58-6.64 7.58H.46l8.6-9.83L0 1.15h7.59l5.24 6.93 6.07-6.93zm-1.29 19.5h2.04L6.49 3.24H4.3l13.31 17.41z',
  youtube:
    'M23.5 6.19a3.02 3.02 0 00-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 00.5 6.19C0 8.08 0 12 0 12s0 3.92.5 5.81a3.02 3.02 0 002.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 002.12-2.14C24 15.92 24 12 24 12s0-3.92-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z',
  whatsapp:
    'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.8h-.01a9.87 9.87 0 01-5.03-1.38l-.36-.21-3.74.98 1-3.64-.24-.37a9.86 9.86 0 01-1.51-5.26c0-5.45 4.44-9.88 9.9-9.88 2.64 0 5.13 1.03 7 2.9a9.82 9.82 0 012.9 6.99c0 5.45-4.44 9.88-9.9 9.88zM20.5 3.49A11.82 11.82 0 0012.05 0C5.5 0 .17 5.33.17 11.88c0 2.09.55 4.14 1.59 5.94L.07 24l6.33-1.66a11.87 11.87 0 005.65 1.44h.01c6.55 0 11.88-5.33 11.88-11.88 0-3.17-1.24-6.15-3.48-8.4z',
};

export function SocialIcon({
  platform,
  className = 'h-5 w-5',
}: {
  platform: SocialPlatform;
  className?: string;
}) {
  if (platform === 'custom') {
    return (
      <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm7.94 7h-3.2a15.6 15.6 0 00-1.4-3.62A10.03 10.03 0 0119.94 7zM12 2.05c.86 1.25 1.53 2.66 1.98 4.95h-3.96C10.47 4.71 11.14 3.3 12 2.05zM2.26 14a9.9 9.9 0 010-4h3.67a16.5 16.5 0 000 4H2.26zm.8 2h3.2c.32 1.29.79 2.52 1.4 3.62A10.03 10.03 0 013.06 16zm3.2-9h-3.2a10.03 10.03 0 014.6-3.62A15.6 15.6 0 006.26 7zM12 21.95c-.86-1.25-1.53-2.66-1.98-4.95h3.96c-.45 2.29-1.12 3.7-1.98 4.95zM14.34 15H9.66a14.6 14.6 0 010-6h4.68a14.6 14.6 0 010 6zm.32 4.62c.61-1.1 1.08-2.33 1.4-3.62h3.2a10.03 10.03 0 01-4.6 3.62zM18.07 14a16.5 16.5 0 000-4h3.67a9.9 9.9 0 010 4h-3.67z" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d={PATHS[platform]} />
    </svg>
  );
}

export function socialColor(platform: SocialPlatform): string {
  return BRAND[platform] ?? BRAND.custom;
}

/**
 * Flat brand hexes look dead at this size. Each platform gets its real
 * treatment instead — Instagram in particular is a radial gradient, not a
 * pink circle, and using the flat colour is the tell of a cheap template.
 */
const BACKGROUND: Record<SocialPlatform, string> = {
  facebook: 'linear-gradient(145deg, #1877F2 0%, #0b5fcc 100%)',
  instagram:
    'radial-gradient(circle at 28% 108%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 62%, #285AEB 92%)',
  linkedin: 'linear-gradient(145deg, #0A66C2 0%, #00457e 100%)',
  x: 'linear-gradient(145deg, #262626 0%, #000000 100%)',
  youtube: 'linear-gradient(145deg, #ff2626 0%, #c40000 100%)',
  whatsapp: 'linear-gradient(145deg, #2ce76e 0%, #0f8a5f 100%)',
  custom: 'linear-gradient(145deg, #64748b 0%, #334155 100%)',
};

export function socialBackground(platform: SocialPlatform): string {
  return BACKGROUND[platform] ?? BACKGROUND.custom;
}

const SIZE = {
  sm: { box: 'h-9 w-9', icon: 'h-[15px] w-[15px]' },
  md: { box: 'h-11 w-11', icon: 'h-[18px] w-[18px]' },
  lg: { box: 'h-14 w-14', icon: 'h-[22px] w-[22px]' },
};

/**
 * A social link. The visual treatment is chosen per card, so the same markup
 * covers a flat circle, a pressable 3D key, a frosted pill, an outline, a
 * squircle, or a monochrome brand button.
 */
export function SocialButton({
  platform,
  href,
  label,
  index = 0,
  style = 'depth',
  size = 'md',
}: {
  platform: SocialPlatform;
  href: string;
  label?: string | null;
  index?: number;
  style?: 'depth' | 'flat' | 'glass' | 'outline' | 'squircle' | 'mono';
  size?: 'sm' | 'md' | 'lg';
}) {
  const colour = socialColor(platform);
  const dims = SIZE[size];

  const skin: React.CSSProperties =
    style === 'outline'
      ? { color: colour, borderColor: colour }
      : style === 'mono'
        ? {
            background: 'linear-gradient(145deg, var(--brand), var(--accent))',
            boxShadow: '0 6px 16px -6px var(--brand-glow)',
          }
        : style === 'glass'
          ? { background: `${colour}cc`, boxShadow: `0 6px 18px -8px ${colour}` }
          : {
              background: socialBackground(platform),
              ...(style === 'flat' || style === 'squircle'
                ? { boxShadow: `0 6px 16px -6px ${colour}b3` }
                : {}),
            };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label ?? platform}
      className={`social-btn social-${style} reveal-scale ${dims.box}`}
      style={{ ...skin, animationDelay: `${120 + index * 60}ms` }}
    >
      <SocialIcon platform={platform} className={`relative z-10 ${dims.icon}`} />
    </a>
  );
}
