# Load & Scale Suite — Day 1 Findings (first-ever Postgres run)

---

## ⚡ UPDATE 2026-07-19 — Findings A and E are FIXED and re-measured

Deploys 1 (collapse the nested transactions) and 2 (admission control) landed. The
capacity numbers below are superseded; the money-safety verdicts still stand.

| | before | after | how |
|---|---|---|---|
| **Connections per bet** | 3 (wallet tx + market tx + money tx) | **1** | `withLock` carries its tx via `AsyncLocalStorage`; a nested lock takes its advisory lock on the SAME tx; `withMoneyTx` joins it |
| **DB round-trips per bet** | 39 (10 txn-control) | **34 (6 txn-control)** | 2 BEGIN/COMMIT pairs eliminated — `spike-e-census` |
| **Max concurrent bets, pool 20** | ~9 (pool÷2) | **200+, all succeeding** | admission control queues instead of failing |
| **Behaviour past the ceiling** | raw `P2024` in the player's face, 100% failure at pool 5 / C 20 | **queue, then succeed**; only a hopeless queue is refused, as a retryable `BUSY` | `admission.ts` |
| **p95 at C=200 on one market** | n/a (failed) | **1,507 ms** (budget 15,000 ms) | `spike-f-saturation` |

**Measured on real Postgres, `spike-f-saturation`, pool 20, one market:**

```
c=  1  ok=  1 busy=0 raw=0  p50=  83ms p95=   83ms  drift=0 orphans=0 leaked=0
c=  5  ok=  5 busy=0 raw=0  p50=  75ms p95=  104ms  drift=0 orphans=0 leaked=0
c= 10  ok= 10 busy=0 raw=0  p50= 143ms p95=  205ms  drift=0 orphans=0 leaked=0
c= 25  ok= 25 busy=0 raw=0  p50= 178ms p95=  294ms  drift=0 orphans=0 leaked=0
c= 50  ok= 50 busy=0 raw=0  p50= 246ms p95=  429ms  drift=0 orphans=0 leaked=0
c=100  ok=100 busy=0 raw=0  p50= 749ms p95= 1144ms  drift=0 orphans=0 leaked=0
c=200  ok=200 busy=0 raw=0  p50= 807ms p95= 1507ms  drift=0 orphans=0 leaked=0
```

Zero raw DB errors, zero TZS leaked, `pool == Σ stakes` at every level, and no bet
was shed or timed out — the queue absorbed the whole burst.

### Two defects real Postgres found during this work (both fixed)

1. **Self-deadlock on the wallet row.** Once the bet is one transaction, any code
   inside the lock that writes the SAME rows on a DIFFERENT pool connection blocks
   on our own uncommitted row and hangs to the 30 s tx timeout (`P2028`).
   `recordWageringCore` / `activateNextQueued` did exactly that; both now take the
   caller's `tx`. Reads are deliberately left un-threaded — MVCC means a SELECT
   never blocks on an uncommitted writer.
2. **Aborts must escape the lock.** `BetAbort` used to be caught INSIDE the market
   lock. With the transactions joined, catching it there would COMMIT the partial
   debit it meant to discard. It now propagates out of `withLock` (rolling the whole
   bet back) and is mapped to the same player-facing rejection outside.

⚠️ Still open from Day 1: **Finding B** (read-path OOM) and **Finding C** (settlement
cliff / void hole) are NOT addressed by this work.

---

> **Status: correctness verdict, not yet a capacity table.** These are the Day-1
> spike results. The full capacity calibration (Railway staging) is future work.
> Every number below is from **real PostgreSQL 16** (local, disposable, marker-gated) —
> the first time any 50pick code has run its advisory-lock + connection-pool path.
> Commits `5662825`, `056e7ac` on `main`.

---

## 🔴 CORRECTNESS VERDICT — DO NOT LAUNCH FOR REAL MONEY

Three money-safety defects are **confirmed reachable on the current code**, against a
real database, at loads far below any target. None was reachable in any prior test
because every prior test measured a JavaScript `Map`, not Postgres.

| # | Defect | Reachable at | Consequence |
|---|---|---|---|
| **A** | **Wallet debited, no position, no refund, no trace** | **3 concurrent bets** (Railway pool=5) | Player money destroyed silently |
| **C-cliff** | **A market with > ~700 winners can never pay out** | ~666 winners @ 2 ms RTT | Settlement times out forever |
| **C-void** | **Emergency-void of a partially-settled market mints money** | compound (needs the cliff first) | 73,000 TZS minted on a 300k pool, measured |

