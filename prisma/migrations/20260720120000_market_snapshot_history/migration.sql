-- Real, durable market price history.
--
-- Market history used to live in a process-local Map (`globalThis.__50PICK_MARKET_HISTORY`).
-- Every push to main is a live deploy, so that Map was wiped several times a week and
-- every market's chart went empty. The empty chart then triggered `seedHistory()`, which
-- FABRICATED a synthetic random walk (a seeded LCG) and rendered it to real-money bettors
-- as if it were real price history — on every market detail page, for every market.
--
-- That violated the platform's own A-5 no-fabrication rule, which the MarketCard cites in
-- its source and obeys (it hides the sparkline below 4 real points — which is precisely
-- why the card sparkline was blank while the detail chart showed a confident curve).
--
-- This table makes history durable so nothing has to be invented. seedHistory is deleted.
-- Charts now start EMPTY on a new market and fill in as real bets land. Empty is honest.
--
-- SAFETY: creates a new table only. No existing table is altered, no data is backfilled,
-- nothing is dropped. Rollback is `DROP TABLE "MarketSnapshot"`. The FK is declared against
-- an existing indexed primary key and the table starts empty, so there is no validation
-- scan and no lock held on "PredictionMarket" beyond the catalogue update.
CREATE TABLE IF NOT EXISTS "MarketSnapshot" (
    "id"       TEXT           NOT NULL,
    "marketId" TEXT           NOT NULL,
    "t"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "yes"      DOUBLE PRECISION NOT NULL,
    "yesPool"  DECIMAL(18,2)  NOT NULL,
    "noPool"   DECIMAL(18,2)  NOT NULL,
    "volume"   DECIMAL(18,2)  NOT NULL,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- The only access pattern is "newest N points for one market", used by both the chart
-- read and the retention prune. Never query this table without a marketId.
CREATE INDEX IF NOT EXISTS "MarketSnapshot_marketId_t_idx" ON "MarketSnapshot" ("marketId", "t");

-- Cascade: a market's history has no meaning without the market.
-- Guarded so the whole migration is re-runnable. If it ever half-applies, a
-- retry must not die on a duplicate-constraint error — on this platform a failed
-- migration means `prisma migrate deploy` fails at boot and the site does not
-- come up at all.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'MarketSnapshot_marketId_fkey'
    ) THEN
        ALTER TABLE "MarketSnapshot"
            ADD CONSTRAINT "MarketSnapshot_marketId_fkey"
            FOREIGN KEY ("marketId") REFERENCES "PredictionMarket" ("id")
            ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
