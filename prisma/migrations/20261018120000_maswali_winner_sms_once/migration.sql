-- MASWALI MILLIONEA — ONE WINNER SMS PER PLAYER AND WEEK, ACROSS PROCESSES (MASWALI-BUILD S6, review round 3 A5, round 4
-- L9, round 5 MEDIUM 8; MB-93, OD-25).
--
-- The winner's one service SMS rides its own target ("MaswaliWinner", "<weekId>:<userId>"), and the row the batch writes
-- BEFORE its request is that message's reservation: with this index, a second process's row for the same target fails its
-- INSERT, so its batch sends nothing. Both store twins write such a row with a plain INSERT — never ON CONFLICT DO NOTHING,
-- which would drop it silently while its message still went (`src/lib/sms-targets.ts`). Every other target type is
-- untouched: the index covers only rows of this one type.
--
-- Hand-written, additive, re-runnable (AGENTS.md §5): a guard, then one CREATE UNIQUE INDEX IF NOT EXISTS, each attempt
-- retried as one. It is partial, so `schema.prisma` cannot express it (as "MaswaliCycle_one_open_per_visibility_key" before
-- it). Nothing existing is altered. No production row can collide: Millionea is dark there, and no "MaswaliWinner" row
-- exists.
-- ⛔ THE GUARD (round 4 L9, round 5 MEDIUM 8) fails first, in words, and builds nothing:
--   · two rows for one winner target (two messages already sent to one winner) would fail the build on a bare unique
--     violation — keep those rows' delivery records, remove all but each target's first row, and run it again;
--   · a relation of this index's name that is not this file's index — not a valid unique index on "SmsMessage" over
--     ("targetType", "targetId") WHERE "targetType" = 'MaswaliWinner', read from `pg_get_indexdef` (round 6, L5): a build
--     stopped outside this file, or one made by hand — would be kept silently by IF NOT EXISTS: drop it
--     (`DROP INDEX "SmsMessage_maswali_winner_target_key";`) and run it again.
-- ⚠️ WHAT IT COSTS "SmsMessage" (round 5, MEDIUM 8). The build is ONE SCAN of the table (the index holds only this type's
--   rows, but every row is read to find them), under a SHARE lock held for the whole build — CONCURRENTLY cannot run
--   inside this file's transaction — so every SMS write, a login or withdrawal code's among them, waits for that scan.
--   While an attempt waits for the lock (at most 3 s, `lock_timeout`), the SMS writes that arrive after it queue behind
--   it; between attempts it holds nothing. ⏳ The build's time is the table's size: the lead measures the production table
--   READ-ONLY before the merge
--   (`SELECT pg_size_pretty(pg_total_relation_size('"SmsMessage"')), count(*) FROM "SmsMessage";`).
-- ⛔ THE LOCK WAIT RETRIES INSIDE THIS FILE (the S2-BOOT-1 shape, `20260930200000_market_short_titles`): it runs at
--   container boot (`prisma migrate deploy`), where one missed lock would fail the boot — and a failed migration leaves a
--   `_prisma_migrations` row that blocks every later boot (P3009). So each attempt waits at most 3 s, and the whole thing
--   retries up to 20 times, 1.5 s apart — about 90 s at worst (20 × 4.5 s) — before it gives up. A failed attempt rolls
--   back whole, its guard's reads with it.
-- RECOVERY, if it gives up or the guard refuses: clear the cause (the rows or the relation above, or a busy moment), run
--   `npx prisma migrate resolve --rolled-back 20261018120000_maswali_winner_sms_once` against the target, then redeploy.
-- Prisma 6 PostgreSQL migrations are not wrapped by Prisma: the explicit transaction is what SET LOCAL bounds.
BEGIN;
SET LOCAL lock_timeout = '3s';

DO $$
DECLARE
  attempt int := 0;
BEGIN
  LOOP
    BEGIN
      IF EXISTS (
        SELECT 1 FROM "SmsMessage"
        WHERE "targetType" = 'MaswaliWinner' AND "targetId" IS NOT NULL
        GROUP BY "targetId"
        HAVING COUNT(*) > 1
      ) THEN
        RAISE EXCEPTION 'SmsMessage holds more than one MaswaliWinner row for one target, so the one-message index cannot be built: see the header of migration 20261018120000_maswali_winner_sms_once';
      END IF;
      IF EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN pg_index i ON i.indexrelid = c.oid
        WHERE c.relname = 'SmsMessage_maswali_winner_target_key' AND n.nspname = current_schema()
          AND NOT COALESCE(i.indisvalid AND i.indisunique AND i.indrelid = '"SmsMessage"'::regclass
            AND pg_get_indexdef(c.oid) LIKE '%("targetType", "targetId") WHERE ("targetType" = ''MaswaliWinner''::text)', false)
      ) THEN
        RAISE EXCEPTION 'A relation named SmsMessage_maswali_winner_target_key exists and is not this file''s index, so it would be kept silently: see the header of migration 20261018120000_maswali_winner_sms_once';
      END IF;
      CREATE UNIQUE INDEX IF NOT EXISTS "SmsMessage_maswali_winner_target_key" ON "SmsMessage"("targetType", "targetId")
        WHERE "targetType" = 'MaswaliWinner';
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

COMMIT;