**The money *math* is correct** — `money-invariants` passes **72/72** on a clean Postgres DB,
all 11 laws. Every defect is in the **concurrency / pool / settlement structure**, not the
arithmetic. This is fixable without touching how money is calculated — but the fixes touch
the hottest lock path in the platform, which is why they are the owner's call, not a
unilateral change.

---

## Finding A — the pool deadlock, and the money it destroys 🔴🔴

### What the code does
`buyPosition` (`market-service.ts:337`) opens `withLock('wallet:<id>')`, which starts a
`$transaction` and **pins one pool connection** for the whole callback. Inside it:
- debits the wallet at `:364` — on a **different, autocommitting** pool connection (`locks.ts:58-60`);
- then **nests** `withLock('market:<id>')` at `:412`, needing a **second** connection from the **same pool**.

Every in-flight bet therefore holds one connection and needs a second. With a pool of *P*,
only *P/2* bets can proceed; the rest wait, then time out (`P2024`).

### Measured (local PG, `connection_limit` swept)

```
pool   survives   loses money from
   5     2 bets      C = 3
  10     4 bets      C = 5
  20     9 bets      C = 10
  40    19 bets      C = 20
```

**Max safe concurrency = pool ÷ 2, exactly, every time.** At Railway's 2-vCPU default of
**5**, the platform serves **two** concurrent bets. At C=4 it is **100 % failure**. (Predicted
5–9; reality is 3 — worse, because the nesting needs *two* connections, not one.)

**A bigger pool does not fix it.** It slides the cliff, and drags the money-loss band with
it (C = pool/2 always). Serving 1,000 concurrent bets would need `connection_limit ≈ 2000`,
which no single Postgres can provide. **This must be restructured, not tuned.**

### The money loss — two independent mechanisms, both live at C=3

**M1 — the nested-lock throw.** When the nested `market:` lock can't get a connection it throws
`P2024`. The debit at `:364` has **already committed** (autocommit). The exception unwinds
**past** the `closedInFlight` refund at `:432` — which only runs on a clean `return`, never on a
`throw`. → debited, no position, no refund.

**M2 — the swallowed error (worse, undetectable).** `prisma-dal.ts:688` commits the debit via
`updateMany`, then `:690` `findUnique` needs another connection and throws; the **bare `catch`
at `:692` swallows it and returns `null`**. `buyPosition` maps `null` → **"Not enough balance."**
We take the money and **blame the player**. It surfaces as an ordinary business error, invisible
in every log and dashboard.

### The vanished money leaves NO trace
```
wallet debited : 1000 TZS  (50000 → 49000)
Position: 0   Transaction: 0   LedgerEntry: 0   AuditLog: 0
```
Breaks conservation (law 2) and double-entry (law 6) simultaneously and **invisibly**. A
regulator reconciling balances against the ledger finds an unexplained shortfall; a player
disputing "my money vanished" is told by our own system that no transaction occurred — and
they are right.

**Note:** local numbers are the *optimistic* case (`fsync=off`, ~0.1 ms loopback RTT). Railway
holds connections longer, so **the real cliff is lower than 3.**

**Reproduce:** `node scripts/load/reset-db.mjs && npx tsx scripts/load/spike-a-proof.mts`

---

## Finding B — the read-path OOM 🔴

`traderSeedsByMarket()` (`market-service.ts:552`) calls `positionStore.values()` =
`position.findMany()` with **no `where`, no `take`, no `select`** (`market-dal.ts:265`). It
hydrates the **entire Position table** — to render at most **three trader avatars per card**.
It runs on `/` (`page.tsx:20`), `/markets` (`:267`), `/live` (`:35`) — all `force-dynamic`,
**no caching anywhere.**

### Measured
| Position rows | 1 page view | heap | 3 concurrent views |
|---|---|---|---|
| 10k | 0.2 s | 13 MB | 0.3 s / 21 MB |
| 50k | 1.0 s | 80 MB | 2.0 s / 143 MB |
| 250k | 4.8 s | 392 MB | 7.7 s / 426 MB |
| **500k** | **9.4 s** | **617 MB** | **18.1 s / 1,341 MB** |

