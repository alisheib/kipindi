/**
 * THE FIRST-DEPOSIT IDENTITY NOTICE — the facts both halves share (2026-09-13).
 *
 * ⭐ ISOMORPHIC ON PURPOSE: no server import and no "use client". The server page reads the dismissal
 * cookie and decides; the client component writes the cookie when the X is pressed. One definition
 * of the cookie, the value and the due states, so the two sides cannot disagree.
 *
 * ⭐ WHY A COOKIE AND NOT localStorage. A preference only the browser can read forces the notice to
 * start hidden and appear after mount — which pushed everything below it down by a line on every
 * visit where it was due. A cookie reaches the server, so the notice is either in the first HTML or
 * not rendered at all: no flash, no layout shift. It is a display preference, never account state.
 *
 * 🔴 THE DISMISSAL IS BOUND TO THE PLAYER (2026-09-14, audit session 95, U2). It used to be the bare
 * value `dismissed`, read with no user binding — so on a shared phone player A's X hid the notice from
 * player B, who had never seen it. The value is now per player: `kycNoticeDismissValue(userId)` in
 * `src/lib/server/kyc-notice.ts` (it hashes with `node:crypto`, so it lives on the server), handed
 * to the notice, which writes exactly that; the server counts the notice dismissed only when the
 * cookie equals the value for the signed-in player. ⚠️ A browser still holding the legacy `dismissed`
 * sees the notice ONCE more — the honest cost of a value that never said whose it was.
 * ⛔ There is deliberately no constant for that legacy value any more: nothing may compare to it.
 */
import type { KycGateState } from "./kyc-gate-state";

export const KYC_NOTICE_COOKIE = "kp-kyc-notice";
/** 400 days — the most a browser will honour for a cookie's lifetime. */
export const KYC_NOTICE_MAX_AGE_S = 60 * 60 * 24 * 400;

/**
 * The identity states the notice is for: nothing has been SENT yet. Every later state has its own
 * voice (documents with our team, more information, a refusal — each an event notice), and an account
 * approved once is never asked again (`kycGateState` answers null).
 */
export function kycNoticeStateDue(state: KycGateState | null): boolean {
  return state === "not_started" || state === "uploaded";
}
