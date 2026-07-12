-- Settlement-proof (F1): the officer's recorded evidence excerpt.
--
-- The exact quote from the official source that justifies the verdict is captured
-- at stage-1 of the two-officer resolution ceremony and written immutably to the
-- audit chain. This denormalised column is a read cache so the player-facing
-- ResolutionPanel can render the evidence without scanning the HMAC audit log on a
-- hot page. Additive + nullable; existing rows get NULL (empty-state, never
-- fabricated). Capped at 2000 chars at the application layer.
ALTER TABLE "PredictionMarket" ADD COLUMN IF NOT EXISTS "resolutionEvidence" TEXT;
