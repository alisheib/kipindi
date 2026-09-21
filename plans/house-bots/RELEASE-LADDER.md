# THE RELEASE LADDER — REWRITTEN 2026-09-21 (rel-lane)

> **This file supersedes the REL-0…REL-6 table wherever it is mirrored** — `PROGRESS.md`, amendment S2 in
> `04-amendments.md`, `00-NEW-SESSION-PROMPT.md`, `README.md`, `PLAN.md` §17's release block and
> `docs/HOUSE-BOTS.md` §11. Those rows are left in place and now carry a one-line pointer here, because
> three lanes are editing them concurrently and a union merge combines small edits but cannot combine two
> rewrites.
>
> **Why it needed rewriting:** the ladder describes a world that ended on 2026-09-18, when Ali pushed `main`
> himself. Two of its seven rungs happened, out of order and by his own hand; three describe a handover
> between containers that is long finished; one condition became permanently unpassable; and one rung — the
> only one written for Ali — is still owed.
>
> ⛔ **RE-DERIVE EVERY NUMBER IN THIS FILE.** Every figure below was measured on 2026-09-21 and is already
> ageing. A recorded number rots, and this document exists because several did.

---

## 0 · THE LAW THIS LADDER SITS UNDER

- **The master switch is Ali's alone.** His words: *"i wont ever turn thr switch on until usay so its ready
  and i fo"*. Two halves, neither skippable: a session states in writing, on measured evidence, that it is
  READY — then **Ali** turns it on.
- ⛔ **No rung in this file instructs a session to turn the switch on, to ask Ali to turn it on early, or to
  treat any green gate as permission.** A GO printed by an instrument is a reading, never an authorisation.
  Both release instruments say so in their own headers, and they are right to.
- ⛔ **No rung in this file instructs a session to touch production** — no `railway`, no production database,
  not even a read, no `curl` to the live site. Every line the old ladder aimed at production is marked below
  as **ALI'S, ON THE DAY** or **NOT MEASURED, with the reason named**. Never blank.
- **D19** (nothing about house bots reaches a player or the holder) and **D20** (house bots are ordinary
  players in every report) outrank every row here.
- ⛔ Nothing here weakens a guard, lowers a floor, widens an exemption or deletes a proof. Where a condition
  is struck, what it was protecting is named and re-homed, not dropped.

---

## 1 · THE MEASURED STATE THIS LADDER IS WRITTEN AGAINST

Re-derived on rel-lane, 2026-09-21, working tree clean before and after:

| Reading | Value |
|---|---|
| `rel-lane` HEAD | `0ef73cca` — identical to `origin/house-bots` |
| `origin/main` | `418f1b59` |
| `origin/ops-lane` · `origin/alerts-lane` | `293dc323` · `2e1452ca` |
| `git rev-list --left-right --count origin/main...HEAD` | **0 behind, 88 ahead** ⚠️ `PROGRESS.md:15` records "0 behind and 76 ahead" — stale by 12 |
| `git diff origin/main...HEAD --stat -- prisma/migrations` | **EMPTY** |
| Migration folders under `prisma/migrations` | 82 on HEAD, 82 on `origin/main`, forward difference 0, reverse difference 0 |
| Both house folders on `origin/main` | `20260916150000_house_bot_tables`, `20260916150100_house_bot_markers` — **present** |
| Suites `test:all` runs | **383** on rel-lane, **385** on ops-lane (every `test:*` key except the aggregator, `scripts/test-all.mjs:44-46`) |

**What the pipeline actually is.** `.github/workflows/ci.yml` runs `typecheck` (`:55`), `test:integrity`
(`:58`), `node scripts/test-all.mjs --skip responsive,motion` (`:75`) and `npm run build` (`:78`). It runs no
`qa:`, `verify:`, `red:` or `ops:` key at all.

⛔ **`predeploy` IS NOT A PIPELINE.** Measured: `package.json` defines no `deploy` script and no key beginning
`deploy`, on either lane. npm's `predeploy` hook only fires for `npm run deploy`, so `predeploy` runs when a
human types `npm run predeploy` and at no other time. "In predeploy" means "in a list someone may choose to
run". This matters below, because ops-lane's addition of `verify:house-bot-bundle` to `predeploy` does **not**
put it in CI.

---

## 2 · THE RUNGS

Each rung answers four questions: **what it requires NOW**, **who performs it**, **what discharges it**, and —
for the rungs already taken out of order — **what it would have proven, and what now proves that, or that
nothing does.**

⛔ A rung is never marked discharged merely because its event occurred. An event is not a proof.

---

### REL-M · THE THREE-WAY MERGE — a new rung, and the one that actually stands between today and REL-0

The old ladder was silent on this, and it is now the largest single item. REL-0 says "merge `origin/main`",
which is a **no-op**: the branch is 0 behind. The real merge is `alerts-lane` and `ops-lane` into
`house-bots`.

- **Requires now:** `alerts-lane` → `house-bots` (measured clean), then `ops-lane` → `house-bots` (measured:
  exactly one conflict, `plans/house-bots/DEFERRED-TESTS.md`). ⛔ **Resolve that register as a UNION** — every
  row either side cleared stays cleared, every row either side added stays added. `ours` discards one lane's
  new gate; `theirs` resurrects rows another lane proved and cleared. Then `npm run test:deferred-register`,
  whose §4 has been found red six separate times when a new section arrived unnamed — and a merge combining
  two lanes' sections is exactly when it fires again. Then `npx tsc --noEmit` and the house suites on both
  stores.
- **Performed by:** a session, locally. No production, no switch.
- **Discharged by:** a clean three-way merge with `test:deferred-register` green on the merged tree, and
  `test:all` re-run **on the merged tree** — not inherited from any lane's earlier green. Combining three
  branches changes the tree under every previous result.
- ⛔ **Why this rung is a precondition for the ladder being runnable at all, not a tidy-up after it:** all four
  release instruments and every kill lever exist **only on `ops-lane`**. Measured, key by key, across all four
  refs — `ops:preflight-house-bot-migrations`, `db:seed-house-bots-local`, `qa:house-bots-local`,
  `ops:release-migration-parity`, `test:scenario-coverage`, `ops:house-bots-status`, `ops:house-bots-off`,
  `ops:house-bots-remark`, `ops:house-bots-sunset` are **absent on `rel-lane`, on `origin/house-bots`, on
  `origin/main` and on `origin/alerts-lane`**. A REL-0 run on this tree today would be five empty-log exit-1s.

**⚠️ One infrastructure finding outranks this rung.** The git object store shared by every worktree here has a
reproducibly corrupt packed object:

```
fatal: packed object 9802802836ee8c5f78dd8cb31953d55a18257948
(stored in C:/kipindi-main/.git/objects/pack/pack-07e92b68a9ac05a3993fcd802d7852c5b4ad7be2.pack) is corrupt
```

