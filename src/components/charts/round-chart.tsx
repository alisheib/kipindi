/**
 * RoundChart — the Up & Down board's CHART view: the current round's price
 * action, compact (CHART-SPRINT B). One question, answered at a glance: am I
 * above or below the open, and how long is left.
 *
 * The same honest recipe as the detail page's `PriceHero` (the named system
 * member this imports `priceTagOffsetY` from — E-93's label collision
 * avoidance, ONE implementation): the open price as the gilt reference line,
 * the frozen winning boundaries dashed in direction ink, the CONFIRMED price
 * path emerald above the open / rose below, zones tinted the same way.
 *
 * ⚠️ REAL DATA OR NOTHING (A-5). `series` is confirmed oracle reads inside the
 * round window; when null we draw the two real endpoints we always have (open +
 * live), and when even the live price is unknown, the open line alone. Straight
 * segments on purpose — each vertex IS an observation (§B12.3); candles are
 * forbidden at this tick density and a smoothed curve would draw prices that
 * were never read.
 *
 * `countdown` is a slot — the page passes the kit `RoundCountdown`, so the
 * chart's clock is the same component, anchor and urgency rule as everywhere
 * else. Two clock languages on one product is how clocks disagree.
 *
 * Hook-free/server-safe; the breathing live dot is the kit's CSS `ud-point`
 * (reduced-motion handled in globals.css).
 */
import { priceTagOffsetY } from "@/components/updown/price-hero";
import { linePath } from "./chart-core";

