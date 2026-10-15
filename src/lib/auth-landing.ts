/**
 * WHERE A DOOR SENDS SOMEONE - one rule per question (route audit 2026-10-06, cluster B).
 * landingAfterAuth: after a sign-in or sign-up. accountRefusalPath: an account refusal's panel on the login page.
 * authDoorHrefs: the guest header's Sign in / Sign up. doorHrefsFor: the one tail every guest door ends in (S10).
 * Pure and client-safe: it imports only safe-next.ts, referral-code.ts, invite-code.ts, break-end.ts (pure) and a type.
 * S9/S10 reuse these instead of writing second copies.
 */
import { boundedNext, isAdminPath, isAuthPath, pathWithQuery, sanitizeNext, withWelcome } from "@/lib/safe-next";
import { normalizeReferralCode } from "@/lib/referral-code";
import { normalizeInviteCode } from "@/lib/invite-code";
import { breakEndParam } from "@/lib/break-end";
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

/** The login page's panel for an account refusal: closed=1, the three exclusion standings (serving carries its END — the
 *  instant, `breakEndParam`, never its UTC day: R4-I, 2026-10-09), else error=blocked; a safe next kept. */
export function accountRefusalPath(detail: FailureDetail | undefined, next: string): string {
  const qs = new URLSearchParams();
  if (detail?.accountClosed) qs.set("closed", "1");
  else if (detail?.standing && detail.standing !== "diverged") {
    qs.set("excluded", detail.standing);
    const end = detail.standing === "serving" ? breakEndParam(detail.until) : null;
    if (end) qs.set("until", end);
  } else qs.set("error", "blocked");
  const safe = sanitizeNext(next);
  if (safe) qs.set("next", safe);
  return `/auth/login?${qs.toString()}`;
}

/** ⭐ THE ONE TAIL EVERY GUEST DOOR ENDS IN (S10 WP1): `next` kept only when `boundedNext` keeps it — refused, never cut —
 *  then this page's own codes beside it, each through its own rule (`ref` normalised, `invite` normalised) or dropped,
 *  never cut, never inside `next`. The classic and journey headers' doors, the guest Tiketi sheet's and the guest bet
 *  sheet's all build their hrefs here. */
export function doorHrefsFor(next: string, search: URLSearchParams): { signIn: string; signUp: string } {
  const qs = new URLSearchParams();
  const safe = boundedNext(next);
  if (safe) qs.set("next", safe);
  const ref = normalizeReferralCode(search.get("ref"));
  if (ref) qs.set("ref", ref);
  const invite = normalizeInviteCode(search.get("invite"));
  if (invite) qs.set("invite", invite);
  const tail = qs.toString() ? `?${qs.toString()}` : "";
  return { signIn: `/auth/login${tail}`, signUp: `/auth/register${tail}` };
}

/** On an /auth page only that page's own next, ref and invite travel, never the rest of its query (a reset token stays put).
 *  Elsewhere this page is the next (none on a bare /). Codes travel outside next, through their own rules, never cut. */
export function authDoorHrefs(pathname: string, search: URLSearchParams): { signIn: string; signUp: string } {
  let next = "";
  if (isAuthPath(pathname)) {
    next = (search.get("next") ?? "").trim();
  } else {
    const query: Record<string, string[]> = {};
    for (const [k, v] of search) if (k !== "ref" && k !== "invite") (query[k] ??= []).push(v);
    const cand = boundedNext(pathWithQuery(pathname, query)) || boundedNext(pathname);
    next = cand === "/" ? "" : cand;
  }
  return doorHrefsFor(next, search);
}
