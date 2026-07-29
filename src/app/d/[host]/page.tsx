import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import CardView from '@/components/CardView';
import { getBusinessByDomain, recordView } from '@/lib/queries';
import { absoluteUrl } from '@/lib/url';

/**
 * Reached only via middleware rewrite when a request arrives on a client's
 * own custom domain. Visitors never see this path.
 */
export const revalidate = 60;

type Props = { params: { host: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getBusinessByDomain(decodeURIComponent(params.host));
  if (!b) return { title: 'Card not found' };

  const description =
    b.about?.slice(0, 160) ?? b.tagline ?? `Digital business card for ${b.name}`;
  const image = b.cover_type === 'image' ? b.cover_url : b.logo_url;

  return {
    title: b.name,
    description,
    openGraph: { title: b.name, description, images: image ? [{ url: image }] : undefined },
  };
}

/** themeColor lives in `viewport`, not `metadata`, since Next 14. */
export async function generateViewport({ params }: Props): Promise<Viewport> {
  const b = await getBusinessByDomain(decodeURIComponent(params.host));
  return { themeColor: b?.theme_color ?? '#0f766e' };
}

export default async function CustomDomainCard({ params }: Props) {
  const business = await getBusinessByDomain(decodeURIComponent(params.host));
  if (!business) notFound();

  void recordView(business.slug);

  // On a custom domain the card lives at the root.
  return <CardView business={business} cardUrl={absoluteUrl('/')} />;
}
