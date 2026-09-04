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
/**
 * 🔴 E-93 · WHERE THE LIVE-PRICE TAG GOES SO IT DOES NOT LAND ON A TARGET LABEL.
 *
 * The tag and both target labels are all right-anchored against the same edge of the plot, so
 * they share a column and only their BASELINES keep them apart. On production a no-move round
 * closed at $64,188.01 against an UP target of $64,265.72 — near enough that the tag and the
 * `UP $64,265.72` label printed on top of each other, on the SETTLEMENT PROOF — the one surface
 * whose entire job is to be evidence a player can read and check. A fixed `isUp ? -12 : 18`
 * cannot avoid that: it does not know the target lines exist.
 *
 * So: try the preferred side first, then the other, then further out, and take the first offset
 * that clears every target baseline by `MIN_GAP`. If none does — the point is boxed in between
 * two close lines — take the roomiest, which is still strictly better than a fixed guess.
 *
 * Pure and exported so the arithmetic can be tested without a browser; the component is the
 * only caller.
 */
export function priceTagOffsetY(
  lastY: number,
  targetBaselines: ReadonlyArray<number | null>,
  preferAbove: boolean,
): number {
  const MIN_GAP = 13;                    // viewBox units — one line of 8.5px type plus air
  const targets = targetBaselines.filter((v): v is number => v != null && Number.isFinite(v));
  const candidates = preferAbove ? [-12, 18, -28, 34] : [18, -12, 34, -28];
  if (targets.length === 0) return candidates[0];
  const clearance = (dy: number) => Math.min(...targets.map((t) => Math.abs(lastY + dy - t)));
  return candidates.find((dy) => clearance(dy) >= MIN_GAP)
    ?? candidates.reduce((best, dy) => (clearance(dy) > clearance(best) ? dy : best), candidates[0]);
}

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
  const move = hasPrice && openPrice != null ? livePrice! - openPrice : null;
  // ⭐ E-261 · THREE states — the board card's own rule (dir "flat" → text-muted, zero
  // unsigned), adopted here and in the board RoundChart in the same commit so the one
  // recipe keeps agreeing with itself. At exactly-flat a banded round VOIDs; UP-green at
  // 0.00% was a false direction claim in §B2 ink. Green/rose stay strictly above/below.
  const flat = move === 0;
  const ink = flat ? "var(--text-muted)" : isUp ? "var(--yes-300)" : "var(--no-300)";
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
  const tagY = (parseFloat(lastY) + priceTagOffsetY(
    parseFloat(lastY),
    // The baselines the two target labels are drawn on, in the same units.
    [upY != null ? parseFloat(upY) - 4 : null, downY != null ? parseFloat(downY) + 11 : null],
    isUp,
  )).toFixed(1);

  return (
    <section
      aria-label={copy.chartAlt}
      style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-card)", padding: "16px 16px 10px", minWidth: 0 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p className="m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-faint">{copy.priceLabel}</p>
          <div style={{ marginTop: 5, display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            {hasPrice ? (
              <>
                <span className="font-mono font-bold tabular-nums" style={{ fontSize: 26, lineHeight: 1, letterSpacing: "-0.01em", color: ink }}>{usd(livePrice)}</span>
                {movePct != null && (
                  <span className="font-mono font-semibold tabular-nums" style={{ fontSize: 12, color: ink }}>{flat ? "0.00%" : `${sgn(movePct)}${Math.abs(movePct).toFixed(2)}%`}</span>
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
          <p className="m-0 font-mono text-micro font-semibold uppercase eyebrow text-text-faint">{copy.openLabel}</p>
          <p className="mt-[5px] mb-0 font-mono text-[13px] font-bold tabular-nums text-text-muted">{usd(openPrice)}</p>
          {/* ⭐ E-198 · THE TWO NUMBERS THAT DECIDE THE BET, IN TEXT, WHILE THEY STILL MATTER.
              🔴 They were rendered in ONE place on a live round — inside the chart below, in
              viewBox units. That svg is `width: 100%` on a `0 0 640 220` box, so its type scales
              with the PAGE WIDTH, and measured on production 2026-08-24 the winning boundaries
              rendered at **4.34 CSS px at 393** and **7.14px at 1024**. The page's HTML copy of
              these figures lives in the settlement proof, which renders only once the round is
              DECIDED — so the numbers a player needs to choose a side were legible only after
              choosing was over.
              ⛔ THIS IS NOT A SECOND SOURCE OF TRUTH. Same props, same `usd()` formatter, same
              `dec` precision as the chart labels and the proof panel — one round, one pair of
              frozen targets, three renderings of it.
              ⭐ AND IT IS WHY THE D3 ORDER DID NOT NEED INVERTING. That record puts the price
              hero first because it is "the reference line the bet is measured against" — a
              rationale that simply did not survive at 4.34px. Making the line READABLE honours
              the intent; moving the buttons above it would have abandoned the intent to work
              around unreadable text. ⚠️ It costs ~2 lines of height and is deliberately in the
              existing right-hand block rather than a new panel, so the bet control below does
              not move further down the page. */}
          {upTarget != null && downTarget != null && (
            <p className="mt-[6px] mb-0 font-mono text-body-sm font-semibold tabular-nums">
              <span style={{ color: "var(--yes-300)" }}>{(copy.upLabel ?? "UP").toUpperCase()} ≥ {usd(upTarget)}</span>
              <br />
              <span style={{ color: "var(--no-300)" }}>{(copy.downLabel ?? "DOWN").toUpperCase()} ≤ {usd(downTarget)}</span>
            </p>
          )}
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
          {/* ⭐ E-263 · every in-svg label wears .ud-svg-label — E-257's hide-below-sm
              remedy, backported to the surface E-198 was originally MEASURED on: these
              four painted ~4.34px at 393 (the measurement lives at the E-198 note above)
              as unreadable ghost text under a header that states all four numbers in
              real HTML. Nothing is lost at <sm: live (:134), open (:149), both targets
              (:168-174) and aboveBelow (:244) are always-visible HTML twins. */}
          <line x1="0" y1={openY} x2="606" y2={openY} stroke="var(--gilt)" strokeWidth="1.25" strokeDasharray="3 4" opacity="0.75" />
          <text className="ud-svg-label" x="0" y={(parseFloat(openY) - 6).toFixed(1)} fill="var(--gilt)" fontFamily="var(--font-mono)" fontSize="9" fontWeight="600" letterSpacing="0.12em" opacity="0.9">
            {copy.openLabel.toUpperCase()} {usd(openPrice)}
          </text>

          {/* The frozen winning boundaries. Reaching UP (emerald) wins UP; reaching DOWN
              (rose) wins DOWN; the price staying between them voids + refunds. */}
          {upY && (
            <g>
              <line x1="0" y1={upY} x2="606" y2={upY} stroke="var(--yes-400)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
              <text className="ud-svg-label" x="606" y={(parseFloat(upY) - 4).toFixed(1)} textAnchor="end" fill="var(--yes-300)" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600" letterSpacing="0.10em" opacity="0.9">
                {(copy.upLabel ?? "UP").toUpperCase()} {usd(upTarget!)}
              </text>
            </g>
          )}
          {downY && (
            <g>
              <line x1="0" y1={downY} x2="606" y2={downY} stroke="var(--no-400)" strokeWidth="1" strokeDasharray="2 5" opacity="0.6" />
              <text className="ud-svg-label" x="606" y={(parseFloat(downY) + 11).toFixed(1)} textAnchor="end" fill="var(--no-300)" fontFamily="var(--font-mono)" fontSize="8.5" fontWeight="600" letterSpacing="0.10em" opacity="0.9">
                {(copy.downLabel ?? "DOWN").toUpperCase()} {usd(downTarget!)}
              </text>
            </g>
          )}

          {hasLine && <path d={line} fill="none" stroke={ink} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />}

          {hasPrice && hasLine && (
            <g>
              <circle className="ud-point" cx={lastX} cy={lastY} r="7" fill={ink} opacity="0.22" />
              <circle cx={lastX} cy={lastY} r="3.6" fill={ink} />
              <text className="ud-svg-label" x={tagX} y={tagY} textAnchor="end" fill={ink} fontFamily="var(--font-mono)" fontSize="11" fontWeight="700">{usd(livePrice)}</text>
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
