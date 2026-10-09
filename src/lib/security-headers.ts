/**
 * ⭐ THE STATIC SECURITY HEADERS — ONE DEFINITION, TWO SENDERS (review 6, A4 · 2026-10-09).
 *
 * 🔴 WHAT WAS LEFT OPEN. `src/proxy.ts` was the only source of these headers, and its matcher skips public/'s static
 * folders and favicons by name (a static file needs no page headers). But a MISSING file there is a page: `/icons/nope`,
 * `/brand/x`, `/og/x` render the root not-found inside the signed-in shell (the header's name, masked phone and balance)
 * — and that page went out with none of them, so another site could frame it.
 * ⭐ NOW BOTH SEND THEM. The proxy sets them on every response it handles, with the CSP (which is the proxy's alone: it
 * depends on the request, `upgrade-insecure-requests` only over HTTPS). next.config.ts's `headers()` sets them on EVERY
 * response (`/:path*`), so whatever the proxy's matcher skips carries them too. `test:static-cache-scope` holds the two
 * to this one list; `test:proxy-scope` holds the matcher to static files.
 * ⛔ No imports, no path alias: next.config.ts loads this file through Next's own TypeScript hook (`next-config-ts`),
 * before the app's aliases exist.
 */

/** Sent on every response, in every environment. */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
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

/** Sent in production only: HSTS is honoured over HTTPS alone, and a local http origin must never be pinned. */
export const PROD_HEADERS: Readonly<Record<string, string>> = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
};

/** Every static security header for one environment — all but the CSP — as next.config's `headers()` lists them. */
export function staticSecurityHeaders(production: boolean): Array<{ key: string; value: string }> {
  return Object.entries({ ...SECURITY_HEADERS, ...(production ? PROD_HEADERS : {}) }).map(([key, value]) => ({ key, value }));
}
