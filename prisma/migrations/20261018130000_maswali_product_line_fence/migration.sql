-- MASWALI MILLIONEA — S7 · the database refuses to move a market into or out of the Millionea line (MASWALI-BUILD S7; MB-01,
-- the fence; test:maswali-adversarial PL.3).
--
-- A Millionea week IS a "PredictionMarket" row with "productLine" = 'MASWALI', and every generic door, read and settlement
-- routes a row by that line: a week re-lined as a poll would be sold as a one-sided Yes/No stake on its own pool, and a
-- poll re-lined as a week would meet the ticket arm. The application never writes the line after creation — the
-- Postgres store's upsert leaves it out of its UPDATE arm, its stamp refuses it, and the memory twin keeps a week's line
-- (S7) — so this guards the one way left: a statement written by hand against the table. A BEFORE UPDATE trigger, fired
-- only when "productLine" is a target of the UPDATE (the pool increments every bet makes never name it), refuses a change
-- that moves a row to or from 'MASWALI'. Every other line change stands as before ('MARKET', 'UPDOWN' and the rest).
--
-- Hand-written, additive, re-runnable (AGENTS.md §5): CREATE OR REPLACE FUNCTION, and the trigger created only when it is
-- absent (PostgreSQL 14+; production runs 18), so a replay leaves exactly one of each and takes no table lock once the
-- trigger stands. Nothing existing is altered and no row is read. ⛔ No DROP TRIGGER: it would take an ACCESS EXCLUSIVE
-- lock on the busiest table, queueing every read behind it.
-- ⛔ THE LOCK WAIT RETRIES INSIDE THIS FILE, as S2-BOOT-1 ruled for this table (`20260930200000_market_short_titles`).
--    The file runs at container boot (`start` is `prisma migrate deploy && next start`) while the old container still
--    takes bets. The trigger's create takes SHARE ROW EXCLUSIVE on "PredictionMarket": it waits for every open write (a
--    settlement may hold its lock up to 30 s, and an anti-wraparound vacuum does not yield), and while it waits the bets
--    queue behind it. A single failed wait (55P03) would leave a `_prisma_migrations` row that blocks EVERY later boot
--    (P3009). So each attempt waits at most 3 s, and the create retries up to 20 times, 1.5 s apart (about 90 s at worst,
--    inside the 300 s health check), holding no lock between attempts: a failed attempt rolls back its own subtransaction.
--    If it ever gives up: confirm the trigger is absent, run
--    `npx prisma migrate resolve --rolled-back 20261018130000_maswali_product_line_fence` against production, and redeploy.
-- Recovery: `db:backup` exports public user functions and triggers from the catalog after the data. Its manifest
-- fingerprints their definitions and enabled state; `db:verify-backup` compares the restored catalog and refuses
-- an artifact missing this fence. `verify:backup-schema` plants a trigger omission to prove that refusal.
BEGIN;
SET LOCAL lock_timeout = '3s';

CREATE OR REPLACE FUNCTION "maswali_product_line_fence"() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."productLine" IS DISTINCT FROM OLD."productLine"
     AND (OLD."productLine" = 'MASWALI' OR NEW."productLine" = 'MASWALI') THEN
    RAISE EXCEPTION 'PredictionMarket_productLine_maswali_fence: market % cannot move into or out of the Millionea line', OLD."id"
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE
  attempt int := 0;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = '"PredictionMarket"'::regclass
             AND tgname = 'PredictionMarket_productLine_maswali_fence') THEN
    RETURN;
  END IF;
  LOOP
    BEGIN
      CREATE OR REPLACE TRIGGER "PredictionMarket_productLine_maswali_fence"
        BEFORE UPDATE OF "productLine" ON "PredictionMarket"
        FOR EACH ROW EXECUTE FUNCTION "maswali_product_line_fence"();
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
