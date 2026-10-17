-- MASWALI MILLIONEA — step 2 of 3: LEDGER ENTRY TYPES ONLY (MASWALI-BUILD S1).
--
-- ⛔ THIS FILE DOES NOTHING ELSE, AND THAT IS THE WHOLE POINT (the rule of 20260907120000_agent_programme_enum_values).
-- `ALTER TYPE … ADD VALUE` is not reversible, and Postgres refuses to USE a value added in the same transaction that
-- added it. `prisma migrate deploy` wraps each file in its own transaction, so the values land here, alone, and the
-- code that books them ships after. `IF NOT EXISTS` keeps a hand-applied copy from failing the replay.
--
-- The seven movements of a Millionea week that no existing type names (MASWALI-PLAN §5). A ticket's stake, its free
-- cancel, its payout and the fee at payout reuse STAKE_DEBIT / REFUND / PAYOUT_CREDIT / SETTLEMENT_COMMISSION (with
-- the two SETTLEMENT_*_LEVY lines), so the house book and the trial balance read them the way they read every bet.

-- A no-winner week's sales (or a winning week's rounding dust) → HOUSE:MASWALI_JACKPOT.
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_ROLLOVER_OUT';
-- HOUSE:MASWALI_JACKPOT → the week's pool: the carry a winning week claims, exactly once.
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_ROLLOVER_IN';
-- HOUSE:MASWALI_GUARANTEE → the week's pool: the floor top-up, winning weeks only, never rolled.
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_TOPUP';
-- Owner capital → HOUSE:MASWALI_GUARANTEE (the Owner's audited funding ceremony).
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_GUARANTEE_FUND';
-- HOUSE:MASWALI_GUARANTEE → owner capital (only what no open week could still need).
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_GUARANTEE_RETURN';
-- A frozen share the Owner forfeits → HOUSE:MASWALI_JACKPOT. ⛔ Never to the house (OD-07).
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_FORFEIT_RETURN';
-- HOUSE:MASWALI_JACKPOT → the final week's pool when the product is retired (OD-03).
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'MASWALI_SUNSET';
