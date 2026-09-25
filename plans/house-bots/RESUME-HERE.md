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
| Master switch | **ON since 2026-09-24 21:56:11 EAT.** ⛔ NO SESSION EVER TOUCHES IT. Turning it ON is the owner's act alone; the engine can switch it OFF itself (`ENGINE_FAULT`, `ENGINE_ERRORS`, `GLOBAL_LOSS_STOP`) and has |
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

**The activity row is a round ledger.** Twelve columns on the desk-wide table: `Account · Opening · Stake · Closing
· Left today · When (EAT) · Outcome · Type · Round · Game · Note · [stop]`. Below `sm` it is one stacked cell
carrying every figure (one view model, two layouts).

| Commit | What |
|---|---|
| `1ad5a513` `ac3acf3a` `17682d2b` `acd5ec62` | **`Left today`** — `capDailyStakeTzs` counting down, on every row of the day, inside the 360 strip |
| `c7c4aefe` | A wallet column read from the ledger (`Transaction.balanceAfter`), refusing rather than carrying a stale figure across an unrecorded refund; and the phone stack |
| `8018653b` | The **Outcome** chip says how the stake ENDED — Won · Lost · Void — from `Position.status`, never inferred from money (a LOSS writes no transaction) |
| `00ef44e7` `3b7f01a6` | Eight blind or missing guards (numbered 1–6, 8, 9 — there is no 7), repaired before any column moved |
| `3859118f` | **Round · Opening · Stake · Closing**; `Product` struck; the compliance register rewritten by ROLE |
| `57c1c5bb` | Desktop gutters halved: 1519 → 1375px at 1280 (still over the 998px strip — §0b c) |
| `7d2153eb` | `docs/HOUSE-BOTS.md` §12.4 — the five instruments that lied on the way |

⛔ **THE DECISIONS — none is a session's to reopen.**
1. **D3 is amended, narrowly — Ali's decision** (`docs/COMPLIANCE-DECISIONS.md`, entry `2026-09-25 · D3 AMENDED`,
   second from the top, under the player-invite entry). The holder's wallet balance may be painted **only in the
   activity tables' `Opening`/`Closing` cells** on `/admin/desk` and `/admin/desk/[id]`, written by ROLE. Still
   forbidden: the designate wizard (a funded STATE), the roster (`Live balance` stays struck), the balance-floor
   panel, and every player-reachable surface without exception.
2. **`Left today` is the configured cap, not the wallet** — the session's 2026-09-24 choice under D3 (`1ad5a513`),
   which Ali's 09-25 request for TWO separate columns kept. It is the cap `CAP_PER_DAY` enforces.
3. **`Closing` is NOT `Opening + P/L` — Ali's decision** (`3859118f`). Closing is the ledger's figure stamped by the
   stake's own debit; `Opening = Closing + Stake` by construction. A bot holds ~20 open rounds on one wallet, so a
   line that "added up" would be a figure the wallet never held.
4. **No P&L column in the activity table, and no amount beside Won/Lost — Ali's decision** (`8018653b`, `3859118f`).
   He chose to build **house P&L once, as its own surface** (§0b d).
5. **D19/D20 stand.** House bots are never public — not to players, not to the holder — and are ordinary players in
   every report.

**Suite floors — a lower count is a regression, not drift:** console **854 memory / 613 Postgres** (2026-09-26) ·
engine **808 / 787** · money **132 / 150**. **Declared mutations:** console 340 · engine 80 · money 56 + seam 7 ·
c5 97 — all resolve exactly once (`test:red-anchors` §3, 2026-09-26).

## 0b · ▶ WHAT IS OPEN, in the order to work it

Nothing here blocks betting.

**✅ FOUND AND FIXED 2026-09-26** (`docs/HOUSE-BOTS.md` §12.5 has the whole record):
- 🔴 **Opening/Closing bracketed the SETTLEMENT on every settled Won or Void row** — 598 of 694 placed rows on the live
  desk. `feedRemainingLookup` matched the stake's movement on `positionId` alone; `BET_PAYOUT` and `BET_REFUND` carry
  the same position and the scan is newest-first, so it took the payout or refund. Now it matches the stake's own
  `BET_PLACED`, and a placed row whose debit is out of the scan answers nothing. Case 1.626h writes real settlement
  money — every earlier fixture settled a stake by flipping `Position.status`, which is why none could see it.
