-- S9 additive persistence: docs/design-system/v5-2026-09-29-simplified-journey/S9-PLAN.md WP2.
-- Nullable, create-only metadata. No default, historical backfill, enum or destructive rewrite.
-- The server validates the small versioned deposit envelope before using it; no URL query bag or bet key is stored.
-- Both tables receive live money writes. Each individual metadata-lock wait is limited to 3s;
-- a failed attempt rolls both additions back before sleeping/retrying. The local setting is inside the DO's
-- transaction, so it also applies when a migration runner sends this as one standalone statement.
DO $$
DECLARE
  attempt integer := 0;
BEGIN
  PERFORM set_config('lock_timeout', '3s', true);
  LOOP
    BEGIN
      ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "pendingBet" JSONB;
      ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "origin" TEXT;
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
