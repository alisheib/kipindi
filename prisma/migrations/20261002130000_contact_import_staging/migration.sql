-- U29 · CONTACT IMPORT STAGING — ContactImport and ContactImportRow (marketing OD26 · OD30; decisions X1 · X2 ·
-- X18–X20 · X23 · X28 · X29). U29b's service and its privacy arms ship in the same commit; nothing writes a row
-- until U30's dialog stages a real file.
--
-- HAND-WRITTEN AND EXPAND-ONLY. Every statement below creates something that did not exist: four brand-new enum
-- TYPES, two TABLES, their indexes and one foreign key. Nothing is altered or removed, and no statement names an
-- object another lane owns. ⛔ `MarketingContact.importId` stays a SOFT key — no foreign key to "ContactImport" — so a
-- deploy can never fail validating live book rows, and a run that retention purges leaves every contact it created
-- exactly as it is.
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does not declare — the
-- eight `gin_trgm_ops` indexes and the `Transaction` unique, every time (read the head of
-- 20260928170000_marketing_contact_book). `test:migration-ownership` inspects removals only, so a purely additive
-- file passes it trivially; the evidence for THIS file is that it was typed from the two models and applied from
-- EMPTY with every other migration — `test:contacts-staging-db` does exactly that on embedded PostgreSQL 18.3.
--
-- ⛔ NO VALUE IS ADDED TO AN EXISTING ENUM (55P04). Postgres refuses to USE an enum value in the transaction that
-- ADDED it, but a type CREATED in a transaction may be used in that same transaction. So the four types share this
-- file with the tables, and every value a later unit needs is created now (X2): no conditional migration is owed.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs each file in ONE transaction, and CREATE INDEX CONCURRENTLY cannot
-- run inside one. These tables are empty at creation, so a plain index costs nothing.
--
-- ⭐ NO STORED COUNTER (OD26). Every total is a groupBy over "ContactImportRow"; the run row carries the two
-- compare-and-set cursors and the browser's two figures, and nothing a crash between two writes could leave wrong.

-- CreateEnum
CREATE TYPE "ContactImportStatus" AS ENUM ('STAGING', 'STAGED', 'COMMITTING', 'PAUSED', 'DONE', 'CANCELLED');

-- CreateEnum
-- Lower case, exactly as `ContactsFileFormat` spells it (the "AdminDomain" precedent), so neither twin translates.
CREATE TYPE "ContactImportFormat" AS ENUM ('csv', 'xlsx', 'vcard', 'paste');

-- CreateEnum
CREATE TYPE "ContactImportChoice" AS ENUM ('KEEP', 'TAKE_FILE', 'FILL_BLANKS');

-- CreateEnum
-- X4's ONE outcome union, value for value (`IMPORT_OUTCOMES`). The reason is TEXT, so a new reason costs no migration.
CREATE TYPE "ContactImportOutcome" AS ENUM ('create', 'update', 'keep', 'fail');

-- CreateTable
CREATE TABLE "ContactImport" (
    "id" TEXT NOT NULL,
    "status" "ContactImportStatus" NOT NULL DEFAULT 'STAGING',
    "format" "ContactImportFormat" NOT NULL,
    "fileName" TEXT,
    "fileDigest" TEXT NOT NULL,
    "mapping" JSONB NOT NULL,
    "totalRows" INTEGER NOT NULL,
    "unreadable" INTEGER NOT NULL DEFAULT 0,
    "stagedThrough" INTEGER NOT NULL DEFAULT 0,
    "committedThrough" INTEGER NOT NULL DEFAULT 0,
    "decisionChoice" "ContactImportChoice",
    "decisionOverrides" JSONB NOT NULL DEFAULT '{}',
    "decisionConfirmedAt" TIMESTAMPTZ(3),
    "decisionConfirmedBy" TEXT,
    "consentBasis" TEXT,
    "consentWording" TEXT,
    "consentProofNote" TEXT,
    "adultAttestedAt" TIMESTAMPTZ(3),
    "consentBasisSetBy" TEXT,
    "consentBasisSetAt" TIMESTAMPTZ(3),
    "pausedAt" TIMESTAMPTZ(3),
    "pausedBy" TEXT,
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- ⭐ The compound primary key is the KEYSET every walk uses (`ordinal`, never an offset), and the unique (importId,
-- line) below is one record per file row.
CREATE TABLE "ContactImportRow" (
    "importId" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "line" INTEGER NOT NULL,
    "rawPhone" TEXT NOT NULL,
    "msisdn" TEXT,
    "displayName" TEXT,
    "email" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "problems" JSONB NOT NULL DEFAULT '[]',
    "readError" TEXT,
    "outcome" "ContactImportOutcome",
    "outcomeReason" TEXT,
    "stagedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ContactImportRow_pkey" PRIMARY KEY ("importId","ordinal")
);

-- CreateIndex
CREATE INDEX "ContactImport_createdBy_status_idx" ON "ContactImport"("createdBy", "status");

-- CreateIndex
CREATE INDEX "ContactImport_status_updatedAt_idx" ON "ContactImport"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "ContactImport_status_finishedAt_idx" ON "ContactImport"("status", "finishedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContactImportRow_importId_line_key" ON "ContactImportRow"("importId", "line");

-- CreateIndex
CREATE INDEX "ContactImportRow_importId_outcome_idx" ON "ContactImportRow"("importId", "outcome");

-- CreateIndex
-- Erasure's reach: every run's rows holding a number.
CREATE INDEX "ContactImportRow_msisdn_idx" ON "ContactImportRow"("msisdn");

-- AddForeignKey
-- ⭐ CASCADE, ON PURPOSE: a staged row is the run's payload, never evidence, so a run that retention purges takes its
-- rows with it (the memory twin emulates this in `purgeFinished`).
ALTER TABLE "ContactImportRow" ADD CONSTRAINT "ContactImportRow_importId_fkey" FOREIGN KEY ("importId") REFERENCES "ContactImport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
