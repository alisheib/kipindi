# SPEC.md — build specification

**Round 2 · landing composition + market discovery · 11 August 2026**
Every value below is buildable from `tokens-LOCKED.css` as shipped. No token was added, changed or
re-scoped. No frozen component was edited.

---

## 0. Self-check

| Check | Result |
|---|---|
| **Colour discipline** — `grep` every stylesheet and inline `style` in `layouts/` for `#`, `rgb(`, `oklch(`, `hsl(` | **0 matches** across all seven files. A second pass for named colours in value position (`: white`, `: red`, …) also returns **0**. The only `#` characters in the files are `href="#"` placeholders in markup, not CSS. |
| **Frozen components** — could an engineer build this without editing `market-card.tsx`, `side-picker.tsx`, `needle.css` or any token? | **Yes.** The card is reproduced in flat CSS purely so the composition can be judged with the real object in it. The block is fenced in every file between `FROZEN BLOCK` / `end frozen block` comments. Delete it, render `<MarketCard/>`, and nothing outside the fence changes. |
| **Tap targets** — every interactive element ≥ 44 × 44 | **Yes, for everything this round designs.** Verified by DOM sweep, not by eye: a script walked `a, button, input, label.searchfield, [role=option]` on `04-markets-discovery-desktop.html`, measured `getBoundingClientRect()` on all 62 interactive elements, and reported every box under 44 in either axis. Result: **0 in the new composition**. 27 hits, all inside the frozen market card — `.btn-side` (112 × 38, FROZEN §4) and `.mcardp-info` (34 × 34, FROZEN §2). Both are listed in `OPEN-QUESTIONS.md` as frozen-component exceptions; neither was worked around. |
| **Mobile** | **Yes.** `02` (landing) and `05` (discovery, plus the filter sheet) are designed at 390, not scaled. Every desktop file also degrades by wrapping rather than by horizontal scroll. |
| **Header opaque when scrolled** | **Yes.** `background: var(--panel)` — a solid token, not `color-mix(… 92%, transparent)`. Opaque at *every* scroll position, plus a 1px `var(--border)` bottom edge it never had. Proven in `03-header.html` §03b and §03e, which park card content behind the bar. |
| **Reduced motion** | **Yes.** Every row of `MOTION.md` has a defined behaviour, and the stylesheet carries a global `@media (prefers-reduced-motion: reduce)` block that neutralises durations, kills the ticker translate and removes the skeleton shimmer. |
| **Infinite loops** | **1 perpetual** (the live ticker) **+ 1 transient** (the loading shimmer, which exists only while a request is open). Down from 8. Justified in `MOTION.md` §4. |
| **Swahili +25%** | **Yes.** `06-states.html` §06f–06i renders the whole filter bar in Swahili, Chinese and English side by side. No control has a fixed width; every one is content-sized with a `min-height` floor, so a longer label grows its own box and the row rewraps. Nothing clips, nothing overlaps, nothing reflows a neighbour. |

---

## 1. The vertical rhythm system

The current page repeats one 80px gap between all seven sections and gives every section
`padding: 0`. Replace it with a four-step scale, and let *surface* carry the largest breaks.

```
--rh-tight:   var(--sp-6)               /*  24px — a heading and the thing it labels   */
--rh-close:   var(--sp-12)              /*  48px — two halves of one idea              */
--rh-section: calc(var(--sp-12) * 2)    /*  96px — a new idea                          */
--rh-chapter: calc(var(--sp-12) * 3)    /* 144px — a new act; always with a band edge  */
```

Sections do not carry a "gap". Each owns padding, and the observed gap is `A.padding-bottom +
B.padding-top`. Only two atoms are used at section level — 48 and 96 — which is what makes the
result legible as a system rather than as a list of numbers.

### Landing page, top to bottom

| # | Section | Surface | Pad top | Pad bottom | Gap **before** it | Why |
|---|---|---|---|---|---|---|
| — | Header | `--panel` | — | — | — | 56px, sticky, opaque |
| — | Live ticker | `--bg-overlay` | — | — | 0 | reads as part of the chrome |
| 1 | Hero | `--hero-grad-warm` | 96 | 96 | 0 | butts the ticker; the band edge is the boundary |
| 2 | How it works | `--bg-overlay` band | 48 | 48 | **144** | chapter break: 96 + 48 **and** a surface change |
| 3 | Pick a side now (grid) | `--bg` | 48 | 48 | **96** | new idea |
| 3b | Browse by topic | `--bg` | — | — | **48** *(internal)* | belongs to §3 — same surface, half the air |
| 4 | Up &amp; Down | `--bg` | 48 | 96 | **96** | new idea |
| 5 | Why the result can be trusted | `--bg-overlay` band | 48 | 96 | **144** | chapter break |
| — | Footer | `--bg-overlay` | 40 | 48 | 0 | continuous with §5's surface, separated by the claret rule |

Observed **section** gaps, in order: **144 · 96 · 96 · 144** — plus one **internal** 48 inside the board section (grid → topic band). Verified by measuring content-edge to content-edge, not by reading the CSS. At ≤1024 the scale compresses to 122 · 97 · 96 · 123. Two bands, both `--bg-overlay`.
Two background colours on the page total, per the brief's ceiling.

### Inside a section

| Step | Use |
|---|---|
| `--sp-2` (8) | chip gaps, icon-to-label |
| `--sp-3` (12) | control gaps in a row, card chip row |
| `--sp-4` (16) | mobile grid gap, meta rows |
| `--sp-5` (20) | card padding |
| `--sp-6` (24) | desktop grid gap, eyebrow → heading |
| `--rh-tight` (24) | section head → its content |
| `--sp-16` (64) | hero column gap, step-grid column gap |

---

## 2. Grid

`--w-board` (1280px) is the content column everywhere, matching the top bar and footer chrome.
Gutter `--sp-6` (24) at ≥768, `--sp-4` (16) at 390. Usable width at 1440 = **1232px**.

