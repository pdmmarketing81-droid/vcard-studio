import type { CSSProperties } from 'react';
import type { SectionId, TemplateDef } from './templates';

/**
 * Per-card design overrides.
 *
 * A template supplies defaults; this overrides any of them for one card.
 * Every key is optional and `{}` means "inherit everything", so adding a new
 * knob never breaks existing cards.
 *
 * Cards are viewed almost entirely on phones, so every layout option here is
 * expressed in terms of the phone view first — column counts apply at all
 * widths rather than only kicking in on desktop.
 */
export interface CardDesign {
  /* typography */
  bodyFont?: FontId;
  headingFont?: FontId;
  textScale?: 'sm' | 'md' | 'lg';

  /* surface */
  background?: string;        // preset id, or 'custom'
  backgroundCustom?: string;  // any CSS background value

  /* shape */
  radius?: RadiusId;
  panel?: PanelId;

  /* motion */
  animation?: AnimationId;
  animationSpeed?: 'slow' | 'normal' | 'fast';

  /* components */
  socialStyle?: SocialStyleId;
  socialSize?: 'sm' | 'md' | 'lg';
  buttonStyle?: ButtonStyleId;
  buttonAnimation?: ButtonAnimationId;

  /* hero */
  heroShape?: 'rounded' | 'arch' | 'bleed' | 'circle';
  heroRatio?: RatioId;
  heroStyle?: 'overlap' | 'banner';

  /* layout */
  serviceColumns?: 1 | 2;
  serviceRatio?: RatioId;
  packageColumns?: 1 | 2;
  packageRatio?: RatioId;
  packageLayout?: 'row' | 'card';
  galleryColumns?: 2 | 3 | 4;
  galleryRatio?: RatioId;
  galleryAutoplay?: boolean;
  gallerySpeed?: number; // seconds per slide

  /* embeds */
  videoRatio?: RatioId;
  instagramRatio?: RatioId;
  embedWidth?: 'full' | 'wide' | 'medium';
  embedLayout?: 'carousel' | 'stack';

  /* sections */
  order?: SectionId[];
  hidden?: SectionId[];
}

/* ────────────────────────────── Fonts ────────────────────────────── */

export type FontId =
  | 'jakarta' | 'inter' | 'poppins' | 'outfit' | 'playfair' | 'lora';

export const FONTS: { id: FontId; name: string; note: string; varName: string }[] = [
  { id: 'jakarta',  name: 'Plus Jakarta', note: 'Clean, modern default',  varName: '--font-jakarta' },
  { id: 'inter',    name: 'Inter',        note: 'Neutral, very readable', varName: '--font-inter' },
  { id: 'poppins',  name: 'Poppins',      note: 'Friendly, rounded',      varName: '--font-poppins' },
  { id: 'outfit',   name: 'Outfit',       note: 'Geometric, confident',   varName: '--font-outfit' },
  { id: 'playfair', name: 'Playfair',     note: 'Elegant serif',          varName: '--font-playfair' },
  { id: 'lora',     name: 'Lora',         note: 'Warm, editorial serif',  varName: '--font-lora' },
];

const FONT_VAR: Record<FontId, string> = Object.fromEntries(
  FONTS.map((f) => [f.id, `var(${f.varName})`])
) as Record<FontId, string>;

/** Template font family names map onto the picker's ids. */
const TEMPLATE_FONT: Record<string, FontId> = {
  sans: 'jakarta',
  serif: 'playfair',
  geometric: 'outfit',
};

/* ──────────────────────────── Backgrounds ─────────────────────────── */

