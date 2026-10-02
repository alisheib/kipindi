-- U35b · THE CAMPAIGN TABLES — SmsCampaign and SmsCampaignRecipient (marketing D22; decisions X1 · X8 ·
-- X12–X15 · M5 · M6 · M9). U36, the first screen that reads them, starts only once this is live.
--
-- HAND-WRITTEN AND EXPAND-ONLY. Every statement below creates something that did not exist: three
-- brand-new enum TYPES, two TABLES, their indexes and three foreign keys. Nothing is altered or removed,
-- and no statement names an object another lane owns.
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does not
-- declare — the eight `gin_trgm_ops` indexes and the `Transaction` unique, every time (read the header of
-- 20260928170000_marketing_contact_book). `test:migration-ownership` inspects removals only, so a purely
-- additive file passes it trivially; the evidence for THIS file is `test:campaign-models` §1, which holds
-- it equal to the two models column by column, index by index and link by link, and the pre-push apply
-- from EMPTY on the scratch Postgres (`scripts/db-scratch.mts --reset`) with a drift diff naming none of
-- the five objects below.
--
-- ⛔ NO VALUE IS ADDED TO AN EXISTING ENUM HERE (55P04). Postgres refuses to USE an enum value in the
-- transaction that ADDED it, so U35a's one-statement migration (the marketing lane of the SMS purpose
-- enum, 20261001160000_sms_purpose_marketing) ships alone, one deploy ahead. The three types below are
-- NEW, and a type created in a transaction may be used in that same transaction — so they share this
-- file with the tables.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs each file in ONE transaction, and CREATE INDEX
-- CONCURRENTLY cannot run inside one. These tables are empty at creation, so a plain index costs nothing.
--
-- ⛔ NO CASCADE ON ANY OF THE THREE LINKS. The campaign link is RESTRICT: a campaign that holds a
-- recipient cannot be deleted, because the recipient rows are the record that we messaged somebody
-- (GN 478T reg 51(1)). `contactId` and `userId` are SET NULL: a deleted contact or account breaks the
-- pointer and keeps the record. (`ON UPDATE CASCADE` is Prisma's default for a key that never changes.)
--
-- ⭐ NO STORED COUNTERS (OD26). How many were sent, delivered, failed or skipped is a groupBy over the
-- recipient rows, never a column that a crash between two writes can leave wrong.
--
-- ⭐ `audienceFilter` IS TEXT, NOT JSONB. It holds U24's canonical key (`contactAudienceKey`), and JSONB
-- would reorder its object keys and drop its spacing: Postgres would hand back a different string from
-- the one the memory twin keeps, and U40 compares the stored key with the resolver's own output.
--
-- ⭐ THE ONE KEY — `SmsCampaignRecipient_campaignId_msisdn_key`. U42's enqueue is restartable and writes
-- with `createMany({ skipDuplicates: true })` (ON CONFLICT DO NOTHING): this index is what makes a
-- restart unable to put one person on one campaign twice. `smsReference` is UNIQUE and nullable — NULLs
-- are distinct, so every unsent row has none and no two sent rows can ever share one.

-- CreateEnum
CREATE TYPE "SmsCampaignStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'PREPARING', 'RUNNING', 'PAUSED', 'DONE', 'CANCELLED');

-- CreateEnum
-- ⚠️ HELD is a recipient that still owes somebody a message (X12): outstanding, never settled.
CREATE TYPE "SmsCampaignRecipientStatus" AS ENUM ('PENDING', 'HELD', 'SENT', 'DELIVERED', 'FAILED', 'SKIPPED');

-- CreateEnum
-- The character set of one variant's body — the `SmsEncoding` union of `src/lib/sms-compose.ts`.
CREATE TYPE "SmsEncoding" AS ENUM ('GSM7', 'UCS2');

-- CreateTable
CREATE TABLE "SmsCampaign" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SmsCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "bodySw" TEXT NOT NULL,
    "bodyEn" TEXT,
    "codingSw" "SmsEncoding" NOT NULL,
    "segmentsSw" INTEGER NOT NULL,
    "codingEn" "SmsEncoding",
    "segmentsEn" INTEGER,
    "nameFallbackSw" TEXT,
    "nameFallbackEn" TEXT,
    "sourcePhrase" TEXT,
    "draftRevision" INTEGER NOT NULL DEFAULT 0,
    "confirmTier" TEXT,
    "audienceFilter" TEXT NOT NULL,
    "audienceCount" INTEGER,
    "audienceWatermark" TEXT,
    "estimateSegments" INTEGER,
    "estimateTzs" DECIMAL(18,2),
    "budgetTzs" DECIMAL(18,2),
    "enqueueCursor" TEXT,
    "enqueuedAt" TIMESTAMPTZ(3),
    "stopReason" TEXT,
    "createdBy" TEXT NOT NULL,
    "confirmedBy" TEXT,
    "confirmedAt" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "pausedAt" TIMESTAMPTZ(3),
    "finishedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SmsCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SmsCampaignRecipient" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "contactId" TEXT,
    "userId" TEXT,
    "status" "SmsCampaignRecipientStatus" NOT NULL DEFAULT 'PENDING',
    "smsReference" TEXT,
    "optOutToken" TEXT,
    "locale" "Locale",
    "failureClass" TEXT,
    "error" TEXT,
    "skipReason" TEXT,
    "skipDetail" TEXT,
    "claimToken" TEXT,
    "claimedAt" TIMESTAMPTZ(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "segments" INTEGER,
    "bodyLen" INTEGER,
    "costTzs" DECIMAL(18,2),
    "gateTrail" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMPTZ(3),
    "deliveredAt" TIMESTAMPTZ(3),
    "failedAt" TIMESTAMPTZ(3),

    CONSTRAINT "SmsCampaignRecipient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- U36's list: the status rail and the page order.
CREATE INDEX "SmsCampaign_status_createdAt_idx" ON "SmsCampaign"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SmsCampaign_createdAt_idx" ON "SmsCampaign"("createdAt");

-- CreateIndex
-- ⛔ THE ONE KEY: one row per person per campaign, whatever an enqueue restart writes.
CREATE UNIQUE INDEX "SmsCampaignRecipient_campaignId_msisdn_key" ON "SmsCampaignRecipient"("campaignId", "msisdn");

-- CreateIndex
-- Nullable-unique: a delivery receipt's reference finds exactly one recipient (U46).
CREATE UNIQUE INDEX "SmsCampaignRecipient_smsReference_key" ON "SmsCampaignRecipient"("smsReference");

-- CreateIndex
-- The per-campaign counts (one groupBy) and the slice's PENDING read.
CREATE INDEX "SmsCampaignRecipient_campaignId_status_idx" ON "SmsCampaignRecipient"("campaignId", "status");

-- CreateIndex
-- Erasure and the DSAR export find a person's rows by the ONE key (M9: U16 before U42).
CREATE INDEX "SmsCampaignRecipient_msisdn_idx" ON "SmsCampaignRecipient"("msisdn");

-- CreateIndex
-- The two SET NULL links: without these, every contact or account delete scans the whole table.
CREATE INDEX "SmsCampaignRecipient_contactId_idx" ON "SmsCampaignRecipient"("contactId");

-- CreateIndex
CREATE INDEX "SmsCampaignRecipient_userId_idx" ON "SmsCampaignRecipient"("userId");

-- CreateIndex
-- U43's claim reads its won rows back by token.
CREATE INDEX "SmsCampaignRecipient_claimToken_idx" ON "SmsCampaignRecipient"("claimToken");

-- AddForeignKey
-- ⛔ RESTRICT: the proof that we messaged somebody outlives the campaign's own lifecycle.
ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "SmsCampaignRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "SmsCampaign"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
-- ⛔ SET NULL, NEVER CASCADE: a deleted contact breaks the link and keeps the record.
ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "SmsCampaignRecipient_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MarketingContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
-- ⛔ SET NULL, NEVER CASCADE: a link, never a copy — the same rule as `MarketingContact.userId`.
ALTER TABLE "SmsCampaignRecipient" ADD CONSTRAINT "SmsCampaignRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