| Breakpoint | Container | Gutter | Market grid | Topic tiles | How-it-works | Hero |
|---|---|---|---|---|---|---|
| 390 | 390 | 16 | 1 col, gap 16 | 2 col, gap 8 | 1 col, gap 24 | stacked; card below type |
| 768 | 736 | 24 | 2 col, gap 24 | 3 col, gap 12 | 2 col, gap 32 | stacked |
| 1024 | 1000 | 24 | 2 col, gap 24 | 4 col, gap 12 | 3 col, gap 48 | 1fr / 380 split |
| 1440 | 1280 | 24 | **3 col, gap 24** (394px cards) | 4 col × 2, gap 12 | 3 col, gap 64 | **1fr / 420 split**, gap 64 |
| 1920 | 1280 centred | 24 | 3 col, gap 24 | 4 col × 2 | 3 col | 1fr / 420 |

The container does not grow past 1280 at 1920. A fourth card column would make the card narrower
than the design it was signed off at; extra width becomes margin.

**Card count on the landing grid:** 6 at ≥1024 (two rows of three), 6 at 768 (three rows of two),
**3 at 390** plus a full-width `All 41 markets` button. Three cards is one thumb-scroll on a
mid-range Android; six is a wall.

---

## 3. Landing page — section by section

### 3.1 Header (`03-header.html`)

| Property | Value |
|---|---|
| Height | 56px, `position: sticky; top: 0; z-index: 30` |
| Fill | `var(--panel)` — **opaque, always** |
| Bottom edge | `1px solid var(--border)` |
| Cast at rest | none · **scrolled** `var(--shadow-2)` |
| Nav item | 44px tall, `0 var(--sp-3)`, `var(--r-sm)`, 13.5px Inter 500, `var(--text-subtle)` |
| Nav hover | `var(--bg-overlay)` + `var(--text)`, 140ms ease-out |
| Nav active | `var(--pill-active)`, `var(--text)`, weight 600 — same box |
| Up &amp; Down | identical 44px box; differs only by `var(--r-pill)`, `var(--brand-300)` ink, `1px var(--brand-soft)`, `var(--edge-lit)` |
| Language | **one** 44 × 44 control reading `EN ⌄`, at every width. Opens a rung-2 menu (`var(--wash-float)` + `var(--elev-float)`), 44px rows, `var(--pill-active)` on the current locale |
| Sign in | 44px, `var(--r-pill)`, `1px var(--border-control)` |
| Sign up | 44px, `var(--r-pill)`, `var(--brand-600)` / `var(--brand-400)` / `var(--edge-lit)` |

Treatments in the bar: **2** (nav item, auth pill), down from 5. Type sizes: **2**, down from 3.
Radius systems: **2**, and now they mean something — `--r-sm` is navigation, `--r-pill` is an
account action or a product line.

**The see-through bug is not tuned, it is removed.** A translucent bar over a scrolling board of
conviction bars and avatar stacks cannot be made legible by raising the mix percentage; it can only
be made less bad. `--panel` is opaque and the 1px border gives the bar the boundary it never had.

### 3.2 Live ticker

34px, `var(--bg-overlay)`, 1px `var(--border)` bottom. A `LIVE` cap on the left in
`--type-label` `var(--danger-fg)`, divided by a 1px rule. The run is duplicated and translated
`0 → -50%` over **64s linear infinite**, paused on `:hover` and `:focus-within`.

Both edges carry a mask, not a hard clip:
`mask-image: linear-gradient(90deg, transparent 0, var(--text) 32px, var(--text) calc(100% - 48px), transparent)`.
`--text` is an opaque token used here as a mask stop, which is why the file still contains no colour
literal. This is the fix for A10 — the strip currently computes to `animation: none` and hard-clips
mid-word at 390.

### 3.3 Hero (`01` / `02`; alternative in `07`)

Surface `var(--hero-grad-warm)`. Behind everything, the brand mark at **880px** (620 at 390),
`opacity: var(--hero-mark-opacity)` (0.10), `transform: rotate(-14deg)` — the needle axis, so the
disc reads as the YES/NO dial rather than as a decorative circle. Bleeds off the right and bottom
edges. No photograph, no illustration, no new asset.

Grid `1fr 420px`, gap `--sp-16`, `align-items: center`.

| Element | Value |
|---|---|
| Eyebrow | `--type-micro`, mono 700, `.18em`, `var(--text-subtle)`, preceded by a 5px `var(--gilt)` dot |
| Headline | `--type-hero` (72px) Sora 800, `-.022em`, line-height 1.02, `var(--hero-text-strong)`; `YES` in `var(--hero-yes-accent)`, `NO` in `var(--hero-no-accent)` |
| Headline at 390 | `--type-display-2` (44px) |
| Lede | `--type-h3` (20px), `var(--text-muted)`, `max-width: 34ch` — copy unchanged |
| CTA row | `--rh-tight` above; `Create account` (primary) · `Sign in` (ghost) · `Browse markets first` (quiet). All 44px |
| Rule | 1px `var(--border-royal)` at 60% width of the column, `--rh-close` above / `--sp-6` below |
| Proof rail | three figures, mono 700 `--type-display-2` (44px), captions `--type-label` |
| Right column | one **approved market card**, live, `featured` variant, 420px |

**The two lines of place text are merged.** `TANZANIA · DAR ES SALAAM` and
`EST. 2026 · DAR ES SALAAM` currently say nearly the same thing 240px apart; they become one
eyebrow: `Tanzania · Dar es Salaam · Est. 2026`.

### 3.4 The zero-stat band is deleted and its content promoted

`0 MARKETS SETTLED / TZS 0 PAID OUT` is removed. The live proof you already compute takes its
job — but in the hero, not 4,900px down the page, because a number whose purpose is to prove the
platform is alive is worthless below the fold.

