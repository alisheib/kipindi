-- THE SHOWN PREDICTOR COUNT — one column added to what a market already holds (owner ruling, Ali, 2026-10-11:
-- docs/COMPLIANCE-DECISIONS.md, "2026-10-11 · A desk account may count as more than one predictor in the count
-- players see").
--
-- `predictorCount` stays the TRUE count of accounts. The Gaming Board match-integrity report, the 7-year audit row of
-- an Up & Down round and every admin page read it, and nothing about it changes. `predictorExtra` is what players see
-- ON TOP of it: `src/lib/markets/predictors.ts` adds the two for player surfaces only.
--
-- EXPAND-ONLY. One ADD COLUMN with a constant default: metadata-only on PostgreSQL 11+, no table rewrite, every
-- existing row reads 0, so no card changes until an officer sets a desk account's "Counts as".
-- `IF NOT EXISTS` makes it re-runnable. The lock timeout stops the brief ACCESS EXCLUSIVE lock from queueing every
-- market read behind a long reader for more than 3 s. If it trips, the boot that ran it fails, the previous build
-- keeps serving, and Prisma records the migration as failed (P3009 on the next boot): confirm the column is absent,
-- run `prisma migrate resolve --rolled-back 20261011170000_market_predictor_extra`, and redeploy.
SET LOCAL lock_timeout = '3s';
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "predictorExtra" INTEGER NOT NULL DEFAULT 0;
