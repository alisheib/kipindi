# Is the house desk ready to be switched on? — a statement for the owner

> **Written 2026-09-21, about 06:55 EAT, in the alerts lane** (`C:/kipindi-alerts`, branch `alerts-lane`,
> tip `4d3583bf`, working tree clean before and after every run below).
>
> **THE ANSWER IS: NOT YET.** The list of what is left is section 7. One item on it cannot be closed by
> any amount of work by anybody — it needs a sentence from you — and four separate safety ratchets are
> red right now, two of them on the live branch itself and neither of them caused by this feature.
>
> ⛔ **This document was written so that it could say "not yet", and it does.** Nothing here is taken on
> trust from another session's report. Every figure is marked either **MEASURED HERE** (I ran the command
> tonight, on the tree named) or **CLAIMED BY** a named lane at a named commit. Where I could not
> re-derive something, it says so and says whose measurement it is. The "not measured" half of this
> document is the honest half and it is section 4.

---

## The five trees this was read against

I read the other lanes read-only, with `git show` and `git log`. A lane's branch is a moving target; these
are the exact tips I read, and two of them have already moved on since.

| Lane | Branch | Tip I read | What it is doing |
|---|---|---|---|
| **This one** | `alerts-lane` | **`4d3583bf`** | Everything below marked MEASURED HERE was run on this tree |
| **Lane 1** | `house-bots` | **`fd2b6ed5`** | Closing a coverage hole in the house-word guards |
| **Lane 2** | `ops-lane` | **`3baf7755`** | The integration branch; wrote its own release verdict at this commit |
| **Lane 4** | `rel-lane` | **`2890dce5`** pushed, **`337cd3ef`** local and unpushed | Building the shutdown drain |
| **Live** | `main` | **`418f1b59`** | What is serving 50pick right now |

⚠️ Lane 4 has **two commits that are not pushed** (`1befafbd`, `337cd3ef`). I read them because they are in
the shared object store, and I say so rather than pretending the pushed tip is the whole story — but they
could change again before you read this.

---

## 1. What the feature is, and what the switch does

**What it is.** A small number of ordinary player accounts on 50pick can be *designated* as house accounts.
When they are, a program the code calls the *engine* watches the public board — the same board any player
sees — and places stakes from those accounts on 50pick's own behalf. It puts money on the other side of a
poll when one side is thin, it opens a market that has nothing on it yet, and it can answer a particular
player's stake after a delay. It is 50pick betting against its own players, from accounts that look, in
every screen and every report, exactly like players' accounts.

**Two standing rules of yours shape everything.**
- **D19 (16 Sept):** house bots are *never public*. No rulebook, no Terms, no FAQ, no chatbot mentions
  them, and the person whose account it is is told nothing — a house stake looks to them exactly like a bet
  they placed. Every alert goes to admins only.
- **D20 (17 Sept):** in every report, filing, count and detector, a house bot's account is treated exactly
  like any player's, and nothing anywhere splits house money out.

**What the switch is, precisely.** One field, `enabled`, on one row in the production database. The
migration that creates it sets it to `false`, and I read that line myself: `"enabled" BOOLEAN NOT NULL
DEFAULT false`. Nothing in the code, no boot path, no seed and no deploy turns it on. The only thing that
turns it on is an owner-only action on the desk page, and that action refuses unless **eight** global
limits are set first (daily stake, daily loss, open exposure, per-market, bets per minute, bets per day,
and two per-player counter caps). Turning it on is therefore a deliberate act with a reason attached, and
it leaves an event and a compliance row behind it. **MEASURED HERE** at source.

**What is already live, and this matters.** The feature's code is **already on the live branch**. I checked:
`origin/main` carries 37 of the 38 engine modules, the desk pages, the two database migrations, and the
production start command runs `prisma migrate deploy` before serving. So production almost certainly
already has the house tables and the control row — with the switch off. **The thing you would be flipping
is not a deployment. It is a live database field on a platform that is already carrying the code.**

