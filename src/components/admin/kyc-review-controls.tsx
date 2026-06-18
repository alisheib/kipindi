"use client";

/**
 * Compliance-officer KYC decision controls. Shown on the player detail page
 * only when a submission is awaiting review. Three outcomes:
 *   • Approve     — one tap (with confirm); unlocks the account if KYC-gated.
 *   • Request info — ask for more / clearer docs; keeps the submission open so
 *                    the player can update and resubmit (ADDITIONAL_INFO).
 *   • Reject       — final; requires a written reason the player receives.
 *
 * Mobile-first: officers review on phones "on the run", so every control is a
 * full-width, ≥44px tap target that stacks on narrow screens and only goes
 * inline from `sm` up. The reason textarea + actions wrap, never overflow.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/spinner";
import { I } from "@/components/ui/glyphs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useToast } from "@/components/ui/toast";
import { approveKycAction, rejectKycAction, requestKycInfoAction } from "@/app/admin/players/[id]/actions";

type Mode = "idle" | "rejecting" | "requesting";

export function KycReviewControls({ userId, status }: { userId: string; status: string }) {
  const reviewable = status === "PENDING_REVIEW" || status === "ADDITIONAL_INFO_REQUIRED";
  const [mode, setMode] = useState<Mode>("idle");
  const [reason, setReason] = useState("");
  // REQUEST_INFO only: specific extra documents to ask for, each a description.
  const [docReqs, setDocReqs] = useState<string[]>([]);
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
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      const r = await approveKycAction(fd);
      if (!r.ok) { toast({ title: "Couldn't approve", description: r.error, variant: "danger" }); return; }
      toast({ title: "KYC approved", description: "Player notified.", variant: "success" });
      router.refresh();
    });
  };

  // Shared submit for the two reason-bearing outcomes.
  const submitReason = (kind: "rejecting" | "requesting") => {
    const v = reason.trim();
    if (v.length < 5) {
      toast({ title: "A note is required", description: "Give the player at least 5 characters.", variant: "danger" });
      return;
    }
    const cleanDocs = docReqs.map((d) => d.trim()).filter((d) => d.length > 0);
    // Every added extra-doc row must carry a description — empty asks help nobody.
    if (kind === "requesting" && docReqs.length > 0 && cleanDocs.length !== docReqs.length) {
      toast({ title: "Describe each document", description: "Every requested document needs a short description.", variant: "danger" });
      return;
    }
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", v);
      if (kind === "requesting") fd.set("requestedDocs", JSON.stringify(cleanDocs));
      const r = kind === "rejecting" ? await rejectKycAction(fd) : await requestKycInfoAction(fd);
      if (!r.ok) { toast({ title: "Couldn't submit", description: r.error, variant: "danger" }); return; }
      toast({
        title: kind === "rejecting" ? "KYC rejected" : "Info requested",
        description: kind === "rejecting" ? "Player notified with your reason."
          : cleanDocs.length > 0 ? `Player asked for ${cleanDocs.length} document${cleanDocs.length > 1 ? "s" : ""} + your note.`
          : "Player asked to update & resubmit.",
        variant: "success",
      });
      setMode("idle"); setReason(""); setDocReqs([]);
      router.refresh();
    });
  };

  const reject = () => submitReason("rejecting");
  const requestInfo = () => submitReason("requesting");

  // ── Reason panel (shared by reject + request-info) ──
  if (mode !== "idle") {
    const rejecting = mode === "rejecting";
    return (
      <div className={`space-y-2 rounded-lg border p-3 ${rejecting ? "border-no-700/50 bg-no-500/[0.06]" : "border-gold-700/50 bg-gold-500/[0.06]"}`}>
        <label className="block font-mono text-micro tracking-[0.12em] uppercase text-text-secondary">
          {rejecting ? "Rejection reason (sent to the player)" : "What do you need? (sent to the player)"}
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={500}
          rows={3}
          autoFocus
          placeholder={rejecting
            ? "e.g. The name on your NIDA doesn't match the name on file. Please re-check and resubmit."
            : "e.g. The back of your ID is blurry — please re-upload a clearer photo with all corners visible."}
          className="w-full rounded-md border border-border bg-bg-inset px-3 py-2 text-[16px] sm:text-[13px] text-text outline-none focus:border-brand-500"
        />

        {/* Request-info only: specific extra documents to ask for. Each row is a
            description the player sees above its upload slot. Empty in the
            normal case — the officer adds rows only when extra docs are needed. */}
        {!rejecting && (
          <div className="space-y-2 rounded-md border border-border-subtle bg-bg-inset/40 p-2.5">
            <p className="font-mono text-micro tracking-[0.12em] uppercase text-text-tertiary">Extra documents to request (optional)</p>
            {docReqs.map((d, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={d}
                  onChange={(e) => setDocReqs((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                  maxLength={300}
                  placeholder="e.g. Proof of address (utility bill, < 3 months)"
                  className="flex-1 min-w-0 rounded-md border border-border bg-bg-inset px-2.5 py-2 text-[16px] sm:text-[13px] text-text outline-none focus:border-gold-500"
                />
                <button type="button" aria-label="Remove document request" onClick={() => setDocReqs((prev) => prev.filter((_, j) => j !== i))}
                  className="shrink-0 inline-flex items-center justify-center rounded-md border border-border text-text-tertiary hover:text-no-300 hover:border-no-700" style={{ width: 40, height: 40 }}>
                  <I.x s={15} />
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setDocReqs((prev) => [...prev, ""])}
              className="inline-flex items-center gap-1.5 font-mono text-micro tracking-[0.08em] uppercase text-gold-300 hover:text-gold-200">
              <I.plus s={14} /> Add a document request
            </button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <button
            type="button"
            onClick={rejecting ? reject : requestInfo}
            disabled={pending}
            className={`btn ${rejecting ? "btn-no" : "btn-gold"} btn-md w-full sm:w-auto inline-flex items-center justify-center gap-1.5`}
            style={{ borderRadius: 999, minHeight: 44 }}
          >
            {pending ? <Spinner size={15} /> : rejecting ? <I.x s={15} /> : <I.alertCircle s={15} />}
            {rejecting ? "Confirm rejection" : "Send request"}
          </button>
          <button
            type="button"
            onClick={() => { setMode("idle"); setReason(""); setDocReqs([]); }}
            disabled={pending}
            className="btn btn-ghost btn-md w-full sm:w-auto"
            style={{ borderRadius: 999, minHeight: 44 }}
          >
            Cancel
          </button>
          <span className="sm:ml-auto text-center font-mono text-micro text-text-tertiary tabular-nums">{reason.length}/500</span>
        </div>
      </div>
    );
  }

  // ── Idle: the three outcome buttons (stack on phone, inline from sm) ──
  return (
    <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2.5">
      <ConfirmDialog
        tone="gold"
        title="Approve verification · Idhinisha"
        body="Approve this identity verification? The player will be notified and (if gated by KYC) unlocked."
        confirmLabel="Yes, approve"
        onConfirm={approve}
        trigger={
          <button type="button" disabled={pending}
            className="btn btn-yes btn-md w-full sm:w-auto inline-flex items-center justify-center gap-1.5" style={{ borderRadius: 999, minHeight: 44 }}>
            {pending ? <Spinner size={15} /> : <I.check s={15} />} Approve
          </button>
        }
      />
      <button type="button" onClick={() => setMode("requesting")} disabled={pending}
        className="btn btn-gold btn-md w-full sm:w-auto inline-flex items-center justify-center gap-1.5" style={{ borderRadius: 999, minHeight: 44 }}>
        <I.alertCircle s={15} /> Request info…
      </button>
      <button type="button" onClick={() => setMode("rejecting")} disabled={pending}
        className="btn btn-no btn-md w-full sm:w-auto inline-flex items-center justify-center gap-1.5" style={{ borderRadius: 999, minHeight: 44 }}>
        <I.x s={15} /> Reject…
      </button>
    </div>
  );
}
