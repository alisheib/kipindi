# ▶ RESUME HERE — House Bots

**This file is the one stable address of the house-bots programme.** A session told only *"continue the house bots
where it was"* starts here. Rewritten 2026-09-25/26 overnight (Ali-Blade15) from a fresh production read, and every
claim in it was put to five adversarial refuters before it was committed.

---

## ⚠️ THE LIVE STATE — read from production 2026-09-25 23:48 EAT and 2026-09-26 ≈ 00:10 EAT

SELECT-only, in a session opened with `default_transaction_read_only=on`, ids never printed, ages computed in SQL,
timestamps rendered as text in SQL. ⛔ **RE-READ BEFORE QUOTING** — a number in a file is wrong by however long the
file has sat, and this section's own history proves it (below).

| Fact | Value |
|---|---|
| Master switch | **ON since 2026-09-24 21:56:11 EAT** — thrown by an ADMIN account other than the one that made every designation. ⛔ NO SESSION EVER TOUCHES IT. By D1 turning it ON is Ali's act alone, but the code accepts ANY ADMIN (3 active on 2026-09-26) — §0c decision 3. The engine can switch it OFF itself (`ENGINE_FAULT`, `ENGINE_ERRORS`, `GLOBAL_LOSS_STOP`) and has |
| Its trail (EAT) | 09-21: ON 16:42 · OFF 17:13 · ON 18:34 · OFF 18:42 · ON 18:56:11 — **09-24: OFF 18:50:55 · ON 21:46:20 · OFF 21:52:26 (no actor — the system) · ON 21:56:11** |
| The engine | RUNNING — durable planner beat 4 s old at the read |
| Accounts | **2 ACTIVE, 2 PAUSED** (the newest `PAUSED` event 2026-09-25 22:37 EAT) |
| Placed, per EAT day | 09-23 **150** (TZS 405,500) · 09-24 **220** (606,000) · 09-25 **320** (824,500) |
| How placed stakes ended | 694 placed: **VOID 534 · LOSS 95 · WIN 64 · OPEN 1** — three in four come back as a refund |
| What refuses most (48 h) | `UD_STALE_PRICE` 233 · `CAP_PER_DAY` 67 · `NO_REACT_ZONE` 36 · `POOL_BAND` 36 · `UD_CLOSENESS` 34 |

⛔ **"ON SINCE 2026-09-21" WAS FALSE for a day** — in this file's previous version, `PROGRESS.md`, the memory and the
brief that opened this session. The switch was OFF for three hours on 09-24, and at 21:52:26 the **system itself**
switched it off (an event with no actor) before a person switched it back on 3¾ minutes later. Nothing is owed on the
switch — it is the owner's — but the self-switch-off is worth his attention (§0b e). Both `SWITCH_ON` rows are real
and distinct to the millisecond (18:56:11.203 on 09-21, 21:56:11.193 on 09-24).
**The probe:** `railway run --project <50pick> --environment production --service Postgres -- bash -c
'PROBE_DB_URL="$DATABASE_PUBLIC_URL" node plans/house-bots/tools/prod-probe.cjs'` — Railway injects the URL, so no
credential is ever typed or written. ⚠️ Render times with `to_char(... AT TIME ZONE ...)` in SQL: an `AT TIME ZONE`
on a `timestamptz` yields a NAIVE value, which node-pg then re-parses in the laptop's zone — that is how the 09-24
instant first printed as `18:56:11Z` and looked like 09-21's.

## 0 · Do this first

```bash
git fetch origin
git switch bot-flow-seal
git merge --ff-only origin/bot-flow-seal       # the other machine's pushes
git merge --no-edit origin/main                # never rebase, never force
npx prisma generate                            # after any schema change
npm ci                                         # only if package-lock.json changed — then see the trap below
```

- **Two machines, and the drive letter tells you which.** Ali-Blade15: `C:/kipindi-house-bots` + `C:/kipindi-main`,
  memory under `C:/Users/Ali/.claude/`. The office PC: `F:/kipindi-house-bots` + `F:/kipindi-main`, memory under
  `C:/Users/asheib/.claude/`.
- **Heavy Node only through the lock:** `bash ~/heavy-node-lock.sh run housebots <cmd>` (Ali-Blade15's RAM is
  failing; two builds at once bluescreen it). ⛔ **The lock counts as abandoned after 3 hours**, so any job longer
  than that must be split — a waiting session will otherwise start beside it. Use `localhost`, never `127.0.0.1`.
- **Pushing.** The branch: `git push origin bot-flow-seal`. `main` is refused from this worktree by a pre-push hook,
  so it goes from the main checkout as a **pure ref update**, after merging `origin/main` into the branch:
  `git -C <drive>/kipindi-main fetch origin && git -C <drive>/kipindi-main push origin <sha>:main`.
  Parallel sessions push `main` all day — fetch and merge immediately before every push.
- **The pre-push guard — once per NEW machine.** Ali-Blade15 has it (`C:/kipindi-house-bots-hooks/pre-push`,
  re-checked 2026-09-25); the office PC's `F:/kipindi-house-bots-hooks` is recorded in its 2026-09-14 `PROGRESS.md`
  row, not re-checked. Recipe (step 5 of the since-deleted `plans/house-bots/README.md`; only the message is new):
  `git -C <drive>/kipindi-main config extensions.worktreeConfig true`, then
  `git -C <drive>/kipindi-house-bots config --worktree core.hooksPath <drive>/kipindi-house-bots-hooks`, then create
  `<drive>/kipindi-house-bots-hooks/pre-push`:
  ```sh
  #!/bin/sh
  while read l s r x; do case "$r" in refs/heads/main) echo "BLOCKED: push main from kipindi-main"; exit 1;; esac; done
  exit 0
  ```
