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

function GroupedProgress({ groups, className }: { groups: ReadonlyArray<{ steps: number; done: number }>; className?: string }) {
  return (
    <div aria-hidden className={cn("flex gap-2", className)}>
      {groups.map((g, gi) => (
        <span key={gi} className="flex gap-0.5" style={{ flexGrow: g.steps, flexBasis: 0 }}>
          {Array.from({ length: g.steps }).map((_, i) => (
            <span key={i} className="h-1 flex-1 rounded-pill" style={{ background: i < g.done ? "var(--royal-400)" : "var(--bg-inset)" }} />
          ))}
        </span>
      ))}
    </div>
  );
}
