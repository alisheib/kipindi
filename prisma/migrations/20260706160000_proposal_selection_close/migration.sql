-- Proposal → betting-close (selection) date.
--
-- Proposers (and officers) can specify WHEN betting closes, distinct from the
-- resolution date. Optional and additive; when unset, the market's
-- selectionClosedAt is auto-derived at publish (existing behaviour). Always
-- validated <= resolutionDate at the application layer.
ALTER TABLE "Proposal" ADD COLUMN IF NOT EXISTS "selectionCloseDate" TEXT;
