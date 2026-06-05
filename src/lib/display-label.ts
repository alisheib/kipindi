/**
 * displayLabel — the canonical way to render a user's name across the
 * product. Used in the admin players list, the player drill-in, the
 * top-bar avatar menu, the audit log, every notification recipient
 * label, etc.
 *
 * Rules (in order):
 *   1. If the user has set a displayName in their profile, use it
 *      verbatim. They picked it; respect it.
 *   2. If they haven't set one, fall back to a stable anonymous ID
 *      derived from their userId — e.g. "Player #A3F2K8". This is the
 *      regulated-betting standard: every account has a non-PII handle
 *      that operators and players can refer to in chat / disputes
 *      without exposing the real name or the masked phone.
 *
 * After KYC approval, the operator can copy the NIDA-verified name
 * into displayName from the admin player drill-in if they want to
 * surface it in the UI; we don't auto-promote NIDA → displayName,
 * because some regulators require the player to actively consent to
 * their real name being displayed beyond the verification record.
 *
 * Initials follow the same rule. "Player #A3F2K8" → "A3" so the
 * Avatar component shows something stable rather than "?".
 */

export type DisplayableUser = {
  id: string;
  displayName: string | null;
};

export function displayLabel(user: Pick<DisplayableUser, "id" | "displayName">): string {
  const name = (user.displayName ?? "").trim();
  if (name.length > 0) return name;
  // Auto-generated handle from the user-id tail. Capitalised for legibility,
  // last 6 chars are deterministic and unique enough across millions.
  const tail = user.id.replace(/^usr_/, "").slice(-6).toUpperCase();
  return `Player #${tail}`;
}

export function displayInitials(user: Pick<DisplayableUser, "id" | "displayName">): string {
  const name = (user.displayName ?? "").trim();
  if (name.length > 0) {
    const parts = name.split(/\s+/).slice(0, 2);
    const letters = parts.map((p) => p[0] ?? "").join("").toUpperCase();
    if (letters.length > 0) return letters;
  }
  // Auto-handle initials = first 2 chars of the id tail.
  return user.id.replace(/^usr_/, "").slice(-6, -4).toUpperCase() || "P";
}
