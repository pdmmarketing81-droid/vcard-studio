import type { BusinessFull } from '@/lib/types';
import type { TemplateDef } from '@/lib/templates';
import type { ResolvedDesign } from '@/lib/design';
import { panelClass, revealClass } from '@/lib/design';
import { normalisePhone } from '@/lib/slug';
import { mapEmbedSrc, mapLinkHref } from '@/lib/geo';
import Section from './Section';
import LazyMount from '../LazyMount';

type Common = { d: ResolvedDesign; titleRule: boolean; title: string; delay?: number };

/* ------------------------------- About -------------------------------- */

export function About({
  business: b,
  template,
  d,
  titleRule,
  title,
  delay = 0,
}: Common & { business: BusinessFull; template: TemplateDef }) {
  const chips = template.extraFields
    .map((f) => ({ label: f.label, value: b.extras?.[f.key] }))
    .filter((c) => c.value);

  if (!b.about && chips.length === 0) return null;

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      {b.about && (
        <p className="whitespace-pre-line text-center leading-relaxed opacity-80"
          style={{ fontSize: 'calc(0.9375rem * var(--scale))' }}>
          {b.about}
        </p>
      )}

      {chips.length > 0 && (
        <dl className={`grid grid-cols-2 gap-2 ${b.about ? 'mt-5' : ''}`}>
          {chips.map((c, i) => (
            <div
              key={c.label}
              className={`${revealClass(d)} rounded-xl px-3.5 py-2.5`}
              style={{ background: 'var(--brand-soft)', animationDelay: `${delay + 120 + i * 70}ms` }}
            >
              <dt className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-50">
                {c.label}
              </dt>
              <dd className="mt-0.5 text-sm font-semibold">{c.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Section>
  );
}

/* ------------------------------ Contact ------------------------------- */

const icons = {
  mail: 'M2 5.5h20v13H2zM22 7 12 13.5 2 7',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  pin: 'M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z',
  globe: 'M2 12h20M12 2a15.3 15.3 0 0 1 0 20a15.3 15.3 0 0 1 0-20Z',
};

export function Contact({
  business: b,
  d,
  titleRule,
  title,
  delay = 0,
}: Common & { business: BusinessFull }) {
  if (!b.email && !b.phone && !b.address && !b.website) return null;

  type Row = { key: string; href: string; path: string; circle?: boolean; text: string };

  const available: Record<string, Row | null> = {
    phone: b.phone
      ? { key: 'phone', href: `tel:${normalisePhone(b.phone)}`, path: icons.phone, text: b.phone }
      : null,
    address: b.address
      ? {
          key: 'address',
          // Coordinates when the owner gave them, the address text otherwise.
          href: mapLinkHref(b) ?? `https://maps.google.com/?q=${encodeURIComponent(b.address)}`,
          path: icons.pin,
          text: b.address,
        }
      : null,
    email: b.email
      ? { key: 'email', href: `mailto:${b.email}`, path: icons.mail, text: b.email }
      : null,
    website: b.website
      ? {
          key: 'website',
          href: b.website,
          path: icons.globe,
          circle: true,
          text: b.website.replace(/^https?:\/\//, ''),
        }
      : null,
  };

  /* The owner's chosen order, then anything they never mentioned.
     Appending the leftovers matters: a card saved before this existed has no
     preference, and a stricter reading would show it an empty contact panel.
     Unknown keys are dropped rather than trusted — the list comes from the
     database and a stray value must not become a blank row. */
  const wanted = Array.isArray(b.contact_order) ? (b.contact_order as string[]) : [];
  const order = [...wanted, ...Object.keys(available).filter((k) => !wanted.includes(k))];
  const rows = order.map((k) => available[k]).filter((r): r is Row => !!r);

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      <div className="-my-2">
        {rows.map((r, i) => (
          <a
            key={r.key}
            href={r.href}
            className={`${revealClass(d)} group flex items-center gap-3.5 border-b py-3 last:border-0`}
            style={{
              borderColor: 'var(--panel-border)',
              animationDelay: `${delay + 100 + i * 70}ms`,
            }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-transform duration-300 group-hover:scale-110"
              style={{
                background: 'linear-gradient(135deg, var(--brand), var(--accent))',
                boxShadow: '0 4px 12px -4px var(--brand-glow)',
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
                strokeLinecap="round" strokeLinejoin="round" className="h-[17px] w-[17px]">
                {r.circle && <circle cx="12" cy="12" r="10" />}
                <path d={r.path} />
              </svg>
            </span>
            <span className="min-w-0 break-words text-sm opacity-85">{r.text}</span>
            <span className="ml-auto shrink-0 opacity-0 transition-all duration-300 group-hover:translate-x-0.5 group-hover:opacity-40">
              ›
            </span>
          </a>
        ))}
      </div>
    </Section>
  );
}

/* -------------------------------- Map --------------------------------- */

export function MapSection({
  address,
  lat = null,
  lng = null,
  label = null,
  d,
  delay = 0,
}: {
  address: string | null;
  /** The precise pin, when the owner supplied one. */
  lat?: number | null;
  lng?: number | null;
  /** The place's name, so the pin reads as a shop and not as numbers. */
  label?: string | null;
  d: ResolvedDesign;
  delay?: number;
}) {
  const src = mapEmbedSrc({ map_lat: lat, map_lng: lng, map_label: label, address });
  if (!src) return null;
  return (
    <div
      className={`${panelClass(d)} ${revealClass(d)} overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* The Maps embed is a few hundred KB of third-party script. It sits far
          down most cards, so it only mounts once you scroll near it. */}
      <LazyMount minHeight={224}>
        <iframe
          title="Location"
          src={src}
          className="h-56 w-full border-0 grayscale-[35%] transition-all duration-500 hover:grayscale-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </LazyMount>
    </div>
  );
}

/* --------------------------------- QR --------------------------------- */

export function QrSection({
  slug,
  cardUrl,
  d,
  titleRule,
  preview = false,
  delay = 0,
}: {
  slug: string;
  cardUrl: string;
  d: ResolvedDesign;
  titleRule: boolean;
  preview?: boolean;
  delay?: number;
}) {
  return (
    <Section d={d} titleRule={titleRule} title="Scan to open" delay={delay}>
      <div className="text-center">
        <div className="mx-auto inline-flex rounded-2xl p-3" style={{ background: 'var(--brand-soft)' }}>
          {preview ? (
            // An unsaved card has no QR endpoint yet, so show its shape
            // instead of a broken image.
            <div className="flex h-40 w-40 items-center justify-center rounded-xl border-2 border-dashed border-current text-xs opacity-40">
              QR generates on save
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/qr/${slug}`}
              alt="QR code"
              className="h-40 w-40 rounded-lg bg-white p-1.5 transition-transform duration-500 hover:scale-105"
            />
          )}
        </div>

        <p className="mt-3 text-xs tracking-wide opacity-50">
          {cardUrl.replace(/^https?:\/\//, '')}
        </p>

        {!preview && (
          // Print sizes: 1024px PNG survives a standee, SVG scales to a board.
          <div className="mt-3 flex justify-center gap-2">
            <a
              href={`/api/qr/${slug}?format=png&size=1024&download=1`}
              className="rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              ↓ PNG
            </a>
            <a
              href={`/api/qr/${slug}?format=svg&download=1`}
              className="rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-80"
              style={{ background: 'var(--brand-soft)', color: 'var(--brand)' }}
            >
              ↓ SVG
            </a>
          </div>
        )}
      </div>
    </Section>
  );
}