- 🔴 **1.368's D3 guard was vacuous twice** — it exempted `remaining`/`remainingTitle` (names the row stopped carrying
  at `3859118f`) AND its account had no activity rows at all. It is now 1.368b, on a ledger that really paints
  balances, taking its needles from what the rows paint.
- 🔴 **`reports-mem` was RED on clean `main`** (14.3/14.3b): another lane's `8acf067c` deleted `"today"` from
  `analytics.Period`, and our case called `activePlayers("today")` through an `Any` — the window began at `NaN` and
  every count was 0. It is why every red drive refused to start on 2026-09-25. It now asks `resolveRange`.
- ✅ **(b) is done:** the why-panel's `removed` guard lives in `AccountWhyPanel` and is RENDERED by 1.435b with a live
  answer (the one input where it alone stands); the door's own refusal is a new 1.541 case. Each has a mutation.

**a) The full mutation fleets — ⏳ RUNNING since 2026-09-26 23:30 UTC on `2b8ba0a2`** (restarted whole on a newer
`main` after the first run was killed mid-mutation by a session ending — see the trap in §1). Driver:
`<scratchpad>/fleet-slices.sh`, results line by line in its `fleet-summary.log`. Found so far: console
`355-all` came back WRONG-ASSERTION — its plain `Promise.all` crashed on a `null` slot added 09-24, so the suite died
before 1.355's source pin. Re-aimed to a shape-keeping all-or-nothing combinator and re-driven: CAUGHT, by 1.355's
behavioural half (a failed roster read must resolve). Console and engine
were last driven WHOLE at `79c2962d` (2026-09-23: 305/305,
65/65); they have grown to 340/80 since, and money+seam (63) and c5 (97) have no whole-fleet record. Per-mutation
time is not measured here. Drive in slices under 3 hours (`--only <prefix,…>`), each under the lock, each into its
own log, **never through a pipe**:
```bash
KP_SCRATCH_PORT=5453 npm run red:house-bot-engine > red-engine.log 2>&1; echo "EXIT=$?" >> red-engine.log
grep -E "MISSED|WRONG-ASSERTION|STALE|DIRTY|NOT MEASURED|RED: |EXIT=" red-*.log
```
⛔ A red runner **mutates tracked files in place**. It refuses to start only if a file IT mutates differs from HEAD,
and its lock stops only a second copy of the SAME harness — so run drives in a tree nobody edits. The drive tree
here is **`C:/kipindi-hb-red`** (detached; its `node_modules` is a JUNCTION into this worktree's). An anchor that no
longer resolves is reported `STALE` and fails the run — check `test:red-anchors` §3 first, not after hours.

**b) ✅ DONE 2026-09-26** — see the FIXED block above.

**c) ⏳ MEASURED 2026-09-26, ASKED OF ALI — which column to give up at 1280, or keep the scroll.** On a locally served
desk (fresh scratch DB, the tracked seeders, `next dev`), desk-wide activity table, every money cell filled with a
7-digit balance as a live Opening/Closing is: **1251px in a 998px strip at 1280** (`Game`, `Note` and the stop control
past the edge; as seeded, with blank ledger cells, 1161px). Hiding columns in the live DOM and re-measuring:

| Give up at 1280 | Table | Over the strip |
|---|---|---|
| nothing (keep the scroll) | 1251 | 253px |
| Note | 1120 | 122px |
| Note + Type | 1023 | 25px |
| Note + Type + Round | 998 | fits |

No single column makes 1280 fit; at 1440 (strip 1158) dropping any one of Note, Type, Round, Outcome, Opening or
Left today fits. The 1375px of 2026-09-25 was a different seed — quote this table, re-measured, never that figure.
⛔ Not a session's decision: every candidate is a column he asked for by name or one kept on purpose (Type).

