# COMPONENTS.md — every new component, to the pixel

Nine new components. Everything else on these screens already exists in the codebase.

For each: the exact box, the exact tokens, every state, and the markup contract. Where a value is a
raw number (`44px`, `14deg`, `42s`) it is a real constant, not a token — the token file has no
token for it and one should not be added.

**Naming convention below is `kebab-case` for clarity; use whatever the codebase uses.**

---

## 1. `<AggregateConviction>` — the whole board as one instrument

The single most important new element. It is the conviction bar at page scale, and it is the reason
the hero could not belong to another product: the same instrument appears at three magnifications —
**whole board → one market → one position** — and each is the same object larger.

| Property | Value |
|---|---|
| Container | `max-width: 620px` (no cap at ≤560) |
| Eyebrow | `The whole board, right now` · `--type-micro` mono 700 · `.18em` · `--text-subtle` · preceded by the 2 × 13px gilt tick (see §9) |
| Track | `height: 10px` · `--r-pill` · `background: var(--bar-fill-no)` · `border: 1px solid var(--bar-track-border)` · `margin-block: var(--sp-3)` |
| Fill | `position: absolute; inset: 0 auto 0 0` · `width: <yesShare>%` · `--r-pill` · `background: var(--bar-fill-yes)` · `box-shadow: var(--bar-glow-yes)` |
| Needle | `position: absolute; left: <yesShare>%; top: 50%` · `5 × 24px` · `--r-pill` · `background: var(--bar-needle)` · `box-shadow: 0 0 10px var(--bar-needle-glow)` · `transform: translate(-50%,-50%) rotate(14deg)` |
| Readout | `--type-small` mono · `--text-subtle`. YES figure in `--yes-400` 700, NO figure in `--no-300`, then the qualifier in `--text-subtle` |
| Readout copy | `54% YES · 46% NO — every open market, weighted by the money on it` |
| At 390 | readout drops to `--type-micro`, `line-height: 1.6` |

**The number must be computed: volume-weighted YES share across all open markets.** A hardcoded
figure here is worse than no bar at all — it makes the page's most confident claim its only false
one.

```
props: { yesShare: number }   // 0–100, one decimal max, rounded for display
```

---

## 2. `<QuestionBoard>` / `<QuestionRow>` — the hero

**Board:** `border-top: 1px solid var(--border-royal)`, rows separated by `1px solid var(--border)`.

**Row at ≥1025:**

| Property | Value |
|---|---|
| Grid | `grid-template-columns: auto 1fr auto auto` · `gap: var(--sp-5)` · `align-items: center` |
| Box | `min-height: 88px` · `padding-block: var(--sp-4)` · `position: relative` |
| Glyph | 20px, `--text-faint` → `--brand-300` on row hover |
| Question | `--type-h2` (24px) Sora 700 · `line-height: 1.25` · `letter-spacing: -.01em` · `--text` |
| Pool | `--type-small` mono · `--text-faint` · `white-space: nowrap` |
| Price | `--type-h1` (32px) mono 700 · `--gilt` · `font-variant-numeric: tabular-nums`; the `% YES` suffix `--type-micro` `--text-subtle`, `margin-left: 2px` |
| Lean rule | `position: absolute; left: 0; bottom: -1px` · `height: 2px` · `width: <pct>%` · `background: var(--bar-fill-yes)` · `--r-pill` |
| Hover | `background: var(--bg-overlay)` · `padding-inline: var(--sp-4)` · 140ms ease-out |
| Focus | `outline: 2px solid var(--border-focus)` · `outline-offset: -2px` |

**Row at ≤1024** — three areas over two lines:

```css
grid-template-columns: auto 1fr auto;
grid-template-areas: "i q p" ". s p";
gap: var(--sp-2) var(--sp-3);
min-height: 76px;
```

Glyph `grid-area: i`, `align-self: start`, `margin-top: 4px`. Question `q`, drops to `--type-h3`
(`--type-h4` at ≤560), `line-height: 1.35`. Pool `s`, `--type-micro`. Price `p`, `--type-h2`,
`align-self: center`. Hover loses the padding shift.

**Four rows on the landing page**, ordered by closing time. They must come from the same query as
the hero card.

---

## 3. `<FilterChip>` — the atom of the whole discovery layer

