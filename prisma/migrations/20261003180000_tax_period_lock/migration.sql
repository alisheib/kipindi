-- GOVERNMENT TAX REPORT · PERIOD LOCKS — "TaxPeriodLock" (docs/TAX-REPORT.md §6).
--
-- HAND-WRITTEN AND EXPAND-ONLY. Every statement below creates something that did not exist: one TABLE, its
-- primary key, two CHECK constraints and two indexes. Nothing is altered or removed, and no statement names an
-- object another lane owns.
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does not declare (the
-- trigram indexes and the `Transaction` unique — read the head of 20260928170000_marketing_contact_book).
--
-- ⭐ THE PARTIAL UNIQUE INDEX IS THE EXACTLY-ONCE GUARANTEE. At most one live lock per (period, product): a lock
-- that is released keeps its row (unlockedAt set) and a re-lock inserts a new one, so the index covers only the
-- rows with "unlockedAt" IS NULL. The Prisma DSL cannot express a partial index — the model's comment names it.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs each file in ONE transaction, and CREATE INDEX CONCURRENTLY cannot
-- run inside one. The table is empty at creation, so a plain index costs nothing.

-- CreateTable
CREATE TABLE "TaxPeriodLock" (
    "id" TEXT NOT NULL,
    "periodKind" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "periodEnd" TIMESTAMPTZ(3) NOT NULL,
    "snapshot" JSONB NOT NULL,
    "sha256" TEXT NOT NULL,
    "balanced" BOOLEAN NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "exceptionsAcknowledged" TEXT,
    "unlockedBy" TEXT,
    "unlockedAt" TIMESTAMPTZ(3),
    "unlockReason" TEXT,

    CONSTRAINT "TaxPeriodLock_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TaxPeriodLock_periodKind_check" CHECK ("periodKind" IN ('day', 'week', 'month')),
    CONSTRAINT "TaxPeriodLock_product_check" CHECK ("product" IN ('ALL', 'MARKET', 'UPDOWN'))
);

-- CreateIndex
CREATE INDEX "TaxPeriodLock_periodKind_periodKey_product_idx" ON "TaxPeriodLock"("periodKind", "periodKey", "product");

-- CreateIndex (SQL-only: partial — one live lock per period and product)
CREATE UNIQUE INDEX "TaxPeriodLock_active_key" ON "TaxPeriodLock"("periodKind", "periodKey", "product") WHERE "unlockedAt" IS NULL;
