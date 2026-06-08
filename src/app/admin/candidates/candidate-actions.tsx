"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Select } from "@/components/ui/select";
import { approveCandidateAction, rejectCandidateAction, publishCandidateAction } from "./actions";

const REJECT_REASONS = [
  { id: "politics",            label: "Politics" },
  { id: "ambiguous_outcome",   label: "Ambiguous outcome" },
  { id: "no_official_source",  label: "No official source" },
  { id: "duplicate",           label: "Duplicate" },
  { id: "past_resolution",     label: "Past resolution" },
  { id: "outside_jurisdiction",label: "Outside Tanzania" },
  { id: "officer_decision",    label: "Officer decision" },
] as const;

export function CandidateActions({ id, mode }: { id: string; mode: "review" | "publish" | "view" }) {
  const [pending, start] = useTransition();
  const [openReject, setOpenReject] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const approve = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await approveCandidateAction(fd);
      if (!r.ok) toast({ title: "Could not approve", description: r.error, variant: "danger" });
      else toast({ title: "Approved", description: "Ready to publish.", variant: "success" });
      router.refresh();
    });
  };

  const reject = (reason: string, note: string) => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("reason", reason);
      fd.set("note", note);
      const r = await rejectCandidateAction(fd);
      if (!r.ok) toast({ title: "Could not reject", description: r.error, variant: "danger" });
      else toast({ title: "Rejected", description: "Candidate moved to history.", variant: "default" });
      setOpenReject(false);
      router.refresh();
    });
  };

  const publish = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      const r = await publishCandidateAction(fd);
      if (!r.ok) toast({ title: "Publish failed", description: r.error, variant: "danger" });
      else toast({ title: "Published", description: `Market ${r.marketId} created.`, variant: "success" });
      router.refresh();
    });
  };

  if (mode === "view") {
    return null;
  }

  if (mode === "publish") {
    return (
      <button
        type="button"
        onClick={publish}
        disabled={pending}
        className="btn btn-gold btn-sm rounded-pill min-w-[120px]"
      >
        {pending ? "Publishing…" : "Publish"}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-[160px]">
      <button
        type="button"
        onClick={approve}
        disabled={pending}
        className="btn btn-gold btn-sm rounded-pill"
      >
        Approve
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
  const [reason, setReason] = useState<string>("officer_decision");
  const [note, setNote] = useState<string>("");
  return (
    <div className="absolute right-4 mt-2 z-10 rounded-md border border-border bg-bg-elevated p-3 shadow-lg w-[280px]">
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle mb-2">
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
        className="w-full rounded-md border border-border bg-bg-overlay px-2 py-1.5 text-[12px] text-text mb-2 outline-none focus:border-[var(--brand-500)] focus:shadow-[0_0_0_3px_oklch(63%_0.18_262_/_0.25)] transition-colors"
        rows={2}
      />
      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => onSubmit(reason, note)} className="btn btn-no btn-md w-full">Reject</button>
        <button type="button" onClick={onCancel} className="btn btn-ghost btn-sm w-full">Cancel</button>
      </div>
    </div>
  );
}
