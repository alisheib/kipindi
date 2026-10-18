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
-- Hand-written, additive, re-runnable (AGENTS.md §5): CREATE OR REPLACE FUNCTION, and the trigger dropped IF EXISTS and
-- created again in the same transaction, so a replay leaves exactly one. Nothing existing is altered and no row is read.
-- CREATE TRIGGER takes a brief SHARE ROW EXCLUSIVE lock on "PredictionMarket"; the lock timeout makes a busy table fail
-- the apply fast rather than queue the bets behind it.
-- ⚠️ `db:backup` rebuilds the schema from `prisma migrate diff` and the catalog's indexes and constraints, which do not
--    include functions or triggers: a database restored from it lacks this fence until this file is applied to it again.
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

DROP TRIGGER IF EXISTS "PredictionMarket_productLine_maswali_fence" ON "PredictionMarket";
CREATE TRIGGER "PredictionMarket_productLine_maswali_fence"
  BEFORE UPDATE OF "productLine" ON "PredictionMarket"
  FOR EACH ROW EXECUTE FUNCTION "maswali_product_line_fence"();

COMMIT;
