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

// Must match COOKIE_NAME in src/lib/server/session.ts
const SESSION_COOKIE = "kp_session";

const PROTECTED_PREFIXES = ["/wallet", "/positions", "/profile", "/admin"];
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
async function isSessionCookieValid(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0 || dot >= token.length - 1) return false;
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
    try { actual = b64uToBytes(mac); } catch { return false; }
    if (!timingSafeEq(expected, actual)) return false;
    // Also check exp claim — best-effort base64 decode.
    try {
      const payload = JSON.parse(new TextDecoder().decode(b64uToBytes(b64))) as { exp?: number };
      if (payload.exp && Date.now() > payload.exp) return false;
    } catch { return false; }
    return true;
  } catch {
    return false;
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
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

function withSecurityHeaders(res: NextResponse): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", CSP);
  if (process.env.NODE_ENV === "production") {
    for (const [k, v] of Object.entries(PROD_HEADERS)) res.headers.set(k, v);
  }
  return res;
}

export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // Hard-block dev-test endpoints in production at the edge — defence in
  // depth on top of the per-route NODE_ENV check. Even if NODE_ENV is
  // misconfigured, the middleware blocks the request before it reaches
  // the handler. Returns a real 404 (not JSON) so scanners don't see
  // a different shape than other missing routes.
  if (pathname.startsWith("/api/dev-test") && process.env.NODE_ENV === "production") {
    return withSecurityHeaders(new NextResponse("Not Found", { status: 404 }));
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
    const ok = await isSessionCookieValid(cookie);
    if (!ok) {
      const url = req.nextUrl.clone();
      // Admin routes → admin login; player routes → player login.
      url.pathname = pathname.startsWith("/admin") ? "/auth/admin" : "/auth/login";
      url.search = `?next=${encodeURIComponent(pathname + search)}`;
      const res = NextResponse.redirect(url, 307);
      // Clear the bad cookie so the next request doesn't keep
      // re-presenting it. Path + name must match the issuer.
      if (cookie) res.cookies.delete(SESSION_COOKIE);
      return withSecurityHeaders(res);
    }
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  // Full path + query so server components can round-trip the exact destination
  // (e.g. the admin TOTP gate preserving ?tab=kyc on a deep link from an email).
  requestHeaders.set("x-href", pathname + search);
  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
