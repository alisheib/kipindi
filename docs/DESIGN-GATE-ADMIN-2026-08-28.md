# THE DESIGN GATE — Admin console · 2026-08-28

**Programme key: `DESIGN-GATE-2026-08-28`** · sibling report: [DESIGN-GATE-PLAYER-2026-08-28.md](DESIGN-GATE-PLAYER-2026-08-28.md) · implementation task: [SESSION-PROMPT-DESIGN-GATE.md](SESSION-PROMPT-DESIGN-GATE.md)

> **STATUS: RECORD, NOT RULE.** Laws live in [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md) — this file
> records what was **measured on production** and what must change for the console to render as one
> system. Where this file names a canonical recipe (§1) it is naming the existing kit/majority
> recipe to converge on, citing its source — it does not mint new law. When a §1 row needs a NEW
> law, the fix step adds it to DESIGN_AUTHORITY.md, never here.

## 0 · What this is, and how it was measured

Ali's commission (2026-08-28): *“admin especially visually shocks me … sizes of input fields, the
text inside the inputs, button shapes/sizes/colours, fonts, layouts, things on the same row of
different heights, hovers duplicated in cells, general classes maintaining consistency … a full
report we give to Claude Code to fix and implement 100%. Details are what matter. This report is
the final gate to a perfectly rendered platform.”*

**Method — measured, not eyeballed.** A read-only Playwright drive of **production
(`https://50pick.tz`), signed in as the console ADMIN, on 2026-08-28**, drove **44 admin routes**
(every nav destination + one detail page per family). Per route: full-page screenshots at
**1440 / 1920 / 390**, and at 1440+390 a DOM measurement of **every control** (box, font, radius,
padding, colours, class string), every heading/label, every card, every table, section gaps,
truncated text, and a **hover probe of 1,730 elements**. A second drive opened **20
dropdowns/menus/drawers** and measured their panels and items. Instruments:
`scripts/design-gate/` (run `node scripts/design-gate/measure.mjs` from the repo root; cross-page
tables via `node scripts/design-gate/analyze.mjs admin <section>`). Raw output lives in
`.qa-design-gate/` (gitignored, this PC only — any machine can regenerate it).
⛔ One login per account at a time — a second login revokes the first session and every later
page silently measures the sign-in page at HTTP 200 (this poisoned two runs before being caught).

**Scoreboard.**

| | |
|---|---|
| Routes measured | **44 / 45** (`/admin/reports` loaded only on the 4th attempt — see DG-A-01) |
| Controls measured at 1440 | ~2,600 (361 buttons, 122 fields, 137 pills, 100 switches, 23 chips + shell) |
| Distinct button heights (outside tables/shell) | **15** (40×148 · 44×86 · 34.5×45 · 25.8×31 · 15×10 · 32×9 · 34×8 · 36×8 · 22.5 · 26.5 · 47.5 · 48 · 18 · 69.3 · 70.3) |
| Distinct field heights | **9** (42×48 · 34×42 · 44×11 · 36.8×10 · 32×5 · 55.5×3 · 54 · 61 · 66) |
| Distinct font sizes in page content | **24** (ladder defines ~11 for this range) |
| Distinct UPPERCASE micro-label recipes | **70+** (`analyze admin labels`) |
| Hover probe | 1,730 probed · 89 no-response · **1,628 of 1,646 responses are colour-only** |
| Confirmed systems below | **23** (DG-A-01 … DG-A-23) |
| Agent-audited pages in §7 (deep, spot-verified) | 9 pages · ~280 raw findings |

## 1 · THE CANON — the one recipe per family this console converges on

Source of truth for values: `src/app/globals.css` (+ `tailwind.config.ts` bridge). ⚠️ The spacing
scale is overridden (`h-7`=40, `h-8`=48, `py-1.5`=8, `p-4`=20 …) and **inverts at `.5` steps**
(`p-3.5`=14 < `p-3`=16) — SCAN-2026-08-28 S-09. Never read a class as its Tailwind default.

| Family | Canonical recipe | Source |
|---|---|---|
| Button | kit `<Button>` → `.btn .btn-{primary·ghost·danger·gold·claret·yes·no·aqua-ghost}` at `.btn-xs/sm/md/lg/xl` = **32/40/44/48/56** (`--h-control-*`), radius `--r-md` 12 (`btn-xl` → `--r-lg`) | globals.css:911–1110 |
| Dense admin rail control | **32px** (`--h-control-xs`, mouse-only documented exception) — every control in one rail at 32 | globals.css:280 |
| Form input | kit `<Input>`/`.input` at **44** (`--h-input`), text **16px** mono for ids/numbers, 13px `sm` only where 32-rail density rules | input.tsx, globals.css:1455 |
| Select | kit `<Select>`; **must render its stated rung** (today `xs`=36.8, never 32 — DG-A-04) and never wrap its value | select.tsx |
| Filter chips/rails | `FilterPill` — the ONE filter control, DA §K6; **only the selected pill carries an outline** | filter-pill.tsx |
| Chip / status | kit `<Chip>` (23px, `--r-pill`), tone from `src/lib/status-tone.ts` (DA §B11) | chip.tsx |
| Page title | `AdminPageHead` — 28px Sora 700, SW italic caption under it | admin-shell.tsx:281 |
| Card title | `AdminCard title/sw` — 13px Sora 600 + 11px italic caption | admin-shell.tsx:468 |
| Eyebrow/microlabel | **10px JetBrains Mono 400 UPPERCASE tracking 0.14em `text-text-subtle`** (the measured majority: table th + pagers); KPI labels may keep 9.5px only if re-tokenised (DG-A-11) | admin-tbl thead, globals.css:3661 |
| Table | `.admin-tbl` — th 10px mono uppercase pad 10/20, td 12.5px pad 12/20, **row hover only**, dense row 44px | globals.css:3640+ |
| Panel | `.glass-panel` `--r-lg` 16 + `p-4` (20); KPI tile = `AdminKpi`; inset boxes `rounded-md` 8 + **one** padding pair | globals.css:2705 |
| Section rhythm | `AdminBody` `space-y-4` = **20px** (measured 162/167 gaps — keep) | admin-body.tsx |
| Focus | 2px `--brand-500` outline offset 2 + 4px 25% halo — one recipe (DA §A3) | globals.css:934 |
| Icons | kit glyphs (`glyphs.tsx`), 1.9px stroke, **one size per context, one prop spelling `s=`** | glyphs.tsx |

## 2 · FINDINGS BY SYSTEM — worst first

Every instance below is a production measurement from 2026-08-28 (JSON in `.qa-design-gate/out-admin/`,
screenshot names = `<slug>-<width>.png`). “Fix” is the one primitive-level change; per-callsite
patching is listed only where no primitive exists.

---
### DG-A-01 · P0 — `/admin/reports` takes ~88 s to finish loading, and timed out at 60/90/240 s
- **Measured:** first byte **310 ms**, `commit` 409 ms, **`load` 88,430 ms** (h1 “Reports”, 73 controls, 3,407px page). Three earlier attempts timed out (90 s twice, 60 s in the shots pass); `/admin/insights` also timed out once.
- **Where:** `src/app/admin/reports/page.tsx` (510 lines; its settlement-fee/report-pack reads render 12,882 rows’ aggregates inside the initial HTML stream — the page held `load` hostage the whole time).
- **Fix:** move the heavy aggregates behind a `<Suspense>` with a skeleton + paginate the fee query server-side; nothing on this page needs 12,882 rows to paint the shell.
- **Proof:** `node scripts/design-gate/measure.mjs` with `ONLY=/admin/reports` — RED today (load > 10 s), GREEN when `load` < 5 s.
- **Guard:** a load-budget assertion in the drive (fail any admin route whose `load` exceeds 15 s).

