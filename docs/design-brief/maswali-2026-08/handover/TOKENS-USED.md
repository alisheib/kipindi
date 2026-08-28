# TOKENS-USED

Every custom property referenced by the four artboard sources, as shipped. Audited
mechanically against `tokens-LOCKED.css` on 2026-08-28: **52 tokens, all present; zero
invented.** (`--r-md`, `--r-lg`, `--r-pill` are declared mid-line in the radius row of the
locked file.) No motion or easing tokens are consumed — the artboards are static frames.

## Canvas & chrome
- var(--bg) — page canvas of every frame
- var(--panel) — top app bar, sticky rail, bottom rail
- var(--bg-elevated) — countdown pill, refusal callout, cards, badges
- var(--bg-overlay) — tier legend strip, rules strip, glyph tiles
- var(--bg-inset) — SteppedProgress upcoming segments
- var(--bg-royal-soft) — avatar fill
- var(--slate-950) — the desk behind artboards (annotation chrome only)

## Ink
- var(--text) · var(--text-muted) · var(--text-subtle) · var(--text-faint)
- var(--pearl-50) — label on lit NDIO/HAPANA fills
- var(--text-link) · var(--text-link-hover) — links, jump link in the refusal

## Type & faces
- var(--font-display) · var(--font-body) · var(--font-mono)
- var(--type-h1) 32 — the pool figure (Set C)
- var(--type-h2) 24 — page title (28px step absent from the locked file; nearest used, see DECISIONS #20)
- var(--type-h3) 20 — countdown numeral, receipt score
- var(--type-h4) 17 — wordmark, locks-in numeral
- var(--type-body) 15 — question prose, control labels, CTA
- var(--type-small) 13 — meta, fact rows, footer
- var(--type-micro) 11 — mono eyebrows, labels, hashes
- var(--type-nano) 8.5 — the 18+ crest numerals only (untranslatable mark)

## The betting pair (selection state only, one lit control per row max)
- var(--yes-600) fill + var(--yes-500) edge — lit NDIO
- var(--no-600) fill + var(--no-500) edge — lit HAPANA

## App state (never the betting pair)
- var(--success-fg) — 10/10 helper, receipt ✓ marks. The semantic app-state reference, kept apart from the betting controls per law 6. ⚠️ In tokens-LOCKED.css this token aliases var(--yes-200) (hue 152); the hue-166 success family the brief describes is not in the extract — see OPEN-QUESTIONS #9. If globals.css holds the 166 family, the live repo wins and nothing here changes.

## Gold & gilt (earned / final money-commit only)
- var(--gilt-metal) + var(--gilt-metal-edge) — the armed pay control
- var(--gilt-ink) — settled payout figure (C3) and the C1 argument frame
- var(--gilt) — "PAID OUT" seal word + seal glyph
- var(--gold-500) + var(--gold-fg) — top-bar deposit chrome, as shipped
- var(--border-gold) — armed pay control outline (real outline kept for forced-colors)

## Borders & radii
- var(--border) — structure, dividers
- var(--border-strong) — emphasis edges, dashed slots/chips, crop marks
- var(--border-control) — the boundary of every unselected control (3:1 floor)
- var(--r-xs) 4 · var(--r-md) 12 · var(--r-lg) 16 · var(--r-pill) 999

## Elevation & material
- var(--shadow-card) — artboard frames
- var(--shadow-card-top) — elevated in-frame cards (the even lit ring)
- var(--shadow-overlay-up) — the sticky rail (bottom-docked cast)

## Controls & progress
- var(--h-control-lg) — the document CTA height
- var(--royal-400) — SteppedProgress done segments
- var(--live-400) — the 18+ crest ring (regulator chrome, per the live footer)
- var(--accent-soft) + var(--accent-300) — active bottom-nav capsule (as shipped)

## Deliberately not used
- --teal-* (deprecated alias ramp) · --warning-* (a refusal has earned nothing — F3)
- --danger-* (nothing on these screens is a fault) · --glow-* · --g-jackpot
- --gilt-reeding (win-seal rim only; no win is drawn in this set)
- any motion/easing token (static artboards) · any light-mode anything