`git cat-file -t` on it returns `commit`; the header is intact and the payload will not inflate. **Ref reads,
`ls-tree`, `show <ref>:<path>`, `diff` and `merge-base` all work; full-history walks do not** — `git rev-list
--count origin/main` aborts. No repair was attempted from this lane: a repack writes to a store four lanes are
reading, and `git fsck --connectivity-only` is itself a full walk that will stop at the same object. It should
be diagnosed by the one lane that can have the tree to itself, before REL-M. ⚠️ Note that `git merge-tree
--write-tree`, which the handover recommends for the merge dry-run, also writes.

---

### REL-0 · THE PRE-RELEASE GATE — still live, and still owes nearly all of its work

- **Requires now** (the corrected condition list — three of the old names would have read as failures):
  1. **REL-M complete** (above), with `test:all` green **on the merged tree**.
  2. ~~`git diff origin/main...house-bots --stat -- prisma/migrations` shows exactly the 2 house folders~~ →
     **`npm run ops:release-migration-parity` GO.** See §3.4. The expected reading is now **0, and 0 is
     correct**.
  3. Every `red:house-bot-*` harness reddens its own assertion. ⚠️ This is a moving wildcard — `rel-lane`
     carries engine/money/console/c5; `ops-lane` adds ops and chatbot. Re-enumerate after REL-M; never rely on
     a remembered membership. ⛔ A red harness mutates the working tree: verify `git status --porcelain` is
     empty before **and** after every drive.
  4. ~~`drive:house-bots-local`~~ → **`qa:house-bots-local`**. See §3.3 and §7.2.
  5. ~~"coverage gate met"~~ → **`npm run test:scenario-coverage` green, and its printed figure read and
     accepted, not skipped past.** It is a `test:` key, so `test:all` already ran it; the row to read is the
     bracket. This clause discharges itself once ops-lane merges.
  6. **All six house gates outside every pipeline, each named and each run.** See §4. The old row named one of
     six.
  7. `ops:preflight-house-bot-migrations` — ⛔ **ALI'S, ON THE DAY, or NOT MEASURED.** It is a production read.
     No session runs it. See §5.
  8. **The readiness statement**, written out with its measurement, and **the switch-on sheet delivered**
     (REL-6 → `SWITCH-ON-SHEET.md`).
  9. **Ali's go.** See §6 — the "explicitly naming REL-2" clause is struck.
- **Performed by:** a session for 1–6 and 8; **Ali** for 7 and 9.
- **Discharged by:** each condition's own named instrument reporting its own verdict on **this** SHA, with the
  population printed. ⛔ Not by a remembered green from before the merge.
- ⛔ **Two clauses inherited from the old row are struck, and what they protected is re-homed:**
  - **"P0 re-run."** P0's step 3 reads production `_prisma_migrations`; its step 4 ("the worktree is created
    from that SHA") is meaningless 88 commits in. **Struck.** What it protected — that the release SHA is the
    SHA that was tested — is now carried by condition 1 (`test:all` on the merged tree) and condition 2 (the
    parity gate, which reads the refs themselves).
  - ~~**"the S4 rehearsals."** Measured: "rehearsal" appears in no file under `scripts/` and in no package key —
    there is no runnable home for them.~~ ⭐ **UN-STRUCK, 2026-09-21: THE REHEARSALS NOW HAVE A HOME, AND THE
    ROW POINTS AT IT.** `npm run rehearse:list` prints the register; `npm run rehearse:all` runs it. The five
    drills and their measured statuses live in `scripts/rehearsals/registry.mts`, which the runner prints on
    every run, so the population is never invisible. **The condition is now: `npm run rehearse:all` reports its
    verdict, and every `not-built` row it names is read, not skipped past.** ⛔ It cannot exit 0 while a drill is
    owed — that is deliberate, and it is what the struck clause could not do.
    - **Drill 1 (migrations under load) — MOOT by events.** No house DDL is left to apply (§REL-1, §REL-2).
    - **Drill 2 (rollback) — PARTIAL, AND STILL OWED.** `scripts/rehearsals/rollback.mts`, run by
      `npm run rehearse:rollback`. It drives every slice of the drill that exists on this branch and **exits 3,
      never 0** — the registry's `partial` status is counted by `owed()`, so `rehearse:all` cannot go green on
      it, and the runner FAILS a partial drill that ever exits 0. Measured on this branch against a scratch
      Postgres 18.3: **43 passed, 0 failed**, over 4 marked positions, 7 transactions joined to them and 6
      player positions; drift total 0; 1 CASHOUT row present in the database and 0 of them on a marked
      position; `wageredTzs` 0→0 on the house stake and 0→5,000 on the SAME holder's own bet.
      - **§1 · the immutability pin, driven.** `test:house-bot-reports` 0.232.4 pins the two store twins'
        SPELLING; nothing anywhere drove `db.txn.update(id, { houseBotId })` against a database and read the
        COLUMN back, and nothing held the positive control §S3 step 4 asks for — that the same update still
        WRITES its other fields. Both now exist, in both directions, plus `positionId`.
      - **§2 · the drift-free baseline.** Legs (a), (b) and (c) at 0 over a database filled by real
        settlement, VOID, emergency void, a player cash-out and a real agent commission. ⛔ This is NOT the
        rollback: it is the precondition that makes step 4's population READABLE, because if the current SHA
        left leg-(a) rows of its own, nothing after a rollback could tell an old-code row from a new one.
      - 🔴 **AND IT MEASURED SOMETHING NOBODY HAD: drift leg (c1) CANNOT FIRE ON THIS SCHEMA.** It joins
        `Transaction."positionId" = Position."id"` for `type = 'AGENT_COMMISSION'`, and every such row is
        written by `creditInternal` (`wallet-service.ts`) with `positionId: null` — there is no other writer
        of that type. Measured over a real, paid commission: 1 AGENT_COMMISSION row in the database, 0 with a
        positionId. A planted row WITH one is found, so the query is sound and it is the schema that starves
        it. **Leg (c2)'s `sourceRef` rebuild is the only half of (c) that can find commission at all.**
      - **NOT MEASURED, and why:** step 2 (boot the pre-merge SHA) needs a second worktree with its own
        `node_modules`; steps 4–7 need `ops:house-bots-status --drift` and `ops:house-bots-remark`, which are
        keys on `origin/ops-lane` only. **See §10 for the procedure that slots in after REL-M.** ⭐ The
        drill's §0 ARMS ITSELF: it holds the four drift predicates as constants and compares them, character
        for character, against `scripts/ops-house-bots-status.mts` the moment REL-M lands that file.
    - **Drill 3 (two processes) — COVERED, and the claim was opened and checked**, not inherited:
      `house-bot-caps-cases.mts` §8 and `house-bot-engine-cases.mts` each spawn
      `scripts/lib/house-bot-two-process-child.mts` as a real OS process.
    - **Drill 4 (audit burst, CRA-29) — BUILT AND GREEN** at `scripts/rehearsals/audit-burst.mts`, run by
      `npm run rehearse:audit-burst`. Measured on this branch against a scratch Postgres 18.3: 200 house bets,
      5 OS processes, 40 each, 0 unretryable refusals; densest 5 s window 125 bets (25/s); 197 of 199 adjacent
      chain pairs written by DIFFERENT processes; exactly 200 audit rows in the burst window, all
      `market.position.opened`, each carrying `houseBotId` + `intentId` as fields matching its Position;
      `verifyChainFull` valid with 400/400 verified and 0 unverifiable; independently 1 genesis, 0 dangling,
      1 tail, and a GENESIS walk that reaches 400/400. **36 passed, 0 failed.**
    - ⛔ **Drill 5 (two-admin ON, CRA-28) — NOT BUILT. This row previously said it "maps to the reports
      cases", and that was wrong.** Measured: `CRA-28` appears in `house-bot-reports-cases.mts` exactly once,
      inside the ruling-250 coverage ROLL-CALL list at §0 — a list of ids, not an assertion — and
      `scripts/two-admin-policy.test.mts` contains no `houseBot`, `house_bot` or `houseBotId` at all. Nothing
      anywhere resolves a HOUSE-HELD market with `requireTwoOfficer` true. Owed.
    - **So the honest remainder is still drills 2 and 5**, not 2 and 4 — drill 2 now has a script that runs
      every day and is nonetheless NOT discharged, which is exactly what `partial` is for. Measured on
      2026-09-21 with `npm run rehearse:all`: drill 2 NOT MEASURED (43 passed, 0 failed), drill 4 PASS (39
      passed, 0 failed), drill 5 OWED, **runner exit 3**. `rehearse:all` will keep saying so on its own until
      both are built.

