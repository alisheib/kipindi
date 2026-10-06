/**
 * WHERE A SIGN-IN MAY SEND SOMEONE AFTERWARDS — one same-origin rule (the Vodacom plan S3, §3.1: `sanitizeNext`
 * moved here from `app/auth/login/actions.ts`, so the pending-bet link and the login form share it).
 *
 * ⛔ AN OPEN REDIRECT IS A PHISHING TOOL. A `next` that is a protocol-relative URL ("//evil.example"), an absolute
 * URL, or a path whose second character is a backslash ("/\evil.example", which browsers read as "//") would send a
 * player who just typed their password to a page that is not ours. Only a path on THIS origin passes.
 *
 * 🔴 CONTROL CHARACTERS (2026-10-06). The URL parser every browser runs STRIPS tab, CR and LF from a URL before reading
 * it, so "/\t/evil.example" — which the old one-regex check passed, its second character being a tab — is read as
 * "//evil.example": another site. Reached as `?next=/%09/evil.example` on the real login page; a signed-in visitor
 * was bounced there with no click (`bounce-authed.ts`), a signed-out one right after typing their password. Thirteen
 * private copies of that regex lived in `src/app` and the shell; every door now asks THIS file.
 * ⭐ Two locks: no control character, DEL or backslash anywhere (a real in-app path holds none), AND the value must
 * resolve to this same origin under the platform's own URL parser — so a parser quirk nobody has listed yet still fails.
 *
 * Pure and client-safe: it imports nothing.
 */

const PROBE_ORIGIN = "https://same-origin.invalid";

/** Any C0 control character (tab, CR and LF among them), DEL, or a backslash. */
function hasControlOrBackslash(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x20 || c === 0x7f || c === 0x5c) return true;
  }
  return false;
}

/** A same-origin in-app path: ONE leading "/" not followed by "/" or a backslash, no control character or backslash
 *  anywhere, and it resolves to this origin. */
export function isSafePath(raw: unknown): raw is string {
  if (typeof raw !== "string" || !/^\/(?![/\\])/.test(raw) || hasControlOrBackslash(raw)) return false;
  try {
    return new URL(raw, PROBE_ORIGIN).origin === PROBE_ORIGIN;
  } catch {
    return false;
  }
}

/** An `/auth` page, with or without a tail — a sign-in never lands on a sign-in page (`/auth` alone is a 404). */
export function isAuthPath(path: string): boolean {
  return /^\/auth(?:[/?#]|$)/.test(path);
}

/** Login's rule: a same-origin path that is not an `/auth` page; "" else. */
export function sanitizeNext(raw: unknown): string {
  return isSafePath(raw) && !isAuthPath(raw) ? raw : "";
}

/** `path` with the page's own query (less `welcome`), so a sign-in that interrupts a page returns to exactly it —
 *  `/wallet/deposit?from=low-balance`, a receipt, a card return's `order_id` (2026-10-06; they returned to a bare path). */
export function pathWithQuery(path: string, query: Record<string, string | string[] | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (k === "welcome") continue;
    if (typeof v === "string") qs.append(k, v);
    else if (Array.isArray(v)) for (const x of v) qs.append(k, x);
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}
