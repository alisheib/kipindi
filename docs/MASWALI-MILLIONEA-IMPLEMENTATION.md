# Maswali Millionea — architecture review and implementation plan

> **STATUS: 🟡 PLAN. Nothing here is built. Nothing here is decided except where it says
> "already true".** This document evaluates the Arrow Consulting proposal
> (`Maswali_Millionea_Proposal.pdf`, `maswali_millionea_sample_questions.pdf`, Jaykishan Kaba,
> prepared for Ali Sheib) against the 50pick platform as it actually exists on `main`, and turns
> it into an implementation Claude Code can execute session by session.
>
> Written 2026-08-28. Reviewed against commit `681b86e7`.
>
> **This file is written to be the ONLY thing a session needs to read to start.** Every claim
> about the existing platform below was read out of the repository, not remembered. Where the
> proposal and the platform's own law disagree, the disagreement is stated and a recommendation
> is made — but §0 decisions are Ali's, and no code may be written before they are answered.

### Documents this plan depends on

Every claim below about the existing platform was read out of these, not remembered. They
outrank this file on any disagreement, and each is linked so `npm run test:docs` proves it is
still there.

| Document | Why it governs this plan |
|---|---|
| [`RULES.md`](RULES.md) | 🟢 **LAW.** The only statement of what we charge. §4 and §5 of this plan are a proposal to *change* it, by its own §5 procedure. |
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | 🟢 LAW. Where §0's seven decisions must be recorded before any code. |
| [`UPDOWN-ARCHITECTURE.md`](UPDOWN-ARCHITECTURE.md) | The worked precedent for adding a whole second product. §6's data model is its doctrine applied again. |
| [`DESIGN_AUTHORITY.md`](DESIGN_AUTHORITY.md) | 🟢 LAW. The only design rulebook. §12 is this feature measured against it. |
| [`design-system/v2-2026-07-27/06-patterns-and-rules/RULES.md`](design-system/v2-2026-07-27/06-patterns-and-rules/RULES.md) | RECORD — the designer's original wording of the sixteen laws, with worked "broken looks like" examples. ⚠️ Not the money file of the same name. |
| [`DATA-LAYER.md`](DATA-LAYER.md) | 🟢 LAW. Read before touching persistence. |
| [`DATA-AUDIT-2026-08-20.md`](DATA-AUDIT-2026-08-20.md) | The retention engine is an open **P0** there. §13 Lens 4 records that this feature adds to that debt rather than creating it. |
| [`FLOWS.md`](FLOWS.md) | 🟢 LAW. Redirects, gates and recovery paths — §8's routing must not contradict it. |
| [`FAILURE-INVENTORY.md`](FAILURE-INVENTORY.md) | Where S7's findings go if they are not fixed in the session that finds them. |
| [`README.md`](README.md) | The docs index. This file has a row there. |

⛔ **Do not restate a rate from `RULES.md` as though this file were authoritative.** Every figure
below is either an *analysis* of the proposal's own numbers or a *proposal* for a ruling — never a
statement of current law. If this file and `RULES.md` ever disagree about what 50pick charges,
`RULES.md` is right and this file is the defect.

---

## Contents

