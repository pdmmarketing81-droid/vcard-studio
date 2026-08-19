'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * The cover video, with sound the visitor can turn on.
 *
 * How the autoplay rule actually works, because a half-true version of it led
 * me to build this wrong the first time:
 *
 *   • autoplay MUTED — always allowed
 *   • autoplay WITH SOUND, before the visitor has touched anything — blocked
 *   • after ANY gesture on the page — a tap, a click, a key — allowed
 *
 * That last line is the part that matters, and the one I first said did not
 * exist. Cards that appear to "just play with sound" are doing this: they start
 * muted, and unmute on the visitor's first touch anywhere on the page. By then
 * the person has usually scrolled or tapped without noticing, so it feels
 * automatic.
 *
 * So that is what happens here when the owner turns sound on. The video still
 * starts muted — it has to, or the browser may refuse to play it at all, which
 * would leave a still frame instead of a video. The first gesture unmutes it.
 * The speaker button stays, because someone in a quiet room needs a way to stop
 * it that does not involve closing the card.
 *
 * A custom track replaces the video's own audio rather than layering over it.
 * Two sound sources at once is never what anyone meant, and the video's room
 * noise is usually the reason they wanted a different track.
 */
export default function CoverMedia({
  src,
  poster,
  sound,
  audioUrl,
  className,
  style,
}: {
  src: string;
  poster?: string | null;
  sound: boolean;
  audioUrl?: string | null;
  className?: string;
  style?: React.CSSProperties;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const [on, setOn] = useState(false);

  /* Set the moment the visitor turns sound off by hand. After that we stop
     trying to be clever — a card that keeps switching sound back on after being
     silenced is a card people close. */
  const silenced = useRef(false);

  /* Unmute on the first gesture anywhere on the page.
     pointerdown rather than click, because it fires at the start of a touch and
     counts as a gesture for the audio unlock — waiting for click means the
     sound starts a beat late, which reads as a glitch. */
  useEffect(() => {
    if (!sound) return;

    const unlock = async () => {
      if (silenced.current) return;

      if (audioUrl) {
        try {
          await audio.current?.play();
          setOn(true);
        } catch {
          // Still refused. Leave it; the button is there.
        }
      } else if (video.current) {
        const v = video.current;
        v.muted = false;
        try {
          await v.play();
          setOn(true);
        } catch {
          /* Refused — and this is the case that broke it on phones. Unmuting
             first and hoping meant the browser stopped the video altogether, so
             a tap turned a playing silent video into a frozen frame. Put the
             mute back and get it moving again; silent and playing beats loud
             and stopped. */
          v.muted = true;
          void v.play().catch(() => {});
          setOn(false);
        }
      }
    };

    const opts = { once: true, passive: true } as const;
    document.addEventListener('pointerdown', unlock, opts);
    document.addEventListener('keydown', unlock, opts);

    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, [sound, audioUrl]);

  // If the tab is hidden, stop the music. Nobody wants a card playing in a
  // background tab they have forgotten about.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden && on) {
        setOn(false);
        audio.current?.pause();
        if (video.current) video.current.muted = true;
      }
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [on]);

  async function toggle() {
    const next = !on;
    setOn(next);

    // Turning it off by hand is final. The first-gesture unlock must not undo
    // a decision the visitor just made deliberately.
    if (!next) silenced.current = true;

    if (audioUrl) {
      // Custom track: the video stays muted whatever happens.
      if (next) {
        try {
          await audio.current?.play();
        } catch {
          // Refused for some reason — put the button back rather than leaving
          // it lit next to silence.
          setOn(false);
        }
      } else {
        audio.current?.pause();
      }
      return;
    }

    if (!video.current) return;
    const v = video.current;
    v.muted = !next;
    try {
      await v.play();
    } catch {
      // Same guard as the automatic path: never leave the video stopped.
      v.muted = true;
      setOn(false);
      void v.play().catch(() => {});
    }
  }

  return (
    <div className="relative">
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={video}
        src={src}
        poster={poster ?? undefined}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className={className}
        style={style}
      />

      {audioUrl && (
        // eslint-disable-next-line jsx-a11y/media-has-caption
        <audio ref={audio} src={audioUrl} loop preload="none" />
      )}

      {sound && (
        <button
          type="button"
          onClick={toggle}
          aria-label={on ? 'Turn sound off' : 'Turn sound on'}
          /* Top right, not bottom. At the bottom it sat under the thumb and out
             of the eyeline, so nobody knew the video had sound to turn on. Up
             here it is the first thing above the picture, where a muted-speaker
             icon reads as an invitation. */
          className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white shadow-lg backdrop-blur transition hover:bg-black/70"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
               strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
            <path d="M11 5 6 9H2v6h4l5 4V5Z" />
            {on ? (
              <>
                <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                <path d="M18.5 5.5a9 9 0 0 1 0 13" />
              </>
            ) : (
              <path d="M22 9l-6 6M16 9l6 6" />
            )}
          </svg>
        </button>
      )}
    </div>
  );
}