export const BACKGROUNDS: { id: string; name: string; css: string; dark?: boolean }[] = [
  { id: 'template', name: 'Template default', css: '' },
  { id: 'paper',    name: 'Paper',       css: 'linear-gradient(180deg,#ffffff 0%,#f6f7f9 100%)' },
  { id: 'mist',     name: 'Mist',        css: 'linear-gradient(180deg,#f8fafc 0%,#eef2f7 100%)' },
  { id: 'sky',      name: 'Sky',         css: 'linear-gradient(180deg,#f0f9ff 0%,#e0f2fe 55%,#f8fafc 100%)' },
  { id: 'blush',    name: 'Blush',       css: 'linear-gradient(165deg,#fdf2f8 0%,#fce7f3 40%,#fff1f2 100%)' },
  { id: 'butter',   name: 'Butter',      css: 'linear-gradient(180deg,#fffbeb 0%,#fef3c7 50%,#fffbeb 100%)' },
  { id: 'mint',     name: 'Mint',        css: 'linear-gradient(180deg,#f0fdf4 0%,#dcfce7 55%,#f7fee7 100%)' },
  { id: 'lavender', name: 'Lavender',    css: 'linear-gradient(160deg,#faf5ff 0%,#f3e8ff 45%,#fdf4ff 100%)' },
  { id: 'sand',     name: 'Sand',        css: 'linear-gradient(180deg,#fafaf9 0%,#f5f5f4 50%,#e7e5e4 100%)' },
  { id: 'aurora',   name: 'Aurora',      css: 'linear-gradient(135deg,#e0f2fe 0%,#fae8ff 50%,#fef3c7 100%)' },
  { id: 'peach',    name: 'Peach',       css: 'linear-gradient(180deg,#fff7ed 0%,#ffedd5 55%,#fef2f2 100%)' },
  { id: 'brandwash',name: 'Brand wash',  css: 'linear-gradient(180deg,var(--brand-soft) 0%,#ffffff 60%,var(--brand-soft) 100%)' },
  { id: 'midnight', name: 'Midnight',    css: 'linear-gradient(180deg,#0f172a 0%,#1e293b 60%,#0f172a 100%)', dark: true },
  { id: 'charcoal', name: 'Charcoal',    css: 'linear-gradient(180deg,#18181b 0%,#27272a 100%)', dark: true },
  { id: 'custom',   name: 'Custom…',     css: '' },
];

/* ────────────────────────────── Shape ─────────────────────────────── */

export type RadiusId = 'sharp' | 'tight' | 'soft' | 'round' | 'pill';
export const RADII: { id: RadiusId; name: string; css: string }[] = [
  { id: 'sharp', name: 'Sharp',  css: '0.25rem' },
  { id: 'tight', name: 'Tight',  css: '0.75rem' },
  { id: 'soft',  name: 'Soft',   css: '1.25rem' },
  { id: 'round', name: 'Round',  css: '1.75rem' },
  { id: 'pill',  name: 'Pill',   css: '2.25rem' },
];

export type PanelId = 'solid' | 'elevated' | 'glass' | 'bordered';
export const PANELS: { id: PanelId; name: string; note: string }[] = [
  { id: 'solid',    name: 'Solid',    note: 'Flat card, hairline border' },
  { id: 'elevated', name: 'Elevated', note: 'Floating with soft shadow' },
  { id: 'glass',    name: 'Glass',    note: 'Frosted, shows background' },
  { id: 'bordered', name: 'Outlined', note: 'Brand border, offset shadow' },
];

/* ────────────────────────────── Motion ────────────────────────────── */

export type AnimationId = 'fade' | 'slide' | 'zoom' | 'rise' | 'tilt' | 'none';
export const ANIMATIONS: { id: AnimationId; name: string; note: string }[] = [
  { id: 'fade',  name: 'Fade up',  note: 'Subtle, the safe default' },
  { id: 'slide', name: 'Slide in', note: 'Enters from the side' },
  { id: 'zoom',  name: 'Zoom',     note: 'Scales up into place' },
  { id: 'rise',  name: 'Rise',     note: 'Taller lift, more dramatic' },
  { id: 'tilt',  name: '3D tilt',  note: 'Rotates in on an axis' },
  { id: 'none',  name: 'None',     note: 'Everything appears instantly' },
];

const SPEED: Record<'slow' | 'normal' | 'fast', string> = {
  slow: '0.9s',
  normal: '0.62s',
  fast: '0.38s',
};

/* ──────────────────────────── Components ──────────────────────────── */

export type SocialStyleId = 'depth' | 'flat' | 'glass' | 'outline' | 'squircle' | 'mono';
export const SOCIAL_STYLES: { id: SocialStyleId; name: string; note: string }[] = [
  { id: 'depth',    name: '3D depth',  note: 'Raised, presses in on hover' },
  { id: 'flat',     name: 'Flat',      note: 'Plain brand-coloured circle' },
  { id: 'glass',    name: 'Glass',     note: 'Frosted with a coloured tint' },
  { id: 'outline',  name: 'Outline',   note: 'Ring only, fills on hover' },
  { id: 'squircle', name: 'Squircle',  note: 'Rounded square instead of circle' },
  { id: 'mono',     name: 'Monochrome',note: 'All in the brand colour' },
];

