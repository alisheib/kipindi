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
-- ⛔ THE LOCK WAIT RETRIES INSIDE THIS FILE (review S2-BOOT-1, 2026-09-30). The file runs at container boot
-- (`start` is `prisma migrate deploy && next start`). ADD COLUMN takes ACCESS EXCLUSIVE; a transaction holding the
-- table (a settlement may hold its lock up to 30 s) would make a single 3 s wait fail with 55P03 — and a failed
-- migration leaves a `_prisma_migrations` row that blocks EVERY later boot (P3009) until an operator runs
-- `prisma migrate resolve`. So each attempt waits at most 3 s (bets are never stalled longer than that) and the
-- whole thing retries up to 20 times, 1.5 s apart (about a minute), before it gives up. Recovery, if it ever does:
-- `npx prisma migrate resolve --rolled-back <this folder>` against production, then redeploy.

DO $$
DECLARE
  attempt int := 0;
BEGIN
  LOOP
    BEGIN
      ALTER TABLE "PredictionMarket"
        ADD COLUMN IF NOT EXISTS "shortTitleEn" TEXT,
        ADD COLUMN IF NOT EXISTS "shortTitleSw" TEXT,
        ADD COLUMN IF NOT EXISTS "shortTitleZh" TEXT,
        ADD COLUMN IF NOT EXISTS "competition" TEXT;
      EXIT;
    EXCEPTION WHEN lock_not_available THEN
      attempt := attempt + 1;
      IF attempt >= 20 THEN
        RAISE;
      END IF;
      PERFORM pg_sleep(1.5);
    END;
  END LOOP;
END
$$;
