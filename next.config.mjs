/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Allow images from any https source (Supabase Storage, client CDNs, etc.)
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
  },
  // Keeps the app portable across Vercel / Netlify / Cloudflare / self-host.
  // No host-specific adapters are used anywhere in this codebase.
};

export default nextConfig;
