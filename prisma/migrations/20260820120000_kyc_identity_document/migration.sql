-- FOUR WAYS TO PROVE WHO YOU ARE — one identity tuple, one unique index.
--
-- Owner decision (Ali, 2026-08-19): a player may prove identity with ANY ONE of
-- NIDA, passport, driving licence or voter's card. Until now `KycSubmission` held
-- exactly one identity number and it was NIDA-shaped, and the partial unique index
-- "KycSubmission_nidaNumber_active_key" — which IS the "one NIDA, one account" rule
-- from docs/IDENTITY-POLICY.md — knew only about that column.
--
-- 🔴 THE MISTAKE THIS MIGRATION EXISTS TO NOT MAKE. Adding `passportNumber`,
-- `licenceNumber` and `voterNumber` as three more columns would give one human FOUR
-- accounts, and — worse — a route AROUND a rejection: somebody blocked as
-- DUPLICATE_IDENTITY on their NIDA simply re-registers with their passport. So the
-- number moves into ONE tuple, ("idType", "idNumber"), and the unique index spans
-- the pair with the EXACT `WHERE` semantics of the index it supersedes.
--
-- ⛔ PARTIAL, because a REJECTED submission deliberately frees the number
-- (kyc-service.ts excludes it from the duplicate read, and always has). A total
-- unique index would permanently burn a national ID on any rejection.
--
-- ⚠️ EXPAND ONLY. `nidaNumber` / `nidaVerifiedAt` and their index are NOT dropped
-- here. Railway health-checks a new deployment while the OLD container is still
-- serving, and Prisma selects every scalar column — so dropping them in this
-- migration would 500 every KYC read on /profile/kyc, /wallet/withdraw and
-- /admin/kyc for the length of the switch, on an identity path. They are backfilled
-- into the pair below, mirrored by one write site, read by nothing, and dropped by
-- the contract migration recorded in docs/COMPLIANCE-DECISIONS.md (2026-08-20).

-- 1 · WHICH DOCUMENT. Deliberately its own enum: `DocType` names attachment SLOTS
--     and admits NIDA_FRONT and SELFIE, and an index is only as trustworthy as the
--     values its columns can hold.
DO $$ BEGIN
    CREATE TYPE "IdDocType" AS ENUM ('NIDA', 'PASSPORT', 'DRIVER_LICENSE', 'VOTER_CARD');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2 · THE TUPLE, plus the two facts that are per-document rather than per-number.
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idType"       "IdDocType";
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idNumber"     TEXT;
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idExpiry"     TIMESTAMP(3);
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idVerifiedAt" TIMESTAMP(3);

-- 3 · BACKFILL. Every existing submission proved identity with a NIDA, because that
--     was the only option the product offered. `idNumber` takes the number verbatim:
--     it is already 20 digits, so `normaliseIdNumber` (strip separators, uppercase)
--     is a no-op on it and the stored value is canonical either way.
--     ⛔ Guarded by `"idNumber" IS NULL` so a re-run cannot overwrite a value the
--     application has since written.
UPDATE "KycSubmission"
   SET "idType"       = 'NIDA',
       "idNumber"     = "nidaNumber",
       "idVerifiedAt" = "nidaVerifiedAt"
 WHERE "nidaNumber" IS NOT NULL
   AND "idNumber" IS NULL;

-- 4 · The ordinary lookup index, mirroring @@index([idType, idNumber]).
CREATE INDEX IF NOT EXISTS "KycSubmission_idType_idNumber_idx"
    ON "KycSubmission" ("idType", "idNumber");

-- 5 · 🔴 THE CONTROL. One document, one account — across ALL FOUR types.
--
-- IF NOT EXISTS is load-bearing: on production this index is created BY HAND with
-- CREATE UNIQUE INDEX CONCURRENTLY (no ACCESS EXCLUSIVE lock on a live table),
-- because Prisma wraps migrations in a transaction and CONCURRENTLY cannot run in
-- one. This statement is then a no-op on the next deploy.
--
-- ⚠️ Creation FAILS if duplicates already exist. Check first, exactly as the 2026-07-31
-- index required:
--   SELECT "idType", "idNumber", count(*) FROM "KycSubmission"
--    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED'
--    GROUP BY 1, 2 HAVING count(*) > 1;
-- A clean result is expected and is not luck: the backfill copies from a column that
-- has carried its own partial unique index with the same WHERE clause since
-- 2026-07-31, so the NIDA rows cannot contain a duplicate.
CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idType_idNumber_active_key"
    ON "KycSubmission" ("idType", "idNumber")
    WHERE "idNumber" IS NOT NULL AND status <> 'REJECTED';
