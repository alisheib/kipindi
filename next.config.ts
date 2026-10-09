import type { NextConfig } from "next";

/** The only addresses sent a one-year `immutable` cache: public/'s own static folders and files, and Next's hashed build
 *  output. Exact folders, never a file-name suffix (see `headers()` below; `test:static-cache-scope`). */
const IMMUTABLE_STATIC_SOURCES = [
  "/icons/:path*",
  "/brand/:path*",
  "/pay/:path*",
  "/og/:path*",
  "/screenshots/:path*",
  "/email-signatures/:path*",
  "/favicon.ico",
  "/favicon.svg",
  "/_next/static/:path*",
] as const;

const config: NextConfig = {
  reactStrictMode: true,
  // Framework and version disclosure on every response, and the first line of
  // most scanner reports. The security headers that must STAY are set in
  // src/proxy.ts — this removes one header without touching those.
  poweredByHeader: false,
  typedRoutes: true,
  /**
   * 🔴 VERSION SKEW — THE BUILD'S OWN IDENTITY. Added 2026-09-12 after a LIVE defect.
   *
   * ⛔ WHAT HAPPENED. Every `next build` mints new Server Action ids. A player who
   * already had a page open still holds the PREVIOUS build's ids, so the first thing
   * they click after a deploy posts an id this server has never heard of, and Next
   * throws `Failed to find Server Action "…". This request might be from an older or
   * newer deployment.` That is an unhandled server error, so the route's error boundary
   * catches it and the player is told *"This page has encountered a problem. Your funds
   * are safe."* — on the deposit page, mid money-in. Observed on production.
   *
   * ⭐ IT BITES THE KYC → DEPOSIT JOURNEY HARDEST, WHICH IS WHY IT SURFACED THERE.
   * That flow has a pause built into it, measured in minutes or hours: submit identity,
   * leave for the inbox, confirm the address, come back to the tab that is still open.
   * Any deploy inside that window stales their page, and on a launch day of frequent
   * deploys that window is nearly always crossed.
   *
   * ⚠️ THIS LINE ALONE IS NOT THE FIX, AND MUST NOT BE READ AS ONE. Railway serves
   * exactly one version at a time, so there is no older deployment left for a stale
   * request to be routed back to. What it buys is IDENTITY: Next stamps asset URLs with
   * `?dpl=`, sends `x-deployment-id` on RSC and Server Action requests, and exposes the
   * value to the browser as `globalThis.NEXT_DEPLOYMENT_ID`. That last part is
   * load-bearing — it is what lets `RouteError` tell "this tab is running against a
   * build that has since been replaced" apart from "this page is genuinely broken", and
   * therefore recover ONCE instead of looping. See src/components/ui/route-error.tsx.
   *
   * ⛔ MUST BE STABLE ACROSS THE WHOLE BUILD and different between builds. The commit
   * sha is both. ⛔ Never a timestamp or a random value: the server and the client
   * bundle are produced in one pass but read this at different moments, and a value
   * that moved between them would make every request look stale to every client,
   * forever. Undefined locally, which is correct — a laptop build has no deployment.
   */
  deploymentId:
    process.env.RAILWAY_GIT_COMMIT_SHA ||
    process.env.RAILWAY_DEPLOYMENT_ID ||
    undefined,
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
  // Long-lived cache for STATIC FILES ONLY: the folders and files under public/, and Next's hashed build output
  // (fonts come from next/font, under /_next/static/media). `IMMUTABLE_STATIC_SOURCES` is the list.
  // ⛔ NEVER A SUFFIX MATCH (2026-10-09, hotfix). This was one rule, `/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)`,
  // and a path-to-regexp group needs no dot, so it matched PAGES too — `/markets/x.png`, `/markets/mexico`,
  // `/u/federico` — and sent their HTML `public, max-age=31536000, immutable`. Measured on production the same day:
  // `/markets/<anything>.png` answered 200 text/html with that header, and Cloudflare stored it (`cf-cache-status: HIT`
  // on the second request) — so a signed-in reader sent such a link could have their page (the header's name, masked
  // phone and balance) kept at the edge for the next visitor of the same address; and a browser kept any page whose
  // address merely ended in those letters for a year without asking again. `test:static-cache-scope` holds every source
  // to a real folder or file under public/ and proves, with Next's own matcher, that no page address matches.
  async headers() {
    return [
      ...IMMUTABLE_STATIC_SOURCES.map((source) => ({
        source,
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      })),
    ];
  },
};

export default config;
