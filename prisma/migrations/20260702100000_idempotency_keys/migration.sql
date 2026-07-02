-- AlterTable: Add client-generated idempotency keys to prevent double-submit on 2G
-- Nullable so existing rows and internal txns are unaffected.
-- Unique index allows fast lookup + DB-level dedup (Postgres allows multiple NULLs in unique).

ALTER TABLE "Transaction" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

ALTER TABLE "Position" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "Position_idempotencyKey_key" ON "Position"("idempotencyKey");
