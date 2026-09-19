/**
 * Edge proxy — security headers + path-forward + auth gate.
 * Renamed from `middleware.ts` per Next 16 file-convention change.
 *
 * Compliance:
 *  - Strict CSP (script tightening planned for prod with nonces)
 *  - HSTS on production HTTPS
 *  - Frame busting (X-Frame-Options DENY)
 *  - MIME sniffing off (X-Content-Type-Options nosniff)
 *  - Referrer trim (strict-origin-when-cross-origin)
 *  - Permissions-Policy locks dangerous APIs
 *  - Cross-Origin-Opener-Policy hardens against window.opener
 *  - Audit logging happens in route handlers (request body required)
 *
 * Auth gate (defence in depth):
 *  - 307s unauthenticated requests for /wallet, /positions, /profile,
 *    /admin to /auth/login?next=<original> at the edge so no protected
 *    body ever leaves Next. Pages still call currentSession() and
 *    re-redirect — the edge guarantee is on top of, not instead of.
 */
import { NextResponse, type NextRequest } from "next/server";
// Pure + client-safe by its own header (no DB, no server-only imports), so the Edge runtime can use it.
// Importing it rather than re-listing the staff roles here keeps ONE source of truth for "who is staff".
import { isStaffRole } from "@/lib/server/roles";

// Must match COOKIE_NAME in src/lib/server/session.ts
const SESSION_COOKIE = "kp_session";

// Private, user-scoped surfaces get edge protection (defence-in-depth on top of
// each page's own session check). `/watchlist` and `/proposals/new` are
// user-specific too, so they belong here (audit 2026-07-17). Public `/proposals`
// (list) and `/proposals/[id]` stay open; only the `/new` composer is gated.
// ⛔ `/agent` ITSELF IS NOT HERE, AND THAT IS DELIBERATE. The matcher below is a PREFIX match,
// so a bare `/agent` entry would also close `/agent` — the programme's only public discovery
// door, linked from the site footer and readable signed out. The two user-scoped pages under
// it are registered as SIBLINGS. `/agent/invite/[token]` stays open too: an invitee may not
// have an account yet, and the page itself demands sign-in with the bound phone before
// anything happens. `test:agent-application-security` §proxy asserts all three directions.
const PROTECTED_PREFIXES = ["/wallet", "/positions", "/profile", "/watchlist", "/proposals/new", "/updown/history", "/admin", "/agent/apply", "/agent/status"];
/** Exported for the guard — the rule is the prefix match, and a guard must read the real one. */
export function isProtectedPath(pathname: string): boolean {
  return isProtected(pathname);
}
function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
}