---

### REL-1 · THE QUIET HOUR — MOOT AS WRITTEN. The rung moves; it does not die.

- **What it would have proven:** that the `ACCESS EXCLUSIVE` DDL apply landed in a window where the fewest
  players would be hurt by a stall.
- **What now proves that:** nothing, and nothing needs to. There is no DDL left to apply. Both folders are on
  `origin/main` and applied.
- ⛔ **But the risk it existed for is not spent — it has RELOCATED.** The quiet-window judgement now belongs to
  the **switch-on**, which is the first moment house money moves. That is Ali's judgement on the day, informed
  by the preflight's "bets in the last 15 minutes" figure — which the preflight prints **as evidence, never as
  a verdict**, and says so in its own text.
- **Requires now:** nothing from any session.
- **Performed by:** **Ali**, on the day he flips the switch.

---

### REL-2 · MIGRATIONS TO PRODUCTION — ⛔ NOT "done out of order". **BYPASSED**, and what it existed to prevent is what occurred.

This is the correction that matters most, and it is the one place the briefing's framing is wrong.

REL-2's entire purpose was to apply the house DDL **from the build machine while the old container still
served** — *precisely so the migrations would not be applied at container boot*. Measured: `package.json`'s
`start` is `prisma migrate deploy && next start`, on this tree and on `origin/main`. So when Ali pushed on
2026-09-18, the migrations applied **at boot, inside the deploy** — the exact path REL-2 was written to avoid.
The stake is not academic: a migration that fails on production is not a bad deploy, it is the container
refusing to reach `next start`, which on this platform is a **platform-wide sign-in outage**.

- **What it would have proven, in three artefacts:** a pending count of exactly 2; a clean `migrate deploy`
  taken deliberately and watched; each applied row's checksum against the git blob.
- **What now proves them:** ⛔ **Nothing. None of the three was taken.** The risk is **spent, not
  discharged** — it either worked or it did not, and the site is up. That is an outcome, not a measurement,
  and this ladder will not record it as one.
- ⛔ **And the record's proof that it worked cites the WRONG FIELD.** `PROGRESS.md:18` reads *"both house
  migrations (APPLIED — `/api/health` reports `migrated:true`)"*. Measured: `migrated` is `dbPing.tableExists`
  (`src/app/api/health/route.ts:98`), and `tableExists` is set by a `systemConfig.findFirst` probe
  (`src/lib/server/prisma.ts:149`) — a table live since `20260615120000_system_config`. **`migrated:true`
  would read exactly the same on a database with neither house migration applied.** It is a true measurement
  of the wrong population. The field that *does* prove it is one over on the same response: `ok` is `ready`
  (`route.ts:87`), and `ready` requires `houseBotSchemaReady()` (`route.ts:69`), with a 503 otherwise. So
  **`ok:true` / HTTP 200 on production is the correct proof** — and it is a production read, so it is
  **ALI'S, ON THE DAY, or NOT MEASURED**. It is not taken here, and the sentence in the record must not be
  read as though it were.
- **Requires now:** nothing. **The rung is struck for this release.**
- **What survives:** steps 1–5 remain the standing procedure for a **future** house migration, and only that.
- ⛔ **The compliance record needs one correction.** `docs/COMPLIANCE-DECISIONS.md:351-352` records an
  exception to the rule that "migrations reach production only through the deploy". That exception was
  **never exercised** — the DDL went in through `start`'s ordinary `prisma migrate deploy`. The entry should
  record that, and its closing sentence ("Ali's release 'go' must name it") is the origin of the stale clause
  struck in §6.

---

### REL-3 · CHECKS WHILE THE OLD CONTAINER STILL SERVES — MOOT. It describes a window that never opened.

- All four of its checks are qualified *"while the old container still serves"* — the gap between REL-2 and
  REL-4. Code and DDL travelled together in one push, so that gap has **no duration**. There is nothing to
  check in it.
- **What it would have proven:** that the old build ran correctly on the new schema before the new build
  arrived — the expand-only promise, tested live.
- **What now proves that:** the local gate **`verify:house-bot-migrations-old-build`**, which runs the
  previous build's money path on the new schema against a scratch database. ⛔ It is currently in **no
  pipeline** (§4.2), which is precisely why this rung must name it rather than assume it.
- **Requires now:** nothing on the live service. Its one durable clause — `HouseBotControl.enabled = false` —
  is not a release check any more; it is the **standing posture**, held by the lock described in §8.

---

### REL-4 · MERGE AND DEPLOY — DISCHARGED BY EVENT, PARTLY EVIDENCED, and the most damaged rung as written.

- **The event is real.** `origin/main` = `418f1b59`, carrying both migration folders, the engine modules under
  `src/lib/server/house-bot/`, the eight `HouseBot*` models (`HouseBotControl` at `prisma/schema.prisma:1941`,
  `enabled Boolean @default(false)` at `:1943`) and 30 house npm keys.
- **What it would have proven and did:** a conflict-free merge at a green checkpoint, deployed as one commit.
- **What it would have proven and did NOT:**
  - **Step 1's `overlapSeconds`** — never recorded, so whether an outage was expected was never established.
    ⛔ It stays **NOT MEASURED, permanently, and the reason is named**: the live Railway service config is
    forbidden to this programme. It is not a gap we forgot; it is a reading this programme may not take.
  - **Step 3's conflict escape hatch** ("stop and re-run REL-0") never fired — because there was no conflict
    **and** no REL-0.
- ⛔ **Step 2's recipe is built on a measured falsehood, and the recipe is struck.** Its stated reason is that a
  fresh release worktree has no pre-push guard. **Measured on this lane:** `git config --show-origin --get
  core.hooksPath` resolves through this worktree's own `config.worktree` to the house-bots hook, and that hook
  refuses `refs/heads/main` by name. **A release worktree arrives ARMED, so step 2.4 is refused.** The guard's
  message is keyed to "before REL-4", so it blocks the very recipe meant to satisfy it — circular. The
  sanctioned route is a push from `C:/kipindi-main`, the only checkout with no `hooksPath`; a push is a pure
  ref update and does not breach the prohibition on working there.
