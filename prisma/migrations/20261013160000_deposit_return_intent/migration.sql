-- S9 additive persistence: docs/design-system/v5-2026-09-29-simplified-journey/S9-PLAN.md WP2.
-- Nullable, create-only metadata. No default, historical backfill, enum or destructive rewrite.
-- The server validates the small versioned deposit envelope before using it; no URL query bag or bet key is stored.
-- Both tables receive live money writes. Each individual metadata-lock wait is limited to 3s;
-- a failed attempt rolls both additions back before sleeping/retrying. The local setting is inside the DO's
-- transaction, so it also applies when a migration runner sends this as one standalone statement.
-- LOCK ORDER (S9 root review M1): "Position" FIRST, then "Transaction" - the bet path's own write order (buyPosition
-- writes the Position row before the stake's Transaction row) and the order 20260916150100_house_bot_markers takes.
-- Taken the other way round, a bet holding "Position" and this file holding "Transaction" each wait for the other;
-- probed on PostgreSQL 18.3, either this migration or the bet died with 40P01. A deadlock is now retried like a lock
-- timeout: the sub-block's rollback releases what it took. The residual cycle is a bet whose daily-loss-limit read
-- holds "Transaction" before it writes "Position"; this file is then the first waiter, so the deadlock detector picks
-- it, and the retry absorbs it.
-- Recovery, if it ever gives up (20 attempts): its failed _prisma_migrations row blocks every later deploy until
--   npx prisma migrate resolve --rolled-back 20261013160000_deposit_return_intent
-- is run against production; the file is re-runnable (IF NOT EXISTS), so the next deploy then applies it cleanly.
DO $$
DECLARE
  attempt integer := 0;
BEGIN
  PERFORM set_config('lock_timeout', '3s', true);
  LOOP
    BEGIN
      ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;
      EXIT;
    EXCEPTION WHEN lock_not_available OR deadlock_detected THEN
      attempt := attempt + 1;
      IF attempt >= 20 THEN
        RAISE;
      END IF;
      PERFORM pg_sleep(1.5);
    END;
  END LOOP;
END
$$;
