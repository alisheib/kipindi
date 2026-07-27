"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { approveAmlAction, rejectAmlAction } from "./actions";
import { TWO_PERSON_THRESHOLD_TZS } from "./constants";
import { useRouter } from "next/navigation";
import { formatTzs } from "@/lib/utils";

export function AmlActionRow({ txnId, amount }: { txnId: string; amount: number }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [mode, setMode] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();
  const router = useRouter();

  const submit = (kind: "approve" | "reject") => {
    // Both approve (releasing funds) and reject (returning funds) require a recorded
    // justification — the server enforces ≥ 5 chars; mirror it here for a fast message.
    if (reason.trim().length < 5) {
      toast({ title: "Reason required", description: `${kind === "approve" ? "Approval" : "Reject"} needs a reason of at least 5 characters.`, variant: "warning" });
      return;
    }
    setBusy(kind);
    overlay.run(
      kind === "approve" ? `Approving ${formatTzs(amount)}…` : "Rejecting transaction…",
      kind === "approve"
        ? "Recording your approval. Large payouts need a second, different officer; the final approval dispatches the payout to the gateway."
        : "Returning funds to player wallet.",
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
            overlay.succeed("Stage 1 recorded", message ?? "A second, different officer must approve to release the funds.");
          } else if (kind === "approve") {
            overlay.succeed(`Approved · ${formatTzs(amount)}`, message ?? "Payout dispatched to the gateway.");
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
      setMode(null);
      setReason("");
    });
  };

  const toggle = (kind: "approve" | "reject") => {
    setMode((m) => (m === kind ? null : kind));
    setReason("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        {/* Approve DISPATCHES the payout to the gateway (dispatchApprovedWithdrawal):
            AML_REVIEW → PROCESSING with a real provider ref, settled exactly-once by
            the webhook/reconcile path — the hold is kept until the provider confirms.
            Large payouts (≥ 1M) require two different officers. Reject returns the held
            funds to the player. */}
        <Button
          size="sm"
          variant="yes"
          disabled={busy !== null}
          onClick={() => toggle("approve")}
          aria-label="Approve transaction"
          aria-expanded={mode === "approve" ? "true" : "false"}
          leading={<I.check s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={busy !== null}
          onClick={() => toggle("reject")}
          aria-label="Reject transaction"
          aria-expanded={mode === "reject" ? "true" : "false"}
          leading={<I.x s={12} />}
          trailing={<I.chevronDown s={11} />}
        >
          Reject
        </Button>
      </div>
      <p className="text-[10.5px] text-text-tertiary">
        Large payouts (≥ {formatTzs(TWO_PERSON_THRESHOLD_TZS)}) need <span className="text-text-secondary">two different officers</span>; approval dispatches the payout. <span className="text-text-secondary">Reject</span> returns the held funds.
      </p>
      {mode && (
        <div className="flex items-start gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={mode === "approve" ? "Approval reason (required)" : "Rejection reason (required)"}
            aria-label={mode === "approve" ? "Approval reason" : "Rejection reason"}
            className="flex-1 h-8 px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant={mode === "approve" ? "yes" : "danger"} onClick={() => submit(mode)} loading={busy === mode} disabled={busy !== null}>
            Submit
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
