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

**Suite floors — a lower count is a regression, not drift:** console **972 memory / 706 Postgres** (2026-09-26, step 4) · reports **251 / 80** (step 4: c6c637c1's census sample classified and pinned) · comms **52 / 50** ·
engine **825 / 804** (step 5) · money **132 / 150**. **Declared mutations:** console 400 (340 + step 1's 8 + step 3's 25 + step 4's 27, 2026-09-26) · engine 101 (80 + step 5's 21) · money 56 + seam 7 ·
c5 100 (99 primaries; step 8 added 3) — all resolve exactly once (`test:red-anchors` §3, 2026-09-26).

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

**a) ✅ DONE 2026-09-26 — the four fleets driven WHOLE: 579 of 579 caught, 0 missed, 0 wrong-assertion, 0 stale,
0 files left dirty.** Console 340, engine 80, money + seam 63 at `2b8ba0a2`; c5's 96 primaries at `2b8ba0a2` (35)
and `cf5dd07b` (61) — a c5 slice holding a disclosure mutation baselines 5.1, which pins the LIVE `origin/main`, so
it must run on a tree equal to current main. Found on the way: `355-all` (re-aimed, `1656d3b1`). The record is
`docs/HOUSE-BOTS.md` §12.5. The drive tree is removed.
**To drive them again** (~2 h on Ali-Blade15): a dedicated DETACHED worktree with a junctioned `node_modules`; slices
of ~45 by name prefix (`--only <p1,p2,…>`; c5 takes `--slice a:b`), each under the lock, each into its own log with
`echo "EXIT=$?"`, **never through a pipe**, a 60 s pause between slices; launched as an INDEPENDENT process (§1).
Before starting, `test:red-anchors` §3 — an anchor that no longer resolves is reported `STALE` after hours.
⛔ A red runner mutates tracked files in place and its lock stops only a second copy of the SAME harness — never run
one in a tree anyone edits. Read results with
`grep -E "MISSED|WRONG-ASSERTION|STALE|DIRTY|NOT MEASURED|RED: |EXIT=" <logs>`.

**b) ✅ DONE 2026-09-26** — see the FIXED block above.

**c/d/g/h/i/j) ✅ DECIDED 2026-09-26 — see §0c.** Ali answered the regulator question himself and delegated every
other one, verbatim: *"please proceed for all other questions tkaing th eirght decison that suit 50pick more
aesthically, perfeclty, profesinally and clenaly and based on our overlal architecture and standards of work. then
giv em new prmot to finlize in another session"*. The decisions, their reasons and the build order are §0c.

**e) ✅ READ 2026-09-26, and told to Ali:** the system's own switch-off at 2026-09-24 21:52:26 EAT carries
`cause: GLOBAL_LOSS_STOP` — the desk's global daily loss limit tripped six minutes after it was switched on. Seven
rules saves followed, and a person switched it back on at 21:56:11. Nothing is a session's to change here.

**f) A house account label that is also a person's name sat in this file** (`cc211981`, 2026-09-24) and is in public
git history. It is gone from the tip; rewriting history is Ali's decision alone.

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

## 0c · ▶ DECIDED 2026-09-26 — and the next session's BUILD ORDER

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

