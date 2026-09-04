/**
 * VolumeSparkline — inline density bars. One consumer: the /leaderboard row's
 * "recent activity" column. Aqua on purpose: volume is ACTIVITY, not direction
 * — the micro/full colour law in `micro-spark.tsx`. Bars rather than a line
 * because per-day staking is bucketed, not continuous.
 *
 * ⚠️ This file was `markets/price-chart.tsx` until the chart system got its
 * one home (2026-09-04). The `PriceChart` that named it was DELETED 2026-08-21:
 * zero import sites and a gradient fading to the BANNED teal-215 hue —
 * unmounted code carrying a banned recipe is one import away from a money
 * page. Do not restore it; extend `probability-chart.tsx` instead.
 */

/** VolumeSparkline — kit port for inline density bars. */
export function VolumeSparkline({ data, width = 220, height = 38, className, ariaLabel = "Volume sparkline" }: { data: number[]; width?: number; height?: number; className?: string; ariaLabel?: string }) {
  if (data.length === 0) return null;
  // `, 1` floor keeps an all-zero series from dividing by zero (→ NaN heights /
  // opacities → invisible/broken bars). With max=1 a flat-zero series renders as
  // a clean empty baseline instead.
  const max = Math.max(...data, 1);
  const barW = (width - data.length * 2) / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={className} aria-label={ariaLabel}>
      {data.map((v, i) => {
        const h = (v / max) * (height - 4);
        return (
          <rect key={i} x={i * (barW + 2)} y={height - h - 2} width={barW} height={h} rx="1" fill="var(--aqua-300)" opacity={0.35 + 0.65 * (v / max)} />
        );
      })}
    </svg>
  );
}
