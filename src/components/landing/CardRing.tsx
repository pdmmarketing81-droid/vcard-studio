export interface RingItem {
  slug: string;
  name: string;
  logo_url: string | null;
  theme_color: string;
  /** Set this to show a real picture instead of the generated stand-in. */
  image?: string;
}

/**
 * A ring of cards turning slowly on its axis.
 *
 * Each card is placed on the surface of a cylinder: turned by its own share of
 * 360°, then pushed outward along Z by the radius. Spinning the parent turns
 * the whole cylinder, so they orbit instead of sliding past one another — which
 * is what makes it read as depth rather than a carousel.
 *
 * `image` on an item is the slot to fill. Until one is supplied each card draws
 * a stand-in from the business's own colour and logo, so the ring is never
 * empty and never shows a placeholder box.
 */
export default function CardRing({ items }: { items: RingItem[] }) {
  // Repeated until the ring is full: three cards spaced 120° apart look like a
  // triangle, not a ring.
  const MIN = 8;
  const cards: RingItem[] = [];
  if (items.length) {
    while (cards.length < MIN) cards.push(items[cards.length % items.length]);
  }

  const step = 360 / cards.length;

  return (
    <div className="lp-ring-stage relative mx-auto flex h-[440px] w-full max-w-[760px] items-center justify-center sm:h-[560px]">
      <div className="lp-ring relative h-[250px] w-[168px] sm:h-[290px] sm:w-[196px]">
        {cards.map((c, i) => (
          <div
            key={`${c.slug}-${i}`}
            className="lp-ring-item"
            style={{ transform: `rotateY(${i * step}deg) translateZ(var(--ring-r, 300px))` }}
          >
            <div className="h-full w-full overflow-hidden rounded-2xl bg-white shadow-[0_24px_50px_-20px_rgba(76,29,149,0.45)] ring-1 ring-black/5">
              {c.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col">
                  <div
                    className="h-[42%] w-full"
                    style={{ background: `linear-gradient(140deg, ${c.theme_color}, #7c3aed)` }}
                  />
                  <div className="-mt-7 flex-1 px-3.5 pb-3.5">
                    {c.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.logo_url}
                        alt=""
                        className="h-12 w-12 rounded-xl border-[3px] border-white bg-white object-cover shadow"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-xl border-[3px] border-white bg-violet-100 shadow" />
                    )}
                    <p className="mt-2 truncate text-[11px] font-bold text-slate-900">{c.name}</p>
                    <p className="truncate text-[9px] text-slate-400">/{c.slug}</p>

                    <div className="mt-2.5 grid grid-cols-4 gap-1">
                      {['Call', 'Chat', 'Map', 'Save'].map((a) => (
                        <div key={a} className="rounded bg-slate-100 py-1 text-center text-[6px] font-semibold text-slate-500">
                          {a}
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1">
                      {[0, 1, 2].map((k) => (
                        <div key={k} className="aspect-square rounded bg-slate-100" />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Badges sit outside the ring's box so the spinning cards never pass
          through them. */}
      <div className="lp-card lp-d1 absolute right-0 top-8 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-violet-900/10 sm:block">
        <p className="text-[11px] font-bold text-slate-800">Share instantly</p>
        <p className="text-[10px] text-slate-400">QR · link · NFC</p>
      </div>

      <div className="lp-card lp-d2 absolute bottom-16 left-0 hidden rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-violet-900/10 sm:block">
        <p className="text-[11px] font-bold text-violet-600">★★★★★</p>
        <p className="text-[10px] text-slate-400">More Google reviews</p>
      </div>

      <div className="lp-card lp-d3 absolute bottom-2 right-6 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xl shadow-violet-900/10">
        <p className="text-[11px] font-bold text-slate-800">Contact saved</p>
        <p className="text-[10px] text-slate-400">One tap, no typing</p>
      </div>
    </div>
  );
}
