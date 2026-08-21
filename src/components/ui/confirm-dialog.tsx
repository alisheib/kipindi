"use client";

/**
 * ConfirmDialog — the trigger-driven convenience wrapper over <ConfirmModal>.
 *
 * Wraps a form's submit so a destructive action (self-exclude, close account,
 * large withdraw, irreversible state changes) always asks for an explicit
 * "Yes, do it" before the server action runs.
 *
 *   <ConfirmDialog
 *     trigger={<button className="btn btn-claret btn-md">Self-exclude</button>}
 *     title="Self-exclude · Jizuie"
 *     body="This locks your account for the period you picked..."
 *     confirmLabel="Yes, self-exclude"
 *     onConfirm={() => formRef.current?.requestSubmit()}
 *   />
 *
 * The scrim + portal + focus-trap + scroll-lock all live in the shared
 * <ConfirmModal>/<Modal> primitive — this file only adds the clone-the-trigger
 * ergonomics so callers don't manage open state themselves.
 *
 * ⭐ DS-4 / B-6 (2026-08-07) — the PENDING hold. Pass `pending` (from
 * `useTransition` or `useFormStatus`) and confirm STOPS closing the dialog:
 * it holds open through the round-trip wearing ConfirmModal's `loading`
 * (both buttons disabled, spinner + "working", scrim/Esc/✕ blocked), then
 * closes itself on the true→false falling edge. Before this, the two
 * highest-stakes forms in the product (deposit, withdraw) confirmed → the
 * modal vanished → the page sat dead-looking for the whole 2–10s Selcom
 * round-trip → anxious re-submit. The dial and SellButton already did this
 * correctly; this brings the convenience wrapper up to the same bar.
 * ⚠️ Leave `pending` undefined to keep the classic close-on-confirm
 * behaviour — the admin consumers that run their own overlay want exactly that.
 */

import * as React from "react";
import { ConfirmModal } from "@/components/ui/modal";

type Tone = "claret" | "warning" | "brand";

type Props = {
  trigger: React.ReactElement;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone of the confirm button. claret = irreversible / destructive (default). */
  tone?: Tone;
  /** In hold-open mode (`pending` provided), return `false` to signal the
   *  mutation did NOT start (e.g. `form.reportValidity()` refused) — the dialog
   *  releases immediately instead of waiting for a round-trip that will never
   *  come. Any other return (including void) means "in flight, hold". */
  onConfirm: () => void | boolean;
  /** Fires right before the dialog opens — use to snapshot form data. */
  onOpen?: () => void;
  /** Fires on the open true→false edge, WHEREVER the close came from (cancel ·
   *  scrim · Esc · refused pre-flight · the hold-open falling edge). Use it to
   *  drop state a closed dialog has no business keeping — e.g. a resolved payee
   *  name that must not be waiting on screen the next time it opens. Optional:
   *  omit it and the dialog behaves exactly as it always has. */
  onClose?: () => void;
  /** B-22 — pre-flight gate: return `false` to REFUSE opening (invalid input).
   *  The caller surfaces its own kit-styled error (inline/toast) — never the
   *  native browser bubble. Omit for always-openable dialogs. */
  openGuard?: () => boolean;
  /** DS-4 / B-6 — the mutation-in-flight signal (useTransition pending or
   *  useFormStatus().pending). PROVIDING this prop (even as `false`) opts the
   *  dialog into the hold-open contract: confirm no longer closes it; the
   *  falling edge of `pending` does. Omit for classic close-on-confirm. */
  pending?: boolean;
};

export function ConfirmDialog({
  trigger,
  title,
  body,
  confirmLabel,
  cancelLabel,
  tone = "claret",
  onConfirm,
  onOpen,
  onClose,
  openGuard,
  pending,
}: Props) {
  const [open, setOpen] = React.useState(false);
  // Hold-open bookkeeping (only used when `pending` is provided): `awaiting`
  // means confirm was pressed and we are riding the round-trip; `sawPending`
  // distinguishes "not started yet" from "settled" so the dialog closes on the
  // falling edge and never on the gap before the transition starts.
  const holdOpen = pending !== undefined;
  const [awaiting, setAwaiting] = React.useState(false);
  const sawPendingRef = React.useRef(false);

  React.useEffect(() => {
    if (!awaiting) return;
    if (pending) { sawPendingRef.current = true; return; }
    if (sawPendingRef.current) {
      // Settled (success re-render, error re-render, or the action returned) —
      // release the dialog. On a redirect this whole tree unmounts instead.
      setAwaiting(false);
      sawPendingRef.current = false;
      setOpen(false);
    }
  }, [pending, awaiting]);

  // `onClose` as ONE edge-detector rather than a call at each of the three close
  // sites (cancel/scrim/Esc, refused pre-flight, the hold-open falling edge), so
  // a close path added later cannot forget to fire it. The ref keeps the
  // callback fresh without making it an effect dependency — callers pass an
  // inline arrow, which would otherwise re-run this on every render.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; }, [onClose]);
  const wasOpenRef = React.useRef(false);
  React.useEffect(() => {
    if (wasOpenRef.current && !open) onCloseRef.current?.();
    wasOpenRef.current = open;
  }, [open]);

  // Clone the trigger so clicking it opens the dialog, but it can't
  // submit the surrounding form directly. While a held-open mutation is in
  // flight the trigger is disabled too — no queueing a second confirm (B-6).
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    type: "button",
    disabled: holdOpen ? (awaiting || pending || (trigger.props as { disabled?: boolean }).disabled) : (trigger.props as { disabled?: boolean }).disabled,
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      // B-22 — an invalid form never earns a confirm dialog.
      if (openGuard && !openGuard()) return;
      onOpen?.();
      setOpen(true);
    },
  });

  return (
    <>
      {triggerEl}
      <ConfirmModal
        open={open}
        onClose={() => { if (!awaiting) setOpen(false); }}
        onConfirm={() => {
          if (holdOpen) {
            if (awaiting) return; // one confirm per round-trip
            const started = onConfirm();
            if (started === false) { setOpen(false); return; } // refused pre-flight — show the field errors
            setAwaiting(true);
          } else {
            setOpen(false);
            onConfirm();
          }
        }}
        title={title}
        body={body}
        tone={tone}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
        loading={holdOpen && awaiting}
      />
    </>
  );
}
