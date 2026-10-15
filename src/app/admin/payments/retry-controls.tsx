"use client";

/** ADM4 — verified-negative failed deposits can be retried or closed. Failed
 *  withdrawals stay visible for manual review: a late payout may still settle. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { Button } from "@/components/ui/button";
import { useDeferredToast } from "@/components/ui/toast";
import { retryDepositAction, cancelRefundTxnAction } from "./payment-actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function RetryControls({ txnId, type, reviewRequired, retryClaimed }: { txnId: string; type: "DEPOSIT" | "WITHDRAWAL"; reviewRequired: boolean; retryClaimed: boolean }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, startTransition] = useTransition();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const router = useRouter();
  // B-28 — success toasts ride the transition's falling edge (data visible when announced)
  const { toast, deferToast } = useDeferredToast(pending);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (type === "WITHDRAWAL" || reviewRequired) return <span className="font-mono text-[10px] text-no-300"
    title={type === "WITHDRAWAL" ? "Payout may still settle. Review the provider result manually; automatic retry and closure are unavailable." : "Provider failure is not proven. Review this payment before retry or closure."}>Manual review required</span>;
  if (!mayAct) return <ActReadOnly />;

  const run = (fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>, okTitle: string) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("txnId", txnId);
      const r = await runAdminAction(() => fn(fd));
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      deferToast({ title: okTitle, variant: "success" });
      setConfirmCancel(false);
      router.refresh();
    });
  };

  if (retryClaimed) return (
    <span className="inline-flex items-center gap-1.5">
      <span className="font-mono text-[10px] text-text-subtle">Retry unresolved</span>
      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(retryDepositAction, "Retry checked")}>Check retry</Button>
    </span>
  );

  if (confirmCancel) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="font-mono text-[10px] text-text-subtle">Cancel &amp; close?</span>
        <Button size="sm" variant="claret" disabled={pending} onClick={() => run(cancelRefundTxnAction, "Transaction cancelled")}>Yes</Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmCancel(false)}>No</Button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="ghost" disabled={pending} leading={<I.rotateCcw s={13} />} onClick={() => run(retryDepositAction, "Retry dispatched")}>
        Retry
      </Button>
      <Button size="sm" variant="ghost" disabled={pending} leading={<I.x s={13} />} onClick={() => setConfirmCancel(true)}>
        Cancel
      </Button>
    </span>
  );
}
