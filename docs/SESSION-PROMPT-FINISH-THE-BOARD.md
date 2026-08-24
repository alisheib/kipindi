# FINISH THE BOARD — what is left, and why each one is still open

> **Supersedes `SESSION-PROMPT-CLOSE-THE-BOARD.md`.** That commission's Unit A is
> shipped and its Unit E was ruled closed; everything else is carried here with its
> state re-derived rather than copied. If the two disagree, **this file is newer and
> this file wins** — but check `docs/LIVE-QA-CAMPAIGN.md` §6 first, because the
> register outranks both.

---

## §0 · WHAT "DONE" MEANS HERE

A unit is done when **all five** are true. Four is not four-fifths done; it is not done.

1. It is **driven on production** and you **looked at the frames** — 360 / 393 / 768 /
   1024 / 1280 × EN / SW / ZH. **360 is not optional and neither is ZH.**
2. A **guard** holds the rule, and you **proved it RED first** — by mutation, with a
   positive control in the same run.
3. **Docs are updated in the SAME commit as the code**, never a follow-up.
4. **One push**, then **one production verification** that the thing actually works
   live — not that the deploy succeeded.
5. Your row in **§1 is ticked in the commit that ships it**, and a register row is
   filed in `docs/LIVE-QA-CAMPAIGN.md` §6.

⛔ **"BLOCKED" IS NOT AN EXIT.** It is an exit only after you have measured *what*
blocks it and written the measurement down. Unit B was called blocked last session
and the measurement is what made it actionable — see §2.

---

### §0b · THE ZERO-FLAW GATE — mechanical, run it at the end

```
npx tsc --noEmit
npm run build
npm run test:all                 # DATABASE_URL unset
npm run test:red-anchors         # the ratchet may only SHRINK
npm run test:orphans             # 193, may only shrink
npm run test:docs · test:integrity · test:design-one-door · test:tracker-hygiene
npm run qa:landmark-seal         # on production
node scripts/live/ops/census.cjs # must print ✅ MATCH
```

⚠️ **`test:all` reports 3 expected failures with no server: `test:responsive` and
`test:motion` need a live one.** Anything else red is yours. ⛔ **A list of suites you
ran is not a gate — the gate is the runner that enumerates them.** `test-all.mjs` and
`red-all.mjs` both enumerate `package.json` structurally, so registering a new suite
is enough and a hand-list cannot go stale.

⛔ **Piping a runner through `| tail` gives you TAIL's exit code, not the runner's.**
Last session `test:all` printed `[exited with code 0]` under a line reading
`FAILED: test:red-anchors, test:responsive, test:motion`. Read the summary line.

---

### §0c · READ THIS BEFORE YOUR FIRST COMMAND

1. `git pull` — then **`npm install`**. ⛔ A stale `node_modules` fails as TS2307 /
   `'tsx' is not recognized` across ~150 suites and reads exactly like 150 product
   defects. **Read the first failure's TEXT before believing a mass failure.**
2. `railway link` → project **50pick**, environment **production**.
3. Three files are gitignored and **cannot arrive by git**. Confirm they exist before
   trusting any live result:
   - `.env.qa.local` — admin + QA-persona credentials, `PROD_DATABASE_PUBLIC_URL`
   - `.env.backup.local` — 🔴 the backup **encryption key**. If missing,
     `backup-secrets.mjs` reads as *"no key yet"* and its remedy is to **MINT one**,
     over the key existing backups are encrypted with. Run nothing backup-related
     until it is there.
   - `scripts/live/ops/.env` — regenerate:
     `railway run -s 50pick -- node scripts/live/ops/mkenv.cjs`
4. ⚠️ **`railway run` injects the INTERNAL database host**, which does not resolve off
   the cluster. Take secrets from `railway run` and `DATABASE_URL` from
   `scripts/live/ops/.env` — `scripts/ops-reset-password.mts` shows the pattern.
5. ⚠️ **Git Bash mangles a `/`-leading env value**: `ONLY=/markets` arrives as
   `C:/Program Files/Git/markets`, so the FIRST entry is silently skipped while the
   run still prints a clean pass. `export MSYS_NO_PATHCONV=1`, and write
   `ONLY=markets` without the slash.
6. ⚠️ **The checkout may be SHARED with a second session.** Never `git add -A`; name
   your paths. `RAILWAY.md`, `docs/reports/*`, `Ocean Logo/` and
   `scripts/live/ops/house-money-census.cjs` are **not yours**.
7. ⚠️ **`git fetch` BEFORE analysing anything.** A session once sat 150 commits stale
   and rebuilt shipped work twice.

