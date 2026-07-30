'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/slug';
import { TEMPLATES, getTemplate } from '@/lib/templates';
import type { BusinessFull, SocialPlatform } from '@/lib/types';
import type { CardDesign } from '@/lib/design';
import UploadInput, { inputClass } from './admin/UploadInput';
import Repeater from './admin/Repeater';
import CardPreview from './admin/CardPreview';
import DesignPanel from './admin/DesignPanel';
import ReviewLinkCard from './admin/ReviewLinkCard';
import { SocialIcon, socialBackground } from './SocialIcon';

const PLATFORMS: SocialPlatform[] = [
  'instagram', 'facebook', 'whatsapp', 'linkedin', 'x', 'youtube', 'custom',
];
const THEMES = ['#0f766e', '#0369a1', '#4f46e5', '#9d174d', '#b45309', '#7c3aed', '#334155'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Two different mistakes are easy to make here, and both fail silently:
 * pasting a non-Google link, or pasting a Google *search* link that shows the
 * listing but never opens the write-a-review box.
 */
function checkGoogleReviewUrl(raw: string): { level: 'ok' | 'warn' | 'bad'; note: string } {
  const url = raw.trim();
  if (!url) return { level: 'ok', note: '' };

  const isGoogle =
    /^https:\/\/([\w-]+\.)*(google\.[a-z.]+|g\.page|goo\.gl|maps\.app\.goo\.gl)\//i.test(url);
  if (!isGoogle) {
    return {
      level: 'bad',
      note: "This isn't a Google link at all. Happy customers will be sent here instead of to the review box.",
    };
  }

  // The two forms that actually land on the write-a-review dialog.
  const opensReviewBox =
    /writereview/i.test(url) || /g\.page\/r\/[^/]+\/review/i.test(url);
  if (opensReviewBox) return { level: 'ok', note: '' };

  return {
    level: 'warn',
    note: 'This is a Google link, but it looks like a search or maps page — it shows the business, not the "write a review" box. Customers will have to hunt for the review section. Use Business Profile → Ask for reviews → Copy link instead.',
  };
}
const TABS = ['Basics', 'Content', 'Media', 'Hours', 'Design', 'Reviews', 'Settings'] as const;
type Tab = (typeof TABS)[number];

/** Pasting a URL is faster than choosing from a dropdown, so we infer. */
const PLATFORM_FROM_URL: [RegExp, SocialPlatform][] = [
  [/instagram\.com/i, 'instagram'],
  [/facebook\.com|fb\.com|fb\.me/i, 'facebook'],
  [/linkedin\.com/i, 'linkedin'],
  [/(twitter|x)\.com/i, 'x'],
  [/youtube\.com|youtu\.be/i, 'youtube'],
  [/wa\.me|whatsapp\.com/i, 'whatsapp'],
];

function detectPlatform(url: string): SocialPlatform | null {
  return PLATFORM_FROM_URL.find(([re]) => re.test(url))?.[1] ?? null;
}

const PLACEHOLDER: Record<SocialPlatform, string> = {
  instagram: 'https://instagram.com/yourhandle',
  facebook: 'https://facebook.com/yourpage',
  linkedin: 'https://linkedin.com/in/yourprofile',
  x: 'https://x.com/yourhandle',
  youtube: 'https://youtube.com/@yourchannel',
  whatsapp: 'https://wa.me/919876543210',
  custom: 'https://yourwebsite.com',
};

type LinkRow = { platform: SocialPlatform; url: string };
type ServiceRow = { title: string; description: string; image_url: string };
type PackageRow = {
  title: string; description: string; image_url: string;
  net_price: string; selling_price: string; badge: string;
};
type TestimonialRow = { author: string; role: string; quote: string; rating: string; avatar_url: string };
type GalleryRow = { image_url: string; category: string; caption: string };
type VideoRow = { provider: 'youtube' | 'instagram'; url: string; title: string };
type HourRow = { day_of_week: number; open_time: string; close_time: string; closed: boolean };

const s = (v: string | null | undefined) => v ?? '';
const n = (v: number | null | undefined) => (v == null ? '' : String(v));

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card-panel space-y-4 p-5">
      <h2 className="text-sm font-bold uppercase tracking-wide text-slate-400">{title}</h2>
      {children}
    </section>
  );
}

