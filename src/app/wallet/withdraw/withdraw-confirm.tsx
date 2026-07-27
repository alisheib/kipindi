"use client";

/**
 * WithdrawConfirm — two-step confirmation for withdrawals. Mirrors the
 * DepositConfirm pattern: shows a summary modal before submitting the form so a
 * player can verify the amount, fee/net, destination phone and — where the rail
 * supports it — the registered RECIPIENT NAME before money leaves their account.
 */

import { useRef, useState } from "react";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { formatTzs } from "@/lib/utils";
import { computeWithdrawalFee } from "@/lib/payout";
import { lookupWithdrawPayeeAction } from "./actions";

type PayeeState = { state: "idle" | "loading" | "done"; name: string | null };

/** `feeRate` is the live `withdrawalFeeRate` from config; the fee shown here is
 *  computed by the SAME function wallet-service charges with, so the confirm
 *  screen and the wallet can never disagree (audit H12). */
export function WithdrawConfirm({ feeRate }: { feeRate: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const [summary, setSummary] = useState({ amount: 0, provider: "", msisdn: "" });
  const [payee, setPayee] = useState<PayeeState>({ state: "idle", name: null });

  const openConfirm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return;
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10) || 0;
    const providerRaw = String(fd.get("provider") ?? "");
    const msisdn = String(fd.get("msisdn") ?? "").trim();
    setSummary({ amount, provider: providerRaw.replace(/_/g, " "), msisdn });
    // Best-effort payee-name lookup (Selcom, when the rail supports it). It never
    // blocks the payout: a miss simply shows the number alone.
    if (providerRaw && msisdn) {
      setPayee({ state: "loading", name: null });
      lookupWithdrawPayeeAction({ provider: providerRaw, msisdn })
        .then((r) => setPayee({ state: "done", name: r.name }))
        .catch(() => setPayee({ state: "done", name: null }));
    } else {
      setPayee({ state: "idle", name: null });
    }
  };

  const fee = computeWithdrawalFee(summary.amount, feeRate);
  const net = Math.max(0, summary.amount - fee);

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    form?.requestSubmit();
  };

  const rowLabel = "font-mono text-[10px] uppercase tracking-[0.12em] text-text-subtle";

  return (
    <ConfirmDialog
      tone="claret"
      title={t.common.confirmWithdrawal}
      body={
        <>
          <div className="mb-3 rounded-md border border-border bg-bg-overlay/60 p-3 space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className={rowLabel}>{t.common.amountLabel}</span>
              <span className="font-mono text-[15px] font-semibold tabular-nums text-text">{formatTzs(summary.amount)}</span>
            </div>
            <div className="flex items-baseline justify-between text-warning-fg">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">{t.wallet.taxNotice}</span>
              <span className="font-mono text-[13px] font-semibold tabular-nums">−{formatTzs(fee)}</span>
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-1.5">
              <span className={rowLabel}>{t.dialog.youReceive}</span>
              <span className="font-mono text-[16px] font-bold tabular-nums text-gold-300">{formatTzs(net)}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className={rowLabel}>{t.common.via}</span>
              <span className="font-mono text-[13px] font-semibold text-text">{summary.provider}</span>
            </div>
            {summary.msisdn && (
              <div className="flex items-baseline justify-between">
                <span className={rowLabel}>{t.auth.phone}</span>
                <span className="font-mono text-[13px] font-semibold text-text">+255 {summary.msisdn}</span>
              </div>
            )}
            {payee.state === "loading" && (
              <div className="flex items-baseline justify-between">
                <span className={rowLabel}>{t.common.recipient}</span>
                <span className="font-mono text-[12px] text-text-subtle">{t.common.recipientChecking}</span>
              </div>
            )}
            {payee.state === "done" && payee.name && (
              <div className="flex items-baseline justify-between border-t border-border pt-1.5">
                <span className={rowLabel}>{t.common.recipient}</span>
                <span className="font-mono text-[13px] font-semibold text-text text-right">{payee.name}</span>
              </div>
            )}
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
