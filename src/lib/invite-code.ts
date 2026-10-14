/**
 * A campaign invite's inbound form, shared by the auth doors and the pending-bet writer (Vodacom S10).
 * Both stores look up `code.trim().toUpperCase()`; existence, campaign standing and the bonus gate remain SERVER
 * decisions. This is not a referral code: campaigns have no referral alphabet restriction.
 *
 * The register page and action already bounded an invite to 24 characters, but sliced it: an overlong value could
 * become a different campaign's code. Refuse that value instead. An embedded control character is not a campaign
 * code (NUL cannot be stored as PostgreSQL text); refuse it before the preview/bind lookup. No ASCII alphabet is
 * imposed: ordinary spaces, underscores and Unicode still use the stores' canonical form.
 * Existing stored pending markers remain readable.
 */
export const MAX_INVITE_CODE_LEN = 24;

export function normalizeInviteCode(raw: string | null | undefined): string | null {
  const code = (raw ?? "").trim().toUpperCase();
  for (let i = 0; i < code.length; i++) {
    const c = code.charCodeAt(i);
    if (c < 0x20 || c === 0x7f) return null;
  }
  return code && code.length <= MAX_INVITE_CODE_LEN ? code : null;
}
