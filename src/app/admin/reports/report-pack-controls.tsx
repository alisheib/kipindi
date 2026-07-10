"use client";

/**
 * ADM1 — Regulator pack maker-checker controls (client).
 * Renders the single action valid for the current pack state, calls the
 * guarded server action, toasts the result and refreshes. Self-approval is
 * blocked in the UI (and again server-side) — the preparer sees a disabled
 * "second officer required" note instead of an Approve button.
 */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { I } from "@/components/ui/glyphs";
import { useToast } from "@/components/ui/toast";
import { BrandSpinner } from "@/components/brand";
import {
  prepareReportPack,
  approveReportPack,
  submitReportPack,
  acknowledgeReportPack,
} from "./pack-actions";

type PackState = "draft" | "prepared" | "approved" | "submitted" | "acknowledged";

export function ReportPackControls({
  period,
  state,
  isPreparer,
}: {
  period: string;
  state: PackState;
  isPreparer: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [ackRef, setAckRef] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const run = (
    fn: (fd: FormData) => Promise<{ ok: boolean; error?: string }>,
    okTitle: string,
    extra?: Record<string, string>,
  ) => {
    startTransition(async () => {
      const fd = new FormData();
      fd.set("period", period);
      for (const [k, v] of Object.entries(extra ?? {})) fd.set(k, v);
      const r = await fn(fd);
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        return;
      }
      toast({ title: okTitle, variant: "success" });
      router.refresh();
    });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-2">
        <BrandSpinner size={28} />
        <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-text-muted">Recording…</span>
      </div>
    );
  }

  if (state === "draft") {
    return (
      <button type="button" onClick={() => run(prepareReportPack, "Pack prepared")} className="btn btn-primary btn-md w-full">
        <I.fileText s={14} /> Prepare pack &amp; sign
      </button>
    );
  }

  if (state === "prepared") {
    if (isPreparer) {
      return (
        <div className="flex items-start gap-2.5 rounded-md border border-claret-edge bg-claret-soft px-3 py-2.5">
          <I.alertCircle s={15} className="mt-0.5 shrink-0 text-claret-300" />
          <p className="text-[12px] text-text-muted">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-claret-300">Second officer required · Afisa wa pili</span>
            <br />You prepared this pack — a different officer must approve it.
          </p>
        </div>
      );
    }
    return (
      <button type="button" onClick={() => run(approveReportPack, "Pack approved")} className="btn btn-primary btn-md w-full">
        <I.shieldcheck s={14} /> Approve pack &amp; countersign
      </button>
    );
  }

  if (state === "approved") {
    return (
      <button type="button" onClick={() => run(submitReportPack, "Submitted to regulator")} className="btn btn-primary btn-md w-full">
        <I.arrowRight s={14} /> Submit to Gaming Board
      </button>
    );
  }

  if (state === "submitted") {
    return (
      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.14em] text-text-subtle">Acknowledgement reference · optional</span>
          <input
            value={ackRef}
            onChange={(e) => setAckRef(e.target.value)}
            placeholder="e.g. GBT-ACK-2026-06-0417"
            className="h-9 w-full rounded-md border border-border bg-bg-overlay px-2.5 font-mono text-[12px] text-text admin-focus placeholder:text-text-subtle"
          />
        </label>
        <button type="button" onClick={() => run(acknowledgeReportPack, "Acknowledgement recorded", { reference: ackRef })} className="btn btn-primary btn-md w-full">
          <I.checkCircle s={14} /> Record regulator acknowledgement
        </button>
      </div>
    );
  }

  // acknowledged → sealed, no further action
  return null;
}

/** Truncated sha256 with a copy glyph (spec §1 "hash truncated with copy glyph"). */
export function CopyHash({ sha256 }: { sha256: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(sha256);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch { /* clipboard blocked — no-op */ }
      }}
      title={`sha256: ${sha256}`}
      className="inline-flex items-center gap-1 font-mono text-[11px] text-text-tertiary hover:text-text transition-colors"
    >
      sha256 …{sha256.slice(-8)}
      {copied ? <I.check s={11} className="text-yes-300" /> : <I.copy s={11} />}
    </button>
  );
}
