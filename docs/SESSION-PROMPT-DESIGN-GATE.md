# SESSION PROMPT — implement THE DESIGN GATE to 100%

**Programme key: `DESIGN-GATE-2026-08-28`** — quote this key in commits and handoffs so any
session, on any machine, knows which programme it is inside. Owner: Ali. Commissioned 2026-08-28:
*“100% consistency among the platform … your report should be the final gate to a perfectly
rendered platform.”*

## ⏭️ RESUME AT — session 79 handover (2026-08-29)

> **THE TWO DECISIONS ARE TAKEN, RULED IN `DESIGN_AUTHORITY` AND GUARDED.** Commit
> `31e8f3ba`. Read this block, then §79 below it, then the PLANNER. ⛔ Every number here was
> re-derived this session; where it contradicts the session-78 block below, THIS one is newer.

### ⭐ THE MONEY WALL IS RULED — and the guard that was supposed to enforce §M4 was blind
`.amount` (globals.css, beside `.mono`) carries §M4's three properties, **replaces**
`font-mono tabular` so a call site gets shorter, and restores the untracked width **byte for
byte** (85.81px on `TZS 679,532`). Written up as `DESIGN_AUTHORITY` §M4's new subsection.
🔴 **The real find:** `type-scale` §2 forbade tracking over an amount via `/^tracking-/` — a
SPELLING. A money element written `text-micro` is tracked **out by +0.4px/glyph (+6.67%)** and
§2 printed PASS. Widening it found **10 sites it could never have seen**; 5 fixed by adopting
`.amount`, 5 recorded (an amount inside a sentence → the wrap, which is DG-A-14).
⛔ **THE POPULATION GREW, NOT THE DEFECT.** Third instance of this exact shape.

### ⭐ THE NAME COLLISION IS RULED — and the row's question was asked of the wrong ladder
**FIVE collisions, not three** (`display-1` 60/64 and `display-2` 44/48 were missed), and the
ladders agree on **none** of their values. `DESIGN_AUTHORITY` **§T7** is new: the two ladders
have different JOBS — `--type-*` for sizes written inside `globals.css`, Tailwind for sizes
written at a call site — and the five are **FROZEN**, with `test:type-scale` §7 pinning the
set *and its values* so a sixth cannot appear. Proven RED both ways.
⭐ **`text-micro` IS 10px.** The handover's *"there is no rung at 10, so the eyebrow costs
+1px on 254 labels"* is true of the CSS ladder and false of the reachable one. The eyebrow
takes `text-micro`; **nothing moves**, and the +1px (**+9.63px on "TOTAL SETTLED"**, ~10%) is
not paid.

### 🔬 `npm run qa:dg-type` — THE BENCH, AND IT IS TRACKED IN `scripts/`
⛔ The DG-A-12 sweep tool was written into `.qa-design-gate/`, which this programme's own
DELETE-WHEN-DONE list orders deleted. This one is not.
🔴 **It runs INSIDE a live production page, and the two versions before it were wrong in ways
that looked right.** A saved stylesheet's `@font-face` is `url(../media/…)` and 404s; rewritten
to absolute URLs a webfont is still **CORS-refused from `file://`** — and either way
`getComputedStyle().fontFamily` reports `"JetBrains Mono"`, because it echoes what was
REQUESTED. **The 13px money string measured 75.73px; in the real face it is 85.81px — 13%
out**, and every KPI conclusion drawn from it was wrong. It now gates on
`document.fonts.check` and refuses to measure without it.
⭐ **The lesson has a general form: a gate one level too shallow is indistinguishable from no
gate.** The sheet gate passed the whole time — it checks a CSS custom property, which resolves
perfectly from a stylesheet whose every font is 404.

### 🔴 DG-A-18 CANNOT BE TICKED — both of session 78's "refutations" are wrong
- *"`qa:landmark-seal` already asserts one `<main>` per page"* — **`scripts/landmark-seal.mjs`
  contains ZERO occurrences of `/admin`.** Its lists are `/wallet /profile /positions …` and it
  signs in as a PLAYER (`loginOnce(b, "fleet:07")`). It is a PLAYER guard, cited as admin proof.
  ⭐ The gate that *does* cover admin landmarks is `scripts/responsive-audit.mjs` (`test:responsive`).
- *"the `<main>` exists at `admin/layout.tsx:224`"* — true for 38 routes and **false for 2**:
  `TOTP_EXEMPT` (`:38-41`) returns `<>{children}</>` at `:97-99`, above the shell. `/admin/2fa/setup`
  is a **forced-enrolment** page every new admin passes through, and it has no `<main>` and no
  skip link. ⛔ And `ADMIN_ROUTES` (38) **excludes both**, so the population cannot see them.
- *"four trackings in one row is three"* — the count is right and **the value set is wrong**:
  0.10/0.12/0.14em, not 0.10/0.14/0.18em.
- 🔴 **AND THE FIX ONLY LANDED ON THE DESKTOP SIDEBAR.** `admin-mobile-nav.tsx:124` is still
  `px-2.5 py-2` = **42px**, off both rungs — while `admin-sidebar-nav.tsx:38-40`'s own comment
  claims it replaced that "on every row of every admin page". And `:126` still says the active
  state as `bg-bg-inset text-royal-300`, a second home for what `--pill-active` owns — one file
  away from the fix that named the problem, and invisible to `hardcoded-pill-active` for the
  same literal-text reason.

