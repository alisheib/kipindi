# Up & Down — architecture

> **This document owns HOW Up & Down is built.** Data model, engines, money path,
> scale. If code and this document disagree, the code wins and this document is a
> defect — fix it in the same commit.

## Document ownership (read this before adding anything anywhere)

One fact, one home. Nothing below is restated in another doc; each links instead.

| Document | Owns | Does NOT contain |
|---|---|---|
| **`UPDOWN-ARCHITECTURE.md`** (this) | Data model · engines · money path · scale · file map · test map | Status, dates, business rationale, UI redlines |
| [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) | What the product IS — rules, workflows, states, the source requirement, the proposal flow, copy rules | Table shapes, function names |
| [`UPDOWN-PRICING.md`](UPDOWN-PRICING.md) | The margin / winning-boundary model and its admin levers | The lifecycle, the data model |
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | Owner decisions that touch a **compliance control** | Anything not compliance-bearing |
| [`NEXT-SESSION-UPDOWN-AI.md`](NEXT-SESSION-UPDOWN-AI.md) | Where the AI work stands and what is next | Anything the three docs above own (it links) |
| `Up and Down/` (repo root) | The management team's original requirements, verbatim | — |

⚠️ **Corrected 2026-07-30.** This table previously listed three separate rows all pointing at
`UPDOWN-SPEC.md` — one claiming it owned a phase board / decision log / session log, another a
Claude Design brief. It owns neither; those documents do not exist. It also pointed design
redlines at `Up Down Design System/handoff/D1-*.md`, a directory that is not in this repo, and
omitted `UPDOWN-PRICING.md` entirely. A stale pointer in the *ownership table* is worse than
one in the body: it is the thing a new reader uses to decide where to write, so it manufactures
duplicate homes for one fact.

---

## 1 · The one-sentence version

An **asset** runs one **chain** per duration; each chain emits **rounds** back-to-back
on a fixed grid; a round is settled by comparing the price at its closing boundary to
the price at its opening boundary; **every round is a `PredictionMarket` row**, so all
money movement is the code that already works.

---

## 2 · Why rounds are PredictionMarket rows

**UP = YES. DOWN = NO.** At the data layer there is no new side, no new pool, no new
payout function, no new refund path.

This is the single most consequential decision in the feature, and it is a *refusal* to
build something. A parallel `UpDownBet` table with its own settlement would have forked
the money paths — and this platform has a documented history of exactly that class of
bug (two definitions of one truth, drifting apart). Everything below therefore reuses:

| Concern | Reused, unchanged |
|---|---|
| Fee + payout maths | `src/lib/payout.ts` — `poolFee`, `settledPayoutFor`, `allocateWinnerPayouts`, `assertWinnerFloor` |
| Rate freezing | `snapshotFromConfig` / `snapshotOrLegacy` / `ratesFor` (`market-config.ts`) |
| Bet path | `buyPosition` — admission gate, single transaction, idempotency key |
| Settlement | `settleMarket` — winner floor, one-sided refund, ledger dual-write, resume-safe |
| Void + refund | `emergencyVoidMarket` |
| Locking | `withLock("market:{id}")`, `withMoneyTx` |
| Audit chain | `audit()` |
| Source allowlist | `source-registry.ts` — `isSourceTrusted`, `normalizeDomain` |

**The Up & Down tables never hold money.** They hold the price story.

---

## 3 · The observation ledger

The core idea, and the reason `UpDownObservation` is a table rather than two columns
on a round.

Prices are observed **once per (asset, grid boundary)** on a 5-minute grid, and shared
by every round edge landing on that instant:

```
grid:      …  14:25   14:30   14:35   14:40   14:45  …
5-min:        [ R41 ][ R42 ][ R43 ][ R44 ][ R45 ]
15-min:       [        R14        ][      R15    …
30-min:       [                 R7                …
```

The reading at 14:30 is simultaneously the **close** of R41 and the **open** of R42 —
and of any 15/30-min round crossing it. Two consequences, both load-bearing:

