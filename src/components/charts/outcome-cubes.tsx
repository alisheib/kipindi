/**
 * OutcomeCubes — the Up & Down heartbeat strip: one 18px cube per recent round
 * outcome, oldest → newest, real outcomes only (the board passes nothing else —
 * A-5). UP wears the yes family, DOWN the no family, VOID stays neutral —
 * §B12's direction ink, in the same tints the strip has always worn, now
 * derived from the tokens instead of four hand-typed `oklch()` literals that
 * had drifted 2 hue degrees from the palette they imitated.
 *
 * Lived inline in `updown/page.tsx` until the chart system got its one home
 * (CHART-SPRINT B); it is one half of the board's cubes ↔ chart toggle.
 * Hook-free, server-rendered.
 */
import { I } from "@/components/ui/glyphs";

export type CubeOutcome = "UP" | "DOWN" | "VOID";

const CUBE_STYLE: Record<CubeOutcome, React.CSSProperties> = {
  UP: {
    background: "color-mix(in oklab, var(--yes-500) 22%, transparent)",
    border: "1px solid color-mix(in oklab, var(--yes-400) 50%, transparent)",
    color: "var(--yes-300)",
  },
  DOWN: {
    background: "color-mix(in oklab, var(--no-500) 22%, transparent)",
    border: "1px solid color-mix(in oklab, var(--no-400) 50%, transparent)",
    color: "var(--no-300)",
  },
  VOID: {
    background: "transparent",
    border: "1px solid var(--border)",
    color: "var(--text-faint)",
  },
};

export function OutcomeCubes({
  outcomes,
  labels,
}: {
  /** Oldest → newest, real outcomes only. */
  outcomes: CubeOutcome[];
  labels: { up: string; down: string; void: string; oldestNewest: string };
}) {
  if (outcomes.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="flex gap-1">
        {outcomes.map((o, i) => (
          <span
            key={i}
            aria-label={o === "UP" ? labels.up : o === "DOWN" ? labels.down : labels.void}
            className="inline-flex items-center justify-center rounded-sm"
            style={{ width: 18, height: 18, ...CUBE_STYLE[o] }}
          >
            {/* The side that won, as its arrow, and a voided round as the void sign (PHOSPHOR-MIGRATION §8b) — a voided
                round drew a → before. */}
            {o === "UP" ? <I.arrowUp s={9} /> : o === "DOWN" ? <I.arrowDown s={9} /> : <I.void s={9} />}
          </span>
        ))}
      </span>
      <span className="text-body-sm text-text-muted">{labels.oldestNewest}</span>
    </div>
  );
}
