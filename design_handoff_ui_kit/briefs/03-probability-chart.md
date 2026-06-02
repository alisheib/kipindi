# Request #3 — The probability chart (signature treatment)

## The problem
A prediction market lives and dies on its **price/probability chart**. Ours
(`kit/price-chart.reference.tsx`) works but isn't a signature element. We want a
distinctive, on-theme chart that's the visual anchor of a market — calm,
readable, and unmistakably 50pick.

## What we want
Art-direct a **probability-over-time line/area chart** (YES % on the y-axis, time on x):
1. **On-theme styling:** YES-emerald line/area when above 50, transitioning toward rose below 50; gilt accents for the current value + axis; royal background. The current-value dot/label is the focal point.
2. **Range controls:** 1H / 6H / 1D / All — kit chip styling (reuse `chip`). (We snapshot pools over time, so these map to history windows.)
3. **A clear "current %" callout** anchored to the latest point (big, with ▲/▼ since the selected range start).
4. **Resolution marker:** when a market is resolved, show the final point + a gilt "resolved YES/NO" marker.
5. **Micro variant:** a tiny sparkline version for the market card (request #1) sharing the same visual language.
6. **Empty/low-data state:** new markets have little history — show a calm "not enough history yet" treatment, not a broken axis.

## Constraints
- Lightweight + 60fps on mid-range Android (SVG/canvas, transform/opacity for any animation; no heavy charting lib unless it's tiny). Reduced-motion: no draw-on animation, just render final.
- OKLCH tokens only; YES=emerald(152), NO=rose(22), accents gilt(80-86), grid/axis in `--border`/`--text-subtle`.
- Bilingual labels where any text appears.

## Deliverable
- A chart component spec + TSX sketch (props: a series of {t, yesPct} points + range + resolved state) in our style.
- The micro/sparkline variant.
- Any `globals.css` additions (tokens only) + reduced-motion branch.
- Note any tiny dependency you'd use (prefer none / hand-rolled SVG to stay light).
