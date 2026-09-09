> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`** — this component's rule
> is **§K 6c**, and where the two disagree the rulebook wins.
> Like `filter-pill/`, this is **not** a July-2026 designer redline: the component did not exist
> then. It is the spec written alongside the code by the PLAYER QUERY campaign (2026-09-07 →
> 2026-09-09), filed here because §0b says a component spec lives beside its siblings.
> The live values are in `src/components/ui/query-bar.tsx`, `src/lib/query/windows.ts` and
> `src/app/globals.css`; those files outrank this one.
> Shape and on-ramp: `docs/DESIGN-BASELINE.md` §3c. Board, census and the eight-place rule:
> `docs/PLAYER-QUERY-CAMPAIGN.md`.

# QueryBar — the ONE query surface on every page that lists anything

**Contract:** `QUERY_BAR_CLASS` · `QUERY_BAR_CLASS_PANEL` · `QUERY_GROUP_CLASS` ·
`QuerySort { label, value, ariaLabel, options, dirHref, dir, ascLabel, descLabel }` ·
`QueryOption { href, on, trailing?, children }`

`FilterPill` is the control; this is the surface the controls sit in. The two specs are a pair:
rule 6 settled the pill, and for five stages nothing said what the pill sits in — so every
listing page answered that question for itself.

## Why it exists — measured, not asserted

A player *"cannot tell what is still running from what is finished, and inside what is finished
cannot tell won from lost from voided-and-refunded"*, and could not search or sort their own
history. The answer already existed and was already law on `/markets` — six lifecycle lenses, six
sorts with a tri-state direction, the shared search grammar, cross-filtered counts, a phone filter
sheet and a named empty cause for every dead end. **It had never been carried across to the pages
where a player looks at their own money.**

Ali's framing: *"design matters more than anything at this level because our players are all
critics in the first period"*, and *"client or user facing pages should all be perfectly handled
and perfectly interpreted."*

⭐ **Nine routes were converted (campaign tasks 4.6–4.14) and every one of them CORRECTED the
plan.** The plan was written from reasoning; each route was corrected by reading. That ratio — 9
of 9 — is the argument for reading the page before designing its bar.

## The shape

```
┌────────────────────────────────────────────────────────────────┐
│  🔍  Search positions                                     [×]  │  ← only where the page has
│      2 words · hiding crypto                                   │    search; the echo row is
├────────────────────────────────────────────────────────────────┤    ALWAYS reserved height
│  [All 47] [Open 6] [Settled 41] [Won 18] →      41 positions   │  ← LENS · primary rank
│                                                                │    scrolls ≤lg, wraps >lg
│  Sort: Most recent │↓│   [Filters 2]                           │  ← phone
│  Sort: Most recent │↓│ │ SIDE [Any][Yes][No] │ TOPIC ▾ │ Clear │  ← desktop ≥lg
└────────────────────────────────────────────────────────────────┘
```

## Geometry

| | |
|---|---|
| stick | `sticky top-[56px] z-20` — 56px is the app header's height |
| bleed | `-mx-3 px-3`, `lg:-mx-6 lg:px-6` — the bar spans the measure, its content does not |
| desktop group | `QUERY_GROUP_CLASS` = `hidden min-w-0 flex-wrap items-center gap-1 lg:flex` |
| sort control | `<details>` + `<summary>`, `w-full min-w-0`, fused `rounded-l-pill` |
| direction | a 44×44 `<Link>`, `shrink-0`, fused `rounded-r-pill` |
| tap floor | 44px on **every** control, including the sort menu's rows and `Clear` |

⛔ **`w-full` ON THE SUMMARY IS LOAD-BEARING, AND `shrink` IS NOT ITS SUBSTITUTE.** The first
attempt was `shrink` and it changed nothing — measured. The summary is not a flex item: its parent
`<details>` is a plain block, so `flex-shrink` has no one to negotiate with. `w-full` binds the
summary to the width the `<details>` was already shrunk to as a flex item of the row, and only
then does the value's `min-w-0 truncate` have a box to truncate inside.

⛔ **`min-w-0` GOES WITH `flex-wrap` IN THE DESKTOP GROUP.** Without `min-w-0` a group's
min-content width is its widest pill, so a flex parent lets it exceed the line rather than break
it. Dropping either one alone is how *"Mchanganyiko / Zote"* ran **162px past a 1280 viewport** on
`/proposals` in Swahili.

⛔ **TWO STICKY SURFACES CANNOT SHARE ONE OFFSET.** A second sticky band at `top-[56px]` overlaps
the bar by **91px**. `/proposals`, `/watchlist` and `/results` each carry a comment saying exactly
why their search band is *not* sticky; the clearance used to exist as `/results`' retired sidebar
at `top-[122px]`, and it was deleted without replacing what it was buying.

⛔ **A STICKY ELEMENT ONLY STICKS WITHIN ITS PARENT'S BOX.** `/updown/history` reported
`bar@-252` while every other surface reported `bar@56`: its bar sat inside a 247px wrapper and
unpinned after a quarter of a screen, on the one route that can render four hundred rows.

⚠️ **NOT EVERY BAR PROMISES A PAGE-LEVEL OFFSET.** `/profile/account`'s rail filters one table
inside one of five panels; a sticky band there would follow the reader down and hover over *Close
account*, a one-way ceremony. It takes `QUERY_BAR_CLASS_PANEL` and declares `sticky: false` to the
driver — the declaration is what keeps the assertion sharp for the bars that DO promise the offset,
instead of loosening it for all of them.

## The nine rules

Stated once in `DESIGN_AUTHORITY.md` §K 6c. In brief, and none of them optional per surface:

1. **Lens and sort never go behind a click, at any width** — §K 6b's other half.
2. **Only the selected pill is outlined** (rule 6).
3. ⛔ **A filter pill is NEVER coloured by its status.** `Won` does not go gold. Four colours in
   one rail is a second control language and it collides with the status chips on the cards
   below, which *are* the status language. **Pills stay brand-outline; cards carry the tone.**
4. **Every count is cross-filtered, or no count renders.**
5. **The result count is ONE variable**, published as `data-result-count`.
6. **Every state is in the URL**, defaults omitted; `replace` + `scroll: false` — a filter is not
   a navigation.
7. **Changing anything resets to page 1.**
8. **An empty result names its own cause** and offers an exit only when that exit's count is `> 0`.
9. **A scrolling rail scrolls its active pill into view on load** (`StripAutoScroll`).

## ⛔ Machine contract — do not break these

| | |
|---|---|
| `data-filter-rail` | on the rail. Every geometry and count instrument keys on it |
| `data-result-count` | the ONE result number, on the bar |
| `QUERY_GROUP_CLASS` | the desktop group's class. ⚠️ **fourteen `<nav>`s across six other bars still carry the unrepaired `hidden shrink-0 items-center gap-1 lg:flex`** — the repair landed in a constant and was never rolled out |
| locale | the bar is measured in `sw` / `en` / `zh`; Swahili runs 35–40% longer than English |

## Guarded by

| gate | what it alone can see |
|---|---|
| `qa:bar-geometry` + `red:bar-geometry` | **what a person sees**: two controls in the same pixels, a control off the right edge, a control under 44px, and whether the bar still sticks after a scroll — per surface × width × locale, with a screenshot beside every measurement. **4/4 red cases caught** |
| `qa:count-truth` + `red:count-truth` | rule 4 — 98 pills / 6 surfaces; 4/4 caught |
| `test:route-census` + `red:route-census` | no client-facing route escapes a ruling. 3/3 caught |
| `test:lifecycle-reach` + `red:lifecycle-reach` | every stored state is reachable by some lens. ⛔ declared UNIONS excluded — a `settled` pill matching a `cashed` row is reachability in NAME only |
| `qa:player-filters` | the rails, driven live |

⭐ **WHY THE GEOMETRY GATE HAD TO EXIST.** The `/markets` 44px overlap shipped with **every
automated check green**: the document does not overflow, so `test:responsive` passed; the radius
and tap floor were untouched, so `qa:filter-scan` passed. **Neither asks whether two controls
occupy the same pixels, or whether a control has fallen off the screen.**

🔴 **AND THE GATE ITSELF EXEMPTED WHAT IT POLICED, FOR A DAY.** Its "inside a shut disclosure"
exemption walked up from `e.parentElement`, and a `<summary>`'s parent IS the `<details>` it opens
— so every summary on every bar was dropped before any assertion ran, and assertion 1 (NO OVERLAP)
was structurally incapable of failing on the sort control the driver was built for. ⚠️ It produced
a **false retraction**: a mutated run reported "7 boxes, no overlap" and the red case was retired
on that measurement. The box count *was* the symptom. ⭐ **When a red mutation stops reproducing,
suspect the instrument before you retire the case.** Full record in
`scripts/anchors/bar-geometry.anchors.mjs`.

## Consumers

Re-derive rather than trust this list — it is the kind of list that rots:

```bash
grep -rln "QUERY_BAR_CLASS\|QUERY_GROUP_CLASS\|QuerySort" src/app src/components
```

## ⛔ Declaring a rail takes EIGHT places, not four

The four usually omitted are the **live drivers**, and all four **fail silently** on a route they
were never told about — reporting a clean run over a page they never opened. The canonical list is
`docs/PLAYER-QUERY-CAMPAIGN.md` §6, which itself listed only four until 2026-09-08.
