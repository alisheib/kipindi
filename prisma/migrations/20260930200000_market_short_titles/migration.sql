-- THE VODACOM PLAN S2 · SHORT TITLES AND COMPETITION ON A MARKET (2026-09-30).
--
-- HAND-WRITTEN AND EXPAND-ONLY. Four nullable TEXT columns on "PredictionMarket", no default, no backfill, no
-- index, no enum, no CHECK:
--   * "shortTitleEn" / "shortTitleSw" / "shortTitleZh" -- the question a card shows (<= 2 lines at 360 px). NULL
--     means "no short title": the card falls back to the reader's own full title at render time. NEVER backfilled
--     here with the full or the English title (F8: a copy would make "nobody wrote this" indistinguishable from an
--     approved short title). The backfill is an officer-approved act, one market at a time, in the application.
--   * "competition" -- a key from src/lib/markets/competitions.ts, validated in the app. A plain string, not an enum,
--     so adding a competition never needs its own migration.
--
-- A nullable, default-less ADD COLUMN is a catalogue-only change, but it still takes ACCESS EXCLUSIVE on the table
-- every bet touches; the lock timeout makes a stuck lock fail this migration (55P03) instead of stalling bets.
-- Never generated with `prisma migrate diff` (it would drop the raw-SQL trigram indexes).

SET LOCAL lock_timeout = '3s';

ALTER TABLE "PredictionMarket"
  ADD COLUMN IF NOT EXISTS "shortTitleEn" TEXT,
  ADD COLUMN IF NOT EXISTS "shortTitleSw" TEXT,
  ADD COLUMN IF NOT EXISTS "shortTitleZh" TEXT,
  ADD COLUMN IF NOT EXISTS "competition" TEXT;
