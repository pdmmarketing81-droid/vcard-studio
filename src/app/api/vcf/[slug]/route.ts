import { NextResponse } from 'next/server';
import { getBusinessBySlug } from '@/lib/queries';
import { buildVCard } from '@/lib/vcf';
import { absoluteUrl } from '@/lib/url';

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const business = await getBusinessBySlug(params.slug);
  if (!business) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const vcf = buildVCard(business, absoluteUrl(`/${business.slug}`));
  const filename = `${business.slug}.vcf`;

  return new NextResponse(vcf, {
    headers: {
      // charset=utf-8 keeps Devanagari / accented names intact on import
      'Content-Type': 'text/vcard; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  });
}