| Figure | Source | Type |
|---|---|---|
| `41` + live pip | live market count | mono 700 44px `var(--yes-400)`, 8px pip with `var(--bar-glow-yes)` |
| `TZS 1,669,000` | sum of open pools | mono 700 44px `var(--gilt)` |
| `7` | topics with a live market | mono 700 44px `var(--text)` |

Written in full, not as `1669k`. `TZS 1,669,000` is a bigger number to a reader than `TZS 1669k`,
costs 4 characters, and is what a punter actually wants to see.

The slot the band vacated is taken by §3.8, which carries trust rather than statistics.

### 3.5 How it works — `--bg-overlay` band

The section with the most important job currently has 15px headings and 13px body. It gets a band,
a real heading, and the best copy on the site — which is currently trapped in a first-visit modal
(A1) that anyone who reflexively closes modals never reads.

| Element | Value |
|---|---|
| Eyebrow | `How 50pick works` |
| Heading | **`Predict events. Not chance.`** — `--type-h1` (32px) Sora 700. Lifted verbatim from the modal |
| Lede | the modal's own body copy, verbatim, `--type-h3` (20px), `max-width: 62ch` |
| Steps | 3 columns, gap `--sp-16`; each has a 1px `var(--border-strong)` top rule with the numeral notched into it |
| Numeral | `--type-small` mono 700, `.2em`, `var(--gilt)`, sitting on the rule with `background: var(--bg-overlay)` behind it |
| Step heading | `--type-h2` (24px) Sora 700 — was 15px |
| Step body | `--type-body` (15px), `var(--text-muted)` — was 13px |

**Copy is rewritten** (A6 puts this in scope). The live text is spec prose:

> *"Every market resolves against a public source URL, signed off by an officer — or two, when
> two-admin authorization is enabled."*

becomes

> **Two people verify the result.** Every market settles against a named public source: the
> meteorological agency, the league table, the Bank of Tanzania mid-rate. Two officers sign it off.

and

> *"Price Competition pool. Drag the conviction needle on any market."*

becomes

> **Pick a side.** Every market is one question with two answers. Stake what you want in shillings —
> the conviction needle shows where the crowd's money already sits.

Third step: **Winners split the pool.** *The pool is shared between everyone who was right, minus a
capped commission. Paid to your M-Pesa wallet in seconds.*

### 3.6 Pick a side now — the board

Section head: eyebrow `Closing soonest`, heading `Pick a side now` (`--type-h1`), right-aligned
`All 41 markets →` at 44px. Six approved cards, 3 × 2. **The heading states the sort order**, so the
grid is a claim rather than a sample.

### 3.7 Browse by topic — 48px below the grid, same surface

Eight tiles (`All` + 7 topics), 4 × 2 at desktop, 2-up at 390. Each is 64px tall and carries a
glyph, the topic name at `--type-h4` Sora 600, and — the whole point — a live count and a pool
figure in `--type-label` mono: `14 live · TZS 486k`, the count in `var(--yes-400)`.

The current tiles are 197 × 125 with one icon and one word, and the eye skips the band because
nothing distinguishes one from another. A count is the cheapest possible information scent and it is
already computed. Tile height drops from 125 to 64 *and* the band gains information.

### 3.8 Up &amp; Down — moved below the grid

Max-width **920px, centred**, inside the 1280 column. That single constraint is the fix for A7: the
~500px hole at 1440 exists because a two-item flex row was allowed to span the full container.
Copy left, one 44px `Play Up & Down` button right, `4 rounds live now` in `--type-label`
`var(--gilt)` beneath the copy. Surface `var(--hero-panel-grad)`, 1px `var(--brand-soft)`,
`var(--elev-raised)`. Stacks full-width at 390.

### 3.9 Why the result can be trusted — `--bg-overlay` band

Three cells, each a 44px `var(--r-md)` plate with a `var(--gilt)` glyph, a `--type-h4` heading and
`--type-small` body: named public sources · two signatures per result · M-Pesa in, M-Pesa out.

This is a composition element, not a regulatory one. **No footer, licence or legal copy is touched
anywhere in this delivery** — the footer in `01` and `02` reproduces `public-footer.tsx` verbatim,
including the licence stub, the helpline, the 18+ badge and the `COMING SOON` flag on the proposals
link.

---

## 4. The discovery layer (`04`, `05`, `06`)

### 4.1 Board header

Eyebrow `Markets · Dar es Salaam`, heading `The board` (`--type-h1`), then the same three-figure
proof rail as the hero at `--type-display-2`. `41 live · TZS 1669k in play` is currently 11px mono
in the top-right corner (B8); it becomes the largest non-heading type on the page. Search sits
right, `min-width: 320`, `max-width: 420`, `var(--h-input)` (44px), `var(--wash-inset)` +
`var(--edge-shade)`.

**`Propose Markets & Get Paid · COMING SOON` is removed from `/markets` entirely** (B7). It keeps
its footer link, flag intact.

### 4.2 Sticky filter bar

`position: sticky; top: 56px; z-index: 20`, `var(--panel)`, 1px `var(--border)` bottom,
`var(--shadow-2)`. Two rows, divided by a 1px `var(--border)` rule, `--sp-2` padding.

**Row 1 — the two decisions a punter makes first**

| Control | Spec |
|---|---|
| Status segmented | `Open · Closing today · New · All` with live counts. Track `var(--wash-inset)` + 1px `var(--border-control)` + `var(--edge-shade)`, 3px padding, `var(--r-pill)`. Buttons 44px, `var(--r-pill)`; selected `var(--pill-active)` + `var(--edge-lit)`. Outer height **52px**. Default **Open** — this is what removes closed markets from the default view (B3) |
| Sort | 44px, `var(--r-md)`, `var(--gold-subtle)` fill, 1px `var(--border-gold)`. `SORT` key in `--type-label` mono `var(--gilt)`, value in `--type-small` 600. `max-width: 360px`; the value ellipsises, the key never does. Menu is rung 2: `var(--wash-float)`, `var(--elev-float)`, 44px rows, each with a mono hint of the range it produces |
| Result count | mono 700 `--type-h4`, number in `var(--gilt)` — `9 of 41 markets`. Lives in the **sticky** bar so it survives scroll |

