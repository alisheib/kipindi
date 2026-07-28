-- Search: trigram indexes for the shared search grammar (src/lib/search).
--
-- WHY: the grammar compiles a bare token to `contains` + `mode:"insensitive"`,
-- which Postgres executes as ILIKE '%x%'. A btree index cannot serve a leading
-- wildcard, so every such search is a sequential scan. Before this migration the
-- repo had NO text index of any kind — no pg_trgm, no GIN, no tsvector, in any of
-- the 46 migrations. A GIN index with gin_trgm_ops is the one thing that makes
-- ILIKE '%x%' indexable.
--
-- SAFETY: these are the SMALL tables (markets and AI-usage events, thousands of
-- rows). A plain CREATE INDEX takes a lock that blocks writes for the duration of
-- the build, which at this size is milliseconds. The LARGE tables — "User" and
-- "Transaction" — are deliberately NOT here: blocking writes on Transaction means
-- blocking deposits, so those must be built with CREATE INDEX CONCURRENTLY by
-- hand, outside `prisma migrate deploy` (which wraps each file in a transaction,
-- and CONCURRENTLY cannot run inside one).
--
-- MEASURED on the local PG16 cluster before shipping (20k and 320k row loads,
-- EXPLAIN ANALYZE both with the index and with bitmapscan disabled):
--
--   20,000 rows  → planner picks a Seq Scan (cost 675) and IGNORES the index.
--                  No benefit at today's size, and no harm: an unused index costs
--                  only write amplification, which on a table written a few times
--                  a day is nothing.
--   320,000 rows → Bitmap Index Scan, 10.9 ms  vs  Parallel Seq Scan, 59.6 ms.
--                  ~5.5x, and the gap widens with row count.
--
-- So this is a BET ON GROWTH, not a fix for a present slowness — worth stating
-- plainly so nobody reads a flat graph tomorrow and calls it a regression.
--
-- ⚠️ CJK: conventional guidance is that trigram indexing does little for Chinese,
-- because a 1-2 character query yields too few trigrams to filter on. I could not
-- verify that here — the Windows console mangled the UTF-8 test literal to "??",
-- so the plan it produced proves nothing about real ZH input. Treat ZH
-- acceleration as UNVERIFIED rather than assumed in either direction. Do not
-- "fix" it with a tsvector on a hunch: Chinese needs a segmenter (pg_jieba /
-- zhparser) that Railway does not provide, so that change would be a large one
-- taken on no evidence.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- PredictionMarket: the board, admin curation queue and resolver queue all search
-- these five columns (MARKET_SEARCH.default in src/lib/search/fields.ts).
CREATE INDEX IF NOT EXISTS "PredictionMarket_titleEn_trgm_idx"
  ON "PredictionMarket" USING GIN ("titleEn" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PredictionMarket_titleSw_trgm_idx"
  ON "PredictionMarket" USING GIN ("titleSw" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PredictionMarket_titleZh_trgm_idx"
  ON "PredictionMarket" USING GIN ("titleZh" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PredictionMarket_category_trgm_idx"
  ON "PredictionMarket" USING GIN ("category" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "PredictionMarket_resolutionCriterion_trgm_idx"
  ON "PredictionMarket" USING GIN ("resolutionCriterion" gin_trgm_ops);

-- AiUsageEvent: /admin/ai-usage is one of only two searches already in SQL, so
-- this one pays off immediately (AI_USAGE_SEARCH.default).
CREATE INDEX IF NOT EXISTS "AiUsageEvent_model_trgm_idx"
  ON "AiUsageEvent" USING GIN ("model" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "AiUsageEvent_errorType_trgm_idx"
  ON "AiUsageEvent" USING GIN ("errorType" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "AiUsageEvent_detail_trgm_idx"
  ON "AiUsageEvent" USING GIN ("detail" gin_trgm_ops);
