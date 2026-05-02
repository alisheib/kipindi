import { cn } from "@/lib/utils";

export function MomentumBar({ momentum, className }: { momentum: number; className?: string }) {
  const homePct = Math.max(8, Math.min(92, 50 - momentum / 2));
  const awayPct = 100 - homePct;
  return (
    <div
      className={cn("relative h-2 w-full rounded-pill bg-bg-sunken/60 overflow-hidden", className)}
      role="img"
      aria-label={`Momentum: home ${homePct.toFixed(0)}%, away ${awayPct.toFixed(0)}%`}
    >
      <div
        className="absolute inset-y-0 left-0 transition-[width] duration-long ease-decelerate"
        style={{
          width: `${homePct}%`,
          background: "linear-gradient(90deg, var(--royal) 0%, var(--royal-hover) 100%)",
        }}
      />
      <div
        className="absolute inset-y-0 right-0 transition-[width] duration-long ease-decelerate"
        style={{
          width: `${awayPct}%`,
          background: "linear-gradient(270deg, var(--gold) 0%, var(--gold-hover) 100%)",
        }}
      />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-bg-elevated/80" />
      {[20, 40, 60, 80].map((pct) => (
        <div key={pct} className="absolute top-0 bottom-0 w-px bg-white/15" style={{ left: `${pct}%` }} />
      ))}
    </div>
  );
}
