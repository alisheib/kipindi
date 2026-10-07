"use client";

/**
 * Shows the unified OperationResultModal after a deposit/withdrawal redirects
 * back to /wallet with result params, then clears the params on close so it
 * doesn't reappear on refresh. Kit rule: every consequential money mutation
 * confirms through this modal.
 *
 * 🔴 EVERY STORED STATUS BY NAME, AND ONLY CONFIRMED IS SUCCESS (route audit D3a, 2026-10-06). This used to
 * treat PROCESSING as the one not-yet state and call every other status a success, so a deposit the webhook
 * FAILED, a payout that failed, and a replayed FAILED idempotency key all read "Funds added" / "payout sent".
 * `lib/wallet/result-phase.ts` now names all seven `TxnStatus` values: CONFIRMED is done (the success variant,
 * the only one that auto-closes); PENDING and PROCESSING are moving; AML_REVIEW is a review; FAILED, REVERSED
 * and CANCELLED are not done, and that modal stays open until the player dismisses it. A status this file has
 * never heard of reads as moving — never as done, never as failed.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { OperationResultModal } from "@/components/markets/operation-result-modal";
import { formatTzs } from "@/lib/utils";
import { resultPhase, type ResultTxnStatus } from "@/lib/wallet/result-phase";

export function WalletResultModal({
  deposited,
  withdrawal,
  status,
  amount,
}: {
  deposited?: string;
  withdrawal?: string;
  status?: string;
  amount?: string;
}) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(true);
  // B-16 — no refresh on mount. This modal renders from the search params of a
  // page the server JUST rendered with the post-mutation state (the action
  // redirected here), so dispatching "50pick:refresh" re-fetched a page that
  // could not be fresher — a third RSC fetch per deposit on top of the pair the
  // dial/sell double used to fire. The balance pill is in the same fresh render.

  if (!deposited && !withdrawal) return null;

  const txnId = deposited || withdrawal || "";
  const amt = amount ? formatTzs(Number(amount)) : undefined;
  const isWithdraw = !!withdrawal;
  const amlHeld = isWithdraw && status === "AML_REVIEW";
  // Async collection/payout (PENDING or PROCESSING): money hasn't moved yet — it settles on the
  // provider's webhook. Show a clear "awaiting confirmation" state, not success.
  const phase = resultPhase(status);
  const pending = phase === "moving";
  // A DEPOSIT in AML_REVIEW landed during a break and is held for return — it was never added, so it is
  // not a review the player waits on (that word belongs to a held withdrawal, `amlHeld` above).
  const notDone = phase === "notDone" || (!isWithdraw && phase === "review");
  const STATUS_WORD: Record<ResultTxnStatus, string> = {
    PENDING: t.wallet.txnStatusPending,
    PROCESSING: t.wallet.txnStatusProcessing,
    AML_REVIEW: t.wallet.txnStatusReview,
    CONFIRMED: t.wallet.txnStatusConfirmed,
    FAILED: t.wallet.txnStatusFailed,
    REVERSED: t.wallet.txnStatusReversed,
    CANCELLED: t.wallet.txnStatusCancelled,
  };

  const close = () => { setOpen(false); router.replace("/wallet"); };

  // ⭐ A DEPOSIT HELD FOR RETURN READS "REVERSED" (review of the route audit, 2026-10-07): its in-app notice and its email
  // both say the deposit was reversed, and "In review" over "Deposit didn't go through" told the player the opposite of
  // both — a wait for money that will never be added.
  const eyebrow = notDone
    ? (!isWithdraw && status === "AML_REVIEW" ? t.wallet.txnStatusReversed : (STATUS_WORD[status as ResultTxnStatus] ?? t.wallet.txnStatusFailed))
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
      ? (amlHeld
          ? t.common.amlReviewBody
          : pending
            ? t.common.payoutProcessingBody
            : t.common.payoutMomentsBody)
      : (pending
          ? t.common.depositPendingBody
          : t.common.balanceToppedUp);

  return (
    <OperationResultModal
      open={open}
      variant={notDone ? (phase === "review" ? "warning" : "danger") : (amlHeld || pending ? "warning" : "success")}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      details={[
        ...(amt ? [{ label: t.common.amountLabel, value: amt }] : []),
        { label: t.common.referenceLabel, value: txnId },
      ]}
      footnote={t.common.receiptInHistory}
      primaryLabel={t.common.doneSawa}
      onClose={close}
    />
  );
}
