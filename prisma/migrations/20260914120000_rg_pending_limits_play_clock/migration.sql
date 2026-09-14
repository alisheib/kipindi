-- E-408 remainder (session 97, 2026-09-14) — docs/COMPLIANCE-DECISIONS.md 2026-09-14 (eighth) is the record.
--
-- ⛔ EVERY STATEMENT IS RE-RUNNABLE, and EXPAND-ONLY: six nullable columns, no default, no backfill, nothing
-- dropped or renamed. The container still serving during the deploy has a generated client that does not
-- name them, so it keeps working.

-- ── 1 · a LOOSER loss or session limit waits 24 hours ───────────────────────────────────────────────────
-- `…To` NULL with `…EffectiveAt` set is a pending REMOVAL (the same shape the deposit limits use since E-408).
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "pendingLossLimitTo" DECIMAL(18,2);
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "pendingLossLimitEffectiveAt" TIMESTAMP(3);
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "pendingSessionLimitTo" INTEGER;
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "pendingSessionLimitEffectiveAt" TIMESTAMP(3);

-- ── 2 · the play-session clock, per player ──────────────────────────────────────────────────────────────
-- The session time limit measured from the signed cookie's `playStartedAt`, which a new sign-in restamps: signing
-- out and in restarted the limit. These hold the sitting's start and the last bet attempt, per player.
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "playStartedAt" TIMESTAMP(3);
ALTER TABLE "ResponsibleGambling" ADD COLUMN IF NOT EXISTS "playLastSeenAt" TIMESTAMP(3);
