# Handoff: 50pick landing page composition & market discovery

**Prepared 11 August 2026 · round 2 final · Dar es Salaam**

---

## Overview

Two pieces of work on **50pick.tz**, a licensed Tanzanian prediction market:

1. **The public landing page** (`/`) — recomposed. Same seven sections, new hero, new vertical rhythm, the zero-counters removed, "How it works" rewritten and promoted.
2. **The market discovery layer** on `/markets` — a new filter, sort and paging system replacing the left rail.

Nothing else is in scope. The market card, the conviction bar, the YES/NO control, the palette, the type scale and the footer are all **frozen** and must not be modified.

---

## ⚠️ About the design files in this bundle

**The HTML in `layouts/` is a design reference, not production code.** It is a set of flat prototypes showing intended appearance, structure, states and behaviour. It uses hand-written CSS classes purely so the composition can be judged.

**Your task is to recreate these designs in the existing 50pick codebase** — Next.js App Router + React + TypeScript + Tailwind, per `05-current-code/` — using its established components, its `cn()` helper, its Tailwind config and its token layer. Do not port the CSS classes from these files. Do not copy the reproduced market card: the codebase already has `<MarketCard/>`, and it is the authority.

Where this document names a value, it names a **token**. Use the token, never the resolved colour.

---

## Fidelity

**High fidelity.** Final colours, typography, spacing, radii, shadows, motion curves and copy. Every value resolves to a token already in `tokens-LOCKED.css`. Recreate pixel-accurately using the codebase's existing primitives.

The one deliberate exception: **every market, price, pool figure and predictor count in these files is placeholder data.** See §"Data you must wire" below — none of it should ship.

---

## Hard constraints (these were the brief, and they were verified)

| Constraint | Status in the design files |
|---|---|
| No colour literal in any stylesheet — no `#`, `rgb(`, `oklch(`, `hsl(` | **0 matches** across all seven layouts. Brand colours live inside the shipped SVGs, referenced by `<img src>` |
| No token added, changed or re-scoped | **0** |
| No frozen component edited | **0** |
| Every interactive element ≥ 44 × 44 | **0 violations** in new work. 27 remain inside the frozen card — listed, not worked around |
| No type below 10px in new work | **0**. The 9.5/8.5px tier survives only inside the frozen card |
| Reduced-motion behaviour for every animation | defined per row in `MOTION.md` |
| Every deliverable exists at 390 | yes |

---

## Screens / views

### 1. Landing page — `/` (`layouts/01-landing-desktop.html`, `02-landing-mobile.html`)

**Purpose:** convert a first-time visitor by showing what is actually being predicted in Tanzania today, then teaching the mechanic, then proving results are trustworthy.

**Container:** `--w-board` (1280px) centred. Gutter `--sp-6` (24) ≥768, `--sp-4` (16) at 390. Container does **not** grow past 1280 at 1920.

**Vertical rhythm** — four steps only, all derived from `--sp-*`:

```
--rh-tight:   var(--sp-6)              /*  24 — heading → its content */
--rh-close:   var(--sp-12)             /*  48 — two halves of one idea */
--rh-section: calc(var(--sp-12) * 2)   /*  96 — a new idea */
--rh-chapter: calc(var(--sp-12) * 3)   /* 144 — a new act, always with a band edge */
```

Sections carry padding; the observed gap is `A.padding-bottom + B.padding-top`. Resulting **section** gaps top to bottom: **144 · 96 · 96 · 144**, plus one **internal** 48 inside the board section (grid → topic band). At ≤1024 the scale compresses to 122 · 97 · 96 · 123. Two tinted bands (`--bg-overlay`), both at chapter breaks, edged with `--claret-edge`.

#### 1a. Hero — the question board

