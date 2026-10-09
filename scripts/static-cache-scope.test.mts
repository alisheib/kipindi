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
 *   §5 EVERY RESPONSE CARRIES THE STATIC SECURITY HEADERS (review 6, A4 · 2026-10-09): headers() sends the proxy's list —
 *      all but the CSP, HSTS in production — on `/:path*`, which Next's own matcher sends to every address, so what the
 *      proxy's matcher skips (a missing file under /icons/, /brand/, /og/…: the root not-found, in the signed-in shell,
 *      once frameable) carries them too; the proxy sends the very same list; CONTROL and PLANTS
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import * as configModule from "../next.config.ts";
import { PROD_HEADERS, SECURITY_HEADERS } from "../src/lib/security-headers.ts";

const require = createRequire(import.meta.url);
const { getPathMatch } = require("next/dist/shared/lib/router/utils/path-match.js") as {
  getPathMatch: (path: string, options?: Record<string, unknown>) => (pathname: string) => false | Record<string, unknown>;
};
const { modifyRouteRegex } = require("next/dist/lib/redirect-status.js") as { modifyRouteRegex: (regex: string, restricted?: string[]) => string };

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
/** As the server compiles a header's source (custom routes: strict, unnamed params removed, and the route regex
 *  modified as `router-utils/filesystem.js` modifies it — an optional trailing slash, so `/:path*` also matches `/`;
 *  review 6, A4: without the modifier the suite read `/` as unreached where the server reaches it). */
const matcherOf = (source: string) => getPathMatch(source, { strict: true, removeUnnamedParams: true, regexModifier: (r: string) => modifyRouteRegex(r) });
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

console.log("§5 · every response carries the static security headers (all but the CSP)");
/** headers() as each environment reads it (it asks NODE_ENV when called): HSTS is production's alone. */
const env = process.env as Record<string, string | undefined>;
const rulesIn = async (mode: "development" | "production"): Promise<Rule[]> => {
  const was = env.NODE_ENV;
  env.NODE_ENV = mode;
  try { return (await config.headers()) ?? []; } finally { if (was === undefined) delete env.NODE_ENV; else env.NODE_ENV = was; }
};
const devRules = await rulesIn("development"), prodRules = await rulesIn("production");
const lower = (hs: { key: string; value: string }[]) => Object.fromEntries(hs.map((h) => [h.key.toLowerCase(), h.value]));
const listFor = (production: boolean) => lower(Object.entries({ ...SECURITY_HEADERS, ...(production ? PROD_HEADERS : {}) }).map(([key, value]) => ({ key, value })));
const sameMap = (a: Record<string, string>, b: Record<string, string>) => JSON.stringify(Object.entries(a).sort()) === JSON.stringify(Object.entries(b).sort());
/** The rule that carries the security headers (found by its X-Frame-Options, whatever its source). */
const securityRule = (rs: Rule[]) => rs.find((r) => r.headers.some((h) => h.key.toLowerCase() === "x-frame-options")) ?? null;
const sendsList = (rs: Rule[], production: boolean) => { const r = securityRule(rs); return !!r && r.source === "/:path*" && sameMap(lower(r.headers), listFor(production)); };
const withCsp = (rs: Rule[]) => rs.filter((r) => r.headers.some((h) => h.key.toLowerCase() === "content-security-policy")).map((r) => r.source);
/** Every address a response can go to: the pages, every static file, the favicons, the build output, and the static
 *  folders' not-founds — the ones the proxy's matcher skips (test:proxy-scope §2). */
const ADDRESSES = [...PAGES, ...files, "/favicon.ico", "/favicon.svg", "/_next/static/chunks/main-abc123.js", "/_next/image",
  "/icons/nope", "/icons/nope.png", "/brand/x", "/og/x", "/pay/x", "/screenshots/x", "/email-signatures/x"];
const unreached = (rs: Rule[]) => { const r = securityRule(rs); if (!r) return ADDRESSES; const m = matcherOf(r.source); return ADDRESSES.filter((p) => m(p) === false); };
ok(`5.1 · headers() sends src/lib/security-headers.ts' list on /:path* — ${Object.keys(SECURITY_HEADERS).length} headers in development, ${Object.keys(SECURITY_HEADERS).length + Object.keys(PROD_HEADERS).length} with HSTS in production — exactly`,
  sendsList(devRules, false) && sendsList(prodRules, true), JSON.stringify({ dev: securityRule(devRules)?.headers.map((h) => h.key), prod: securityRule(prodRules)?.headers.map((h) => h.key) }));
