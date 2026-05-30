/**
 * Chip — kit-faithful (kit/atoms.jsx → Chip + tokens.css .chip-*).
 * Pill-shaped, optional pulsing live-dot, theme-adaptive via colour-mix tokens.
 *
 * variants: neutral · yes · no · live · resolved · pending · objection
 *           + legacy aliases: brand → primary tint, gold → resolved, success
 *           → yes, warning → objection, danger → live, info → pending.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "neutral"
  | "yes"
  | "no"
  | "live"
  | "resolved"
  | "pending"
  | "objection"
  // Program-status variants (affiliate): indigo chrome / amber paused —
  // deliberately NOT betting-green, per the brand guide.
  | "active"
  | "paused"
  // Legacy aliases — kept so existing call sites keep rendering.
  | "brand"
  | "gold"
  | "success"
  | "warning"
  | "danger"
  | "info";

type Size = "sm" | "md" | "lg";

const variantStyle: Record<Variant, React.CSSProperties> = {
  neutral:   { background: "var(--bg-elevated)",                                                                           color: "var(--text-muted)",                  borderColor: "var(--border)" },
  yes:       { background: "color-mix(in oklab, var(--yes-500) 16%, transparent)",                                         color: "var(--yes-300)",                     borderColor: "color-mix(in oklab, var(--yes-500) 28%, transparent)" },
  no:        { background: "color-mix(in oklab, var(--no-500) 16%, transparent)",                                          color: "var(--no-300)",                      borderColor: "color-mix(in oklab, var(--no-500) 28%, transparent)" },
  live:      { background: "color-mix(in oklab, var(--danger-500) 16%, transparent)",                                      color: "oklch(80% 0.18 25)",                 borderColor: "color-mix(in oklab, var(--danger-500) 28%, transparent)" },
  resolved:  { background: "color-mix(in oklab, var(--gold-500) 18%, transparent)",                                        color: "var(--gold-300)",                    borderColor: "color-mix(in oklab, var(--gold-500) 32%, transparent)" },
  pending:   { background: "color-mix(in oklab, var(--info-500) 16%, transparent)",                                        color: "oklch(78% 0.13 240)",                borderColor: "color-mix(in oklab, var(--info-500) 28%, transparent)" },
  objection: { background: "color-mix(in oklab, var(--warning-500) 18%, transparent)",                                     color: "oklch(82% 0.16 80)",                 borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)" },
  active:    { background: "color-mix(in oklab, var(--royal-500) 20%, transparent)",                                       color: "var(--royal-200)",                   borderColor: "color-mix(in oklab, var(--royal-500) 38%, transparent)" },
  paused:    { background: "color-mix(in oklab, var(--warning-500) 18%, transparent)",                                     color: "oklch(82% 0.16 80)",                 borderColor: "color-mix(in oklab, var(--warning-500) 32%, transparent)" },
  // legacy
  brand:     { background: "color-mix(in oklab, var(--teal-500) 18%, transparent)",                                        color: "var(--teal-300)",                    borderColor: "color-mix(in oklab, var(--teal-500) 30%, transparent)" },
  gold:      { background: "color-mix(in oklab, var(--gold-500) 18%, transparent)",                                        color: "var(--gold-300)",                    borderColor: "color-mix(in oklab, var(--gold-500) 32%, transparent)" },
  success:   { background: "color-mix(in oklab, var(--yes-500) 16%, transparent)",                                         color: "var(--yes-300)",                     borderColor: "color-mix(in oklab, var(--yes-500) 28%, transparent)" },
  warning:   { background: "color-mix(in oklab, var(--warning-500) 18%, transparent)",                                     color: "oklch(82% 0.16 80)",                 borderColor: "color-mix(in oklab, var(--warning-500) 30%, transparent)" },
  danger:    { background: "color-mix(in oklab, var(--danger-500) 16%, transparent)",                                      color: "oklch(80% 0.18 25)",                 borderColor: "color-mix(in oklab, var(--danger-500) 28%, transparent)" },
  info:      { background: "color-mix(in oklab, var(--info-500) 16%, transparent)",                                        color: "oklch(78% 0.13 240)",                borderColor: "color-mix(in oklab, var(--info-500) 28%, transparent)" },
};

const sizeClass: Record<Size, string> = {
  sm: "h-5 px-2 text-[10px]",
  md: "h-6 px-2.5 text-[11px]",
  lg: "h-7 px-3 text-[12px]",
};

export function Chip({
  variant = "neutral",
  size = "md",
  selected,
  dot,
  className,
  children,
  style,
  ...rest
}: React.HTMLAttributes<HTMLSpanElement> & {
  variant?: Variant;
  size?: Size;
  selected?: boolean;
  /** Show a pulsing dot in front of the label — for live markets. */
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-pill font-semibold whitespace-nowrap border transition-colors",
        sizeClass[size],
        selected && "ring-1 ring-gold-400 ring-offset-1 ring-offset-bg-elevated",
        className,
      )}
      style={{ ...variantStyle[variant], ...style }}
      {...rest}
    >
      {dot && <span className="live-dot" style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}