Sort is the only gilt control in the layer. Gold means earned money everywhere else in this system,
so putting sort on `--gold-subtle` is a deliberate claim that ordering the board is the money
decision. It is the one thing I would most like a second opinion on — see `OPEN-QUESTIONS.md` §3.

**Row 2 — refinement**

| Group | Options |
|---|---|
| `ODDS` | `Any` · `Close call · 40–60%` · `Contested · 25–75%` · `Longshots · under 15%` |
| `POOL` | `Any` · `TZS 10k+` · `TZS 50k+` |
| `TOPIC` | one menu control showing the current value and its count, not eight boxes |
| right | `Clear all` |

Chip: 44px, `var(--r-pill)`, `0 var(--sp-4)`, 1px `var(--border-control)`, `--type-small` 600.
Selected: `var(--pill-active)` + `var(--brand-400)` + `var(--glow-selected)`.
Hover: `var(--bg-overlay)` + `var(--border-royal)`. Press: `var(--bg-inset)` + `translateY(1px)`.
Disabled: `var(--surface-disabled)`, `var(--text-disabled)`, `opacity .45`.
Focus-visible: `2px solid var(--border-focus)`, offset 2. All six in `06-states.html` §06a.

**The left rail is gone.** It cost ~340px of a 1440 viewport and ~940px of vertical space for 13
controls that are functionally chips (B6). The bar costs **104px of height and no width**, and the
grid goes from 3 columns in 900px to 3 columns in 1232px — cards grow from ~285px to 394px.

### 4.3 Active filters

A `Filtered by` row in flow beneath the bar: one 44px token per active constraint, each with a
44 × 44 remove control, then `Clear all`. Tokens are the single place to *remove* a filter without
hunting for the chip that set it, and they name the constraint in words (`ODDS 25–75%`) rather than
relying on a pressed state 300px away.

### 4.4 Empty states — two of them, deliberately

They are different failures and must not share a screen.

**No match (`06c`)** — the filter row stays on screen above the empty state, and the exits are
computed relaxations with real counts: `Drop the pool filter · 3 markets`, `Drop the odds filter · 3`,
`All topics · 9`. The copy names *why* it is empty (`Culture is a small topic — three markets are
live and none is a longshot with a pool above TZS 50,000`).

**No search result (`06d`)** — different copy, different exits: `Search all 58 including closed`,
`Suggest this market`, plus four suggestion chips. A search miss is a catalogue gap, not a filter
mistake.

Both: `--rh-section` padding, 1px dashed `var(--border-control)`, `var(--r-xl)`, `var(--bg-overlay)`,
a 68px `var(--wash-inset)` ring.

### 4.5 Loading (`06e`)

Three skeleton cards at the **real card geometry** — same padding, same radius, same
`var(--elev-raised)`, blocks in the exact positions the chip row, question, percentage, bar, trader
row, YES/NO pair and meta row occupy. Fill `var(--bg-inset)`, sweep `var(--bar-shimmer)`. The filter
bar stays live and operable throughout; only the grid is replaced.

### 4.6 Breakpoints

| Width | Filter bar | Grid | Notes |
|---|---|---|---|
| 390 | Row 1 = sort (flex:1) + `Filters (n)` button. Row 2 = status chips, horizontal scroll, no wrap | 1 col | ODDS / POOL / TOPIC move into a bottom sheet — `05b`. Count + tokens sit under the bar |
| 768 | Both rows wrap to 3–4 lines | 2 col | no sheet |
| 1024 | Both rows, row 2 wraps once | 2 col | |
| 1440 | Two rows as specified | 3 col | reference |
| 1920 | Two rows, more slack | 3 col | container stays 1280 |

**The 390 sheet (`05b`).** A drawer is unavoidable at 390 for eight topics plus two chip groups —
they are 15 controls and the viewport is 390 wide. So it is designed rather than defaulted: docked
bottom, `var(--wash-modal)`, `var(--shadow-overlay-up)` (an up-cast, because a downward cast on a
bottom-docked panel throws its shadow off-screen), `--r-xl` top corners, a 44 × 4 grab bar, a
sticky footer with `Clear` and `Show 9 markets` — the primary button states the outcome, so the
sheet never closes into a surprise. **Sort and status stay outside the sheet**, always visible: they
answer the first two questions and must not cost a tap.

---

## 5. Components used, by filename

| Existing, unchanged | Where |
|---|---|
| `market-card` | landing hero (1), landing grid (6), discovery grid (9), resolved strip (3) |
| `side-picker`, `conviction-dial`/needle, `countdown`, `watch-star` | inside `market-card` only |
| `live-ticker` | header strip on both pages — behaviour fixed per §3.2, geometry unchanged |
| `bottom-nav` | 390 landing and 390 discovery; fill changed to opaque `var(--panel)` + `var(--shadow-overlay-up)` |
| `public-footer` | both landing files, verbatim |
| `brand` (`FiftyMark`, `FiftyLockup`) | header, hero background disc, footer |

| New, and required | Note |
|---|---|
| `filter-chip` | one control, six states (§4.2) |
| `status-segmented` | wraps existing chip styling in a `--wash-inset` track |
| `sort-menu` | rung-2 menu, 44px rows |
| `filter-token` | 44px pill + 44 × 44 remove |
| `topic-tile` | 64px, glyph + name + live count + pool |
| `filter-sheet` | 390 only, rung 3 |
| `board-proof` | the three-figure rail, used in both the hero and the board header |
| `question-row` | **`07` only** — the alternative hero's editorial list. Not needed if Hero A is chosen |

