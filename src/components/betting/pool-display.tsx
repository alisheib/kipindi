import { CountUp } from "@/components/ui/count-up";
import { Pattern } from "@/components/ui/pattern";
import { PoolPulseRing } from "./pool-pulse-ring";
import { cn, formatTzs } from "@/lib/utils";

export function PoolDisplay({
  pool,
  className,
  momentum = 0,
  active = false,
}: {
  pool: number;
  className?: string;
  momentum?: number;
  active?: boolean;
}) {
  const intensity = Math.min(1, Math.abs(momentum) / 100);
  const stakes = Math.max(8, Math.floor(pool / 250));

  return (
    <div className={cn("relative", className)}>
      <PoolPulseRing intensity={Math.max(0.55, intensity)} active={active} className="rounded-2xl">
        <div className="relative px-7 py-5 lg:px-9 lg:py-6 rounded-2xl bg-bg-elevated border border-border overflow-hidden">
          <Pattern kind="sokoni" opacity={0.04} color="var(--gold)" />
          <div className="relative z-10 flex flex-col items-center gap-1">
            <span className="text-caption uppercase tracking-[0.18em] text-text-tertiary font-medium">
              Pool · Bwawa
            </span>
            <span className="font-display font-bold text-display-2 lg:text-display-1 tabular leading-none text-text">
              <span className="text-gold">TZS </span>
              <CountUp value={pool} format="number" durationMs={1400} />
            </span>
            <span className="text-caption text-text-secondary tabular pt-0.5">
              across <span className="font-semibold text-text">{stakes.toLocaleString()}</span> stakes
            </span>
          </div>
        </div>
      </PoolPulseRing>
      <div className="sr-only" aria-live="polite">{formatTzs(pool)}</div>
    </div>
  );
}
