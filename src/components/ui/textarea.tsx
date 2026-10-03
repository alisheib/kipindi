"use client";

/**
 * Textarea atom — the multi-line sibling of the Input atom. Matches the Input
 * shell (rounded-lg, sunken --bg-inset, brand focus ring, 16px text so iOS
 * doesn't zoom). Replaces 3 hand-rolled textareas that drifted on background
 * (overlay vs elevated), padding (p-3 vs px-3.5 py-2.5) and font size (14 vs 16).
 *
 * ⭐ IT HAS AN ERROR STATE NOW, AND IT DID NOT (vb6, 2026-10-03). A refused contact note or campaign body got no red
 * box at all: the Input painted its error and this sibling had no prop to paint one with, so the composer and the
 * markets wizard each hand-wrote a border class. `error` paints exactly what the Input paints — the danger border, the
 * `--danger-wash` fill and `aria-invalid` — and so do the Field's error and the caller's own `aria-invalid` (one fact,
 * DESIGN_AUTHORITY §A7). A string is NOT printed here: the message belongs to the Field, as it does for the Input.
 */
import * as React from "react";
import { cn } from "@/lib/utils";
import { claimsInvalid, joinIds, useFieldWiring } from "@/components/ui/input";

type Props = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  /** The error state, as the Input atom paints it. The message is the Field's (`<Field error>`), never printed here. */
  error?: boolean | string;
};

export const Textarea = React.forwardRef<HTMLTextAreaElement, Props>(function Textarea(
  { className, rows = 3, error, style, ...rest },
  ref,
) {
  const field = useFieldWiring();
  const errored = !!error || !!field?.invalid || claimsInvalid(rest["aria-invalid"]);
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "field-measure w-full rounded-lg border bg-bg-inset px-3.5 py-2.5 text-[16px] leading-relaxed text-text outline-none placeholder:text-text-subtle brand-focus transition-colors resize-none",
        errored ? "border-danger-500" : "border-border hover:border-border-strong",
        className,
      )}
      style={errored ? { ...style, background: "var(--danger-wash)" } : style}
      {...rest}
      /* ⛔ AFTER the spread, as in the Input: each merges the caller's own value with its Field's, and a caller's own
         name (`aria-label` / `aria-labelledby`) always wins over the legend. */
      aria-labelledby={rest["aria-labelledby"] ?? (rest["aria-label"] ? undefined : field?.labelledBy)}
      aria-describedby={joinIds(rest["aria-describedby"], field?.describedBy)}
      aria-required={rest["aria-required"] ?? (field?.required ? true : undefined)}
      aria-invalid={errored || undefined}
    />
  );
});