export type ButtonStyleId = 'gradient' | 'solid' | 'outline' | 'glow' | 'soft';
export const BUTTON_STYLES: { id: ButtonStyleId; name: string }[] = [
  { id: 'gradient', name: 'Gradient' },
  { id: 'solid',    name: 'Solid' },
  { id: 'outline',  name: 'Outline' },
  { id: 'glow',     name: 'Glow' },
  { id: 'soft',     name: 'Soft tint' },
];

export type ButtonAnimationId = 'lift' | 'shine' | 'pulse' | 'press' | 'none';
export const BUTTON_ANIMATIONS: { id: ButtonAnimationId; name: string; note: string }[] = [
  { id: 'lift',  name: 'Lift',   note: 'Rises on hover' },
  { id: 'shine', name: 'Shine',  note: 'Light sweeps across' },
  { id: 'pulse', name: 'Pulse',  note: 'Gentle attention ring' },
  { id: 'press', name: 'Press',  note: 'Depresses like a real key' },
  { id: 'none',  name: 'None',   note: 'No motion' },
];

/* ────────────────────────────── Ratios ────────────────────────────── */

export type RatioId = '1:1' | '4:3' | '3:4' | '5:6' | '16:9' | '16:11' | '9:16';
export const RATIOS: { id: RatioId; name: string; css: string }[] = [
  { id: '1:1',   name: 'Square',      css: '1 / 1' },
  { id: '4:3',   name: 'Landscape',   css: '4 / 3' },
  { id: '3:4',   name: 'Portrait',    css: '3 / 4' },
  { id: '5:6',   name: 'Tall',        css: '5 / 6' },
  { id: '16:9',  name: 'Wide',        css: '16 / 9' },
  { id: '16:11', name: 'Banner',      css: '16 / 11' },
  { id: '9:16',  name: 'Story',       css: '9 / 16' },
];

export function ratioCss(id: RatioId | undefined, fallback: RatioId): string {
  return (RATIOS.find((r) => r.id === id) ?? RATIOS.find((r) => r.id === fallback)!).css;
}

/* ───────────────────────────── Resolution ─────────────────────────── */

export interface ResolvedDesign {
  bodyFont: FontId;
  headingFont: FontId;
  textScale: 'sm' | 'md' | 'lg';
  background: string;
  isDark: boolean;
  radius: string;
  panel: PanelId;
  animation: AnimationId;
  animationDuration: string;
  socialStyle: SocialStyleId;
  socialSize: 'sm' | 'md' | 'lg';
  buttonStyle: ButtonStyleId;
  buttonAnimation: ButtonAnimationId;
  heroShape: 'rounded' | 'arch' | 'bleed' | 'circle';
  heroRatio: RatioId;
  heroStyle: 'overlap' | 'banner';
  serviceColumns: 1 | 2;
  serviceRatio: RatioId;
  packageColumns: 1 | 2;
  packageRatio: RatioId;
  packageLayout: 'row' | 'card';
  galleryColumns: 2 | 3 | 4;
  galleryRatio: RatioId;
  galleryAutoplay: boolean;
  gallerySpeed: number;
  videoRatio: RatioId;
  instagramRatio: RatioId;
  embedWidth: 'full' | 'wide' | 'medium';
  embedLayout: 'carousel' | 'stack';
  order: SectionId[];
  hidden: Set<SectionId>;
}

/** Carousel item width. "full" is the only one that never crops an embed. */
export const EMBED_WIDTH_CLASS: Record<'full' | 'wide' | 'medium', string> = {
  full: 'w-full',
  wide: 'w-[86%] sm:w-[72%]',
  medium: 'w-[72%] sm:w-[56%]',
};

const RADIUS_CSS = (id: RadiusId | undefined, fallback: string) =>
  RADII.find((r) => r.id === id)?.css ?? fallback;

