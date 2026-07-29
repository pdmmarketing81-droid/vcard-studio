import type { Service, Package, Testimonial } from '@/lib/types';
import type { ResolvedDesign } from '@/lib/design';
import { revealClass, buttonClass, ratioCss } from '@/lib/design';
import { waLink } from '@/lib/slug';
import { formatMoney } from '@/lib/embed';
import { SocialIcon } from '../SocialIcon';
import Section from './Section';

type Base = { d: ResolvedDesign; titleRule: boolean; title: string; delay?: number };

function Enquire({
  d,
  whatsapp,
  itemName,
  businessName,
  compact = false,
}: {
  d: ResolvedDesign;
  whatsapp: string | null;
  itemName: string;
  businessName: string;
  compact?: boolean;
}) {
  if (!whatsapp) return null;
  const text = `Hi ${businessName}, I am interested in "${itemName}". Please share more details.`;
  return (
    <a
      href={waLink(whatsapp, text)}
      target="_blank"
      rel="noopener noreferrer"
      className={`${buttonClass(d)} mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl font-bold ${
        compact ? 'py-2 text-[11px]' : 'py-2.5 text-xs'
      }`}
    >
      {/* Full WhatsApp glyph — an abbreviated path renders as a blob. */}
      <SocialIcon platform="whatsapp" className="relative z-10 h-3.5 w-3.5" />
      <span className="relative z-10">Enquire</span>
    </a>
  );
}

/* ------------------------------ Services ------------------------------ */

export function Services({
  services, d, titleRule, title, whatsapp, businessName, delay = 0,
}: Base & { services: Service[]; whatsapp: string | null; businessName: string }) {
  if (services.length === 0) return null;
  const cols = d.serviceColumns === 1 ? 'grid-cols-1' : 'grid-cols-2';

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      <div className={`grid gap-2.5 ${cols}`}>
        {services.map((s, i) => (
          <article
            key={s.id}
            className={`${revealClass(d)} hover-lift group flex flex-col overflow-hidden bg-white ring-1 ring-black/5`}
            style={{
              borderRadius: 'calc(var(--radius) * 0.72)',
              animationDelay: `${delay + 100 + i * 80}ms`,
            }}
          >
            {s.image_url && (
              <div className="shimmer overflow-hidden" style={{ aspectRatio: ratioCss(d.serviceRatio, '4:3') }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.image_url} alt={s.title} loading="lazy"
                  className="zoom-img h-full w-full object-cover" />
              </div>
            )}
            <div className="flex flex-1 flex-col p-3">
              <h3 className="text-[13px] font-bold leading-snug text-slate-800">{s.title}</h3>
              {s.description && (
                <p className="mt-1 flex-1 text-[11px] leading-relaxed text-slate-500">
                  {s.description}
                </p>
              )}
              <Enquire d={d} whatsapp={whatsapp} itemName={s.title} businessName={businessName} compact />
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

/* ------------------------------ Packages ------------------------------ */

export function Packages({
  packages, d, titleRule, title, whatsapp, businessName, delay = 0,
}: Base & { packages: Package[]; whatsapp: string | null; businessName: string }) {
  if (packages.length === 0) return null;

  const stacked = d.packageLayout === 'card' || d.packageColumns === 2;
  const cols = d.packageColumns === 2 ? 'grid-cols-2' : 'grid-cols-1';

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      <div className={`grid gap-2.5 ${cols}`}>
        {packages.map((p, i) => {
          const discounted =
            p.net_price != null && p.selling_price != null && p.selling_price < p.net_price;
          const off = discounted
            ? Math.round(((p.net_price! - p.selling_price!) / p.net_price!) * 100)
            : 0;

          const price = (
            <>
              {(p.selling_price != null || p.net_price != null) && (
                <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  {discounted && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {formatMoney(p.net_price!, p.currency)}
                    </span>
                  )}
                  <span className="text-gradient text-base font-extrabold tracking-tight">
                    {formatMoney((p.selling_price ?? p.net_price)!, p.currency)}
                  </span>
                  {off > 0 && (
                    <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600">
                      {off}% off
                    </span>
                  )}
                </div>
              )}
            </>
          );

          const badge = p.badge && (
            <span
              className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white"
              style={{ background: 'linear-gradient(135deg, var(--brand), var(--accent))' }}
            >
              {p.badge}
            </span>
          );

          return (
            <article
              key={p.id}
              className={`${revealClass(d)} hover-lift relative overflow-hidden bg-white ring-1 ring-black/5 ${
                stacked ? 'flex flex-col' : 'flex gap-3.5 p-3.5'
              }`}
              style={{
                borderRadius: 'calc(var(--radius) * 0.72)',
                animationDelay: `${delay + 100 + i * 80}ms`,
              }}
            >
              {p.image_url && (
                <div
                  className={`shimmer shrink-0 overflow-hidden ${stacked ? '' : 'rounded-xl'}`}
                  style={{
                    aspectRatio: ratioCss(d.packageRatio, stacked ? '4:3' : '1:1'),
                    width: stacked ? '100%' : '5.75rem',
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image_url} alt={p.title} loading="lazy"
                    className="zoom-img h-full w-full object-cover" />
                </div>
              )}

              <div className={`min-w-0 flex-1 ${stacked ? 'p-3' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[13px] font-bold leading-snug text-slate-800">{p.title}</h3>
                  {badge}
                </div>
                {p.description && (
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{p.description}</p>
                )}
                {price}
                <Enquire d={d} whatsapp={whatsapp} itemName={p.title} businessName={businessName} compact={stacked} />
              </div>
            </article>
          );
        })}
      </div>
    </Section>
  );
}

/* ---------------------------- Testimonials ---------------------------- */

function Stars({ rating }: { rating: number }) {
  return (
    <div className="mb-2 flex gap-0.5 text-sm" aria-label={`${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < rating ? 'text-amber-400' : 'text-slate-200'}>★</span>
      ))}
    </div>
  );
}

export function Testimonials({
  testimonials, d, titleRule, title, delay = 0,
}: Base & { testimonials: Testimonial[] }) {
  if (testimonials.length === 0) return null;

  return (
    <Section d={d} titleRule={titleRule} title={title} delay={delay}>
      <div className="space-y-2.5">
        {testimonials.map((t, i) => (
          <figure
            key={t.id}
            className={`${revealClass(d)} hover-lift relative overflow-hidden bg-white p-4 pl-5 ring-1 ring-black/5`}
            style={{
              borderRadius: 'calc(var(--radius) * 0.72)',
              animationDelay: `${delay + 100 + i * 80}ms`,
            }}
          >
            {/* Brand edge instead of a giant quote glyph — quieter, and it
                keeps the eye on the words. */}
            <span className="absolute inset-y-0 left-0 w-1"
              style={{ background: 'linear-gradient(180deg, var(--brand), var(--accent))' }} />
            {t.rating != null && <Stars rating={t.rating} />}
            <blockquote className="text-sm leading-relaxed text-slate-600">“{t.quote}”</blockquote>
            <figcaption className="mt-3.5 flex items-center gap-2.5">
              {t.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.avatar_url} alt="" loading="lazy"
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-white" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--accent))' }}>
                  {t.author.slice(0, 1).toUpperCase()}
                </span>
              )}
              <div>
                <p className="text-xs font-bold text-slate-700">{t.author}</p>
                {t.role && <p className="text-[11px] text-slate-400">{t.role}</p>}
              </div>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