⚠️ **And one thing about that is worth your attention before anything else.** The engine's timers are
**opt-out, not opt-in**. The check in the code is `env !== "false"` — that is, the engine starts *unless*
somebody has explicitly set `HOUSE_BOT_ENGINE=false` in the environment. **MEASURED HERE** at
`src/lib/server/house-bot/engine.ts:138-140`. What stops money moving today is not that the engine is
asleep; it is that the switch field is `false`, and that is checked in four separate places — the planner
skips, the trigger returns nothing, the fire path refuses with `house_disabled`, and the money seam refuses
again *inside the bet's own lock*. **MEASURED HERE**, all four call sites read. That is a sound design. But
it means the safety rests on the database field, not on the engine being switched off, and **nobody in this
programme has read what `HOUSE_BOT_ENGINE` is actually set to on production.** That is section 6, item 2.

---

## 2. What is proven — and I re-ran it rather than quoting it

### 2a. Things I ran tonight, on this tree, at `4d3583bf`

| What | Result | What it means |
|---|---|---|
| `test:house-bot-rules` | **527 passed, 0 failed** | Every pause reason has a way out; no state can trap a bot or its holder |
| `test:house-bot-seam` | **98 passed, 0 failed** | The single doorway house money goes through, and the pin that only one file may use it |
| `test:house-bot-disclosure` | **31 passed, 0 failed** | No house word or house field reaches a surface it must not |
| `test:house-bot-holder-lifecycle` | **16 passed, 0 failed** | Designate to remove, and the holder's own doors |
| `test:deferred-register` | **14 passed, 0 failed** | The register of postponed checks is internally sound: 13 sections, 100 rows |
| `test:guards-exist` | **9 passed, 0 failed** | The guards named in the plan actually exist |
| `test:audit` (chain) | **36 passed, 0 failed** | The audit chain's own arithmetic |
| `test:ops-audit-flush` | **14 passed, 0 failed** | 10 mutating operator scripts flush their audit rows |
| `test:red-anchors` | **2576 passed, 4 failed** | The sabotage fleet's static audit — see the reds in 5d |
| `test:decomment` | **21 passed, 1 failed** | Inherited ratchet breach — see 5d |
| `test:popup-fit` | **12 passed, 1 failed** | Ratchet breach — see 5d |

### 2b. The sabotage declarations, counted rather than quoted

**MEASURED HERE.** I imported the six house declaration files and counted what they declare:

| File | Declared deliberate defects |
|---|---|
| `house-bot-console.anchors.mjs` | **281** |
| `house-bot-seam.anchors.mjs` | **67** |
| `house-bot-money.anchors.mjs` | **56** |
| `house-bot-engine.anchors.mjs` | **46** |
| `house-bot-ceremony.anchors.mjs` | **5** |
| `house-bot-dal-claim.anchors.mjs` | **3** |
| **Total** | **458** |

These are 458 specific, named ways to deliberately break the feature, each one declared so a suite can
check the break still lands where it says it does. `test:red-anchors` resolved **every one of the 458**
against the tree exactly once tonight — its only two anchor failures are in an unrelated file
(`3.rg-doors.anchors.mjs`, two anchors in `responsible-gambling.ts` that no longer match).

⛔ **I did NOT run the sabotage batches themselves.** A red harness rewrites real source files on disk to
plant its defect and then puts them back. Three other lanes are working in this repository right now, and
this programme has already had a run leave a live payout gate disabled while reporting itself clean.
Running 458 file-rewriting mutations beside three active lanes tonight would have been reckless. **Whether
the 458 actually go red is therefore other sessions' measurement, not mine** — see the evidence table.

### 2c. What the structure guarantees, read at source tonight

- **One bet doorway.** `placeHouseBet` may only *add* refusals, and only `house-bot/fire.ts` may import it.
- **Exactly once.** A durable intent row is written *before* the bet, with a unique key; a duplicate fire
  is a no-op.
- **Every cap inside the bet's own lock**, never only in the engine.
- **Cash only** — no bonus spend, no wagering progress, no agent commission, no cash-out.
- **A permanent marker** on the position and on every transaction of it.
- **Nine holder events auto-pause a bot** — self-exclusion, cooling-off, suspension, frozen or missing
  wallet, the holder's own loss limit, a password change, a role change.
- **The switch off is bounded**: the OFF write takes no lock and lands first, so a hung bet cannot hold the
  switch open; the drain only informs.

