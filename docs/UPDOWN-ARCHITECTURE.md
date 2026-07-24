# Up & Down — architecture

> **This document owns HOW Up & Down is built.** Data model, engines, money path,
> scale. If code and this document disagree, the code wins and this document is a
> defect — fix it in the same commit.

## Document ownership (read this before adding anything anywhere)

One fact, one home. Nothing below is restated in another doc; each links instead.

| Document | Owns | Does NOT contain |
|---|---|---|
| **`UPDOWN-ARCHITECTURE.md`** (this) | Data model · engines · money path · scale · file map | Status, dates, business rationale, UI redlines |
| [`UPDOWN-SPEC.md`](UPDOWN-SPEC.md) | What the product IS — rules, workflows, states, copy rules | Table shapes, function names |
| [`UPDOWN-PROGRESS.md`](UPDOWN-PROGRESS.md) | Status only — phase board, checklists, decision log, risk register, open questions, session log | Architecture or product rules (it links) |
| [`UPDOWN-DESIGN-PROMPTS.md`](UPDOWN-DESIGN-PROMPTS.md) | The Claude Design brief + the design review record | Implementation detail |
| [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) | Owner decisions that touch a **compliance control** | Anything not compliance-bearing |
| `Up and Down/` (repo root) | The management team's original requirements, verbatim | — |

**Design redlines and prop contracts live with the design handoff**
(`Up Down Design System/handoff/D1-*.md`, `D2-*.md`), not here.

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

1. **Cost.** One AI price check per asset per boundary serves up to six round edges.
   2 assets × 288 boundaries = **576 checks/day**, no matter how many durations run —
   instead of one per round.
2. **Correctness.** An observation is written once and read many times, so round N's
   close **is** round N+1's open, to the digit. The resolution AI can never disagree
   with itself between adjacent rounds because it is never asked twice.

`@@unique([assetId, boundaryAt])` enforces both, at the database.

> ⛔ **Never update a CONFIRMED observation's price.** Re-observing a settled boundary
> is a bug, not a feature. The unique index makes it a database error instead of a
> silent money divergence.

### Confirmation gates — all must pass

1. The cited URL's host matches the asset's `priceSourceUrl` host **and** is an
   enabled `TrustedSource` in the right category (one allowlist, not two).
2. `|sourceQuotedAt − boundaryAt| ≤ maxStalenessSeconds` (admin, default 90 s).
3. `confidence ≥ threshold` (admin, default 85) and evidence ≥ 10 characters.
4. The price parses to a finite positive number at the asset's `decimals`.

Failure → retry with backoff (15 s / 45 s / 120 s, max 4 attempts) → `FAILED` → every
round depending on it **VOIDs with a full refund**. The card shows *Confirming price*
throughout and **never a number we do not have** (rule A-5).

### The honesty boundary

An LLM web search cannot report the price at an exact second. So the observation
stores `sourceQuotedAt` — **the timestamp the source itself published** — and every
surface shows *that*, never the boundary. Precision is bounded by the source, and we
say so rather than implying tick accuracy we do not have.

---

## 4 · Outcome rule

```
close > open + minMove  → UP    (YES)
close < open − minMove  → DOWN  (NO)
otherwise               → VOID  (full refund, zero fee)
```

`minMove = minMoveTicks × 10^-decimals`, per asset. It exists so a real-money bet is
never decided by noise below the source's own resolution. VOID also covers a `FAILED`
observation and an operator void; `voidReason` distinguishes them for the audit trail.

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

**One boundary fire, under `withLock("updown-chain:{id}")`:**

1. Ensure the observation for this boundary exists (create `PENDING`, or reuse).
2. Run the oracle if `PENDING` — **outside the lock**; it is slow and must not pin a
   pooled connection.
3. **Close** round N: stamp the outcome and `objectionsClosedAt = now`, then call
   `settleMarket()` — the normal gate, **not** `force`, so the standing-objection
   freeze still applies.