---
### DG-A-02 · P0 — the kit Toggle is a 26px control on a 40px floor, 100× in the console — including the payment kill-switches
- **Measured:** `[role=switch].toggle-switch` = **44×26** on every instance (100 at 1440 across affiliate, bonuses, config, payments, sources, system, updown…; +2 on player `/profile/responsible-gambling`). `toggle.tsx:3` documents 44×26; there is **no extended hit area** (contrast `.mcardp-share`, which extends via `::after`).
- **Expected:** DA §A2 — tap targets ≥ `--tap-min` 40px; “money controls are never the exception”. The MNO kill-switches and programme master switches are exactly that.
- **Fix (kit-level, one file):** give `toggle.tsx` a `::after`/padding hit-area to ≥40px (visual size unchanged), same pattern as `mcardp-share`; assert with `elementFromPoint`, not a bounding box (a box measurement cannot see this fix).
- **Instances (row context also in DG-A-08):** affiliate & bonuses master-switch rows (26 beside a 40px Save), `/admin/updown` asset table (26 beside 40px Edit ×8), `/admin/sources` (26 beside 16.5px REMOVE ×22), payments kill-switches, config, system.
- **Guard:** extend `scripts/responsive-audit.mjs` tap-target rule to `[role=switch]` with hit-testing.

---
### DG-A-03 · P0 — the “How to search” popover is clipped by its own input group on every admin SearchBox
- **Measured (overlay drive):** popover = 320×386–464, **OFFSCREEN/clipped** on `/admin/transactions`, `/admin/candidates`, `/admin/ai-polls`, `/admin/proposals`; at rest only one example row bleeds into the field strip (see `out-admin-overlays/*How_to_search.png` — it reads as stray text INSIDE the search input).
- **Mechanism (confirmed in source):** `search-box.tsx` renders `SearchHelp` **inside** `<div className="input-group search-box">`; `.input-group` has `overflow: hidden`; and the popover’s `top-9` is **64px** on the overridden scale (`search-help.tsx:77`), so it opens 64px down inside a ~46px clipped box.
- **Also live on player:** `/markets`, `/live`, `/results` share `SearchBox`.
- **Fix:** render the popover outside the clipped group (sibling of `.input-group`, or the kit portal), anchor `top-[calc(100%+6px)]`; while there, fix the row: the 40×40 help button sits inside a 44px input (DG-A-04 lists the row).
- **Guard:** overlay drive asserts every opened popover’s rect ⊂ viewport and not clipped by an `overflow:hidden` ancestor.

---
### DG-A-04 · P1 — THE DENSE FILTER ROW: one job, four dialects, and no row whose controls share a height
This is the single biggest source of the “visually shocking” feel: the row an officer touches
first on every list page.

> ## 🔴 RE-DERIVED ON PRODUCTION 2026-08-29 — THE TABLE BELOW IS STALE. DO NOT FIX IT.
> The measurements in this row were taken against a build that **no longer existed hours later**,
> and most of the defect is already gone. Re-measured on 44 routes, ~2,600 controls, signed in as
> ADMIN, with `redo.cjs` reporting **0 poisoned records**:
>
> | The table below says (`/admin/markets`) | Measured 2026-08-29 |
> |---|---|
> | search 32 · Select **36.8** · Select **55.5 (wrapped)** · btn 32 · btn 32 | search 32 · Select **32** · Select **32** · btn 32 · btn 32 |
>
> ⛔ **`36.8` and `55.5` do not occur anywhere in the console** — not on one route, not at one
> width. `/admin/markets` and `/admin/players` have **zero** mixed-height row groups;
> `/admin/resolver-queue` and `/admin/ai-usage`'s filter rows are uniformly 32 as well.
>
> **Why:** root cause (a) was fixed by **`af4de432`, dated 2026-08-28 — the same day this report
> was written.** `select.tsx` now reads `size === "xs" ? "px-2 py-1"`, and its own comment records
> the defect this row describes: *“the trigger carried a flat `px-3 py-1.5` at EVERY size … so an
> `xs` control measured 37px”*. The audit drive ran before that deploy landed.
>
> **What actually survived, and is the whole of DG-A-04's kit half:**
> - **(b) `Input size="sm"` rendered `h-[36px]`, and 36 is on no rung** (the ladder is
>   32/40/44/48/56). 45 instances measured, 42 call sites. ✅ FIXED 2026-08-29 — it now reads
>   `--h-control-sm` (40), **Ali's ruling**: most call sites are forms rather than dense rails, 40
>   is `--tap-min`, and it closes the 4px step against the `btn-sm` it sits beside.
> - (c)/(d) the three hand-rolled `h-[32px]` search inputs and the per-page button rungs are
>   cosmetic convergence, not a height defect — they already render 32. **Step 3.**
>
> ⚠️ **This is not a one-row problem.** §7's ~280 findings and this file's other numbers come from
> the same pre-`af4de432` drive. **Re-derive every row before fixing it** — several may have closed
> the same way, and "fixing" a defect that no longer exists is how a correct control gets broken.

| Route | Row (left→right), measured heights |
|---|---|
| `/admin/markets` | search **32** (`h-[32px]` raw input, 12.5px text) · Select xs **36.8** · Select xs **55.5 (wrapped!)** · `btn-xs` Search **32** · `btn-xs` Refresh **32** |
| `/admin/players` | search **32** · Select xs **36.8** · Search **32** |
| `/admin/resolver-queue` | search **32** · **36.8** · **55.5 (wrapped)** · Filter **32** · Refresh **32** |
| `/admin/ai-usage` (log filter) | Select **36.8** ·  Select **55.5 (wrapped)** · Select **36.8** · search **32** |
| `/admin/markets/[id]` predictors | search **32** · Select **36.8** ×2 · **`btn-sm` Filter 40** |
| `/admin/candidates` | kit search **44/46 group** · help **40** · `btn-xs` pill Search **32** · Refresh icon **40** |
| `/admin/ai-polls` | kit search 44/46 + help 40; batch row: Input sm **36** beside `btn-sm` **40** |
| `/admin/transactions` / `/admin/audit` / `/admin/events` | md rail: selects **44** + `btn-md` Apply/Reset **44** (+ 34.5px window pills above — DG-A-06) |
| `/admin/system` | Select **36.8** beside `btn-md` Set timezone **44** |
| `/admin/ai-usage` model row | Select **36.8** (74.3 wrapped at 390) beside `btn-sm` Apply **40** |

- **Root causes (all confirmed in source):** (a) kit `Select size="xs"` declares `min-h-[32px]` but `py-1.5` is **8px** here → renders 36.8, so no Select can sit in a 32 rail; (b) `Input size="sm"` renders **36** (34 inner) — on no rung; (c) three pages hand-roll `h-[32px]` search inputs while three use the 44px kit input for the same job; (d) button rungs picked per page (`btn-xs` vs `btn-sm` vs `btn-md`).
- **Fix (primitive-first):** ① make `Select size="xs"` truly 32 (`py-0` + line-height + truncate) and `Input size="sm"` = 32 or 40 — pick the rung, retire 36; ② ONE `AdminFilterRow` recipe: **every control 32** on mouse-dense list pages, **44** on form-like pages — and one of the two per page, never both; ③ replace the three raw `h-[32px]` search inputs with the kit search at the chosen rung.
- **Proof:** `analyze admin rows` — RED rows quoted above; GREEN = zero non-table rowGroups with spread > 2 on these routes.
- **Guard:** extend `scripts/ui-consistency.test.mts` with “controls sharing a flex row must share a `--h-control-*` rung”.

