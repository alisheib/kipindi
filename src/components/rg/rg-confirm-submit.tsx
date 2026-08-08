"use client";

/**
 * RgConfirmSubmit — the shared two-step confirmation for destructive
 * responsible-gambling actions (self-exclusion, cooling-off break). A misclick
 * must never lock a player out, so the plain submit is gated behind a claret
 * ConfirmDialog. Works against the surrounding server-action <form> by walking
 * up from the trigger button and calling requestSubmit() only after confirm —
 * which keeps the host page server-rendered.
 *
 * Player-protection (Tanzania Gaming Board / UK LCCP equivalent): destructive
 * RG actions require a deliberate two-step confirmation.
 *
 * Consolidates the former SelfExcludeConfirm + CoolOffConfirm (identical
 * scaffold) into one primitive — the caller supplies label/body/icon/button.
 */

import { useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function RgConfirmSubmit({
  label,
  body,
  icon,
  buttonClass = "btn btn-claret btn-md",
}: {
  /** Both the trigger label and the confirm-button label (same word). */
  label: string;
  body: ReactNode;
  icon?: ReactNode;
  buttonClass?: string;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const submitForm = () => buttonRef.current?.closest("form")?.requestSubmit();
  // B-20 — this component always renders INSIDE the server-action <form> it
  // submits (that is its whole mechanism), so useFormStatus sees that form's
  // in-flight state. Passing it opts into ConfirmDialog's DS-4 hold-open
  // contract: confirm keeps the dialog up wearing the spinner until the
  // round-trip settles, instead of vanishing while a self-exclusion is still
  // being written — the one action a player will absolutely re-click.
  const { pending } = useFormStatus();

  return (
    <ConfirmDialog
      pending={pending}
      tone="claret"
      title={label}
      body={typeof body === "string" ? <p>{body}</p> : body}
      confirmLabel={label}
      onConfirm={submitForm}
      trigger={
        <button ref={buttonRef} type="button" className={`${buttonClass} inline-flex items-center gap-1.5`}>
          {icon}
          {label}
        </button>
      }
    />
  );
}