Linear: **~1.3 KB heap and ~19 µs per Position row, per in-flight request.** At 500k rows the
homepage takes **9.4 s with zero other traffic**, and 3 simultaneous anonymous visitors
allocate **1.3 GB** — an OOM kill on a 512 MB–1 GB container, not a slowdown.

**This needs zero concurrency.** It is a function of *total positions ever placed* (never
archived), so it is a **calendar problem**: the platform gets slower every day until a quiet
Tuesday's homepage OOMs the container.

| container | 1 view OOMs at | 10 views OOM at |
|---|---|---|
| 512 MB | ~917k rows | ~92k rows |
| 1 GB | ~1.8M rows | ~183k rows |

**Reproduce:** `node scripts/load/reset-db.mjs && npx tsx --expose-gc scripts/load/spike-b-read-oom.mts`

---

## Finding C — settlement: the cliff, the resume, the void hole

### C1 — the cliff 🔴
`settleMarket` loops **every winner sequentially inside** the market lock (`:1528`), inside a
`$transaction` capped at **30 s** (`locks.ts:75`). Measured: **22.5 sequential DB round-trips
per winner.**

| RTT | settlement dies above |
|---|---|
| 0.2 ms (local) | ~6,663 winners |
| **1 ms (same-host Railway)** | **~1,332 winners** |
| **2 ms (same-region)** | **~666 winners** |
| 5 ms (cross-AZ) | ~266 winners |

> **A market with more than ~700 winners can never pay out on Railway.** It times out, retries,
> times out again — frozen for bets and cash-outs the entire time.

### C2 — the resume ✅ (good news)
After a settle, a forced retry is **refused by the already-settled guard**; the exactly-once
payout law (law 4) **passes**. A retry does **not** double-pay. The autocommit behaviour that
destroys money in `buyPosition` accidentally *saves* us here, because the loop re-selects only
`status = 'OPEN'` positions (`:1405`).

### C3 — the void hole 🔴 (compound — conditional on C1)
`persistResolution()` (which sets `settledAt`) runs **after** the payout loop (`:1616`). So a
timed-out partial settle leaves **winners paid + committed** but `settledAt` **null**.
`emergencyVoidMarket` guards **only** on `settledAt` (`:1951`) — so an officer upholding an
objection (or trying to un-stick the frozen market) refunds **full stakes** to the still-OPEN
positions, out of a pool that **already paid its winners**.

**Measured mint: 73,000 TZS** on a 300k pool (200 winners paid 273k, then 100 stakes refunded
100k → 373k out of a 300k pool). Once *any* winner is paid, the pool is no longer whole, so a
full-stake refund necessarily over-distributes.

This is **not independently reachable** — it needs C1's partial-settle state. But it means the
cliff is not merely a liveness bug: it manufactures a state where a well-meaning officer action
**mints money**.

**Reproduce:** `node scripts/load/reset-db.mjs && npx tsx scripts/load/spike-c-settlement-cliff.mts`

---

## Finding D — playing density: the single-market ceiling ⚠️ (measured, not a defect)

The owner's headline question: *thousands of players on ONE market.* Measured with a
generous pool (so Finding A's deadlock doesn't mask the lock behaviour):

| | throughput | note |
|---|---|---|
| **One market** | **~180 bets/s** | rising concurrency scaled it 54 → 181 bets/s |
| **25 markets** | **~204 bets/s** | only **1.1×** more |

