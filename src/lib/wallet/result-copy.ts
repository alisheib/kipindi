/**
 * THE /wallet RESULT'S WORDS — eyebrow, title, subtitle and tone — for a deposit or withdrawal that just redirected back
 * (`WalletResultModal`). Pure and client-safe: the modal renders exactly what this returns.
 *
 * ⭐ Two deposit kinds are decided on the SERVER from the stored row (`depositResultKind`, lib/wallet/receipts.ts) and
 * override the stored-status reading (S9 release candidate, Ali 2026-10-14):
 *   · "review" (L6) — a deposit whose result is under review says so: "In review" · "Payment under review" · Ali's
 *     sentence (`wallet.reviewResultBody`). It used to read its raw stored status: "Failed / Deposit didn't go through"
 *     over a FAILED row, or "Funds added" over a CONFIRMED one, while its receipt said "under review".
 *   · "held" — a deposit held for return is NAMED so: "Held for return" · the card return's title · its approved body —
 *     never "Reversed" (the title matches the body wherever a held deposit is named).
 * Every other result keeps the reading route audit D3a gave it (2026-10-06): only CONFIRMED is done; PENDING and
 * PROCESSING are moving; FAILED, REVERSED and CANCELLED are not done; an unknown status reads as moving.
 */
import type { Dict } from "@/lib/i18n-dict";
import type { DepositResultKind } from "./receipts";
import { resultPhase, type ResultTxnStatus } from "./result-phase";

export type WalletResultTone = "success" | "info" | "neutral" | "danger";
export type WalletResultCopy = { eyebrow: string; title: string; subtitle?: string; variant: WalletResultTone };

export function walletResultCopy(
  t: Dict,
  o: { isWithdraw: boolean; status?: string | null; depositKind?: DepositResultKind | null },
): WalletResultCopy {
  const { isWithdraw, status } = o;
  // A deposit in AML_REVIEW is held for return unless the server said otherwise (the only way a deposit reaches it).
  const kind = isWithdraw ? null : (o.depositKind ?? (status === "AML_REVIEW" ? "held" : null));
  if (kind === "review") {
    // Waiting is royal (§B11 item 5): the money is being checked, not refused.
    return { eyebrow: t.wallet.txnStatusReview, title: t.wallet.returnReviewTitle, subtitle: t.wallet.reviewResultBody, variant: "info" };
  }
  if (kind === "held") {
    // Slate, as before (§C4): nothing to do and nothing wrong — it was never added and it is owed back.
    return { eyebrow: t.wallet.txnStatusHeld, title: t.wallet.returnReversedTitle, subtitle: t.wallet.returnReversedBody, variant: "neutral" };
  }
  const amlHeld = isWithdraw && status === "AML_REVIEW";
  const phase = resultPhase(status);
  const pending = phase === "moving";
  const notDone = phase === "notDone";
  const STATUS_WORD: Record<ResultTxnStatus, string> = {
    PENDING: t.wallet.txnStatusPending,
    PROCESSING: t.wallet.txnStatusProcessing,
    AML_REVIEW: t.wallet.txnStatusReview,
    CONFIRMED: t.wallet.txnStatusConfirmed,
    FAILED: t.wallet.txnStatusFailed,
    REVERSED: t.wallet.txnStatusReversed,
    CANCELLED: t.wallet.txnStatusCancelled,
  };
  const eyebrow = notDone
    ? (STATUS_WORD[status as ResultTxnStatus] ?? t.wallet.txnStatusFailed)
    : isWithdraw
      ? (amlHeld ? t.common.underReviewEyebrow : pending ? t.common.payoutStarted : t.common.withdrawalSent)
      : (pending ? t.common.depositStarted : t.common.depositConfirmed);
  const title = notDone
    ? (isWithdraw ? t.wallet.withdrawFailed : t.wallet.depositFailed)
    : isWithdraw
      ? (amlHeld ? t.common.withdrawalUnderReview : pending ? t.common.payoutInProgress : t.common.withdrawalOnItsWay)
      : (pending ? t.common.awaitingConfirmation : t.common.fundsAdded);
  const subtitle = notDone
    ? undefined
    : isWithdraw
      ? (amlHeld ? t.common.amlReviewBody : pending ? t.common.payoutProcessingBody : t.common.payoutMomentsBody)
      : (pending ? t.common.depositPendingBody : t.common.balanceToppedUp);
  /* THE SEVEN PAYMENT WORDS, IN THE DICTIONARY'S TONES (R5-C, 2026-10-09): waiting is royal (`info`), Completed is
     success, Failed is the failure colour (`danger`), Reversed and Cancelled are slate (`neutral`, §C4). */
  const variant: WalletResultTone = notDone ? (status === "FAILED" ? "danger" : "neutral") : (amlHeld || pending ? "info" : "success");
  return { eyebrow, title, subtitle, variant };
}
