-- F3 (watchlist + smart alerts) and F4 (web push).
--
-- All additive. Existing rows are untouched; the new market column is nullable
-- (NULL = watchers not yet alerted that this market closes soon).

-- F3 · watchlist ("star" a market)
CREATE TABLE IF NOT EXISTS "Watchlist" (
    "id"        TEXT NOT NULL,
    "marketId"  TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Watchlist_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Watchlist_marketId_userId_key" ON "Watchlist"("marketId", "userId");
CREATE INDEX IF NOT EXISTS "Watchlist_userId_createdAt_idx" ON "Watchlist"("userId", "createdAt");

-- F4 · web-push subscriptions (one row per device/endpoint)
CREATE TABLE IF NOT EXISTS "PushSubscription" (
    "id"        TEXT NOT NULL,
    "userId"    TEXT NOT NULL,
    "endpoint"  TEXT NOT NULL,
    "p256dh"    TEXT NOT NULL,
    "auth"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");

-- F3 · one-shot "closing soon" alert stamp on the market
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "closingSoonNotifiedAt" TIMESTAMP(3);

-- Foreign keys (guarded so a re-run is safe)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Watchlist_marketId_fkey') THEN
    ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_marketId_fkey"
      FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'Watchlist_userId_fkey') THEN
    ALTER TABLE "Watchlist" ADD CONSTRAINT "Watchlist_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'PushSubscription_userId_fkey') THEN
    ALTER TABLE "PushSubscription" ADD CONSTRAINT "PushSubscription_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
