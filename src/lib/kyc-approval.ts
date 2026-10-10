/**
 * ONE PREDICATE — "has this account ever satisfied us?" — for the server AND the page.
 * ⭐ And, since 2026-10-10, its companion — "was that approval only the machine's?" (`uncheckedAutomaticApproval`).
 *
 * ⭐ WHY IT IS ITS OWN FILE. Two sides answer this question: the withdrawal gate
 * (`src/lib/server/kyc-gate.ts`), which decides, and the screens (`/wallet/withdraw`, the
 * first-deposit notice via `kycGateState`, the admin roster), which draw what the player may do. Until
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
 * `approvedAt` is set once, on the FIRST approval, and NEVER cleared — not by an officer's
 * `askForCorrections`, not by a rejection, not by `startKyc`'s reset of a refused submission.
 * Asking it rather than the current status is what stops a re-verification freezing money a
 * player earned under an identity we accepted: that player is `ADDITIONAL_INFO_REQUIRED` today
 * and was approved last month, and their payout stays open. An officer who genuinely needs to
 * stop money leaving freezes the wallet — a money control, not an identity status.
 * ⭐ Since 2026-10-10 an `approvedAt` may be the MACHINE's (an automatic approval of typed details), so a
 * recoverable refusal of an automatic approval no officer has checked REQUIRES that freeze (`reviewKyc`).
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

/** The three facts the companion question needs (`StoredKyc` carries them; so does the post-check list's row). */
export type AutomaticApprovalFacts = { approvedAt?: string | null; autoApprovedAt?: string | null; postCheckedAt?: string | null } | null | undefined;

/**
 * ⭐ THE COMPANION QUESTION (2026-10-10, reviews R1.2 and R5.1) — is the approval behind `approvedEver` ONLY THE
 * MACHINE'S: approved automatically from typed details (`autoApprovedAt`) and never checked by an officer since
 * (`postCheckedAt`)? Such an `approvedAt` keeps withdrawal open for good and records no officer's acceptance, so:
 *   · a RECOVERABLE refusal of it must hold the wallet as well (`reviewKyc`; the workstation ticks and locks the freeze);
 *   · re-opening a FINAL refusal of it keeps the identity hold (`reopenFinalRefusal`) — only an officer's approval lifts it;
 *   · it is the officers' post-check population (`listUncheckedAutoApprovals`, both stores).
 * ⛔ STATUS-INDEPENDENT ON PURPOSE. Until R5.1 the service and the workstation asked it only of APPROVED and
 * ADDITIONAL_INFO_REQUIRED rows, and three ordinary writes move such an approval to PENDING_REVIEW with all three facts
 * intact — an agent photo send (`submitForReview`), a corrected send routed on the officer's provenance, a date-of-birth
 * correction — so a recoverable refusal there landed with the money still flowing, on an identity no officer accepted.
 * A caller that needs a status asks it beside this, never inside it.
 */
export function uncheckedAutomaticApproval(facts: AutomaticApprovalFacts): boolean {
  return !!facts?.approvedAt && !!facts?.autoApprovedAt && !facts?.postCheckedAt;
}

/**
 * The statuses an unchecked automatic approval stays on the officers' post-check list in (`listUncheckedAutoApprovals`,
 * BOTH stores read this one list): approved, with an officer (a photo send, a routed correction), or with the player
 * (corrections asked). ⛔ Not REJECTED, IN_PROGRESS or NOT_STARTED: a refusal has decided it, and a restart or re-open
 * holds no identity to check. (A re-open that KEPT a machine-only approval — `reopenFinalRefusal` — comes back onto the
 * list with the player's next send, which an officer then decides.)
 */
export const POST_CHECK_LIST_STATUSES = ["APPROVED", "PENDING_REVIEW", "ADDITIONAL_INFO_REQUIRED"] as const;
