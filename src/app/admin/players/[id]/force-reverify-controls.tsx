"use client";

/** Force re-verify KYC (audit §9.3 #4). Moves an APPROVED player to
 *  re-verification (re-locks withdrawals + reopens resubmit). Reason required +
 *  audit-logged server-side. Shown only when KYC is APPROVED. */
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { I } from "@/components/ui/glyphs";
import { forceReverifyKycAction } from "./actions";

export function ForceReverifyControls({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();

  const submit = () => {
    if (reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = await forceReverifyKycAction(fd);
      if (!r.ok) { toast({ title: "Blocked", description: r.error, variant: "danger" }); return; }
      setOpen(false); setReason("");
      router.refresh();
      toast({ title: "Re-verification required", description: "Withdrawals re-locked; player asked to re-submit.", variant: "warning" });
    });
  };

  if (open) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="reason (required)" className="w-[180px] rounded-sm border border-border bg-bg-overlay px-1.5 py-1 font-mono text-[10px] text-text outline-none admin-focus" autoFocus />
        <button type="button" disabled={pending || reason.trim().length < 5} onClick={submit} className="font-mono text-[10px] uppercase tracking-[0.08em] text-warning-fg hover:underline disabled:opacity-40">Re-verify</button>
        <button type="button" onClick={() => setOpen(false)} className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-subtle hover:text-text">Cancel</button>
      </span>
    );
  }
  return (
    <button type="button" disabled={pending} onClick={() => { setOpen(true); setReason(""); }} className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border border-border bg-bg-overlay text-text-secondary hover:bg-warning-bg/20 hover:text-warning-fg hover:border-warning-border transition-colors inline-flex items-center gap-1.5">
      <I.shieldcheck s={11} /> Force re-verify KYC
    </button>
  );
}