**The market lock is *not* the bottleneck** (this *corrects* the plan's S03 hypothesis).
Concurrency scaled a single market 3.3×, so bets are **not** fully serialized on the market
advisory lock. Spreading across 25 markets barely helped, so the ceiling is **per-bet path
cost**, not lock contention.

**Positive:** conservation held **exactly** under contention — pool == Σ stakes across 2,400
positions, **zero drift**. The market lock correctly prevents lost updates. The happy path is
money-safe.

> Targets: T2 needs 200 bets/s and T3 needs **1,000 bets/s on one market**. Local ceiling is
> ~180/s and Railway's higher RTT makes it worse — see Finding E for why.

## Finding E — the per-bet cost: 31 DB round-trips ⚠️ (measured)

One `buyPosition` = **31 sequential DB round-trips**:
- **52%** money path (wallet / position / pool / txn / validation reads)
- **35%** transaction control — **8 BEGIN/COMMIT + 2 advisory locks**, the overhead of the
  *nested double-transaction*
- **13%** fire-and-forget background (audit / ledger / notification)

This **corrects** the plan's guess that ~40% is background ("you need a job queue"). The audit
chain is already batched (a ring buffer), so background is small. The real ceiling driver is the
**31 sequential round-trips**: at Railway's 1–2 ms RTT that is **31–62 ms of pure network per
bet** before any concurrency — which is why Finding D's ~180/s will be much lower on Railway.
The actionable lever is **reducing round-trips per bet** (and collapsing the two nested
transactions into one), not a job queue.

## Finding S10 — cross-instance double-spend safety ✅ (PASS — the critical positive)

*"Advisory locks are DB-global, so two Railway instances cannot double-spend one wallet"* — the
single most important safety property for horizontal scale, and it had **never** been tested
(every prior test ran one in-process `Map`, where the fallback mutex is per-process and would
silently fail across instances).

**Test:** two separate **OS processes** (each its own pool = a Railway container) fired 16 bets
at one wallet funded for exactly 5.
**Result:** exactly **5 succeeded, balance exactly 0, pool exactly 5,000, no negative, no
double-spend.** The Postgres advisory lock **is genuinely DB-global.** Horizontal scaling is
money-safe *for the wallet lock*. (The things that *do* break on the 2nd container — audit-chain
fork, per-process rate limits, in-process SSE — are non-money and remain future work: S10 items
1–3.)

**Reproduce:** `node scripts/load/reset-db.mjs && npx tsx scripts/load/s10-cross-instance.mts`

---

## What Day 1 also established

**The existing money suites could not run on Postgres at all** — they encode three assumptions
only a `Map` satisfies:
1. **Sync returns** — `wallet-atomic` never `await`ed a DAL that is sync in memory, async on Prisma.
2. **Nullable-anything** — 11 fixtures forced `null` into the `NOT NULL` `titleSw` column via
   `null as unknown as string`.
3. **No foreign keys** — `wallet-atomic` created a wallet for a user that never existed.

All three are fixed (test files only; `tsc` clean, `test:all` still green with `test:responsive`
the sole expected red). This *is* the thesis of the suite: **a green suite against a permissive
`Map` tells you nothing about production.**

---

## Capacity implications (preliminary — full table needs Railway calibration)

| Target | Verdict | Binding constraint | Needs |
|---|---|---|---|
| **T1** (500 / 20 bets·s⁻¹ / 50k pos) | **FAILS today** | Finding A at 3 concurrent bets | Restructure the nested wallet→market lock |
| **T2** (5k / 200 / 500k) | **FAILS** | A + B (500k rows OOMs) + C-cliff | + bounded `traderSeeds` + chunked settlement |
| **T3** (20k / 1,000 / 2M) | **FAILS** | all of the above + per-market lock ceiling | + atomic pool update, Redis, read replica, outbox |

**The one-line headline:** *the platform cannot currently sustain 3 concurrent bets without
risking silent player-money loss, cannot pay out a popular market, and gets slower every day it
runs.* All three are structural and fixable; none is in the money arithmetic.

---

## The load-test harness (new, committed)
- `scripts/load/reset-db.mjs` — 3-gate disposable-DB reset (hostname denylist + localhost-only
  + `SystemConfig['__LOAD_TEST_TARGET__']` marker row). Refuses any non-disposable DB.
- `scripts/load/spike-a-pool-deadlock.mts` / `spike-a-sweep.mts` / `spike-a-proof.mts` — Finding A
- `scripts/load/spike-b-read-oom.mts` — Finding B
- `scripts/load/spike-c-settlement-cliff.mts` — Finding C
- `scripts/load/spike-d-density.mts` — Finding D (single-market ceiling)
- `scripts/load/spike-e-census.mts` — Finding E (per-bet round-trip census)
- `scripts/load/s10-cross-instance.mts` + `s10-worker.mts` — Finding S10 (cross-instance safety)

**Instrumentation hook:** each spike installs its own pool-limited `PrismaClient` on
`globalThis.__50PICK_PRISMA` **before** any dynamic service import, and asserts the singleton
identity — so the services run against a pool *we* size, with a full query census. Zero new
dependencies. Local Postgres runs on **port 5433** (never collides with a default install),
`fsync=off` (disposable → measure our code, not the SSD).