// Edge-runtime HMAC verifier. The session cookie format is "payload.mac"
// where payload is base64url-encoded JSON of SessionData and mac is
// base64url HMAC-SHA-256 of payload using SESSION_SECRET.
//
// Why verify here AND inside currentSession()? Because the root
// app/loading.tsx Suspense-wraps every page render, so a page-level
// `redirect()` cannot change the HTTP status that's already been
// streamed as 200. A forged cookie that passes the shape check would
// see a 200 OK from /wallet with login-page content in the body —
// confusing UX and a false "200 = public" signal to scrapers.
//
// Verifying here, BEFORE the page render starts, lets us issue a
// clean 307 with no Suspense interference.
function b64uToBytes(s: string): Uint8Array {
  // Restore base64 padding + alphabet — base64url uses - _ instead of + /.
  const std = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = std.length % 4 === 0 ? std : std + "=".repeat(4 - (std.length % 4));
  const bin = atob(pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function timingSafeEq(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a[i] ^ b[i];
  return r === 0;
}
/**
 * W25 BELT 1 — the verified payload, not just a yes/no.
 *
 * ⛔ WHY THIS REPLACED A BOOLEAN. Until W25 this returned `true`/`false` and the only questions asked of a protected
 * path were "does the HMAC match" and "has `exp` passed" — a session-EXISTS gate, not a role gate. Measured on the
 * unfixed build by `qa:platform-pii-probe`: two ordinary PLAYER accounts received another player's display name and
 * stake from 13 admin route instances, every one a 200, in plain document mode as well as both flight modes. The role
 * was already decoded here and thrown away by the `as { exp?: number }` cast — this widens the cast and keeps it.
 *
 * ⚠️ THE COOKIE'S ROLE IS A PHOTOGRAPH, NOT A FACT. `src/lib/server/session.ts:57-63` says so of the sibling field
 * `kycStatus`, and it is just as true of `role`: a demotion never reaches an already-minted cookie. So this belt is
 * deliberately COARSE and SUBTRACTIVE — it refuses an account whose own cookie admits it is not staff, and it is not,
 * and must never be described as, a replacement for the live-row check. Belt 2 (the per-page stored-row gate) answers
 * the demoted-cookie question; the Edge runtime cannot reach the database to answer it here.
 */
async function readVerifiedSession(token: string | undefined): Promise<{ role?: string } | null> {
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return null;
  const b64 = token.slice(0, dot);
  const mac = token.slice(dot + 1);
  // Web Crypto HMAC. Same key as src/lib/server/crypto.ts's
  // sessionSecret() — dev fallback string + prod env var.
  // Production: SESSION_SECRET MUST be set. Dev: deterministic fallback
  // so `npm run dev` works without .env.local (same value as crypto.ts).
  const secret = process.env.SESSION_SECRET
    || (process.env.NODE_ENV === "production"
        ? (() => { throw new Error("FATAL: SESSION_SECRET not set in production"); })()
        : "dev-only-secret-replace-in-prod-32chars-minimum");
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(b64));
    const expected = new Uint8Array(sig);
    let actual: Uint8Array;
    try { actual = b64uToBytes(mac); } catch { return null; }
    if (!timingSafeEq(expected, actual)) return null;
    // Also check exp claim — best-effort base64 decode.
    try {
      const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(b64))) as { exp?: number; role?: string };
      if (payload.exp && Date.now() > payload.exp) return null;
      return { role: payload.role };
    } catch { return null; }
  } catch {
    return null;
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=()",
    "camera=(self)",
    "microphone=()",
    "geolocation=()",
    "payment=()",
    "usb=()",
    "fullscreen=(self)",
  ].join(", "),
  "Cross-Origin-Opener-Policy": "same-origin",
  "X-Permitted-Cross-Domain-Policies": "none",
};

const PROD_HEADERS: Record<string, string> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

// CSP: 'unsafe-inline' is required for Next.js hydration scripts and
// Tailwind's runtime style injection. 'unsafe-eval' is required by
// Next.js 16 / Turbopack's client runtime for RSC payload processing —
// without it the browser blocks eval() and every page navigation crashes
// with "Server Components render error" (digest 793074517). TODO: migrate
// to nonce-based CSP when Next.js supports it for Turbopack builds.
//
// Google Analytics (`src/components/analytics/google-tag.tsx`): the loader from googletagmanager, and
// hits as fetch/beacon to *.google-analytics.com / *.analytics.google.com (regional collectors).
// Removing them does not remove the tag, it silently breaks it; removing the tag should remove them.
// ⛔ GA hosts are deliberately NOT in `img-src`, although Google's published set lists them: the image
// pixel is gtag.js's fallback transport, and it is the one path the component's transport guard cannot
// rewrite. Refusing it here means a hit goes out scrubbed or not at all.
const GA_HOSTS_SCRIPT = "https://*.googletagmanager.com";
const GA_HOSTS_CONNECT = "https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com";
const CSP_BASE = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GA_HOSTS_SCRIPT}`,
  // Fonts are self-hosted by next/font — no Google Fonts hosts (removed 2026-09-15, see globals.css).
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob:",
  `connect-src 'self' ws: wss: ${GA_HOSTS_CONNECT}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
];
// `upgrade-insecure-requests` is only correct over HTTPS. On a plain-HTTP origin
// (local dev / preview / a health probe) it force-upgrades every subresource to
// https://<that same http host>, which fails with ERR_SSL_PROTOCOL_ERROR. So we
// emit it only when the request actually arrived over HTTPS (prod behind Railway
// sets x-forwarded-proto=https) — production security is unchanged.
const CSP_SECURE = [...CSP_BASE, "upgrade-insecure-requests"].join("; ");
const CSP_PLAIN = CSP_BASE.join("; ");

function withSecurityHeaders(res: NextResponse, secure = true): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", secure ? CSP_SECURE : CSP_PLAIN);
  if (process.env.NODE_ENV === "production") {
    for (const [k, v] of Object.entries(PROD_HEADERS)) res.headers.set(k, v);
  }
  return res;
}

/** True when the request reached us over HTTPS (prod behind Railway sets
 *  `x-forwarded-proto: https`; local http dev/preview does not). */
