"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { Check, X, ChevronDown } from "lucide-react";
import { approveAmlAction, rejectAmlAction } from "./actions";
import { useRouter } from "next/navigation";
import { formatTzs } from "@/lib/utils";

export function AmlActionRow({ txnId, amount }: { txnId: string; amount: number }) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const { toast } = useToast();
  const router = useRouter();

  const submit = async (kind: "approve" | "reject") => {
    if (kind === "reject" && reason.trim().length < 5) {
      toast({ title: "Reason required", description: "Reject needs a reason of at least 5 characters.", variant: "warning" });
      return;
    }
    setBusy(kind);
    const fd = new FormData();
    fd.set("txnId", txnId);
    fd.set("reason", reason);
    const fn = kind === "approve" ? approveAmlAction : rejectAmlAction;
    const result = await fn(fd);
    if (result?.ok) {
      const stage = (result as { stage?: "stage1" | "complete" }).stage;
      const message = (result as { message?: string }).message;
      if (stage === "stage1") {
        toast({
          title: "Stage 1 recorded",
          description: message ?? "Second officer required before funds release.",
          variant: "warning",
        });
      } else {
        toast({
          title: kind === "approve" ? `Approved · ${formatTzs(amount)}` : "Rejected",
          description: kind === "approve" ? "Transaction confirmed." : "Funds returned to wallet.",
          variant: kind === "approve" ? "success" : "warning",
        });
      }
      router.refresh();
    } else {
      toast({ title: "Failed", description: result?.error ?? "Try again.", variant: "danger" });
    }
    setBusy(null);
    setExpanded(false);
    setReason("");
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Button
          size="sm"
          variant="yes"
          onClick={() => submit("approve")}
          disabled={busy !== null}
          loading={busy === "approve"}
          leading={<Check size={12} aria-hidden />}
          aria-label="Approve transaction"
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="danger"
          onClick={() => setExpanded((v) => !v)}
          aria-label="Reject transaction"
          aria-expanded={expanded ? "true" : "false"}
          leading={<X size={12} aria-hidden />}
          trailing={<ChevronDown size={11} aria-hidden className={expanded ? "rotate-180" : ""} />}
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
            className="flex-1 h-8 px-2 rounded-md border border-border bg-surface text-text-secondary text-caption font-mono focus:outline-none focus:border-aqua-300 focus:shadow-[0_0_0_3px_var(--aqua-glow)] transition-colors"
          />
          <Button size="sm" variant="danger" onClick={() => submit("reject")} loading={busy === "reject"}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
