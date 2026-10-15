# F38/F39 shared-kit candidate — 2026-10-15

## Integrated continuation from `20c49f568`

The first Chip/Stat candidate is in the integrated source. A fresh source read of that exact base found **406** inverted spacing usages in **156** source files, **852** arbitrary `text-[Npx]` sites, **732** sub-floor reading sites, and **31** inline font-size sites. The last three are the existing `test:type-scale` census over the entire source tree, including admin; they must not be presented as player-only counts. Its stale ceilings were 859/737/32 and are lowered below to the actual integrated totals.

This continuation moves two low-risk `/live` sites:

| Site | Before | After | Rendered effect |
| --- | --- | --- | --- |
| Featured carousel current/total counter | `text-[10.5px]` | `text-caption` (11px) | The tiny mono count grows 0.5px and gains the caption rung's 15px line height and 0.2px tracking. It sits between fixed 40px arrows. |
| Infinite-load spinner/label gap | `gap-2.5` (stock 10px) | `gap-2` (12px) | The spinner and loading word separate by 2px; the loading strip may grow by 2px. |

The updated measured source census is **405** inverted spacing usages in **156** files, **851** arbitrary sizes, **732** sub-floor reading sites, and **31** inline font-size sites; semantic adoption is **2493 / 3344 (74.6%)**. `test:spacing-scale` and `test:type-scale` ratchets now equal those measurements. These totals remain a backlog, not F38/F39 closure. The `/live` changes still need a rendered read at 320/360/390 and desktop in sw/en/zh, including the spinner's visible state. No browser evidence was taken while S8 parity and A21 timing used the machine.

Remaining named F38 source examples include `.mcardp-details` at 11.5px, `/live` pulse title at 13.5px and featured title at 19px, Up & Down card values/labels at 10.5/11.5/12.5/14.5/15.5px, and the Stat value exceptions at 13.5/21px. F39 includes many page-level `.5` spacing utilities and private card values. The `/live` pulse-card price-row `mt-2.5` is retained until its card and loading ghost can be measured together; changing it would raise every card 2px while the existing ghost already needs a matched read. The current source guard counts all 405 inverted usages; a wider visual decision requires checking each affected row's text wrap and card/skeleton alignment before changing them.

---

## Earlier shared-kit candidate (historical)

Source census from `c8a982cd7`, staged on `codex/visual-kit-candidate-1015`. The governing measurements are the F38/F39 rows in `visual-audit-20261015.md`; the values and two-ladder rule are in `DESIGN_AUTHORITY.md` §T7/§S1. This is a source candidate. Its changed pixels still need a browser read after V1/V2 merge.

| Owner | F38/F39 source read | Candidate |
|---|---|---|
| `ui/chip.tsx` | `xs` 9px (market-card status/signal); `md` base 10.5px (default Chip across player and admin); `lg` status 12.5px. The other five size/metrics rows are on one of the two type ladders. | 9→9.5, 10.5→11, 12.5→13px. Heights and padding remain identical. `test:chip-contract` confirms every one-line content box stays under its minimum height. |
| `ui/stat.tsx` labels | `micro` and `tiny` were 9px; the six other labels are 9.5/10px. | Both 9→9.5px. The default `xs` value 13.5px and `2xl` value 21px remain explicit owner-deferred exceptions documented in the component. |
| `ui/stat.tsx` boxes | `inset` had `py-2.5` (10px); `tile` had `px-3.5` (14px); `panel` and `pad` had `py-3.5`; `glass` had `p-3.5`. These stock fractional keys fall between the declared `--sp-*` rungs. | Five entries move to 12/16px `--sp-*` rungs through Tailwind's existing spacing bridge; `card` stays unchanged. The inverted-spacing count falls 412→407, ratcheted in `test:spacing-scale`. |
| `ui/callout.tsx`, `globals.css` | F39's small Callout and several CSS literals. | V1 owns these files; do not resolve from this branch. |
| `market-card.tsx`, page CSS, Up & Down/history/round, tipbar/live counters | Remaining F38 text on player surfaces; `mcardp-details`, `.btn-xl`, and page-specific spacing also remain. | V2a/V2b/S12 and their visual passes own these source sites. This branch does not claim F38/F39 closure. |

`test:visual-kit-backlog` reads the kit dictionaries, the two type ladders, `--sp-*`, and the Tailwind spacing bridge. It requires 8 Chip rows, 8 Stat labels, 6 Stat boxes, and only the two named Stat value exceptions. Four in-memory plants restore off-ladder values and must fail; one control uses different valid rungs and must pass. `test:chip-contract`, `test:type-scale`, `test:spacing-scale`, and `test:visual-pass-r8b` provide independent coverage.

## Browser gate before merge

1. Compare market-card chip rows on `/`, `/markets`, `/live`, and `/watchlist` at 320/360/390/768/1280, especially Swahili `HALI YA HEWA` and signal labels. A longer chip may change line wrapping even though its height floor is unchanged. The market-card historical comment still says 9px and must be updated on the V2a integrated tree if the candidate is accepted.
2. Compare default/large Chip and Stat pages: `/markets/[id]`, `/results`, `/wallet`, `/profile`, `/profile/activity`, `/positions/performance`, `/profile/invite`, and `/agent` in en/sw/zh where applicable. Inspect value/label alignment and skeleton-to-page stability.
3. Re-run the F38/F39 visual census on the integrated build. Close only measured cells; retain the 407 broad legacy spacing usages and page-specific type debt as a ratcheted backlog until each surface is read and fixed.