- ⛔ **What remains of this rung is NOT "the deploy".** The branch's code is already on `main`. What remains is
  a push of the three lanes' *remaining* work, after REL-M.
- ⛔ **`docs/COMPLIANCE-DECISIONS.md:383`, accepted risk 21 — "REL-4 asks for one" — is struck** by the owner
  ruling of 2026-09-20 that the Gaming Board needs no documents. Remove the clause; do not rebuild a Board
  deliverable. The risk it names is unchanged and accepted.

---

### REL-5 · POST-DEPLOY CHECKS — NOT DISCHARGED. Half was taken; the house half never was, and cannot be from here.

- **Taken on 2026-09-19:** the `dpl=` SHA matched `origin/main`, and `/api/health` names nothing about house
  bots. The second of those was re-verified here **against the code rather than the record**: the only
  `houseBots`/`houseSchema` references in `src/app/api/health/route.ts` are at `:68`, `:69` and `:71`, all
  internal or server-log, none in the response body. Ruling 171 holds.
- **Not taken, and not takeable from any lane:** `ops:house-bots-status` showing OFF / 0 bots / 0 marked rows
  / beats fresh, and the +10-minute recheck of 0 marked rows and 0 `HOUSE_BOT` notifications. That command did
  not exist on 2026-09-19 and still does not exist on `main` or on this branch — it arrives with REL-M.
- **Requires now:** ⛔ **ALI'S, ON THE DAY.** Every one of its five bullets is a production read. What survives
  is a post-merge check of the *next* deploy, performed by someone allowed to look. Its `--watch` flag **is**
  the +10-minute recheck.
- ⚠️ **Citation drift, corrected:** the row cites "PLAN §12 + §15 phase F". `PLAN.md` §12 is the suite table
  and §15 phase F is the **legal-pages design phase** — neither is a production check. The citation is struck
  rather than followed.

---

### REL-6 · THE FIRST SWITCH-ON GUIDE — **THE ONLY RUNG THAT IS FULLY VALID, ENTIRELY LOCAL, AND STILL OWED.**

It is also the one Ali actually asked for, repeatedly.

- **Requires now:** the guide, in plain language, for a non-technical reader: what to set before he flips, the
  exact ceremony on screen, what to watch in the first fifteen minutes, the signs that mean stop, exactly how
  to stop in order including the case where the admin screen will not load, and an honest list of what could
  not be checked from here and why.
- **Performed by:** a session writes it; **Ali** reads it.
- **Discharged by:** ✅ **`plans/house-bots/SWITCH-ON-SHEET.md`, delivered 2026-09-21.**
- ⚠️ It is delivered as its own file because `docs/HOUSE-BOTS.md` §11's "First switch-on" is still
  `⏳ Written in commit 8` on this branch, and the same section has been rewritten on `ops-lane` — editing it
  from here would be a direct conflict. After REL-M, §11 and this sheet should be reconciled into one, with
  the sheet as the copy Ali is handed.

---

### THE UNNUMBERED ROW · **ALI SWITCHES HOUSE BOTS ON**

Unchanged, and nothing measured on this lane moves it. His action, and his alone.

⛔ **This row exists in exactly ONE place in the whole ladder** — `PROGRESS.md:676`, unnumbered, after REL-6.
Verified by grep across `plans/` and `docs/`: it is **absent from amendment S2** (whose table ends at R6),
**absent from `00-NEW-SESSION-PROMPT.md`'s REL table** (ends at REL-6), **absent from `README.md`**, and
`docs/HOUSE-BOTS.md` §11's "First switch-on" is a placeholder on this branch. Only the weaker D1 form survives
elsewhere. **A session following S2 or the session prompt to the end finishes at "handover note delivered"
with nothing telling it the switch is not its own.** That is a structural hole, and this file closes it by
carrying the row in every rung's framing: §0, REL-0's condition 9, REL-6, and here.

⚠️ **And the button now exists.** Until Commit 7 the ON path was a data-layer method with no caller under
`src/` at all; there is now a real ceremony on the desk. "No session turns it on" is now a rule about a live
button, not about a hand-written SQL statement. It is also worth recording plainly that **any admin can
reverse OFF or Remove** — that is accepted risk 12, unchanged.

---

## 3 · THE RELEASE INSTRUMENTS — named, because the ladder was written before they existed

All four are on **`origin/ops-lane` only**. Read read-only from this lane via `git show origin/ops-lane:…`.
⛔ None exists on `rel-lane`, `origin/house-bots`, `origin/main` or `origin/alerts-lane` — measured key by key.

**3.1 · `ops:preflight-house-bot-migrations` — the migration preflight.**
Read-only; no DDL, no DML, no transaction; exits 0 GO / 1 NO-GO. Seven sections. The eight house tables and
seven marker columns are **imported** from the engine's own readiness module, so it cannot pass a database
`/api/health` would reject. Its **five** index names are read off the migration file, never typed, and each is
checked through `pg_index.indisvalid` — because a failed `CREATE INDEX CONCURRENTLY` leaves an INVALID index
under the same name and `IF NOT EXISTS` keeps it, so a by-name check cannot see it. The timezone line is a
**verdict, not a print**, because a wrong-zone database applies both migrations cleanly, reports a healthy
deploy, and then the engine silently never starts — green everywhere, and nothing running. Its `--post`
hand-apply branch is **deliberately not built**, with the reason recorded.
⛔ **It reads production. It is ALI'S, ON THE DAY. No session runs it.**

**3.2 · `db:seed-house-bots-local` — the local seed.** The house-bot world a human can open in a browser.
Deliberately not run through the scratch runner's `--run`, which would stop the cluster on exit and leave
nothing to open. ⚠️ Documents call this `seed:house-bots-local`; **that key does not exist.**

**3.3 · `qa:house-bots-local` — the local end-to-end drive.** The only instrument where the real engine
decides and fires on a real clock against a real database: armed timers, leadership lease, claim, fire,
durable row. ⭐ **It turns the master switch ON** — on a loopback scratch database it creates and drops itself,
refusing a non-loopback URL and refusing `NODE_ENV=production`. That is not a contradiction of §0: it is a
throwaway local database, not the platform. ⚠️ Documents call this `drive:house-bots-local` in twelve places;
**that key has never existed on any branch.**

**3.4 · `ops:release-migration-parity` — the replacement for REL-0 condition (c).**
⛔ **Do not reinvent it.** It is written as a **rewrite, not a deletion**, and it answers the old row in the
old row's own words: REL-0(c) as originally written reads 0 here, **and 0 is now the correct answer**. It then
checks the three things that do still decide whether a deploy boots:
1. **Byte parity** of every migration folder both refs carry. `migrate deploy` compares each applied
   migration's recorded checksum against the file it finds; one edited byte in an already-applied migration —
   a tidied comment, a CRLF round-trip through an editor — fails the deploy before `next start` is reached.
   EOL-only differences are reported separately because the fix differs, and both are stoppers.
