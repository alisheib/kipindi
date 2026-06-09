import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { logout } from "@/lib/server/auth-service";

const COOKIE_NAME = "kp_session";
const TOTP_COOKIE = "kp_admin_totp";

async function redirectHome(req: NextRequest) {
  await logout();
  // Build the redirect URL from the public-facing host, not req.url
  // which on Railway resolves to the internal container (localhost:8080).
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? req.nextUrl.host;
  const publicUrl = `${proto}://${host}/`;
  const res = NextResponse.redirect(publicUrl);
  // Explicitly clear the session cookie on the redirect response.
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // Clear the admin TOTP cookie so the next person logging in on the
  // same browser doesn't inherit 2FA clearance from a prior admin.
  res.cookies.set(TOTP_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: NextRequest) {
  return redirectHome(req);
}

/**
 * GET logout is a CSRF vector — any same-origin page can embed
 * <img src="/auth/logout"> and silently destroy the session.
 * Redirect to home so stale bookmarks / links don't break, but
 * do NOT destroy the session on GET.
 */
export async function GET(req: NextRequest) {
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? req.nextUrl.host;
  return NextResponse.redirect(`${proto}://${host}/`);
}
