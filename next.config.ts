import type { NextConfig } from "next";
import { SERVER_ACTION_BODY_LIMIT } from "./src/lib/media/config";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Only this account's delivery URLs may be optimized by next/image (no broad wildcard).
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: cloudName
      ? [{ protocol: "https", hostname: "res.cloudinary.com", pathname: `/${cloudName}/image/upload/**` }]
      : [],
  },
  experimental: {
    // Uploads go through a Server Action; allow the max image size plus multipart overhead.
    serverActions: { bodySizeLimit: SERVER_ACTION_BODY_LIMIT },
    // proxy.ts matches /admin/*, and Next buffers (and truncates) request bodies it proxies at 10 MB by default.
    proxyClientMaxBodySize: SERVER_ACTION_BODY_LIMIT,
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Personal memory books must never be indexed, whatever the page metadata says.
      { source: "/m/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] },
    ];
  },
};

export default nextConfig;
