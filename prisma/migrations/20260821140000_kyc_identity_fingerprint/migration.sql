-- ONE DOCUMENT, ONE ACCOUNT — EXPRESSED ON A VALUE THAT SURVIVES ERASURE.
--
-- Owner record: docs/COMPLIANCE-DECISIONS.md (2026-08-21, item 3 + the 2026-08-21
-- implementation note). Ali's decision is that an erased national ID is replaced by a
-- KEYED HMAC OF ITSELF, never NULL, so that "the same document still hashes to the same
-- value and the index still rejects the second account".
--
-- 🔴 THE PART THAT DOES NOT FOLLOW, AND IS THE WHOLE REASON THIS FILE EXISTS.
-- A unique index compares STORED STRINGS. Put the hash in `idNumber` and the erased row
-- holds `a3f9…`; the next person presenting that same document writes the RAW number,
-- `19900101…`; the two are different strings, "KycSubmission_idType_idNumber_active_key"
-- sees no duplicate, and one human now holds two accounts. Hashing IN PLACE is the same
-- hole as nulling — it just looks safe. The decision is right and it needs a column: the
-- collision has to happen on a value BOTH rows carry.
--
-- So `idFingerprint` = HMAC(OTP_PEPPER, "idfp:v1:<idType>:<normalised idNumber>"), written
-- at the identity step for EVERY submission (`kyc-service.ts`), carried past erasure
-- untouched, and unique-indexed below with the EXACT predicate of the tuple index.
--
-- ⛔ EXPAND ONLY — nothing is dropped, renamed or backfilled destructively, so this is
-- safe to ship in one release. The direction matters and it is the MIRROR of
-- 20260821090000's rule: `start` is `prisma migrate deploy && … && next start`, so this
-- DDL commits inside the NEW container before it serves, while the OLD container — whose
-- generated client does not name `idFingerprint` — is still taking traffic and is
-- unaffected by a column it never selects. Adding is safe in one release; only DROPPING
-- needs two.
--
-- ⛔ NO `CONCURRENTLY`. `prisma migrate deploy` wraps a migration in a transaction and
-- CREATE INDEX CONCURRENTLY cannot run inside one (25001), which would take the boot with
-- it. Nothing here needs it: `KycSubmission` holds 72 active rows / 360 kB after the F-02
-- move to R2 (measured read-only on production 2026-08-21 — 67 is the KycDocument count from
-- F-02 and a different table), so the ACCESS EXCLUSIVE lock is held for microseconds.
-- ⭐ The same probe returned **0** duplicate active `(idType, idNumber)` groups, so the UNIQUE
-- index in statement 3 cannot fail on creation. `IF NOT EXISTS` is still on
-- every statement so the index MAY be pre-created by hand with CONCURRENTLY on production
-- first — the practice recorded in 20260731120000's commit body — and this file then
-- becomes a no-op.
--
-- ⛔ EVERY STATEMENT IS IF NOT EXISTS. CI replays each migration exactly once against a
-- fresh database, so a file that is not re-runnable is GREEN in CI and fatal on
-- production, where it aborts the transaction and `next start` is never reached.

-- 1 · THE COLUMN. Nullable with no default: a catalog-only change, no table rewrite.
--
-- ⚠️ NOT BACKFILLED, AND THAT IS DELIBERATE — it cannot be. The value is a keyed HMAC and
-- the key (`OTP_PEPPER`) lives in the application, not in Postgres; putting it in a
-- migration file would commit a production secret to git. Nor is a backfill needed for
-- correctness: while a row still holds its RAW `idNumber`, the tuple index is doing the
-- work, and `anonymizeClosedAccount` computes the fingerprint from that raw number at the
-- moment it destroys it. `scripts/ops-backfill-id-fingerprints.mts` fills the legacy rows
-- in for hygiene, so the invariant "every active submission carries one" becomes true and
-- testable.
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "idFingerprint" TEXT;

-- 2 · The ordinary lookup index, mirroring @@index([idFingerprint]) in schema.prisma.
CREATE INDEX IF NOT EXISTS "KycSubmission_idFingerprint_idx"
    ON "KycSubmission" ("idFingerprint");

-- 3 · 🔴 THE CONTROL.
--
-- ⛔ PARTIAL, with the SAME predicate as "KycSubmission_idType_idNumber_active_key". Not
-- "similar" — the same. A REJECTED submission deliberately frees the document
-- (kyc-service.ts excludes it from the duplicate read, and always has), so a total unique
-- index here would permanently burn an identity document on any rejection AND would make
-- the two enforcement paths disagree about what a duplicate is.
--
-- ⚠️ Creation FAILS if duplicates already exist. It cannot find any: the column is created
-- NULL in statement 1 and this migration writes no values, so the predicate matches zero
-- rows today. From then on a fingerprint duplicate is possible only where a tuple
-- duplicate is — the HMAC is over the pair, so equal fingerprints mean equal pairs — and
-- that has been impossible since 2026-08-20.
CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idFingerprint_active_key"
    ON "KycSubmission" ("idFingerprint")
    WHERE "idFingerprint" IS NOT NULL AND status <> 'REJECTED';
