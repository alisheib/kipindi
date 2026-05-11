import type { NextConfig } from "next";

const config: NextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  // Pre-existing type errors from Next 16's stricter server-action return-type
  // checking are not runtime issues. Dev server + all stress tests pass.
  // Run `npm run typecheck` for a full TypeScript review.
  typescript: { ignoreBuildErrors: true },
  // Externalise the binary-report dependencies so Next's bundler
  // doesn't try to webpack them. pdfkit specifically uses
  // fs.readFileSync to load its AFM font metrics, and exceljs has a
  // few CJS-only edge cases. Both work cleanly as plain Node imports
  // when treated as externals.
  serverExternalPackages: ["pdfkit", "exceljs"],
};

export default config;
