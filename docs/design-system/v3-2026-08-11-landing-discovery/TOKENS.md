# TOKENS.md — every value, name and resolved

**Use the token name in code. This table exists so you can verify a render, not so you can paste hex.**

Every value below is already in `tokens-LOCKED.css`. Nothing was added, changed or re-scoped. The
file is dark-first and expressed in **oklch**, which is why there is no hex anywhere in this design.

---

## 1. The palette rule — read this before the tables

One accent per role. This is the governing constraint of the whole design, and the thing most
likely to be violated by accident.

| Family | Means | May appear on |
|---|---|---|
| **Blue** — `--brand-*`, `--pill-active` | **view state** — what am I looking at | every filter chip, the segmented control, density toggle, sort, active-filter tokens, the current nav item |
| **Gold** — `--gilt`, `--gold-*` | **value and possession** — money, the needle, what is mine | pool figures, payouts, the result count, the watch star, the eyebrow tick, question-board prices |
| **Green / red** — `--yes-*`, `--no-*` | **outcome**, never chrome | YES/NO buttons, the conviction bar, the LIVE chip |

Two consequences you must preserve:

- **Sort carries no gold.** It sits in the same row, at the same size and elevation, as blue-selected
  peers. Two accent families on peer controls is the one thing this palette cannot absorb. Sort's
  first-classness comes from size, position and a named key.
- **The watch star stays gold.** A starred market is possession, not a view filter.

---

## 2. Surface

| Token | Resolved | Use |
|---|---|---|
| `--bg` | `oklch(6.5% 0.130 268)` | page canvas |
| `--bg-overlay` | `oklch(11% 0.110 268)` | tinted bands, hover fills, ticker strip, footer |
| `--bg-inset` | `oklch(11% 0.110 268)` | skeleton fill, chip press state |
| `--bg-elevated` | `oklch(22% 0.140 268)` | topic tile hover, avatar ring |
| `--panel` | `oklch(20% 0.130 268)` | **the header and the filter bar — opaque, always** |
| `--wash-raised` | `linear-gradient(var(--light-angle), oklch(24% 0.145 268), oklch(20.5% 0.132 268))` | market card, skeleton card, list table |
| `--wash-inset` | `linear-gradient(var(--light-angle), oklch(10% 0.100 268), oklch(12.5% 0.115 268))` | search field, segmented track, sort control, empty-state ring |
| `--wash-float` | `linear-gradient(var(--light-angle), oklch(24% 0.165 268), oklch(21% 0.150 268))` | sort menu, language menu, typeahead, arrival pill |
| `--wash-modal` | `linear-gradient(var(--light-angle), oklch(24% 0.155 268), oklch(21.5% 0.138 268))` | the 390 filter sheet |

**Note the deliberate oddity:** `--bg-overlay` and `--bg-inset` are both 11% while the canvas is 6.5%,
so a "sunken" token is *lighter* than the page. The token file documents this as intentional. For
anything that must read as a well, use `--wash-inset` + `--edge-shade` — that is what the file says
to do, and this design does it everywhere.

## 3. Text

| Token | Resolved | Use |
|---|---|---|
| `--text` | `oklch(98% 0.012 268)` | headings, current nav, primary values |
| `--text-muted` | `oklch(86% 0.040 268)` | body copy, secondary labels |
| `--text-subtle` | `oklch(70% 0.080 268)` | eyebrows, captions, inactive nav |
| `--text-faint` | `oklch(62% 0.090 268)` | mono microlabels, filter group labels, meta |
| `--text-disabled` | `= --text-subtle` | disabled chip ink (with `opacity .45`) |
| `--text-inverse` | `oklch(15% 0.06 268)` | ink on a gilt fill (page numbers, tags) |
| `--text-link` | `= --aqua-300` → `oklch(80% 0.100 195)` | links, `Details ›`, quiet buttons |
| `--text-link-hover` | `= --aqua-200` | link hover |

⚠️ **Define `a` and `a:hover` from these two tokens in your base layer.** An undefined link renders
browser-default blue, which is not in this palette.

## 4. Border

| Token | Resolved | Use |
|---|---|---|
| `--border` | `oklch(36% 0.130 268)` | default hairline: card, bar bottom, table rows, dividers |
| `--border-strong` | `oklch(44% 0.150 268)` | the how-it-works step rule, the grab bar |
| `--border-control` | `oklch(52% 0.130 268)` | any control at rest: chip, sort, search, segmented track |
| `--border-royal` | `oklch(56% 0.170 268)` | control hover, featured card, category watermark |
| `--border-gold` | `oklch(78% 0.115 84)` | resolved chip only |
| `--border-focus` | `= --brand-500` → `oklch(63% 0.180 262)` | **`2px solid`, `outline-offset: 2px`, everywhere** |
| `--claret-edge` | `color-mix(in oklab, var(--claret-400) 60%, transparent)` | act dividers — band edges, document rules |

