import type { ReactNode, ElementType } from "react";
import { cn } from "@/lib/utils";

/**
 * FieldLegend — the canonical form field-label / fieldset-legend eyebrow.
 * One source for the mono uppercase label so it stops drifting on color
 * (text-subtle vs text-muted) and tracking (0.14 vs 0.16). Matches the
 * <Field> atom's label. Margin is left to the caller (mb-1.5 / mb-2) via
 * className so it can drop into existing markup without shifting layout.
 */
export function FieldLegend({
  as: Tag = "span",
  className,
  children,
  ...rest
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
} & Record<string, unknown>) {
  return (
    <Tag
      /* ⭐ DG-A-11 · `text-micro`, not `text-[10px]` — the CANONICAL eyebrow is now on the
         ladder, which is where a sweep asking 200 call sites to adopt it has to start.
         DESIGN_AUTHORITY §T7 settled which rung: `text-micro` IS 10px in the Tailwind ladder
         (the only one a call site can reach), so the register's "+1px on 254 labels" was asked
         of the CSS ladder and is not paid here. Pixel-identical.
         ⚠️ The rung emits `letter-spacing: 0.4px` of its own, and `tracking-[0.16em]` (1.6px
         at 10px) overrides it — every `.tracking-*` rule is emitted after every fontSize rung
         in the served sheet (bytes 52,048-52,952 vs a last rung at 51,022), so at equal
         (0,1,0) the tracking wins on source order. Measured, not assumed: `qa:dg-type`'s
         eyebrow bench renders this exact recipe and reports ls 1.4-1.68px, never 0.4. */
      className={cn(
        "font-mono text-micro uppercase eyebrow font-bold text-text-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
