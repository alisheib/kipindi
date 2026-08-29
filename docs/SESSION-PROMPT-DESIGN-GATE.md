# SESSION PROMPT — implement THE DESIGN GATE to 100%

**Programme key: `DESIGN-GATE-2026-08-28`** — quote this key in commits and handoffs so any
session, on any machine, knows which programme it is inside. Owner: Ali. Commissioned 2026-08-28:
*“100% consistency among the platform … your report should be the final gate to a perfectly
rendered platform.”*

## ⏭️ RESUME AT — session 76 handover (2026-08-29)

> **Step 1 is 10 of 11.** Read this block, then the PLANNER at the bottom (every row carries its
> own evidence and its own commit). Everything below was driven on production, not on localhost.

### 🔴 READ THIS BEFORE YOU FIX ANYTHING — the registers' numbers are stale
DG-A-04's headline table says `/admin/markets` renders `Select 36.8` and `Select 55.5 (wrapped)`.
**Measured 2026-08-29: 32 and 32. `36.8` and `55.5` occur NOWHERE in 44 routes / ~2,600 controls.**
The cause is `select.tsx`'s `px-2 py-1` fix — commit **`af4de432`, dated 2026-08-28, the SAME DAY
the report was written.** The audit drive ran before it deployed.
⛔ **§7's ~280 findings come from that same pre-`af4de432` drive. Re-derive every row before
fixing it.** Fixing a defect that no longer exists is how a correct control gets broken.

### ⛔ THREE OF THE ELEVEN NEEDED NO CODE — they asked to reverse dated, measured decisions
| Row | What it asked | Why it was refused |
|---|---|---|
| **DG-A-05** | `truncate` the Select trigger | `ui-consistency`'s `combobox-trigger-truncates` forbids it at **error severity** (E-98: *"not a layout fix — it is data loss"*), and `select.tsx:285-318` already ruled *"growing is honest, clipping is data loss"* |
| **DG-A-07** | fix the pagination wrap | `pagination.tsx` records *"THE WRAP IS THE DESIGN"*, measured **2026-08-25 — three days before the audit** — and explicitly rejects the exact remedy proposed |
| **DG-A-23** (half) | "gains a scrollbar" | A **no-op in Chrome**: a global `::-webkit-scrollbar` rule means a thumb was always painted — at **2.23 against the 3.0 floor**. Its "edge-fade" is a hazard: a mask clips absolutely-positioned panels, i.e. DG-A-03's defect |

### ▶ THE NEXT MOVE, in order
1. **`DG-A-15` — the only step-1 system not started.** Already re-derived and quantified in its
   planner row; the fix shape is written there. It needs no ruling from Ali.
2. **Step 2, the moment Ali rules on the type ladder.** ⚠️ That ruling gates DG-A-12 + DG-P-05 **and
   the remainder of DG-A-10** — three sub-1M money values still clip at 390 and cannot be fixed
   while the value is a 22px inline literal.
3. ⛔ **Do not start Maswali.** Ali's order: the Design Gate runs first and to completion.

### ⚠️ What this session could NOT measure, and why
🔴 **All six 36-character player/officer secrets in `.env.qa.local` are rejected by production**
(`error=wrong_credentials`, tested on five accounts). Only `QA_ADMIN_PASSWORD` works. ⛔ NOT the
PhoneInput hydration trap — the hidden mirror synced and the server answered. **So the authed
player surface is blind:** the Toggle on `/profile/responsible-gambling`, the avatar trigger,
`More`, the updown stake presets and the notification rows are FIXED IN CODE but unverified.
⭐ **The way round it, and it is enough to close DG-P-01:** `SURFACE=player ANON=1 node
scripts/design-gate/measure.mjs` drives the 17 PUBLIC routes with no login, and the top bar is
present signed-out.

### ⭐ Two traps this session paid for — do not re-pay them
- **The `::after` hit-area arithmetic.** `top:-7px; bottom:-7px` on a 26px track measures **38, not
  40** — an absolutely-positioned box resolves against the **padding** box and the track carries a
  1px border. **State the floor** (`height: var(--tap-min)` + centre); never sum your way to it.
- **A guard can lie in both directions, and mine did on its first run.** `qa:toggle-hit` page-stepped
  the viewport, so a switch under the sticky admin topbar read `up: 0` (a lie about the product);
  and it printed `n=7 probed=0 ✓` (a green tick over a measurement that never happened). Both fixed.
  ⛔ **Zero probes is a skipped run, never a pass.**

