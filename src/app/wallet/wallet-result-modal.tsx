"use client";

/**
 * Shows the unified OperationResultModal after a deposit/withdrawal redirects
 * back to /wallet with result params, then clears the params on close so it
 * doesn't reappear on refresh. Kit rule: every consequential money mutation
 * confirms through this modal.
 */
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    ? (amlHeld ? "Under review · Inakaguliwa" : pending ? "Payout started · Inatumwa" : "Withdrawal sent · Imetumwa")
    : (pending ? "Deposit started · Inasubiri" : "Deposit confirmed · Imethibitishwa");
  const title = isWithdraw
    ? (amlHeld ? "Withdrawal under review" : pending ? "Payout in progress" : "Withdrawal on its way")
    : (pending ? "Awaiting confirmation" : "Funds added");
  const subtitle = isWithdraw
    ? (amlHeld
        ? "Amounts over TZS 1,000,000 are reviewed by compliance (usually within 2 hours)."
        : pending
          ? "Your provider is processing the payout. We'll confirm the moment it settles · Tutathibitisha mara itakapokamilika."
          : "Your provider should pay out within moments.")
    : (pending
        ? "Approve the prompt on your phone. We'll add the funds the moment your provider confirms — your history updates automatically · Idhinisha kwenye simu yako."
        : "Your balance has been topped up.");

  return (
    <OperationResultModal
      open={open}
      variant={amlHeld || pending ? "warning" : "success"}
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      details={[
        ...(amt ? [{ label: "Amount", sw: "Kiasi", value: amt }] : []),
        { label: "Reference", sw: "Kumbukumbu", value: txnId },
      ]}
      footnote="A receipt is in your wallet history · Risiti ipo kwenye historia."
      primaryLabel="Done · Sawa"
      onClose={close}
    />
  );
}
