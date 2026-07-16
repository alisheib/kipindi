"use client";

/** A4 — "Retry all" for the failed-payment queue. One click re-runs every failed
 *  deposit/withdrawal through the tested flows (guarded + audited server-side).
 *  A short confirm guards the bulk action. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { bulkRetryAction } from "./payment-actions";

export function BulkRetryControls() {
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const run = () => {
    start(async () => {
      const r = await bulkRetryAction();
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      setConfirm(false);
      router.refresh();
      toast({ title: "Bulk retry done", description: `${r.retried} dispatched · ${r.stillFailed} still failed`, variant: r.stillFailed === 0 ? "success" : "warning" });
    });
  };

  if (confirm) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-text-subtle">Retry all failed?</span>
        <button type="button" disabled={pending} onClick={run} className="font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">Yes</button>
        <button type="button" onClick={() => setConfirm(false)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">No</button>
      </span>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">
      <I.rotateCcw s={11} /> Retry all
    </button>
  );
}