## 5. Brand / view state (blue)

| Token | Resolved | Use |
|---|---|---|
| `--brand-200` | `oklch(88% 0.090 262)` | count inside a *selected* chip, token kind label |
| `--brand-300` | `oklch(82% 0.120 262)` | Up &amp; Down nav ink, pending chip |
| `--brand-400` | `oklch(72% 0.160 262)` | selected chip border, primary button border |
| `--brand-500` | `oklch(63% 0.180 262)` | focus ring, mobile filter-count badge |
| `--brand-600` | `oklch(54% 0.165 262)` | primary button fill |
| `--brand-soft` | `oklch(34% 0.120 262)` | avatar 1, Up &amp; Down promo border |
| `--pill-active` | `oklch(40% 0.12 262 / 0.35)` | **the one "current/selected" fill** — nav, segmented, chips, tokens, density, menu rows |
| `--surface-pressed` | `oklch(40% 0.20 268)` | token remove-button hover |
| `--surface-disabled` | `oklch(36% 0.16 268)` | disabled chip fill |

## 6. Outcome (green / red)

| Token | Resolved | Use |
|---|---|---|
| `--yes-300` | `oklch(80% 0.14 152)` | `YES` caption, live time-left |
| `--yes-400` | `oklch(72% 0.16 152)` | the big percentage, live count, positive move |
| `--yes-500` | `oklch(62% 0.17 152)` | YES button border |
| `--yes-600` | `oklch(52% 0.16 152)` | YES button fill, mark's left half |
| `--no-300` | `oklch(80% 0.14 22)` | HOT chip ink, hero `NO` accent |
| `--no-400` | `oklch(72% 0.18 22)` | negative move |
| `--no-500` | `oklch(62% 0.20 22)` | NO button border |
| `--no-600` | `oklch(52% 0.19 22)` | NO button fill |
| `--no-700` | `oklch(44% 0.17 22)` | HOT chip border, 18+ badge ring |
| `--no-900` | `oklch(26% 0.09 22)` | HOT chip fill |
| `--live-400` | `oklch(64% 0.20 25)` | the 5px live dot |
| `--success-bg / -border / -fg` | `yes-500 @18% / @36% / --yes-200` | settled-strip YES pill |
| `--danger-bg / -border / -fg` | `danger-500 @18% / @36% / oklch(82% 0.16 25)` | LIVE chip, settled-strip NO pill, ticker label |

## 7. Value and possession (gold)

| Token | Resolved | Use |
|---|---|---|
| `--gilt` | `= --gold-300` → `oklch(86% 0.110 84)` | pool figures, result count, payouts, watch star, eyebrow tick, step numerals, question-board prices, the needle |
| `--gold-subtle` | `color-mix(in oklab, var(--gold-500) 18%, transparent)` | resolved chip fill (**not** sort — see §1) |
| `--gold-subtle-hover` | `… 30% …` | its hover |

## 8. Accent (fixed, from the mark)

| Token | Resolved | Use |
|---|---|---|
| `--claret-500` | `oklch(48% 0.160 15)` | mark's right half |
| `--claret-800` | `oklch(23% 0.085 15)` | avatar 2 |
| `--aqua-300` | `oklch(80% 0.100 195)` | link ink |
| `--aqua-400` | `oklch(72% 0.110 195)` | **the sparkline stroke** |
| `--aqua-800` | `oklch(32% 0.060 195)` | avatar 3 |
| `--pearl-50` | `oklch(99% 0.006 268)` | ink on any filled button |

## 9. The conviction bar (frozen — reproduce exactly)

| Token | Resolved |
|---|---|
| `--bar-fill-yes` | `linear-gradient(90deg, oklch(50% 0.14 152), oklch(58% 0.16 152))` |
| `--bar-fill-no` | `linear-gradient(270deg, oklch(52% 0.16 22), oklch(60% 0.18 22))` |
| `--bar-track-border` | `oklch(58% 0.17 268)` |
| `--bar-needle` | `= --gilt` |
| `--bar-needle-glow` | `color-mix(in oklab, var(--gilt) 55%, transparent)` |
| `--bar-glow-yes` | `0 0 18px oklch(58% 0.16 152 / 0.35)` |
| `--bar-empty-track` | `repeating-linear-gradient(90deg, var(--border-strong) 0 8px, transparent 8px 15px)` |
| `--bar-shimmer` | `linear-gradient(90deg, transparent, oklch(75% 0.110 84 / 0.5) 50%, transparent)` |

