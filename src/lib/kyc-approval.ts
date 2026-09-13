/**
 * ONE PREDICATE — "has this account ever satisfied us?" — for the server AND the page.
 *
 * ⭐ WHY IT IS ITS OWN FILE. Two sides answer this question: the withdrawal gate
 * (`src/lib/server/kyc-gate.ts`), which decides, and the screens (`/wallet/withdraw`, the
 * standing identity bar, the admin roster), which draw what the player may do. Until
 * 2026-09-13 each side wrote its own expression, and they disagreed:
 *
 *     page:    everApproved = !!k?.approvedAt
 *     server:  if (k?.approvedAt) eligible; if (status === "APPROVED") eligible
 *
 * 🔴 SO AN `APPROVED` ROW WITH NO `approvedAt` STAMP WAS PAID BY THE SERVER AND WALLED OFF BY
 * THE PAGE — a "verify your identity" panel shown to a verified player holding money, on the
 * one screen whose job is to let them take it out. That row is reachable (a submission written
 * before the stamp existed whose backfill did not run, or one created outside `reviewKyc`), and
 * the gate's own comment records that a test fixture — not review — found it. It stayed nearly
 * invisible only while such a player could not have deposited either; from 2026-09-13 they can.
 *
 * ⛔ PURE, AND DELIBERATELY NOT `"use client"`. Server components call this. A plain function
 * exported from a `"use client"` file becomes a client reference, and calling it from the server
 * throws — which once took down every page on this site while `tsc` and `next build` were both
 * clean (`kyc-gate-state.ts` carries that scar). It imports nothing.
 *
 * ── THE ASYMMETRY, WHICH IS THE WHOLE MONEY-SAFETY STORY ────────────────────────────────────
 *
 * `approvedAt` is set once, on the FIRST approval, and NEVER cleared — not by
 * `forceReverifyKyc`, not by a rejection, not by `startKyc`'s reset of a refused submission.
 * Asking it rather than the current status is what stops a re-verification freezing money a
 * player earned under an identity we accepted: that player is `ADDITIONAL_INFO_REQUIRED` today
 * and was approved last month, and their payout stays open. An officer who genuinely needs to
 * stop money leaving freezes the wallet — a money control, not an identity status.
 *
 * `status === "APPROVED"` is the second half, and it is neither redundant nor a loophole: it
 * answers "approved right now" for a row whose stamp is missing. Both halves demand an approval
 * — one ever, one now — so neither can let an unapproved account through.
 */

/** The two facts the question needs. Every KYC shape on both sides of the wire has them. */
export type ApprovalFacts = { status?: string | null; approvedAt?: string | null } | null | undefined;

/** True when this account has been approved at least once — the withdrawal question. */
export function approvedEver(facts: ApprovalFacts): boolean {
  return !!facts?.approvedAt || facts?.status === "APPROVED";
}
