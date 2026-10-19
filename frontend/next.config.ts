import type { NextConfig } from 'next';

// Images come from two places: local sample files in public/images (incl. SVGs)
// and admin-uploaded product photos on Cloudinary. next/image optimises both:
// local files are served/resized from public/, Cloudinary needs an allow-rule.
// dangerouslyAllowSVG is needed because the sample kids/accessory photos are SVG;
// it's safe here (our own first-party files + the owner's Cloudinary), and the
// CSP + attachment disposition stop an SVG from executing as a page.
const nextConfig: NextConfig = {
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'res.cloudinary.com' }],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
