-- HOUSE BOTS — the columns on existing tables (PLAN §2 Markers; 04 A4, A23, A24, S1, S3; N1 §2).
--
-- ⛔ EXPAND-ONLY (04 S1), so the container still serving during the deploy keeps working: seven
-- NULLABLE columns with NO default (one of them CHECKed) and five indexes. Nothing is dropped,
-- renamed or made NOT NULL. Every statement is re-runnable; migrate deploy runs this file as ONE
-- transaction, so there is no CONCURRENTLY here.
--
-- ⚠️ WHY THE STATEMENTS ARE IN THIS ORDER. ADD COLUMN takes ACCESS EXCLUSIVE, and inside this one
-- transaction that lock is HELD UNTIL COMMIT — including while any later index on that table builds,
-- which then blocks READS of the table as well as writes. So each table is locked as late as possible:
--   1 Position: the keyset index first (it names no new column, so it builds under SHARE and reads
--     stay open), then the column, then its 3 marker indexes;
--   2 Transaction column → its index; 3 PredictionMarket; 4 User (sign-in writes) last.
-- lock_timeout makes every acquisition fail with 55P03 within 3 s rather than stall bets
-- (test:house-bot-migrations (b)).
--
-- ⚠️ 04 A23 — LARGE TABLES ARE PREPARED BY HAND FIRST, so this file becomes a no-op.
-- If the read-only preflight prints "Position" > 500,000 rows or "Transaction" > 1,000,000, run the
-- following from psql in AUTOCOMMIT (never inside BEGIN), one statement at a time, BEFORE
-- `prisma migrate deploy`:
--   SET lock_timeout = '3s';
--   ALTER TABLE "Position"    ADD COLUMN IF NOT EXISTS "houseBotId" TEXT;
--   ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "houseBotId" TEXT;
--   SET lock_timeout = 0;
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Position_placedAt_id_idx" ON "Position" ("placedAt", "id");
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Position_houseBotId_placedAt_marked_idx" ON "Position" ("houseBotId", "placedAt") WHERE "houseBotId" IS NOT NULL;
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Position_marketId_marked_idx" ON "Position" ("marketId") WHERE "houseBotId" IS NOT NULL;
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Position_houseBotId_open_idx" ON "Position" ("houseBotId") WHERE "houseBotId" IS NOT NULL AND "status" = 'OPEN';
--   CREATE INDEX CONCURRENTLY IF NOT EXISTS "Transaction_createdAt_marked_idx" ON "Transaction" ("createdAt") WHERE "houseBotId" IS NOT NULL;
--   SELECT c.relname, i.indisvalid FROM pg_index i JOIN pg_class c ON c.oid = i.indexrelid
--    WHERE c.relname IN ('Position_placedAt_id_idx','Position_houseBotId_placedAt_marked_idx',
--          'Position_marketId_marked_idx','Position_houseBotId_open_idx','Transaction_createdAt_marked_idx');
-- ⛔ The COLUMNS come first: four of the five indexes name "houseBotId", which does not exist until
-- they are added, so "build the indexes first" is impossible without them. In autocommit each
-- nullable, default-less ADD COLUMN is a catalogue change that releases its lock at once.
-- ⛔ Every row of the last SELECT must say indisvalid = t. A failed CONCURRENTLY build leaves an
-- INVALID index under the SAME name, and IF NOT EXISTS below would then silently keep it: run
-- DROP INDEX CONCURRENTLY IF EXISTS "<that name>"; and build it again.

SET LOCAL lock_timeout = '3s';

-- ── 1 · Position.houseBotId — the house marker (PLAN §2, I8) ─────────────────────────────
-- The sweep keyset (PLAN §2). Built BEFORE the column is added: CREATE INDEX takes only SHARE, so
-- reads of "Position" stay open while it builds.
CREATE INDEX IF NOT EXISTS "Position_placedAt_id_idx" ON "Position" ("placedAt", "id");
-- Soft reference, written in CREATE only; every update path skips it (04 S3).
ALTER TABLE "Position" ADD COLUMN IF NOT EXISTS "houseBotId" TEXT;
-- Per-bot rolling windows: MIN_GAP, PER_HOUR, PER_DAY, GLOBAL_BETS_PER_MINUTE (PLAN §2; 04 A24).
CREATE INDEX IF NOT EXISTS "Position_houseBotId_placedAt_marked_idx" ON "Position" ("houseBotId", "placedAt")
    WHERE "houseBotId" IS NOT NULL;
-- House money on one market: OTHER_BOT, GLOBAL_PER_MARKET, houseStake snapshots (PLAN §2; 04 R9).
CREATE INDEX IF NOT EXISTS "Position_marketId_marked_idx" ON "Position" ("marketId")
    WHERE "houseBotId" IS NOT NULL;
-- Open exposure inside the locks, one GROUP BY for every bot (04 A24).
CREATE INDEX IF NOT EXISTS "Position_houseBotId_open_idx" ON "Position" ("houseBotId")
    WHERE "houseBotId" IS NOT NULL AND "status" = 'OPEN';

-- ── 2 · Transaction.houseBotId — the ledger marker (PLAN §2; 04 R3) ──────────────────────
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "houseBotId" TEXT;
-- House money by time: book.ts returned money, reports.
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_marked_idx" ON "Transaction" ("createdAt")
    WHERE "houseBotId" IS NOT NULL;

-- ── 3 · PredictionMarket.reopenedAt / reopenCount (N1 §2) ────────────────────────────────
-- Written only by adminReopenMarket; read for MARKET_REOPENED and the information blackout.
-- Both are never cleared.
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "reopenedAt" TIMESTAMPTZ(3);
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "reopenCount" INTEGER;

-- ── 4 · User password history (04 A4) ────────────────────────────────────────────────────
-- Written in the SAME update as the hash (commit 3). NULL on every existing row: the
-- password-context check then falls back to the awaited audit read, and a failed read blocks.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetAt" TIMESTAMPTZ(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSetVia" TEXT;
-- ⚠️ The CHECK is added in its own guarded block, NOT inline in the ADD COLUMN. Postgres splits an
-- inline column CHECK into a separate add-constraint step, so on a replay only the column would be
-- skipped and the constraint would fail as "already exists". ADD CONSTRAINT has no IF NOT EXISTS,
-- hence the catalogue look-up. Validating it scans "User" once, under the lock the ADD COLUMN took.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'User_passwordSetVia_check' AND conrelid = '"User"'::regclass
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_passwordSetVia_check"
      CHECK ("passwordSetVia" IS NULL OR "passwordSetVia" IN ('REGISTRATION','SELF_CHANGE','RESET_LINK','OFFICER_TEMP','REHASH'));
  END IF;
END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "emailSetByOfficerAt" TIMESTAMPTZ(3);
