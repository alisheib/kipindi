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
candidates, comments, sources, TOTP, house pool, market config, market
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
| User | `store.ts` / `prisma-dal.ts` | User | |
| Wallet | `store.ts` / `prisma-dal.ts` | Wallet | |
| Transaction | `store.ts` / `prisma-dal.ts` | Transaction | |
| KYC | `store.ts` / `prisma-dal.ts` | KycSubmission | |
| OTP | `store.ts` / `prisma-dal.ts` | Otp | `hash\|salt` packing |
| Notification | `store.ts` / `prisma-dal.ts` | Notification | |
| ResponsibleGambling | `store.ts` / `prisma-dal.ts` | ResponsibleGambling | |
| SourceOfFunds | `store.ts` / `prisma-dal.ts` | SourceOfFunds | |
| Affiliate | `store.ts` / `prisma-dal.ts` | AffiliateAgent | `recruitCount` <-> `totalRecruits` |
| ReferralReward | `store.ts` / `prisma-dal.ts` | ReferralReward | |
| Proposal | `store.ts` / `prisma-dal.ts` | Proposal | |
| ProposalVote | `store.ts` / `prisma-dal.ts` | ProposalVote | |
| Market | `market-dal.ts` | PredictionMarket | |
| Position | `market-dal.ts` | Position | |
| AI Poll | `ai-poll-generation.ts` | AIPoll | inline DAL |
| Candidate | `market-candidate.ts` | MarketCandidate | inline DAL |
| Comment | `comments-store.ts` | Comment | reports: `Set` <-> JSON `[]` |
| TrustedSource | `source-registry.ts` | TrustedSource | inline DAL |
| TOTP Secret | `totp.ts` | TotpSecret | inline DAL |
| House Pool Ledger | `house-pool.ts` | HousePoolLedger | balance/config/seeds stay in-memory |
| Market History | `market-history.ts` | -- | memory-only (write-heavy chart data) |
| Market Config | `market-config.ts` | -- | memory-only (TODO: SystemConfig table) |

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

Run: `npx prisma migrate dev --name add_my_entity`

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

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/server/store.ts` | Memory store + `db` export (feature-flagged) |
| `src/lib/server/prisma-dal.ts` | Prisma implementation of `db.*` interface |
| `src/lib/server/prisma.ts` | PrismaClient singleton |
| `src/lib/server/market-dal.ts` | Market + Position DAL |
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
