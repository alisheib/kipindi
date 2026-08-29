"use client";

/**
 * WithdrawConfirm — two-step confirmation for withdrawals. Mirrors the
 * DepositConfirm pattern: shows a summary modal before submitting the form so a
 * player can verify the amount, fee/net, destination phone and — where the rail
 * supports it — the registered RECIPIENT NAME before money leaves their account.
 */

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useT } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReceiptBox, ReceiptRow } from "@/components/ui/receipt-row";
import { useToast } from "@/components/ui/toast";
import { formatTzs } from "@/lib/utils";
import { computeWithdrawalFee } from "@/lib/payout";
import { WITHDRAW_MIN_TZS, WITHDRAW_MAX_TZS } from "@/lib/server/validators";
import { lookupWithdrawPayeeAction } from "./actions";

type PayeeState = { state: "idle" | "loading" | "done"; name: string | null };

/**
 * §L3 · THE WORDS THE PLAYER TAPPED, NOT THE TOKENS WE STORE.
 *
 * This dialog rendered `providerRaw.replace(/_/g, " ")`, so the last screen before money
 * LEAVES the account read "Via AIRTEL MONEY" · "HALO PESA" · "MIXX" — storage enums, shouted,
 * inside a sentence, on the surface that also carries the registered recipient name. The
 * names below are the ones the chooser tiles already carry (`PROVIDERS` in `withdraw/page.tsx`,
 * handed to `PaymentLogo` as `name`), so the confirm echoes the tile the player chose.
 *
 * ⚠️ Mirrored rather than imported, and deliberately: the canonical maps sit beside the money
 * service (`server/payment-ops.ts` `MNOS`, `wallet-service`'s own label map) and both reach
 * `db` — importing either would drag the money service into a client bundle. Brand names, so
 * they are NOT translated: "M-Pesa" is "M-Pesa" in all three locales.
 *
 * ⚠️ Four entries, not five: payouts run on the mobile-money rails only (`WITHDRAW_PROVIDERS`
 * in `./actions`). Card is a deposit rail and has no place in a withdrawal's vocabulary.
 */
const PROVIDER_NAMES: Record<string, string> = {
  MPESA: "M-Pesa",
  AIRTEL_MONEY: "Airtel Money",
  HALO_PESA: "HaloPesa",
  MIXX: "Mixx by Yas",
};

/** An id we don't know is a tampered form, which `withdrawAction` refuses anyway — show it
 *  verbatim rather than blanking the row, so what was submitted stays visible. */
const providerLabel = (id: string): string => PROVIDER_NAMES[id] ?? id;

/** `feeRate` is the live `withdrawalFeeRate` from config; the fee shown here is
 *  computed by the SAME function wallet-service charges with, so the confirm
 *  screen and the wallet can never disagree (audit H12). */