One control, six states. Everything else in the bar is a variation of it.

**The governing rule: only the SELECTED chip carries an outline.** An unselected chip is text on
transparent. Fifteen outlined capsules in one bar was the single biggest source of the "chunky"
criticism — the eye cannot find what is actually on when everything is ringed. With this rule the
active filters are the only bordered objects on the row, and the bar reads in one pass.

| Property | Value |
|---|---|
| Box | `min-height: 44px` · `padding: 0 var(--sp-3)` unselected, `0 var(--sp-4)` selected · `--r-pill` · `display: inline-flex; align-items: center; justify-content: center; gap: 6px` |
| Type | `--type-small` (13px) 600 · `white-space: nowrap` |
| Count suffix | `--type-micro` mono 700 · `--text-faint` (→ `--brand-200` when selected) |
| Transition | `background, border-color, color, box-shadow` all `140ms` ease-out |

| State | Border | Background | Ink |
|---|---|---|---|
| Default | `1px solid transparent` — **no visible outline** | transparent | `--text-muted` |
| Hover | transparent | `--bg-overlay` | `--text` |
| Focus-visible | as current + `outline: 2px solid var(--border-focus); outline-offset: 2px` | | |
| Active (press) | transparent | `--bg-inset` + `transform: translateY(1px)` | `--text` |
| **Selected** | `1px var(--brand-400)` | `--pill-active` + `box-shadow: var(--glow-selected)` | `--text` |
| Disabled | `1px var(--border)` | `--surface-disabled` + `opacity: .45` | `--text-disabled`, `cursor: not-allowed` |

```
props: { label, count?, icon?, pressed, disabled?, onToggle }
markup: <button type="button" aria-pressed={pressed}>
```

All six drawn in `layouts/06-states.html` §06a.

---

## 4. `<StatusSegmented>`

| Property | Value |
|---|---|
| Track | `display: inline-flex` · `padding: 3px` · `gap: 3px` · `--r-pill` · `background: var(--wash-inset)` · `border: 1px solid var(--border-control)` · `box-shadow: var(--edge-shade)` |
| Outer height | **52px** (44 + 2×3 padding + 2×1 border) |
| Button | `min-height: 44px` · `padding: 0 var(--sp-4)` · `--r-pill` · `--type-small` 600 · `--text-subtle` |
| Hover | `background: var(--bg-overlay)` · `color: var(--text)` |
| Selected | `background: var(--pill-active)` · `color: var(--text)` · `box-shadow: var(--edge-lit)` |
| Count | `--type-micro` mono 700 · `--text-faint` → `--brand-200` when selected · `margin-left: 6px` |
| Watching option | prefixes a 13px star, `fill: var(--gilt)` when that option is selected, `fill: none` otherwise |

**Options and defaults:** `Open` (default) · `Closing today` · `New` · `Watching` · `All`.
`Open` being the default is the entire mechanism that removes closed markets from the default view —
visibly, and undoable in one tap.

**Keyboard — WAI-ARIA radiogroup:**

```
role="radiogroup" on the track, role="radio" + aria-checked on each button
tabindex: 0 on the checked option, -1 on the rest   (roving tabindex)
ArrowRight / ArrowDown → next, wrapping
ArrowLeft  / ArrowUp   → previous, wrapping
Home → first · End → last
```

---

## 5. `<SortControl>` — two fused halves

⚠️ **This control carries no gold.** See `TOKENS.md` §1.

**Left half (the trigger)**

| Property | Value |
|---|---|
| Box | `min-height: 44px` · `padding: 0 var(--sp-3) 0 var(--sp-4)` · `border-radius: var(--r-md) 0 0 var(--r-md)` · `border: 1px solid var(--border-control)` · `border-right: 0` |
| Fill | `var(--wash-inset)` + `box-shadow: var(--edge-shade)` |
| Key | `SORT` + a 14px glyph · `--type-micro` mono 700 · `.16em` caps · `--text-faint` · `flex: none` — **never truncates** |
| Value | `--type-small` 600 · `--text` · `overflow: hidden; text-overflow: ellipsis` |
| Cap | `max-width: 340px` (210px ≤1024) |
| Hover | `background: var(--bg-overlay)` · `border-color: var(--border-royal)` |

