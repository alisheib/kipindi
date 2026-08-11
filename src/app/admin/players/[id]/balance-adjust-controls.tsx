"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDeferredToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { formatTzs } from "@/lib/utils";
import { adjustBalanceAction } from "./actions";
import { TWO_PERSON_THRESHOLD_TZS } from "../../aml/constants";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

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
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();
  if (!mayAct) return <ActReadOnly />;

  const router = useRouter();
  const [pending, start] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirmWord, setConfirmWord] = useState("");
  const [stage1Msg, setStage1Msg] = useState<string | null>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  const amt = Number(amount.replace(/[,\s]/g, ""));
  // Hard-tier ceremony (B-4): at/above the two-person threshold the officer must
  // type the direction word — mirroring `ConfirmModal tier="hard" typedWord`.
  const needsHard = Number.isFinite(amt) && amt >= TWO_PERSON_THRESHOLD_TZS;
  const hardWord = direction === "credit" ? "CREDIT" : "DEBIT";
  const armed = !needsHard || confirmWord.trim().toUpperCase() === hardWord;
  const valid = Number.isFinite(amt) && amt > 0 && reason.trim().length >= 5 && armed;

  const submit = () => {
    if (!valid) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("direction", direction);
      fd.set("amount", String(Math.round(amt)));
      fd.set("reason", reason.trim());
      const r = await runAdminAction(() => adjustBalanceAction(fd));
      if (!r.ok) {
        toast({ title: "Adjustment failed", description: r.error, variant: "danger" });
        return;
      }
      if ("stage" in r && r.stage === "stage1") {
        // Two-person rule: nothing moved yet — say so plainly, keep the modal
        // open in the "awaiting second officer" state, never claim credited.
        setStage1Msg(r.message);
        router.refresh();
        toast({ title: "Second officer required", description: r.message, variant: "warning" });
        return;
      }
      setOpen(false); setAmount(""); setReason(""); setConfirmWord(""); setStage1Msg(null);
      router.refresh();
      deferToast({
        title: direction === "credit" ? "Balance credited" : "Balance debited",
        description: `New balance ${formatTzs((r as { balance?: number }).balance ?? 0)} · audit-logged`,
        variant: "success",
      });
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setDirection("credit"); setAmount(""); setReason(""); setConfirmWord(""); setStage1Msg(null); }}
        disabled={pending}
        className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border border-border bg-bg-overlay text-text-secondary hover:bg-brand-500/10 hover:text-brand-300 hover:border-brand-500/60 transition-colors inline-flex items-center gap-1.5"
      >
        <I.wallet size={11} aria-hidden />
        Adjust balance
      </button>

      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        ariaLabel="Adjust player balance"
        maxWidth={420}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={amountRef}
      >
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
            ref={amountRef}
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
            placeholder="e.g. 50,000"
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] tabular-nums text-text outline-none admin-focus transition-colors"
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

        {needsHard && (
          <label className="mt-3 block">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-claret-300">
              {`Large adjustment (≥ ${formatTzs(TWO_PERSON_THRESHOLD_TZS)}) — type ${hardWord} to confirm; a second officer must countersign`}
            </span>
            <input
              value={confirmWord}
              onChange={(e) => setConfirmWord(e.target.value)}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-label={`Type ${hardWord} to confirm`}
              placeholder={hardWord}
              className="mt-1 w-full rounded-md border border-border-strong bg-bg-overlay px-2.5 py-2 font-mono text-[13px] tracking-[0.2em] uppercase text-text outline-none admin-focus transition-colors"
            />
          </label>
        )}

        {stage1Msg && (
          <p className="mt-3 rounded-md border border-border bg-bg-sunken/40 px-3 py-2 text-[12.5px] text-text-secondary" role="status">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text block mb-0.5">Awaiting second officer</span>
            {stage1Msg}
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2">
          <Button
            type="button"
            variant={direction === "credit" ? "yes" : "no"}
            size="lg"
            fullWidth
            loading={pending}
            disabled={!valid}
            onClick={submit}
          >
            {`${direction === "credit" ? "Credit" : "Debit"} ${amt > 0 ? formatTzs(Math.round(amt)) : "balance"}`}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="md"
            fullWidth
            disabled={pending}
            onClick={() => { if (!pending) setOpen(false); }}
          >
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