**Geometry — three scales of one instrument:**

| Scale | Track | Fill | Needle |
|---|---|---|---|
| Inside a card (frozen) | 7px, `--r-pill`, 1px `--bar-track-border` | to `pct%` | 4 × 19px, `rotate(14deg)`, `0 0 8px var(--bar-needle-glow)` |
| A list row (mini) | 5px × 72px | to `pct%` | 3 × 11px, `rotate(14deg)` |
| **The whole board (new)** | 10px, max 620px | to the volume-weighted YES share | 5 × 24px, `rotate(14deg)`, `0 0 10px var(--bar-needle-glow)` |

## 10. Hero

| Token | Resolved |
|---|---|
| `--hero-grad-warm` | `radial-gradient(ellipse 90% 70% at 75% 30%, oklch(24% 0.150 268), oklch(20% 0.135 268) 60%, oklch(15% 0.130 268))` |
| `--hero-panel-grad` | `linear-gradient(135deg, oklch(22% 0.140 268), oklch(30% 0.165 268))` |
| `--hero-text-strong` | `= --pearl-50` |
| `--hero-yes-accent` | `= --yes-300` |
| `--hero-no-accent` | `= --no-300` |
| `--hero-mark-opacity` | `0.10` |

## 11. Elevation — four rungs, never a fifth

| Rung | Token | Resolved | What sits here |
|---|---|---|---|
| 0 | — | — | the page |
| 1 | `--elev-raised` | `var(--edge-lit), 0 1px 2px oklch(6% 0.06 268 / .55), 0 10px 28px -10px oklch(4% 0.04 268 / .70)` | market card, list table, Up &amp; Down promo |
| 1h | `--elev-raised-hover` | `var(--edge-lit-strong), 0 2px 4px …, 0 14px 34px -10px …` | card hover, featured card |
| 2 | `--elev-float` | `var(--edge-lit-strong), 0 0 0 1px oklch(42% .15 268 / .75), 0 8px 28px -8px …, 0 24px 56px -16px …` | **every menu**: sort, language, typeahead, arrival pill |
| 3 | `--shadow-overlay-up` | `var(--edge-lit-strong), 0 -24px 56px -16px oklch(5% 0.05 268 / .62)` | the 390 filter sheet, the bottom rail |

| Edge | Resolved | Use |
|---|---|---|
| `--edge-lit` | `inset 0 0 0 1px oklch(96% 0.04 268 / 0.055)` | any filled button, raised surface |
| `--edge-lit-strong` | `inset 0 0 0 1px oklch(96% 0.04 268 / 0.09)` | hover, floats |
| `--edge-shade` | `inset 0 -1px 0 oklch(6% 0.03 268 / 0.30)` | **anything that must read as sunken** |
| `--glow-selected` | `0 0 12px -1px color-mix(in oklab, var(--brand-500) 45%, transparent)` | selected chip, primary hover |
| `--shadow-2` | `0 2px 6px oklch(14% 0.08 268 / 0.45)` | header and filter bar **when scrolled** |
| `--shadow-4` / `--shadow-5` | `0 8px 28px -8px …` / `0 14px 44px -12px …` | document frames only |

`--btn-hover-gain: 1.03` — the hover brightness for every filled button, in one place because it is
an AA input. Use `filter: brightness(var(--btn-hover-gain))`, never a hand-picked lighter colour.

## 12. Type

| Token | px | Used for |
|---|---|---|
| `--type-hero` | 72 | (available; not used — the question board took the space) |
| `--type-display-1` | 60 | landing H1, desktop |
| `--type-display-2` | 44 | landing H1 at 390 · every proof figure · the trust statement |
| `--type-h1` | 32 | section headings, `The board`, question-board prices |
| `--type-h2` | 24 | question-board rows, how-it-works steps, empty-state headings |
| `--type-h3` | 20 | lede, Up &amp; Down heading, question rows ≤1024 |
| `--type-h4` | 17 | button labels, topic names, result count, trust headings |
| `--type-body` | 15 | body copy, search input, card question |
| `--type-small` | 13 | chips, secondary body, footer links, pager |
| `--type-micro` | **11** | **the floor for all new work** — eyebrows, ticker, meta, filter labels, chip counts |
| `--type-label` | 9.5 | ⚠️ frozen card only |
| `--type-nano` | 8.5 | ⚠️ frozen card only |

