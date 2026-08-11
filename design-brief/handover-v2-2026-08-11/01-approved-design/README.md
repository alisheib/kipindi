# APPROVED — locked reference

Everything in this folder is signed off and in production. It is here so you know **exactly what not
to change**, and so your layouts hold the real component rather than an approximation.

⚠️ **The three source files are no longer copied into this folder** (removed 2026-08-11 — a
package links, it never bundles; see `../SOURCES.md`). They are LOCKED all the same. Read them
at their one real home:

| Component | Status | The one real home |
|---|---|---|
| market card | **LOCKED** — use as a black box. You choose how many and in what grid; not what is inside one. | `src/components/markets/market-card.tsx` |
| side picker | **LOCKED** — the YES/NO control. Colour, fill, size, radius, label format, arrangement. | `src/components/markets/side-picker.tsx` |
| conviction bar | **LOCKED** — track, gradient, gold needle, glow, sweep. | `src/components/layout/needle.css` |
| `screens/APPROVED-market-card-live.jpg` | What a live card looks like. Reproduce this. |
| `screens/APPROVED-market-card-closed.jpg` | The closed state. |
| `screens/APPROVED-conviction-bar.jpg` | The bar, close up. |
| `screens/APPROVED-yes-no-buttons.jpg` | The YES/NO pair, close up. |
| `screens/APPROVED-card-grid.jpg` | Six cards in the production grid. |

## If reproducing the card exactly is impractical in flat HTML

Use a grey placeholder box of the correct dimensions labelled `[APPROVED MARKET CARD — 1 of N]`.

**A placeholder is better than a redesign.** We are looking at your composition, not at your version
of our card.
