# LANDING-TEN — the landing page's acceptance gate

> **What this is.** `/` on www.50pick.tz is the one surface every new player sees. A five-critic
> review scored it 7.2/10. The work to close that gap produced **an instrument, not a list of
> fixes** — `npm run qa:landing-ten`. The fixes were the easy half; the gate is the deliverable,
> because it is what stops the next regression.
>
> **Read this before touching the landing page, and before trusting a green gate.**

## Running it

```
npm run qa:landing-ten                        # the whole matrix, against production
node scripts/qa/landing-ten.mjs --cell=<id>   # one cell
RED=V7 node scripts/qa/landing-ten.mjs --red --cell=base-1280-sw   # prove a class can fail
```

It measures **production**, deliberately. The local tree has no settlements, no resolved markets
and short handles, so several of these defects cannot reproduce there — and a claim about what a
page *shows* is a claim about its **content**. Frames land in `.qa-shots/landing-ten/`
(gitignored); `gate.json` beside them carries per-class examples, which the console summary does
not print for counted violations.

Signed-in cells need `.env.qa.local` (gitignored) with `QA_MOBILE01_PASSWORD`. ⚠️ **One session
per account** — a second login revokes the first, so nobody else may be signed in as `mobile01`
while the sweep runs.

## The matrix

61 cells: 11 widths × 3 locales, plus 4 widths × 6 states (first visit · compact · reduced motion
· no-JS · client hop · signed in), plus 2 landscape and 2 zoom cells.

`clienthop` exists because a hard `goto` **never paints `loading.tsx`** — Next's route-level
skeletons render only on a client-side navigation, so a harness that always navigates straight to
a URL certifies a page it has never seen in its loading state.

## ⛔ Rules the gate itself must obey

This codebase has been burned by every one of these:

- **A red control must measure a DELTA**, clean vs planted, and report three verdicts —
  PROVED / BLIND / INCONCLUSIVE. "It went red" is not enough: while one section fails for another
  reason, a control appears to work whether or not it does.
- **A failed read is not a zero.** An errored cell is reported *unmeasured*, never clean.
- **Look at the frames.** The topic-tile defect was invisible to every box measurement and obvious
  in a picture. So was the notice bar that V7 wrongly condemned.
- **Measure animated things with motion alive** — the card sparkline is a draw-on and reads as
  undrawn when frozen.
- **Order of checks is part of the instrument.** V9 focuses every interactive element, which starts
  each one's focus transition; V10 ran afterwards and reported those transitions as the page's
  fault — 3 per cell, in 49 cells.
- **Never hold a bar nobody sets.** Inventing a 44px tap floor against the platform's documented
  `--tap-min: 40` produced 784 false violations.

## What the classes are

| | Class | Measured as |
|---|---|---|
| V1 | Horizontal overflow | `max(documentElement, body).scrollWidth > innerWidth + 1`, naming which box saw it |
| V2 | Clipped text | `scrollWidth > clientWidth` on a text-bearing element |
| V3 | Occlusion | a fixed overlay covering a price, CTA or figure, sampled across the row |
| V4 | Tap reach | reach under the page's own `--tap-min`, including `::after` extensions |
| V5 | Contrast | below AA, via a 1×1 canvas so oklch/color-mix survive, self-tested at 21:1 first |
| V6 | Ragged grid | row-mates differing in height; orphan tiles |
| V7 | Measure | over 75 characters per line **and** a line longer than any reading column |
| V8/V8b | Untranslated / lone-glyph line | a string identical across locales; a heading's last line a single token |
| V9 | Focus | no visible ring, or a ring clipped by an ancestor |
| V10 | Motion | frozen mid-animation, invisible after settle, or re-rising after being readable |
| V11 | Dead states | `TZS 0`; a 0%/100% price leading the page |
| V12 | Settled honesty | a refund word over a market that was decided and simply had no pool |
| V14 | Renders without JS | the page paints with scripting disabled |

## Known gaps — stated, not implied

- **Android text scaling is uncovered by any driver on this machine.** Shrinking the CSS viewport
  models browser *zoom*; Android leaves the viewport at 360 and scales the text. The two zoom cells
  are honestly labelled as zoom. `zoom-200` (180 CSS px) is **informational, not gated** — WCAG
  1.4.10 Reflow sets **320**, which this matrix covers in all three locales and which is clean.