---
### DG-A-05 · P1 — Selects wrap their value to a second line and grow past their row
> ## ⛔ CLOSED 2026-08-29 — NO CHANGE. THIS ROW ASKS TO REVERSE A DATED RULING, AND ITS FIX IS ILLEGAL.
> **The prescribed fix — “`select.tsx` trigger gets `truncate whitespace-nowrap min-w-0`” — must
> not be applied.** `scripts/ui-consistency.test.mts` carries an **error-severity** rule,
> `combobox-trigger-truncates`, whose subject is exactly this: *“a dropdown's CLOSED trigger is the
> only place an operator reads what they chose, so `truncate` there is not a layout fix — it is
> data loss.”* It was measured on production hiding the deciding word of an Up & Down winning band
> (`Smallest possible (reco…`) and 162px of a 307px label on the control that decides what winning
> MEANS for a chain already holding stakes.
>
> **The kit has already answered this question, deliberately and in writing** (`select.tsx:285-318`):
> *“`min-h-*`, NOT `h-*` — E-98 … A floor lets a short label keep the exact height it has today and
> lets a long one grow instead of vanish”*, and — naming this row's own symptom — *“(rightly — E-98:
> wrapping is honest, clipping is data loss) the control GREW to 56px and sat beside 32px
> neighbours.”* **Growing is the designed behaviour.** A tall trigger is the control telling the
> truth; a short one would be it hiding the answer.
>
> **Re-derived on production 2026-08-29:** the “55.5 across several routes” does not reproduce —
> `55.5` occurs nowhere. Exactly **two** selects exceed their rung, and both are a long label meeting
> a narrow trigger, i.e. a CALL-SITE width question for step 3, not a kit defect:
> `/admin/config`'s fee-model (**66px**, both widths) and `/admin/ai-usage`'s model select
> (**66.3px at 390 only**; 32px at 1440, where it has 1039px of width).
>
> The only honest residue is the report's own aside — a two-line trigger *“riding 9px above its
> siblings”* — which is row **alignment** at the call site, not the control's height. Step 3.
- **Measured:** “All categories” **55.5px** (`/admin/markets`, `/admin/resolver-queue`), “All statuses” 55.5 (`/admin/ai-usage`), config fee-model Select **66px**, ai-usage model Select **74.3px at 390**. Screenshot `markets-1440.png` shows the two-line trigger riding 9px above its siblings; its floating label rides with it (§7 ai-usage).
- **Fix (kit):** `select.tsx` trigger gets `truncate whitespace-nowrap min-w-0` on the value span; callers give the narrow ones `min-w`.
- **Guard:** measure drive — any `[role=combobox]` height > rung + 4px fails.

---
### DG-A-06 · P1 — the outlined-capsule rails: S-07’s family keeps growing (now 3 sizes × 5+ pages)
- **Measured:** period rails **34.5px** `rounded-pill border px-3 py-1.5 font-mono text-[11px]` — 45 instances on `/admin/finance` (9 pills TODAY…CUSTOM), `/admin/transactions` (9), `/admin/ai-polls`, `/admin/candidates`, `/admin/ai-usage`; state/category rails **25.8px** (31 instances, ai-polls + candidates — S-07’s originals); generator chips **36px** (ai-polls); `/admin/proposals` segmented pills **22.5px** beside a 40px Refresh. At 1920 candidates’ two rails share ONE row with an **8.7px height step**.
- **Expected:** DA §K6 — *there is one filter control and it is `FilterPill`*; only the SELECTED pill is outlined. Every one of these is always-outlined (the exact “15 outlined capsules” the round-2 brief killed on the player side), active state = `font-bold` → **reflow on click** (S-07b).
- **Fix:** adopt `FilterPill` (admin-density variant) for every admin rail; date presets included. Delete the three bespoke capsule recipes.
- **Guard:** widen `test:filter-language` to `/admin/**`.

---
### DG-A-07 · P1 — pagination is 44px in rails that are 32px
- **Measured:** `pagination.tsx` pills `h-[44px] min-w-[44px]` — 57 instances (fine on their own; DA §A2 keeps 44 for tap) directly under 32px filter rows on markets/players/resolver-queue; on `/admin/audit` at 390 the pager wraps so first/prev sit on row one and next/last alone on row two.
- **Fix:** keep 44 (floor wins); the rails converge upward at touch widths (DG-A-04③ handles it); fix the pager wrap grouping (`flex-wrap` on pairs).

---
### DG-A-08 · P1 — in-table action vocabulary: five recipes, three heights, one job
- **Measured:** `/admin/updown/proposals` — `btn-sm` Review **40** beside 23.8px mono text-buttons REJECT/DELETE (15 rows); `/admin/updown` — Edit **40** beside 26px switches (8 rows); `/admin/players` & `/admin/staff` — `PROFILE →`/`MANAGE →` 10px mono links (36 cells); `/admin/markets` — “5 predictors” bordered pills + `VIEW PREDICTORS` 10px links, two recipes for the same link on the detail page (33.8 vs 25.8 — §7); `/admin/sources` — REMOVE 16.5px text-buttons beside switches; `/admin/resolver-queue` cards — 40px button beside 42.5px link-styled-as-button (2.5px step ×4 pairs); `/admin/updown/rounds` — 23px chip beside 25.8px `VOID & REFUND` pill.
- **Fix:** ONE row-action recipe: `btn-xs ghost` (32) for row buttons + the 10px mono `→` link ONLY for navigation; destructive row actions are `btn-xs danger`, never bare uppercase text.
- **Guard:** ui-consistency rule: interactive elements inside `.admin-tbl td` must be `.btn-xs` or the named link recipe.

---
### DG-A-09 · P1 — hover duplicated inside tables (Ali named this one)
- **Measured (`analyze admin tables`):** rows already tint on hover, and cells stack their own: `/admin/markets` **80** hover-classed cells, `/admin/ai-polls` **60 cells + 20 rows**, `/admin/payments` 40, `/admin/players` 40, `/admin/staff` 32, `/admin/audit` 20 (actor links additionally hover in betting-green — §7), `/admin/candidates` 20 rows, `/admin/sources` 22+20.
- **Fix:** row hover stays; in-cell hover only as link `underline` (never a second background). Delete per-cell `hover:bg-*`.
- **Guard:** the measure drive’s `hoverCells` count per table ≤ links-with-underline count.

