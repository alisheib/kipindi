-- Trilingual resolution criterion, part 2 — the AI pipeline (F6c).
--
-- 20260811120000 gave PredictionMarket its `resolutionCriterionSw`/`Zh` and the player
-- surface that discloses their absence. This carries the same two columns back up the
-- AI pipeline, so a Swahili criterion the model generates is not thrown away at
-- storage and then reported to the player as "no translation available".
--
-- ⛔ ENGLISH STAYS CANONICAL on every one of these tables. Officers resolve against
-- `resolutionCriterion` and market-sentinel.ts reads the same column.
--
-- ⛔ NULLABLE, AND NEVER BACKFILLED WITH THE ENGLISH. The model may decline to
-- translate, and `null` is the honest value for that. Copying the English across would
-- make "untranslated" indistinguishable from "translated identically" — F8, on two
-- more tables.
--
-- SAFETY. Nullable ADD COLUMN with no default is catalogue-only on PostgreSQL: no
-- table rewrite, no long lock. Both tables are small (hundreds of rows) regardless.
ALTER TABLE "AIPoll"
  ADD COLUMN IF NOT EXISTS "resolutionCriterionSw" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionCriterionZh" TEXT;

ALTER TABLE "MarketCandidate"
  ADD COLUMN IF NOT EXISTS "resolutionCriterionSw" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionCriterionZh" TEXT;
