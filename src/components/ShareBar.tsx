'use client';

import { useState } from 'react';
import type { ResolvedDesign } from '@/lib/design';
import { buttonClass } from '@/lib/design';
import type { SocialPlatform } from '@/lib/types';
import { SocialIcon, socialBackground, socialColor } from './SocialIcon';
import Section from './sections/Section';

/**
 * Icons come from SocialIcon rather than being re-declared here — the first
 * version inlined shortened paths and every one of them rendered as a blob.
 */
const TARGETS: Array<{
  key: string;
  label: string;
  platform?: SocialPlatform;
  href: (url: string, title: string) => string;
}> = [
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    platform: 'whatsapp',
    href: (u, t) => `https://wa.me/?text=${encodeURIComponent(`${t} ${u}`)}`,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    platform: 'facebook',
    href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`,
  },
  {
    key: 'x',
    label: 'X',
    platform: 'x',
    href: (u, t) =>
      `https://twitter.com/intent/tweet?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}`,
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    platform: 'linkedin',
    href: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`,
  },
  {
    key: 'email',
    label: 'Email',
    href: (u, t) =>
      `mailto:?subject=${encodeURIComponent(t)}&body=${encodeURIComponent(u)}`,
  },
];

const MailGlyph = (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="relative z-10 h-[18px] w-[18px]"
  >
    <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);

export default function ShareBar({
  url,
  title,
  d,
  titleRule,
  delay = 0,
}: {
  url: string;
  title: string;
  d: ResolvedDesign;
  titleRule: boolean;
  delay?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — the share links above still work */
    }
  }

  async function nativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        /* user dismissed */
      }
    } else {
      copy();
    }
  }

  return (
    <Section d={d} titleRule={titleRule} title="Share this card" delay={delay}>
      <div className="mb-4 flex flex-wrap justify-center gap-2.5">
        {TARGETS.map((t, i) => {
          const background = t.platform
            ? socialBackground(t.platform)
            : 'linear-gradient(145deg,#94a3b8,#475569)';
          const glow = t.platform ? socialColor(t.platform) : '#64748b';

          return (
            <a
              key={t.key}
              href={t.href(url, title)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share on ${t.label}`}
              className={`social-btn social-${d.socialStyle} reveal-scale h-11 w-11`}
              style={{
                background,
                boxShadow: `0 6px 16px -6px ${glow}b3`,
                animationDelay: `${delay + 120 + i * 55}ms`,
              }}
            >
              {t.platform ? (
                <SocialIcon platform={t.platform} className="relative z-10 h-[18px] w-[18px]" />
              ) : (
                MailGlyph
              )}
            </a>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button onClick={nativeShare} className={`${buttonClass(d)} flex-1 rounded-xl py-2.5 text-sm font-bold`}>
          <span className="relative z-10">Share</span>
        </button>
        <button
          onClick={copy}
          className="flex-1 rounded-xl border bg-white/60 py-2.5 text-sm font-bold transition-all duration-300 hover:bg-white"
          style={{ borderColor: 'var(--panel-border)' }}
        >
          {copied ? '✓ Copied' : 'Copy link'}
        </button>
      </div>
    </Section>
  );
}