1. **Cost.** One price read per asset per boundary serves up to six round edges.
   2 assets × 288 boundaries = **576 reads/day**, no matter how many durations run —
   instead of one per round. (This matters for either reader: an AI call costs tokens, a
   feed call costs quota.)
2. **Correctness.** An observation is written once and read many times, so round N's
   close **is** round N+1's open, to the digit. The reader can never disagree with itself
   between adjacent rounds because it is never asked twice.

`@@unique([assetId, boundaryAt])` enforces both, at the database.

> ⛔ **Never update a CONFIRMED observation's price.** Re-observing a settled boundary
> is a bug, not a feature. The unique index makes it a database error instead of a
> silent money divergence.

### Who does the reading — one contract, two implementations

`readPrice(asset, boundaryAtIso, cfg)` is the only way a price enters the system. Which
implementation runs is an operator setting, `observationMethod`:

| Method | Reader | Use |
|---|---|---|
| `"feed"` *(default)* | `updown-feed.ts` — a market-data API returning a quote **with its own timestamp** | production |
| `"ai"` | `updown-oracle.ts` — Claude with `web_fetch` pinned to the asset's domain | fallback / assets with no feed |

⚠️ **Why the default is the feed, in one sentence:** a page-reading AI cannot meet a 90-second
staleness window. Measured, not assumed — three probes through the real `observePrice` prompt
and gates over 7 gold/index pages returned no timestamp at all, or quotes 9–12 hours stale,
one 7.3 **days** old, because these pages render their price in client-side JavaScript that
neither `web_search` nor `web_fetch` executes. With `maxStalenessSeconds: 90` every 5- and
15-minute round therefore refuses, forever. The AI path is kept because it is the only reader
for an asset no feed carries, and because it is what the proposal pipeline uses to *reason*
about a line — but it is not a production price reader for short rounds.

Both implementations return the same shape and face **the same gates below**. The feed does
not get a weaker check for being ours.

### Confirmation gates — all must pass

1. The cited URL's host matches **the domain the round pinned at open** (`hostMatchesDomain`,
   the one host rule on the platform) and, at enable/start time, is an enabled
   `TrustedSource` in the right category (one allowlist, not two).
2. `|sourceQuotedAt − boundaryAt| ≤ maxStalenessSeconds` (admin, default 90 s).
3. `confidence ≥ threshold` (admin, default 85) and evidence ≥ 10 characters.
4. The price parses to a finite positive number at the asset's `decimals`.

Failure → retry with backoff (`retryBackoffSeconds`, default 15/45/120 s, max
`maxObservationAttempts` = 4) → `FAILED` → every round depending on it **VOIDs with a full
refund**. The card shows *Confirming price* throughout and **never a number we do not
have** (rule A-5).

> ⛔ **An operator mistake must not spend a round's retry budget.** A refusal for
> `no-api-key` or `ai-paused` is a fact about *us*, not about the source, so
> `acquireObservation` does **not** call `recordAttempt` for those two — otherwise pausing
> AI (or forgetting a key) for ~4 boundaries would FAIL live rounds and void real bets.
> A genuine source failure still burns an attempt, which is the whole point of the ladder.

> ⛔ **A refund promise is only real if something walks the ladder.** The boundary ticker
> observes the *next* boundary and moves on; nothing revisits a boundary that refused. So
> `resolveOverdueRounds()` on the lifecycle ticker re-attempts every overdue unresolved
> round, groups by (asset, boundary) to keep one reading per instant, and is deliberately
> **independent of chain state** — pausing a chain must not strand money already staked.
> Guarded by `test:updown-heal` §1–§4.

### The honesty boundary

Neither reader can report the price at an exact second. So the observation stores
`sourceQuotedAt` — **the timestamp the source itself published** — and every surface shows
*that*, never the boundary. Precision is bounded by the source, and we say so rather than
implying tick accuracy we do not have.

---

## 4 · Outcome rule

Since the margin engine (`20260728150000_updown_margin`) the verdict is read off the
**targets the round froze at open** — it is not recomputed at close:

```
close ≥ round.upTarget    → UP    (YES)
close ≤ round.downTarget  → DOWN  (NO)
strictly between the two  → VOID  (full refund, zero fee, reason `no-move`)
```

`upTarget`/`downTarget` are `openPrice ± marginBps`, computed **once** by `computeTargets`
in `openRound` and never again — `docs/UPDOWN-PRICING.md` owns how the margin is set and
tuned. A round opened before that migration carries null targets and falls back to the
original tick rule (`close > open + minMove` → UP, `close < open − minMove` → DOWN,
otherwise VOID), where `minMove = minMoveTicks × 10^-decimals` per asset — so a legacy
round settles under the rule it was actually sold under. `closeRound` picks by whether the
round carries targets; both rules live beside each other in `updown-service.ts`.

VOID also covers a `FAILED` observation (`source-failed`), a reading that came from a page
**this round did not pin** (`source-mismatch`, §3), and an operator void
(`operator-void`); `voidReason` distinguishes them for the audit trail and for the
player-facing receipt.

---

## 5 · Execution model — one timer per CHAIN

Up & Down rounds are **excluded from the per-market scheduler**: `nextDeadlineFor`
returns `null` for `productLine === "UPDOWN"`, and `marketStore.pending()` defaults to
`"MARKET"`. Two engines racing the same row is a money hazard.

A dedicated `updown-scheduler.ts` mirrors the proven shape of `market-scheduler.ts`:

- **One timer per chain** (~6 total), armed to the next grid boundary.
- Boot hydrate from an indexed `UpDownChain where state = RUNNING` query; a missed
  boundary fires after a staggered grace — delayed, never skipped.
- Its **own** fire gate (`UPDOWN_SCHEDULER_CONCURRENCY`, default 3), separate from
  `withFireSlot`, so an Up & Down burst at :00/:15/:30 can never starve a long-form
  market settlement, and vice-versa.
- Self-healing reconcile on the existing lifecycle ticker.

**One boundary fire:**

1. Ensure the observation for this boundary exists (create `PENDING`, or reuse).
2. Read the price if `PENDING` (§3) — **outside any lock**; it is slow and must not pin a
   pooled connection.
3. **Close** round N under `withLock("market:{marketId}")` — the round's own market row,
   the same lock `settleMarket` and `buyPosition` take, which is the granularity that
   actually matters: two fires must not resolve one round twice. Stamp the outcome and
   `objectionsClosedAt = now`, then call `settleMarket()` — the normal gate, **not**
   `force`, so the standing-objection freeze still applies.
4. **Open** round N+1 against the same observation as its open price, **capturing the
   asset's source link into the round** (§7). That capture is what round N+1 will resolve
   against, whatever the asset row says by then.
5. Re-arm for the next boundary.

> ⚠️ There is deliberately **no** chain-level lock. The fire is idempotent by row state —
> step 1 by `@@unique([assetId, boundaryAt])`, step 3 by a re-check of the round's status
> inside the market lock, step 4 by `@@unique([chainId, roundNumber])` — so a duplicate
> fire loses a race rather than corrupting anything. A chain lock held across a slow price
> read is a pinned pooled connection for no added safety.

**Steps 3 and 4 are independent.** A stalled resolution never stalls the chain: round
N+1 opens for betting while round N is still confirming. That is what makes "don't
rush the read" compatible with a continuous product.

### 5b · The self-healer — why a stalled round is not a stranded one

🔴 **Read this before touching anything above.** The independence of steps 3 and 4 has
a cost that went unpaid until 2026-08-01: `advanceChain` closes only the round
`chain.currentRoundId` still points at, and **step 4 has already moved that pointer**.
So a round left pending in step 3 was *orphaned at the very next boundary and never
looked at again*. On production a player's TZS 500 sat in one such round with **no way
out at all** — the retry ladder was dead config, the market settle sweep excludes this
product by design, stopping the chain does not void its rounds, and the operator's
remedy had no UI. Finding **E-24**, campaign doc `docs/LIVE-QA-CAMPAIGN.md`.