/** Template defaults, with the card's own overrides layered on top. */
export function resolveDesign(tpl: TemplateDef, raw: unknown): ResolvedDesign {
  const d = (raw && typeof raw === 'object' ? raw : {}) as CardDesign;

  const bgPreset = BACKGROUNDS.find((b) => b.id === d.background);
  const background =
    d.background === 'custom'
      ? d.backgroundCustom || tpl.style.surface
      : bgPreset && bgPreset.css
        ? bgPreset.css
        : tpl.style.surface;

  const templateFont = TEMPLATE_FONT[tpl.style.font] ?? 'jakarta';

  const order = d.order?.length ? d.order : tpl.order;
  const hidden = new Set<SectionId>(d.hidden ?? []);

  return {
    bodyFont: d.bodyFont ?? templateFont,
    headingFont: d.headingFont ?? d.bodyFont ?? templateFont,
    textScale: d.textScale ?? 'md',
    background,
    isDark: d.background === 'custom' ? false : !!bgPreset?.dark,
    radius: RADIUS_CSS(d.radius, tpl.style.radius),
    panel: d.panel ?? tpl.style.panel,
    animation: d.animation ?? 'fade',
    animationDuration: SPEED[d.animationSpeed ?? 'normal'],
    socialStyle: d.socialStyle ?? 'depth',
    socialSize: d.socialSize ?? 'md',
    buttonStyle: d.buttonStyle ?? 'gradient',
    buttonAnimation: d.buttonAnimation ?? 'lift',
    heroShape: d.heroShape ?? tpl.style.heroShape,
    heroRatio: d.heroRatio ?? (tpl.style.heroShape === 'bleed' ? '16:11' : '4:3'),
    heroStyle: d.heroStyle ?? tpl.style.heroStyle,
    serviceColumns: d.serviceColumns ?? 2,
    serviceRatio: d.serviceRatio ?? '4:3',
    packageColumns: d.packageColumns ?? 1,
    packageRatio: d.packageRatio ?? '1:1',
    packageLayout: d.packageLayout ?? 'row',
    galleryColumns: d.galleryColumns ?? 3,
    galleryRatio: d.galleryRatio ?? '1:1',
    galleryAutoplay: d.galleryAutoplay ?? false,
    gallerySpeed: d.gallerySpeed ?? 4,
    videoRatio: d.videoRatio ?? '16:9',
    // Instagram's /embed page renders the photo plus a header, caption bar and
    // action row. 4:5 crops all of that off; 9:16 shows the whole card.
    instagramRatio: d.instagramRatio ?? '9:16',
    embedWidth: d.embedWidth ?? 'wide',
    embedLayout: d.embedLayout ?? 'carousel',
    order,
    hidden,
  };
}

/** #0f766e -> "15, 118, 110" so alpha can be applied in CSS. */
function rgbChannels(hex: string): string {
  const clean = hex.replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  if (Number.isNaN(int)) return '15, 118, 110';
  return `${(int >> 16) & 255}, ${(int >> 8) & 255}, ${int & 255}`;
}

const SCALE: Record<'sm' | 'md' | 'lg', string> = {
  sm: '0.94',
  md: '1',
  lg: '1.08',
};

/**
 * Every custom property a card needs. Set once on the card root; nothing
 * below needs to know which template or overrides produced them.
 */
export function designVars(
  d: ResolvedDesign,
  brand: string,
  accent: string
): CSSProperties {
  const ch = rgbChannels(brand);
  return {
    '--brand': brand,
    '--brand-soft': `rgba(${ch}, 0.08)`,
    '--brand-glow': `rgba(${ch}, 0.30)`,
    '--accent': accent,
    '--radius': d.radius,
    '--font-body': FONT_VAR[d.bodyFont],
    '--font-display': FONT_VAR[d.headingFont],
    '--scale': SCALE[d.textScale],
    '--anim-duration': d.animationDuration,
    '--ink': d.isDark ? '#e2e8f0' : '#1e293b',
    '--ink-soft': d.isDark ? '#94a3b8' : '#64748b',
    '--panel': d.isDark ? 'rgba(30,41,59,0.85)' : '#ffffff',
    '--panel-border': d.isDark ? 'rgba(255,255,255,0.10)' : 'rgba(15,23,42,0.06)',
    background: d.background,
  } as CSSProperties;
}

export function panelClass(d: ResolvedDesign): string {
  return `panel panel-${d.panel}`;
}

/** Entrance animation class for staggered reveals. */
export function revealClass(d: ResolvedDesign): string {
  return d.animation === 'none' ? '' : `reveal reveal-${d.animation}`;
}

export function buttonClass(d: ResolvedDesign): string {
  return `btn btn-${d.buttonStyle} btn-anim-${d.buttonAnimation}`;
}
