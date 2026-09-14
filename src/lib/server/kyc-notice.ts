/**
 * IS THE FIRST-DEPOSIT IDENTITY NOTICE DUE? — the ONE server answer, used by /wallet and the card
 * deposit return page (2026-09-13). It was written twice, once in each page, each pointing at the
 * other; a page file cannot export a helper, so the rule lives here.
 *
 * Due ⇔ this browser has not dismissed it · the account has sent no identity documents yet
 * (`kycNoticeStateDue`) · the account holds at least one CONFIRMED deposit.
 *
 * ⛔ NEVER THROWS, AND A FAILED READ IS "NOT DUE". A courtesy notice must never be the thing that
 * breaks a money page, and a failed read must never put an identity prompt in front of anybody.
 * ⭐ CHEAPEST QUESTION FIRST: the dismissal (a cookie the caller already has), then what the caller
 * already knows about deposits, then the KYC row, and only then a deposit aggregate — so a dismissed
 * browser or a verified account costs at most one indexed read.
 */
import { db } from "./store";
import { kycGateState } from "@/lib/kyc-gate-state";
import { kycNoticeStateDue } from "@/lib/kyc-notice";

export async function firstDepositNoticeDue(
  userId: string,
  opts: {
    /** The `kp-kyc-notice` cookie said "dismissed" (the caller reads cookies; this module stays testable). */
    dismissed: boolean;
    /** true/false when the caller's own loaded rows already answer "any confirmed deposit?"; null = ask the store. */
    depositInHand?: boolean | null;
  },
): Promise<boolean> {
  try {
    if (opts.dismissed) return false;
    if (opts.depositInHand === false) return false;
    if (!kycNoticeStateDue(kycGateState(await db.kyc.findByUserId(userId)))) return false;
    return opts.depositInHand ?? ((await db.txn.sumDepositsSince(userId, 0)) > 0);
  } catch {
    return false;
  }
}
