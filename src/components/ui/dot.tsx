import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Dot — the status pip.
 *
 * ⭐ CONSOLIDATION NOTE (stage 9, 2026-08-21). More than a dozen hand-rolled
 * copies of `<span className="h-1.5 w-1.5 rounded-pill" style={{ background: … }} />`
 * across admin and player surfaces, in two spellings (`rounded-pill` and
 * `rounded-full`), two sizes (1.5 and 2 on the overridden spacing scale = 6px and
 * 12px) and one that reached for `rounded-full` on a 6px box where `rounded-pill`
 * was the sibling line's answer.
 *
 * 🔴 THE ONE THAT MATTERS IS THE PULSE. Several copies animated with Tailwind's
 * `animate-pulse` — and `animate-pulse` is NOT in globals.css's
 * `[data-motion="reduced"]` list. The OS-level `prefers-reduced-motion` clamp and
 * the in-app switch both catch it through the blanket `*` rule, but the app's own
 * "reduced" motion TIER does not: a player who chose Reduce motion in the product
 * still got a blinking dot. `pulse` here rides `.live-dot`, which is gated at all
 * three (globals.css `[data-motion="reduced"] .live-dot`), so the primitive is
 * correct by construction and no call site has to remember.
 *
 * ⚠️ `.live-dot` hard-codes `--live-400` and 6px; both are overridden inline here,
 * which wins on specificity. What is INHERITED and wanted is the cadence: the
 * kit's 2600ms `m-breathe`, deliberately calmer than a blink — on a real-money
 * board a hard blink reads as an alarm, not as "this is live".
 */

export type DotTone =
  | "live" | "yes" | "no" | "warning" | "brand" | "aqua" | "gold" | "claret" | "neutral";

const TONE: Record<DotTone, string> = {
  live:    "var(--live-400)",
  yes:     "var(--yes-400)",
  no:      "var(--no-400)",
  warning: "var(--warning-500)",
  brand:   "var(--brand-400)",
  aqua:    "var(--aqua-400)",
  gold:    "var(--gold-500)",
  claret:  "var(--claret-200)",
  neutral: "var(--text-subtle)",
};

export function Dot({
  tone = "neutral",
  color,
  size = 6,
  pulse,
  className,
  style,
  ...rest
}: Omit<React.HTMLAttributes<HTMLSpanElement>, "color"> & {
  tone?: DotTone;
  /** Raw colour, for a dot whose hue is data (a chart series, a status mix). Wins over `tone`. */
  color?: string;
  /** Edge in px. 6 is the pip; 8 is the list bullet. */
  size?: number;
  /**
   * Breathe. ⛔ Never reach for `animate-pulse` instead — see the header: it
   * escapes the app's own reduced-motion tier.
   */
  pulse?: boolean;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      {...rest}
      className={cn("inline-block shrink-0 rounded-pill", pulse && "live-dot", className)}
      style={{ width: size, height: size, background: color ?? TONE[tone], ...style }}
    />
  );
}
