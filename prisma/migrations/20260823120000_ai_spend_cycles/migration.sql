-- AI SPEND IN CYCLES — structured attribution, plus the durable cycle ledger.
--
-- Two things, one file, because they are one expand step and one production migration is
-- one deploy risk rather than two.
--
--   ① `AiUsageEvent.subjectType` / `.subjectId` — the blocking prerequisite. `detail` is free
--      text, so nothing could divide AI spend by "resolutions". These are SOFT REFS with NO
--      foreign key, deliberately: metering must survive a retention delete of the thing it
--      points at, and an FK would let a metering row block a market delete.
--   ② `AiSpendCycle` — the durable aggregate. `AiUsageEvent` is pruned at 180 days; this
--      table never is, which is why a cycle carries its own `costUsd` instead of being
--      recomputed on read.
--
-- ⛔ EXPAND ONLY. Nothing is dropped, renamed, or rewritten. The previously-deployed
-- container never names either object, and a column/table it does not know about cannot
-- break a query it already runs. Safe to ship in ONE release.
--
-- ⛔ NO `CONCURRENTLY`. `prisma migrate deploy` wraps a migration in a transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside one (25001). `start` is
-- `prisma migrate deploy && … && next start`, so a migration that aborts is not a failed
-- deploy — it is a platform-wide sign-in outage, because `next start` is never reached.
--
-- ⛔ `IF NOT EXISTS` on every statement, because CI replays each migration exactly once
-- against a fresh database while production may already carry an object (pre-created by hand
-- — the practice recorded in 20260731120000's commit body). A file that is not re-runnable is
-- GREEN in CI and fatal on production.
--
-- ⚠️ THE LOCK. `ADD COLUMN` of a NULLABLE column with NO DEFAULT is catalogue-only in
-- PostgreSQL 11+ — no table rewrite — so the ACCESS EXCLUSIVE lock is held for microseconds.
-- Measured read-only on production 2026-08-23 before shipping: `AiUsageEvent` holds 4,271
-- rows / 3,672 kB, and `AiSpendCycle` did not exist. See `npm run ops:preflight-ai-cycles`,
-- which re-measures and refuses to say GO if either has changed.

ALTER TABLE "AiUsageEvent" ADD COLUMN IF NOT EXISTS "subjectType" TEXT;
ALTER TABLE "AiUsageEvent" ADD COLUMN IF NOT EXISTS "subjectId"   TEXT;

CREATE INDEX IF NOT EXISTS "AiUsageEvent_subjectType_subjectId_idx"
    ON "AiUsageEvent" ("subjectType", "subjectId");

CREATE TABLE IF NOT EXISTS "AiSpendCycle" (
    "id"       TEXT      NOT NULL,
    -- Monotonic, 1-based, no gaps, and it NEVER resets. The UNIQUE index below is not
    -- decoration: `withLock` serialises the meter, and this is what makes a LOST lock loud
    -- (duplicate index → constraint error → alert) instead of silent (two cycles numbered 7,
    -- and every downstream count quietly wrong). E-108's lesson — never let the only
    -- protection be the one you cannot observe failing.
    "index"    INTEGER   NOT NULL,
    -- Stamped at open, never looked up. A retroactive size change would silently rewrite
    -- "cycles per year" for every past year, making the number unfalsifiable.
    "sizeUsd"  DOUBLE PRECISION NOT NULL,
    "priceRev" TEXT      NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "costUsd"  DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status"   TEXT      NOT NULL,
    "openedBy" TEXT,
    "note"     TEXT,

    CONSTRAINT "AiSpendCycle_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AiSpendCycle_index_key"    ON "AiSpendCycle" ("index");
CREATE        INDEX IF NOT EXISTS "AiSpendCycle_closedAt_idx" ON "AiSpendCycle" ("closedAt");
CREATE        INDEX IF NOT EXISTS "AiSpendCycle_status_idx"   ON "AiSpendCycle" ("status");
