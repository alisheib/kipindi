# Maswali Millionea — design handover

**Date: 2026-08-28.** Three screen sets and one glyph set for the Maswali Millionea weekly
jackpot, composed entirely from the frozen 50pick design system.

**Where a figure here disagrees with the live repo, the live repo wins.**

## What is in here

```
README.md                    this file
DECISIONS.md                 every design decision and why · the gold-vs-mono verdict
TOKENS-USED.md               every token referenced, as var(--name), grouped by surface
OPEN-QUESTIONS.md            what needs an answer from you · the 1024–1279 band notes
artboards/                   one PNG per frame
glyphs/                      millionea.svg · supa.svg · mini.svg + preview sheets
```

## Frame index

| File | Frame |
|---|---|
| `A-slip-partial-360-sw.png` | The full slip at 360, Swahili, 4/10 answered — the hero frame |
| `A-slip-fold-360-sw.png` | The 360×720 viewport on load: countdown above the fold, pay + progress pinned |
| `A-slip-empty-360-sw.png` | Nothing answered |
| `A-slip-refusal-360-sw.png` | Incomplete slip refused: reason + next step |
| `A-slip-ready-360-sw.png` | 10/10 answered, pay armed (the one gold moment on the page) |
| `A-slip-768-sw.png` | The slip at 768: question beside controls |
| `B-receipt-360-sw.png` | The loss receipt, 6/10, receipt tier (560) |
| `B-summary-row-360-sw.png` | The list row the receipt opens from — same three facts, by construction |
| `C-figure-gold-360-en.png` | The pool figure in struck gold — what every competitor does |
| `C-figure-mono-360-en.png` | The pool figure in neutral mono ink — what the rulebook requires · **ship this** |
| `C-figure-earned-360-en.png` | Where gold IS correct: a real settled payout |
| `C-figure-coldstart-360-en.png` | No tickets sold yet: em-dash + labelled state (law 4) |

Naming note: the brief's `<set>-<surface>-<breakpoint>-<locale>` scheme is extended with a
state segment in the surface position (`A-slip-partial-…`), because Set A ships four states
of one surface.

## Working sources

The PNGs are records. The living artboards are HTML at the project root —
`A-slip.dc.html`, `B-receipt.dc.html`, `C-money-figure.dc.html`, `D-tier-glyphs.dc.html` —
each of which links `tokens-locked.css` (a verbatim copy of the sent file, for rendering
only — it is not a second token file to merge) and styles every element inline with
`var(--token)` references. A `showNotes` toggle hides the annotation rail for clean review.

## Acceptance self-check (against the brief's list)

1. Every colour resolves to a token in tokens-LOCKED.css — audited mechanically; see TOKENS-USED.md.
2. No gilt on any unearned figure — the pool is neutral mono; gilt appears on the armed
   money-commit button, a settled payout, and C1's argument frame only.
3. Zero horizontal overflow at 360; all controls ≥ 44px.
4. Slip designed in Swahili; longest row 93 chars; control labels prove ≥ 2.25× (HAPANA in a
   half-width 360 control uses under half the room).
5. Ink pairs are the system's own gated pairs on their shipped surfaces (bg / elevated / overlay / panel).
6. No emoji · no light variant · no new colour family · no sub-brand · no new stylesheet.
7. Glyphs: 24-grid, 1.9 stroke, round caps/joins, fill="none", currentColor; proven at 14px.
8. Loss receipt on the 560 receipt tier; no celebration vocabulary anywhere on it.
