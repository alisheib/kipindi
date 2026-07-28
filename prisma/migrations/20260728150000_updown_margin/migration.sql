-- Up & Down dynamic pricing (2026-07-28): base ± margin winning boundaries.
-- Additive + idempotent — safe on the live DB (nullable ADD COLUMNs are catalogue-only
-- on PostgreSQL 11+, no table rewrite). Existing/in-flight rounds keep NULL targets and
-- resolve via the legacy openPrice±minMove fallback, so no data backfill is needed.
--
-- marginBps = winning-boundary margin in basis points (50 = 0.5%, the "50pick" factor).
-- On a chain: NULL = inherit the product default (updown.config.defaultMarginBps).
-- On a round: frozen at open, alongside the computed up/down target prices.

ALTER TABLE "UpDownChain" ADD COLUMN IF NOT EXISTS "marginBps" INTEGER;

ALTER TABLE "UpDownRound" ADD COLUMN IF NOT EXISTS "marginBps"  INTEGER;
ALTER TABLE "UpDownRound" ADD COLUMN IF NOT EXISTS "upTarget"   DECIMAL(24, 8);
ALTER TABLE "UpDownRound" ADD COLUMN IF NOT EXISTS "downTarget" DECIMAL(24, 8);
