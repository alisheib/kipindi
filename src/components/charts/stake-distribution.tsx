import { cn } from "@/lib/utils";

export function StakeDistribution({
  home,
  draw,
  away,
  homeLabel = "Home",
  awayLabel = "Away",
  className,
}: {
  home: number;
  draw: number;
  away: number;
  homeLabel?: string;
  awayLabel?: string;
  className?: string;
}) {
  const total = home + draw + away || 1;
  const hp = (home / total) * 100;
  const dp = (draw / total) * 100;
  const ap = (away / total) * 100;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between text-micro uppercase tracking-wide text-text-tertiary font-medium">
        <span>Stake distribution · Mgawanyo</span>
        <span className="tabular">{Math.round(total / 1000)}K stakes</span>
      </div>
      <div className="flex h-2 rounded-pill overflow-hidden bg-bg-sunken/60">
        <div className="h-full transition-all duration-medium ease-decelerate" style={{ width: `${hp}%`, background: "var(--royal)" }} />
        <div className="h-full transition-all duration-medium ease-decelerate" style={{ width: `${dp}%`, background: "var(--warning)" }} />
        <div className="h-full transition-all duration-medium ease-decelerate" style={{ width: `${ap}%`, background: "var(--gold)" }} />
      </div>
      <div className="grid grid-cols-3 gap-2 text-caption">
        <Legend color="var(--royal)" label={homeLabel} pct={hp} />
        <Legend color="var(--warning)" label="Draw" pct={dp} />
        <Legend color="var(--gold)" label={awayLabel} pct={ap} />
      </div>
    </div>
  );
}

function Legend({ color, label, pct }: { color: string; label: string; pct: number }) {
  return (
    <div className="flex items-center gap-1 min-w-0">
      <span aria-hidden className="h-2 w-2 rounded-pill shrink-0" style={{ background: color }} />
      <span className="text-text-secondary truncate">{label}</span>
      <span className="text-text font-bold tabular ml-auto">{pct.toFixed(0)}%</span>
    </div>
  );
}
