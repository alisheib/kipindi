-- ⭐ THE PURGE TOMBSTONE — three additive columns on PredictionMarket.
--
-- WHY. The chain-purge ceremony (/admin/retention, docs/DATA-RETENTION.md §7) removes an
-- archived Up & Down chain's price story and player-facing chaff. It does NOT delete the
-- markets: a purged market survives as a stamped tombstone, with its pools, feeSnapshot,
-- resolvedOutcome and settledAt intact, and every Position, Transaction, LedgerEntry and
-- HousePoolLedger that references it untouched.
--
-- ⛔ WHY REDACT AND NOT DELETE, PROVEN ON PRODUCTION 2026-08-28. `LedgerEntry.marketId`,
-- `HousePoolLedger.marketId` and `Transaction.positionId` are loose strings with NO foreign
-- key. A teardown script deleted markets and left two STAKE_DEBIT pairs standing, so the books
-- claimed TZS 2,000 escrowed for a market that no longer existed — and `house-money.cjs` still
-- printed "the books balance", because both halves of each pair were present and the grand
-- total was still zero. A market delete at the scale of a whole chain manufactures that
-- thousands of times over with every money suite green. Keeping the row is what makes
-- "every account means what it says" true, rather than only "the total is zero".
--
-- ⭐ AND IT LABELS THE ACT. The 2026-08-04 incident (~2,515 rounds cleared, 1,915 phantom
-- "failures", `scripts/live/ops/e63-window.cjs` written to diagnose it) happened because
-- deletion was SILENT and UNLABELLED — ops tooling counted what it could not explain as
-- breakage. `purgedAt` is the opposite of unlabelled, and that is the point of it.
--
-- ⚠️ NULL MEANS NEVER PURGED. Purely additive, nullable, NO DEFAULT and NO BACKFILL, so every
-- pre-existing row reads NULL from the moment this lands. That is the truthful reading and
-- every consumer must state it explicitly: a query that treats NULL as anything other than
-- "this market was never purged" is reading a migration artefact as a fact.
--
-- ⭐ EXPAND-ONLY AND RE-RUNNABLE. No drop, no type change, no rename, no default. Adding a
-- nullable column with no default is a CATALOGUE-ONLY change in PostgreSQL — it does not
-- rewrite the table and does not hold ACCESS EXCLUSIVE for the length of a scan, so it is safe
-- against a live table. `IF NOT EXISTS` makes a re-apply a no-op, which matters because
-- `migrate deploy` runs BEFORE `next start`: a migration that fails on a second run is not a
-- failed migration, it is a service that does not boot.
--
-- ⛔ AUTHORED, NOT APPLIED. `prisma/` belongs to Session M under the parallel-session contract.
-- This file and the matching `schema.prisma` block were written so the branch typechecks and
-- builds; Session M applies it. Do not run `prisma migrate` from the enhancement session.

ALTER TABLE "PredictionMarket"
  ADD COLUMN IF NOT EXISTS "purgedAt"    TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "purgedBy"    TEXT,
  ADD COLUMN IF NOT EXISTS "purgeReason" TEXT;
