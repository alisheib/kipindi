# Markets — the signature surface

This is the heart of the product. A market is a yes/no question with a
pari-mutuel pool; the UI's job is to answer, top-to-bottom: *what's the question
→ what's the probability now → how has it moved → place/hold a position →
discuss*. The **YES %** and the **probability chart** are the anchors.

## The pieces

| File | What it is |
|---|---|
| `market-card.tsx` | **The browse card.** Number-as-hero: big YES%, a move chip (▲/▼), a sparkline, a two-tone YES/NO tipping bar, and YES/NO quick-buttons. Compact, flat at rest, lifts on hover. It's a CSS **container query** — the sparkline folds away on narrow columns and chip/meta rows wrap, so a 4-up card never overflows. Lives with the `.mcard*` rules in `globals.css`. |
| `probability-chart.tsx` | **Signature chart.** Dependency-free SVG, YES%-over-time. Emerald above 50 / rose below, gilt current-value focal point, range chips (1D/1W/1M/ALL), draw-in via stroke-dashoffset (reduced-motion → final state). Exports `ProbabilityChart` + the micro `Sparkline` used on the card. |
| `price-chart.tsx` | Earlier chart (being superseded by `probability-chart`). Kept for reference. |
| `conviction-dial.tsx` | The bet control — a dial expressing conviction/stake. Reused as-is; reposition, don't redesign. |
| `position-card.tsx` | A player's held position: side, stake, live value, P&L. |
| `probability-bar.tsx` | The two-tone YES/NO pool bar (a.k.a. tipping bar). |
| `market-stats.tsx` | Pool sizes, predictor count, volume. |
| `countdown.tsx` / `circular-progress.tsx` / `stepped-progress.tsx` | Time-to-resolution + progress treatments. |
| `bet-confirm-modal.tsx` / `sell-confirm-modal.tsx` / `sell-button.tsx` | Place / exit a position flow. |
| `operation-result-modal.tsx` | Success/failure result of a money action. |
| `win-celebration.tsx` | The win moment (uses `--ease-celebrate` + `--glow-win`). |
| `share-button.tsx` | Share a market. |
| `house-lean-warning.tsx` | Disclosure when the house has a lean. |
| `notify-prompt.tsx` / `notify-poller.tsx` | Resolution-notify opt-in + polling. |

## Notes for design
- The pricing model is **pari-mutuel pools** (yesPool / noPool → implied %). The
  card/chart visualise that; don't assume an order-book.
- The current ask (the card *system* — binary + multi-outcome + compact row) is
  in `../../REQUEST-next-round.md`.
