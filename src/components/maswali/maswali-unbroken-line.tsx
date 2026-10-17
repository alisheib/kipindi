import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * THE TWO LINES MILLIONEA DRAWS (MASWALI-BUILD S5; MASWALI-PLAN §10 §4, M5 and M6) — both on the platform's dormant
 * `.m-draw` (motion.css, `--t-max` on `--m-glide`), adopted here; no new motion.
 *
 *   M5 · THE UNBROKEN LINE — one hairline through the centres of the ten sockets, in the success ink, drawn ONLY when
 *        all ten graded questions matched. A line is never drawn partial, so a loss never shows one (§M8a item 10).
 *   M6 · THE CLOSING RULE — two hairlines under a settled receipt's last line, the second a beat (`--t-quick`) behind;
 *        the same timing for every outcome, so a win and a loss close alike.
 *
 * ⭐ AT REST BY DEFAULT. A line is drawn, finished, unless `draw` asks it to draw on — and that is the composer's call
 * from the seen state ("each fact performs once, for its owner, then rests"). Under both clamps the draw's own duration
 * is zeroed, so the line is simply there. ⛔ Not an icon: a line drawing, listed in `test:glyph-source`'s ratchet with
 * its reason (the family draws icons; this draws a rule).
 */
function Hairline({ draw, behind }: { draw?: boolean; behind?: boolean }) {
  return (
    <svg width="100%" height="1" viewBox="0 0 100 1" preserveAspectRatio="none" aria-hidden className="block overflow-visible">
      <path
        d="M0 0.5H100"
        fill="none"
        stroke="currentColor"
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
        pathLength={100}
        className={draw ? "m-draw" : undefined}
        style={draw ? { strokeDasharray: 100, strokeDashoffset: 100, ...(behind ? { animationDelay: "var(--t-quick)" } : null) } : undefined}
      />
    </svg>
  );
}

/** M5 — laid across a row of sockets by its caller (`style` places it through their centres). */
export function MaswaliUnbrokenLine({ draw, className, style }: { draw?: boolean; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden className={cn("pointer-events-none absolute block text-success-fg", className)} style={style}>
      <Hairline draw={draw} />
    </span>
  );
}

/** M6 — the closing double rule, in the strong border's ink. */
export function MaswaliClosingRule({ draw, className }: { draw?: boolean; className?: string }) {
  return (
    <div aria-hidden className={cn("flex flex-col gap-0.5 pt-1.5", className)} style={{ color: "var(--border-strong)" }}>
      <Hairline draw={draw} />
      <Hairline draw={draw} behind />
    </div>
  );
}
