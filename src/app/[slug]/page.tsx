import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import CardView from '@/components/CardView';
import { getBusinessBySlug, recordView } from '@/lib/queries';
import { absoluteUrl } from '@/lib/url';

export const revalidate = 60; // cards are cached for 60s, edits go live fast

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBusinessBySlug(params.slug);
  if (!b) return { title: 'Card not found' };

  const description =
    b.about?.slice(0, 160) ?? b.tagline ?? `Digital business card for ${b.name}`;
  const image = b.cover_type === 'image' ? b.cover_url : b.logo_url;

  return {
    title: b.name,
    description,
    openGraph: {
      title: b.name,
      description,
      type: 'profile',
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: b.name,
      description,
      images: image ? [image] : undefined,
    },
  };
}

/**
 * themeColor tints the browser chrome on mobile. Next 14 moved it out of
 * `metadata` into its own `viewport` export — leaving it in metadata is
 * ignored and warns on every render.
 */
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const b = await getBusinessBySlug(params.slug);
  return { themeColor: b?.theme_color ?? '#0f766e' };
}

export default async function CardPage({ params }: Props) {
  const business = await getBusinessBySlug(params.slug);
  if (!business) notFound();

  void recordView(business.slug);

  return (
    <CardView business={business} cardUrl={absoluteUrl(`/${business.slug}`)} />
  );
}
