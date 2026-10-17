# `PHOSPHOR-MIGRATION` W0 — the specimen Ali ruled on

> **STATUS: ⚪ RECORD, NOT RULE — RULED 2026-10-17.** This folder keeps the exact page Ali opened before any icon code
> changed, and the generator that built it. His answers are recorded once, in
> [`PHOSPHOR-MIGRATION.md`](../../PHOSPHOR-MIGRATION.md) §2 (R-WEIGHT … R-BADGES) and §3; the design law is
> [`DESIGN_AUTHORITY.md`](../../DESIGN_AUTHORITY.md). Nothing here is a rule, a token or a component.

## What is in this folder

| File | What it is |
|---|---|
| `phosphor-specimen-w0.html` | The page as published to Ali (https://claude.ai/artifact/74HNKPSDZLNdaLJvTbXGWW) — self-contained apart from Google Fonts. Today's icons beside Phosphor in 50pick's real tokens, six numbered questions, the pre-selected line Ali adopted |
| `build.py` | The generator: `python -I build.py <src/components/ui/glyphs.tsx> <@phosphor-icons/core 2.1.1>/package/assets <out.html>` |
| `template.html` | The page shell the generator fills (tokens, layout, the answer bar) |

## How it was made, so it can be made again
- **Today's column** is read from `src/components/ui/glyphs.tsx` at main `380edd31` — the live house family, not a copy.
- **Phosphor's column** comes from `@phosphor-icons/core` 2.1.1, the npm tarball verified against the registry's
  integrity (`sha512-v4ARvrip4qBCImOE5rmPUylOEK4iiED9ZyKjcvzuezqMaiRASCHKcRIuvvxL/twvLpkfnEODCOJp5dM4eZilxQ==`). Only path
  data is taken, each string checked to hold nothing but SVG path characters, then embedded as `<symbol>`s drawn with
  `<use>` — the delivery W1 builds for the product, in miniature.
- It was rendered in Chromium at 390 and 1280 px before publishing (no horizontal overflow, all three faces loaded, no
  console error), with one pass of fixes.

## Licence
Phosphor Icons are MIT-licensed — Copyright (c) 2023 Phosphor Icons. The notice travels with the page (its footer).
