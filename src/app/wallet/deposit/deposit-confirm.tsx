"use client";

/**
 * DepositConfirm — two-step confirmation for deposits (audit M9). Mirrors
 * WithdrawConfirm so all three money actions (bet, withdraw, deposit) confirm
 * before committing. Deposit has no hidden deduction, so there is no fee/net
 * line — it shows amount, provider and destination phone before the mobile-money
 * prompt is dispatched.
 */

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatTzs } from "@/lib/utils";

export function DepositConfirm() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const [summary, setSummary] = useState({ amount: 0, provider: "", msisdn: "" });

  const openConfirm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10) || 0;
    const provider = String(fd.get("provider") ?? "");
    const msisdn = String(fd.get("msisdn") ?? "").trim();
    setSummary({ amount, provider: provider.replace(/_/g, " "), msisdn });
  };

  const submitForm = () => {
    buttonRef.current?.closest("form")?.requestSubmit();
  };

  return (
    <ConfirmDialog
      tone="brand"
      title={t.common.confirmDeposit}
      body={
        <>
          <div className="mb-3 rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.common.amountLabel}</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-text">{formatTzs(summary.amount)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.common.via}</span>
              <span className="font-mono text-[13px] font-semibold text-text">{summary.provider}</span>
            </div>
            {summary.msisdn && (
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.auth.phone}</span>
                <span className="font-mono text-[13px] font-semibold text-text">+255 {summary.msisdn}</span>
              </div>
            )}
          </div>
          <p className="text-[12.5px] text-text-muted">{t.common.depositSendBody}</p>
        </>
      }
      confirmLabel={t.common.deposit}
      cancelLabel={t.common.cancel}
      onConfirm={submitForm}
      onOpen={openConfirm}
      trigger={
        <button ref={buttonRef} type="button" className="btn btn-gold btn-lg w-full">
          {t.common.confirmDeposit}
        </button>
      }
    />
  );
}