**d) House P&L as its own surface — ✅ PLAN WRITTEN 2026-09-26, ⏳ WAITING ON ALI'S ANSWERS, NOT BUILT.**
👉 `plans/house-bots/HOUSE-PNL-PLAN.md` (three independent drafts, two refuters, one synthesis; plain English first).
It proposes one owner-only **Results** tab: per EAT day of placement over the last 7 days, whole desk and per
account, counted from `book.ts`'s own settled figure (so it cannot disagree with the loss stop), words not signs,
under ONE dated D20b amendment whose exact text is in its §4. Its §11 holds **11 one-line choices** for Ali,
recommended option first. ⛔ Build nothing until he answers; then commit the amendment with his words verbatim.
It names every text it amends — D20b, replan 266 and its §4 Commit-7 default, C7 360/408 and the rest — because D20
is Ali's ruling and each needs his words, not a session's.

**e) ✅ READ 2026-09-26, and told to Ali:** the system's own switch-off at 2026-09-24 21:52:26 EAT carries
`cause: GLOBAL_LOSS_STOP` — the desk's global daily loss limit tripped six minutes after it was switched on. Seven
rules saves followed, and a person switched it back on at 21:56:11. Nothing is a session's to change here.

**g) 🔴 FOR ALI — a regulator document: ruling 501 was never built.** `C5-D20-REPLAN.md` ruling 501 (a session's
ruling implementing D20) says the ISO 27001 regulator hand-off must EXCLUDE `house_bot.*` audit rows by category
and SAY SO with the excluded count. `buildIsoAudit` (`src/lib/server/reports/catalogue.ts`) still reads the whole
durable audit table unfiltered, and since the switch-on the desk writes those rows (`HOUSE_AUDIT`,
`src/lib/house-bot/constants.ts`). Whether a given export contains one depends on the live row count (it takes the
oldest 25,000) — NOT MEASURED. ⛔ Changing what a regulator receives is Ali's call, asked as a numbered choice;
never built silently.

**f) A house account label that is also a person's name sat in this file** (`cc211981`, 2026-09-24) and is in public
git history. It is gone from the tip; rewriting history is Ali's decision alone.

**h) FOR ALI — who can open the desk.** "Owner-only" in this code means the ADMIN role: `houseConsoleAudience`
returns `isAdmin(role)` for every console route (`src/lib/server/house-console-read.ts`), so any ADMIN account can open
the desk. Whether to narrow it to Ali's own account was listed as his decision on 2026-09-21 and no answer is recorded.
The P&L plan (d) inherits the same audience, so this is worth asking beside it.

**i) FOR ALI (his ask, never built) — the account finder on `/admin/desk/new` is search-only:** a 2-character floor,
ten rows, no browse, filter, sort or page. Ali asked for BOTH a searchable dropdown and a full list (recorded 2026-09-21
in `dcff8101`; `git diff --stat dcff8101 origin/main -- src/app/admin/desk/new/` was empty on 2026-09-26). Keep
`DeskAccountPicker` and add the list beside it, inside three walls: no money anywhere on `/new` (the visual gate carries
an inverted control), no name, phone or email on a row, and no 25+ character string typed into the wizard file
(`test:house-bot-console` 1.388).

**j) Two fire-path behaviours have no assertion** (register item B7 of 2026-09-22, never recorded closed; UNVERIFIED
since — re-derive first): the fire heartbeat (`FIRE_HEARTBEAT_MS`) and the fire-time RG pre-check. `scripts/` names
neither. Each needs a case and a mutation, both stores.

**NOT OURS — report, never fix:**
- `test:red-anchors` is red on clean `main`: two rotted anchors in other lanes' files (`bar-geometry` →
  `src/components/ui/query-bar.tsx`, `updown-handover` → `src/lib/updown-card-phase.ts`) and §4.1/4.2's ratchet at
  **68** undeclared against a ceiling of 65. ⚠️ ONE of the 68 IS ours: `red:house-bot-ops`, counted because its red
  entry point shares a source with an `rmSync` — the named fix is a red entry file of its own
  (`house-bot-ops-cases.mts:55-75`, `red-anchors.test.mts:240-264`); it would leave 67. ⛔ Never bump the ceiling.
