# House accounts (the desk) — readiness statement

**For Ali. 21 September 2026.** Written in the alerts lane, from measurements taken tonight.

---

# THE VERDICT

> ## NOT YET — and here is what is left.

Six things stand between today and a switch you can flip. Four of them are work. **One of them is a
decision only you can make, and nothing can move until you make it.** One of them is a fault in the
platform that has nothing to do with house accounts but would be made worse by switching them on.

**Read this first, because it changes how urgent this is:** the feature is *already on the live site*.
It went out with the ordinary releases over the past week. It is switched **off**, it ships **off**, and
it cannot be switched on by accident — I checked that four separate ways tonight and all four hold. So
"not yet" does not mean anything is leaking or at risk right now. It means **do not flip the switch
yet**, and here is the short list of why.

---

## What is left

Each of these is either done or not done — you can tick them off.

| # | What | Who | Blocking? |
|---|---|---|---|
| 1 | **Answer question 1 on the decisions page** (the two checks filed against the wrong stage). Until you answer, the stage cannot be declared finished *by anybody* — not by me, not by any session. | **Only you** | **Yes — outright** |
| 2 | Answer questions 2, 3, 4 and 5 on the same page. Each one holds a line open. | **Only you** | Yes |
| 3 | **Ship the audit-record fix to the live site.** The fix is built and it works, but it is sitting on a side branch. The live site does not have it. | Us | Yes |
| 4 | **Empty the two checklists.** Thirty-five items on one, sixty-three on the other, counted on my copy tonight. On the integration copy the same two lists stand at thirteen and sixty-six. | Us | Yes |
| 5 | **Build and run the app once, properly, on a quiet machine**, and work through the checks that need a running screen. Thirty-eight of the sixty-three are waiting on exactly this. | Us | Yes |
| 6 | **Run the deliberate-sabotage batches** — the exercise where we break each safety check on purpose to prove it would actually catch a fault. Three hundred and ninety-eight of them are declared and none were run tonight. | Us | Yes |
| 7 | **Check the live site's own settings** — that the switch really is off there and the engine is configured the way we think. This cannot be done from this computer. | **Only you** | Yes |

Items 1, 2 and 7 are yours. Items 3, 4, 5 and 6 are ours and are days of work, not weeks — most of item 5
is one careful evening with the machine to itself.

---

## 1. What the feature is, and what the switch does

The platform lets people bet against each other. Sometimes nobody has taken the other side of a market
yet, so there is nothing for a real customer to bet against, and the market sits dead.

**The house accounts are accounts the business itself owns, which can take that other side.** They put
the first stake into an empty market so a real customer has something to bet against, and they can take
the opposite side of a customer's position so the customer's bet can actually be placed. They are run by
an automatic engine on a clock, inside limits you set — how much they may stake in a day, how much they
may lose in a day, how much they may have riding at once, how many bets per minute, and so on.

**The switch is a single on/off control on an owner-only page.** Off, the house accounts do nothing at
all. On, the engine may begin placing stakes inside the limits you have set.

Three things about the switch I checked directly tonight, rather than taking anyone's word:

- **It ships off.** The database column that holds it is created switched off by default, and the single
  control row is created with every limit blank.
- **It cannot be switched on until you have set eight specific limits.** The list of eight is fixed in
  the code and the server enforces it — the page does not merely hide the button.
- **A blank limit refuses every stake, rather than allowing everything.** This is the important one and
  it is the opposite of how most systems fail. If a limit is left unset, the rule reads "refuse", not
  "no limit". So a half-configured desk does nothing; it does not run wild.

There is also a separate off switch — a kill switch — that turns everything off in one action.

---

## 2. What is proven

All of this I ran or derived myself tonight, on my own copy of the code. Numbers in brackets are
"checks that passed / checks that failed".

**The rules of the desk behave as written.** The limit rules (527/0), the money seam where a house bet
meets the real betting machinery (98/0), the account lifecycle — setting one up, starting it, pausing
it, removing it (16/0), and the secrecy rules that keep house accounts invisible to players (31/0).

**The safety checks are real checks, not decoration.** Two thousand five hundred and seventy-six
assertions pass across the whole safety-net suite. Every one of the 398 declared sabotage cases still
points at a real, unique line of live code — which is what stops a safety check quietly becoming about
nothing after the code moves underneath it.

**The switch is guarded in four independent places.** Not one gate that everything trusts, but four
separate points in the code that each read the switch for themselves and refuse if it is off. One of
them being bypassed does not open the door.

**The record-keeping checks pass** — the tamper-evident log's own suite (36/0), and the check that our
maintenance scripts flush their records properly (14/0).

**The checklist itself is honest.** An automatic check reads the checklist and fails if a line claims to
be done without evidence (14/0). I counted the checklist by script rather than by eye: thirteen
sections, one hundred rows, and exactly four rows flagged for your decision.

