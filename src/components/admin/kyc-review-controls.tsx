"use client";

/**
 * Compliance-officer KYC decision controls. Shown on the player detail page
 * only when a submission is awaiting review. Approve is one tap (with confirm);
 * Reject requires a written reason that the player receives in-app + by email.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { approveKycAction, rejectKycAction } from "@/app/admin/players/[id]/actions";

export function KycReviewControls({ userId, status }: { userId: string; status: string }) {
  const reviewable = status === "PENDING_REVIEW" || status === "ADDITIONAL_INFO_REQUIRED";
  const [mode, setMode] = useState<"idle" | "rejecting">("idle");
  const [reason, setReason] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  if (!reviewable) {
    return (
      <p className="text-caption text-text-tertiary">
        No action needed — this submission is <span className="font-mono uppercase">{status}</span>.
      </p>
    );
  }

  const approve = () => {
    if (!confirm("Approve this identity verification? The player will be notified and (if gated by KYC) unlocked.")) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await approveKycAction(fd);
      if (!r.ok) { toast({ title: "Couldn't approve", description: r.error, variant: "danger" }); return; }
      toast({ title: "KYC approved", description: "Player notified.", variant: "success" });
      router.refresh();
    });
  };

  const reject = () => {
    const v = reason.trim();
    if (v.length < 5) { toast({ title: "Reason required", description: "Give the player at least 5 characters explaining why.", variant: "danger" }); return; }
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", v);
      const r = await rejectKycAction(fd);
      if (!r.ok) { toast({ title: "Couldn't reject", description: r.error, variant: "danger" }); return; }
      toast({ title: "KYC rejected", description: "Player notified with your reason.", variant: "success" });
      setMode("idle"); setReason("");
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {mode === "idle" ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={approve} disabled={pending}
            className="btn btn-yes btn-md inline-flex items-center gap-1.5" style={{ borderRadius: 999, minHeight: 40 }}>
            {pending ? <Spinner size={15} /> : <I.check s={15} />} Approve
          </button>
          <button type="button" onClick={() => setMode("rejecting")} disabled={pending}
            className="btn btn-no btn-md inline-flex items-center gap-1.5" style={{ borderRadius: 999, minHeight: 40 }}>
            <I.x s={15} /> Reject…
          </button>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-no-700/50 bg-no-500/[0.06] p-3">
          <label className="font-mono text-micro tracking-[0.12em] uppercase text-text-secondary">Rejection reason (sent to the player)</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={500}
            rows={3}
            autoFocus
            placeholder="e.g. The name on your NIDA doesn't match the name on file. Please re-check and resubmit."
            className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-[13px] text-text outline-none focus:border-no-500"
          />
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={reject} disabled={pending}
              className="btn btn-no btn-sm inline-flex items-center gap-1.5" style={{ borderRadius: 999 }}>
              {pending ? <Spinner size={14} /> : <I.x s={14} />} Confirm rejection
            </button>
            <button type="button" onClick={() => { setMode("idle"); setReason(""); }} disabled={pending}
              className="btn btn-ghost btn-sm" style={{ borderRadius: 999 }}>
              Cancel
            </button>
            <span className="ml-auto font-mono text-micro text-text-tertiary tabular-nums">{reason.length}/500</span>
          </div>
        </div>
      )}
    </div>
  );
}
