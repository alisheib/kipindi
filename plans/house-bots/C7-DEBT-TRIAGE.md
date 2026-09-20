# Commit 7's open debt — the triage, before any of it is run

> **What this is.** `DEFERRED-TESTS.md`'s gate line names **§1b, §1e, §1f, §1g, §1h and §1i** as the sections that
> must be empty before **Commit 7 closes (C7 step 7)**. They hold **59 rows**. This file reads every one of them and
> says which of four things it is, **before a single command is run**, so the reasoning is on the record separately
> from the results. Written by the alerts lane, 2026-09-20, branch `alerts-lane`, worktree `C:/kipindi-alerts`.
>
> ⛔ **This file decides nothing on its own.** A row clears in `DEFERRED-TESTS.md` and nowhere else, and it clears
> only when the run was **DONE and PASSED** with its counts recorded, or when it moves to **NOT MEASURED with its
> reason named**. A verdict here is the plan for a row, never a substitute for its run.
>
> ⚠️ **§1k is NOT triaged here.** It also gates Commit 7, but the phase that commissioned this triage named six
> sections and §1k was not among them. Its three rows (89–91) are untouched and still owed.

## The four verdicts

| Verdict | Means | What discharges the row |
|---|---|---|
| **(a) RUNNABLE HERE** | The command exists in `package.json`, needs no served page and no production. | Run it, record the printed counts, clear the row. |
| **(b) PREMISE GONE** | The row's stated reason for skipping is no longer true — the surface it says is missing has been built. | Rewrite the row to say what it now rests on, or clear it against a real run of the surface that now exists. ⛔ Never silently. |
| **(c) NOT MEASURABLE HERE** | Needs a served page, a fresh `next build`, or production. | NOT MEASURED with the blocking reason named. It stays open; naming the reason is the whole of the payment. |
| **(d) BROKEN ROW** | The row cannot clear as written: its command cannot do what it claims, or it contradicts a ruling, its own section's scope, or another row. | A rewrite or a ruling, not a run. |

## What was measured before classifying anything

Four things, because three of them are the usual way a triage goes wrong.

1. **Every cited suite key resolves.** All **59** distinct `test:` / `qa:` / `red:` / `verify:` keys named across the
   six sections were extracted from the rows and looked up in `package.json`: **0 missing**. So no row in these six
   sections is a wrong-name row, and no red seen in this phase may be read as "the suite does not exist".
   ⭐ This is the check that stops `npm run -s <name>`'s one-second empty failure being filed as a failing suite.
2. **The desk's pages exist on disk.** `src/app/admin/desk/[id]/page.tsx`, `src/app/admin/desk/new/page.tsx` and
   `src/app/admin/desk/page.tsx` are all present, each with its own `loading.tsx`, and
   `CONSOLE_TABS = ["roster","activity","limits","history"]` at `console-routes.ts:63` with `UNBUILT_TABS` gone.
   That is what makes verdict (b) a measurement rather than a reading of a progress document.
3. **Every mutation register a row cites exists.** `c7-s3s2-mutations.json`, `c7-step7-closing-gates-mutations.json`,
   `c7-C7 step 6 · the designate wizard-mutations.json` and `c7-C7 step 7 · the closing gates-mutations.json` are all
   in `plans/house-bots/tools/`. No batch row is pointing at a file that is not there.
