# 50Pick — UI v1 (pre-modernization snapshot)

This folder is a **frozen archive of the current ("classic") UI** as it exists in
production at the moment we began the Dark-Glass modernization. It is a reference
copy only — **nothing here is imported or built by the app.** The live UI continues
to live under `src/`. If a modernized component ever needs to be compared against,
or rolled back to, the original, this is the source of truth for "v1".

Captured on: 2026-06-04 (commit `ad350d3`).

## What's inside

| Path | What it is |
|---|---|
| `globals.css` | The complete v1 application stylesheet (royal-indigo canvas, gilt accent, claret + aqua). Single canonical theme. |
| `tailwind.config.ts` | v1 Tailwind token mapping. |
| `postcss.config.mjs` | v1 PostCSS config. |
| `components/` | Full snapshot of `src/components/` — every atom, layout, market, admin, chat, badge, rg, proposal and onboarding component as shipped in v1. |
| `styles/` | v1 chat token + style sheets. |
| `design-kit/` | The original locked design kit (`design_handoff_prediction_market_kit/kit/`) the v1 UI was built from. |
| `docs/` | v1 designer handoff + design-kit reference notes. |

## The brand rules v1 was built on (carried forward unchanged into v2)

- Royal indigo (hue 268) canvas/chrome · gold (hue ~80) earned accent only ·
  YES emerald (152) left · NO rose (22) right · aqua (195) chrome accent · brand blue (262) focus/links.
- Fonts: Sora (display) · Inter (body) · JetBrains Mono (all numbers, tabular).
- Single dark theme. No emojis in UI copy. No casino imagery.
- Bilingual EN + SW, +30% string tolerance.

## Why this exists

The v2 "Dark Glass" modernization changes **surface depth, motion, glass, and
micro-interactions only** — not the palette, not the copy, not any logic. Keeping
v1 intact lets us A/B any screen and prove the refresh changed nothing functional.
