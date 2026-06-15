-- Single-active-session registry. One row per user = their one valid session.
-- Durable so the single-session invariant + server-side revocation survive
-- deploys (previously a globalThis Map, lost on every restart/scale event).
CREATE TABLE "ActiveSession" (
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ActiveSession_pkey" PRIMARY KEY ("userId")
);