**Families:** `--font-display` Sora · `--font-body` Inter · `--font-mono` JetBrains Mono.
Weights: Sora 700/800 · Inter 400/500/600/700 · Mono 400/500/700.

Every number that can change — prices, pools, counts, countdowns — is **mono with
`font-variant-numeric: tabular-nums`**, so it does not jitter as it updates.

Letter-spacing: display `-.022em` · h1 `-.012em` · mono caps `.16em` · eyebrows `.18em`.

## 13. Spacing, radius, control heights

```
--sp-1  4    --sp-2  8    --sp-3  12   --sp-4  16   --sp-5  20
--sp-6  24   --sp-8  32   --sp-10 40   --sp-12 48   --sp-16 64

--r-xs  4    --r-sm  8    --r-md  12   --r-lg  16   --r-xl  24   --r-pill 999
```

**Radius means something. One meaning each:**

| Radius | Meaning |
|---|---|
| `--r-xs` | a tag or a keycap |
| `--r-sm` | a **destination** (nav item) or a **utility control** (language, when bordered) |
| `--r-md` | a button, a menu, an input, a list container |
| `--r-lg` | a card |
| `--r-xl` | an empty state, the filter sheet's top corners |
| `--r-pill` | an **action** (auth), or a chip / segmented button |

**The rhythm scale** — derived, four steps, nothing else at section level:

```
--rh-tight   = var(--sp-6)             24    heading → its content
--rh-close   = var(--sp-12)            48    two halves of one idea
--rh-section = calc(var(--sp-12) * 2)  96    a new idea
--rh-chapter = calc(var(--sp-12) * 3) 144    a new act, always with a band edge
```

**Control heights**

| Token | Value | Note |
|---|---|---|
| `--tap-min` | 40px | the file's floor |
| `--h-input` | 44px | search, and the height every new control uses |
| `--h-control-md` | 38px | `/* Phase 3 → 44 */` — the YES/NO buttons live here |
| `--h-control-sm` | 30px | `/* Phase 3 → 40 */` |

**This design uses 44px as the floor for everything it introduces.** The 38px and 30px tiers appear
only inside the frozen card, where the token file already schedules the fix.

`--w-board: 1280px` — the content column, everywhere. It does not grow past 1280 at 1920.

## 14. Motion values

| Curve | Value |
|---|---|
| glide | `cubic-bezier(.22, 1, .36, 1)` — anything arriving |
| ease-out | `cubic-bezier(0, 0, .2, 1)` — hover and press |
| settle | `cubic-bezier(.34, 1.56, .64, 1)` — a token appearing |
| linear | opacity-only, and the ticker |

| Duration | Value | Use |
|---|---|---|
| 140ms | `--t-quick` | every hover and press |
| 160–220ms | `--t-base` | menus, token add/remove, grid re-deal |
| 340ms | `--t-move` | entry rises, section reveal, topic lean bar |
| 42s | — | the ticker, linear infinite |
| 1200ms | — | skeleton shimmer, ease-in-out |

`--m-glide` / `--t-*` live in `motion.css`, which these layout files do not link — so they carry
literal values. **In the codebase, use the tokens.**

⚠️ **`transition: all` must never appear.** It is what produced the 895 elements currently computing
to `transition: all 0s ease`. One rule per interactive family, five families — `MOTION.md` §5.

---

## 15. Verification — run these before you call it done

```bash
# 1. no colour literal anywhere in your new styles
grep -nE '#[0-9a-fA-F]{3,8}|rgba?\(|oklch\(|hsla?\(' <your new style files>
#    → must be empty. Every colour comes from a token.

# 2. no transition:all
grep -n 'transition:\s*all' <your new style files>
#    → must be empty.

# 3. no sub-11px type outside the frozen card
grep -nE 'type-(label|nano)' <your new component files>
#    → must be empty.
```

Then in the browser:

```js
// 4. every interactive element ≥ 44 × 44, outside the frozen card
[...document.querySelectorAll('a,button,input,[role=option],[role=radio]')]
  .filter(e => !e.closest('[data-market-card]'))
  .map(e => { const r = e.getBoundingClientRect();
              return (r.width < 44 || r.height < 44) ? [e, Math.round(r.width) + '×' + Math.round(r.height)] : null; })
  .filter(Boolean);
// → must be empty.

// 5. no horizontal overflow at any width
document.documentElement.scrollWidth <= window.innerWidth + 1;
// → true at 390, 560, 768, 820, 1024, 1200, 1440, 1920.
//   The ticker run is the one intended exception — it overflows inside a masked container.
```
