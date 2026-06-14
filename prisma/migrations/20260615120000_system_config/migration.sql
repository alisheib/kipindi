-- Durable key/value store for admin-tunable settings that were globalThis-only
-- (market fee/stake config, house-pool balance+seeds, affiliate/proposals/ai-poll
-- config, disabled market categories) and therefore reset to code defaults on
-- every deploy. Each module owns one or more keys; value is its config as JSON.
CREATE TABLE "SystemConfig" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("key")
);
