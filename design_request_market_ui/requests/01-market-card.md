# Request #1 — Market card: probability as the hero

## The problem
Our current card (`kit/market-card.reference.tsx`) leads with the **question**, with the implied % as a secondary detail and a TippingBar pool bar. Traders scan for **the number and whether it's moving** — that should be the loudest thing.

## What we want
Redesign the market card so the **YES probability is the hero**, on-theme:
1. **Big, instantly-scannable YES %** (e.g. `62%`) as the dominant element — emerald-leaning when YES-favoured, rose when NO-favoured, gilt/neutral near 50. Use `impliedYesPct(m)`.
2. A **move indicator** — `▲ 4` / `▼ 3` since the market opened (we have price history) — small, colored yes/no.
3. The **question** clearly but secondary to the number.
4. Keep a compact sense of the **two-sided pool** (our TippingBar is the signature — keep it, but smaller/secondary to the %), plus `predictorCount` and time-left (`resolutionAt`).
5. A tiny **sparkline** of the probability over time if it fits cleanly (optional; reuse `price-chart` ideas at micro scale).
6. Category chip + status. Hover/press states from the kit.

## Constraints
- Two card states: **LIVE** (interactive, hover) and **RESOLVED** (settled look, show the outcome).
- Must look right in a 3-up grid (desktop) and 1-up (mobile). Dense but breathable.
- Keep the heraldic feel but lean **calmer/denser** than today (this is a browsing surface, not a hero).

## Deliverable
- A redesigned `MarketCard` TSX sketch (props mirror the current one — it takes a market snapshot).
- Any `globals.css` additions for the number/move/sparkline styling (tokens only).
- Show both LIVE and RESOLVED states.
