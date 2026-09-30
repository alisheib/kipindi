-- THE VODACOM PLAN S2 · SHORT TITLES AND COMPETITION ON AN AI POLL (2026-09-30).
--
-- HAND-WRITTEN AND EXPAND-ONLY, the 20260811150000_ai_resolution_criterion_i18n precedent: a value the model
-- generates must have a home on the poll row, or `publishApprovedPoll` drops it at the publish boundary (F6c, the
-- write-only field). Four nullable TEXT columns, no default, no backfill. NULL = the model gave none, or it failed
-- the rules in src/lib/markets/short-title.ts. Never a copy of a full title.

ALTER TABLE "AIPoll"
  ADD COLUMN IF NOT EXISTS "shortTitleEn" TEXT,
  ADD COLUMN IF NOT EXISTS "shortTitleSw" TEXT,
  ADD COLUMN IF NOT EXISTS "shortTitleZh" TEXT,
  ADD COLUMN IF NOT EXISTS "competition" TEXT;
