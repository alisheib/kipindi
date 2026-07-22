import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Types are enforced at build (tsc --noEmit is clean as of 2026-06-06).
  // If Next 16's stricter server-action return-type checking trips the build,
  // revert this to `true` and rely on `npm run typecheck`.
  typescript: { ignoreBuildErrors: false },
  // Externalise dependencies the Next server bundler shouldn't webpack.
  // pdfkit uses fs.readFileSync for its AFM font metrics; exceljs has CJS-only
  // edge cases; @aws-sdk/client-s3 is lazily imported by src/lib/server/storage.ts
  // for R2 KYC storage and MUST be external so the bundled server can resolve it
  // at runtime (otherwise every KYC document upload/view crashes — fixed 2026-07-22).
  serverExternalPackages: ["pdfkit", "exceljs", "@aws-sdk/client-s3"],
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