**The one thing I want to single out, because it is the strongest evidence there is:** on the
integration copy, another lane drove the whole thing end to end — the real planner deciding, the real
engine firing on a real clock against a real database, with the switch genuinely on. Thirteen cases
passed, and the engine fired three seconds after the moment it had calculated it was due. **I did not
re-run that and I could not** — the script does not exist on my copy, and it creates a database and
turns the master switch on, which I will not do beside three other running lanes. It is their
measurement, named as theirs.

---

## 3. What is not measured, and why

This section carries the same weight as the one above.

**Nothing has been measured on the live site. Nothing in this entire programme has touched production,
and it may never.** We do not know from measurement whether the switch is off on the live database,
whether the engine is configured there and how, or whether the two database changes the feature needs
have actually been applied. Those are checks that have to happen against the real site.

**No version of the app was built or run tonight.** There is no built copy in my lane, and building one
costs the machine dearly while three other lanes are working. Thirty-eight of the sixty-three items on
the second checklist need a running screen to look at. Roughly twenty-six of them would clear against
one ordinary local run; the other eight need a full production-grade build and sole use of the database.

**The sabotage batches were not run.** We have 398 declared cases and I confirmed all of them still
point at real code — but confirming a case is *aimed* correctly is not the same as firing it. I did not
fire them, deliberately: that exercise rewrites real source files on disk and puts them back, three
lanes are live in this repository right now, and this programme has already had one such run leave a
live payout safety gate switched **off** while reporting everything clean. That is not a risk worth
taking tonight.

**The heavier database suites were not run** — the ones that check caps, money, migrations and reports
against a real database engine. Each one starts its own scratch database on a server that belongs to
another lane's working copy.

**The hardware is not trustworthy and I could not prove otherwise.** This computer has known-failing
memory. A stored item in the project's history was reported corrupted tonight. I checked that specific
item and it reads back perfectly clean right now — but I am forbidden from running the full integrity
scan (it is exactly the kind of heavy operation that crashes this machine), so **I cannot tell you
whether damage sits somewhere else, or whether it comes and goes.** That is an open question, not a
clean bill of health.

---

## 4. The open defects you would be accepting by flipping

Stated plainly. None of these are softened.

### 4a. The platform loses record-keeping entries when the server shuts down

This is the serious one, and **it is not a house-accounts problem — it is a platform-wide problem that
has been there all along.** House accounts make it matter more, because a house account placing bets
generates exactly the kind of record you would later need.

What I verified myself, in the live code: of the 491 places in the live codebase that write a
record-keeping entry, **467 do not wait for the write to finish.** They fire it and move on. On an
ordinary shutdown — every single deployment is one — whatever has not finished is simply lost. There is
a function whose job is to flush those pending writes before exit. **It is called zero times anywhere
in the live application code.** The only thing that mentions it is its own definition.

Worse, the log cannot see its own hole. I read the verifier line by line. It proves the entries that
*are* there link together correctly — and a lost entry breaks no link, because it was never written.
So the check reports "valid" over a log with entries missing. And there is no repair path: the live
code can create a record and read records, but has no ability to update or insert one after the fact.
**A record that was never written can never be added later.**

Another lane measured the consequence directly: **ten out of ten records were lost on a real shutdown**,
and the verifier reported the log valid over a chain with forty known-missing entries. I did not re-run
that — it needs a real shutdown signal, which Windows cannot send, and a scratch database I must not
start beside three live lanes. **That measurement is theirs, not mine.** What I did instead was confirm
the *mechanism* at source, which is the stronger half: I can show you why it must happen.

**What has changed while I was writing this.** That lane pushed new work during my session — the branch
moved twice under me. At the tip I read tonight:

- **The drain is built and wired in.** On shutdown the app now flushes pending records before exiting,
  and the flush function now genuinely is called from live application code. They measured it turning
  ten-out-of-ten-lost into ten-out-of-ten-saved in 23 milliseconds.
- **The verifier no longer lies about a tampered record.** I checked this at source myself. Previously
  an edited record was quietly counted as "cannot be re-verified" while the overall answer stayed
  "valid" — so an officer reading the headline was told a tampered log was sound. Now an unexplained
  record makes the answer "not valid".

**But none of it is on the live site.** I checked: that work is not merged, and the drain simply does
not exist on the live branch. There is also a risk they name and have *not* been able to test — that on
our hosting the shutdown signal may never reach the app at all, because of how the app is started. I
confirmed the start-up configuration they base that on is exactly as they describe. **Nobody has
verified the behaviour**, on either side.

One operational note for whoever ships the fix: the improved verifier needs a one-time "baseline" to be
recorded first, covering the historical records that predate the current signing method. Until that is
done, it will report the old records as unexplained.

### 4b. Our own published rules tell players that bots are not allowed

This is owed to your **players**, not to a regulator, and it is the one on this page I would think
hardest about.