---

## §1 · THE COMPLETION LEDGER — tick your row in the commit that ships it

| # | Unit | What it is | Why it is still open | Done |
|---|---|---|---|---|
| A | ~~**E-200** · pool residuals~~ | ~~13 settled pools non-zero~~ | ✅ **SHIPPED 2026-08-24 `6561d1a0`** — it was not a rounding rule, it was the winner set. See §7. | ✅ |
| B | **E-177** · the unverified-payer seal | Nobody has ever watched an unverified player be PAID | **UNBLOCKED.** The precondition was measured and is absent; Ali ruled the remedy. Full plan in §2. | ⬜ |
| C | **Jay Unit D (#6)**, then E–M | The date beside every timer, then `SESSION-PROMPT-JAY-COMMENTS.md` §1 order | That ledger is honest: A · B · C ✅ | ⬜ |
| D | **The two guide frames** | `cyc-paused.png` · `cyc-start-dialog.png` | ✅ Ruled: **scratch Postgres on Railway, NEVER a live pause.** Seven steps in the old §5. Build `--allow-paused` so it REFUSES a non-localhost BASE. | ⬜ |
| E | ~~**E-194** naming~~ | ~~Does a "3 min" chain say its real window?~~ | ✅ **RULED: NO CHANGE.** ⛔ Do not re-open without new data. | ✅ |
| F | **E-195** ⏰ | Cloudflare origin certificate renewal | **A DATE, not a session.** Check from **~2026-09-15**; certs expire **2026-10-15**. Under Full (strict) an unrenewed cert is the whole site gone, on a date, with no deploy to blame. | ⏰ |
| G | **E-201** ⏰ | The Postgres volume | ✅ Grown 500 MB → 5000 MB. Now a **dated WATCH**, not a task — see §5. | ⏰ |
| Z | **Close-out** | Register rows, handoff at the TOP of §6b, gate §0b | Money position stated **first and plainly** | ⬜ |

---

## §1b · THE STANDARDS EVERY UNIT IS BUILT TO

⛔ **They are NOT restated here.** `SESSION-PROMPT-CLOSE-THE-BOARD.md` §1b is their one
home — one door, the closed scales, one home per fact, where a decision is allowed to
live, and the gates that police all of it. **Read it there.** Copying them into a second
file is exactly the duplication those standards forbid, and the copy would rot first.

Three that this session paid for again, in one line each:

- **A rule a suite must hold has to be a PURE EXPORTED function.** E-200 lived inline
  inside `settleMarket`, where nothing could drive it.
- **Ask of every guard: "would this still pass if the feature were absent?"** Four
  assertions of *"nothing was sent"* all pass with the mailer disconnected — so the
  suite that makes them carries a control proving the outbox still captures.
- **Extend the kit, never hand-roll.** A hand-rolled reachability rule reported 10
  failures that `clip.mjs` had already documented as exemptions.

---

## §2 · UNIT B · E-177 — NOBODY HAS WATCHED AN UNVERIFIED PLAYER BE PAID

**It is unblocked. The plan is ruled. Run it.**

### What was measured 2026-08-24, and why the obvious route is wrong

- **No QA-fleet account can reach the AML hold.** Richest is **205,094**; all 20 together
  are **1,592,593**; wallets do not combine.
- The only four unverified accounts holding ≥ 1,000,000 are **all `role: ADMIN`**, each
  seeded with a single `ADJUSTMENT_CREDIT`, 0 positions. ⛔ **Do not drive as one** — an
  ADMIN bypasses every domain check, so it would measure nothing about the control under
  test. E-177 asks about an unverified **player**.
- **`withdraw.aml_review_triggered` has NEVER been written on production.** This would
  be the hold's first live exercise.
- ⚠️ `withdraw.unverified_payer` already exists **6 times** (last 2026-08-22) against 25
  `withdraw.initiated`. **The rows are not hypothetical — what has never been watched is
  the pairing under a live drive.**

### Ali's ruling: CONSOLIDATE, never mint

Two `adminAdjustBalance` moves, **net-zero platform-wide**:

1. **Debit 794,906** from `usr_7fe743ff94c535666a252ce0` (`+255777777776`) — no email,
   0 positions, **never any audit activity at all**.
2. **Credit** fleet `+255799000002` to exactly **1,000,000**.

Both are below `TWO_PERSON_THRESHOLD_TZS` (1,000,000), so single-officer. ⛔ Drive them
through `/admin/players/[id]` — **never SQL**: `adminAdjustBalance` makes the wallet
mutation, the CONFIRMED txn and the ledger group atomic, and writes the COMPLIANCE row.

### Then the zero-money drive

A **gross ≥ TZS 1,000,000** returns at the AML hold **before any gateway adapter is
touched** — verified by reading `dispatchWithdrawal`: the branch returns *before*
`resolveActiveAdapter`, and its `providerRef` is deliberately our own correlation id
rather than a fabricated gateway ref. So both audit rows are written while **nothing
leaves the platform**.

**Assert:** `withdraw.initiated` carries `kycStatus`, and `withdraw.unverified_payer`
carries the **same `txnId`**. Photograph what the player sees.

**Then put it back:** reject the AML hold (money returns), then reverse both adjustments.
⛔ Leaving the fleet consolidated is not "done".

---

## §3 · UNIT C · JAY UNIT D (#6) — THE DATE BESIDE EVERY TIMER

Then **E–M in `docs/SESSION-PROMPT-JAY-COMMENTS.md` §1 order.** That ledger is honest
now: **A · B · C ✅**.

⚠️ §2 ③ of that file carries the id-collision tie-break, written after two sessions
filed `E-191` within an hour of each other: **the register is the authority — whichever
finding has a ROW keeps the id, the other moves.**

---

## §4 · UNIT D · THE TWO GUIDE FRAMES

**RULED: scratch Postgres on Railway, NEVER a live pause.** The seven steps are in
`SESSION-PROMPT-CLOSE-THE-BOARD.md` §5. Build `--allow-paused` so it **REFUSES** a
non-localhost `BASE` — a flag that could point at production is a flag that eventually
will.

⚠️ Owed alongside: `docs/guide-img/cyc-*.png` show `—` where the live page now shows
figures, because the USD→TZS rate was set. Re-shooting needs the production-build-plus-
real-Postgres rig.

---

## §5 · THE TWO DATED WATCHES — ⏰ neither is a task you can finish today

### F · E-195 — the certificate
`www` went behind Cloudflare at **Full (strict)** on 2026-08-24, so the origin
certificate now renews through a path that has never carried a renewal. **Expires
2026-10-15. Check from ~2026-09-15.** ⛔ Do not close it early.

### G · E-201 — the database volume
Grown **500 MB → 5000 MB** on 2026-08-24 after it was found at **458/500 (42 MB free)**
and **already throwing** `53100 No space left on device` on live Up & Down boundaries.

⛔ **No guard is proposed, deliberately.** This is a Railway capacity fact, not a repo
invariant, and a suite shelling out to `railway volume list` would fail on any machine
without the CLI. **The control is a dated re-read**, whenever Up & Down's round rate
changes materially:

```
railway volume list         # postgres-volume
```

🔴 **AND RE-READ THE VOLUME, NOT THE DATABASE — this was got wrong the same evening it was
written, which is why it is spelled out.** The first estimate was "19.12 MB/day of database
growth against 4,542 MB free ⇒ ≈237 days". Four hours later the volume read **734 MB**, up
276 MB. **The database had not grown 276 MB — it went 315 → 320 MB, exactly the ~19 MB/day
predicted.** WAL was unchanged at 48 MB and `pgsql_tmp` was empty. What grew was the part
Postgres cannot see from inside itself: the gap between `pg_database_size + WAL` and what
the volume reports went from **~95 MB to ~366 MB** across the resize.

⛔ **So a runway computed from database growth is a number about the wrong thing.** The
data directory carries more than your database — other databases, transaction state, server
logs — and a Railway resize appears to leave artefacts on the volume too. **The only figure
that predicts a full disk is the one `railway volume list` prints.** Use the API as a second
source (`VolumeInstance.sizeMB` / `currentSizeMB`); the CLI and the API agreed both times.

At **734 MB / 5000 MB** there is no urgency — but ⚠️ **if the gap keeps growing without the
database growing, that is its own finding**, and the first place to look is the **Backups**
tab on the Postgres service.

⛔ **Never prune `AuditLog` to reclaim disk** — it is the hash-chained compliance record;
its 195 MB is the asset, not the waste.

---

## §6 · THE TRAPS THIS BOARD WAS BUILT ON

Every one of these was paid for on 2026-08-24/25.

1. ⭐ **Ask which POPULATION a number counts, before quoting it.** "13 of 19,972" had a
   moved denominator (20,102 settled; 19,125 YES/NO). "A `WIN|OPEN` filter would break 86
   markets" was **true and worthless** — all 86 are one-sided and **never execute the line
   being changed**. The real population: **only 128 settled markets ever reach the
   allocator**; 19,000 are one-sided refunds.
2. ⭐ **A comment is not a control.** `settleMarket` said *"a CASHED_OUT position has had
   its stake removed from the pool"* three lines above the filter that counted it anyway.
3. ⭐ **An aggregate that balances is not evidence its components do.** E-200's 15 TZS sat
   inside a self-cancelling POOL/COMMISSION pair; `test:trial-balance` and
   `test:money-invariants` were green over it.
4. ⭐ **Verify the deploy by READING THE LOG, not by seeing 200s.** E-201 — a money
   database 2 days from full, every page green — was found in the boot log of an unrelated
   deploy.
5. ⭐ **Prove a fix by DEMANDING the fault, not by re-reading a log.** A log buffer holds
   history, so "I still see errors" and "I see none" are equally worthless. `work_mem=64kB`
   plus a 151,690-row on-disk sort is a proof.
6. ⭐ **A claim about state, written from memory of an intention, is a fabrication however
   well-meant.** Last session's handoff told the next one to *restore* a `deny` list that
   had been `[]` for its entire history. `git show HEAD:<file>` is two seconds.
7. ⚠️ **CRLF.** This tree is CRLF; an LF anchor cannot match it and the replace becomes a
   silent no-op that reads as *"the guard failed to catch the defect"*. Keep mutated
   statements on ONE line. ⛔ Never rewrite `LIVE-QA-CAMPAIGN.md` with a script — a
   read-modify-write once truncated it to 0 bytes. The editor preserves CRLF; it was
   re-verified on 2026-08-25 (`bare LF: 0` after an insert).
8. ⚠️ **A red harness's replacement must not CONTAIN its own anchor**, or the
   did-it-reach-disk check refuses a mutation that applied correctly.

---

## §7 · WHAT SHIPPED IMMEDIATELY BEFORE YOU — do not re-derive these

- **E-200 (`6561d1a0`)** — `market-service.ts:2925` fed the allocators a winner set
  filtered by **side alone**, so a CASHED_OUT position whose stake had left the pool was
  counted as a winner; `remainder` went negative and the largest-remainder top-up was
  **skipped in silence**, on payouts *and* fee. The rule is now the pure exported
  `winnersForAllocation` (allowlist `WIN`/`OPEN`). ⛔ **No tolerance was widened.**
  The five `+1`s are **structural** (9,504 settlements swept, residuals `{0,1}`); the
  seven negatives pre-date the 2026-08-11 fix. ⚠️ **The historical 15 TZS is still on the
  books** — the fix stops recurrence, it does not rewrite history. 13 players are
  collectively owed **7 TZS**. Correcting it moves real money: **Ali's call, not yours.**
- **E-201** — the volume, above.
- **Recovery accepts an email (`6152f8f2`)** — `requestPasswordReset` took a phone only,
  so a player who registered with an email and remembered only that had no route back in.
  Now resolves through the **same** `resolveLoginIdentifier` sign-in uses, and the page
  reuses the **same** `LoginIdentifier` control. A shared address sends **one link per
  account** (one production address is on **4**). `test:reset-identifier` 17/0 ·
  `red:reset-identifier` 4/4 · `qa:reset-identifier` 75/0.

---

## §8 · THE MONEY POSITION YOU INHERIT

**Re-derive it. Do not quote this block — it is a snapshot, and snapshots rot.**

Verified 2026-08-24 at close (`node scripts/live/ops/census.cjs` → ✅ **MATCH**):

- **0** negative wallet components · **0** stranded positions · **0** stuck withdrawals
- **0** RESOLVED/VOIDED markets with `settledAt = NULL`
- **0** Up & Down rounds past boundary +10min unsettled
- the ledger sums to **TZS 0** (`house-money.cjs`)
- QA fleet: **TZS 1,592,593** across 20 accounts, untouched
- ⚠️ `pool-residual.cjs` still reports **13 non-zero settled pools, net +12 TZS**. That is
  **history**, not a live fault — see §7.

⛔ **Before you quote any count, ask which population it counts.**

---

## §9 · CLOSE THE SESSION BY

1. Running the **§0b gate**.
2. Re-running the instruments on production: `npm run qa:landmark-seal` ·
   `node scripts/live/ops/census.cjs` — it must print **✅ MATCH**.
3. Ticking your rows in **§1**.
4. Filing register rows in `docs/LIVE-QA-CAMPAIGN.md` **§6** — ⛔ **re-grep the highest
   `E-` id at the moment you file**, not from memory.
5. Writing the handoff at the **TOP of §6b**, with the **money position stated first and
   plainly**.
