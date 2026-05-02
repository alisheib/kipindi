import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "neutral" | "brand" | "gold" | "success" | "warning" | "danger" | "info";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  neutral: "bg-bg-sunken/60 text-text-secondary border-border-subtle/80",
  brand:   "bg-royal-subtle/60 text-royal border-royal-subtleHover/40",
  gold:    "bg-gold-subtle/60 text-gold border-gold-subtleHover/40",
  success: "bg-success-bg/40 text-success border-success/25",
  warning: "bg-warning-bg/40 text-warning border-warning/25",
  danger:  "bg-danger-bg/40 text-danger border-danger/25",
  info:    "bg-info-bg/40 text-info border-info/25",
};

const sizeClass: Record<Size, string> = {
  sm: "h-5 px-1.5 text-micro",
  md: "h-6 px-2 text-caption",
  lg: "h-7 px-2.5 text-label",
};

export function Chip({
  variant = "neutral",
  size = "md",
  selected,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  size?: Size;
  selected?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-sm font-bold tracking-wide whitespace-nowrap border transition-colors duration-micro",
        sizeClass[size],
        variantClass[variant],
        selected && "ring-1 ring-[var(--gold)] ring-offset-1 ring-offset-bg-elevated",
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
