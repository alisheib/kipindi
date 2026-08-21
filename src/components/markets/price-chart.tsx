/**
 * VolumeSparkline — inline density bars. One consumer: the /leaderboard row's
 * "recent activity" column.
 *
 * ⚠️ The file is named price-chart.tsx because `PriceChart` used to live here.
 * It was DELETED (2026-08-21): it had zero import sites, its header claimed to be
 * "the primary market viz on /markets/[id]" — which is `ProbabilityChart` via
 * `ChartToggle`, and has been for a long time — and its line gradient faded to
 * `oklch(58% 0.14 215)`, the BANNED teal-215 kit hue. Unmounted code carrying a
 * banned recipe is one import away from putting teal on a money page.
 * Do not restore it; extend `probability-chart.tsx` instead.
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
