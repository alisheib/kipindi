import { NextResponse, type NextRequest } from "next/server";
import { headers } from "next/headers";
import { logout } from "@/lib/server/auth-service";

const COOKIE_NAME = "kp_session";

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
  return res;
}

export async function POST(req: NextRequest) {
  return redirectHome(req);
}

export async function GET(req: NextRequest) {
  return redirectHome(req);
}