function isSecureRequest(req: NextRequest): boolean {
  const proto = req.headers.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  return proto.split(",")[0].trim() === "https";
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const secure = isSecureRequest(req);

  // Hard-block dev-test endpoints in production at the edge — defence in
  // depth on top of the per-route NODE_ENV check. Even if NODE_ENV is
  // misconfigured, the middleware blocks the request before it reaches
  // the handler. Returns a real 404 (not JSON) so scanners don't see
  // a different shape than other missing routes.
  if (pathname.startsWith("/api/dev-test") && process.env.NODE_ENV === "production") {
    return withSecurityHeaders(new NextResponse("Not Found", { status: 404 }), secure);
  }

  const cookie = req.cookies.get(SESSION_COOKIE)?.value;

  // Auth gate — short-circuit before paying the cost of the
  // downstream request. We verify the cookie's HMAC here so a forged
  // cookie (right shape, wrong signature) is rejected at the edge
  // and the user gets a clean 307 instead of a 200-with-login-body
  // (the root loading.tsx Suspense wrapper makes page-level
  // `redirect()` unable to change the HTTP status after streaming
  // has begun, so the second-line page check is necessary but not
  // sufficient — this is the primary line).
  if (isProtected(pathname)) {
    const session = await readVerifiedSession(cookie);
    if (!session) {
      const url = req.nextUrl.clone();
      // Admin routes → admin login; player routes → player login.
      url.pathname = pathname.startsWith("/admin") ? "/auth/admin" : "/auth/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url, 307);
      // Clear the bad cookie so the next request doesn't keep
      // re-presenting it. Path + name must match the issuer.
      if (cookie) res.cookies.delete(SESSION_COOKIE);
      return withSecurityHeaders(res, secure);
    }
    // ── W25 BELT 1: /admin is staff-only at the edge, whatever the router state says. ──
    // ⛔ THIS IS THE LINE THAT CLOSES THE MEASURED LEAK. A layout is not a gate: a flight whose
    // `Next-Router-State-Tree` names the admin layouts skips them and the page under them still runs and streams.
    // The edge sees every request regardless of router state, so it is the only place a single check covers all
    // three request shapes. The cookie is NOT cleared here — the session is perfectly valid, it is simply not
    // entitled to /admin, and deleting it would sign a player out of the site for visiting a URL.
    // ⚠️ Coarse and subtractive only: it refuses an account whose own cookie says it is not staff. A demoted
    // account's stale cookie still passes here and is caught by the per-page stored-row gate (belt 2).
    if (pathname.startsWith("/admin") && !isStaffRole(session.role)) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth/admin";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      return withSecurityHeaders(NextResponse.redirect(url, 307), secure);
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  // Full path + query so server components can round-trip the exact destination
  // (e.g. the admin TOTP gate preserving ?tab=kyc on a deep link from an email).
  requestHeaders.set("x-href", pathname + search);
  // 🔴 E-381 · WHETHER THIS REQUEST IS A DOCUMENT LOAD. A hard load and a `router.refresh()` flight
  // need opposite answers from AppShell when a session has ended: a document can take a real 307, a
  // flight cannot (the redirect degrades to a client navigation that lands on a blank body).
  // ⚠️ `rsc` CANNOT TELL THEM APART HERE: Next strips the flight headers before this proxy runs
  // (`server/web/adapter.js`, "Headers should only be stripped for middleware") and again before
  // `headers()` (`request-store.js`), and strips `_rsc` from the URL — measured 2026-09-14, a refresh
  // arrived looking exactly like a document. `Sec-Fetch-Mode` is set by the BROWSER, cannot be
  // written by page script, and Next does not touch it: `navigate` only for a real navigation,
  // `cors`/`same-origin` for the router's fetch. A browser that sends no Sec-Fetch headers at all
  // gets "0" — the in-place answer, which cannot blank. Always SET, never forwarded.
  // ⚠️ MODE, NOT DEST: a navigation our service worker forwards (`public/sw.js` → `fetch(request)`)
  // arrives as mode `navigate` with dest `empty` — measured 2026-09-14 — while the router's flight is
  // mode `cors`, dest `empty`. Page script can never create a `navigate`-mode request.
  requestHeaders.set(
    "x-kp-document",
    req.headers.get("sec-fetch-mode") === "navigate" && !req.headers.has("next-action") ? "1" : "0",
  );
  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
    secure,
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