ok("5.2 · …and never the CSP: it stays the proxy's (it depends on the request — `upgrade-insecure-requests` only over HTTPS)",
  withCsp(devRules).length === 0 && withCsp(prodRules).length === 0, [...withCsp(devRules), ...withCsp(prodRules)].join(" "));
const missed = unreached(devRules);
ok(`5.3 · Next's own matcher sends that rule to all ${ADDRESSES.length} addresses — every page, every static file (${files.length}), the favicons, the build output and the static folders' not-founds the proxy skips`,
  missed.length === 0, missed.slice(0, 6).join(" · "));
const proxySrc = readFileSync(join(process.cwd(), "src/proxy.ts"), "utf8");
const proxyOwnHeaders = (s: string) => /\bconst\s+(?:SECURITY|PROD)_HEADERS\b/.test(s) || /["']X-Frame-Options["']\s*:/.test(s) || /["']Strict-Transport-Security["']\s*:/.test(s);
const proxySendsList = (s: string) => s.includes('import { PROD_HEADERS, SECURITY_HEADERS } from "@/lib/security-headers";')
  && /for \(const \[k, v\] of Object\.entries\(SECURITY_HEADERS\)\) res\.headers\.set\(k, v\);/.test(s)
  && /for \(const \[k, v\] of Object\.entries\(PROD_HEADERS\)\) res\.headers\.set\(k, v\);/.test(s) && !proxyOwnHeaders(s);
ok("5.4 · src/proxy.ts sends the very same list — imported from src/lib/security-headers.ts, every header and HSTS set in withSecurityHeaders, none defined there — so the two senders cannot drift apart",
  proxySendsList(proxySrc));
ok("5.5 · the list holds what review 6 found missing: X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP; HSTS in production",
  SECURITY_HEADERS["X-Frame-Options"] === "DENY" && SECURITY_HEADERS["X-Content-Type-Options"] === "nosniff" && !!SECURITY_HEADERS["Referrer-Policy"]
    && !!SECURITY_HEADERS["Permissions-Policy"] && SECURITY_HEADERS["Cross-Origin-Opener-Policy"] === "same-origin" && /max-age=\d+/.test(PROD_HEADERS["Strict-Transport-Security"] ?? ""));
/** The headers a response to `path` is sent, as Next applies every matching rule. */
const headersAt = (rs: Rule[], path: string) => lower(rs.filter((r) => matcherOf(r.source)(path) !== false).flatMap((r) => r.headers));
const round5 = devRules.filter((r) => r !== securityRule(devRules));
ok("5.6 CONTROL · without that rule (round 5's headers()), a missing file under a static folder — the proxy skips it — was sent no X-Frame-Options; with it, it is",
  !headersAt(round5, "/icons/nope")["x-frame-options"] && !headersAt(round5, "/brand/x")["x-frame-options"] && headersAt(devRules, "/icons/nope")["x-frame-options"] === "DENY");
const plantRule = (edit: (r: Rule) => Rule) => devRules.map((r) => (r === securityRule(devRules) ? edit(r) : r));
ok("5.7 PLANT · the rule taken out is reported by 5.1 and 5.3; X-Frame-Options dropped from it, by 5.1",
  !sendsList(round5, false) && unreached(round5).length === ADDRESSES.length
    && !sendsList(plantRule((r) => ({ ...r, headers: r.headers.filter((h) => h.key !== "X-Frame-Options") })), false));
ok("5.8 PLANT · a CSP put into it is reported by 5.2; its source narrowed to /:path+ (no \"/\") by 5.3; a header of the proxy's own back in proxy.ts by 5.4",
  withCsp(plantRule((r) => ({ ...r, headers: [...r.headers, { key: "Content-Security-Policy", value: "default-src 'self'" }] }))).length === 1
    && unreached(plantRule((r) => ({ ...r, source: "/:path+" }))).includes("/")
    && !proxySendsList(proxySrc.replace("// The static security headers", 'const SECURITY_HEADERS = { "X-Frame-Options": "DENY" };\n// The static security headers')));

console.log(`static-cache-scope: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