export default function AdminForm({
  initial = null,
  cardId,
}: {
  initial?: BusinessFull | null;
  cardId?: string;
}) {
  const router = useRouter();
  const editing = !!cardId;

  const [tab, setTab] = useState<Tab>('Basics');
  const [showPreview, setShowPreview] = useState(false);

  const [template, setTemplate] = useState(initial?.template ?? 'classic');
  const [name, setName] = useState(s(initial?.name));
  const [customSlug, setCustomSlug] = useState(s(initial?.slug));
  const [tagline, setTagline] = useState(s(initial?.tagline));
  const [about, setAbout] = useState(s(initial?.about));
  const [extras, setExtras] = useState<Record<string, string>>(
    (initial?.extras as Record<string, string>) ?? {}
  );

  const [email, setEmail] = useState(s(initial?.email));
  const [phone, setPhone] = useState(s(initial?.phone));
  const [whatsapp, setWhatsapp] = useState(s(initial?.whatsapp));
  const [address, setAddress] = useState(s(initial?.address));
  const [website, setWebsite] = useState(s(initial?.website));

  const [logoUrl, setLogoUrl] = useState(s(initial?.logo_url));
  const [coverUrl, setCoverUrl] = useState(s(initial?.cover_url));
  const [coverType, setCoverType] = useState<'image' | 'video'>(initial?.cover_type ?? 'image');

  const [customDomain, setCustomDomain] = useState(s(initial?.custom_domain));
  const [themeColor, setThemeColor] = useState(initial?.theme_color ?? '#0f766e');
  const [published, setPublished] = useState(initial?.published ?? true);
  const [design, setDesign] = useState<CardDesign>(
    (initial?.design as CardDesign) ?? {}
  );

  // ---- review funnel ----
  const [reviewEnabled, setReviewEnabled] = useState(initial?.review_enabled ?? false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState(s(initial?.google_review_url));
  const [feedbackEmail, setFeedbackEmail] = useState(s(initial?.feedback_email));
  const [reviewThreshold, setReviewThreshold] = useState(initial?.review_threshold ?? 4);
  const [reviewHeadline, setReviewHeadline] = useState(s(initial?.review_headline));
  const [reviewThanks, setReviewThanks] = useState(s(initial?.review_thanks));

  const [links, setLinks] = useState<LinkRow[]>(
    initial?.social_links.map((l) => ({ platform: l.platform, url: l.url })) ?? []
  );
  const [services, setServices] = useState<ServiceRow[]>(
    initial?.services.map((x) => ({
      title: x.title, description: s(x.description), image_url: s(x.image_url),
    })) ?? []
  );
  const [packages, setPackages] = useState<PackageRow[]>(
    initial?.packages.map((p) => ({
      title: p.title, description: s(p.description), image_url: s(p.image_url),
      net_price: n(p.net_price), selling_price: n(p.selling_price), badge: s(p.badge),
    })) ?? []
  );
  const [testimonials, setTestimonials] = useState<TestimonialRow[]>(
    initial?.testimonials.map((t) => ({
      author: t.author, role: s(t.role), quote: t.quote,
      rating: n(t.rating) || '5', avatar_url: s(t.avatar_url),
    })) ?? []
  );
  const [gallery, setGallery] = useState<GalleryRow[]>(
    initial?.gallery_items.map((g) => ({
      image_url: g.image_url, category: s(g.category), caption: s(g.caption),
    })) ?? []
  );
  const [videos, setVideos] = useState<VideoRow[]>(
    initial?.videos
      .filter((v) => v.provider !== 'custom')
      .map((v) => ({ provider: v.provider as 'youtube' | 'instagram', url: v.url, title: s(v.title) })) ?? []
  );
  const [hours, setHours] = useState<HourRow[]>(
    initial?.business_hours.map((h) => ({
      day_of_week: h.day_of_week,
      open_time: h.open_time?.slice(0, 5) ?? '',
      close_time: h.close_time?.slice(0, 5) ?? '',
      closed: h.closed,
    })) ?? []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tpl = useMemo(() => getTemplate(template), [template]);
  const slug = editing ? customSlug : slugify(name) || 'your-business';
  const label = (key: keyof typeof tpl.labels, fallback: string) => tpl.labels[key] ?? fallback;

  /** The shape CardView expects, assembled live from form state. */
  const draft: BusinessFull = useMemo(
    () => ({
      id: cardId ?? 'preview',
      owner_id: null,
      slug,
      custom_domain: customDomain || null,
      name: name || 'Your Business Name',
      tagline: tagline || null,
      about: about || null,
      logo_url: logoUrl || null,
      cover_url: coverUrl || null,
      cover_type: coverType,
      email: email || null,
      phone: phone || null,
      whatsapp: whatsapp || null,
      address: address || null,
      website: website || null,
      theme_color: themeColor,
      template,
      extras,
      design: design as Record<string, unknown>,
      review_enabled: reviewEnabled,
      google_review_url: googleReviewUrl || null,
      feedback_email: feedbackEmail || null,
      review_threshold: reviewThreshold,
      review_headline: reviewHeadline || null,
      review_thanks: reviewThanks || null,
      published,
      view_count: initial?.view_count ?? 0,
      created_at: '',
      updated_at: '',
      // Half-typed rows are dropped so the preview shows finished content only.
      social_links: links
        .filter((l) => l.url.trim())
        .map((l, i) => ({ id: `p${i}`, business_id: '', platform: l.platform, url: l.url, label: null, sort_order: i })),
      services: services
        .filter((x) => x.title.trim())
        .map((x, i) => ({ id: `p${i}`, business_id: '', title: x.title, description: x.description || null, image_url: x.image_url || null, sort_order: i })),
      packages: packages
        .filter((p) => p.title.trim())
        .map((p, i) => ({
          id: `p${i}`, business_id: '', title: p.title,
          description: p.description || null, image_url: p.image_url || null,
          net_price: p.net_price ? Number(p.net_price) : null,
          selling_price: p.selling_price ? Number(p.selling_price) : null,
          currency: 'INR', badge: p.badge || null, sort_order: i,
        })),
      testimonials: testimonials
        .filter((t) => t.author.trim() && t.quote.trim())
        .map((t, i) => ({
          id: `p${i}`, business_id: '', author: t.author, role: t.role || null,
          avatar_url: t.avatar_url || null, quote: t.quote,
          rating: t.rating ? Number(t.rating) : null, sort_order: i,
        })),
      gallery_items: gallery
        .filter((g) => g.image_url.trim())
        .map((g, i) => ({ id: `p${i}`, business_id: '', image_url: g.image_url, category: g.category || null, caption: g.caption || null, sort_order: i })),
      videos: videos
        .filter((v) => v.url.trim())
        .map((v, i) => ({ id: `p${i}`, business_id: '', provider: v.provider, url: v.url, title: v.title || null, sort_order: i })),
      business_hours: hours.map((h, i) => ({
        id: `p${i}`, business_id: '', day_of_week: h.day_of_week,
        open_time: h.open_time || null, close_time: h.close_time || null, closed: h.closed,
      })),
    }),
    [
      cardId, slug, customDomain, name, tagline, about, logoUrl, coverUrl, coverType,
      email, phone, whatsapp, address, website, themeColor, template, extras, design,
      published, links, services, packages, testimonials, gallery, videos, hours,
      initial?.view_count,
    ]
  );

  function chooseTemplate(id: string) {
    setTemplate(id);
    const next = getTemplate(id);
    if (THEMES.includes(themeColor)) setThemeColor(next.brand);
    if (!editing) setExtras({});
  }

  function fillWeek() {
    setHours(DAYS.map((_, i) => ({
      day_of_week: i, open_time: '10:00', close_time: '19:00', closed: i === 0,
    })));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setTab('Basics');
      return setError('Business name is required.');
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        template, name, tagline, about, extras, design, published,
        review_enabled: reviewEnabled,
        google_review_url: googleReviewUrl,
        feedback_email: feedbackEmail,
        review_threshold: reviewThreshold,
        review_headline: reviewHeadline,
        review_thanks: reviewThanks,
        ...(editing ? { slug: customSlug } : {}),
        logo_url: logoUrl, cover_url: coverUrl, cover_type: coverType,
        email, phone, whatsapp, address, website,
        custom_domain: customDomain, theme_color: themeColor,
        social_links: links,
        services, packages, testimonials,
        gallery_items: gallery, videos, business_hours: hours,
      };

      const res = await fetch(editing ? `/api/admin/cards/${cardId}` : '/api/admin/cards', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok && res.status !== 207) throw new Error(json.error ?? 'Could not save');

      router.push(`/${json.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
      setSaving(false);
    }
  }

  const form = (
    <form onSubmit={submit} className="space-y-5">
      <div className="no-scrollbar sticky top-0 z-10 -mx-1 flex gap-1 overflow-x-auto bg-slate-100/95 px-1 py-2 backdrop-blur">
        {TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
              tab === t ? 'bg-slate-900 text-white' : 'text-slate-500 hover:bg-slate-200'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Basics' && (
        <>
          <Panel title="Template">
            <div className="grid gap-2 sm:grid-cols-2">
              {TEMPLATES.map((t) => (
                <button key={t.id} type="button" onClick={() => chooseTemplate(t.id)}
                  className={`rounded-xl border p-3 text-left transition ${
                    template === t.id ? 'border-slate-900 ring-1 ring-slate-900' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full" style={{ backgroundColor: t.brand }} />
                    <span className="text-sm font-semibold text-slate-800">{t.name}</span>
                  </div>
                  <p className="mt-1 text-xs leading-snug text-slate-500">{t.blurb}</p>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Identity">
            <Field label="Business name *" hint={editing ? undefined : `Card URL: /${slug}`}>
              <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Sunrise Multispeciality Clinic" required />
            </Field>

            {editing && (
              <Field label="Card URL" hint="Changing this breaks any QR code already printed with the old link.">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-slate-400">/</span>
                  <input className={inputClass} value={customSlug} onChange={(e) => setCustomSlug(slugify(e.target.value))} />
                </div>
              </Field>
            )}

            <Field label="Tagline">
              <input className={inputClass} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Dr. Ananya Sharma, MBBS MD" />
            </Field>
            <Field label={label('about', 'About')}>
              <textarea className={`${inputClass} min-h-[110px]`} value={about} onChange={(e) => setAbout(e.target.value)} placeholder="What this business does, in a few lines." />
            </Field>

            {tpl.extraFields.map((f) => (
              <Field key={f.key} label={f.label}>
                <input className={inputClass} value={extras[f.key] ?? ''}
                  onChange={(e) => setExtras({ ...extras, [f.key]: e.target.value })}
                  placeholder={f.placeholder} />
              </Field>
            ))}
          </Panel>

          <Panel title={label('contact', 'Contact')}>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email">
                <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="hello@business.com" />
              </Field>
              <Field label="Phone">
                <input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 88824 43557" />
              </Field>
              <Field label="WhatsApp" hint="With country code. Powers every enquiry button.">
                <input className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="916264285602" />
              </Field>
              <Field label="Website">
                <input className={inputClass} value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://business.com" />
              </Field>
            </div>
            <Field label="Address" hint="Also renders an embedded Google map.">
              <input className={inputClass} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Sector 44, Gurugram, Haryana 122003" />
            </Field>
          </Panel>

          <Panel title="Social links">
            <p className="-mt-2 text-xs text-slate-400">
              Paste the link and the platform is detected automatically — or pick one first.
            </p>
            <Repeater items={links} onChange={setLinks}
              blank={(): LinkRow => ({ platform: 'instagram', url: '' })}
              addLabel="Add social link" emptyHint="No social links yet."
              render={(l, set) => (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    {PLATFORMS.map((p) => (
                      <button key={p} type="button" onClick={() => set({ platform: p })}
                        title={p}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg text-white transition ${
                          l.platform === p ? 'ring-2 ring-slate-900 ring-offset-1' : 'opacity-45 hover:opacity-90'
                        }`}
                        style={{ background: socialBackground(p) }}>
                        <SocialIcon platform={p} className="h-4 w-4" />
                      </button>
                    ))}
                  </div>
                  <input className={inputClass} value={l.url}
                    placeholder={PLACEHOLDER[l.platform]}
                    onChange={(e) => {
                      const url = e.target.value;
                      const found = detectPlatform(url);
                      set(found ? { url, platform: found } : { url });
                    }} />
                </>
              )} />
          </Panel>
        </>
      )}

      {tab === 'Content' && (
        <>
          <Panel title={label('services', 'Services')}>
            <Repeater items={services} onChange={setServices}
              blank={(): ServiceRow => ({ title: '', description: '', image_url: '' })}
              addLabel="Add item" emptyHint="Nothing here yet — this section stays hidden on the card."
              render={(x, set) => (
                <>
                  <input className={inputClass} value={x.title} onChange={(e) => set({ title: e.target.value })} placeholder="Title" />
                  <textarea className={inputClass} value={x.description} onChange={(e) => set({ description: e.target.value })} placeholder="Short description" />
                  <UploadInput value={x.image_url} onChange={(url) => set({ image_url: url })} folder="services" />
                </>
              )} />
          </Panel>

          <Panel title={label('packages', 'Packages')}>
            <Repeater items={packages} onChange={setPackages}
              blank={(): PackageRow => ({ title: '', description: '', image_url: '', net_price: '', selling_price: '', badge: '' })}
              addLabel="Add package" emptyHint="No packages yet."
              render={(p, set) => (
                <>
                  <input className={inputClass} value={p.title} onChange={(e) => set({ title: e.target.value })} placeholder="Package name" />
                  <textarea className={inputClass} value={p.description} onChange={(e) => set({ description: e.target.value })} placeholder="What's included" />
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputClass} value={p.net_price} onChange={(e) => set({ net_price: e.target.value })} placeholder="MRP" inputMode="numeric" />
                    <input className={inputClass} value={p.selling_price} onChange={(e) => set({ selling_price: e.target.value })} placeholder="Price" inputMode="numeric" />
                    <input className={inputClass} value={p.badge} onChange={(e) => set({ badge: e.target.value })} placeholder="Badge" />
                  </div>
                  <UploadInput value={p.image_url} onChange={(url) => set({ image_url: url })} folder="packages" />
                </>
              )} />
          </Panel>

          <Panel title={label('testimonials', 'Testimonials')}>
            <Repeater items={testimonials} onChange={setTestimonials}
              blank={(): TestimonialRow => ({ author: '', role: '', quote: '', rating: '5', avatar_url: '' })}
              addLabel="Add testimonial" emptyHint="No testimonials yet."
              render={(t, set) => (
                <>
                  <textarea className={inputClass} value={t.quote} onChange={(e) => set({ quote: e.target.value })} placeholder="What they said" />
                  <div className="grid grid-cols-3 gap-2">
                    <input className={inputClass} value={t.author} onChange={(e) => set({ author: e.target.value })} placeholder="Name" />
                    <input className={inputClass} value={t.role} onChange={(e) => set({ role: e.target.value })} placeholder="Role" />
                    <select className={inputClass} value={t.rating} onChange={(e) => set({ rating: e.target.value })}>
                      {['5', '4', '3', '2', '1'].map((r) => <option key={r} value={r}>{r} ★</option>)}
                    </select>
                  </div>
                  <UploadInput value={t.avatar_url} onChange={(url) => set({ avatar_url: url })} folder="testimonials" />
                </>
              )} />
          </Panel>
        </>
      )}

      {tab === 'Media' && (
        <>
          <Panel title="Logo & cover">
            <Field label="Logo" hint="Square works best.">
              <UploadInput value={logoUrl} onChange={setLogoUrl} folder="logos" />
            </Field>
            <Field label="Cover image or video" hint="Upload an .mp4 and it autoplays muted at the top of the card.">
              <UploadInput value={coverUrl} onChange={setCoverUrl} folder="covers"
                accept="image/*,video/mp4,video/webm"
                onFileType={(t) => setCoverType(t.startsWith('video/') ? 'video' : 'image')} />
            </Field>
            <div className="flex gap-4 text-sm">
              {(['image', 'video'] as const).map((t) => (
                <label key={t} className="flex items-center gap-2">
                  <input type="radio" checked={coverType === t} onChange={() => setCoverType(t)} />
                  Cover is {t}
                </label>
              ))}
            </div>
          </Panel>

          <Panel title={label('gallery', 'Gallery')}>
            <Repeater items={gallery} onChange={setGallery}
              blank={(): GalleryRow => ({ image_url: '', category: '', caption: '' })}
              addLabel="Add photo" emptyHint="No photos yet."
              render={(g, set) => (
                <>
                  <UploadInput value={g.image_url} onChange={(url) => set({ image_url: url })} folder="gallery" />
                  <div className="grid grid-cols-2 gap-2">
                    <input className={inputClass} value={g.category} onChange={(e) => set({ category: e.target.value })} placeholder="Category (filter tab)" />
                    <input className={inputClass} value={g.caption} onChange={(e) => set({ caption: e.target.value })} placeholder="Caption" />
                  </div>
                </>
              )} />
          </Panel>

          <Panel title="Videos & Instagram">
            <Repeater items={videos} onChange={setVideos}
              blank={(): VideoRow => ({ provider: 'youtube', url: '', title: '' })}
              addLabel="Add video or post" emptyHint="Paste a YouTube link or an Instagram post/reel link."
              render={(v, set) => (
                <>
                  {/* `inputClass` already carries w-full, so a plain `w-32`
                      collides with it and the URL box collapses. `!w-32` wins. */}
                  <div className="flex gap-2">
                    <select className={`${inputClass} !w-28 shrink-0`} value={v.provider}
                      onChange={(e) => set({ provider: e.target.value as 'youtube' | 'instagram' })}>
                      <option value="youtube">YouTube</option>
                      <option value="instagram">Instagram</option>
                    </select>
                    <input className={`${inputClass} min-w-0 flex-1`} value={v.url}
                      onChange={(e) => set({ url: e.target.value })}
                      placeholder={v.provider === 'youtube' ? 'https://youtube.com/watch?v=…' : 'https://instagram.com/p/…'} />
                  </div>
                  <input className={inputClass} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Caption (optional)" />
                </>
              )} />
          </Panel>
        </>
      )}

      {tab === 'Hours' && (
        <Panel title={label('hours', 'Business hours')}>
          {hours.length === 0 ? (
            <button type="button" onClick={fillWeek}
              className="w-full rounded-xl border border-dashed border-slate-300 py-6 text-sm font-semibold text-slate-500 hover:bg-slate-50">
              + Set up the week (Mon–Sat 10–7, Sunday closed)
            </button>
          ) : (
            <div className="space-y-2">
              {hours.map((h, i) => (
                <div key={h.day_of_week} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-sm text-slate-600">{DAYS[h.day_of_week]}</span>
                  <input type="time" className={inputClass} value={h.open_time} disabled={h.closed}
                    onChange={(e) => { const x = [...hours]; x[i] = { ...h, open_time: e.target.value }; setHours(x); }} />
                  <input type="time" className={inputClass} value={h.close_time} disabled={h.closed}
                    onChange={(e) => { const x = [...hours]; x[i] = { ...h, close_time: e.target.value }; setHours(x); }} />
                  <label className="flex shrink-0 items-center gap-1 text-xs text-slate-500">
                    <input type="checkbox" checked={h.closed}
                      onChange={(e) => { const x = [...hours]; x[i] = { ...h, closed: e.target.checked }; setHours(x); }} />
                    Closed
                  </label>
                </div>
              ))}
              <button type="button" onClick={() => setHours([])} className="text-xs font-semibold text-rose-500">
                Clear hours
              </button>
            </div>
          )}
        </Panel>
      )}

      {tab === 'Design' && (
        <DesignPanel design={design} onChange={setDesign} template={tpl} />
      )}

      {tab === 'Reviews' && (
        <>
          <Panel title="Review funnel">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input type="checkbox" checked={reviewEnabled} onChange={(e) => setReviewEnabled(e.target.checked)} />
              Enable the review page for this business
            </label>

            {reviewEnabled && (
              <>
                <Field
                  label="Google review link *"
                  hint="Best source: Google Business Profile → Ask for reviews → copy link (g.page/r/…/review). It comes straight from the listing, so it can't be wrong. A search.google.com/local/writereview?placeid=… link also works, but only if the Place ID belongs to that exact verified listing — a wrong ID silently lands on a search page instead of the review box. Test the link yourself before saving. Without a link here, every rating opens the private form."
                >
                  <input className={inputClass} value={googleReviewUrl}
                    onChange={(e) => setGoogleReviewUrl(e.target.value)}
                    placeholder="https://g.page/r/CxxxxxxxxxxxxEBM/review" />
                  {googleReviewUrl.trim() && (() => {
                    const check = checkGoogleReviewUrl(googleReviewUrl);
                    return (
                      <>
                        {check.level !== 'ok' && (
                          <p
                            className={`mt-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                              check.level === 'bad'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-amber-50 text-amber-800'
                            }`}
                          >
                            {check.note}
                          </p>
                        )}
                        {check.level === 'ok' && (
                          <p className="mt-1.5 text-xs font-medium text-emerald-600">
                            ✓ Opens the review box directly
                          </p>
                        )}
                        <a href={googleReviewUrl} target="_blank" rel="noopener noreferrer"
                          className="mt-1 inline-block text-xs font-semibold text-slate-600 underline">
                          Test this link ↗
                        </a>
                      </>
                    );
                  })()}
                </Field>

                <Field label="Client's email *"
                  hint="Private feedback lands here. Sent from your own mailbox — replying goes back to the customer.">
                  <input className={inputClass} type="email" value={feedbackEmail}
                    onChange={(e) => setFeedbackEmail(e.target.value)}
                    placeholder="owner@theirbusiness.com" />
                </Field>

                <Field
                  label={`Send to Google at ${reviewThreshold}★ and above`}
                  hint={
                    reviewThreshold === 1
                      ? 'Everyone goes to Google — no filtering at all.'
                      : `${reviewThreshold}–5★ → Google. 1–${reviewThreshold - 1}★ → private form to the client's email.`
                  }
                >
                  <input type="range" min={1} max={5} step={1} className="w-full"
                    value={reviewThreshold}
                    onChange={(e) => setReviewThreshold(Number(e.target.value))} />
                  <div className="flex justify-between px-1 text-[11px] text-slate-400">
                    {[1, 2, 3, 4, 5].map((n) => <span key={n}>{n}★</span>)}
                  </div>
                </Field>

                <Field label="Headline" hint="Shown above the stars.">
                  <input className={inputClass} value={reviewHeadline}
                    onChange={(e) => setReviewHeadline(e.target.value)}
                    placeholder="How was your experience?" />
                </Field>

                <Field label="Thank-you message" hint="Shown after private feedback is sent.">
                  <input className={inputClass} value={reviewThanks}
                    onChange={(e) => setReviewThanks(e.target.value)}
                    placeholder="Thank you for telling us." />
                </Field>
              </>
            )}
          </Panel>

          {reviewEnabled && editing && (
            <Panel title="Share it">
              <ReviewLinkCard slug={customSlug} />
            </Panel>
          )}

          {reviewEnabled && !editing && (
            <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Publish the card first — the review link and QR appear here once it has a URL.
            </p>
          )}
        </>
      )}

      {tab === 'Settings' && (
        <Panel title="Branding & domain">
          <Field label="Theme colour" hint={`Template default is ${tpl.brand}.`}>
            <div className="flex flex-wrap items-center gap-2">
              {THEMES.map((c) => (
                <button key={c} type="button" onClick={() => setThemeColor(c)} title={c}
                  className={`h-9 w-9 rounded-full transition ${themeColor === c ? 'ring-2 ring-slate-900 ring-offset-2' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
              <input type="color" value={themeColor} onChange={(e) => setThemeColor(e.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-slate-300" />
            </div>
          </Field>

          <Field
            label="Custom domain (optional)"
            hint="⚠️ Set this only AFTER the client's DNS points here and the domain opens. The QR code retargets to this domain the moment you save — set it too early and every printed QR leads to a dead page. DNS steps are in README.md."
          >
            <input className={inputClass} value={customDomain} onChange={(e) => setCustomDomain(e.target.value)} placeholder="theirdomain.com" />
          </Field>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
            Published — visible to anyone with the link
          </label>
        </Panel>
      )}

      {error && <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}

      <button type="submit" disabled={saving}
        className="w-full rounded-xl bg-slate-900 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50">
        {saving ? 'Saving…' : editing ? 'Save changes' : 'Publish card'}
      </button>
    </form>
  );

  return (
    <>
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_412px] xl:items-start xl:gap-8">
        {form}

        <aside className="hidden xl:sticky xl:top-4 xl:block">
          <CardPreview business={draft} cardUrl={`/${slug}`} />
        </aside>
      </div>

      {/* Narrow screens can't fit a split view, so the preview becomes a sheet. */}
      <button type="button" onClick={() => setShowPreview(true)}
        className="fixed bottom-5 right-5 z-30 rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg xl:hidden">
        Preview
      </button>

      {showPreview && (
        <div className="fixed inset-0 z-40 overflow-auto bg-slate-900/70 p-4 xl:hidden"
          onClick={() => setShowPreview(false)}>
          <div className="flex min-h-full items-start justify-center py-6"
            onClick={(e) => e.stopPropagation()}>
            <div>
              <CardPreview business={draft} cardUrl={`/${slug}`} />
              <button type="button" onClick={() => setShowPreview(false)}
                className="mx-auto mt-4 block rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-800">
                Close preview
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