- **Verify the deploy** before calling anything done: `curl -sSD - -o /dev/null https://50pick.tz/ | grep -o
  'dpl=[0-9a-f]*'` must print your sha.

## 0a · ▶ STATE AT 2026-09-25 — what shipped, and the decisions that bind it

**The activity row is a round ledger.** Ten columns on the desk-wide table since 2026-09-26: `Account · Opening · Stake
· Closing · Left today · When (EAT) · Outcome · Round · Game · [stop]` — the stake's TYPE is the Outcome cell's second
line (plain words, one chip) and a NOTE is a full-width line of its own under its row (§0c decision 2, built as step 1).
The account page's ledger has the same shape in eight columns. Below `sm` it is one stacked cell carrying every figure
(one view model, two layouts).

| Commit | What |
|---|---|
| `1ad5a513` `ac3acf3a` `17682d2b` `acd5ec62` | **`Left today`** — `capDailyStakeTzs` counting down, on every row of the day, inside the 360 strip |
| `c7c4aefe` | A wallet column read from the ledger (`Transaction.balanceAfter`), refusing rather than carrying a stale figure across an unrecorded refund; and the phone stack |
| `8018653b` | The **Outcome** chip says how the stake ENDED — Won · Lost · Void — from `Position.status`, never inferred from money (a LOSS writes no transaction) |
| `00ef44e7` `3b7f01a6` | Eight blind or missing guards (numbered 1–6, 8, 9 — there is no 7), repaired before any column moved |
| `3859118f` | **Round · Opening · Stake · Closing**; `Product` struck; the compliance register rewritten by ROLE |
| `57c1c5bb` | Desktop gutters halved: 1519 → 1375px at 1280 on that day's seed (not comparable with §0c decision 2's 1251px re-measure on another seed; still over the 998px strip) |
| `7d2153eb` | `docs/HOUSE-BOTS.md` §12.4 — the five instruments that lied on the way |

⛔ **THE DECISIONS — none is a session's to reopen.**
1. **D3 is amended, narrowly — Ali's decision** (`docs/COMPLIANCE-DECISIONS.md`, the entry headed
   `2026-09-25 · D3 AMENDED` — find it by that heading; its position moves as entries are added). The holder's wallet balance may be painted **only in the
   activity tables' `Opening`/`Closing` cells** on `/admin/desk` and `/admin/desk/[id]`, written by ROLE. Still
   forbidden: the designate wizard (a funded STATE), the roster (`Live balance` stays struck), the balance-floor
   panel, and every player-reachable surface without exception.
2. **`Left today` is the configured cap, not the wallet** — the session's 2026-09-24 choice under D3 (`1ad5a513`),
   which Ali's 09-25 request for TWO separate columns kept. It is the cap `CAP_PER_DAY` enforces.
3. **`Closing` is NOT `Opening + P/L` — Ali's decision** (`3859118f`). Closing is the ledger's figure stamped by the
   stake's own debit; `Opening = Closing + Stake` by construction. A bot holds ~20 open rounds on one wallet, so a
   line that "added up" would be a figure the wallet never held.
4. **No P&L column in the activity table, and no amount beside Won/Lost — Ali's decision** (`8018653b`, `3859118f`).
   He chose to build **house P&L once, as its own surface** (§0c decision 1).
5. **D19/D20 stand.** House bots are never public — not to players, not to the holder — and are ordinary players in
   every report.

**Suite floors — a lower count is a regression, not drift:** console **1105 memory / 804 Postgres** (2026-09-27, the phone sort rail + FS-09 integrated) · reports **251 / 80** (step 4: c6c637c1's census sample classified and pinned) · comms **52 / 50** ·
engine **829 / 810** (step 6) · ops **100 / 104** (step 7) · money **133 / 151** (2026-09-27, printed on the integrated tree). **Declared mutations:** console 484 (340 + step 1's 8 + step 3's 25 + step 4's 27 + step 6's 12 + step 10's 8 + step 9's 30 + the phone rail's 10 + FS-09's 24, 2026-09-27) · engine 104 (80 + step 5's 21 + step 6's 3) · money 56 + seam 7 ·
c5 100 (99 primaries; step 8 added 3) — all resolve exactly once (`test:red-anchors` §3, 2026-09-26).

## 0b · ▶ WHAT IS OPEN

Nothing here blocks betting, and nothing is in development — §0c's build order is DONE. What was found and fixed on
2026-09-26 is `docs/HOUSE-BOTS.md` §12.5; (a)–(e) of the old list are done or decided (§0c, §5).

- **To drive the four fleets whole again:** `bash plans/house-bots/tools/fleet.sh <sha>` (`--dry` prints the slices and
  creates nothing). A dedicated detached worktree beside the checkout, slices of ~45 by name prefix, c5 FIRST (a c5
  slice holding a disclosure mutation baselines 5.1 against the LIVE `origin/main`), each slice under the lock with a
  pause between, every log ending in `EXIT=`, RESUMABLE after a restart. ~2–3 h of lock time on Ali-Blade15. Run
  `test:red-anchors` §3 first (the tool does). ⛔ A red runner rewrites tracked files — never in a tree anyone edits.
  The whole drives so far: 579/579 (2026-09-26, §12.5) and **716/716 caught** at `9a647397` (c5 99 · console 450 · engine 104 · money + seam 63; 0 missed, 0 stale, 0 files left dirty) (2026-09-27, §12.14).
- **(f) A house account label that is also a person's name** is in public git history (`cc211981`, 2026-09-24); it is
  gone from the tip. ✅ **DECIDED 2026-09-27 under Ali's delegation** (*"decide as per what the architecture of the
  platform requires"*): **history is NOT rewritten.** A rewrite means force-pushing `main`, which this repository's
  push rule forbids for a reason — a dozen worktrees and parallel sessions build on it, and every one would be orphaned
  — and it would not remove the name anyway: the repository is public, so clones, forks and GitHub's cached commit
  pages keep the old commits. The exposure is one label in one plans file, with no credential, no money figure and no
  holder record. If the exposure ever has to go to zero, the architectural answer is making the repository private
  (Ali's call on GitHub, checked first against Railway's deploy access) — never a rewrite.

**NOT OURS — report, never fix:**
- `test:red-anchors` is red on clean `main`: two rotted anchors in other lanes' files (`bar-geometry` →
  `src/components/ui/query-bar.tsx`, `updown-handover` → `src/lib/updown-card-phase.ts`) and §4.1/4.2's ratchet at
  **67** undeclared against a ceiling of 65, every one another lane's (ours left the count at build step 7). ⛔ Never
  bump the ceiling.
