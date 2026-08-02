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

/* kit50.jsx Chip — [fg, bg, border].
 *
 * DOCUMENTED VARIANT SET (grouped by hue). Several variant NAMES are visually
 * identical but kept distinct because they carry different call-site intent —
 * they share ONE style object below so the pair can never drift apart:
 *   • slate  — neutral (default) · cat (category tag)
 *   • green  — yes (betting YES) · success (positive status)
 *   • royal  — brand (brand accent) · active (enabled/on state)
 *   • gilt   — gold (earned/emphasis) · objection (objection window)
 * Distinct one-offs: no, live, resolved, pending, paused, claret, warning,
 * danger, info. (`pending`/`info` are royal-adjacent but intentionally differ
 * in alpha/hue, so they are NOT merged.) Collapsing the semantic pairs at call
 * sites is a separate design decision — pending Ali's sign-off. */
const SLATE: React.CSSProperties = { background: "oklch(34% 0.09 268 / 0.5)",  color: "var(--text-muted)", borderColor: "var(--border)" };
const GREEN: React.CSSProperties = { background: "oklch(52% 0.15 150 / 0.22)", color: "var(--yes-300)",    borderColor: "oklch(61% 0.16 150 / 0.5)" };
const ROYAL: React.CSSProperties = { background: "oklch(54% 0.165 262 / 0.20)", color: "var(--brand-300)", borderColor: "oklch(63% 0.18 262 / 0.45)" };
const GILT:  React.CSSProperties = { background: "oklch(72% 0.13 80 / 0.22)",  color: "var(--gold-300)",   borderColor: "oklch(80% 0.13 80 / 0.5)" };

const variantStyle: Record<Variant, React.CSSProperties> = {
  neutral:   SLATE,
  cat:       SLATE,
  yes:       GREEN,
  success:   GREEN,
  brand:     ROYAL,
  active:    ROYAL,
  gold:      GILT,
  objection: GILT,
  no:        { background: "oklch(50% 0.19 25 / 0.22)",                    color: "var(--no-300)",      borderColor: "oklch(58% 0.2 25 / 0.5)" },
  live:      { background: "oklch(55% 0.20 25 / 0.30)",                    color: "oklch(96% 0.04 25)", borderColor: "oklch(62% 0.20 25 / 0.6)" },
  resolved:  { background: "linear-gradient(180deg, var(--gold-300), var(--gold-500))", color: "oklch(24% 0.06 80)", borderColor: "oklch(60% 0.10 78)" },
  pending:   { background: "oklch(54% 0.165 262 / 0.26)",                  color: "var(--brand-300)",   borderColor: "oklch(63% 0.18 262 / 0.55)" },
  paused:    { background: "oklch(72% 0.13 80 / 0.18)",                    color: "oklch(82% 0.16 80)", borderColor: "oklch(80% 0.13 80 / 0.4)" },
  claret:    { background: "var(--claret-soft)",                            color: "var(--claret-200)",  borderColor: "var(--claret-edge)" },
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
  const { height, ...szRest } = isStatus(variant) ? sizeStyles[size].status : sizeStyles[size].base;
  return (
    <span
      className={cn(
        // ⛔ G-7 — `max-w-full` is load-bearing, not decoration. Without it the chip lays
        //    out at max-content and is simply drawn OUTSIDE its column.
        "inline-flex items-center gap-1 rounded-pill font-bold border uppercase max-w-full",
        selected && "ring-1 ring-[var(--brand-400)] ring-offset-1 ring-offset-bg-elevated",
        className,
      )}
      style={{
        ...szRest,
        // ⭐ G-7 (live QA campaign, measured on production 2026-08-02).
        //
        // This used to be a fixed `height` plus `whitespace-nowrap`. Both are right for a
        // short status pill and both are wrong for a phrase: the chip could neither wrap
        // nor grow, so a long label was drawn outside its container with NO ellipsis and
        // no overflow anywhere for a document-level check to notice.
        //
        // Reproduced on live production by giving a REAL chip a real call site's label:
        // "Sportradar + GBT integrity unit" rendered **206x18 inside a 198px column — 8px
        // outside it**. A survey could not have found it: session 9 had already patched
        // the one known offender AT ITS CALL SITE, so all 84 live chips measured clean
        // while the shared component stayed broken for the next long label.
        //
        // `minHeight` + `height: auto` is a NO-OP for every one-line chip — a one-line
        // chip's content box is shorter than the min, so it renders at exactly the same
        // height it always did (verified: all 84 measured chips unchanged at 18px). What
        // changes is only the case that was previously broken: the label now wraps and
        // the pill grows to fit it.
        //
        // ⚠️ `lineHeight` must leave 1 for the one-line case or every existing chip
        // shifts; the padding below only applies once the text actually wraps, which is
        // why it is expressed as `paddingBlock` rather than a taller box.
        minHeight: height,
        height: "auto",
        paddingBlock: 2,
        whiteSpace: "normal",
        fontFamily: "var(--font-body)",
        fontWeight: 700,
        letterSpacing: "0.06em",
        lineHeight: 1.15,
        ...variantStyle[variant],
        ...style,
      }}
      {...rest}
    >
      {dot && <span className="live-dot shrink-0" style={{ width: 6, height: 6 }} />}
      {children}
    </span>
  );
}
