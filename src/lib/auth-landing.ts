/**
 * WHERE A DOOR SENDS SOMEONE - one rule per question (route audit 2026-10-06, cluster B).
 * landingAfterAuth: after a sign-in or sign-up. accountRefusalPath: an account refusal's panel on the login page.
 * authDoorHrefs: the guest header's Sign in / Sign up. Pure and client-safe: it imports only safe-next.ts,
 * referral-code.ts and a type. S9/S10 reuse these instead of writing second copies.
 */
import { boundedNext, isAdminPath, isAuthPath, pathWithQuery, sanitizeNext, withWelcome } from "@/lib/safe-next";
import { normalizeReferralCode } from "@/lib/referral-code";
import type { FailureDetail } from "@/lib/failure-reasons";

/** Staff (any role but PLAYER/AGENT): an /admin next, else /admin. A player or agent: the safe next (never an /admin one) or
 *  home, greeted - `welcome` set before any #fragment. */
export function landingAfterAuth(opts: { role: string | null | undefined; next: string; kind: "new" | "back" }): string {
  const safe = sanitizeNext(opts.next);
  const staff = !!opts.role && opts.role !== "PLAYER" && opts.role !== "AGENT";
  if (staff) return isAdminPath(safe) ? safe : "/admin";
  const next = safe && !isAdminPath(safe) ? safe : "";
  return withWelcome(next || "/", opts.kind);
}

/** The login page's panel for an account refusal: closed=1, the three exclusion standings (serving carries its date), else
 *  error=blocked; a safe next kept. */
export function accountRefusalPath(detail: FailureDetail | undefined, next: string): string {
  const qs = new URLSearchParams();
  if (detail?.accountClosed) qs.set("closed", "1");
  else if (detail?.standing && detail.standing !== "diverged") {
    qs.set("excluded", detail.standing);
    if (detail.standing === "serving" && detail.until) qs.set("until", detail.until.slice(0, 10));
  } else qs.set("error", "blocked");
  const safe = sanitizeNext(next);
  if (safe) qs.set("next", safe);
  return `/auth/login?${qs.toString()}`;
}

/** On an /auth page only that page's own next and ref travel, never the rest of its query (a reset token stays put). Elsewhere
 *  this page is the next (none on a bare /). pathWithQuery drops welcome; ref is normalised or dropped, never cut. */
export function authDoorHrefs(pathname: string, search: URLSearchParams): { signIn: string; signUp: string } {
  const qs = new URLSearchParams();
  let next = "";
  if (isAuthPath(pathname)) {
    next = boundedNext((search.get("next") ?? "").trim());
  } else {
    const query: Record<string, string[]> = {};
    for (const [k, v] of search) if (k !== "ref") (query[k] ??= []).push(v);
    const cand = boundedNext(pathWithQuery(pathname, query)) || boundedNext(pathname);
    next = cand === "/" ? "" : cand;
  }
  if (next) qs.set("next", next);
  const ref = normalizeReferralCode(search.get("ref"));
  if (ref) qs.set("ref", ref);
  const tail = qs.toString() ? `?${qs.toString()}` : "";
  return { signIn: `/auth/login${tail}`, signUp: `/auth/register${tail}` };
}
