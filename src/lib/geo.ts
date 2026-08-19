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

/**
 * The place's name, out of a /maps/place/<Name>/ URL.
 *
 * Coordinates alone give a pin labelled "24.544221, 81.319192", which is exact
 * and useless to a human. Google puts the name right there in the path, so the
 * label costs nothing to recover — no API key, no lookup.
 *
 * `+` is Google's space. decodeURIComponent handles the rest, and a malformed
 * escape throws rather than corrupting the name, so it is caught and dropped.
 */
export function parsePlaceName(input: string): string | null {
  const m = (input || '').match(/\/maps\/place\/([^/@?]+)/);
  if (!m) return null;
  try {
    const name = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
    // A coordinate pair sometimes sits where the name would be. That is not a
    // name, and using it would put the numbers back on the label.
    if (!name || /^-?\d{1,3}\.\d+,/.test(name)) return null;
    return name.slice(0, 120);
  } catch {
    return null;
  }
}

/** True for the short links we cannot read, so the form can say why. */
export function isShortMapsLink(input: string): boolean {
  return /(?:maps\.app\.goo\.gl|goo\.gl\/maps)/i.test(input || '');
}

interface MapFields {
  map_lat?: number | null;
  map_lng?: number | null;
  map_label?: string | null;
  map_url?: string | null;
  address?: string | null;
}

/**
 * The src for the embedded map.
 *
 * With a name AND coordinates, `q` carries the name and `ll` fixes the centre.
 * That is the combination that produces a pin labelled "Samdareeya hotel and
 * multiplex" instead of a pair of numbers — `q` alone would search and might
 * pick the wrong branch, `ll` alone centres correctly but labels nothing.
 *
 * z=17 is street level: the building fills the frame while the road names that
 * tell someone how to get there are still readable.
 */
export function mapEmbedSrc(b: MapFields): string | null {
  if (b.map_lat != null && b.map_lng != null) {
    const at = `${b.map_lat},${b.map_lng}`;
    if (b.map_label) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(b.map_label)}&ll=${at}&z=17&output=embed`;
    }
    return `https://maps.google.com/maps?q=${at}&z=17&output=embed`;
  }
  if (b.address) {
    return `https://maps.google.com/maps?q=${encodeURIComponent(b.address)}&output=embed`;
  }
  return null;
}

/**
 * Where "open in Maps" goes.
 *
 * The pasted link wins over everything we could rebuild. It opens the real
 * place page — reviews, photos, the Directions button — where coordinates only
 * ever open a dropped pin in the middle of nowhere with no name on it.
 */
export function mapLinkHref(b: MapFields): string | null {
  if (b.map_url) return b.map_url;
  if (b.map_lat != null && b.map_lng != null) {
    return `https://maps.google.com/?q=${b.map_lat},${b.map_lng}`;
  }
  if (b.address) return `https://maps.google.com/?q=${encodeURIComponent(b.address)}`;
  return null;
}
