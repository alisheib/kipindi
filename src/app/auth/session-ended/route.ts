/**
 * GET /auth/session-ended?next=… — the ONE place a dead session cookie is cleared, and the place
 * that decides what the player is told about it (E-381).
 *
 * 🔴 WHY A ROUTE HANDLER. A session that has ended is noticed inside a render (`AppShell`), where
 * a cookie cannot be written. Nothing else could clear it: `getSession()`'s delete threw in every
 * render and was swallowed, so a displaced device carried its dead cookie for ever, re-entered the
 * revoked branch on every request and wrote an audit row each time. And in the one context where
 * that delete DID work — a Route Handler such as `/api/events` — it erased the evidence before any
 * page could explain it. A Route Handler can set cookies, runs no layout, and so can neither
 * dead-end nor loop: it always answers a real 303.
 *
 * ⭐ IT WORKS OUT THE REASON ITSELF, from the cookie and the database, rather than trusting a query
 * parameter. The copy used to say "signed in on another device" for every cause; that is true only
 * when the registry holds a DIFFERENT session. A missing row is a sign-out elsewhere, a suspension,
 * a self-exclusion, a closure, a role change, an agent decision or maintenance — and the account's
 * own status separates the ones the login page already has true words for.
 *
 * ⛔ IT SIGNS NOBODY OUT. If the session is still valid (a stale tab, a link someone was sent) it
 * only forwards to `next`, so linking a player here cannot end their session.
 */
import { NextResponse, type NextRequest } from "next/server";
import { headers, cookies } from "next/headers";
import { getSessionState } from "@/lib/server/session";
import { verifySession } from "@/lib/server/crypto";
import { db } from "@/lib/server/store";
import { selfExclusionStanding } from "@/lib/server/responsible-gambling";

export const dynamic = "force-dynamic";

const COOKIE_NAME = "kp_session";

/** Same-origin path only, never back into /auth/*. The login page applies the same rule. */
function safeNextPath(raw: string | null | undefined): string {
  const v = (raw ?? "").trim();
  return /^\/(?![/\\])/.test(v) && !v.startsWith("/auth/") && !v.startsWith("/auth?") && v !== "/auth" ? v : "";
}

async function publicBase(req: NextRequest): Promise<string> {
  // The public host, not req.url — on Railway that resolves to the container (see auth/logout).
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? req.nextUrl.protocol.replace(":", "");
  const host = h.get("host") ?? h.get("x-forwarded-host") ?? req.nextUrl.host;
  return `${proto}://${host}`;
}

export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const base = await publicBase(req);

  const { session, ended: reason } = await getSessionState();
  if (session) {
    return NextResponse.redirect(`${base}${next || "/"}`, 303);
  }

  const jar = await cookies();
  const token = jar.get(COOKIE_NAME)?.value;
  const payload = verifySession<{ userId: string }>(token);

  const params = new URLSearchParams();
  if (reason === "displaced") {
    // ⛔ The literal `revoked=1` is what `auth/login/page.tsx` reads and `test:revoked-deadend` pins.
    params.set("revoked", "1");
  } else if (reason === "expired" || reason === "idle") {
    params.set("ended", "idle");
  } else if (reason === "no_record" && payload?.userId) {
    const user = await db.user.findById(payload.userId).catch(() => null);
    if (user?.status === "CLOSED") {
      params.set("closed", "1");
    } else if (user?.status === "SUSPENDED") {
      params.set("error", "blocked");
    } else if (user?.status === "SELF_EXCLUDED") {
      const standing = await selfExclusionStanding(user.id).catch(() => null);
      if (standing?.state === "serving") {
        params.set("excluded", standing.permanent ? "permanent" : "serving");
        if (!standing.permanent) params.set("until", standing.until.slice(0, 10));
      } else if (standing?.state === "minimum_served") {
        params.set("excluded", "minimum_served");
      } else {
        params.set("error", "blocked");
      }
    } else {
      params.set("ended", "session");
    }
  }
  if (next) params.set("next", next);

  const qs = params.toString();
  const res = NextResponse.redirect(`${base}/auth/login${qs ? `?${qs}` : ""}`, 303);
  if (token) res.cookies.set(COOKIE_NAME, "", { path: "/", maxAge: 0 });
  // The short "you were signed out" note Privacy §7 describes — a fallback for the login page if
  // the query above is lost. ⛔ It ranks BELOW every sign-in error there (E-381 §6 item 7), and its
  // lifetime is read from THIS line by `test:privacy-notice`: change it and §7 changes too.
  if (token) {
    res.cookies.set("kp_revoked", "1", {
      httpOnly: false,
      path: "/",
      maxAge: 30,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  return res;
}
