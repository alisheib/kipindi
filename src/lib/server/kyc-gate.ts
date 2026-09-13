/**
 * THE IDENTITY GATE ON MONEY LEAVING — one question, one answer, one place.
 *
 * ⭐ THE RULE (owner ruling, Ali, 2026-09-13 — docs/COMPLIANCE-DECISIONS.md):
 * identity is required before money is WITHDRAWN, and before nothing else.
 * The ladder is: **register → confirm email → deposit and play → verify identity → withdraw**.
 *
 * ⛔ READ THE DATES BEFORE CHANGING ANYTHING HERE. This area has been inverted three times:
 *   · 2026-08-20 — identity stopped being a precondition of withdrawal, and a RECORD replaced it;
 *   · 2026-09-05 — identity was required before depositing, betting AND withdrawing;
 *   · 2026-09-13 — identity is required before withdrawing only (this file).
 * The 2026-09-05 entry, its Board letter (`BOARD-DISCLOSURE-KYC-FIRST.md`, never sent) and every
 * comment written between those dates describe a gate that no longer exists. ⛔ Do not add a
 * deposit or bet question back by reading them — and do not add one "for safety" either: a gate
 * that asks nothing the product needs answered only strands the people it catches.
 *
 * ── WHY THIS FILE EXPORTS ONE GATE AND NO ACTION PARAMETER ───────────────────────────────────
 *
 * It used to export `assertKycForMoney(userId, action: "DEPOSIT" | "BET" | "WITHDRAW")`. The
 * 2026-09-13 change could have made DEPOSIT and BET simply answer `eligible: true` — every call
 * site would still compile, every call site would still read like enforcement, and the next
 * session would inherit a gate that does nothing while looking like it does. ⛔ That is the most
 * dangerous shape a money gate can take. So the union is DELETED rather than narrowed (a
 * one-member union declares a choice that does not exist, and leaves `"DEPOSIT"` one literal away
 * from returning), and the function is RENAMED, so any caller still trying to gate a deposit or a
 * stake is a compile error, not a silent pass.
 *
 * ── TWO EXPORTS, OPPOSITE FAILURE DIRECTIONS ─────────────────────────────────────────────────
 *
 * `assertIdentityForPayout` DECIDES, and a failed read REFUSES: "we could not check" is not "you
 * are verified". `withdraw()` surfaces a thrown read as a system failure, not an identity refusal.
 *
 * `readIdentityStanding` RECORDS, and a failed read NEVER refuses and NEVER throws. It stamps the
 * account's standing onto the audit rows of deposits and bets — money the player has already
 * decided to send, or a stake already committed — so it must not be able to stop either. A read
 * that fails is recorded as `"UNREADABLE"`, as itself: collapsing it into `"NOT_STARTED"` would
 * turn a fact about our database into a claim about the player.
 *
 * ── WHAT THIS FILE MUST NEVER DO ─────────────────────────────────────────────────────────────
 *
 * ⛔ NEVER READ `session.kycStatus`. It is stamped into the signed cookie at login and is read by
 * nothing that decides anything: a cookie is a 7-day-old photograph. A player approved at 10:00
 * must be payable at 10:01.
 *
 * ⛔ NEVER CALL THE GATE ON A CREDIT PATH. Settlement, cash-out, refunds and every
 * deposit-completion path (webhook, return leg, fast-credit lane, reconcile sweep) complete a
 * deposit already paid for or return money that is already the player's.
 *
 * ⛔ NEVER GATE AHEAD OF A RESPONSIBLE-GAMBLING CONTROL. A self-excluded player must be told about
 * their own break, which carries a date they are entitled to — never sent on an identity errand.
 *
 * ⚠️ AND THIS IS NO LONGER THE ONLY WAY A WITHDRAWAL IS STOPPED FOR AN IDENTITY REASON. A FINAL
 * refusal (`UNDERAGE`, `SANCTIONED`, `DUPLICATE_IDENTITY`) freezes the wallet in the same step
 * (`wallet-freeze.ts`), and what then happens to the balance is an officer's recorded decision
 * (`refused-funds.ts`). This gate answers "has this account ever been approved?" and nothing else.
 */
import { db } from "./store";
import type { FailureReason } from "@/lib/failure-reasons";
import { approvedEver } from "@/lib/kyc-approval";

export type KycGateStatus = NonNullable<Awaited<ReturnType<typeof db.kyc.findByUserId>>>["status"];

/**
 * The gate's answer, carrying the facts the withdrawal's audit rows need.
 *
 * ⭐ ONE READ, NOT TWO. `withdraw()` used to call the gate AND read the KYC row a second time to
 * build its compliance stamp — two reads separated by an `await`, which can disagree if an officer
 * decides in between, so the audit could narrate a status that did not make the decision. The
 * facts now come back from the read that decided.
 */
