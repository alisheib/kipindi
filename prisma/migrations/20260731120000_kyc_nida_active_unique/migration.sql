-- "One NIDA, one account" is the whole identity control (docs/IDENTITY-POLICY.md:
-- format + uniqueness, no authority check). Until now it was an application-level
-- read-then-write with no lock: `findActiveByNida` then `upsert`, unserialised
-- across users. PROVEN defeated by scripts/load/s14-kyc-nida-race.mts — two OS
-- processes submitting the same national ID for two different users both passed,
-- leaving 2 active submissions holding one NIDA.
--
-- A REJECTED submission deliberately frees the number (kyc-service.ts:116 excludes
-- it), so the constraint must be PARTIAL. The Prisma DSL cannot express a partial
-- unique index, so it lives here as raw SQL; prisma/schema.prisma carries a note.
--
-- IF NOT EXISTS is load-bearing: on production this index is created BY HAND with
-- CREATE UNIQUE INDEX CONCURRENTLY (no ACCESS EXCLUSIVE lock on a live table),
-- because Prisma wraps migrations in a transaction and CONCURRENTLY cannot run in
-- one. This statement is then a no-op on the next deploy.
CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_nidaNumber_active_key"
    ON "KycSubmission" ("nidaNumber")
    WHERE "nidaNumber" IS NOT NULL AND status <> 'REJECTED';
