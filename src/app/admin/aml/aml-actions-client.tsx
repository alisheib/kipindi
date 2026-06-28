"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
        <ConfirmDialog
          trigger={
            <Button
              size="sm"
              variant="yes"
              disabled={busy !== null}
              loading={busy === "approve"}
              leading={<I.check s={12} />}
              aria-label="Approve transaction"
            >
              Approve
            </Button>
          }
          title={`Approve ${formatTzs(amount)}`}
          body={<>This records your approval. For amounts over TZS 1M, a second, different officer must counter-sign before funds release. Once both officers approve, <strong>funds are released immediately</strong> and cannot be reversed.</>}
          confirmLabel="Yes, approve"
          tone="gold"
          onConfirm={() => submit("approve")}
        />
        <Button
          size="sm"
          variant="danger"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Reject transaction"
          aria-expanded={expanded ? "true" : "false"}
          leading={<I.x s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Reject
        </Button>
      </div>
      {expanded && (
        <div className="flex items-start gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (required)"
            aria-label="Rejection reason"
            className="flex-1 h-8 px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant="danger" onClick={() => submit("reject")} loading={busy === "reject"}>
            Submit
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
