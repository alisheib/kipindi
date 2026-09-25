-- CreateEnum
CREATE TYPE "MessagingChannel" AS ENUM ('SMS');

-- CreateEnum
CREATE TYPE "MessagingCategory" AS ENUM ('MARKETING');

-- CreateEnum
CREATE TYPE "MessagingConsentStatus" AS ENUM ('GIVEN', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "MessagingConsentSource" AS ENUM ('REGISTRATION', 'PROFILE', 'OPT_OUT_PAGE', 'KEYWORD', 'IMPORT', 'OPERATOR', 'RETENTION_LAPSE');

-- CreateEnum
CREATE TYPE "SuppressionReason" AS ENUM ('WITHDRAWN', 'COMPLAINT', 'OPERATOR', 'SELF_EXCLUSION');

-- DropForeignKey
ALTER TABLE "AntiFraudFlag" DROP CONSTRAINT "AntiFraudFlag_reviewerId_fkey";

-- DropForeignKey
ALTER TABLE "AntiFraudFlag" DROP CONSTRAINT "AntiFraudFlag_userId_fkey";

-- DropForeignKey
ALTER TABLE "Device" DROP CONSTRAINT "Device_userId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_deviceId_fkey";

-- DropIndex
DROP INDEX "AiUsageEvent_detail_trgm_idx";

-- DropIndex
DROP INDEX "AiUsageEvent_errorType_trgm_idx";

-- DropIndex
DROP INDEX "AiUsageEvent_model_trgm_idx";

-- DropIndex
DROP INDEX "PredictionMarket_category_trgm_idx";

-- DropIndex
DROP INDEX "PredictionMarket_resolutionCriterion_trgm_idx";

-- DropIndex
DROP INDEX "PredictionMarket_titleEn_trgm_idx";

-- DropIndex
DROP INDEX "PredictionMarket_titleSw_trgm_idx";

-- DropIndex
DROP INDEX "PredictionMarket_titleZh_trgm_idx";

-- AlterTable
ALTER TABLE "AffiliateAgent" DROP COLUMN "tier";

-- AlterTable
ALTER TABLE "AgentApplication" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "AgentInvitation" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "KycDocument" DROP COLUMN "blurScore",
DROP COLUMN "ocrText";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN "deviceId";

-- DropTable
DROP TABLE "AntiFraudFlag";

-- DropTable
DROP TABLE "Device";

-- DropTable
DROP TABLE "MatchIntegrityCheck";

-- DropTable
DROP TABLE "ProviderHealth";

-- DropEnum
DROP TYPE "FlagSeverity";

-- DropEnum
DROP TYPE "FlagStatus";

-- DropEnum
DROP TYPE "FlagType";

-- CreateTable
CREATE TABLE "MessagingConsent" (
    "id" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "identifier" TEXT NOT NULL,
    "category" "MessagingCategory" NOT NULL,
    "status" "MessagingConsentStatus" NOT NULL,
    "source" "MessagingConsentSource" NOT NULL,
    "wording" TEXT NOT NULL,
    "locale" "Locale" NOT NULL,
    "evidence" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessagingConsent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suppression" (
    "id" TEXT NOT NULL,
    "channel" "MessagingChannel" NOT NULL,
    "identifier" TEXT NOT NULL,
    "category" "MessagingCategory" NOT NULL,
    "reason" "SuppressionReason" NOT NULL,
    "evidence" TEXT,
    "recordedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Suppression_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessagingConsent_channel_identifier_category_createdAt_idx" ON "MessagingConsent"("channel", "identifier", "category", "createdAt");

-- CreateIndex
CREATE INDEX "MessagingConsent_createdAt_idx" ON "MessagingConsent"("createdAt");

-- CreateIndex
CREATE INDEX "Suppression_createdAt_idx" ON "Suppression"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Suppression_channel_identifier_category_key" ON "Suppression"("channel", "identifier", "category");


