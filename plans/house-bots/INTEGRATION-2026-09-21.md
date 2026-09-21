# INTEGRATION — 2026-09-21, OMEGA-COMPILE01 (the "next machine")

> **Read this after `READINESS-2026-09-21.md` (the record) and before acting on any number in
> `START-HERE-NEXT-MACHINE.md` §4/§5 — several of those are now closed or were undercounts.**
> ⛔ **RE-DERIVE EVERY NUMBER.** Everything below was measured on this machine today, and it ages the same way.

---

## 0. WHAT THIS MACHINE IS, AND WHY IT CHANGES THE PLAN

`START-HERE` was written on **Ali-Blade15** for "the next machine". This is it, and three of that document's
standing blockers **do not exist here**:

| Ali-Blade15 | OMEGA-COMPILE01 (measured today) |
|---|---|
| 🔴 failing RAM, bluescreens under load, corrupted a git object; `gc.auto=0` required | 31.8 GB RAM, 12 logical processors, `gc.auto` at its default, no corruption seen |
| one drive, `C:` only | `C:` and `F:` both present; this worktree is `F:/kipindi-house-bots` |
| three or four lanes live, fighting over ports; builds deferred for weeks | **zero node processes running**; the machine was idle and sole-use |
| pre-push guard was a 158-byte file in no clone and no backup | present and wired here: `F:/kipindi-house-bots-hooks/pre-push` via `core.hooksPath` in `config.worktree` |

⚠️ **Documents that send this machine to `C:/kipindi-*` are Ali-Blade15's.** None of `C:/kipindi-ops`,
`C:/kipindi-alerts`, `C:/kipindi-rel`, `C:/kipindi-house-bots` or `C:/kipindi-main` exists here. The
`PROGRESS.md` session rows that attribute `C:/kipindi-ops` to OMEGA-COMPILE01 are misattributed; the work is
all on `origin`, which is what matters.

⭐ **The consequence worth acting on:** the readiness statement's items 5 and 6 — "build and run the app once
on a quiet machine" and "run the sabotage batches" — were blocked by machine contention and failing RAM, not
by missing work. **Both are unblocked here.** Item 5's build is done (below).

---

## 1. THE MERGE IS DONE — all five branches are in `ops-lane`

`START-HERE` §2 called `ops-lane` "THE INTEGRATION BRANCH — every lane merged into it". It was not: **ten
commits across four lanes had landed after it absorbed them** (house-bots 3, alerts-lane 5, rel-lane 1,
platform-lane 1) — the freeze-did-not-hold trap, one more time. Measured with
`git merge-base --is-ancestor`, not believed.

All four are now merged and `origin/main` is in as well. Conflict set, measured with
`git merge-tree --write-tree` before touching anything: **exactly four files.**

| File | Resolution |
|---|---|
| `package.json` | ⛔ **UNION, 143 gates.** Both sides carried gates the other lacked — ops-lane had `test:house-bot-disclosure` and `verify:house-bot-bundle`, rel-lane had `test:audit-gap`, `test:audit-drain`, `test:audit-attest`. Taking either side would have dropped a gate silently. Derived by tokenising both 8 KB chains and diffing them; the writer refused unless the result was a superset of both with no duplicates. |
| `plans/house-bots/DEFERRED-TESTS.md` | Row by row against the merge base. ops-lane was ahead on 76 and 80, had MOVED 77 and 82 into other sections and expanded them, and had CLEARED 81. Rows **78 and 79 were edited by BOTH lanes and are combined**, with an 18-claim integrity check refusing to write unless every distinctive claim from both sides survived. |
| `scripts/house-bot-reports.test.mts` | A two-store FLOOR both lanes had raised: ops 247/80, trunk 219/64. Carried the **HIGHER on both stores** so neither guard weakens, then set to what a run PRINTED: **248 memory / 80 postgres**. ⛔ 247+1 is what the forbidden arithmetic would have produced; that agreement is a coincidence and is recorded as one. |
| `plans/house-bots/PROGRESS.md` | Three session rows from three sessions. Union, deduplicated. |

`test:deferred-register` after the merge: **14 passed, 0 failed**, all six planted controls firing, and §4
(every OPEN section named in the blocking rule — the assertion found red six times before) is **green**.

---

## 2. WHAT WAS MEASURED HERE, AND WHAT IT SAYS

