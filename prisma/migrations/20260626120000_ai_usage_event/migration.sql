-- Per-call AI usage ledger. One row per Claude API call (poll generation, help
-- chatbot, market sentinel) so the admin AI-usage page can show exact time,
-- model, token counts, web-search count, cost, and success/error for every
-- call, with indexes for paginated/filtered/time-ranged views.
CREATE TABLE "AiUsageEvent" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "feature" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "webSearches" INTEGER NOT NULL DEFAULT 0,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "errorType" TEXT,
    "latencyMs" INTEGER,
    "detail" TEXT,
    CONSTRAINT "AiUsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AiUsageEvent_createdAt_idx" ON "AiUsageEvent"("createdAt");
CREATE INDEX "AiUsageEvent_feature_createdAt_idx" ON "AiUsageEvent"("feature", "createdAt");
CREATE INDEX "AiUsageEvent_ok_createdAt_idx" ON "AiUsageEvent"("ok", "createdAt");
