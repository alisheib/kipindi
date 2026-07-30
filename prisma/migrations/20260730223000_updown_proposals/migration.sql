-- UP & DOWN AI PROPOSALS — one table, one enum, purely additive.
--
-- Nothing existing is touched: no column added to a live table, no backfill, no data
-- rewritten. A deploy that runs this and then rolls back leaves an unused table behind and
-- nothing else, which is the cheapest possible failure mode for a money subsystem.
--
-- The one FK is to UpDownAsset, ON DELETE CASCADE, because a proposal for a deleted asset
-- is not a record worth keeping — it references a source and a duration that no longer
-- mean anything. (Assets are disabled rather than deleted in normal operation, so this
-- fires approximately never; it exists so the constraint is honest.)

-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UpDownProposalState') THEN
    CREATE TYPE "UpDownProposalState" AS ENUM (
      'GENERATING',
      'VALIDATION_FAILED',
      'FILTERED',
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'ARMED'
    );
  END IF;
END
$$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "UpDownProposal" (
    "id" TEXT NOT NULL,
    "state" "UpDownProposalState" NOT NULL DEFAULT 'GENERATING',
    "requestAssetId" TEXT NOT NULL,
    "requestPrompt" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL DEFAULT 15,
    "marginBps" INTEGER NOT NULL DEFAULT 50,
    "sourceUrl" TEXT NOT NULL DEFAULT '',
    "sourceDomain" TEXT NOT NULL DEFAULT '',
    "framingEn" TEXT NOT NULL DEFAULT '',
    "framingSw" TEXT NOT NULL DEFAULT '',
    "framingZh" TEXT NOT NULL DEFAULT '',
    "reasoning" TEXT NOT NULL,
    -- Evidence that the proposed link is readable. NOT a price any round settles on:
    -- an armed chain reads its own boundary through the observation ledger.
    "observedPrice" DECIMAL(18,8),
    "observedQuotedAt" TIMESTAMP(3),
    "generation" JSONB,
    "rawResponse" TEXT,
    "filterReasons" JSONB NOT NULL DEFAULT '[]',
    "qualityIndicators" JSONB NOT NULL DEFAULT '[]',
    "overallQuality" INTEGER NOT NULL DEFAULT 0,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "rejectReasons" JSONB NOT NULL DEFAULT '[]',
    "armedChainId" TEXT,
    "armedAt" TIMESTAMP(3),
    "armedBy" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "regenerationOf" TEXT,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpDownProposal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UpDownProposal_state_idx" ON "UpDownProposal"("state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UpDownProposal_requestAssetId_createdAt_idx" ON "UpDownProposal"("requestAssetId", "createdAt");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'UpDownProposal_requestAssetId_fkey'
  ) THEN
    ALTER TABLE "UpDownProposal"
      ADD CONSTRAINT "UpDownProposal_requestAssetId_fkey"
      FOREIGN KEY ("requestAssetId") REFERENCES "UpDownAsset"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