2. **Forward difference** — folders this branch has that the ref lacks. DDL that applies the moment the new
   container starts. Zero is expected; anything else must be named in Ali's go.
3. **Reverse difference** — folders the ref has that this branch lacks. The branch is behind; merge first.

Exits **0 GO · 1 NO-GO · 2 refused · 3 NOT MEASURED** on an unresolvable ref. **It writes nothing, touches no
database and never fetches** — a gate that quietly fetched would change the thing it measures in the act of
measuring it. ⛔ **Exit 3 is NOT MEASURED and is never GO**; the operator runs `git fetch` themselves.
⛔ It refuses to become a `test:` key, because it reads a remote-tracking ref whose freshness is a property of
the machine and not of the code. ⭐ **And the original reading still bites:** run against a ref that does not
carry the house DDL, it names the folder and **re-instates REL-2 automatically**.
**Today's reading, re-derived by hand: 82 folders both sides, forward 0, reverse 0 — which is what GO looks
like.** ⚠️ An ops-lane record says 81 shared folders on 2026-09-20; both are true on their day, `main` gained
one since, and that is exactly why this ladder carries no recorded count.

**3.5 · A fifth instrument the brief did not count: `test:scenario-coverage`.** The whole-register coverage
gate REL-0 asks for. ⭐ **Because it is a `test:` key it runs inside `test:all`** — so REL-0's old manual
"coverage gate met" clause discharges itself once ops-lane merges. Its header carries the amendments-index
trap: 188 of 281 register ids are carried into `04-amendments.md` under lettered amendments, and the suites
cite *that* index, so grepping `scripts/` for a register id searches the wrong index and manufactures a
~267-row hole that does not exist. It names the four rows that read backwards against the shipped product and
holds them as a **ceiling**, so a fifth cannot arrive unnoticed.

**3.6 · A SIXTH, BUILT ON THIS LANE ON 2026-09-21: `rehearse` — the S4 rehearsals' runnable home.**
⭐ **This is the one instrument in this list that is NOT on `ops-lane`** — it is on `rel-lane`, and it exists
because the REL-0 clause that named "the S4 rehearsals" was struck for pointing at nothing.
- `npm run rehearse:list` — the register of all five drills, with each one's measured status. Runs nothing.
- `npm run rehearse:audit-burst` — drill 4 (CRA-29), against a scratch Postgres the run creates and drops.
- `npm run rehearse:rollback` — drill 2 (S3), the slices of the rollback that exist on this branch. ⛔ It
  exits 3 by contract even when every assertion is green, because three of its steps cannot be taken here.
- `npm run rehearse:all` — every built and partial drill, then the whole register.
- ⛔ **Exit 3 is NOT MEASURED and it is not a pass.** `--all` cannot exit 0 while any drill is `not-built` **or
  `partial`**, so the rung stays honest without anyone having to remember a struck clause in a document. And a
  `partial` drill that ever exits 0 is reported by the runner as a FAILURE, not laundered into a green row.
- ⛔ **The register is code, not prose** (`scripts/rehearsals/registry.mts`), and the runner prints it on
  every run — so the POPULATION is on the record of each run, not only the rows that happened to execute.
- 🔴 **AND IT WEAKENED AN EXISTING GATE ON ITS FIRST DAY — MEASURED, AND FIXED, 2026-09-21.** `§0.250` of
  `house-bot-reports-cases.mts` gives each of ruling 250's 49 ids three doors: found in the tree, struck whole
  by D20, or **named with a reason in `DEFERRED-TESTS.md` row 83** — the strict door, whose own text says "the
  list can no longer shrink in silence". The register's prose spelled two ids that NOTHING drives, and a bare
  mention is all `§0.250` looks for. Driven: the gate reported **9 found / 33 deferred** where row 83's own
  re-derivation says 7 / 35 and claims all 35 appear in exactly one file. Two ids had walked out of the
  un-shrinkable list and nothing said so. The first measurement of this side effect stopped at "the verdict is
  unchanged" — true, and not the whole question: **the verdict did not move, the door did.** Fixed by not
  writing the strings: the register now spells only drill 4's id, which `audit-burst.mts` drives to green
  every run, and drill 5's row points at where its id IS declared instead of repeating it. ✅ **Re-driven after
  the fix, same command, same day: 49 ids · 2,267 files · 7 named in the tree · 35 deferred by name ·
  UNDECLARED [].** The 7 are the original 7 and none of them is ours, control `0.250.c1`'s deferred sample is
  a real one again, and row 83's re-derivation is true again. ⛔ Fixed on the side that broke it — no other
  lane's file was touched. ⭐ The general
  lesson for anything added to `scripts/`: **a scanner that treats a mention as coverage is defeated by any
  new file that is merely well-documented**, and the fix is never a comment saying so — the scanner cannot
  read it.
