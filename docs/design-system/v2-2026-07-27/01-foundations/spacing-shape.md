> 📑 **RECORD, NOT RULE.** The design rulebook is **`docs/DESIGN_AUTHORITY.md`** — every
> law, floor and threshold is there, and nothing else is required to build correctly.
> This file is kept as the delivered spacing/shape reasoning.
> ⚠️ **Values written here are a snapshot and some have drifted.** The live values are in
> `src/app/globals.css` / `src/app/motion.css`, which outrank every document.
> (Consolidated 2026-08-08 — nine files used to claim to be the place to start.)

# Spacing, shape & borders

## Spacing scale (tokens)
--sp-1 4 · --sp-2 8 · --sp-3 12 · --sp-4 16 · --sp-5 20 · --sp-6 24 · --sp-8 32 · --sp-10 40 · --sp-12 48 · --sp-16 64 (px). Layouts use flex/grid + gap on this scale; page stacks commonly gap 18–22px, card grids gap 12–16px.

## Radius — additive +4 rhythm (tokens)
--r-xs 4 · --r-sm 8 · --r-md 12 · --r-lg 16 · --r-xl 24 · --r-pill 999 (px).

Per component type (law: **16px cards/modals, 12px inputs**):
| Component | Radius |
|---|---|
| Cards (MarketCard, UpDownCard, empty states) | --r-lg 16 |
| Modals / sheets | --r-lg 16 |
| Inputs, stake rows, countdown band, stat tiles, ledger containers | --r-md 12 |
| Buttons sm–lg | 12 (kit .btn); btn-xl gets --r-lg |
| Tabs, filter pills | --r-sm 8 |
| Chips, quick-stake, pills, split-bar tracks | --r-pill |
| Result pips (D2) | --r-xs 4 |
| Icon chips / avatars / dots | 50% |

## Border weights
- 1px is the default everywhere (--border; --border-strong for emphasis; dashed 1px --border-strong for empty states).
- 1.5px: dial rings, line-art illustration strokes, kit icon strokes.
- 2–2.4px: brand mark ring/divider; needle strokes 2.4–3px.
- Buttons are solid fills with a 🔴 SUPERSEDED by §M1 — an EVEN 1px inner ring (`inset 0 0 0 1px`), never the one-sided top line this once prescribed (box-shadow inset 0 1px 0 …) — not outlines.

## Breakpoints & floors
Design at **360 / 768 / 1280 / 1920**. Zero horizontal overflow at 360. Tap targets ≥ 40px (44px preferred on mobile). Card grids: 1 col at 360, 2 at 768, 3 at 1280, 4 at 1920 — implemented as repeat(auto-fill, minmax(300px, 1fr)).
