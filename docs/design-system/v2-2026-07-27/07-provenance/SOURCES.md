# Sources — what was given vs inferred

## Given (verbatim copies in this folder)
| File | What it is |
|---|---|
| briefs/00-README-for-claude-design.md | Handoff instructions; the "golden rule": every value from globals.css |
| briefs/01-RULES-and-invariants.md | Brand & UX invariants (basis of 06-patterns-and-rules) |
| briefs/02-BRIEF-positions-pnl.md | Brief #1 — Positions P&L summary + performance |
| briefs/UPDOWN-DESIGN-PROMPTS.md | Up & Down product brief + surfaces D1–D5 + acceptance criteria |
| kit-source/globals.css | THE token/stylesheet source of truth (archived unmodified; 01-foundations/tokens.css differs only by the documented font-import removal) |
| kit-source/atoms.jsx | Kit atoms: Button, Chip, LiveDot, ProbabilityBar, ProgressBar, SteppedProgress, CircularProgress, Input, Avatar, TierBadge, Skeleton, Toast, Tooltip, Icon map |
| kit-source/markets.jsx | MarketCard, BuyTray, PositionCard, ResolutionPanel, LeaderboardRow, EmptyState + line-art empties |
| kit-source/brand.jsx | FiftyMark/Wordmark/Lockup/Favicon, TippingBar, ConfidenceDial, PulseRing, banners |
| kit-source/microstructure.jsx | PriceChart, VolumeSparkline, OrderBook, DepthChart, PayoutCalculator, ResolutionSourceCard, DisputeLog, LiquidityHeat, MarketStats, Countdown |
| app-source/*.tsx | Production page code as it stood pre-redesign (positions, performance, position-card, resolution panel example) |

## Produced in the design sessions (and where)
- Positions & Performance DCs + JSX handoff (2026-06) → 05-pages/, 02-components/_specs-as-delivered/
- UpDown Card + Board DCs, D1/D2 specs (2026-07) → 05-pages/, 02-components/updown-card, _specs-as-delivered/

## Inferred rather than told (treat with proportionate suspicion)
1. **Clear-space rule for the mark** (≥0.25× diameter) — no explicit rule was given.
2. **Teal = superseded** — inferred from tokens.css comments ("kit royal track", v2 notes) + the royal re-theme; nobody said "never teal" in as many words.
3. **Changelog ordering before 2026-06** — reconstructed from code comments.
4. **The demo content everywhere** (Tanzanian markets, TZS amounts, names like Kitco, dates) — invented realistic sample data, per the user's instruction. Not real market history.
5. **Asset icon chips ("Au"/"Ag" tinted circles)** — placeholders awaiting real asset artwork (flagged in D1 spec).
6. **grid minmax(300px,1fr)** as the responsive implementation of "1/2/3/4 columns" — the brief gave column counts, not the mechanism.
7. **Token grouping in tokens.json** — organisational, not given.
