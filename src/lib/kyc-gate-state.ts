/**
 * A KYC submission → the identity panel's own vocabulary. Pure, and deliberately NOT in a
 * `"use client"` file.
 *
 * 🔴 IT LIVED IN `kyc-gate-panel.tsx` FOR ONE COMMIT AND THAT WAS A SITE-WIDE OUTAGE.
 * That file is `"use client"`, so exporting a plain function from it makes the function a
 * client reference. Every caller is a SERVER component — then `AppShell`, the withdraw page and
 * the agent application; from 2026-09-13 the withdraw page, the agent application, `/wallet` and
 * the card-deposit return page — and calling it from the server throws:
 *
 *     Attempted to call kycGateState() from the server but kycGateState is on the client.
 *
 * ⛔ `AppShell` renders on EVERY page, so the blast radius was the whole site, not the
 * money screens. ⚠️ AND NEITHER `tsc` NOR `next build` SAW IT: the boundary is a runtime
 * contract, and both were clean. It surfaced the first time a browser actually loaded a
 * page — `qa:kyc-gate`, on the run that was meant to check button sizes.
 * (`AppShell` stopped calling this on 2026-09-13, when the app-wide identity bar it fed was
 * deleted. The lesson is unchanged for every server caller that remains.)
 *
 * ⛔ Do not move this back beside the component "to keep them together". The component may
 * import from here; nothing server-side may import from the component.
 *
 * ── WHAT CHANGED 2026-09-13 ─────────────────────────────────────────────────────────────
 *
 * ⭐ IT TAKES THE ROW'S FACTS, NOT A BARE STATUS, and has SIX states where it had four:
 *   · `uploaded` — split out of `not_started`. "You attached photos and stopped" and "you have
 *     never opened this" were one state while the panel meant "you cannot"; from 2026-09-13 it
 *     addresses somebody reaching for their money, and the two need different sentences and
 *     different buttons. Decided by `documentCount > 0` ALONE, the rule `kyc-stage.ts` already
 *     uses for the admin roster — never by a "file ever arrived" flag, which reads a restarted
 *     once-approved player as "uploaded".
 *     ⭐ These two — `not_started` and `uploaded`, "nothing submitted yet" — are exactly the states
 *     for which the first-deposit notice (`kyc-first-deposit-notice.tsx`) is due, once the account
 *     holds a confirmed deposit. Every later state has its own event notice.
 *   · `refused_final` — split out of `rejected`. A FINAL refusal (`kyc-refusal.ts`) cannot be
 *     restarted by the player, and its wallet is frozen while an officer decides the balance — so
 *     "try again" and "your balance is safe" would both be false on it.
 *
 * ── WHAT CHANGED 2026-09-14 (audit session 95, U1) ──────────────────────────────────────
 *
 * 🔴 A FINAL REFUSAL NOW OUTRANKS AN EARLIER APPROVAL. The approved-ever check used to run first,
 * so an account approved once, then re-verified and refused on a FINAL code, answered `null` — and
 * `/wallet/withdraw` drew the full payout form over a wallet the refusal had frozen. The player
 * learned only at confirm. A final refusal freezes the wallet in the same step (`IDENTITY_REFUSED`)
 * and only an officer reopening the refusal lifts it (`kyc.refusal_reopened` moves the submission off
 * REJECTED in that step), so while this row is REJECTED on a final code the money cannot leave
 * whatever `approvedEver` says, and the panel must say so.
 * ⭐ Every caller was re-read for this: the withdraw page draws the refusal panel instead of the form;
 * the first-deposit notice is still not due (`kycNoticeStateDue` names only the two "nothing sent"
 * states); the agent application's invitee meets the same "contact support" panel a never-approved
 * refused invitee already met — and could not pay its fee anyway (`walletPay.kycApproved` asks
 * status APPROVED).
 * ⚠️ `assertIdentityForPayout` still asks `approvedEver` alone, and that is right: the refusal's
 * money control is the wallet freeze, not an identity status. The screen and the server agree
 * because the freeze is always there with the refusal.
 */
import { approvedEver } from "./kyc-approval";
import { isFinalRefusal } from "./kyc-refusal";

/** Which identity state the player is in, in the panel's own vocabulary. */
export type KycGateState = "not_started" | "uploaded" | "pending_review" | "more_info" | "rejected" | "refused_final";

/**
 * What the identity panel can draw: every identity state, plus `frozen` — a WALLET fact, never derived
 * here. The withdraw page chooses it when the wallet is not ACTIVE (an officer hold, self-exclusion)
 * and the identity state is not already `refused_final`, so the payout form is never drawn over money
 * that cannot leave (2026-09-14).
 */
export type KycPanelState = KycGateState | "frozen";

/** The facts the derivation reads. Every KYC shape on the server has them. */
export type KycGateFacts = {
  status?: string | null;
  approvedAt?: string | null;
  rejectReason?: string | null;
  /** Either the real document count, or the documents themselves. */
  documentCount?: number;
  documents?: readonly unknown[] | null;
} | null | undefined;

/**
 * Map a submission onto the panel's vocabulary.
 *
 * ⛔ AN ACCOUNT APPROVED AT LEAST ONCE RETURNS `null`, AND CALLERS MUST BRANCH ON THAT rather than
 * defaulting to a panel. It asks `approvedEver` — the withdrawal gate's own question — so a player
 * under re-verification, who may still withdraw, is never shown a wall on the withdraw screen.
 * An approved player seeing any gate at all is the worst failure this has: it withholds a control
 * they are entitled to, on a money screen.
 * 🔴 WITH ONE EXCEPTION, ASKED FIRST (2026-09-14): a submission REJECTED on a FINAL code is
 * `refused_final` even when it was approved before. That wallet is frozen by the refusal, so the
 * form would be a control the player is NOT entitled to — the opposite failure. A RECOVERABLE
 * refusal after an approval still answers `null`: nothing about that account's money changed.
 * ⚠️ A MISSING ROW IS `not_started`, matching `assertIdentityForPayout`. If these two ever disagree,
 * the screen and the server tell different stories about the same account.
 */
export function kycGateState(facts: KycGateFacts): KycGateState | null {
  if (facts?.status === "REJECTED" && isFinalRefusal(facts?.rejectReason)) return "refused_final";
  if (approvedEver(facts)) return null;
  const documentCount = facts?.documentCount ?? facts?.documents?.length ?? 0;
  switch (facts?.status) {
    case "PENDING_REVIEW": return "pending_review";
    case "ADDITIONAL_INFO_REQUIRED": return "more_info";
    case "REJECTED": return "rejected"; // a FINAL code already answered `refused_final` above
    case "IN_PROGRESS": return documentCount > 0 ? "uploaded" : "not_started";
    default: return "not_started"; // NOT_STARTED, and no row at all
  }
}
