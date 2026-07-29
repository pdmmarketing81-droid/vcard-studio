/**
 * Industry templates.
 *
 * A template is pure configuration — it never contains markup. It decides:
 *   • the palette, typeface, panel treatment and corner radius
 *   • the order sections appear in
 *   • what each section is *called* ("Services" vs "Specializations")
 *   • which extra fields the admin form should collect
 *
 * Sections render only when they have data, so a doctor who happens to upload
 * a gallery still gets a gallery. The template controls order, language and
 * look — not availability. Adding an industry is a config edit, not a new page.
 */

export type SectionId =
  | 'about' | 'contact' | 'hours' | 'services' | 'packages'
  | 'gallery' | 'videos' | 'testimonials' | 'map' | 'qr' | 'share';

export interface ExtraField {
  key: string;
  label: string;
  placeholder?: string;
}

export interface TemplateStyle {
  /** Page background. A gradient here does most of the mood-setting work. */
  surface: string;
  panel: 'solid' | 'elevated' | 'glass' | 'bordered';
  /** CSS length for --radius. Tight = precise/corporate, wide = soft/premium. */
  radius: string;
  font: 'sans' | 'serif' | 'geometric';
  /** Second colour for gradients on buttons and headings. */
  accent: string;
  heroShape: 'rounded' | 'arch' | 'bleed';
  /** Hairline flourish under section titles. */
  titleRule: boolean;
  /** Logo overlaps the cover, or sits below it. */
  heroStyle: 'overlap' | 'banner';
}

export interface TemplateDef {
  id: string;
  name: string;
  blurb: string;
  brand: string;
  order: SectionId[];
  labels: Partial<Record<SectionId, string>>;
  extraFields: ExtraField[];
  style: TemplateStyle;
}

const DEFAULT_ORDER: SectionId[] = [
  'about', 'contact', 'services', 'packages', 'gallery',
  'videos', 'testimonials', 'hours', 'map', 'qr', 'share',
];

