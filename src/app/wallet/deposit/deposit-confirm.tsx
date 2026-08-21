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
import { ReceiptBox, ReceiptRow } from "@/components/ui/receipt-row";
import { useToast } from "@/components/ui/toast";
import { formatNumber, formatTzs } from "@/lib/utils";
import { DEPOSIT_MIN_TZS, DEPOSIT_MAX_TZS } from "@/lib/server/validators";

/**
 * §L3 · THE WORDS THE PLAYER TAPPED, NOT THE TOKENS WE STORE.
 *
 * This dialog rendered `provider.replace(/_/g, " ")`, so the last screen before money moves
 * read "Via AIRTEL MONEY" · "HALO PESA" · "MIXX" — storage enums, shouted, inside a sentence,
 * on a money commit. The names below are the ones the chooser tiles already carry
 * (`PROVIDERS` in `deposit/page.tsx`, handed to `PaymentLogo` as `name`), so the confirm
 * echoes the tile the player actually chose instead of inventing a second vocabulary for it.
 *
 * ⚠️ Mirrored rather than imported, and deliberately. The canonical maps sit beside the money
 * service (`server/payment-ops.ts` `MNOS`, `wallet-service`'s own label map) and both reach
 * `db` — importing either would drag the money service into a client bundle. `receipt/[id]`
 * keeps the same local mirror for the same reason and says so.
 * These are brand names, so they are NOT translated: "M-Pesa" is "M-Pesa" in all three locales.
 */
const PROVIDER_NAMES: Record<string, string> = {
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  HALO_PESA: "HaloPesa",
  MIXX: "Mixx by Yas",
  CARD: "Card",
};

/** An id we don't know is a tampered form, which `depositAction` refuses anyway — show it
 *  verbatim rather than blanking the row, so what was submitted stays visible. */
const providerLabel = (id: string): string => PROVIDER_NAMES[id] ?? id;

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
      // `formatNumber`, not `toLocaleString` and NOT `formatTzs`: `depositBounds` already
      // carries the unit in all three locales ("… between TZS {min} and TZS {max}"), so the
      // slots take the platform's unit-free grouping — `formatTzs` here would read "TZS TZS
      // 1,000", and a raw `toLocaleString` is grouped by whatever locale the runtime holds.
      return t.wallet.depositBounds
        .replace("{min}", formatNumber(DEPOSIT_MIN_TZS))
        .replace("{max}", formatNumber(DEPOSIT_MAX_TZS));
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
    setSummary({ amount, provider: providerLabel(provider), msisdn });
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
      /* ⭐ D1 (Ali's ruling, 2026-08-21) — brand, at the money-commit footprint.
         A deposit is money ARRIVING: it is neither destructive (claret) nor earned
         (gold), and both of those were live answers for this one button at some
         point. `size="lg"` is the other half of the ruling — the last control
         before money moves takes the large footprint, not the dialog default. */
      tone="brand"
      size="lg"
      title={t.common.confirmDeposit}
      body={
        <>
          {/* ⭐ Stage 9b — the receipt rows are the shared <ReceiptRow>/<ReceiptBox>
              primitive, not a fourth hand-rolled copy. This surface is the one the
              others are converging ON: every row here maps 1:1 onto an emphasis
              (`amount` = 16px bold, `row` = 13px semibold) and nothing repaints. */}
          <ReceiptBox className="mb-3">
            <ReceiptRow emphasis="amount" label={t.common.amountLabel} value={formatTzs(summary.amount)} />
            <ReceiptRow label={t.common.via} value={summary.provider} />
            {summary.msisdn && (
              <ReceiptRow label={t.auth.phone} value={`+255 ${summary.msisdn}`} />
            )}
          </ReceiptBox>
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
