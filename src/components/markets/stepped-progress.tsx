/**
 * Multi-segment progress — ported from the 50pick kit.
 * Used on /admin/markets/new wizard, KYC, and any multi-step ops flow.
 *
 * ⭐ `groups` (MASWALI-BUILD S5; MASWALI-PLAN §10 §3.5, the Millionea slip's rail: "Kuu 7/10 · Akiba 2/5") — several runs of
 * segments side by side, each run as wide as its share of the steps, each segment filled once its step is DONE. It is a
 * count, not a position: there is no current step, so no sweep and no glow — the filled royal of `--royal-400`, the rest
 * the inset track, and nothing moving. Additive: `steps` + `current` draw exactly what they always drew.
 */
import { cn } from "@/lib/utils";

type Stepped = { steps: number; current: number; groups?: never };
type Grouped = { groups: ReadonlyArray<{ steps: number; done: number }>; steps?: never; current?: never };

export function SteppedProgress(props: (Stepped | Grouped) & { className?: string }) {
  if (props.groups) return <GroupedProgress groups={props.groups} className={props.className} />;
  const { steps, current, className } = props;
  return (
    <div className={cn("flex gap-1.5", className)}>
      {Array.from({ length: steps }).map((_, i) => (
        <div
          key={i}
          className={cn("flex-1 h-1 rounded-pill transition-colors", i === current && "prog-sweep")}
          style={{
            background: i < current ? "var(--royal-400)" : i === current ? "var(--royal-500)" : "var(--bg-overlay)",
            boxShadow: i === current ? "0 0 8px -1px color-mix(in oklab, var(--royal-400) 60%, transparent)" : "none",
            transition: "background var(--dur-quick) var(--ease-stage)",
          }}
        />
      ))}
    </div>
  );
}

/**
 * ⭐ HOLLOW IS "NOT YET", SOLID IS "DONE" (Ali 2026-10-21 10/10 pass; the slip critic's H1, measured WCAG 2.x on the tokens):
 * VIS-P's empty `--border-strong` and the done `--royal-400` were two saturated blues 1.97:1 apart, so a slip at 0/15 read
 * as full. An empty step is now the kit ProgressBar's own track — the sunken well (`--bg-sunken`) inside a 1px
 * `--border-control` ring, 3.31:1 on the rail's `--panel` (the 3:1 a non-text mark needs) — and a done step is solid
 * `--royal-400` (4.56:1 on the panel): the shape tells them apart, not only the shade. 6px tall, the bar's own rhythm, and a
 * step fills over the control's own beat (`--t-quick`, linear) — the pick's fill and its step land together. The count
 * beside the meter says the numbers in words; the meter is their picture. Only this branch: the `groups` meter is
 * Millionea's alone (its one caller, `maswali-slip.tsx`), the stepped one above draws what it always drew.
 */
function GroupedProgress({ groups, className }: { groups: ReadonlyArray<{ steps: number; done: number }>; className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-2", className)}>
      {groups.map((g, gi) => (
        <span key={gi} className="flex gap-0.5" style={{ flexGrow: g.steps, flexBasis: 0 }}>
          {Array.from({ length: g.steps }).map((_, i) => (
            <span key={i} data-done={i < g.done ? "" : undefined} className="h-[6px] flex-1 rounded-pill"
              style={i < g.done ? DONE_STEP : EMPTY_STEP} />
          ))}
        </span>
      ))}
    </div>
  );
}

const STEP_FILL = "background var(--t-quick) linear, box-shadow var(--t-quick) linear";
const DONE_STEP = { background: "var(--royal-400)", boxShadow: "inset 0 0 0 1px var(--royal-400)", transition: STEP_FILL } as const;
const EMPTY_STEP = { background: "var(--bg-sunken)", boxShadow: "inset 0 0 0 1px var(--border-control)", transition: STEP_FILL } as const;
