-- Bonus Wallet: non-withdrawable promotional grants with wagering requirements.
-- Adds Wallet.bonusBalance + the BonusGrant table and its two enums.

-- CreateEnum
CREATE TYPE "BonusSource" AS ENUM ('ADMIN', 'REFERRAL', 'PROPOSAL', 'INVITE', 'PROMOTION', 'CASHBACK');

-- CreateEnum
CREATE TYPE "BonusGrantStatus" AS ENUM ('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED', 'FORFEITED');

-- AlterTable
ALTER TABLE "Wallet" ADD COLUMN "bonusBalance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "BonusGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountTzs" INTEGER NOT NULL,
    "remainingTzs" INTEGER NOT NULL,
    "wagerMultiplier" DECIMAL(4,1) NOT NULL,
    "wagerRequiredTzs" INTEGER NOT NULL,
    "wageredTzs" INTEGER NOT NULL DEFAULT 0,
    "source" "BonusSource" NOT NULL,
    "sourceRef" TEXT,
    "status" "BonusGrantStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "fulfilledAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BonusGrant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BonusGrant_userId_status_idx" ON "BonusGrant"("userId", "status");

-- CreateIndex
CREATE INDEX "BonusGrant_status_expiresAt_idx" ON "BonusGrant"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "BonusGrant_sourceRef_idx" ON "BonusGrant"("sourceRef");

-- AddForeignKey
ALTER TABLE "BonusGrant" ADD CONSTRAINT "BonusGrant_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BonusGrant" ADD CONSTRAINT "BonusGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Money-safety CHECK constraints (mirror the manual Wallet constraints noted in schema)
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_bonus_non_negative" CHECK ("bonusBalance" >= 0);
ALTER TABLE "BonusGrant" ADD CONSTRAINT "bonusgrant_remaining_non_negative" CHECK ("remainingTzs" >= 0);
ALTER TABLE "BonusGrant" ADD CONSTRAINT "bonusgrant_wagered_non_negative" CHECK ("wageredTzs" >= 0);
