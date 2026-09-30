-- THE VODACOM PLAN S3b · THE ORIGIN OF A DEPOSIT (2026-10-01, docs/VODACOM-PLAN.md §0f).
--
-- HAND-WRITTEN AND EXPAND-ONLY. One nullable TEXT column on "Transaction", no default, no backfill, no index:
--   * "origin" -- "low_balance" when a deposit was started from a not-enough-money state, else NULL. Written once when
--     the deposit row is created; read when the deposit is CONFIRMED to count the journey funnel's "short -> deposit".
--
-- A nullable, default-less ADD COLUMN is a catalogue-only change, but it still takes ACCESS EXCLUSIVE on the table
-- every bet and deposit writes; the lock timeout makes a stuck lock fail this migration (55P03) instead of stalling them.
-- Never generated with `prisma migrate diff` (it would drop the raw-SQL trigram indexes).

SET LOCAL lock_timeout = '3s';
-- ⛔ THE LOCK WAIT RETRIES INSIDE THIS FILE (the S2 shape). The file runs at container boot; a single 3 s wait failing
-- would leave a failed `_prisma_migrations` row that blocks every later boot. So each attempt waits at most 3 s and the
-- whole thing retries up to 20 times, 1.5 s apart, before it gives up. Recovery, if it ever does:
-- `npx prisma migrate resolve --rolled-back <this folder>` against production, then redeploy.

DO $$
DECLARE
  attempt int := 0;
BEGIN
  LOOP
    BEGIN
      ALTER TABLE "Transaction"
        ADD COLUMN IF NOT EXISTS "origin" TEXT;
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
