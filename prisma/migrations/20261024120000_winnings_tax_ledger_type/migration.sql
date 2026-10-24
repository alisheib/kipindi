-- FEE-TAX-2026-10 · RELEASE R2 (lane b) — step 1 of 2: THE WINNINGS-TAX LEDGER ENTRY TYPE, AND NOTHING ELSE.
--
-- ⛔ THIS FILE DOES NOTHING ELSE, AND THAT IS THE WHOLE POINT (the rule of 20260907120000_agent_programme_enum_values and
-- 20261017120100_maswali_ledger_types). `ALTER TYPE … ADD VALUE` is not reversible, and Postgres refuses to USE a value
-- added in the same transaction that added it. `prisma migrate deploy` wraps each file in its own transaction, so the value
-- lands here, alone, and the code that books it ships after. `IF NOT EXISTS` keeps a hand-applied copy from failing the
-- replay.
--
-- What it names (docs/FEE-TAX-PLAN.md §3, Ali's rulings of 2026-10-24 — decided, NOT in force until release R5 flips
-- src/lib/fee-law-gate.ts): under the `stake-share` fee model a winner's prize carries a winnings tax, withheld at
-- settlement and owed to TRA. Each winner's settlement group books it POOL → HOUSE:WINNINGS_TAX under this type
-- (`ledger.ts → settlementPayoutEntries`). ⛔ It is NOT the dead SETTLEMENT_TAX (taxRate × pool) or WITHDRAWAL_TAX (15% of
-- every withdrawal), both deleted in 2026-07 and never reused; and it is not a levy on our fee (SETTLEMENT_TRA_LEVY).
-- No row uses the value until a stake-share market settles, and none can be created while the gate is shut.

ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'SETTLEMENT_WINNINGS_TAX';
