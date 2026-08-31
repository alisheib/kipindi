"use client";

/** Force re-verify KYC (audit §9.3 #4). Moves an APPROVED player to
 *  re-verification (reopens resubmit). Reason required + audit-logged server-side.
 *  Shown only when KYC is APPROVED. The confirm happens in the kit <Modal> (portal +
 *  focus-trap + scroll-lock + Esc) — changing a player's compliance state deserves a
 *  deliberate surface, not an inline link.
 *  🔴 IT DOES NOT RE-LOCK WITHDRAWALS. It said so here, in the modal body and in the
 *  success toast until 2026-08-20; the withdrawal identity gate is gone (Board comment
 *  #1, 2026-08-19). Telling an officer this stops a payout, at the moment they choose
 *  it to stop a payout, is the officer-facing twin of E-5. To stop money leaving:
 *  freeze the wallet, pause payouts, or the AML ≥ TZS 1,000,000 two-officer hold.
 *  docs/BOARD-DISCLOSURE-B-E.md §6.1. */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { forceReverifyKycAction } from "./actions";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";

export function ForceReverifyControls({ userId }: { userId: string }) {
  // A1 — this control only ACTS, so a role holding VIEW without ACT is shown why rather
  // than being offered a button the server will refuse (and logged as a privilege
  // escalation for pressing it). See docs/ADMIN-CONSOLE-FINDINGS.md.
  const mayAct = useMayAct();

  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const router = useRouter();
  const { toast } = useToast();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  // Rules of hooks: read the gate as a hook at the top, ACT on it below every other hook.
  // Revoking an ACT grant mid-session flips `mayAct` on the next router.refresh(); an early
  // return above these hooks would render fewer hooks than the last pass and crash the page.
  if (!mayAct) return <ActReadOnly />;

  const submit = () => {
    if (reason.trim().length < 5) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = await runAdminAction(() => forceReverifyKycAction(fd));
      if (!r.ok) {
        toast({ title: "Blocked", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      setOpen(false); setReason("");
      router.refresh();
      toast({ title: "Re-verification required", description: "Player asked to re-submit documents. This does not stop withdrawals — freeze the wallet or pause payouts for that.", variant: "warning" });
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.shieldcheck s={13} />} onClick={() => { setOpen(true); setReason(""); }}>
        Force re-verify KYC
      </Button>

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
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">KYC · Re-verify</p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">Force KYC re-verification?</h3>
        <p className="mt-1 text-body-sm italic text-text-subtle">
          Moves this APPROVED player back to re-verification and asks them to re-submit their documents. Audit-logged. It does <strong>not</strong> stop withdrawals — to hold money, freeze the wallet or pause payouts.
        </p>
        <label className="mt-3 block">
          {/* DG-A-14: "Reason · Sababu (required, audit-logged)" was one microlabel with its
              hint welded on, so the hint — reading copy — was wearing the eyebrow recipe at
              10px, well under the §T4 12.5px floor. The bilingual label keeps that recipe
              because it really is an identifier; the hint moves to its own legible line. The
              textarea stays nested inside this <label>, so the control is still named by it. */}
          <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Reason · Sababu</span>
          <span className="block text-body-sm text-text-subtle">(required, audit-logged)</span>
          <textarea
            data-field="reason"
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