| Element | Spec |
|---|---|
| Surface | `--hero-grad-warm`, edged top and bottom with `--claret-edge` |
| Backdrop | `brand/mark-color.svg` at 1100px (660 at 390), `opacity: var(--hero-mark-opacity)`, `transform: rotate(-14deg)`. Top-centred, bleeding off both edges. **Geometry and opacity only — never recolour the mark** |
| Eyebrow | `Tanzania · Dar es Salaam · Est. 2026` — `--type-micro` mono 700, `.18em`, `--text-subtle`, preceded by a 2×14px `--gilt` bar at `rotate(14deg)` |
| Headline | `The wisdom of YES & NO.` — `--type-display-1` (60px) Sora 800, `-.022em`, line-height 1.02, `--hero-text-strong`. `YES` → `--hero-yes-accent`, `NO` → `--hero-no-accent`. `--type-display-2` (44) at 390 |
| Proof rail | three figures, mono 700 `--type-display-2`, captions `--type-micro` mono 700 `.16em` `--text-subtle`. **41** (`--yes-400`, preceded by an 8px pip with `--bar-glow-yes`) · **TZS 1,669,000** (`--gilt`) · **247** (`--text`). Separated by 1px `--border` rules, `min-height: 44px`. At 390 the third figure is hidden |
| Aggregate conviction | **New component.** A 620px-max block: eyebrow `The whole board, right now`, then a 10px track — `--bar-fill-no` ground, `--bar-fill-yes` fill to the volume-weighted YES share, 1px `--bar-track-border`, and a 5×24px `--bar-needle` at the fill edge, `rotate(14deg)`, `box-shadow: 0 0 10px var(--bar-needle-glow)`. Readout below in `--type-small` mono: `54% YES · 46% NO — every open market, weighted by the money on it` |
| Question board | 4-column grid `auto 1fr auto auto`, gap `--sp-5`, `min-height: 88px` per row, 1px `--border` between rows, `--border-royal` on top. Columns: category glyph (20px, `--text-faint`) · question (`--type-h2` Sora 700, `-.01em`) · pool (`--type-small` mono `--text-faint`) · YES % (`--type-h1` mono 700 `--gilt`, with `% YES` in `--type-micro` `--text-subtle`). A 2px `--bar-fill-yes` rule sits on the row's bottom edge at `width: <pct>%`. Hover: `--bg-overlay` + `padding-inline: --sp-4` |
| Question rows at ≤1024 | 3 grid areas over two lines: `"i q p" ". s p"`, `min-height: 76px`, question drops to `--type-h3` (`--type-h4` at 560) |
| Hero foot | `1fr 420px`, gap `--sp-16`. Left: lede (`--type-h3`, `--text-muted`) + CTAs. Right: one live `<MarketCard/>`, featured variant |
| CTAs | `Create account` (`.btn-primary`) and `Browse all 41 markets` (`.btn-quiet`). **Two, not three** — `Sign in` is already in the header |

**The hero card and the board must come from the same query** — closing soonest, real pool. If someone pins a favourite market there it stops being an instrument.

#### 1b. How it works — `--bg-overlay` band

Eyebrow `How 50pick works`. Heading **`Predict events. Not chance.`** at `--type-h1` — lifted verbatim from the first-visit modal. Lede is the modal's own paragraph, `--type-h3`, `max-width: 62ch`.

Three steps, `repeat(3,1fr)`, gap `--sp-16`. Each has a 1px `--border-strong` top rule with the numeral notched into it (`--type-small` mono 700, `.2em`, `--gilt`, with `background: var(--bg-overlay)` behind it to knock out the rule). Step heading `--type-h2` (was 15px). Body `--type-body` `--text-muted` (was 13px).

**Copy — use verbatim:**

1. **Pick a side** — Every market is one question with two answers. Stake what you want in shillings — the conviction needle shows where the crowd's money already sits.
2. **Two people verify the result** — Every market settles against a named public source: the meteorological agency, the league table, the Bank of Tanzania mid-rate. Two officers sign it off.
3. **Winners split the pool** — The pool is shared between everyone who was right, minus a capped commission. Paid to your M-Pesa wallet in seconds.

#### 1c. Pick a side now

Section head: eyebrow `Closing soonest`, heading `Pick a side now` (`--type-h1`), right link `Showing 6 of 41 · see all`. Six `<MarketCard/>`, `repeat(3,1fr)` gap `--sp-6`. **The heading states the sort order**, so the grid is a claim rather than a sample.

#### 1d. Browse by topic — 48px below, same surface

6-column grid, gap `--sp-3`. `All topics` and `Sports` span 3 each on row 1 (`min-height: 84px`, name at `--type-h3`); the six remaining sit on row 2 at `min-height: 64px`.

Each tile: `--bg-overlay`, 1px `--border`, `--r-md`, glyph (18px `--text-faint`) + name (`--type-h4` Sora 600) + meta (`--type-micro` mono: live count in `--yes-400`, then pool). A 2px `--bar-fill-yes` underline at that topic's crowd lean, `opacity .6` → 1 on hover, 340ms glide.