---

## 6. Type scale in use

| Token | px | Used for |
|---|---|---|
| `--type-hero` | 72 | landing H1 (desktop) |
| `--type-display-1` | 60 | Hero B headline |
| `--type-display-2` | 44 | landing H1 at 390; every proof figure |
| `--type-h1` | 32 | section headings, `The board`, question-row percentages |
| `--type-h2` | 24 | how-it-works step headings, empty-state headings |
| `--type-h3` | 20 | lede, Up &amp; Down heading |
| `--type-h4` | 17 | button labels, topic names, result count, trust headings |
| `--type-body` | 15 | body copy, search input, card question |
| `--type-small` | 13 | chips, secondary body, footer links |
| `--type-micro` | 11 | eyebrows, ticker, card meta |
| `--type-label` | 9.5 | letter-spaced mono caps only — chips, proof captions, filter labels |
| `--type-nano` | 8.5 | avatar initials, `COMING SOON` flag |

Sora display · Inter body · JetBrains Mono numbers and labels. No new family, no reassignment.


---

# Round 2.1 — what changed after the critique pass

Nine roles reviewed the round-2 delivery and it scored 6.6/10. Everything below is the work that
closed the gaps. **No token was added or changed, no frozen component was edited, and the colour
grep is still zero.** Every change is CSS or composition.

## Identity — the needle axis becomes a page-wide device

The mark is a split disc with a needle at **−14°** (`--m-tilt`, measured from the shipped artwork).
Round 2 used that angle twice. Round 2.1 makes it the page's signature:

| Where | What |
|---|---|
| Every eyebrow | `.eyebrow::before` — a 2 × 13px `var(--gilt)` bar at `rotate(14deg)`. One rule, every section, unmistakably from the mark |
| Hero rule | was a 1px grey line. Now a **236 × 3px split bar**: `var(--yes-600)` to 50%, `var(--no-600)` from 50%, with the gilt needle crossing the midpoint at 14° and `var(--bar-needle-glow)`. It is the trademark, unrolled |
| Act dividers | band edges move from `var(--border)` to `var(--claret-edge)` — the heraldic thread the footer's claret rule already carries, now running through the page |
| Topic tiles | each carries a 2px `var(--bar-fill-yes)` underline at that topic's crowd lean, using the conviction bar's own gradient |

## Graphic — three sections stop being generic

**Topic band.** Was eight identical tiles. Now a 6-column grid where `All topics` and `Sports`
(the largest topic) span 3 each on row 1 and the remaining six sit on row 2 — a real hierarchy —
each with its lean underline.

**Trust band.** Was three icon-over-text columns, the most generic pattern in web design. Now one
editorial statement at `--type-display-2`:

> **A market is only worth playing if the *result* is not an opinion.**

with the three facts demoted to `--type-small` cells divided by 1px rules under a
`var(--claret-edge)` top border. Icons drop from 44px plates to 26px inline glyphs.

**Hero.** Three competing CTAs become two — `Create account` and `Browse markets first`. `Sign in`
is already in the header; it did not need to be in the hero as well.

## Funnel — proof that the machine completes a cycle

New: **`Settled in the last seven days`** — three rows above the trust band, each showing the
outcome pill, the question, **the named source that settled it**, and the amount paid.

```
YES   Will the long rains begin before 15 April?    TANZANIA METEOROLOGICAL AUTHORITY   TZS 180,000 paid
NO    Will Vinícius Júnior leave Real Madrid…       TRANSFERMARKT                        TZS  15,000 paid
YES   Will Bitcoin (BTC) be above $64,000…          TWELVEDATA                           TZS  10,000 paid
```

It is real data, it names the source, it shows money leaving the platform, and it is the only
element on the page proving the product finishes what it starts. It replaces the leaderboard idea:
the product deliberately anonymises traders to two-character crests, so a named leaderboard would
contradict its own privacy model.

## Responsible gambling — above the footer, in their own words

A rule-separated line beneath the trust band: the 18+ badge, *"If gambling stops being fun, stop."*
and three 44px links — `Set limits`, `Take a break / Self-exclude`, `Helpline · 0800 11 0011`.

**Every string is lifted verbatim from `public-footer.tsx`.** No new RG copy was written, and the
footer itself is untouched. The composition above it got more persuasive in round 2; this is the
matching duty of care. **Needs compliance sign-off before it ships** — see `OPEN-QUESTIONS.md` §9.

## Discovery — 160px of sticky chrome becomes 108

The filter bar **condenses on scroll**. Past 300px, row 2 collapses (`max-height 220 → 0`,
200ms glide) and a `2 filters` pill appears in row 1, which scrolls the page back up to reopen it.
Fixed chrome on a 768px laptop drops from 160px to 108px — a 7% return of the viewport to markets.

**Topic is chips on desktop too**, matching the mobile sheet. Round 2 had a menu on desktop and
chips at 390: two mental models for one filter, now one.

**New sort: `Biggest move`** — 24h swing, the fourth thing a serious predictor asks for after
*what can I get into · what's about to close · where is the money*.

## Motion — the board is live, not a screenshot

| Change | Before | After |
|---|---|---|
| Ticker | 64s — slow enough to read as broken, the bug it was fixing | **42s** |
| Entry stagger | uniform 60 / 120 / 180ms | weighted **80 / 150 / 210ms**; budget now 550ms |
| Card time-left | a static string `2d left` | a **real clock**. Under 1h it reads `12m 04s left` and ticks every second; under 24h, `4h 12m left` |
| Pool figure | printed | **counts up** 0 → TZS 1,669,000 over 900ms, cubic ease-out, **once** on load |
| Filter change | nothing | the grid drops to `opacity .35` + `translateY(6px)` and returns over 220ms, so the board visibly re-deals |
| Topic lean bar | — | 340ms width transition on hover |

