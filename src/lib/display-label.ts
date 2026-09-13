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
 * ⛔ APPROVAL NO LONGER WRITES displayName (Ali, 2026-09-13 — reverses his 2026-06-14
 * decision; docs/COMPLIANCE-DECISIONS.md "2026-09-13 (second)"). From 2026-06-14 the
 * verified legal name was promoted into displayName on KYC approval, even over a chosen
 * handle, so the compliance console could identify a verified player. Under the 2026-09-13
 * ladder approval comes at cash-out, after a player may have spent weeks under a handle, so
 * the overwrite would unmask them at that moment. So a chosen name stays the label; the
 * legal name is RECORDED on the KYC submission and shown to the officer there, and is not
 * promoted into this label. ⛔ Do not restore the overwrite from old comment history.
 *
 * Public surfaces still mask names independently — the leaderboard shows the first word
 * only and comments mask + freeze the name at write time — and the more-sensitive
 * self-exclusion roster and on-behalf DSAR list mask via `maskName()`.
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
