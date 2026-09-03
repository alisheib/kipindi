/**
 * INVITE & EARN — the ONE home for whether the referral programme is open yet.
 *
 * Ali's call, 2026-09-03: Invite & Earn is **not live yet** and must read as
 * "coming soon" everywhere it appears, in the same language the product already
 * uses for Propose & Earn.
 *
 * ⛔ ONE CONSTANT, EVERY SURFACE. Six player surfaces mention Invite (the avatar
 * menu, the More sheet, the top bar's overflow, the wallet's zero-bonus card, the
 * page itself and its metadata). Each of them asking its own question is how one
 * of them stays live after the flag flips — so they all read THIS. Flipping the
 * programme on is a one-word edit here and nowhere else.
 *
 * ⚠️ WHY A CONSTANT AND NOT A CONFIG ROW, deliberately: `proposals-config.ts` is
 * admin-editable because operators genuinely toggle that feature between four
 * states during a session. Invite has one transition, once, when the referral
 * money is signed off — a database read, an admin screen and a cache would be
 * machinery for a single future edit. ▶ If Invite ever needs operator control,
 * the move is to widen `proposals-config.ts` into a feature-state table and point
 * this module at it — NOT to grow a second config beside it.
 *
 * ⭐ The badge itself is NOT new either: `<ComingSoonBadge>` (`ui/coming-soon-badge.tsx`)
 * is the single gilt flag, already worn by every Propose entry point. Gilt is this
 * product's coming-soon colour (`proposals-state-views.tsx`: "COMING_SOON → gilt,
 * aspirational"), which is also why the wallet card's gold Invite CTA stays gold:
 * it is not claiming money, it is wearing the coming-soon flag.
 */

export type InviteState = "ACTIVE" | "COMING_SOON";

/** ⛔ The single switch. Change this one word to open the programme. */
export const INVITE_STATE: InviteState = "COMING_SOON";

/** True only when players may actually refer and earn. */
export function inviteIsLive(): boolean {
  return INVITE_STATE === "ACTIVE";
}
