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
};

export default config;
