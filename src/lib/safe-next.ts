/**
 * WHERE A SIGN-IN MAY SEND SOMEONE AFTERWARDS — one same-origin rule (the Vodacom plan S3, §3.1: `sanitizeNext`
 * moved here from `app/auth/login/actions.ts`, so the pending-bet link and the login form share it).
 *
 * ⛔ AN OPEN REDIRECT IS A PHISHING TOOL. A `next` that is a protocol-relative URL ("//evil.example"), an absolute
 * URL, or a path whose second character is a backslash ("/\evil.example", which browsers read as "//") would send a
 * player who just typed their password to a page that is not ours. Only a path on THIS origin passes.
 *
 * Pure and client-safe: it imports nothing.
 */

/** A same-origin in-app path: starts with ONE "/" that is not followed by "/" or a backslash. */
export function isSafePath(raw: unknown): raw is string {
  return typeof raw === "string" && /^\/(?![/\\])/.test(raw);
}

/** Login's rule: a same-origin path that is not an `/auth/` page (a sign-in never lands on a sign-in page); "" else. */
export function sanitizeNext(raw: unknown): string {
  return isSafePath(raw) && !raw.startsWith("/auth/") ? raw : "";
}
