'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { GalleryItem } from '@/lib/types';
import type { ResolvedDesign } from '@/lib/design';
import { revealClass, ratioCss } from '@/lib/design';
import Section from './Section';

export default function Gallery({
  items,
  d,
  titleRule,
  title,
  delay = 0,
}: {
  items: GalleryItem[];
  d: ResolvedDesign;
  titleRule: boolean;
  title: string;
  delay?: number;
}) {
  const categories = useMemo(() => {
    const found = items.map((i) => i.category).filter((c): c is string => !!c);
    return ['All', ...Array.from(new Set(found))];
  }, [items]);

  const [active, setActive] = useState('All');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const shown = active === 'All' ? items : items.filter((i) => i.category === active);

  /* Auto-advancing banner. Pauses on hover/touch so it never yanks a photo
     away from someone who is actually looking at it. */
  useEffect(() => {
    if (!d.galleryAutoplay || paused || shown.length < 2) return;
    const id = setInterval(
      () => setSlide((s) => (s + 1) % shown.length),
      Math.max(1.5, d.gallerySpeed) * 1000
    );
    return () => clearInterval(id);
  }, [d.galleryAutoplay, d.gallerySpeed, paused, shown.length]);

  useEffect(() => setSlide(0), [active]);

  // Esc to close, arrows to move — a lightbox that traps you feels broken.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') setLightbox((n) => (n === null ? n : (n + 1) % shown.length));
      if (e.key === 'ArrowLeft')
        setLightbox((n) => (n === null ? n : (n - 1 + shown.length) % shown.length));
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [lightbox, shown.length]);

  if (items.length === 0) return null;
  const current = lightbox !== null ? shown[lightbox] : null;
  const aspect = ratioCss(d.galleryRatio, '1:1');

  const filters = categories.length > 2 && (
    <div className="no-scrollbar mb-3.5 flex gap-2 overflow-x-auto pb-1">
      {categories.map((c) => (
        <button
          key={c}
          onClick={() => setActive(c)}
          className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ${
            active === c ? 'text-white shadow-md' : 'bg-black/5 opacity-60 hover:opacity-100'
          }`}
          style={
            active === c
              ? {
                  background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                  boxShadow: '0 4px 12px -4px var(--brand-glow)',
                }
              : undefined
          }
        >
          {c}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <Section d={d} titleRule={titleRule} title={title} delay={delay}>
        {filters}

        {d.galleryAutoplay ? (
          /* ---------------- Sliding banner ---------------- */
          <div
            className="relative overflow-hidden rounded-xl"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onTouchStart={() => setPaused(true)}
            onTouchEnd={() => setPaused(false)}
          >
            <div
              ref={trackRef}
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${slide * 100}%)` }}
            >
              {shown.map((item, i) => (
                <button
                  key={item.id}
                  onClick={() => setLightbox(i)}
                  className="shimmer w-full shrink-0"
                  style={{ aspectRatio: aspect }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.image_url}
                    alt={item.caption ?? ''}
                    loading={i < 2 ? 'eager' : 'lazy'}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>

            {shown.length > 1 && (
              <div className="absolute inset-x-0 bottom-2.5 flex justify-center gap-1.5">
                {shown.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className="h-1.5 rounded-full bg-white transition-all duration-300"
                    style={{ width: i === slide ? '1.25rem' : '0.375rem', opacity: i === slide ? 0.95 : 0.5 }}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ------------------- Grid ------------------- */
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: `repeat(${d.galleryColumns}, minmax(0, 1fr))` }}
          >
            {shown.map((item, i) => (
              <button
                key={item.id}
                onClick={() => setLightbox(i)}
                className={`${revealClass(d)} shimmer group relative overflow-hidden rounded-xl`}
                style={{ aspectRatio: aspect, animationDelay: `${delay + 120 + i * 45}ms` }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.image_url} alt={item.caption ?? ''} loading="lazy"
                  className="zoom-img h-full w-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        )}
      </Section>

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          style={{ animation: 'fadeIn 0.25s ease forwards' }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current.id}
            src={current.image_url}
            alt={current.caption ?? ''}
            onClick={(e) => e.stopPropagation()}
            className="reveal-scale max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl"
          />

          {current.caption && (
            <p className="absolute bottom-16 left-0 right-0 px-6 text-center text-sm text-white/85">
              {current.caption}
            </p>
          )}
          <p className="absolute bottom-7 left-0 right-0 text-center text-xs tracking-widest text-white/45">
            {lightbox! + 1} / {shown.length}
          </p>

          {shown.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((n) => (n! - 1 + shown.length) % shown.length); }}
                aria-label="Previous"
                className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
              >‹</button>
              <button
                onClick={(e) => { e.stopPropagation(); setLightbox((n) => (n! + 1) % shown.length); }}
                aria-label="Next"
                className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white backdrop-blur transition hover:bg-white/20"
              >›</button>
            </>
          )}

          <button
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-xl text-white backdrop-blur transition hover:bg-white/25"
          >×</button>
        </div>
      )}
    </>
  );
}
