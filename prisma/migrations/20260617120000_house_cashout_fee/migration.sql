-- Early-cash-out commission is booked to the house reserve as its own ledger
-- type (kept distinct from RESERVE_FEE so operator-revenue reporting is clean).
-- ADD VALUE IF NOT EXISTS is idempotent and runs outside the migration's needs
-- for the value to be used in the same transaction (it isn't here).
ALTER TYPE "HousePoolEntryType" ADD VALUE IF NOT EXISTS 'CASHOUT_FEE';