- `scripts/focus-and-fit.mjs:119`/`:122` counts every buried control as touching too, then reports the two as
  disjoint — "4 fully under the rail and 4 touching it" describes 4, not 8.
- The desk's design measurement has never run: `qa:tab-candidates` short-circuits any railed page to "ALREADY A RAIL"
  (`scripts/design-gate/tab-candidates.mjs:129`) and `measure.mjs` never calls `expandSectionRail`.
- ✅ `test:house-bot-surfaces` 2.ids.1 went RED on `main` from the finance lane's `8acf067c`/`f2a81682`
  (`houseAccountMovement`/`houseMoved` in `src/app/admin/finance/page.tsx`); told on 2026-09-26, the finance session
  fixed it at `558b8f7a` with a neutral `ledger.leviesBooked`. ⛔ The lesson stands: the guard's allowlist is
  SHRINK-ONLY — a new house-shaped name on an admin surface is renamed, never registered.

## 1 · Traps that cost a run each — all still live

- ⛔ **`npm ci` deletes `embedded-postgres`**, which is installed `--no-save` and is not in the lockfile. Every
  Postgres half then "never ran" and every red drive refuses. Put it back: `npm i -D --no-save
  embedded-postgres@18.3.0-beta.17`. And `npm ci` here rewrites `C:/kipindi-hb-red` too, through its junction.
- ⛔ **`git worktree remove` deletes THROUGH a junctioned `node_modules`.** `cmd /c rmdir <tree>\node_modules` first.
- 🔴 **A red drive started as a SESSION's background task dies with the session — mid-mutation** (2026-09-26 23:19 UTC).
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
| D3 and its 2026-09-25 amendment, D19, D20 | `docs/COMPLIANCE-DECISIONS.md` |

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

- **2026-09-25/26 overnight · Ali-Blade15 — everything below is on `main` and live unless marked.**
  - Read production (read-only session): the switch has been ON since **2026-09-24 21:56:11 EAT**, not 09-21; the
    system's own 21:52:26 switch-off was `GLOBAL_LOSS_STOP`. This file rewritten from that read and put to five
    refuters (`f87be054`).
  - 🔴 Fixed and LIVE (`6427ef64`): Opening/Closing bracketed the settlement on 598 of 694 live rows; 1.368's D3 guard
    was vacuous twice; `reports-mem` was red on main (another lane's `"today"` deletion). (b) done: the why-panel
    guard is rendered by 1.435b. Console floor 854/613; 6 new/re-aimed mutations 6/6 caught.
  - (d) The House P&L plan is written (`608d292c`, `HOUSE-PNL-PLAN.md`) — 11 choices for Ali, nothing built.
  - (c) The 1280 ledger measured on a served desk (table in §0b c) and put to Ali.
  - The stale sweep (`c6b5e0fb`): 26 spent papers deleted, the survivors corrected, reviewed twice; the officers'
    guide regenerated (Void, and the ledger row). Two reds other lanes put on `main` were closed: surfaces 2.ids.1 by
    the finance lane after we told them, and reports 0.260.1 by classifying the marketing lane's new audit reader
    (`467282dd`). `main` = `754a7fe3`.
  - ⏳ **RUNNING (a):** the four fleets WHOLE on `2b8ba0a2` in `C:/kipindi-hb-red` (detached; its `node_modules` is a
    junction — `cmd /c rmdir C:\kipindi-hb-red\node_modules` BEFORE `git worktree remove`), in slices under the
    lock. Record the totals in §0b a and `docs/HOUSE-BOTS.md` §12.5 when they finish; a MISSED is a real gap.
  - **For Ali:** the P&L choices (d), the 1280 column (c), ISO ruling 501 (g), who may open the desk (h), the
    account-finder list (i), and the unconfirmed "half-configured account" decision in `docs/HOUSE-BOTS.md` §5.4.
