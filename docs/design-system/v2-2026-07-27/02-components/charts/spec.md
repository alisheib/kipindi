# Charts — spec

GIVEN — PriceChart (kit-source/microstructure.jsx): THE primary market viz. YES probability 0..1 over time; line + area fill; hover tooltip; right-edge tag. Page chrome .pchart / .pchart-dot-halo lives in tokens.css (overflow:hidden wrapper rule for Android).
Also GIVEN in microstructure.jsx: VolumeSparkline, OrderBook, DepthChart, PayoutCalculator, ResolutionSourceCard, DisputeLog, LiquidityHeat, MarketStats, Countdown.

INVENTED (2026-06) — PnlChart (_specs-as-delivered/pnl-chart.tsx): cumulative REALISED TZS per settlement. viewBox 720×240; plot x 8..656, y 14..214; series prepends a zero start; axis = real max / 0 / min (short-formatted +52k / 0 / −18k — never normalised); gridlines --border 1px dash 2 3 at 45%; break-even line --gilt dash 2 5 at 55% + "BREAK-EVEN" 9px ls 0.14em; line --brand-300 2.25px round + drop-shadow(0 0 5px color-mix(--brand-400 35%, transparent)); end dot r3.5 --aqua-300 + .pchart-dot-halo ring r8.
Colour law: the P&L line is brand-blue, NOT yes/no green/rose (not a betting action) and NOT gold (chart ink ≠ earned-money ink).
