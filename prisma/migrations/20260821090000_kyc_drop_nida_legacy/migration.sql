-- THE CONTRACT STEP — the deprecated NIDA mirror leaves the DATABASE.
--
-- Owner record: docs/COMPLIANCE-DECISIONS.md (2026-08-20). This is the second half of
-- the identity-tuple change that shipped as EXPAND ONLY in
-- 20260820120000_kyc_identity_document: `nidaNumber`, `nidaVerifiedAt` and the two
-- indexes on that column were kept for one release so a rolling deploy's previous
-- container could keep serving KYC reads.
--
-- 🔴 THE ORDERING IS THE WHOLE SAFETY ARGUMENT, AND IT IS THE MIRROR IMAGE OF THE
-- EXPAND STEP. `package.json`'s `start` is
-- `prisma migrate deploy && … && next start`, so this DDL commits inside the NEW
-- container BEFORE it serves, while the OLD one is still taking traffic. `postinstall`
-- runs `prisma generate`, which bakes the column list from prisma/schema.prisma, and
-- Prisma selects every scalar column on a findFirst with no explicit select. So:
--
--   * the release BEFORE this one removed the fields from schema.prisma and every
--     layer, with NO DDL — after it, no deployed generated client names the columns;
--   * this release drops the columns, and neither generation of client selects them.
--
-- ⛔ Shipping both halves together would have dropped a column the previously-deployed
-- container still names in every KYC SELECT. That is not "three KYC pages": `createSession`
-- calls `db.kyc.findByUserId` on all three login paths (auth-service.ts:353, :911, :952),
-- so it is SIGN-IN, PLATFORM-WIDE, for the length of the switch — and /api/health never
-- touches KycSubmission, so nothing would have reported it.
--
-- ⛔ NO `CONCURRENTLY` ANYWHERE IN THIS FILE. `prisma migrate deploy` wraps a migration
-- in a transaction and neither CREATE INDEX CONCURRENTLY nor DROP INDEX CONCURRENTLY can
-- run inside one. Nothing here needs it: dropping a NULLABLE column is a catalog-only
-- change with no table rewrite, so the ACCESS EXCLUSIVE lock is held for microseconds on
-- a table of this size. (The session-52 note asking for a hand-applied
-- `CREATE UNIQUE INDEX CONCURRENTLY` first was describing the EXPAND step: that index,
-- `KycSubmission_idType_idNumber_active_key`, already exists. This file creates nothing.)
--
-- ⛔ EVERY STATEMENT IS `IF EXISTS`. Pre-applying a migration by hand before pushing is
-- normal practice in this repo (see 20260731120000's commit body), and CI replays each
-- migration exactly once against a fresh database — so a file that is not re-runnable is
-- GREEN in CI and fatal on production, where it would abort the transaction, take
-- `migrate deploy` down with it, and stop `next start` from ever running.

-- 1 · RE-BACKFILL, FIRST, IN THE SAME TRANSACTION AS THE DROP.
--
-- The expand migration's backfill was exhaustive AT THE TIME because it created
-- `idNumber` in the same file, so every row had it NULL. But the code that shipped
-- BEFORE 42680d1e wrote `nidaNumber` with no `idType`/`idNumber` at all — so any
-- identity step served by the previous container during that rolling deploy, or after a
-- rollback, produced a row held ONLY by the legacy column and invisible to the tuple.
-- Dropping the column without this line would destroy that player's identity number and
-- silently free a national ID that is in fact in use.
--
-- ⚠️ COALESCE on idVerifiedAt, not assignment: a value written since must win.
UPDATE "KycSubmission"
   SET "idType"       = 'NIDA',
       "idNumber"     = "nidaNumber",
       "idVerifiedAt" = COALESCE("idVerifiedAt", "nidaVerifiedAt")
 WHERE "nidaNumber" IS NOT NULL
   AND "idNumber" IS NULL;

-- 2 · THE INDEXES, EXPLICITLY AND BEFORE THE COLUMN.
--
-- `DROP COLUMN` cascades to every index that includes the column, so these two are
-- redundant — deliberately. Named here they appear in the audit trail of what this
-- migration removed, instead of vanishing as a side effect. ⛔ And they must come
-- BEFORE the DROP COLUMN: a `DROP INDEX` placed after it fails with "does not exist"
-- unless it says IF EXISTS, and in one transaction that aborts the whole migration.
--
--   * KycSubmission_nidaNumber_active_key — the PARTIAL UNIQUE index that was
--     "one NIDA, one account" from 2026-07-31. Its replacement,
--     KycSubmission_idType_idNumber_active_key, spans all four documents and has
--     been live since 2026-08-20. ⭐ FROM THIS MIGRATION ON IT IS THE SOLE
--     ENFORCEMENT of that control: `test:kyc` §2d proves it at service level for a
--     NIDA *and* for a passport, including the `status <> 'REJECTED'` half, because
--     the redundancy that used to cover a NIDA is gone.
--   * KycSubmission_nidaNumber_idx — the plain lookup index from 2026-06-14,
--     superseded by @@index([idType, idNumber]).
DROP INDEX IF EXISTS "KycSubmission_nidaNumber_active_key";
DROP INDEX IF EXISTS "KycSubmission_nidaNumber_idx";

-- 3 · THE COLUMNS.
ALTER TABLE "KycSubmission" DROP COLUMN IF EXISTS "nidaVerifiedAt";
ALTER TABLE "KycSubmission" DROP COLUMN IF EXISTS "nidaNumber";