export function WithdrawConfirm({ feeRate }: { feeRate: number }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { t } = useT();
  const { toast } = useToast();
  const [summary, setSummary] = useState({ amount: 0, provider: "", msisdn: "" });
  const [payee, setPayee] = useState<PayeeState>({ state: "idle", name: null });
  /** Monotonic per-open sequence — the stale-response guard (B-20, the pattern
   *  `vote-control.tsx` uses). Cancel → correct the number → reopen fires a
   *  SECOND lookup, and on a slow link the FIRST can land last: applied in
   *  arrival order it labels a money-commit dialog with the WRONG registered
   *  name. Only the latest open may write. */
  const payeeSeq = useRef(0);
  // DS-4 / B-6 — read the surrounding form's in-flight state and hold the
  // confirm dialog open (spinner, buttons disabled, no dismissal) until the
  // withdrawal action settles. Money leaving an account is the last place a
  // player should be staring at a page that looks idle.
  const { pending } = useFormStatus();

  // B-22 / V-3 — ported from DepositConfirm. The confirm dialog no longer opens
  // for input the server will refuse (a blank form opened a money-commit dialog
  // reading "Amount TZS 0 · You receive TZS 0", and it was confirmable), and the
  // refusal is a KIT toast, never the OS-styled native validation bubble (which
  // read as broken on the dark surface). The bounds are `withdrawAction`'s own,
  // so this refuses exactly what the server refuses, in the server's own words.
  // Returns the error copy, or null when the form is sound.
  const validate = (form: HTMLFormElement): string | null => {
    const fd = new FormData(form);
    const amount = parseInt(String(fd.get("amount") ?? "0"), 10) || 0;
    const provider = String(fd.get("provider") ?? "");
    const msisdn = String(fd.get("msisdn") ?? "").trim();
    if (!provider) return t.wallet.chooseProvider;
    if (!Number.isFinite(amount) || amount < WITHDRAW_MIN_TZS || amount > WITHDRAW_MAX_TZS) {
      return t.wallet.amountHint;
    }
    // ⚠️ The 9-digit shape is the SAME rule the field's own `pattern="\d{9}"`
    // enforced. It is restated here because `noValidate` switches the native
    // check off at commit — dropping it would make this port a LOOSENING of a
    // money-DESTINATION check, not a tightening.
    if (!/^\d{9}$/.test(msisdn)) return t.wallet.payeeMsisdnRequired;
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
    const providerRaw = String(fd.get("provider") ?? "");
    const msisdn = String(fd.get("msisdn") ?? "").trim();
    setSummary({ amount, provider: providerLabel(providerRaw), msisdn });
    // Best-effort payee-name lookup (Selcom, when the rail supports it). It never
    // blocks the payout: a miss simply shows the number alone.
    // ⛔ B-20 — take the sequence for THIS open BEFORE the branch, never inside
    // it. Reopening with a CLEARED number takes the else-branch, and a lookup
    // still in flight from the previous open would otherwise resolve into a
    // dialog that shows no phone row at all — a recipient name attached to
    // nothing.
    const seq = ++payeeSeq.current;
    if (providerRaw && msisdn) {
      setPayee({ state: "loading", name: null });
      lookupWithdrawPayeeAction({ provider: providerRaw, msisdn })
        .then((r) => { if (seq === payeeSeq.current) setPayee({ state: "done", name: r.name }); })
        .catch(() => { if (seq === payeeSeq.current) setPayee({ state: "done", name: null }); });
    } else {
      setPayee({ state: "idle", name: null });
    }
  };

  const fee = computeWithdrawalFee(summary.amount, feeRate);
  const net = Math.max(0, summary.amount - fee);

  const submitForm = () => {
    const form = buttonRef.current?.closest("form");
    if (!form) return false;
    // Re-check at commit time (the player can still edit the form behind the
    // dialog); release the dialog on refusal rather than holding a spinner for a
    // submission that never started (see DS-4). JS + server validation own
    // correctness — native bubbles are suppressed (V-3).
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
      /* ⭐ D1 (Ali's ruling, 2026-08-21) — `tone="claret"` → `tone="brand"`, at the
         money-commit footprint. Claret is §B4's editorial/destructive weight, and a
         withdrawal is the player TAKING THEIR OWN MONEY: framing it in the colour the
         product uses for self-exclusion and account closure discourages the one action
         a licensed operator must never make feel like a mistake. The confirmation still
         confirms — the dialog, the receipt rows and the resolved recipient name are all
         unchanged; only the button's colour and footprint move. */
      tone="brand"
      size="lg"
      title={t.common.confirmWithdrawal}
      body={
        <>
          {/* ⭐ Stage 9b — the receipt rows are the shared <ReceiptRow>/<ReceiptBox>
              primitive. Every row below is pixel-identical to what it replaced EXCEPT
              the Amount line, which moves 15px/semibold → 16px/bold (`emphasis="amount"`)
              to match the deposit confirm. That convergence is the point of the exercise,
              not a side effect: one label, one meaning, one rendering. The hierarchy here
              survives it — YOU RECEIVE stays the loudest line because it is the only GOLD
              one, and gold is legitimate there (M3: money about to be received, not a
              projection). */}
          <ReceiptBox className="mb-3">
            <ReceiptRow emphasis="amount" label={t.common.amountLabel} value={formatTzs(summary.amount)} />
            <ReceiptRow emphasis="fee" tone="warning" label={t.wallet.taxNotice} value={`−${formatTzs(fee)}`} />
            <ReceiptRow emphasis="total" divider label={t.dialog.youReceive} value={formatTzs(net)} />
            <ReceiptRow label={t.common.via} value={summary.provider} />
            {summary.msisdn && (
              <ReceiptRow label={t.auth.phone} value={`+255 ${summary.msisdn}`} />
            )}
            {payee.state === "loading" && (
              <ReceiptRow emphasis="muted" label={t.common.recipient} value={t.common.recipientChecking} />
            )}
            {payee.state === "done" && payee.name && (
              <ReceiptRow divider alignEnd label={t.common.recipient} value={payee.name} />
            )}
          </ReceiptBox>
          <p className="text-body-sm text-text-muted">
            {t.common.withdrawSendBody}
          </p>
        </>
      }
      confirmLabel={t.common.sendFunds}
      cancelLabel={t.common.cancel}
      onConfirm={submitForm}
      onOpen={openConfirm}
      openGuard={guardOpen}
      // A closed dialog keeps no resolved payee: bump the sequence so a lookup
      // still in flight can never write into the next open, and drop the name so
      // the next open cannot flash the PREVIOUS recipient before its own lookup
      // has answered.
      onClose={() => { payeeSeq.current++; setPayee({ state: "idle", name: null }); }}
      pending={pending}
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
