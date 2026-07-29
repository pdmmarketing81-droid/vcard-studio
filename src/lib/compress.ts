/**
 * Client-side image compression, done before the file ever leaves the browser.
 *
 * Clients upload straight off a phone: 4–8 MB, 4000px wide, for a slot that
 * displays at 400px on a screen. Without this the visitor downloads all of it,
 * which is by far the worst thing for load time on Indian mobile data — and it
 * burns Supabase storage and egress for no benefit.
 *
 * Resizing to the largest size the layout can actually use and re-encoding as
 * WebP typically turns 4 MB into 120–200 KB with no visible difference.
 *
 * Compression happens in the browser rather than on the server on purpose:
 * the bytes never cross the network, so the upload itself is also ~20x faster
 * on a slow connection.
 */

/** Longest edge, per kind of image. */
export const MAX_EDGE: Record<string, number> = {
  covers: 1600,
  gallery: 1600,
  services: 1000,
  packages: 1000,
  logos: 600,
  testimonials: 300,
  misc: 1400,
};

export interface CompressResult {
  file: File;
  originalBytes: number;
  finalBytes: number;
  skipped: boolean;
}

const PASSTHROUGH = /^(image\/svg\+xml|image\/gif|video\/)/;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read that image'));
    };
    img.src = url;
  });
}

export async function compressImage(
  file: File,
  folder: string,
  quality = 0.82
): Promise<CompressResult> {
  const originalBytes = file.size;

  // Animated GIFs would lose their animation, SVG is already tiny and vector,
  // and video needs a real encoder — all pass through untouched.
  if (PASSTHROUGH.test(file.type) || typeof document === 'undefined') {
    return { file, originalBytes, finalBytes: originalBytes, skipped: true };
  }

  try {
    const img = await loadImage(file);
    const maxEdge = MAX_EDGE[folder] ?? MAX_EDGE.misc;
    const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));

    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas unavailable');

    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality)
    );

    // If WebP isn't supported, or the re-encode came out bigger (already
    // well-optimised source), keep the original.
    if (!blob || blob.size >= originalBytes) {
      return { file, originalBytes, finalBytes: originalBytes, skipped: true };
    }

    const name = file.name.replace(/\.[^.]+$/, '') + '.webp';
    return {
      file: new File([blob], name, { type: 'image/webp', lastModified: Date.now() }),
      originalBytes,
      finalBytes: blob.size,
      skipped: false,
    };
  } catch {
    // Never block an upload because compression failed.
    return { file, originalBytes, finalBytes: originalBytes, skipped: true };
  }
}

export function kb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}
