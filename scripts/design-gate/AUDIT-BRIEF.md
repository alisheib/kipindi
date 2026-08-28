# Design-consistency audit — shared brief for every auditor agent

You are one auditor in a fleet. Read this whole file before opening anything else. Your output is
a list of DEFECTS, each with measured evidence. This report is the FINAL GATE before the platform
is called "perfectly rendered", so **details are the job**: exact pixels, exact class strings, exact
file:line. A vague finding ("spacing feels off") is worthless; a measured one ("the row's Select is
36.8px beside a 32px input, because `py-1.5` is 8px on this repo's overridden scale — select.tsx:282")
is the deliverable.

## The product, in one paragraph
50pick (repo `F:\kipindi-main`, Next.js 16 + Tailwind, single dark royal theme, EN/SW/ZH). Two
surfaces: the **player** app (`src/app/**` except admin; shell in `src/components/layout/`) and the
**admin console** (`src/app/admin/**`, shell in `src/components/admin/admin-shell.tsx`). One UI kit in
`src/components/ui/` (Button, Input, Select, Textarea, Checkbox, Toggle, Chip, Tabs, FilterPill,
SearchBox, Modal, ConfirmDialog, Stat, EmptyState, Pagination, PageHeader, Callout…). Tokens live in
`src/app/globals.css` (`--type-*`, `--sp-*`, `--r-*`, `--h-control-xs/sm/md/lg/xl` = 32/40/44/48/56,
`--h-input` = 44, `--tap-min` = 40) and `src/app/motion.css`. The rulebook is
`docs/DESIGN_AUTHORITY.md` (read §T type, §S space/shape, §A floors, §K kit adoption, §B11 status
colours, §E elevation; the rest as needed).

## ⛔ Three traps that make naive readings WRONG
1. **Tailwind spacing is OVERRIDDEN** (`tailwind.config.ts:204-218`): `h-6`=32, `h-7`=40, `h-8`=48,
   `h-9`=64, `h-10`=80, `h-11`=96, `h-12`=128; `gap-2`=12, `gap-3`=16, `p-4`=20, `py-1.5`=8,
   `px-2.5`=10 (stock, NOT overridden → scale inverts at .5 steps). Never read a class as its
   Tailwind default. `mt-12` is 128px here.
2. **`rounded-md` = 8px but `--r-md` = 12px** (frozen legacy, Ali deferred). Semantic keys
   `rounded-card/control/chip/modal` are canonical.
3. **A kit component's stated size is not its rendered size.** `Select size="xs"` says
   `min-h-[32px]` and renders 36.8px. Trust the measurement JSON, then explain it from source.

## What was measured for you (read-only live drive of production, 2026-08-28)
Folder `F:\kipindi-main\.qa-design-gate\`:
- `out-admin/<slug>.json`, `out-player/<slug>.json` — per route: `m1440.controls` (every button/
  field/chip/nav link: x,y,w,h, fontSize `fs`, family `ff`, weight `fw`, radius `br`, padding, colours,
  classes), `m1440.rowGroups` (controls sharing one flex/grid row whose heights differ >2px),
  `headings`, `upper` (small UPPERCASE label styles with counts), `labels`, `type` (font-size census),
  `cards` (radius×padding×border×shadow of every panel), `tables` (th/td type + padding, row heights,
  `hoverCells`), `sections` (vertical gaps), `truncated`, `nav`, `shell`; `hover[]` (hover probe: which
  CSS properties changed on hover, `changed: []` = NO hover response); `m390` (rows/small controls/
  truncation at phone width); `overflow390/1920`; `errors` (console errors).
- `out-<surface>/<slug>-1440.png`, `-1920.png`, `-390.png` — full-page screenshots. **LOOK at them.**
- `out-<surface>-overlays/_overlays.json` + PNGs — every dropdown/menu/drawer/sheet opened and measured.
- `analyze.mjs` — `node .qa-design-gate/analyze.mjs admin|player <section>` prints cross-page
  tables: `status heights rows headings labels type cards tables sections truncated hover nav small radius`.
  Run it; it is faster than reading 47 JSON files.

## Already filed — do NOT re-file these (cite them if you touch the same ground)
- `docs/SCAN-2026-08-28.md` S-01…S-18 (S-03 chart label contrast, S-07 hand-rolled admin filter chips
  on ai-polls/candidates incl. 26px tap + bold-reflow, S-09 the .5-step spacing inversion, S-12 aqua/
  claret misuse). `docs/ADMIN-CONSOLE-FINDINGS.md` A1–A6. `docs/perfection-plan.md` §9.1/9.2.
- Known and deliberately deferred: numeric radius scale; `--h-control-*` / `--type-nano` raises
  (Ali's Phase-3 call); density toggle; search typeahead.
- New instances of a filed class ARE worth filing when they are on a different surface (e.g. the
  finance period picker is a third outlined-capsule rail — file it, cite S-07).

## What "consistent" means here (the checklist — go through EVERY item for your pages)
1. **Controls on one row share one height**, and that height is a `--h-control-*` rung. Inputs,
   selects, buttons, chips in a filter row: all 32 (dense admin) or all 40/44. Mixed = defect.
2. **Text inside inputs**: one size per rung (kit: sm 13px / md 16px). Placeholder colour/opacity one
   recipe. Prefix/suffix adornments same size as the field text. Mono only for numeric/ids.
3. **Buttons**: only kit variants (`primary yes no ghost danger gold claret aqua-ghost`) at kit sizes;
   no raw `<button className="btn …">` with extra size/colour utilities; icon buttons square at the
   rung; primary action rightmost; ghost for cancel; one button radius (`--r-md`) except `btn-xl`.
4. **Type**: every size on the `--type-*` ladder (8.5 9.5 11 13 15 17 20 24 32 44 60 72) or the Tailwind
   tokens (micro 10 / caption 11 / label 12 / body-sm 13 / body 14 / body-lg 16 / title-sm 18 /
   title-md 22 / title-lg 28). Hand-typed `text-[13.7px]`-style sizes that are not on either ladder
   are defects. Page title = 28px display. Card title one style. Eyebrow/label ONE recipe
   (10px mono uppercase 0.16em? — measure what is actually used and name the winner).
5. **Labels & eyebrows**: same word, same style everywhere (`upper` census). Count the recipes.
6. **Cards/panels**: one radius (`--r-lg` 16px) + one padding per family + one border/shadow rung.
7. **Tables**: `.admin-tbl` everywhere; header 10px mono uppercase; cell padding 12/16; row height
   one value per density; hover on the ROW only (never per cell / per inner element); sort affordance
   one style; numeric columns right-aligned mono; status via `Chip`; actions column one style.
8. **Spacing**: section gaps from `--sp-*` (16/24/32); KPI grid gap one value; no `.5` steps.
9. **Hover/focus**: every interactive element responds on hover (`.btn` lifts; links underline or
   colour; rows tint); no element with cursor `default`; no duplicate hover (row + cell both).
   Focus ring one recipe.
10. **Nav**: active item marked by `aria-current` AND a visible state; one hover; one height.
11. **Chips/status**: only `Chip` variants; status colour per §B11 dictionary; one chip height per size.
12. **Copy details**: no raw enum tokens (`AIRTEL_MONEY`, `sports`), no doubled units (`TZS TZS`),
    no clipped money/timestamps, no orphan English in SW/ZH.
13. **Mobile (390)**: tap targets ≥ 40px; rows don't collapse into mixed heights; tables scroll inside
    their card with an affordance; nothing truncated mid-money.
14. **Loading/empty/error states** match the size/shape of what they replace.
15. **Icons**: kit glyphs only, one stroke (1.9px), one size per context.
16. **Charts**: axis text legible (not scaled by `preserveAspectRatio="none"`), legend labels human.

## Finding format (STRICT — the schema you must return)
Each finding: `title` (one line, the defect as a fact), `severity` (P0 blocks "perfect": wrong/illegible/
tap-floor/money; P1 visible inconsistency a critic would screenshot; P2 polish), `surface` (admin|player),
`routes` (every route it appears on), `element` (what, with its class string or component), `measured`
(exact px / values from the JSON or screenshot), `expected` (the token / law / sibling it should match),
`source` (file:line — open the file and cite the real line), `fix` (the concrete change, one primitive
not fifteen call sites), `proof` (how a script or screenshot shows it RED before the fix), `evidence`
(screenshot filename(s)).

Be exhaustive on your pages: 15–40 findings per page is normal at this bar. Prefer many precise small
findings over few general ones. Never invent a measurement — if you did not read it from the JSON,
the screenshot, or the source, say "not measured".
