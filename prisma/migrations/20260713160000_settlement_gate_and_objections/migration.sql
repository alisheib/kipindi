-- F11 · The settlement gate + player objections.
--
-- Settlement no longer happens at resolution. Stage-2 of the resolution ceremony
-- records the verdict and opens the objection window but moves NO money: the pool
-- stays whole and every Position stays OPEN. settleMarket() (driven by
-- settleDueMarkets() on the lifecycle ticker) pays the market only once the window
-- has elapsed AND no objection is standing against it.
--
-- "settledAt" is what distinguishes the two states. status = 'RESOLVED' is only the
-- VERDICT; settledAt is when the money actually moved. Existing rows get NULL, which
-- is why the backfill below matters: every market that resolved BEFORE this deploy
-- was paid out immediately under the old behaviour, so it is genuinely settled. Left
-- as NULL they would look unsettled, and the new settlement sweep would try to pay
-- them a SECOND time. The OPEN-position filter in settleMarket would refuse to
-- double-credit anyone, but the market would still be re-stamped and re-audited — so
-- we state the truth in the data instead of relying on a downstream guard.
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "settledAt" TIMESTAMP(3);

-- Backfill: anything already RESOLVED/VOIDED was paid under the old instant-payout
-- code. Its settlement time is when stage-2 completed (fall back to updatedAt for
-- rows resolved by a path that left no stage-2 stamp, e.g. an emergency void).
UPDATE "PredictionMarket"
   SET "settledAt" = COALESCE("resolutionStage2At", "updatedAt")
 WHERE "status" IN ('RESOLVED', 'VOIDED')
   AND "settledAt" IS NULL;

-- A player's formal objection to a verdict, filed inside the objection window while
-- the pool is still intact. An OPEN row FREEZES that market's settlement, so this is
-- a money-bearing compliance record: it must survive a restart.
CREATE TABLE IF NOT EXISTS "Objection" (
    "id"              TEXT NOT NULL,
    "marketId"        TEXT NOT NULL,
    "userId"          TEXT NOT NULL,
    -- WRONG_OUTCOME | SOURCE_CONTRADICTS | AMBIGUOUS_CRITERION | RESOLVED_EARLY | OTHER
    "reason"          TEXT NOT NULL,
    "detail"          TEXT NOT NULL,
    -- OPEN | UPHELD | REJECTED | WITHDRAWN — only OPEN freezes the money.
    "status"          TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedBy"      TEXT,
    "reviewedAt"      TIMESTAMP(3),
    "reviewNote"      TEXT,
    -- VOID | REVERSE — what the officer did about an upheld objection.
    "remedy"          TEXT,
    -- The verdict being disputed, captured at filing so the trail survives a remedy.
    "outcomeAtFiling" TEXT,
    CONSTRAINT "Objection_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Objection_status_idx"   ON "Objection"("status");
CREATE INDEX IF NOT EXISTS "Objection_marketId_idx" ON "Objection"("marketId");
CREATE INDEX IF NOT EXISTS "Objection_userId_idx"   ON "Objection"("userId");

ALTER TABLE "Objection"
  ADD CONSTRAINT "Objection_marketId_fkey"
  FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Objection"
  ADD CONSTRAINT "Objection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
