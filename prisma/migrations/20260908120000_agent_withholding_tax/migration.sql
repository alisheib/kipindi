-- AGENT COMMISSION WITHHOLDING TAX — management's feedback on Agent v1, 2026-09-08.
--
-- Their financial waterfall added a line the platform did not model: 5% local withholding tax
-- on the agent's own gross commission, deducted before the cash reaches the wallet. The
-- accrual now records all three figures so the deduction can be SHOWN to the partner and
-- REVERSED by a clawback without anyone re-deriving it from a rate that may since have moved.
--
-- ⚠️ BOTH COLUMNS ARE NULLABLE, AND THE NULL IS LOAD-BEARING — it is not laziness about a
-- backfill. A row accrued before today had no withholding, and for those rows `amountTzs` IS
-- the gross. The per-recruit cap therefore sums `COALESCE("grossAmountTzs", "amountTzs")`.
-- Backfilling `grossAmountTzs = amountTzs` would look tidier and would be a lie of a
-- different kind: it would assert that a gross figure was recorded at accrual when it was
-- not, and it would erase the boundary between the two eras that the cap arithmetic depends
-- on being able to see.
--
-- ⛔ NOT THE 15% WITHDRAWAL TAX. That was deleted in 2026-07 and `LedgerEntryType.
-- WITHDRAWAL_TAX` stays dead. This is a deduction on commission INCOME at the moment it is
-- earned, remitted to `HOUSE:TAX` in the same balanced ledger group as the credit.
--
-- Additive and non-blocking: two nullable columns, no default, no rewrite, no lock beyond the
-- catalogue update. Safe on a live table.

ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "grossAmountTzs" DECIMAL(18,2);
ALTER TABLE "ReferralReward" ADD COLUMN IF NOT EXISTS "taxWithheldTzs" DECIMAL(18,2);
