-- Drop legacy sports betting models (Phase 0b).
-- Ali decision (2 July 2026): kill legacy sports models permanently.
-- Prediction markets (PredictionMarket + Position) are the only wager type.

-- Drop tables in FK order (children first)
DROP TABLE IF EXISTS "Bet" CASCADE;
DROP TABLE IF EXISTS "BetBundle" CASCADE;
DROP TABLE IF EXISTS "Pool" CASCADE;
DROP TABLE IF EXISTS "Window" CASCADE;
DROP TABLE IF EXISTS "MatchEvent" CASCADE;
DROP TABLE IF EXISTS "Match" CASCADE;
DROP TABLE IF EXISTS "League" CASCADE;
DROP TABLE IF EXISTS "Team" CASCADE;
DROP TABLE IF EXISTS "Sport" CASCADE;

-- Drop orphaned enums
DROP TYPE IF EXISTS "BetStatus";
DROP TYPE IF EXISTS "BetOutcome";
DROP TYPE IF EXISTS "WindowStatus";
DROP TYPE IF EXISTS "WindowKind";
DROP TYPE IF EXISTS "MatchStatus";
