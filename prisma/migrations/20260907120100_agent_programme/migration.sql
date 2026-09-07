-- AGENT AFFILIATE PROGRAMME — step 2 of 3: types, columns, tables, backfills.
--
-- Every statement is re-runnable (`IF NOT EXISTS`, or a guarded DO block). Hand-applying
-- a migration before pushing is normal practice on this project, and CI replays each file
-- exactly once against a fresh database — so a file that is not re-runnable is green in CI
-- and fatal in production.
--
-- ⛔ NOTHING IS DROPPED HERE. `AffiliateAgent."tier"` left `schema.prisma` and every code
-- layer in this release with NO DDL — the EXPAND half of expand→contract. The column stays
-- in Postgres until the contract migration named in docs/AGENT-PROGRAMME.md §5, because
-- `postinstall: prisma generate` bakes the column list from the schema and the previously
-- deployed container is still SELECTing `tier` while this one boots.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1 · NEW ENUM TYPES
-- ─────────────────────────────────────────────────────────────────────────────
-- `CREATE TYPE` has no IF NOT EXISTS, so each is guarded. These are brand-new types,
-- not additions to existing ones, so they may be created and USED in this same
-- transaction — unlike the `ALTER TYPE … ADD VALUE` statements in the previous file.

DO $$ BEGIN
  CREATE TYPE "ReferralProgramme" AS ENUM ('PLAYER', 'AGENT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentApplicationStatus" AS ENUM (
    'DRAFT', 'INVITED', 'KYC_SUBMITTED', 'PAYMENT_PENDING', 'UNDER_REVIEW',
    'ADDITIONAL_INFO_REQUIRED', 'APPROVED', 'REJECTED', 'DECLINED', 'EXPIRED', 'REVOKED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentApplicationSource" AS ENUM ('SELF_SERVICE', 'OFFICER_INVITED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentDocType" AS ENUM (
    'CV', 'REQUEST_LETTER', 'SERIKALI_LETTER',
    'REFEREE_ONE_LETTER', 'REFEREE_ONE_ID',
    'REFEREE_TWO_LETTER', 'REFEREE_TWO_ID',
    'FEE_RECEIPT'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentRejectReason" AS ENUM (
    'INCOMPLETE_DOCUMENTS', 'DOCUMENT_NOT_LEGIBLE', 'UNSATISFACTORY_REFEREE',
    'DETAILS_MISMATCH', 'FEE_NOT_RECONCILED', 'STAFF_CONFLICT', 'OTHER',
    'SANCTIONED', 'IDENTITY_MISMATCH', 'FRAUD'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentFeeDisposition" AS ENUM ('NONE', 'WAIVED', 'COLLECTED', 'REFUND_DUE', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "AgentInvitationStatus" AS ENUM ('ISSUED', 'ACCEPTED', 'DECLINED', 'REVOKED', 'EXPIRED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2 · THE PROVENANCE STAMP ON `User` — and the backfill that makes it safe
-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 THE EXPLOIT THIS CLOSES. Until now the programme behind an attribution was DERIVED
-- at accrual from the referrer's CURRENT role. So a player could farm attributions for
-- free, buy AGENT status for TZS 100,000, and every one of those old binds would flip to
-- paying agent commission at the negotiated rate, on relationships nobody was vetted for.
-- The programme is now STAMPED at bind and never rewritten.

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recruitedProgramme" "ReferralProgramme";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recruitedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "recruitedByCode" TEXT;

-- ⭐ THE LOAD-BEARING STEP. Every existing attribution was created under the player promo:
-- that is a historical FACT, not a guess — nothing has ever assigned `UserRole.AGENT`, so
-- no agent-era attribution can exist yet. Backfilling makes the agent branch of the
-- resolver unreachable for legacy rows by construction rather than by a predicate.
-- ⛔ The column is deliberately NOT NOT-NULL: a user with no referrer has no programme.
-- The resolver coalesces NULL to PLAYER and never to AGENT.
UPDATE "User"
   SET "recruitedProgramme" = 'PLAYER',
       "recruitedAt"        = COALESCE("recruitedAt", "createdAt")
 WHERE "recruitedBy" IS NOT NULL
   AND "recruitedProgramme" IS NULL;

-- "list this agent's recruits" was a full table scan until the agent programme gave it a
-- page of its own (/admin/agents/[id], and the agent's own dashboard).
CREATE INDEX IF NOT EXISTS "User_recruitedBy_idx" ON "User"("recruitedBy");

-- ─────────────────────────────────────────────────────────────────────────────
-- 3 · `AffiliateAgent` — approvedAt becomes the ONE discriminator
-- ─────────────────────────────────────────────────────────────────────────────
-- 🔴 WHY `commissionPct` LOSES ITS DEFAULT. A row here is auto-minted for every player who
-- ever touched the referral surface, so the existence of a row proves nothing — and every
-- one of those rows carried a 5.00 rate nobody chose. Any "refuse when the rate is unset"
-- branch was therefore unreachable, and a single dropped conjunct in the resolver would
-- have turned the whole player base into 5% agents. NULL now means *no officer has priced
-- this partner*, and the agent branch REFUSES on it.

ALTER TABLE "AffiliateAgent" ALTER COLUMN "commissionPct" DROP NOT NULL;
ALTER TABLE "AffiliateAgent" ALTER COLUMN "commissionPct" DROP DEFAULT;

ALTER TABLE "AffiliateAgent" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
ALTER TABLE "AffiliateAgent" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "AffiliateAgent" ADD COLUMN IF NOT EXISTS "deactivatedAt" TIMESTAMP(3);
-- `toStoredAffiliate` has been reading `a.updatedAt ?? a.createdAt` against a column that
-- never existed, so every affiliate row has reported its creation time as its last update.
ALTER TABLE "AffiliateAgent" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ⭐ CLEAR THE RATE NOBODY CHOSE. Safe and correct: `approvedAt` is created in this very
-- statement block, so no row can be an approved agent yet, and nothing in the shipped code
-- reads `commissionPct` at all (the DAL never mapped it). After this, a non-null rate can
-- only have been written by an officer through `approveAgent` / `setAgentRate`.
UPDATE "AffiliateAgent" SET "commissionPct" = NULL WHERE "approvedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "AffiliateAgent_approvedAt_idx" ON "AffiliateAgent"("approvedAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- 4 · `ReferralReward` — programme, the priced rate, and the missing idempotency key
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "programme" "ReferralProgramme";
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "rateApplied" DECIMAL(5,2);
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "marketId" TEXT;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "sourceRef" TEXT;
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "reversedAt" TIMESTAMP(3);
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "reversedReason" TEXT;

-- Same historical fact as the User backfill: every reward ever written was a player-promo
-- reward, because no agent has ever existed.
UPDATE "ReferralReward" SET "programme" = 'PLAYER' WHERE "programme" IS NULL;

-- ⭐ COMMISSION WAS THE ONE REWARD PATH WITH NO IDEMPOTENCY KEY. `payBonus` and `payPrize`
-- both passed a deterministic ref to `creditBonus`; commission passed none, so any replay
-- was a double-pay. NULLs do not collide in a Postgres unique index, so legacy rows are
-- unaffected and only new commission rows are constrained.
CREATE UNIQUE INDEX IF NOT EXISTS "ReferralReward_sourceRef_key" ON "ReferralReward"("sourceRef");
CREATE INDEX IF NOT EXISTS "ReferralReward_marketId_idx" ON "ReferralReward"("marketId");
CREATE INDEX IF NOT EXISTS "ReferralReward_programme_status_idx" ON "ReferralReward"("programme", "status");

-- ─────────────────────────────────────────────────────────────────────────────
-- 5 · THE APPLICATION
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AgentApplication" (
    "id"                   TEXT NOT NULL,
    "userId"               TEXT NOT NULL,
    "status"               "AgentApplicationStatus" NOT NULL DEFAULT 'DRAFT',
    "source"               "AgentApplicationSource" NOT NULL DEFAULT 'SELF_SERVICE',
    "refereeOneName"       TEXT,
    "refereeOneContact"    TEXT,
    "refereeTwoName"       TEXT,
    "refereeTwoContact"    TEXT,
    "refereeConsentAt"     TIMESTAMP(3),
    "feeAmountTzs"         DECIMAL(18,2),
    "feeAttestedTzs"       DECIMAL(18,2),
    "feeReference"         TEXT,
    "feeStatementRef"      TEXT,
    "feeReconciledAt"      TIMESTAMP(3),
    "feeReconciledById"    TEXT,
    "feeSourceAccount"     TEXT,
    "feeWaivedAt"          TIMESTAMP(3),
    "feeWaivedById"        TEXT,
    "feeWaiverReason"      TEXT,
    "feeDisposition"       "AgentFeeDisposition" NOT NULL DEFAULT 'NONE',
    "feeRefundDueAt"       TIMESTAMP(3),
    "feeRefundedAt"        TIMESTAMP(3),
    "feeRefundedById"      TEXT,
    "feeRefundReference"   TEXT,
    "feeRefundAmountTzs"   DECIMAL(18,2),
    "reviewerId"           TEXT,
    "reviewedAt"           TIMESTAMP(3),
    "rejectReason"         "AgentRejectReason",
    "rejectNote"           TEXT,
    "infoRequestNote"      TEXT,
    "infoRequestedAt"      TIMESTAMP(3),
    "approvedRatePct"      DECIMAL(5,2),
    "agentCode"            TEXT,
    "acceptedTermsVersion" TEXT,
    "acceptedTermsAt"      TIMESTAMP(3),
    "submittedAt"          TIMESTAMP(3),
    "expiresAt"            TIMESTAMP(3),
    "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentApplication_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentApplication_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- ⭐ ONE RECEIPT, ONE APPLICATION. The only automated control on a fee paid out of band.
CREATE UNIQUE INDEX IF NOT EXISTS "AgentApplication_feeReference_key" ON "AgentApplication"("feeReference");
CREATE INDEX IF NOT EXISTS "AgentApplication_userId_status_idx" ON "AgentApplication"("userId", "status");
CREATE INDEX IF NOT EXISTS "AgentApplication_status_submittedAt_idx" ON "AgentApplication"("status", "submittedAt");
-- The refunds-owed worklist reads this directly: TZS 100,000 must never sit owed with
-- nothing tracking it.
CREATE INDEX IF NOT EXISTS "AgentApplication_status_feeDisposition_idx" ON "AgentApplication"("status", "feeDisposition");

-- ─────────────────────────────────────────────────────────────────────────────
-- 6 · THE DOCUMENTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "AgentApplicationDocument" (
    "id"            TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "docType"       "AgentDocType" NOT NULL,
    "storageKey"    TEXT NOT NULL,
    "mimeType"      TEXT NOT NULL,
    "sizeBytes"     INTEGER NOT NULL,
    "suppliedById"  TEXT NOT NULL,
    "uploadedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rejected"      BOOLEAN NOT NULL DEFAULT false,
    "rejectReason"  TEXT,
    -- ⛔ TRUE for the two referee IDs: third-party personal data belonging to people who
    -- never used 50pick, never consented in-app, and cannot invoke erasure through any
    -- surface we have. They carry their own, shorter retention clock.
    "thirdParty"    BOOLEAN NOT NULL DEFAULT false,
    "purgedAt"      TIMESTAMP(3),
    CONSTRAINT "AgentApplicationDocument_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId")
      REFERENCES "AgentApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- One file per slot — a re-upload REPLACES rather than appends, so an officer never
-- reviews two versions of the same document without knowing which is current.
CREATE UNIQUE INDEX IF NOT EXISTS "AgentApplicationDocument_applicationId_docType_key"
  ON "AgentApplicationDocument"("applicationId", "docType");
CREATE INDEX IF NOT EXISTS "AgentApplicationDocument_applicationId_idx"
  ON "AgentApplicationDocument"("applicationId");
-- The retention sweep's working set: third-party scans not yet destroyed.
CREATE INDEX IF NOT EXISTS "AgentApplicationDocument_thirdParty_purgedAt_idx"
  ON "AgentApplicationDocument"("thirdParty", "purgedAt");

-- ─────────────────────────────────────────────────────────────────────────────
-- 7 · THE INVITATION
-- ─────────────────────────────────────────────────────────────────────────────
-- ⭐ The invitee's ACCEPTANCE is the second party. Self-service has a two-party control
-- built in (the applicant submits, a different person approves); an invitation would
-- remove it and let one officer mint an agent single-handedly.
CREATE TABLE IF NOT EXISTS "AgentInvitation" (
    "id"             TEXT NOT NULL,
    "applicationId"  TEXT,
    "phoneE164"      TEXT NOT NULL,
    "displayName"    TEXT,
    -- ⛔ HASHED. A readable token in the database is a second copy of the credential.
    "tokenHash"      TEXT NOT NULL,
    "status"         "AgentInvitationStatus" NOT NULL DEFAULT 'ISSUED',
    "issuedById"     TEXT NOT NULL,
    "issuedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt"      TIMESTAMP(3) NOT NULL,
    "acceptedAt"     TIMESTAMP(3),
    "acceptedUserId" TEXT,
    "declinedAt"     TIMESTAMP(3),
    "revokedAt"      TIMESTAMP(3),
    "revokedById"    TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentInvitation_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AgentInvitation_applicationId_fkey" FOREIGN KEY ("applicationId")
      REFERENCES "AgentApplication"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentInvitation_applicationId_key" ON "AgentInvitation"("applicationId");
CREATE UNIQUE INDEX IF NOT EXISTS "AgentInvitation_tokenHash_key" ON "AgentInvitation"("tokenHash");
CREATE INDEX IF NOT EXISTS "AgentInvitation_phoneE164_status_idx" ON "AgentInvitation"("phoneE164", "status");
CREATE INDEX IF NOT EXISTS "AgentInvitation_status_expiresAt_idx" ON "AgentInvitation"("status", "expiresAt");
