/**
 * test:static-cache-scope — ONLY STATIC FILES ARE SENT A ONE-YEAR `immutable` CACHE; NO PAGE ADDRESS EVER IS.
 *
 * 🔴 THE DEFECT THIS EXISTS FOR (2026-10-09, measured on production). next.config.ts's headers() sent
 * `public, max-age=31536000, immutable` to `/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)`. A path-to-regexp group
 * needs no dot, so that source matched PAGES: `/markets/<anything>.png` answered 200 text/html with the header, and
 * Cloudflare stored it (`cf-cache-status: HIT` on the second request) — a signed-in reader sent such a link could have
 * their page (the header's name, masked phone and balance) kept at the edge for the next visitor of the same address —
 * and `/markets/mexico`, `/u/federico`, any address ending in those letters, was kept by the browser for a year.
 *
 * It reads the rules from next.config.ts itself (its default export's headers()) and matches with NEXT'S OWN matcher
 * (`getPathMatch`, as the server compiles a header's source), so what it proves is what the server does.
 *   §1 every immutable source is a real folder or file under public/, or Next's hashed build output
 *   §2 every file under those folders, and the favicons, still match (the assets keep their long cache)
 *   §3 no page address matches — the addresses the old rule caught, and the app's own routes
 *   §4 CONTROL: the old suffix rule DOES match those pages (the matcher sees what production saw), and a PLANT of it
 *      back into the list is reported by §3
 */
import { readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import * as configModule from "../next.config.ts";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match.js") as {
  getPathMatch: (path: string, options?: Record<string, unknown>) => (pathname: string) => false | Record<string, unknown>;
};

let pass = 0, fail = 0;
const ok = (name: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n         ${detail}` : ""}`); }
};
const IMMUTABLE = "public, max-age=31536000, immutable";
const PUBLIC = join(process.cwd(), "public");

type Rule = { source: string; headers: { key: string; value: string }[] };
// next.config.ts loads as CommonJS under tsx, so its default export may arrive one level down.
const config = ((configModule as { default?: { default?: unknown } }).default?.default ?? (configModule as { default?: unknown }).default) as { headers: () => Promise<Rule[]> };
const rules = (await config.headers()) ?? [];
const immutableSources = rules.filter((r) => r.headers.some((h) => h.key.toLowerCase() === "cache-control" && h.value === IMMUTABLE)).map((r) => r.source);
/** As the server compiles a header's source (custom routes: strict, unnamed params removed). */
const matcherOf = (source: string) => getPathMatch(source, { strict: true, removeUnnamedParams: true });
const matchesAny = (sources: readonly string[], path: string) => sources.find((s) => matcherOf(s)(path) !== false) ?? null;

console.log("static-cache-scope — the one-year immutable cache is for static files only");

console.log("§1 · every immutable source names a real static place");
ok("1.locate · next.config.ts's headers() sends the immutable cache to at least the build output", immutableSources.includes("/_next/static/:path*"), immutableSources.join(" "));
for (const s of immutableSources) {
  if (s === "/_next/static/:path*") continue;
  const folder = /^\/([a-z0-9-]+)\/:path\*$/.exec(s);
  const file = /^\/([a-z0-9.-]+)$/.exec(s);
  const real = folder ? existsSync(join(PUBLIC, folder[1])) && statSync(join(PUBLIC, folder[1])).isDirectory()
    : file ? existsSync(join(PUBLIC, file[1])) && statSync(join(PUBLIC, file[1])).isFile() : false;
  ok(`1.real · ${s} is ${folder ? "a folder" : file ? "a file" : "NEITHER a folder nor a file"} under public/`, real);
}

console.log("§2 · the static files keep their long cache");
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const staticFolders = immutableSources.map((s) => /^\/([a-z0-9-]+)\/:path\*$/.exec(s)?.[1]).filter((x): x is string => !!x && x !== "_next");
const files = staticFolders.flatMap((f) => walk(join(PUBLIC, f)).map((p) => "/" + p.slice(PUBLIC.length + 1).split("\\").join("/")));
const unmatched = files.filter((f) => !matchesAny(immutableSources, f));
ok(`2.1 · every file in ${staticFolders.join(", ")} matches (${files.length} files)`, files.length > 0 && unmatched.length === 0, unmatched.slice(0, 5).join(" "));
ok("2.2 · the favicons and a hashed chunk match", ["/favicon.ico", "/favicon.svg", "/_next/static/chunks/main-abc123.js", "/_next/static/media/sora.woff2"].every((p) => matchesAny(immutableSources, p)));
ok("2.3 · the service worker and the manifest are NOT immutable (they must revalidate)", !matchesAny(immutableSources, "/sw.js") && !matchesAny(immutableSources, "/manifest.json"));

console.log("§3 · no page address is ever sent the immutable cache");
const PAGES = [
  "/", "/markets", "/markets/x.png", "/markets/zz-cache-probe.png", "/markets/mexico", "/markets/mkt_1a2b3c.jpg",
  "/u/federico", "/u/ana.svg", "/positions/abc.png", "/positions/performance", "/wallet", "/wallet/receipt/r_1.svg",
  "/admin/players/u_1.png", "/profile.ico", "/offline", "/account", "/results", "/notifications", "/updown/udr_1.webp",
  "/proposals/prp_9.avif", "/legal/privacy", "/help", "/s/campaign.png", "/brandx/logo.png", "/iconsx/a.png",
];
const leaks = PAGES.filter((p) => matchesAny(immutableSources, p));
ok(`3.1 · none of ${PAGES.length} page addresses matches an immutable source`, leaks.length === 0, leaks.map((p) => `${p} ← ${matchesAny(immutableSources, p)}`).join(" · "));

console.log("§4 · the control and the plant");
const OLD = "/:all*(svg|jpg|jpeg|png|webp|avif|ico|woff|woff2)";
ok("4.1 CONTROL · the old suffix rule matches the pages production cached (/markets/x.png, /markets/mexico, /u/federico)",
  ["/markets/x.png", "/markets/mexico", "/u/federico", "/positions/abc.png"].every((p) => matcherOf(OLD)(p) !== false));
const planted = [...immutableSources, OLD];
ok("4.2 PLANT · the old suffix rule put back into the list is reported by §3", PAGES.some((p) => matchesAny(planted, p)));

console.log(`static-cache-scope: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
