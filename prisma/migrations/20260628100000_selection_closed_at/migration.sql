-- Selection close date: when new bets stop being accepted (before resolution).
-- Null = bets close at resolutionAt (backward-compatible with all existing markets).
ALTER TABLE "PredictionMarket" ADD COLUMN "selectionClosedAt" TIMESTAMP(3);
ALTER TABLE "AIPoll" ADD COLUMN "selectionClosedAt" TIMESTAMP(3);

-- Fresh start: wipe all markets, positions, and comments for the new selection-window era.
DELETE FROM "Comment";
DELETE FROM "Position";
DELETE FROM "PredictionMarket";
