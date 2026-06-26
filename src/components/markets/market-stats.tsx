/**
 * MarketStats — kit-faithful 3-column stats grid (kit/microstructure.jsx).
 * Each cell: caption label · large mono value · tone-coloured delta.
 *
 * tone: yes (gold + emerald) · no (rose) · live (warning amber) · neutral
 */
import { cn } from "@/lib/utils";

type Tone = "yes" | "no" | "live" | "neutral";

export type Stat = {
  k: string;            // label
  v: string;            // value (mono)
  unit?: string;        // unit suffix (TZS / ¢ / etc.)
  delta?: string;       // delta line — small + tone-coloured
  tone?: Tone;
};

const toneClass: Record<Tone, string> = {
  yes:     "text-yes-300",
  no:      "text-no-300",
  live:    "text-warning-fg",
  neutral: "text-text-muted",
};

export function MarketStats({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div
      className={cn(
        "grid gap-2.5",
        stats.length <= 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3",
        className,
      )}
    >
      {stats.map((s) => (
        <div
          key={s.k}
          className="rounded-md border border-border bg-bg-elevated px-3.5 py-3"
        >
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] font-bold text-text-subtle mb-1.5">
            {s.k}
          </p>
          <p className="flex items-baseline gap-1">
            <span className="font-mono text-[18px] font-bold tabular-nums text-text" style={{ letterSpacing: "-0.02em" }}>
              {s.v}
            </span>
            {s.unit && (
              <span className="font-mono text-[10px] text-text-muted">{s.unit}</span>
            )}
          </p>
          {s.delta && (
            <p className={cn("mt-1 font-mono text-[10px] font-semibold", toneClass[s.tone ?? "neutral"])}>
              {s.delta}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
