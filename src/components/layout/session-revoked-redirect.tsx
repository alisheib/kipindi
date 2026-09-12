"use client";

/**
 * B-13 — the revoked device's explanation, delivered.
 *
 * Rendered by AppShell when getSession() found the cookie's session displaced
 * in the registry (a newer login elsewhere) during a Server Component render —
 * a context that cannot set the kp_revoked flash cookie or redirect for the
 * whole tree. This client shim routes to the login page with `?revoked=1`
 * (which the page maps to the "signed in on another device" panel) and
 * round-trips where the player was via `next=`.
 *
 * `replace`, not `push`: Back must not return to a shell that believes the
 * player is signed out mid-page.
 *
 * 🔴 IT IS A DOCUMENT NAVIGATION (`window.location.replace`), NOT `router.replace`, AND THAT IS
 * THE WHOLE BUG FIX. `router.replace` is a client-side SOFT navigation, and **the App Router does
 * not re-execute a shared root layout on a soft navigation** — `app/layout.tsx` renders
 * `<AppShell>{children}</AppShell>`, and the branch in `app-shell.tsx` that mounts THIS component
 * returns it *instead of* `{children}`. So the already-rendered tree has no `children` slot at all.
 * The soft navigation changed the URL, the login page's RSC payload came back **200**, and it had
 * nowhere to mount: the player sat on an empty navy body at
 * `/auth/login?revoked=1&next=…` with **zero** console errors, zero page errors and nothing in the
 * logs. Reproduced 2026-09-12 on /wallet, /positions, /markets AND the fully public /legal/rules —
 * `document.body.innerText.trim().length === 0` every time, while the SAME url on a hard load
 * rendered 1029 characters and a password field. Production agreed: 220 revocation rows across all
 * 7 players in 18 hours, against 30 logins and ZERO idle/absolute timeouts.
 * ⭐ A layout-level decision can only be escaped by a DOCUMENT navigation, because that is the one
 * kind that re-runs the layout that made it. This is the same law `auth/layout.tsx` and
 * `bounce-authed.ts` already record — it had simply never been applied to the root layout.
 * ⛔ DO NOT "MODERNISE" THIS BACK TO `useRouter`. `npm run test:revoked-deadend` fails if you do,
 * and it asserts the RENDERED PAGE, not the URL — a URL-only check stayed green for this bug's
 * entire life, because the URL was always correct.
 * ⚠️ Still owed (this only stops the bleeding): the root layout should not be issuing redirects at
 * all, and `kp_session` is still never cleared, so the device re-enters this branch on EVERY
 * request until it signs in again. See `docs/SESSION-REVOKED-DEADEND.md`.
 */
import { useEffect } from "react";

export function SessionRevokedRedirect({ next }: { next?: string }) {
  useEffect(() => {
    const safe = next && /^\/(?![/\\])/.test(next) && !next.startsWith("/auth/") ? next : "";
    window.location.replace(`/auth/login?revoked=1${safe ? `&next=${encodeURIComponent(safe)}` : ""}`);
  }, [next]);
  return null;
}
