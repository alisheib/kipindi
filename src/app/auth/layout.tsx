/**
 * Auth layout — bounces already-authenticated users away from the login and
 * register pages so they don't land on the auth surface while logged in.
 *
 * Doing this in a layout (rather than inside each page) avoids a Next.js 16
 * dev-mode hook-count mismatch that fires when redirect() is called inside a
 * page component during hot reload.
 */
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/server/session";

// Only bounce authed users from these pages — every other /auth/* route is
// either a utility page useful while logged in, or a multi-step flow where the
// user may be partially authenticated (e.g. OTP for withdrawal, email verify).
const BOUNCE_AUTHED = new Set([
  "/auth/login",
  "/auth/register",
]);

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "";

  if (BOUNCE_AUTHED.has(pathname)) {
    const session = await getSession();
    if (session) {
      // B-14 — an authed user on /auth/login?next=/wallet wanted /wallet, not
      // home. Honour a safe same-origin `next` (never back into /auth/*).
      const href = h.get("x-href") ?? pathname;
      const qs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
      const nextRaw = new URLSearchParams(qs).get("next") ?? "";
      const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
      redirect((safeNext || "/") as never);
    }
  }

  return <>{children}</>;
}