- `scripts/focus-and-fit.mjs:119`/`:122` counts every buried control as touching too, then reports the two as
  disjoint — "4 fully under the rail and 4 touching it" describes 4, not 8.
- The desk's design measurement has never run: `qa:tab-candidates` short-circuits any railed page to "ALREADY A RAIL"
  (`scripts/design-gate/tab-candidates.mjs:129`) and `measure.mjs` never calls `expandSectionRail`.
- ✅ `test:house-bot-surfaces` 2.ids.1 went RED on `main` from the finance lane's `8acf067c`/`f2a81682`
  (`houseAccountMovement`/`houseMoved` in `src/app/admin/finance/page.tsx`); told on 2026-09-26, the finance session
  fixed it at `558b8f7a` with a neutral `ledger.leviesBooked`. ⛔ The lesson stands: the guard's allowlist is
  SHRINK-ONLY — a new house-shaped name on an admin surface is renamed, never registered.

## 0c · ▶ DECIDED 2026-09-26 — and the BUILD ORDER, ✅ DONE 2026-09-27

**The ISO 27001 regulator export (was §0b g) — the owner released it; the session kept it unfiltered.** His words,
verbatim: *"this we dot cre gbt said it sok we need nothign we can decide anything Regulator audit export (ISO
27001)"* — no regulatory need (Ali reports the Board needs nothing; no document is on file), and the choice left
open. Ruling 501's exclusion was never built and is now **WITHDRAWN**: the export stays **unfiltered** — no house row
is removed — and it still holds only the OLDEST 25,000 rows, so whether a given export contains a house row depends on
the live row count (NOT MEASURED). The consequence: an export that does reach house rows shows its recipients (the ISO
auditor, and ADMIN or accounting-view staff) `house_bot.*` action names, target id prefixes and FULL actor ids — an
officer's, and a holder's own on a consent-withdrawal row.
Recorded in `docs/COMPLIANCE-DECISIONS.md` (entry `2026-09-26 · House bots: ruling 501 WITHDRAWN`), ruling 557 in
`C5-D20-REPLAN.md`, and a dated exception in `docs/HOUSE-BOTS.md`'s D20 banner.

**Decided by the session under Ali's delegation** (his words are in §0b). Each keeps the architecture's own rules;
nothing below amends D19 or D20a. One of them (decision 3) found that D1 is not enforced in code, and needs one fact
from Ali before its build step.