`healStuckRounds()` (updown-service.ts) runs on the **once-a-minute** lifecycle pass and
enforces one invariant:

> ⭐ Every round reaches a terminal state — resolved, or voided with every stake
> refunded in full — within `abandonAfterSeconds` of its own boundary, whatever the
> oracle, the AI budget, the chain's state or the timers do. **Defaults: 390 seconds.**

| | |
|---|---|
| **Inside the window** | It runs the retry ladder that had never run: `retryDelaySeconds(cfg, attempts)` gates each re-attempt, and `acquireObservation` is what advances `attempts` toward `maxObservationAttempts`. A spent budget skips the backoff — there is nothing left to wait for. |
| **Past the deadline** | It closes the round **without asking the oracle**. A reading for a boundary that old could not satisfy `maxStalenessSeconds` even if it arrived, so dialling a paid provider would burn real money to learn nothing — and it is what makes sweeping a backlog cost **$0**. |
| **Also** | Rounds that reached a verdict but never settled (a process that died between the two stamps) are re-settled; `settleMarket` is idempotent and resumable. |
| **Audit** | `updown.round.healed`, actor **`system_updown_healer`** — deliberately distinct from `system_updown`, so an operator can tell a round the engine closed on time from one the safety net had to rescue. |

Three design choices are load-bearing and must not be "tidied":

1. **It ignores chain state.** A STOPPED chain's orphans are the likeliest kind —
   stopping the chain is exactly what an operator does when the game misbehaves.
2. **It is not gated on `UPDOWN_SCHEDULER`.** Its own switch is `UPDOWN_HEALER`.
   Switching the game off must never switch off the thing that returns money already
   staked in it.
3. **It never invents a price and never picks a winner.** Unconfirmed ⇒ VOID ⇒ refund
   in full, through the same `settleMarket` path as every other void.

Guarded by `npm run test:updown-heal` (79), which reproduces the production incident
end to end rather than asserting on source text.

### Grid derivation

Boundaries are `gridAnchorAt + k × durationMinutes` — **derived, never accumulated**.
A restart, a missed fire or a slow tick cannot drift the grid.

---

## 6 · Scale

Concurrency is bounded by round **duration**, not rounds/day: with 2 assets × 3
durations there are ~6 chains and ~12–18 in-flight rounds at any instant. The registry,
the fire gate and the DB pool (40) all hold comfortably.

What did **not** hold, and was fixed first (Phase 0, commit `fdea3eb`):

- `listMarkets()` read the **whole** `PredictionMarket` table (`findMany` with no
  `where`) and filtered in JS, from ~25 surfaces. Now `marketStore.listBoard()`, a real
  indexed query, served by `@@index([productLine, status, resolutionAt])`.
- `listSettlementQueue()` and `getSettlementHealth()` did the same via `values()`; both
  now use the indexed `pending("ALL")`.

### ⚠️ The read-path rule

`listMarkets()` **defaults to `productLine: "MARKET"`**, so player boards exclude rounds
for free. The dangerous half is the corollary:

> **Any money or regulator read must opt IN with `productLine: "ALL"`** — otherwise
> Up & Down stakes, payouts and commission vanish from GGR, the statutory reports and
> platform stats **while every remaining number still reconciles with itself**. Nothing
> would look broken.

The opted-in call sites are listed in [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) §5 and
asserted by `npm run test:product-line`, which is verified to fail when one regresses.

Row growth (~300k rounds/year) is handled by: no `MarketSnapshot` writes for `UPDOWN`,
indexed access only, and an archive job (Phase 6).

---

## 7 · Data model

Four additive tables plus one column. Full field-level documentation lives in
`prisma/schema.prisma` — it is the source of truth and is commented in place.

