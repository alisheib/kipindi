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
 * On KYC approval the NIDA-verified legal name IS promoted into
 * displayName (see `kyc-service.reviewKyc` — Ali's 2026-06-14 decision),
 * so the INTERNAL, compliance-gated console can identify a verified player.
 * This is safe because every PUBLIC surface masks the name independently —
 * the leaderboard shows the first word only and comments mask + freeze the
 * name at write time, so the full surname never leaks to other players.
 * The admin players list + drill-in (both COMPLIANCE_ROLES-gated) therefore
 * show the legal name by design; the more-sensitive self-exclusion roster
 * and on-behalf DSAR list mask it via `maskName()`.
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
