-- Record when a self-exclusion / cooling-off period actually began.
--
-- The cross-operator self-exclusion register (reports catalogue `sx-register`) has a
-- "Started" column. It was populated with `User.createdAt` — the player's ACCOUNT
-- REGISTRATION date — because no exclusion-start was stored anywhere. On a register
-- whose sole purpose is enforcing an exclusion window across licensed operators, that
-- column was wrong for every row, and internally inconsistent with the "days remaining"
-- column beside it, which is derived from the (correct) end date.
--
-- SAFETY: two additive nullable columns, no default, no backfill, no index →
-- PostgreSQL applies this as a catalogue-only change with no table rewrite.
-- Deliberately NOT backfilled: for exclusions set before this migration the true start
-- is unknown, and the register prints "—" rather than inventing a date. Rollback is
-- `ALTER TABLE "ResponsibleGambling" DROP COLUMN ...`.
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "selfExclusionStartedAt" TIMESTAMP(3);
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "coolingOffStartedAt"    TIMESTAMP(3);
