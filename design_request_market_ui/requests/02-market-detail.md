# Request #2 — Market detail page: a trading-terminal composition

## The problem
Our current detail page (`kit/market-detail-page.reference.tsx`) is built around the **conviction dial** (bet control). A serious market reads top-to-bottom as: *what's the question → what's the probability now → how has it moved → place/hold a position → discuss*. The chart and the number should anchor it.

## What we want
Recompose the market detail page (desktop-first, responsive) so the hierarchy is:
1. **Header:** question (EN · SW), category, time-to-resolution, status, source link.
2. **The number + chart, as the centerpiece:** the big YES % (with ▲/▼ move) sitting beside or above a **prominent, interactive probability-over-time chart** (elevate `kit/price-chart.reference.tsx`). This is the "is it moving?" moment.
3. **The two-sided pool** (TippingBar + pool sizes + predictor count) — clear but below the chart.
4. **Position panel:** keep the **conviction dial** for placing a bet, plus the player's **current position + live value / P&L** if they hold one (we have `position-card`). On desktop this can be a right-hand rail beside the chart; on mobile it stacks.
5. **A comments slot** at the bottom — leave a clearly-marked region for a discussion thread (we're building the thread component in-house; just art-direct where it sits and the section header treatment).
6. **Resolution criterion + provably-fair / two-officer trust strip** near the bottom (we have these — keep, make them feel credible, not buried).

## Constraints
- Desktop: use the width (chart + position rail). Mobile: a sensible stack (number → chart → pool → bet → position → comments).
- Calm and dense — reserve gilt/decoration for accents; let data breathe.
- Reuse the conviction dial and TippingBar as-is (reposition, don't redesign them here).

## Deliverable
- A page-composition spec (wireframe-level is fine: a labeled layout for desktop + mobile) + TSX skeleton showing the section order and which existing components go where.
- Any `globals.css` additions for layout/section styling (tokens only).
