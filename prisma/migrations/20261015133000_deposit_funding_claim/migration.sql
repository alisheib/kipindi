-- The primary key serializes one funding UUID across workers before any form gate can pause.
-- A crashed CLAIMED request remains uncertain; no clock-based unlock can authorize a second charge.
BEGIN;
SET LOCAL lock_timeout = '3s';
CREATE TABLE IF NOT EXISTS "DepositFundingClaim" (
  "key" VARCHAR(36) NOT NULL,
  "userId" TEXT NOT NULL,
  "state" VARCHAR(16) NOT NULL DEFAULT 'CLAIMED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DepositFundingClaim_pkey" PRIMARY KEY ("key"),
  CONSTRAINT "DepositFundingClaim_state_check" CHECK ("state" IN ('CLAIMED', 'REFUSED'))
);
COMMIT;