4. **Open** round N+1 against the same observation as its open price.
5. Re-arm for the next boundary.

**Steps 3 and 4 are independent.** A stalled resolution never stalls the chain: round
N+1 opens for betting while round N is still confirming. That is what makes "don't
rush the AI" compatible with a continuous product.

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

The opted-in call sites are listed in [`UPDOWN-PROGRESS.md`](UPDOWN-PROGRESS.md) §5 and
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
| `UpDownRound` | One round — its market, boundaries, bounding observations, prices, outcome | `marketId @unique` + FK cascade; `@@unique([chainId, roundNumber])` |
| `UpDownObservation` | An immutable price reading for one asset at one boundary | **`@@unique([assetId, boundaryAt])`** |
| `PredictionMarket.productLine` | `"MARKET"` \| `"UPDOWN"` — the discriminator | `@@index([productLine, status, resolutionAt])` |

`productLine` is **immutable after creation** — deliberately absent from the Prisma
`update` block, so a stale in-memory copy writing back can never reclassify a settled
round and move its money between product lines in every later report.

Migrations: `20260724180000_market_product_line`, `20260724190000_updown_tables`. Both
purely additive; both verified to apply cleanly on the local PG16 with zero residual
drift.

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
| `src/lib/server/updown-oracle.ts` | The price observation — six refusal gates | ✅ done |
| `src/lib/server/updown-service.ts` | Round lifecycle; the ONLY UP/DOWN ↔ YES/NO mapping | ✅ done |
| `src/lib/server/updown-scheduler.ts` | Per-chain timers, hydrate, own fire gate, reconcile | ✅ done |
| `src/instrumentation.ts` · `lifecycle.ts` | Boot hydrate + self-healing reconcile wired in | ✅ done |
| `src/app/admin/updown/**` | Console: assets · chains · oracle health · thresholds | ✅ done |
| `src/app/updown/**` | Player board + round detail | ⬜ Phase 4 |
| `src/components/updown/**` | `UpDownCard`, `PriceTape`, `RoundStrip`, `SettlementProof` | ⬜ Phase 4 |
| `src/app/admin/updown/rounds` | Round explorer + proof drawer | ⬜ Phase 5 |

### Tests guarding this subsystem

| Script | Guards |
|---|---|
| `test:product-line` (30) | Money reads see both products; player boards see long-form only. **Verified to fail when a call site regresses.** |
| `test:updown-config` (62) | Grid derived-not-accumulated · source gate · winner floor · **observations write-once** |
| `test:updown-engine` (43) | UP=YES through settlement · voids refund in full · shared observations · exactly-once settlement · **money conservation, drift 0** |
| `test:admin-nav` (16) | ONE route resolver; every nav href round-trips |
| `updown-admin-shots` · `updown-admin-e2e-shots` | 360/768/1280/1920, empty AND populated, driven through the real UI |

---

## 10 · Permissions

Reuses `src/lib/server/roles.ts` tiers — no new tier.

| Action | Tier |
|---|---|
| View the Up & Down console | `ADMIN_CONSOLE_ROLES` |
| Asset registry + rate profile + thresholds | `CONFIG_ROLES` (never MODERATOR — it changes economics) |
| Start / pause / stop a chain | `MARKET_OPS_ROLES` |
| Re-observe · void a round | `MARKET_OPS_ROLES` |
| Force-settle | `MONEY_ROLES` |

## 11 · One control, one place

| Control | Its only home |
|---|---|
| Assets, durations, stake bounds, rate profile, thresholds | `/admin/updown/*` — **never** mirrored into `/admin/config` |
| The oracle pause switch | The **AI-toolkit top-bar dropdown** (the one home for every AI switch). `/admin/updown` renders it read-only via `controlled-elsewhere.tsx` |
| Price source domains | The existing `/admin/sources` trusted-source registry — **no second allowlist** |
| Resolution authorization | `resolution-policy.ts` (untouched by this feature) |
