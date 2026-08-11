-- Trilingual resolution criterion — F6, `resolution-criterion-english-only`.
--
-- WHY THIS EXISTS. `resolutionCriterion` is the sentence the PAYOUT TURNS ON, and it
-- was ONE column: written in English by the admin wizard and rendered raw into every
-- locale. A Swahili or Chinese player read the rule that decides their money in a
-- language they may not have, and nothing on the page said so — so English under a
-- Swahili heading read as the product's considered wording rather than as an absence.
--
-- ⛔ ENGLISH STAYS CANONICAL. Officers resolve against `resolutionCriterion`
-- (/admin/resolver/[id]) and market-sentinel.ts reads the same column. These two are
-- an aid to READING the rule, never the rule itself. Nothing about resolution,
-- settlement or payout consults them.
--
-- SAFETY. `ADD COLUMN <nullable> <no default>` is a catalogue-only change on every
-- supported PostgreSQL — no table rewrite, no ACCESS EXCLUSIVE lock held for the
-- length of a scan — so it is safe on the live money table. Both columns are NULLABLE
-- on purpose: `NULL` is the honest value for "nobody has translated this yet", and
-- backfilling English into them would make "untranslated" permanently
-- indistinguishable from "the translation happens to be the English" — the exact
-- defect already filed as F8 against Proposal.titleSw.
--
-- IF NOT EXISTS keeps the statement idempotent, matching the other additive
-- migrations in this directory (see 20260724180000_market_product_line).
ALTER TABLE "PredictionMarket"
  ADD COLUMN IF NOT EXISTS "resolutionCriterionSw" TEXT,
  ADD COLUMN IF NOT EXISTS "resolutionCriterionZh" TEXT;
