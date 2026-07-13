# Load & Scale Suite — Day 1 Findings (first-ever Postgres run)

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
- `scripts/load/spike-a-pool-deadlock.mts` / `spike-a-sweep.mts` / `spike-a-proof.mts`
- `scripts/load/spike-b-read-oom.mts`
- `scripts/load/spike-c-settlement-cliff.mts`

**Instrumentation hook:** each spike installs its own pool-limited `PrismaClient` on
`globalThis.__50PICK_PRISMA` **before** any dynamic service import, and asserts the singleton
identity — so the services run against a pool *we* size, with a full query census. Zero new
dependencies. Local Postgres runs on **port 5433** (never collides with a default install),
`fsync=off` (disposable → measure our code, not the SSD).