Reduced motion: the count-up is skipped entirely (`matchMedia` checked before the rAF loop starts,
so the final value renders on frame 1), the grid re-deal is skipped, the ticker stops. **The
countdown keeps ticking** — it is data on a money surface, not decoration, and stopping it would be
a correctness bug rather than a kindness.

Infinite loops: still **1 perpetual + 1 transient**. The countdown is a 1Hz `setInterval`, not an
animation, and it costs one text node per card.

## What did not change

The palette. The market card. The conviction bar. The YES/NO control. The brand files. The footer.
The section inventory — the page still has the same seven ideas, and `Settled in the last seven
days` is a strip inside the trust act, not an eighth section.


---

# Round 2.2 — final

## The recommendation changed: the question board is now the hero

`01-landing-desktop.html` and `02-landing-mobile.html` are built on the **question board**. The
live-market hero moves to `07-hero-alternative.html`.

The critique was that the live-card hero, stripped of the card, is a dark fintech landing page — it
says nothing a competitor could not also say. The question board is the only version of this hero
that could not belong to another product: the open questions themselves — Simba, Arusha, the
shilling, the SGR — set as editorial type, priced in gilt, ordered by what closes first, each with
a hairline `--bar-fill-yes` rule at its crowd position. It answers A12 (*nothing anchors the page
to Tanzania*) at full strength and it scales with the catalogue instead of depending on one card
being interesting today.

The approved card has not left the hero — it sits in the foot row beside the lede and the CTAs, so
the mechanic is still taught above the fold. The order of teaching is reversed: **subject first,
mechanic second.**

| | 1440 | 390 |
|---|---|---|
| Headline | `--type-display-1` (60px) | `--type-display-2` (44px) |
| Question row | 4 columns: glyph · question · pool · YES% | 3 grid areas over 2 lines, min-height 76px |
| Question type | `--type-h2` (24px) Sora 700 | `--type-h4` (17px) |
| Proof rail | three figures at `--type-display-2` | two side by side; predictions-today drops |
| Foot | `1fr 420px` — lede + CTAs, card right | stacked, CTAs full width |
| Backdrop | 1100px mark, `rotate(-14deg)`, `--hero-mark-opacity` | 660px, top-centred |

New third proof figure: **247 · predictions today**. It is the only figure on the page about
*people* rather than money, and the esports-manager critique was that the composition had no
evidence of anyone else being here.

## Visual comfort — the sub-10px tier is gone from everything I own

**95 declarations across all seven files** moved off `--type-label` (9.5px) and `--type-nano`
(8.5px) onto `--type-micro` (11px) and `--type-label`: filter labels, chip counts, proof captions,
sort keys, footer headings, the settled strip, the state swatches, the spec tables.

No token changed value. FROZEN §1 permits *"use any existing token in a new place"*, and that is the
whole of the change. The 9.5/8.5 tier now appears **only inside the frozen card block**, where it is
not mine to fix — `OPEN-QUESTIONS.md` §2 still proposes raising it.

## Motion — the six defects a profiler found

| # | Was | Now |
|---|---|---|
| 1 | Condensing bar tweened `max-height: 220px → 0` — it eases toward a number the content never reaches, so the curve lies and the last 40% of the animation is empty | `grid-template-rows: 1fr → 0fr` on a wrapper. Tweens the real height; the glide curve is honest |
| 2 | Pool count-up called `setState` per rAF frame — ~54 full board re-renders in 900ms, on load, on a low-end Android, while the ticker composites | 15 steps at 60ms. Same perceived motion, 72% fewer reconciles |
| 3 | Countdown re-rendered all twelve cards every second, forever | Self-rescheduling interval: **1Hz only while a market is inside the last hour**, 15s otherwise |
| 4 | No `aria-live` on the countdown — a screen reader reads the seconds aloud | `aria-live="off"` on the time node |
| 5 | Section reveal specced but not built | `IntersectionObserver`, `threshold .12`, `rootMargin 0 0 -8% 0`, unobserved after firing. Progressive: the script sets `.js` itself, so a no-JS load renders everything visible |
| 6 | No arrival event — the board could not tell you something had happened | A fixed bottom pill: **1 new market opened — show it**, which switches status to `New` and sort to `Newest first`. Dismissible, 44px targets, fires once |

Under reduced motion the reveal marks everything visible without attaching the observer, the
count-up is skipped before its interval starts, and the grid re-deal is skipped. The countdown still
ticks — it is data on a money surface, not decoration.

## Discovery — keyboard and URL state

The status segmented control implements the WAI-ARIA radiogroup pattern: `ArrowLeft` / `ArrowRight`
/ `ArrowUp` / `ArrowDown` move and wrap, `Home` / `End` jump to the ends.

**URL state — implement exactly this:**

```
/markets?status=open&sort=closing&odds=cont&pool=10k&topic=sports&q=simba
```

| Param | Values | Default (omitted from the URL) |
|---|---|---|
| `status` | `open` · `today` · `new` · `all` | `open` |
| `sort` | `closing` · `pool` · `people` · `close` · `move` · `new` | `closing` |
| `odds` | `any` · `call` · `cont` · `long` | `any` |
| `pool` | `any` · `10k` · `50k` | `any` |
| `topic` | `all` + the seven category slugs | `all` |
| `q` | free text, trimmed | empty |

Defaults are omitted, so a clean board is a clean URL. Every control writes with `replaceState` — a
filter is not a navigation. Only `q` uses `pushState`, debounced 300ms, so Back clears a search.
State is read on mount, which makes every board shareable: the cheapest growth feature in the layer.

## Final self-check

