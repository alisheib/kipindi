// R6-B · A4: does NEXT ITSELF load next.config.ts with its new import of ./src/lib/security-headers?
// It runs Next's own config transpiler (`transpileConfig`, next/dist/build/next-config-ts — the path `next build`,
// `next dev` and `next start` take for a next.config.ts) and then Next's own custom-route loader and validator
// (`loadCustomRoutes`, which `next build` runs on headers()). No build, no server: a SWC transform and a require.
// Run from the worktree (cwd F:/kipindi-r6b):  node <this file> [production]
const path = require("node:path");
const ROOT = "F:/kipindi-r6b";
if (process.argv[2] === "production") process.env.NODE_ENV = "production";
const { transpileConfig } = require(path.join(ROOT, "node_modules/next/dist/build/next-config-ts/transpile-config.js"));
const loadCustomRoutes = require(path.join(ROOT, "node_modules/next/dist/lib/load-custom-routes.js")).default;
(async () => {
  const mod = await transpileConfig({ nextConfigPath: path.join(ROOT, "next.config.ts"), dir: ROOT });
  const config = mod && mod.default ? mod.default : mod;
  console.log(`NODE_ENV=${process.env.NODE_ENV ?? "(unset)"} · transpileConfig loaded next.config.ts: headers() is ${typeof config.headers}`);
  const raw = await config.headers();
  const all = raw.find((r) => r.source === "/:path*");
  console.log(`headers(): ${raw.length} rules · /:path* → ${all ? all.headers.map((h) => h.key).join(", ") : "MISSING"}`);
  const routes = await loadCustomRoutes({ ...config, basePath: "", i18n: null, trailingSlash: false, experimental: config.experimental ?? {} });
  const checked = routes.headers.find((r) => r.source === "/:path*");
  console.log(`loadCustomRoutes validated ${routes.headers.length} header rules · /:path* kept: ${!!checked} · CSP in it: ${!!checked && checked.headers.some((h) => /content-security-policy/i.test(h.key))}`);
})().catch((e) => { console.error("FAILED:", e && e.stack ? e.stack : e, e && e.cause ? `\ncause: ${e.cause.stack ?? e.cause}` : ""); process.exit(1); });
