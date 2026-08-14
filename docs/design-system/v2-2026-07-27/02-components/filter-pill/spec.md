> 📑 **RECORD, NOT RULE.** The rulebook is **`docs/DESIGN_AUTHORITY.md`**.
> Unlike its siblings in this folder, this is **not** a July-2026 designer redline — the
> component did not exist then. It is the spec written alongside the code in batch 5
> (2026-08-14), filed here because §0b says a component spec lives beside its siblings.
> The live values are in `src/components/ui/filter-pill.tsx` and `src/app/globals.css`;
> those files outrank this one.

# FilterPill — the ONE filter control language

**Contract:** `FilterPill { href, label, count?, on, semantics: "tab"|"toggle", rank:
"primary"|"secondary", glyph?, title?, testId?, replace?, scroll?, onClick?, className?,
countClassName? }` · `FilterGroupKey { children, className? }`

One pill, every player filter rail. Extracted in batch 5 from the module-private `Chip` inside
`discovery-bar.tsx`, which five other surfaces had been told to match and none did.

## Why it exists — measured, not asserted

Ali, reading the live platform 2026-08-14: *"filtering is not designed properly, markets has a
different filter design than up and down."* The scan that followed ran in a real browser against
production and found, across eight player filter rails:

| | before | after |
|---|---|---|
| control heights | **40 / 44 / 48 / 64px** | 44px, everywhere |
| radii | 8px (`rounded-md`) on five rails, 999px on one | 999px |
| inline `style` at the call site | on every diverging rail — **and on `/markets` itself** | none |
| unselected controls carrying an outline | all of them, on five rails | none |

## The governing rule

**Only the SELECTED pill carries an outline. An unselected pill is text on transparent.**
Inherited verbatim from the round-2 kit (COMPONENTS §3), whose own words are: *"fifteen outlined
capsules in one bar was the single biggest source of the 'chunky' criticism the round-2 brief was
answering."* A rail that outlines every control does not merely look different — it contradicts
the reasoning the current design exists to embody.

`border-transparent` when off, not "no border": the box is the same size in both states, so
selecting a pill can never reflow the rail it sits in.

## Geometry

| | |
|---|---|
| height | `min-h-[44px]` — above Law 9's 40px floor, at the 44px §A2 prefers on mobile |
| radius | `rounded-pill` (999px) |
| padding | `px-4` selected · `px-3` unselected — the selected pill earns a little more air |
| type, `rank="primary"` | 13px, semibold |
| type, `rank="secondary"` | 11.5px mono, semibold |
| count | 11px mono bold, tabular — `--brand-200` when selected, `--text-faint` when not |

⚠️ **`min-h-[44px]` is an arbitrary value ON PURPOSE, and must stay one.** Tailwind's spacing
scale is overridden in this repo (`h-8` = 48px, `h-9` = 64px — `tailwind.config.ts:162-177`), so
a scale class here is silently the wrong size. That override is exactly how `/updown`'s asset
tabs shipped at **64px** from an `h-9` that reads like 36. There is also no `--h-control-*` rung
at 44px, so there is no token to reach for. ⛔ Never "tidy" it into `h-11`.

## The selected state is a class, not an inline style

`.kp-fchip[data-on]` in `globals.css` carries `background: var(--pill-active)` and
`box-shadow: var(--glow-selected)`. `.kp-fopt[data-on]` carries the fill alone for a listbox
row — no halo, because a glow inside a panel lights one row against its neighbours rather than
against the page.

🔴 This is the law-82 breach the extraction **fixed rather than copied**: the reference chip in
`discovery-bar.tsx` wrote both values inline at the call site, and the five rails told to match
it had duly copied the habit. ⛔ `test:design-frozen` could not see any of it — its rules are
exempted by any line containing `var(--`, and every one of those inline styles did.

## Rank is the only sanctioned difference between two rails on one page

`/updown` genuinely has two ranks: the asset is the subject, the duration refines it.
`/profile/account`'s category filter is a sub-filter inside a panel. Consistency means one
control *language*, not one *volume* — so the hierarchy is a prop decided once in the primitive,
never an inline style at the call site.

## Semantics — one prop, both correct

- `semantics="tab"` → `aria-current="page"`, present only when selected. A rail where exactly
  one option is in force and choosing it navigates. Seven of the eight rails.
- `semantics="toggle"` → `aria-pressed`, always emitted (`true` *and* `false`). What `/markets`'
  chips have shipped since the discovery bar landed.

⛔ Never impose one on both. A tab rail announcing `aria-pressed` tells a screen-reader user that
`/positions`' "Open" is a toggle they can un-press, which is a lie about the control.

## The count slot is optional, and inventing one is forbidden

`/markets`, `/results`, `/positions` and `/updown/history` carry honest counts. `/updown`'s asset
and duration tabs carry **none**: `BoardAsset` has no round count, the board reads rounds for the
active chain only, and `durations.length` would be a count of chains wearing the costume of a
count of games. A-5 forbids that. Consistency means the same control language, not a number on
every control.

## ⛔ Machine contract — do not break these

- `data-chip` is emitted **immediately before** `data-count`, as literal adjacent JSX
  attributes. `qa:discovery-probe` matches them with a REGEX over raw SSR HTML
  (`/data-chip="([^"]+)"\s+data-count="(\d+)"/g`), not a selector. A spread, a reorder, or any
  attribute interposed between the two makes it find **zero** controls and report a product
  failure that is really an instrument break.
- `data-chip` is `"<realQueryParamName>:<realParamValue>"`. `qa:results-board` slices it by
  index (`.slice(4)`), so `cat:` is not decoration.
- `data-count` is a bare integer, never formatted.
- The pill renders an `<a>` with a real `href`. `qa:results-board`'s zero-count escape hatch
  looks for an `<a>` with a `q=` and no `cat=`; a `<button>` removes that match.
- Every rail carries `data-filter-rail` on its container — the one hook the live instrument
  addresses. Without it, a selector that describes the *shape* of a filter control also finds a
  bottom-nav link, which is how the first version of the scan reported a 0px-tall "filter".

## Guarded by

`npm run test:filter-language` (66 assertions, incl. a vacuity control) · RED proof
`npm run red:filter-language` (8/8, each defect on its own assertion) · live geometry + day-rail
count honesty `npm run qa:filter-scan`.

## Consumers (eight rails, eight files)

`discovery-bar.tsx` (`/markets`) · `results/page.tsx` · `proposals/page.tsx` ·
`positions/page.tsx` · `updown-board-tabs.tsx` (`/updown`, two rails) ·
`updown/history/page.tsx` · `profile/activity/page.tsx` · `profile/account/page.tsx`.
