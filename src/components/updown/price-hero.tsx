/**
 * UpDown D3 — the price hero.
 *
 * The reference line the bet is measured against (the open price, gilt + dashed) with
 * the real price path drawn against it: emerald tint + line where price is ABOVE the
 * open, rose where BELOW — so "am I up or down?" reads pre-cognitively, before any
 * number. No axis, no gridlines, no ticks (per D3 brief).
 *
 * ⚠️ REAL DATA OR NOTHING. `priceSeries` is real CONFIRMED oracle reads only (built in
 * updown-board.ts). When it is null we fall back to the two real points we always have —
 * the open and the current/close price — and when even the live price is unknown we draw
 * the open line ALONE. Nothing here fabricates a curve or a number.
 *
 * Pure/presentational: geometry is computed here, the localized label strings arrive as
 * `copy` from the server page, and the live-point breath is the kit's CSS `ud-point`.
 */
export function PriceHero({
  openPrice,
  upTarget,
  downTarget,
  livePrice,
  priceSeries,
  decimals,
  copy,
}: {
  openPrice: number | null;
  /** The frozen winning boundaries: reach up ⇒ UP wins, reach down ⇒ DOWN wins. */
  upTarget?: number | null;
  downTarget?: number | null;
  livePrice: number | null;
  priceSeries: { t: string; price: number }[] | null;
  decimals: number;
  copy: {
    priceLabel: string;     // "Live price" / "Close price"
    openLabel: string;      // "Open"
    upLabel?: string;       // "Up target"
    downLabel?: string;     // "Down target"
    awaitingRead: string;   // "Awaiting read"
    aboveBelow: string | null; // "Above open by $4.45" — null when no live price
    source: string | null;  // "Source: Kitco · quoted 14:34:58" — null when unknown
    chartAlt: string;
  };
}) {
  const usd = (n: number | null) =>
    n == null ? "—" : `$${n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const hasPrice = livePrice != null;
  const isUp = hasPrice && openPrice != null ? livePrice! >= openPrice : true;
  const ink = isUp ? "var(--yes-300)" : "var(--no-300)";
  const move = hasPrice && openPrice != null ? livePrice! - openPrice : null;
  const movePct = move != null && openPrice ? (move / openPrice) * 100 : null;
  const sgn = (v: number) => (v >= 0 ? "+" : "−");

  // The real points to draw: the series when we have ≥2, else the two real endpoints we
  // always know (open + live), else just the open. Never interpolated.
  const prices: number[] =
    priceSeries && priceSeries.length >= 2
      ? priceSeries.map((p) => p.price)
      : openPrice != null && livePrice != null
        ? [openPrice, livePrice]
        : openPrice != null
          ? [openPrice]
          : [];

  // ── Chart geometry — viewBox 640×220, plot 0..606 × 18..196 (verbatim from the spec).
  const X0 = 0, X1 = 606, Y0 = 18, Y1 = 196;
  const anchor = openPrice ?? prices[0] ?? 0;
  // Include the winning boundaries in the domain so both target lines fit on the plot.
  const band = [upTarget, downTarget].filter((v): v is number => v != null);
  const lo = Math.min(anchor, ...prices, ...band);
  const hi = Math.max(anchor, ...prices, ...band);
  const pad = (hi - lo) * 0.35 || 1;
  const top = hi + pad, bot = lo - pad;
  const xAt = (i: number) => (prices.length <= 1 ? X0 : X0 + (i / (prices.length - 1)) * (X1 - X0));
  const yAt = (v: number) => Y0 + ((top - v) / (top - bot)) * (Y1 - Y0);
  const hasLine = prices.length >= 2;
  const line = hasLine ? prices.map((v, i) => (i ? "L " : "M ") + xAt(i).toFixed(1) + " " + yAt(v).toFixed(1)).join(" ") : "";
  const openY = (openPrice != null ? yAt(openPrice) : yAt(anchor)).toFixed(1);
  const upY = upTarget != null ? yAt(upTarget).toFixed(1) : null;
  const downY = downTarget != null ? yAt(downTarget).toFixed(1) : null;
  const areaEdge = (yEdge: string) => line + " L " + X1.toFixed(1) + " " + yEdge + " L " + X0.toFixed(1) + " " + yEdge + " Z";
  const lastX = xAt(prices.length - 1).toFixed(1);
  const lastY = yAt(prices[prices.length - 1] ?? anchor).toFixed(1);
  const tagX = (parseFloat(lastX) - 10).toFixed(1);
  const tagY = (parseFloat(lastY) + (isUp ? -12 : 18)).toFixed(1);

  return (
    <section
      aria-label={copy.chartAlt}
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", padding: "16px 16px 10px", minWidth: 0 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p className="m-0 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">{copy.priceLabel}</p>
          <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {hasPrice ? (
              <>
                <span className="font-mono font-bold tabular-nums" style={{ fontSize: 26, lineHeight: 1, letterSpacing: "-0.01em", color: ink }}>{usd(livePrice)}</span>
                {movePct != null && (
                  <span className="font-mono font-semibold tabular-nums" style={{ fontSize: 12, color: ink }}>{sgn(movePct)}{Math.abs(movePct).toFixed(2)}%</span>
                )}
              </>
            ) : (
              <>
                <span className="font-mono font-bold" style={{ fontSize: 26, lineHeight: 1, color: "var(--text-faint)" }}>—</span>
                <span className="font-mono font-semibold uppercase tracking-[0.10em]" style={{ fontSize: 9, color: "var(--text-faint)" }}>{copy.awaitingRead}</span>
              </>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="m-0 font-mono text-[8.5px] font-semibold uppercase tracking-[0.12em] text-text-faint">{copy.openLabel}</p>
          <p className="mt-[5px] mb-0 font-mono text-[13px] font-bold tabular-nums text-text-muted">{usd(openPrice)}</p>
        </div>
      </div>

      <div style={{ marginTop: 12, position: "relative" }}>
        <svg viewBox="0 0 640 220" width="100%" style={{ display: "block", overflow: "visible" }} role="img" aria-label={copy.chartAlt}>
          <defs>
            <linearGradient id="udUp" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--yes-400)" stopOpacity="0.26" />
              <stop offset="100%" stopColor="var(--yes-400)" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="udDown" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--no-400)" stopOpacity="0.02" />
              <stop offset="100%" stopColor="var(--no-400)" stopOpacity="0.26" />
            </linearGradient>
            <clipPath id="udAbove"><rect x="0" y="0" width="640" height={openY} /></clipPath>
            <clipPath id="udBelow"><rect x="0" y={openY} width="640" height="220" /></clipPath>
          </defs>

          {hasLine && (
            <>
              <g clipPath="url(#udAbove)"><path d={areaEdge(openY)} fill="url(#udUp)" /></g>
              <g clipPath="url(#udBelow)"><path d={areaEdge(openY)} fill="url(#udDown)" /></g>
            </>
          )}

          {/* The money line — the open price the bet is measured against. Gilt is correct
              here: it is the reference, not decoration. */}
          <line x1="0" y1={openY} x2="606" y2={openY} stroke="var(--gilt)" strokeWidth="1.25" strokeDasharray="3 4" opacity="0.75" />
          <text x="0" y={(parseFloat(openY) - 6).toFixed(1)} fill="var(--gilt)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" letterSpacing="0.12em" opacity="0.9">
            {copy.openLabel.toUpperCase()} {usd(openPrice)}
          </text>

          {/* The frozen winning boundaries. Reaching UP (emerald) wins UP; reaching DOWN
              (rose) wins DOWN; the price staying between them voids + refunds. */}
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

      <p style={{ margin: "8px 0 0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }} className="font-mono text-[9.5px] text-text-faint">
        <span>{copy.aboveBelow ?? " "}</span>
        {copy.source && <span>{copy.source}</span>}
      </p>
    </section>
  );
}
