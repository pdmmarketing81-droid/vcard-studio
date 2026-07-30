import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import ReviewFunnel from '@/components/ReviewFunnel';
import { getReviewBusiness } from '@/lib/queries';

/**
 * The review page lives at /r/[slug] — deliberately short, because this URL
 * gets pasted into WhatsApp messages and printed under QR codes.
 */
// Short window on purpose: this page is toggled on and off from the admin,
// and a stale 404 here means a printed QR leads nowhere.
export const revalidate = 30;

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = await getReviewBusiness(params.slug);
  if (!b) return { title: 'Not found' };
  return {
    title: `Rate ${b.name}`,
    description: `Share your experience with ${b.name}.`,
    // A review link shared in chat shouldn't get indexed by search engines.
    robots: { index: false, follow: false },
  };
}

export async function generateViewport({ params }: Props): Promise<Viewport> {
  const b = await getReviewBusiness(params.slug);
  return { themeColor: b?.theme_color ?? '#0f766e' };
}

export default async function ReviewPage({ params }: Props) {
  const business = await getReviewBusiness(params.slug);
  if (!business) notFound();

  return <ReviewFunnel business={business} />;
}
