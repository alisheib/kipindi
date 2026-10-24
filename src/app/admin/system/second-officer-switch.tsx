"use client";

/**
 * /admin/system — THE OWNER'S "SECOND-OFFICER CHECKS" SWITCH (FEE-TAX R1; ruling 6 of 2026-10-24): the one position the
 * setting can move to from where it stands, behind a dialog that asks why. `second-officer-card.tsx` draws the state.
 *
 * ⛔ NOT ONE SENTENCE IS WRITTEN HERE. The server card hands every word over finished, in the Owner's own language
 * (`secondOfficer.*` in the dictionary), and this file decides WHEN, never WHAT. It is rendered for the Owner only; the
 * server decides that on the STORED role, and the action asks again (`requireOwner`, then the writer's own role read).
 *
 * ⛔ THE REASON ARMS THE BUTTON; IT IS NOT THE GATE. `setSecondOfficerChecks` checks, in order: the stored role, the reason
 * (as `cleanReason` counts it), a fresh read of the setting, the write and its read-back. A crafted POST meets all of it.
 * No typed ceremony words, on Ali's design: a reason and a confirm, in both directions.
 */
import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { useDeferredToast } from "@/components/ui/toast";
import { useMayAct, ActReadOnly } from "@/components/admin/act-gate";
import { runAdminAction } from "@/lib/client/run-admin-action";
import { cleanReason } from "@/lib/affiliate-rules";
import { setSecondOfficerChecksAction } from "./actions";

/** Every word the trigger and the dialog paint, already in the Owner's language. */
export type SecondOfficerSwitchWords = {
  /** The button on the card. */
  trigger: string;
  /** The dialog's heading. */
  title: string;
  /** What happens. */
  body: string;
  reasonLabel: string;
  reasonHint: string;
  /** Beside the live count: "characters left". */
  reasonLeft: string;
  confirmLabel: string;
  cancel: string;
  /** The toast once it has landed; and when it was already so. */
  doneTitle: string;
  unchanged: string;
  /** The toast's title when the switch did not move. */
  failTitle: string;
};

export function SecondOfficerSwitch({
  to,
  words,
  reasonMin,
  reasonMax,
}: {
  /** The position this switch moves the setting to: false turns the checks OFF, true turns them back ON. */
  to: boolean;
  words: SecondOfficerSwitchWords;
  reasonMin: number;
  reasonMax: number;
}) {
  // A1 — this control only ACTS. Read the gate as a hook at the top, act on it below every other hook: an early
  // return above the hooks would render fewer hooks than the last pass and crash the page.
  const mayAct = useMayAct();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<{ field: "reason" | null; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);
  const headingId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  if (!mayAct) return <ActReadOnly />;

  const cleaned = cleanReason(reason);
  const armed = cleaned.length >= reasonMin && cleaned.length <= reasonMax;
  /** Anything typed — what the scrim and Escape read, so a stray click or key cannot discard it. */
  const dirty = reason.length > 0;

  const reset = () => { setReason(""); setRefusal(null); };
  const close = () => {
    if (pending) return;
    setOpen(false);
    reset();
  };
  const editReason = (v: string) => { setReason(v); if (refusal?.field === "reason") setRefusal(null); };

  const submit = () => {
    if (!armed || pending) return;
    setRefusal(null);
    startTransition(async () => {
      const result = await runAdminAction(() => setSecondOfficerChecksAction({ on: to, reason }));
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG, WITH THE REASON THE OWNER WROTE, beside the field it names. */
        const field = "field" in result && result.field === "reason" ? "reason" : null;
        setRefusal({ field, message: result.error });
        toast({ title: words.failTitle, description: result.error, variant: "danger" });
        if (field === "reason") reasonRef.current?.focus();
        return;
      }
      setOpen(false);
      reset();
      router.refresh();
      /* An act that landed without its compliance row says both; the server owns the sentence and whether it warns. */
      deferToast({
        title: result.changed ? words.doneTitle : words.unchanged,
        description: result.note ?? undefined,
        variant: result.warn ? "warning" : result.changed ? "success" : "default",
      });
    });
  };

  return (
    <>
      <Button
        type="button"
        size="md"
        variant="primary"
        aria-haspopup="dialog"
        disabled={pending}
        onClick={() => { reset(); setOpen(true); }}
      >
        {words.trigger}
      </Button>

      <Modal
        open={open}
        onClose={close}
        role="alertdialog"
        labelledBy={headingId}
        maxWidth={440}
        /* ⛔ A MUST-DECIDE GATE ONCE ANYTHING IS TYPED, AND WHILE IT IS SENDING: neither the scrim nor Escape can
           close it then — only Cancel, the close button (hidden while sending) or the confirm. */
        closeOnScrim={!pending && !dirty}
        closeOnEsc={!pending && !dirty}
        showClose={!pending}
        ariaBusy={pending}
        initialFocus={reasonRef}
      >
        <div className="space-y-4">
          <h2 id={headingId} className="pr-8 font-display text-body-lg font-semibold text-text">
            {words.title}
          </h2>
          <p className="text-body-sm text-text-secondary">{words.body}</p>

          <Field
            label={words.reasonLabel}
            hint={words.reasonHint}
            error={refusal?.field === "reason" ? refusal.message : undefined}
            dataField="reason"
          >
            <Textarea
              ref={reasonRef}
              value={reason}
              onChange={(e) => editReason(e.target.value)}
              maxLength={reasonMax}
              rows={3}
              disabled={pending}
              aria-invalid={refusal?.field === "reason" || undefined}
            />
          </Field>
          <p className="text-body-sm text-text-subtle" aria-live="polite">
            <span className="font-mono tabular-nums">{reasonMax - cleaned.length}</span>{" "}{words.reasonLeft}
          </p>

          {refusal !== null && refusal.field === null && (
            <p className="text-body-sm text-danger-fg" role="alert">{refusal.message}</p>
          )}

          {/* The kit's footer order: on a phone the confirm paints first and Cancel beneath it; from the small
              breakpoint up, Cancel sits left of the confirm. */}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
            <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>{words.cancel}</Button>
            <Button type="button" size="md" variant="primary" onClick={submit} disabled={!armed} loading={pending}>
              {words.confirmLabel}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
