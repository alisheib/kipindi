-- Persist the append-only audit chain to Postgres so history survives
-- restarts/deploys. The in-memory ring is now a write-through cache, rehydrated
-- from this table on boot by walking the prevHash links.

-- Audit logs must never fail to write (or be cascade-deleted) because the actor
-- User row is missing or was erased under a GDPR/DSAR request. Drop the FK —
-- actorId stays as a plain indexed string.
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_actorId_fkey";

-- HMAC chain columns. prevHash links each row to the previous entry's entryHash
-- ("GENESIS" for the first). entryHash is the HMAC over the row and is globally
-- unique, which also gives insert idempotency if a write is ever retried.
-- (entryHash gets a transient default only so the ADD COLUMN is safe on a
--  non-empty table; it is immediately dropped to match the schema.)
ALTER TABLE "AuditLog" ADD COLUMN "prevHash" TEXT NOT NULL DEFAULT 'GENESIS';
ALTER TABLE "AuditLog" ADD COLUMN "entryHash" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AuditLog" ALTER COLUMN "entryHash" DROP DEFAULT;

CREATE UNIQUE INDEX "AuditLog_entryHash_key" ON "AuditLog"("entryHash");
