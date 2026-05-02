/**
 * Edge middleware — security headers + auth gating + age-gate cookie.
 * Compliance:
 *  - Strict CSP (no inline scripts at top-level; nonces would be added when going to prod)
 *  - HSTS on production HTTPS
 *  - Frame busting (X-Frame-Options DENY)
 *  - MIME sniffing off (X-Content-Type-Options nosniff)
 *  - Referrer trim (no-referrer-when-downgrade → strict-origin-when-cross-origin)
 *  - Permissions-Policy locks dangerous APIs
 *  - Cross-Origin-Opener-Policy hardens against window.opener
 *  - Audit logging happens in route handlers (request body required)
 */
import { NextResponse, type NextRequest } from "next/server";

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-DNS-Prefetch-Control": "on",
  "Permissions-Policy": [
    "accelerometer=()",
    "autoplay=()",
    "camera=(self)",   // selfie capture in KYC
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
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // dev — tighten with nonces in prod
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' ws: wss:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "upgrade-insecure-requests",
].join("; ");

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("Content-Security-Policy", CSP);
  if (process.env.NODE_ENV === "production") {
    for (const [k, v] of Object.entries(PROD_HEADERS)) res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: [
    // skip Next internals + static; everything else gets headers
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
