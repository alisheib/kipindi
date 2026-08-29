# SESSION PROMPT — implement THE DESIGN GATE to 100%

**Programme key: `DESIGN-GATE-2026-08-28`** — quote this key in commits and handoffs so any
session, on any machine, knows which programme it is inside. Owner: Ali. Commissioned 2026-08-28:
*“100% consistency among the platform … your report should be the final gate to a perfectly
rendered platform.”*

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
| **DG-A-03** | 1 | P0 | "How to search" popover clipped invisible by its own input group, every admin SearchBox | `globals.css `.search-box` · search-help.tsx` | 🚢 shipped, verifying | `b4cd5024` + `4ac3111b` | ⏳ clip GONE (verified: /markets + /results painted & hittable, 3/3 probe points). Flip-up for the below-fold half awaits the `4ac3111b` deploy |
| **DG-P-01** | 1 | P0 | primary navigation gives NO hover feedback at all (200 dead probes) | `top-app-bar.tsx · nav-more.tsx · avatar-menu.tsx · auth-shell.tsx · globals.css `.kp-navlink`` | ☑ | `0db54c4f` + this commit | ✅ **2026-08-29 production, anon drive, 17 public routes: dead nav links 85 → 7; surface hover-dead 114 → 34.** ⛔ The 7 are ALL the `aria-current="page"` item, excluded BY DESIGN following `.pchart-range` — hovering the active item would swap its brighter `--pill-active` for the darker sunken `--bg-overlay`, i.e. it would appear to LOSE emphasis. ⚠️ Authed-only residue (avatar, More, stake presets, notification rows) is UNMEASURABLE until a player login works |
| **DG-P-02** | 1 | P0 | shared with admin: Toggle 26px on the RG page + the clipped search popover | `same two files` | ☐ | — | — |
| **DG-A-04** | 1+3 | P1 | 🔴 **REGISTER STALE — re-derived 2026-08-29.** 36.8 and 55.5 occur NOWHERE; the markets/players/resolver/ai-usage filter rows are already uniformly 32. Root cause (a) was fixed by `af4de432` **the same day the report was written**. Only (b) survived: `Input size="sm"` = 36px, on no rung | `input.tsx` → `--h-control-sm` (40, **Ali's ruling**) | 🚢 shipped, verifying | this commit | ⏳ prod re-measure pending |
| **DG-A-05** | 1 | P1 | ⛔ **CLOSED — NO CHANGE.** Its prescribed fix (`truncate` the trigger) is ILLEGAL: `combobox-trigger-truncates` forbids it at error severity (E-98, "not a layout fix — it is data loss"), and `select.tsx:285-318` already ruled "growing is honest, clipping is data loss". 55.5 does not reproduce; 2 selects exceed their rung, both call-site width → step 3 | `select.tsx` — correct as-is | ☑ | this commit | ✅ re-derived on production 2026-08-29: no kit defect exists |
| **DG-A-07** | 1 | P1 | pagination is 44px inside rails that are 32px — ⚠️ Ali picks which rung wins | `pagination component` | ☐ | — | — |
| **DG-A-10** | 1 | P1 | the KPI tile system lies a little, everywhere | `admin-shell.tsx `AdminKpi` + 20 money call sites` | 🚢 **PART 1 of 2** | this commit | ⏳ Money clipping, the ▲ default and the false hover lift are shipped. ⛔ **The REST is genuinely blocked on Ali's step-2 type ruling** — "label on `--type-label`, value on the ladder, `p-3` rungs" cannot be done before the ladder exists. Also still open: KPI labels ellipsising mid-word at 390, and the 3 `KpiGrid` bypasses (reports/audit/compliance) |
| **DG-A-15** | 1 | P1 | charts: squashed axes and unreadable legends | `chart axis layer` | ☐ | — | — |
| **DG-A-17** | 1 | P2 | sortable headers are 64px in 37px header rows; the sort colour is dead CSS | `SortTh` | ☐ | — | — |
| **DG-A-23** | 1 | P1 | tables clip with no affordance — ⚠️ **at 1440 too**, not only 390 | `scroll-x.tsx · globals.css `.scrollx`` | 🚢 shipped, verifying | `8c72f591` | ⏳ re-derived RED 2026-08-29 (audit 1282-in-1158, updown 1355-in-1158, reports 602-in-358). ⛔ The register's fix is half a NO-OP (Blink already paints a thumb — it was under the contrast floor at 2.23, not missing) and half a HAZARD (a mask clips absolutely-positioned panels = DG-A-03's defect). Guarded now by `test:contrast` at 3.18 |
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

## Keep track — tick here, push after every completed step
Update this table in the same commit as the work (programme key in the commit message).

| Step | Systems | Status | Commit | Re-measured |
|---|---|---|---|---|
| 1 kit primitives | DG-A-02/03/04/05/07/10/15/17/23 · DG-P-01/02 | ☐ | — | — |
| 2 tokens & classes | DG-A-11/12/16/18 · DG-P-04/05/06 | ☐ | — | — |
| 3 sweeps | DG-A-04/06/08/09/13/14/21 · DG-P-03/07/08/10/11 | ☐ | — | — |
| 4 singles | DG-A-01/20/22 · DG-P-09/12/13/14 | ☐ | — | — |
| Ali decisions | type-ladder ruling · pagination-vs-rail rung · §7 verify-before-fix items | ☐ | — | — |

## 🧹 DELETE WHEN DONE (Ali’s instruction, 2026-08-28)
When every row above is ✅ and the gate re-measures green on production:
- delete `.qa-design-gate/` and any leftover `.qa-design-adminscan/` output (evidence, regenerable);
- delete `design-brief/design-gate-2026-08-28/` + its `.gitignore` exception (once the round is sent);
- mark the two `DESIGN-GATE-*` reports’ headers **⚪ SPENT** (keep the files — they are the record);
- update the memory note `50pick-design-gate` to CLOSED.
