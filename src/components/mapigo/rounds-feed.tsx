import { cn, formatTzs, formatTzsCompact } from "@/lib/utils";
import { OutcomePill } from "./outcome-pill";
import type { MapigoRound } from "@/lib/mapigo-data";

export function RoundsFeed({ rounds, className }: { rounds: MapigoRound[]; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-surface/80 overflow-hidden", className)}>
      <div className="flex items-center justify-between h-9 px-3 border-b border-border-divider">
        <p className="font-display text-caption font-bold uppercase tracking-[0.16em] text-text">Recent rounds</p>
        <p className="text-micro text-text-tertiary uppercase tracking-[0.14em]">Last {rounds.length}</p>
      </div>
      <div className="divide-y divide-border-subtle">
        {rounds.map((r) => {
          const won = r.yourCall === r.result;
          const youAmount = won && r.yourReturn ? `+${formatTzsCompact(r.yourReturn)}` : r.yourStake ? `−${formatTzsCompact(r.yourStake)}` : null;
          return (
            <div key={r.id} className="grid grid-cols-[28px_auto_1fr_auto] items-center gap-2 px-3 py-2">
              <span className="font-mono text-micro text-text-tertiary tabular">#{r.number}</span>
              <OutcomePill call={r.result} size="sm" />
              <span className="text-caption tabular text-text-secondary truncate">{formatTzsCompact(r.pool)}</span>
              <div className="flex items-center gap-2 shrink-0">
                {youAmount && (
                  <span className={cn("font-mono text-micro tabular", won ? "text-gold" : "text-text-tertiary")}>{youAmount}</span>
                )}
                <span className="font-mono text-micro text-text-tertiary tabular">{r.endedAt}s</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