| Table | Holds | Key constraint |
|---|---|---|
| `UpDownAsset` | Operator-managed tradable asset — names, icon, **source link**, decimals, min move, enabled | `@@unique([key])` |
| `UpDownChain` | One asset at one duration — state, grid anchor, next boundary, stake bounds, **frozen rate profile** | `@@unique([assetId, durationMinutes])` |
| `UpDownRound` | One round — its market, boundaries, bounding observations, prices, frozen targets, **captured source link**, outcome | `marketId @unique` + FK cascade; `@@unique([chainId, roundNumber])` |
| `UpDownObservation` | An immutable price reading for one asset at one boundary | **`@@unique([assetId, boundaryAt])`** |
| `PredictionMarket.productLine` | `"MARKET"` \| `"UPDOWN"` — the discriminator | `@@index([productLine, status, resolutionAt])` |

`productLine` is **immutable after creation** — deliberately absent from the Prisma
`update` block, so a stale in-memory copy writing back can never reclassify a settled
round and move its money between product lines in every later report.

### The round's terms freeze at open

Five columns on `UpDownRound` are **write-once**: `marginBps`, `upTarget`, `downTarget`,
`capturedSourceUrl`, `capturedSourceDomain`. Nothing enforces this with a trigger — the
mechanism is that they are **absent from `ROUND_PATCHABLE`**, and `roundStore.patch` throws
`'<k>' is not a patchable column` on anything not in that allowlist. Both the Prisma store
and the in-memory store check it, so a suite cannot pass on a path production would refuse.

> ⛔ **The one hard line: the line and the source link freeze at open and never move while
> stakes exist.** A round is sold on a specific claim — *this* price band, read from *this*
> page — and a player who has staked cannot be re-bound to a different one. `openRound`
> reads the asset once into locals and every downstream write (the market's `sourceUrl`, the
> player-facing `resolutionCriterion`, the round row, the audit payload) comes from those
> same locals, so the round, the market and the sentence the player read can never
> disagree. `closeRound` then verifies each bounding reading against
> `round.capturedSourceDomain` — never the asset row — and a genuine contradiction VOIDs
> with a full refund rather than settling on a page nobody was told about. Guarded
> structurally by `test:updown-source`.

⚠️ **`capturedSource*`, not `sourceUrl`/`sourceDomain`, deliberately.** In `closeRound` a
field called `round.sourceDomain` would sit one identifier away from `asset.sourceDomain`,
and reading the wrong one *is* the entire bug class. Distinct names also let the structural
assertions discriminate between the two.

Migrations: `20260724180000_market_product_line`, `20260724190000_updown_tables`,
`20260728150000_updown_margin`, `20260730210000_updown_round_source_capture`. All purely
additive. The last one carries an **in-migration backfill** (unlike the margin migration,
which deliberately left old rounds null): a round with no captured link cannot be verified,
and leaving live rounds null until a separate script ran would re-open the gap for exactly
the rounds holding money. It is scoped to `settledAt IS NULL` — a settled round's money has
moved and its proof renders from observations, so writing a link there would assert a fact
we did not witness — and guarded by `AND capturedSourceUrl IS NULL` so it is idempotent.

---

## 8 · The fee profile

Ali's decision, 2026-07-24: Up & Down rounds freeze **`capped-commission` at 13% of the
pool**, ceiling ⅓ of the smaller side.

```
fee = min(0.13 × pool, ⅓ × smaller side)
```

On a balanced TZS 10,000 pool that is exactly **TZS 1,300** — the figure the management
proposal is built on — using maths that already exists and is already tested
(`test:fee-model`, 77 assertions). It is **outcome-neutral**, which is a better fit for
the pari-mutuel licence than `loser-share`, and the ceiling preserves the winner floor.

Long-form polls keep `loser-share` (13% of the *losing* pool). **The two never mix**,
because the model is frozen per poll at creation and `snapshotOrLegacy` reads only what
that poll froze.

Mechanism: `UpDownChain.rateProfile` (a partial `RateConfig`) is passed to
`createMarket` as `rateOverrides` and stamped through the **same**
`snapshotFromConfig` path every poll uses. One fee-freezing mechanism on the platform,
not two.

> ⚠️ Known code detail: `snapshotOrLegacy` currently forces `estimatedWinningsRate = 0`
> and `showEstimatedWinnings = false` on any non-`loser-share` snapshot. Those two
> **display-only** fields must become model-independent or the "× 1.4 est." headline
> cannot render on a capped-commission round. The *maths* must stay untouched.

