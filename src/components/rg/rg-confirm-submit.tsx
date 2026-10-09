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
 *
 * ⭐ R4-I (2026-10-09, edges E16 · E20, tiles 002 and 112) · THE DIALOG NAMES WHAT IS BEING CONFIRMED. It said only the
 * section's description — "Mapumziko mafupi…" — and never the length the player had picked in the form behind it ("Saa
 * 1"), so the last screen before a one-way break did not say how long it was. `choice` names the form's field and its
 * options: the dialog reads the picked option when it OPENS (`onOpen`, the snapshot hook) and shows it under the
 * sentence as the form shows it — the field's own legend over the option's own label, two existing words, no sentence
 * composed. (The end itself is not stated here: no approved sentence says "will end at"; the sign-in panel the action
 * lands on states it, `?cooled=1&until=…`.) The description keeps its last two words together and no line opens on its
 * dash (`keepText`: "pesa." stood alone on 002).
 *
 * ⭐ R4-I (edges E21, tile 001) · `widthOf` — ONE WIDTH FOR THE PAGE'S TWO BUTTONS. The limits page draws two of these
 * side by side in two forms ("Pumzika" and "Jizuie"), each beside a period field of one shared width. Two labels of two
 * widths wrapped their forms at two different screen widths: in Swahili between 337 and 354px the break's button fell
 * under its field while the exclusion's stood beside it (English 377–378, modelled). The trigger now reserves the
 * other form's label too — drawn invisibly in the same grid cell, `aria-hidden`, as CSS generated content — so both
 * buttons are as wide as the wider of the two, in every language and every font, and the two forms wrap at one width.
 * The name, the text and what a drive's `has-text` finds are the label alone.
 */

import { useRef, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { keepText } from "@/components/ui/keep-run";
import { FieldLegend } from "@/components/ui/field-legend";

export function RgConfirmSubmit({
  label,
  body,
  icon,
  buttonClass = "btn btn-claret btn-md",
  choice,
  widthOf,
}: {
  /** Both the trigger label and the confirm-button label (same word). */
  label: string;
  body: ReactNode;
  icon?: ReactNode;
  buttonClass?: string;
  /** The form field whose picked option the dialog names, its legend, and its options (value → the label shown). */
  choice?: { field: string; label: string; options: readonly { value: string; label: string }[] };
  /** A sibling button's label whose width this trigger reserves, invisibly, so the two are one width (see the header). */
  widthOf?: string;
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
  // The option picked in the form when the dialog opened — read from the form's own field, by its value.
  const [picked, setPicked] = useState<string | null>(null);
  const snapshot = () => {
    if (!choice) return;
    const field = buttonRef.current?.closest("form")?.elements.namedItem(choice.field);
    const value = field && "value" in field ? String((field as { value: unknown }).value) : "";
    setPicked(choice.options.find((o) => o.value === value)?.label ?? null);
  };

  return (
    <ConfirmDialog
      pending={pending}
      tone="claret"
      title={label}
      body={
        <>
          {typeof body === "string" ? <p>{keepText(body)}</p> : body}
          {choice && picked && (
            <p className="mt-3" data-testid="rg-confirm-choice">
              {/* The form's own legend recipe over the picked option, as the form draws the pair. */}
              <FieldLegend as="span" className="block">{choice.label}</FieldLegend>
              <span className="mt-0.5 block font-display text-body font-semibold text-text">{picked}</span>
            </p>
          )}
        </>
      }
      confirmLabel={label}
      onOpen={snapshot}
      onConfirm={submitForm}
      /* ⭐ S6 A8j — the confirm submits the host's form, and so nothing else may (`submitsForm`, in `confirm-dialog.tsx`).
         Today's two hosts hold no text field, so Enter could not submit them; a field added later cannot open the hole. */
      submitsForm
      trigger={
        <button ref={buttonRef} type="button" className={`${buttonClass} inline-flex items-center gap-1.5`}>
          {widthOf ? (
            /* One grid cell, two items centred in it: the icon and the label, and — invisible, aria-hidden — the same
               icon beside the sibling's label. The sibling's words are CSS generated content (`data-reserve`), never a
               text node, so no text search and no accessible name ever meets them; the cell is the wider of the two. */
            <span className="grid justify-items-center">
              <span className="col-start-1 row-start-1 inline-flex items-center gap-1.5">{icon}{label}</span>
              <span aria-hidden data-reserve={widthOf} className="invisible col-start-1 row-start-1 inline-flex items-center gap-1.5 after:content-[attr(data-reserve)]">{icon}</span>
            </span>
          ) : (
            <>
              {icon}
              {label}
            </>
          )}
        </button>
      }
    />
  );
}
