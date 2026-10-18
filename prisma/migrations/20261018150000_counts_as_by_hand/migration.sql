-- "COUNTS AS" COUNTS A DESK ACCOUNT'S STAKES PLACED BY HAND TOO — the one-time catch-up for markets still open (owner
-- ruling, Ali, 2026-10-18: docs/COMPLIANCE-DECISIONS.md, "2026-10-18 · Counts as: a desk account's own stakes placed by
-- hand count too").
--
-- From this release the bet path adds an account's "Counts as − 1" to `predictorExtra` at its holder's FIRST stake on a
-- market, whether the desk placed it or an officer placed it by hand from the account (`house-bot/shown-count.ts`), and
-- a change of the number moves every open market the holder is on (`shownMarketsWhere`). Until now only a stake the desk
-- placed (it carries the `houseBotId` marker) was counted, so an open market where the holder staked ONLY by hand
-- carries nothing for that account. This statement adds exactly that, once:
--   for every live (non-REMOVED) desk account, on every LIVE or CLOSED market where its holder holds a position and NONE
--   of the market's positions carries this account's marker → `countsAs − 1`.
-- A market where the desk staked from the account already carries its weight (stamped at that stake, moved by every
-- save since), so it is skipped. RESOLVED and VOIDED markets keep the number they ended with (the 2026-10-11 ruling).
-- The weight is read RAW, exactly as `countsAsOf` (src/lib/house-bot/rules.ts) reads it: a whole JSON number from 1 to
-- 10,000 at rules.display.countsAs, anything else reads 1 (and adds nothing).
--
-- ⛔ NO MONEY: one column, `predictorExtra`, on open markets only. `predictorCount` (the TRUE count every report, the
-- regulator's match-integrity report and every admin page read) is not touched.
-- ⛔ RUN ONCE BY `prisma migrate deploy`: it adds, so it is not re-runnable — never paste it by hand.
-- Row locks only (no DDL). The lock timeout stops it waiting behind a long market transaction: if it trips, the boot
-- that ran it fails, the previous build keeps serving, and Prisma records the migration as failed (P3009 on the next
-- boot): nothing was written (one statement), so run `prisma migrate resolve --rolled-back
-- 20261018150000_counts_as_by_hand` and redeploy.
SET LOCAL lock_timeout = '10s';

WITH "weight" AS (
  SELECT b."id", b."userId",
    -- ⛔ NESTED, NOT ONE AND-CHAIN: PostgreSQL does not promise to evaluate AND left to right, and a `::numeric` cast of
    -- a non-number (a stray string) would throw and fail the boot. The inner CASE only ever sees a JSON number.
    CASE WHEN jsonb_typeof(b."rules" -> 'display' -> 'countsAs') = 'number' THEN
      CASE WHEN (b."rules" -> 'display' ->> 'countsAs')::numeric BETWEEN 1 AND 10000
             AND (b."rules" -> 'display' ->> 'countsAs')::numeric = trunc((b."rules" -> 'display' ->> 'countsAs')::numeric)
           THEN (b."rules" -> 'display' ->> 'countsAs')::numeric::int
           ELSE 1
      END
    ELSE 1
    END AS "countsAs"
  FROM "HouseBot" b
  WHERE b."status" <> 'REMOVED'
), "owed" AS (
  SELECT DISTINCT w."id" AS "houseBotId", x."marketId", w."countsAs"
  FROM "weight" w
  JOIN "Position" x ON x."userId" = w."userId"
  JOIN "PredictionMarket" m ON m."id" = x."marketId" AND m."status" IN ('LIVE', 'CLOSED')
  WHERE w."countsAs" > 1
    AND NOT EXISTS (SELECT 1 FROM "Position" y WHERE y."marketId" = x."marketId" AND y."houseBotId" = w."id")
), "perMarket" AS (
  SELECT "marketId", sum("countsAs" - 1)::int AS "add" FROM "owed" GROUP BY "marketId"
)
UPDATE "PredictionMarket" AS m SET "predictorExtra" = m."predictorExtra" + p."add"
FROM "perMarket" p
WHERE m."id" = p."marketId";
