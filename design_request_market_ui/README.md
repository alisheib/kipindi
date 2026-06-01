# 50pick · Design Request — Market UI (the "serious market" surfaces)

**From:** 50pick / Kipindi product team
**To:** Claude Design
**Goal:** Elevate our most-seen, identity-defining surfaces — the **market card**, the **market detail page**, and the **probability chart** — to feel like a credible, top-tier prediction market (think Polymarket/Kalshi *substance*) **while staying 100% in our existing brand and kit.** We are NOT rebranding. Keep our heraldic gilt-on-royal identity; raise the information design.

> ⚠️ **Hard rule:** build only on the tokens, components, and motion already in this repo (see `/kit`). No new color palettes, fonts, radii, shadow scales, or icon libraries. When in doubt, reuse an existing token. The point is to make our markets read as *serious and data-forward* without losing what makes 50pick look like 50pick.

---

## Why this request (the gap we're closing)
We use an advanced kit, so our components look polished. But competitors win on **information design**, not prettier buttons:
- the **probability % is the loud hero** on every card (we currently lead with the question + a pool bar);
- a **prominent, live probability-over-time chart** is the centerpiece of a market (ours is secondary to the bet dial);
- the market detail reads like a **trading terminal** (calm, dense, scannable), not a decorated page.

We want your art direction on exactly these three surfaces. Everything else (comments, search, P&L) we're building in-house against the kit.

---

## What's in `/kit` (our real, current code — design INTO this)
```
globals.reference.css            ← all design tokens + every @keyframes / motion util
brand.reference.tsx              ← FiftyMark + TippingBar (our YES/NO pool bar) + motion
market-card.reference.tsx        ← the CURRENT market card (to be redesigned)
market-detail-page.reference.tsx ← the CURRENT detail page composition (to be redesigned)
price-chart.reference.tsx        ← the CURRENT chart (to be elevated)
conviction-dial.reference.tsx    ← the bet-placement control (keep; reposition)
probability-bar.reference.tsx · market-stats.reference.tsx · position-card.reference.tsx
button / input / chip / card / avatar / empty-state .reference.tsx  ← kit atoms
```

## Theme constraints (non-negotiable)
- **Colors (OKLCH tokens only):** `--gold-*` (gilt), `--royal-*`/`--teal-*` (indigo 268), `--claret-*`, `--aqua-*` (focus/secondary 195), **`--yes-*` (emerald 152) / `--no-*` (rose 22)** for the two sides, `--pearl-*` ink, semantic `--bg / --bg-elevated / --border / --text*`. Never hardcode hex.
- **YES is emerald, NO is rose** — always. The probability is a YES%.
- **Radii** `--r-xs..xl`, `--r-pill`. **Shadows** `--shadow-1..5`, `--shadow-card`. **Motion** `--ease-* / --dur-*` with a `prefers-reduced-motion` branch on anything animated.
- Heraldic, restrained, **line-art** (no full-color art, no emoji). Bilingual **EN · SW** on any copy.
- **Mobile-first, 60fps on mid-range Android** — transform/opacity only; charts must stay light.

## Data you can rely on (already in our store)
- Per market: `yesPool`, `noPool`, `predictorCount`, `impliedYesPct(m)` (the YES %), `resolutionAt`, `titleEn/titleSw`, `category`, `status` (LIVE/CLOSED/RESOLVED/VOIDED).
- **Price history exists** (`market-history` records pool snapshots over time) → real data for a probability-over-time chart and a "▲/▼ since open" delta.

## Deliverable format (so it drops into our codebase)
For each request: a short spec (markdown) + TSX component sketches in our prop style + any `globals.css` additions (new keyframes/classes using our tokens, each with a reduced-motion branch) + a "did-not-introduce-off-kit" note. JSX is fine; we wire the data.

Three requests follow in `/requests`. Thank you — keep it 50pick: heraldic identity, trader-grade clarity.
