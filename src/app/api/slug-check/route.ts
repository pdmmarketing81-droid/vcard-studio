import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { slugify } from '@/lib/slug';
import { rateLimit, callerKey, tooManyRequests } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

/**
 * Words that can never be a card's link, because a card claiming one would sit
 * on top of a real page. `/pricing` belonging to a shop would take the pricing
 * page off the site — and nobody would connect the two.
 */
const RESERVED = new Set([
  'admin', 'api', 'login', 'signup', 'logout', 'checkout', 'pricing', 'terms',
  'privacy', 'refunds', 'contact', 'about', 'blog', 'help', 'support', 'my',
  'reseller', 'suspended', 'after-login', 'r', 'd', 'www', 'app', 'static',
  'assets', 'public', 'settings', 'account', 'dashboard', 'new', 'edit',
]);

/**
 * Is this link free?
 *
 * Public and unauthenticated, so it is rate limited: without that it is a way
 * to walk the whole list of which businesses exist here, one guess at a time.
 */
export async function GET(req: Request) {
  const limit = rateLimit(callerKey(req, 'slugcheck'), { max: 40, windowMs: 60_000 });
  if (!limit.ok) return tooManyRequests(limit.retryAfter, 'Please slow down a little.');

  const raw = new URL(req.url).searchParams.get('slug') ?? '';
  const slug = slugify(raw);

  if (!slug || slug.length < 3) {
    return NextResponse.json({ slug, available: false, reason: 'Use at least 3 characters.' });
  }
  if (RESERVED.has(slug)) {
    return NextResponse.json({ slug, available: false, reason: 'That one is taken.' });
  }

  const { data } = await supabaseAdmin()
    .from('businesses').select('id').eq('slug', slug).maybeSingle();

  return NextResponse.json({
    slug,
    available: !data,
    reason: data ? 'That one is taken.' : null,
  });
}