---
### DG-A-10 · P1 — the KPI tile system lies a little, everywhere
- **Measured:** `AdminKpi` label 9.5px/0.08em (inline style), value 20–22px (inline style), SW gloss 10.5px (off both ladders), padding `p-3.5` = **14** (S-09 inversion; body cards are 20), radius 16 while §S2 assigns stat tiles `--r-md`=12 (author wrote `rounded-lg`, `.glass-panel` overrides it — dead class); **non-interactive tiles lift a shadow on hover** (`transition-all hover:shadow-[var(--shadow-3)]`, false affordance); the **▲ delta defaults to “up” in brand tint on non-deltas** — measured: “▲ 672 generations · 30379.0k tokens” (ai-polls, also ellipsised at 1440 and “30379.0k” for 30.4M), “▲ 1 calls” (ai-usage, unpluralised), “▲ all-time” on TZS 0 (affiliate), “▲ lifetime / ▲ top: SYSTEM” (audit, raw enum), 4× on candidates; **at 390 KPI labels ellipsise mid-word** on 10+ pages (“AWAITING 2ND SIGNATU…”, “PUBLISHED TO…”, “OUTSTANDING …”, “GENERATABLE CATEGO…”, “FINANCE + GROWTH + …”) because the LIVE pulse shares the row; **at 390 KPI money clips**: “TZS 16,688,890” (markets), “TZS 134,000” (transactions), “TZS 679,532” (insights), “@jaykishan_kaba” (affiliate) — DA §A5 says **never clip money**; reports uses its own `grid-cols` ladder instead of `KpiGrid` (1-up at 390 where the console is 2-up); aml’s KPI gap is 12 vs 16 everywhere else; compliance runs `AdminKpi` beside hand-rolled AdminCard-KPIs (two tile recipes on one row — §7).
- **Fix (one component):** re-token `AdminKpi` (label `--type-label` mono recipe, value on the ladder, `p-3` 16), `deltaDir` default **neutral “·”** (▲ only when a real delta is passed), value uses the compact money grammar ≥1 M and may wrap — never truncate; label wraps to two lines instead of ellipsising; remove hover lift; all KPI bands through `KpiGrid`.
- **Guard:** measure drive — no truncated node whose text starts `TZS`; no `▲` whose sibling caption lacks a signed number.

---
### DG-A-11 · P1 — 70+ uppercase micro-label recipes (the “fonts everywhere” feeling, quantified)
- **Measured (`analyze admin labels`):** 70+ distinct (size × face × weight × tracking × colour) recipes for the same visual role. Top cluster alone: 10px mono 400 at **0.18 / 0.14 / 0.12 / 0.10 / 0.08em** trackings; form labels exist as 10px mono **400/0.12em** (48×), **700/0.16em** (43× — kit `FieldLegend`), 600/0.14em (markets/new), 700/0.14em (system); five pages set micro-labels in **Inter** (ai-usage: RECONCILIATION, LIMIT / WINDOW…); chips add 9.5px Inter 700 tones.
- **Fix:** three named classes — `admin-eyebrow` (10px mono 400 0.14em subtle), `admin-label` (kit FieldLegend, one weight), `admin-th` (already `.admin-tbl thead`) — and a sweep of every hand-typed `font-mono text-[10px] uppercase tracking-[…]` onto them.
- **Guard:** the labels census — fail when distinct recipes for ≤12.5px uppercase exceed **8** per surface.

---
### DG-A-12 · P1 — the type ladder is not in force: 24 sizes, and the console’s body size is on no ladder
- **Measured (`analyze admin type`):** 24 distinct sizes. Off-ladder bulk: **12.5px ×1,376** (`.admin-tbl` body — 1,517 cells consoles-wide), **10.5 ×700**, **11.5 ×579**, 9 ×95, 13.5/14.5/15.5/19/34. Hand-typed arbitraries in admin code: `text-[10px]`×250, `[11px]`×120, `[12px]`×106, `[10.5px]`×100, `[11.5px]`×63… (grep census).
- **Expected:** DA §T1 — the scale is closed.
- **Fix:** Ali’s call, one of two: bless the working sizes as tokens (`--type-table` 12.5, retire 10.5/11.5 to 11/12) **or** move `.admin-tbl` to 13px `body-sm`. Then sweep arbitraries onto tokens (mechanical; the values already cluster).
- **Guard:** extend `test:design-frozen` to fail NEW `text-[Npx]` where N is on neither ladder.

---
### DG-A-13 · P1 — raw enums, doubled units and three copies of the same count line (copy details)
Confirmed instances, each with one definition site that already exists:
- `TZS TZS 45,630` — finance/page.tsx:271 prefixes `TZS {formatTzs(…)}` and `formatTzs` already returns `TZS …` (utils.ts:10).
- Provider legend + summary print **`AIRTEL_MONEY`** (finance; `listProvidersInPeriod` returns raw keys; `txnProviderLabel` exists in status-badge.tsx:298).
- Category enums verbatim: events page Select shows lowercase **`sports`** (16px mono trigger, and `markets/new` wizard), markets listbox options are raw slugs (`sports, macro, weather, crypto, culture` — overlay shot `markets-1440-2-All_categories.png`), candidates CAT column `MACRO/INFRASTRUCTURE` uppercase raw while its rail says “Infra”, ai-usage feature chips `UPDOWN/POLLS/SENTINEL`, aml Type chip `STAKE_SPIKE`, audit targets `UpDownRound#udr_…` + actors sliced to 16 chars **without ellipsis** (`system_updown_or`).
- Count lines, three styles for one element: markets `10px mono UPPERCASE tracked` “151 OF 151 MARKETS” vs players `text-caption` sentence “102 of 102 players” (players/page.tsx:194, markets/page.tsx:144) vs candidates 11px mono right-aligned “270 candidates”.
- “1 sources” (ai-polls detail), “Pending review**for**” lost space (candidates explainer), literal `&times;` escape rendered (ai-usage), breadcrumb title-cases an id (“Aipoll_c9e6…”), page named three ways (sidebar “AI candidates” / breadcrumb “Candidates” / h1 “Market candidates”), topbar mixes `OWNER` (caps mono) with `Officer` (sentence chip).
- **Fix:** route every rendered word through the existing lexicons (`admin-status-lexicon`, `txnProviderLabel`, `CAT_LABEL`); one count-line recipe; strip the double prefix; pluralise with the count helper.
- **Guard:** `test:copy-enums` — grep-list of enum tokens (`AIRTEL_MONEY`, `STAKE_SPIKE`, `_`-cased and `#`-model tokens) appearing inside JSX text.

---
### DG-A-14 · P1 — reading copy below the floor
- **Measured:** explanatory prose at **11px `text-caption`** on compliance (inspector-mode paragraph, “Queue empty.”), candidates (pipeline explainer), ai-usage (all card prose, 11–12px), bonuses (five sizes 12/11.5/11/10.5), aml policy paragraph 11px; bonuses wagering money at **10px mono**.
- **Expected:** DA §T4 — reading floor 12.5px (prose is not a label).
- **Fix:** prose → `text-body-sm` (13). Money never below `--type-small`.
- **Guard:** census — paragraphs (>60 chars, mixed case) under 12.5px fail.

---
### DG-A-15 · P1 — charts: squashed axes and unreadable legends
- **Measured:** every `AdminAreaChart`/`AdminStackedBars` renders in a 1200-wide viewBox with **`preserveAspectRatio="none"`** (admin-charts.tsx:95–96, 212) — axis glyphs squash horizontally at any width ≠ 1200 and vertically by height/240 (finance shots: y-labels ~7px equivalent, S-03 adjacent); stacked-bar legend prints raw provider ids (DG-A-13).
- **Fix:** render text in a non-scaling layer (`vector-effect="non-scaling-stroke"` doesn’t cover text — draw axis labels as HTML overlay, or compute per-render width) — one component file.
- **Guard:** `npm run qa:chart-axis` — 5 chart routes × 3 widths, asserting isotropy, a 10px effective floor in BOTH dimensions, no overlap, and nothing clipped by the card edge.
- ⚪ **CORRECTED 2026-08-29 (`fdba7cad`), and the correction is the point.** *"and vertically by height/240"* above is **WRONG — `scaleY` is EXACTLY 1.0 on every chart measured**, because the viewBox height has always been the CSS height. The squash is purely horizontal (scaleX 0.44 at 1440, 0.60 at 1920, **0.257 at 390**). ⛔ A guard written to this entry's own wording — a font-size or a HEIGHT floor — would have passed the defect forever; what separates the two is the RATIO of the axes. The proposed remedy *"or compute per-render width"* was also declined: it needs a runtime measurement, and the HTML layer needs none. **The planner row in [`SESSION-PROMPT-DESIGN-GATE.md`](SESSION-PROMPT-DESIGN-GATE.md) is the authority for this system.**

