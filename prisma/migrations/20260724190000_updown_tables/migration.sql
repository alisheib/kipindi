-- Up & Down — the four tables behind short-term price rounds.
--
-- PURELY ADDITIVE. Four new tables, three new enums, no change to any existing
-- column, no backfill, no data migration. Old code ignores them entirely, which is
-- what makes the rollback ladder safe: reverting the app leaves these tables sitting
-- unused rather than breaking anything.
--
-- THE SHAPE. An ASSET (Gold) runs one CHAIN per duration (5/15/30 min). Each chain
-- emits ROUNDS back-to-back on a fixed grid. Every round is ALSO a PredictionMarket
-- row (productLine 'UPDOWN', UP = YES, DOWN = NO), so betting, settlement, refunds,
-- the ledger and the audit chain are the SAME code the long-form polls use. These
-- tables hold only the price story. THEY NEVER HOLD MONEY.
--
-- THE ONE CONSTRAINT THAT MATTERS: UpDownObservation_assetId_boundaryAt_key.
-- Prices are observed ONCE per (asset, grid boundary) and SHARED by every round edge
-- landing on that instant — the reading at 14:30 is simultaneously the CLOSE of the
-- 14:25 round and the OPEN of the 14:30 round (and of any 15/30-min round crossing
-- it). That unique index is what guarantees round N's close equals round N+1's open
-- to the digit, so the resolution AI can never disagree with itself between two
-- adjacent rounds — it is never asked twice. It also collapses the AI cost from one
-- call per round to one call per asset per boundary.
--
-- ⛔ NEVER UPDATE a CONFIRMED observation's price. Re-observing a settled boundary is
-- a bug, not a feature; this index makes it a database error instead of a silent
-- money divergence.
--
-- UpDownRound.marketId carries a UNIQUE + FK ON DELETE CASCADE to PredictionMarket:
-- exactly one market per round, and a round can never outlive its market and become
-- an orphan pointing at nothing.

-- CreateEnum
CREATE TYPE "UpDownChainState" AS ENUM ('RUNNING', 'PAUSED', 'STOPPED');

-- CreateEnum
CREATE TYPE "UpDownRoundOutcome" AS ENUM ('UP', 'DOWN', 'VOID');

-- CreateEnum
CREATE TYPE "UpDownObservationState" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateTable
CREATE TABLE "UpDownAsset" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameSw" TEXT NOT NULL,
    "nameZh" TEXT,
    "iconKey" TEXT NOT NULL,
    "priceSourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'macro',
    "decimals" INTEGER NOT NULL DEFAULT 2,
    "minMoveTicks" INTEGER NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpDownAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpDownChain" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "state" "UpDownChainState" NOT NULL DEFAULT 'STOPPED',
    "gridAnchorAt" TIMESTAMP(3) NOT NULL,
    "nextBoundaryAt" TIMESTAMP(3),
    "currentRoundId" TEXT,
    "minStake" INTEGER,
    "maxStake" INTEGER,
    "rateProfile" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpDownChain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpDownRound" (
    "id" TEXT NOT NULL,
    "chainId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "boundaryAt" TIMESTAMP(3) NOT NULL,
    "openObservationId" TEXT,
    "closeObservationId" TEXT,
    "openPrice" DECIMAL(24,8),
    "closePrice" DECIMAL(24,8),
    "outcome" "UpDownRoundOutcome",
    "voidReason" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpDownRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UpDownObservation" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "boundaryAt" TIMESTAMP(3) NOT NULL,
    "state" "UpDownObservationState" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(24,8),
    "sourceUrl" TEXT,
    "sourceQuotedAt" TIMESTAMP(3),
    "evidence" TEXT,
    "confidence" INTEGER,
    "model" TEXT,
    "rawHash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "failReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "UpDownObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpDownAsset_key_key" ON "UpDownAsset"("key");

-- CreateIndex
CREATE INDEX "UpDownAsset_enabled_sortOrder_idx" ON "UpDownAsset"("enabled", "sortOrder");

-- CreateIndex
CREATE INDEX "UpDownChain_state_nextBoundaryAt_idx" ON "UpDownChain"("state", "nextBoundaryAt");

-- CreateIndex
CREATE UNIQUE INDEX "UpDownChain_assetId_durationMinutes_key" ON "UpDownChain"("assetId", "durationMinutes");

-- CreateIndex
CREATE UNIQUE INDEX "UpDownRound_marketId_key" ON "UpDownRound"("marketId");

-- CreateIndex
CREATE INDEX "UpDownRound_boundaryAt_idx" ON "UpDownRound"("boundaryAt");

-- CreateIndex
CREATE INDEX "UpDownRound_chainId_boundaryAt_idx" ON "UpDownRound"("chainId", "boundaryAt");

-- CreateIndex
CREATE UNIQUE INDEX "UpDownRound_chainId_roundNumber_key" ON "UpDownRound"("chainId", "roundNumber");

-- CreateIndex
CREATE INDEX "UpDownObservation_assetId_state_boundaryAt_idx" ON "UpDownObservation"("assetId", "state", "boundaryAt");

-- CreateIndex
CREATE UNIQUE INDEX "UpDownObservation_assetId_boundaryAt_key" ON "UpDownObservation"("assetId", "boundaryAt");

-- AddForeignKey
ALTER TABLE "UpDownChain" ADD CONSTRAINT "UpDownChain_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UpDownAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpDownRound" ADD CONSTRAINT "UpDownRound_chainId_fkey" FOREIGN KEY ("chainId") REFERENCES "UpDownChain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpDownRound" ADD CONSTRAINT "UpDownRound_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UpDownObservation" ADD CONSTRAINT "UpDownObservation_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "UpDownAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

