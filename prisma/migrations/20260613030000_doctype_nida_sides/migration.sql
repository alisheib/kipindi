-- KYC documents are captured as NIDA front / NIDA back / selfie, but the
-- DocType enum only had NIDA / PASSPORT / DRIVER_LICENSE / VOTER_CARD / SELFIE.
-- Persisting a NIDA_FRONT / NIDA_BACK document therefore failed on Postgres
-- (invalid enum value) — the in-memory dev store hid it. Add the two values.
-- ADD VALUE IF NOT EXISTS is idempotent and (PG12+) safe outside a txn block.
ALTER TYPE "DocType" ADD VALUE IF NOT EXISTS 'NIDA_FRONT';
ALTER TYPE "DocType" ADD VALUE IF NOT EXISTS 'NIDA_BACK';
