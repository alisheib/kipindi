/**
 * Auth layout — a pass-through, deliberately.
 *
 * 🔴 IT USED TO BOUNCE ALREADY-AUTHENTICATED USERS OFF `/auth/login` AND `/auth/register`, BY
 * READING THE `x-pathname` REQUEST HEADER AND COMPARING IT AGAINST A SET OF TWO PATHS. That is
 * the same defect Ali reported on the legal nav, in a place with no visible highlight to give it
 * away: **in the App Router a layout is NOT re-executed on a client-side soft navigation.** Every
 * `/auth/*` route shares THIS layout, so the header captured on the hard load was still the
 * route it compared for the rest of the visit. An authed player entering `/auth` on a route
 * outside the set — `/auth/otp`, `/auth/verify-email`, `/auth/forgot-password`, all
 * deliberately usable while signed in — and then clicking through to `/auth/login` was **not
 * bounced at all**. And the mirror: arrive on `/auth/login`, soft-navigate to
 * `/auth/forgot-password`, acquire a session in between, and it would bounce a player off a page
 * they are entitled to use.
 *
 * ⭐ THE GATE NOW LIVES IN THE TWO PAGES (`bounce-authed.ts`), because a PAGE is re-executed on
 * every navigation and is therefore correct by construction rather than by remembering.
 * ⛔ DO NOT MOVE IT TO THE MIDDLEWARE — that is the obvious fix and it ships an infinite redirect
 * loop. `proxy.ts`'s gate is `isSessionCookieValid` (HMAC only); a REVOKED device still carries a
 * valid cookie, and `AppShell` deliberately routes it TO `/auth/login?revoked=1`. The full
 * reasoning is in `bounce-authed.ts`, next to the code it constrains.
 * ⚠️ NOTHING REPLACED IT HERE. A layout that reads a request header to decide something about
 * the CURRENT PAGE is the bug; adding a different version of it back is not a fix.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