---

## ▶ START HERE (any machine)
1. `git pull` on `main` (F:\kipindi-main on the original PC; any clone works — the evidence
   regenerates). `npm install` after every pull. ⚠️ Two sessions may share this tree — read
   `.claude/skills/50pick-standards/SKILL.md` §8b before committing anything.
2. Read, in order:
   - [DESIGN-GATE-ADMIN-2026-08-28.md](DESIGN-GATE-ADMIN-2026-08-28.md) — 23 systems `DG-A-01…23`, §6 is the work order.
   - [DESIGN-GATE-PLAYER-2026-08-28.md](DESIGN-GATE-PLAYER-2026-08-28.md) — 14 systems `DG-P-01…14`, §6 is the work order.
   - [DESIGN_AUTHORITY.md](DESIGN_AUTHORITY.md) §0 before writing ANY design value anywhere.
3. The measuring instruments are **in the repo**: `scripts/design-gate/measure.mjs`,
   `overlays.mjs`, `shots.mjs`, `analyze.mjs`, `redo.cjs`, `AUDIT-BRIEF.md`. They run against
   production read-only and write to `.qa-design-gate/` (gitignored). Credentials come from
   `.env.qa.local` (never tracked; per-machine — see the memory note “QA logins stale again”).

## The work, in order (details in each report’s §6)
| Step | What | Systems |
|---|---|---|
| 1 | Kit primitives (one file each, whole classes close at once): toggle hit-area · select true-32 + no-wrap · search popover unclip · input sm rung · NavLink hover · ScrollX affordance · AdminKpi re-token + neutral delta · SortTh · chart axis layer · pagination wrap | DG-A-02/03/04/05/07/10/15/17/23 · DG-P-01/02 |
| 2 | Tokens & classes: type-ladder ruling (⚠️ Ali picks: bless 12.5 as `--type-table` or move tables to 13) · three label classes · card rungs · sidebar active token + 40px items + `<main>` landmark · section-rhythm | DG-A-11/12/16/18 · DG-P-04/05/06 |
| 3 | Sweeps: dense filter rows → one recipe · rails → FilterPill · row-actions · cell-hover removal · copy/enum sweep · prose floor · colour semantics (§B11 + no betting ink on actions) · h1 discipline · tap-floor residue · truncation disclosures · board chip migration · aria-current reach | DG-A-04/06/08/09/13/14/21 · DG-P-03/07/08/10/11 |
| 4 | Singles: `/admin/reports` 88 s load · React #310 on authed `/auth/login` · layout balance · skeletons last | DG-A-01/20/22 · DG-P-09/12/13/14 |

**Definition of done per step:** `npx tsc --noEmit` clean · `npm run test:ui-consistency` ·
`npm run test:design-frozen` · `npm run test:contrast` · `npm run test:tokens` ·
`npm run test:filter-language` green — then **re-measure**: run the drive for the touched
surface and diff the analyzer section that step owns. A step is done when its RED line in the
report’s §6 gate list is GREEN **on production**, not on localhost.

