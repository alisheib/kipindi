import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Types are enforced at build (tsc --noEmit is clean as of 2026-06-06).
  // If Next 16's stricter server-action return-type checking trips the build,
  // revert this to `true` and rely on `npm run typecheck`.
  typescript: { ignoreBuildErrors: false },
  // Externalise the binary-report dependencies so Next's bundler
  // doesn't try to webpack them. pdfkit specifically uses
  // fs.readFileSync to load its AFM font metrics, and exceljs has a
  // few CJS-only edge cases. Both work cleanly as plain Node imports
  // when treated as externals.
  serverExternalPackages: ["pdfkit", "exceljs"],
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  images: {
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // Long-lived cache for static assets (fonts, images, JS chunks).
  // Next.js auto-hashes _next/static paths, so 1-year immutable is safe.
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default config;
