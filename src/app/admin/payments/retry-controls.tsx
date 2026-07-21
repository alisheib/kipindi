"use client";

/** ADM4 — retry-queue row actions. Retry re-dispatches a failed payment (a
 *  DEPOSIT re-requests a collection from the player; a WITHDRAWAL re-sends real
 *  money OUT — so the withdrawal retry is confirmed, like cancel). Cancel closes
 *  a failed record (confirm). All are guarded + audited server-side. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { retryDepositAction, retryWithdrawalAction, cancelRefundTxnAction } from "./payment-actions";

export function RetryControls({ txnId, type }: { txnId: string; type: "DEPOSIT" | "WITHDRAWAL" }) {
  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [confirmRetry, setConfirmRetry] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const run = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, okTitle: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("txnId", txnId);
      const r = await fn(fd);
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({ title: okTitle, variant: "success" });
      setConfirmCancel(false);
      setConfirmRetry(false);
      router.refresh();
    });
  };

  if (confirmCancel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-text-subtle">Cancel &amp; close?</span>
        <button type="button" disabled={pending} onClick={() => run(cancelRefundTxnAction, "Transaction cancelled")} className="font-mono text-[10px] uppercase tracking-[0.08em] text-claret-300 hover:underline">Yes</button>
        <button type="button" onClick={() => setConfirmCancel(false)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">No</button>
      </span>
    );
  }

  // A WITHDRAWAL retry re-dispatches REAL money out — confirm it (parity with
  // cancel and the bulk "Retry all"). A DEPOSIT retry only re-requests a
  // collection push from the player, so it stays a single click.
  if (confirmRetry) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-text-subtle">Re-send payout?</span>
        <button type="button" disabled={pending} onClick={() => run(retryWithdrawalAction, "Retry dispatched")} className="font-mono text-[10px] uppercase tracking-[0.08em] text-claret-300 hover:underline">Yes</button>
        <button type="button" onClick={() => setConfirmRetry(false)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">No</button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => (type === "WITHDRAWAL" ? setConfirmRetry(true) : run(retryDepositAction, "Retry dispatched"))} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">
        <I.rotateCcw s={11} /> Retry
      </button>
      <button type="button" disabled={pending} onClick={() => setConfirmCancel(true)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-claret-300 disabled:opacity-40">
        <I.x s={11} /> Cancel
      </button>
    </span>
  );
}
