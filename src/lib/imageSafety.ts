/**
 * Two things done to every image before it is stored.
 *
 * 1. Its real size is read from the header, and absurd ones are refused. A few
 *    kilobytes of PNG can declare 60000×60000 pixels; nothing here decodes it,
 *    but every phone that later opens the page would try, and fall over. The
 *    header is a handful of bytes and tells us before anyone gets hurt.
 *
 * 2. Metadata is cut out. A photo from a phone carries EXIF, and EXIF carries
 *    GPS. A customer complaining about a shop should not also be handing over
 *    the coordinates of where they stood — and once that file is public on R2,
 *    it is public for good.
 *
 * Both work on the raw bytes. No image library, nothing decoded, no native
 * dependency to install on the VPS — and no decoder to be attacked in the
 * first place.
 */

/** Roughly a 48-megapixel photo. Above this nothing legitimate is arriving. */
export const MAX_PIXELS = 50_000_000;
export const MAX_EDGE = 12_000;

export interface Dimensions {
  width: number;
  height: number;
}

/* ------------------------------ reading size ------------------------------ */

function pngSize(b: Buffer): Dimensions | null {
  // IHDR is always the first chunk: 8 byte signature, 4 length, 4 type, then w/h.
  if (b.length < 24) return null;
  if (b.readUInt32BE(12) !== 0x49484452) return null; // 'IHDR'
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gifSize(b: Buffer): Dimensions | null {
  if (b.length < 10) return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function jpegSize(b: Buffer): Dimensions | null {
  let i = 2; // skip SOI
  while (i + 9 < b.length) {
    if (b[i] !== 0xff) return null;
    const marker = b[i + 1];
    // SOF0..SOF15 carry the frame size; C4 (Huffman), C8 and CC are not frames.
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7) };
    }
    const len = b.readUInt16BE(i + 2);
    if (len < 2) return null;
    i += 2 + len;
  }
  return null;
}

function webpSize(b: Buffer): Dimensions | null {
  if (b.length < 30) return null;
  const fourcc = b.subarray(12, 16).toString('latin1');
  if (fourcc === 'VP8 ') {
    return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    const w = b[24] | (b[25] << 8) | (b[26] << 16);
    const h = b[27] | (b[28] << 8) | (b[29] << 16);
    return { width: w + 1, height: h + 1 };
  }
  return null;
}

/** Pixel size from the file's own header, or null if we cannot tell. */
export function readDimensions(buffer: Buffer, type: string): Dimensions | null {
  switch (type) {
    case 'image/png': return pngSize(buffer);
    case 'image/jpeg': return jpegSize(buffer);
    case 'image/gif': return gifSize(buffer);
    case 'image/webp': return webpSize(buffer);
    default: return null; // video — not our business here
  }
}

/**
 * Refuses images that are implausibly large in pixels.
 *
 * Returns null when everything is fine, or a sentence to show the visitor.
 * Unknown dimensions are allowed through: we already cap the file size, and
 * refusing everything we cannot parse would reject perfectly ordinary photos
 * whose header we simply do not read.
 */
export function checkDimensions(buffer: Buffer, type: string): string | null {
  const size = readDimensions(buffer, type);
  if (!size) return null;

  if (size.width <= 0 || size.height <= 0) return 'That image looks damaged.';
  if (size.width > MAX_EDGE || size.height > MAX_EDGE) {
    return `That image is ${size.width}×${size.height}. Please keep each side under ${MAX_EDGE} pixels.`;
  }
  if (size.width * size.height > MAX_PIXELS) {
    return 'That image is too large to display. Please use a smaller one.';
  }
  return null;
}

/* ---------------------------- removing metadata ---------------------------- */

function stripJpeg(b: Buffer): Buffer {
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return b;

  const out: Buffer[] = [b.subarray(0, 2)];
  let i = 2;

  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) break;
    const marker = b[i + 1];

    // Start of scan: image data follows to the end, and holds no metadata.
    if (marker === 0xda) {
      out.push(b.subarray(i));
      return Buffer.concat(out);
    }

    const len = b.readUInt16BE(i + 2);
    if (len < 2 || i + 2 + len > b.length) break;

    // APP1 = EXIF and XMP, APP13 = IPTC/Photoshop, APP2 = ICC and friends.
    // APP0 (JFIF) is kept: some decoders expect it, and it holds nothing
    // personal. Everything else passes through untouched.
    const drop = marker === 0xe1 || marker === 0xe2 || marker === 0xed || marker === 0xee;
    if (!drop) out.push(b.subarray(i, i + 2 + len));

    i += 2 + len;
  }

  return Buffer.concat(out.length > 1 ? out : [b]);
}

function stripPng(b: Buffer): Buffer {
  if (b.length < 8) return b;
  const out: Buffer[] = [b.subarray(0, 8)];
  let i = 8;

  // Text and EXIF chunks. Everything structural (IHDR, PLTE, IDAT, IEND …) stays.
  const drop = new Set(['tEXt', 'zTXt', 'iTXt', 'eXIf', 'tIME']);

  while (i + 8 <= b.length) {
    const len = b.readUInt32BE(i);
    const type = b.subarray(i + 4, i + 8).toString('latin1');
    const total = 12 + len; // length + type + data + crc
    if (len > b.length || i + total > b.length) break;

    if (!drop.has(type)) out.push(b.subarray(i, i + total));
    i += total;
    if (type === 'IEND') break;
  }

  return Buffer.concat(out);
}

function stripWebp(b: Buffer): Buffer {
  if (b.length < 12 || b.subarray(0, 4).toString('latin1') !== 'RIFF') return b;

  const out: Buffer[] = [];
  let i = 12;
  const drop = new Set(['EXIF', 'XMP ']);

  while (i + 8 <= b.length) {
    const type = b.subarray(i, i + 4).toString('latin1');
    const len = b.readUInt32LE(i + 4);
    const total = 8 + len + (len % 2); // chunks are padded to even length
    if (i + total > b.length) break;

    if (!drop.has(type)) out.push(b.subarray(i, i + total));
    i += total;
  }

  if (out.length === 0) return b;

  const body = Buffer.concat(out);
  const header = Buffer.alloc(12);
  header.write('RIFF', 0, 'latin1');
  header.writeUInt32LE(4 + body.length, 4); // size counts 'WEBP' plus chunks
  header.write('WEBP', 8, 'latin1');
  return Buffer.concat([header, body]);
}

/**
 * Returns the same image with its metadata removed.
 *
 * Pixels are untouched — nothing is re-encoded, so there is no quality loss and
 * no decoder involved. Anything we do not understand is returned unchanged
 * rather than mangled.
 */
export function stripMetadata(buffer: Buffer, type: string): Buffer {
  try {
    switch (type) {
      case 'image/jpeg': return stripJpeg(buffer);
      case 'image/png': return stripPng(buffer);
      case 'image/webp': return stripWebp(buffer);
      default: return buffer;
    }
  } catch {
    // A malformed file must not take the upload down with it.
    return buffer;
  }
}
