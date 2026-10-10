"use client";

/**
 * CORRECT THE ACCOUNT'S DATE OF BIRTH (2026-10-10) — the only fix for a wrong sign-up date.
 *
 * ⭐ WHY IT EXISTS. From 2026-10-10 the identity step no longer asks a player for their date of birth: it
 * takes the one on the ACCOUNT (`User.dob`, typed at sign-up), and the age gate runs on it. A player who
 * mistyped it at sign-up has no field of their own to fix it with — an officer does it here, on evidence.
 *
 * ⭐ WHAT PRESSING IT DOES, stated in the dialog before it is pressed: the account's date and the identity
 * record's date both change, the identity as it stood is kept in its history, and the age gate runs again —
 * UNDER 18 IS A FINAL REFUSAL (the wallet is frozen first). Otherwise the identity goes to an officer for
 * review; a corrected date is never approved automatically.
 *
 * ⛔ Server-enforced by `correctDateOfBirth` (compliance grant + step-up via the page's one gate, never the
 * officer's own account, a written reason of at least 20 characters, the row version the officer saw).
 * ⛔ The date is never shown back here and never enters the audit chain — the reason's LENGTH does.
 */
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { DateSelect } from "@/components/ui/date-select";
import { I } from "@/components/ui/glyphs";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { focusFirstInvalid } from "@/lib/client/focus-first-invalid";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { correctDateOfBirthAction } from "./kyc-actions";

/** `DOB_CORRECTION_REASON_MIN` in kyc-service.ts — repeated only to arm the button; the action re-checks it. */
const MIN = 20;

export function KycDobCorrection({ userId, version }: { userId: string; version: string }) {
  const mayAct = useMayAct();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [dob, setDob] = useState("");
  const [reason, setReason] = useState("");
  const bodyRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Rules of hooks: read the gate at the top, act on it below every hook.
  if (!mayAct) return <ActReadOnly />;

  const today = new Date().toISOString().slice(0, 10);
  const ready = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(dob) && reason.trim().length >= MIN;

  const submit = () => {
    if (!ready) return;
    start(async () => {
      const fd = new FormData();
      fd.set("userId", userId);
      fd.set("version", version);
      fd.set("dob", dob);
      fd.set("reason", reason.trim());
      const r = await runAdminAction(() => correctDateOfBirthAction(fd));
      if (!r.ok) {
        toast({ title: "Not corrected", description: r.error, variant: "danger" });
        if (r.field) focusFirstInvalid(bodyRef.current, [r.field]);
        return;
      }
      setOpen(false); setDob(""); setReason("");
      router.refresh();
      toast({ title: "Date of birth corrected", description: "The age check ran again. Read the case's new status before anything else.", variant: "warning" });
    });
  };

  return (
    <>
      <Button type="button" size="sm" variant="ghost" disabled={pending} leading={<I.edit s={13} />} onClick={() => { setOpen(true); setDob(""); setReason(""); }}>
        Correct date of birth
      </Button>
      <Modal
        open={open}
        onClose={() => { if (!pending) setOpen(false); }}
        role="alertdialog"
        ariaLabel="Correct the account's date of birth"
        maxWidth={460}
        // ⛔ Once anything is typed, only Cancel / ✕ close it (2026-10-10, review G2): the written reason is ≥ 20 characters
        // and the server refuses the act without it, so a stray click on the scrim or an Escape must not throw it away —
        // the stop-a-queued-stake ceremony's rule, the scrim and Escape agreeing (`closeOnEsc`).
        closeOnScrim={!pending && !dob && !reason.trim()}
        closeOnEsc={!pending && !dob && !reason.trim()}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <div ref={bodyRef}>
          <p className="font-mono text-micro uppercase eyebrow font-bold text-text mb-1">KYC · Date of birth</p>
          <h3 className="font-display text-title-sm font-bold text-text leading-tight">Correct the account&apos;s date of birth?</h3>
          <p className="mt-1 text-body-sm text-text-subtle">
            Use this only on evidence that the date typed at sign-up is wrong. The account and the identity record both change, and the age check runs again: <strong>under 18 is a final refusal</strong> and freezes the wallet. Otherwise the identity goes to an officer for review — never approved automatically. Audit-logged; the date itself is not written to the log.
          </p>
          <div className="mt-3" data-field="dob">
            <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Correct date of birth · Tarehe sahihi ya kuzaliwa</span>
            <div className="mt-1">
              <DateSelect value={dob} max={today} min="1900-01-01" onChange={(iso) => setDob(iso)} size="md" />
            </div>
          </div>
          <label className="mt-3 block" data-field="reason">
            <span className="font-mono text-micro uppercase eyebrow font-bold text-text-subtle">Reason · Sababu</span>
            <span className="block text-body-sm text-text-subtle">(required, at least {MIN} characters, audit-logged)</span>
            <textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="What evidence shows the date was wrong?"
              className="mt-1 w-full rounded-md border border-border bg-bg-overlay px-2 py-2 text-body-sm text-text outline-none admin-focus transition-colors"
              rows={3}
              maxLength={500}
            />
            <span className="font-mono text-body-sm tabular-nums text-text-subtle">{reason.trim().length} / {MIN} minimum</span>
          </label>
          <div className="mt-4 flex flex-col gap-2">
            <Button type="button" variant="primary" size="lg" fullWidth loading={pending} disabled={!ready} onClick={submit}>
              Correct date of birth
            </Button>
            <Button type="button" variant="ghost" size="md" fullWidth disabled={pending} onClick={() => { if (!pending) setOpen(false); }}>
              Cancel · Ghairi
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