**Right half (direction)**

`44 × 44` · `border-radius: 0 var(--r-md) var(--r-md) 0` · same border and fill · `--text-muted`.
The arrow glyph rotates `0deg → 180deg` over **200ms glide**.
`aria-label` swaps between *"Sorted ascending — switch to descending"* and its inverse.

**Menu** — rung 2:

`position: absolute; top: 52px; left: 0` · `min-width: 300px` · `padding: var(--sp-2)` · `--r-md` ·
`background: var(--wash-float)` · `box-shadow: var(--elev-float)` · `z-index: 60`.
Group label `--type-micro` mono 700 `.16em` `--text-faint`, `padding: 8px 12px 4px`.
Rows `min-height: 44px` · `padding: 0 var(--sp-3)` · `--r-sm` · `--type-small`; selected gets
`--pill-active` + `--text`. Each row carries a mono hint of the range it produces, `--type-micro`
`--text-faint`.

| id | Label | Hint | Natural direction |
|---|---|---|---|
| `closing` | Closing soonest | `5h → 22d` | ascending |
| `pool` | Biggest pool | `TZS 248k → 4k` | descending |
| `people` | Most predictors | `31 → 2` | descending |
| `close` | Closest call | `nearest 50%` | ascending |
| `move` | Biggest move | `24h swing` | descending |
| `new` | Newest first | `added today` | ascending |

Choosing a new sort **resets `sortDir` to null** (its natural direction). Both `sort` and `sortDir`
persist.

---

## 6. ~~`<FilterToken>`~~ — **cut. Do not build it.**

An earlier draft put a row of removable "Filtered by" tokens beneath the bar:
`STATUS Open · ODDS 25–75% · POOL TZS 10k+`.

**It was deleted, and it should stay deleted.** It repeated information the pressed chips already
carried, three feet from the chips themselves, and it cost 68px of vertical space to say the same
thing twice. Once unselected chips lost their outlines, the selected ones became the only bordered
objects in the bar — which is a stronger, closer and free version of exactly what the token row was
for.

`Clear all` moved up into the bar's second row, where the thing it clears actually is.

**If you are tempted to reinstate it:** the case for tokens is that a user cannot remove a filter
without finding the chip that set it. That case does not hold here — the bar is sticky, 104px tall,
and every chip is on screen whenever the tokens would have been.

## 7. `<TopicTile>`

| Property | Value |
|---|---|
| Grid | `repeat(6, 1fr)` · `gap: var(--sp-3)`. Tiles 1–2 span 3 columns, `min-height: 84px`, name at `--type-h3`, `flex-wrap: nowrap`. Tiles 3–8 `min-height: 64px` |
| Box | `position: relative; overflow: hidden` · `display: flex; flex-wrap: wrap` · `gap: 6px var(--sp-3)` · `padding: var(--sp-3) var(--sp-4)` · `border: 1px solid var(--border)` · `--r-md` · `background: var(--bg-overlay)` |
| Glyph | 18px `--text-faint` → `--brand-300` on hover |
| Name | `--type-h4` Sora 600 `--text` · `flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap` |
| Meta | `--type-micro` mono 700 · live count in `--yes-400`, dot at `opacity .5`, pool in `--text-faint` · **`flex: none`** |
| Meta on narrow tiles | `flex-basis: 100%` · `padding-left: calc(18px + var(--sp-3))` — its own row |
| Lean rule | `position: absolute; left: 0; bottom: 0` · `height: 2px` · `width: var(--lean)` · `background: var(--bar-fill-yes)` · `opacity: .6` → 1 on hover · `transition: width 340ms glide` |
| Hover | `border-color: var(--border-royal)` · `background: var(--bg-elevated)` · `transform: translateY(-1px)` |

⚠️ **`flex: none` on the meta and `text-overflow: ellipsis` on the name are load-bearing.** Without
both, a 195px tile with a Swahili label (`Hali ya hewa` is nearly twice `Weather`) runs the meta
backwards over the name. This exact collision happened once and was fixed at the constraint.

---

## 8. `<Pager>` — one contract, every grid

