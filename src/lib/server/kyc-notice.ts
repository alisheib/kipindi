/**
 * IS THE FIRST-DEPOSIT IDENTITY NOTICE DUE? — the ONE server answer, used by /wallet and the card
 * deposit return page (2026-09-13). It was written twice, once in each page, each pointing at the
 * other; a page file cannot export a helper, so the rule lives here.
 *
 * Due ⇔ THIS PLAYER has not dismissed it in this browser · the account has sent no identity documents
 * yet (`kycNoticeStateDue`) · the account holds at least one CONFIRMED deposit.
 *
 * ⛔ NEVER THROWS, AND A FAILED READ IS "NOT DUE". A courtesy notice must never be the thing that
 * breaks a money page, and a failed read must never put an identity prompt in front of anybody.
 * ⭐ CHEAPEST QUESTION FIRST: the dismissal (a cookie the caller already has), then what the caller
 * already knows about deposits, then the KYC row, and only then a deposit aggregate — so a dismissed
 * browser or a verified account costs at most one indexed read.
 *
 * 🔴 THE DISMISSAL IS PER PLAYER, NOT PER BROWSER (2026-09-14, audit session 95, U2). The cookie used
 * to hold the bare word `dismissed`, so on a shared phone one player's X hid the notice from the next
 * player to sign in. The caller now hands over the RAW cookie, and it counts only when it equals
 * `kycNoticeDismissValue(userId)` — the value the pages give the notice to write. A legacy `dismissed`
 * therefore reads as not dismissed, and that browser sees the notice once more.
 * ⛔ SERVER-ONLY: it hashes with `node:crypto`. The value is not a secret (anyone who knows an id could
 * compute it, and all it can do is hide a courtesy line); it is a binding, so one player's dismissal
 * cannot speak for another's.
 */
import { createHash } from "node:crypto";
import { db } from "./store";
import { kycGateState } from "@/lib/kyc-gate-state";
import { kycNoticeStateDue } from "@/lib/kyc-notice";

/** The `kp-kyc-notice` value that means "THIS player dismissed it": `d:` + 16 hex of a sha256 over the id. */
export function kycNoticeDismissValue(userId: string): string {
  return `d:${createHash("sha256").update(`kyc-notice:${userId}`).digest("hex").slice(0, 16)}`;
}

export async function firstDepositNoticeDue(
  userId: string,
  opts: {
    /** The RAW `kp-kyc-notice` cookie value, or null/undefined when there is none. The caller reads
     *  cookies (this module stays testable); only this module decides whose dismissal it is. */
    dismissCookie: string | null | undefined;
    /** true/false when the caller's own loaded rows already answer "any confirmed deposit?"; null = ask the store. */
    depositInHand?: boolean | null;
  },
): Promise<boolean> {
  try {
    if (opts.dismissCookie && opts.dismissCookie === kycNoticeDismissValue(userId)) return false;
    if (opts.depositInHand === false) return false;
    if (!kycNoticeStateDue(kycGateState(await db.kyc.findByUserId(userId)))) return false;
    return opts.depositInHand ?? ((await db.txn.sumDepositsSince(userId, 0)) > 0);
  } catch {
    return false;
  }
}