---
### DG-A-16 · P2 — the card/panel system has three paddings, two dead classes and an inversion
- **Measured (`analyze admin cards`):** `.glass-panel` r16 with **p-14 (`p-3.5`, ×170 — KPI tiles)**, **p-20 (`p-4`, ×148)**, p-0 (×62 flush tables); AdminCard’s `rounded-lg` (12) is dead under `.glass-panel` (16); inset `rounded-md` (8) boxes come in **six** padding recipes (12/16 ×46, 12/10 ×44, 16/16 ×20, 12/0 ×20, 8/12 ×8, 10/16 ×7); a `rounded-lg`(12) family runs beside them (9+7+5); empty-states are r16 dashed p-48 (4). The `.5`-step inversion (S-09) is what puts 14 under 16 under 20.
- **Fix:** name the rungs — `panel` (glass r16 p-4), `tile` (KPI, p-3=16 after DG-A-10), `inset` (r8, ONE pair: 12/16) — and sweep. Note §S2 wants stat tiles at `--r-md`: honour it or amend the law, one or the other.
- **Guard:** cards census — >3 padding recipes per radius family fails.

---
### DG-A-17 · P2 — sortable headers are 64px in 37px header rows, and the sort colour is dead CSS
- **Measured:** `SortTh`’s link carries `min-h-[44px]` inside a th that already pads 10px → **64px** header cells beside ~37px plain ones (audit, aml, ai-usage, candidates); `.admin-tbl th[aria-sort]` declares brand-300 but the anchor’s `text-text` wins — the “sorted” tint has never rendered; inactive sortable columns have no affordance; `p-3` on th/td is inert everywhere (`.admin-tbl` wins — 189 lying utilities on candidates alone).
- **Fix:** SortTh drops `min-h`, colour moves onto the anchor, add the ↕ affordance on sortables; delete inert `p-3`s.

---
### DG-A-18 · P2 — shell details (once, for all 44 pages)
- Sidebar items **42px** (`py-2` = 12 + 13px text) — off the 40/44 rungs; group heading “UP & DOWN · JUU NA CHINI” wraps to two lines while five siblings don’t; active item paints an **inline hardcoded `oklch(40% 0.12 268 / 0.5)`** (admin-sidebar-nav.tsx:44 — §B9: values live in tokens); brand link “50pick · admin” has **no hover** (44 pages, the probe’s only universal miss); item hover is colour-only.
- Topbar: uppercase pills use **four trackings** (0.10/0.12/0.14/0.18em) in one row; `OWNER` caps vs `Officer` sentence-case; breadcrumb “Audit” vs h1 “Audit log”.
- **No `<main>` landmark on any admin route** — the player shell has `#main-content` (app-shell.tsx:168), the admin layout renders none (WCAG 1.3.1/2.4.1; the responsive-audit’s landmark rule would fail admin the day it runs against it).
- **Fix:** items to 40px, one tracking (0.14em), token for the active bg, hover on brand link, `<main id="main-content">` around the content column, one breadcrumb naming source.

---
### DG-A-19 · P2 — icons: sizes 10→23 with two prop spellings
- **Measured (§7 pages):** five sizes on one page repeatedly (compliance 11/12/14/18; bonuses 23/19/16/14/12; candidates 10–18 across 7), `s=` and `size=` both in use; typed characters (`↓`, `→`) where kit glyphs exist (compliance export rows vs its own page head).
- **Fix:** per-context size constants (row-lead 16, card-lead 18, inline 12), one prop, glyphs only.

---
### DG-A-20 · P2 — loading skeletons are the wrong shape for what they replace
- **Measured (§7):** compliance (2 health cards for 3, `md:` vs page `lg:`), affiliate (4-field form for a 600px editor; table for an EmptyState), audit (96px chip for 178×40 buttons; 12 rows for 20; no pager), bonuses (26px chip for 18px; 44px fields for 36px; 33px rows for 65px), ai-polls (6×6 table for 9×20; 32px search bar for a 69px block), candidates (toolbar omitted; 6 of 20 rows).
- **Fix:** after DG-A-04/10/16 land, regenerate each `loading.tsx` from the real page geometry (the skeleton kit exists — `admin-skeletons.tsx`).

---
### DG-A-21 · P1 — semantic colour misuse cluster (B2a): betting ink on non-betting actions
- **Measured (§7, each verified against B2a/§B11):** audit page offers two **identical report downloads** as `btn-yes` (betting green) and `btn-claret` (irreversible ceremony); aml’s **Approve** wears betting-YES; ai-polls detail paints its quality meter in `--yes-*`; ai-usage chips paint OPEN green/CLOSED slate against the console dictionary; ai-polls/candidates hand-type `STATE_VARIANT` maps (FILTERED/PENDING_REVIEW amber) instead of `status-tone.ts`; bonuses paints CANCELLED/EXPIRED amber (console amber = “officer must act”); audit category chips give SECURITY the player’s broadcast-red and BET the YES green.
- **Fix:** actions: `primary/ghost/danger` only (yes/no reserved for betting sides — S-12’s rule); every status chip through `status-tone.ts` (§B11’s own “not yet migrated” list, now with the exact call sites).
- **Guard:** ui-consistency rule — `btn-yes|btn-no` outside betting contexts fails; chip variants must come from `TONE_CHIP`.

---
### DG-A-22 · P2 — layout balance
- Compliance: 3 health cards in a 2-col grid leave an empty **572×122** cell; “Match-integrity alerts” stretches to 430px for one 11px line. Ai-polls detail: Betting-options card ~60% empty at 1440/1920; at 390 its header crushes the title into a 162px column (10 wrapped lines) beside the action stack. Updown-proposals rows are **306–375px** — a table wearing card content; markets rows 124.8. Proposal list rows 69–86px mixed.
- **Fix:** per-page composition passes after the primitives land (grid `auto-rows`, `flex-wrap` on header rows, updown-proposals to a card list).

---
### DG-A-23 · P1 — tables at 390 clip with no affordance
- **Measured:** every wide `.admin-tbl` sits in `ScrollX` whose only styling is a focus outline — at 390: players cut after PHONE, aml cut at “PROVI”, compliance harm table cut at DETAIL, candidates title clipped at the card edge, audit’s payload column cut mid-token **at 1440 too** (1282px table in a 1158px card); rows balloon instead (aml 174/192px, candidates 75, ai-usage 156–235). AML stake “TZS 11,100” reflows to two lines in-cell (agent-measured, §7).
- **Fix:** `ScrollX` gains an edge-fade + scrollbar affordance (one component); tables get `min-w` per column so rows stop ballooning; money cells `whitespace-nowrap` (A§5: never clip/wrap money).
- **Guard:** measure drive at 390 — table wrapper `scrollWidth > clientWidth` requires the affordance class; no `TZS` node taller than one line-height.

## 3 · Per-route index

