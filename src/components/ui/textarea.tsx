"use client";

/**
 * Textarea atom — the multi-line sibling of the Input atom. Matches the Input
 * shell (rounded-lg, sunken --bg-inset, brand focus ring, 16px text so iOS
 * doesn't zoom). Replaces 3 hand-rolled textareas that drifted on background
 * (overlay vs elevated), padding (p-3 vs px-3.5 py-2.5) and font size (14 vs 16).
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full rounded-lg border border-border bg-bg-inset px-3.5 py-2.5 text-[16px] leading-relaxed text-text outline-none placeholder:text-text-subtle brand-focus hover:border-border-strong transition-colors resize-none",
        className,
      )}
      {...rest}
    />
  );
});
