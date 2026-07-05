-- Proposal → Bonus rebuild: reward is now granted INSTANTLY on admin approval
-- (bonus-wallet grant), and going live is a separate publish step.
--
-- 1) New proposal status APPROVED — "approved, bonus paid, not yet live".
--    Added between CHANGES_REQUESTED and LISTED. Additive; no data migration.
ALTER TYPE "ProposalStatus" ADD VALUE IF NOT EXISTS 'APPROVED' AFTER 'CHANGES_REQUESTED';

-- 2) New columns on Proposal:
--    - sourceUrl:     player-supplied trusted source for resolution (required at app layer)
--    - bonusGrantId:  the BonusGrant credited at approval (idempotency / audit trail)
--    - approvedAt:    timestamp of the approval decision
--    The existing "prizePaidTzs" column is REUSED (via Prisma @map) to hold the
--    bonus granted at approval — no rename/data migration needed.
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "sourceUrl" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "bonusGrantId" TEXT;
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);
