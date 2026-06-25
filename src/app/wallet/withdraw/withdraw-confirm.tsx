"use client";

/**
 * WithdrawConfirm — two-step confirmation for withdrawals. Mirrors the
 * SelfExcludeConfirm pattern: shows a summary modal before submitting
 * the form so a player can verify the amount and destination phone
 * before money leaves their account.
 */

import { useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function WithdrawConfirm() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [formSummary, setFormSummary] = useState({ amount: "", provider: "" });

  const openConfirm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10);
    const provider = String(fd.get("provider") ?? "");
    setFormSummary({
      amount: amount > 0 ? `TZS ${amount.toLocaleString("en-US")}` : "TZS 0",
      provider: provider.replace(/_/g, " "),
    });
  };

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    form?.requestSubmit();
  };

  return (
    <ConfirmDialog
      tone="claret"
      title="Confirm withdrawal · Thibitisha"
      body={
        <>
          <div className="mb-3 rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Amount</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-text">{formSummary.amount}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">Via</span>
              <span className="font-mono text-[13px] font-semibold text-text">{formSummary.provider}</span>
            </div>
          </div>
          <p className="text-[12.5px] text-text-muted">
            This action sends funds out of your wallet. Make sure the destination phone is correct.
          </p>
          <p className="mt-1 text-[11.5px] italic text-text-subtle">
            Pesa zitatumwa nje ya pochi yako. Hakikisha nambari sahihi.
          </p>
        </>
      }
      confirmLabel="Send funds"
      cancelLabel="Cancel · Ghairi"
      onConfirm={submitForm}
      onOpen={openConfirm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-gold btn-lg w-full"
        >
          Confirm withdrawal · Thibitisha
        </button>
      }
    />
  );
}