**The six narrow tiles put the meta on its own row** (`flex-wrap: wrap`, `.tm { flex: none; flex-basis: 100% }`, `.tn { text-overflow: ellipsis }`). This is load-bearing: at 195px with a Swahili label the two cannot share a line.

#### 1e. Up & Down — below the grid

`max-width: 920px`, centred. That constraint is the entire fix for the ~500px hole at 1440. `--hero-panel-grad`, 1px `--brand-soft`, `--elev-raised`. Copy left, one 44px primary right, `4 rounds live now` in `--type-micro` `--gilt`.

#### 1f. Why the result can be trusted — `--bg-overlay` band

Eyebrow, then one editorial statement at `--type-display-2`, `max-width: 30ch`:

> **A market is only worth playing if the *result* is not an opinion.** (`result` in `--gilt`)

Below it, three cells in `repeat(3,1fr)` divided by 1px `--border`, under a `--claret-edge` top border. Each: 26px `--gilt` glyph, `--type-h4` heading, `--type-small` body. Named public sources · Two signatures per result · M-Pesa in, M-Pesa out.

#### 1g. Settled in the last seven days

`grid-template-columns: auto 1fr auto auto`, `min-height: 64px` rows, 1px `--border` between. Outcome pill (`--success-bg/border/fg` for YES, `--danger-*` for NO), question (`--type-small` `--text-muted`, ellipsis), **the source that settled it** (`--type-micro` mono caps `--text-faint`), amount paid (`--type-small` mono 700 `--gilt`).

#### 1h. Responsible gambling line

Above the footer, rule-separated: the 18+ badge, *"If gambling stops being fun, stop."*, and three 44px links — `Set limits`, `Take a break / Self-exclude`, `Helpline · 0800 11 0011`.

**Every string is verbatim from `public-footer.tsx`. No new RG copy was written.** ⚠️ Placement is a regulatory question — see "Open questions".

#### 1i. Footer

`public-footer.tsx` **unchanged**. Licence stub, helpline, 18+ badge, `COMING SOON` flag all as-is. No legal or licence copy was touched anywhere in this work.

---

### 2. Header (`layouts/03-header.html`)

| Property | Value |
|---|---|
| Height | 56px, `position: sticky; top: 0; z-index: 30` |
| Fill | `var(--panel)` — **opaque at every scroll position** |
| Bottom edge | 1px `var(--border)` |
| Cast | none at rest · `var(--shadow-2)` scrolled, 140ms ease-out |

**The see-through bug is removed, not tuned.** A translucent bar over a scrolling board of conviction bars cannot be made legible by raising a mix percentage.

**The navigation model — one rule, three tiers.** This was the largest correction in the round; get it right.

| Tier | Shape | Members |
|---|---|---|
| **Destination** | no border, `--r-sm`, 44px, 13.5px Inter 500, `--text-subtle` | Markets · Up &amp; Down · Live · Results · Top |
| **Utility control** | **bordered** `--r-sm`, 44×44 min | Language |
| **Action** | `--r-pill` | Sign in (ghost) · Sign up (`--brand-600`/`--brand-400`/`--edge-lit`) |

- **Current destination** = `--pill-active` fill + `--text` + weight 600. This is the *only* active treatment, at every width.
- **Up & Down is a destination**, so it takes destination geometry. Its distinction is a 5px `--gilt` dot via `::before` plus `--brand-300` ink. It previously used `--r-pill`, which made shape mean both "product line" and "account action".
- Hover: `--bg-overlay` + `--text`, 140ms ease-out.

**Language control:** one 44×44 control reading `EN ⌄` at every width (the current build hides it below 1024). Opens `role="listbox"` on `--wash-float` + `--elev-float`. **`role="option"` elements must be direct children of the listbox** — the previous markup nested them in `<li>`, which breaks the accessibility tree. Every row shows its code (EN/SW/ZH); the current row adds a `--gilt` tick and `--pill-active`.

**Skip link:** `Skip to markets` → `#main`, off-screen until `:focus`.

**Mobile rail (390):** 5 slots — Markets · Up & Down · Live · Results · More. `--panel`, 1px `--border` top, `--shadow-overlay-up`, `padding-bottom: env(safe-area-inset-bottom)`. Each item: a 44×26 `.pip` around the icon, label below. **Active = `--pill-active` on the pip + `--text` label — the same language as the desktop bar.** The previous rail used `--aqua-300`, a second active language, and carried only 4 items, leaving Results and Top unreachable on a phone. **Auth is not in the rail** — it lives in the header at every width.