### ✅ D19 holds in the shipped bundle — the build that had been deferred for weeks
`npm run build` exit 0, then `verify:house-bot-bundle`: **ALL PASS** over **171 files under `.next/static`, 9
prerendered server documents and 35 under `public/`**, with its control firing (32 planted family samples
found, a planted house path found, benign look-alikes not found) so the scan is real and not a sweep over
zero. Provenance half: **none of the 168 server-written console sentences** appears in the public bundle,
with its own control firing on a planted sentence.
⭐ This also settles a question this pass raised on its own: `houseBotsLive()` is an **exported** function in
`src/lib/feature-state.ts`, a module client components import, and the file argues by reasoning that a name
in code cannot be printed. The bundle scan is the instrument, and it agrees.

### ✅ D19 holds on the served layer
`qa:house-bot-console-probe` on a real `next start` over that build: **34 passed, 0 failed** —
**3,164 requests, 2,712 of them non-staff, `leaks: 0`**, across player, holder, trigger, COMPLIANCE, SUPPORT,
MODERATOR and ADMIN, over 57 console pages / 148 route instances, 24 of them under `/admin/desk`.
⚠️ **The 138 NOT MEASURED are the probe refusing a vacuous pass**, not a hole: they are pages where the ADMIN
control carries no house data either, so a non-leak for other viewers would prove nothing. The meaningful
population is the **35 route instances that do carry house data**, and those are the zero.

### ✅ The red-by-red, against a baseline that is now a real control
⛔ **`F:/kipindi-old-build` was parked on `66db674c` — a house-bots commit, 83 commits behind `main`.** Any
comparison run here would have measured the branch against its own ancestor. Detached at `418f1b59` =
exactly `origin/main` first. (Ali-Blade15's copy was fixed on 2026-09-20; this machine's never was.)

| guard | clean `main` `418f1b59` | integrated `ops-lane` | verdict |
|---|---|---|---|
| `test:decomment` | 21 passed, 1 failed | 21 passed, 1 failed | identical — **main's, not ours** |
| `test:popup-fit` | 12 passed, **1 failed** | **13 passed, 0 failed** | **our branch FIXES a red live on main** |
| `test:red-anchors` | 2270 passed, 4 failed | 2876 passed, 4 failed | same four assertions (see §3) |

⭐ The popup-fit result independently confirms the alerts lane's correction: main's own run names **11**
un-reviewed popups, and the lane's own count was 12 — 11 inherited plus exactly one of ours.

### ⚠️ A green typecheck proves even less than `START-HERE` said
`npx tsc --noEmit` exits 0. But `tsconfig.json`'s `include` covers `scripts/**/*.ts`, and there is **exactly
one** such file. The guard layer is **470 `.mts` + 468 `.mjs` + 25 `.cjs` = 963 files**, none of them
type-checked. Treat a green typecheck as covering `src/` and nothing else.

### ✅ The switch posture, read at source
- `HouseBotControl.enabled` is `BOOLEAN NOT NULL DEFAULT false` — it ships off.
- `houseBotEngineEnabled` is `env !== "false"`, so **with `HOUSE_BOT_ENGINE` UNSET the engine STARTS.** The
  variable's absence is the ENABLING condition. ⛔ It is not a second lock, and "defence in depth" is the
  wrong sentence. The enforced lock is the database column, refused at `fire.ts`, `seam.ts` ×2, `planner.ts`
  and `trigger.ts`. One well-enforced lock, plus a kill switch someone must actively set.

### ✅ The audit drain is built here and genuinely absent from live
On clean `main`, `auditFlush` appears in **one file — its own definition, zero call sites in application
code.** On this tree it is wired in eight places: `installAuditShutdownDrain` is registered on
`SIGTERM`/`SIGINT` from `src/instrumentation.ts`, ordered deliberately around Next's own handler.
⭐ **AR-2 is self-answering after one deploy, and does not have to be decided first.** The drain appends a
`system.shutdown_drain` row LAST, behind a FIFO process-wide queue, so that one row certifies a whole
shutdown. After a deploy: a row for the container that went away means the signal arrived and the queue was
saved; no row means it did not. The mitigation if there is no row — changing the production start command so
the signal reaches node rather than npm — stays Ali's.

---

