-- Make BonusGrant.sourceRef idempotency cross-instance safe: a unique index so a
-- concurrent second credit with the same sourceRef fails at the DB instead of
-- double-crediting. NULLs are allowed and non-conflicting in Postgres, so grants
-- without a sourceRef (manual admin grants) are unaffected.

-- Drop the plain index (the unique index below supersedes it).
DROP INDEX IF EXISTS "BonusGrant_sourceRef_idx";

-- CreateIndex (unique)
CREATE UNIQUE INDEX "BonusGrant_sourceRef_key" ON "BonusGrant"("sourceRef");
