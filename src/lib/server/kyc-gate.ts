/**
 * THE IDENTITY GATE ON THE MONEY PATH — one question, one answer, one place.
 *
 * ⭐ THE RULE (owner ruling, Ali, 2026-09-05 — docs/COMPLIANCE-DECISIONS.md):
 * a player may not DEPOSIT, BET or WITHDRAW until we have approved their identity.
 * They may register, sign in and walk around the platform; nothing else moves.
 * The ladder is now: **register free → verify identity → everything**.
 *
 * ⛔ THIS REVERSES A RECORDED REGULATOR INSTRUCTION, AND ONLY IN ONE THIRD OF ITS
 * SURFACE. Board comment #1 (2026-08-19, docs/BOARD-DISCLOSURE-B-E.md §1) removed
 * identity as a precondition of WITHDRAWAL. It said nothing about money coming in or
 * about staking — §9.4 of that same letter records deposits being left unbound for an
 * unrelated reason. So:
 *   · DEPOSIT and BET gates are new policy, and contradict nothing;
 *   · the WITHDRAW gate is a deliberate, disclosed reversal, taken by the owner as a
 *     control STRICTER than the Board required. It is recorded in
 *     docs/COMPLIANCE-DECISIONS.md and re-disclosed to the Board.
 * ⛔ Do not "restore" the old behaviour by reading the older document. Read the dates.
 *
 * ── THE TWO QUESTIONS, AND WHY THEY ARE NOT THE SAME QUESTION ──────────────────────
 *
 * DEPOSIT and BET ask `status === "APPROVED"` — CURRENT standing, because both add NEW
 * exposure and we are entitled to stop that the moment a doubt appears.
 *
 * WITHDRAW asks `approvedAt != null` — HAS THIS ACCOUNT EVER SATISFIED US?
 *
 * 🔴 That asymmetry is the whole of the money-safety story here. `forceReverifyKyc`
 * moves an APPROVED player to ADDITIONAL_INFO_REQUIRED, and that player HOLDS REAL
 * MONEY earned under an identity we accepted. Asking current status would freeze it —
 * precisely the harm docs/BOARD-DISCLOSURE-B-E.md §6 named when it recorded that
 * force-reverify had STOPPED being a money control. The same asymmetry covers the real
 * race: a deposit authorised while approved whose Selcom callback lands after a
 * rejection. An officer who genuinely needs to stop money leaving still has the three
 * money controls — freeze the wallet, pause payouts, the AML ≥ 1M two-officer hold.
 *
 * ── WHAT THIS FILE MUST NEVER DO ───────────────────────────────────────────────────
 *
 * ⛔ NEVER READ `session.kycStatus`. It is stamped into the signed cookie at login
 * (`session.ts:35`) and is, deliberately, read by NOTHING that decides anything. A
 * cookie is a 7-day-old photograph: gate on it and a player approved at 10:00 stays
 * locked out until they sign out, while a player rejected at 10:00 keeps spending until
 * Friday. `withdraw()` has always re-read the row for its compliance stamp
 * (`wallet-service.ts`) — this is that same discipline, made the rule.
 *
 * ⛔ NEVER CALL THIS ON A CREDIT PATH. `settleDepositConfirmed`, the Selcom webhook,
 * the return leg, the fast-credit lane, the reconcile sweep, market settlement,
 * cash-out and every refund are OUT OF SCOPE and must stay that way. Those complete a
 * deposit the player has already paid for, or return money that is already theirs.
 * Refusing there takes a player's money and gives them nothing, which is the one
 * outcome no compliance argument can justify.
 *
 * ⛔ NEVER GATE AHEAD OF A RESPONSIBLE-GAMBLING CONTROL. A self-excluded player who is
 * also unverified must be told about the self-exclusion — it is their own protective
 * choice and it carries an end date. Both call sites place this gate AFTER the RG
 * lockout for that reason; `test:deposit-gate` §C pins the ordering.
 */
import { db } from "./store";
import type { FailureReason } from "@/lib/failure-reasons";

/** The three money actions identity gates. Credits and exits are deliberately absent. */
export type MoneyAction = "DEPOSIT" | "BET" | "WITHDRAW";

export type KycGateStatus = NonNullable<Awaited<ReturnType<typeof db.kyc.findByUserId>>>["status"];

export type MoneyEligibility =
  | { eligible: true }
  | { eligible: false; kycStatus: KycGateStatus; reason: FailureReason };

/**
 * Why a refusal happened, as a machine token — never as prose.
 *
 * ⭐ FOUR REASONS, NOT ONE, because "you cannot deposit" is four different sentences
 * with four different next actions: start the form / wait for us / upload what the
 * officer asked for / read why you were turned down. docs/RULES.md §2.3 requires a
 * refusal to name what the player must do, and one token cannot.
 *
 * ⛔ `kyc_required` IS NOT ONE OF THEM, AND MUST NOT BE. That exact name was retired
 * on 2026-08-20 with a reason tied to Board comment #1 (`failure-reasons.ts`), and
 * re-using a retired token for a differently-scoped gate is how the next reader
 * inherits the wrong history.
 */
const REASON_BY_STATUS: Record<KycGateStatus, FailureReason> = {
  NOT_STARTED: "kyc_not_verified",
  IN_PROGRESS: "kyc_not_verified",
  PENDING_REVIEW: "kyc_pending_review",
  ADDITIONAL_INFO_REQUIRED: "kyc_more_info",
  REJECTED: "kyc_rejected",
  APPROVED: "kyc_not_verified", // unreachable: APPROVED never refuses. Kept total so a
                                // new KycStatus member is a TYPE error, not a silent pass.
};

/**
 * May this account move money in this direction?
 *
 * ⚠️ A MISSING KYC ROW IS "NOT_STARTED", NOT "FINE". A brand-new player has no
 * `KycSubmission` until `/profile/kyc` creates one, and defaulting a missing row to
 * eligible would mean the gate is open for exactly the population it exists to stop.
 *
 * ⚠️ AND A FAILED READ REFUSES. Every other read in this codebase degrades toward
 * showing the player more; this one degrades toward moving no money. `findByUserId`
 * throwing is a database problem, and "we could not check" is not "you are verified".
 * The caller surfaces it as a system failure, not as an identity refusal.
 */
export async function assertKycForMoney(userId: string, action: MoneyAction): Promise<MoneyEligibility> {
  const k = await db.kyc.findByUserId(userId);
  const kycStatus: KycGateStatus = k?.status ?? "NOT_STARTED";

  if (action === "WITHDRAW") {
    // ⛔ `approvedAt`, NOT `status`. See the header — this is the branch that decides
    // whether a re-verified player can reach money they already earned.
    if (k?.approvedAt) return { eligible: true };
    return { eligible: false, kycStatus, reason: REASON_BY_STATUS[kycStatus] };
  }

  if (kycStatus === "APPROVED") return { eligible: true };
  return { eligible: false, kycStatus, reason: REASON_BY_STATUS[kycStatus] };
}