---

### 3. Market discovery — `/markets` (`04`, `05`, `06`, and the working prototype)

**The left rail is deleted.** It cost ~340px of a 1440 viewport and ~940px of vertical space for 13 controls that are functionally chips. The replacement bar costs 104px of height and no width; cards grow from ~285px to 394px.

#### 3a. Board header
Eyebrow `Markets · Dar es Salaam`, heading `The board` (`--type-h1`), the same three-figure proof rail at `--type-display-2`. Search right: `min-width: 320`, `max-width: 460`, `--h-input` (44), `--wash-inset` + `--edge-shade`.

**`Propose Markets & Get Paid · COMING SOON` is removed from `/markets` entirely.** It keeps its footer link, flag intact.

#### 3b. Sticky filter bar
`position: sticky; top: 56px; z-index: 20`, `--panel`, 1px `--border` bottom, `--shadow-2`. Two rows divided by a 1px rule.

**Row 1 — status, sort, density, count**

| Control | Spec |
|---|---|
| Status segmented | `Open · Closing today · New · Watching · All`, each with a live count. Track `--wash-inset` + 1px `--border-control` + `--edge-shade`, 3px padding, `--r-pill`. Buttons 44px. Selected `--pill-active` + `--edge-lit`. **Default `Open`** — this is what removes closed markets from the default view. `role="radiogroup"`, arrow keys wrap, Home/End jump |
| Sort | 44px, `--r-md` left half, `--wash-inset` + 1px `--border-control` + `--edge-shade`. `SORT` key in `--type-micro` mono `--text-faint`; value `--type-small` 600; `max-width: 340` with the value ellipsising and the key never truncating. Six options, each carrying a mono hint of the range it produces |
| Sort direction | A 44×44 button fused to sort's right edge, `--r-md` right half. Arrow glyph rotates 180° over 200ms glide |
| Density | 44×44 pair in a `--wash-inset` track: **card view / compact list view**. Selected `--pill-active` + `--edge-lit`. Persisted |
| Result count | mono 700 `--type-h4`, number in `--gilt` — `9 of 41 markets`. Lives in the sticky bar so it survives scroll |

Sort options: `Closing soonest` (default) · `Biggest pool` · `Most predictors` · `Closest call` · `Biggest move` · `Newest first`.

**Row 2 — refinement**

| Group | Options |
|---|---|
| `ODDS` | Any · Close call · 40–60% · Contested · 25–75% · Longshots · under 15% |
| `POOL` | Any · TZS 10k+ · TZS 50k+ |
| `TOPIC` | one menu control showing the current value and its count — **not eight pills**. Multi-select inside the menu |
| right | `Clear all` |

**Chip states** — all six drawn in `06-states.html` §06a:

| State | Value |
|---|---|
| Default | 44px, `--r-pill`, `0 --sp-3`, **1px solid transparent — no visible outline**, `--text-muted`, `--type-small` 600 |
| Hover | `--bg-overlay` + `--text` |
| Focus-visible | `2px solid var(--border-focus)`, offset 2 |
| Active | `--bg-inset` + `--border-royal` + `translateY(1px)` |
| Selected | `--pill-active` + `--brand-400` + `--glow-selected`; count in `--brand-200` |
| Disabled | `--surface-disabled`, `--text-disabled`, `opacity .45` |

**Condense on scroll:** past 300px, row 2 collapses via `grid-template-rows: 1fr → 0fr` (220ms glide) and a `N filters` pill appears in row 1 which scrolls back up to reopen. Fixed chrome drops from 160px to 108px. **Do not use `max-height`** — it eases toward a number the content never reaches, so the curve lies and the last 40% of the animation is empty.

#### 3c. No token row — this is deliberate

An earlier draft repeated the active filters as removable tokens beneath the bar. **It was cut.** It
said the same thing the pressed chips said, 68px lower down. Because unselected chips now carry no
outline, the selected ones are the only bordered objects in the bar — closer, cheaper and clearer
than a second row. `Clear all` sits in the bar's second row instead.

#### 3d. Paging — one contract

