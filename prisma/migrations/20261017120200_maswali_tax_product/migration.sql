-- MASWALI MILLIONEA — step 3 of 3: a tax period can be locked for Millionea alone (MASWALI-BUILD S1).
--
-- @drops constraint:TaxPeriodLock_product_check · owner docs/TAX-REPORT.md
--
-- "TaxPeriodLock"."product" is checked against the report's product filter (src/lib/server/tax-report.ts
-- `ProductFilter`), which S0.5 widened to MASWALI. This widens the CHECK to match, and nothing else.
--
-- Re-runnable: the old CHECK is dropped IF EXISTS and the wider one added in the same transaction, so a replay drops
-- the wider one and adds it again. Every existing row is ALL, MARKET or UPDOWN and passes. The table is a handful of
-- rows, so the brief ACCESS EXCLUSIVE lock and the validating scan cost nothing.
--
-- ⛔ Widening the CHECK opens no door: until S6 builds the Millionea tax lines, the report REFUSES any period that
-- holds a Millionea book (tax-report-data.ts), so there is nothing to lock.
BEGIN;
SET LOCAL lock_timeout = '3s';

ALTER TABLE "TaxPeriodLock" DROP CONSTRAINT IF EXISTS "TaxPeriodLock_product_check";
ALTER TABLE "TaxPeriodLock" ADD CONSTRAINT "TaxPeriodLock_product_check" CHECK ("product" IN ('ALL', 'MARKET', 'UPDOWN', 'MASWALI'));

COMMIT;
