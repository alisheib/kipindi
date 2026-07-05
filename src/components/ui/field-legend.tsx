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
      className={cn(
        "font-mono text-[10px] uppercase tracking-[0.16em] font-bold text-text-muted",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}
