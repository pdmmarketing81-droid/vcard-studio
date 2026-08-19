import type { BusinessFull } from '@/lib/types';
import { getTemplate, sectionLabel, type SectionId } from '@/lib/templates';
import {
  resolveDesign,
  designVars,
  panelClass,
  revealClass,
  buttonClass,
  ratioCss,
} from '@/lib/design';
import { waLink } from '@/lib/slug';
import { SocialIcon, SocialButton } from './SocialIcon';
import ShareBar from './ShareBar';
import { About, Contact, MapSection, QrSection } from './sections/Basics';
import CoverMedia from './CoverMedia';
import { Services, Packages, Testimonials } from './sections/Catalog';
import Hours from './sections/Hours';
import Gallery from './sections/Gallery';
import Videos from './sections/Videos';

/** Each shape clips the cover differently — it's the fastest visual tell. */
const HERO_RADIUS: Record<string, string> = {
  rounded: 'var(--radius)',
  arch: '9rem 9rem var(--radius) var(--radius)',
  bleed: '0',
  circle: '50%',
};

export default function CardView({
  business: b,
  cardUrl,
  preview = false,
}: {
  business: BusinessFull;
  cardUrl: string;
  /** Rendered inside the admin preview pane rather than served to a visitor. */
  preview?: boolean;
}) {
  const tpl = getTemplate(b.template);
  const d = resolveDesign(tpl, b.design);
  // The business's own colour wins over the template default — a clinic can
  // still be green if the doctor wants it green.
  const brand = b.theme_color || tpl.brand;
  const rule = tpl.style.titleRule;

  const overlap = d.heroStyle === 'overlap';
  const bleed = d.heroShape === 'bleed';
  const circle = d.heroShape === 'circle';

  const sections: Record<SectionId, (delay: number) => React.ReactNode> = {
    about: (x) => <About business={b} template={tpl} d={d} titleRule={rule} title={sectionLabel(tpl, 'about', 'About')} delay={x} />,
    contact: (x) => <Contact business={b} d={d} titleRule={rule} title={sectionLabel(tpl, 'contact', 'Contact')} delay={x} />,
    hours: (x) => <Hours hours={b.business_hours} d={d} titleRule={rule} title={sectionLabel(tpl, 'hours', 'Business Hours')} delay={x} />,
    services: (x) => <Services services={b.services} d={d} titleRule={rule} title={sectionLabel(tpl, 'services', 'Our Services')} whatsapp={b.whatsapp} businessName={b.name} delay={x} />,
    packages: (x) => <Packages packages={b.packages} d={d} titleRule={rule} title={sectionLabel(tpl, 'packages', 'Packages')} whatsapp={b.whatsapp} businessName={b.name} delay={x} />,
    gallery: (x) => <Gallery items={b.gallery_items} d={d} titleRule={rule} title={sectionLabel(tpl, 'gallery', 'Gallery')} delay={x} />,
    videos: (x) => <Videos videos={b.videos} d={d} titleRule={rule} title={sectionLabel(tpl, 'videos', 'Videos')} delay={x} />,
    testimonials: (x) => <Testimonials testimonials={b.testimonials} d={d} titleRule={rule} title={sectionLabel(tpl, 'testimonials', 'Testimonials')} delay={x} />,
    map: (x) => (
      <MapSection
        address={b.address}
        lat={b.map_lat}
        lng={b.map_lng}
        label={b.map_label}
        embed={b.map_embed}
        d={d}
        delay={x}
      />
    ),
    qr: (x) => <QrSection slug={b.slug} cardUrl={cardUrl} d={d} titleRule={rule} preview={preview} delay={x} />,
    share: (x) => <ShareBar url={cardUrl} title={b.name} d={d} titleRule={rule} delay={x} />,
  };

  const visible = d.order.filter((id) => !d.hidden.has(id));

  return (
    <div
      className={`drift-bg ${preview ? 'min-h-full' : 'min-h-screen'} pt-5`}
      style={designVars(d, brand, tpl.style.accent)}
    >
      {/* ------------------------------ Hero ------------------------------ */}
      {b.cover_url && (
        // "bleed" means edge-to-edge of the *card column*, not of the browser
        // window — the card is always a phone-width column, even on desktop.
        <div className={`mx-auto w-full max-w-[520px] ${bleed ? '' : 'px-4'}`}>
          <div
            className={`shimmer reveal-scale mx-auto overflow-hidden shadow-lg ${circle ? 'w-[68%]' : ''}`}
            style={{ borderRadius: HERO_RADIUS[d.heroShape] ?? 'var(--radius)' }}
          >
            {b.cover_type === 'video' ? (
              <CoverMedia
                src={b.cover_url}
                sound={b.cover_sound}
                audioUrl={b.cover_audio_url}
                className="w-full object-cover"
                style={{ aspectRatio: circle ? '1 / 1' : ratioCss(d.heroRatio, '4:3') }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.cover_url} alt="" className="w-full object-cover"
                style={{ aspectRatio: circle ? '1 / 1' : ratioCss(d.heroRatio, '4:3') }} />
            )}
          </div>
        </div>
      )}

      <div className={`card-shell space-y-3.5 ${preview ? '!pb-4' : ''} ${b.cover_url ? 'pt-3.5' : ''}`}>
        {/* ---------------------------- Identity --------------------------- */}
        <header
          className={`${panelClass(d)} ${revealClass(d)} p-5 ${
            b.cover_url && overlap && !circle ? 'relative z-10 -mt-16' : ''
          }`}
        >
          <div className={`flex gap-4 ${overlap ? 'items-center' : 'flex-col items-center text-center'}`}>
            {b.logo_url && (
              <div className="relative shrink-0">
                <span className="absolute -inset-1 rounded-2xl opacity-25 blur-md"
                  style={{ background: 'linear-gradient(135deg, var(--brand), var(--accent))' }} />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.logo_url} alt={b.name}
                  className="relative h-[4.5rem] w-[4.5rem] rounded-2xl bg-white object-contain p-1.5 ring-1 ring-black/5" />
              </div>
            )}
            <div className="min-w-0">
              <h1 className="display-name text-gradient">{b.name}</h1>
              {b.tagline && (
                <p className="mt-1.5 text-sm font-medium leading-snug opacity-70">{b.tagline}</p>
              )}
            </div>
          </div>

          {b.social_links.length > 0 && (
            <nav className="mt-5 flex flex-wrap justify-center gap-2.5">
              {b.social_links.map((link, i) => (
                <SocialButton
                  key={link.id}
                  platform={link.platform}
                  href={link.url}
                  label={link.label}
                  index={i}
                  style={d.socialStyle}
                  size={d.socialSize}
                />
              ))}
            </nav>
          )}
        </header>

        {/* -------------- Sections, in this card's chosen order ------------- */}
        {visible.map((id, i) => (
          <div key={id}>{sections[id](220 + i * 90)}</div>
        ))}

        <p className="pt-1 text-center text-[11px] tracking-wide opacity-40">
          {b.view_count.toLocaleString('en-IN')} views
        </p>
      </div>

      {/* --------------------------- Sticky actions --------------------------- */}
      {/* `fixed` would escape the phone frame, so the preview pins the bar to
          the bottom of its own scroll container instead. */}
      <div
        className={`${preview ? 'sticky bottom-0' : 'fixed inset-x-0 bottom-0'} z-20 border-t px-4 py-3`}
        style={{
          borderColor: 'var(--panel-border)',
          background: 'color-mix(in srgb, var(--panel) 80%, transparent)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        }}
      >
        <div className="mx-auto flex max-w-[520px] items-center gap-2.5">
          <a
            href={`/api/vcf/${b.slug}`}
            className={`${buttonClass(d)} flex flex-1 items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold`}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="relative z-10 h-4 w-4">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            <span className="relative z-10">Add to contact</span>
          </a>

          {b.whatsapp && (
            <a
              href={waLink(b.whatsapp, `Hi ${b.name}, I found your card and would like to know more.`)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="social-btn social-depth flex h-[3.25rem] w-[3.25rem] shrink-0 items-center justify-center !rounded-2xl text-white"
              style={{ background: 'linear-gradient(145deg,#2ce76e,#0f8a5f)' }}
            >
              <SocialIcon platform="whatsapp" className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
