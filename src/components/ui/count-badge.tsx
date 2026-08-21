import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * CountBadge — the numeric pip that rides an icon or a nav row.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). Four implementations, no two alike,
 * and one of them could print a number wider than the control it sat on:
 *
 *   notifications bell  18px pill · rose gradient · 2px ring · mono 10/700 · NO CAP
 *   chat bubble pip     20px pill · pearl        · 2px ring · mono 11/600 · capped 99+
 *   admin sidebar       inline    · brand-500    · radius 4 · mono micro   · no cap
 *   admin mobile drawer inline    · brand-500    · rounded-sm · mono micro · no cap
 *
 * 🔴 THE BELL HAD NO CAP. `unreadCount` is uncapped in the service, so a player
 * back from a fortnight away renders "1247" inside an 18px pip anchored 1px from
 * the top bar's right edge. The cap is not decoration; it is the reason a shared
 * primitive exists. It is applied HERE so no caller can forget it.
 *
 * ⚠️ TWO RENDERED CHANGES the migration will carry, both deliberate:
 *  • The admin pair loses its 4px corner. B10.2 puts pills on `--r-pill` and names
 *    a 4px one-off as a second definition site; `radius: 4` and `rounded-sm` were
 *    two spellings of the same off-scale value anyway.
 *  • The chat pip's weight moves 600 → 700, joining the bell. One chrome means one
 *    weight; 700 is the one the money-adjacent badge already used.
 *  Everything else — sizes, tones, rings — is carried as a PROP, not flattened.
 */

export type CountBadgeTone = "rose" | "brand" | "pearl";
export type CountBadgeSize = "sm" | "md" | "lg";

const TONE: Record<CountBadgeTone, React.CSSProperties> = {
  // The bell. A gradient, not a flat fill — it sits on the top bar's glass and a
  // flat rose disappears into it at the bottom edge.
  rose:  { background: "linear-gradient(180deg, var(--no-400), var(--no-600))", color: "var(--pearl-50)" },
  // The admin nav counter — work waiting on an officer, which is chrome, never money.
  brand: { background: "var(--brand-500)", color: "var(--pearl-50)" },
  // The chat bubble's inverse pip: pearl on the chat canvas.
  pearl: { background: "var(--pearl)", color: "var(--chat-canvas)" },
};

const SIZE: Record<CountBadgeSize, { box: React.CSSProperties; font: number }> = {
  // Inline, inside a nav row — no fixed box, it grows with the row's line height.
  // 10px is `text-micro`'s size, which both admin badges already used; what is
  // NOT carried over is that class's 0.4px tracking. A tracked count is a count
  // whose digits do not line up between rows, and this box is tabular by design.
  sm: { box: { padding: "2px 8px" }, font: 10 },
  md: { box: { minWidth: 18, height: 18, padding: "0 4px" }, font: 10 },
  lg: { box: { minWidth: 20, height: 20, padding: "0 6px" }, font: 11 },
};

export function CountBadge({
  count,
  max = 99,
  tone = "rose",
  size = "md",
  ring,
  lift,
  className,
  style,
  ...rest
}: Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> & {
  /** Renders nothing at 0 or below — a badge that can't be counted simply doesn't render. */
  count: number;
  /** Above this, the badge reads `{max}+`. ⛔ Do not disable it; see the header. */
  max?: number;
  tone?: CountBadgeTone;
  size?: CountBadgeSize;
  /** The 2px cut-out that lifts an overlay pip off the icon behind it. */
  ring?: string;
  /**
   * Lift the pip off a busy surface. ⛔ A BOOLEAN, NOT A SHADOW STRING. It briefly took
   * the shadow itself, and `test:design-frozen` was right to fail that twice over: a prop
   * accepting a `boxShadow` puts a raw `oklch()` in the CALLER — the second definition
   * site this primitive exists to remove — and §M2 says a surface PICKS a rung rather
   * than composing one, which also rules out composing it inline in here. The shadow is
   * a class, keyed by tone, in `globals.css` (`.count-badge[data-lift]`).
   */
  lift?: boolean;
}) {
  if (!(count > 0)) return null;
  const sz = SIZE[size];
  return (
    <span
      {...rest}
      className={cn("count-badge inline-flex items-center justify-center rounded-pill font-mono tabular-nums", className)}
      data-lift={lift ? tone : undefined}
      style={{
        ...sz.box,
        fontSize: sz.font,
        fontWeight: 700,
        lineHeight: 1,
        ...TONE[tone],
        ...(ring ? { border: `2px solid ${ring}` } : null),
        ...style,
      }}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
}
