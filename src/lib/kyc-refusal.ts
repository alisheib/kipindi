/**
 * FINAL vs RECOVERABLE identity refusals — one list, for the stores, the services and the screens.
 *
 * ⭐ WHY THE DISTINCTION EXISTS (owner ruling, Ali, 2026-09-13 — docs/COMPLIANCE-DECISIONS.md, S1).
 * From 2026-09-13 a player deposits and plays BEFORE anyone checks who they are, so a refusal
 * can land on an account holding real money. The reason code decides what happens next:
 *
 *   · RECOVERABLE — the player can fix it (an unreadable photo, an expired document, details that
 *     do not match, or an uncategorised "other"). They may submit again; nothing about the account
 *     changes; the document number is freed so a real citizen is not locked out by a bad photo.
 *   · FINAL — under 18, a sanctions concern, or an identity already used on another account. The
 *     wallet is frozen in the same step, the document number stays reserved (both unique indexes
 *     say so — `20260913120000_kyc_at_withdrawal`), the player cannot restart verification by
 *     themselves, and what happens to the balance is an officer's recorded decision.
 *
 * ⛔ PURE AND IMPORT-FREE. The admin case page, the player's verification page, `prisma-dal.ts`
 * and the in-memory store all read this, and the stores must ask EXACTLY the question the partial
 * unique indexes ask, or a race resolves differently from a sequential duplicate. Changing this
 * list without a migration that changes both index predicates is a defect.
 */

/** The three refusal codes after which the player cannot simply try again. */
export const FINAL_REFUSAL_CODES = ["UNDERAGE", "SANCTIONED", "DUPLICATE_IDENTITY"] as const;
export type FinalRefusalCode = (typeof FINAL_REFUSAL_CODES)[number];

/** True when a refusal code is one of the three FINAL codes. Anything else — including null — is not. */
export function isFinalRefusal(code: string | null | undefined): code is FinalRefusalCode {
  return !!code && (FINAL_REFUSAL_CODES as readonly string[]).includes(code);
}

/**
 * Does this submission still HOLD its document number against other accounts?
 * Exactly the partial-index predicate: not refused, or refused on a final code.
 */
export function holdsDocumentNumber(row: { status: string; rejectReason?: string | null }): boolean {
  return row.status !== "REJECTED" || isFinalRefusal(row.rejectReason);
}