| # | Question | Decision | Why |
|---|---|---|---|
| 1 | House P&L tab | **YES — build it, with every option `HOUSE-PNL-PLAN.md` §11 recommends**: a **Results** tab; the last 7 EAT days by the day a stake was PLACED (the day the loss limit counts it); the whole desk by day plus each account; words ("Profit TZS X" / "Loss TZS X" / "Even"), never signs; a "Still running" label; no Polls/Up & Down split, no stake-type split, counts and the integrity check later | One arithmetic with `book.ts` — the figure the loss stop acts on — so the screen and the stop can never disagree; words keep 361's formatter law; the Polls/Up & Down split would be a second arithmetic and the stake-type split is D20's struck staff scorecard; the counts and the integrity check are simply separate later steps |
| 2 | The ledger at 1280 (was §0b c) | ✅ **BUILT 2026-09-26 as step 1 — `docs/HOUSE-BOTS.md` §12.6.** **No sideways scroll at 1280, and no column Ali named is removed.** `Note` moves to a full-width line under its own row (only rows that carry one); `Type` becomes the `Outcome` cell's second line — plain words, never a second chip (`8018653b`'s one-chip rule); then the desktop gutter is tightened (`!px-2` → `!px-1.5` on the activity tables). Round, Opening, Stake, Closing, Left today, Outcome, Game, When and Account keep their columns | Measured 2026-09-26 on a served desk at 1280 (strip 998px), every blank money cell filled with a 7-digit balance: **1251px** as built; without Note **1120**; without Note + Type **1023**; without Note + Type + Round **998**. Per column (px): Account 150 · Opening 118 · Stake 125 · Closing 118 · Left today 59 · When 129 · Outcome 110 · Type 97 · Round 59 · Game 131 · Note 52 · stop 101. So moving Note and Type leaves 25px. The gutter step saves ~4px per column only where a column is NOT held at its floor — Account (`sm:min-w-[150px]`), When (`min-w-[128px]`), Outcome (`min-w-[110px]`) and Game (`min-w-[16ch]`) are — so expect ≈24–28px: marginal, and the re-measure decides. **If it still misses 998px, narrow Account's 150px floor** (the next lever); only if THAT fails is the 432(b) scroll kept, and then it is reported to Ali, never assumed. ⚠️ `Stake` measured 7px WIDER than `Opening` though both hold 7-digit figures (the panels seed stakes up to 1,250,000), share `formatTzs` and identical cell classes: unexplained — look, don't bank on it. The per-column figures do not reconcile with the hide-deltas (Note 52px wide, 131px saved) — table layout redistributes, so only a re-measure predicts. Nothing is deleted; the kit's own patterns only (`docs/DESIGN_AUTHORITY.md`); the phone stack (<`sm`) is unchanged |
| 3 | Who may open the desk, and who may switch it ON (was §0b h) | ✅ **RESOLVED 2026-09-26 under a newer delegation — D1 is READ AS THE OWNER ROLE (ADMIN); no per-account list is built** (`docs/COMPLIANCE-DECISIONS.md` entry `2026-09-26 · D1 READ AS THE OWNER ROLE`; what follows in this row is the narrower design, kept on record should Ali reverse it). **The desk stays open to the ADMIN role** (`houseConsoleAudience`), the Results tab included. **Switching the desk ON is restricted to the owner, as D1 says ("Ali alone turns it on")** — a server-side check on SWITCH_ON only, the owner's account id(s) held in a server setting and NEVER in this public repo; switching OFF stays open to every ADMIN, because a stop lever must be reachable by anyone who sees a problem. ⏳ **Needs ONE fact from Ali first** (see the handover): which of the ADMIN accounts are his own, and whether the others that switched the desk ON did so with his authority | Measured SELECT-only 2026-09-26: **3 ACTIVE ADMIN accounts**; ONE account made all 4 designations; SWITCH_ON came from that account on 09-21 16:42 and 18:56, and from **a second ADMIN account** on 09-21 18:34, 09-24 21:46 and **09-24 21:56 — the ON the desk is in now**. Nothing measured says which account is Ali's (any ADMIN can designate) — hence the one question. D1 and the log's accountability list say Ali alone turns it on, and the code enforces only "any ADMIN" (FS-09 in the scenario register records this risk). The desk itself stays wide because his managers operate it (they reported the 2026-09-21 defects); only the ON lever narrows |
| 4 | The account finder (was §0b i) | **Build it — Ali's own ask (`dcff8101`)**: keep `DeskAccountPicker` and add a full list beside it, paged (`AdminPagination`), sortable and filterable — his bar is "full paging, sorting, validation" — inside the three walls: no money anywhere on `/new` (the visual gate's inverted control), no name, phone or email on a row, no 25+ character string typed into the wizard file (1.388) | It was asked for and never built; the walls are the ones the wizard already keeps |
| 5 | A half-configured account (`docs/HOUSE-BOTS.md` §5.4) | **Keep refusing it** — a ticked product that reaches nothing blocks Start even while the other product is live. No code change | A product ticked "on" that can never fire is a control that says on and does nothing — the dead-control class of C7 ruling 432(a), which this console exists to refuse; the refusal names the missing chain or category and links to the fix |
| 6 | The two unasserted fire-path behaviours (was §0b j) | **Build the assertions** — re-derive first | A behaviour with no assertion is unprotected |

**THE BUILD ORDER — ✅ DONE 2026-09-27, every step LIVE on `main` and verified serving (`dpl`).** Its per-step detail —
what was built, the gates and their printed counts, what each first run found — is `docs/HOUSE-BOTS.md` §12.6–§12.14, and
the step instructions are in git (this file at `9a647397`). ⛔ Nothing here is in development.