---

## 9 · File map

| File | Role | Status |
|---|---|---|
| `prisma/schema.prisma` | The four tables + `productLine` | ✅ done |
| `src/lib/server/market-dal.ts` | `listBoard()`, product-filtered `pending()` | ✅ done |
| `src/lib/server/market-service.ts` | `ProductLine`, `listMarkets` default, `createMarket` | ✅ done |
| `src/lib/server/updown-dal.ts` | Prisma + in-memory stores for the four tables | ✅ done |
| `src/lib/server/updown-config.ts` | Asset/chain registry, grid maths, rate profile, thresholds | ✅ done |
| `src/lib/server/updown-oracle.ts` | The **AI** price reader — `web_fetch` pinned to the asset domain, six refusal gates | ✅ done |
| `src/lib/server/updown-feed.ts` | The **market-data** price reader (default) + `hostMatchesDomain`, the one host rule | ✅ done |
| `src/lib/server/updown-service.ts` | Round lifecycle; `readPrice`; the overdue-round heal sweep; the ONLY UP/DOWN ↔ YES/NO mapping | ✅ done |
| `src/lib/server/updown-scheduler.ts` | Per-chain timers, hydrate, own fire gate, reconcile | ✅ done |
| `src/instrumentation.ts` · `lifecycle.ts` | Boot hydrate + self-healing reconcile + `healStuckRounds` (the ONE heal sweep) | ✅ done |
| `src/app/admin/updown/**` | Console: assets · chains · reader health · thresholds | ✅ done |
| `src/app/admin/updown/rounds/**` | Round explorer · **overdue KPI · Void & refund (E-23)** · proof drawer | ✅ done |
| `src/lib/server/control-gates.ts` | `voidUpDownRound → trading`, read by both page and action | ✅ done |
| `src/lib/server/updown-proposal.ts` | AI chain proposals: generate · validate · edit · approve/reject · **arm** (the only writer of `armedChainId`) | ✅ done |
| `src/lib/server/ai-provider-claude.ts` | `proposeUpDown` — `web_fetch` pinned to the asset domain, evidence required-and-nullable | ✅ done |
| `src/app/admin/updown/proposals/**` | The officer queue: propose · review/edit · approve · reject · arm | ✅ done |
| `src/app/updown/**` · `src/components/updown/**` | Player board, round detail, cards, settlement proof | ✅ done |
| `scripts/audit-updown-source-drift.mts` | Read-only: does any unsettled round's reading cite a host the asset no longer points at? | ops tool |
| `scripts/ops-updown-pause-chains.mts` | Containment: pause chains through `setChainState`, dry-run by default | ops tool |
| `scripts/ops-updown-void-stuck-rounds.mts` | Bulk-void an unreadable backlog with full refunds, dry-run by default | ops tool |

### Tests guarding this subsystem

| Script | Guards |
|---|---|
| `test:product-line` (30) | Money reads see both products; player boards see long-form only. **Verified to fail when a call site regresses.** |
| `test:updown-config` (62) | Grid derived-not-accumulated · source gate · winner floor · **observations write-once** |
| `test:updown-engine` (43) | UP=YES through settlement · voids refund in full · shared observations · exactly-once settlement · **money conservation, drift 0** |
| `test:updown-heal` | **E-24/E-23.** Reproduces the production incident — real bet, real orphaning, chain STOPPED — and proves the stake comes back. Ladder honoured · deadline costs no AI spend · idempotent · conserves money · the operator remedy is wired · **ops states do not burn attempts, a source failure does**. Proven RED four ways (chain-state filter, no deadline, dead ladder, unwired from the ticker). |
| `test:updown-feed` (25) | The mock feed **refuses in production** · a missing key never falls back to it · the API key never reaches a stored field · staleness and shape gates |
| `test:updown-source` (79) | **Structural**: no path may recompute a live round's line, move its link, resolve against the asset row instead of the round's pin, or **arm a chain without an officer** |
| `test:updown-proposal` (80) | Nothing arms without an officer · an approval does not survive an edit · evidence does not follow a changed link · reject reasons are a closed set · **the source lock holds through the arm path, proven against a round holding real money** |
| `test:admin-nav` (16) | ONE route resolver; every nav href round-trips |
| `updown-admin-shots` · `updown-admin-e2e-shots` | 360/768/1280/1920, empty AND populated, driven through the real UI |
| `test:responsive` | ⚠️ The Up & Down console was **never in this sweep** until 2026-07-30 — three routes, unaudited at every width since the product line was built. Now covered. Needs `next dev` (not `next start`): the audit seeds its admin session via `/api/dev-test/seed-admin`, which 404s outside development, and **`NODE_ENV` is inlined at build time** — so a `next start` run silently audits the SIGN-IN page and passes. |

