-- HOUSE BOTS — N5 (plans/house-bots/04-amendments.md § N5; Ali, 2026-10-14): the roster past 20, a higher per-minute
-- ceiling, and the schema the desk-against-desk pairs need. The pairs' code is N6; until it lands nothing writes a PAIR
-- row and nothing reads the two budget columns, so this file changes no behaviour of the build that applies it.
--
-- @drops constraint:HouseBotControl_maxDesignatedBots_check · owner docs/HOUSE-BOTS.md
-- @drops constraint:HouseBotControl_gMaxBetsPerMinute_check · owner docs/HOUSE-BOTS.md
-- @drops constraint:HouseBotIntent_kind_check · owner docs/HOUSE-BOTS.md
--
-- ⛔ EXPAND-ONLY IN EFFECT (04 S1), so the container still serving during the deploy, and a rollback, keep working:
--   · each dropped CHECK is re-added at once under the SAME name, accepting a strict SUPERSET of what it accepted —
--     a row the old build can write passes both, and no stored row can fail the wider one;
--   · the two new columns are NULLABLE with NO default; the old build's client never names them;
--   · the PAIR kind, its anchor CHECK and its unique index constrain only rows the old build never writes.
--   ⛔ `hbi_counter_anchor_uq` is deliberately NOT touched: the old build's COUNTER insert says
--     ON CONFLICT ("anchorKey") WHERE "kind" = 'COUNTER', which no narrower partial index satisfies (42P10). The
--     counter hand-off that would need it is deferred with its reasons in N5.
-- ⛔ MIGRATION LAW (04 S1 + A23): `lock_timeout` first; one implicit transaction (migrate deploy sends one script); every
--   statement re-runnable — DROP CONSTRAINT IF EXISTS before each re-add, ADD COLUMN IF NOT EXISTS, CREATE … IF NOT
--   EXISTS; no CONCURRENTLY; no rename; nothing made NOT NULL.
-- ⚠️ LOCK ORDER. Each table takes ACCESS EXCLUSIVE in its FIRST statement and holds it to commit, and the tables are
--   taken in the order a desk bet touches them — HouseBotControl (read inside the bet) before HouseBotIntent (marked
--   placed at its end) — so this file and a bet cannot wait on each other in a cycle. A transaction that already holds
--   the intent table and then asks for the control table can still meet 40P01; the apply then rolls back whole, as on
--   55P03, and is re-run (test:house-bot-migrations §b holds the shape).

SET LOCAL lock_timeout = '3s';

-- ── 1 · HouseBotControl — the roster ceiling 20 → 100 (Ali, 2026-10-14), bets a minute 20 → 120, and the pairs'
--        daily budget (NULL = never; N6 checks both inside the bet's own locks, H4). ONE statement: one lock, one scan.
ALTER TABLE "HouseBotControl"
  DROP CONSTRAINT IF EXISTS "HouseBotControl_maxDesignatedBots_check",
  ADD CONSTRAINT "HouseBotControl_maxDesignatedBots_check" CHECK ("maxDesignatedBots" BETWEEN 1 AND 100),
  DROP CONSTRAINT IF EXISTS "HouseBotControl_gMaxBetsPerMinute_check",
  ADD CONSTRAINT "HouseBotControl_gMaxBetsPerMinute_check" CHECK ("gMaxBetsPerMinute" IS NULL OR "gMaxBetsPerMinute" BETWEEN 1 AND 120),
  ADD COLUMN IF NOT EXISTS "gCapPairRoundsPerDay" INTEGER,
  ADD COLUMN IF NOT EXISTS "gCapPairDailyTzs" BIGINT,
  DROP CONSTRAINT IF EXISTS "HouseBotControl_gCapPairRoundsPerDay_check",
  ADD CONSTRAINT "HouseBotControl_gCapPairRoundsPerDay_check" CHECK ("gCapPairRoundsPerDay" IS NULL OR "gCapPairRoundsPerDay" BETWEEN 1 AND 28800),
  DROP CONSTRAINT IF EXISTS "HouseBotControl_gCapPairDailyTzs_check",
  ADD CONSTRAINT "HouseBotControl_gCapPairDailyTzs_check" CHECK ("gCapPairDailyTzs" IS NULL OR "gCapPairDailyTzs" BETWEEN 0 AND 1000000000);

-- ── 2 · HouseBotIntent — the PAIR kind, its anchor ('pair:' || marketId, one live PAIR per market) and its product: a pair is
--        the second leg of an Up & Down round no player is in (the owner's ruling covers rounds), so never a poll. The prefix
--        keeps a PAIR duplicate from reading as a COUNTER one (both indexes are on "anchorKey"; the DAL tells them apart by it).
ALTER TABLE "HouseBotIntent"
  DROP CONSTRAINT IF EXISTS "HouseBotIntent_kind_check",
  ADD CONSTRAINT "HouseBotIntent_kind_check" CHECK ("kind" IN ('COUNTER','FILL','OPENER','MANUAL','PAIR')),
  DROP CONSTRAINT IF EXISTS "HouseBotIntent_pair_anchor_check",
  ADD CONSTRAINT "HouseBotIntent_pair_anchor_check" CHECK ("kind" <> 'PAIR' OR "anchorKey" = 'pair:' || "marketId"),
  DROP CONSTRAINT IF EXISTS "HouseBotIntent_pair_updown_check",
  ADD CONSTRAINT "HouseBotIntent_pair_updown_check" CHECK ("kind" <> 'PAIR' OR "productLine" = 'UPDOWN');
-- A CANCELLED PAIR may be planned again (it never staked); a SKIPPED or EXPIRED one may not — FILL/OPENER's rule.
CREATE UNIQUE INDEX IF NOT EXISTS "hbi_pair_anchor_uq" ON "HouseBotIntent" ("anchorKey")
    WHERE "kind" = 'PAIR' AND "status" <> 'CANCELLED';
