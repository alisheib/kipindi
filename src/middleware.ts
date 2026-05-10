/**
 * Edge middleware — server-side 307 gating for the protected route
 * surface. Pages still call `currentSession()` + `redirect()` themselves
 * (defence in depth), but the middleware ensures the *HTTP layer* is
 * also authoritative: no protected response body ever leaves the edge
 * for an unauthenticated request, even when Next falls back to a
 * meta-refresh redirect in the page.
 *
 * Why both layers:
 *   • Page-level redirect protects against missing middleware match
 *     patterns and gives the page Server Component access to the user.
 *   • Middleware-level 307 protects against Server Components rendering
 *     the protected HTML body before Next intercepts the redirect, and
 *     guarantees automated tests / search engines see a real redirect.
 *
 * Auth signal: presence of the session cookie (NOT verification — the
 * page still verifies the HMAC). A forged cookie that fails verification
 * is allowed past this gate but rejected by `currentSession()` inside
 * the page, which then re-redirects.
 */
import { NextResponse, type NextRequest } from "next/server";

// Must match COOKIE_NAME in src/lib/server/session.ts
const SESSION_COOKIE = "kp_session";

const PROTECTED_PREFIXES = [
  "/wallet",
  "/positions",
  "/profile",
];

const ADMIN_PREFIXES = [
  "/admin",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
}
function isAdmin(pathname: string): boolean {
  return ADMIN_PREFIXES.some(p => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = !!req.cookies.get(SESSION_COOKIE)?.value;

  if (isAdmin(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url, 307);
  }

  if (isProtected(pathname) && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url, 307);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/wallet/:path*",
    "/positions/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