export type PayoutIdentity =
  | { eligible: true; kycStatus: KycGateStatus; firstApprovedAt: string | null }
  | { eligible: false; kycStatus: KycGateStatus; firstApprovedAt: null; reason: FailureReason };

/**
 * Why a refusal happened, as a machine token — never as prose.
 *
 * ⭐ FOUR REASONS, NOT ONE, because "you cannot withdraw yet" is four different sentences with four
 * different next actions: start the form / wait for us / upload what the officer asked for / read
 * why you were turned down. docs/RULES.md §2.3 requires a refusal to name what the player must do.
 *
 * ⛔ `kyc_required` IS NOT ONE OF THEM, AND MUST NOT BE. That name was retired on 2026-08-20 with
 * a reason tied to Board comment #1 (`failure-reasons.ts`); reviving a retired token for a
 * differently-scoped gate is how the next reader inherits the wrong history.
 *
 * ⛔ EACH LITERAL SITS IN A REAL `reason:` POSITION. This map IS the emitter — `withdraw()` returns
 * `reason: gate.reason`, one level of indirection away — and `test:failure-reasons` §9d proves a
 * registry row is reachable by finding the token in a `reason:` property under `src/`.
 *
 * ⚠️ TOTAL OVER `KycStatus`, INCLUDING `APPROVED`. That row is not reached in practice (an
 * approved row is eligible above), and it is kept so a new `KycStatus` member becomes a TYPE error
 * here rather than a silent pass at a money gate.
 */
const REFUSAL_BY_STATUS: Record<KycGateStatus, { reason: FailureReason }> = {
  NOT_STARTED: { reason: "kyc_not_verified" },
  IN_PROGRESS: { reason: "kyc_not_verified" },
  PENDING_REVIEW: { reason: "kyc_pending_review" },
  ADDITIONAL_INFO_REQUIRED: { reason: "kyc_more_info" },
  REJECTED: { reason: "kyc_rejected" },
  APPROVED: { reason: "kyc_not_verified" },
};

/**
 * May this account send money OUT?
 *
 * ⚠️ A MISSING KYC ROW IS "NOT_STARTED", NOT "FINE". A player has no `KycSubmission` until
 * `/profile/kyc` creates one, and from 2026-09-13 most funded players will be in exactly that
 * state when they first reach for their money.
 *
 * ⛔ THE QUESTION IS `approvedEver` — the one predicate the withdraw page also asks
 * (`src/lib/kyc-approval.ts`, which carries the asymmetry's full rationale). Writing the
 * expression out here again is how the page and the server disagreed until 2026-09-13.
 */
export async function assertIdentityForPayout(userId: string): Promise<PayoutIdentity> {
  const k = await db.kyc.findByUserId(userId);
  const kycStatus: KycGateStatus = k?.status ?? "NOT_STARTED";
  if (!approvedEver(k)) {
    return { eligible: false, kycStatus, firstApprovedAt: null, reason: REFUSAL_BY_STATUS[kycStatus].reason };
  }
  return { eligible: true, kycStatus, firstApprovedAt: k?.approvedAt ?? null };
}

/** An account's identity standing as a RECORD — `"UNREADABLE"` when we could not read it. */
export type IdentityStanding = {
  kycStatus: KycGateStatus | "UNREADABLE";
  /** `null` exactly when the read failed. Never `false` on a failure: that would be a claim. */
  everApproved: boolean | null;
};

/**
 * The identity stamp for a deposit's or a bet's EXISTING audit row.
 *
 * ⛔ NEVER THROWS AND NEVER REFUSES — see the header. It is called on the success path, after the
 * money decision is already made, and nothing it returns may be used to decide one.
 *
 * ⛔ AND IT IS A FIELD, NEVER A ROW. Every `audit()` append takes a database-global advisory lock
 * and inserts under a unique `prevHash`: the platform's whole audit log is one serialised writer.
 * A second row per bet would double the load on that single point on the hottest path in the repo.
 * The record is per-event where events are rare and per-field where they are not, because the
 * audit chain is a single global writer. `test:kyc-gate` counts the rows one bet writes.
 */
export async function readIdentityStanding(userId: string): Promise<IdentityStanding> {
  try {
    const k = await db.kyc.findByUserId(userId);
    return { kycStatus: k?.status ?? "NOT_STARTED", everApproved: approvedEver(k) };
  } catch {
    return { kycStatus: "UNREADABLE", everApproved: null };
  }
}
