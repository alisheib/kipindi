# 50pick — Market Surfaces handoff

Three trading surfaces, built **only** on the kit in `/uploads/design_request_haptics_motion_badges/kit` (OKLCH tokens, YES=emerald 152 / NO=rose 22, gilt soloist, EN·SW, 60fps, reduced-motion). No new colours, fonts, radii, shadows, or motion tokens.

## Open it
- `50pick Market Surfaces.html` — interactive showcase (loads `styles/*` + `js/*`).
- `50pick Market Surfaces (shareable).html` — single self-contained file (needs internet for the React/Babel CDN runtime).

## Deliverable files
| File | What it is |
|---|---|
| `styles/market.css` | Proposed **globals.css additions** — tokens only, append-only. Each animated rule has a `prefers-reduced-motion` branch. |
| `js/probability-chart.jsx` | `ProbabilityChart` + `Sparkline` — the signature "tipping line" chart. |
| `js/market-surfaces.jsx` | `MarketCard`, `MarketDetail`, `BetTicket`, `PositionPanel`. |
| `js/market-kit.jsx` | Faithful in-browser ports of the kit atoms reused (`TippingBar`, `Button`, `Avatar`, `TierBadge`, `SignalPip`). **Diff against the real kit and drop these** — they exist only so the showcase runs standalone. |
| `js/market-data.js` | Sample `Market` shape + probability series (the props each surface expects). |
| `styles/kit.css` | The kit stylesheet port (reference; use your real `globals.css`). |

## Signature idea — "the tipping line"
Every surface reads off one motif: the 50% mark is a **gilt dashed reference** (same language as `TippingBar`); the probability area fills **emerald above / rose below** it (half-plane clip); the live point is an aqua `SignalPip`. Scales from a 760px chart to a 72px sparkline.

## Surfaces
- **Market card** — 56px Sora YES% hero + line-art ▲/▼ 24h move + sparkline + `TippingBar` (kept verbatim) + kit yes/no buttons.
- **Detail terminal** — 2-col grid (sticky rail, collapses ≤880px): question → big % + chart + TippingBar → two-sided pool → bet ticket + position-P&L rail → comments slot → gilt line-art trust strip.
- **Probability chart** — emerald YES line (draws in via `stroke-dashoffset`, snaps under reduced-motion), gilt tipping line, two-tone area, aqua live point, 1D/1W/1M/ALL range tabs, hover crosshair + mono readout.

## Two decisions needed before build
1. **Pricing model.** The bet ticket uses simple `stake ÷ price` (parimutuel-style). Swap if 50pick prices via LMSR/AMM or fixed odds.
2. **Real content.** Markets shown (USD/TZS, TPL final, rainfall) are hypothetical placeholders — replace copy + numbers.

## Reuse note
`MarketCard`/`MarketDetail` import kit atoms by name. In your codebase, point those imports at the real kit components and delete `js/market-kit.jsx`. The classes in `market.css` mirror the kit's `.tier-*` / `.btn` structure and assume the kit tokens are already loaded.