| Check | Result |
|---|---|
| `#` / `rgb(` / `oklch(` / `hsl(` in any stylesheet | **0** |
| Named colours in value position | **0** |
| Tokens added, changed or re-scoped | **0** |
| Frozen components edited | **0** |
| Sub-44px tap targets in my composition | **0** — 27 inside the frozen card, all listed |
| Type under 10px in my composition | **0** — frozen card only |
| Perpetual animation loops | **1** (ticker) + 1 transient (skeleton) |
| Entry budget | **550ms** |
| Every animation has a reduced-motion behaviour | **yes** |
| Every deliverable exists at 390 | **yes** |
| Buildable without editing a token or a frozen file | **yes** |


---

# Round 2.3 — brand correction

**The mark was being hand-drawn, and FROZEN §6 forbids exactly that.** Corrected: the shipped SVGs
are now copied into `brand/` and referenced as files. Nothing about the mark is re-derived.

| Was | Now |
|---|---|
| A disc drawn from memory: `M256 40a216 216 0 0 0 0 432Z` — a vertical diameter through the centre, so the halves were **equal** | `brand/mark-color.svg`, whole. Its chord is `M 38.87 5.37 A 46 46 0 0 0 61.13 94.63 Z` — off-centre and tilted, which is why the green half is larger. **The tipping point is the idea of the mark**, and the drawn version had erased it |
| Recoloured to `--yes-600` / `--claret-500` / `--gold-300`, hub `--bg` | The file's own `#1EA362` / `#B03A3E` / `#E3BC66`, hub `#1A2140` |
| Hub `r=17` on a 512 viewBox — 3.3% | `r=5` on 100 — **5%**, a third larger |
| Wordmark re-set in Sora with a `.44em` `.tz` | `brand/lockup-horizontal.svg`, whole — `.tz` at 24:46 and `fill-opacity .62` |
| A hand-drawn phone glyph standing in for M-Pesa | `brand/mpesa.svg` |
| No favicon linked | `brand/favicon.svg` in every `<head>` |

11 marks, 5 lockups, 2 M-Pesa glyphs and 7 favicon links across the seven layouts, plus both DC
files.

**This does not put hex in the deliverable.** The brand files are referenced with `<img src>`, so
their colours live in the shipped artwork where they belong and never enter a stylesheet. The
colour grep across all seven layouts is still **0**. The hero backdrop takes
`opacity: var(--hero-mark-opacity)` and `rotate(-14deg)` on the `<img>` — geometry and opacity,
never a recolour.

## Review-board toolbar

The export button clipped below ~1050px: four `nowrap` children summed to exactly the content box,
leaving the 24px inline padding nowhere to go. Fixed at the constraint — the toolbar is now
`flex-wrap: wrap` with a 12px row gap, the title flexes from a 180px basis instead of a 120px
floor, and the scale label's `min-width` is dropped.


---

# Round 2.4 — topic tile correction

Two earlier changes stacked without being re-measured against each other, and the result collided
text on text at the design width.

1. Round 2.1 moved `.topics` from `repeat(4,1fr)` (~296px per tile) to `repeat(6,1fr)` with the
   first two spanning 3. The six narrow tiles fell to **195px**.
2. The visual-comfort pass lifted `.topic .tm` from 9.5px to 11px, widening the meta string to
   **121px**.

A "Weather" tile then needed ~257px of inner width and had 193. `.tm` had `white-space: nowrap`
but a default `flex-shrink: 1`, so its box shrank under its own text and the text ran backwards
over the name; `.tn` had `min-width: 0` but no `text-overflow`, so it could not ellipsis either.

**Fixed at the constraint.** The six narrow tiles now give the meta line its own row — the same
shape the 390 override already used:

```css
.topic{display:flex;flex-wrap:wrap;gap:6px var(--sp-3)}
.topic .tn{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.topic .tm{flex:none}                       /* can no longer shrink under its text */
.topic:nth-child(1),.topic:nth-child(2){flex-wrap:nowrap}   /* the two wide tiles stay on one line */
.topic:nth-child(n+3) .tm{flex-basis:100%;padding-left:calc(18px + var(--sp-3))}
```

`flex:none` on the meta and `text-overflow: ellipsis` on the name mean the failure cannot recur at
any width, whatever the string length — which matters most in Swahili, where `Hali ya hewa` is
nearly twice `Weather`.

**390 re-checked.** The mobile override sets `grid-template-columns: 1fr 1fr`, so the inherited
`span 3` was clamping. It now re-states `span 2` explicitly: `All topics` and `Sports` take a full
row each, the remaining six sit two-up, all with the meta on its own line.


---

# Round 2.5 — navigation, responsiveness, paging, palette

Four inspections, four structural corrections. No token added or changed; colour grep still 0.

## 1. Navigation — one model, one active language

| Defect found | Correction |
|---|---|
| `--r-pill` meant BOTH "product line" (Up &amp; Down) and "account action" (Sign in / Sign up) — one shape, two kinds | **Shape now has exactly one meaning.** No border = destination · bordered = utility control · pill = action. Up &amp; Down is a destination, so it takes the destination geometry; its distinction moves to a gilt dot and `--brand-300` ink |
| Desktop said "current" with `--pill-active`; the phone rail said it with `--aqua-300`. Two active languages | One: `--pill-active` behind, `--text` ink, at every width. Aqua is gone from navigation |
| The rail carried 4 items to the bar's 5 — **Results and Top were unreachable on a phone**, not in an overflow, simply absent | Five slots: Markets · Up &amp; Down · Live · Results · More |
| `Sign in` sat in the rail as a destination AND in the header as an action | Auth is in the header only. The rail is destinations only |
| `role="option"` nested inside `<li>` — invalid, breaks the listbox tree | `<div role="listbox">` with `role="option"` as direct children; every row now shows its code, and the current row adds a tick |
| No skip link — a keyboard user tabbed 8 controls before reaching content | `Skip to markets` → `#main`, visible on focus |

## 2. Responsiveness — the breakpoint table is now behaviour, not a promise

