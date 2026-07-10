"use client";

/**
 * WithdrawConfirm — two-step confirmation for withdrawals. Mirrors the
 * SelfExcludeConfirm pattern: shows a summary modal before submitting
 * the form so a player can verify the amount and destination phone
 * before money leaves their account.
 */

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatTzs } from "@/lib/utils";

export function WithdrawConfirm() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const [formSummary, setFormSummary] = useState({ amount: "", provider: "" });

  const openConfirm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10);
    const provider = String(fd.get("provider") ?? "");
    setFormSummary({
      amount: amount > 0 ? formatTzs(amount) : "TZS 0",
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
      title={t.common.confirmWithdrawal}
      body={
        <>
          <div className="mb-3 rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.common.amountLabel}</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-text">{formSummary.amount}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.common.via}</span>
              <span className="font-mono text-[13px] font-semibold text-text">{formSummary.provider}</span>
            </div>
          </div>
          <p className="text-[12.5px] text-text-muted">
            {t.common.withdrawSendBody}
          </p>
        </>
      }
      confirmLabel={t.common.sendFunds}
      cancelLabel={t.common.cancel}
      onConfirm={submitForm}
      onOpen={openConfirm}
      trigger={
        <button
          ref={buttonRef}
          type="button"
          className="btn btn-gold btn-lg w-full"
        >
          {t.common.confirmWithdrawal}
        </button>
      }
    />
  );
}
