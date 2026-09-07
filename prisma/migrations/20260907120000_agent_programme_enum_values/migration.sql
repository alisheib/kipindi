-- AGENT AFFILIATE PROGRAMME — step 1 of 3: ENUM VALUES ONLY.
--
-- ⛔ THIS FILE DOES NOTHING ELSE, AND THAT IS THE WHOLE POINT.
-- `ALTER TYPE … ADD VALUE` is not reversible, and Postgres refuses to USE a value
-- added in the same transaction that added it. `prisma migrate deploy` wraps each
-- migration FILE in its own transaction, so the additions have to land here and the
-- columns that reference them in the file after. Mixing the two is a migration that
-- passes review and fails on the container that runs it.
--
-- `IF NOT EXISTS` is idempotent, so hand-applying this before a push (normal practice
-- here) does not make the recorded migration fail on replay against a fresh database.

-- ── TxnType ────────────────────────────────────────────────────────────────────
-- 🔴 Agent commission was booking as BONUS_CREDIT, which reports contracted business
-- income to the Gaming Board as *bonus cost* — for a programme we told the Board we
-- withdrew. It is real, withdrawable cash for services rendered and it needs its own
-- line in the owner's book.
ALTER TYPE "TxnType" ADD VALUE IF NOT EXISTS 'AGENT_COMMISSION';
-- The clawback leg, kept distinct from ADJUSTMENT_DEBIT so commission can be netted
-- against its own reversals instead of disappearing into admin adjustments.
ALTER TYPE "TxnType" ADD VALUE IF NOT EXISTS 'AGENT_COMMISSION_REVERSAL';

-- ── ReferralRewardStatus ───────────────────────────────────────────────────────
-- A clawed-back accrual. The ROW survives — a reversed liability is still a fact —
-- and the per-recruit cap and the earnings total stop counting it.
ALTER TYPE "ReferralRewardStatus" ADD VALUE IF NOT EXISTS 'REVERSED';

-- ── LedgerEntryType ────────────────────────────────────────────────────────────
-- Commission out of operator revenue, and the TZS 100,000 registration fee in.
-- ⛔ The fee is money taken from a member of the public. Without a ledger entry it is
-- invisible to the house book, the trial balance, the regulator pack and every tax
-- figure. It is NOT gaming revenue, so it never touches `levySplit`.
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'AGENT_COMMISSION';
ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS 'AGENT_REGISTRATION_FEE';