export function RoundChart({
  openPrice,
  upTarget,
  downTarget,
  livePrice,
  series,
  decimals,
  copy,
  countdown,
}: {
  openPrice: number | null;
  upTarget?: number | null;
  downTarget?: number | null;
  livePrice: number | null;
  series: { t: string; price: number }[] | null;
  decimals: number;
  copy: {
    openLabel: string;
    upLabel?: string;
    downLabel?: string;
    awaitingRead: string;
    aboveBelow: string | null;
    source: string | null;
    chartAlt: string;
  };
  /** The kit RoundCountdown, composed by the page. */
  countdown?: React.ReactNode;
}) {
  const usd = (n: number | null) =>
    n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const hasPrice = livePrice != null;
  const isUp = hasPrice && openPrice != null ? livePrice! >= openPrice : true;
  const ink = isUp ? "var(--yes-300)" : "var(--no-300)";
  const move = hasPrice && openPrice != null ? livePrice! - openPrice : null;
  const movePct = move != null && openPrice ? (move / openPrice) * 100 : null;
  const sgn = (v: number) => (v >= 0 ? "+" : "−");

  // The real points to draw — series when ≥2, else open+live, else the open alone.
  const prices: number[] =
    series && series.length >= 2
      ? series.map((p) => p.price)
      : openPrice != null && livePrice != null
        ? [openPrice, livePrice]
        : openPrice != null
          ? [openPrice]
          : [];

  // Geometry — the hero's plot recipe at board height.
  const X0 = 0, X1 = 606, Y0 = 14, Y1 = 148;
  const anchor = openPrice ?? prices[0] ?? 0;
  const band = [upTarget, downTarget].filter((v): v is number => v != null);
  const lo = Math.min(anchor, ...prices, ...band);
  const hi = Math.max(anchor, ...prices, ...band);
  const pad = (hi - lo) * 0.35 || 1;
  const top = hi + pad, bot = lo - pad;
  const xAt = (i: number) => (prices.length <= 1 ? X0 : X0 + (i / (prices.length - 1)) * (X1 - X0));
  const yAt = (v: number) => Y0 + ((top - v) / (top - bot)) * (Y1 - Y0);
  const hasLine = prices.length >= 2;
  const line = hasLine ? linePath(prices.map((v, i) => [xAt(i), yAt(v)] as const)) : "";
  const openY = (openPrice != null ? yAt(openPrice) : yAt(anchor)).toFixed(1);
  const upY = upTarget != null ? yAt(upTarget).toFixed(1) : null;
  const downY = downTarget != null ? yAt(downTarget).toFixed(1) : null;
  const areaEdge = (yEdge: string) => line + " L " + X1.toFixed(1) + " " + yEdge + " L " + X0.toFixed(1) + " " + yEdge + " Z";
  const lastX = xAt(prices.length - 1).toFixed(1);
  const lastY = yAt(prices[prices.length - 1] ?? anchor).toFixed(1);
  const tagX = (parseFloat(lastX) - 10).toFixed(1);
  const tagY = (parseFloat(lastY) + priceTagOffsetY(
    parseFloat(lastY),
    [upY != null ? parseFloat(upY) - 4 : null, downY != null ? parseFloat(downY) + 11 : null],
    isUp,
  )).toFixed(1);

  return (
    <section
      aria-label={copy.chartAlt}
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", padding: "12px 14px 8px", minWidth: 0 }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          {hasPrice ? (
            <>
              <span className="font-mono font-bold tabular-nums" style={{ fontSize: 20, lineHeight: 1, letterSpacing: "-0.01em", color: ink }}>{usd(livePrice)}</span>
              {movePct != null && (
                <span className="font-mono font-semibold tabular-nums" style={{ fontSize: 11, color: ink }}>{sgn(movePct)}{Math.abs(movePct).toFixed(2)}%</span>
              )}
            </>
          ) : (
            <>
              <span className="font-mono font-bold" style={{ fontSize: 20, lineHeight: 1, color: "var(--text-faint)" }}>—</span>
              <span className="font-mono font-semibold uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "var(--text-faint)" }}>{copy.awaitingRead}</span>
            </>
          )}
        </div>
        {countdown}
      </div>

      <div style={{ marginTop: 10, position: "relative" }}>
        <svg viewBox="0 0 640 170" width="100%" style={{ display: "block", overflow: "visible" }} role="img" aria-label={copy.chartAlt}>
          <defs>
            <linearGradient id="udbUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--yes-400)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--yes-400)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="udbDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--no-400)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--no-400)" stopOpacity="0.26" />
            </linearGradient>
            <clipPath id="udbAbove"><rect x="0" y="0" width="640" height={openY} /></clipPath>
            <clipPath id="udbBelow"><rect x="0" y={openY} width="640" height="170" /></clipPath>
          </defs>

          {hasLine && (
            <>
              <g clipPath="url(#udbAbove)"><path d={areaEdge(openY)} fill="url(#udbUp)" /></g>
              <g clipPath="url(#udbBelow)"><path d={areaEdge(openY)} fill="url(#udbDown)" /></g>
            </>
          )}

          {/* The reference line the bet is measured against — gilt is §B12's reference ink. */}
          <line x1="0" y1={openY} x2="606" y2={openY} stroke="var(--gilt)" strokeWidth="1.25" strokeDasharray="3 4" opacity="0.75" />
          <text x="0" y={(parseFloat(openY) - 6).toFixed(1)} fill="var(--gilt)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" letterSpacing="0.12em" opacity="0.9">
            {copy.openLabel.toUpperCase()} {usd(openPrice)}
          </text>

          {upY && (
            <g>
              <line x1="0" y1={upY} x2="606" y2={upY} stroke="var(--yes-400)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
              <text x="606" y={(parseFloat(upY) - 4).toFixed(1)} textAnchor="end" fill="var(--yes-300)" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600" letterSpacing="0.10em" opacity="0.9">
                {(copy.upLabel ?? "UP").toUpperCase()} {usd(upTarget!)}
              </text>
            </g>
          )}
          {downY && (
            <g>
              <line x1="0" y1={downY} x2="606" y2={downY} stroke="var(--no-400)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
              <text x="606" y={(parseFloat(downY) + 11).toFixed(1)} textAnchor="end" fill="var(--no-300)" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600" letterSpacing="0.10em" opacity="0.9">
                {(copy.downLabel ?? "DOWN").toUpperCase()} {usd(downTarget!)}
              </text>
            </g>
          )}

          {hasLine && <path d={line} fill="none" stroke={ink} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />}

          {hasPrice && hasLine && (
            <g>
              <circle className="ud-point" cx={lastX} cy={lastY} r="7" fill={ink} opacity="0.22" />
              <circle cx={lastX} cy={lastY} r="3.6" fill={ink} />
              <text x={tagX} y={tagY} textAnchor="end" fill={ink} fontFamily="var(--font-mono)" fontSize="11" fontWeight="700">{usd(livePrice)}</text>
            </g>
          )}
        </svg>
      </div>

      <p style={{ margin: "6px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }} className="font-mono text-[9.5px] text-text-faint">
        <span>{copy.aboveBelow ?? " "}</span>
        {copy.source && <span>{copy.source}</span>}
      </p>
    </section>
  );
}