**THE BUILD ORDER — each step is one commit (code + tests + declared mutations + this file + `docs/HOUSE-BOTS.md`),
pushed to `main` and verified serving before the next:**
1. ✅ **The ledger at 1280** (decision 2) — **LIVE 2026-09-26**, gates green before the push (`docs/HOUSE-BOTS.md` §12.6). ⚠️ **NOT CLOSED ON THE DESK-WIDE LEDGER:** at the seven-digit worst case it is 1133px in the 998px strip (from 1251); the account ledger fits exactly. The Account floor cannot close the rest, so the 432(b) scroll stays below 1440 under a ratchet — ✅ **decided 2026-09-26 under Ali's delegation** (§5): the kit's own ScrollX answer, because moving the stop control, narrowing the shared subject floor or bare figures would each break a platform-wide convention. ⚠️ `px-1.5` is 8px on this scale and `px-2` 12px. Update every pin that fixes the column contract — the header equalities, the
   derived `colSpan`, 1.373's gutter allowlist, the first-cells order — and declare mutations for the new placements.
   Re-measure worst case with every money cell 7-digit (§4's served-desk recipe): the table must fit 998px at 1280.
   `qa:house-bots-visual` at 360, 1280 and 1440; read every PNG.
2. ✅ **DECIDED, NOT BUILT (2026-09-26)** — asked the one fact, Ali delegated instead, as typed: *"for my asnwer u decide base don overlal platomfr arcgitecture and what make sense"*. D1 is read as the owner ROLE (decision 3 and its log entry): one owner tier across the platform, and no hidden per-account setting that would lock the desk off after an automatic stop. What follows is the narrower build, kept ONLY for the case he reverses it: **D1 enforced: only the owner switches the desk ON** (decision 3) — ⏳ only once Ali has said which ADMIN accounts
   are his and whether the second switcher had his authority; if the answer is not in, do steps 3–8 first. Build a NEW
   owner-id check on SWITCH_ON only (the switch ceremony's action and its server door) — ⚠️ NOT FS-09's
   `requireHouseOwner()`, which the amendments define as the any-ADMIN guard on every house action; cite FS-09 for the
   risk and its alerts only. The owner's account id(s) live in a server-side setting (a Railway variable — never in
   this PUBLIC repo); a missing or empty setting REFUSES switch-on with a sentence naming why, never falls back to
   "any ADMIN". SWITCH_OFF stays open to
   every ADMIN. Cases on both stores with controls, a declared mutation for each branch, the refusal rendered at 360 and
   1280. ⛔ Never touch the live switch while building or testing this — the desk's current ON state stays as it is.
3. ✅ **The Results tab** — **LIVE 2026-09-26**, gates green before the push (`docs/HOUSE-BOTS.md` §12.7; the D20b amendment is `docs/COMPLIANCE-DECISIONS.md` `2026-09-26 · D20b AMENDED`). Built (decision 1) exactly per `HOUSE-PNL-PLAN.md` — the reader, the tab, §7's cases, controls and
   mutations, the 360/1280 layout. ⛔ Commit its D20b amendment IN THE SAME COMMIT as the build, so its "Enforced by"
   line is true on the day it lands — and REWRITE the plan's §4.3 template first (the plan's status line says how): it
   was drafted for an explicit owner approval, and Ali delegated instead. Quote his delegation (§0b) verbatim, say
   plainly the session decided under it, and name the real audience (the ADMIN role).
4. ✅ **BUILT 2026-09-26 — the account finder list** (decision 4), gates green before the push (`docs/HOUSE-BOTS.md` §7.1a, §12.9; console 972/706, 27 mutations): every account, twenty to a page, three sortable columns, two filters, the three walls pinned and mutated.
5. ✅ **DONE 2026-09-26 — the fire-path assertions** (`docs/HOUSE-BOTS.md` §12.8; engine 825/804, 21 mutations) (decision 6): the fire heartbeat and the fire-time RG pre-check, both stores.
6. **Ruling 543** (`C5-D20-REPLAN.md`): `audit()` promises fail-open but `chainSecret()` throws in production past
   that fallback, so three house writers can report a landed write as failed. Its schedule hung on the withdrawn
   ruling 501; re-derive that it is still unbuilt (it was on 2026-09-26), then fix it with a case and a mutation.
7. Ours, small: give `red:house-bot-ops` a red entry file of its own (§0b NOT OURS; the diagnosis and the named fix
   are `house-bot-ops-cases.mts:55-79`). Re-derive the undeclared count with `test:red-anchors` §4 first — the fix
   removes exactly one entry, and parallel lanes move the count.
8. ✅ **DONE 2026-09-26** (`test:house-bot-disclosure` 118/0, d.7/d.7b/d.7.c1; risk 12 states D1's owner-role reading) — owed text: accepted risks 8–12 were never written into either register (`docs/HOUSE-BOTS.md` §13); their sealed
   text is `04-amendments.md` S5 — check each against today's code before copying it into both registers identically.
9. **Every desk table sorts, and none can grow past a page** — Ali, 2026-09-26, mid-session, as typed: *"before
   finsihing amke su relaso all desk tbale sand grid sgot th erug tpaging pleas enad sroting etc.. to prveent vey rlong
   grids"*. Measured before building: every table that GROWS already pages at 20 (desk activity and history; the
   account's activity, targets and history; the find list). The roster is bounded by its limit (1–20) but unpaged, the
   Results tables are bounded (7 days; at most 21 rows), and only the find list sorts. So: server-side sort on every
   desk table, the reader parsing and building every link as the find list does, and the roster paged at 20.
10. **No navigation looks stuck** — Ali, 2026-09-26, as typed: *"alos when jumoing from tba to anothe rmake sur eu ahve
   th erigh tloading states and etc toamke percet and user to not to think it sstucl"*. A desk tab, sort, page or
   filter link changes only the query; by the router's design that keeps the page's loading boundary mounted, so
   `loading.tsx` is not shown again and the old panel may sit unchanged until the server answers (⏳ to be MEASURED
   on a served build, before and after). Nothing in the app used `useLinkStatus` (grepped 2026-09-26). Every such
   link must show at once that it is loading.
11. **Close:** drive the four fleets WHOLE again (§0b a's recipe), verify the deploy serves the final sha, and write the
   handover in §5.

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
    cannot-be-chosen view has no choosable handle to measure). Its 27 mutations are driven after the push.
  - ⏳ **Ali added two asks mid-session** — steps 9 and 10 above (every desk table sorts and pages; no navigation looks
    stuck). The close became step 11.
