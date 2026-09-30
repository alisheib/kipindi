-- THE VODACOM PLAN S2 · SHORT TITLES AND COMPETITION ON AN AI POLL (2026-09-30).
--
-- HAND-WRITTEN AND EXPAND-ONLY, the 20260811150000_ai_resolution_criterion_i18n precedent: a value the model
-- generates must have a home on the poll row, or `publishApprovedPoll` drops it at the publish boundary (F6c, the
-- write-only field). Four nullable TEXT columns, no default, no backfill. NULL = the model gave none, or it failed
-- the rules in src/lib/markets/short-title.ts. Never a copy of a full title.

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
      ALTER TABLE "AIPoll"
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
