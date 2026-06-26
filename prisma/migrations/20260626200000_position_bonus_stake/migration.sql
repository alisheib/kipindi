-- Track the bonus-funded portion of each prediction-market position so refunds
-- can return the bonus part to the bonus wallet and cash-out can be blocked on
-- bonus-funded bets.

-- AlterTable
ALTER TABLE "Position" ADD COLUMN "bonusStakeTzs" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Position" ADD CONSTRAINT "position_bonus_stake_non_negative" CHECK ("bonusStakeTzs" >= 0);
