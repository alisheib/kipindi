-- Product line discriminator on PredictionMarket — the prerequisite for "Up & Down".
--
-- WHY THIS EXISTS. 50pick is about to run a SECOND product on the same table. A
-- long-form poll is created a few times a day; an Up & Down chain emits one row
-- every few MINUTES (5/15/30-min rounds x assets ~ 800+ rows/day, ~300k/year).
-- Without a discriminator every player board would scan the whole table to render a
-- dozen polls — `listMarkets()` does `findMany()` with NO `where` and filters in JS,
-- and it is called from ~25 surfaces including /, /live, /markets, /results,
-- /fairness, /api/health, report-money.ts and analytics.ts.
--
-- Values:
--   'MARKET'  — a long-form 50pick poll. Every pre-existing row, via the DEFAULT.
--   'UPDOWN'  — one round of an Up & Down price chain.
--
-- ⚠️ READ-PATH RULE (the thing that will bite a future session):
--   `listMarkets()` DEFAULTS to productLine 'MARKET', so player boards exclude rounds
--   for free. Any MONEY or REGULATOR read — GGR, trial balance, statutory reports,
--   platform stats — must opt IN with productLine 'ALL', or Up & Down revenue
--   silently vanishes from the books. Guarded by `npm run test:product-line`.
--
-- SAFETY. `ADD COLUMN ... DEFAULT` on PostgreSQL 11+ is a catalogue-only change (the
-- default is stored in pg_attribute, not written to every row), so this does NOT
-- rewrite the table and is safe on a live database. The index is created separately
-- below; it is small today (tens of rows) so a plain CREATE INDEX is fine here.
-- If this ever needs re-applying to a large table, use CREATE INDEX CONCURRENTLY
-- OUTSIDE a transaction instead.
ALTER TABLE "PredictionMarket"
  ADD COLUMN IF NOT EXISTS "productLine" TEXT NOT NULL DEFAULT 'MARKET';

-- The board query is "the LIVE rows of THIS product, soonest first". Composite so
-- Postgres serves filter + sort from the index alone once the table is large.
CREATE INDEX IF NOT EXISTS "PredictionMarket_productLine_status_resolutionAt_idx"
  ON "PredictionMarket" ("productLine", "status", "resolutionAt");
