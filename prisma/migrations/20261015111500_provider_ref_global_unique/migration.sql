-- S9: webhook, return and reconcile reads use a bare providerRef across all providers.
-- Production read-only preflight on 2026-10-15 found zero duplicate non-null references.
-- Refuse duplicates globally; PostgreSQL permits multiple NULLs in this unique index.
-- Deploy only after repeating qa:provider-ref-uniqueness against the release target.
-- Prisma 6 PostgreSQL migrations are not implicitly wrapped. Use an explicit
-- transaction so SET LOCAL bounds the index statement's lock wait; CREATE INDEX
-- CONCURRENTLY is unavailable inside this transaction. A busy table causes the
-- migration to fail visibly rather than block money writes indefinitely.
BEGIN;
SET LOCAL lock_timeout = '3s';
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_providerRef_key" ON "Transaction"("providerRef");
COMMIT;
