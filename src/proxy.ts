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

export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  // Auth gate first — short-circuit before paying the cost of the
  // downstream request. No protected body leaves the edge for an
  // unauthenticated visitor; the page-level redirect is the second
  // line of defence (forged cookies pass the cookie check but fail
  // the HMAC verify inside currentSession()).
  if (isProtected(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return withSecurityHeaders(NextResponse.redirect(url, 307));
  }

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-pathname", pathname);
  return withSecurityHeaders(
    NextResponse.next({ request: { headers: requestHeaders } }),
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
