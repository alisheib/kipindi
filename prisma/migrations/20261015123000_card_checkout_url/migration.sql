-- Additive, nullable recovery handle for a Selcom Card order. Existing transactions need no backfill.
BEGIN;
SET LOCAL lock_timeout = '3s';
ALTER TABLE "Transaction" ADD COLUMN "cardCheckoutUrl" TEXT;
COMMIT;
