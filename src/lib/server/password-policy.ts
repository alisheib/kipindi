/**
 * Single source of truth for password rules.
 *
 * Used at every entry point that sets a password — registration, self-service
 * reset, and authenticated change — so the policy can never drift between them.
 * (Previously registration enforced the breach-list + no-edge-whitespace rules
 * but reset/change only checked length, so a user could reset *to* "password".)
 */

export const PASSWORD_MIN = 8;

/** Common-password blacklist. Tiny on purpose — this catches the worst
 *  offenders without UX-blocking legitimate weak choices that the strength
 *  meter already discourages. Source: SecLists top-1000 intersected with
 *  the OWASP "TOP 100 worst passwords" — only entries with length ≥ 8 (so
 *  we don't double-reject the min-length rule). */
const COMMON_PASSWORDS = new Set([
  "password", "12345678", "123456789", "1234567890", "qwerty12", "qwertyui",
  "qwerty123", "iloveyou", "password1", "password!", "letmein1", "welcome1",
  "admin123", "abc12345", "monkey12", "dragon12", "football", "baseball",
  "basketball", "trustno1", "sunshine", "princess", "starwars", "shadow12",
  "michael1", "jennifer", "daniel12", "computer", "internet", "welcome123",
  "password123", "passw0rd", "p@ssword", "p@ssw0rd",
]);

export function isCommonPassword(pw: string): boolean {
  return COMMON_PASSWORDS.has(pw.toLowerCase());
}

/**
 * Validate a candidate password against the full policy. Returns a
 * human-readable error message if it's unacceptable, or `null` if it passes.
 */
export function validatePasswordStrength(pw: string): string | null {
  if (!pw || pw.length < PASSWORD_MIN) {
    return `Password must be at least ${PASSWORD_MIN} characters.`;
  }
  if (/^\s|\s$/.test(pw)) {
    return "Password cannot start or end with a space.";
  }
  if (isCommonPassword(pw)) {
    return "That password is in the public breach list. Pick something less common.";
  }
  return null;
}