| Rule | Value |
|---|---|
| Page size | **12** where the grid is 2–3 columns, **6** where it is one — always whole rows, never an orphan |
| Pager total | **is** the filter-bar count. Same value, same source. They cannot drift |
| On any filter/sort/search change | reset to page 1 |
| Button label | `Load N more`, N = `min(pageSize, remaining)` — can never promise more than exists |
| End of set | a sentence, not a dead button: `Showing 41 of 41 — that is every market matching these filters` |
| Under one page | no pager rendered |
| Infinite scroll | **not used** — strands the footer, loses your place on return |
| Announcement | count line `aria-live="polite"`; the grid is not |

All four states drawn in `06-states.html` §06j.

#### 3e. Compact list view
`role="table"` with `role="row"`/`role="cell"`. Columns: watch star (44) · market (flex, with a 72px mini conviction bar + predictors + pool) · trend sparkline (96, hidden <1024) · YES % (56) · pool (104, hidden <720) · closes (78, hidden <720) · YES/NO pair (144, hidden <1024). Header row on `--bg-overlay`, `--type-micro` mono caps.

This was the largest gap against category norms: 394px cards show 9 markets, a coupon row shows 30. Betting is a scanning task before it is a browsing task.

#### 3f. Watchlist
A 44×44 star on every market, in both densities. Off = `--text-faint` outline; on = `--gilt` fill. Persisted to `localStorage` under `50pick.discovery.v1`, surfaced as the `Watching` status filter with its own empty state.

#### 3g. Typeahead
Focus or type opens a `role="combobox"` listbox: topics (jump straight to the filter), sources, and matching markets, each tagged by kind. Arrow keys move, Enter applies, Escape closes. Empty query shows popular markets and top topics. `/` anywhere on the page focuses search.

#### 3h. Empty states — two, deliberately different

**No match:** filters stay on screen; exits are computed relaxations with real counts (`Drop the pool filter · 3 markets`). Copy names *why* it is empty.
**No search result:** different copy, different exits — `Search all 58 including closed`, `Suggest this market`, plus four suggestion chips. A search miss is a catalogue gap, not a filter mistake.

Both: `--rh-section` padding, 1px dashed `--border-control`, `--r-xl`, `--bg-overlay`, 68px `--wash-inset` ring.

#### 3i. Loading
Three skeletons at the **real card geometry** — same padding, radius, `--elev-raised`, blocks in the exact positions of the chip row, question, percentage, bar, trader row, YES/NO pair and meta row. Fill `--bg-inset`, sweep `--bar-shimmer`, 1200ms. The filter bar stays live and operable; only the grid is replaced.

#### 3j. Mobile (390)
Sort and status stay in the bar at every width — they answer the first two questions and must never cost a tap. Status becomes a horizontally scrolling rail; sort takes the remaining width beside a `Filters (N)` button. Odds, pool and topic move into a bottom sheet: `--wash-modal`, `--shadow-overlay-up`, `--r-xl` top corners, 44×4 grab bar, sticky footer with `Clear` and **`Show 9 markets`** — the primary button states the outcome, so the sheet never closes into a surprise.

---

## Interactions & behaviour

Full table in `MOTION.md`. Curves: glide `cubic-bezier(.22,1,.36,1)` · ease-out `cubic-bezier(0,0,.2,1)` · settle `cubic-bezier(.34,1.56,.64,1)` · linear. In the codebase use `--m-glide`, `--t-quick` (140ms), `--t-base` (220ms), `--t-move` (340ms) from `motion.css`.

**Entry budget: 550ms.** Header + ticker fade 220ms linear at 0. Then four glide rises of 340ms at 0 / 80 / 150 / 210ms: eyebrow+headline, lede+CTAs, proof rail + aggregate bar, question board + card. Nothing below the fold participates — sections reveal on first intersection, once, via `IntersectionObserver` at `threshold .12`, `rootMargin 0 0 -8% 0`, unobserved after firing. **Progressive: the script adds the `.js` class itself, so a no-JS load renders everything visible.**

**Live behaviour**
- **Ticker:** duplicated run, `translateX(0 → -50%)`, **42s linear infinite**, paused on `:hover` and `:focus-within`. Both edges masked, not clipped.
- **Countdown:** a real clock. Under 1h reads `12m 04s`, ticking every second; under 24h `4h 12m`; beyond that `5d`. **Self-rescheduling interval — 1Hz only while a market is inside the last hour, 15s otherwise.** `aria-live="off"` on the time node, or a screen reader reads the seconds aloud.
- **Pool count-up:** 0 → total over 15 steps at 60ms, cubic ease-out, once on load. **Not per-`requestAnimationFrame`** — that produced ~54 full board re-renders during the most expensive moment of the load.
- **Grid re-deal:** on any filter/sort change the grid drops to `opacity .35` + `translateY(6px)` and returns over 220ms.
- **Arrival pill:** when a market opens, a fixed bottom pill offers `1 new market opened — show it`, which switches status to `New` and sort to `Newest first`. Dismissible, 44px targets.

