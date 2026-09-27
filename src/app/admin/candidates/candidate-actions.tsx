"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ActionOverlay, useActionOverlay } from "@/components/admin/action-overlay";
import { approveCandidateAction, rejectCandidateAction, publishCandidateAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { UnsavedChangesGuard, PendingChangesBar } from "@/components/ui/unsaved-changes";

const REJECT_REASONS = [
  { id: "politics",            label: "Politics" },
  { id: "ambiguous_outcome",   label: "Ambiguous outcome" },
  { id: "no_official_source",  label: "No official source" },
  { id: "duplicate",           label: "Duplicate" },
  { id: "past_resolution",     label: "Past resolution" },
  { id: "outside_jurisdiction",label: "Outside Tanzania" },
  { id: "officer_decision",    label: "Officer decision" },
] as const;

/** ⛔ ONE HOME for the resting reason — the field's seed and the dirty comparison read one name. */
const REJECT_DEFAULT = "officer_decision";

export function CandidateActions({ id, mode }: { id: string; mode: "review" | "publish" | "view" }) {
  const [pending, start] = useTransition();
  const [openReject, setOpenReject] = useState(false);
  const overlay = useActionOverlay();
  const router = useRouter();

  const approve = () => {
    overlay.run("Approving candidate…", "Inaendelea kuidhinisha. Subiri kidogo.");
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      // `runAdminAction`: an expired session's sign-in redirect passes through; a bare catch used
      // to swallow it and say "Server error" instead.
      const r = await runAdminAction(() => approveCandidateAction(fd));
      if (!r.ok) { overlay.fail("Could not approve", r.error ?? "Try again."); return; }
      router.refresh();
      overlay.succeed("Candidate approved", "Ready to publish as a live market.");
    });
  };

  const reject = (reason: string, note: string) => {
    setOpenReject(false);
    overlay.run("Rejecting candidate…", "Recording your decision in the audit log.");
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("reason", reason);
      fd.set("note", note);
      const r = await runAdminAction(() => rejectCandidateAction(fd));
      if (!r.ok) { overlay.fail("Could not reject", r.error ?? "Try again."); return; }
      router.refresh();
      overlay.succeed("Candidate rejected", "Moved to history.");
    });
  };

  const publish = () => {
    overlay.run("Publishing market…", "Creating a live market. Players will be able to bet on it.");
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await runAdminAction(() => publishCandidateAction(fd));
      if (!r.ok) { overlay.fail("Publish failed", r.error ?? "Try again."); return; }
      router.refresh();
      overlay.succeed("Market is live", `Market ${r.marketId} — players can now place bets.`);
    });
  };

  if (mode === "view") {
    return null;
  }

  if (mode === "publish") {
    return (
      <>
        <ConfirmDialog
          trigger={
            <button
              type="button"
              disabled={pending}
              className="btn btn-primary btn-sm rounded-pill min-w-[120px]"
            >
              {pending ? "Publishing…" : "Publish"}
            </button>
          }
          title="Publish market · Chapisha soko"
          body={<>This creates a <strong>live market</strong> that players can immediately place real-money bets on. Once bets are placed it cannot be un-published — only resolved or voided.</>}
          confirmLabel="Yes, publish"
          tone="brand"
          onConfirm={publish}
        />
        <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="btn btn-primary btn-sm rounded-pill"
      >
        {pending ? "Processing…" : "Approve"}
      </button>
      <button
        type="button"
        onClick={() => setOpenReject((v) => !v)}
        disabled={pending}
        className="btn btn-ghost btn-sm rounded-pill"
      >
        Reject…
      </button>
      {openReject && (
        <RejectForm
          onCancel={() => setOpenReject(false)}
          onSubmit={(reason, note) => reject(reason, note)}
        />
      )}
      <ActionOverlay state={overlay.state} onDismiss={overlay.dismiss} />
    </div>
  );
}

function RejectForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (reason: string, note: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState<string>(REJECT_DEFAULT);
  const [note, setNote] = useState<string>("");
  const dirty = reason !== REJECT_DEFAULT || note.trim().length > 0;
  return (
    <div className="absolute right-4 mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[280px]">
      <p className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle mb-2">
        Reject reason
      </p>
      <div className="mb-2">
        <Select
          value={reason}
          onChange={setReason}
          size="sm"
          options={REJECT_REASONS.map((r) => ({ value: r.id, label: r.label }))}
        />
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note for the audit log…"
        className="w-full rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[12px] text-text mb-2 outline-none admin-focus transition-colors"
        rows={2}
      />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onSubmit(reason, note)} className="btn btn-no btn-md w-full">Reject</button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>

      {/**
        * ⛔ A POPOVER IS NOT A MODAL, AND THAT IS THE WHOLE REASON THIS IS HERE. The triage put
        * this panel in the "lost to Cancel, not to navigation" class because it has a Cancel
        * button — but a modal EARNS that exemption by blocking the page behind an overlay, and
        * this is a bare `absolute` div. The sidebar, the tabs and every row link stay clickable
        * straight through it, so a typed rejection note is exposed to navigation exactly like a
        * page-level field. The dismissible-looking chrome is what makes it easy to miss.
        * ⛔ AND THE BAR CARRIES NO REJECT. A primary button in a window-wide bar that rejects a
        * candidate without naming it is a decision taken out of sight of its record — the bar
        * warns and offers Discard; the Reject stays in this panel, beside the candidate it acts on.
        */}
      <PendingChangesBar
        dirty={dirty}
        label="Rejection not recorded"
        detail="The reason and note are held in this panel only. Press Reject in the panel to record it."
        onDiscard={onCancel}
      />
      <UnsavedChangesGuard
        dirty={dirty}
        body="A rejection reason has been chosen for this candidate but not recorded. Leaving now discards it."
      />
    </div>
  );
}
