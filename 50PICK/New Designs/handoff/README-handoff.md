# Handoff — Positions portfolio (Brief #1)

Live mock: `Positions Portfolio.dc.html` (frames 1a–1i: desktop 1440, mobile 390,
empty, loading, net-loss, big-win).

## Files
- `pnl-summary-strip.tsx` — the "Your standing" ledger strip for the top of
  `/positions`. Drop-in replacement for the old 4× `SummaryCell` grid; same
  server aggregates as today (openStake, openLiveValue via `cashOutValue`,
  settledNet, W/L/C counts).
- `pnl-chart.tsx` — cumulative realised-P&L chart. Server-safe pure SVG.
  Replaces the 0–1-normalised `PriceChart` usage: feed it **raw cumulative TZS**
  (`{label, value}[]`, chronological) — axis labels are the real max/0/min.
- `positions-performance-page.tsx` — recomposed `/positions/performance` body.
  Aggregation logic is unchanged from the current page; only presentation moved.

## Zero new CSS
Everything resolves to existing `globals.css` tokens and shipped classes
(`glass-panel`, `gilt-eyebrow`, `gilt-rule`, `.chip`, `.btn`, `.skeleton`,
`.pchart-dot-halo`). No appendix needed — the golden rule holds.

## New i18n keys needed (en/sw/zh)
`positions.yourStanding`, `positions.liveValueIfSettled` ("Live value · if
settled now"), `performance.allFiguresFinal`, `performance.marketsSettled`,
`performance.cumulativePerSettlement`, `performance.totalStaked`,
`performance.netProfitCaption`, `performance.netLossCaption` (calm loss copy:
"Down TZS X across N settled markets. Every figure here is final — nothing
further is owed.").

## Invariants honoured
- **Gold = earned money only**: settled profit, best win, positive P&L rows.
  The gilt Needle dial (win rate) is brand-signature chrome, tokenised as
  `--gilt` like the TippingBar needle.
- **Unrealised honesty**: open-position value is always captioned
  "if settled now"; per-card potential payout stays hidden pre-resolution
  (license review · 2026-05 spec).
- **No green/red outside betting actions**: the P&L chart line is
  `--brand-300`; win/loss values use gilt/rose ink, not yes/no buttons.
- **Aqua = finishing pass**: one live pip on the strip + the chart's end-dot
  halo (`.pchart-dot-halo`, already reduced-motion-gated). Well under 8%.
- **Losses with dignity**: rose ink, calm final copy, no alarm panels.
- **No emojis**; streaks are numbers, glyphs are line-art SVG.
- **Motion**: only pre-existing, reduced-motion-safe globals.css animations
  (skeleton shimmer, aqua halo). Nothing new to gate.
