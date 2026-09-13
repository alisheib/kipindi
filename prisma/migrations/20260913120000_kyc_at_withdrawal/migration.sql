-- IDENTITY AT WITHDRAWAL ONLY — the schema half (owner ruling, Ali, 2026-09-13).
-- docs/COMPLIANCE-DECISIONS.md 2026-09-13 is the record; this file carries the mechanics.
--
-- ⛔ EVERY STATEMENT IS RE-RUNNABLE. This is applied from the operator's machine with
-- `prisma migrate deploy` BEFORE the push, so the deploy's own `migrate deploy` is a no-op
-- that cannot take the site down; CI replays each migration once more on an empty database.
-- ⚠️ EXPAND-ONLY, so the container still serving during the deploy keeps working: a new
-- column with a default (its generated client simply does not name it), a partial index that
-- is STRICTER than before (a conflict surfaces as the ordinary duplicate refusal), and a
-- status normalisation on a status nothing gates on.

-- ── 1 · Wallet.freezeReasons ─────────────────────────────────────────────────────────────
-- WHY a wallet is frozen, one entry per independent hold. Until today self-exclusion was the
-- only writer of FROZEN; from today a FINAL identity refusal and an officer can freeze too, and
-- each lifter must remove only its own hold or re-opening a served exclusion would silently
-- unfreeze a wallet an officer froze for a sanctions refusal.
ALTER TABLE "Wallet" ADD COLUMN IF NOT EXISTS "freezeReasons" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- A wallet frozen before this column existed was frozen by self-exclusion — the only writer
-- there was. Record that, so the one lifter that used to unfreeze it still can.
UPDATE "Wallet"
   SET "freezeReasons" = ARRAY['SELF_EXCLUSION']::TEXT[]
 WHERE status = 'FROZEN'
   AND cardinality("freezeReasons") = 0;

-- ── 2 · S16 — a FINAL refusal no longer frees the document number ─────────────────────────
-- Both one-document-one-account indexes were partial on `status <> 'REJECTED'`, deliberately,
-- so a real citizen is not locked out by a bad photo (docs/IDENTITY-POLICY.md). With money now
-- played before identity is checked, that became a laundering shape: a minor refused UNDERAGE
-- while holding a balance, their document released, and an adult accomplice submitting the same
-- document on a second account to withdraw. A refusal on one of the three FINAL codes now keeps
-- the number held; a recoverable refusal (BLURRY_DOC, EXPIRED_ID, DETAILS_MISMATCH, OTHER)
-- still frees it. The fast-path reads in `prisma-dal.ts` and `store.ts` ask the same question.
-- ⚠️ Not CONCURRENTLY: `migrate deploy` wraps this file in a transaction, and neither
-- CREATE nor DROP INDEX CONCURRENTLY can run in one. The table held 18 rows on the day.
DROP INDEX IF EXISTS "KycSubmission_idType_idNumber_active_key";
CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idType_idNumber_active_key"
    ON "KycSubmission" ("idType", "idNumber")
    WHERE "idNumber" IS NOT NULL
      AND (status <> 'REJECTED' OR "rejectReason" IN ('UNDERAGE', 'SANCTIONED', 'DUPLICATE_IDENTITY'));

DROP INDEX IF EXISTS "KycSubmission_idFingerprint_active_key";
CREATE UNIQUE INDEX IF NOT EXISTS "KycSubmission_idFingerprint_active_key"
    ON "KycSubmission" ("idFingerprint")
    WHERE "idFingerprint" IS NOT NULL
      AND (status <> 'REJECTED' OR "rejectReason" IN ('UNDERAGE', 'SANCTIONED', 'DUPLICATE_IDENTITY'));

-- ── 3 · User.status PENDING_KYC → ACTIVE ─────────────────────────────────────────────────
-- Set at registration until today and gated NOTHING (sign-in refuses only suspended, closed
-- and self-excluded accounts). From today it would label every ordinary, playing customer as
-- pending something. New accounts are created ACTIVE; the rows already written are normalised
-- here. The enum member stays — removing one is its own migration, and history must render.
-- Measured on production before this ran: 10 rows.
UPDATE "User" SET status = 'ACTIVE' WHERE status = 'PENDING_KYC';
