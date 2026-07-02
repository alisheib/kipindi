-- Wallet CHECK constraints (Phase 0c).
-- Enforces non-negative balances at the database level. Previously in comments only.
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_balance_non_negative" CHECK (balance >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_hold_non_negative" CHECK (hold >= 0);
ALTER TABLE "Wallet" ADD CONSTRAINT "wallet_bonus_balance_non_negative" CHECK ("bonusBalance" >= 0);
