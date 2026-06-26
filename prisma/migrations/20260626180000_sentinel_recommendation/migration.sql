-- AlterTable: add sentinel recommendation fields to PredictionMarket
-- These store the AI sentinel's recommendation when it auto-closes a market,
-- so officers see a pre-filled suggestion in the resolver queue.
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelOutcome" TEXT;
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelEvidence" TEXT;
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelReasoning" TEXT;
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelSourceUrl" TEXT;
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelConfidence" INTEGER;
ALTER TABLE "PredictionMarket" ADD COLUMN "sentinelClosedAt" TIMESTAMP(3);