---

## 10 · Permissions

Reuses `src/lib/server/roles.ts` tiers — no new tier.

| Action | Tier |
|---|---|
| View the Up & Down console | `ADMIN_CONSOLE_ROLES` |
| Asset registry + rate profile + thresholds + reading method | `CONFIG_ROLES` (never MODERATOR — it changes economics) |
| Start / pause / stop a chain | `MARKET_OPS_ROLES` |
| Re-observe a boundary | `MARKET_OPS_ROLES` |
| **Void & refund a round** | **`trading`**, via `CONTROL_DOMAIN.voidUpDownRound` — see below |
| Force-settle | `MONEY_ROLES` |

⚠️ **The round void is `trading` — and it shipped once as `compliance`, which production
proved unusable within the hour.** Worth recording, because the mistake is a tempting one:
voiding a round refunds real money, so by analogy with `/admin/markets`' emergency void
(settled as `compliance` by finding E-20) it looked like a compliance decision.

The analogy is wrong. `emergencyVoidMarket` cancels a **healthy live market** — a
discretionary act that destroys a working product. This releases a round the engine has
**already failed to finish**, and its outcome is fixed: every player gets their own stake
back. A recovery lever is not a money-movement decision, the officer who watches rounds is
the trading officer, and this table already said `MARKET_OPS_ROLES` before any of it.

And the practical proof: `/admin/updown/rounds` is a `trading` route while `DEFAULT_GRANTS`
makes trading and compliance **disjoint**, so as `compliance` the control was reachable by
the **9 ADMIN accounts and nobody else** — E-23 restated rather than fixed. The compliance
officer opening the page got *"Your role cannot view this page."*

Its domain lives in `src/lib/server/control-gates.ts`, **once**, so the page asks exactly
the question the action will ask (E-18). The locked state still matters: the Owner can
create a role at `/admin/roles` with `trading` VIEW but no ACT, and that role must see
`🔒 VOID & REFUND · TRADING ONLY`, not a button that bounces.

## 11 · One control, one place

| Control | Its only home |
|---|---|
| Assets, durations, stake bounds, rate profile, thresholds, reading method | `/admin/updown/*` — **never** mirrored into `/admin/config` |
| The AI pause switch | The **AI-toolkit top-bar dropdown** (the one home for every AI switch), config key `ai.controls.pollGenEnabled`. `/admin/updown` renders it read-only via `controlled-elsewhere.tsx`. It now gates **both** generators — long-form polls and Up & Down proposals — and is enforced **inside** `generateAIPoll`, not only in the actions that call it |
| Price source domains | The existing `/admin/sources` trusted-source registry — **no second allowlist** |
| The host-match rule | `hostMatchesDomain` in `updown-feed.ts` — **one** definition, shared by the AI reader's gate 2, the feed's endpoint check, the round-level source check and the sentinel chip |
| Resolution authorization | `resolution-policy.ts` (untouched by this feature) |

> ⛔ A source link, once a round has captured it, has **no** home that can change it. The
> asset row is the only place a source is edited, and `updateAsset` refuses the edit while
> any round on that asset is unresolved — naming the count, the money at risk, and the way
> out (pause the chains, let in-flight rounds settle, then edit; the next round captures the
> new link).
