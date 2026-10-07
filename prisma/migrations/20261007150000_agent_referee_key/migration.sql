-- U33r · AgentRefereeKey — the agent-referee exclusion (Q8; COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone
-- with a phone — consent is not a condition (the owner's FINAL rule), and his approvals given in the session"). Every
-- referee already promised "we never contact you for marketing" (/legal/privacy §9) stays excluded: each Tanzanian mobile
-- number a promised referee's contact leads to is kept here as a KEYED HASH, and the send gate refuses a number whose key
-- is held (consent.ts, step 1b, reason `agent_referee`).
--
-- ⛔ THE KEY AND NOTHING ELSE (the U33r review's MAJOR-1, 2026-10-07): one column, the primary key. No instant of any kind —
-- when a referee was named or when a row was written — because an applicant's `refereeConsentAt`, joined on an instant,
-- would link a referee's key back to the applicant who named them. Whether a referee was given the old promise is decided
-- by the WRITER when it writes (referee-exclusion.ts); only a promised referee is ever written.
--
-- HAND-WRITTEN AND EXPAND-ONLY. The one statement below creates one TABLE and its primary key. Nothing is altered or
-- removed, no enum is created or extended (55P04 never arises), and no statement names an object another lane owns: the
-- table carries no foreign key at all — on purpose, so no link to an application or an applicant exists. ⚠️ This file
-- has never been applied anywhere, so it was rewritten in place for MAJOR-1 rather than followed by a second migration.
--
-- ⭐ SAFE WHILE THE OLD BUILD RUNS (§4.4's rule). Nothing in the running code reads or writes this table: the old Prisma
-- client does not know it, and the first writer (`setReferees`, through referee-exclusion.ts) and the first reader (the
-- gate) ship in the same commit as this file — the gate's read of an EMPTY table answers "not a referee", which is exactly
-- the old build's behaviour, until the rows below are written.
--
-- ⛔ THE ROWS THAT PREDATE IT ARE NOT WRITTEN HERE. The key is an HMAC under `OTP_PEPPER`, which lives in the application,
-- never in Postgres — computing it in SQL would commit a production secret to git (the precedent:
-- 20260821140000_kyc_identity_fingerprint and scripts/ops-backfill-id-fingerprints.mts). So every existing application's
-- referees are keyed by the ops door, run through Railway after this file is applied:
--     railway run --service 50pick npm run ops:marketing-referee-keys -- status
--     railway run --service 50pick npm run ops:marketing-referee-keys -- backfill
-- ⛔ THE WINDOW: until it has run AND its counts are recorded in the code (`REFEREE_KEYS_ON_PRODUCTION`, outreach-record.ts)
-- with nothing missing and nothing unreadable, licence outreach and the live-send switch both refuse to open (the fifth
-- opening check, `referee_keys`). It runs BEFORE either opens, BEFORE `REFEREE_NEW_WORDS_LIVE_AT` is set (a save after
-- the cutoff re-stamps `refereeConsentAt` and would hide an old referee from a later backfill), and AGAIN after any
-- rollback to a build without U33r and the redeploy that follows (that build keyed nobody it named).
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` from the migrations sweeps in every object `schema.prisma` does not
-- declare (the trigram indexes, every time — read the head of 20260928170000_marketing_contact_book). This file is the diff
-- between the two DATAMODELS (the schema before and after this unit), measured offline: exactly this one statement. The
-- evidence for it is `test:dal-parity` §28.schema (the model, this file and the stored shape name one column) and
-- `npm run db:probe-referee-keys` (every migration applied from EMPTY on a scratch Postgres, the table read back by SQL,
-- and the same scenario on both twins, answer for answer).
--
-- ⛔ NO CONCURRENTLY, AND NO SECOND INDEX: `prisma migrate deploy` runs each file in ONE transaction, and the primary key
-- already serves the gate's read by key and its bulk read by a set of keys.

-- CreateTable
CREATE TABLE "AgentRefereeKey" (
    "refereeKey" TEXT NOT NULL,

    CONSTRAINT "AgentRefereeKey_pkey" PRIMARY KEY ("refereeKey")
);
