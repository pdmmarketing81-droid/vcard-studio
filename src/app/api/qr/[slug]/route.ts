import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { getBusinessBySlug } from '@/lib/queries';
import { absoluteUrl } from '@/lib/url';

/**
 * Themed QR code.
 *
 * ?format=svg|png   svg scales to any print size; png is what most printers
 *                   and WhatsApp actually accept.
 * ?size=1024        png pixel size. 1024 survives a standee; 2048 a hoarding.
 * ?download=1       forces a save-as instead of rendering inline.
 */
export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const business = await getBusinessBySlug(params.slug);
  if (!business) {
    return NextResponse.json({ error: 'Card not found' }, { status: 404 });
  }

  const url = new URL(req.url);
  const format = url.searchParams.get('format') === 'png' ? 'png' : 'svg';
  const download = url.searchParams.get('download') === '1';
  const size = Math.min(4096, Math.max(128, Number(url.searchParams.get('size')) || 1024));

  // A custom domain makes a nicer QR target than the platform URL.
  const target = business.custom_domain
    ? `https://${business.custom_domain}`
    : absoluteUrl(`/${business.slug}`);

  // Higher correction on print assets: a scuffed or partly covered standee
  // still scans.
  const options = {
    errorCorrectionLevel: 'H' as const,
    margin: 2,
    color: { dark: business.theme_color, light: '#FFFFFF' },
  };

  const filename = `${business.slug}-qr.${format}`;
  const disposition = download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  if (format === 'png') {
    const buffer = await QRCode.toBuffer(target, { ...options, type: 'png', width: size });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const svg = await QRCode.toString(target, { ...options, type: 'svg' });
  return new NextResponse(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Content-Disposition': disposition,
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
