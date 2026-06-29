/**
 * Chip — kit-faithful (kit50.jsx Chip).
 * Pill-shaped, height-based sizing, 700 weight, 0.06em tracking, uppercase.
 * Optional pulsing live-dot for live markets.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

type Variant =
  | "neutral" | "cat"
  | "yes" | "no"
  | "live" | "resolved" | "pending" | "objection"
  | "active" | "paused" | "claret"
  | "brand" | "gold" | "success" | "warning" | "danger" | "info";

type Size = "sm" | "md" | "lg";

/* kit50.jsx Chip — [fg, bg, border] */
const variantStyle: Record<Variant, React.CSSProperties> = {
  neutral:   { background: "oklch(34% 0.09 268 / 0.5)",                    color: "var(--text-muted)",  borderColor: "var(--border)" },
  cat:       { background: "oklch(34% 0.09 268 / 0.5)",                    color: "var(--text-muted)",  borderColor: "var(--border)" },
  yes:       { background: "oklch(52% 0.15 150 / 0.22)",                   color: "var(--yes-300)",     borderColor: "oklch(61% 0.16 150 / 0.5)" },
  no:        { background: "oklch(50% 0.19 25 / 0.22)",                    color: "var(--no-300)",      borderColor: "oklch(58% 0.2 25 / 0.5)" },
  live:      { background: "oklch(55% 0.20 25 / 0.30)",                    color: "oklch(96% 0.04 25)", borderColor: "oklch(62% 0.20 25 / 0.6)" },
  resolved:  { background: "linear-gradient(180deg, var(--gold-300), var(--gold-500))", color: "oklch(24% 0.06 80)", borderColor: "oklch(60% 0.10 78)" },
  pending:   { background: "oklch(54% 0.165 262 / 0.26)",                  color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.55)" },
  objection: { background: "oklch(72% 0.13 80 / 0.22)",                    color: "var(--gold-300)",    borderColor: "oklch(80% 0.13 80 / 0.5)" },
  active:    { background: "oklch(54% 0.165 262 / 0.20)",                  color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.45)" },
  paused:    { background: "oklch(72% 0.13 80 / 0.18)",                    color: "oklch(82% 0.16 80)", borderColor: "oklch(80% 0.13 80 / 0.4)" },
  claret:    { background: "var(--claret-soft)",                            color: "var(--claret-200)",  borderColor: "var(--claret-edge)" },
  brand:     { background: "oklch(54% 0.165 262 / 0.20)",                  color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.45)" },
  gold:      { background: "oklch(72% 0.13 80 / 0.22)",                    color: "var(--gold-300)",    borderColor: "oklch(80% 0.13 80 / 0.5)" },
  success:   { background: "oklch(52% 0.15 150 / 0.22)",                   color: "var(--yes-300)",     borderColor: "oklch(61% 0.16 150 / 0.5)" },
  warning:   { background: "oklch(72% 0.13 80 / 0.22)",                    color: "oklch(82% 0.16 80)", borderColor: "oklch(80% 0.13 80 / 0.5)" },
  danger:    { background: "oklch(55% 0.20 25 / 0.22)",                    color: "oklch(80% 0.18 25)", borderColor: "oklch(62% 0.20 25 / 0.5)" },
  info:      { background: "oklch(54% 0.165 262 / 0.22)",                  color: "oklch(78% 0.13 240)",borderColor: "oklch(63% 0.18 262 / 0.5)" },
};

/* Status chips (live/resolved/pending/hot) are slightly taller per kit */
const isStatus = (v: Variant) => v === "live" || v === "resolved" || v === "pending" || v === "objection";

const sizeStyles: Record<Size, { base: React.CSSProperties; status: React.CSSProperties }> = {
  sm: {
    base:   { height: 18, padding: "0 6px", fontSize: 9.5 },
    status: { height: 20, padding: "0 7px", fontSize: 10 },
  },
  md: {
    base:   { height: 21, padding: "0 8px", fontSize: 10.5 },
    status: { height: 23, padding: "0 9px", fontSize: 11 },
  },
  lg: {
    base:   { height: 25, padding: "0 10px", fontSize: 12 },
    status: { height: 27, padding: "0 11px", fontSize: 12.5 },
  },
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
  dot?: boolean;
}) {
  const sz = isStatus(variant) ? sizeStyles[size].status : sizeStyles[size].base;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill font-bold whitespace-nowrap border uppercase",
        selected && "ring-1 ring-[var(--brand-400)] ring-offset-1 ring-offset-bg-elevated",
        className,
      )}
      style={{
        ...sz,
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        letterSpacing: "0.06em",
        lineHeight: 1,
        ...variantStyle[variant],
        ...style,
      }}
      {...rest}
    >
      {dot && <span className="live-dot" style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}
