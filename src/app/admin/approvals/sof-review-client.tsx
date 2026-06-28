"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { I } from "@/components/ui/glyphs";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { useRouter } from "next/navigation";
import { reviewSofAction } from "./actions";

type SofDecision = "ACCEPT" | "REJECT" | "MORE_INFO";

export function SofReviewRow({ userId }: { userId: string }) {
  const [busy, setBusy] = useState<SofDecision | null>(null);
  const [expanded, setExpanded] = useState<"REJECT" | "MORE_INFO" | false>(false);
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const overlay = useActionOverlay();
  const { toast } = useToast();
  const router = useRouter();

  const LABELS: Record<SofDecision, { running: string; detail: string; done: string; doneDetail: string }> = {
    ACCEPT: { running: "Accepting declaration…", detail: "Clearing the deposit gate for this player.", done: "Source of funds accepted", doneDetail: "Player can deposit normally." },
    REJECT: { running: "Rejecting declaration…", detail: "Player will be asked to re-declare.", done: "Declaration rejected", doneDetail: "Player asked to re-declare." },
    MORE_INFO: { running: "Requesting more info…", detail: "Player will be notified to update their declaration.", done: "More info requested", doneDetail: "Player notified to update." },
  };

  const submit = (decision: SofDecision) => {
    if ((decision === "REJECT" || decision === "MORE_INFO") && reason.trim().length < 5) {
      toast({ title: "Reason required", description: `${decision === "REJECT" ? "Reject" : "More info"} needs a reason of at least 5 characters.`, variant: "warning" });
      return;
    }
    const l = LABELS[decision];
    setBusy(decision);
    overlay.run(l.running, l.detail);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", userId);
        fd.set("decision", decision);
        fd.set("reason", reason);
        const result = await reviewSofAction(fd);
        if (result?.ok) {
          router.refresh();
          overlay.succeed(l.done, l.doneDetail);
        } else {
          overlay.fail("SOF review failed", result?.error ?? "Try again.");
        }
      } catch {
        overlay.fail("SOF review failed", "Server error — please try again.");
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
        <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => v === "MORE_INFO" ? false : "MORE_INFO")} aria-label="Request more info" leading={<I.info s={12} />}>
          More info
        </Button>
        <Button size="sm" variant="danger" onClick={() => setExpanded((v) => v === "REJECT" ? false : "REJECT")} aria-label="Reject declaration" aria-expanded={expanded === "REJECT" ? "true" : "false"} leading={<I.x s={12} />}>
          Reject
        </Button>
      </div>
      {expanded && (
        <div className="flex items-start gap-1.5">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={expanded === "MORE_INFO" ? "What info is needed? (required)" : "Rejection reason (required)"}
            aria-label={expanded === "MORE_INFO" ? "More info request" : "Rejection reason"}
            className="flex-1 h-8 px-2 rounded-md border border-border bg-bg-inset text-text-secondary text-caption font-mono focus:outline-none admin-focus transition-colors"
          />
          <Button size="sm" variant={expanded === "MORE_INFO" ? "ghost" : "danger"} onClick={() => submit(expanded as SofDecision)} loading={busy === expanded}>
            Send
          </Button>
        </div>
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}