| Property | Value |
|---|---|
| Box | `display: flex; flex-direction: column; align-items: center; gap: var(--sp-3)` · `padding-top: var(--rh-tight)` |
| Count line | `--type-small` mono · `--text-faint` · `tabular-nums`; the two numbers in `--text-muted` 700 · `aria-live="polite"` |
| Button | `min-height: 44px` · `padding: 0 var(--sp-6)` · `--r-md` · `1px var(--border-control)` · transparent · `--type-h4` 600; hover `--bg-overlay` + `--border-royal`. At 390, `width: 100%` |

| Rule | Value |
|---|---|
| Page size | **12** at 2–3 columns, **6** at one — always whole rows, never an orphan |
| Total | **is** the filter-bar count. Same value, same source. They cannot drift |
| On any filter / sort / search change | reset to page 1 |
| Button label | `Load N more`, N = `min(pageSize, remaining)` — never promises more than exists |
| End of set | a sentence, not a dead button: `Showing 41 of 41 — that is every market matching these filters` |
| Under one page | render nothing |
| Infinite scroll | **not used** — strands the footer, loses your place on return |

All four states drawn in `layouts/06-states.html` §06j.

---

## 9. `<Eyebrow>` — the needle tick

Small, but it is the page's signature and it appears on every section.

```css
display: inline-flex; align-items: center; gap: var(--sp-3);
font: 700 var(--type-micro)/1 var(--font-mono);
letter-spacing: .18em; text-transform: uppercase; color: var(--text-subtle);

&::before {
  content: ""; flex: none;
  width: 2px; height: 13px;
  border-radius: var(--r-pill);
  background: var(--gilt);
  transform: rotate(14deg);      /* the mark's own needle axis */
}
```

**−14° is the mark's needle angle**, measured from the shipped artwork. The same angle appears on
the hero backdrop (`rotate(-14deg)`) and on every conviction needle (`rotate(14deg)`). It is one
device at three scales; do not round it to 15.

---

## 10. `<MarketListRow>` — the compact density

`role="table"` on the container (`1px var(--border)`, `--r-lg`, `--wash-raised`, `--elev-raised`,
`overflow: hidden`), `role="row"` per market, `role="cell"` per field.

**Header row:** `--bg-overlay` · `1px var(--border)` bottom · `--type-micro` mono 700 `.16em` caps
`--text-faint` · `padding: 10px 16px`.

| Cell | Width | Hides below | Content |
|---|---|---|---|
| Watch | 44 | — | the star, §11 |
| Market | `flex: 1` | — | glyph + question (`--type-body` Sora 600, ellipsis) + HOT chip; below it a 72 × 5px mini conviction bar, predictor count, and — at ≤720 only — pool and time |
| Trend | 96 | 1024 | the sparkline, `--aqua-400`, `stroke-width: 1.5`, `vector-effect: non-scaling-stroke` |
| YES | 56 | — | `--type-h3` mono 700 `--yes-400` tabular; move below it in `--type-micro` |
| Pool | 104 | 720 | `--type-small` mono `--text-muted`, right |
| Closes | 78 | 720 | `--type-small` mono `--yes-300`, right, `aria-live="off"` |
| Take a side | 144 | 1024 | YES / NO, each `min-width: 64px`, `height: 38px` |

Row: `display: flex; align-items: center; gap: 16px` (8 at ≤720) · `padding: 10px 16px` (10px at
≤720) · `1px var(--border)` bottom · hover `--bg-overlay`.

**Why this exists:** 394px cards show 9 markets; a coupon row shows 30. Betting is a scanning task
before it is a browsing task, and every serious competitor ships a list. Density is persisted.

---

## 11. `<WatchStar>`

`44 × 44` · `--r-pill` · off = `--text-faint` outline, `fill: none` · on = `--gilt`, `fill: var(--gilt)` ·
hover `background: var(--bg-overlay)`, `color: var(--gilt)` · `transition: color, background 140ms`.

`aria-pressed` + an `aria-label` that names the market: `Watch: <question>` / `Stop watching: <question>`.

Persisted to `localStorage` under `50pick.discovery.v1` → `watch: string[]`. Surfaced as the
`Watching` status option, which has **its own empty state**: *"You are not watching any market yet —
tap the star on any market and it stays here, across sessions, on this device."*

Gold is correct here under the palette rule: a starred market is **possession**, not a view filter.

