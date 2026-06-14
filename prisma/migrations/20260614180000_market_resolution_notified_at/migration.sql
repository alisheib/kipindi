-- Track when officers were alerted that a (real) market is closed-by-time and
-- awaiting their two-officer resolution, so the alert fires exactly once.
ALTER TABLE "PredictionMarket" ADD COLUMN "resolutionNotifiedAt" TIMESTAMP(3);