I read the live site's own published text tonight. In both product lines, in **both English and
Swahili**, the rules say in plain words that using bots, scripts or automated tools to place stakes is
prohibited, and that holding multiple accounts or colluding is prohibited. The terms add "one account
per natural person."

Switching on house accounts means the business runs automated accounts placing stakes, on a platform
whose published rules tell customers that is not allowed. **The rules do not currently carve out an
exception for the house.** That is a straightforward inconsistency between what we tell players and
what we would be doing, and it is a decision about honesty with customers rather than a technical one.
It costs a text change and a translation — but it is a change to the promises you have made, so it is
yours.

### 4c. The switch is held by one lock and a kill switch, not two

Turning the desk on requires one person: an owner, on an owner-only page. There is **one** enforced
check of who you are, plus the eight-limits requirement, plus a separate kill switch for turning it off
fast. There is deliberately **no** second-officer approval — no "two people must both agree" — and that
matches your own earlier dated decision for this platform, so it is not an oversight.

What it means in practice: **anyone who can get into an owner account can switch on the house accounts
by themselves.** The design does protect against one particular accident — two owners clicking at the
same moment produce a single switch-on, not two — but that is about duplicates, not about authority.

### 4d. This computer's memory is failing

The machine the work is being done on has known-failing RAM. It crashes under heavy load, which is why
suites are being run one at a time and why builds keep being deferred. A stored item in the project
history was reported corrupted tonight. As above: that item reads clean now, and I was not permitted to
run the scan that would tell us whether anything else is damaged.

This does not affect the live site. It affects **how much you should trust work produced on this
machine**, including tonight's — which is part of why this document distinguishes so carefully between
what I measured and what I was told.

---

## 5. What only you can do

**Five decisions.** They are written out in full, in plain language, on the decisions page dated today —
each with a recommendation, what it costs, and what happens if you leave it unanswered. One line each
is enough.

Briefly: (1) two checks filed against the wrong stage, which is the one item that blocks the release
outright; (2) whether to accept a cosmetic fault that affects four sections of the site, not just this
one; (3) which of two contradictory records of the same check to believe; (4) a check whose instructions
were written down wrong and so never happened; and (5) a correction to one of your own dated
instructions, which points at a disk drive this computer does not have. I confirmed that one myself:
**this machine has exactly one drive, C.** The instruction names a drive F, twenty times over in the
programme's main record. Nobody will rewrite an instruction of yours without your word.

**Two decisions this document adds**, which are not on that page:

- Whether to change the published player rules before switching on, or to hold the switch until they
  are changed (4b above).
- Whether to ship the record-keeping fix to the live site before switching on, or to accept the loss
  (4a above). My recommendation is to ship it first — it is built and measured, it just is not live.

**The production check.** Someone with access to the live hosting needs to confirm the switch is off on
the live database, confirm how the engine is configured there, and confirm the two database changes
have actually been applied. **This cannot be done from this computer**, and no session in this
programme has ever had that access.

**And the switch itself.** That is yours, and it stays yours. Nothing in this document, and nothing any
session has built, turns it on.

---

## 6. What you decided after this statement was written, and one correction I owe you

### 6a. 2026-09-21 — the address the browser tests point at. **You ruled: allowed, this computer only.**

A session asked whether it may set the address those tests aim at, rather than route around the rule
quietly. You ruled that it may — **and only ever at this computer itself**: `127.0.0.1` or `localhost`,
with the port named out loud.

**Why it was ever forbidden, because the reason matters.** Those tests used to point at **the live site
by default**. Fourteen of them share one setting, and a session that ran any of them without saying
otherwise drove a real browser at the live money platform, signed in as **you**, with your own console
password — and because the site allows one session per account, that signed you out of your own live
session. The ban was right for the file it was written against.

**What changed.** That default was fixed on 2026-09-19 and now points at this computer. So naming this
computer out loud is **safer** than the old do-nothing run, not riskier — which is the whole reason the
rule could be narrowed rather than kept or dropped.

**What it still forbids, unsoftened.** Never a website address. Never a public address. Never
`50pick.tz`. Never a run with nothing set and a hope. And the value is checked before it is used,
because a typo that points off this computer is the exact accident being guarded against.

⚠️ **What it does not do, stated plainly so nobody reads it as progress.** It unblocks the *setting*,
not the *checks*. Seven checks were written around it (15, 24, 32, 40, 51, 61 and 63 in the skipped-run
register). Every one still needs the site actually running on a port this lane does not have, and every
one is **still owed and still unrun**. A corrected reason is not a run.

### 6b. 2026-09-21 — a correction I owe you about the popup check

I told you the popup check was failing because of **one** new file of ours. **Both halves of that were
wrong**, and I found it by re-deriving the number instead of repeating it.

- **It was failing by twelve, not one.** The check itself said so in its own output; the three files it
  printed alongside were simply the last three in alphabetical order, not the new ones — so the number
  was read as a single file.
