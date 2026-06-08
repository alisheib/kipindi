import { NextResponse, type NextRequest } from "next/server";
import { logout } from "@/lib/server/auth-service";

const COOKIE_NAME = "kp_session";

async function redirectHome(req: NextRequest) {
  await logout();
  const res = NextResponse.redirect(new URL("/", req.url));
  // Explicitly clear the session cookie on the redirect response.
  // cookies().delete() inside destroySession sets the cookie on the
  // *implicit* response, but Route Handler redirects create a NEW
  // response object — the delete doesn't carry over. Belt-and-braces:
  // clear it on the actual response that reaches the browser.
  res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}

export async function POST(req: NextRequest) {
  return redirectHome(req);
}

export async function GET(req: NextRequest) {
  return redirectHome(req);
}
