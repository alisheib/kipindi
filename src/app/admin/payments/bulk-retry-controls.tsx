"use client";

/** A4 — "Retry all" for the failed-payment queue. One click re-runs every failed
 *  deposit/withdrawal through the tested flows (guarded + audited server-side).
 *  A short confirm guards the bulk action. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { bulkRetryAction } from "./payment-actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function BulkRetryControls() {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();
  if (!mayAct) return <ActReadOnly />;

  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const router = useRouter();
  // B-28 — this fires up to ~50 sequential gateway calls; it used to run
  // behind a 10px inline link with no overlay, so an officer had no signal it
  // was in flight (and could navigate off mid-run). The full ActionOverlay is
  // exactly the primitive for a long money operation: blocks double-clicks,
  // shows progress, ends in an unambiguous result card.
  const overlay = useActionOverlay();

  const run = () => {
    overlay.run("Retrying all failed payments…", "Up to 50 gateway calls — this can take a minute. Don't navigate away.");
    start(async () => {
      const r = await runAdminAction(() => bulkRetryAction());
      if (!r.ok) { overlay.fail("Bulk retry blocked", r.error ?? "Server error — refresh before retrying."); return; }
      setConfirm(false);
      router.refresh();
      if (r.stillFailed === 0) overlay.succeed("Bulk retry done", `${r.retried} dispatched.`);
      else overlay.fail("Bulk retry finished with failures", `${r.retried} dispatched · ${r.stillFailed} still failed. The rows below have the detail.`);
    });
  };

  // The overlay renders in BOTH branches — success collapses `confirm` back to
  // the idle link, and the overlay's result card must survive that flip.
  return (
    <>
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
      {confirm ? (
        <span className="inline-flex items-center gap-1.5">
          <span className="font-mono text-[10px] text-text-subtle">Retry all failed?</span>
          <button type="button" disabled={pending} onClick={run} className="font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">Yes</button>
          <button type="button" onClick={() => setConfirm(false)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">No</button>
        </span>
      ) : (
        <button type="button" disabled={pending} onClick={() => setConfirm(true)} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">
          <I.rotateCcw s={11} /> Retry all
        </button>
      )}
    </>
  );
}