- **And eleven of the twelve are not ours.** They are already on the live branch, where the identical
  check is failing the same way today. They arrived with the agent programme, the identity-at-withdrawal
  work and the social panel. **Exactly one** — the stop-a-queued-stake dialog — is this branch's own.

**What I then did, rather than move the number.** That check works by holding the popups it finds
against a count of popups a human has actually read. Raising the count would have been the dishonest
close. So I opened all twelve and read them against the same standard the other 57 were read against:
**none of them cuts off any text**, none hides a sentence behind a clip, and the one that carries a long
unbreakable link already breaks it correctly. Our own dialog passes: every sentence in it can grow as
long as it needs and the dialog grows with it, which is your rule word for word.

Only then did I record them as read, **by name** — so the next time this fails, it says *which* file is
new instead of leaving somebody to guess. ⚠️ Still owed: none of the twelve has been photographed on a
real screen at phone width in Swahili. That half of the proof needs the site running, which this lane
cannot do.

---
---

# Appendix — evidence

*For an auditor. You can ignore everything below this line.*

**Method.** Every figure in the body is re-derived in this run from the working tree or from a run I
performed, except where it is explicitly attributed to another lane. Figures I could not re-derive are
named as claims with their owner. One figure carried in my own brief was refuted; see A.9.

**Where I stood.** Worktree `C:/kipindi-alerts`, branch `alerts-lane`, HEAD `db8e3f66`, working tree
clean (`git status --porcelain` empty) before and after every run. Suites were run one at a time. No
build, no browser, no database was started. No file-mutating red harness was driven.

**⚠️ Lane tips are moving targets and three moved during this run.** Every cross-lane statement below
names the tip I actually read.

| Ref | Tip at the start of my run | Tip after my final fetch |
|---|---|---|
| `origin/main` | `418f1b59` | `418f1b59` (unchanged) |
| `origin/rel-lane` | `09398014` | **`c52c5c44`** (brief cited `2890dce5`) |
| `origin/ops-lane` | `5865970e` | **`e2975200`** (brief cited `3baf7755`) |
| `origin/house-bots` | `fd2b6ed5` | **`cbb2a400`** |

`alerts-lane` is 0 behind / **107 ahead** of `origin/main` (`git rev-list --left-right --count`).

---

## A. Re-derived by me, in this run

**A.1 — Un-awaited record-keeping calls on the live branch.** `git grep "audit({" origin/main -- src/**`
returns 492 matching lines; one is prose inside a docblock (`src/lib/server/reports/catalogue.ts:871`),
leaving **491 real call sites, of which 24 are awaited → 467 un-awaited.** The same method on
`alerts-lane@db8e3f66` gives the identical 492/1/24 → **467 of 491**. The brief's headline reproduces
exactly; note the denominator is method-dependent (counting every `audit(` form gives a different
total), so the pair must always be quoted with its method.

