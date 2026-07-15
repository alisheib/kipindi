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
import { computeWithdrawalFee } from "@/lib/payout";

/** `feeRate` is the live `withdrawalFeeRate` from config; the fee shown here is
 *  computed by the SAME function wallet-service charges with, so the confirm
 *  screen and the wallet can never disagree (audit H12). */
export function WithdrawConfirm({ feeRate }: { feeRate: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const [summary, setSummary] = useState({ amount: 0, provider: "" });

  const openConfirm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10) || 0;
    const provider = String(fd.get("provider") ?? "");
    setSummary({ amount, provider: provider.replace(/_/g, " ") });
  };

  const fee = computeWithdrawalFee(summary.amount, feeRate);
  const net = Math.max(0, summary.amount - fee);

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
              <span className="font-mono text-[15px] font-semibold tabular-nums text-text">{formatTzs(summary.amount)}</span>
            </div>
            <div className="flex items-baseline justify-between text-warning-fg">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">{t.wallet.taxNotice}</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums">−{formatTzs(fee)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-1.5">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.dialog.youReceive}</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-gold-300">{formatTzs(net)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle">{t.common.via}</span>
              <span className="font-mono text-[13px] font-semibold text-text">{summary.provider}</span>
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
