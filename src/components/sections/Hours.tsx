'use client';

import { useEffect, useState } from 'react';
import type { BusinessHour } from '@/lib/types';
import type { ResolvedDesign } from '@/lib/design';
import { revealClass } from '@/lib/design';
import Section from './Section';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function pretty(t: string | null): string {
  if (!t) return '';
  const [hStr, m] = t.split(':');
  const h = Number(hStr);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${suffix}`;
}

function minutes(t: string | null): number | null {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function Hours({
  hours,
  d,
  titleRule,
  title,
  delay = 0,
}: {
  hours: BusinessHour[];
  d: ResolvedDesign;
  titleRule: boolean;
  title: string;
  delay?: number;
}) {
  // Computed after mount only: the server has no idea what time it is for the
  // visitor, and rendering "Open now" on the server would hydrate wrong.
  const [status, setStatus] = useState<'open' | 'closed' | null>(null);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const now = new Date();
    const dow = now.getDay();
    setToday(dow);

    const row = hours.find((h) => h.day_of_week === dow);
    if (!row || row.closed) return setStatus('closed');

    const open = minutes(row.open_time);
    const close = minutes(row.close_time);
    if (open === null || close === null) return setStatus(null);

    const nowMin = now.getHours() * 60 + now.getMinutes();
    // Handles places that close after midnight (e.g. 18:00 – 02:00).
    const isOpen =
      close > open ? nowMin >= open && nowMin < close : nowMin >= open || nowMin < close;

    setStatus(isOpen ? 'open' : 'closed');
  }, [hours]);

  if (hours.length === 0) return null;

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      {status && (
        <div className="mb-4 flex justify-center">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold tracking-wide ${
              status === 'open'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            <span className="relative flex h-2 w-2">
              {status === 'open' && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex h-2 w-2 rounded-full ${
                  status === 'open' ? 'bg-emerald-500' : 'bg-slate-400'
                }`}
              />
            </span>
            {status === 'open' ? 'Open now' : 'Closed now'}
          </span>
        </div>
      )}

      <dl className="text-sm">
        {hours.map((h, i) => {
          const isToday = today === h.day_of_week;
          return (
            <div
              key={h.id}
              className={`${revealClass(d)} flex items-center justify-between rounded-lg px-3 py-2.5 ${
                isToday ? 'font-bold' : 'opacity-70'
              }`}
              style={{
                animationDelay: `${delay + 120 + i * 45}ms`,
                background: isToday ? 'var(--brand-soft)' : undefined,
              }}
            >
              <dt className="flex items-center gap-2">
                {DAYS[h.day_of_week]}
                {isToday && (
                  <span
                    className="rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white"
                    style={{ background: 'var(--brand)' }}
                  >
                    Today
                  </span>
                )}
              </dt>
              <dd className={h.closed ? 'opacity-50' : ''}>
                {h.closed ? 'Closed' : `${pretty(h.open_time)} – ${pretty(h.close_time)}`}
              </dd>
            </div>
          );
        })}
      </dl>
    </Section>
  );
}