- ⚠️ The five keys above are the only `rehearse*` keys, and they exist **on `rel-lane` only** — re-measured on
  2026-09-21 after `rehearse:rollback` was added: 5 on `rel-lane`, 0 on `origin/main`, 0 on
  `origin/house-bots`, 0 on `origin/ops-lane`, 0 on `origin/alerts-lane` — measured with
  `node -e` against `package.json`, because `npm run -s <a name that does not exist>` exits 1 with an empty
  log in about a second and reads exactly like a failing suite. (That trap is already sitting inside this
  ladder's own §REL-0 condition 4 as the phantom `drive:house-bots-local`.)

---

## 4 · THE HOUSE GATES IN NO PIPELINE — named individually, because they share no prefix

**Method.** A gate is in a pipeline if it is a `test:*` key (hence inside `test:all`, `scripts/test-all.mjs:44-46`,
a structural enumeration) or is reached by `.github/workflows/ci.yml`. `predeploy` is not a pipeline (§1).
Population: house-**bot** keys that render a release verdict — excluding operator actions, seeds and pure
screenshot captures. Measured by parsing `package.json` against both, on this branch.

⚠️ **Correcting the count in the brief: there are SIX, not five. REL-0 names ONE, so FIVE are unnamed.**

| # | Gate | What it alone proves | Named by the old REL-0? |
|---|---|---|---|
| 4.1 | **`verify:house-bot-bundle`** | D19 in the **shipped artefact**: a real `next build`, then every chunk scanned. Shown able to fail — 320 house words in public JS before the D19 un-build, 0 after. ⛔ Client component **prop names** survive minification into public chunks; nothing else catches that. | ❌ |
| 4.2 | **`verify:house-bot-migrations-old-build`** | The **previous build's money path on the new schema** — the expand-only promise. This is also what now stands in for the struck REL-3. | ❌ |
| 4.3 | **`qa:house-bot-holder-view`** | D19c per **served page**: ten pages served to a real holder, **RSC payloads read whole**. A per-request payload can carry a house id to the browser and no static scan sees it. | ❌ |
| 4.4 | **`qa:house-bot-bells`** | Every bell written by the real emitters and read in a browser. ⚠️ The admin bell **panel** with house rows is currently recorded **NOT MEASURED**. | ❌ |
| 4.5 | **`qa:house-bot-console-probe`** | The **served** proof of the console gate — "a layout is not a gate". It is the one that caught a signed-in player, the holder and a trigger player receiving house stakes and bot ids at status 200, and it asserts the ADMIN control **fires** on every route instance. A non-firing control is the failure mode that makes "0 leaks" meaningless. | ❌ |
| 4.6 | **`qa:house-bots-visual`** | The desk rendered across the width ladder — the only thing that catches a defect that ships green. It derives its routes from the console tab list, so a later tab is inside the gate on the day its panel lands. | ✅ **the only one** |

⭐ **Three of the five unnamed gates are the only proofs of D19 in the shipped artefact, in the served page and
in the audience.** A gate not in the pipeline is not a gate. **REL-0 condition 6 now names all six
individually** — a wildcard cannot reach them, because they share no prefix.

⚠️ **Two documents CLAIM a gate runs at REL-0 and are FALSE** — verified by grepping the REL-0 rows themselves
for each key, both returning zero:
- `scripts/verify-house-bot-bundle.mjs:19` — *"the commit's closing gates and REL-0 run it"*.
- `docs/HOUSE-BOTS.md:817` — *"it runs at the commit-1 gate and again at REL-0"*.

That is this programme's own named failure mode: a document true about the tree and false about its own
authority. Condition 6 makes both sentences true rather than deleting them.

**The four `red:house-bot-*` harnesses** are also outside every pipeline, but deliberately — a red harness
mutates the working tree — and REL-0 does name them as a family.

**⚠️ Re-derive this table after REL-M.** `verify:house-bot-bundle` moves into `predeploy` (still not a
pipeline), and `qa:house-bot-panel-states` joins the list. Same count, different membership.

---

## 5 · EVERY CLAUSE THAT ASKED A SESSION TO TOUCH PRODUCTION — all eight, and what each becomes

⛔ Not one of these survives as a session instruction.

| # | The old clause | Becomes |
|---|---|---|
| 1 | P0 step 3 reads production `_prisma_migrations`, pulled into REL-0 by "P0 re-run" | **STRUCK** (REL-0). What it protected is re-homed to conditions 1 and 2 |
| 2 | REL-1's quiet-hour preflight reads live bet counts | **ALI'S, ON THE DAY** — and the judgement relocates to the switch-on |
| 3 | REL-2 steps 1–4: `migrate status`, `migrate deploy`, checksum verify, `migrate resolve`. **The only WRITE** | **STRUCK for this release.** Standing procedure for a future house migration only |
| 4 | REL-3's four live reads | **STRUCK** — the window never opened. Re-homed to `verify:house-bot-migrations-old-build` |
| 5 | REL-4 step 1, the live service config (`overlapSeconds`) | **NOT MEASURED, permanently, reason named:** this programme may not read the live service config |
| 6 | REL-5's five post-deploy reads | **ALI'S, ON THE DAY**, with `ops:house-bots-status --watch` as the +10-minute recheck |
| 7 | L9: production `TimeZone` must be UTC, "REL-0 checklist" | **ALI'S, ON THE DAY** — the preflight is its instrument and its timezone line is a verdict, not a print |
| 8 | `00-NEW-SESSION-PROMPT.md:101` — *"**Production access** is read-only through `railway login` … Never write to production before REL-2."* | ⛔ **THE DANGEROUS ONE. This is the line a session would cite as permission**, and it is flatly contradicted by ruling 553 and by the standing law. It must be corrected at source, in the prompt every new session reads |

---

## 6 · THE GO-AHEAD CLAUSE — rewritten

**Old:** *"checklist sent to Ali, and his 'go' received, **explicitly naming REL-2**"*.

⛔ **Struck.** REL-2 is done and gone. Asking Ali to name it would be asking him to authorise the past — and a
clause an operator cannot satisfy honestly is a clause they wave through.

**New, and it is one ask, at the end, for one thing:**

> The checklist goes to Ali with every condition's measured value or an explicit NOT MEASURED and its reason —
> **no blanks**. It tells him plainly that REL-2 is **struck for this release**, that this **removes a manual
> production write** from it, and that this changes what he is approving, so it is put to him rather than
> edited away quietly. Then a session states, in writing and on that evidence, that it is **ready**. Then Ali
> decides. **The only thing his go authorises is the switch, and only he performs it.**

⚠️ **Two authorities disagreed about what the go must contain** — `PROGRESS.md:669` demanded it name REL-2,
while amendment S2 asked only for "Ali's one-word 'go'". Both are superseded by the paragraph above. And a
**one-word go** was never an adequate gate on a major release: S2's GO-when column reads "≥10-min window",
"both rows finished", "all true", "build green", "all true", "—" from R1 onward, so **from R1 the ladder
authorised itself**, and R6's gate was a dash. That is closed here: the owner appears at the end, once, for
the switch, and nothing between R1 and R6 is a substitute for it.

⛔ **The machine GOs are not permission.** "preflight GO" in a checklist is one word away from "we have a GO".
Both instruments guard themselves in their own headers — *"a recorded verdict rots"*, *"NOT MEASURED is never
GO"* — and this ladder says it once more plainly: **a GO is a reading. Permission is a person.**

---

## 7 · CLAIMS IN THE RECORD THAT ARE FALSE — each verified here, not inherited

1. ⛔ **Amendment S2's only declared proof does not exist.** S2 states *"`test:docs` greps the R0–R6 headings
   in HOUSE-BOTS.md"*. Measured: `test:docs` is `scripts/docs-links.mjs`; `grep -in "house\|r0\|r6\|release"`
   over that whole file returns **zero hits**, and `grep -rn "R0–R6\|R0-R6"` over `scripts/` and `src/`
   returns **nothing**. **S2 is a MAJOR amendment whose only declared test was never built.** ⭐ And had the
   grep existed it would have **passed over five `⏳ Written in commit 8` placeholders** — a heading-shaped
   proof over an empty body, which is this programme's named failure mode.
2. ⛔ **S2's stated targets are both wrong.** It claims to replace *"the §11 'Release' paragraph and the §17
   RELEASE block"*. Measured: `docs/HOUSE-BOTS.md` has **14** `##` sections and **no §17**; the "§17 RELEASE
   block" is in a *different document*, `PLAN.md:800-803`. And §11's "Release (R0–R6)" still reads
   `⏳ Written in commit 8` on this branch, as do Migration preflight, Rollback levers, Sunset and First
   switch-on. **S2 has never been applied to either target.**
3. ⛔ **`drive:house-bots-local` has never existed on any branch.** Measured on all five refs: absent. The real
   key is `qa:house-bots-local`. Run as written, `npm run -s drive:house-bots-local` **exits 1 with an empty
   log in about a second** — at a release gate that reads either as a mystery failing suite or, worse, as a
   box an officer ticks. Same for `seed:house-bots-local` → `db:seed-house-bots-local`.
4. ⛔ **The REL-4 worktree recipe's stated reason is false** — a fresh worktree **does** inherit the pre-push
   guard. Measured on this lane (§REL-4).
5. ⚠️ **`PROGRESS.md:15` — "0 behind and 76 ahead".** Re-derived: **0 / 88**.
6. ⚠️ **`docs/HOUSE-BOTS.md:817` and `scripts/verify-house-bot-bundle.mjs:19`** both assert a gate runs at
   REL-0 that REL-0 did not name (§4).
7. ⚠️ **`PROGRESS.md:18` cites `migrated:true` as proof the house migrations applied.** Wrong field; wrong
   population (§REL-2).
8. ⚠️ **The stale no-push side.** `PROGRESS.md:70`, `00-NEW-SESSION-PROMPT.md:10-12,38` and
   `README.md:96-98` all still say "never push `main` before REL-4". Ruling 555 records the owner discharging
   that. Four documents carry the stale side; one ruling carries the live one.
9. ⛔ **`C6-SPEC-EXTRACT.md:490` owes REL-0 a version-re-derivation line. Do NOT add it — moot twice.** D19a
   freezes all legal text, and measured on both refs the terms versions are byte-identical on `origin/main`
   and `house-bots`.

**And one dangling citation, resolved rather than left hanging.** `scripts/house-bot-migrations.test.mts`
deliberately declines to assert "the house folders are the newest", delegating it to *"REL-0's migrations
diff, the commit-8 preflight"*. REL-0's migrations diff is permanently 0; the preflight has no recency check;
the parity gate has none either and points back at the test. The delegation is circular and the fact is
unowned. ⭐ **The honest resolution is that the requirement is MOOT, not missing:** both folders are applied on
production, so being outsorted by a later `main` migration can no longer misorder this release. What survives
permanently is the assertion that **no other migration sorts between the two house folders** — which *is* in
`test:all` and *is* the part that stays true for ever.

---

## 8 · THE POSTURE THIS LADDER PROTECTS — one lock, stated correctly

⛔ **Never write "defence in depth" here.** The record said "two independent locks" and that was inverted on
the second one — and it was the row Ali reads before flipping, concluding that a mis-flip would be harmless.

- **The one enforced lock:** `HouseBotControl.enabled`, `BOOLEAN NOT NULL DEFAULT false`
  (`prisma/migrations/20260916150000_house_bot_tables/migration.sql:120`; `prisma/schema.prisma:1943`).
  Refused at **five** sites, re-verified by grep this session: `fire.ts:112`, `seam.ts:119`, `seam.ts:332`,
  `planner.ts:188`, `trigger.ts:118`.
  ⚠️ **Two citation corrections:** `seam.ts:115` is the *read*, not the refusal — the refusal is `:119`. And
  `planner.ts:466` is **not** a refusal site: it is `if (control.enabled && control.gCapDailyLossTzs != null)`,
  the daily-loss stop, which requires `enabled` **true**. The planner's refusal is `:188`. (`trigger.ts:444`
  is likewise a cache line, not a refusal.)