**A.2 — `auditFlush` has zero production callers.** `git grep "auditFlush" -- src/**` returns **exactly
one line** on `origin/main` and one on `alerts-lane`: its own definition at
`src/lib/server/audit.ts:466`. Under `scripts/`, 41 files mention it (my count is of files containing
the string; the brief's 21 counted call sites — different method, same conclusion).

**A.3 — No repair path.** On `origin/main`, `src/` contains `auditLog.create` ×1, `auditLog.count` ×4,
`auditLog.findMany` ×7, and **zero** `update`, `delete`, `updateMany` or `deleteMany`.

**A.4 — The verifier cannot see a lost row.** Read at source, `src/lib/server/audit.ts`,
`verifyChainFull()` declared at line 897. Its final statement is a literal
`return { valid: true, total, verified, unverifiable, linkBroken: false }`. `valid` is set false only by
the link check (genesis / dangling / unreferenced aggregates). A row that was never written consumes no
link and breaks nothing. A **tampered** row recomputes to a different hash, matches no key, and is
counted `unverifiable++` — `valid` stays `true`. The behaviour is deliberate and documented in place;
the defect is that the headline boolean does not carry it.

**A.5 — No shutdown drain on my branch or on live.** `git grep "SIGTERM\|SIGINT" -- src/**` returns
handlers in exactly two modules on both branches: `house-bot/engine.ts` (claim requeue;
`:340-341` on alerts, `:305-306` on main) and `lifecycle.ts:554-555` (leadership hand-over). Neither
flushes the record queue.

**A.6 — The feature is already on the live branch.** `origin/main` carries 37 modules under
`src/lib/server/house-bot/` (alerts has 38), 11 under `src/lib/house-bot/`, and both migrations
(`20260916150000_house_bot_tables`, `20260916150100_house_bot_markers`).

**A.7 — It ships off, and off is safe.**
- `20260916150000_house_bot_tables/migration.sql:120` — `"enabled" BOOLEAN NOT NULL DEFAULT false`.
- `:165` — `INSERT INTO "HouseBotControl" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;`, under
  a comment reading "SEEDED DISABLED. Every cap NULL."
- `src/lib/house-bot/rules.ts:858` — `REQUIRED_FOR_MASTER_ON` holds exactly **8** fields:
  `gCapDailyStakeTzs`, `gCapDailyLossTzs`, `gCapOpenExposureTzs`, `gCapPerMarketTzs`,
  `gMaxBetsPerMinute`, `gMaxBetsPerDay`, `gCounterPerPlayerPerDay`, `gCounterPerPlayerTzsPerDay`.
  Enforced server-side at `house-bot/switch-on.ts:80`, counted over the same constant.
- `src/lib/server/house-bot/seam.ts:70` — `const over = (limit, value) => limit == null || value > limit`.
  **An unset cap refuses every stake.** Fail-closed, verified at source.
- Four independent switch reads: `planner.ts:188`, `trigger.ts:118`, `fire.ts:112` (`house_disabled`),
  `seam.ts:119` and `seam.ts:332`.
- Kill switch: `src/lib/server/house-bot/kill-switch.ts:43`, `switchOffHouseBots`.

**A.8 — The engine is opt-OUT.** `src/lib/server/house-bot/engine.ts:138` —
`houseBotEngineEnabled(env) => env !== "false"`. Timers start unless `HOUSE_BOT_ENGINE` is explicitly
the literal string `"false"`. The master switch, not this, is what gates betting — but this is why the
production environment variable must be read, not assumed.

**A.9 — ⛔ REFUTED: the sabotage total is 398, not 458.** My own brief carried "458 declared sabotage
mutations across 6 house anchor files, counted by importing them: console 281, seam 67, money 56,
engine 46, ceremony 5, dal-claim 3." I re-counted by importing each module and reading `MUTATIONS.length`:

| File | Brief | Re-derived `MUTATIONS.length` |
|---|---|---|
| `house-bot-console.anchors.mjs` | 281 | **281** ✅ |
| `house-bot-seam.anchors.mjs` | 67 | **7** ❌ |
| `house-bot-money.anchors.mjs` | 56 | **56** ✅ |
| `house-bot-engine.anchors.mjs` | 46 | **46** ✅ |
| `house-bot-ceremony.anchors.mjs` | 5 | **5** ✅ |
| `house-bot-dal-claim.anchors.mjs` | 3 | **3** ✅ |
| **Total** | **458** | **398** |

The seam file's *other* exported arrays are `SEAM_SITES` (38), `H2_CAP_SEQUENCE` (14) and `H2_ORDER` (8);
38 + 14 + 8 + 7 = **67 exactly**. The brief counted `MUTATIONS` for five files and *every exported array*
for the sixth. **458 is a composite of two counting methods.** The 60 extra entries are not sabotage
declarations at all — they are inventory and ordering pins the suite asserts against. Tree-wide, the 90
anchor files declare 1,151 mutations.

**A.10 — Suites I ran tonight on `alerts-lane@db8e3f66`.** One at a time, no database, no build.

| Suite | Result |
|---|---|
| `test:red-anchors` | **2576 passed / 4 failed** |
| `test:house-bot-rules` | 527 / 0 |
| `test:house-bot-seam` | 98 / 0 |
| `test:house-bot-holder-lifecycle` | 16 / 0 |
| `test:house-bot-disclosure` | 31 / 0 |
| `test:deferred-register` | 14 / 0 |
| `test:guards-exist` | 9 / 0 |
| `test:audit` (audit-chain) | 36 / 0 |
| `test:ops-audit-flush` | 14 / 0 (10 mutating scripts) |
| `test:decomment` | 21 / 1 |
| `test:popup-fit` | 12 / 1 |

Every one reproduces the brief's figure. `red-anchors` §3 passed for every house declaration — all 398
resolve exactly once against the tree.

**A.11 — The three ratchet reds, and whose they are.** This is the attribution, re-derived:

- **`red-anchors` §4.1/§4.2 — 66 undeclared harnesses vs ceiling 65. INHERITED FROM LIVE.** Proof:
  `scripts/red-anchors.test.mts` is **byte-identical** to `origin/main` (`git diff --stat` empty); the
  `red:*` key set is **identical** — 170 on main, 170 on HEAD, `diff` of the sorted sets empty, 0 added
  and 0 removed; and this branch **deletes no anchor file** (`--diff-filter=D` empty), adding only
  anchors, which can only *lower* the undeclared count. **The live branch is over its own ceiling and
  was before any lane existed.** Independently corroborated by lane 2's commit `c1a734a7`, "the anchors
  ceiling re-derived, and NEITHER excess declared — main is itself red at 66."
- **`decomment` §2.1 — 22 carriers vs ceiling 20. INHERITED FROM LIVE.** All six named carrier files
  (`admin-act-gate.test.mts`, `admin-soft-gate.test.mts`, `contrast-audit.mts`, `dead-css.test.mts`,
  `dead-schema.test.mts`, `design-frozen.test.mts`) are byte-identical to `origin/main`. ⚠️ **Caveat the
  brief omitted:** `scripts/decomment.test.mts` itself *differs* from main. I read the diff — 2 hunks,
  both in §5, both replacing a top-level `readdirSync` with a recursive walk. That **widens** the
  population. `CARRIER_CEILING = 20` is identical on both branches at line 204. **No guard weakened.**
- **`popup-fit` §1.1 — 69 popup components vs reviewed 57. THE PROGRAMME'S, not live's.**
  `src/app/admin/desk/stop-queued.tsx` is **absent** from `origin/main` and was introduced by
  `00eb20ff`, "C7 step 5 (landing half)". `scripts/popup-fit.test.mts` is byte-identical to main. Lane
  2 records this as "ours"; it is more precisely the programme's — correctly not the live branch's.

**A.12 — The checklist, counted by script from its own tables.** `plans/house-bots/DEFERRED-TESTS.md`:
**13 sections, 100 rows.**
- Commit-5 gate (§1 + §1c + §1d + §1j + §2) = 12 + 3 + 1 + 13 + 6 = **35 rows**.
- Commit-7 gate (§1b + §1e + §1f + §1g + §1h + §1i + §1k) = 13 + 6 + 14 + 6 + 5 + 16 + 3 = **63 rows**.
- Rows carrying a FLAG: **exactly four — 35, 40, 50, 53.**
- §3 "Cleared" holds 2 rows (14, 34).
Both gate totals reproduce the brief exactly. ⚠️ A naive "CLEARED" text match over-counts, because rows
9 and 10 read "ATTEMPTED AND **NOT** CLEARED"; the 35 and 63 above are row counts, which is what the
gate rule measures.

**A.13 — The 38 not-measured Commit-7 rows.** Counted from the id list itself: 13, 15, 16, 17, 19–24,
30, 32, 33, 36, 37, 41–44, 46–48, 51, 52, 56, 57, 59, 61, 63–65, 67–69, 72, 73, 75, 89 = **38**. The
accounting closes exactly to 63: 15 clear + 38 + 1 half-paid + 4 rulings + 3 findings + 2 stale = 63.

**A.14 — Published player rules, read on the live branch.** `origin/main`:
`src/app/legal/rules/_content-up-down.tsx:216` (EN, bots) and `:396` (SW, "Roboti"); `:214`
(multiple accounts / collusion); `src/app/legal/rules/_content-yes-no.tsx:221` (EN) and `:394` (SW);
`src/app/legal/terms/page.tsx:110` — "One account per natural person". Both product lines, both
languages, live.

**A.15 — ⛔ CONTRADICTION CONFIRMED: the pre-push guard covers five of eight worktrees, not seven.**
`PROGRESS.md` (as corrected 2026-09-19) states `C:/kipindi-main` is "the only checkout the pre-push
guard does not cover". **False.** Enumerating `hooksPath` across every `config.worktree` under
`C:/kipindi-main/.git/worktrees/`:

| Worktree | Guard |
|---|---|
| `kipindi-alerts`, `kipindi-house-bots`, `kipindi-old-build`, `kipindi-ops`, `kipindi-rel` | **ARMED** |
| `kipindi-main` (shared config, no `hooksPath`) | absent — intended |
| **`kipindi-audit`** | **absent — no `config.worktree` at all** |
| **`kipindi-platform`** | **absent — no `config.worktree` at all** |

This matters more than a miscount: `origin/main`'s own tip `418f1b59` is **"platform L17"**, authored
from `platform-lane`, and `418f1b59` is an ancestor of the `platform-lane` worktree head `7867f878`.
**The worktree that actually pushes to live is one of the three the guard does not cover.** The guard
itself is a 158-byte `pre-push` at `C:/kipindi-house-bots-hooks/`, outside every checkout, untracked, in
no clone and no backup; it blocks only `refs/heads/main`.

**A.16 — Environment at the time of writing.** `C:/kipindi-alerts/.next` does **not** exist. **Port 3021
is free** — and so is **3047**, which the brief recorded as held by node PID 17048; that listener is
gone. The only relevant listener is `127.0.0.1:5433`, the embedded Postgres belonging to lane 1's
worktree (PID 16424). `gc.auto = 0`, confirmed.

**A.17 — The named corrupt object.** `9802802836ee8c5f78dd8cb31953d55a18257948` reads back **clean**:
`git cat-file -t` returns `commit`, and `-p` decompresses a full, well-formed commit ("Jay unit K,
increment 3…"). **Inconclusive, not reassuring** — I am forbidden to run `fsck`/`gc`/`repack`/`prune`
and did not, and avoided full-graph walks, so I cannot speak to the rest of the graph.

**A.18 — The drive letter.** `Get-PSDrive -PSProvider FileSystem` returns exactly one name: **`C`**.
`plans/house-bots/PROGRESS.md` writes `F:/kipindi-old-build` **20 times** and `C:/kipindi-old-build`
3 times. (The decisions paper cites 8 and 0 for the rulings section specifically; my count is over the
whole file — different scope, same conclusion.) `C:/kipindi-old-build` is checked out at `418f1b59`,
**exactly level with `origin/main`**, which is the condition the instruction was asking someone to
create.

---

## B. Lane 4's audit remedy, read at `origin/rel-lane@c52c5c44`

⚠️ The branch moved twice during my run (`2890dce5` in the brief → `09398014` → `c52c5c44`). Everything
below is at `c52c5c44`, read by `git show`, not run.

**Fixed, and verified by me at source:**
- **Drain wired.** `src/instrumentation.ts:39-40` imports and calls `installAuditShutdownDrain`, defined
  at `src/lib/server/audit-drain.ts:172`.
- **`auditFlush` now has production callers** — `audit-drain.ts:189` and `house-bot/worker.ts:94`. This
  falsifies that lane's own docblock at `audit-reconcile.ts:8` ("called from production code ZERO
  times"), which remains true of `origin/main` and of my branch but is **already false on its own tip**.
- **Reconciler wired.** `lifecycle.ts:405-406` dynamically imports and awaits `declareBetAuditGaps`.
- **The tamper verdict is fixed** (their AR-3, dated today). `verifyChainFull` now returns
  `valid: false` when `unattested > 0`, and separately when `baselineMismatch` holds — a row at or below
  the declared frontier having been edited. Their docblock records the old behaviour measured with a
  tamper planted and restored: `{"valid":true,"verified":120,"unverifiable":1,"linkBroken":false}`.
  Legacy rows are still not called tampering, but must now be **declared** via a dated, digested,
  chained baseline rather than assumed.

**Remaining, at that tip:**
- **None of it is on live.** `origin/rel-lane` is **not** an ancestor of `origin/main`, and
  `src/lib/server/audit-drain.ts` is **absent** from `origin/main`.
- **AR-2 is unverified by anyone.** The risk that the hosting platform's shutdown signal never reaches
  the app because npm becomes the main process. I confirmed only the **premise** at source:
  `origin/main`'s start command is exactly `prisma migrate deploy && next start`, and `railway.json`
  declares `healthcheckPath`, `healthcheckTimeout 300`, `overlapSeconds 60`, `drainingSeconds 30` and
  **no** `startCommand`. **The behaviour is untested on both sides** — Windows cannot deliver SIGTERM
  and their hosting account is unauthorized for the project.
- **A new operational precondition:** the improved verifier needs `audit:baseline` run once before it
  will return `valid: true` over historical rows.

---

## C. Claims by other lanes — NOT re-derived, named with their owner

- **Lane 4 (`rel-lane`):** 10 of 10 bare appends lost on a real SIGTERM against a scratch Postgres with
  production's shutdown ordering; `verifyChainFull` returning `{valid:true, verified:663,
  linkBroken:false}` over 40 known-lost appends; the drain turning 0/10 into 10/10 in 23 ms and 50/50 in
  95 ms; exit codes unchanged (143 SIGTERM, 130 SIGINT). **Not re-derived:** Windows cannot deliver
  SIGTERM at all, and it needs a scratch cluster I must not start beside three live lanes. I confirmed
  the *mechanism* at source instead (A.4, A.5) — the stronger half for a causal claim, the weaker half
  for a magnitude.
- **Lane 2 (`ops-lane`, at `3baf7755` as cited to me; tip is now `e2975200`):** the two-store house
  suites — console mem 710 / pg 475, reports 244 / 80, engine 751 / 730, money 131 / 149, all 0 failed;
  `red-anchors` 2874/6; `admin-action-gate` 14/0; `admin-section-gate` 21/0; `scenario-coverage` 19/0;
  `house-bot-disclosure` 109/0; `tsc` exit 0; the seeded visual pass `qa:house-bots-visual` 954/0 over
  13 routes at six widths. **Not re-derived:** each spins a scratch database, or needs a build and a
  port this lane does not own.
- **Lane 2 — the end-to-end drive** (`qa:house-bots-local -- --only target`, commit `60de3807`): 13
  passed / 0 failed, poller fired 3 s after the computed due instant. **The single most valuable
  measurement in the programme, and it is theirs.** Not re-derived: the script does not exist on my
  branch, it creates a database, and it turns the master switch on.
- **Lane 2's own release verdict: "NOT fit to push to main", with five things named.** I re-derived
  three of the five independently — the two inherited ratchets (A.11) and the Commit-5 count (A.12).
  The `tsc` and served-suite halves are theirs.
- **Lane 1 (`house-bots`, cited at `fd2b6ed5`; tip is now `cbb2a400`):** the scope hole where
  `/admin/system` paints house wording while sitting inside no house-word population; new guard, 31
  assertions, union 412 of 1,087 source files. **Not re-derived:** the guard does not exist on my branch.
- **This lane's earlier sessions:** the console sabotage batch 281/281 clean, 96 caught, 27 caught / 0
  missed. **Not re-run tonight**, deliberately — see D.3.

---

## D. Not measured, with the reason

1. **Anything on production.** Whether the switch is off on the live database; whether
   `HOUSE_BOT_ENGINE` is set on the hosting and to what; whether either migration has actually been
   applied by `prisma migrate deploy`; whether a shutdown signal reaches the container at all. No
   session in this programme has had that access.
2. **38 Commit-7 rows resting on a served build and a port.** Re-derived tonight: `.next` absent, 3021
   free but allocated to lane 2, and a `next build` is not affordable beside three live lanes. Up to 26
   discharge against one locally served app; the remaining 8 need a production build plus exclusive use
   of the 5433 cluster.
3. **The sabotage batches — all 398.** A red harness rewrites real source on disk and restores it; three
   lanes are live in this repository; a concurrent run has already left a **live payout gate disabled
   while reporting clean**. Only the static audit (`red-anchors` §3 — all 398 resolve exactly once) was
   run.
4. **Every two-store Postgres house suite** — caps, money, migrations, designation, engine, comms,
   info-edge, reports, console. Each spins a scratch database on lane 1's cluster.
5. **`tsc`, `next build`, any browser drive, `qa:live`, the design-gate drives, the console probe,
   `verify:house-bot-bundle`, the six-width visual ladder.** All need a build, a port, or both.
6. **The end-to-end drive's three remaining cases** — Enter-now on a market with both pools at exactly 0;
   the Up & Down 3-minute counter through the inline post-commit hook; report-pack durability over
   12,000 bet rows. The file is not on my branch and it turns the master switch on.
7. **`ENTER_NOW_REQUESTED` has no production writer at all.** Lane 2 measured zero writers and
   deliberately did not manufacture one. Its full shape is unproven.
8. **Whether the object graph is sound** (A.17).
9. **Whether the 398 declarations actually redden the assertions they name** — only that they still
   *resolve* exactly once against tonight's tree.
10. **Commit 8 on this lane** — all ten board boxes unticked; the drive, rehearsals, final documents and
    release prep exist only on lane 2's branch.

---

## E. Contradictions recorded, not resolved

1. **`house-bot-disclosure`: 31/0 (me, `alerts-lane@db8e3f66`) and 31/0 (lane 1 at `fd2b6ed5`) vs 109/0
   (lane 2).** Re-derived tonight: the suite file is **312 lines on my branch, 353 on `origin/ops-lane`,
   296 on `origin/main`.** It is a genuinely larger suite there. Plausibly all three true on three trees.
   **Not reconciled.**
2. **Gate counts differ by tree.** Commit-5: 35 rows here vs 13 on ops. Commit-7: 63 here vs 66 on ops.
   Both correct — ops carries merge work this lane has not taken. **Any document quoting a single number
   is wrong on one of the two trees.**
3. **`red-anchors`: 2576/4 with 66 vs 65 (mine) vs 2874/6 with 67 vs 65 (lane 2).** Different trees. The
   *attribution* differs materially and mine is the stronger claim: the excess is **live's own**, proven
   by byte-identity and an identical 170-key set (A.11).
4. **Audit call-site counts differ by counting method, not by fact** (A.1). The 467 survives; the 489
   denominator in lane 4's docblock does not.
5. **Lane 4's docblock outran itself** — `audit-reconcile.ts:8` asserts `auditFlush` is called zero
   times from production code, which is true of live and of my branch but **already false on its own
   tip** (B).
6. **⛔ `PROGRESS.md` is wrong about guard coverage, and the gap includes the lane that pushes live**
   (A.15).
7. **⛔ My own brief's 458 sabotage declarations is a composite and the true figure is 398** (A.9).
8. **The brief says "the four decisions"; the decisions paper says five.** Four map to flagged rows
   (35, 40, 50, 53); the fifth is an owner-only correction to a dated instruction and is not a register
   row. Both statements are defensible; the paper's own title is "Five things only you can answer".

---

**Bottom line for an auditor.** The feature's *safety posture* is strong and independently verified: it
is off, it ships off, an unset limit refuses rather than permits, and four separate code paths enforce
the switch. What is not established is *completeness* — two gates are non-empty, no build was served,
the sabotage batches never fired, production was never touched — and one genuine platform defect
(record loss on shutdown) is fixed on a side branch and **not on live**. That is why the verdict is
NOT YET rather than READY, and it is a verdict about evidence, not about danger.