- The gate sees the first-visit primer's **first card only**; the card-3 defect was found by hand.
- **V6 is structurally blind to single-column grids** (`if (maxPerRow < 2) continue;`), and the gate
  **reads no price**, which is why the hero's degeneracy defect had to be caught by eye.

## ⛔ NOT ENGINEERING WORK — owner decisions

The gate does not reach zero, and the remainder is not code:

- **V3 — the chat bubble over live prices.** Re-measured across four routes: the landing hero is
  the *least* important instance. On `/markets` it covers 100% of a card's outcome cap and 16% of a
  `HAPANA @ 12%` bet button at 414. Every remedy is a visible product trade — a right gutter moves
  every price off the right edge on every phone; auto-hiding buries the support entry point; moving
  it collides elsewhere, because a viewport-fixed 44px square over a scrolling board can sit on any
  row.
- **V14 — the page does not render without JavaScript.** With JS disabled the landing paints only
  header, placeholder card, rail and footer — **2,108px against 7,361px**. The content is in the
  HTML but sits behind a streaming Suspense boundary created by `loading.tsx` whose swap script
  never runs. Removing `loading.tsx` would fix it and would cost the client-side navigation
  skeletons.

⚠️ The hero **rotates markets**, so any percentage pinned to a specific hero row is a snapshot.

## Dormant, not wrong — do not "fix"

After the ticker was removed by owner instruction, the `.ticker-viewport` / `.ticker-copy-dup` CSS
and the `liveTickerLabel` keys in all three locales are **dormant**. `dead-css` stays green because
`live-ticker.tsx` and `getTickerFeed` are deliberately still in the tree. A future session must not
"repair" a strip nobody renders.

## Instrument defects found so far, and how

**None was found by re-reading my own code.** Four came from building the RED controls before the
fixes, three from a peer measuring my claims, two from a critic fetching served HTML, one from
running the same cell three times:

`documentElement.scrollWidth` pinned at 360 while `body` went to 720 · a RED criterion that counted
instead of differencing · plants that missed silently · checks skipping every element with a child
element · the skip link scored as clipped text · a 44px tap floor invented against a documented 40
· V6 comparing against a container median · lines counted by height ÷ line-height · a focus ring
read mid-transition · contrast blind to gradients · V7 condemning a notice bar of the right shape ·
**the clienthop cell answering differently on the same commit.**

That last one is the one to internalise: run three times on one commit it gave clean, clean, then
V5:2 + V9:17 — seventeen findings about `/markets` chrome, because it waited a blind 700ms for a
route change instead of waiting for the route to commit. **Its two clean readings were luck.** A
gate that answers differently on identical input certifies nothing, so a cell that cannot establish
what it is looking at must throw and be counted unmeasured.

## Two regressions shipped here whose diffs read as improvements

- `openGraph: { url: "/" }` **deleted the landing page's share card.** Next merges `metadata` per
  FIELD, not deeply, so a partial `openGraph` replaces the parent object whole. The same shape was
  live on four more routes (`/results`, `/leaderboard`, `/proposals`, `/auth/register`), each
  emitting og:image and og:title — because each sets them itself — and **no** og:locale,
  og:site_name or og:type. ⛔ Never write a bare `openGraph` object in a route; spread
  `ROOT_OPEN_GRAPH`.
- Rendering `null` for a silent settled row **removed the grid item and collapsed the row.** The
  repair (a non-breaking space) fixed the row's HEIGHT and not its WIDTH: every settled row is its
  own grid, so the silent row's money track stayed at 7.81px against 148px and slid the settling
  source 140px out of column.

## The hero's price-quality floor

The hero board was showing a 0% market and two unpriced rows to a licensed real-money audience
while the open book held nine contested markets. The lens ordered only the *closing-today* group by
contestedness; only two markets close today, so three of the five seats came from a fallback tail
sorted by closing time with no price filter at all.

The fix is a **floor, not a wider window**: `hero.ts` partitions by degeneracy (0 contested,
1 priced at 0%/100%, 2 unpriced) **before** position, so a degenerate row takes a seat only once
every contested market is already on screen — and the board is never short, because degenerate rows
are still shown, just last.

⚠️ `hero-contract` §5b's fixture was **the one shape that cannot fail**: its tail defaulted to
10k/10k, i.e. contested, so it could not tell a floor from its absence. It now has an unpriced tail,
and §5c carries a CONTROL asserting the soonest-closing three are *not* the first three. Removing
the floor fails three of §5c's four assertions.