- **The kill switch is not a second lock.** `houseBotEngineEnabled` is `return env !== "false"`
  (`src/lib/server/house-bot/engine.ts:136-138`), so with the variable **unset the engine STARTS**. Its
  absence is the *enabling* condition. It is a kill switch someone must actively set.
- **The platform is safe — by one well-enforced lock**, and that sentence is the true one.
- ⭐ **And the fire path fails CLOSED.** Every fresh read either answers or throws, and every throw becomes a
  requeue, never a stake. So "the database is unreachable" is a full stop, not a runaway. The only state that
  keeps money moving is: app reachable **and** database reachable **and** switch ON.

---

## 9 · WHERE THE OLD ROWS NOW POINT

A one-line dated pointer has been added to `PROGRESS.md`, `04-amendments.md` (S2) and
`00-NEW-SESSION-PROMPT.md`. Their tables are left standing, unrewritten, so three lanes' concurrent edits
still union-merge.

⛔ **Deliberately NOT edited from this lane, and why:**
- **`PROGRESS.md`'s REL-0 row.** `ops-lane` has already rewritten it — the condition-(c) replacement, the
  parity gate by name, the REL-2 strike and the removal of the "name REL-2" clause are all there. Re-fixing
  them here would manufacture a three-way conflict on the one row both lanes changed. This file reconciles
  with that rewrite and extends it to the rungs it did not touch.
- **`docs/HOUSE-BOTS.md` §11.** `ops-lane` has replaced all five placeholders with real sections. Any edit in
  that range from here is a direct conflict.
- **`plans/house-bots/DEFERRED-TESTS.md`.** Two lanes are writing it now; highest id in use measured today is
  **96**. Nothing here needed a row, and a row added into a live conflict site for no gain is a cost.

## 10 · S4 DRILL 2 · THE ROLLBACK REHEARSAL — PARTIAL, and the procedure for the rest

**Status on `rel-lane`, 2026-09-21: PARTIAL — built, green on every slice it can drive, and STILL OWED.**
`scripts/rehearsals/rollback.mts`, `npm run rehearse:rollback`. **43 passed, 0 failed, exit 3.** Not
"passed", not "waived". Two of its four steps cannot be taken from this lane, and both reasons are structural
rather than a matter of effort:

1. ⛔ **Its instruments are on another branch.** `ops:house-bots-status` and `ops:house-bots-remark` exist as
   keys on `origin/ops-lane` only (measured in `git show origin/ops-lane:package.json`). They were read
   read-only for this section; they were **not merged**, because lane 2 is renumbering the register inside
   that branch at this moment and a merge would pull a half-finished id space into the release tree.
2. ⛔ **Step 2 is not a script.** "Boot the pre-merge SHA" means a second worktree checked out before the
   house commits, with its own `node_modules` and a Prisma client that has no `houseBotId` — and installing
   dependencies is outside what any lane may do here. Simulating old code by hand-writing an unmarked
   `Transaction` row would rehearse the DRIFT DETECTION, not the ROLLBACK, and calling that "drill 2" would
   be the kind of true-measurement-of-the-wrong-population this ladder exists to refuse.

### What the drill DOES drive, on this lane, today

All of it against a scratch Postgres 18.3 the run creates and drops (`hb_reh_rollback_<pid>`), through the
real services and the real DAL. Every assertion carries a planted control; every refusal carries a positive
control naming something that must still be ALLOWED.

- **§0 · a divergence pin that ARMS ITSELF.** The four drift predicates the drill runs are transcribed from
  ops-lane's `ops-house-bots-status.mts` (read read-only, `git show`) and held as named constants. While that
  file is absent the pin prints NOT MEASURED and lists the four predicates; **the moment REL-M lands the file
  in this tree, §0 starts comparing them character for character and the drill goes RED if the two copies of
  the query have drifted apart.** A transcription nobody can check is a second authority; this is the thing
  that stops it becoming one.
- **§1 · the immutability pin, DRIVEN — step 9 of the procedure below.** `test:house-bot-reports` 0.232.4
  already pins this, but it pins the SPELLING: it greps both store twins for the line that drops the key.
  Nothing anywhere drove `db.txn.update(id, { houseBotId })` against a database and read the **column** back
  (not the mapper), and nothing anywhere held the POSITIVE CONTROL §S3 step 4 actually asks for — that the
  same update still WRITES its other fields. A drop that swept in the whole patch would have left 0.232.4
  greener than ever while the ledger quietly stopped being updatable. Driven: re-mark refused, un-mark
  refused, `positionId` refused, each with its own positive control in the SAME call; a planted control runs
  the pre-fix `{ ...row, ...patch }` over the SAME patch objects and shows all three DO change; and an
  ordinary unmarked row still takes an ordinary update in full.