---

## 12. `<SearchTypeahead>`

Field: `--h-input` (44) · `padding-inline: var(--sp-4)` · `--r-md` · `--wash-inset` ·
`1px var(--border-control)` → `--border-royal` while open · `box-shadow: var(--edge-shade)`.
Input `--type-body`; placeholder `--text-faint`. A `/` keycap sits at the right in `--type-micro`
mono inside a `--r-xs` `1px var(--border)` box. A clear button (34 × 34) appears once there is a query.

Menu: rung 2, `top: 52px`, full field width, `max-height: 340px; overflow: auto`.
Rows `min-height: 44px` · `--r-sm` · `--type-small`; highlighted row `--pill-active` + `--text`.
Each row: a 24px glyph column, the label (ellipsis), and the kind in `--type-micro` mono `--text-faint`.

| Kind | Behaviour on pick |
|---|---|
| `Topic` | applies the topic filter and clears the query |
| `Source` | sets the query to the source name |
| `Market` | sets the query to the question |
| `Popular` | shown when the query is empty — three markets plus three topics |

`role="combobox"` with `aria-expanded` and `aria-autocomplete="list"`. ↓/↑ move, Enter applies,
Escape closes. `/` anywhere on the page focuses the field (unless focus is already in an input).

---

## 13. The bar's condense-on-scroll

Past `scrollY > 300`, row 2 collapses and a `N filters` pill appears in row 1 which scrolls the page
back to top to reopen it. Fixed chrome drops **160px → 108px**.

```css
/* wrapper */
display: grid;
grid-template-rows: 1fr;              /* → 0fr when condensed */
overflow: hidden;
transition: grid-template-rows 220ms cubic-bezier(.22,1,.36,1), opacity 160ms ease-out;

/* inner */
min-height: 0;                        /* required, or the grid row will not collapse */
```

⚠️ **Do not animate `max-height`.** It eases toward a number the content never reaches, so the
curve lies and the last 40% of the animation is empty. `grid-template-rows: 1fr → 0fr` tweens the
real height.

---

## 14. Header, in full

| Property | Value |
|---|---|
| Bar | `height: 56px` · `position: sticky; top: 0; z-index: 30` · `background: var(--panel)` **opaque** · `border-bottom: 1px solid var(--border)` |
| Cast | none at rest → `var(--shadow-2)` when `scrollY > 0`, 140ms ease-out |
| Inner | `max-width: var(--w-board)` · `padding-inline: var(--sp-6)` (16 at ≤720) · `display: flex; align-items: center; gap: var(--sp-3)` |
| Lockup | `brand/lockup-horizontal.svg`, 132 × 29, inside a `min-height: 44px` link |

**The navigation model — three tiers, one meaning each.**

| Tier | Shape | Rest | Current | Members |
|---|---|---|---|---|
| **Destination** | no border · `--r-sm` · 44px · 13.5px Inter 500 | `--text-subtle` | `background: var(--pill-active)`, `--text`, weight 600 | Markets · Up &amp; Down · Live · Results · Top |
| **Utility control** | **bordered** `--r-sm` · 44 × 44 min · `1px var(--border-control)` | `--text-muted` | — | Language |
| **Action** | `--r-pill` · 44px · `--type-small` 600 | ghost: `1px var(--border-control)` · filled: `--brand-600`/`--brand-400`/`--edge-lit` | — | Sign in · Sign up |

Destination hover: `background: var(--bg-overlay)`, `color: var(--text)`, 140ms.

**Up &amp; Down is a destination**, so it takes destination geometry. Its distinction is
`color: var(--brand-300)` plus a `::before` dot — `5 × 5px`, `--r-pill`, `background: var(--gilt)`,
`flex: none`. It previously used `--r-pill`, which made shape mean both *product line* and
*account action*; shape now has exactly one meaning.

**Language menu**

`position: absolute; top: 52px; right: 0` · `min-width: 196px` · rung 2.
Rows `min-height: 44px` · `--r-sm` · `--type-small` · `--text-muted`; current row
`--pill-active` + `--text` and a `--gilt` tick in a fixed 16px column; every row shows its code
(`EN` / `SW` / `ZH`) in `--type-micro` mono `--text-faint`.

