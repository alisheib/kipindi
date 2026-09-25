/**
 * GOOGLE ANALYTICS (GA4) — what the tag is allowed to see. Pure and client-safe, so
 * `test:google-tag` can run every rule without a browser.
 *
 * ⭐ THE PAGE ADDRESS IS THE PERSONAL DATA. A plain GA4 install sends `location.href` with
 * every hit, and on this site several addresses carry a secret or an identifier:
 *   · `/auth/reset-password?token=…` and `/auth/verify-email?token=…` — a live credential;
 *   · `/agent/invite/<token>` — the token is in the PATH, so stripping the query is not enough;
 *   · `/profile/kyc?…&email=…`, `/agent/status?ref=<applicationId>`, `/auth/login?phone=…`;
 *   · `/admin/**` — staff screens, with player ids in the path.
 * So the tag never loads on an EXCLUDED path, a personal id in a path is masked, and the query
 * string keeps only campaign parameters. Everything the tag sends goes through `gaLocation`.
 *
 * ⛔ AN ALLOW-LIST, NOT A DENY-LIST, FOR THE QUERY. A deny-list is correct only until someone adds
 * a parameter; the next `?token=` would leak on the day it ships.
 *
 * Privacy §4 and §7 describe this tag, and `test:privacy-notice` ties them to the constants below:
 * change the cookie lifetime or the hosts and the notice has to move with it.
 */

export const GA_MEASUREMENT_ID = "G-W66WRL67MQ";

/** Only the live site reports. Local, preview and staging hosts never load the tag. */
export const GA_HOSTS: readonly string[] = ["50pick.tz", "www.50pick.tz"];

/** `_ga` / `_ga_<id>` lifetime, seconds: 395 days (13 months). Chrome caps any cookie at 400 days, so
 *  Google's default of two years is not what a player's browser would actually keep. Privacy §7 states it. */
export const GA_COOKIE_DAYS = 395;
export const GA_COOKIE_EXPIRES_SECONDS = GA_COOKIE_DAYS * 24 * 60 * 60;

/** Paths where the tag must not load or send anything — matched as a whole segment prefix. */
export const GA_EXCLUDED_PREFIXES: readonly string[] = [
  "/admin",               // staff console
  "/api",
  "/auth/admin",          // staff sign-in
  "/auth/2fa",            // staff two-factor
  "/auth/reset-password", // ?token= is a live credential
  "/auth/verify-email",   // ?token=
  "/auth/demo",
  "/agent/invite",        // the token is a path segment
  // ⛔ U8's marketing opt-out. The token is a path SEGMENT here too, so stripping the query is
  // no help: a plain GA4 install would send `50pick.tz/s/<token>` to Google on every hit, which
  // is a live opt-out credential for a named person handed to a third party. ⭐ And the leak
  // would be worst exactly where it matters — the people arriving here are the ones who asked
  // to stop being marketed to.
  "/s",
];

/** Paths whose next segment is a player's own record: the id is replaced, the page is still counted. */
export const GA_MASKED_PREFIXES: readonly string[] = ["/wallet/receipt", "/positions"];
export const GA_MASK = ":id"; // survives encodeURI unchanged, unlike "[id]"

/** The only query parameters that reach Google — campaign attribution. */
export const GA_KEPT_PARAMS: readonly string[] = [
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id",
  "gclid", "gbraid", "wbraid",
];

function underPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function gaExcluded(pathname: string): boolean {
  return GA_EXCLUDED_PREFIXES.some((p) => underPrefix(pathname, p));
}

/** A path with any personal-record id masked. */
export function gaPath(pathname: string): string {
  for (const p of GA_MASKED_PREFIXES) {
    if (pathname.startsWith(p + "/") && pathname.length > p.length + 1) {
      const rest = pathname.slice(p.length + 1).split("/");
      rest[0] = GA_MASK;
      return `${p}/${rest.join("/")}`;
    }
  }
  return pathname;
}

/**
 * The address GA may see for `href`: origin + masked path + campaign parameters, no fragment.
 * `null` when the page is excluded or the host is not the live site — the caller sends nothing.
 */
