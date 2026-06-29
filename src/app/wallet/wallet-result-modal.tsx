"use client";

/**
 * Shows the unified OperationResultModal after a deposit/withdrawal redirects
 * back to /wallet with result params, then clears the params on close so it
 * doesn't reappear on refresh. Kit rule: every consequential money mutation
 * confirms through this modal.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n";
import { OperationResultModal } from "@/components/markets/operation-result-modal";

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
  // Trigger a global refresh so the balance pill and any other live
  // components pick up the new wallet state immediately.
  useEffect(() => {
    if (deposited || withdrawal) {
      window.dispatchEvent(new Event("50pick:refresh"));
    }
  }, [deposited, withdrawal]);

  if (!deposited && !withdrawal) return null;

  const txnId = deposited || withdrawal || "";
  const amt = amount ? `TZS ${Number(amount).toLocaleString("en-US")}` : undefined;
  const isWithdraw = !!withdrawal;
  const amlHeld = isWithdraw && status === "AML_REVIEW";
  // Async collection/payout: money hasn't moved yet — it settles on the
  // provider's webhook. Show a clear "awaiting confirmation" state, not success.
  const pending = status === "PROCESSING";

  const close = () => { setOpen(false); router.replace("/wallet"); };

  const eyebrow = isWithdraw
    ? (amlHeld ? t.common.underReviewEyebrow : pending ? t.common.payoutStarted : t.common.withdrawalSent)
    : (pending ? t.common.depositStarted : t.common.depositConfirmed);
  const title = isWithdraw
    ? (amlHeld ? t.common.withdrawalUnderReview : pending ? t.common.payoutInProgress : t.common.withdrawalOnItsWay)
    : (pending ? t.common.awaitingConfirmation : t.common.fundsAdded);
  const subtitle = isWithdraw
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
      variant={amlHeld || pending ? "warning" : "success"}
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