4. **The environment, measured rather than assumed.** Port **3021** is LISTENING (another lane's `next start`);
   port **3009** is free but reserved; the scratch Postgres cluster is UP on **5433** and belongs to another lane's
   worktree (`C:/kipindi-house-bots/.pgscratch`), so `db-scratch.mts` will REUSE it and leave it running — its own
   probe path, not a collision — and every two-store suite creates `<prefix>_<pid>`, unique per run.
   ⛔ 18 databases were on that cluster before this lane touched it; the list is held for the close.

## The triage

### §1b — Commit 7 step 1, the desk's console page (13 rows)

| # | Verdict | Why |
|---|---|---|
| 12 | **(a) RUNNABLE** | `test:house-bot-caps`, `test:house-bot-seam`, `test:house-bot-holder-lifecycle`, `test:house-bot-info-edge`, `test:house-bot-migrations` — all five keys resolve; three boot the scratch cluster, two are plain `tsx`. No served page. |
| 13 | **(c) NOT MEASURABLE** | The six-width sweep of every non-default state needs a served build. Port 3021 is held. |
| 15 | **(c) NOT MEASURABLE** | Six design-gate drives, all needing a running app; `admin-section-gate` hard-codes 3009, and the design-gate harness signs in through `scripts/live/harness.mjs`, which defaults to production. |
| 16 | **(b) PREMISE GONE** | The row's reason is "`/admin/desk/[id]` has no page until C7 step 4, so that path answers 404 for EVERY viewer". **Step 4 built it** — `src/app/admin/desk/[id]/page.tsx` is on disk with its own `loading.tsx`, and rows 43, 44, 69 and 75 all photograph or drive it. The 404 reasoning is false. What the row now rests on is the served blocker alone, which is row 44's and row 72's. |
| 17 | **(c) NOT MEASURABLE** | A mid-load capture at 360 needs a served build — and row 57 has since MEASURED that the fallback cannot be held open by either mechanism it tried. |
| 18 | **(a) RUNNABLE** — batch | `red:house-bot-console`. The harness runs the memory child directly, so no Postgres and no server. ⚠️ Ruling 275 gives it to the commit close as ONE batch; the anchors file now declares **225**, not this row's 59 or 68. Running a fragment does not clear it. |
| 19 | **(c) NOT MEASURABLE** | `verify:house-bot-bundle` scans `.next`, so it needs a fresh `next build` of HEAD; `qa:house-bot-console-probe` needs the served app on top of it. |
| 20 | **(c) NOT MEASURABLE** | Four more widths of seven states — served. |
| 21 | **(c) NOT MEASURABLE** | Says so itself: a second `next build` and `next start` on 3021. |
| 22 | **(c) NOT MEASURABLE** | `KP_BASE=http://127.0.0.1:3021 qa:house-bots-visual` — served, on the held port. |
| 23 | **(c) NOT MEASURABLE** | Needs the fourteen captured states re-driven with attribute and flight-payload scanning — served. |
| 24 | **(c) NOT MEASURABLE** | Same six design-gate drives as row 15. |
| 25 | **(a) RUNNABLE** | `npm run test:guards-exist` — static, one `tsx` process, no server. The cheapest row in the whole register. |

### §1e — C7 steps 3 + 2, the limits tab and the probe's audience (6 rows)

| # | Verdict | Why |
|---|---|---|
| 30 | **(c) NOT MEASURABLE** | `test:responsive` is `scripts/responsive-audit.mjs`, which hard-codes `http://localhost:3000`. Nothing in this repo starts a server there and this lane owns no port. |
| 31 | **(a) RUNNABLE** — batch | `red:house-bot-console` over `c7-s3s2-mutations.json`'s 100 declarations; the file exists. Same batch as row 18. |
| 32 | **(c) NOT MEASURABLE** | Needs `next start`, six seeded staff personas and Playwright — and the row's own command sets `LIVE_BASE`, which this lane is forbidden to set at all. |
| 33 | **(c) NOT MEASURABLE** | The red-by-red's baseline arm is a `test:all` in `C:/kipindi-old-build`, a worktree this lane must not run in — and one is in flight there now. |
| 35 | **(d) BROKEN ROW** | See below. The row's own last sentence is "**Owed before Commit 8**", inside a section the gate line says gates **Commit 7's close**. |
| 36 | **(c) NOT MEASURABLE** | The walk is a source exercise but the row's verdict is a re-run of the served probe. ⚠️ Its PII half is W25's, and ruling 524 forbids fixing a W25 page before its probe exists — so half of this row cannot be owed by Commit 7 either. Flagged beside row 35 rather than silently carried. |

### §1f — rulings 537 + 542, and C7 step 4 / 4b (14 rows)

| # | Verdict | Why |
|---|---|---|
| 37 | **(c) NOT MEASURABLE** | Two browser contexts racing one `baseVersion` on a served build. |
| 38 | **(a) RUNNABLE** | `test:house-bot-money`, `test:house-bot-engine` — both stores, both boot the scratch cluster. |
| 39 | **(a) RUNNABLE** — batch | `red:house-bot-console` plus the whole `red:house-bot-money` set; both keys resolve. Same batch as row 18. |
| 40 | **(d) BROKEN ROW** | See below. The command as written cannot drive the route it names. |
| 41 | **(c) NOT MEASURABLE** | The report-pack card at four more widths — served. |
| 42 | **(b) PREMISE GONE** | The row's reason is "**NOT REACHABLE, not skipped: neither page exists yet**". Both now do: `/admin/desk/new` was built by step 6 and `/admin/desk/[id]` by step 4, and both ship a `loading.tsx`. The row's two halves have been collected since — the wizard's by row 57, the account page's by row 75 — so what it now rests on is those two rows, not the absence of a page. |
| 43 | **(c) NOT MEASURABLE** | `KP_ROUTES=… qa:house-bots-visual` at four widths — served (`KP_ROUTES` is a real, supported override; the port is the blocker, not the command). |
| 44 | **(c) NOT MEASURABLE** | The probe against a tree in which `/admin/desk/[id]` has a page. The page condition is now MET — the blocker is the served build alone, and the crumb-trail finding the row records is still unmeasured over the wire. |
| 45 | **(a) RUNNABLE** | `test:house-bot-engine`, `test:house-bot-caps`, `test:house-bot-seam`, `test:house-bot-money`. |
| 46 | **(c) NOT MEASURABLE** | Three instruments off this step's own fresh build. |
| 47 | **(c) NOT MEASURABLE** | Five engine-health verdicts on a served build with planted `beat:%` rows. |
| 48 | **(c) NOT MEASURABLE** | Needs a fixture with a two-product account and a live target, on a served build. |
| 49 | **(a) RUNNABLE** | `test:house-bot-caps`, `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-holder-lifecycle`. |
| 50 | **(d) BROKEN ROW** | See below. Its own cell says **MEASURED** — it is a platform ruling request, not a skipped run. |

### §1g — C7 step 6, the designate wizard (6 rows)

| # | Verdict | Why |
|---|---|---|
| 51 | **(c) NOT MEASURABLE** | `qa:pending-bar` and `qa:chaos` both import `scripts/live/harness.mjs`, whose `BASE` defaults to `https://50pick.tz` and whose `loginOnce` uses Ali's own console password. Running either would point a house-bot instrument at the live money platform and revoke his live session. Permanently not measurable here until the harness fix arrives through `main` (row 63). |
| 52 | **(c) NOT MEASURABLE** | The Playwright half drives `/auth/demo` and `/api/dev-test/seed-admin`, both 404 under `next start`; it needs `next dev`, and it hard-codes port 3009. |
| 53 | **(d) BROKEN ROW** | See below. Row 61 says this pass **DISCHARGED** it; rows 69 and 72, written a day later, both cite it as still owing. |
| 54 | **(a) RUNNABLE** | `test:house-bot-designation`, `test:house-bot-holder-lifecycle`, `test:house-bot-caps`, `test:house-bot-seam`, `test:house-bot-money`. |
| 55 | **(a) RUNNABLE** — batch | `red:house-bot-console` over the step's 20 declarations. Same batch as row 18. |
| 56 | **(c) NOT MEASURABLE** | `test:all` red-by-red against `C:/kipindi-old-build` — a worktree this lane must not run in. |

### §1h — the C7 step 6 review fix pass (5 rows)

| # | Verdict | Why |
|---|---|---|
| 57 | **(c) NOT MEASURABLE** | Served, and the row already records two different mechanisms that failed to hold the fallback on screen. The gap is real and named. |
| 58 | **(a) RUNNABLE** — batch | `red:house-bot-console` over 14 new + 3 re-anchored; the 35-entry register file exists. Same batch as row 18. |
| 59 | **(c) NOT MEASURABLE** | `test:all` red-by-red against the forbidden worktree. |
| 60 | **(a) RUNNABLE** | `test:house-bot-designation`, `test:house-bot-holder-lifecycle`, `test:house-bot-caps`, `test:house-bot-seam`, `test:house-bot-money`, `test:house-bot-comms`, `test:filter-language` — seven keys, all resolve, none served. |
| 61 | **(c) NOT MEASURABLE** | Row 51's production-harness reason verbatim. ⚠️ And it is this row that claims row 53's discharge — see the (d) entry. |

### §1i — C7 step 7, the closing gates (15 rows)

| # | Verdict | Why |
|---|---|---|
| 62 | **(b) PREMISE GONE** | Already annotated **✅ CLEARED 2026-09-20** in place: both halves of C7 step 5 are built, `UNBUILT_TABS` is deleted and comms 7.2c asserts zero dead tabs with no tolerance list. Measured against the tree here: `CONSOLE_TABS` really does carry `activity` and `history`. ⛔ It is still sitting in an OPEN section and belongs in §3. |
| 92 | **(b) PREMISE GONE** | Same: annotated ✅ CLEARED for the account half, still filed open. Its three structural subjects (`readDeskCore`'s settled set, the bell's EAT round trip, `insertChecking`'s first caller) are built. |
| 63 | **(c) NOT MEASURABLE** | Six harness drives, all through the production-defaulting `harness.mjs`. Named permanently: clearing them needs the harness fix merged through `main`, then one run each against a local `next start`. |
| 64 | **(c) NOT MEASURABLE** | Row 52's reason, unchanged. |
| 65 | **(c) NOT MEASURABLE** | Re-derived rather than inherited: `test:responsive` hard-codes `localhost:3000`, and `test:motion` (`scripts/motion-adoption-verify.mjs`) imports `chromium` from Playwright and defaults `BASE` to `http://localhost:3000` — **both genuinely need a served app**, so the row's "environment red" account is correct as written. |
| 66 | **(a) RUNNABLE** — batch | `red:house-bot-console` over 18 declarations; `c7-step7-closing-gates-mutations.json` exists. Same batch as row 18. |
| 67 | **(c) NOT MEASURABLE** | `test:all` red-by-red against the forbidden worktree. |
| 68 | **(c) NOT MEASURABLE** | The landing half was photographed today and the row records it as a PART payment. What is still owed — `qa:house-bots-visual`'s twenty per-tile checks over the two landing panels, and the account page's two panels as tiles — is served. ⭐ Its premise DID move today; the row moved with it, which is what rows 16 and 42 have not done. |
| 69 | **(c) NOT MEASURABLE** | The REMOVED page cannot go through `qa:house-bots-visual` at all (the gate waits on `[data-section-rail]`, which ruling 435(a) removes), and the four-width human reading is served. ⚠️ It cites row 53 as an open peer — see the (d) entry. |
| 70 | **(a) RUNNABLE** | `test:house-bot-caps`, `test:house-bot-money`, `test:house-bot-seam`, `test:house-bot-designation`, `test:house-bot-holder-lifecycle`, `test:house-bot-rules`. |
| 71 | **(a) RUNNABLE** — batch | `red:house-bot-console` over the review's 22; its register file exists. Same batch as row 18. |
| 72 | **(c) NOT MEASURABLE** | `qa:house-bots-visual` and `qa:house-bot-console-probe` off a fresh build, plus four widths. ⚠️ Also cites row 53 as open. |
| 73 | **(c) NOT MEASURABLE** | One scrolled READ tile of one field — served. The glyph itself is measured at source and pinned by `1.432`. |
| 74 | **(a) RUNNABLE** (six-suite half) + **(c) NOT MEASURABLE** (red-by-red half) | The only row in the six sections that genuinely splits. `test:house-bot-caps`, `test:house-bot-money`, `test:house-bot-seam`, `test:house-bot-holder-lifecycle`, `test:house-bot-rules`, `test:house-bot-engine` all run here; the `test:all` comparison against `C:/kipindi-old-build` does not. ⛔ Clearing one half does not clear the row. |
| 75 | **(c) NOT MEASURABLE** | The `[id]` loader mid-load, which needs a served build AND an `ACCESS EXCLUSIVE` lock on `HouseBot` to make the reader really block. |

## The four broken rows, in full

**Row 35 — a Commit-8 debt filed in a Commit-7 gate.** The row's last sentence is "Owed before Commit 8, on ruling
529's own reasoning", and §1e is named in the gate line as gating **Commit 7's close**. Both cannot be true: either
C7 step 7 cannot close until a Commit-8 item is paid, or the row is in the wrong section. Ruling 502 is what settles
it — it scoped the gate precisely because an unsatisfiable blocking rule "is not a gate, it is a thing sessions
learn to step over". ⭐ And the register's own preamble records this exact defect class once already: "an OPEN row
sat in §3 'Cleared' … ending in its own words 'Owed before Commit 8'". ⛔ **The fix is a ruling, not a run**: either
Ali moves row 35 (and row 36's W25 half, which ruling 524 puts beyond Commit 7 by construction) into a Commit-8
section, or the gate line is amended to say §1e's Commit-8 rows do not block C7 step 7. Until then this row is a
standing reason C7 step 7 cannot close, for a measurement defect that is explicitly **not a disclosure**.

**Row 40 — the command cannot drive the route it names.** The row asks for
`npm run qa:pending-bar ROUTE=/admin/desk?tab=limits`. `scripts/design-gate/pending-bar-live.mjs:32` reads
`process.env.ROUTE` and defaults to `/admin/config`. Written after the script name, `ROUTE=…` is an **argv token**,
not an environment variable — so the command as written would drive `/admin/config` and report a clean pass for a
page this row is not about. Its own usage block also warns that on Git Bash a leading-slash `ROUTE` is rewritten to
a path unless `MSYS_NO_PATHCONV=1` is set, which this repo has been bitten by before. ⛔ Two separate defects in one
command, and the row cannot clear as written even on a machine that had the port. The harness's production default
(row 51) is the *second* blocker, not the first. **Fix: rewrite the command as
`MSYS_NO_PATHCONV=1 ROUTE='/admin/desk?tab=limits' npm run qa:pending-bar`, then leave it NOT MEASURED on the
harness reason.**

**Row 50 — measured, and therefore not a skipped run.** The cell says "⛔ **MEASURED, AND RE-CLASSED RATHER THAN
CARRIED AS A CONSOLE DEFECT**", and records the measurement: four admin routes re-driven on step 4b's served build,
`/admin/desk/[id]`, `/admin/players/[id]`, `/admin/kyc/[id]` and `/admin/markets/[id]`, **all 200** with the
not-found words in the body, because a streamed RSC page under a `loading.tsx` has already sent its status. The row
then concludes the fix "needs its own ruling" and that "the desk must move WITH its neighbours, never alone".
⛔ Ruling 275 defines this file as holding **runs a checkpoint skipped**. A row whose run is done, whose verdict is
recorded, and whose only open item is a platform decision is not that. As written it blocks C7 step 7 on a ruling
nobody has been asked for. **Fix: record the verdict in §3 and raise the platform question as a ruling in
`C5-D20-REPLAN.md`, or keep it open with the gate line amended — but not both silently.**

**Row 53 — discharged by one row and cited as open by two later ones.** Row 61 (the step 6 fix pass, 2026-09-19)
says "⚠️ **This pass DISCHARGED row 53**", with counts: all six mandatory widths of all nine wizard states through
`qa:house-bots-visual` (222/0/0, 606/0/0, 156/0/0) and the tiles opened and READ. Rows **69** and **72** (C7 step 7
and its review, 2026-09-20 — both later) each cite "the same gap rows 43, 53 and 69 already owe" and "which rows 43,
53 and 69 already owe". ⛔ One of those is wrong, and carrying both is how a register stops being evidence. The
artefacts that would settle it are in another lane's worktree (`.qa-house-bots/` is gitignored and this worktree has
none), so this lane cannot settle it by reading. ⚠️ **It is the exact failure this phase was warned about — a row
carried rather than judged — and it resolves by reading row 61's tiles, not by a re-run.** Until someone does,
row 53 must NOT be cleared on row 61's word alone, and rows 69 and 72 must not be trusted to have checked it.

## What this lane will run next, and what it will not

**Will run** (9 rows, no served page, no production, no build): the twelve distinct suite keys behind rows
**12, 25, 38, 45, 49, 54, 60, 70** and the six-suite half of **74** — `test:guards-exist`, `test:house-bot-caps`,
`test:house-bot-seam`, `test:house-bot-holder-lifecycle`, `test:house-bot-info-edge`,
`test:house-bot-migrations`, `test:house-bot-money`, `test:house-bot-engine`, `test:house-bot-designation`,
`test:house-bot-comms`, `test:house-bot-rules`, `test:filter-language`. One at a time, under
`~/heavy-node-lock.sh`, against the scratch cluster this lane REUSES and does not own.

**Will not run** the seven batch rows (**18, 31, 39, 55, 58, 66, 71**) even though they are runnable: ruling 275
gives them to the commit close as **one** batch, the anchors file now declares **225**, and the harness's own header
requires a clean tree for its target files. A fragment of a batch clears no row, and this phase was commissioned to
sort rather than to drive. ⛔ They stay RUNNABLE, not NOT MEASURED — the distinction is the point.

**Will not touch** the 36 not-measurable entries beyond naming the blocker, the four broken rows beyond naming what
settles each, or `scripts/red-anchors.test.mts`, whose `UNDECLARED_CEILING` stays at 65.
