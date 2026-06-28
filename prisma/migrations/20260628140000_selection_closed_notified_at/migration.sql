-- Track when bettors were notified that selections closed (waiting for results).
-- Set once per market by the selection-closed lifecycle sweep so the
-- "waiting for results" notification fires exactly once. Null = not yet notified.
ALTER TABLE "PredictionMarket" ADD COLUMN "selectionClosedNotifiedAt" TIMESTAMP(3);
