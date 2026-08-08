"use client";

/**
 * DepositConfirm — two-step confirmation for deposits (audit M9). Mirrors
 * WithdrawConfirm so all three money actions (bet, withdraw, deposit) confirm
 * before committing. Deposit has no hidden deduction, so there is no fee/net
 * line — it shows amount, provider and destination phone before the mobile-money
 * prompt is dispatched.
 */

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { formatTzs } from "@/lib/utils";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS } from "@/lib/server/validators";

export function DepositConfirm() {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const { toast } = useToast();
  const [summary, setSummary] = useState({ amount: 0, provider: "", msisdn: "" });
  // DS-4 / B-6 — this component sits inside the deposit <form>, so the form
  // action's in-flight state is readable right here. Passing it down keeps the
  // confirm dialog OPEN with a spinner through the whole Selcom `create-order`
  // round-trip (2–10s on 2G) instead of vanishing into a dead-looking page.
  const { pending } = useFormStatus();

  // B-22 / V-3 — the confirm dialog no longer opens for input the server will
  // refuse (TZS 0 was confirmable), and the refusal is a KIT toast, never the
  // OS-styled native validation bubble (which read as broken on the dark
  // surface). Returns the error copy, or null when the form is sound.
  const validate = (form: HTMLFormElement): string | null => {
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10) || 0;
    const provider = String(fd.get("provider") ?? "");
    const msisdn = String(fd.get("msisdn") ?? "").trim();
    if (!provider) return t.wallet.chooseProvider;
    if (!Number.isFinite(amount) || amount < DEPOSIT_MIN_TZS || amount > DEPOSIT_MAX_TZS) {
      return t.wallet.depositBounds
        .replace("{min}", DEPOSIT_MIN_TZS.toLocaleString("en-US"))
        .replace("{max}", DEPOSIT_MAX_TZS.toLocaleString("en-US"));
    }
    if (provider !== "CARD" && !msisdn) return t.wallet.msisdnRequired;
    return null;
  };

  const guardOpen = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return false;
    const err = validate(form);
    if (err) {
      toast({ title: err, variant: "warning" });
      return false;
    }
    return true;
  };

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
    const form = buttonRef.current?.closest("form");
    if (!form) return false;
    // Re-check at commit time (a second tab could have mutated shared state);
    // release the dialog on refusal rather than holding a spinner for a
    // submission that never started. JS + server validation own correctness —
    // native bubbles are suppressed (V-3).
    const err = validate(form);
    if (err) {
      toast({ title: err, variant: "warning" });
      return false;
    }
    form.noValidate = true;
    form.requestSubmit();
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
      openGuard={guardOpen}
      pending={pending}
      trigger={
        <button ref={buttonRef} type="button" className="btn btn-gold btn-lg w-full">
          {t.common.confirmDeposit}
        </button>
      }
    />
  );
}
