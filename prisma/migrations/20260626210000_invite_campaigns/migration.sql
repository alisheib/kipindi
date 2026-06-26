-- Bulk invite campaigns: branded SMS/email invites that grant a bonus on register.

-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "InviteEntryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'REGISTERED', 'FAILED', 'BOUNCED');

-- CreateTable
CREATE TABLE "InviteCampaign" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bonusAmountTzs" INTEGER NOT NULL,
    "wagerMultiplier" DECIMAL(4,1) NOT NULL,
    "expiresInDays" INTEGER NOT NULL,
    "messageEn" TEXT NOT NULL,
    "messageSw" TEXT NOT NULL,
    "status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "totalInvites" INTEGER NOT NULL DEFAULT 0,
    "totalRegistered" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InviteCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InviteEntry" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "contactType" "ContactType" NOT NULL,
    "contactValue" TEXT NOT NULL,
    "bonusAmountTzs" INTEGER NOT NULL,
    "status" "InviteEntryStatus" NOT NULL DEFAULT 'QUEUED',
    "sentAt" TIMESTAMP(3),
    "registeredUserId" TEXT,
    "bonusGrantId" TEXT,
    "failureReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InviteEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InviteCampaign_code_key" ON "InviteCampaign"("code");

-- CreateIndex
CREATE INDEX "InviteCampaign_status_idx" ON "InviteCampaign"("status");

-- CreateIndex
CREATE INDEX "InviteCampaign_createdById_idx" ON "InviteCampaign"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "InviteEntry_campaignId_contactValue_key" ON "InviteEntry"("campaignId", "contactValue");

-- CreateIndex
CREATE INDEX "InviteEntry_campaignId_status_idx" ON "InviteEntry"("campaignId", "status");

-- AddForeignKey
ALTER TABLE "InviteCampaign" ADD CONSTRAINT "InviteCampaign_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InviteEntry" ADD CONSTRAINT "InviteEntry_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "InviteCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
