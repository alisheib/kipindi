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
 * The RECOVERABLE codes an officer may choose for a NEW decision (2026-10-10, typed-only KYC). ⛔ `BLURRY_DOC`
 * ("the photo was too blurry") is not among them: a player no longer uploads a photo, so it can describe no new
 * refusal — it stays in the database enum and on every screen that DISPLAYS a refusal, because rows decided before
 * 2026-10-10 carry it. `reviewKyc` refuses it for a new decision; the officer's picker offers these three.
 */
export const NEW_RECOVERABLE_REFUSAL_CODES = ["DETAILS_MISMATCH", "EXPIRED_ID", "OTHER"] as const;
export type NewRecoverableRefusalCode = (typeof NEW_RECOVERABLE_REFUSAL_CODES)[number];

/** True when an officer may choose this code for a new decision — the three recoverable codes above or a FINAL one. */
export function isDecidableRefusalCode(code: string | null | undefined): code is NewRecoverableRefusalCode | FinalRefusalCode {
  return !!code && ((NEW_RECOVERABLE_REFUSAL_CODES as readonly string[]).includes(code) || isFinalRefusal(code));
}

/**
 * Does this submission still HOLD its document number against other accounts?
 * Exactly the partial-index predicate: not refused, or refused on a final code.
 */
export function holdsDocumentNumber(row: { status: string; rejectReason?: string | null }): boolean {
  return row.status !== "REJECTED" || isFinalRefusal(row.rejectReason);
}

/**
 * IS THE DOOR TO /profile/kyc OFFERED TO THIS READER? Not once the identity is APPROVED (the door asked a verified player to
 * do what is done — `/profile`'s ruling of 2026-09-13), and not after a FINAL refusal (`startKyc` refuses a restart; the
 * page itself, reached from its status pill, explains the refusal). Everything else — no row yet, in review, more
 * information asked, a refusal the player can fix — is offered.
 * ⭐ ONE QUESTION FOR EVERY DOOR (round 6 of the visual pass, 2026-10-09, review C13): `/profile`'s settings row, the Akaunti
 * hub's row (`hub-viewer.ts`) and the journey's avatar menu (`app-shell.tsx`) each ask this. ⛔ A KYC row that could not be
 * READ is not "no row yet": the caller offers no door then — a verified player is never told to verify on the strength of a
 * failed query.
 */
export function kycDoorOffered(status: string | null | undefined, rejectReason: string | null | undefined): boolean {
  const level = status ?? "NOT_STARTED";
  return level !== "APPROVED" && !(level === "REJECTED" && isFinalRefusal(rejectReason));
}
