/**
 * Turning whatever a shop owner pastes into a map pin.
 *
 * The card used to hand Google the address as text and let it guess. For a city
 * address that mostly works; for "At Post - Mawadi Kadepathar" it does not, and
 * the map opens on half of India. No amount of careful typing fixes that,
 * because the problem is that text is ambiguous and coordinates are not.
 *
 * So we accept the things a person can actually get hold of on a phone, in
 * roughly the order they are likely to have them.
 */

export interface LatLng {
  lat: number;
  lng: number;
}

const inRange = (lat: number, lng: number) =>
  Number.isFinite(lat) && Number.isFinite(lng) &&
  lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 &&
  // 0,0 is in the Atlantic. It is almost always a parse that went wrong rather
  // than a shop, and letting it through puts a pin in the ocean.
  !(lat === 0 && lng === 0);

/**
 * Reads coordinates out of a pasted string.
 *
 * Handles, in order of how much we trust them:
 *   • plain "18.5204, 73.8567"
 *   • the !3dLAT!4dLNG pair inside a /maps/place/ URL — the pin itself
 *   • @lat,lng,zoom in a Maps URL — where the camera was, close but not exact
 *   • ?q=lat,lng or ?ll=lat,lng — older share formats
 *
 * Returns null for anything else — including short maps.app.goo.gl links, which
 * hold no coordinates at all until they are opened. Resolving those would mean
 * our server fetching a URL a stranger supplied, which is a door not worth
 * opening for a convenience.
 */
export function parseLatLng(input: string): LatLng | null {
  const s = (input || '').trim();
  if (!s) return null;

  const plain = s.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  if (plain) {
    const lat = Number(plain[1]);
    const lng = Number(plain[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  /* Google's own place encoding: !3d is latitude, !4d is longitude.
     Checked before @ on purpose. A /maps/place/ URL carries both, and they are
     not the same point — @ is where the camera was centred when the link was
     made, !3d/!4d is the pin itself. Reading @ first put the marker up to a few
     hundred metres from the shop, which is exactly the vagueness this whole
     field exists to remove. A test caught it; reading the code did not. */
  const place = s.match(/!3d(-?\d{1,3}\.\d+).*?!4d(-?\d{1,3}\.\d+)/);
  if (place) {
    const lat = Number(place[1]);
    const lng = Number(place[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  const at = s.match(/@(-?\d{1,3}\.\d+),(-?\d{1,3}\.\d+)/);
  if (at) {
    const lat = Number(at[1]);
    const lng = Number(at[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  const query = s.match(/[?&](?:q|ll|query)=(-?\d{1,3}\.\d+)(?:,|%2C)(-?\d{1,3}\.\d+)/i);
  if (query) {
    const lat = Number(query[1]);
    const lng = Number(query[2]);
    if (inRange(lat, lng)) return { lat, lng };
  }

  return null;
}

/** True for the short links we cannot read, so the form can say why. */
export function isShortMapsLink(input: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input || '');
}

/** The src for the embedded map. Coordinates when we have them, text when not. */
export function mapEmbedSrc(b: {
  map_lat?: number | null;
  map_lng?: number | null;
  address?: string | null;
}): string | null {
  if (b.map_lat != null && b.map_lng != null) {
    // z=17 is street level: the building fills the frame without losing the
    // road names that tell someone how to get there.
    return `https://maps.google.com/maps?q=${b.map_lat},${b.map_lng}&z=17&output=embed`;
  }
  if (b.address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&output=embed`;
  }
  return null;
}

/** Where the "open in Maps" link goes — the pin if we have it, else the words. */
export function mapLinkHref(b: {
  map_lat?: number | null;
  map_lng?: number | null;
  address?: string | null;
}): string | null {
  if (b.map_lat != null && b.map_lng != null) {
    return `https://maps.google.com/?q=${b.map_lat},${b.map_lng}`;
  }
  if (b.address) return `https://maps.google.com/?q=${encodeURIComponent(b.address)}`;
  return null;
}