### 2d. The one place where the real engine has been proved end to end

There is exactly one instrument in the whole repository where the **real** planner decides and the **real**
poller fires on a **real** clock against a **real** database, rather than a test inserting a row by hand
and calling the money seam directly. It is `scripts/house-bots-local-drive.mts`.

⛔ **It does not exist on my branch.** It lives only on lane 2's, and I read it there. **CLAIMED BY lane 2
at `ops-lane@3baf7755`**, from that lane's own register and commit `60de3807`: the targeted-counter case is
**green, 13 passed / 0 failed** — the target was armed, a stake placed inside the arming window drew no
reaction (the control), a later stake drew the counter, and the poller fired it 3 seconds after the delay
said it was due. **That is real, and it is the single most valuable piece of evidence in this programme.**

⛔ **And it is one case of four.** By lane 2's own register at the same tip, the drive's remaining cases —
"Enter now" on a market with both pools at exactly zero, the Up and Down three-minute counter through the
inline hook, and the report-pack durability case over 12,000 bet rows — are **open and not run**. A fifth
assertion is deliberately not written at all, because the console action that would write the row it checks
does not exist yet in a form the drive may use.

---

## 3. What is NOT measured, and why — with equal weight

### 3a. Nothing has been served

**MEASURED HERE, just now:** `C:/kipindi-alerts/.next` **does not exist** — this lane has never built the
app. The only things listening on this machine right now are a Node process on port **3047** (started
06:51 today, another lane's) and the scratch Postgres cluster on **5433** (up since 19 Sept, living inside
lane 1's worktree). **Nothing is on port 3021.** Reading the ports is how I know, not a note somebody left.

Every check that needs a page actually rendered in a browser is therefore unmeasured *by me*. In the
register that governs Commit 7, that is **38 rows** — I re-derived the count from the id list rather than
copying the number, and the arithmetic closes exactly against the 63 rows the gate holds (15 cleared + 38
not measured + 1 half paid + 4 needing a ruling + 3 findings + 2 stale = 63).

Lane 2 owns a port and did serve the app, and reports the visual ladder green. That is **CLAIMED BY lane 2**,
not re-derived here.

### 3b. Nothing has touched production, and it must not

Several rows can only ever be discharged on the day of release against the live system — the migration
parity check against the real `main` at the release commit, and the migration preflight against the
production database. They are **not measured by construction** and that is the correct order, not a gap.

### 3c. The hardware

This machine has known-failing RAM. The operating rule is one heavy Node job at a time, through a lock
file. **MEASURED HERE:** the lock was free when I checked, and every command I ran tonight was a single
light process. **I did not take the lock and I did not run a build, a browser or a two-store suite.**

### 3d. The house suites on Postgres

The suites that run on both stores — console, reports, engine, money, caps, migrations, designation,
info-edge — each spin a scratch Postgres database. I did not run them. Their figures in the evidence table
are **CLAIMED BY lane 2 at `ops-lane@3baf7755`**: console 710 memory / 475 Postgres, reports 244/80,
engine 751/730, money 131/149, all with 0 failed. I have no reason to doubt them and no basis to confirm
them.

---

## 4. The open defects you would be accepting by flipping — stated plainly

### 4a. The platform loses audit rows when it shuts down, and the chain cannot see the hole

This is **not a house-bots defect. It is a 50pick defect, it is live right now**, and it is the most serious
thing in this document. Every figure below I re-derived tonight **against `origin/main` — the branch that is
serving the platform** — not against a lane's branch:

- **467 of the 491** places where the code writes a compliance row **do not wait for it to be written.**
  That is deliberate — a player placing a bet must not wait on an audit write — but it means the row is
  sitting in a queue.
- **`auditFlush`, the function that would empty that queue, is called ZERO times anywhere in `src/`.** It
  appears exactly once on the live branch: its own definition. Twenty-one test scripts call it; no
  production code does.
- **A process that ends takes the queue with it.** Lane 4 drove this: **10 of 10** bet rows lost on a real
  termination. **CLAIMED BY lane 4**, and I could not re-drive it — Windows cannot deliver the signal at all.
- **The integrity check cannot see the hole, and I confirmed why at source.** `verifyChainFull()` returns
  `valid: true` at the end of its function unless the chain *links* break. A row that was never written
  consumes no sequence number and leaves no dangling link, so a chain with 40 known-lost rows reports
  `valid: true`. ⛔ **And a row whose contents were tampered with also leaves `valid: true`** — it is
  counted as "unverifiable", which is a separate field most readers never look at.
- **It can never be repaired.** `auditLog` on the live branch has **one `create`, four `count`, seven
  `findMany` — and no update and no delete anywhere.** A row that was not written cannot be added later.

**What lane 4 has fixed, at the tips I read** (`rel-lane@2890dce5` pushed, `337cd3ef` local):
- A drain that **holds the process exit** after a termination signal, empties the queue, then exits with the
  original code. It is wired into `src/instrumentation.ts` — I checked the wiring, it is real, not a file
  sitting unused. Lane 4 reports **0 of 10 became 10 of 10 in 23 ms**, and a 50-row burst in 95 ms.
- A **certificate row**, `system.shutdown_drain`, queued behind everything else, so its presence proves the
  whole queue was saved and its absence is the durable mark of a lossy shutdown.
- A **detector** that declares lost bet rows as `audit.row_missing` after a ten-minute grace. It is wired
  into `lifecycle.ts` (dynamic import, line 405). It cannot restore a row; it can only make a permanent
  invisible hole into a permanent declared one.

**What remains unfixed, at those same tips, in lane 4's own words:**
- ⛔ **The signal may never arrive, and this is lane 4's own largest unknown.** Railway's documentation says
  a service started through `npm run start` may never receive a termination signal, because the package
  manager becomes the main process. **I confirmed the premise myself:** `origin/main`'s start command is
  exactly `"prisma migrate deploy && next start"`, and `railway.json` sets a 30-second draining window but
  declares no start command of its own. If the note applies, the drain never runs — **and neither does
  Next's own request draining, nor the leadership hand-back, nor the house-bot claim requeue.** Every
  deploy would effectively be a hard kill. Lane 4 could not measure it and neither could I.
- The detector covers **the bet row only**. Four other reconstructable events are not covered yet.
- One class can **never** be detected: viewing a player's record, viewing a KYC document, exporting
  transactions, exporting a data-rights request. Nothing else records that the viewing happened, so no
  detector can ever know a row was lost.
- **None of it is on `main`.** The fix is on an unmerged branch.

### 4b. 50pick's own published rules forbid exactly this conduct — and that is owed to players

**MEASURED HERE**, read out of the live rulebook pages:

- Up and Down rules, section 8 "Fair play and prohibited conduct":
  *"Operating multiple accounts, or colluding with other players to move either side of a pool."* and
  *"Using bots, scripts or automated tools to place stakes or scrape the platform."* The stated
  consequences are stakes withheld, winnings forfeited, accounts suspended, and referral to the authorities.
- Yes/No rules, section 8: *"Bots, scripts and automated tools may not be used to place stakes or scrape
  the platform."*
- Both are published in **English and Swahili** (`roboti, skripti au zana za kiotomatiki`), and both are on
  `origin/main` — live now.
- The Terms say **"One account per natural person"**.

The house desk places automated stakes from accounts registered to other people, and under D19 those people
are never told. **That is the conduct the published rules prohibit, done by the house, on accounts the house
does not own, without telling the account holder.** This is not a regulator question. It is a promise made
to players on a live page, in their own language.

### 4c. The switch is held by one enforced lock and a kill switch, not two independent locks

**MEASURED HERE, and it is worse than the programme's own record says.** The guard that stops this work from
being pushed to the live branch is a single 158-byte shell script at `C:/kipindi-house-bots-hooks/pre-push`,
armed per-worktree through git's `config.worktree`. I enumerated all eight worktrees:

| Worktree | Guard |
|---|---|
| `kipindi-alerts`, `kipindi-house-bots`, `kipindi-ops`, `kipindi-rel`, `kipindi-old-build` | **ARMED** |
| `C:/kipindi-main` | **ABSENT** (this one is known and intended — it is the sanctioned release route) |
| `C:/kipindi-audit` | ⛔ **ABSENT, and not accounted for anywhere** |
| `C:/kipindi-platform` | ⛔ **ABSENT, and not accounted for anywhere** |

⛔ **`PROGRESS.md` states that `C:/kipindi-main` is "the only checkout the guard does not cover". That is
false.** Two more are uncovered, one of them an actively pushing lane. And the guard itself **lives outside
every checkout**, so it is in no repository, no clone, and no backup — one deleted folder from gone, with
nothing that would notice.

### 4d. The failing RAM

The machine's known-failing memory is the reason for the one-heavy-job-at-a-time rule, and it is recorded
as having corrupted a git object tonight. **MEASURED HERE, honestly and inconclusively:** automatic garbage
collection is disabled (`gc.auto = 0`, confirmed), and the object named as corrupt,
`9802802836ee8c5f78dd8cb31953d55a18257948`, **reads back cleanly right now** as a valid commit. I am
forbidden to run a full integrity check and did not run one, so I cannot tell you whether the damage is
elsewhere in the graph, was repaired, or is intermittent — and on failing memory a read that succeeds once
proves very little. What I can say is that no figure in this document came from a single fragile read.

---

## 5. Where the programme actually stands against its own gates

### 5a. The programme's own rule is that a commit closes when its register section is empty

**MEASURED HERE**, re-counted from the register's own tables on both trees:

| Gate | On my tree (`alerts-lane@4d3583bf`) | On the integration tree (`ops-lane@3baf7755`) |
|---|---|---|
| **Commit 5** must be empty | **35 rows open** | **13 rows open** |
| **Commit 7** must be empty | **63 rows open** | **66 rows open** |

I re-derived lane 2's "thirteen" independently from their own file and got thirteen. The difference between
the columns is real work they have done that my lane has not merged, not a disagreement.

### 5b. Commit 8 is not built on this lane

The plan's own board shows Commit 8 — the local end-to-end drive, the rehearsals, the final documents and
release prep — with **every one of its ten boxes unticked**. Lane 2 has built part of it on its own branch.

### 5c. The integration branch's own verdict

**CLAIMED BY lane 2, `ops-lane@3baf7755`**, in that commit's own title: **"the release verdict — NOT fit to
push to main, with the five things in the way named."** The integration lane, which is the one that would
actually do the merge, has already said no.

### 5d. Four ratchets are red — and two of them are the live branch's, not this feature's

**MEASURED HERE**, by running them:

| Ratchet | Result | Whose |
|---|---|---|
| `test:red-anchors` §4.1/§4.2 | **66 undeclared harnesses against a ceiling of 65** | ⛔ **`origin/main`'s.** I proved this rather than assumed it: the ratchet file is byte-identical to main's, the list of harnesses is identical to main's (170, no additions, no removals), the nine exempt scripts are byte-identical to main's, and this branch only *adds* declaration files — which can only lower the count. **The live branch is over its own ceiling.** |
| `test:decomment` §2.1 | **22 carriers against a ceiling of 20** | ⛔ **`origin/main`'s.** All six named carrier files are on main, byte-identical. |
| `test:popup-fit` §1.1 | **69 components against a reviewed 57** | **This programme's, in part.** The 69th is `src/app/admin/desk/stop-queued.tsx`, which is not on main; it was introduced by commit `00eb20ff` (C7 step 5) and later edited by both this lane and lane 2. |
| `test:red-anchors` §3 | 2 anchors no longer resolve in `responsible-gambling.ts` | Unrelated to house bots |

⚠️ Two of these are live-branch breaches that pre-date all four lanes. They are not reasons to hold the
house desk. They *are* reasons not to believe "everything is green", because it is not, and has not been.

---

## 6. What only you can do

### 6.1 Four decisions that no session may make for you

These are the four rows the register flags, and I re-derived that it is exactly these four — **35, 40, 50,
53** — by counting the flags in the file rather than copying the list.

1. **Row 35, plus row 36's identity half — ⛔ this is the only item that hard-blocks the release.** Two
   checks that your own earlier ruling says cannot be done until the *next* stage of work are filed in a
   list that must be empty before *this* stage can close. The list can therefore never empty and the stage
   can never be declared finished — not because anything is broken, but because of where two lines sit.
   **(a)** move them to the next stage's list, or **(b)** say next-stage items do not count against this
   stage. Recommendation: **(a)**; an exception to a rule like this widens every time somebody is in a
   hurry, and this exact list has already lost its force five separate times that way. Ten minutes of
   editing, no code.
2. **Row 50** — desk pages for an address that does not exist correctly tell the reader "not found" while
   the server quietly tells machines "found". Measured, not a leak, everyone gets the same answer, and it
   happens identically on the players, identity and markets pages for the same underlying reason.
   **(a)** accept and raise the platform fix separately, or **(b)** hold the desk until it is fixed
   everywhere. Recommendation: **(a)**; the fix must move four sections at once and the desk must not move
   alone.
3. **Row 53** — two records of the same screen check contradict each other and the screenshots were saved
   outside the project's history, on another copy of the code. **(a)** take the earlier session's word, or
   **(b)** have the screens re-taken. Recommendation: **(b)**. ⚠️ Lane 2 has since claimed it re-read all
   four widths by eye on a served build (**CLAIMED BY `ops-lane@3baf7755`**), which if it holds is exactly
   what (b) asks for.
4. **Row 40** — a check was written down in a way that would have aimed the tool at a completely different
   page and reported a clean pass about a screen it never looked at. Nobody ran it, so no false result
   exists. **(a)** correct the instruction and accept the evidence already gathered, or **(b)** correct it
   and insist the tool is run too. Recommendation: **(a)**.

**And one correction that is yours because it is in an authority of your own.** A dated instruction of
yours sends the next person to a drive `F:` that does not exist on this machine; the copy is on `C:`.
Recommendation: confirm the letter should read `C`, with your original left visible beneath a dated
correction. It holds nothing up, but a wrong instruction in an authority travels much further than a wrong
note.

### 6.2 The production engine check — nobody else can do this

Read, on the live environment, whether **`HOUSE_BOT_ENGINE`** is set, and to what. If it is unset or
anything other than the literal `false`, the engine's timers are running on production right now. They are
harmless while the switch is off — four independent layers refuse — but you should know which of the two
situations you are actually in before you change the thing those four layers are reading.

While you are there, the second reading that costs nothing: after the next deploy, look for a
`system.shutdown_drain` row at the rollover. A row means the shutdown signal arrives on Railway and the
compliance queue is saved. No row means it does not, and that section 4a's largest unknown is real.

### 6.3 The switch itself

Set the eight global limits, then turn it on, with a reason. Nobody else can, and nothing in the code will
do it for you.

---

## 7. THE VERDICT

> ### ⛔ NOT YET.
>
> **In one sentence: the feature's own gates are not met — Commit 5's list holds 13 open rows and Commit 7's
> holds 66 on the integration branch, Commit 8 is unbuilt, the integration lane has itself ruled the tree
> "not fit to push to main", four rows need a ruling only you can give and one of them cannot be discharged
> by any work at all, and underneath all of it the live platform silently loses compliance rows when it
> shuts down and its integrity check reports `valid: true` over the hole.**

**What is left, in the order it should be done:**

1. **Your four decisions** (6.1). Item 1 is the only hard block, and no amount of work can substitute for it.
2. **Lane 4's drain merged to `main`** — or a written decision from you to accept 4a as it stands. It is
   built and wired and, at the tip I read, it works; it is simply not on the live branch.
3. **The Railway signal experiment** (6.2). Cheap, and it decides whether the drain is a fix or a comfort.
4. **One served page, on a port.** Up to 26 of the 38 unmeasured Commit-7 rows discharge against a single
   locally served app — no production build needed.
5. **One production build plus exclusive use of the scratch database cluster**, for the remaining eight.
6. **The three remaining cases of the real-engine drive** (2d). One of four is green. The other three are
   the only remaining way to learn something a unit suite cannot tell you.
7. **A decision on 4b** — the published rules. This one is not a measurement and never will be. It is a
   promise made to players in two languages on a live page, and it is yours.
8. **The two absent pre-push guards** (4c), and moving the guard itself into the repository where a clone
   would carry it.

**What is genuinely strong, and should not be lost in all of that:** the money seam is a single doorway with
a source-level pin; every cap is enforced inside the bet's own lock rather than in the engine; the
exactly-once machinery is real and proved; nine separate holder events auto-pause a bot; the switch ships
off by database default and is refused unless eight limits are set; four independent layers read that switch;
458 deliberate defects are declared and every one of them still resolves against the code; and the one
instrument where the real engine decides and fires on a real clock is green on the case it has been driven
on. This is a careful piece of work. It is not a finished one.

---

## 8. The evidence table — every figure, and who measured it

| # | Claim | Figure | Who measured it | Where |
|---|---|---|---|---|
| 1 | Un-awaited audit call sites on the LIVE branch | **467 of 491** (24 awaited) | **ME, tonight** | `origin/main@418f1b59`, `src/**` |
| 2 | Same, on this branch | 467 of 491 (`audit({` form); 469 of 493 counting every `audit(` form | **ME, tonight** | `alerts-lane@4d3583bf` |
| 3 | `auditFlush` callers in production code | **ZERO** (1 occurrence = its own definition); 21 test scripts call it | **ME, tonight** | `origin/main` and `alerts-lane` |
| 4 | `auditLog` write methods in `src/` | **1 create, 0 update, 0 delete** (4 count, 7 findMany) | **ME, tonight** | `origin/main@418f1b59` |
| 5 | `verifyChainFull` returns `valid: true` over lost rows, and over a tampered row | Confirmed at source: `valid` is false only when links break; a hash mismatch is counted `unverifiable` | **ME, tonight** | `audit.ts:897-1062` |
| 6 | 10 of 10 rows lost on a real kill; 40 known-lost rows read `valid: true, verified: 663` | as stated | **LANE 4** — I cannot re-drive it (Windows cannot deliver the signal) | `rel-lane@2890dce5`, `audit-reconcile.ts` docblock |
| 7 | The drain turns 0 of 10 into 10 of 10 in 23 ms; burst 50 of 50 in 95 ms | as stated | **LANE 4** | `rel-lane`, local tip `337cd3ef` (unpushed) |
| 8 | The drain and the detector are actually wired in | Confirmed: `instrumentation.ts:39`, `lifecycle.ts:405` | **ME, tonight** | `rel-lane@2890dce5` |
| 9 | Production start command is `npm run start` | `"start": "prisma migrate deploy && next start"`; `railway.json` declares no start command, draining 30 s | **ME, tonight** | `origin/main@418f1b59` |
| 10 | The rulebook forbids bots and multiple accounts | 4 passages, EN + SW, both product lines, all on `main` | **ME, tonight** | `src/app/legal/rules/_content-{up-down,yes-no}.tsx:216/221/394/396` |
| 11 | The switch ships off | `"enabled" BOOLEAN NOT NULL DEFAULT false`; seeded `ON CONFLICT DO NOTHING` | **ME, tonight** | migration `20260916150000` |
| 12 | Eight limits required before ON | 8 fields in `REQUIRED_FOR_MASTER_ON` | **ME, tonight** | `rules.ts:858-867` |
| 13 | The engine is opt-OUT | `houseBotEngineEnabled = env !== "false"` | **ME, tonight** | `engine.ts:138-140` |
| 14 | The switch is read in four layers | planner `:188`, trigger `:118`, fire `:112`, seam `:119` and `:332` | **ME, tonight** | `alerts-lane@4d3583bf` |
| 15 | House code is already on the live branch | 37 of 38 engine modules, both migrations, the desk pages | **ME, tonight** | `origin/main@418f1b59` |
| 16 | Declared sabotage mutations | **458** (console 281, seam 67, money 56, engine 46, ceremony 5, dal-claim 3) | **ME, tonight** — imported the files and counted | `alerts-lane@4d3583bf` |
| 17 | Every declared mutation still resolves | 458 of 458; the only 2 anchor failures are in an unrelated file | **ME, tonight** (`test:red-anchors` §3) | same |
| 18 | The sabotage batches actually go red | 281/281 clean; 96 caught; 27 caught / 0 missed | **OTHER SESSIONS** — I did not run a file-mutating harness beside three active lanes | this lane's own history; `ops-lane@3baf7755` |
| 19 | Light house suites | rules **527/0**, seam **98/0**, disclosure **31/0**, holder-lifecycle **16/0** | **ME, tonight** | `alerts-lane@4d3583bf` |
| 20 | Two-store house suites | console 710/475, reports 244/80, engine 751/730, money 131/149, all 0 failed | **LANE 2** | `ops-lane@3baf7755` |
| 21 | Gate suites | deferred-register **14/0**, guards-exist **9/0**, audit-chain **36/0**, ops-audit-flush **14/0** | **ME, tonight** | `alerts-lane@4d3583bf` |
| 22 | Commit 5's gate | **35 open** here; **13 open** on the integration tree — I re-parsed both | **ME, tonight** | both trees |
| 23 | Commit 7's gate | **63 open** here (13+6+14+6+5+16+3); **66** on the integration tree | **ME, tonight** | both trees |
| 24 | The 38 unmeasured Commit-7 rows | 38, and the accounting closes to 63 | **ME, tonight** — counted the id list | `C7-DEBT-TRIAGE.md` §8 vs the register |
| 25 | Rows needing a ruling | exactly **4**: 35, 40, 50, 53 | **ME, tonight** — counted the flags | `DEFERRED-TESTS.md` |
| 26 | Nothing is served in this lane | `.next` absent; listeners: **3047** (node, 06:51 today) and **5433** (scratch Postgres); **3021 free** | **ME, tonight** | this machine |
| 27 | red-anchors ratchet | **66 vs ceiling 65** — and it is `origin/main`'s, proved by identity of the ratchet, the harness list and the nine exemptions | **ME, tonight** | `alerts-lane` and `origin/main` |
| 28 | decomment ratchet | **22 vs ceiling 20**; all six carriers byte-identical to `main` | **ME, tonight** | same |
| 29 | popup-fit ratchet | **69 vs 57**; the 69th is `stop-queued.tsx`, absent from `main`, introduced by `00eb20ff` | **ME, tonight** | same |
| 30 | Pre-push guard coverage | armed in 5 of 8 worktrees; **absent in `main`, `audit` and `platform`**; the hook lives outside every repository | **ME, tonight** | `config.worktree` in all 8 worktrees |
| 31 | The real-engine drive, targeted case | **13 passed / 0 failed** | **LANE 2** — the file is not on my branch | `ops-lane@3baf7755`, commit `60de3807` |
| 32 | The drive's other three cases | open, not run | **LANE 2's own register** | `ops-lane@3baf7755` §1m row 212 |
| 33 | Auto-gc disabled; the named corrupt object | `gc.auto = 0`; the object **reads back clean** as a commit right now | **ME, tonight** — and inconclusive; I may not run a full integrity check | this repository |
| 34 | Lane 1's coverage hole | `/admin/system` painted house words and sat inside **no** house-word population; new guard, 31 assertions | **LANE 1** | `house-bots@fd2b6ed5` |
| 35 | The integration lane's verdict | **"NOT fit to push to main"** | **LANE 2** | `ops-lane@3baf7755` |

### Figures I could NOT re-derive, named

| Figure | Whose | Why not |
|---|---|---|
| 10 of 10 rows lost on a kill; 40-row `valid:true` chain; drain 23 ms / burst 95 ms | lane 4 | Needs a scratch Postgres and a real termination signal; Windows cannot deliver one, and three lanes are running |
| All two-store house suite counts | lane 2 | Each spins a scratch database; too heavy to run beside three active lanes |
| The sabotage batches' caught/missed counts | this lane's earlier runs, and lane 2 | A red harness rewrites real source on disk; running 458 of them beside three lanes is how a live gate gets left disabled |
| The served visual ladder at six widths | lane 2 | This lane owns no port and has no build |
| `test:house-bot-disclosure` = 109 | lane 2 | Their copy of the suite is 41 lines longer than mine; mine prints **31/0** and lane 1's prints **31/0** at `fd2b6ed5`. Both can be true; I did not reconcile them |
| Anything about production | nobody | This programme has not touched production and may never |

---

*Written in the alerts lane, `C:/kipindi-alerts`, branch `alerts-lane`, on the tree at `4d3583bf` with a
clean working tree. Every command above was a single light process; the heavy-node lock was free throughout
and was not taken. No file outside this document was created, edited or staged.*
