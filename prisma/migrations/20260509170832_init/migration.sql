-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'AGENT', 'MODERATOR', 'ADMIN', 'COMPLIANCE', 'SUPPORT');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'PENDING_KYC', 'SUSPENDED', 'SELF_EXCLUDED', 'COOLED_OFF', 'CLOSED');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'SW');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'ADDITIONAL_INFO_REQUIRED');

-- CreateEnum
CREATE TYPE "KycRejectReason" AS ENUM ('BLURRY_DOC', 'DETAILS_MISMATCH', 'EXPIRED_ID', 'UNDERAGE', 'SANCTIONED', 'DUPLICATE_IDENTITY', 'OTHER');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('NIDA', 'PASSPORT', 'DRIVER_LICENSE', 'VOTER_CARD', 'SELFIE');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('ACTIVE', 'FROZEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "TxnType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'BET_PLACED', 'BET_PAYOUT', 'BET_REFUND', 'BONUS_CREDIT', 'ADJUSTMENT_DEBIT', 'ADJUSTMENT_CREDIT', 'CASHOUT', 'HOUSE_FEE');

-- CreateEnum
CREATE TYPE "TxnStatus" AS ENUM ('PENDING', 'PROCESSING', 'AML_REVIEW', 'CONFIRMED', 'FAILED', 'REVERSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('MPESA', 'TIGO_PESA', 'AIRTEL_MONEY', 'HALO_PESA', 'MIXX', 'TTCL_PESA', 'CARD', 'BANK_TRANSFER', 'INTERNAL');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('SCHEDULED', 'PRE_MATCH', 'LIVE', 'HALFTIME', 'FINISHED', 'POSTPONED', 'CANCELLED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "WindowKind" AS ENUM ('W_0_15', 'W_15_30', 'W_30_45', 'W_45_60', 'W_FT');

-- CreateEnum
CREATE TYPE "WindowStatus" AS ENUM ('OPEN', 'CLOSED', 'SETTLING', 'SETTLED', 'VOID');

-- CreateEnum
CREATE TYPE "BetOutcome" AS ENUM ('HOME_WIN', 'AWAY_WIN', 'DRAW');

-- CreateEnum
CREATE TYPE "BetStatus" AS ENUM ('PENDING_CONFIRMATION', 'PLACED', 'WON', 'LOST', 'VOIDED', 'CASHED_OUT', 'PARTIALLY_SETTLED');

-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('MULTI_ACCOUNT', 'IP_OVERLAP', 'DEVICE_OVERLAP', 'STAKE_PATTERN', 'COLLUSION_RING', 'VELOCITY', 'WASH_TRADE', 'MATCH_FIXING_SUSPECT', 'CHARGEBACK');

-- CreateEnum
CREATE TYPE "FlagSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('OPEN', 'REVIEWING', 'CONFIRMED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'PUSH', 'SMS', 'EMAIL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditCategory" AS ENUM ('AUTH', 'KYC', 'WALLET', 'BET', 'ADMIN', 'COMPLIANCE', 'SECURITY', 'SYSTEM');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "phoneE164" TEXT NOT NULL,
    "email" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'PLAYER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING_KYC',
    "locale" "Locale" NOT NULL DEFAULT 'SW',
    "displayName" TEXT,
    "dob" TIMESTAMP(3),
    "region" TEXT,
    "acceptedTermsVersion" TEXT,
    "acceptedTermsAt" TIMESTAMP(3),
    "marketingOptIn" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "recruitedBy" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "deviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "phoneE164" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "platform" TEXT,
    "model" TEXT,
    "osVersion" TEXT,
    "appVersion" TEXT,
    "pushToken" TEXT,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trustedAt" TIMESTAMP(3),
    "blockedAt" TIMESTAMP(3),

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "KycStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "rejectReason" "KycRejectReason",
    "rejectNote" TEXT,
    "nidaNumber" TEXT,
    "nidaVerifiedAt" TIMESTAMP(3),
    "fullName" TEXT,
    "dob" TIMESTAMP(3),
    "gender" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KycSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KycDocument" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "docType" "DocType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blurScore" DOUBLE PRECISION,
    "ocrText" TEXT,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "rejectReason" TEXT,

    CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "pending" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "hold" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TxnType" NOT NULL,
    "status" "TxnStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "fee" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "taxWithheld" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "balanceAfter" DECIMAL(18,2),
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "provider" "PaymentProvider",
    "providerRef" TEXT,
    "providerStatus" TEXT,
    "msisdn" TEXT,
    "description" TEXT,
    "betId" TEXT,
    "amlReviewedById" TEXT,
    "amlReviewedAt" TIMESTAMP(3),
    "amlReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameSw" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "externalId" TEXT,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameSw" TEXT NOT NULL,
    "country" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "slug" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameSw" TEXT,
    "shortName" TEXT,
    "badgeUrl" TEXT,
    "country" TEXT,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "externalId" TEXT,
    "homeTeamId" TEXT NOT NULL,
    "awayTeamId" TEXT NOT NULL,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'SCHEDULED',
    "homeScore" INTEGER NOT NULL DEFAULT 0,
    "awayScore" INTEGER NOT NULL DEFAULT 0,
    "minute" INTEGER,
    "venue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "team" TEXT,
    "player" TEXT,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Window" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "kind" "WindowKind" NOT NULL,
    "status" "WindowStatus" NOT NULL DEFAULT 'OPEN',
    "closesAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),
    "homeScoreStart" INTEGER,
    "awayScoreStart" INTEGER,
    "homeScoreEnd" INTEGER,
    "awayScoreEnd" INTEGER,
    "resolvedOutcome" "BetOutcome",
    "voidReason" TEXT,
    "minStake" DECIMAL(18,2) NOT NULL DEFAULT 100,
    "maxStake" DECIMAL(18,2) NOT NULL DEFAULT 500000,

    CONSTRAINT "Window_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pool" (
    "id" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "totalStake" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "homeStake" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "awayStake" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "drawStake" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "housePct" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "payoutPct" DECIMAL(5,2) NOT NULL DEFAULT 85.00,
    "betCount" INTEGER NOT NULL DEFAULT 0,
    "seededAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "finalHouseTake" DECIMAL(18,2),
    "finalPayoutPool" DECIMAL(18,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BetBundle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalStake" DECIMAL(18,2) NOT NULL,
    "potentialReturn" DECIMAL(18,2),
    "bonusMultiplier" DECIMAL(6,3) NOT NULL DEFAULT 1.00,
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "BetBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "windowId" TEXT NOT NULL,
    "bundleId" TEXT,
    "outcome" "BetOutcome" NOT NULL,
    "stake" DECIMAL(18,2) NOT NULL,
    "potentialReturn" DECIMAL(18,2),
    "poolShareAtPlacement" DECIMAL(8,5),
    "status" "BetStatus" NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    "returnAmount" DECIMAL(18,2),
    "cashedOutAt" TIMESTAMP(3),
    "cashedOutValue" DECIMAL(18,2),
    "placedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "voidReason" TEXT,

    CONSTRAINT "Bet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AntiFraudFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "FlagType" NOT NULL,
    "severity" "FlagSeverity" NOT NULL,
    "status" "FlagStatus" NOT NULL DEFAULT 'OPEN',
    "riskScore" DOUBLE PRECISION,
    "description" TEXT NOT NULL,
    "evidence" JSONB,
    "matchId" TEXT,
    "windowId" TEXT,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AntiFraudFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MatchIntegrityCheck" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "windowId" TEXT,
    "anomalyType" TEXT NOT NULL,
    "anomalyScore" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "reviewerId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchIntegrityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResponsibleGambling" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dailyDepositLimit" DECIMAL(18,2),
    "weeklyDepositLimit" DECIMAL(18,2),
    "monthlyDepositLimit" DECIMAL(18,2),
    "dailyLossLimit" DECIMAL(18,2),
    "weeklyLossLimit" DECIMAL(18,2),
    "sessionTimeLimitMin" INTEGER,
    "realityCheckIntervalMin" INTEGER NOT NULL DEFAULT 30,
    "selfExclusionUntil" TIMESTAMP(3),
    "coolingOffUntil" TIMESTAMP(3),
    "pendingIncreaseTo" DECIMAL(18,2),
    "pendingIncreaseEffectiveAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResponsibleGambling_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "event" TEXT NOT NULL,
    "titleEn" TEXT,
    "titleSw" TEXT,
    "bodyEn" TEXT NOT NULL,
    "bodySw" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "category" "AuditCategory" NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT,
    "targetType" TEXT,
    "targetId" TEXT,
    "payload" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateAgent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'STANDARD',
    "commissionPct" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    "totalRecruits" INTEGER NOT NULL DEFAULT 0,
    "totalCommission" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateAgent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderHealth" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "bucketStart" TIMESTAMP(3) NOT NULL,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "p50LatencyMs" INTEGER,
    "p95LatencyMs" INTEGER,

    CONSTRAINT "ProviderHealth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_status_idx" ON "User"("role", "status");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_revokedAt_idx" ON "Session"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "Otp_phoneE164_purpose_idx" ON "Otp"("phoneE164", "purpose");

-- CreateIndex
CREATE INDEX "Otp_expiresAt_idx" ON "Otp"("expiresAt");

-- CreateIndex
CREATE INDEX "Device_fingerprint_idx" ON "Device"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "Device_userId_fingerprint_key" ON "Device"("userId", "fingerprint");

-- CreateIndex
CREATE INDEX "KycSubmission_userId_status_idx" ON "KycSubmission"("userId", "status");

-- CreateIndex
CREATE INDEX "KycSubmission_status_submittedAt_idx" ON "KycSubmission"("status", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "Wallet_status_idx" ON "Wallet"("status");

-- CreateIndex
CREATE INDEX "Transaction_userId_createdAt_idx" ON "Transaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_walletId_createdAt_idx" ON "Transaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "Transaction_type_status_idx" ON "Transaction"("type", "status");

-- CreateIndex
CREATE INDEX "Transaction_providerRef_idx" ON "Transaction"("providerRef");

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "League_slug_key" ON "League"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Team_slug_key" ON "Team"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Match_externalId_key" ON "Match"("externalId");

-- CreateIndex
CREATE INDEX "Match_status_kickoffAt_idx" ON "Match"("status", "kickoffAt");

-- CreateIndex
CREATE INDEX "Match_leagueId_kickoffAt_idx" ON "Match"("leagueId", "kickoffAt");

-- CreateIndex
CREATE INDEX "MatchEvent_matchId_minute_idx" ON "MatchEvent"("matchId", "minute");

-- CreateIndex
CREATE INDEX "Window_status_closesAt_idx" ON "Window"("status", "closesAt");

-- CreateIndex
CREATE UNIQUE INDEX "Window_matchId_kind_key" ON "Window"("matchId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "Pool_windowId_key" ON "Pool"("windowId");

-- CreateIndex
CREATE INDEX "BetBundle_userId_placedAt_idx" ON "BetBundle"("userId", "placedAt");

-- CreateIndex
CREATE INDEX "Bet_userId_placedAt_idx" ON "Bet"("userId", "placedAt");

-- CreateIndex
CREATE INDEX "Bet_windowId_status_idx" ON "Bet"("windowId", "status");

-- CreateIndex
CREATE INDEX "Bet_status_settledAt_idx" ON "Bet"("status", "settledAt");

-- CreateIndex
CREATE INDEX "AntiFraudFlag_userId_status_idx" ON "AntiFraudFlag"("userId", "status");

-- CreateIndex
CREATE INDEX "AntiFraudFlag_type_severity_status_idx" ON "AntiFraudFlag"("type", "severity", "status");

-- CreateIndex
CREATE INDEX "MatchIntegrityCheck_matchId_createdAt_idx" ON "MatchIntegrityCheck"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ResponsibleGambling_userId_key" ON "ResponsibleGambling"("userId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_channel_sentAt_idx" ON "Notification"("channel", "sentAt");

-- CreateIndex
CREATE INDEX "AuditLog_category_createdAt_idx" ON "AuditLog"("category", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_targetType_targetId_idx" ON "AuditLog"("targetType", "targetId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateAgent_userId_key" ON "AffiliateAgent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateAgent_code_key" ON "AffiliateAgent"("code");

-- CreateIndex
CREATE INDEX "ProviderHealth_provider_bucketStart_idx" ON "ProviderHealth"("provider", "bucketStart");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderHealth_provider_bucketStart_key" ON "ProviderHealth"("provider", "bucketStart");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_recruitedBy_fkey" FOREIGN KEY ("recruitedBy") REFERENCES "AffiliateAgent"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Otp" ADD CONSTRAINT "Otp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycSubmission" ADD CONSTRAINT "KycSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycDocument" ADD CONSTRAINT "KycDocument_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "KycSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_betId_fkey" FOREIGN KEY ("betId") REFERENCES "Bet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "League" ADD CONSTRAINT "League_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_homeTeamId_fkey" FOREIGN KEY ("homeTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_awayTeamId_fkey" FOREIGN KEY ("awayTeamId") REFERENCES "Team"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Window" ADD CONSTRAINT "Window_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pool" ADD CONSTRAINT "Pool_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "Window"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_windowId_fkey" FOREIGN KEY ("windowId") REFERENCES "Window"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bet" ADD CONSTRAINT "Bet_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "BetBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntiFraudFlag" ADD CONSTRAINT "AntiFraudFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AntiFraudFlag" ADD CONSTRAINT "AntiFraudFlag_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResponsibleGambling" ADD CONSTRAINT "ResponsibleGambling_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateAgent" ADD CONSTRAINT "AffiliateAgent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
