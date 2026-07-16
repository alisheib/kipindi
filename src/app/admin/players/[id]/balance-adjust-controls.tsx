"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { adjustBalanceAction } from "./actions";

/**
 * Manual balance adjustment (audit §9.3 #4) — an officer credits or debits a
 * player's real balance with a mandatory reason. Money-safe on the server
 * (atomic wallet+txn+ledger, overdraw-guarded, COMPLIANCE-audited). This is the
 * officer-facing prompt; the reason is required and audit-logged.
 */
export function BalanceAdjustControls({
  userId,
  currentBalance,
}: {
  userId: string;
  currentBalance: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const amt = Number(amount.replace(/[,\s]/g, ""));
  const valid = Number.isFinite(amt) && amt > 0 && reason.trim().length >= 5;

  const submit = () => {
    if (!valid) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("direction", direction);
      fd.set("amount", String(Math.round(amt)));
      fd.set("reason", reason.trim());
      const r = await adjustBalanceAction(fd);
      if (!r.ok) {
        toast({ title: "Adjustment failed", description: r.error, variant: "danger" });
        return;
      }
      setOpen(false); setAmount(""); setReason("");
      router.refresh();
      deferToast({
        title: direction === "credit" ? "Balance credited" : "Balance debited",
        description: `New balance ${formatTzs(r.balance ?? 0)} · audit-logged`,
        variant: "success",
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setDirection("credit"); setAmount(""); setReason(""); }}
        disabled={pending}
        className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border border-border bg-bg-overlay text-text-secondary hover:bg-brand-500/10 hover:text-brand-300 hover:border-brand-500/60 transition-colors inline-flex items-center gap-1.5"
      >
        <I.wallet size={11} aria-hidden />
        Adjust balance
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Adjust player balance"
          className="fixed inset-0 z-[100] flex justify-center px-4 py-4 overflow-y-auto overscroll-contain"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => { if (!pending) setOpen(false); }}
            className="dialog-scrim-anim fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <div className="dialog-anim relative z-10 my-auto w-full max-w-[420px] rounded-xl border border-border bg-bg-elevated p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.6)]">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text mb-1">Balance adjustment · Marekebisho</p>
            <h3 className="font-display text-[18px] font-bold text-text leading-tight">Credit or debit this balance</h3>
            <p className="mt-1 text-[12.5px] italic text-text-subtle">
              Current balance {formatTzs(currentBalance)}. Money-safe + audit-logged; a debit can&rsquo;t drive the balance negative.
            </p>

            {/* Direction toggle */}
            <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Direction">
              {(["credit", "debit"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  role="radio"
                  aria-checked={direction === d}
                  onClick={() => setDirection(d)}
                  className={
                    "min-h-11 rounded-md border font-mono text-[11px] uppercase tracking-[0.12em] transition-colors " +
                    (direction === d
                      ? (d === "credit" ? "border-yes-700 bg-yes-500/15 text-yes-300" : "border-no-700 bg-no-500/15 text-no-300")
                      : "border-border bg-bg-overlay text-text-subtle hover:text-text")
                  }
                >
                  {d === "credit" ? "Credit (+)" : "Debit (−)"}
                </button>
              ))}
            </div>

            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">Amount (TZS)</span>
              <input
                inputMode="numeric"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
                placeholder="e.g. 50,000"
                className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] tabular-nums text-text outline-none admin-focus transition-colors"
                autoFocus
              />
            </label>

            <label className="mt-3 block">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">Reason · Sababu (required, audit-logged)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Why is this adjustment being made?"
                className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
                rows={3}
                maxLength={300}
              />
              <span className="font-mono text-[10px] text-text-subtle">{reason.trim().length} / 300</span>
            </label>

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={pending || !valid}
                className={`${direction === "credit" ? "btn btn-yes" : "btn btn-no"} btn-lg w-full`}
              >
                {pending ? "Working…" : `${direction === "credit" ? "Credit" : "Debit"} ${amt > 0 ? formatTzs(Math.round(amt)) : "balance"}`}
              </button>
              <button
                type="button"
                onClick={() => { if (!pending) setOpen(false); }}
                className="btn btn-ghost btn-md w-full min-h-11"
                disabled={pending}
              >
                Cancel · Ghairi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