export const TEMPLATES: TemplateDef[] = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'Neutral and professional. Suits any business.',
    brand: '#0f766e',
    order: DEFAULT_ORDER,
    labels: {},
    extraFields: [],
    style: {
      surface: 'linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%)',
      panel: 'solid',
      radius: '1.25rem',
      font: 'sans',
      accent: '#14b8a6',
      heroShape: 'rounded',
      titleRule: false,
      heroStyle: 'overlap',
    },
  },

  {
    id: 'doctor',
    name: 'Doctor / Clinic',
    blurb: 'Calm and clinical. Credentials and hours lead.',
    brand: '#0369a1',
    // A patient wants three things fast: is this the right doctor, is the
    // clinic open, and how do I book. That drives this order.
    order: [
      'about', 'services', 'contact', 'hours', 'packages',
      'testimonials', 'gallery', 'videos', 'map', 'qr', 'share',
    ],
    labels: {
      about: 'About the Doctor',
      services: 'Specializations',
      packages: 'Consultation & Packages',
      testimonials: 'Patient Reviews',
      hours: 'Clinic Hours',
      gallery: 'Clinic Gallery',
      contact: 'Clinic Contact',
    },
    extraFields: [
      { key: 'qualifications', label: 'Qualifications', placeholder: 'MBBS, MD (Medicine)' },
      { key: 'experience_years', label: 'Years of experience', placeholder: '12' },
      { key: 'registration_no', label: 'Medical registration no.', placeholder: 'DMC/R/12345' },
      { key: 'languages', label: 'Languages spoken', placeholder: 'Hindi, English, Punjabi' },
    ],
    style: {
      surface: 'linear-gradient(180deg, #f0f9ff 0%, #e0f2fe 55%, #f8fafc 100%)',
      // Crisp floating panels read as clean and orderly — the qualities
      // people want from a clinic.
      panel: 'elevated',
      radius: '1rem',
      font: 'sans',
      accent: '#0ea5e9',
      heroShape: 'rounded',
      titleRule: true,
      heroStyle: 'banner',
    },
  },

  {
    id: 'photography',
    name: 'Photography / Wedding',
    blurb: 'Editorial and cinematic. Portfolio leads.',
    brand: '#9d174d',
    order: [
      'about', 'gallery', 'services', 'packages', 'videos',
      'testimonials', 'contact', 'hours', 'map', 'qr', 'share',
    ],
    labels: {
      services: 'What We Shoot',
      packages: 'Packages',
      gallery: 'Portfolio',
      testimonials: 'What Our Couples Say',
      videos: 'Films',
    },
    extraFields: [
      { key: 'years_active', label: 'Years shooting', placeholder: '8' },
      { key: 'coverage_area', label: 'Coverage area', placeholder: 'Delhi NCR, Punjab, destination' },
    ],
    style: {
      surface: 'linear-gradient(165deg, #fdf2f8 0%, #fce7f3 40%, #fff1f2 100%)',
      // Frosted glass keeps attention on the photographs behind it.
      panel: 'glass',
      radius: '1.5rem',
      font: 'serif',
      accent: '#e11d48',
      // An arched cover is the visual shorthand for wedding work.
      heroShape: 'arch',
      titleRule: true,
      heroStyle: 'overlap',
    },
  },

  {
    id: 'restaurant',
    name: 'Restaurant / Cafe',
    blurb: 'Warm and appetising. Menu up front.',
    brand: '#b45309',
    order: [
      'about', 'packages', 'gallery', 'hours', 'contact',
      'services', 'testimonials', 'videos', 'map', 'qr', 'share',
    ],
    labels: {
      packages: 'Menu',
      services: 'What We Serve',
      gallery: 'Food Gallery',
      testimonials: 'Guest Reviews',
      hours: 'Opening Hours',
    },
    extraFields: [
      { key: 'cuisine', label: 'Cuisine', placeholder: 'North Indian, Chinese' },
      { key: 'seating', label: 'Seating capacity', placeholder: '60' },
      { key: 'delivery_links', label: 'Delivery apps', placeholder: 'Zomato / Swiggy links' },
    ],
    style: {
      surface: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 50%, #fffbeb 100%)',
      panel: 'elevated',
      radius: '1.5rem',
      font: 'geometric',
      accent: '#f59e0b',
      // Edge-to-edge food photography is the whole pitch.
      heroShape: 'bleed',
      titleRule: false,
      heroStyle: 'banner',
    },
  },

  {
    id: 'realestate',
    name: 'Real Estate',
    blurb: 'Solid and corporate. Listings, then map.',
    brand: '#1e40af',
    order: [
      'about', 'packages', 'gallery', 'contact', 'map',
      'services', 'testimonials', 'videos', 'hours', 'qr', 'share',
    ],
    labels: {
      packages: 'Properties',
      services: 'Our Services',
      gallery: 'Property Gallery',
      testimonials: 'Client Reviews',
    },
    extraFields: [
      { key: 'rera_id', label: 'RERA registration', placeholder: 'RERA/GGM/2024/123' },
      { key: 'areas_served', label: 'Areas served', placeholder: 'Gurugram, Sohna Road' },
    ],
    style: {
      surface: 'linear-gradient(180deg, #eff6ff 0%, #dbeafe 60%, #f8fafc 100%)',
      panel: 'solid',
      // Tighter corners read as dependable rather than playful.
      radius: '0.75rem',
      font: 'geometric',
      accent: '#3b82f6',
      heroShape: 'rounded',
      titleRule: false,
      heroStyle: 'banner',
    },
  },

  {
    id: 'salon',
    name: 'Salon / Spa',
    blurb: 'Soft and chic. Treatments and price list.',
    brand: '#7c3aed',
    order: [
      'about', 'services', 'packages', 'gallery', 'hours',
      'contact', 'testimonials', 'videos', 'map', 'qr', 'share',
    ],
    labels: {
      services: 'Treatments',
      packages: 'Price List',
      testimonials: 'Client Love',
      hours: 'Salon Hours',
    },
    extraFields: [
      { key: 'specialities', label: 'Specialities', placeholder: 'Bridal makeup, keratin, nails' },
    ],
    style: {
      surface: 'linear-gradient(160deg, #faf5ff 0%, #f3e8ff 45%, #fdf4ff 100%)',
      panel: 'glass',
      // The softest corners of any template — the whole category sells calm.
      radius: '1.75rem',
      font: 'serif',
      accent: '#c026d3',
      heroShape: 'arch',
      titleRule: true,
      heroStyle: 'overlap',
    },
  },
];

export const DEFAULT_TEMPLATE = TEMPLATES[0];

export function getTemplate(id: string | null | undefined): TemplateDef {
  return TEMPLATES.find((t) => t.id === id) ?? DEFAULT_TEMPLATE;
}

export function sectionLabel(tpl: TemplateDef, id: SectionId, fallback: string): string {
  return tpl.labels[id] ?? fallback;
}

/**
 * Rendering concerns (CSS variables, panel classes) live in lib/design.ts,
 * because a card's final look is the template *plus* its own overrides —
 * the template alone never decides it.
 */
export const ALL_SECTIONS: SectionId[] = [
  'about', 'contact', 'hours', 'services', 'packages',
  'gallery', 'videos', 'testimonials', 'map', 'qr', 'share',
];

export const SECTION_NAMES: Record<SectionId, string> = {
  about: 'About',
  contact: 'Contact',
  hours: 'Business hours',
  services: 'Services',
  packages: 'Packages / Menu',
  gallery: 'Gallery',
  videos: 'Videos & Instagram',
  testimonials: 'Testimonials',
  map: 'Map',
  qr: 'QR code',
  share: 'Share buttons',
};