| # | Step | Where recorded | Live at |
|---|---|---|---|
| 1 | The activity ledger fits 1280 (decision 2) — the desk-wide ledger keeps a 135 px scroll below 1440, ratcheted (decided) | §12.6 | `5d1e8abf` |
| 2 | D1 read as the owner ROLE (decision 3) — decided, nothing to build unless Ali reverses it (then: an owner-id check on SWITCH_ON only, the id in a Railway variable, never here) | `COMPLIANCE-DECISIONS.md` 2026-09-26 | — |
| 3 | The Results tab (C7 437; D20b amended under Ali's delegation) | §12.7 | `4da8ccd4` |
| 4 | The find step lists every account — paged, sorted, filtered | §7.1a, §12.9 | `c3c3b4a5` |
| 5 | The fire heartbeat and the fire-time holder check asserted | §12.8 | `d1ccdb2f` |
| 6 | Ruling 543 — an unsigned audit no longer reports a landed act as failed | §12.11 | `f03f8566` |
| 7 | `red:house-bot-ops` has a write-free entry of its own | §12.10 | `5b82a079` |
| 8 | Accepted risks 8–12 in both registers | §13 | `ac631c35` |
| 9 | Every desk table sorts, and none can grow past a page (Ali's ask) | §7.1c, §12.13 | `9a647397` |
| 10 | A press that is still loading says so (Ali's ask) | §7.1b, §12.12 | `f03f8566` |
| 11 | The close — **716/716 caught** at `9a647397` (c5 99 · console 450 · engine 104 · money + seam 63; 0 missed, 0 stale, 0 files left dirty) | §12.14 | `9a647397` |
| 12 | Ali's ask after the close: **the phone sort rail** — the two activity ledgers carry the kit's "Sort · Panga" chips below `sm` | §7.1c, §12.15 | the commit carrying this row |
| 13 | Ali's ask after the close: **FS-09** — every landed roster act tells every admin once, naming the officer and what moved | §9.2, §12.16 | the commit carrying this row |
| — | Ali's ask after the close: the name in public git history — **decided: NOT rewritten** (a force-push of `main` would orphan every parallel tree and not remove it from clones) | §0b (f) | — |

**Not built, each by decision or out of this programme — none of them stops the desk:**
- **The four target alerts** (TARGET_ADDED/CHANGED/REMOVED/STOPPED) have no act to send them: the targeting screen is not
  built. The law 2.fs09.8a makes the first target writer announce (§12.16).
- **Ruling 543's read-path siblings**: `verifyChain()`, `verifyChainFull()` and the census still throw when the chain
  secret is misconfigured (read paths only); its three warnings are proven by the suite but were not rendered on a
  served page (that needs a build whose chain cannot sign).
- **`test:house-bot-designation` 6.9** fails now and then on Postgres (always a refusal, green on re-run); its note says
  how to find the cause (print both timestamps on a failing run).
- **Other lanes' reds on `main`, recorded, never widened by us:** `test:red-anchors` (two rotted anchors, `bar-geometry` and
  `updown-handover`; §4's ratchet is green again since another lane's fix — measured 2026-09-27: 3811 passed, 2 failed),
  `test:tap-target` 2.1/5.1, `test:type-scale` §3/§6, `test:house-bot-holder-lifecycle` 2.2, `test:decomment` 2.1,
  `test:live-target-safe` §1b.

## 1 · Traps that cost a run each — all still live

- ⛔ **`npm ci` deletes `embedded-postgres`**, which is installed `--no-save` and is not in the lockfile. Every
  Postgres half then "never ran" and every red drive refuses. Put it back: `npm i -D --no-save
  embedded-postgres@18.3.0-beta.17`. And while a drive tree junctions this `node_modules`, `npm ci` here rewrites it too.
- ⛔ **`git worktree remove` deletes THROUGH a junctioned `node_modules`.** `cmd /c rmdir <tree>\node_modules` first.
- 🔴 **A red drive started as a SESSION's background task dies with the session — mid-mutation** (2026-09-25 23:19 UTC).
  It left a planted defect on disk (`git status` in the drive tree showed `house-console-read.ts` modified, +1 byte a
  line: the harness's CRLF write), an orphaned `scripts/.red-house-bot-*.lock`, and the shared heavy-node lock held by
  a dead process for up to 3 h. Recovery: confirm no `red-house-bot` node process lives; `git status` the DRIVE tree
  only; restore the planted files from HEAD there; delete the harness lock; release the heavy lock only if its owner
  is yours. ⭐ Launch long drives as an independent process (`Start-Process bash.exe <script> -WindowStyle Hidden`),
  never as a session background task.
- ⛔ **`Transaction.createdAt` is a NAIVE `timestamp`**; `HouseBotIntent`/`HouseBotEvent`/`HouseBotControl` times are
  `timestamptz`. The scratch cluster runs `Asia/Beirut`, so a raw-SQL fixture handed a JS `Date` lands **3 h in the
  future** and `findByUserWindow`'s `nowMs + 1` bound drops it. Bound BOTH ends of any freshness check.
- ⛔ **`db:scratch` is one `.pgscratch` per CHECKOUT, not per port** — a new `KP_SCRATCH_PORT` boots the old data.
  `--reset` gives a clean one, and fails (`EPERM` on the delete, or "pre-existing shared memory block is still in
  use") while an orphaned postgres from this checkout is alive; `db-scratch.mts` prints the stop command.
  `seed-house-bots-local.mts` is **not idempotent** (it places a real bet).
- ⛔ **`kill` did not stop `next start` on Windows** (recorded in §12.4): a survivor holds the port and serves the OLD
  build. Clear the port; never trust it. `taskkill /T /F` can also leave a `.next/dev/build/postcss.js` worker alive
  when its parent died first: after every kill, list `node.exe` processes and their command lines, not just the port.
- ⛔ **A typed decimal in a numeric box is stripped, not kept.** Keeping the dot crashes `/admin/config` via
  `assertWinnerFloor` and opens a stake bypass past the 9-character cap (an audit of all 31 numeric call sites,
  2026-09-21). Never "fix" it that way.
- ⚠️ **Windows: `execSync` goes through cmd.exe, where `^` is the escape character**, so `<sha>^` silently resolves
  to `<sha>`. Use explicit parent SHAs.
- ⛔ **A typed-`Any` call survives another lane deleting its argument** — 14.3 above. When `main` moves under a house
  suite, run the suite; a green compile says nothing about `Any`.
- ⛔ **A fixture that consumes a bounded resource** (the roster's 20 slots) breaks cases nowhere near it. Give the slots
  back by REMOVING accounts, never by raising the ceiling those cases measure.

## 2 · The authorities — read these before changing behaviour

| What | Where |
|---|---|
| Every rule field, and the engine's reading of it | `docs/HOUSE-BOTS.md` §5 |
| The console flow an officer walks | `docs/HOUSE-BOTS.md` §7 |
| How to stop the desk | `docs/HOUSE-BOTS.md` §11: "Rollback levers", and "If anything at all looks wrong" under "First switch-on" |
| The officers' guide, and Ali's 2026-09-21 ruling on its tone | `docs/house-bots-desk-guide.html` (`npm run docs:house-bots-guide`); the ruling is `docs/HOUSE-BOTS.md` §11 "The officers' guide" |
| The verification record | `docs/HOUSE-BOTS.md` §12 (§12.3 `Left today`, §12.4 the ledger, §12.5 the settlement fix) |
| The build record — commit table, D19/D20 rulings, what waited on Ali | `plans/house-bots/PROGRESS.md` (history; nothing in it is current state) |
| The console's money law (360, 361, 373) | `plans/house-bots/C7-SPEC.md`; ruling 266 is in `plans/house-bots/C5-D20-REPLAN.md` |
| D3 and its 2026-09-25 amendment, D19, D20, D20b's 2026-09-26 amendment (the Results tab) and D1's 2026-09-26 reading (the owner role) | `docs/COMPLIANCE-DECISIONS.md` |

## 3 · The rules that do not bend

1. The **production master switch is never touched**, and no production write is ever made.
2. A production READ is **SELECT-only**, in a read-only session, ids never printed, ages computed in SQL.
3. The repository is **PUBLIC**: no account id, **account label**, holder name, note text, credential or switch-on
   reason in any file.
4. **No house vocabulary on any player surface**, and none in the console's copy (ruling 453 — say "account").
5. Never `git checkout --` / `restore` / bare `stash` / `reset --hard`; never `git add -A`.
6. Update this file and `docs/HOUSE-BOTS.md` **in the same commit** as the change; push every green step, to `main`.
7. Ali's bar before anything is called ready, his words: "full paging, sorting, validation", and a "perfect visual
   and logical result".
8. Never weaken a guard, lower a floor, widen an exemption or delete a proof. A pass-count floor only RISES, and only
   to a count a run printed; a ratchet ceiling only FALLS. The one exception is a population floor whose population
   was DELIBERATELY shrunk, re-derived to the printed count in the same commit with the reason stated (the 8.2.0
   floor, 2026-09-26, after D21a's struck citations were deleted).

## 4 · The gates

```bash
npm run -s typecheck
npm run -s test:house-bot-rules
npm run -s test:house-bot-disclosure
npm run -s test:house-bot-surfaces
npx tsx scripts/red-anchors.test.mts
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-console    # both stores; floor 854 / 613
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-engine     # floor 808 / 787
KP_SCRATCH_PORT=5453 npm run -s test:house-bot-money      # floor 132 / 150
KP_SCRATCH_PORT=5453 npm run -s test:dal-parity
KP_SCRATCH_PORT=5453 npm run -s qa:house-bot-fleet        # KP_FLEET_SILENT=1 is its meta-mutation
npm run build && npm run -s verify:house-bot-bundle
```
The red drives are §0b a. The two browser gates are `qa:house-bots-visual` and `qa:desk-rules-flow`; both need a
served desk. Read every PNG: a green gate has twice certified a wrong screen.

**A served desk, from tracked files only** (the 2026-09-23 recipe used a scratchpad helper that was never committed):
```bash
KP_SCRATCH_PORT=5453 npm run db:scratch          # its own terminal; hold it. NEVER 5433 (a sibling checkout answers there)
# create a FRESH database on 5453 (db:scratch reuses one data dir per checkout) and wait until it answers a query —
# an open port is not a ready server ("the database system is starting up")
export DATABASE_URL='postgresql://postgres:scratch@127.0.0.1:5453/<db>' USE_PRISMA_DAL=true
npx prisma migrate deploy
npx tsx scripts/seed-admin-local.mts && npx tsx scripts/seed-house-bots-local.mts   # not idempotent (§1)
npx tsx scripts/seed-house-bot-panels-local.mts                                    # rows for activity/history
MARKET_SCHEDULER=false UPDOWN_SCHEDULER=false HOUSE_BOT_ENGINE=false DISABLE_ADMIN_TOTP=true \
  SESSION_SECRET=… OTP_PEPPER=… AUDIT_CHAIN_SECRET=… npx next dev -p 3031
KP_BASE=http://localhost:3031 npm run -s qa:desk-rules-flow
KP_BASE=http://localhost:3031 KP_WIDTHS=360,1280 npm run -s qa:house-bots-visual
```
- `qa:desk-rules-flow` mints its own admin and holder through `POST /api/dev-test/seed-admin`, which 404s under
  `NODE_ENV=production` — it needs `next dev` and only a MIGRATED database.
- `qa:house-bots-visual` signs in with `seed-admin-local.mts`'s localhost credentials and defaults to
  `KP_BASE=http://127.0.0.1:3021` and six widths — always pass both. Its header drives `next start`; `next dev` can
  serve stale CSS, so re-check a wrong-looking tile on `next start` before filing it.
- ⚠️ The panels seed's PLACED rows have no ledger movement, so since 2026-09-26 their Opening/Closing are BLANK (a placed
  row whose own debit is not in view answers nothing). A width measurement must fill them with a 7-digit figure.

## 5 · Handover log

- **2026-09-27 evening · Ali-Blade15 — Ali's three follow-ups, decided and built.** His words: *"proceed doing those as the
  session is up, decide as per what the architecture of the platform requires and as per perfection"*.
  - **The phone sort rail** (§7.1c, §12.15): the kit's own `CardSortControl`, fed only from the reader's sort view, below
    `sm` only, at the 44 px rank, never over an empty ledger; a chip and its header are one address (rendered and
    compared); the in-force chip tells a screen reader its direction.
  - **FS-09** (§9.2, §12.16): designate, re-verify, Start, Pause, Remove, the rules save and the desk limits save each alert
    every admin once, after their history event, naming the officer and every moved value; refusals and no-change saves
    alert nobody. The target codes wait for a target writer, which 2.fs09.8a obliges to announce.
  - **The name in git history:** not rewritten, and why (§0b f).
  - Built by two builders in isolated worktrees, each refuted by an adversarial reviewer, fixed, then verified again; the
    lead closed the verifiers' last holes. Integrated: console 1105/804, every house suite green on both stores,
    filter-language 257 green, `qa:house-bots-visual` 762/0 (3 NOT MEASURED: the empty targets table), `qa:nav-pending`
    112/0 including the new phone case, `qa:desk-rules-flow` 89/89, build and bundle green. Live at `994d2f0d`.
  - **After the push, at `994d2f0d`:** the 34 new console mutations **34 caught, 0 missed, 0 dirty**; `red:filter-language`
    **37/37**. `qa:nav-pending`'s recurring ~4 "landing" NOT MEASURED were its own hold: pausing the request made the
    continued body abort, 13 of 24 presses never landed, against 24 of 24 with no hold. It now holds the RESPONSE
    (`holdNavigation`): two runs **120 passed, 0 failed, 0 NOT MEASURED**. A real press never stalled (HOUSE-BOTS §12.15).
- **2026-09-26/27 · Ali-Blade15 — the build order, DONE. Everything below is on `main` and live.**
  - Steps 1–11 of §0c, each one commit (steps 6 and 10 share one, tested together), each pushed and verified serving;
    the table in §0c says where each is recorded. Ali added steps 9 and 10 mid-session ("all desk tables … paging and
    sorting", "the right loading states … so the user does not think it's stuck"); both are live at `9a647397`.
  - Suite floors at the close: console **1063 / 782**, engine **829 / 810**, reports 251 / 80, ops 100 / 104, comms 52 / 50,
    money 132 / 150, disclosure 118. Declared mutations: console 450, engine 104, money 56 + seam 7, c5 100.
  - The close: **716/716 caught** at `9a647397` (c5 99 · console 450 · engine 104 · money + seam 63; 0 missed, 0 stale, 0 files left dirty)
  - `qa:desk-rules-flow` printed **81/89** at `9a647397` on a local `next dev`, and **89/89** after three repairs to the drive itself (pushed at `fe12e905`, re-run on the merged tree). None of the eight failures was the desk: (1) since `3e94bf2f` a clean form's Save stays disabled, so the drive's wait for it to re-enable ran out on every landed save and the checks read an empty toast list — the lane that made that change had fixed the wait and 8.6b on `main` the same day, and the merge kept its version; (2) §9d's two extra browser contexts signed the same admin in, and with one live session per account the drive's own page was signed OUT — which is why 9d.3 and 10.1 found no Custom chip and no Remove button (the two another lane reported as this lane's); the page is now signed back in; (3) the Custom panel has ten numeric fields and the drive typed the from-date twice, leaving Apply disabled; it now starts `to` half-way along. A click that times out now records what answers at the control's centre.
  - Every build and red tree is removed (`git worktree list` shows only the main checkouts); the lock is free.
  - ⛔ Nothing is in development. What is open is in §0c's "Not built" list and needs Ali's word first.
- **2026-09-25/26 overnight · Ali-Blade15 — everything below is on `main` and live unless marked.**
  - Read production (read-only session): the switch has been ON since **2026-09-24 21:56:11 EAT**, not 09-21; the
    system's own 21:52:26 switch-off was `GLOBAL_LOSS_STOP`. This file rewritten from that read and put to five
    refuters (`f87be054`).
  - 🔴 Fixed and LIVE (`6427ef64`): Opening/Closing bracketed the settlement on 598 of 694 live rows; 1.368's D3 guard
    was vacuous twice; `reports-mem` was red on main (another lane's `"today"` deletion). (b) done: the why-panel
    guard is rendered by 1.435b. Console floor 854/613; 6 new/re-aimed mutations 6/6 caught.
  - (d) The House P&L plan is written (`608d292c`, `HOUSE-PNL-PLAN.md`) — 11 choices for Ali, nothing built.
  - (c) The 1280 ledger measured on a served desk (the measured table is in §0c decision 2) and put to Ali.
  - The stale sweep (`c6b5e0fb`): 26 spent papers deleted, the survivors corrected, reviewed twice; the officers'
    guide regenerated (Void, and the ledger row). Two reds other lanes put on `main` were closed: surfaces 2.ids.1 by
    the finance lane after we told them, and reports 0.260.1 by classifying the marketing lane's new audit reader
    (`467282dd`). `main` = `754a7fe3`.
  - ✅ **(a) DONE:** the four fleets WHOLE — **579/579 caught, 0 missed, 0 stale, 0 dirty** (§0b a; `docs/HOUSE-BOTS.md`
    §12.5). The first run found `355-all` stale-crashing (re-aimed) and was killed by a session ending mid-mutation
    (recovered — §1's trap); the drive and sweep worktrees are removed, the scratch cluster stopped, the lock free.
  - ✅ **Ali answered (2026-09-26):** the ISO exclusion is not required (his words; the session kept the export
    unfiltered), and he delegated the rest — decided in §0c with reasons. Measuring decision 3 found that D1 ("Ali alone
    turns it on") is not enforced: a second ADMIN account switched the desk ON, including the ON it is in now. **The
    next session builds §0c's order, steps 1–9**; step 2 waits on Ali's one fact (which ADMIN accounts are his, and whether the second switcher had his authority).
- **2026-09-26 afternoon · Ali-Blade15 — the build order, in progress (this entry is completed at the session's end).**
  - ✅ **Step 1 LIVE** — Type is the Outcome cell's second line, Note its own line under its row, one 8px gutter at
    every width (`docs/HOUSE-BOTS.md` §12.6). Ali's go-ahead, as typed: *"checks ur sur eof theiru result sskipt o liv
    eit sok"*; the gates had come in green by then (console 864/623, build, bundle). The account ledger fits 1280; the
    desk-wide one is still 135px over at the seven-digit worst case. Put to Ali as three choices, he delegated
    (*"for my asnwer u decide base don overlal platomfr arcgitecture and what make sense"*): ✅ **the short 432(b)
    scroll is KEPT below 1440** — the kit's own ScrollX answer — because the other two (Stop under the chip with a
    narrower Account floor; TZS once per header with bare figures) each break a platform-wide convention. The overflow
    is ratcheted in `qa:house-bots-visual` §5.7 and may only shrink. LIVE at `5d1e8abf`, deploy verified.
  - ✅ **Step 2 DECIDED, not built** — same delegation: D1 is read as the owner ROLE (ADMIN), the one owner tier the
    platform has (`docs/COMPLIANCE-DECISIONS.md` `2026-09-26 · D1 READ AS THE OWNER ROLE`). Every switch-on is
    audited with its actor and alerts every admin. ⛔ **Still OPEN, and not ours to fold in silently:** FS-09's other
    alerts (designation, verify, Start, rules and limits saves) are never sent — `announceRoster` has two callers. A
    build of its own, with cases on both stores.
  - ✅ **Step 3 LIVE** — the Results tab (`docs/HOUSE-BOTS.md` §12.7): its first gate run found six defects before the push (a blind money
    walk, a house suite red on `main` since another lane's `0f1f9dd9`, a canary that was also a transaction, a note line
    past the viewport at 640, Results cards too narrow at 1024, a gate list missing the reader), all fixed; console
    923/669, visual 499/0, probe 37/0. Its 25 new mutations are driven after the push.
  - ✅ **Step 8 DONE** — accepted risks 8–12 in BOTH registers, one text each, every sentence checked against today's code
    (risk 9's verify bucket is Redis-shared as RECORDED; risk 10's window is 180 s; risk 12 states D1's owner-role reading
    and FS-09's unsent alerts); `test:house-bot-disclosure` 118/0 (floor 114 → 118), 3 new c5 mutations, and
    `red:house-bot-c5` now fails a run on BROKEN-INJECTION instead of passing it silently.
  - ✅ **Step 5 DONE** — the fire heartbeat and the fire-time holder check are asserted on both stores (16.69a–i, 16.63a–g),
    each with a control, on an EMPTY poll so only fire's own check can pause the account; engine 825/804 (floor 808/787 →
    825/804), 21 declared mutations (3 on the Postgres twin's SQL). ⚠️ Recorded, not changed: `return finish(…)` inside
    fire()'s try is not awaited, so a store failure writing a terminal row escapes as a throw (16.69f0 pins it).
  - Step 8's three c5 mutations, driven at the live commit `ac631c35`: **3 caught, 0 missed, 0 broken-injection, 0 dirty.**
  - The other steps' drives, each after its push at the live commit, re-read from their logs: step 1 **10/10 caught**
    (console), step 3 **31/31** (console), step 5 **21/21** (engine, 0 not measured) — 0 missed, 0 files left dirty.
  - ✅ **Step 4 BUILT** — the find step's list of every account (`docs/HOUSE-BOTS.md` §7.1a, §12.9): twenty to a page,
    Account / Joined / Signed in sortable, Show and Signed-in filters on the section's one rail, every address part
    validated and refused by name. Its gate run found three things before the push: a missing prop in the loader's
    skeleton (tsc), a handle and two dates 3px wider than the 360 strip (a phone-only 4px gutter), and
    `test:house-bot-reports` red from the finance lane's c6c637c1 (its census sample, now classified and pinned with a
    control). Console 972/706, reports 251/80, visual 519/0 and 112/0 on the list's own routes (2 NOT MEASURED: the
    cannot-be-chosen view has no choosable handle to measure). **LIVE at `c3c3b4a5`** (deploy verified). Its 27 mutations,
    driven at that commit: **27 caught, 0 missed, 0 dirty**; `red:filter-language` at the same commit: **28/28 caught**.
  - ⏳ **Ali added two asks mid-session** — steps 9 and 10 above (every desk table sorts and pages; no navigation looks
    stuck). The close became step 11.
  - ✅ **Step 7 BUILT** — `red:house-bot-ops` has its own write-free entry; §4's undeclared count 68 → 67. The first gate
    run was red for a reason on `main`, not in the step: the ops walker's positive control looked for `const PORT = 5433;`,
    which `db-scratch.mts` no longer has, so `ops.pop.0p` failed and the red proof missed `ops.pop.walk` (49/50). Fixed in
    both places; ops 100/104, red 50/50. Measured against `c3c3b4a5` without the step: `test:house-bot-holder-lifecycle`
    2.2, `test:decomment` 2.1 and `test:live-target-safe` §1b are red identically there — other lanes' populations, NOT OURS.
    Its four hand-driven mutations, driven at the live commit `5b82a079`: **all four caught by exactly the cases
    named** (entry write → 1c + 1d and §4 back to 68; key on the case list → 1b, exit 2; flag dropped → 1a, exit 2;
    closure write → 1d only, §4 still 67). **LIVE at `5b82a079`** (deploy verified).
  - ✅ **Steps 6 and 10 BUILT, one commit** — ruling 543 (`audit()` says whether its row landed; every house writer reads
    it) and the loading marks (every tab, header, pager and chip says it is loading; what it replaces dims). One gate run
    covered both: console 1007/728, engine 829/810, `qa:nav-pending` 111/0/0, visual 208/0, build and bundle green.
    ⚠️ Not rendered: ruling 543's three warnings (they reuse the kit's warning toast/callout; the suite proves each
    answer). The desk filter chips first dimmed nothing (their rail sits above the card) — fixed before the push.
  - ✅ **Step 9 BUILT** — every desk table sorts; the roster pages. Built by a delegated builder in its own tree (30/30
    `sort-` mutations caught there), integrated on top of steps 6/10: console 1063/782, engine 829/810, dal-parity 1488,
    every house suite, `grid-paging` 41/0, `qa:nav-pending` 111/0/0. The integration found three defects in the VISUAL
    GATE, not the product, all fixed: §5.10's page-fit check could not fail (the console clips horizontal overflow), an
    empty table's hidden header was misread as the phone stack, and §5.7's control could not widen the account ledger at
    1440. The kit `SortTh` now carries `scope="col"`.
