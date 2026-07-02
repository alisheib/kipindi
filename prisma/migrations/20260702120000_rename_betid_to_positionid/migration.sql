-- Rename Transaction.betId → positionId
-- All non-null values are Position IDs (prediction-market wagers).
-- Legacy sports Bet model is being dropped (Phase 0b); no Bet references remain.
ALTER TABLE "Transaction" RENAME COLUMN "betId" TO "positionId";
