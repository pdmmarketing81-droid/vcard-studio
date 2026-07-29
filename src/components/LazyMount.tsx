'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders children only once they scroll near the viewport.
 *
 * Maps and video embeds are third-party iframes weighing 300 KB–1 MB each.
 * Mounting them on page load meant a card with a map and three embeds pulled
 * megabytes of other people's JavaScript before the visitor had scrolled past
 * the business name. `loading="lazy"` on an iframe helps but is unreliable
 * and still lets the browser start early; not putting the iframe in the DOM
 * at all is definitive.
 *
 * rootMargin starts the load a screen ahead, so by the time the section is
 * actually on screen it has usually finished.
 */
export default function LazyMount({
  children,
  minHeight = 200,
  rootMargin = '400px',
}: {
  children: React.ReactNode;
  minHeight?: number;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show) return;
    const el = ref.current;
    if (!el) return;

    // Browsers without IntersectionObserver just get the content immediately.
    if (typeof IntersectionObserver === 'undefined') return setShow(true);

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show, rootMargin]);

  return (
    <div ref={ref} style={show ? undefined : { minHeight }}>
      {show ? children : <div className="shimmer h-full w-full rounded-xl" style={{ minHeight }} />}
    </div>
  );
}
