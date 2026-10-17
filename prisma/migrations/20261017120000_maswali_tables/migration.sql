-- MASWALI MILLIONEA — step 1 of 3: the week, its fifteen questions and its tickets (MASWALI-BUILD S1).
--
-- ⛔ THESE TABLES NEVER HOLD MONEY (MASWALI-PLAN §4). A week IS a "PredictionMarket" row (productLine 'MASWALI') and a
-- ticket IS a "Position"; every shilling moves through Position / Transaction / LedgerEntry. The settlement columns on
-- "MaswaliCycle" mirror the ledger and are written in the same transaction.
--
-- Hand-written, additive, re-runnable (AGENTS.md §5): CREATE … IF NOT EXISTS with every CHECK and FOREIGN KEY inline
-- (ADD CONSTRAINT has no IF NOT EXISTS); the one added column is ADD COLUMN IF NOT EXISTS. Nothing existing is altered
-- except one nullable column on "Objection". The foreign keys take a brief SHARE ROW EXCLUSIVE lock on
-- "PredictionMarket" and "Position" while the empty tables are created.
BEGIN;
SET LOCAL lock_timeout = '3s';

CREATE TABLE IF NOT EXISTS "MaswaliCycle" (
    "id" TEXT NOT NULL,
    "marketId" TEXT,
    "code" TEXT NOT NULL,
    "seq" INTEGER NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'PUBLIC',
    "state" TEXT NOT NULL,
    "opensAt" TIMESTAMP(3) NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "finalDeadlineAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "rulesSnapshot" JSONB,
    "questionSetHash" TEXT,
    "ticketMerkleRoot" TEXT,
    "ticketCount" INTEGER NOT NULL DEFAULT 0,
    "salesAtClose" DECIMAL(18,2),
    "gradedSetFinalAt" TIMESTAMP(3),
    "objectionsCloseAt" TIMESTAMP(3),
    "objectionRestarted" BOOLEAN NOT NULL DEFAULT false,
    "rolloverIn" DECIMAL(18,2),
    "jackpot" DECIMAL(18,2),
    "fee" DECIMAL(18,2),
    "traLevy" DECIMAL(18,2),
    "gbtLevy" DECIMAL(18,2),
    "topUp" DECIMAL(18,2),
    "winningTickets" INTEGER,
    "sharePerTicket" DECIMAL(18,2),
    "paidTotal" DECIMAL(18,2),
    "carryOut" DECIMAL(18,2),
    "dustCarried" DECIMAL(18,2),
    "settlementGroupId" TEXT,
    "settledAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "parityAttestedBy" TEXT,
    "parityAttestedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MaswaliCycle_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaswaliCycle_marketId_fkey" FOREIGN KEY ("marketId") REFERENCES "PredictionMarket"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaswaliCycle_state_check" CHECK ("state" IN ('DRAFT', 'OPEN', 'CLOSED', 'RESOLVING', 'SETTLED', 'VOIDED')),
    CONSTRAINT "MaswaliCycle_visibility_check" CHECK ("visibility" IN ('PUBLIC', 'DRIVE')),
    CONSTRAINT "MaswaliCycle_ticketCount_check" CHECK ("ticketCount" >= 0),
    CONSTRAINT "MaswaliCycle_close_after_open_check" CHECK ("closesAt" > "opensAt"),
    -- A week past DRAFT has frozen its rules and its question set (MR-13): the open stamps both, once…
    CONSTRAINT "MaswaliCycle_frozen_after_draft_check" CHECK ("state" = 'DRAFT' OR ("rulesSnapshot" IS NOT NULL AND "questionSetHash" IS NOT NULL)),
    -- …and has its market: the open creates it (a DRAFT holds no market, so none sits in the poll moderation lists).
    CONSTRAINT "MaswaliCycle_market_after_draft_check" CHECK ("state" = 'DRAFT' OR "marketId" IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS "MaswaliQuestion" (
    "id" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "ordinal" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "textEn" TEXT NOT NULL,
    "textSw" TEXT NOT NULL,
    "textZh" TEXT NOT NULL,
    "criterionEn" TEXT NOT NULL,
    "criterionSw" TEXT NOT NULL,
    "criterionZh" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "fallbackSourceUrl" TEXT,
    "fallbackSourceDomain" TEXT,
    "readingTolerance" TEXT,
    "eventKind" TEXT NOT NULL,
    "eventStartsAt" TIMESTAMP(3) NOT NULL,
    "eventZone" TEXT NOT NULL,
    "observedStartsAt" TIMESTAMP(3),
    "voidDeadlineAt" TIMESTAMP(3) NOT NULL,
    "probabilityEstimate" DECIMAL(5,4),
    "probabilitySource" TEXT,
    "linkedMarketId" TEXT,
    "outcome" TEXT,
    "voidReason" TEXT,
    "evidence" TEXT,
    "evidenceCaptureRef" TEXT,
    "sealedBy" TEXT,
    "sealedAt" TIMESTAMP(3),
    "twoOfficerAtStage1" BOOLEAN,
    "stage2By" TEXT,
    "stage2At" TIMESTAMP(3),
    "aiSuggestion" JSONB,
    CONSTRAINT "MaswaliQuestion_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaswaliQuestion_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MaswaliCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaswaliQuestion_role_check" CHECK ("role" IN ('MAIN', 'RESERVE')),
    -- MAIN 1..10 on slots 1..10; RESERVE 1..5 on slots 11..15 (MR-6).
    CONSTRAINT "MaswaliQuestion_ordinal_check" CHECK (("role" = 'MAIN' AND "ordinal" BETWEEN 1 AND 10 AND "slot" = "ordinal")
                                                  OR ("role" = 'RESERVE' AND "ordinal" BETWEEN 1 AND 5 AND "slot" = "ordinal" + 10)),
    CONSTRAINT "MaswaliQuestion_outcome_check" CHECK ("outcome" IS NULL OR "outcome" IN ('YES', 'NO', 'VOID')),
    -- A void always names its ground (OD-04's closed list); a YES or NO never carries one.
    CONSTRAINT "MaswaliQuestion_void_reason_check" CHECK (("outcome" = 'VOID') = ("voidReason" IS NOT NULL)),
    CONSTRAINT "MaswaliQuestion_event_kind_check" CHECK ("eventKind" IN ('SPORT', 'PRICE', 'WEATHER', 'ANNOUNCEMENT'))
);

CREATE TABLE IF NOT EXISTS "MaswaliTicket" (
    "id" TEXT NOT NULL,
    "positionId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "serial" TEXT NOT NULL,
    "selections" JSONB NOT NULL,
    "salt" TEXT NOT NULL,
    "selectionsHash" TEXT NOT NULL,
    "picksKey" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "closeAtPurchase" TIMESTAMP(3) NOT NULL,
    "rulesVersion" TEXT NOT NULL,
    "score" INTEGER,
    "won" BOOLEAN,
    "payout" DECIMAL(18,2),
    "frozenReason" TEXT,
    "lastViewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaswaliTicket_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "MaswaliTicket_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaswaliTicket_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MaswaliCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaswaliTicket_status_check" CHECK ("status" IN ('LIVE', 'CANCELLED', 'SETTLED')),
    CONSTRAINT "MaswaliTicket_score_check" CHECK ("score" IS NULL OR "score" BETWEEN 0 AND 10),
    CONSTRAINT "MaswaliTicket_cancelled_check" CHECK (("status" = 'CANCELLED') = ("cancelledAt" IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliCycle_marketId_key" ON "MaswaliCycle"("marketId");
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliCycle_code_key" ON "MaswaliCycle"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliCycle_seq_key" ON "MaswaliCycle"("seq");
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliCycle_settlementGroupId_key" ON "MaswaliCycle"("settlementGroupId");
CREATE INDEX IF NOT EXISTS "MaswaliCycle_state_closesAt_idx" ON "MaswaliCycle"("state", "closesAt");
-- ⭐ ONE OPEN WEEK PER VISIBILITY (MR-3): a public week and a private DRIVE week may run side by side, never two of
-- one kind. ⛔ Deliberately NO "one closed-unsettled week" index: a stalled week N would then stop week N+1 from
-- closing (MB-16) — the chain order (`seq`) is what keeps settlement sequential.
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliCycle_one_open_per_visibility_key" ON "MaswaliCycle"("visibility") WHERE "state" = 'OPEN';

CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliQuestion_cycleId_slot_key" ON "MaswaliQuestion"("cycleId", "slot");
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliQuestion_cycleId_role_ordinal_key" ON "MaswaliQuestion"("cycleId", "role", "ordinal");

CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliTicket_positionId_key" ON "MaswaliTicket"("positionId");
CREATE UNIQUE INDEX IF NOT EXISTS "MaswaliTicket_serial_key" ON "MaswaliTicket"("serial");
CREATE INDEX IF NOT EXISTS "MaswaliTicket_cycleId_userId_status_idx" ON "MaswaliTicket"("cycleId", "userId", "status");
CREATE INDEX IF NOT EXISTS "MaswaliTicket_cycleId_score_idx" ON "MaswaliTicket"("cycleId", "score");
CREATE INDEX IF NOT EXISTS "MaswaliTicket_userId_createdAt_idx" ON "MaswaliTicket"("userId", "createdAt");

-- Millionea objections are per QUESTION (MR-16): "questionOrdinal" is the canonical slot 1..15, NULL on every other
-- product. One objection per (week, question, player); the other products keep their one-open-per-market rule in code.
ALTER TABLE "Objection" ADD COLUMN IF NOT EXISTS "questionOrdinal" INTEGER;
CREATE UNIQUE INDEX IF NOT EXISTS "Objection_maswali_question_player_key" ON "Objection"("marketId", "questionOrdinal", "userId")
  WHERE "questionOrdinal" IS NOT NULL;

COMMIT;