| Route | Systems that touch it |
|---|---|
| /admin (overview) | 10 · 11 · 12 · 16 · 18 · 20 |
| /admin/live | 10 · 11 · 12 · 13(feed ids) · 16 · 18 |
| /admin/finance | 01-adjacent(charts) · 06 · 10 · 13(TZS TZS, AIRTEL_MONEY) · 15 · 16 |
| /admin/reports | **01** · 06 · 10(6-col ladder) · 17 · 18 |
| /admin/insights | 01(timeout once) · 10(value clip) · 12 · 16 |
| /admin/players (+cohorts, detail) | 04 · 05 · 07 · 08(`PROFILE →`) · 09 · 10 · 13(count line) · 23 |
| /admin/markets (+new, detail) | 04 · 05 · 06 · 07 · 08 · 09(80 cells) · 10(money clip) · 13(slugs, count) · 22(124px rows) · 23 |
| /admin/resolver-queue (+resolver/[id]) | 04 · 05 · 07 · 08(2.5px pair) · 22 |
| /admin/settlement · /admin/objections · /admin/moderation | 10 · 11 · 12 · 16 (+objections 437px row 22) |
| /admin/proposals | 06(22.5 pills) · 08 · 13 · 22(69–86px rows) |
| /admin/candidates | 03 · 04 · 06 · 09 · 10 · 12 · 13(3 names, enums) · 17 · 20 · 23 |
| /admin/ai-polls (+detail) | 03 · 04 · 06 · 08(two link recipes) · 09(60+20) · 10(▲672) · 13 · 20 · 21(quality bar) · 22 · 23 |
| /admin/ai-usage | 04 · 05(74.3) · 06 · 10(▲1 calls) · 11(Inter labels) · 12 · 13(&times;, enums) · 14 · 17 · 21 · 23 |
| /admin/sources | 02 · 08(REMOVE 16.5) · 09 |
| /admin/updown (+rounds, proposals) | 02 · 08 · 13 · 22(375px rows) |
| /admin/payments | 02(kill-switches) · 09(40 cells) · 16 · 12 |
| /admin/transactions | 04(44-rail) · 06 · 09 · 10(money clip) · 13 |
| /admin/approvals · /admin/aml · /admin/compliance · /admin/self-exclusions · /admin/privacy · /admin/retention | 02 · 09 · 10 · 11 · 14 · 20 · 21(aml) · 22(compliance) · 23(aml, compliance) |
| /admin/audit | 06(9-chip rail) · 09 · 13(ids) · 17(64px th) · 21(btn-yes/claret) · 23(1440 clip) |
| /admin/system · /admin/config | 02 · 04(36.8+44) · 05(66px) · 12 · 16 |
| /admin/staff (+detail) · /admin/roles · /admin/invites (+detail) · /admin/affiliate · /admin/bonuses | 02 · 08 · 10 · 11 · 12 · 16 · 20 (+roles: descriptions truncated at 390) |
| shell (all 44) | 18 · 03(via SearchBox pages) |

## 4 · Checked and found SOUND — do not “fix” these
- **Every table is on `.admin-tbl`** (44/44 measured) with identical th/td type+padding — the 2026-07 consistency programme held.
- **Section rhythm** is 20px on 162 of 167 gaps (`AdminBody space-y-4`) — keep; markets/new’s 32px wizard is deliberate.
- **h1 = 28px Sora 700 on all 44 pages** (`AdminPageHead`) — one exception: `/admin/updown` renders 24px at 390.
- **Zero horizontal page overflow** at 390/1440/1920 on all 44 routes; **zero console errors** on 43 (one transient on reports).
- Sidebar active state carries `aria-current="page"` everywhere; badges render; RBAC nav filtering intact.
- Kit Select listbox geometry (once open) is uniform: 41px options, 14px mono, r12, 240px cap — consistent across all 8 selects opened. (Its **trigger** is DG-A-04/05; option **hover** highlight exists via `onMouseEnter` focus — the probe’s `hover:false` reads the class list, not the focus state: false alarm, verified select.tsx:391.)
- The 40px `.mcardp-actions .btn` literal and the 44px `.pchart-range` literal are **documented rulings** (globals.css:3503, 2644) — out of scope on the player side and not counter-examples here.
- Money formatting (`formatTzs` + compact grammar) is single-sourced — DG-A-13’s doubles are call-site slips, not a second formatter.

## 5 · What this pass did NOT cover
- `/admin/2fa/setup` and `/admin/totp-verify` (gate pages; TOTP disabled on prod), `/admin/kyc/[id]` with a real live document, `/admin/staff` invite flow modals, the resolution ceremony BEYOND its landing (no destructive clicks by design), bulk-resolve bar in a selected state, AI-toolkit dropdown contents, admin at 768/1024 tablet widths, SW/ZH admin locales, real modal interiors (ConfirmModal was measured only via source), and `/admin/reports` overlays (page too slow).
- Player-side systems are the sibling report’s scope.
- §7’s ~280 page findings had their **P0s** spot-verified only (their machine verifiers hit the session limit); treat unmarked §7 rows as *filed by an auditor agent, evidence quoted, not yet re-verified*.

## 6 · Implementation order for Claude Code (primitive-first)
1. **Kit fixes** (one file each, whole classes close at once): `toggle.tsx` hit-area (DG-A-02) · `select.tsx` true-32 + truncate (DG-A-04/05) · `search-help.tsx`+`search-box.tsx` unclip (DG-A-03) · `input.tsx` sm-rung (DG-A-04) · `pagination` wrap (DG-A-07) · `ScrollX` affordance (DG-A-23) · `AdminKpi` re-token + neutral delta (DG-A-10) · `SortTh` (DG-A-17) · `admin-charts` axis layer (DG-A-15).
2. **Tokens & classes:** type-ladder ruling (DG-A-12, Ali picks 12.5-as-token vs 13), the three label classes (DG-A-11), card rungs (DG-A-16), sidebar active-bg token + 40px items + `<main>` (DG-A-18).
3. **Per-page sweeps:** filter rows onto the one recipe (DG-A-04), rails onto FilterPill (DG-A-06), row-actions (DG-A-08), cell-hover removal (DG-A-09), copy/enum sweep (DG-A-13), prose floor (DG-A-14), colour-semantics (DG-A-21), reports performance (DG-A-01), layout balance (DG-A-22), skeletons last (DG-A-20).
4. **After each step:** `npx tsc --noEmit` · `npm run test:ui-consistency` · `test:design-frozen` · `test:contrast` · `test:tokens` · then re-run `node scripts/design-gate/measure.mjs` (admin chain, ONE login) + `analyze` and diff the section that step owns. The gate is green when: rows-with-mixed-heights = 0 outside tables, label recipes ≤ 8, off-ladder sizes = 0 new, hoverCells ≤ underlined links, no truncated `TZS`, `/admin/reports` load < 5 s.
5. New guards to add while fixing (each RED today): row-rung rule, filter-language on `/admin/**`, copy-enums grep, load budget, popover-clip assert, switch tap-test.

## 7 · Appendix — the nine deep page audits (agent fleet, 2026-08-28)
Provenance: nine auditor agents each read the page’s JSON + three screenshots + source. Their
verifier pass died at the session limit; P0s were re-verified by hand (results inline). Rows
marked ✔ are corroborated by §2’s own measurements; ✘ = re-checked and refuted; unmarked = quoted
as filed. Full text with fixes/proofs: `.qa-design-gate/wf-findings.txt` (this PC).

