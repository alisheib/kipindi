-- Add weekly/monthly deposit-limit increase deferral fields (LCCP SR 3.4.3).
-- Previously only daily limit increases were deferred 24h; weekly/monthly
-- took effect immediately. All three now defer.
ALTER TABLE "ResponsibleGambling" ADD COLUMN "pendingWeeklyIncreaseTo" DECIMAL(18,2);
ALTER TABLE "ResponsibleGambling" ADD COLUMN "pendingWeeklyIncreaseEffectiveAt" TIMESTAMP(3);
ALTER TABLE "ResponsibleGambling" ADD COLUMN "pendingMonthlyIncreaseTo" DECIMAL(18,2);
ALTER TABLE "ResponsibleGambling" ADD COLUMN "pendingMonthlyIncreaseEffectiveAt" TIMESTAMP(3);
