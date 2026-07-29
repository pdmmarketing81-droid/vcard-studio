'use client';

import { useState } from 'react';
import LazyMount from '../LazyMount';

/**
 * Click-to-play facade for YouTube.
 *
 * A YouTube iframe pulls roughly 1 MB of player JavaScript the moment it
 * mounts — per video. Most visitors never press play, so they were paying
 * that cost for nothing. Showing the poster image (~15 KB) and only mounting
 * the real player on click is the single biggest saving on a media-heavy
 * card, and the interaction is identical: one tap either way.
 *
 * Instagram has no public thumbnail without auth, so it gets lazy mounting
 * instead of a facade.
 */
export default function EmbedFrame({
  src,
  poster,
  title,
  aspect,
  instagram = false,
}: {
  src: string;
  poster?: string | null;
  title: string;
  aspect: string;
  instagram?: boolean;
}) {
  const [playing, setPlaying] = useState(false);

  const shell = 'overflow-hidden rounded-2xl bg-black shadow-lg ring-1 ring-black/5';

  if (poster && !playing) {
    return (
      <button
        onClick={() => setPlaying(true)}
        aria-label={`Play ${title}`}
        className={`group relative w-full ${shell}`}
        style={{ aspectRatio: aspect }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={poster} alt="" loading="lazy" className="h-full w-full object-cover" />
        <span className="absolute inset-0 bg-black/15 transition-colors group-hover:bg-black/25" />
        <span className="absolute left-1/2 top-1/2 flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-xl bg-[#ff0000] shadow-xl transition-transform duration-300 group-hover:scale-110">
          <svg viewBox="0 0 24 24" fill="white" className="h-6 w-6">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <LazyMount minHeight={180}>
      <div className={shell} style={{ aspectRatio: aspect }}>
        <iframe
          src={playing ? `${src}${src.includes('?') ? '&' : '?'}autoplay=1` : src}
          title={title}
          className="h-full w-full border-0"
          loading="lazy"
          scrolling={instagram ? 'no' : undefined}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </LazyMount>
  );
}
