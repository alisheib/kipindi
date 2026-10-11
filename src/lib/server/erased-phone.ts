/**
 * The erasure tombstone of `User.phoneE164` — written by `anonymizeClosedAccount` (`erasure.ts`), recognised here.
 *
 * ⭐ ITS OWN MODULE (2026-10-11) SO A PAGE CAN ASK "IS THIS ACCOUNT ERASED?" WITHOUT IMPORTING THE ERASURE ROUTINE.
 * `erasure.ts` also carries the owner-managed-account refusal and its alert, and `test:house-bot-surfaces` §3 holds
 * every module an admin page imports DIRECTLY to that feature's word register; `/admin/kyc`'s post-check list needs
 * only this predicate. `erasure.ts` re-exports both functions, so every other caller is unchanged.
 */

/**
 * The tombstone written into `User.phoneE164`.
 *
 * ⛔ NOT NULL AND UNIQUE, so the column must hold something and that something must be
 * unique per account. Keyed on the user id, which we generated (`usr_` and random hex) and which the
 * audit chain already names on every row about this account — so the tombstone reveals
 * nothing the chain does not already have to.
 */
export function erasedPhoneTombstone(userId: string): string {
  return `erased:${userId}`;
}

/** True for a value `erasedPhoneTombstone` wrote. Makes the erasure routine re-runnable. */
export function isErasedPhone(phoneE164: string): boolean {
  return phoneE164.startsWith("erased:");
}
