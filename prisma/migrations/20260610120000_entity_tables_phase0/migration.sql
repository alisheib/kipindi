-- Phase 0: Add entity tables for Prisma migration
-- Adds fields to User + Notification, creates 12 new models

-- ============================================================================
-- ALTER existing tables
-- ============================================================================

-- User: add passwordSalt, failedLoginCount, lockedUntil, avatarDataUrl
ALTER TABLE "User" ADD COLUMN "passwordSalt" TEXT;
ALTER TABLE "User" ADD COLUMN "failedLoginCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "lockedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "avatarDataUrl" TEXT;

-- Notification: add kind, href, dismissedAt
ALTER TABLE "Notification" ADD COLUMN "kind" TEXT;
ALTER TABLE "Notification" ADD COLUMN "href" TEXT;
ALTER TABLE "Notification" ADD COLUMN "dismissedAt" TIMESTAMP(3);

-- ============================================================================
-- New ENUM types
-- ============================================================================

CREATE TYPE "PredictionMarketStatus" AS ENUM ('DRAFT', 'LIVE', 'CLOSED', 'RESOLVED', 'VOIDED');
CREATE TYPE "MarketSide" AS ENUM ('YES', 'NO');
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'WIN', 'LOSS', 'VOID', 'CASHED_OUT');
CREATE TYPE "ProposalStatus" AS ENUM ('REVIEW', 'CHANGES_REQUESTED', 'LISTED', 'RESOLVED', 'DECLINED');
CREATE TYPE "VoteDirection" AS ENUM ('UP', 'DOWN');
CREATE TYPE "AIPollState" AS ENUM ('GENERATING', 'VALIDATION_FAILED', 'FILTERED', 'PENDING_REVIEW', 'EDITING', 'APPROVED', 'REJECTED', 'PUBLISHED');
CREATE TYPE "CandidateState" AS ENUM ('EXTRACTED', 'FILTERED_OUT', 'VERIFYING', 'SCORED', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');
CREATE TYPE "HousePoolEntryType" AS ENUM ('TOP_UP', 'SEED_OUT', 'SETTLE_RETURN', 'RESERVE_FEE', 'WITHDRAW', 'LOSS_ABSORBED');
CREATE TYPE "ReferralRewardType" AS ENUM ('COMMISSION', 'BONUS', 'PRIZE');
CREATE TYPE "ReferralRewardStatus" AS ENUM ('PAID', 'PENDING', 'HELD');
CREATE TYPE "SourceOfFundsReviewStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- ============================================================================
-- New tables
-- ============================================================================

-- SourceOfFunds (1:1 with User, userId is PK)
CREATE TABLE "SourceOfFunds" (
    "userId" TEXT NOT NULL,
    "declaredSource" TEXT NOT NULL,
    "declaredOccupation" TEXT NOT NULL,
    "declaredEmployer" TEXT,
    "declaredAnnualIncomeBand" TEXT NOT NULL,
    "declaredOther" TEXT,
    "reviewStatus" "SourceOfFundsReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceOfFunds_pkey" PRIMARY KEY ("userId")
);

-- ReferralReward
CREATE TABLE "ReferralReward" (
    "id" TEXT NOT NULL,
    "referrerUserId" TEXT NOT NULL,
    "recruitUserId" TEXT NOT NULL,
    "type" "ReferralRewardType" NOT NULL,
    "label" TEXT NOT NULL,
    "amountTzs" DECIMAL(18,2) NOT NULL,
    "status" "ReferralRewardStatus" NOT NULL DEFAULT 'PENDING',
    "recipientUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralReward_pkey" PRIMARY KEY ("id")
);

-- Proposal
CREATE TABLE "Proposal" (
    "id" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleSw" TEXT,
    "description" TEXT,
    "resolutionCriterion" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resolutionDate" TEXT NOT NULL,
    "status" "ProposalStatus" NOT NULL DEFAULT 'REVIEW',
    "up" INTEGER NOT NULL DEFAULT 0,
    "down" INTEGER NOT NULL DEFAULT 0,
    "publishedMarketId" TEXT,
    "prizePaidTzs" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "declineReason" TEXT,
    "declineNote" TEXT,
    "changeNote" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Proposal_pkey" PRIMARY KEY ("id")
);

-- ProposalVote
CREATE TABLE "ProposalVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dir" "VoteDirection" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalVote_pkey" PRIMARY KEY ("id")
);

-- PredictionMarket
CREATE TABLE "PredictionMarket" (
    "id" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "titleSw" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "resolutionCriterion" TEXT NOT NULL,
    "resolutionAt" TIMESTAMP(3) NOT NULL,
    "status" "PredictionMarketStatus" NOT NULL DEFAULT 'DRAFT',
    "yesPool" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "noPool" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "predictorCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedOutcome" TEXT,
    "resolutionStage1By" TEXT,
    "resolutionStage1At" TIMESTAMP(3),
    "resolutionStage2By" TEXT,
    "resolutionStage2At" TIMESTAMP(3),
    "objectionsClosedAt" TIMESTAMP(3),
    "proposedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PredictionMarket_pkey" PRIMARY KEY ("id")
);

