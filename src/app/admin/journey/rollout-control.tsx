"use client";

/**
 * /admin/journey — THE OWNER'S ROLLOUT CONTROL (the Vodacom plan S1): the positions of the new journey's switch
 * that would change something, each behind a dialog that asks why.
 *
 * ⛔ NOT ONE SENTENCE OF A POSITION IS WRITTEN HERE. The server page offers only the positions that would move
 * something (Stop while anybody sees the journey; Resume while the Owner's cap holds it back; players back to
 * the old journey only while it is Live) and hands each one over finished — trigger, title, what it does. This
 * file decides WHEN, never WHAT. It is rendered for the Owner only; the server decides that on the STORED role.
 *
 * ⛔ THE REASON ARMS THE BUTTON; IT IS NOT THE GATE. The ceremony checks, in order: the Owner's stored role, the
 * two-step status, the act, the reason (as `cleanReason` counts it), and the record number this page was
 * rendered on. A crafted POST meets all of it.
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
import { setJourneyRolloutAction } from "./actions";

/** The three positions, spelled here so this file imports no server module, even for a type. */
type Rollout = "WITHDRAWN" | "STAFF_PREVIEW" | "ACTIVE";

/** One position the Owner may move the switch to, with every word its trigger and dialog paint. */
export type RolloutPosition = {
  to: Rollout;
  /** The button on the card. */
  trigger: string;
  /** The dialog's heading. */
  title: string;
  /** What happens, one sentence a paragraph. */
  body: string[];
  confirmLabel: string;
  /** Every position today is the primary button: each is undone by another (§B4a keeps claret for acts that cannot
   *  be). The claret arm stays for a future position that truly cannot be taken back. */
  tone: "claret" | "primary";
  /** The toast once it has landed. */
  doneTitle: string;
};

export function RolloutControl({
  positions,
  expectSeq,
  reasonMin,
  reasonMax,
}: {
  positions: RolloutPosition[];
  expectSeq: number;
  reasonMin: number;
  reasonMax: number;
}) {
  // A1 — this control only ACTS. Read the gate as a hook at the top, act on it below every other hook: an early
  // return above the hooks would render fewer hooks than the last pass and crash the page.
  const mayAct = useMayAct();
  const [openTo, setOpenTo] = useState<Rollout | null>(null);
  const [reason, setReason] = useState("");
  const [refusal, setRefusal] = useState<{ field: "reason" | null; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast, deferToast } = useDeferredToast(pending);
  const headingId = useId();
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  if (!mayAct) return <ActReadOnly />;
  if (positions.length === 0) return null;

  const position = positions.find((p) => p.to === openTo) ?? null;
  const cleaned = cleanReason(reason);
  const armed = position !== null && cleaned.length >= reasonMin && cleaned.length <= reasonMax;
  /** Anything typed — what the scrim and Escape read, so a stray click or key cannot discard it. */
  const dirty = reason.length > 0;

  const reset = () => { setReason(""); setRefusal(null); };
  const close = () => {
    if (pending) return;
    setOpenTo(null);
    reset();
  };
  const open = (to: Rollout) => { reset(); setOpenTo(to); };
  const editReason = (v: string) => { setReason(v); if (refusal?.field === "reason") setRefusal(null); };

  const submit = () => {
    if (!armed || pending || position === null) return;
    setRefusal(null);
    const done = position.doneTitle;
    startTransition(async () => {
      const result = await runAdminAction(() => setJourneyRolloutAction({ to: position.to, reason, expectSeq }));
      if (!result.ok) {
        /* ⛔ THE REFUSAL STAYS IN THE DIALOG, WITH THE REASON THE OWNER WROTE, beside the field it names. A stale
           record number names no field — reloading is the fix, and the server's sentence says so. */
        const field = "field" in result && result.field === "reason" ? "reason" : null;
        setRefusal({ field, message: result.error });
        toast({ title: "The switch did not move", description: result.error, variant: "danger" });
        if (field === "reason") reasonRef.current?.focus();
        return;
      }
      setOpenTo(null);
      reset();
      router.refresh();
      /* An act that landed without its compliance row says both; the server owns the sentence and whether it warns. */
      deferToast({
        title: result.changed ? done : "Nothing changed",
        description: result.note ?? undefined,
        variant: result.warn ? "warning" : result.changed ? "success" : "default",
      });
    });
  };

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {positions.map((p) => (
          <Button
            key={p.to}
            type="button"
            size="md"
            variant={p.tone === "claret" ? "claret" : "primary"}
            aria-haspopup="dialog"
            disabled={pending}
            onClick={() => open(p.to)}
          >
            {p.trigger}
          </Button>
        ))}
      </div>

      <Modal
        open={position !== null}
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
        {position !== null && (
          <div className="space-y-4">
            <h2 id={headingId} className="pr-8 font-display text-body-lg font-semibold text-text">
              {position.title}
            </h2>
            {position.body.map((para, i) => (
              <p key={i} className="text-body-sm text-text-secondary">{para}</p>
            ))}

            <Field
              label="Why — kept with the change"
              hint={`${reasonMin} to ${reasonMax} characters.`}
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
              <span className="font-mono tabular-nums">{reasonMax - cleaned.length}</span> characters left
            </p>

            {refusal !== null && refusal.field === null && (
              <p className="text-body-sm text-danger-fg" role="alert">{refusal.message}</p>
            )}

            {/* The kit's footer order: on a phone the confirm paints first and Cancel beneath it; from the small
                breakpoint up, Cancel sits left of the confirm. */}
            <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
              <Button type="button" size="md" variant="ghost" onClick={close} disabled={pending}>Cancel</Button>
              <Button
                type="button"
                size="md"
                variant={position.tone === "claret" ? "claret" : "primary"}
                onClick={submit}
                disabled={!armed}
                loading={pending}
              >
                {position.confirmLabel}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
