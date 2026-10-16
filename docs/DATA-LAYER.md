# Data Layer Architecture

> How kipindi stores and retrieves data. Read this before touching any
> service file, adding a new entity, or debugging a data issue.

## Overview

All data flows through a **DAL (Data Access Layer)** abstraction. Each entity
has an async interface with two implementations:

- **Memory** -- in-process `Map<string, T>` backed by `globalThis` globals
- **Prisma** -- PostgreSQL via Prisma ORM

A single environment variable controls which backend is active:

```
USE_PRISMA_DAL=true   # Prisma (production)
USE_PRISMA_DAL=false  # Memory (local dev, default)
```

Both backends are always compiled; the switch happens at import time.

## Architecture Diagram

```
  Page / Action / API route
          |
      await db.user.findById(id)
          |
    +-----------+
    | store.ts  |  <-- exports `db` (feature-flagged switch)
    +-----------+
     /          \
  memoryDb    prismaDb (prisma-dal.ts)
     |            |
  globalThis   PostgreSQL
  __50PICK_*     via @prisma/client
```

For entities outside the `db.*` namespace (markets, positions, AI polls,
candidates, comments, sources, TOTP, market config, market
history), each service file has its own inline DAL with the same pattern:

```
  market-service.ts
        |
    await marketStore.get(id)
        |
  market-dal.ts
   /          \
memoryMarkets  prismaMarkets
```

## Entity Map

