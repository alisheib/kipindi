-- Drop the hard FK from Transaction.betId -> Bet.id.
--
-- `betId` is a SOFT reference: it holds either a legacy sports `Bet.id` or a
-- prediction-market `Position.id`. The platform has two wager types, so a
-- single-column FK to only one of them is incorrect. The constraint rejected
-- every prediction-market bet/settlement transaction (the Position id has no
-- matching Bet row), which crashed bet placement *after* the position row was
-- already written — leaving a phantom OPEN position and a debited wallet with
-- no ledger entry. The column stays; only the FK is removed.
ALTER TABLE "Transaction" DROP CONSTRAINT IF EXISTS "Transaction_betId_fkey";