⚠️ **`role="option"` must be a direct child of `role="listbox"`.** The previous markup nested each
option inside an `<li>`, which breaks the accessibility tree. Use `<div role="listbox">` with
`<button role="option">` children — no list wrapper.

**Skip link:** `Skip to markets` → `#main`. `position: absolute; left: var(--sp-4); top: -60px`,
moving to `top: var(--sp-2)` on `:focus`, 140ms. `--brand-600` fill, `--pearl-50` ink, 44px.

**Mobile rail (≤1024)** — the header nav yields to a bottom rail:

`position: sticky; bottom: 0; z-index: 40` · `display: grid; grid-template-columns: repeat(5, 1fr)` ·
`background: var(--panel)` · `border-top: 1px solid var(--border)` · `box-shadow: var(--shadow-overlay-up)` ·
`padding-bottom: env(safe-area-inset-bottom, 0px)`.

Item: `min-height: 64px` · `padding-top: 6px` · `--type-micro` 600 · `--text-subtle`, containing a
`44 × 26px` `.pip` (`--r-pill`) around a 20px glyph, label beneath.
**Current: `background: var(--pill-active)` + `box-shadow: var(--edge-lit)` on the pip, `--text` label
— the same active language as the desktop bar.**

Five slots: Markets · Up &amp; Down · Live · Results · More. **Auth is never in the rail** — it lives
in the header at every width. The previous rail used `--aqua-300` (a second active language) and
carried four items, leaving Results and Top unreachable on a phone.

---

## 15. Live ticker

`height: 34px` · `background: var(--bg-overlay)` · `border-bottom: 1px solid var(--border)` ·
`overflow: hidden`.

`LIVE` cap: `--type-micro` mono 700 `.18em` caps `--danger-fg`, a 5px `--live-400` dot,
`padding-inline: var(--sp-6)`, `border-right: 1px solid var(--border)`, full height.

Viewport masked on both edges — **masked, not clipped**:

```css
mask-image: linear-gradient(90deg, transparent 0, var(--text) 32px,
                                    var(--text) calc(100% - 48px), transparent 100%);
```

(`--text` is used here as an opaque mask stop, which is why the file still contains no colour literal.)

Run: duplicated content, `display: flex; gap: var(--sp-8)`, `--type-micro` mono `--text-subtle`,
`animation: translateX(0 → -50%) 42s linear infinite`, `will-change: transform`.
**Paused on `:hover` and `:focus-within`**, so a keyboard user can read it.
Under reduced motion: `animation: none; transform: none` — the masks stay, so it never hard-clips.

This fixes the shipped bug where a `ticker-scroll` keyframe is declared but the element computes to
`animation: none`, leaving the strip static and hard-clipping mid-word at 390.

---

## 16. Countdown

A real clock, not a label.

| Remaining | Format | Tick |
|---|---|---|
| < 1 hour | `12m 04s left` | **1 Hz** |
| < 24 hours | `4h 12m left` | 15 s |
| ≥ 24 hours | `5d left` | 15 s |

**One self-rescheduling interval for the whole board** — it runs at 1 Hz only while some market is
inside the last hour, and drops to 15 s otherwise. A per-second reconcile of twelve cards is not
free on a mid-range Android.

`aria-live="off"` on the time node, or a screen reader reads the seconds aloud.

**It keeps ticking under `prefers-reduced-motion`.** It is data on a money surface; freezing a clock
that governs whether a bet can still be placed is a correctness bug, not a kindness. If your
accessibility review disagrees, drop to a 60-second refresh rather than stopping it.

---

## 17. Pool count-up

0 → total over **15 steps at 60ms**, cubic ease-out, once on load. Skipped entirely under reduced
motion (check `matchMedia` *before* starting, so the final value renders on frame 1).

⚠️ **Not per-`requestAnimationFrame`.** That produced ~54 full board re-renders in 900ms, during the
most expensive moment of the load, while the ticker was compositing. 15 steps is visually identical
and 72% cheaper.

---

## 18. Section reveal

`IntersectionObserver`, `threshold: 0.12`, `rootMargin: "0px 0px -8% 0px"`, **unobserved after
firing**. Reveals `opacity 0→1`, `translateY(12px)→0`, 340ms glide.