## ⛔ Traps this programme has already paid for (do not re-pay)
- 🔴 **THE PLAYER QA LOGINS ARE DEAD (measured 2026-08-29, session 76).** All SIX 36-character
  secrets in `.env.qa.local` — alpha, echo, growth, trading, officer, finance — are rejected by
  production with `error=wrong_credentials`. Only `QA_ADMIN_PASSWORD` (10 chars, added session 75)
  works. ⛔ This is NOT the PhoneInput hydration trap: the hidden mirror synced correctly and the
  server answered `wrong_credentials`. **The memory note has it exactly backwards now** — admin is
  the measurable surface and player-authed is the blind one.
  ⭐ **The way round it:** `SURFACE=player ANON=1 node scripts/design-gate/measure.mjs` drives the
  17 PUBLIC player routes with no login at all, and the top bar is present signed-out — so
  DG-P-01's whole gate line is measurable anonymously (85 dead nav links on 17 pages = the same
  5-per-page population as the report's 200). What stays UNMEASURABLE until Ali supplies a working
  player password: the Toggle on `/profile/responsible-gambling` (DG-P-02's other half), the avatar
  trigger, `More`, and every other authed-only element.
- 🔴 **DG-A-05's PRESCRIBED FIX IS ILLEGAL — it contradicts finding E-98.** The register says give
  the Select trigger `truncate whitespace-nowrap min-w-0`. But `scripts/ui-consistency.test.mts`
  carries an **error-severity** rule `combobox-trigger-truncates` whose whole point is that
  *"a dropdown's CLOSED trigger is the only place an operator reads what they chose, so `truncate`
  there is not a layout fix — it is data loss"* — measured on production hiding the deciding word
  of an Up & Down winning band. **Do not truncate that trigger.** The wrap must be cured by
  content-sizing + `whitespace-nowrap`, never by hiding the answer. This is a THIRD defect in the
  work order, alongside the two below.
- **One login per account at a time.** The platform keeps ONE live session per account; a second
  Playwright login revokes the first mid-run and every later page “succeeds” as the sign-in page
  at HTTP 200 (`?revoked=1` in the URL is the tell). Chain drives per account:
  `measure → overlays → shots` in ONE background command; admin and alpha may run in parallel.
- `redo.cjs <surface>` finds and deletes poisoned records (checks `finalUrl` + h1) — run it after
  every drive before believing the data.
- Player pages hold an SSE stream open → never `waitUntil: "networkidle"`; the scripts already
  use `load` + a bounded settle.
- Git Bash rewrites a lone `/` (and sometimes the first element) in `ONLY=` env lists —
  `MSYS_NO_PATHCONV=1` on every invocation that passes routes.
- The Tailwind spacing scale is overridden and **inverts at `.5` steps**; `rounded-pill` on a
  `.btn` is inert; a bounding box cannot see a hit-area fix (`elementFromPoint` can).
- The 40px `.mcardp-actions .btn` and 44px `.pchart-range` literals are **rulings** (globals.css
  3503 / 2644) — do not “normalise” them.
- Deliberately out of scope, Ali’s standing calls: numeric radius scale; `--h-control-*` /
  `--type-nano` raises; density toggle; search typeahead (NEXT-PLAN §8.8).

## Claude Design commission
The visual-taste questions this gate cannot settle by measurement (admin dense-rung look, KPI
tile art direction, the label type ramp) are packaged for Claude Design at
`design-brief/design-gate-2026-08-28/PROMPT-claude-design.md` (tracked while the round is under
review — DESIGN_AUTHORITY §0b OUTBOUND row). Send it, file the delivery under
`docs/design-system/` as an incoming commission, then **delete the folder and its `.gitignore`
exception** — §0b’s own rule.

## 📋 THE PLANNER — all 37 systems, one row each

⭐ **THIS IS THE HANDOFF SURFACE. Tick a row and push in the SAME commit as the work**, so a
session on another machine can `git pull` and know exactly where the programme stands. A row is
only ☑ when its gate line is GREEN **re-measured on production**, not on localhost.

| System | Step | Sev | What is wrong | Where | Status | Commit | Re-measured |
|---|---|---|---|---|---|---|---|
| **DG-A-02** | 1 | P0 | kit Toggle is 26px on a 40px tap floor — 100x, incl. the payment kill-switches | `globals.css `.toggle-switch::after`` (⛔ NOT toggle.tsx — frozen budget) | ☑ | `67a4729c` | ✅ **2026-08-29 production, `npm run qa:toggle-hit`: 206 probes / 12 route-width pairs, PASS.** /admin/roles 84×2 (the dense case), /admin/payments kill-switches, affiliate + bonuses master rows, /admin/updown inside ScrollX, /admin/system. Every switch reaches 40–41px, paint still 44×26, nothing stolen |
| **DG-A-03** | 1 | P0 | "How to search" popover clipped invisible by its own input group, every admin SearchBox | `globals.css `.search-box` · search-help.tsx` | ☑ | `b4cd5024` · `4ac3111b` · `fe862319` | ✅ **2026-08-29 production: 7 of 7 surfaces PAINTED + HITTABLE at all three probe points** (player /markets /live /results; admin /transactions /candidates /ai-polls /proposals). ⭐ Took THREE corrections, each found by re-measuring the previous fix: clipped-invisible → below the fold → off the TOP → inside a card's own clip. ⛔ A bounding box saw none of them; only `elementFromPoint` did |
| **DG-P-01** | 1 | P0 | primary navigation gives NO hover feedback at all (200 dead probes) | `top-app-bar.tsx · nav-more.tsx · avatar-menu.tsx · auth-shell.tsx · globals.css `.kp-navlink`` | ☑ | `0db54c4f` + this commit | ✅ **2026-08-29 production, anon drive, 17 public routes: dead nav links 85 → 7; surface hover-dead 114 → 34.** ⛔ The 7 are ALL the `aria-current="page"` item, excluded BY DESIGN following `.pchart-range` — hovering the active item would swap its brighter `--pill-active` for the darker sunken `--bg-overlay`, i.e. it would appear to LOSE emphasis. ⚠️ Authed-only residue (avatar, More, stake presets, notification rows) is UNMEASURABLE until a player login works |
| **DG-P-02** | 1 | P0 | shared with admin: Toggle 26px on the RG page + the clipped search popover | `same two files` | ☐ | — | — |
| **DG-A-04** | 1+3 | P1 | 🔴 **REGISTER STALE — re-derived 2026-08-29.** 36.8 and 55.5 occur NOWHERE; the markets/players/resolver/ai-usage filter rows are already uniformly 32. Root cause (a) was fixed by `af4de432` **the same day the report was written**. Only (b) survived: `Input size="sm"` = 36px, on no rung | `input.tsx` → `--h-control-sm` (40, **Ali's ruling**) | ☑ **kit half** | `0c16a0fc` | ✅ **2026-08-29 production: 14 `size="sm"` fields on /admin/bonuses + /admin/invites all render 40 (was 36).** ⚠️ The step-3 per-page sweep (rails onto one recipe) is still open under this same id |
| **DG-A-05** | 1 | P1 | ⛔ **CLOSED — NO CHANGE.** Its prescribed fix (`truncate` the trigger) is ILLEGAL: `combobox-trigger-truncates` forbids it at error severity (E-98, "not a layout fix — it is data loss"), and `select.tsx:285-318` already ruled "growing is honest, clipping is data loss". 55.5 does not reproduce; 2 selects exceed their rung, both call-site width → step 3 | `select.tsx` — correct as-is | ☑ | this commit | ✅ re-derived on production 2026-08-29: no kit defect exists |
| **DG-A-07** | 1 | P1 | pagination is 44px inside rails that are 32px | `pagination.tsx` — correct as-is | ☑ | this commit | ⛔ **CLOSED, NO CHANGE — and NOT an Ali decision after all.** ① The rung half was already ruled in the register's own §2: *"keep 44 (floor wins)"*, and 44 is the tap floor. ② The wrap half is **THE DESIGN**, measured on production **2026-08-25 — three days BEFORE this audit** — and `pagination.tsx`'s comment records it: *"THE WRAP IS THE DESIGN … the row ALREADY wrapped to two lines … the trade-off this change was expected to force — hide the numbers on a phone — was NOT taken, because the measurement says it is not needed."* `justify-center`-when-wrapped exists so the wrap reads as intentional. ⚠️ Re-derived 2026-08-29: it wraps at 390 on audit/markets/players/transactions, exactly as that comment predicts |
| **DG-A-10** | 1 | P1 | the KPI tile system lies a little, everywhere | `admin-shell.tsx `AdminKpi` + 20 money call sites` | 🚢 **PART 1 of 2** | `06d02bdf` | ✅ verified 2026-08-29: **▲-without-a-number = 0** across 6 routes (the "▲ all-time on TZS 0" lie is gone); hover lift gone; clipped money at 390 **6 → 3**. 🔴 **THE 3 THAT REMAIN ARE ALL SUB-1M** and `formatBalancePill` only compacts above 1M by decision: `TZS 134,000` and `TZS 679,532` need 140px in 137, `TZS 137,920` needs 140 in 116. ⛔ **They cannot be fixed without Ali's step-2 type ruling** — the value is a 22px inline literal and the tile cannot widen; that IS the "value on the ladder" work. Also still open with it: labels ellipsising mid-word at 390, the 3 `KpiGrid` bypasses |
| **DG-A-15** | 1 | P1 | charts: squashed axes and unreadable legends | `src/components/admin/admin-charts.tsx` | 🚢 **SHIPPED — production re-measure pending** | `fdba7cad` | 🔴 **RE-DERIVED BY THE NEW GATE `npm run qa:chart-axis`, 2026-08-29 on production: RED, 106 failures over 31+11+11 labels.** `/admin/finance` **62 failures at EVERY width — 1920, 1440 AND 390**, `/admin` 22, `/admin/live` 22. Worst reading `/admin@390`: scaleX **0.257** — a label condensed to **26%** of its own width, rendering **2.82px wide × 11px tall**. ⛔ **The register's "and vertically by height/240" is WRONG — scaleY is EXACTLY 1.0 everywhere**, so a HEIGHT floor would have passed this defect forever; the gate asserts the RATIO of the axes. ⭐ **FIX: the glyphs left the SVG.** Axis labels and the legend are an HTML layer in REAL PIXELS (`AXIS_GUTTER` 46 left, `AXIS_BASE` 16 below); the SVG keeps `preserveAspectRatio="none"` because the data path is SUPPOSED to stretch. Vertical = user units used as px (scaleY is 1 BY CONSTRUCTION), horizontal = % of the plot column. No JS measurement, no ResizeObserver. ⚠️ **TWO FURTHER DEFECTS THE LOCAL PRE-FLIGHT CAUGHT BEFORE PRODUCTION DID:** ① the HTML legend's min-content width (~450px for five providers) propagated through a `min-width:auto` grid item and pushed the whole `/admin/finance` card **past a 390 viewport** — it wraps now, and both roots carry `min-w-0`; ② at 390 the edge-anchored first/last x-labels overlapped their neighbours by **12.5px at both ends** and the stacked chart's first label sat **2.1px outside its own card**. Fixed by one shared rule (`xAxisCols`): edges anchored, and below `sm` only first/middle/last survive. ✅ Local pre-flight after both: **122 labels, 0 failing at 1920 / 1440 / 390.** `test:admin-charts` **68/68** (was 62) with two new CI-level assertions that NO `<text>` returns to either chart |
| **DG-A-17** | 1 | P2 | sortable headers are 64px in 37px header rows; the sort colour is dead CSS | `admin-sort.tsx · globals.css `.admin-tbl th[aria-sort]`` | ☑ | `0d749dba` — ✅ **re-measured on production 2026-08-29: sortable header cells 64.5 → 44.5**, and on /admin/audit + /admin/aml the whole header row is now one height. | ⏳ Re-derived 2026-08-29: **64.5px confirmed** (audit/aml/ai-usage) and the dead tint confirmed (th computes brand-300, the anchor inside computes `--text`). ⚠️ **Two register claims are WRONG:** on audit + aml the PLAIN headers are also 64.5 (same row, they stretch) — the 35.5 mismatch is only on ai-usage's sibling tables; and **`/admin/candidates` has ZERO sortable headers**. ⛔ Fixed by removing the th's redundant vertical padding, NOT by dropping `min-h-[44px]` — that is the tap target |
| **DG-A-23** | 1 | P1 | tables clip with no affordance — ⚠️ **at 1440 too**, not only 390 | `scroll-x.tsx · globals.css `.scrollx`` | ☑ | `8c72f591` | ✅ **2026-08-29 production, `/admin/audit`**: `.scrollx` present, `scrollbar-color` = `--border-control`, `scrollbar-width: thin`, on a wrapper measuring **1282 > 1158 — i.e. the affordance is painted on the exact table that was cut mid-token.** ⛔ The register's fix was half a NO-OP (Blink already painted a thumb; it was under the contrast floor at 2.23, not missing) and half a HAZARD (a mask clips absolutely-positioned panels = DG-A-03's defect). Guarded by `test:contrast` at 3.18 |
| **DG-A-11** | 2 | P1 | 70+ uppercase micro-label recipes — the "fonts everywhere" feeling, quantified | `three label classes` | ☐ | — | — |
| **DG-A-12** | 2 | P1 | type ladder not in force: 24 sizes; console body size on no rung — ⚠️ ALI'S RULING GATES THIS | `globals.css tokens` | ☐ | — | — |
| **DG-A-16** | 2 | P2 | card/panel system: three paddings, two dead classes and an inversion | `card rungs` | ☐ | — | — |
| **DG-A-18** | 2 | P2 | shell details, once, for all 44 pages | `admin shell` | ☐ | — | — |
| **DG-P-04** | 2 | P1 | vertical rhythm: seven section gaps across sibling pages, plus a −1px overlap | `section-rhythm` | ☐ | — | — |
| **DG-P-05** | 2 | P1 | 33 font sizes — ⚠️ SAME ALI RULING as DG-A-12; they share the tokens | `type ladder` | ☐ | — | — |
| **DG-P-06** | 2 | P1 | ~90 uppercase micro-label recipes | `label classes` | ☐ | — | — |
| **DG-A-06** | 3 | P1 | outlined-capsule rails: 3 sizes x 5+ pages → FilterPill | `FilterPill adoption` | ☐ | — | — |
| **DG-A-08** | 3 | P1 | in-table action vocabulary: five recipes, three heights, one job | `row actions` | ☐ | — | — |
| **DG-A-09** | 3 | P1 | hover duplicated inside tables — ⭐ Ali named this one | `cell-hover removal` | ☐ | — | — |
| **DG-A-13** | 3 | P1 | raw enums on screen (AIRTEL_MONEY, sports, STAKE_SPIKE), doubled units ("TZS TZS") | `copy/enum sweep` | ☐ | — | — |
| **DG-A-14** | 3 | P1 | reading copy below the floor | `prose floor` | ☐ | — | — |
| **DG-A-21** | 3 | P1 | semantic colour misuse (B2a): betting ink on non-betting actions | `colour semantics` | ☐ | — | — |
| **DG-P-03** | 3 | P1 | five h1 systems, and one page with two h1s | `h1 discipline` | ☐ | — | — |
| **DG-P-07** | 3 | P1 | tap floor at 390 — the residue | `tap-floor sweep` | ☐ | — | — |
| **DG-P-08** | 3 | P1 | truncation without disclosure, and one clipped support email | `truncation` | ☐ | — | — |
| **DG-P-10** | 3 | P2 | status chips: the board still hand-types its colours (B11's named remainder) | `chip migration` | ☐ | — | — |
| **DG-P-11** | 3 | P2 | active/current markers stop at the top bar | `aria-current reach` | ☐ | — | — |
| **DG-A-01** | 4 | P0 | /admin/reports takes ~88 s to load; timed out at 60/90/240 s | `src/app/admin/reports/page.tsx` | ☐ | — | — |
| **DG-A-20** | 4 | P2 | loading skeletons are the wrong shape for what they replace | `skeletons` | ☐ | — | — |
| **DG-A-22** | 4 | P2 | layout balance | `—` | ☐ | — | — |
| **DG-P-09** | 4 | P1 | /auth/login signed-in redirect throws React error #310 — ⚠️ root cause is a HYPOTHESIS, re-prove first | `auth-flash.tsx?` | ☐ | — | — |
| **DG-P-12** | 4 | P2 | auth & date-input details | `—` | ☐ | — | — |
| **DG-P-13** | 4 | P2 | landing/auth duplication artefacts | `—` | ☐ | — | — |
| **DG-P-14** | 4 | P2 | miscellany, six items — ⚠️ item 5 is an Ali taste call (the /notifications glow) | `—` | ☐ | — | — |
| **DG-A-19** | ? | P2 | icons: sizes 10–23 with two prop spellings — 🔴 IN NO STEP ROW of the work order | `glyphs` | ☐ | — | — |

⚠️ **`DG-A-19` sits in no step row of the table below** — the four steps cover DG-A-01…18 and
20…23 only. **`DG-A-04` sits in two** (step 1 as a kit primitive, step 3 as a sweep). Neither is
resolved in this document; decide when you reach them rather than discovering it mid-step.

---

> 🧹 **There was a second, five-row “Keep track” table here, and it is DELETED (session 77).**
> It restated step 1's status beside the planner that already carried it per system — and it had
> already started to diverge: it still listed *“pagination-vs-rail rung”* as an open Ali decision
> after DG-A-07's own row recorded **“NOT an Ali decision after all”**. Two homes for one fact,
> and the stale one is the one that gets read (§0a). **The planner above is the only tracker**;
> the step→systems map is the *“The work, in order”* table near the top of this file.

## 🧹 DELETE WHEN DONE (Ali’s instruction, 2026-08-28)
When every row of THE PLANNER is ☑ and the gate re-measures green on production:
- delete `.qa-design-gate/` and any leftover `.qa-design-adminscan/` output (evidence, regenerable);
- delete `design-brief/design-gate-2026-08-28/` + its `.gitignore` exception (once the round is sent);
- mark the two `DESIGN-GATE-*` reports’ headers **⚪ SPENT** (keep the files — they are the record);
- update the memory note `50pick-design-gate` to CLOSED.
