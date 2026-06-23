"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useDeferredToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { I } from "@/components/ui/glyphs";
import { useRouter } from "next/navigation";
import { reviewSofAction } from "./actions";

export function SofReviewRow({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<"ACCEPT" | "REJECT" | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const { deferToast, toast } = useDeferredToast(pending);
  const router = useRouter();

  const submit = (decision: "ACCEPT" | "REJECT") => {
    if (decision === "REJECT" && reason.trim().length < 5) {
      toast({ title: "Reason required", description: "Reject needs a reason of at least 5 characters.", variant: "warning" });
      return;
    }
    setBusy(decision);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("decision", decision);
      fd.set("reason", reason);
      const result = await reviewSofAction(fd);
      if (result?.ok) {
        router.refresh();
        deferToast({
          title: decision === "ACCEPT" ? "Source of funds accepted" : "Declaration rejected",
          description: decision === "ACCEPT" ? "Player can deposit normally." : "Player asked to re-declare.",
          variant: decision === "ACCEPT" ? "success" : "warning",
        });
      } else {
        toast({ title: "Failed", description: result?.error ?? "Try again.", variant: "danger" });
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
            <Button size="sm" variant="yes" disabled={busy !== null} loading={busy === "ACCEPT"} leading={<I.check s={12} />} aria-label="Accept declaration">
              Accept
            </Button>
          }
          title="Accept source of funds"
          body="This clears the deposit gate for this player. They will be able to deposit normally. Make sure the declared source is plausible and documented."
          confirmLabel="Yes, accept"
          tone="gold"
          onConfirm={() => submit("ACCEPT")}
        />
        <Button size="sm" variant="danger" onClick={() => setExpanded((v) => !v)} aria-label="Reject declaration" aria-expanded={expanded ? "true" : "false"} leading={<I.x s={12} />} trailing={<I.chevronDown s={11} />}>
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
            className="flex-1 h-8 px-2 rounded-md border border-border bg-surface text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant="danger" onClick={() => submit("REJECT")} loading={busy === "REJECT"}>
            Submit
          </Button>
        </div>
      )}
    </div>
  );
}