**Reduced motion:** one global block neutralises durations, stops the ticker (`animation: none; transform: none`, masks retained), removes the skeleton shimmer, skips the count-up before its interval starts, skips the reveal by marking everything visible without attaching the observer, and skips the grid re-deal. **The countdown keeps ticking** — it is data on a money surface, and freezing a clock that governs whether a bet can still be placed is a correctness bug, not a kindness.

**Infinite loops: 1 perpetual (the ticker) + 1 transient (the skeleton).** Down from 8, one of which currently ignores `prefers-reduced-motion`.

**`transition: all` must never appear.** It is what produced the 895 elements currently computing to `transition: all 0s ease`. One rule per interactive family, five families total — see `MOTION.md` §5.

---

## Responsive behaviour

| Width | Grid | Filter bar | Header | Hero |
|---|---|---|---|---|
| ≤560 | 1 col | rows scroll | rail only; Sign in hidden | headline `--type-h1`, CTAs full-width, proof stacks, topics 1-up |
| ≤820 | 1 col | status rail scrolls, sort uncaps | rail | question rows 2-line |
| ≤1024 | 2 col | both rows wrap | nav yields to rail | hero stacks, topics 4-col, steps 2-col, trust stacks |
| ≤1200 | 2 col | two rows | full | hero split `1fr 380px` |
| 1440 | 3 col | two rows | full | `1fr 420px` — reference |
| 1920 | 3 col | more slack | full | container stays 1280 |

Verified at 923px: no horizontal overflow, grid correctly at 2 columns.

---

## State management

```ts
{
  status:   'open' | 'today' | 'new' | 'watch' | 'all'   // default 'open'
  sort:     'closing' | 'pool' | 'people' | 'close' | 'move' | 'new'
  sortDir:  'asc' | 'desc' | null    // null = the sort's natural direction
  odds:     'any' | 'call' | 'cont' | 'long'
  pool:     'any' | '10k' | '50k'
  topics:   string[]                  // multi-select; [] = all
  query:    string
  density:  'grid' | 'list'           // persisted
  watch:    string[]                  // market ids, persisted
  shown:    number                    // paging cursor; resets to pageSize on any change above
}
```

**Persisted** to `localStorage` key `50pick.discovery.v1`: `sort`, `sortDir`, `density`, `watch`. Nothing else — view filters should not surprise a returning user.

**URL state — implement exactly this:**

```
/markets?status=open&sort=closing&odds=cont&pool=10k&topic=sports,macro&q=simba
```

Defaults omitted, so a clean board is a clean URL. Every control writes with `replaceState` — a filter is not a navigation. Only `q` uses `pushState`, debounced 300ms, so Back clears a search. State is read on mount, which makes every board shareable.

**Data fetching:** the board is server-filterable. The empty state offers `Search all 58 including closed`, which assumes search is server-side — confirm.

---

## Design tokens

**Every value in this design already exists in `tokens-LOCKED.css`. Do not add, change or re-scope one.** Use the token name, never a resolved colour.

**Semantic families used**

