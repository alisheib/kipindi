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
 */

import * as React from "react";
import { ConfirmModal } from "@/components/ui/modal";

type Tone = "claret" | "warning" | "gold" | "brand";

type Props = {
  trigger: React.ReactElement;
  title: string;
  body: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Tone of the confirm button. claret = irreversible / destructive (default). */
  tone?: Tone;
  onConfirm: () => void;
  /** Fires right before the dialog opens — use to snapshot form data. */
  onOpen?: () => void;
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
}: Props) {
  const [open, setOpen] = React.useState(false);

  // Clone the trigger so clicking it opens the dialog, but it can't
  // submit the surrounding form directly.
  const triggerEl = React.cloneElement(trigger as React.ReactElement<Record<string, unknown>>, {
    type: "button",
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      onOpen?.();
      setOpen(true);
    },
  });

  return (
    <>
      {triggerEl}
      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={() => { setOpen(false); onConfirm(); }}
        title={title}
        body={body}
        tone={tone}
        confirmLabel={confirmLabel}
        cancelLabel={cancelLabel}
      />
    </>
  );
}