**Progressive:** the script adds a `.js` class to `<html>` itself, and the hidden state is scoped to
`.js [data-reveal]`. A no-JS load renders everything visible. Under reduced motion the script marks
every target visible immediately and never attaches the observer.

---

## 19. Skeleton

Three cards at the **real card geometry** — same `padding: var(--sp-5)`, `--r-lg`, `1px var(--border)`,
`--wash-raised`, `--elev-raised` — with blocks in the exact positions of the chip row, question,
percentage, conviction bar, trader row, YES/NO pair and meta row.

Block: `background: var(--bg-inset)`, `--r-xs`. Sweep: an `::after` at `inset: 0` with
`background: var(--bar-shimmer)`, `translateX(-100% → 100%)`, **1200ms ease-in-out infinite**.
Under reduced motion the `::after` is `display: none` and the flat fill carries the same meaning.

The filter bar stays live and operable throughout; only the grid is replaced.

---

## 20. Empty states — two, deliberately different

They are different failures and must not share a screen.

Shell for both: `display: flex; flex-direction: column; align-items: center; text-align: center` ·
`gap: var(--sp-4)` · `padding: var(--rh-section) var(--sp-6)` · `1px dashed var(--border-control)` ·
`--r-xl` · `background: var(--bg-overlay)`. A 68px `--r-pill` ring: `1px var(--border)`,
`--wash-inset`, 26px `--text-faint` glyph. Heading `--type-h2`; body `--type-body` `--text-muted`
`max-width: 46ch`.

**No match** — the filter row stays on screen above it, and the exits are **computed relaxations with
real counts**, first one primary and the rest ghost:

```
Drop the pool filter  3 markets
Drop the odds filter  3
All topics            9
```

Copy names *why* it is empty: *"Culture is a small topic — three markets are live and none is a
longshot with a pool above TZS 50,000."*

**No search result** — different copy, different exits: `Search all 58 including closed` (primary),
`Suggest this market` (ghost), plus four suggestion chips under a `Try` label. A search miss is a
catalogue gap, not a filter mistake.

**Watching, empty** — a third: *"You are not watching any market yet. Tap the star on any market and
it stays here — across sessions, on this device."*

---

## 21. The 390 filter sheet

`position: fixed; inset: auto 0 0 0` · `z-index: 100` · `background: var(--wash-modal)` ·
`border-radius: var(--r-xl) var(--r-xl) 0 0` · `box-shadow: var(--shadow-overlay-up)` ·
`padding: var(--sp-3) var(--sp-4) var(--sp-5)` · `max-height: 80%; overflow: auto`.

Grab bar `44 × 4px`, `--r-pill`, `--border-strong`, centred, `margin-bottom: var(--sp-4)`.
Scrim: `--bg-overlay` at `opacity .72`, fading in over 200ms linear.
Enter `translateY(100% → 0)` 260ms glide; exit 200ms ease-out.

Groups: Odds, Pool size, Topic (a `1fr 1fr` grid of chips). Sticky footer on `--wash-modal`,
`padding-top: var(--sp-4)`: `Clear` (ghost) and **`Show 9 markets`** (primary) — the primary button
states the outcome, so the sheet never closes into a surprise.

**Sort and status stay outside the sheet, in the bar, at every width.** They answer the first two
questions a punter has and must never cost a tap.

⚠️ Note the up-cast: `--shadow-overlay-up`, not `--shadow-5`. A downward cast on a bottom-docked
panel throws its shadow off-screen.

---

## 22. What you must NOT touch

| Frozen | Where |
|---|---|
| `<MarketCard/>` and everything inside it | `01-approved-design/market-card.tsx` |
| `<SidePicker/>` — the YES/NO control | `01-approved-design/side-picker.tsx` |
| The conviction bar / needle | `01-approved-design/needle.css` |
| Every token | `tokens-LOCKED.css` |
| `<PublicFooter/>` — all licence, helpline and legal copy | `05-current-code/public-footer.tsx` |
| The brand SVGs | `brand/` — reference them, never redraw |

The market card reproduced in `layouts/` is fenced between `FROZEN BLOCK` / `end frozen block`
comments and exists **only** so the composition could be judged with the real object in it. Delete
that block, render `<MarketCard/>`, and nothing outside the fence changes.
