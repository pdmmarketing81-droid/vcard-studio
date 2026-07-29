'use client';

import CardView from '../CardView';
import type { BusinessFull } from '@/lib/types';

/**
 * Renders the *real* CardView inside a phone-width container.
 *
 * No CSS transform. An earlier version scaled the card down to fit a narrow
 * pane, which broke the layout: a scaled element still occupies its unscaled
 * width, so the card overflowed its frame and clipped. The card is already
 * responsive, so giving it a 390px-wide box — an actual phone viewport — is
 * both simpler and truthful.
 *
 * It imports the same component the public page uses, so the preview cannot
 * drift from what visitors see.
 */
export default function CardPreview({
  business,
  cardUrl,
}: {
  business: BusinessFull;
  cardUrl: string;
}) {
  return (
    <div className="w-[412px]">
      <div className="rounded-[2.5rem] border-[11px] border-slate-900 bg-slate-900 shadow-2xl">
        <div className="flex h-6 items-center justify-center">
          <span className="h-1.5 w-16 rounded-full bg-slate-700" />
        </div>

        <div className="h-[680px] overflow-y-auto overflow-x-hidden rounded-[1.6rem] bg-white">
          <CardView business={business} cardUrl={cardUrl} preview />
        </div>
      </div>

      <p className="mt-3 text-center text-xs text-slate-400">
        Live preview · updates as you type
      </p>
    </div>
  );
}
