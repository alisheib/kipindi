-- Capped-fee model (2026-07).
--
--   fee = min(commissionRate * pool, feeCeilingRate * min(yesPool, noPool))
--
-- Replaces a flat 9%-of-pool rake that, on a lopsided poll, grew LARGER THAN THE
-- ENTIRE PRIZE and was therefore paid out of the winners' own returned stakes.
-- On the poll that triggered this work (YES 300,000 / NO 10,500) the fee was
-- 31,050 against a prize of 10,500, and a 100,000 stake on the WINNING side paid
-- back 93,150 — a 6,850 loss on a correct call.
--
-- Two changes here:
--   1. PredictionMarket.feeSnapshot — the rates a poll is priced at, frozen at
--      creation. Settlement/cash-out/previews read this, never live admin config.
--   2. LedgerEntryType.WITHDRAWAL_FEE — the 1% withdrawal fee. The 15% withholding
--      tax it replaces is gone (it taxed a player's own untouched deposit).
--
-- The retired entry types (WITHDRAWAL_TAX, SETTLEMENT_TAX, SETTLEMENT_RESERVE,
-- SETTLEMENT_AGGREGATOR) are deliberately NOT dropped. Historical LedgerEntry rows
-- reference them and the books must continue to reconcile; dropping an enum value
-- that live rows use would fail the migration and orphan real money. They are
-- simply never written again.

-- 1. The frozen rates. Nullable: existing rows are stamped by the backfill
--    (scripts/backfill-fee-snapshots.mts), and snapshotOrLegacy() in
--    market-config.ts prices any straggler at the OLD 9% commission plus the NEW
--    ceiling — which can only ever pay its winners MORE than they were quoted.
ALTER TABLE "PredictionMarket" ADD COLUMN "feeSnapshot" JSONB;

-- 2. The withdrawal fee entry type.
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'WITHDRAWAL_FEE';