### /admin/compliance
- ✔ P0→**verify-before-fix**: KYC funnel fill renders as a thin strip — mechanism real (`.prog-sweep` is `position:relative`, globals.css:2720, so the fill’s `absolute inset-y-0` resolves against it); exact visual to re-prove before patching.
- ✔ Two KPI tile recipes on one row · ✔ empty 572×122 grid cell · ✔ 430px card for one line · three `→` link recipes, none kit · “verify now →” dead-looking anchor, no hover · ✔ four eyebrow trackings on one page · ✔ 11px prose (§T4) · a zero painted amber · ✔ report titles at 390 ellipsise to 6 chars while metadata keeps 106–159px · typed `↓` char instead of kit glyph · status tones on stateless download plates · ✔ harm table cut at 390, no affordance · dead thead overrides (`p-3` inert) · `text-text-secondary` ≡ `text-text-tertiary` (two-tier hierarchy renders as one) · “End-to-end approval: 10.8%” numeral in Inter (§T5) · backup line forced uppercase (“…28.8 MIB · SEALED”) · StatusPill glyphs OK/✓/✓ · five icon sizes + two prop spellings · hand-rolled info card with a WARNING triangle vs kit Callout · “Avg time —” permanent stub tile · “Sportradar feed: stub adapter.” regulator-facing jargon · reality-check caption orphan at 1440 · ✔ AML KPI gap 12 vs 16 · ✔ sidebar brand no hover · ✔ dead `th[aria-sort]` colour · ✔ skeleton mismatch.

### /admin/affiliate
- ✔ P0 toggles 26px on money levers (DG-A-02) · hand-rolled segmented control at 40px/8px-radius/third blue · page-local `Field` fork shadows the kit’s (12px Inter labels vs 10px mono) · suffix 11px vs field 13px · ✔ `Input size="sm"` 36px off-rung · ✔ master-switch card unwrapped at 390 (title 4 lines in an 83px column) · ✔ glass vs hand-rolled card families · four card-title recipes · ✔ hand-typed 14.5/11.5/12.5 sizes · five SW-gloss recipes · compliance note wears betting-NO palette · “▲ all-time” on TZS 0 · “EARNED (TZS)” over “TZS 0” cells (doubled unit) · ✔ wrong-shape skeleton · two stack gaps (20/16) · `rounded-[9px]/[11px]` icon tiles (IconPlate exists) · four glyph sizes · six inline field widths → ragged 390 column · “@jaykisha…” truncation with title-only disclosure · 58.8px leaderboard rows vs 44 dense · ✔ KPI hover-lift false affordance · ✔ ScrollX no affordance · EmptyState off-ladder (15.5/12.5) · “§4.2b/c” spec refs in operator copy · ✔ S-09 instances · ✔ 42px sidebar items.

### /admin/audit
- ✘ P0 “Chain integrity reads BROKEN on production” — **refuted live** (page reads Valid; the code path exists but was not the rendered state; keep as a data-display risk note only).
- ✔ ids sliced without ellipsis (`system_updown_or`) · ✔ third filter language: nine always-outlined 25px chips in 44px links · CAT column two chip heights/type sizes · ✔ hand-typed category tones colliding with §B11 (SECURITY in broadcast-red, BET in YES-green) · ✔ 64px sortable headers (DG-A-17) · ✔ payload cut at 1440 inside 1158px card · report-btn label span 10.5px + doubled icon gap · ✔ btn-yes + btn-claret for two identical downloads (DG-A-21) · ✔ KPI band bespoke ladder (1-up at 390) · ✔ actor links hover green + per-cell hover on row hover · ✔ six eyebrow recipes · ▲ on non-deltas + raw enum “top: SYSTEM” · mixed EN/SW subtitle · Valid vs BROKEN casing pair · minute-precision timestamps make sort unverifiable · ✔ 12.5px table body (platform) · three control rungs on one page (40/44/25) · ✔ pager wrap split at 390 · hand-rolled warning box vs Callout · ✔ wrong-shape skeleton · 27px vertical vs 8px horizontal chip air at 390 · ✔ `p-3.5` tile padding · ✔ 10.5px SW gloss · sort affordance invisible + th cursor lies · “CAT.” lone abbreviation · raw model tokens to officers · 8px gap in 12px row · ✔ `rounded-pill` dead on `.btn` · breadcrumb/h1 mismatch · ✔ shell 42px/tracking drift.

### /admin/ai-usage
- ✔ Select xs 36.8 beside 32 search and 40 button; “All statuses” wraps 55.5 with label riding 9px high · filter `btn-sm` in 32-rail aligned by a `pt-4` hack; Clear is a raw `<a class="btn">` · ✔ `pl-9` = **64px** on the overridden scale → 34px dead gap after the magnifier · search text 12px Inter vs selects 12.5px mono; input jumps to 16px at 390, selects don’t · ✔ date presets = third capsule rail (34.5, bold-reflow) · ✔ at 390 every filter control under the floor (32/34.5/36.8/55.5) · ✔ Toggle 26 · Set-limit button centred on label+input block (11.5px above field) · ✔ 75.5–187.5px starved rows · ✔ 64px sortable th · 58.8px rows from a “— under —” subline · ✔ all prose 11–12px · ✔ five Inter small-caps labels · seven eyebrow combos · ✔ chips contradict §B11 (OPEN green, CLOSED slate, PART YEAR amber; SENTINEL/CHAT as tones) · ✔ literal `&times;` rendered · editable vs read-only model control differ 36.8/40, 12.5/14px, r8/12 · radius split 8/12 in one rail · three inset paddings + S-09 · rhythm alternates 20/16 and 8/4 · ✔ off-ladder sizes · same id two casings (“RATES P3193CX”/“rates p3193cx”) · ✔ every delta ▲ (“▲ 1 calls” unpluralised) · ✔ raw enums re operators · zero/null rendered three ways (blank/0/—) · ✔ 390 clip mid-value, no affordance · primary not rightmost (Set limit left of ghost) · health banner third heading style · dead sorted-th tint · five glyph sizes · ✔ model Select 74.3px at 390 beside 40px Apply.

### /admin/aml
- ✔(agent-measured) P0 “TZS 11,100” wraps to two lines in the Stake cell at 390 — money reflow (A§5); table min-width fix in DG-A-23.
- ✔ detector rows 174/192px at 390 · review-queue empty state clipped mid-card at 390 · detector card header 122px tall at 390 (“2 FLAGS” broken into two lines) · ✔ unequal KPI rows at 390 (117 vs 132) · ✔ “AWAITING 2ND SIGNATU…” · ✔ raw `STAKE_SPIKE` chip, hand-typed colour · ✔ ▲ on every tile · three card-title recipes (kit’s unused) · third amber-notice recipe vs Callout · ✔ 11px policy paragraph · ✔ seven label recipes · ✔ 65px sortable header row · dead sort colour · two SW-gloss recipes (10.5 off-ladder) · 4px-radius delta pill beside 999px chips · ✔ tile r16 vs §S2 `--r-md` (dead `rounded-lg`) · ✔ `p-3.5` inversion · ✔ hover-lift false affordance · two link-hover recipes + four stacked row effects · glyphs 18/16/17 · ✔ raw reason `<input>` 40px/8px/11px vs kit Input 44/12/14 · ✔ Approve wears betting-YES (DG-A-21) · 10.5px helper text · money cell mixes chip+glyph+caption · ✔ skeleton mismatch · ✔ 390 cut at “PROVI”, no affordance · `COMPLIANCE` enum in staff prose · ✔ shell 42px/4-tracking/brand-no-hover.

