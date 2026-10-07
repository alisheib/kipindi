/**
 * IS THE FIRST-DEPOSIT NOTICE DUE, AND WHICH ONE? — the ONE server answer, used by /wallet and the card
 * deposit return page (2026-09-13). It was written twice, once in each page, each pointing at the
 * other; a page file cannot export a helper, so the rule lives here.
 *
 * Due ⇔ THIS PLAYER has not dismissed it in this browser · something is still owed before a withdrawal —
 * identity documents not yet sent (`kycNoticeStateDue`) and/or (from 2026-10-07) a confirmed email address ·
 * the account holds at least one CONFIRMED deposit.
 *
 * ⭐ WHICH ONE (owner ruling 2026-10-07). The confirmed email moved from deposits to withdrawals, and Ali chose the quiet
 * way to ask for it — the same as identity: the withdraw screen's card, this one note, and the profile. So the note has
 * three wordings — `identity`, `email`, `both` (`firstDepositNotice`) — and ONE dismissal covers whichever is shown: it
 * is a courtesy line, and the withdraw screen says the live state whatever the note did.
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
import { kycNoticeStateDue, type FirstDepositNotice } from "@/lib/kyc-notice";

/** The `kp-kyc-notice` value that means "THIS player dismissed it": `d:` + 16 hex of a sha256 over the id. */
export function kycNoticeDismissValue(userId: string): string {
  return `d:${createHash("sha256").update(`kyc-notice:${userId}`).digest("hex").slice(0, 16)}`;
}

type NoticeOpts = {
  /** The RAW `kp-kyc-notice` cookie value, or null/undefined when there is none. The caller reads
   *  cookies (this module stays testable); only this module decides whose dismissal it is. */
  dismissCookie: string | null | undefined;
  /** true/false when the caller's own loaded rows already answer "any confirmed deposit?"; null = ask the store. */
  depositInHand?: boolean | null;
};

/**
 * Which wording of the note is due, or null. ⛔ A failed read is null — never an identity OR an email prompt on the
 * strength of a failed query — and a missing account row owes no email (nothing to say it is unconfirmed).
 */
export async function firstDepositNotice(userId: string, opts: NoticeOpts): Promise<FirstDepositNotice | null> {
  try {
    if (opts.dismissCookie && opts.dismissCookie === kycNoticeDismissValue(userId)) return null;
    if (opts.depositInHand === false) return null;
    const identity = kycNoticeStateDue(kycGateState(await db.kyc.findByUserId(userId)));
    const account = await db.user.findById(userId);
    const email = !!account && !account.emailVerifiedAt;
    if (!identity && !email) return null;
    const deposited = opts.depositInHand ?? ((await db.txn.sumDepositsSince(userId, 0)) > 0);
    if (!deposited) return null;
    return identity && email ? "both" : identity ? "identity" : "email";
  } catch {
    return null;
  }
}

/** Is any wording due — the question the tests and the dismiss scope ask. */
export async function firstDepositNoticeDue(userId: string, opts: NoticeOpts): Promise<boolean> {
  return (await firstDepositNotice(userId, opts)) !== null;
}
