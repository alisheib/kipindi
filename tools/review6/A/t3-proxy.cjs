// Review A · t3: which addresses does src/proxy.ts's matcher SKIP (no security headers, no x-pathname)?
// Compiled with Next's own getMiddlewareMatchers, as scripts/proxy-scope.test.mts does. Read-only.
const { readFileSync } = require("node:fs");
const { getMiddlewareMatchers } = require("F:/kipindi-rev/node_modules/next/dist/build/analysis/get-page-static-info.js");
const src = readFileSync("F:/kipindi-rev/src/proxy.ts", "utf8");
const m = /matcher:\s*\[\s*"([^"]+)"/.exec(src);
const matcher = m[1];
console.log("matcher:", matcher);
const res = getMiddlewareMatchers([matcher], {}).map((x) => new RegExp(x.regexp));
const runs = (p) => res.some((r) => r.test(p));
const probes = [
  "/", "/markets/x.png", "/admin/players/x.png",
  "/icons/icon-192.png", "/icons/nope", "/icons/nope.png", "/brand/x", "/og/x", "/pay/x", "/screenshots/x", "/email-signatures/x",
  "/favicon.ico", "/favicon.icon", "/favicon.ico/x", "/faviconXico", "/favicon.svgz",
  "/_next/static/chunks/x.js", "/_next/image",
];
for (const p of probes) console.log((runs(p) ? "proxy RUNS   " : "proxy SKIPPED") + "  " + p);
