import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  // Framework and version disclosure on every response, and the first line of
  // most scanner reports. The security headers that must STAY are set in
  // src/proxy.ts — this removes one header without touching those.
  poweredByHeader: false,
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
  // Long-lived cache for static assets served from `public/` — fonts, images, icons.
  //
  // 🔴 THE `/_next/static/:path*` RULE WAS DELETED HERE 2026-09-06, and it was redundant, not
  // wrong. Next.js already serves those paths with exactly `public, max-age=31536000, immutable`
  // — MEASURED, not assumed: the rule was removed, `next start` run against the real build, and
  // `curl -I /_next/static/chunks/<hash>.js` returned that header unchanged.
  //
  // ⛔ Its only remaining effect was the cost: declaring it made every build print
  // *"Custom Cache-Control headers detected … can break Next.js development behavior"*, and in
  // `next dev` a year-long immutable on chunk paths is exactly how a developer ends up staring
  // at a stale bundle. A config line that duplicates the framework's own default and buys a
  // warning is pure cost.
  //
  // ⚠️ The rule BELOW is not redundant and stays: `public/` assets are not content-hashed by
  // Next, so nothing sets a long cache on them unless we do.
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default config;
