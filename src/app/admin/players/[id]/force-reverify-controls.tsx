"use client";

/** Force re-verify KYC (audit §9.3 #4). Moves an APPROVED player to
 *  re-verification (re-locks withdrawals + reopens resubmit). Reason required +
 *  audit-logged server-side. Shown only when KYC is APPROVED. The confirm happens
 *  in the kit <Modal> (portal + focus-trap + scroll-lock + Esc) — re-locking
 *  withdrawals is money-critical and deserves a deliberate surface, not an inline link. */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { forceReverifyKycAction } from "./actions";

export function ForceReverifyControls({ userId }: { userId: string }) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <>
      <button type="button" disabled={pending} onClick={() => { setOpen(true); setReason(""); }} className="font-mono text-micro tracking-[0.10em] uppercase px-2.5 py-1.5 rounded-sm border border-border bg-bg-overlay text-text-secondary hover:bg-warning-bg/20 hover:text-warning-fg hover:border-warning-border transition-colors inline-flex items-center gap-1.5">
        <I.shieldcheck s={11} /> Force re-verify KYC
      </button>

      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel="Force re-verify KYC"
        maxWidth={420}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] font-bold text-text mb-1">KYC · Re-verify</p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">Force KYC re-verification?</h3>
        <p className="mt-1 text-[12.5px] italic text-text-subtle">
          Moves this APPROVED player back to re-verification: withdrawals re-lock and the player is asked to re-submit. Audit-logged.
        </p>
        <label className="mt-3 block">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-bold text-text-subtle">Reason · Sababu (required, audit-logged)</span>
          <textarea
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why must this player re-verify?"
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={300}
          />
          <span className="font-mono text-[10px] text-text-subtle">{reason.trim().length} / 300</span>
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="claret" size="lg" fullWidth loading={pending} disabled={reason.trim().length < 5} onClick={submit}>
            Force re-verify
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
