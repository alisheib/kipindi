-- Double-entry ledger (Elevation Phase 1, item #3).
-- Purely additive: new enum + new table. No existing tables touched.

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM (
  'DEPOSIT',
  'WITHDRAWAL',
  'WITHDRAWAL_TAX',
  'STAKE_DEBIT',
  'PAYOUT_CREDIT',
  'SETTLEMENT_TAX',
  'SETTLEMENT_COMMISSION',
  'SETTLEMENT_RESERVE',
  'SETTLEMENT_AGGREGATOR',
  'SETTLEMENT_TRA_LEVY',
  'SETTLEMENT_GBT_LEVY',
  'REFUND',
  'BONUS_CREDIT',
  'BONUS_GRANT',
  'BONUS_SPEND',
  'BONUS_EXPIRE',
  'BONUS_REFUND',
  'CASHOUT',
  'CASHOUT_FEE',
  'ADJUSTMENT',
  'INTERNAL_CREDIT'
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "account" TEXT NOT NULL,
    "entryType" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'TZS',
    "memo" TEXT,
    "txnId" TEXT,
    "marketId" TEXT,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndexes
CREATE INDEX "LedgerEntry_groupId_idx" ON "LedgerEntry"("groupId");
CREATE INDEX "LedgerEntry_account_createdAt_idx" ON "LedgerEntry"("account", "createdAt");
CREATE INDEX "LedgerEntry_txnId_idx" ON "LedgerEntry"("txnId");
CREATE INDEX "LedgerEntry_marketId_idx" ON "LedgerEntry"("marketId");
CREATE INDEX "LedgerEntry_entryType_createdAt_idx" ON "LedgerEntry"("entryType", "createdAt");
