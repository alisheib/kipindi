/**
 * test:proxy-scope — THE PROXY RUNS FOR EVERY PAGE ADDRESS; ONLY STATIC FILES SKIP IT.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR (2026-10-09, found by the visual pass's code review). src/proxy.ts's matcher skipped
 * `.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$` — any address ending in an image extension, PAGES included. A page at
 * `/markets/x.png` (a real 200 with the signed-in reader's header) then went out with none of `withSecurityHeaders`'
 * headers — X-Frame-Options DENY, the CSP, HSTS, nosniff, Referrer-Policy; the proxy is their only source — and no
 * `x-pathname`, so it could be framed by another site. The same suffix defect next.config's immutable-cache rule had
 * (hotfix 9cb95938, test:static-cache-scope).
 *
 * It reads the matcher from src/proxy.ts and compiles it with NEXT'S OWN `getMiddlewareMatchers` (the build's
 * middleware analysis), so what it proves is what the server does.
 *   §1 every page address runs the proxy — the ones the old rule skipped, and the app's own routes
 *   §2 public/'s static files, the favicons and Next's build output skip it (they need no page headers)
 *   §3 CONTROL: the old suffix matcher DID skip those pages; a PLANT of it is reported by §1
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { getMiddlewareMatchers } = require("next/dist/build/analysis/get-page-static-info.js") as {
  getMiddlewareMatchers: (m: string | string[], nextConfig: Record<string, unknown>) => { regexp: string }[];
};

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`); }
};

const src = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
const m = /export const config = \{[\s\S]*?matcher:\s*\[\s*("(?:[^"\\]|\\.)*")\s*,?\s*\]/.exec(src);
if (!m) { console.log("  FAIL 0.locate · the matcher literal was not found in src/proxy.ts"); process.exit(1); }
const MATCHER: string = JSON.parse(m[1]);
const runs = (matcher: string) => {
  const re = getMiddlewareMatchers([matcher], {}).map((x) => new RegExp(x.regexp));
  return (path: string) => re.some((r) => r.test(path));
};
const proxy = runs(MATCHER);

console.log("proxy-scope — the proxy runs for every page; only static files skip it");
console.log(`  matcher: ${MATCHER}`);

console.log("§1 · every page address runs the proxy (its security headers, x-pathname, the admin belt)");
const PAGES = [
  "/", "/markets", "/markets/x.png", "/markets/zz-probe.png", "/markets/mexico", "/markets/mkt_1a2b.jpg", "/positions/abc.jpg",
  "/u/federico.svg", "/admin/players/u_1.png", "/admin", "/wallet", "/wallet/receipt/r_1.webp", "/offline", "/account",
  "/results", "/notifications", "/updown/udr_1.gif", "/proposals/prp_9.ico", "/legal/privacy", "/iconsx/a.png", "/brandx/b.svg",
  "/pay-now", "/og-preview", "/auth/login", "/s/campaign.png",
];
const skipped = PAGES.filter((p) => !proxy(p));
ok(`1.1 · all ${PAGES.length} page addresses run the proxy`, skipped.length === 0, skipped.join(" · "));

console.log("§2 · static files skip it");
const PUBLIC = join(process.cwd(), "public");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const FOLDERS = ["icons", "brand", "pay", "og", "screenshots", "email-signatures"];
const files = FOLDERS.flatMap((f) => walk(join(PUBLIC, f)).map((p) => "/" + p.slice(PUBLIC.length + 1).split("\\").join("/")));
const ran = files.filter((f) => proxy(f));
ok(`2.1 · every file under public/${FOLDERS.join(", public/")} skips the proxy (${files.length} files)`, files.length > 0 && ran.length === 0, ran.slice(0, 5).join(" "));
ok("2.2 · the favicons and Next's build output and image optimiser skip it",
  ["/favicon.ico", "/favicon.svg", "/_next/static/chunks/main-abc.js", "/_next/static/media/sora.woff2", "/_next/image"].every((p) => !proxy(p)));

console.log("§3 · the control and the plant");
const OLD = "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)";
const oldRuns = runs(OLD);
ok("3.1 CONTROL · the old suffix matcher skipped pages: /markets/x.png, /positions/abc.jpg, /u/federico.svg ran no proxy",
  ["/markets/x.png", "/positions/abc.jpg", "/u/federico.svg"].every((p) => !oldRuns(p)) && oldRuns("/markets"));
ok("3.2 PLANT · the old suffix matcher put back is reported by §1", PAGES.some((p) => !oldRuns(p)));

console.log(`proxy-scope: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