| Entity | DAL location | Prisma model | Notes |
|--------|-------------|--------------|-------|
| User | `store.ts` / `prisma-dal.ts` | User | ⭐ Attribution provenance `recruitedProgramme` · `recruitedAt` · `recruitedByCode` beside `recruitedBy`, written in the SAME update at bind (`bindRecruit`), never rewritten. NULL programme = PLAYER, never AGENT. `recruitedAt` is in `update`'s date list — forgetting it throws on Postgres only |
| Wallet | `store.ts` / `prisma-dal.ts` | Wallet | |
| Transaction | `store.ts` / `prisma-dal.ts` | Transaction | |
| KYC | `store.ts` / `prisma-dal.ts` | KycSubmission | |
| OTP | `store.ts` / `prisma-dal.ts` | Otp | `hash\|salt` packing |
| Notification | `store.ts` / `prisma-dal.ts` | Notification | |
| ResponsibleGambling | `store.ts` / `prisma-dal.ts` | ResponsibleGambling | |
| SourceOfFunds | `store.ts` / `prisma-dal.ts` | SourceOfFunds | |
| Affiliate | `store.ts` / `prisma-dal.ts` | AffiliateAgent | `recruitCount` <-> `totalRecruits` · `totalEarnedTzs` <-> `totalCommission`. ⭐ `approvedAt` ALONE identifies a vetted agent; `commissionPct` is NULLABLE, a PERCENT, and null on every auto-minted row. ⛔ Write map `AFFILIATE_COLUMN` is typed `Record<keyof StoredAffiliateAccount,…>` — a new field is a compile error, not a silent drop (`test:dal-parity`). `tier` left the schema 2026-09-07 (expand step; column still in Postgres) |
| ReferralReward | `store.ts` / `prisma-dal.ts` | ReferralReward | `programme` (copied from the attribution's stamp) · `rateApplied` (percent snapshot) · `marketId` · `sourceRef` (UNIQUE idempotency key) · `reversedAt` · status `REVERSED` |
| AgentApplication | `store.ts` / `prisma-dal.ts` | AgentApplication | One live row per user — partial unique index `AgentApplication_userId_active_key` (raw SQL, migration `20260907120200`); `findActiveByUser` mirrors its predicate. `feeReference` UNIQUE. Write map `AGENT_APPLICATION_COLUMN` typed exhaustive |
| AgentApplicationDocument | `store.ts` / `prisma-dal.ts` | AgentApplicationDocument | One file per `(applicationId, docType)` — re-upload REPLACES. `storageKey` through the KYC storage seam, hint `agentapp/<applicationId>/<docType>` (⛔ never a name or phone). `thirdParty` = referee ID scans (own retention clock) |
| AgentInvitation | `store.ts` / `prisma-dal.ts` | AgentInvitation | `tokenHash` UNIQUE (the token is never stored readable); bound to `phoneE164`; `applicationId` set on acceptance |
| Proposal | `store.ts` / `prisma-dal.ts` | Proposal | |
| ProposalVote | `store.ts` / `prisma-dal.ts` | ProposalVote | |
| Market | `market-dal.ts` | PredictionMarket | |
| Position | `market-dal.ts` | Position | |
| AI Poll | `ai-poll-generation.ts` | AIPoll | inline DAL |
| Candidate | `market-candidate.ts` | MarketCandidate | inline DAL |
| Comment | `comments-store.ts` | Comment | reports: `Set` <-> JSON `[]` |
| TrustedSource | `source-registry.ts` | TrustedSource | inline DAL |
| TOTP Secret | `totp.ts` | TotpSecret | inline DAL |
| Site visit counts | `site-visits.ts` (server) | SiteVisitPage · SiteVisitSource | inline DAL (memory + Prisma, `ai-usage-dal.ts` pattern). Daily AGGREGATES only — ⛔ never add a user, IP, session or hash column: the counter runs without consent because it identifies no one (`test:privacy-notice` §4g pins the fields). Upsert-increment on `(day, path)` / `(day, referrer, source, medium, campaign)`; a day admits `SITE_VISIT_MAX_PATHS` distinct paths, then `(other)` |

| Market History | `market-history.ts` | **MarketSnapshot** | ⚠️ **NOT memory-only** — corrected 2026-08-20. It is durable, and FIFO-pruned to the newest N per market with a 1-in-50 write sampling. 13,797 rows on production, 97.6% of them on Up & Down markets. |
| Market Config | `market-config.ts` | **SystemConfig** (via `config-store.ts`) | ⚠️ **NOT memory-only** — corrected 2026-08-20. Durable, write-through, hydrated on boot. 26 keys on production. |
| Retention purge | `retention.ts` | — | Once daily from the lifecycle pass: `Notification` > 180 d, `Otp` > 30 d, AI-poll payload columns > 30 d, agent documents on their clocks, lapsed marketing consent, stale `ActiveSession` rows, and site visit counts > 400 d. `docs/DATA-RETENTION.md` is the authority. |

> 🔴 **The two rows above said "memory-only" until 2026-08-20, and both were wrong** (audit
> F-11d). This is the file a new session reads to learn how data works here, so a stale row is
> not a cosmetic problem: it invites someone to "add persistence" to something already
> persisted, or to assume a value is lost on restart when it is not. If you change where an
> entity lives, this table changes in the same commit.

## How to Add a New Entity

### 1. Schema

Add a model to `prisma/schema.prisma`:

```prisma
model MyEntity {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

⛔ **Do NOT run `prisma migrate dev`.** It is interactive (fails headless) and its shadow-DB
diff trips on this database's pre-existing drift. Migrations follow ONE protocol —
[`.claude/skills/50pick-audit/SKILL.md`](../.claude/skills/50pick-audit/SKILL.md) §4, five steps —
and it is not restated here. Read it before you write the SQL.

🔴 **Step 4 is `npm run verify:backup-schema`, and it is not optional.** `db:backup` builds its
schema DDL from the **live database**, so a migration is the one kind of change that can break
disaster recovery without touching a line of the backup toolchain. On 2026-09-19 one did: the
nightly failed three consecutive nights and the platform ran 80 hours with no verified backup.
See `docs/BACKUP-RUNBOOK.md` → "THE THREE NIGHTS".

### 2. Types

Define the in-memory type (if using `store.ts`):

```ts
// store.ts
export type StoredMyEntity = {
  id: string;
  name: string;
  createdAt: string;  // ISO-8601
  updatedAt: string;
};
```

### 3. DAL

**Option A -- Add to `store.ts` + `prisma-dal.ts`** (for core entities):

```ts
// store.ts memoryDb
myEntity: {
  findById: (id: string) => store.myEntities.get(id) ?? null,
  create: (e: StoredMyEntity) => { store.myEntities.set(e.id, e); tap(); return e; },
  // ...
}

// prisma-dal.ts
myEntity: {
  findById: async (id: string) => {
    const row = await pc().myEntity.findUnique({ where: { id } });
    return row ? toStoredMyEntity(row) : null;  // DateTime -> ISO, Decimal -> number
  },
  // ...
}
```

**Option B -- Inline DAL** (for standalone globals):

```ts
// my-entity-service.ts
interface MyEntityStore {
  get(id: string): Promise<StoredMyEntity | null>;
  set(e: StoredMyEntity): Promise<void>;
  values(): Promise<StoredMyEntity[]>;
}

const memoryStore: MyEntityStore = { /* Map-backed */ };
const prismaStore: MyEntityStore = { /* Prisma-backed */ };

const usePrisma = process.env.USE_PRISMA_DAL === "true" && hasDatabase();
const store: MyEntityStore = usePrisma ? prismaStore : memoryStore;
```

### 4. Service functions

All service functions that access the DAL must be `async`:

```ts
export async function getMyEntity(id: string) {
  return store.get(id);
}
```

### 5. Callers -- add `await`

Every caller of your async service function needs `await`. If the caller
wasn't async before, make it async and cascade up.

**In JSX `.map()` callbacks** (can't be async), pre-fetch into a Map:

```tsx
// Pre-compute before render
const entityMap = new Map();
for (const id of ids) entityMap.set(id, await getMyEntity(id));

// In JSX
{items.map(item => {
  const e = entityMap.get(item.entityId);
  return <Card key={item.id} name={e?.name} />;
})}
```

### 6. Type conversions

When writing the Prisma implementation, handle these conversions:

| Prisma type | In-memory type | Read (Prisma -> memory) | Write (memory -> Prisma) |
|-------------|---------------|------------------------|------------------------|
| `DateTime` | `string` (ISO) | `d.toISOString()` | `new Date(s)` |
| `Decimal` | `number` | `Number(d)` | pass as-is |
| `Json` | object/array | pass as-is (cast) | pass as-is |
| `Boolean` | `boolean` | pass as-is | pass as-is |
| `Enum` | string literal | cast `as MyType` | cast |

## Locks and transactions

`withLock(key, fn)` (`src/lib/server/locks.ts`) is how the platform serialises a balance read-modify-write and every
other race it cares about — `wallet:<userId>`, `market:<id>`, `register:<phone>`, `login:<userId>` and the rest.

| | With a database (`DATABASE_URL` set — `hasDatabase()`) | Without one |
|---|---|---|
| Mechanism | `pg_advisory_xact_lock(bigint)` — the SINGLE-argument form, run with `$executeRaw` (it returns `void`, which `$queryRaw` cannot read) as the first statement of a `prisma.$transaction`, so it is held until that transaction ends and is safe across containers | an in-memory Promise-chain mutex — one process only |
| Key | `hashKey64(key)`: the first 8 bytes of SHA-256 over the WHOLE key string, so the namespace (`wallet:`, `market:`) is inside the hash, not a second argument | the key string |
| Bounds | the transaction's `timeout: 30000` (30 s) and `maxWait: 10000` (10 s, the wait for a pool connection) | none |
| Re-entry | the same key nested inside itself is free; a nested DIFFERENT key takes its lock on the outer transaction and holds it until that ends | the same, on purpose (dev/prod parity) |

- **Lock order is wallet before market, never the reverse** — which is what makes a longer-held nested lock safe. A
  house bet adds `house:control` innermost (`FLOWS.md` §9).
- `fn` receives the lock's transaction (`tx`; null on the memory store), and `currentLockTx()` returns it anywhere below.
- `afterCommit(tx, fn)` runs `fn` once the outermost lock has COMMITTED (and drops it on a rollback). A fire-and-forget
  hook started inside a lock goes through `runOutsideLock`, or it inherits the lock context and joins a transaction that
  may already have committed.

### One connection per bet

A bet used to pin THREE pooled connections — the wallet lock's transaction, the nested market lock's, then the money
transaction — so concurrency topped out at a third of the pool and the surplus met a raw Prisma `P2024`. Now the lock's
transaction rides an `AsyncLocalStorage`: a nested `withLock` takes its advisory lock on that same transaction, and
`withMoneyTx` (`src/lib/server/ledger.ts`) joins it instead of opening its own. A bet holds ONE connection and one
`BEGIN`/`COMMIT`.

`withAdmission` (`src/lib/server/admission.ts`) sits in front of `buyPosition` (and of the house engine's
`placeHouseBet`, which is shed rather than queued behind players). Up to `maxInFlight` bets run at once; beyond that
they queue FIFO, a bounded queue refuses at once when it is already hopeless, and a wait budget caps how long a queued
bet holds on. Saturation answers a retryable `BUSY` — "your stake hasn't moved" — never a raw database error, so load
becomes latency, not failures. The defaults and clamps are `clampLimits()`; `maxInFlight` is always below the pool (at
most the pool minus 2, the pool being `connectionLimit()` / `PRISMA_CONNECTION_LIMIT`), so non-bet traffic always keeps
connections. A nested call passes straight through (it never waits for a slot its own caller holds); the gate is
in-process and never waits on Redis. Live counters: Admin → System (`admissionSnapshot()`). Proof:
`npm run test:bet-admission`, `npm run test:admission-module-copies`.

### ⛔ Two rules the shared transaction imposes — read before touching a money path

1. **An abort must ESCAPE `withLock`.** A throw rolls the transaction back only when it leaves the outermost lock.
   Caught inside, the enclosing transaction COMMITS the partial writes the abort meant to discard — a real debit with no
   position. `buyPosition`'s `BetAbort` is caught outside the lock for exactly this reason.
2. **Every WRITE inside a lock takes the caller's transaction** — the callback's `tx`, or `currentLockTx()`. The DAL
   resolves its client as `tx ?? pc()` and never reads the lock context by itself, so a write issued without it
   autocommits on another pooled connection, outside the lock's atomicity; and when it touches a row the lock's
   transaction has already written, it blocks on that uncommitted row until the 30 s timeout (`P2028`) —
   `recordWageringCore` once did exactly this. Reads may stay un-threaded: under MVCC a read never blocks on an
   uncommitted writer. Guard: `npm run test:lock-tx-threading` (structural); the behavioural proof is
   `npm run e2e:money` on a real Postgres.

⚠️ `hashKey64` lives alone in `src/lib/server/lock-key.ts` (re-exported by `locks.ts`). `audit.ts` needs only the hash
and is reachable from the CLIENT module graph; importing it from `locks.ts` dragged `node:async_hooks` into a browser
chunk and broke the build. Keep any server-only runtime out of `lock-key.ts`.

## Money-path mechanics

- **Rates stick to the market.** Every market freezes its rates at creation (`PredictionMarket.feeSnapshot`).
  Settlement, cash-out and every preview read them through `ratesFor(market)` (`market-service.ts`) — ⛔ never
  `getEffectiveConfig()`, which reads LIVE config and is for stamping a NEW market and for the admin UI. A snapshot is
  never rewritten, backfilled or migrated. The rates themselves are `docs/RULES.md`'s; the arithmetic is
  `src/lib/payout.ts`.
- **A price-history write never rejects.** `recordSnapshot` (`market-history.ts`, table `MarketSnapshot`) is called
  fire-and-forget from the bet and settlement paths, and an unhandled rejection kills the container mid-bet — so every
  history WRITE swallows and logs its own error (reads may throw; their callers guard). A market with no bets has an
  empty chart: ⛔ never a fallback that invents points (`npm run test:history`).
- **A board batches its charts.** `/`, `/markets` and `/results` call `getCardCharts(ids)` — one query for the whole
  board. ⛔ Never map `getCardChart` across a list.
- **A deposit that lands during a break is held, not credited.** `settleDepositConfirmed` books it to
  `HOUSE:RG_SUSPENSE` (status `AML_REVIEW`, audit `deposit.rg_refund_due`) until an officer returns it. ⛔ Never credit
  `PLAYER:<id>` for it: `PLAYER` is trial-balanced against the wallet, so crediting money that was never added to the
  wallet is permanent false drift.
- **The deposit credit path is exactly-once.** Every door — the provider callback, the card return page, the fast lane
  and the stale sweep — settles through `settlePaymentWebhook` (`wallet-service.ts`), which moves only a PROCESSING
  row, under its wallet lock, and checks the amount against the one initiated. It was audited and found sound (a double
  credit is impossible). ⛔ Do not change it without a new proof: `npm run test:payments`, `npm run e2e:money`. When
  each door asks: `docs/SELCOM-API-DIGEST.md` §8.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/store.ts` | Memory store + `db` export (feature-flagged) |
| `src/lib/server/prisma-dal.ts` | Prisma implementation of `db.*` interface |
| `src/lib/server/prisma.ts` | PrismaClient singleton |
| `src/lib/server/market-dal.ts` | Market + Position DAL |
| `src/lib/server/locks.ts` · `lock-key.ts` | `withLock`, the ambient lock transaction, `afterCommit` · the pure key hash |
| `src/lib/server/ledger.ts` | `withMoneyTx` and the double-entry ledger |
| `src/lib/server/admission.ts` | The bet admission queue |
| `prisma/schema.prisma` | Database schema |
| `scripts/migrate-snapshot-to-tables.ts` | One-time migration script (already run) |

## Testing

After any data-layer change:

```bash
# Type check
npx tsc --noEmit

# Build
npm run build

# Unit regression (no server needed)
npx tsx scripts/ai-poll-filter-regression.mts      # 67 assertions
npx tsx scripts/ai-poll-market-day-regression.mts   # 39 assertions
```

## Migration History

| Phase | What | Commit |
|-------|------|--------|
| 0 | Schema: 12 new models + extend User/Notification | `8d62eb0` |
| 1 | Prisma DAL: 58 async methods | `f058be6` |
| 2 | Feature flag in store.ts | `918a950` |
| 3 | `await` all 364 `db.*` calls + cascade (82 files) | `718deed` |
| 4 | Markets + Positions DAL + cascade (26 files) | `6bb1bbc` |
| 5 | All 8 remaining globals DAL + cascade (40 files) | `b516d57` |
| 6 | Migration script + run on Railway | `5850c66` |
| -- | Flag flipped: `USE_PRISMA_DAL=true` on Railway | production |
