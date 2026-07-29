export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'x'
  | 'youtube'
  | 'whatsapp'
  | 'custom';

export interface SocialLink {
  id: string;
  business_id: string;
  platform: SocialPlatform;
  url: string;
  label: string | null;
  sort_order: number;
}

export interface Service {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
}

export interface Package {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  net_price: number | null;
  selling_price: number | null;
  currency: string;
  badge: string | null;
  sort_order: number;
}

export interface Testimonial {
  id: string;
  business_id: string;
  author: string;
  role: string | null;
  avatar_url: string | null;
  quote: string;
  rating: number | null;
  sort_order: number;
}

export interface GalleryItem {
  id: string;
  business_id: string;
  image_url: string;
  category: string | null;
  caption: string | null;
  sort_order: number;
}

export interface Video {
  id: string;
  business_id: string;
  provider: 'youtube' | 'instagram' | 'custom';
  url: string;
  title: string | null;
  sort_order: number;
}

export interface BusinessHour {
  id: string;
  business_id: string;
  day_of_week: number; // 0 = Sunday
  open_time: string | null; // "10:00:00"
  close_time: string | null;
  closed: boolean;
}

export interface Business {
  id: string;
  owner_id: string | null;
  slug: string;
  custom_domain: string | null;

  name: string;
  tagline: string | null;
  about: string | null;

  logo_url: string | null;
  cover_url: string | null;
  cover_type: 'image' | 'video';

  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  website: string | null;

  theme_color: string;
  template: string;
  /** Template-specific fields — see TEMPLATES[].extraFields */
  extras: Record<string, string | undefined>;
  /** Per-card design overrides — see CardDesign in lib/design.ts */
  design: Record<string, unknown>;

  published: boolean;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface BusinessFull extends Business {
  social_links: SocialLink[];
  services: Service[];
  packages: Package[];
  testimonials: Testimonial[];
  gallery_items: GalleryItem[];
  videos: Video[];
  business_hours: BusinessHour[];
}