-- Position
CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "side" "MarketSide" NOT NULL,
    "stake" DECIMAL(18,2) NOT NULL,
    "potentialPayout" DECIMAL(18,2) NOT NULL,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "finalPayout" DECIMAL(18,2),
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- MarketCandidate
CREATE TABLE "MarketCandidate" (
    "id" TEXT NOT NULL,
    "state" "CandidateState" NOT NULL DEFAULT 'EXTRACTED',
    "category" TEXT NOT NULL,
    "proposedTitleEn" TEXT NOT NULL,
    "proposedTitleSw" TEXT,
    "resolutionCriterion" TEXT NOT NULL,
    "resolutionAt" TIMESTAMP(3) NOT NULL,
    "sources" JSONB NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "rejectReason" TEXT,
    "rejectNote" TEXT,
    "trace" JSONB NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "publishedMarketId" TEXT,
    "tokensSpent" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketCandidate_pkey" PRIMARY KEY ("id")
);

-- AIPoll
CREATE TABLE "AIPoll" (
    "id" TEXT NOT NULL,
    "state" "AIPollState" NOT NULL DEFAULT 'GENERATING',
    "requestCategory" TEXT NOT NULL,
    "requestPrompt" TEXT NOT NULL,
    "generation" JSONB,
    "rawResponse" TEXT,
    "filterReasons" JSONB NOT NULL DEFAULT '[]',
    "qualityIndicators" JSONB NOT NULL DEFAULT '[]',
    "overallQuality" INTEGER NOT NULL DEFAULT 0,
    "titleEn" TEXT NOT NULL,
    "titleSw" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "resolutionCriterion" TEXT NOT NULL,
    "resolutionAt" TIMESTAMP(3) NOT NULL,
    "options" JSONB NOT NULL DEFAULT '[]',
    "sources" JSONB NOT NULL DEFAULT '[]',
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "reasoning" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "rejectReasons" JSONB NOT NULL DEFAULT '[]',
    "publishedMarketId" TEXT,
    "publishedCandidateId" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "regenerationOf" TEXT,
    "regenerationCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIPoll_pkey" PRIMARY KEY ("id")
);

-- Comment
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "marketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "side" TEXT,
    "reports" JSONB NOT NULL DEFAULT '[]',
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- HousePoolLedger
CREATE TABLE "HousePoolLedger" (
    "id" TEXT NOT NULL,
    "type" "HousePoolEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "marketId" TEXT,
    "note" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HousePoolLedger_pkey" PRIMARY KEY ("id")
);

-- TrustedSource
CREATE TABLE "TrustedSource" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "addedBy" TEXT NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrustedSource_pkey" PRIMARY KEY ("id")
);

-- TotpSecret (1:1 with User, userId is PK)
CREATE TABLE "TotpSecret" (
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TotpSecret_pkey" PRIMARY KEY ("userId")
);

-- ============================================================================
-- Foreign keys
-- ============================================================================

ALTER TABLE "SourceOfFunds" ADD CONSTRAINT "SourceOfFunds_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_referrerUserId_fkey" FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReferralReward" ADD CONSTRAINT "ReferralReward_recruitUserId_fkey" FOREIGN KEY ("recruitUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Proposal" ADD CONSTRAINT "Proposal_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProposalVote" ADD CONSTRAINT "ProposalVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Position" ADD CONSTRAINT "Position_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Position" ADD CONSTRAINT "Position_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TotpSecret" ADD CONSTRAINT "TotpSecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Indexes
-- ============================================================================

CREATE INDEX "ReferralReward_referrerUserId_createdAt_idx" ON "ReferralReward"("referrerUserId", "createdAt");
CREATE INDEX "ReferralReward_recruitUserId_idx" ON "ReferralReward"("recruitUserId");

CREATE INDEX "Proposal_proposerId_idx" ON "Proposal"("proposerId");
CREATE INDEX "Proposal_status_idx" ON "Proposal"("status");

CREATE UNIQUE INDEX "ProposalVote_proposalId_userId_key" ON "ProposalVote"("proposalId", "userId");

CREATE INDEX "PredictionMarket_status_idx" ON "PredictionMarket"("status");
CREATE INDEX "PredictionMarket_resolutionAt_idx" ON "PredictionMarket"("resolutionAt");

CREATE INDEX "Position_userId_marketId_idx" ON "Position"("userId", "marketId");
CREATE INDEX "Position_marketId_status_idx" ON "Position"("marketId", "status");

CREATE INDEX "MarketCandidate_state_idx" ON "MarketCandidate"("state");

CREATE INDEX "AIPoll_state_idx" ON "AIPoll"("state");

CREATE INDEX "Comment_marketId_createdAt_idx" ON "Comment"("marketId", "createdAt");

CREATE INDEX "HousePoolLedger_createdAt_idx" ON "HousePoolLedger"("createdAt");

CREATE INDEX "TrustedSource_domain_idx" ON "TrustedSource"("domain");
