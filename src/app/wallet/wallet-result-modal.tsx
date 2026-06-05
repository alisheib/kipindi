"use client";

/**
 * Shows the unified OperationResultModal after a deposit/withdrawal redirects
 * back to /wallet with result params, then clears the params on close so it
 * doesn't reappear on refresh. Kit rule: every consequential money mutation
 * confirms through this modal.
 */
import { useState } from "react";
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
  if (!deposited && !withdrawal) return null;

  const txnId = deposited || withdrawal || "";
  const amt = amount ? `TZS ${Number(amount).toLocaleString("en-US")}` : undefined;
  const isWithdraw = !!withdrawal;
  const amlHeld = isWithdraw && status === "AML_REVIEW";

  const close = () => { setOpen(false); router.replace("/wallet"); };

  return (
    <OperationResultModal
      open={open}
      variant={amlHeld ? "warning" : "success"}
      eyebrow={isWithdraw ? (amlHeld ? "Under review · Inakaguliwa" : "Withdrawal sent · Imetumwa") : "Deposit confirmed · Imethibitishwa"}
      title={isWithdraw ? (amlHeld ? "Withdrawal under review" : "Withdrawal on its way") : "Funds added"}
      subtitle={
        isWithdraw
          ? (amlHeld ? "Amounts over TZS 1,000,000 are reviewed by compliance (usually within 2 hours)." : "Your provider should pay out within moments.")
          : "Your balance has been topped up."
      }
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
