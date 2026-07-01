-- Management Bonus Rules §6: Sequential bonuses — add QUEUED status.
-- A QUEUED grant waits for the player's current ACTIVE bonus to complete
-- before activating. No data migration needed — existing grants are all
-- ACTIVE/FULFILLED/EXPIRED/CANCELLED/FORFEITED.
ALTER TYPE "BonusGrantStatus" ADD VALUE IF NOT EXISTS 'QUEUED' AFTER 'ACTIVE';