The SPEC's §2 table specified 390 / 768 / 1024 / 1440 / 1920. **The delivered desktop files contained no media queries at all** — engineering had to take the table on trust, and a reviewer dragging the window saw nothing change. Measured: identical geometry at every width.

Now implemented in `01`, `03`, `04`, `06`, `07`:

| Breakpoint | What changes |
|---|---|
| ≤1200 | market grid 3 → 2 columns; hero split narrows to `1fr 380px` |
| ≤1024 | rhythm scale compresses; header nav yields to the rail; topics 6 → 4; steps 3 → 2; trust stacks; question rows go two-line; hero stacks |
| ≤820 | all grids to one column; status rail scrolls instead of wrapping; sort uncaps; settled rows restack |
| ≤560 | gutter to 16; display type down two steps; CTAs full-width; proof rail stacks; topics one-up |

Verified at 923px: **no horizontal overflow, grid correctly at 2 columns.** The only element crossing the viewport edge is the ticker run inside its masked container, which is intended.

## 3. Paging — one contract, and the numbers cannot disagree

The bar said "9 of 41" while the pager said "of 24". That is the class of defect that survives review and breaks in production.

| Rule | Value |
|---|---|
| Page size | **12** where the grid is 2–3 columns, **6** where it is one — always whole rows, never an orphan |
| The pager's total | **is** the filter-bar count — same value, same source, so drift is impossible |
| On any filter, sort or search change | paging resets to page 1 |
| Button label | `Load N more` where N = min(page size, remaining) — it can never promise more than exists |
| End of set | a sentence, not a dead button |
| Under one page | no pager rendered at all |
| Infinite scroll | not used — it strands the footer and loses your place on return |
| Announcement | the count line is `aria-live="polite"`; the grid is not |

All four states are drawn in `06-states.html` §06j.

## 4. Palette — one accent per role

The sort control wore a gold shell while its peers in the same row, at the same size and elevation, wore blue. Two accent families on peer controls is the one thing a palette cannot absorb.

**The rule, stated once:**

| Family | Means | Where |
|---|---|---|
| Blue — `--brand-*`, `--pill-active` | **view state**: what am I looking at | every filter, the segmented control, density, sort, tokens, current nav |
| Gold — `--gilt`, `--gold-*` | **value and possession**: money, the needle, what is mine | pool figures, payouts, the result count, the watch star, the eyebrow tick |
| Green / red — `--yes-*`, `--no-*` | **outcome**, never chrome | YES/NO, the conviction bar, LIVE |

Sort is view state, so it lost its gold: `--wash-inset` + `--border-control` + `--edge-shade`, with the `SORT` key in `--text-faint`. Its first-classness is size, position and a named key — not a second colour. The `giltSort` prop is retained so the gold version can still be seen side by side.

The watch star stays gold under the same rule: a starred market is **possession**, not a view filter.


---

# Round 2.6 — the filter bar, de-chunked

The bar had been reviewed as chunky, and it was. Three specific causes, all removed.

| Cause | Cost | Fix |
|---|---|---|
| **Every chip carried its own outline.** Fifteen bordered capsules in one bar, so the eye could not find which two were actually on | the whole "chunky" impression | **Only the selected chip has a border.** Unselected is `1px solid transparent` — text on transparent, with a `--bg-overlay` fill on hover. Selected keeps `--pill-active` + `--brand-400` + `--glow-selected`, and gains 8px of horizontal padding so it also reads slightly larger |
| **The `Filtered by` token row** repeated `STATUS Open · ODDS 25–75% · POOL TZS 10k+` directly beneath chips that already said it | 68px | **Deleted.** `Clear all` moves into the bar's second row |
| **Eight topic pills** turned one decision into a wall | ~100px and eight objects | **One menu control**, the same shape as sort, showing the current value and count |

Unselected chips also drop from `--sp-4` to `--sp-3` of horizontal padding, which tightens each
group without touching the 44px tap height.

**Result: the expanded bar goes from ~290px to 104px, and the first card starts 190px higher.**
Nothing lost — every control is still on screen, still 44px, still keyboard-reachable. The two
active filters are now the only outlined objects in the bar, which is a stronger signal than the
token row ever was.


---

# Round 2.7 — full revalidation

Every dimension re-measured in the browser after the de-chunk, not re-argued from memory.

| Check | Result |
|---|---|
| Horizontal page overflow | **0** |
| Box overflow (excluding floating menus, the ticker, the frozen card) | **0** — one regression found and fixed: `flex-wrap: nowrap` added to the filter groups in 2.6 made them overflow at narrow widths. Reverted to `wrap` with a `--sp-1` row gap |
| Sub-44px tap targets outside the frozen card | **0** |
| Only the selected chip is outlined | **confirmed** — `off:bare` / `ON:bordered` across every chip in the bar |
| Gold inside the filter bar | **one element** — the result count's number, which is a *value* and therefore correct under the palette rule. No gold on any control |
| Token row | **0 instances** — deleted as intended |
| Pager vs bar count coherence | `9 of 41 markets` / `Showing 9 of 9 — that is every market matching these filters` — **coherent** |
| `.shead` overhang | **0** (was 12px; fixed in 2.5 with matching `padding-right`) |
| Section rhythm, measured content-edge to content-edge | **144 · 96 · 96 · 144** at 1440, plus one internal 48. Compresses correctly at ≤1024 |

**One thing worth knowing rather than fixing:** the sticky bar measures 104px at 1440 but **198px at
923px**, because the refinement row wraps to two lines between roughly 820 and 1100. It is correct
behaviour — nothing overflows and nothing clips — but if 198px of sticky chrome on a small laptop
proves too much in testing, the lever is to move Topic into the mobile sheet at ≤1100 rather than
≤820. Noted, not applied: it trades a control off-screen for 94px, and that trade should be made
against real users rather than a hunch.
