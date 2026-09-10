-- AGENT FEE PAID FROM THE WALLET — step 2 of 2: the new type and the column.
--
-- Runs in its own transaction, AFTER the `TxnType` value added in step 1, so nothing
-- here uses an enum value added in this same transaction.

-- ── AgentFeeFundingSource ──────────────────────────────────────────────────────
-- ⭐ WHERE THE FEE'S MONEY ACTUALLY CAME FROM, recorded at COLLECTION.
--
-- ⛔ THIS EXISTS BECAUSE A REFUND MUST MIRROR THE COLLECTION, NOT TODAY'S POLICY —
-- the same doctrine that already governs VAT here ("a refund reverses the VAT actually
-- BOOKED, never today's rate", 2026-09-09). An application collected out of band has
-- to be refunded out of band; one paid from a wallet has to be refunded to that wallet.
--
-- ⚠️ It could be INFERRED at refund time by reading whether the collection's ledger
-- group carries a `PLAYER:<userId>` leg, and `ledgerGroupAccountSum` already does
-- exactly that for the VAT leg. But that read returns `null` for "could not ask", and
-- guessing wrong is not a rounding error: guess EXTERNAL on a wallet-funded fee and the
-- person's money is sent to a bank account they never paid from; guess WALLET on an
-- out-of-band fee and we credit a wallet that was never debited and mint shillings.
-- A stored fact beats an inferred one when the cost of being wrong is real money.
-- The ledger read is kept as a CROSS-CHECK, not as the source of truth.
--
-- EXTERNAL is declared first so the type reads in historical order.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AgentFeeFundingSource') THEN
    CREATE TYPE "AgentFeeFundingSource" AS ENUM ('EXTERNAL', 'WALLET');
  END IF;
END $$;

-- ── AgentApplication.feeFundingSource ──────────────────────────────────────────
-- ⛔ NULLABLE WITH NO DEFAULT, DELIBERATELY, AND NOT BACKFILLED.
--
-- `null` means "this row predates the ruling", which is a different fact from
-- "this row was collected out of band", even though both are read as EXTERNAL today.
-- Measured on production 2026-09-10 before writing this: the whole `AgentApplication`
-- table is TWO rows — one APPROVED with a COLLECTED out-of-band fee, and one DRAFT that
-- has paid nothing. So there is no population worth backfilling and no applicant
-- mid-payment on the old rail.
--
-- ⛔ AND THE ONE APPROVED ROW MUST NOT BE REWRITTEN. Its fee was collected at 18% VAT
-- under the rate then in force and Ali's 2026-09-09 ruling is explicitly NOT
-- retroactive; the 18,000 in `HOUSE:TAX` is a genuine liability to TRA. A backfill that
-- stamped it EXTERNAL would be harmless in itself but would set the precedent that this
-- table's history is editable. It is not.
ALTER TABLE "AgentApplication" ADD COLUMN IF NOT EXISTS "feeFundingSource" "AgentFeeFundingSource";