### ⚠️ DG-P-04 — five gaps on the measurable surface, not seven
Fresh anon drive, **17 routes** (16 declared in `routes.mjs` + 1 discovered — that is where the
"17" comes from), 0 sign-ins, 0 revocations, **zero overflow at 390, zero console errors**:
`24px ×22 · 32 ×9 · 16 ×4 · 20 ×2 · 29.3 ×1`. All four real values are on `--sp-*`; the 29.3 is
a measurement artefact of an `inline-flex` eyebrow, not an authored gap. ⛔ **The register's
seven can be neither confirmed nor refuted** — 19 of the 36 player routes are authed and blind.
⚠️ The rig's "section" is *any two adjacent children of `<main>`*, which is NOT the rhythm's
"section", so a raw histogram cannot be read as a rhythm violation. The −1px **does** reproduce
(Tailwind's `.sr-only{margin:-1px}`, `/profile/invite` `page.tsx:142`).

### ⭐ DG-A-10 part 2 — the arithmetic is settled and it is 17px
137px and 116px re-derived exactly (390 − 8 scrollbar → 382, − `px-4` 40 → 342, − `gap-3` 16 ÷ 2
→ 163/142, − 2 border − `p-2` 24 → **137/116**). The value is a **22px inline literal**,
`admin-shell.tsx:402`. Measured in the real face: 22px needs **145.2px** — it cannot fit either
tile. **17px is the largest that fits both.**
⛔ **Do NOT lower `BALANCE_COMPACT_ABOVE`.** It is 1,000,000, and `utils.ts:139-143` records it as
MEASURED on production 2026-08-25 (100 wallets, p95 TZS 886,854). ⚠️ But note the population:
that was measured on **player wallets** and is applied to **admin aggregates** — a different
population, which is worth its own row rather than a quiet threshold change.

---

## §79 — the session-78 handover, kept for its traps

## ⏭️ RESUME AT — session 78 handover (2026-08-29)

>**Step 1 is CLOSED, 11 of 11. ✅ DG-A-01 IS CLOSED — 38 of 38 admin routes inside budget on
> production.** Widening its gate from 3 hand-picked routes to all 38 immediately found a page
> at 13 s that nothing was watching; that page is now 1,617 ms. **Step 2 is the whole of what
> remains before steps 3 and 4.**
> Read this block, then the **RE-DERIVED** section, then the PLANNER. Everything below was
> driven on production.

### 🔴 THE THEME AGAIN, AND IT COST TWO NUMBERS THIS SESSION
Session 77 handed over *"the remaining cost is identified, not guessed: … `/admin/insights` (one
of them) returns in **257 ms**"*. Re-measured today: **insights 2,375–3,048 ms, reports
4,490–4,980 ms** — neither of the handover's two figures reproduces. The 257 was almost certainly
a `getInsights()` TTL cache hit. ⛔ **The conclusion drawn from them ("the gap IS the duplicate
scan") happened to be directionally right, and that is the danger** — a stale number that
flatters a correct hypothesis is indistinguishable from evidence. What actually established it
was a **floor route** (`/admin/roles`, 234–292 ms) and a **window sweep** (`?range=today` 4,759 vs
`?range=30d` 5,012 — a 30× bigger window costs 5%, so the cost is not the query window).
⭐ **Every load number in this file is now floor-adjusted or stated with its floor. Re-derive
before quoting.**

### ✅ DG-A-01 IS CLOSED — and the whole admin surface is now measured, not three routes
`npm run qa:admin-load` = **38 of 38 routes inside 5,000 ms on production**, floor
`/admin/roles` 254 ms. `/admin/reports` **4,490–4,980 → 360–447**, `/admin/insights`
**2,375–3,048 → 431–504**, `/admin/updown` **13,247 → 1,617**. Details in its planner row.

### 🔬 THE ONE TOOL THIS PROGRAMME KEPT NEEDING — `GET /api/admin/updown-timing`
A server-rendered page cannot be profiled from outside; `loadEventEnd` is one number for the
whole render, and Railway's logs are not reachable from this machine (MCP: *Unauthorized*).
So `/admin/updown`'s phases are timed through the page's own reads and returned as integers
— duration, share, **and row count**, because a phase that is fast BECAUSE it returned
nothing is not a fast phase and a duration alone cannot tell the two apart. Admin-gated,
returns no data. ⭐ **It convicted a fix I had already shipped**: the 46-query collapse was
630 ms of 12,688, and `feedAdviceLookup` was 11,865 ms — 93.5%. ⛔ **Do not delete it while
any admin route is near budget.** It is the difference between diagnosing and detecting.

### 🖼️ HOW TO VISUAL-TEST THE SWEEP — three routes failed, one works
Ali's standing rule is to screenshot every UI change before pushing. For an ADMIN surface that
is harder than it sounds on this machine, and the next session should not re-pay it:
- ⛔ **`next dev`** — an instance was already up on `:3009`; `/admin/updown` rendered an
  **empty body**. That is the trap `seed-admin-local.mts`'s own header records: *"the dev
  server's HMR socket never came up on this machine, so the page rendered and never
  hydrated."* Believe it the first time.
- ⛔ **`next start` + local PG** — `pg_ctl -D C:\pg-loadtest\data -o "-p 5433" start`,
  `prisma migrate deploy`, `npx tsx scripts/seed-admin-local.mts`, then
  `DATABASE_URL=… DISABLE_ADMIN_TOTP=true npx next start -p 3222`. The server serves, and the
  ADMIN row **is** in Postgres — but the sign-in form would not accept it, via the harness or
  by hand. ⚠️ **Unsolved.** Solving it is what unlocks form-level admin screenshots.
  (⛔ And `/api/dev-test/*` 404s under `next start` — it is gated on `NODE_ENV`.)
- ✅ **WHAT WORKS TODAY, and it is enough for a type sweep:** a static harness that loads the
  **real compiled stylesheet** (`.next/static/chunks/*.css`) and renders the before and after
  markup side by side, with a `getComputedStyle` assertion that REFUSES to screenshot if the
  sheet did not load. No server, no auth, no database — and it answers the only question a
  class swap raises, which is what the cascade actually does.
- ⭐ It also settles precedence questions deterministically: `.text-body-sm` sits at byte
  50,504 of the built sheet and `.leading-[1.55]` at 51,608, same specificity, so **the
  `leading-` utility wins** and a swept paragraph keeps its ratio. Read the bytes, don't guess.

### ▶ THE NEXT MOVE, in order
⭐ **Step 2 is nearly closed. DG-A-16 is ☑. DG-A-12 / DG-P-05 / DG-A-11 are 🚢 and each is
now blocked on a DECISION, not on work.** Take the two decisions first — they are written
out in the planner rows and both need a screenshot, not a sweep:

1. **THE MONEY WALL (DG-A-12 / DG-P-05).** §M4: *"Every amount … NEVER letter-spaced."*
   **Every Tailwind `fontSize` key emits letter-spacing**, so ~190 mono/numeral sites have
   NO legal rung. ⛔ `.tabular` cannot neutralise it — §M4's own words are *"tracking is for
   identifiers"* and 12 sites pair `tabular` with tracking legitimately (the TOTP inputs).
   ▶ Mint a money-safe class in `globals.css` (a `--type-*` size + `letter-spacing: 0`), or
   rule that money stays arbitrary and say so in `DESIGN_AUTHORITY`. One or the other.
2. **THE NAME COLLISION (DG-A-11 / DG-P-06).** `micro` = 10px in `tailwind.config.ts` and
   11px as `--type-micro`; `label` = 12 vs 9.5. That is why 10px is the modal size of the
   605-site micro-label census, and why there is no rung to put it on. ▶ Take the 11px
   behind screenshots · mint `--type-eyebrow: 10px` as a NEW rung (⛔ never a re-tune, §T2)
   · or bridge the Tailwind keys to `var(--type-*)`.
3. **Then the rest of step 2** — DG-P-04 rhythm (derived: the register's "seven gaps" is
   right in COUNT and wrong in MEMBERSHIP — only 3 of its 7 are authored, and the −1px
   overlap is Tailwind's own `.sr-only { margin:-1px }` counted as a section by the rig),
   DG-P-06 with DG-A-11, DG-A-10 part 2, DG-A-18's last 2.
4. **Then steps 3 and 4**, ⛔ **reading the RE-DERIVED section first** — nine claims do not
   reproduce and eight more contradict a guard.
5. ⛔ **Do not start Maswali.** Ali's order: the Design Gate runs first and to completion.

### 🔴 STILL BLOCKED ON ALI, AND IT IS THE ONLY THING A SESSION CANNOT SOLVE
**All six player/officer QA passwords are rejected by production; only the admin one works.**
The 17 PUBLIC player routes drive fine with `SURFACE=player ANON=1`. What cannot be verified
at all until one player login works: the Toggle on `/profile/responsible-gambling` (**DG-P-02**,
the last open step-1 row), **DG-P-09** (unprovable — no `auth-login` record was ever retained),
the avatar menu, `More`, the stake presets, and every notification row.

### ⭐ THE RULING ALI DELEGATED, AND WHY IT WAS NOT HIS TO MAKE
He said *"you choose, based on consistency rules and what makes the platform perfectly
professional."* `DESIGN_AUTHORITY` had already answered: §T1 closes the scale, and §T2 applied
that law to this exact shape — *"move the question onto the ladder, **never** re-tune the token to
match it."* Minting `--type-table: 12.5px` is the forbidden move; §T4 also makes 12.5 the reading
FLOOR. **So `.admin-tbl` → `--type-small` (13) and `thead` → `--type-label` (9.5).** DG-A-12's
framing as "Ali's call, one of two" was itself the error — one option contradicted a written law.
**That is now four register items that asked to reverse a dated decision** (DG-A-05, DG-A-07,
DG-A-23 in step 1; DG-A-12's framing here).

### 🔴 THE THEME OF THIS SESSION: INSTRUMENTS THAT REPORTED ON NOTHING
Four, and every one printed a plausible result:
- **The measurement rig wrote the sign-in page as data.** A 44-route drive returned HTTP 200
  everywhere and looked fine; `redo.cjs` then deleted **30 of 44 records**. `/admin/transactions`
  had been recorded with `tbl=0` — a table page with no table. ⛔ **`rec.finalUrl` was already
  captured and nothing read it until after the fact.** `measure.mjs` now detects, re-signs-in,
  retries, prints the count and exits 3 on an unrecoverable record. The re-run: **44 routes,
  1 sign-in, 0 revocations, 42 OK.**
- **`test:orphans` could not see its own programme's instruments.** It scanned the top level of
  `scripts/` only while claiming to cover the tree; 113 files lived below it, **47 unrun and
  undeclared**, including all of `scripts/design-gate/`. Now recursive; the rig is `qa:dg-*`.
- **`ui-consistency`'s `hardcoded-pill-active` rule matches the token's literal text**, so it
  finds copies and never divergence — which is why it missed a sidebar fill that had drifted to
  a different hue AND alpha from `--pill-active`.
- ⚪ **SPENT — `type-scale.test.mts` advised a fix below its own floor.** FIXED 2026-08-29;
  the blind spot was **263 sites, not 100**, and the trap is now measured in both directions.
  See *"THE GUARD THAT REWARDED THE WRONG FIX"* in RE-DERIVED. **DG-A-14 is no longer blocked.**

### ⚠️ AND A THIRD DIAGNOSIS WAS WRONG — MINE, THIS SESSION, AND IT SHIPPED
`/admin/updown` was 11,045 ms. I read the code, found `Promise.all(chains.map(...))` with two
awaits inside, counted 23 chains × 2 = **46 concurrent queries**, wrote that down as the cause,
fixed it, and shipped it. **The page moved to 11,448 ms** — the collapse was worth **630 ms of
12,688, i.e. 5%.** The bulk read is still the right shape and it stays; it was simply never the
answer, and re-reading the code a fourth time would never have said so.
⭐ **What did:** `GET /api/admin/updown-timing`, which times the page's own reads and reports
each one's share. `feedAdviceLookup` **11,865 ms, 93.5%**. One request, no ambiguity.
⛔ **So the rule now has a positive form, not only a prohibition.** "Detect, don't diagnose" is
not "be more careful reading" — it is *build the instrument*. Three of this programme's four
wrong causes were confident, literate readings of correct code.

### ⚠️ AND TWO DIAGNOSES I WROTE DOWN WERE WRONG
The admin session dies mid-drive **non-deterministically**. I first blamed per-cell browser
contexts (the next run disproved it), then `/admin/live` (the run after loaded it four times and
lost nothing). ⛔ **Each was a correlation from one run recorded as a cause.** Do not diagnose it
a third time — **detect it**: every admin drive now re-signs-in on `/auth/` and prints the count.
Every revoked page returns HTTP 200 and renders; only the `/auth/` check tells the truth.

### ✅ §4 SOUND control, re-proven this session
**42 of 44 admin routes: zero horizontal overflow at 390/1440/1920, zero console errors**, on a
rig that can no longer photograph the sign-in page. The 2 unmeasurable were `/admin/reports` and
`/admin/insights` — which is the DG-A-01 finding, not a gap in the control.

### 🖥️ A PARALLEL SESSION IS LIVE ON THIS MACHINE
`C:\kipindi-lane-sentinel` on `lane/sentinel-source-pin`. ⛔ Never `git checkout` in another
tree; `git fetch` before every push. It filed `E-249..E-253` this session.

### 🔴 STILL BLOCKED, AND ONLY BY ALI
**All six player/officer QA secrets are rejected by production**; only `QA_ADMIN_PASSWORD` works.
That blocks DG-P-02's re-measure and makes **DG-P-09 unreprovable** — no `auth-login` record was
retained, and the register's `auth-flash.tsx` hypothesis is refuted (227 client files scanned,
zero conditional hooks). ⭐ Use `SURFACE=player ANON=1` for the 17 public routes meanwhile.

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

> 🧹 **A SECOND “THE NEXT MOVE” LIST STOOD HERE, AND IT IS DELETED (session 78).** It restated step 1's closure and the type-ladder ruling that the two blocks above already carry — two homes for one fact, and §0a says the stale one is the one that gets read. It had already started to drift: it pointed the ruling at `globals.css:3804/3805`, and the shipped declarations are at **3828–3829**. The one line in it that lived nowhere else is kept:
> ⛔ **Do not start Maswali.** Ali's order: the Design Gate runs first and to completion.

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
- 🔴 **THE ADMIN SESSION DIES MID-DRIVE, NON-DETERMINISTICALLY, AND TWO DIAGNOSES OF IT HAVE
  ALREADY BEEN WRONG (session 77, 2026-08-29).** Three runs of the same 15-cell sweep:
  ① a fresh browser context per cell → 7 cells, then the **sign-in page at HTTP 200** for 8;
  ② ONE context for the whole drive → 3 cells, then the sign-in page for 12;
  ③ one context, `/admin/live` last, re-login recovery armed → **15 of 15, recovery never fired.**
  ⛔ Diagnosis 1 was "per-cell contexts stop being accepted" — run ② disproved it. Diagnosis 2 was
  "`/admin/live` revokes it" (it was the last good cell in ① and ②, and is the only route holding
  an SSE stream) — run ③ loaded it four times and lost nothing. **Each was a correlation from a
  single run, written into a file as a cause.** ⭐ **So do not try to avoid it — DETECT it.** Any
  admin sweep should re-sign-in on seeing `/auth/`, retry that one cell, and PRINT the count;
  `qa:chart-axis` does exactly this. ⚠️ A drive that silently re-authenticates is hiding a platform
  finding as housekeeping. ⛔ And note the shape: every revoked page returns HTTP 200 and renders.
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

---

## 🔬 RE-DERIVED 2026-08-29 (session 77) — steps 3 and 4, before a line was written

⭐ **Read this before starting any step-3 or step-4 row.** Every claim below was checked against
the working tree, not taken from a register. It is filed here because the alternative is the next
session paying for it again — step 1 already lost three rows to defects that no longer existed.

### ⛔ Register claims that DO NOT REPRODUCE — do not "fix" these
| Row | The claim | What is actually there |
|---|---|---|
| **DG-A-01** | *"its settlement-fee/report-pack reads render 12,882 rows' aggregates"* | **Wrong cause.** The report pack is a single period read and `getAuditPage` is an in-memory ring-buffer slice. The real defect is a **textbook N+1 at `src/lib/server/report-money.ts:392-396`** — `for (const m of markets) { for (const p of await listPositionsForMarket(m.id)) … }`, i.e. **~13,000 sequential Prisma round-trips** at ~6–7 ms ≈ the 88 s. ⭐ **`/admin/insights` calls the same `categoryBreakdown()`, so ONE fix closes both routes.** The primitive already exists with a written ruling behind it: `positionStore.listForMarkets(ids)` (`market-dal.ts:762-768`, one `findMany` on `@@index([marketId,status])`), and `moneyByGame` in the same file already does the bulk-join shape. ⚠️ `loading.tsx` already exists and is well-shaped — Suspense alone would move the number without removing the queries |
| **DG-P-09** | root cause is `auth-flash.tsx` | **Refuted by reading it:** five hooks, all top-level, unconditional, fixed order, `return null`. No branch can change its hook count. A scan of **all 227 "use client" files** for hooks after an early return or inside an `if` found **zero**. ⛔ **And the finding is UNREPROVABLE:** `.qa-design-gate/` holds no `auth-login.json`, zero occurrences of `Minified React error`, and zero non-empty `errors` arrays — while the register's own proof line needs an authed player, which no working password exists for. **Getting a player credential is a hard prerequisite, not part of the fix** |
| **DG-P-14 item 5** | `/notifications` is *"the only rail whose selected state also casts `--glow-selected`"* — filed as **an Ali taste call** | **It is not page-local at all.** `/notifications` uses the shared `FilterPill`, and the glow comes from the ONE kit rule `.kp-fchip[data-on]` (`globals.css:2908-2911`) whose own comment reads *"one definition site, for every filter rail in the product."* Every selected pill on the platform glows. ⭐ **Nothing to promote, nothing to drop, and no ruling needed from Ali — strike the item** |
| **DG-P-03** | *"`/updown`'s h1 drops to 24px at 390"* | `/updown` renders `PageHeader`, a flat `text-[28px]` with **no responsive step** anywhere in the component or in globals.css. Nothing in code can produce 24 at 390. ✅ The **double-h1 reproduces exactly**: `src/app/proposals/page.tsx:90` sr-only h1 + `PageHeader`'s own h1 at `page-header.tsx:45` |
| **DG-P-10** | three hand-typing surfaces incl. `results/page.tsx` | `results/page.tsx` **already imports the kit `Chip`** and hand-types nothing. Two of three reproduce — and the register **misses two it never named**: `components/home/trust-band.tsx:154` (the landing) and `updown/[roundId]/page.tsx:197,619` |
| **DG-P-07** | *"16 back-link instances"* | **4.** And a kit primitive nobody adopted already exists — `src/components/ui/back-link.tsx`. The honest fix is adopt-plus-`min-h`, one file and four call sites. ⚠️ `/profile/account`'s "Change" button at 30px **could not be located** — no `Change` string, no `btn-xs` in that file |
| **DG-A-09** | *"hover duplicated inside tables, 80 cells on /admin/markets"* | **Zero `hover:bg-` inside any `<td>` in the whole admin tree.** What the drive counted was `hover:text-*` on LINKS in cells — a link underline, which is the canon. Only **2 files** genuinely duplicate the row hover (`ai-polls/page.tsx:356`, `candidates/page.tsx:298`) |
| **DG-A-13** | a literal `&times;` escape renders on `/admin/ai-usage` | **Zero hits** anywhere under `src/app/admin`. Already fixed |
| **DG-A-21** | *"ai-polls detail paints its quality meter in `--yes-*`"* | **Already fixed 2026-08-21**, with an in-file tombstone at `poll-actions.tsx:817-825` recording this exact defect and the owner ruling. The register re-files a closed finding |

### ✅ THE GUARD THAT REWARDED THE WRONG FIX — FIXED 2026-08-29 (session 78), and the numbers
⚪ **SPENT as a task, kept as the reasoning.** Session 77 filed this correctly and its
diagnosis held. What it could not know is the size: **the blind spot was 263 sites, not 100.**

`type-scale.test.mts` §3 enforces the 12.5px floor and scanned **only `text-[Npx]`**. Three of
`tailwind.config.ts`'s twelve `fontSize` keys render below that floor — `micro` 10, `caption` 11,
`label` 12 — so a site written as a CLASS was invisible to it, while §3's own advice line said
*"lift it onto the ladder (text-label/text-caption)"*, naming two of those three.

🔴 **THE TRAP, MEASURED BOTH WAYS.** Renaming one real `text-[11px]` to `text-caption`:
| | §3 sub-floor | §4 arbitraries |
|---|---|---|
| before the fix | 768 → **767** | 1809 → 1808 |
| after the fix | 1031 → **1031** | 1809 → 1808 |

Two wins for zero legibility, versus only the true one. **509 of the old 768 were reachable by
that edit** — 66% of the flagship type guard, zeroable without moving one glyph.

✅ **Now:** §3's population is `text-[Npx]` ∪ {`text-micro`, `text-caption`, `text-label`},
counted into ONE total (two counters would let a session trade one for the other and call it
progress). `RATCHET_SUBFLOOR` **768 → 1031** — ⛔ the POPULATION grew, not the defect; nothing was
written. The advice now names **`text-body-sm` (13px)** and says in words that 12 and 11 are
below the floor and do not count as a fix. `0f` proves the new scanner sees prose, exempts the
same class when it IS a blessed microlabel, reads `cn()`/variants, and ⛔ does **not** count
`text-body-sm` — the very fix it prescribes. `0g` asserts the three sizes against
`tailwind.config.ts`, so changing `caption` to 13px there cannot leave §3 condemning 174 sites
that had become legal.

### 📏 DG-A-12 — THE SWEEP, RE-DERIVED. Its guard half is done; this is the rest
Counts reproduced by re-implementing §3/§4's own scanner and matching their totals exactly
(**1,809 arbitraries / 803 files / 768 old sub-floor**). ⛔ The register's headline
(*"12.5px ×1,376 · 10.5 ×700 · 11.5 ×579"*) is a **rendered-element** census from
`analyze admin type`, not a code census — 1,376 table cells reading ONE declaration. Do not
quote it as an edit count.

**TWO LADDERS EXIST AND THEY DISAGREE.** `globals.css:206-220` defines twelve `--type-*`
(72/60/44/32/24/20/17/15/13/11/9.5/8.5); `tailwind.config.ts:190-202` defines twelve `fontSize`
keys (10/11/12/13/14/16/18/22/28/36/48/64). They agree on **two values** and **collide on
names**: `label` = 9.5 (CSS) vs 12 (Tailwind); `micro` = 11 vs 10; `body` = 15 vs 14.
🔴 **And the `--type-*` ladder is UNREACHABLE FROM TSX** — all 35 `var(--type-*)` consumers
are inside `globals.css` itself, and there are zero `text-[var(--type-…)]` sites. So "move it
onto the ladder" from a call site can only mean the **Tailwind** ladder today. §T's preamble
closes the CSS one and never names `tailwind.config.ts`. **That is the open question this row
inherits, and it is bigger than the sweep.**

**OFF-LADDER: 519 sites in 150 files** (in NEITHER scale). By value:
`10.5 ×148` · `12.5 ×139` · `11.5 ×112` · `9 ×51` · `13.5 ×30` · `19 ×13` · `26 ×6` ·
`15.5 ×5` · `30 ×4` · `14.5 ×3` · `38 ×3` · `8 ×2` · `34 ×2` · `21 ×1`.
The three the row names (10.5 / 11.5 / 13.5) are **290 sites in 109 files**.

| value | destination, BY ROLE | why |
|---|---|---|
| **10.5** (96 admin) | NUMERIC 89 → `text-micro` (10) · LABEL 34 → `text-micro` · PROSE 26 → `text-body-sm` (13) | rounding metadata UP to 11 makes it bigger than the 380 `text-[10px]` spans beside it |
| **11.5** (63 admin) | PROSE 69 → `text-body-sm` · NUMERIC 39 → `text-caption` (11) · LABEL 4 → `text-caption` | ⛔ **the hardest value.** Rounding prose to 12 or 11 is the trap above |
| **12.5** (98 player) | ALL → `text-body-sm` (+0.5) | the SAME +0.5 already ruled for `.admin-tbl`; ⛔ never `text-label`, which moves prose from legal-at-the-floor to illegal |
| **13.5** (28 player) | PROSE 22 → `text-body` (14) · rest → `text-body-sm` | ⚠️ **above the floor, so no law decides it.** Both 13 and 14 are rungs — this one is a DESIGN CALL and must be labelled as one |
| **9** (44 LABEL) | ⛔ **NO HONEST RUNG.** `--type-label` 9.5 is exactly this tier and **has no Tailwind key** | either → `text-micro` (10), or mint a `nano` key — which §T's own wording makes a DESIGN_AUTHORITY change, not a call-site edit |
| **26** (6) | ⛔ **DO NOT SWEEP.** One is the market question, which §T2 files against itself by name | needs its own decision with a screenshot |

⛔ **DO NOT lead with the 836 pure renames** (10/11/12 → micro/caption/label). Font-size is
unchanged; **line-height and letter-spacing are NOT** — every Tailwind `fontSize` key is a tuple
that also emits both, and an arbitrary `text-[Npx]` sets size alone. And ⚠️ **§M4**: those keys
emit `letter-spacing`, which §M4 forbids over a numeral — so converting the **228 mono/tabular**
off-ladder sites would letter-space money.

⭐ **Cleanest first commit:** `admin/updown/updown-controls.tsx` — all ten of its 11.5px sites
are PROSE with one destination, it is admin-only, and it is not on `design-frozen`'s list.
**Biggest files:** `wallet/wallet-client.tsx` 24 · `updown-card.tsx` 21 ·
`admin-proposals-client.tsx` 18 · `updown/[roundId]/page.tsx` 17 · `admin/updown/page.tsx` 15.
Ten files carry **155 of the 519**.

⚠️ **Three populations no guard reads at all**, and they hold the same values:
**75 literal `font-size: Npx` in `src/**/*.css`** (45 below the floor — `type-scale` walks only
`.ts/.tsx/.mts`), of which `src/styles/chat/chat-styles.css` is a **third styling system** with
28 hand-typed sizes on neither ladder; and the **37 inline `style={{fontSize}}`** literals.
⚠️ `test:type-scale` is in `test:all` (CI runs it, auto-populated) but **NOT in `predeploy`**,
whose suite list is hand-picked.

### ⚠️ Ordering constraints that are not in the work order
- **DG-P-08's clipped support email and `E-226` are THE SAME LINE** —
  `src/app/auth/forgot-password/page.tsx:125`, `truncate` on `SUPPORT_EMAIL()`. E-226 is that
  `support-config.ts` has a writer and **no reader** (`SUPPORT_CONFIG_KEY` appears in exactly two
  files; the header's claim that boot-checks hydrates it is **false in today's code**). ⛔ Fixing
  the `truncate` first makes a **wrong** contact fully legible. E-226 lands first, or together.
- **DG-A-20 (skeletons) and DG-A-22 (layout balance) sit behind step 2**, not beside it — card
  rungs (DG-A-16) change the padding those grids and skeletons are measured against.

### ⭐ Reuse, not new code — the inventory
`FilterPill` (`ui/filter-pill.tsx`, `rank="dense"`=32px, ⚠️ requires `href` / renders `Link`) ·
`status-tone.ts` (`TONE_CHIP`/`STATUS_TONE`; **only 2 files in the tree consume it**, and the
player side reads it **zero** times) · `admin-status-lexicon.ts` (14 word families, 25 importers) ·
`status-badge.tsx` (`txnProviderLabel` + 13 sibling label fns) · `category-label.ts` +
`poll-vocabulary.ts` (⚠️ `CAT_LABEL` is **page-local** in `reports/page.tsx:27` — promote it, or
point call sites at these two shared ones instead) · `page-header.tsx` (28 call sites, the h1 to
converge on) · `back-link.tsx` (unadopted) · `admin-skeletons.tsx`.
⛔ **There is no `AdminFilterRow` and no plural helper** — those two would be NEW primitives, so
mint them deliberately or not at all.

### ⛔ EIGHT more register-vs-guard contradictions (step 1 found three; these are the rest)
1. **DG-A-14 vs `type-scale.test.mts:542`** — the guard's own advice is below the floor (above).
2. **DG-A-08 vs DG-A-02 / DA §A2** — `btn-xs` (32px) row actions contradict the 40px tap floor
   that DG-A-02 argues is inviolable *for money controls*, on the same rows.
3. **DG-A-08 vs `bare-text-button`** — that rule's written reasoning (*"an icon is paint … flagging
   it would push authors toward a `btn` on a control the design deliberately keeps quiet"*) is the
   inverse of DG-A-08's "never bare uppercase text".
4. **DG-A-09 vs `globals.css:3814`** — the canon itself paints a per-CELL hover
   (`tr:hover td:first-child` inset bar) on all 44 tables. State the rule as *"no per-cell hover
   authored at the call site"*, or it condemns the kit.
5. **DG-A-21 vs `status-tone.ts:93-96`** — `TONE_CHIP` is a 9-tone narrowing over 7 status WORDS;
   it has no entry for `cat`/`info`/`brand`/feature names/audit categories, and ~106 of the 113
   admin `<Chip>` call sites are outside it. Enforcing the guard as written means minting new law
   first. ⛔ And `STATUS_TONE_EXCEPTIONS` records three divergences that are **decisions** — a
   naive sweep would "harmonise" them, which that file forbids by name.
6. **DG-A-06 vs `filter-language.test.mts` §0.4** — converting any admin rail without adding it to
   the hard-coded 2-entry `ADMIN_SURFACES` turns a **111-assertion green suite red for doing the
   right thing.** The file's own comment documents exactly this failure.
7. **DG-A-06 vs `datetime-range-filter.tsx`** — it is a shared `components/ui` primitive that
   exports `PLAYER_PRESETS`. Hard-coding the 32px dense rank into it bakes the admin fork into a
   player-facing component, against §6.6's stated player-44 / admin-32 split. **Take the rank as a
   prop.** ⭐ It is also the biggest single win in DG-A-06: **one component, 7 admin call sites.**
8. **Any sweep vs the `ui-consistency` BASELINE MODEL** — it fails on a NEW `(rule,file)` pair even
   at warning severity. A sweep touching a previously-clean file must use the kit `<Button>` /
   `<FilterPill>`, never `className="btn …"` or a numeric `h-7`/`h-8`.

### 🔎 And the guard blind spot behind DG-A-06
`filter-language.test.mts:207` holds an `OLD_IDIOM` regex that matches only the **rounded-md**
idiom. **Every surviving DG-A-06 capsule is `rounded-pill`**, so the stray sweep runs over the
whole tree and sees none of them. The work item *"widen the guard to `/admin/**`"* is already done
(S-07, 2026-08-28); the real work is **widening that regex**.

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
| **DG-A-15** | 1 | P1 | charts: squashed axes and unreadable legends | `src/components/admin/admin-charts.tsx` | ☑ | `fdba7cad` · `f5fa98d3` | 🔴 **RE-DERIVED BY THE NEW GATE `npm run qa:chart-axis`, 2026-08-29 on production: RED, 106 failures over 31+11+11 labels.** `/admin/finance` **62 failures at EVERY width — 1920, 1440 AND 390**, `/admin` 22, `/admin/live` 22. Worst reading `/admin@390`: scaleX **0.257** — a label condensed to **26%** of its own width, rendering **2.82px wide × 11px tall**. ⛔ **The register's "and vertically by height/240" is WRONG — scaleY is EXACTLY 1.0 everywhere**, so a HEIGHT floor would have passed this defect forever; the gate asserts the RATIO of the axes. ⭐ **FIX: the glyphs left the SVG.** Axis labels and the legend are an HTML layer in REAL PIXELS (`AXIS_GUTTER` 46 left, `AXIS_BASE` 16 below); the SVG keeps `preserveAspectRatio="none"` because the data path is SUPPOSED to stretch. Vertical = user units used as px (scaleY is 1 BY CONSTRUCTION), horizontal = % of the plot column. No JS measurement, no ResizeObserver. ⚠️ **TWO FURTHER DEFECTS THE LOCAL PRE-FLIGHT CAUGHT BEFORE PRODUCTION DID:** ① the HTML legend's min-content width (~450px for five providers) propagated through a `min-width:auto` grid item and pushed the whole `/admin/finance` card **past a 390 viewport** — it wraps now, and both roots carry `min-w-0`; ② at 390 the edge-anchored first/last x-labels overlapped their neighbours by **12.5px at both ends** and the stacked chart's first label sat **2.1px outside its own card**. Fixed by one shared rule (`xAxisCols`): edges anchored, and below `sm` only first/middle/last survive. ✅ Local pre-flight after both: **122 labels, 0 failing at 1920 / 1440 / 390.** `test:admin-charts` **68/68** (was 62) with two new CI-level assertions that NO `<text>` returns to either chart. ✅ **PRODUCTION, `fdba7cad` serving: `qa:chart-axis` = 169 labels across 18 chart renders, ALL isotropic, ≥10px in both dimensions, un-collided, in-box** — the 106 failures are 0. ✅ **GATE GREEN, `qa:chart-axis` exit 0** on the deploy after the reclassification: 169 labels / 18 chart renders / 3 notes. ⚠️ Those 3 notes are `/admin/ai-usage`, and they are the guard being right for the wrong reason: that page renders its chart **only with the Anthropic Cost API key set** (*"draw the truth or nothing"*), so it carries no chart at all. Reclassified as a NOTE, and the empty state now carries `data-chart="empty"` so a drive can tell EMPTY from VANISHED — ⛔ the route stays in the population rather than being deleted from it |
| **DG-A-17** | 1 | P2 | sortable headers are 64px in 37px header rows; the sort colour is dead CSS | `admin-sort.tsx · globals.css `.admin-tbl th[aria-sort]`` | ☑ | `0d749dba` — ✅ **re-measured on production 2026-08-29: sortable header cells 64.5 → 44.5**, and on /admin/audit + /admin/aml the whole header row is now one height. | ⏳ Re-derived 2026-08-29: **64.5px confirmed** (audit/aml/ai-usage) and the dead tint confirmed (th computes brand-300, the anchor inside computes `--text`). ⚠️ **Two register claims are WRONG:** on audit + aml the PLAIN headers are also 64.5 (same row, they stretch) — the 35.5 mismatch is only on ai-usage's sibling tables; and **`/admin/candidates` has ZERO sortable headers**. ⛔ Fixed by removing the th's redundant vertical padding, NOT by dropping `min-h-[44px]` — that is the tap target |
| **DG-A-23** | 1 | P1 | tables clip with no affordance — ⚠️ **at 1440 too**, not only 390 | `scroll-x.tsx · globals.css `.scrollx`` | ☑ | `8c72f591` | ✅ **2026-08-29 production, `/admin/audit`**: `.scrollx` present, `scrollbar-color` = `--border-control`, `scrollbar-width: thin`, on a wrapper measuring **1282 > 1158 — i.e. the affordance is painted on the exact table that was cut mid-token.** ⛔ The register's fix was half a NO-OP (Blink already painted a thumb; it was under the contrast floor at 2.23, not missing) and half a HAZARD (a mask clips absolutely-positioned panels = DG-A-03's defect). Guarded by `test:contrast` at 3.18 |
| **DG-A-11** | 2 | P1 | 70+ uppercase micro-label recipes — the “fonts everywhere” feeling, quantified | `field-legend.tsx` + globals.css | 🚢 **11 adopted; the ROW'S REAL DECISION is filed, not taken** | `34924896` | 🔴 **RE-DERIVED: 605 recipe-bearing sites in 204 files, 189 distinct recipes — 100 admin / 115 PLAYER.** The register's “70+” is a rendered-DOM count, and the player side has MORE distinct recipes than admin. ⛔ **So do NOT name the classes `admin-*` as DG-A-11 and DG-P-06 both prescribe** — that strands 236 player sites and guarantees a `player-*` twin within a session. Name for the ROLE. ✅ **Shipped, zero visual change:** `FieldLegend` is retyped by hand at **44 sites**, including two KIT files (`ui/input.tsx`, `ui/search-help.tsx` — the kit copying itself). 11 adopted (every single-line case); §4 −1450→1439, §6 631→620. The other 33 are multi-line bodies and need a per-site pass. 🔴 **THE DECISION THIS ROW ACTUALLY TURNS ON IS A NAME COLLISION:** `micro` = **10px** in `tailwind.config.ts` but **11px** as `--type-micro`; `label` = **12px** vs **9.5px** as `--type-label`. That is WHY 10px is the modal size of the whole census — somebody reached for the ladder's name and got a different number. There is no `--type-*` rung at 10 at all, so “put the eyebrow on the ladder” costs **+1px on 254 labels**. Three honest exits: take the 11 behind screenshots · mint `--type-eyebrow: 10px` as a NEW rung (⛔ never a re-tune, §T2) · bridge the Tailwind keys to `var(--type-*)`. ✅ **THE DECISION IS TAKEN — `31e8f3ba`, `DESIGN_AUTHORITY` §T7, with the screenshot (`qa:dg-type`).** ⭐ **The question was asked of the wrong ladder: `text-micro` IS 10px**, it is the rung the only TSX-reachable ladder offers, it already holds **101 sites**, and 10px is the mode of the census (**341 of 557, 61%**). **The eyebrow takes `text-micro`. Nothing moves**, and the +1px — measured at **+9.63px of width on "TOTAL SETTLED"**, ~10% — is not paid. ⛔ **The other two exits are refused with reasons:** minting a 10px rung puts 11/10/9.5/8.5 inside 2.5px, the objection `.admin-tbl`'s own ruling already sustained; bridging/renaming turns `test:type-scale` red **and silently shrinks its own metric** (two hard-coded key lists, incl. the `KEYS` regex at `:696`) — this programme's signature failure. 🔴 **And it is FIVE collisions, not three** — `display-1` 60/64 and `display-2` 44/48 were missed, and the ladders agree on **none** of their values. §T7 freezes the five; `test:type-scale` §7 pins the set **and its values**, proven RED both ways. ⚠️ **The census headline does not reproduce either: 557 sites / 193 files, not 605/204.** ▶ **What remains: the 33 multi-line `FieldLegend` bodies, and DG-P-06's player half.** |
| **DG-A-12** | 2 | P1 | type ladder not in force: 24 sizes; console body size on no rung | `globals.css:3828` + 119 call-site files | 🚢 **table half ☑ · PROSE sweep ☑ · money + above-floor OPEN** | `78586808` · `adacbacd` · `445c391e` · `9be57312` · `0869e5c0` | ✅ **THE GUARD WAS FIXED FIRST, ON PURPOSE.** §3 scanned only `text-[Npx]`, so **263 sub-floor sites written as `text-micro`/`text-caption`/`text-label` were invisible** — and its own advice line told you to convert INTO that blind spot. Renaming `text-[11px]`→`text-caption` changes no pixel and used to drop TWO ratchets; **509 of the old 768 were zeroable that way.** Re-baselined 768→1031, advice corrected to `text-body-sm`, `0f`/`0g` prove both halves can fail. 📐 **THEN THE SWEEP MEANT SOMETHING: §3 1031 → 763 · §4 1809 → 1439 · adoption 19.8% → 35.7%.** 334 prose sites over 118 files (143 admin, 191 player) + 25 in `updown-controls.tsx`. ✅ **Verified on production:** admin drive 44 routes / 1 sign-in / 0 revocations and player anon drive 17 routes / 0 sign-ins — **overflow390 + overflow1920 = 0 on both, against baselines of 0, with 0 console errors.** ⛔ **WHAT IS DELIBERATELY NOT SWEPT, and neither is a leftover:** (1) **above the floor** — 13.5, 15, 17, 19, 26, 34, 38 are legible already, so moving them is a per-site design call, not a law; (2) **~190 MONEY/mono sites** — §M4 says *“Every amount … NEVER letter-spaced”* and **every Tailwind rung emits letter-spacing**, so there is no legal rung for an amount. ⚠️ `.tabular` cannot neutralise it — §M4's own words are *“tracking is for identifiers”* and 12 sites pair `tabular` with tracking legitimately (the TOTP inputs). **That needs a money-safe class, i.e. new law.** ✅ **THE LAW IS NOW WRITTEN AND THE CLASS SHIPPED — `31e8f3ba`.** `.amount` (globals.css, beside `.mono`) carries §M4's three properties, **replaces** `font-mono tabular` so a call site gets shorter, and restores the untracked width **byte for byte** (85.81px on `TZS 679,532`). Doubled selector `(0,2,0)` because Tailwind's responsive variants are emitted at byte **219,312** — after everything globals.css writes at ~131,800 — so a single-class rule loses to `sm:text-…` at ≥640px; `qa:dg-type` asserts that failure as a CONTROL. 🔴 **The bigger find: `type-scale` §2 was blind to the entire wall** — it matched `/^tracking-/`, a SPELLING, so a money element written `text-micro` was tracked OUT by **+0.4px/glyph (+6.67%)** and §2 printed PASS. Widened: **10 sites it could never have seen**, 5 fixed by adopting `.amount` (incl. the live Selcom float), 5 recorded. ⛔ **THE POPULATION GREW, NOT THE DEFECT.** ⚠️ **The register's "~190 money/mono sites" is the FILE count** — of ~900 sites with a mono signal and an arbitrary size, ~450 are §T3 eyebrows §M4 never governed and the AMOUNTS are tens. ▶ **What remains under this row: the per-site sweep of those amounts onto `.amount` + a rung, and the above-floor design calls.** |
| **DG-A-16** | 2 | P2 | card/panel system: three paddings, two dead classes and an inversion | `globals.css` · `admin-shell.tsx` · `admin-skeletons.tsx` | ☑ | `390fda06` | ✅ **§S2 RESOLVES CLEANLY — honouring it contradicts NO written law.** Stat tiles take `--r-md` (12); `AdminKpi`'s ~170 tiles were at `--r-lg` (16) because they compose `glass-panel`. ⛔ **And the comment defending that mis-cited §M2**, which never mentions radius — its own words, twice in the same file, are *“Rung = wash + edge + ring + cast”*. Comment corrected, nothing amended. 🔴 **19 RADIUS TOKENS WERE DEAD**: `glass-panel` sets radius after `@tailwind utilities`, so at equal (0,1,0) it wins on source order (measured: `.rounded-lg` ≈ byte 2569, its radius ≈ 7539). `AdminKpi`'s own `rounded-lg` was reaching for exactly 12 — the intent was in the code and never reached the screen. ⛔ **NOT fixed by moving the radius into `:where()`** — that revives 21 tokens and shrinks 21 surfaces 16→12 in one commit, a restyle arriving as a tidy-up. ⭐ Also: `p-3.5` (14px, an off-scale rem) → `p-2` (12) — the S-09 inversion where `p-3.5` paints LESS than `p-3`; the five `padding="p-3"` cards → the `p-4` rung (`p-0` stays, a real rung for flush tables); **the KPI SKELETON still had the pre-commit shape**, which is DG-A-20's complaint verbatim, so it moved with the tile; and `.pnl-*` + `.trust*` **DELETED** (10 rules, 0 call sites, both `dead-css`'s *“second definition of a live thing”*). Guards lowered in the same commit: `dead-css` 66→60, `spacing-scale` 632→629. |
| **DG-A-18** | 2 | P2 | shell details, once, for all 44 pages | `admin-sidebar-nav.tsx · admin-mobile-nav.tsx · admin-shell.tsx` | 🚢 **3 SHIPPED on DESKTOP ONLY · 🔴 BOTH "REFUTATIONS" ARE WRONG (2026-08-29)** | `b5f92656`→`e84a8a5c` | 🔴 **DO NOT TICK.** ① *"`qa:landmark-seal` already asserts one `<main>` per page"* — `scripts/landmark-seal.mjs` contains **ZERO `/admin`**; its lists are `/wallet /profile /positions …` and it signs in as a PLAYER. A player guard cited as admin proof — the signature failure, again. The gate that DOES cover admin landmarks is `scripts/responsive-audit.mjs`. ② The `<main>` at `admin/layout.tsx:224` is real for 38 routes and **absent for 2**: `TOTP_EXEMPT` returns `<>{children}</>` at `:97-99`, and `/admin/2fa/setup` is the **forced-enrolment** page every new admin passes through — no `<main>`, no skip link. ⛔ `ADMIN_ROUTES` excludes both, so no drive can see them. ③ *"four trackings is three"* — count right, **value set wrong** (0.10/0.12/0.14em). ④ 🔴 **THE FIX LANDED ON THE DESKTOP SIDEBAR ONLY**: `admin-mobile-nav.tsx:124` is still `px-2.5 py-2` = **42px** while the sidebar's own comment claims "every row of every admin page", and `:126` still says the active state as `bg-bg-inset text-royal-300` — a second home for `--pill-active`, one file from the fix that named it | 🔴 **The sidebar's active fill had DIVERGED from its own token** — inline `oklch(40% 0.12 268 / 0.5)` against `--pill-active`'s `oklch(40% 0.12 262 / 0.35)`: a different HUE *and* alpha for one semantic. ⛔ `ui-consistency`'s `hardcoded-pill-active` rule could not see it — that rule matches the token's LITERAL TEXT, so it finds copies and never divergence. ✅ fill → `var(--pill-active)` · row height `py-2`=**42** (off both rungs, every row of every page) → `min-h-[var(--h-control-sm)]` 40 · badge → kit `<CountBadge>` on desktop **and** mobile, which `count-badge.tsx`'s own header names as two of the four implementations it was written to consolidate and never reached — they had a 4px corner and **no count cap**, while `approvals` = kyc+aml+sof can pass 99 · brand link `50pick · admin` gains a hover (the probe's only universal miss). ⭐ `test:design-frozen`'s ratchet SHRANK 2→0 for that file — the gate itself demanded it. 🧹 **A "TWO CLAIMS REFUTED, no code" line stood here and is DELETED (2026-08-29, §0a).** Both of its refutations are wrong and the status cell now carries the re-derivation; leaving the old one beside it is two homes for one fact, and the stale one is the one that gets read |
| **DG-P-04** | 2 | P1 | vertical rhythm: seven section gaps across sibling pages, plus a −1px overlap | `section-rhythm` | ☐ **re-derived 2026-08-29** | — | ⚠️ **FIVE gaps on the measurable surface, not seven.** Fresh anon drive, 17 routes, 0 sign-ins, 0 revocations, **zero overflow at 390, zero console errors**: `24px ×22 · 32 ×9 · 16 ×4 · 20 ×2 · 29.3 ×1`. All four real values sit on `--sp-*`; the **29.3 is a measurement artefact** of an `inline-flex` eyebrow, not an authored gap. ⛔ **The register's seven can be neither confirmed nor refuted — 19 of the 36 player routes are authed and blind.** ⚠️ **And the rig's "section" is any two adjacent children of `<main>`**, which is NOT the rhythm's "section" (`--rh-tight/close/section/chapter`, `globals.css:227`), so the histogram cannot be read as a violation list without that distinction — doing so would condemn legitimate within-group spacing. ✅ The −1px **does** reproduce: Tailwind's `.sr-only{margin:-1px}` on `/profile/invite` `page.tsx:142`, proven with a control |
| **DG-P-05** | 2 | P1 | 33 font sizes — ⚠️ SAME ruling as DG-A-12; they share the tokens | `type ladder` | 🚢 **prose half ☑ with DG-A-12** | `0869e5c0` | ✅ **191 player prose sites over 72 files swept in the same pass**, verified by the anon drive: 17 routes, 0 overflowing, 0 console errors. ✅ **BOTH BLOCKERS ARE NOW RULED (`31e8f3ba`)** — the money wall by `.amount` + `DESIGN_AUTHORITY` §M4, the ladder question by §T7. This row still closes when DG-A-12 does; what is left under both is the per-site sweep, not a decision. |
| **DG-P-06** | 2 | P1 | ~90 uppercase micro-label recipes | `label classes` | ☐ **UNBLOCKED — the ruling it waited for is made** | — | ✅ `DESIGN_AUTHORITY` §T7 (`31e8f3ba`) settles the rung: **the eyebrow takes `text-micro` (10px)** and nothing moves. ⚠️ The census is **557 sites / 193 files**, not 605/204 — and **115 of the distinct recipes are PLAYER against 100 admin**, so ⛔ do NOT name the classes `admin-*` as this row and DG-A-11 both prescribe: that strands the larger half and guarantees a `player-*` twin. Name for the ROLE |
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
| **DG-A-01** | 4 | P0 | /admin/reports takes ~88 s to load; timed out at 60/90/240 s | `report-money.ts` · `market-dal.ts` · `updown-feed-history.ts` (⛔ NOT `reports/page.tsx`) | ☑ | `d74d0708` · `35916281` · `b5201cee` · `758bbf8b` · `7bc20724` | ✅ **GATE GREEN ON PRODUCTION 2026-08-29: `npm run qa:admin-load` = 38 of 38 admin routes inside 5,000 ms, 1 sign-in, 0 revocations, floor `/admin/roles` 254 ms.** 📐 `/admin/reports` **4,490–4,980 → 360–447 ms** · `/admin/insights` **2,375–3,048 → 431–504 ms** · `/admin/updown` **13,247 → 1,617 ms**. Render verified, not just the clock: reports shows the per-game card, 2 tables, 11 rows, 58 non-zero TZS; updown shows 7 assets, 23 chains, 36 metric cells, zero "unmeasured". 🔴 **THE HANDOVER'S TWO NUMBERS DID NOT REPRODUCE** (7,112 / 257). What settled it was a FLOOR route and a WINDOW SWEEP — see the RESUME AT block. ⭐ **THE FIX WAS THREE THINGS AND I GOT THE SECOND ONE WRONG.** (1) `loadReportWindow()`: one snapshot — the window's transactions plus a 4-column market projection where `findMany()` shipped ~35 over ~27,500 rows — shared by all four aggregates; 9 queries per render become 2, and they now reconcile by construction rather than by luck. (2) `/admin/updown`'s 46 per-chain queries collapsed to two bulk reads — **and the page did not move, 11,045 → 11,448 ms.** That was 630 ms of 12,688. (3) The instrument then said what reading never would: `GET /api/admin/updown-timing` → **`feedAdviceLookup` 11,865 ms, 93.5%**, a 30-day observation self-join. Memoised, ceiling = ONE ROUND at the shortest duration offered, asserted by `test:updown-config` §9 with a control that re-derives the ceiling from `ALLOWED_DURATIONS`. ⛔ **`reactCache` was NOT used** (money reads; a dedupe living in a framework's request scope is invisible at the call site) and the two callers' demo-market populations were **NOT harmonised** — tidying that would move a regulator-facing figure under cover of a performance fix. `test:product-line` B9 asserts the difference. 🔴 **A MONEY-STATEMENT DEFECT ON THE SAME PAGE:** `moneyByGame` is wrapped in `.catch(() => null)` and the per-game card began `{byGame && …}`, so a FAILED read rendered identically to an empty window. `/admin/insights:173` already disclosed that exact failure in words; it says them here too now. ⚠️ **AND THE GATE'S POPULATION WAS HAND-PICKED** — 3 routes. Widened to all 38 via `scripts/design-gate/routes.mjs` (one definition site, shared with the render drive), with `/admin/roles` as a FLOOR rather than `/admin/finance` as a "control" that was 9× the floor inside a budget cut to fit it.
| **DG-A-20** | 4 | P2 | loading skeletons are the wrong shape for what they replace | `skeletons` | ☐ | — | — |
| **DG-A-22** | 4 | P2 | layout balance | `admin/updown/page.tsx:579` + `—` | ☐ | — | 🔴 **ONE MEASURED INSTANCE, FOUND 2026-08-29 WHILE SHOOTING DG-A-12** — and it is a `max-w` written where a `min-w` was meant. The chain-duration caution (*“5m+ advised on BTC — its reading typically lands 91s after the boundary, leaving 89s of a 180s betting window”*) is a `<div … whitespace-normal max-w-[24rem]>` inside the CHAIN `<td>`. `max-w` is a CEILING: in an auto-layout table the column collapses to ~110px anyway, so the sentence wraps to **13 lines of two or three words** and the row renders **316px tall**. The author's own stated intent is 384px, written on the line, and the browser can never honour it. ⚠️ Added by `844367e2`, NOT by the DG-A-12 sweep — it is in the pre-sweep screenshot too. ⛔ **The fix is a column width, so it is a DG-A-23 question**: widening a column on a table that already scrolls at 390 is exactly what that row's outstanding re-measure exists to catch. Do them together |
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