export function gaLocation(href: string): string | null {
  let url: URL;
  try { url = new URL(href); } catch { return null; }
  if (!GA_HOSTS.includes(url.hostname)) return null;
  // Normalise before matching: `/admin/` and `/ADMIN` must not slip past an exact-prefix test.
  let decoded: string;
  try { decoded = decodeURIComponent(url.pathname); } catch { return null; }
  const path = decoded.replace(/\/{2,}/g, "/");
  if (gaExcluded(path.toLowerCase().replace(/\/$/, "") || "/")) return null;
  const kept = new URLSearchParams();
  for (const k of GA_KEPT_PARAMS) {
    const v = url.searchParams.get(k);
    if (v !== null) kept.set(k, v);
  }
  const qs = kept.toString();
  return `${url.origin}${encodeURI(gaPath(path))}${qs ? `?${qs}` : ""}`;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * THE WIRE — what actually leaves the browser.
 *
 * 🔴 `set page_location` DOES NOT GOVERN EVERY HIT. Driven 2026-09-15 with the real gtag.js: the stream's
 * enhanced measurement ("page changes based on browser history events", ON by default in GA admin) sends its
 * OWN page_view on every App Router navigation, built from the RAW `location.href`, with the previous raw
 * address as `dr`. That hit carried `?token=`, `?phone=`, a receipt id and an agent-invitation token, even
 * though every event this component sent was clean, and even with `send_page_view: false`. Google documents
 * no code-side switch. An admin toggle anyone can flip back is not a control, so the guarantee lives here:
 * every request to an analytics host is rewritten by `gaScrubHit` before the browser sends it.
 * ───────────────────────────────────────────────────────────────────────────── */

/** Our page views carry this event parameter; gtag.js's own history page views do not, and are dropped.
 *  The mark is removed before sending, so it never reaches the property. */
export const GA_VIEW_MARK = "kp_view";

const ANALYTICS_HOST = /(^|\.)(google-analytics\.com|analytics\.google\.com|googletagmanager\.com|google\.com)$/i;
/**
 * 🔴 Found LIVE 2026-09-15: gtag.js also sends a copy of each hit to `https://www.google.com/g/collect` (Google's
 * ads-measurement path). The CSP refuses it, but that left the CSP as the ONLY control on a hit this guard never
 * saw, plus a console violation on every page. A hit to google.com is now dropped here: this property is
 * analytics-only (Privacy §4 "not used for advertising"), so there is nothing that endpoint may receive.
 */
const DROPPED_HOST = /(^|\.)google\.com$/i;

/** True for a request to a Google Analytics / Tag Manager host (an absolute URL). */
export function gaIsAnalyticsRequest(url: string): boolean {
  try { return ANALYTICS_HOST.test(new URL(url).hostname); } catch { return false; }
}

/** Events dropped outright: unmarked page views (see above) and site-search results, whose term is read from the raw address. */
function keepEvent(p: URLSearchParams): boolean {
  const en = p.get("en");
  if (en === "view_search_results") return false;
  if (en === "page_view" && p.get(`ep.${GA_VIEW_MARK}`) === null && p.get(`epn.${GA_VIEW_MARK}`) === null) return false;
  return true;
}

/** Every URL-valued parameter scrubbed; `null` when the hit's own page (`dl`) is excluded. */
function scrubParams(p: URLSearchParams): Array<[string, string]> | null {
  const out: Array<[string, string]> = [];
  for (const [k, v] of p) {
    if (k === `ep.${GA_VIEW_MARK}` || k === `epn.${GA_VIEW_MARK}`) continue;
    if (!/^https?:\/\//i.test(v)) { out.push([k, v]); continue; }
    let u: URL;
    try { u = new URL(v); } catch { if (k === "dl") return null; continue; }
    if (GA_HOSTS.includes(u.hostname)) {
      const clean = gaLocation(v);
      if (clean === null) { if (k === "dl") return null; out.push([k, `${u.origin}/`]); continue; }
      out.push([k, clean]);
    } else {
      out.push([k, `${u.origin}${u.pathname}`]);
    }
  }
  return out;
}
const serialise = (pairs: Array<[string, string]>) => pairs.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");

/**
 * One analytics request, as the browser would send it: the URL's shared parameters and, for a batched
 * POST, one event per body line. Returns the request to send instead, or `null` to send nothing.
 * ⛔ Fails closed: an unparseable URL, an excluded page, or a batch with no event left sends nothing.
 */
export function gaScrubHit(url: string, body: string | null | undefined): { url: string; body: string | null } | null {
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (DROPPED_HOST.test(u.hostname)) return null;
  if (!keepEvent(u.searchParams)) return null;
  const shared = scrubParams(u.searchParams);
  if (shared === null) return null;
  const qs = serialise(shared);
  const outUrl = `${u.origin}${u.pathname}${qs ? `?${qs}` : ""}`;
  if (body === null || body === undefined || body === "") return { url: outUrl, body: null };
  const lines: string[] = [];
  for (const line of body.split("\n")) {
    if (!line) continue;
    const p = new URLSearchParams(line);
    if (!keepEvent(p)) continue;
    const clean = scrubParams(p);
    if (clean !== null) lines.push(serialise(clean));
  }
  return lines.length === 0 ? null : { url: outUrl, body: lines.join("\n") };
}

/**
 * The referrer GA may see: an address on this site goes through `gaLocation` (and is dropped if
 * excluded — a reset link must not arrive as the next page's referrer); another site's address is cut to
 * its origin and path, because its query is not ours to forward.
 */
export function gaReferrer(referrer: string): string {
  if (!referrer) return "";
  let url: URL;
  try { url = new URL(referrer); } catch { return ""; }
  if (GA_HOSTS.includes(url.hostname)) return gaLocation(referrer) ?? url.origin + "/";
  return `${url.origin}${url.pathname}`;
}
