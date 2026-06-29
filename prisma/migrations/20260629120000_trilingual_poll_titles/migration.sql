-- Trilingual poll/market titles — add Chinese (ZH) display titles alongside the
-- existing English + Swahili across every model that carries a market question.
--
-- Design notes:
--   * Every new column is NULLABLE. Existing rows get NULL and the app falls back
--     to the English title at render time (pickLocalized), so this migration is
--     fully additive and backward-compatible — no data is rewritten.
--   * English remains the CANONICAL / binding language for resolution. The
--     resolution criterion and source URL are unchanged; only display titles are
--     translated.
--   * Notification already had code reading titleZh/bodyZh; the columns are added
--     here so the generator can populate them.
ALTER TYPE "Locale" ADD VALUE IF NOT EXISTS 'ZH';

ALTER TABLE "PredictionMarket" ADD COLUMN     "titleZh" TEXT;
ALTER TABLE "AIPoll"           ADD COLUMN     "titleZh" TEXT;
ALTER TABLE "MarketCandidate"  ADD COLUMN     "proposedTitleZh" TEXT;
ALTER TABLE "Proposal"         ADD COLUMN     "titleZh" TEXT;
ALTER TABLE "Notification"     ADD COLUMN     "titleZh" TEXT;
ALTER TABLE "Notification"     ADD COLUMN     "bodyZh" TEXT;