- **§2 · the drift-free baseline.** Legs (a), (b) and (c) run over a database this run filled with real money
  movement — a settlement, a VOID, an emergency void, a player cash-out, a real agent commission — and all
  report 0. ⛔ **This is not the rollback and does not pretend to be.** It is the precondition that makes step
  4 READABLE: if the current SHA left leg-(a) rows of its own, then after a rollback nobody could tell an
  old-code row from a new-code one and `remark` would be filling markers onto rows nobody understood. Each
  leg prints its population (4 marked positions, 7 transactions joined to them, 6 player positions; 1 CASHOUT
  row present and 0 on a marked position; 1 AGENT_COMMISSION row paid) and each carries a planted control
  that writes the exact shape the pre-merge SHA writes and requires the leg to find it, once, by id.
- **§3 · wagering, which no drift query can ever see.** `BonusGrant` carries neither `positionId` nor
  `houseBotId` — measured from `information_schema`, 16 columns, not assumed — so that half of leg (c) is
  unmeasurable in SQL for ever. The only defence left is that the current code never accrues it, so the drill
  drives that instead: the holder placed a 5,000 HOUSE stake while holding an ACTIVE grant and `wageredTzs`
  did not move; **the SAME holder's own 5,000 player bet on a different market moved it to 5,000** — so the
  skip is keyed on the house marker and not on the account. (A different market on purpose: a bet on the
  opposite side of one already held is a HEDGE, which `buyPositionInner` also skips, and a control that
  tripped that rule would have proved nothing.)

🔴 **AND THE DRILL FOUND A REAL PROPERTY OF LEG (c1) THAT NOTHING ELSE WOULD HAVE.** Leg (c1) joins
`Transaction."positionId" = Position."id"` for `type = 'AGENT_COMMISSION'`. Measured over a commission the
fixture actually paid, by reading **every** such row in the database: 1 row, 0 with a positionId. ⚠️ The
measurement is of the ROWS; the explanation is a read of `src/` and is stated as one — the single
`type: "AGENT_COMMISSION"` in the platform is `policy.txnType` (`affiliate-service.ts:447`), which reaches the
ledger through `creditInternal` (`wallet-service.ts`), and that writer hardcodes `positionId: null`. So
**leg (c1)'s 0 is a 0 over an empty population**, and leg (c2) — which
rebuilds the deterministic `referral:commission:<marketId>:<positionId>` — is the only half of (c) that can
find commission at all. ⚠️ The query itself is sound: a planted AGENT_COMMISSION row WITH a marked
`positionId` IS found by it, exactly once. It is the schema that starves it. **Whoever reads a clean
`--drift` after a rollback should read leg (c1) as "not measurable on this schema", not as "clean".**

### The procedure, once ops-lane has merged

Run it against a **scratch Postgres**, never production. Every step names what it must print.

| # | Command / act | What must be true |
|---|---|---|
| 0 | `npm run rehearse:rollback` | The slices that exist today run and pass, and it **exits 3**. Its §0 pin now finds `scripts/ops-house-bots-status.mts` in the tree: if the drift predicates have drifted apart, this step goes RED **before** anything below is trusted. Flip the registry row from `partial` to `built` only when steps 1–9 have run. |
| 1 | Boot a scratch database, seed the house world, leave **3 open marked positions** | 3 `Position` rows with `houseBotId` not null and no settlement. ⚠️ `scripts/rehearsals/rollback.mts`'s own fixture already builds this shape through the real services — reuse it rather than writing a third one. |
| 2 | Boot the **pre-merge SHA** against that same database; settle the market; cash one position out | Old code has no `houseBotId` in its client, so its payout/refund/cash-out `Transaction` rows are written **unmarked** |
| 3 | Return to the house SHA | — |
| 4 | `npm run ops:house-bots-status -- --drift --since 30` | Leg (a) lists **exactly** the rows step 2 wrote; leg (b) lists the CASHOUT on a marked position; leg (c2) lists the commission REWARD rows. ⚠️ **Leg (a) is time-bounded and an unbounded run is REFUSED** — `Transaction` has no index on `positionId`. ⚠️ **Leg (c) prints the WAGERING half as unmeasurable, not as 0** — wagering is a counter on `BonusGrant`, which carries no `positionId`. A `0` there would be a true measurement of the wrong population. 🔴 **AND READ LEG (c1) THE SAME WAY.** Measured 2026-09-21 by the drill: every AGENT_COMMISSION transaction is written with `positionId: null`, so (c1) can never match — its 0 is a 0 over an empty population, not a clean result. (c2) is the half that fires. |
| 5 | `npm run ops:house-bots-remark` (no flag) | A **dry run**: it prints every row it would touch and writes nothing |
| 6 | `npm run ops:house-bots-remark -- --apply` | ⛔ **Refused while the master switch is ON** (guard G5) — so the switch must be OFF and open marked positions 0 first. It re-marks **`Transaction` rows only, never `Position` rows**, taking the value from the JOIN and never from a flag; it reconciles the counted plan against the `RETURNING` count inside one transaction and re-runs drift leg (a) inside that same transaction, requiring **0** before it commits |
| 7 | `npm run ops:house-bots-remark -- --apply` again | **0 rows changed** — the WHERE is `t."houseBotId" IS NULL`, so it is NULL-filling and a second run is a no-op |
| 8 | Re-read the house book against the ledger | The realised figure equals the ledger |
| 9 | The immutability pin | ✅ **ALREADY DRIVEN — `npm run rehearse:rollback` §1, on this branch, today.** `txn.update` with a `houseBotId` changes nothing, in both directions, and `positionId` cannot be added either; each refusal read back from the COLUMN, each with its positive control in the SAME call, plus a planted control running the pre-fix spread over the same patch objects. Re-run it after step 6 as well: `remark` is the one sanctioned raw-SQL exception to markers-on-create-only, and this is what says the exception is still the ONLY way in. |
| 10 | Legs (b) and (c) | ⛔ **Nothing is clawed back automatically.** They go into a COMPLIANCE-DECISIONS note with amounts, per §S3 |

⛔ **Do not record this drill as run until step 4 and step 6 have each printed their own population.** "Drift
reported 0" over a window that excluded the rows is the exact failure this drill exists to catch.

---

**After REL-M, one session should reconcile:** this file with ops-lane's §11 and REL-0 row; the status cells
for REL-2/REL-3/REL-4, which still read ⬜ on **all three branches** against events that already happened, so
the status column and the prose contradict each other; the phantom `drive:house-bots-local` wherever it
survives; and the eight false claims in §7 at their sources.

---

*Written on `rel-lane`, 2026-09-21. Nothing in this file turns the master switch on, asks for it to be turned
on, or treats a green gate as permission. That remains Ali's act, and his alone.*
