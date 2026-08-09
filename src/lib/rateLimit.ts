/**
 * A small in-memory rate limiter for the endpoints anyone can reach.
 *
 * Kept in this process's memory on purpose. The alternative — a row in
 * Postgres per request — turns a cheap check into a database write on the
 * hottest public path, and a Redis just for this is a whole service to run and
 * pay for. On one VPS, a Map is the right size of answer.
 *
 * What that costs, stated plainly so nobody is surprised later:
 *   • counters reset when the app restarts
 *   • two app instances would each keep their own count, doubling the real limit
 * Neither matters at one server. If this ever runs on more than one, move the
 * window into Postgres and keep the same interface.
 */

type Hit = { count: number; resetAt: number };

const buckets = new Map<string, Hit>();

// Without this the Map grows for ever: one entry per IP that ever visited.
let lastSweep = Date.now();
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface Limit {
  /** How many requests are allowed in the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface LimitResult {
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets — goes into Retry-After. */
  retryAfter: number;
}

export function rateLimit(key: string, limit: Limit): LimitResult {
  const now = Date.now();
  sweep(now);

  const hit = buckets.get(key);

  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + limit.windowMs });
    return { ok: true, remaining: limit.max - 1, retryAfter: 0 };
  }

  hit.count += 1;
  const retryAfter = Math.ceil((hit.resetAt - now) / 1000);

  return {
    ok: hit.count <= limit.max,
    remaining: Math.max(0, limit.max - hit.count),
    retryAfter,
  };
}

/**
 * Best guess at who is calling.
 *
 * Behind Traefik the real address is in x-forwarded-for, and the FIRST entry is
 * the client — the rest are proxies. A caller can send a forged header, so this
 * is not identity; it is only good enough to make abuse tedious, which is all a
 * rate limit ever does.
 */
export function callerKey(req: Request, bucket: string): string {
  /* X-Forwarded-For is a list, and only the entries our own proxy added can be
     believed. Anyone can send `X-Forwarded-For: 1.2.3.4`; Traefik appends the
     real peer to whatever arrived rather than replacing it. So the LEFTMOST
     entry is whatever the caller typed.

     Reading it left-to-right — which this did — meant every limit here could be
     walked past by changing one header per request. The login limiter, the
     checkout limiter and the review limiter were all effectively off to anyone
     who knew that.

     The rightmost entry is the one added last, by our proxy, and is the actual
     TCP peer. That is the one to count. */
  const chain = (req.headers.get('x-forwarded-for') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  /* Cloudflare is the exception, and only if the site is actually behind it:
     Cloudflare strips any CF-Connecting-IP the client sent and writes its own.
     Behind Cloudflare the rightmost hop is a Cloudflare edge address, which
     would put every visitor in one bucket and lock out the whole country at
     once — so this header has to win when it is trustworthy.

     Gated on TRUST_CF_HEADER so that turning Cloudflare on is a deliberate act.
     Without the flag the header is ignored, because off Cloudflare it is just
     another thing a caller can type. */
  const cf =
    process.env.TRUST_CF_HEADER === 'true'
      ? req.headers.get('cf-connecting-ip')
      : null;

  const ip = cf || chain[chain.length - 1] || req.headers.get('x-real-ip') || 'unknown';
  return `${bucket}:${ip}`;
}

/** Ready-made 429, with the header clients actually respect. */
export function tooManyRequests(retryAfter: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfter)),
    },
  });
}