### /admin/bonuses
- ✔ P0 five Toggles 26px + master row 26-beside-40 (DG-A-02) · ✔ ledger money wraps at 390 (“TZS / 2,000”) + handle breaks mid-string · Multiplier/Expiry force “0” while hint says “Blank = default” — the field can never be blank · ✔ Input sm 36 under 40px buttons (8 fields) · suffix “×/days” 11px subtle vs prefix 13px muted · Cashback mode = raw button while sibling setting is a Toggle · five card-title recipes · five SW-subtitle renderings · ✔ hand-typed 10.5×10, 11.5×2, 12.5 · ✔ prose under floor at five sizes · four eyebrow recipes (12-site hand-typed vs kit FieldLegend) · NumField forks kit Field (div-label, 10.5px hint) · ✔ `rounded-[9px]/[11px]` plates (IconPlate names bonuses as origin) · “How bonuses work” hand-rolled vs Callout · ✔ CANCELLED/EXPIRED amber against console amber-law · ✔ ledger rows 65/65/65/54.5 (Cancel inflates), 21px over dense · ✔ wagering money 10px (< micro, < floor) · three panel paddings/two radii inside 16px cards · ✔ S-09 instances · 16px editor stack vs 20 elsewhere · Grant left vs Save right (primary placement) · ✔ 390 master row unwrapped (83px column) · ✔ “OUTSTANDING …” KPI clip (pulse shares row) · ✔ ledger sideways at 390 no affordance · ✔ skeleton mismatch ×5 · 28% vs 30% “on” border mixes · glyphs 23/19/16/14/12 · ghost Cancel triggers claret claw-back (idiom clash) · two focus recipes on one row · hand-rolled 8px progress track vs `.pbar` · DATE “27 Aug” vs siblings’ full timestamps.

### /admin/ai-polls/[id] (poll detail)
- ✔ P0 both “View predictors” under the floor at 390 (33.8 / 25.8) — and drawn with **two recipes on one page** (DG-A-08) · header stack mixes kit Delete (40/Inter/r12) over mono pill (33.8/10.5/r8) · ✔ `rounded-pill` dead on `.btn` · Delete’s `text-text-subtle` never applies (renders white) · ✔ 390 header crush: title 162px column, right 45% empty · “1 sources” · raw enum twice (“OTHER”, “other”) · breadcrumb title-cases the id · three timestamp recipes (proportional Inter beside mono tabular) · ✔ quality bar in betting-YES ink (B2a) · card titles: hand-rolled mono eyebrows vs list page’s Sora (two styles between list & detail) · 3+1 eyebrow recipes · ✔ hand-typed 12.5/10.5 ×6 · every size arbitrary where tokens exist (`text-[18px]` for `text-title-sm`…) · source URL an officer must verify is plain text, truncated 400px, no title · quality pills + FilterReasonChips hand-rolled (8px dot vs kit 6px) · 8px meter outside `.pbar` (14/28 rungs) · skeleton omits two cards (≈238px jump) + `h-3.5`-under-`h-3` inversion · two empty-state shapes on one page · glyphs 10–14 with −2px baseline hacks · PUBLISHED chipped at two sizes · ~60% empty options card at 1440/1920 · metadata footer mixes four recipes · eyebrow-gap 12/16/4/2 across sibling cards · two focus recipes in one stack · two quote-rail recipes · SW subtitle 13px card vs 11px head · “Reviewed by d0e8af” opaque id · header mixes cased/uncased mono labels · ✔ shell four trackings · ✔ AdminCard `rounded-lg` dead under glass 16.

### /admin/ai-polls (list)
- ✔ P0 popover clipped by `.input-group` (DG-A-03) · ✔ batch row 36px Input beside 40px btn-sm · ✔ Input/Duration sm = 36 off-rung · Refresh sits 13.5px below the search centre-line (aligns against the reserved echo row) · ✔ three capsule recipes on one page (36 / 34.5 / 25.8 — DG-A-06) · selected-chip idiom disagrees within the page (weight-change vs not) · two chip gaps (8/4) three rows apart + dangling `w-px` divider at 1440 · ✔ 74.5px rows (norm 44): Created wraps 3 lines + 40px Delete per row · “DIDN’T PASS CHECKS” chip wraps to three lines at 1440 · ✔ per-row “View” is `opacity-0 group-hover` — invisible on touch, never on keyboard focus · copy promises “Click any row” but only the Title navigates · ✔ `p-3` inert ×189 · ✔ 12.5px body off-ladder (1,517 cells console-wide) · 48 off-ladder glyph runs (10.5/9) · ✔ “▲ 672 generations · 30379.0k tokens” ellipsised + bad compaction + ▲-by-default (`deltaDir`) · ✔ “PUBLISHED TO…” at 390 · seven eyebrow recipes while kit Field goes unused · three focus recipes + two rails with none · placeholder tint 70%/100%/40% across neighbours · ✔ `rounded-pill` inert ×16 while DateTimeRangeFilter uses working `btn-pill` · Delete-all as bright as Generate (`text-subtle`/`text-[12px]` overridden) · four bespoke primary widths (160/150/140/120) · card-header glyphs 18 vs 16, rails 12 vs 13, `size=`/`s=` mixed · ✔ KPI hover-lift · ✔ skeleton wrong shapes ×3 · ✔ STATE_VARIANT hand-typed ×4 vs status-tone (FILTERED/PENDING_REVIEW amber vs §B11) · ✔ 13 chips under floor at 390 on top of S-07a’s 15 · “CLAUDE (WEB SEARCH)” painted as a success chip · one category, three labels (“MACRO / ECONOMY”/“MACRO”/raw id; “INFRASTRUCTURE” vs “INFRA”) · three hand-rolled card headers (20/16/8px gaps) vs `AdminCard`.

### /admin/candidates
- ✔ P0 popover clipped + offset 64px (`top-9`) — never visible at rest (DG-A-03) · ✔ P0 date-preset chips 34.5px at 390 under floor (DG-A-06) · ✔ search row four heights (46/44/40/32) · ✔ `rounded-pill` inert on Search · ✔ two capsule recipes on adjacent rows; ONE row at 1920 with an 8.7px step · ✔ “Pending reviewfor” lost space · ✔ 11px pipeline prose · ✔ four ▲ pseudo-deltas · title cell ellipsised 19/20 rows, no disclosure, capped 420px even at 1920 · ✔ STATE_VARIANT vs §B11 (PENDING_REVIEW/SCORED amber, REJECTED slate) · three words for one state (rail/chip/KPI) vs §L2 · ✔ raw category enum uppercased while the rail says “Infra” · ✔ eight label recipes; winner named (10px mono 0.14em) · ✔ 10.5px ×20 · ✔ 390 search squeezed to 156px, placeholder “Search ca” · 1×24px rail separator wraps to its own 36px band at 390 · flush headers hand-rolled at `lg:px-5` = 24 → 4px misalignment with the table · `p-3`/hover restated inert · three mono sizes in one row + timestamp cell lacks tabular-nums · “Sept” beside “Nov/Aug/Oct” shifts the year column · rail spacing off-scale (8 vs 4, 12 vs 16, p-3.5) · seven glyph sizes; rails lead calendar/filter/nothing · icon buttons/pager r8 vs `.btn` r12 · chips lack `aria-pressed` (dates have it) · “APPROVED · AWAITING PUBLISH” clipped at 390, no title · ✔ rows 44.5→75px at 390, clipped at card edge · ✔ skeletons wrong (toolbar omitted; 32px bars for 71px block) · RejectForm/CandidateRow/CardSortControl (not live): raw textarea, `btn-no` misuse, three heights in one popover, third chip copy · ✔ one page three names · ✔ brand link no hover.

---
*Written by the design-gate session of 2026-08-28. Evidence regenerable any time:
`node scripts/design-gate/measure.mjs` (admin account, serialized), shots + JSON into
`.qa-design-gate/`. Delete `.qa-design-gate/` when the gate is green — it is output, not source.*