| Family | Members touched |
|---|---|
| Surface | `--bg` `--bg-overlay` `--bg-inset` `--bg-elevated` `--panel` `--wash-raised` `--wash-inset` `--wash-float` `--wash-modal` |
| Text | `--text` `--text-muted` `--text-subtle` `--text-faint` `--text-disabled` `--text-inverse` `--text-link` `--text-link-hover` |
| Border | `--border` `--border-strong` `--border-control` `--border-royal` `--border-gold` `--border-focus` `--claret-edge` |
| Brand / state | `--brand-200/300/400/500/600` `--brand-soft` `--pill-active` `--surface-pressed` `--surface-disabled` `--glow-selected` |
| Outcome | `--yes-300/400/500/600` `--no-300/400/500/600/700/900` `--live-400` `--success-*` `--danger-*` |
| Value | `--gilt` `--gold-300` `--gold-subtle` `--gold-subtle-hover` |
| Bar | `--bar-fill-yes` `--bar-fill-no` `--bar-track-border` `--bar-needle` `--bar-needle-glow` `--bar-glow-yes` `--bar-empty-track` `--bar-shimmer` |
| Elevation | `--shadow-2/4/5` `--shadow-overlay-up` `--elev-raised` `--elev-raised-hover` `--elev-float` `--edge-lit` `--edge-lit-strong` `--edge-shade` |
| Hero | `--hero-grad-warm` `--hero-panel-grad` `--hero-text-strong` `--hero-yes-accent` `--hero-no-accent` `--hero-mark-opacity` |
| Radius | `--r-xs` `--r-sm` `--r-md` `--r-lg` `--r-xl` `--r-pill` |
| Spacing | `--sp-1` … `--sp-16` |
| Type | `--type-hero` `--type-display-1/2` `--type-h1/h2/h3/h4` `--type-body` `--type-small` `--type-micro` `--type-label` `--type-nano` |
| Font | `--font-display` (Sora) `--font-body` (Inter) `--font-mono` (JetBrains Mono) |

**The palette rule — one accent per role. This is the governing constraint.**

| Family | Means | Where it may appear |
|---|---|---|
| **Blue** — `--brand-*`, `--pill-active` | **view state**: what am I looking at | every filter, segmented control, density, sort, tokens, current nav item |
| **Gold** — `--gilt`, `--gold-*` | **value and possession**: money, the needle, what is mine | pool figures, payouts, result count, watch star, eyebrow tick, question-board prices |
| **Green / red** — `--yes-*`, `--no-*` | **outcome**, never chrome | YES/NO, conviction bar, LIVE |

Sort is view state, so it carries **no gold** — it previously wore a gold shell beside blue-selected peers at the same size and elevation, which is the one thing the palette cannot absorb. The watch star stays gold under the same rule: a starred market is possession, not a view filter.

**Type minimums in new work: `--type-micro` (11px).** `--type-label` (9.5) and `--type-nano` (8.5) appear only inside the frozen card.

---

## Assets

All in `brand/`, copied unmodified from the handover pack. **Reference them as files — never redraw the mark.**

| File | Use |
|---|---|
| `lockup-horizontal.svg` | header, footer, every document header |
| `mark-color.svg` | hero backdrop (opacity + rotate only), footer, favicon fallback |
| `mark-white.svg` | reserved for light surfaces |
| `favicon.svg` | `<link rel="icon">` |
| `mpesa.svg` | the M-Pesa cell in the trust band |

The mark's chord is off-centre and tilted (`M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z`) — the halves are deliberately unequal, because **the tipping point is the idea of the mark.** An earlier draft of this work redrew it with a vertical diameter and equal halves, which erased that. Use the file.

The −14° needle axis is the page's signature: the hero backdrop rotation, the gilt tick before every eyebrow, and the needle on every conviction bar all share it.

No photography. No illustration. No new asset is required.

---

## Data you must wire

**Every figure in these files is a placeholder.** None should ship.

| Figure | Placeholder | Real source |
|---|---|---|
| Live market count | 41 | live |
| Pool in play | TZS 1,669,000 | sum of open pools |
| Predictions today | 247 | count since 00:00 EAT |
| Closing today | 6 | `hours ≤ 24` |
| Aggregate YES | 54% | **volume-weighted YES share across all open markets** |
| Per-topic counts and pools | 14/6/7/4/5/3/2 = 41 | derived — **must reconcile to the header or the page contradicts itself** |
| Status counts | invented | `All` includes closed and resolved — confirm that matches user expectation |
| Every market, price, pool, predictor count | drawn from screenshots plus plausible local additions | live |
| Settled strip | three real-looking rows | last 7 days resolved, with source and payout |

**`New` needs a definition.** These files use "added in the last four days". If `isNew` in `market-card.tsx` means "no pool yet", those are different sets and the filter should follow the card.

**`Biggest move` needs `move24h` on every market.** The card takes it as optional and hides the line when absent; as a *sort*, absent values are placed last — confirm that beats treating absent as zero.

**Swahili and Chinese strings in `06-states.html` are mine and must not survive review.** They exist to prove the layout survives a 25% longer string, not to propose wording. If any real Swahili label exceeds ~40% of its English counterpart, it is past what was tested.

---

## Open questions — decisions needed before or during build

