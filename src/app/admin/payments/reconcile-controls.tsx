"use client";

/** A3 — per-unmatched-item PSP reconciliation: MATCH to a settlement ref, or
 *  WRITE OFF with a reason. Both guarded + COMPLIANCE-audited server-side; no
 *  money moves (the movement already settled — this records its PSP correlation). */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { reconcileMatchAction, reconcileWriteOffAction } from "./payment-actions";

export function ReconcileControls({ txnId }: { txnId: string }) {
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"match" | "writeoff" | null>(null);
  const [ref, setRef] = useState("");
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const submit = () => {
    start(async () => {
      const fd = new FormData();
      fd.set("txnId", txnId);
      fd.set("reason", reason.trim());
      let r: { ok: boolean; error?: string };
      if (mode === "match") { fd.set("providerRef", ref.trim()); r = await reconcileMatchAction(fd); }
      else { r = await reconcileWriteOffAction(fd); }
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      toast({ title: mode === "match" ? "Matched" : "Written off", variant: "success" });
      setMode(null); setRef(""); setReason("");
      router.refresh();
    });
  };

  if (mode) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        {mode === "match" && (
          <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="PSP settlement ref" className="w-[150px] rounded-sm border border-border bg-bg-overlay px-1.5 py-1 font-mono text-[10px] text-text outline-none admin-focus" autoFocus />
        )}
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={mode === "match" ? "note (optional)" : "reason (required)"} className="w-[150px] rounded-sm border border-border bg-bg-overlay px-1.5 py-1 font-mono text-[10px] text-text outline-none admin-focus" autoFocus={mode === "writeoff"} />
        <button type="button" disabled={pending} onClick={submit} className="font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">Save</button>
        <button type="button" onClick={() => setMode(null)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">Cancel</button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={pending} onClick={() => { setMode("match"); setRef(""); setReason(""); }} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-royal-300 hover:underline disabled:opacity-40">
        <I.check s={11} /> Match
      </button>
      <button type="button" disabled={pending} onClick={() => { setMode("writeoff"); setRef(""); setReason(""); }} className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-claret-300 disabled:opacity-40">
        <I.x s={11} /> Write off
      </button>
    </span>
  );
}
