"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { approveAmlAction, rejectAmlAction } from "./actions";
import { useRouter } from "next/navigation";
import { formatTzs } from "@/lib/utils";

export function AmlActionRow({ txnId, amount }: { txnId: string; amount: number }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();
  const router = useRouter();

  const submit = (kind: "approve" | "reject") => {
    if (kind === "reject" && reason.trim().length < 5) {
      toast({ title: "Reason required", description: "Reject needs a reason of at least 5 characters.", variant: "warning" });
      return;
    }
    setBusy(kind);
    overlay.run(
      kind === "approve" ? `Approving ${formatTzs(amount)}…` : "Rejecting transaction…",
      kind === "approve" ? "Recording your approval. For large amounts, a second officer is required." : "Returning funds to player wallet.",
    );
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("txnId", txnId);
        fd.set("reason", reason);
        const fn = kind === "approve" ? approveAmlAction : rejectAmlAction;
        const result = await fn(fd);
        if (result?.ok) {
          const stage = (result as { stage?: "stage1" | "complete" }).stage;
          const message = (result as { message?: string }).message;
          router.refresh();
          if (stage === "stage1") {
            overlay.succeed("Stage 1 recorded", message ?? "Second officer required before funds release.");
          } else if (kind === "approve") {
            overlay.succeed(`Approved · ${formatTzs(amount)}`, "Transaction confirmed.");
          } else {
            overlay.succeed("Rejected", "Funds returned to wallet.");
          }
        } else {
          overlay.fail("AML action failed", result?.error ?? "Try again.");
        }
      } catch {
        overlay.fail("AML action failed", "Server error — please try again.");
      }
      setBusy(null);
      setExpanded(false);
      setReason("");
    });
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {/* Approval is deliberately DISABLED server-side (approveAmlAction refuses:
            releasing a hold without a real gateway dispatch would destroy the
            money). Reflect that honestly rather than a confirm that always fails.
            Reject works and returns the held funds to the player. Re-enable this
            button together with the server action once approved withdrawals are
            dispatched to the gateway + settled by the webhook/reconcile path. */}
        <Button
          size="sm"
          variant="yes"
          disabled
          leading={<I.check s={12} />}
          aria-label="Approve transaction — unavailable until the payout gateway is live"
          title="Approval is unavailable until the payout gateway is live. Use Reject to return the held funds to the player."
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy !== null}
          onClick={() => setExpanded((v) => !v)}
          aria-label="Reject transaction"
          aria-expanded={expanded ? "true" : "false"}
          leading={<I.x s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Reject
        </Button>
      </div>
      <p className="text-[10.5px] text-text-tertiary">
        Approval is on hold until the payout gateway is live — clear a case with <span className="text-text-secondary">Reject</span>, which returns the held funds.
      </p>
      {expanded && (
        <div className="flex items-start gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (required)"
            aria-label="Rejection reason"
            className="flex-1 h-8 px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant="danger" onClick={() => submit("reject")} loading={busy === "reject"} disabled={busy !== null}>
            Submit
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
