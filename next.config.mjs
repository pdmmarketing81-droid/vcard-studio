/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // This app renders every image with a plain <img>, never next/image — the
    // heavy lifting is done at upload time by lib/compress.ts instead.
    //
    // The previous config allowed remote images from ANY https host. That left
    // /_next/image open as a public image-fetching proxy: anyone could point it
    // at arbitrary URLs and make the server download and re-encode them, which
    // is both a DoS vector and an SSRF-ish one. Since the optimizer isn't used,
    // the safest thing is to switch it off and allow no remote hosts at all.
    unoptimized: true,
    remotePatterns: [],
  },

  // Don't advertise the framework version to every visitor.
  poweredByHeader: false,

  // Keeps the app portable across Vercel / Netlify / Cloudflare / self-host.
  // No host-specific adapters are used anywhere in this codebase.
};

export default nextConfig;