- [§0 · The seven decisions only Ali can make](#0--the-seven-decisions-only-ali-can-make) — **blocking**
- [§1 · Verdict: is it feasible?](#1--verdict-is-it-feasible)
- [§2 · What the proposal gets right](#2--what-the-proposal-gets-right)
- [§3 · What is missing — fifteen gaps, ranked](#3--what-is-missing--fifteen-gaps-ranked)
- [§4 · The money model, reconciled with `docs/RULES.md`](#4--the-money-model-reconciled-with-docsrulesmd)
- [§5 · The solvency arithmetic — the most important section in this file](#5--the-solvency-arithmetic--the-most-important-section-in-this-file)
- [§6 · Data model](#6--data-model)
- [§7 · The settlement algorithm](#7--the-settlement-algorithm)
- [§8 · Routing and placement — page, sub-page, or tab](#8--routing-and-placement--page-sub-page-or-tab)
- [§9 · Every surface that must change](#9--every-surface-that-must-change)
- [§10 · Admin console and RBAC](#10--admin-console-and-rbac)
- [§11 · Question quality — the sample slip does not survive contact with a resolver](#11--question-quality--the-sample-slip-does-not-survive-contact-with-a-resolver)
- [§12 · Design — and this is where the proposal is most wrong](#12--design--and-this-is-where-the-proposal-is-most-wrong)
- [§13 · Nine lenses — the verdict from every side of the platform](#13--nine-lenses--the-verdict-from-every-side-of-the-platform)
- [§14 · The checks that would lie](#14--the-checks-that-would-lie)
- [§15 · The sessions](#15--the-sessions)
- [§16 · File map](#16--file-map)

---

## §0 · The seven decisions only Ali can make

⛔ **No code may be written until these are answered in writing and recorded in
`docs/COMPLIANCE-DECISIONS.md`.** Four of the five change the arithmetic; one decides whether
the product may legally exist. A session that starts building before them is building a guess.

| # | Decision | Why it blocks | Recommendation |
|---|---|---|---|
| **D-1** | **Does the Gaming Board licence cover a fixed-stake multi-event jackpot?** | 50pick is licensed as a pari-mutuel prediction market. A fixed-entry pooled jackpot with a guaranteed prize is a materially different product and may sit under a different authorisation class. This is not a technical question and no amount of engineering answers it. | **Confirm with the Board in writing before session 1.** Everything below is wasted if the answer is no. Add to the GLI file. |
| **D-2** | **Is the TZS 20,000,000 guarantee real, and who funds it?** | The proposal writes `millionea_pool DECIMAL(18,2) DEFAULT 20000000.00` — a promise expressed as a schema default, which no code can keep. At TZS 1,000/ticket into the Millionea pool, the pool self-funds 20M only at **20,000 tickets in one cycle** (TZS 40,000,000 gross). Below that the house pays the gap. See §5. | **Launch progressive-only: no fixed guarantee.** Introduce a guarantee later, funded from a real ring-fenced account, once volume supports it. If the guarantee is non-negotiable for marketing, §5 gives the two structural fixes that make it survivable. |
| **D-3** | **13% of what?** | Platform law (`docs/RULES.md` §1) is **13% of the LOSING side**, on both existing products. The proposal charges **13% of gross**. These are different rules. See §4. | **13% of losing stakes.** It keeps ONE fee law across three products, it recovers the proposal's exact numbers whenever the jackpot rolls over, and it diverges only in the player's favour. |
| **D-4** | **What does a VOID question do to a ticket?** | The proposal has a Void outcome setter and says nothing about scoring. This is the single most disputed mechanic in every jackpot product ever run. See §3 G-1. | **Void counts as CORRECT for every ticket.** If **3 or more** of the ten void, the whole cycle voids and every ticket refunds in full — the ticket sold is no longer the ticket being settled. |
| **D-5** | **Can bonus money buy a ticket?** | A bonus-funded 10/10 is a house payout against money the player never deposited. `Position.bonusStakeTzs` exists and `buyPosition` will happily spend bonus balance unless told not to. | **No, for v1.** Real balance only. It must be an explicit, message-bearing refusal (§2.9 failure-message standard), never a silent omission. |
| **D-6** | **How many tickets may one player buy per cycle?** | Uncapped, the optimal strategy is to buy combinations — 1,024 tickets guarantees the top prize for TZS 2,048,000 against a pool that may hold more than that. It is simultaneously an arbitrage hole and the clearest responsible-gambling harm vector in the product. The proposal is silent. | **Cap it.** Config-driven, default **10 tickets per player per cycle**, enforced in the purchase path and stated on the slip. |
| **D-7** | **Is the route `/maswali` or `/millionea`?** | Cosmetic, but it must be settled before S1 or it is a rename across ~30 files. *Maswali* means "questions" — generic. *Millionea* is the distinctive half and the half marketing will use. | **`/millionea`**, nav label **"Millionea"**, full name *Maswali Millionea* in headings. This document uses `maswali*` for module names throughout; if D-7 lands this way it is one find-replace before S1, and painful after. |

---

## §1 · Verdict: is it feasible?

**Yes — the engineering is straightforward, and it is not where the risk lives.**

The platform already has, working and settled on production with real money:

- an atomic bet path with admission control, idempotency, KYC/RG gates and rate limiting
  (`buyPosition` in `src/lib/server/market-service.ts`);
- double-entry accounting where every group must sum to zero before insert
  (`postLedgerEntries` in `src/lib/server/ledger.ts`), with a nightly wallet↔ledger trial balance;
- largest-remainder share allocation that sums exactly (`allocateFeeShares`,
  `allocateWinnerPayouts` in `src/lib/payout.ts`);
- rate-freezing per market (`PredictionMarket.feeSnapshot`) so a config change cannot reprice a
  bet already placed;
- a two-officer resolution ceremony, an objection window that freezes money, an append-only
  audit chain, and a resolver queue;
- a trusted-source allowlist (`isSourceTrusted`), an event calendar, and AI-assisted drafting;
- a per-entity scheduler with boot hydration and a self-healing backstop
  (`market-scheduler.ts`, `updown-scheduler.ts`, `lifecycle.ts`);
- **a worked precedent for adding a whole second product** — Up & Down, documented end to end
  in `docs/UPDOWN-ARCHITECTURE.md`.

Maswali Millionea reuses all of it. The genuinely new code is a cycle lifecycle, a scoring pass,
a three-tier shared-pool distribution, a rollover, and about six screens.

**The risk is not technical. It is, in order:**

1. **Licence** (D-1) — a product-class question, not a code question.
2. **Solvency** (D-2, §5) — the guarantee as specified is an unbounded weekly liability against a
   4-million-shilling weekly revenue line.
3. **Resolvability** (§11) — the ten sample questions cannot be settled as written, and a jackpot
   settles ten of them at once with up to 20M riding on the set.

Every one of those three is answerable. None of them is answerable by writing code.

---

## §2 · What the proposal gets right

Worth stating, because the rest of this document is corrections and it would misrepresent the
work otherwise.

- **The tier structure is sound.** 10/10, 9/10, 8/10 with shared pools per tier is the standard,
  well-understood shape. Three tiers is the right number: one aspirational, one plausible, one
  frequent enough to make the product feel alive.
- **Shared-pool-per-tier is the correct risk posture.** The house's payout for a tier is fixed at
  the pool size no matter how many win it. Payout risk is genuinely bounded. (The *guarantee* is
  what breaks this — see §5 — but the tier mechanic itself is right.)
- **13 / 50 / 25 / 12 sums to 100, and 50 + 25 + 12 = 87 = 100 − 13.** The proposal's own split is
  already "our 13%, then the rest in three parts". That makes §4's reconciliation clean rather
  than a renegotiation.
- **Rollover per tier, independently, is right**, and the proposal says so explicitly.
- **The admin requirements section names the right three things**: event configuration with
  locking timestamps, outcome setters, and an automated resulting engine.
- **TZS 2,000 sits inside the platform stake window** (1,000–1,000,000 per bet, `docs/RULES.md`
  §2.3). A fixed 2,000 entry is a legal *narrowing* of that window, which the rule explicitly
  permits. No rule change is needed for the entry fee.

---

## §3 · What is missing — fifteen gaps, ranked

Ranked by what they cost if shipped unaddressed.

### G-1 · VOID scoring is undefined 🔴

The proposal provides a Win/Loss/**Void** outcome setter and never says what a void does to a
score. Every possible reading gives a different payout:

- void = correct → scores rise, more winners, thinner shares;
- void = incorrect → every ticket that picked it is dead, mass complaints;
- void = leg dropped, thresholds shift to 9/9, 8/9, 7/9 → a different product from the one sold;
- void = whole cycle refunds → the house eats the marketing.

**This must be decided (D-4), frozen into the cycle at open, and printed on the slip before
purchase.** Recommendation in D-4.

### G-2 · The 20M guarantee has no funding mechanism 🔴

`DEFAULT 20000000.00` on a pool column is a number, not money. See §5. A guaranteed prize is a
**house liability** and must live in a ring-fenced ledger account with a real balance that an
officer can see, that a cycle validates against before it opens, and that the platform refuses
to advertise beyond.

### G-3 · Taxes are absent 🔴

The proposal routes 13% to an "Operational Wallet — platform revenue / commission" and stops.
Platform law (`docs/RULES.md` §2.2): **TRA 10% + GBT 5% of the fee we earned.** Of every TZS 260,
26 goes to TRA and 13 to GBT; the operator keeps 221. This is not optional and it is not a
deduction from the player — it comes out of our side. The statutory monthly pack in
`src/lib/server/reports/catalogue.ts` must include Maswali or the books under-report.

### G-4 · Splitting at purchase makes refunds unwindable 🔴

> *"Every TZS 2,000 entry transaction must be automatically split and credited into distinct
> operational and prize ledger accounts upon successful payment confirmation."*

If the 2,000 is fanned into four accounts at purchase, then a refund — free cancellation, a
voided cycle, a reversed payment, an upheld objection — has to claw money back out of three
prize pools that may have already rolled forward into the next cycle. That is a reversal problem
with no clean answer, on live money.

**Correction: split at SETTLEMENT, not at purchase.** During the cycle every shilling sits in one
account, `POOL:{cycleId}`, exactly as every other market on this platform works, and is
refundable in full by machinery that already exists. At settlement, one balanced ledger group
moves it out. The live jackpot ticker is *derived* from that pool balance, not stored (§7).

### G-5 · No fairness or ticket-integrity commitment 🟠

Ten binary picks, up to 20M at stake, and nothing in the proposal lets a player prove their
selections were not altered after lock. The platform already publishes resolution attestations at
`/fairness` and has `test:lock-hash`. A jackpot needs the ticket-set commitment too (§6, `MaswaliCycle.ticketSetHash`).

### G-6 · No objection path — and it must be PER QUESTION 🟠

`Objection` exists, freezes money while OPEN, and is wired to markets by `marketId`. A cycle
settles ten questions at once, so a player disputing Q7 would be forced to dispute the whole
cycle — and an officer reviewing it would have no way to know which claim is being made.
`Objection` needs a nullable `questionOrdinal`, and the review screen needs to show the disputed
question's criterion, source and evidence beside the complaint.

### G-7 · Question terms are not frozen 🟠

Nothing says a question's text, criterion or source cannot be edited after tickets are sold. Up &
Down learned this the expensive way — see `docs/UPDOWN-ARCHITECTURE.md` §7, *"the line and the
source link freeze at open and never move while stakes exist"*. Same rule, same enforcement
mechanism (a patchable-column allowlist), non-negotiable.

### G-8 · No two-officer ceremony on outcome setting 🟠

The proposal has "outcome setters (Win/Loss/Void)" — singular, one officer, ten questions, up to
20M. Long-form markets already require `resolutionStage1By` + `resolutionStage2By`. A jackpot
cannot have a weaker control than a poll.

### G-9 · The rollover rule is ambiguous 🟠

*"Base TZS 20M + 50% collections. Rolls over if 10/10 not hit."* Does the 20M base re-apply every
cycle (house tops up to 20M each time) or is it seeded once and thereafter grows? The two readings
differ by tens of millions per quarter. Must be stated as one sentence and frozen into the cycle.

### G-10 · No free-cancellation position 🟡

`docs/RULES.md` §2.6: 5 minutes, full refund, but only if the bet had 5 minutes of betting time
ahead of it. Weekly cycles trivially satisfy that, so **free cancellation applies by default** and
the proposal never mentions it. Either it applies (recommended — it is the platform's posture) or
Ali excludes it in writing.

### G-11 · Responsible gambling is not addressed 🟡

Self-exclusion, cool-off, and the daily loss limit must gate a ticket purchase. Free if the
purchase goes through `buyPosition`; catastrophic if a new path is written that skips it. §6 makes
this structural rather than a promise.

### G-12 · The schema is MySQL and unowned 🟡

`AUTO_INCREMENT`, `INT PRIMARY KEY`, `DECIMAL(18,2)` mutable pool columns. The platform is
Postgres + Prisma with `cuid()` ids, and its accounting is double-entry with derived balances. A
mutable `millionea_pool` column is the exact anti-pattern the ledger exists to prevent: a balance
that sums correctly while describing money that is not there.

### G-13 · Ten binary legs is too small an outcome space 🟡

1,024 combinations. At meaningful volume the top prize is hit almost every cycle, so it never
grows and never becomes the story the marketing needs. This is the *product* half of §5.

### G-14 · No per-player ticket cap — an arbitrage hole and an RG harm vector 🔴

With ten binary legs there are only 1,024 possible tickets. **Buying all 1,024 costs TZS
2,048,000 and guarantees the top prize** — plus every Supa and Mini share, since the full
covering set contains all 10 near-misses and all 45 eight-correct combinations. Whenever the
Millionea pool plus the rollover exceeds roughly 2,000,000, covering the board is a positive
expected-value play against the house and against every other player.

It is simultaneously the clearest responsible-gambling harm in the product: the natural escalation
from one ticket is "buy more combinations", which is unbounded by design. See D-6. The cap must be
enforced in the **purchase path**, not the UI, and stated on the slip.

### G-15 · No position on AML review for a large payout 🟡

The FIU suspicious-activity report in `src/lib/server/reports/catalogue.ts` flags transactions
over a threshold, and `TxnStatus` has an `AML_REVIEW` state. A jackpot payout will trip it — which
is correct — but nothing says whether the credit is held pending review, and a winner left in
silence with no stated timeline is the worst support outcome the product can produce. Decide,
state the SLA on the ticket page, and tell the player in the notification.

---

## §4 · The money model, reconciled with `docs/RULES.md`

### The conflict, precisely

`docs/RULES.md` is 🟢 LAW: **our fee is 13% of the LOSING side, on both games, identical.** It is
enforced in exactly one place — `poolFee()` in `src/lib/payout.ts` — frozen per market at
creation, and stated to players in `/legal/terms` §4, the assistant's system prompt, and `/help`.

The proposal charges **13% of gross**: TZS 260 out of every 2,000, taken whether that ticket wins
or loses.

### The reconciliation

The proposal's own numbers already contain the answer. **50 + 25 + 12 = 87, and 87 = 100 − 13.**
The three prize pools are not "percentages of gross" that happen to leave 13% behind; they are
*the remainder after our fee*, split three ways.

So the only real question is **13% of what**, and there is a form of the rule that keeps one
platform law:

> **Our fee is 13% of the stakes of tickets that finish the cycle in no tier.**
> The remainder is distributed to the three tiers in the ratio **50 : 25 : 12**.

| | Option A — 13% of gross (as proposed) | **Option B — 13% of losing stakes (recommended)** |
|---|---|---|
| Fee | `0.13 × G` | `0.13 × L`, where `L` = stakes of tickets in no tier |
| Distributable | `0.87 × G` | `G − 0.13 × L` |
| Tier shares | 50/25/12 of `G` | 50/87, 25/87, 12/87 of the distributable |
| When nobody wins | identical | **identical** |
| When someone wins | winner's own stake was raked | winner's stake is not raked; the difference goes to the pools |
| Rule count on the platform | **three** fee models | **one**, expressed three ways |
| `docs/RULES.md` §5 ceremony | full rewrite of §1 | an added row to §1 naming the third product |

**Option B recovers the proposal's figures exactly in the rollover case** — which is the common
case — and diverges only upward, in the players' favour, when there are winners. Worked example
in §5.

### What must happen if D-3 chooses either option

Both are rule changes. `docs/RULES.md` §5 is the procedure and it is not optional:

1. Ali decides in writing.
2. Record in `docs/COMPLIANCE-DECISIONS.md` (newest first, append — never rewrite).
3. Change `docs/RULES.md` — §1 table, a new §2.x entry, §6 decision history.
4. Change the code, the config, and **every surface §2 names for that rule, in the same commit**:
   `/legal/terms` §4 (all three locales), `src/app/_actions/chat.ts`, `/help`, `/admin/config`.
5. Prove the guard RED first, with a positive control in the same run.
6. Verify on production by reading the database and by looking at the screen.
7. Regenerate `docs/50pick-betting-rules-final.pdf` and `docs/50pick-rates-for-admins.pdf`, and
   rasterise them to check.

### Frozen rates

A cycle stamps `PredictionMarket.feeSnapshot` at creation exactly like every other market, **plus**
a `MaswaliCycle.rulesSnapshot` holding entry fee, tier ratios, tier thresholds, the void rule, the
guarantee, and the rollover rule. Settlement reads the snapshot and never live config. ⛔ A
snapshot is never rewritten, backfilled or migrated.

### Stake bounds and taxes — no change needed

- Entry TZS 2,000 sits inside 1,000–1,000,000. A fixed entry is a permitted narrowing (§2.3).
- TRA 10% + GBT 5% come out of our fee via `levySplit()` in `payout.ts`, unchanged. Of TZS 260:
  TRA 26, GBT 13, operator 221.

---

## §5 · The solvency arithmetic — the most important section in this file

### The guarantee is an unbounded weekly liability

At TZS 1,000/ticket into the Millionea pool, self-funding a 20,000,000 guarantee needs
**20,000 tickets in one cycle** — TZS 40,000,000 of gross entries in a week. Below that, the house
pays the difference every time someone hits 10/10.

### How often is 10/10 hit?

Ten binary questions is **2¹⁰ = 1,024** combinations. If the questions were genuine coin flips and
picks were independent:

| Tickets sold in a cycle | Expected 10/10 winners | P(at least one winner) |
|---|---|---|
| 500 | 0.49 | **38.7%** |
| 2,000 | 1.95 | **85.8%** |
| 5,000 | 4.88 | **99.2%** |

At 2,000 tickets — TZS 4,000,000 gross, a modest week — the top prize is hit in roughly
**six weeks out of seven**. With a pool of, say, 2,000,000, each hit costs the house the
18,000,000 gap. Expected house cost per cycle ≈ 0.858 × 18,000,000 ≈ **TZS 15,400,000, against
TZS 4,000,000 of gross entries.**

Picks are of course *not* independent — players crowd onto favourites, so in practice you get
"nobody wins" or "forty people win together". That correlation protects the *share size* (forty
winners split one 20M guarantee, they do not get 20M each) but it does **not** protect the
guarantee itself: the house still pays the full gap on any cycle with at least one winner.

### The two structural fixes

**Fix 1 — remove the guarantee (recommended for launch).**
A progressive jackpot that starts at whatever rolled over has **zero house exposure**. The tier
pools can only ever pay out what was collected. This is the answer to D-2.

**Fix 2 — enlarge the outcome space, so 10/10 is genuinely rare.**
This is what makes a progressive jackpot actually *grow* into a headline number.

| Format | Combinations | Expected winners @ 2,000 tickets | P(≥1) |
|---|---|---|---|
| 10 binary (as proposed) | 1,024 | 1.95 | 85.8% |
| 13 binary | 8,192 | 0.24 | 21.7% |
| 10 legs, 1X2 on football | 59,049 | 0.034 | 3.3% |
| 12 legs, mixed binary + 1X2 | ~250,000 | 0.008 | 0.8% |

**Recommendation: keep the ten-question slip (it is simple and it is the product management
approved), but make the football legs 1X2 rather than yes/no, and launch progressive-only.** That
gives a jackpot that rolls for two or three months, reaches a genuinely newsworthy figure, and
costs the house nothing to advertise. A guarantee can be layered on later, funded from
`HOUSE:MASWALI_GUARANTEE`, once the operator has seen real volume.

If management insists on the fixed 20M guarantee at launch, the platform **must**:
- hold the full advertised gap in `HOUSE:MASWALI_GUARANTEE` before the cycle opens,
- refuse to open a cycle whose advertised guarantee exceeds that balance, and
- derive the number on the ticker from the funded balance, never from a constant.

⛔ A guarantee expressed as a schema default, a config value, or a string in the UI — with no
funded account behind it — is a promise the platform cannot keep, on a money surface, and it is
the exact class of defect this codebase has documented over and over.

### Worked example — Option B, one realistic cycle

2,000 tickets, TZS 4,000,000 gross, no 10/10, 20 tickets on 9/10, 88 tickets on 8/10.

```
Gross G                          4,000,000
Winning tickets W                108  →  216,000 in stakes
Losing stakes L                  3,784,000
Our fee    F = 0.13 × L            491,920
  → TRA 10% of F                    49,192
  → GBT  5% of F                    24,596
  → operator keeps                 418,132
Distributable D = G − F          3,508,080

Millionea  50/87 × D             2,016,138  → no winner, ROLLS OVER whole
Supa       25/87 × D             1,008,069  → ÷ 20  =  50,403 each
Mini       12/87 × D               483,873  → ÷ 88  =   5,498 each

Conservation:  2,016,138 + 1,008,069 + 483,873 + 491,920 = 4,000,000 ✅
```

Under Option A the distributable would have been 3,480,000 — TZS 28,080 less, which is exactly
13% of the winners' own stakes. That is the entire difference between the two models.

---

## §6 · Data model

### The governing principle, inherited from Up & Down

> **The product's own tables never hold money.** They hold the game story. Money moves through
> `PredictionMarket` / `Position` / `Transaction` / `LedgerEntry` — the code that already works.
> — `docs/UPDOWN-ARCHITECTURE.md` §2

Applied here, that resolves every structural question at once.

### The cycle IS a `PredictionMarket` row

`productLine: "MASWALI"` — a third value on the existing discriminator.

| Column | How Maswali uses it |
|---|---|
| `yesPool` | The whole entry pool. Every ticket is one side, so there is only one pool. |
| `noPool` | Always 0. |
| `selectionClosedAt` | **The lock.** Sales stop, the ticket set is hashed. |
| `resolutionAt` | When the last question is expected to be settleable. |
| `resolvedOutcome` | `"YES"` when the cycle settles normally, `"VOID"` when the whole cycle voids. |
| `feeSnapshot` | Frozen rates, as for every other market. |
| `objectionsClosedAt` / `settledAt` | The existing objection-window gate, unchanged. |
| `predictorCount` | Tickets sold. |

**What this buys, for free:** `buyPosition` with admission control, idempotency, rate limiting,
maintenance mode, self-exclusion, cool-off, the daily loss limit and the KYC gate; stake ledger
entries into `POOL:{cycleId}`; `emergencyVoidMarket` for a full refund; objections that freeze the
money; the audit chain; the trial balance; and every money/regulator report that already opts in
with `productLine: "ALL"`.

⚠️ **The read-path rule applies immediately.** `listMarkets()` defaults to `productLine: "MARKET"`,
so player boards exclude cycles automatically — but **every money or regulator read must opt in
with `productLine: "ALL"`** or Maswali revenue silently vanishes from the books.
`npm run test:product-line` (30 assertions) must be extended to cover the third value in the same
session that introduces it.

### The ticket IS a `Position` row

`side: "YES"`, `stake: 2000`. Its selections live beside it:

```prisma
/// One player's entry into one cycle. Holds the PICKS; the Position row beside it
/// holds the MONEY. Never the other way round.
model MaswaliTicket {
  id         String @id @default(cuid())
  positionId String @unique          // soft-linked 1:1 to the Position that paid for it
  cycleId    String
  userId     String

  /// Canonical, ordered: index 0..9 → "YES" | "NO" (| "DRAW" if 1X2 lands).
  /// Stored as Json for compactness; NEVER read without going through
  /// `canonicalSelections()`, which is also what the hash is taken over.
  selections Json

  /// SHA-256 over `${cycleId}|${ticketId}|${canonicalSelections()}`. Written at
  /// purchase, never rewritten. This is what makes the cycle's ticketSetHash
  /// verifiable by an individual player.
  selectionsHash String

  /// Written once, by settlement. Null until then — never defaulted to 0, which
  /// would be indistinguishable from "scored, got nothing right" (A-5).
  score   Int?
  tier    String?   // "MILLIONEA" | "SUPA" | "MINI" | "NONE"
  payout  Decimal?  @db.Decimal(18, 2)

  createdAt DateTime @default(now())

  @@unique([cycleId, positionId])
  @@index([cycleId, score])
  @@index([userId, createdAt])
}
```

### The questions are NOT markets

They hold no money, so they must not be `PredictionMarket` rows. (Up & Down rounds *are* markets
precisely because they *do* hold money. The doctrine is the same rule read in both directions.)

```prisma
model MaswaliQuestion {
  id      String @id @default(cuid())
  cycleId String
  cycle   MaswaliCycle @relation(fields: [cycleId], references: [id], onDelete: Cascade)
  ordinal Int          // 1..10, the order printed on the slip

  textEn String
  textSw String
  textZh String?

  /// The sentence the payout turns on. English canonical, exactly as
  /// PredictionMarket.resolutionCriterion — officers resolve against this.
  resolutionCriterion   String
  resolutionCriterionSw String?
  resolutionCriterionZh String?

  /// Must pass isSourceTrusted() at cycle-open. Frozen thereafter.
  sourceUrl    String
  sourceDomain String

  /// The two-officer ceremony, same shape as PredictionMarket.
  outcome            String?   // "YES" | "NO" | "VOID"
  resolutionStage1By String?
  resolutionStage1At DateTime?
  resolutionStage2By String?
  resolutionStage2At DateTime?
  resolutionEvidence String?   @db.Text

  @@unique([cycleId, ordinal])
}
```

### The cycle's own row

```prisma
model MaswaliCycle {
  id       String @id @default(cuid())
  marketId String @unique       // the PredictionMarket that holds the money
  /// Human handle printed on the slip, e.g. "TZ-2026-W35". Unique, immutable.
  code     String @unique

  state String   // DRAFT | OPEN | LOCKED | RESOLVING | SETTLED | VOIDED

  opensAt   DateTime
  locksAt   DateTime   // mirrors PredictionMarket.selectionClosedAt
  settledAt DateTime?

  /// ⛔ WRITE-ONCE, stamped at open. Entry fee, tier ratios, tier thresholds, the
  /// void rule and its cycle-void floor, the advertised guarantee, and the rollover
  /// rule. Settlement reads THIS, never live config. Absent from CYCLE_PATCHABLE,
  /// which is the only thing that enforces it — same mechanism as ROUND_PATCHABLE.
  rulesSnapshot Json

  /// SHA-256 over every ticket's selectionsHash, sorted by ticket id, taken at LOCK.
  /// Published to /fairness. Null before lock.
  ticketSetHash String?
  ticketCount   Int @default(0)

  /// What rolled IN from the previous cycle, per tier. Recorded so a cycle can
  /// state its own opening pools without re-deriving a chain of predecessors.
  rolloverInMillionea Decimal @default(0) @db.Decimal(18, 2)
  rolloverInSupa      Decimal @default(0) @db.Decimal(18, 2)
  rolloverInMini      Decimal @default(0) @db.Decimal(18, 2)

  previousCycleId String?
  createdBy       String
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  questions MaswaliQuestion[]

  @@index([state, locksAt])
}
```

### ⛔ The pools are LEDGER ACCOUNTS, not columns

This is the correction to the proposal's `maswali_pools` table, and it is not stylistic.

Add to `acct` in `src/lib/server/ledger.ts`:

```ts
maswaliMillionea: "HOUSE:MASWALI_MILLIONEA" as const,
maswaliSupa:      "HOUSE:MASWALI_SUPA"      as const,
maswaliMini:      "HOUSE:MASWALI_MINI"      as const,
maswaliGuarantee: "HOUSE:MASWALI_GUARANTEE" as const,
```

A pool balance is `ledgerAccountBalance(acct.maswaliMillionea)` — derived from immutable entries,
every one of which belongs to a group that summed to zero before it was allowed to exist. A cycle
row may cache a figure for display; **no code that moves money may read the cache.**

> 🔴 Why this matters more than it looks. A `DECIMAL` column holding a pool balance sums to zero
> just fine while describing money that is not there — a pool "holding" the prize for a cycle
> that was deleted, or double-counting a rollover that also stayed behind. Balanced books are
> not integrity. The ledger is the only structure on this platform where a wrong number is
> *impossible to write* rather than merely *likely to be noticed*.

### Migrations

Four additive tables, one enum-free string column value. All additive, no backfill:

- `2026xxxxxxxxxx_maswali_tables` — `MaswaliCycle`, `MaswaliQuestion`, `MaswaliTicket`.
- `productLine` needs **no migration** — it is already a `String @default("MARKET")`.
- ⛔ `productLine` remains **immutable after creation** (deliberately absent from the Prisma
  update block). A cycle can never be reclassified into another product line and move its money
  in every later report.

---

## §7 · The settlement algorithm

One function, `settleMaswaliCycle(cycleId)`, in `src/lib/server/maswali-service.ts`. It reuses
the money primitives and adds no new ones.

```
PRECONDITIONS (all must hold; any failure aborts with a named reason, no partial writes)
  1. cycle.state === "LOCKED" or "RESOLVING"
  2. every MaswaliQuestion has an outcome AND both stage1By and stage2By
  3. no OPEN Objection on the cycle's market
  4. market.objectionsClosedAt has elapsed
  5. market.settledAt IS NULL                      ← exactly-once, checked inside the lock

STEP 1 · VOID ARM
  voidCount = questions where outcome === "VOID"
  if voidCount >= rulesSnapshot.cycleVoidFloor (D-4: 3):
      → emergencyVoidMarket(marketId)   // existing code: full refund, every ticket
      → cycle.state = "VOIDED"; return

STEP 2 · SCORE
  for each ticket:
      score = count of ordinals where
                 question.outcome === "VOID"                     // D-4: void = correct
              OR question.outcome === ticket.selections[ordinal]
      tier  = score === 10 ? MILLIONEA
            : score ===  9 ? SUPA
            : score ===  8 ? MINI
            : NONE
  ⚠️ Scoring is PURE and lives in src/lib/maswali-score.ts — isomorphic, so the slip
     preview, the ticket page and settlement all compute it with one function.

STEP 3 · FEE  (Option B, per D-3)
  L = Σ stake over tickets with tier === NONE
  F = round(rulesSnapshot.feeRate × L)             // 0.13
  TRA, GBT = levySplit(F, rulesSnapshot)           // existing payout.ts

STEP 4 · DISTRIBUTABLE AND TIER POOLS
  D = G − F                                        // G = market.yesPool
  millioneaPool = round(D × 50/87) + rolloverInMillionea
  supaPool      = round(D × 25/87) + rolloverInSupa
  miniPool      = round(D × 12/87) + rolloverInMini
  ⚠️ Any rounding residual from the three round() calls is assigned to the
     MILLIONEA pool — one named home for dust, never silently dropped.

STEP 4b · GUARANTEE TOP-UP  (only if rulesSnapshot.guaranteeTzs > 0)
  if MILLIONEA has winners and millioneaPool < guaranteeTzs:
      gap = guaranteeTzs − millioneaPool
      assert ledgerAccountBalance(HOUSE:MASWALI_GUARANTEE) >= gap
        ⛔ if it does not, ABORT and raise a CRITICAL compliance alert. Do NOT
           settle a partial guarantee and do NOT quietly pay the smaller figure —
           the advertised number is what was sold.
      millioneaPool += gap                          // funded, from a real account

STEP 5 · ALLOCATE
  for each tier with >= 1 winner:
      shares = allocateWinnerPayouts(pool, winners)   // existing, largest-remainder,
                                                     // sums EXACTLY to pool
  for each tier with 0 winners:
      rollover[tier] = pool                           // moves to the next cycle

STEP 6 · ONE BALANCED LEDGER GROUP  (groupId = `maswali_settle_${cycleId}`)
  DEBIT  POOL:{marketId}                    −G
  CREDIT HOUSE:COMMISSION                   +F − TRA − GBT
  CREDIT HOUSE:TRA_LEVY                     +TRA
  CREDIT HOUSE:GBT_LEVY                     +GBT
  CREDIT PLAYER:{userId}                    +share            (per winner, per tier)
  CREDIT HOUSE:MASWALI_{TIER}               +rollover[tier]   (per rolled tier)
  DEBIT  HOUSE:MASWALI_GUARANTEE            −gap              (if topped up)
  DEBIT  HOUSE:MASWALI_{TIER}               −rolloverIn[tier] (what came in, now paid out)
  ⇒ the group MUST sum to exactly 0 or postLedgerEntries REJECTS it.

STEP 7 · WALLET + POSITION + STAMPS      (all inside withMoneyTx, one transaction)
  credit each winner's Wallet.balance, write a BET_PAYOUT Transaction
  Position.status = WIN | LOST; Position.finalPayout
  MaswaliTicket.score, .tier, .payout
  market.settledAt = now(); cycle.state = "SETTLED"
  audit(SYSTEM, "maswali.cycle.settled", { cycleId, G, F, tiers, winners, rollovers })
```

### The invariants a test must hold

1. `Σ(payouts) + F + Σ(rollovers) − Σ(rolloverIn) − gap === G` — money conservation, drift 0.
2. Running it twice settles once. The `settledAt IS NULL` check inside `withLock` is the gate.
3. A cycle that voids refunds **exactly** the stakes, to the shilling, including the bonus split.
4. A rollover is claimed by exactly one successor cycle. Two cycles cannot both open against the
   same rolled balance.
5. `trialBalance()` is clean before and after — every wallet still reconciles to its ledger.

### The live ticker is DERIVED

The jackpot figure the player sees during a cycle is computed, never stored:

```
displayedMillionea = round((market.yesPool − 0.13 × market.yesPool) × 50/87)
                   + rolloverInMillionea
                   + max(0, guaranteeTzs − that)          // only if funded
```

Because the fee is charged on *losing* stakes only, the settled figure can only ever be **greater
than or equal to** the displayed one. **The ticker can never tick down.** That is a real property
of Option B and it is worth telling the player about.

---

## §8 · Routing and placement — page, sub-page, or tab

### Verdict: a top-level product route. Not a tab.

`/maswali` is its own destination. Three reasons, in order of weight:

1. **A tab inside `/markets` would be a surface that cannot tell which product it is holding.**
   `src/lib/side-label.ts` documents this exact failure at length: eight surfaces each
   hand-wrote a YES/NO ternary, every one correct on the day it was written, every one poised to
   start lying the day its query gained `productLine: "ALL"`. A jackpot ticket rendered by
   market-card code is that bug waiting to happen, on money.
2. **The page shape is incompatible.** A market board is a grid of cards with a two-sided dial. A
   jackpot is one hero ticker, one countdown, one ten-question ballot, one CTA. Nothing composes.
3. **Up & Down set the precedent and it worked.** A distinct product gets a distinct top-level
   route, its own service module, its own admin console, and its own scheduler.

### Player routes

| Route | What it is | Auth |
|---|---|---|
| `/maswali` | **The product.** Jackpot ticker hero, countdown to lock, the ten-question slip, entry CTA. When locked: "results pending" + your tickets. When settled: the result summary + a link to the next cycle. | Public to browse, auth to enter |
| `/maswali/[cycleId]` | One cycle, past or present. The ten questions with their official outcomes and officer evidence, tier results, winner counts, pool figures, the published ticket-set hash. **Permalinkable — this is the fairness surface.** | Public |
| `/maswali/tickets` | My tickets across all cycles, newest first. | Auth |
| `/maswali/tickets/[ticketId]` | One ticket: the ten picks beside the ten outcomes, per-question evidence, score, tier, payout. | Auth, owner only |

⛔ Do **not** add `/maswali/how` — the rules belong in `/help` and `/legal/terms`, which are the
places this platform has already committed to as the single home for each.

### The navigation problem, and the recommendation

The bottom rail has **exactly five slots and they are full**: Markets · Up & Down · Live · Results
· More (`src/components/layout/bottom-nav.tsx`). The file's own header records that getting to
five was itself a fix for two structural defects. A sixth slot is not available.

**Recommendation — swap `Live` into `More`:**

```
Markets · Up & Down · Millionea · Results · More
More: Live · Positions · Wallet · Top · Invite
```

The rationale is that the rail should hold **destinations of the same kind**, and after this
change it holds *three products, plus results, plus more*, which reads as a coherent sentence.
`/live` is a cross-product activity feed — a view, not a product — and it is the one item that
does not belong in a row of products.

⚠️ **This is a design ruling, and `docs/DESIGN_AUTHORITY.md` owns it, not this file.** The
alternative — a grouped "Games" entry that opens a chooser — is worse: it buries a money
destination one tap deeper and adds a screen with no content of its own. Recorded here as the
recommendation; Ali decides.

The desktop bar (`src/components/layout/top-app-bar.tsx`, two item arrays at lines ~91 and ~108)
has more room and simply gains the item. Both files carry an `isActive` resolver that must learn
`pathname.startsWith("/maswali")`, and `npm run test:admin-nav` asserts that every nav href
round-trips through one route resolver.

---

## §9 · Every surface that must change

The proposal names two frontend surfaces. There are seventeen.

### Player

| Surface | What must change | Session |
|---|---|---|
| `/maswali`, `/maswali/[cycleId]`, `/maswali/tickets*` | New. §8. | S5 |
| `src/components/layout/bottom-nav.tsx` | Third product slot; `Live` moves to `More`; `isActive`. | S5 |
| `src/components/layout/top-app-bar.tsx` | Both item arrays + the `isActive` chain at ~line 382. | S5 |
| `/positions` | A ticket **is** a `Position`, so it will appear whether you plan for it or not. It must render as *"Millionea TZ-2026-W35 · 8/10 · Mini"*, never as a YES/NO market position. | S5 |
| `/positions/[positionId]` | Redirect a Maswali position to `/maswali/tickets/[ticketId]`, or render the ticket panel inline. Do not leave it rendering a dial. | S5 |
| `src/lib/side-label.ts` | **A third `LabelProductLine`.** The module refuses to default, on purpose — so every call site must be told. That refusal is what turns this from a silent regression into a compile error. | S5 |
| `/wallet`, `/wallet/receipt` | The 2,000 debit and any payout are `Transaction` rows. Descriptions must name the cycle code, and the receipt must render a ticket line. | S5 |
| `/results` | Settled cycles alongside settled markets, as a distinct card shape. | S6 |
| `/leaderboard` | ⚠️ **Exclude Maswali from ROI tiering.** A lottery-shaped return distribution would let one top-tier win permanently distort the board, and `TIER_THRESHOLDS` is a classifier the copy already interpolates from. Exclusion must be deliberate and tested, not incidental. | S6 |
| `/fairness` | Publish each cycle's `ticketSetHash`, ticket count, and lock timestamp. | S6 |
| `/help` | FAQ: how scoring works, what a void does, how tiers share, what rollover means. | S6 |
| `/legal/terms` §4 + §5 | The fee rule for the third product, **in all three locales**. | S1 |
| `src/app/_actions/chat.ts` | The assistant's system prompt teaches rates. It must learn this one or it will confidently teach the wrong one. | S1 |
| Notifications | Four new copies: cycle open · locks in 1 hour · results in · you won / rolled over. `notification-service.ts`. | S6 |
| `/profile/responsible-gambling` | No change **if** purchase goes through `buyPosition`. Verified, not assumed — a test asserts a self-excluded player cannot buy a ticket. | S3 |
| Bonus wallet | Per D-5, an explicit refusal with a message, not an omission. | S3 |
| `src/lib/i18n-dict.ts` | A `maswali.*` namespace, **complete in EN + SW + ZH**. ⛔ A key present in one locale and absent in the others passes typecheck and both suites. The completeness assertion is not optional. | S5 |

### Admin — see §10.

---

## §10 · Admin console and RBAC

### Routes and domains

⛔ Every new `/admin/*` prefix **must** be added to `ROUTE_DOMAINS` in
`src/lib/server/roles.ts`. `assertRouteDomainsComplete()` fails CI on an unmapped route, and
`domainForPath()` fails **closed** to `ops` (Owner-only) rather than fail-open — so an unmapped
console is invisible to every officer who needs it.

| Route | Domain | What it does |
|---|---|---|
| `/admin/maswali` | `trading` | Cycle list, KPIs, create/schedule a cycle. |
| `/admin/maswali/[cycleId]` | `trading` | The ten-question builder; freeze/open; the two-officer outcome ceremony; settle. |
| `/admin/maswali/pools` | `accounting` | The four ledger accounts, their real balances, guarantee funding, the rollover trail. |

### Controls

Add to `CONTROL_DOMAIN` in `src/lib/server/control-gates.ts` — **once**, so the page asks exactly
the question the action will ask:

| Control | Domain | Reasoning |
|---|---|---|
| `openMaswaliCycle` | `trading` | Opening a cycle is a trading act. Freezes the questions. |
| `setMaswaliOutcome` | `trading` | Same officer who resolves markets. **Two-officer ceremony required.** |
| `settleMaswaliCycle` | `accounting` | Moves money. `MONEY_ROLES`. |
| `voidMaswaliCycle` | `compliance` | Cancels a **healthy** cycle and destroys a working product — the same discretionary shape as `emergencyVoidMarket`, which finding E-20 settled as `compliance`. ⚠️ Not the Up & Down round-void precedent: that releases a round the engine has *already failed to finish*, which is a recovery lever, not a decision. |
| `fundMaswaliGuarantee` | `accounting` | Moves house money into a ring-fenced account. |

⚠️ `DEFAULT_GRANTS` makes `trading` and `compliance` **disjoint**. A control placed in the wrong
domain is reachable by ADMIN accounts and nobody else — Up & Down shipped exactly that mistake
and production proved it unusable within the hour. Check the grant matrix, do not reason by
analogy.

### The two-officer ceremony

Ten questions, up to 20,000,000 riding on the set. `MaswaliQuestion` carries
`resolutionStage1By/At` and `resolutionStage2By/At` for the same reason `PredictionMarket` does.
**The same officer may not fill both stages** — enforced in the service, tested with a RED proof,
not left to the UI.

### The cycle can only settle when every question is sealed

`settleMaswaliCycle` refuses if any question is missing an outcome or a second signature. The
admin page must show this as a checklist — *9 of 10 sealed, Q7 awaiting second officer* — not as
a disabled button with no explanation. `docs/RULES.md` §2.9: a refusal states the reason and the
next step, and a fixable problem is a warning, not a red error.

### Locked-state rendering

The Owner can create a role at `/admin/roles` with `trading` VIEW but no ACT. That role must see
`🔒 SETTLE · ACCOUNTING ONLY` — the `control-locked.tsx` pattern — never a button that bounces.

---

## §11 · Question quality — the sample slip does not survive contact with a resolver

**Not one of the ten sample questions is settleable as written.** This matters more here than on
a single market: a jackpot settles ten at once, and one ambiguous leg poisons the whole cycle for
every ticket.

The platform already has the machinery to do this properly — `resolutionCriterion` as the sentence
the payout turns on, `sourceUrl` validated against `isSourceTrusted()`, and evidence captured at
stage 1. The questions must be written to that standard.

### The rule

> A question is admissible only if two officers, reading only the criterion and opening only the
> named source, would reach the same verdict without discussing it.

Concretely, every question needs: **a named source**, **a named instrument or fixture**, **a named
timestamp or window with a timezone**, and **a stated threshold**.

### Four of the ten, diagnosed

| # | As written | Why it fails | Admissible form |
|---|---|---|---|
| Q3 | *"Will Bitcoin break and maintain a trading price above $70,000 throughout the entire week?"* | Which exchange? Which price — last trade, index, mid? Does one tick below at 03:00 break it? "The entire week" has no boundaries. Unsettleable three ways. | *"Will BTC/USD on [named exchange] close every daily candle at 00:00 UTC above $70,000.00 on each of the 7 days from [date] to [date]?"* Source: the exchange's own published daily closes. |
| Q8 | *"Will the Tanzanian Premier League leading goalscorer score at least one goal in this week's fixture?"* | Leading **as of when**? The identity of the subject changes during the cycle — the question can be about a different player on Sunday than it was on Monday. And "this week's fixture" names no match. | *"Will [PLAYER NAME], TPL leading scorer as at the cycle lock, score at least one goal in [Club A] v [Club B] on [date]?"* **The name is pinned at lock and printed on the slip.** |
| Q10 | *"Will the weather in Dar es Salaam record any measurable rainfall during the upcoming weekend?"* | Which station? "Measurable" is not a threshold. "Weekend" is not a window. | *"Will the Tanzania Meteorological Authority report ≥ 0.1 mm of rainfall at Julius Nyerere International Airport station on [date] or [date]?"* |
| Q1 | *"Will Arsenal defeat Manchester United in their upcoming Premier League fixture this weekend?"* | Closest to admissible — but silent on 90-minutes-plus-stoppage, and silent on postponement, which is the single most common real-world event. | *"Will [Club A] win [fixture] on [date] in 90 minutes plus stoppage time? If the fixture is postponed beyond [date+2], this question VOIDS."* |

Q2, Q5, Q7 and Q9 have the same defects (unnamed publication, unnamed session close, unnamed
window) and take the same treatment. Q4 and Q6 need a named fixture and a named competition stage.

### Enforce it structurally

- `sourceUrl` must pass `isSourceTrusted()` **at cycle-open** and its host is frozen onto the
  question. A question whose source host is later disabled does not silently re-point.
- ⛔ **The question's text, criterion and source freeze the instant the cycle opens for sale** —
  which is before the first ticket exists — and never move while a ticket exists. Enforced by
  absence from `QUESTION_PATCHABLE`, so `questionStore.patch` throws
  `'<k>' is not a patchable column`. Both the Prisma store and the in-memory store check it, so a
  suite cannot pass on a path production would refuse.
- Reuse `MarketCandidate` / `EventCalendar` / the AI drafting pipeline to *propose* questions; an
  officer approves. Reuse, do not rebuild.

---

## §12 · Design — and this is where the proposal is most wrong

⭐ **Read this before drawing anything.** `docs/DESIGN_AUTHORITY.md` is the only design rulebook,
the system is **COMPLETE and FROZEN** (B10), and new design **merges in, it never sits beside**
(B9). A jackpot is the single product category most likely to violate that rulebook, because
every jackpot in the world is built out of exactly the patterns this platform has banned in
writing.

### §12.1 · Eleven design-law collisions, and how each is resolved

| # | Law | What a jackpot wants to do | The collision | Resolution |
|---|---|---|---|---|
| 1 | **Law 7 — No manufactured urgency / no casino.** *"The countdown is the only tension. No confetti, no flashing, no streak flames, no combo meters, no celebratory bursts beyond the calm gilt aura."* | The proposal asks for a *"Real-time dynamic counter displaying the current accumulated Millionea Jackpot."* | A number that animates upward on a timer is **manufactured urgency by construction**. Law 4's broken-example is literally *"a pulsing gold balance"*. | The ticker updates **on a real event only** — a ticket actually sold — using the existing `value-flash`, which by law *never moves layout*. ⛔ No synthetic count-up, no odometer roll, no ambient increment. If no ticket has sold since the last render, the number does not move. |
| 2 | **Law 3 / M3 — Gold is earned money only. Never projections, never unrealised value.** | Paint the 20,000,000 gold. Every competitor does. | The jackpot figure is **the most unrealised number the platform will ever display** — a prize nobody has won, that may roll over forever. Gold would be the largest single violation of the gold budget in the product's history. | **The ticker is neutral ink in mono.** Gold appears exactly once in this feature: on the seal a 10/10 winner sees (M7). This will be the most contested point with management. The argument that wins it: gold means *"this is real money you have"*, and the whole product depends on that meaning surviving. |
| 3 | **Law 11 — Unrealised honesty.** *"per-position potential payout stays hidden pre-resolution… never a promised return."* Broken looks like *"You will win TZS 140"*. | *"Win TZS 20,000,000!"* on the slip. | That sentence is a promised return on an open position, in the exact grammatical form the law names as broken. | The slip states **the pool and the rule**, never the player's outcome: *"Millionea pool · TZS 2,016,138 · shared by every 10/10 ticket."* Third person, about the pool, not second person about the player. |
| 4 | **F7 — A promise about money is computed, never stated as a constant.** | `DEFAULT 20000000.00`. | Already law, already the §5 finding, arrived at from the design side independently. A guarantee rendered from a constant is the precise failure F7 exists to prevent. | The displayed guarantee is `min(advertised, ledgerAccountBalance(HOUSE:MASWALI_GUARANTEE) + pool)` — from the same function settlement uses. If it is not funded, it is not displayed. |
| 5 | **Law 5 — Real data or nothing.** *"never render a guessed, placeholder, or zero-as-unknown number."* | Show `TZS 20,000,000` on a cycle with zero tickets sold. | A pool of 0 rendered as the advertised figure is a fabricated number on the platform's most prominent surface (A-5). | Before the first ticket: an em-dash and a labelled state — *"Opens [date]"* — not a figure. The pool figure appears when there is a pool. |
| 6 | **Law 6 + M7 — Losses get the receipt, wins get the seal.** | Dramatise the near-miss. "SO CLOSE — 7/10!" | **99% of tickets lose, so the loss screen is the highest-traffic surface in the whole product.** More players will see 6/10 than will ever see a payout. A dramatised near-miss on that volume is the definition of a dark pattern. | The result screen is **bookkeeping**: the ten picks beside the ten outcomes, the score stated once, plain rung-4 toast, no colour ceremony, *"Every figure here is final."* No "so close", no re-entry inducement on the loss surface. |
| 7 | **Law 2 — YES/NO colour is untouchable and never decoration.** | Ten rows × two lit green/rose buttons = twenty semantic controls on one screen. | The law's own reason: *"dilute them anywhere and every bet button gets ambiguous."* Twenty simultaneously-lit betting colours is the largest dilution surface ever proposed here. | The pair carries **selection state only** — at most one lit control per row, unselected rows are neutral. And the words come from `side-label.ts` with the third product line, never a hand-written ternary. |
| 8 | **Law 8 — Emoji: none. Anywhere.** | 🎉 💰 🔥 — the native vocabulary of jackpot marketing. | Banned, including in SMS and push copy, including in the marketing brief. | Typographic marks and `glyphs.tsx` strokes only. Say this to the marketing team **before** they produce creative, not after. |
| 9 | **Law 10 — Multi-language, ~35% expansion.** | Ten long prose questions. | Ten multi-line questions × three locales, with Swahili as the primary market, is the heaviest text layout in the product. `titleZh` is nullable elsewhere for a reason. | Cap question length in the admin builder (a hard character limit, shown as a counter), and drive the shot suite at 360 with the **longest Swahili strings**, not the English ones. |
| 10 | **Law 13 — The measure.** | A hero + a ten-row form + a results table, unstated. | Three different natural widths on one route. A page that does not state its tier drifts, and `loading.tsx` that states a different one jumps on every load. | `/maswali` declares **one** tier via `<PageContainer>` — `reading` (1080) — and `loading.tsx` declares the same. The results table scrolls inside its own container rather than widening the page. |
| 11 | **M4 — Money is mono and never reflows.** | A big changing hero number. | A ticker whose digit count changes (999,999 → 1,000,000) reflows the entire hero unless it is tabular. | `--font-mono`, `tabular-nums`, never letter-spaced, and the container is sized for the maximum digit count from the start. |

### §12.2 · The layout that will actually be hard

Everything above is a ruling. This is engineering, and it is the part that will take a session on
its own:

- **A ten-row ballot at 360px with 44px targets.** Ten rows × (question text + two controls) with
  no horizontal overflow, Law 9's tap floor, and Swahili prose. The question text cannot sit
  beside the controls at 360 — it must stack, which makes the page long, which makes the entry CTA
  fall below the fold. ⭐ **Assert a rectangle**: the CTA must be reachable, and the ticker must be
  above the fold at 360. A test that asserts the node exists will pass with it 119px off-screen —
  that has already happened on this platform.
- **A sticky progress affordance** (*4 of 10 answered*) is almost certainly needed, and it is a
  **new state on an existing component**, per B9 — never a new component and never a new `.css`
  file.
- **The results table** at 360: ten questions × (pick, outcome, ✓/✗) inside `scroll-x.tsx`,
  because Law 13's broken-example is a table stretching the page.
- **Skeleton parity.** The `loading.tsx` skeleton must be the same width and the same row count as
  the real ballot, or every load jumps.

### §12.3 · The label law — where the words come from

`L2` requires **one definition site per enum family, and it must be product-aware**. This feature
introduces four families, and each one is a `side-label.ts`-shaped module or it will end up
hand-written in six places:

| Family | Values | Home |
|---|---|---|
| Tier | `MILLIONEA` · `SUPA` · `MINI` · `NONE` | `src/lib/maswali-tier-label.ts` |
| Cycle state | `DRAFT` · `OPEN` · `LOCKED` · `RESOLVING` · `SETTLED` · `VOIDED` | same module |
| Question outcome | `YES` · `NO` · `VOID` | ⛔ **reuse `side-label.ts`**, do not add a fourth map |
| Void reason | the closed set of reasons a question voids | `src/lib/maswali-void-reason.ts`, in the shape of `updown-refund-reason.ts` |

⛔ **L3: no enum ever reaches a sentence.** `MILLIONEA` must never be interpolated into player
copy. ⛔ **L4: a translated string contains no English enum tokens** — the Swahili tier sentence
must not contain the word `SUPA` unless Swahili genuinely uses it.

⚠️ And per `side-label.ts`'s own header: **it refuses to default, on purpose.** Adding the third
product line will produce compile errors at every call site that does not know which product it
is holding. Those errors are the feature working. Fix each one; do not add a default to silence
them.

### §12.4 · What Claude Code builds — all of it, from the frozen kit

| Screen element | Existing kit part — do not build a new one |
|---|---|
| Jackpot ticker hero | `page-hero.tsx` + `stat-tiles` + the type scale + `value-flash` |
| Countdown to lock | `countdown` spec + `countdown-pill.tsx` |
| The ten-question ballot | `inputs` + `chip.tsx` + `checkbox.tsx`, YES/NO pair as selection state |
| Tier result cards | `market-card` geometry + `stat.tsx` |
| Ticket receipt | `receipt-row.tsx` + `modal.tsx` (`OperationResultModal`, `stripTone`) |
| Cycle history table | `tables` + `scroll-x.tsx` + `admin-pagination.tsx` + `admin-table-empty.tsx` |
| Empty / pending / locked | `empty-state.tsx`, `skeletons`, `status-flag.tsx` |
| Refusals | `notice-bar.tsx` / `callout.tsx` — **F4: reason AND next step** |
| Admin console | `admin-shell.tsx`, `admin-sidebar-nav.tsx`, `act-gate.tsx`, `control-locked.tsx` |

⛔ **No new `.css` file, ever** (B9). A look the system lacks means **the system gains the token
and the spec** — plus the `02-components/<name>/spec.md` and `07-provenance/CHANGELOG.md` entry,
in the same commit. Guarded by `test:design-frozen`, which is a **ratchet: the allowlist may only
shrink**.

⚠️ Memory of this repo's own history: `test:design-frozen` has a **scope**, and a gate with a
scope is blind outside it. Do not treat a green run as proof that a new surface is kit-faithful —
`test:contrast`, `test:type-scale`, `test:ui-consistency` and the shot suite are the coverage.

### §12.5 · What a human graphic designer must draw — corrected

⚠️ **My first pass of this section was wrong and B9/M8 are why.** I wrote that Millionea needs *"an
identity that sits beside the 50pick Needle brand"*. **B9 forbids design that sits beside**, and
**M8 reserves identity motion and stage for the trademark — nothing else borrows it.** A jackpot
sub-brand is exactly the "second place a design truth can live" that has bitten this product three
times. Corrected:

**Four things, all of which merge INTO the system:**

1. **Three tier glyphs** — Millionea, Supa, Mini — drawn as **stroke SVGs in the existing
   `glyphs.tsx` vocabulary**, at the same stroke weight and optical size as the other 178, legible
   at 24px on a 360px phone, distinguishable without colour (Law 2: colour is never the only
   signal). This is the clearest designer job in the feature. It is icon design, not branding.
2. **The win seal artwork** — the single frame a 10/10 winner sees. Must obey M7 (seal vocabulary
   is exclusive to a win), M8 (clear space 0.25 × diameter is law *even inside our own seal*), and
   Law 7 (breathes or fades, never spins).
3. **Acquisition art** — poster, SMS creative, social cards, the printed slip if there is one.
   `/api/og` already generates share images; the art direction for them is the design job.
   ⛔ Brief the designer on Law 8 (no emoji) and Law 7 (no casino) **before** work starts.
4. **A typographic wordmark treatment** — set in the existing type scale, in the existing palette,
   as a *product name*, not a competing mark. If it needs its own hue, its own glow, or its own
   logo file, it has left the system and B9 refuses it.

**Not a designer job, and specifically not wanted:** a display typeface for the ticker (M4 says
money is mono — that is settled), a bespoke colour for the product (B1: palette is royal 268), or
any animation vocabulary of its own (M8).

Everything else — layout, every state, motion, 360/768/1280/1920, contrast, copy structure — is
Claude Code from the kit, held there by `test:contrast`, `test:type-scale`,
`test:ui-consistency`, `test:design-frozen` and `test:responsive`.

---

## §13 · Nine lenses — the verdict from every side of the platform

⭐ **Standing rule: nothing ships unless it is perfect, production-level, and accepted by every one
of these roles. If any lens raises a concern, resolve it or record it — never ship past it
silently.** Every concern below is either resolved in this document or carries a pointer to the
decision, gap or session that owns it. Nothing is left as an unowned worry.

### Lens 1 · The player — a real person in Dar es Salaam, on a cheap Android, on 3G

**Verdict: ✅ strong, with four concerns, all owned.**

Genuinely the **most understandable product on the platform.** Ten yes/no questions for 2,000
shillings needs no explanation; the conviction dial and a price round both do. That is a real
acquisition advantage and it is worth protecting in the design.

| Concern | Owner |
|---|---|
| **"Why did I lose?" is ten times harder here than on a poll.** On a market one question went against you. Here up to ten did, and the player cannot see which. Unanswered, this floods support and reads as a rigged game. | The ticket page must show **each pick beside each outcome with the officer's evidence and the source link** — §9, S5. This is a support-cost argument as much as a compliance one. |
| **The near-miss.** ~24% of tickets land on 7/10 and get nothing. That player feels robbed. | Law 6 / M7 forbid dramatising it, and they are right — but it must not be hidden either. The receipt states 7/10 plainly, calmly, once. §12.1 row 6. |
| **A dropped connection mid-slip.** Ten selections is a long interaction on 3G; losing it is the difference between a sale and a churn. | Persist selections client-side; the submit carries an `idempotencyKey`, which `buyPosition` already honours. S3. |
| **Swahili is the primary language and the questions are prose.** A missing SW translation on *the sentence the payout turns on* is not a disclosure problem here — it is a player being asked to bet 2,000 on a rule written in a language they do not read. | **Stronger rule than markets: a cycle may not OPEN with any question missing its SW criterion.** Blocked, not disclosed. S2 enforces it in `openCycle`. |

⭐ **One point in the product's favour on responsible gambling that is worth stating explicitly:** a
fixed TZS 2,000 entry is *inherently lower-harm* than an unbounded stake. A player cannot lose
50,000 on one impulse. That advantage is destroyed the moment ticket count is uncapped — hence
G-14 and D-6.

### Lens 2 · The owner — Ali, running this every week, non-technical

**Verdict: ⚠️ conditional. The economics are conditional on §5; the operational load is a real
problem this document must solve, not note.**

**Revenue.** At 2,000 tickets a week: gross TZS 4,000,000, fee TZS 491,920, TRA 49,192, GBT 24,596
— **operator keeps TZS 418,132 a week.** Against the specified 20M guarantee, expected cost is
~15,400,000 a week. Progressive-only, expected cost is **zero**. That is the whole argument.

🔴 **The operational load is the finding nobody has costed.** Running one cycle by hand means:

- create the cycle and set its window;
- write **10 questions × 3 locales = 30 strings**, plus 10 resolution criteria × 3 locales = 30
  more, plus 10 validated source URLs — **~70 fields**;
- after the events, seal **10 outcomes with evidence, each requiring a second officer — 20
  signatures**;
- then settle.

**Every week, forever.** That is not "easy to manage"; done naively it is a part-time job, and it
is exactly the kind of load that decays into copy-pasted questions and rubber-stamped second
signatures — which is worse than no ceremony, because it looks like one.

**The fix is three features, and they are in the plan as first-class scope, not polish:**

| Feature | What it removes | Session |
|---|---|---|
| **Cycle templates** — clone the previous cycle's structure, keep the shape, replace the specifics | ~40 of the 70 fields | S4 |
| **AI drafting** — `EventCalendar` + `MarketCandidate` + the existing AI poll pipeline proposes all ten questions with sources; the officer **edits and approves** | the blank page, and the temptation to reuse a stale question | S4 |
| **Bulk seal** — one screen, ten outcomes, one evidence pass, **one** second-officer review of the whole set | 10 ceremonies → 1 | S4 |

⛔ **Bulk seal must not weaken the control.** One second officer reviewing ten outcomes on one
screen is still two humans on every outcome; ten separate screens that an officer clicks through
in ninety seconds is theatre. Design for the former and test that the same account cannot fill
both stages.

**Exposure at a glance.** The owner needs one screen that answers *"am I exposed right now?"* —
pool balances read from the ledger, guarantee funding status, tickets sold, and worst-case payout
if the top tier hits today. That is `/admin/maswali/pools`, and it is the screen Ali will actually
open. Build it as the primary console, not an afterthought.

**Blast radius.** One badly-worded question poisons an entire cycle's money, where on a market it
poisons one market. Operator error is more expensive here by exactly the ratio of cycle pool to
market pool. That is the argument for the AI draft + officer edit flow, and for §11's admissibility
standard being enforced in the builder rather than trusted to the writer.

### Lens 3 · The visual engineer, the graphic designer, and the art evaluator

**Verdict: 🔴 the proposal's visual direction is rejected. ✅ the platform's direction works, and
is better.**

Full analysis in §12 — eleven design-law collisions, all resolved. The three that matter here:

- **No gold on the jackpot figure**, because gold means *earned* and this prize is the most
  unearned number the platform will ever show (§12.1 row 2). This will be argued about. Win it.
- **No count-up ticker**, because a number that climbs on a timer is manufactured urgency by
  construction (§12.1 row 1).
- **No sub-brand**, because B9 forbids design that sits beside and M8 reserves the stage for the
  trademark (§12.5). Millionea is a product name in the existing type scale, plus three glyphs
  that merge into `glyphs.tsx`.

**The art evaluator's real question: without gold, confetti, emoji or a climbing counter, does it
still feel alive?** Yes — and the reason is worth writing down, because it is the design idea the
whole feature should be built around:

> ⭐ **The slip is a document, not a form.** Ten numbered questions, mono, a countdown, a stamp when
> it locks, a hash published when it seals. That reads as *an official entry into something real* —
> which is a stronger and rarer feeling than a casino page, and it is already the vocabulary this
> kit speaks (receipts, seals, mono money, the resolution attestation). The tension comes from the
> countdown, which Law 7 explicitly permits as the *only* legitimate tension. The payoff comes from
> the seal, which M7 reserves for a win and which therefore actually means something.

**The hardest visual problem** is the ten-row ballot at 360px with 44px targets and Swahili prose
(§12.2). Budget real time for it; it is the screen everybody sees.

### Lens 4 · The compliance engineer

**Verdict: 🔴 blocked on D-1. Conditional on nine controls thereafter — all specified.**

| Control | Status in this plan |
|---|---|
| **Licence class** — is a fixed-stake multi-event jackpot inside the current authorisation? | 🔴 **D-1. Blocks everything.** Not answerable by engineering. |
| **Outcome-dependent fee** — `docs/RULES.md` §2.1 records that loser-share is outcome-dependent under Ali's explicit override, recorded in `COMPLIANCE-DECISIONS.md` 2026-08-14 and **flagged for the GBT file**. | ⚠️ A third product on that model **inherits the flag**. It must be added to the same GBT record. It does not get a free pass because the model already existed. S1. |
| **Two-officer resolution** | ✅ §10, and 10× the volume. Bulk seal must not dilute it (Lens 2). |
| **Per-question objections** | ✅ G-6 — `Objection.questionOrdinal`. |
| **Audit chain** — every seal, settle, top-up, void, cap refusal | ✅ `audit()`, S2/S3. |
| **AML on a large payout** | ⚠️ **G-15 is open.** Decide whether a jackpot credit holds in `AML_REVIEW`, state the SLA on the ticket page, and tell the player. A winner left in silence is the worst outcome available. |
| **Responsible gambling** | ✅ inherited free via `buyPosition` (self-exclusion, cool-off, daily loss limit) — **and proven by driving the real path, not by seeding a row** (§14 lying-checks table). Plus the D-6 ticket cap. |
| **Data retention + DSAR** | ⚠️ `MaswaliTicket.selections` is player data. It must be in the retention engine and the DSAR export. ⛔ `docs/DATA-AUDIT-2026-08-20.md` already carries **"retention engine" as an unbuilt P0** — this feature *adds to that debt*, it does not create it, and shipping without acknowledging that is not honest. S6. |
| **Fairness attestation** | ✅ `ticketSetHash` published at lock, `/fairness`, S6. |

⛔ **The PDF blind spot.** `docs/50pick-betting-rules-final.pdf` and `docs/50pick-rates-for-admins.pdf`
state the rules to regulators and administrators, and **`test:rate-copy` cannot open a Word or PDF
file** — `docs/RULES.md` §7 records this as a gap no guard can reach. Adding a third product means
both documents must be regenerated **and rasterised to check**, by hand, in S1. There is no test
that will catch this being skipped.

### Lens 5 · The software architect

**Verdict: ✅ with the §6 shape, and the shape is the whole point.**

The one decision that carries the feature: **the cycle is a `PredictionMarket`, the ticket is a
`Position`, the questions are not markets, and the pools are ledger accounts.** Every alternative
forks a money path this platform has already proven, and forking money paths is the documented
failure mode of this codebase.

Three architectural temptations to refuse explicitly:

1. **A parallel `MaswaliBet` table with its own settlement.** This is what the proposal's schema
   implies. It would fork admission, idempotency, RG gates, refunds, the ledger and the audit
   chain. Up & Down refused the same temptation in §2 of its architecture doc and that refusal is
   why it works.
2. **Two definitions of scoring.** The slip preview, the ticket page and settlement will all need
   to score a ticket. One pure isomorphic module, `maswali-score.ts`, or they will drift and the
   preview will disagree with the payout.
3. **A `maswali_pools` table with mutable balance columns.** §6 — it is the "derived values lie"
   anti-pattern on a money surface.

### Lens 6 · The integration engineer

**Verdict: ✅, with three seams to get right.**

- **The server/client boundary.** `maswali-score.ts` is isomorphic, so it must be **pure** — no
  Prisma import, no `server-only`, no config read. If it pulls a server module the client bundle
  breaks, and the failure mode is a build error at the worst moment.
- **The ticker's transport.** `/api/events` and the event bus already exist, and `refresh-poller.tsx`
  exists beside them. ⛔ Do not add a third mechanism. The ticker rides the **existing SSE channel**;
  a new poller on a hero component is a per-viewer request every few seconds on 3G.
  ⚠️ And per this repo's own history: `curl /api/events` proves nothing about the edge — the
  `qa:sse-edge` drive is what proves it.
- **i18n parity across three locales**, asserted as **key-set equality**, not by scanning for
  `t("literal")` — this feature is full of lookup maps and a literal-scanner is blind to all of
  them (§14).

### Lens 7 · The routing engineer

**Verdict: ✅, and `/maswali/[cycleId]` is a genuine SEO and trust asset.**

- `generateMetadata` on `/maswali/[cycleId]` with an OG image from the existing `/api/og`. A
  settled cycle page is **permanent, public, and shareable** — it is the proof surface and the
  acquisition surface at once.
- A `loading.tsx` per route, each declaring **the same `PageContainer` tier** as its page, or the
  skeleton jumps on every load (Law 13's broken-example).
- `/positions/[positionId]` must resolve a Maswali position to the ticket view rather than render
  a dial (§9).
- Sitemap: settled cycles are public content and belong in it.
- Canonical + redirects if D-7 renames the route — cheap before S1, expensive after.

### Lens 8 · Quality assurance

**Verdict: ⚠️ the standard is high here and the traps are known.**

⭐ **"Verified" means EXECUTED.** A grep is not a chain; a seeded row is not a flow. §14 lists the
eight specific checks that would lie about this feature. The two that will actually happen if
nobody watches:

- **A browser harness reporting green while the screenshot shows the defect.** An absence check
  passes when the reader is broken. **Read the screenshots.** Assert a rectangle, not a node.
- **A settlement test seeding `MaswaliTicket` rows directly.** It proves scoring works on rows
  nothing produced, and it can never catch a purchase path that skips the RG gate. **Drive the
  purchase.**

### Lens 9 · The manager — scope, risk and sequencing

**Verdict: ⚠️ two risks that have nothing to do with the feature itself.**

**Risk 1 — scope. Cut v1 to what is provable.**

| In v1 | Deferred to v2, deliberately |
|---|---|
| Progressive jackpot, no guarantee (D-2) | The funded TZS 20M guarantee |
| 10 binary legs, weekly cadence | 1X2 legs / 12–13 legs (§5 fix 2) |
| Real balance only (D-5) | Bonus-funded entries |
| Ticket cap (D-6) | Raising or removing the cap once behaviour is observed |
| Cycle templates + AI draft + bulk seal | Automated question generation without officer edit |

That v1 is a complete, sellable, defensible product and it carries **zero house exposure**. Ship
it, watch four cycles, then decide about the guarantee with real numbers instead of estimates.

**Risk 2 — sequencing. This is the one that will actually bite.** 🔴

This is a nine-session programme that lands on `main`, **and every push to `main` deploys live.**
It would run alongside an **active live-QA campaign** and an **open round-2 design lane**, in a
shared working directory, on a platform carrying real player money.

- ⛔ Do not run this programme in parallel with the live-QA campaign in the same directory. Two
  sessions writing the same tree is how a `git add -A` takes an unrelated change live.
- Check the branch before every commit. Validate before every commit. Never `git add -A`.
- **S8's live drive puts real money into a brand-new settlement path on production.** It must be
  scheduled deliberately, at a quiet hour, with small figures, and with Ali watching — the same
  care the Up & Down Gold round #267 drive received.

---

## §14 · The checks that would lie

⭐ **Before writing any guard, ask: would this still pass if the feature were absent?** Every test
named in §14 must be proven RED first, with a positive control in the same run. The specific
false-green traps this feature invites:

| The lying check | Why it lies | What to assert instead |
|---|---|---|
| "The books balance" | A pool holding money for a deleted cycle sums to zero perfectly. So does a rollover counted in two cycles. | `trialBalance()` **plus** a Maswali-specific reconciliation: `Σ tier pool balances == Σ (unsettled rollovers)`, tied to actual cycle rows. |
| "Settlement conserves money" asserted on the total | `Σ payouts == pool` passes when the fee is 0 and passes when it is double. | Assert the **delta** and each component separately: fee, TRA, GBT, each tier, each rollover — and that they sum to G. |
| A grep for `productLine === "MASWALI"` | Proves the string exists, not that the read path is filtered. | Extend `test:product-line`: a money read that forgets `productLine: "ALL"` must **fail the test**. |
| "The ticker shows a number" | It shows a number when the pool is empty, when the cycle is void, and when the guarantee is unfunded. | Assert the *rectangle and the value* — the displayed figure equals the derived figure for a seeded pool, and equals the guarantee only when `HOUSE:MASWALI_GUARANTEE` actually holds it. |
| A test that seeds a `MaswaliTicket` row directly | Proves scoring works on a row nothing produced. Never touches `buyPosition`, so it cannot catch a bet path that skips the RG gate. | **Drive the purchase.** A seeded row is not a flow. A self-excluded player must be *refused by the real path*. |
| i18n coverage via `t("literal")` scanning | Maswali copy will be full of lookup maps — tier name by tier key, void reason by code. A scanner that only sees literal keys is blind to all of them. | Assert **key-set equality across EN/SW/ZH** for the whole `maswali.*` namespace, and resolve every map's values through the dictionary at test time. |
| "The admin page renders" | It renders for ADMIN. The whole point of RBAC is the other nine roles. | Drive each role through each route and assert the *locked* state renders, not just that ADMIN sees a button. |
| A void test with one void question | Passes. Says nothing about the cycle-void floor at three, or about eight. | Table-drive 0..10 voids and assert the arm chosen at each count. |

---

## §15 · The sessions

Nine sessions. Each is a full working session with its own tests, and each ends with something
demonstrable. **Do not start a session before its predecessor's tests are green and its acceptance
line is met.**

⛔ Standing rules for every session: check the branch before committing (`main` deploys **live**);
never `git add -A`; validate before each commit; update the docs in the same commit as the code.

---

### S0 · The decisions — Ali, not code
**Deliverable:** §0's seven decisions answered in writing and recorded in
`docs/COMPLIANCE-DECISIONS.md`, newest first, append-only.
**Blocks:** everything.
**Not a coding session.** If D-1 comes back negative, this plan stops here and nothing is lost.

---

### S1 · Law, config, accounts, schema
**Goal:** the rule exists, the money has somewhere to live, and the tables exist. No behaviour yet.

1. `docs/RULES.md` — §1 row for the third product, a new §2.10, §6 decision history. Follow §5's
   seven steps exactly.
2. `docs/COMPLIANCE-DECISIONS.md` — the D-3 fee ruling, dated.
3. `src/lib/payout.ts` — the third fee arm (or the loser-share generalisation, per D-3),
   `describeFeeModel` caption, `MASWALI_ENTRY_FEE`. ⚠️ `FEE_CAPTION_MAX_CHARS = 17` — the caption
   must fit.
4. `src/lib/server/ledger.ts` — the four `acct` entries; entry-builder helpers
   `maswaliSettlementEntries()`, `maswaliRolloverEntries()`, `maswaliGuaranteeEntries()`.
5. `src/lib/server/maswali-config.ts` — via `defineConfig()`: entry fee, tier ratios, tier
   thresholds, void rule + cycle-void floor, guarantee, rollover rule, cadence.
6. `prisma/schema.prisma` + one additive migration — the three tables (§6).
7. `/legal/terms` §4 and §5 in **all three locales**; `src/app/_actions/chat.ts` system prompt;
   `/help`; `/admin/config` fee caption.

**Tests (RED first, every one):**
- `test:maswali-law` — the fee arm computes what §2.10 states; the caption names the model that is
  charged; a config that contradicts the rule is refused.
- `test:maswali-config` — defaults, validation bounds, persistence round-trip, migration of an
  older snapshot.
- `test:rate-copy` — still green; no new hardcoded rate in any dictionary.
- `test:money-invariants`, `test:fee-model`, `test:loser-share-fee` — **unchanged and still green**.
  Existing products must be provably untouched.
- `test:dead-schema` — the new tables are reachable.

**Acceptance:** `npx prisma migrate deploy` runs clean against a copy of production; the four house
accounts return 0 from `ledgerAccountBalance()`; `trialBalance()` clean.

---

### S2 · The cycle engine — no UI
**Goal:** a cycle can be created, opened, locked, resolved and settled by calling functions.

1. `src/lib/server/maswali-dal.ts` — Prisma **and** in-memory stores, with `CYCLE_PATCHABLE` and
   `QUESTION_PATCHABLE` allowlists. ⛔ Both stores enforce the allowlist, so a suite cannot pass on
   a path production would refuse.
2. `src/lib/maswali-score.ts` — **isomorphic**, pure. The only place scoring exists.
3. `src/lib/server/maswali-service.ts` — `createCycle`, `openCycle` (freezes questions + stamps
   `rulesSnapshot`), `lockCycle` (stamps `ticketSetHash`), `setQuestionOutcome` (two-officer),
   `settleMaswaliCycle` (§7), `voidCycle`.
   ⛔ `openCycle` is where admissibility is **enforced**, not merely displayed: ten questions
   present, every source host trusted, every question inside its length cap, and **every Swahili
   criterion present**. S4 surfaces these as a builder checklist; the refusal lives here, so a
   suite cannot pass on a path production would refuse.
4. `src/lib/server/maswali-scheduler.ts` — one timer per non-terminal cycle; boot hydration in
   `src/instrumentation.ts` beside the other two; a heal sweep in `lifecycle.ts`. ⚠️ Kept separate
   from the market and Up & Down schedulers so no product can starve another.

**Tests:**
- `test:maswali-engine` (target ≥ 50 assertions) — the full lifecycle; scoring table-driven across
  0..10 voids; the cycle-void floor; two-officer refusal when one officer signs twice; settlement
  exactly-once under concurrent calls; rollover claimed by exactly one successor; a question
  frozen at open cannot be patched; `rulesSnapshot` is write-once.
- `red:maswali-engine` — proven RED four ways: remove the freeze, remove the second signature,
  remove the exactly-once gate, remove the void floor.

**Acceptance:** a full cycle runs end to end in the in-memory store with money conservation drift
of exactly 0.

---

### S3 · The money path
**Goal:** real shillings move, through the code that already works.

1. Ticket purchase through **`buyPosition`** — no new bet path. A thin
   `purchaseMaswaliTicket(userId, cycleId, selections)` that validates the slip, then delegates.
2. Bonus refusal per D-5, with a message that states the reason and the next step.
3. **The per-player ticket cap (D-6 / G-14), enforced in the purchase path**, counted inside the
   same transaction that creates the ticket so two concurrent buys cannot both pass the check.
4. Settlement wired to `withMoneyTx` + `postLedgerEntries` (§7 step 6).
5. Refunds: free cancellation (D-10 / §2.6) and `emergencyVoidMarket` for a cycle void.
6. Guarantee funding + the abort-on-underfunded arm (§7 step 4b).
7. **The AML position (G-15)** — whether a payout above the FIU threshold holds in `AML_REVIEW`,
   with the SLA stated on the ticket page and carried in the notification.
8. **Idempotent slip submission** — the client persists selections locally and submits with an
   `idempotencyKey`, so a dropped 3G connection mid-slip costs the player nothing (Lens 1).

**Tests:**
- `test:maswali-money` — every §7 invariant; the ledger group sums to zero; `trialBalance()` clean
  before and after; dust bounded and assigned to one named home.
- `e2e:maswali-money` — **drive a purchase**, do not seed a ticket. A self-excluded player is
  refused. A cooled-off player is refused. A player over the daily loss limit is refused. A
  bonus-only balance is refused with the D-5 message.
- `test:maswali-cap` — the cap holds under **concurrent** purchases (the check and the insert are
  in one transaction), and the refusal states the reason and the next step.
- `e2e:maswali-fault` — kill the process mid-settlement; resume; settle exactly once.
- `test:concurrency` — 50 concurrent purchases on one cycle; ticket count exact, no double-debit.

**Acceptance:** on a local database, a 200-ticket cycle settles with three tiers, one rollover and
a conservation drift of 0, and the trial balance is clean.

---

### S4 · Admin console — **and the operator-load problem is solved here, not deferred**
**Goal:** Ali can run a cycle every week without a developer and without the ceremony decaying
into rubber-stamping. Lens 2 costed the naive version at ~70 fields and 20 signatures per week;
items 6–8 are what remove that, and they are **scope, not polish**.

1. `/admin/maswali` — cycle list, KPIs (tickets, gross, pool balances **read from the ledger**,
   guarantee funding status), create/schedule.
2. `/admin/maswali/[cycleId]` — question builder (10 rows: text ×3 locales, criterion ×3, source
   with `isSourceTrusted` validation, ordinal); open/freeze; the sealing checklist; the two-officer
   outcome ceremony with evidence capture; settle.
3. `/admin/maswali/pools` — **the exposure screen.** The four accounts, the rollover trail,
   guarantee funding status, and *worst-case payout if the top tier hits today*. This is the screen
   the owner actually opens; build it as the primary console, not an afterthought.
4. `ROUTE_DOMAINS` in `roles.ts`; `CONTROL_DOMAIN` in `control-gates.ts` (§10).
5. Locked-state rendering via `control-locked.tsx` for view-without-act roles.
6. **Cycle templates** — clone the previous cycle's structure and cadence, keeping the shape and
   replacing the specifics. Removes ~40 of the ~70 fields.
7. **AI question drafting** — reuse `EventCalendar` + `MarketCandidate` + the existing AI poll
   pipeline to propose all ten questions with sources; **the officer edits and approves**, never
   auto-publishes. Removes the blank page and the temptation to reuse a stale question.
8. **Bulk seal** — one screen, ten outcomes, one evidence pass, **one** second-officer review of
   the whole set. ⛔ It must not weaken the control: two humans still stand behind every outcome,
   and the same account may not fill both stages. Ten separate screens clicked through in ninety
   seconds is theatre; one screen reviewed properly is not.
9. **Admissibility enforced in the builder** — §11's standard (named source, named instrument,
   named window with timezone, stated threshold) checked at open, plus a hard character limit with
   a counter so a question cannot break the 360px layout (§12.2).
10. ⛔ **A cycle may not open with any question missing its Swahili criterion** (Lens 1). Blocked,
    not disclosed — this is a stricter rule than markets carry, and the stake is why.

**Tests:**
- `test:admin-nav` — extended; every new href round-trips through the one route resolver.
- `test:maswali-rbac` — **each of the ten roles against each of the three routes**, asserting the
  locked state renders where act is absent. `assertRouteDomainsComplete()` green.
- `test:maswali-ceremony` — bulk seal still requires two distinct accounts; a single account
  cannot fill both stages; an edit after stage 1 invalidates the approval (the Up & Down proposal
  rule, same shape).
- `test:maswali-admissibility` — a cycle with a missing SW criterion, an untrusted source host, or
  an over-length question **refuses to open**, with a reason and a next step.
- `test:control-gates` — the page asks exactly the question the action asks.
- `maswali-admin-shots` — 360 / 768 / 1280 / 1920, **empty and populated**, driven through the real
  UI. ⚠️ Needs `next dev`, not `next start`: the harness seeds its admin session via
  `/api/dev-test/seed-admin`, which 404s outside development, and `NODE_ENV` is inlined at build
  time — a `next start` run silently audits the sign-in page and passes.

**Acceptance:** an officer with `trading` view+act creates, populates, opens and seals a cycle
without touching a terminal; an `accounting` officer settles it; a `support` officer sees the
locked state on all three routes.

---

### S5 · Player surfaces
**Goal:** a player can find it, understand it, buy a ticket and see what they hold.

1. `/maswali`, `/maswali/[cycleId]`, `/maswali/tickets`, `/maswali/tickets/[ticketId]`.
2. `src/components/maswali/**` — ticker hero, countdown, the ballot, ticket card, tier badges,
   receipt modal. All from the kit (§12).
3. Nav: `bottom-nav.tsx` + `top-app-bar.tsx` per §8, both `isActive` resolvers.
4. `src/lib/side-label.ts` — the third product line. The module's refusal to default will surface
   every call site that needs telling; fix them all in this session.
5. `/positions` and `/positions/[positionId]` integration.
6. `/wallet` + `/wallet/receipt` descriptions.
7. `src/lib/i18n-dict.ts` — the `maswali.*` namespace, complete in EN + SW + ZH.
8. `src/lib/maswali-tier-label.ts` + `src/lib/maswali-void-reason.ts` — the L2 label maps
   (§12.3). ⛔ Question outcomes reuse `side-label.ts`; do not add a fourth map for YES/NO/VOID.
9. **The ticker rides the existing SSE channel** (`/api/events`, the event bus) — ⛔ not a new
   poller, and it moves only on a real ticket sale (§12.1 row 1).
10. `generateMetadata` + OG image for `/maswali/[cycleId]`; a `loading.tsx` per route declaring
    **the same `PageContainer` tier** as its page (Law 13); sitemap entries for settled cycles.

**Tests:**
- `test:maswali-i18n` — **key-set equality across all three locales** for `maswali.*`, and every
  lookup map's values resolved through the dictionary (§14). ⛔ Not a `t("literal")` scan — this
  feature is mostly lookup maps and a literal-scanner is blind to every one of them.
- `test:maswali-ui` — the ticker's displayed value equals the derived value for a seeded pool;
  it renders an em-dash and a labelled state when the pool is empty (Law 5); the ballot refuses an
  incomplete slip with a reason **and a next step**; a locked cycle shows the pending state.
- `test:maswali-design` — no gold token on the ticker or the ballot; no emoji anywhere in the
  `maswali.*` dictionary; at most one lit YES/NO control per ballot row.
- `test:contrast`, `test:type-scale`, `test:ui-consistency`, `test:integrity`,
  `test:design-frozen` — all green.
- `maswali-player-shots` — 360 / 768 / 1280 / 1920 in a **real browser**, driven with the
  **longest Swahili strings**, not the English ones. ⚠️ Assert a **rectangle**, not the presence
  of a node: the ticker must be *above the fold* at 360, the entry CTA must be reachable, and the
  skeleton must be the same width and row count as the ballot it becomes. **Read the screenshots
  — a green harness over a broken reader is a report about the reader.**

**Acceptance:** on `next dev`, a real browser drives sign-in → `/maswali` → complete the slip →
confirm → see the receipt → find the ticket at `/positions` and at `/maswali/tickets`.

---

### S6 · Fairness, notifications, reports, copy
**Goal:** the product is provable, it talks to players, and it appears in the books.

1. `/fairness` — publish `ticketSetHash`, ticket count and lock time per cycle; a player-facing
   "verify my ticket" explainer.
2. Notifications — four copies × three locales through `notification-service.ts`; push via
   `push-service.ts`; per-cycle exactly-once stamping in the pattern of
   `selectionClosedNotifiedAt`.
3. `src/lib/server/reports/catalogue.ts` — Maswali rows in the monthly statutory pack, the daily
   operations report and the match-integrity review. ⚠️ Every one of these reads must carry
   `productLine: "ALL"`.
4. `/results` — settled cycles as a distinct card.
5. `/leaderboard` — **exclude** Maswali from ROI tiering, deliberately and with a test. A
   lottery-shaped return distribution would let one top-tier win permanently distort a board whose
   thresholds the copy already interpolates from `TIER_THRESHOLDS`.
6. `/help` FAQ + `/legal/terms` cross-check.
7. **Per-question objections** — `Objection.questionOrdinal` (G-6) and a review screen that shows
   the disputed question's criterion, source and evidence beside the complaint.
8. **Retention + DSAR** — `MaswaliTicket.selections` is player data. It must appear in the
   retention engine's schedule and in the DSAR export. ⚠️ `docs/DATA-AUDIT-2026-08-20.md` already
   carries the retention engine as an **unbuilt P0**; this feature adds to that debt rather than
   creating it, and the honest move is to record that in the audit doc in this session.
9. **The AML notification** (G-15) — if a payout holds for review, the player is told, with the
   SLA, in their language.

**Tests:**
- `test:maswali-fairness` — the published hash recomputes from the stored tickets; a modified
  ticket fails verification.
- `test:maswali-reporting` — Maswali gross, fee, TRA and GBT appear in the monthly pack, and the
  pack's totals equal the ledger's. **Report == ledger, or the test fails.**
- `test:product-line` — extended: a money read that forgets `"ALL"` fails.
- `test:maswali-notify` — exactly-once per cycle per player; no duplicate on a re-run.
- `test:retention` · `test:dsar-secrets` · `test:erasure` — extended to cover `MaswaliTicket`.

**Acceptance:** a settled cycle appears in the monthly statutory pack with figures that equal
`ledgerAccountBalance()` to the shilling.

⛔ **Also in this session, and no test can catch it being skipped:** regenerate
`docs/50pick-betting-rules-final.pdf` and `docs/50pick-rates-for-admins.pdf` for the third
product, and **rasterise both to check**. `test:rate-copy` scans dictionaries; it cannot open a
PDF (`docs/RULES.md` §7).

---

### S7 · Adversarial hardening
**Goal:** try to break it on purpose, before a player does.

Red-team, RED-proof-first, no new features:

- Void combinations 0..10 × tier thresholds × the cycle-void floor.
- A rollover chain across five cycles; then void cycle 3 and prove cycles 4 and 5 stay coherent.
- Concurrent settlement from two app instances.
- An objection filed *during* settlement.
- A question's source domain disabled between open and resolution.
- Guarantee underfunded at the moment of a 10/10 — must abort loudly, never settle short.
- A player buying the maximum number of tickets against the daily loss limit.
- Clock skew: a cycle whose lock passed while the server was down.
- `productLine` reclassification attempted through every write path.

**Tests:** `test:maswali-adversarial`, plus `red:maswali-*` controls for each guard.
**Acceptance:** every finding either fixed or recorded in `docs/FAILURE-INVENTORY.md` with a
decision.

---

### S8 · The live drive
**Goal:** ⭐ **"Verified" means EXECUTED.** A grep is not a chain; a seeded row is not a flow.

On production, with real money and small figures:

1. Create a one-day cycle with ten trivially-resolvable questions and a TZS 2,000 entry.
2. Buy tickets from at least four real QA personas, with picks engineered to land one in each
   tier and several in none.
3. Let the scheduler lock it. Screenshot the ticker before and after.
4. Seal all ten questions through the real two-officer ceremony, with two different accounts.
5. Settle. Read the database. Read the ledger. Read the screen.
6. Prove: wallets moved by the exact figures; the ledger group sums to zero;
   `trialBalance()` clean; the monthly pack shows the fee; the rollover landed in the successor
   cycle's opening pool; the published hash verifies.

**Acceptance:** a written drive record in `docs/`, with the cycle id, the figures, and
screenshots — the same standard as the Up & Down Gold round #267 record in `docs/RULES.md`.

---

## §16 · File map

Everything this feature touches. ✅ = exists and is reused unchanged.

| File | Role |
|---|---|
| `docs/RULES.md` | The fee rule. **Changes in S1, by the §5 ceremony.** |
| `docs/COMPLIANCE-DECISIONS.md` | D-1..D-5 and the fee ruling. Append-only. |
| `docs/MASWALI-MILLIONEA-IMPLEMENTATION.md` | This file. |
| `prisma/schema.prisma` | Three tables + the third `productLine` value + `Objection.questionOrdinal` |
| `src/lib/payout.ts` | ✅ + the third fee arm, `MASWALI_ENTRY_FEE`, caption |
| `src/lib/maswali-score.ts` | **New.** Isomorphic scoring — the only place it exists. ⛔ Pure: no Prisma, no `server-only`, no config read |
| `src/lib/maswali-tier-label.ts` | **New.** L2 map: tier + cycle state. No enum reaches a sentence |
| `src/lib/maswali-void-reason.ts` | **New.** L2 map, in the shape of `updown-refund-reason.ts` |
| `src/lib/side-label.ts` | ✅ + a third `LabelProductLine`. Question outcomes reuse it — no fourth map |
| `src/lib/i18n-dict.ts` | ✅ + the `maswali.*` namespace, three locales |
| `src/lib/server/ledger.ts` | ✅ + four `acct` entries + three entry builders |
| `src/lib/server/market-service.ts` | ✅ `buyPosition` reused as-is; `ProductLine` gains a value |
| `src/lib/server/maswali-config.ts` | **New.** Via `defineConfig()` |
| `src/lib/server/maswali-dal.ts` | **New.** Prisma + in-memory stores, patchable allowlists |
| `src/lib/server/maswali-service.ts` | **New.** Cycle lifecycle + settlement |
| `src/lib/server/maswali-scheduler.ts` | **New.** One timer per live cycle |
| `src/lib/server/roles.ts` | ✅ + three `ROUTE_DOMAINS` rows |
| `src/lib/server/control-gates.ts` | ✅ + five `CONTROL_DOMAIN` entries |
| `src/lib/server/reports/catalogue.ts` | ✅ + Maswali rows, `productLine: "ALL"` |
| `src/lib/server/notification-service.ts` | ✅ + four copies |
| `src/instrumentation.ts` · `src/lib/server/lifecycle.ts` | ✅ + boot hydrate + heal sweep |
| `src/app/maswali/**` | **New.** Four player routes |
| `src/components/maswali/**` | **New.** Ticker, ballot, ticket card, tier badges |
| `src/components/layout/bottom-nav.tsx` · `top-app-bar.tsx` | ✅ + the third product slot |
| `src/app/admin/maswali/**` | **New.** Three admin routes |
| `src/app/legal/terms/**` · `src/app/help/**` · `src/app/_actions/chat.ts` | ✅ the fee statement |
| `scripts/maswali-*.test.mts` · `scripts/red-maswali-*.mjs` | **New.** The suites in §14 |

---

## Appendix A · The one-paragraph version, for management

Maswali Millionea is buildable on 50pick in roughly nine working sessions, and it reuses the
platform's proven money, settlement, audit and compliance machinery rather than adding a second
set. Four things must be settled before any code is written: whether the Gaming Board licence
covers a fixed-stake multi-event jackpot; who funds the advertised TZS 20,000,000 guarantee, which
as specified is an open-ended weekly liability the entry fees do not cover below 20,000 tickets a
cycle; what a voided question does to a ticket's score; and how many tickets one player may buy —
because with ten yes/no questions there are only 1,024 possible tickets, and buying all of them
costs TZS 2,048,000 and guarantees the top prize. The proposal's 13 / 50 / 25 / 12 split is sound
and already matches the platform's existing 13% fee once you read it as "our 13%, then the rest in
three parts", so no renegotiation of the economics is needed. The recommendation is to launch
progressive-only with no fixed guarantee, cap tickets per player, use three-way outcomes on the
football legs so the top prize is rare enough to grow into a headline number, and rewrite the ten
sample questions to a standard two officers could settle without discussing them.

---

## Appendix B · Verdict by lens, at a glance

| Lens | Verdict | What stands between it and 10/10 |
|---|---|---|
| **Player** | ✅ strong | Show every failed pick with its evidence; block a cycle whose Swahili criteria are missing; cap tickets (D-6) |
| **Owner** | ⚠️ conditional | §5 solvency (D-2); and the operator-load fix — templates, AI draft, bulk seal — must ship in S4, not "later" |
| **Visual / graphic / art** | 🔴 → ✅ | The proposal's direction is rejected outright (§12). The platform's — the slip as a document — is better, and is what to build |
| **Compliance** | 🔴 blocked | D-1 licence class. Then: GBT flag inherited, per-question objections, AML position (G-15), retention debt acknowledged, PDFs regenerated by hand |
| **Architect** | ✅ | Hold the §6 shape. Refuse the parallel bet table, the second scoring definition, and the mutable pool columns |
| **Integration** | ✅ | Keep `maswali-score.ts` pure; ticker on the existing SSE channel; i18n by key-set equality |
| **Routing** | ✅ | Settle D-7 before S1; metadata + OG on the cycle page; `loading.tsx` tiers must match |
| **QA** | ⚠️ | Drive the purchase, never seed the row. Assert rectangles. Read the screenshots |
| **Manager** | ⚠️ | Cut v1 as scoped; do not run this alongside the live-QA campaign in the same directory; schedule S8 deliberately |

**Nothing above is left as an unowned concern.** Every ⚠️ and 🔴 points at a decision in §0, a gap
in §3, or a session in §15 that carries it.