1. **The responsible-gambling line's placement is a regulatory question, not a design one.** Every string is verbatim from `public-footer.tsx`, but LCCP §SR 5.1.5 governs where RG messaging must appear and moving it above the footer may change assessment. Needs compliance sign-off; if the answer is "footer only", delete the block — the page still works.
2. **The settled strip names sources publicly** (TMA, Transfermarkt, TwelveData). Are those attributions contractually permitted at that prominence? And is the payout figure gross pool or the sum of winning positions?
3. **Two frozen tap targets are under 44px** — `.btn-side` (112×38) and `.mcardp-info` (34×34), on the two controls that take real money. `tokens-LOCKED.css` already schedules this: `--h-control-md: 38px /* Phase 3 → 44 */`. Let Phase 3 land and treat the YES/NO height as part of it. Not worked around here.
4. **`--type-nano` (8.5px) and `--type-label` (9.5px)** are below every comfort floor on a mid-range Android in daylight. Proposal: raise to 10 and 10.5 and re-run the contrast gate. Not applied.
5. **Does `41 live` include markets whose selection window has closed but which are still LIVE?** `market-card.tsx` has `selectionClosed` as a distinct state. If it counts, the `Open` filter is lying; if not, the header number and `All` will not reconcile.
6. **Is the topic taxonomy exactly 8?** Politics has a claret chip reserved in the token file and no tile.
7. **Is the first-visit modal being kept?** Its copy is now the how-it-works heading and lede. If the modal stays, that copy lives in two places.
8. **The filter bar condenses past 300px of scroll**, returning 52px of viewport but hiding controls a user may be mid-way through. Worth watching in testing.
9. **FROZEN §4 rules the red/green accessibility argument considered and declined for this round.** It is not raised here and nothing works around it. Recorded so a future reader does not assume it was missed.

---

## Files in this bundle

| File | What it is |
|---|---|
| `layouts/01-landing-desktop.html` | landing, 1440 — **the recommendation** |
| `layouts/02-landing-mobile.html` | landing, 390 |
| `layouts/03-header.html` | header at rest, scrolled, language open, desktop + mobile, plus a values table |
| `layouts/04-markets-discovery-desktop.html` | `/markets` at 1440, filters active |
| `layouts/05-markets-discovery-mobile.html` | `/markets` at 390, board + filter sheet |
| `layouts/06-states.html` | empty · loading · every control state · paging states · SW / 中文 stress |
| `layouts/07-hero-alternative.html` | the live-card hero, the alternative that was not chosen |
| `50pick Discovery Prototype.dc.html` | **working prototype** — filtering, sorting, paging, watchlist, typeahead all run against 18 markets |
| `tokens-LOCKED.css` | the token file, unmodified |
| `brand/` | the shipped SVGs |
| `SPEC.md` | full build specification, including every correction round |
| `MOTION.md` | the motion table, entry budget, reduced-motion behaviour, loop count |
| `DISCOVERY-RATIONALE.md` | why this filter and sort model, and what was deliberately excluded |
| `RATIONALE.md` | why this landing composition |
| `OPEN-QUESTIONS.md` | every guess made, and the frozen constraints disagreed with |

**Read order:** this README → `SPEC.md` → open the prototype → `MOTION.md` when you reach animation.

---

## Suggested build sequence

| # | Work | Est. |
|---|---|---|
| 1 | Header: opaque bar, nav model, language listbox, skip link, mobile rail | 2d |
| 2 | Landing composition: rhythm scale, hero question board, aggregate bar, topic tiles, trust band, settled strip | 5d |
| 3 | Discovery bar: status, sort + direction, odds/pool/topic, tokens, condense-on-scroll | 4d |
| 4 | List density + watchlist + persistence | 3d |
| 5 | Typeahead + URL state | 2d |
| 6 | Paging contract across both grids | 1d |
| 7 | Empty, loading and error states | 2d |
| 8 | Motion pass incl. reduced-motion | 3d |
| 9 | Countdown, count-up, arrival, live wiring | 2d |
| 10 | Responsive pass across 5 widths | 2d |
| 11 | SW / ZH strings for new controls | 1d |
| 12 | QA — 5 widths × 3 locales × reduced motion | 4d |
| 13 | RG compliance review | 0.5d |

**≈ 31.5 engineer-days.** One engineer ≈ 6.5 weeks; two ≈ 3.5 weeks.
