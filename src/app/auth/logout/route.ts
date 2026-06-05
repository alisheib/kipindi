import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/lib/server/auth-service";

// Resolve the redirect base from the incoming request itself so we never
// fall back to `localhost` in production if NEXT_PUBLIC_APP_URL drops or
// is misconfigured on the host. NextRequest exposes the resolved URL
// (including any reverse-proxy / Railway-edge rewrites), which is the
// only ground truth at runtime.
async function redirectHome(req: NextRequest) {
  await logout();
  return NextResponse.redirect(new URL("/", req.url));
}

export async function POST(req: NextRequest) {
  return redirectHome(req);
}

export async function GET(req: NextRequest) {
  // Convenience for non-JS browsers / direct nav
  return redirectHome(req);
}
