import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSession } from "@/lib/server/session";

/**
 * Bounce an already-authenticated visitor off the page that CALLS this.
 *
 * ⛔ IT LIVES IN THE PAGES, NOT IN `auth/layout.tsx`, AND THAT MOVE IS A BUG FIX.
 * The layout read the route from the `x-pathname` REQUEST HEADER and compared it against a set
 * of two paths — and in the App Router a layout is **not re-executed on a client-side soft
 * navigation**. Every `/auth/*` route shares this one layout, so the header it captured on the
 * hard load was still the route it compared for the rest of the visit. Measured consequence, and
 * it is reachable rather than theoretical: an authed player who enters `/auth` on a route that is
 * NOT in the bounce set — `/auth/otp`, `/auth/verify-email`, `/auth/forgot-password`, all
 * deliberately usable while signed in — and then clicks through to `/auth/login` is **not
 * bounced at all**, because the layout still believes it is rendering `/auth/otp`. The gate
 * silently stops existing for exactly the navigation it was written to catch. The mirror is just
 * as wrong: arrive on `/auth/login`, soft-navigate to `/auth/forgot-password`, and a session
 * acquired in between would bounce a player off a page they are entitled to.
 * ⭐ A PAGE, unlike a layout, IS re-executed on every navigation. So the check belongs to the
 * page, and it is correct by construction rather than by remembering.
 *
 * 🔴 AND THE OBVIOUS FIX — MOVE IT TO THE MIDDLEWARE, WHERE THE PATHNAME IS ALWAYS RIGHT —
 * WOULD HAVE SHIPPED AN INFINITE REDIRECT LOOP. `proxy.ts` already redirects on auth and its
 * gate is `isSessionCookieValid`, which verifies the cookie's **HMAC** and nothing else. A
 * REVOKED device (B-13: another login displaced its session row) still carries a
 * cryptographically valid cookie, and `AppShell` deliberately routes that device TO
 * `/auth/login?revoked=1` so it gets an explanation. A middleware bounce keyed on cookie
 * validity would send it straight back to `/`, where the shell would send it to the login page
 * again — forever, with no page ever rendering. **The layout's `getSession()` is what made it
 * safe, because a revoked session resolves to `null`.** That is why this helper keeps
 * `getSession()` and only the PATHNAME decision moved.
 *
 * ⚠️ The pages' old comments said the guard sat in the layout to avoid a Next.js 16 **dev-mode**
 * hook-count mismatch when `redirect()` is called inside a page during hot reload. That is a
 * development HMR artefact; it is not a production behaviour, and it is not a reason to ship a
 * gate that stops working after one soft navigation.
 */
export async function bounceIfAuthed(): Promise<void> {
  const session = await getSession();
  if (!session) return;
  // B-14 — an authed user on /auth/login?next=/wallet wanted /wallet, not home. Honour a safe
  // same-origin `next` (never back into /auth/*). Unchanged from the layout: `x-href` carries
  // the full path + query, and a REQUEST header is correct here because a page re-runs per
  // request, which is the whole point of moving this.
  const h = await headers();
  const href = h.get("x-href") ?? "";
  const qs = href.includes("?") ? href.slice(href.indexOf("?") + 1) : "";
  const nextRaw = new URLSearchParams(qs).get("next") ?? "";
  const safeNext = /^\/(?![/\\])/.test(nextRaw) && !nextRaw.startsWith("/auth/") ? nextRaw : "";
  redirect((safeNext || "/") as never);
}
