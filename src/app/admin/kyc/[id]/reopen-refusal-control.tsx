"use client";

/**
 * RE-OPEN A FINAL REFUSAL (2026-09-13) — the only door back once a player has been refused on a
 * final code, because they can no longer restart verification themselves (S2).
 *
 * ⭐ WHAT PRESSING IT DOES, stated in the dialog before it is pressed: the verification restarts
 * (the document number is released for this player to present again), the identity-refusal hold on
 * the wallet is lifted — any other hold stays — and the player is told they may verify again. A
 * balance decision already carried out is NOT undone.
 *
 * ⛔ Server-enforced by `reopenFinalRefusal` (compliance grant, step-up, never the officer's own
 * account, a written reason of at least 20 characters, awaited COMPLIANCE audit).
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { I } from "@/components/ui/glyphs";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { reopenFinalRefusalWorkstationAction } from "./kyc-actions";

const MIN = 20;

export function ReopenRefusalControl({ userId }: { userId: string }) {
  const mayAct = useMayAct();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  if (!mayAct) return <ActReadOnly />;

  const submit = () => {
    if (reason.trim().length < MIN) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("reason", reason.trim());
      const r = await runAdminAction(() => reopenFinalRefusalWorkstationAction(fd));
      if (!r.ok) {
        toast({ title: "Not re-opened", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(document.body, [r.field]);
        return;
      }
      setOpen(false); setReason("");
      router.refresh();
      toast({ title: "Refusal re-opened", description: "The player may verify again. Any other hold on the wallet stays in place.", variant: "warning" });
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.rotateCcw s={13} />} onClick={() => { setOpen(true); setReason(""); }}>
        Re-open this refusal
      </Button>
      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel="Re-open a final refusal"
        maxWidth={440}
        closeOnScrim={!pending}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">KYC · Re-open refusal</p>
        <h3 className="font-display text-[18px] font-bold text-text leading-tight">Re-open this final refusal?</h3>
        <p className="mt-1 text-body-sm text-text-subtle">
          Use this only when the final refusal was wrong. The verification restarts, the identity-refusal freeze is lifted (<strong>any other hold on the wallet stays</strong>), and the player is told they may verify again. A balance decision already carried out is not undone. Audit-logged.
        </p>
        <label className="mt-3 block">
          <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Reason · Sababu</span>
          <span className="block text-body-sm text-text-subtle">(required, at least {MIN} characters, audit-logged)</span>
          <textarea
            data-field="reason"
            ref={reasonRef}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why was the final refusal wrong?"
            className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2.5 py-2 text-[13px] text-text outline-none admin-focus transition-colors"
            rows={3}
            maxLength={500}
          />
          <span className="font-mono text-[10px] text-text-subtle">{reason.trim().length} / {MIN} minimum</span>
        </label>
        <div className="mt-4 flex flex-col gap-2">
          <Button type="button" variant="primary" size="lg" fullWidth loading={pending} disabled={reason.trim().length < MIN} onClick={submit}>
            Re-open refusal
          </Button>
          <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
            Cancel · Ghairi
          </Button>
        </div>
      </Modal>
    </>
  );
}