## 3. WHAT WAS BROKEN AND IS NOW FIXED

### `START-HERE` §4's four NOT-FIT items
1. **Six exports on `src/lib/server/audit.ts`** — closed on ops-lane before this pass and re-derived here:
   every export is `audit*`/`getAudit*` platform vocabulary; the only "house" occurrence in the file is in a
   comment, in a server-only module.
2. **`houseBots` in the feature table** — closed: renamed to the neutral **`desk`**, the L52 remedy rather
   than an exemption, and the operator override moved with it to `FEATURE_DESK`.
3. **"Two dead anchors"** — ⛔ **an undercount by seven. There were NINE.** See below.
4. **Two readiness papers claiming one office** — ⛔ **was still open; closed here.** A dated supersede block
   now stands on `RELEASE-READINESS-2026-09-21.md` naming `READINESS-2026-09-21.md` as the record (later and
   fuller, 634 lines to 478, and the only one carrying Ali's `LIVE_BASE` ruling and the popup correction).
   The superseded paper is **not deleted**: a superseded measurement is still a measurement.

### ⛔ Nine anchors rotted by `§2J · THE JOIN`, re-pointed and PROVEN
The trunk rewrote the shared word family — every literal separator became `${HOUSE_JOIN}` and `String.raw`
became a plain template literal — and nine anchors quoting that line as fixed text stopped resolving. Five
of them were already labelled "RE-POINTED" by the pass that fixed two others.

Re-pointed: `house-bot-c5` S5-M53/54/55/56/65/66/67, `house-bot-chatbot` the-vocabulary-loses-a-word,
`house-bot-console` 397-enter-now. Each new `from` resolves **exactly once**, **changes** the file, and each
mutated result was `node --check`ed — a mutation that will not parse is not a caught defect.

⭐ **And then DRIVEN, because an anchor that resolves is not an assertion that went red:**
`red:house-bot-c5 --only …` → **7 caught, 0 wrong-assertion, 0 missed, 0 stale, 0 files left dirty**;
`red:house-bot-chatbot` → 93 passed / 0 failed with `4.the-vocabulary-loses-a-word` reddening its declared
`6.c12`; `red:house-bot-console --only 397-enter-now` → 1 caught, 0 missed. `git status --porcelain` empty
before and after every drive.

⚠️ **A hand-written audit of all 1,295 anchors reported 217 broken against the guard's 9.** My instrument was
the one lying — it did not resolve through `red-anchor.mjs`. Discarded; the guard's own list is the population.

### ⛔ A D19 guard contradicting itself — 5.2 against its own positive control
The red harness **refused to run** ("`disclosure` is RED before any mutation"), which is how this surfaced:

```
FAIL 5.2      nothing a player's page PRINTS is a house word
              -> src/app/markets/[id]/page.tsx :: words:HOUSE_STAKE
FAIL 5.2.c3   POSITIVE CONTROL: ...and neither is the market page's own HOUSE_STAKE_ONLY,
              an internal state name in a comparison
```

⭐ **The positive control was the half that was right,** and the measure's own docblock had always agreed with
it ("Identifiers are NOT here"). What was missing is that **nothing implemented it**: the exclusion rested on
`house[ -]?stakes?` being unable to match across an `_`. THE JOIN closed that blindness — correctly, because
`HOUSE_STAKE_ONLY` had walked past a guard for weeks — and turned an accidental exclusion into a contradiction.

Why the identifier is not a leak, measured three ways: `page.tsx:226` is
`elig.why === "HOUSE_STAKE_ONLY" ? { state: "NOT_ELIGIBLE" }`, a comparison operand;
`objections-service.ts:114` states the design (D19c, ruling 146) that it "never leaves the server";
and the bundle scan above finds nothing shipped.

The exclusion is now **explicit and narrow** — only an ALL-CAPS `_`-joined token — and **controlled**: new
`5.2.c6` plants the exempt shape and three readable shapes into one copy of one real file, and requires
`house stake`, `House stakes` and lower-case `house_stakes` to each still be reported.
`test:house-bot-disclosure`: **110 passed, 0 failed.**

---

## 4. WHAT IS STILL OPEN

### Ours, and doable on this machine
1. **The register: 150 rows, 122 in OPEN sections, 76 whose RESULT still says owed.** Re-derived with the
   register gate's own parser, not a hand-rolled one. Roughly 30 of the 76 need only a served app — and the
   build and server recipe now work here; ~9 need a mutation drive; ~17 are neither.
   ⚠️ The ~20 that mention production are an over-count: rows 78 and 79 among them had their production
   reason RETIRED and now wait on a served build like the rest.
2. **The declared mutation batches.** 398 declared, 9 driven here. ⛔ And the standing finding holds: no file
   in the repository reads a `*-mutations.json`, so most of the 262 recorded declarations are write-only by
   construction and a "run the register" programme was never built.
3. **Rewrite the REL ladder.** REL-2 and REL-4 already happened, out of order, and REL-0(c) is permanently
   unpassable as written (it wants a migration diff of 2; both folders are on `main`, so the true value is 0
   forever).
4. **Push `ops-lane` to `main`** from `F:/kipindi-main`, the only checkout without the guard.

### Reds that stay, each with an owner
- `test:decomment` 2.1 — red on clean `main`. **Main's.**
- `test:red-anchors` 2× rotted `rg-doors` anchors in `responsible-gambling.ts` — red on clean `main`. **Main's.**
- `test:red-anchors` §4.1/4.2, **67 against a ceiling of 65** (main is 66). ⛔ Not touched: raising the ceiling
  is the one edit that file forbids, the excess is decomposed with an owner on each half in its own header,
  and the prescribed fix is to give `red:house-bot-ops`'s `--prove-red` entry point **a source of its own**
  (one file serves two entry points, and the `rmSync` serving the test half reclassifies the red half). We add
  no failing assertion `main` lacks.
- **The composite-id gap** (`DEFERRED` row 79) — `pos_house_<24hex>` is not a hit of the print measure at all:
  the words family has no bare `house` and the id family needs an `hb_` prefix. Not closed here, because
  widening to bare `house` would refuse `/admin/house` and `HOUSE_FEE`, which `5.2.c3` exists to prevent. Now
  **printed every run as note `5.2.n1`** so it is not rediscovered a third time. Not exploited today:
  `buyPositionInner` mints `pos_${randomId(10)}` and `placeHouseBet` runs that same function.

### Ali's alone
1. **The switch.** Never a session's.
2. **The published player rules** still tell players that bots and multiple accounts are prohibited. Owed to
   players, not the regulator. ⛔ Do not carve an exception into any text a player can read — that discloses
   the feature and breaches D19. The accepted-risk route is the coherent one and is already chosen.
3. **`AR-2`** — whether to change the production start command. Reframed above: it ships, then reads itself.
4. **Whether to narrow the desk to his account alone.** Today any administrator can open it.
5. **The production readings.** No session in this programme has ever had that access: is the switch off on
   the live database, how is the engine configured there, did the two migrations land, and — the one that
   matters more than it sounds — **is the live clock set to the expected zone?** If it is not, everything
   installs, the site looks healthy, and the desk silently never runs.
6. The four register rows flagged for a ruling, and the two unrelated live bugs on his queue (a report
   download that stops silently at 500 rows; an admin action that does not ask for his code).

---

## 5. DELIVERED TO ALI TODAY

`C:/Users/asheib/Desktop/House Desk - Operator Guide.pdf` — 7 pages, for his administrators: what the desk
does, the eight global limits and eleven per-account caps with suggested values, designating an account and
every refusal it can give, the whole rules surface, the `SWITCH ON` ceremony, the first fifteen minutes, the
stop ladder, per-account Pause/Re-verify/Remove, every self-pause reason and what to do about it, the
self-switch-off causes and the alerting rules. Every figure in it was derived from the shipped code
(`REQUIRED_FOR_MASTER_ON`, `REQUIRED_FOR_START`, `PAUSE_REASONS`, `HouseBotRulesV1`, the eligibility copy),
not from a plan document, and the rendered PDF was read back (7 pages, no missing glyphs) rather than assumed.

⚠️ **Ali ruled on its tone, 2026-09-21:** the confidentiality preamble, the page footer's
"not for players" line and the closing "what must never be said" section are **removed at his instruction** —
*"its only us the management and admins"*. ⛔ That is a decision about a document he owns and distributes; it
weakens no control. **D19 itself is untouched**: it lives in the code, in its guards and in
`COMPLIANCE-DECISIONS.md`, and none of that moved.
