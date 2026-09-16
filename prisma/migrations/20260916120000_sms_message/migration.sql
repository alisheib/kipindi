-- SMS TRANSPORT LOG — one row per SMS this platform attempts, keyed by the `reference` we mint
-- and hand to the Blackball gateway (2026-09-16).
--
-- ⭐ WHY A TABLE AND NOT A COLUMN ON Otp / InviteEntry. A delivery receipt carries the reference and
-- nothing else, and arrives minutes later, possibly at a different container. Two nullable columns on
-- two unrelated tables would split the callback into two speculative lookups, leave an operational
-- send with no home at all, and put delivery mechanics on tables that are about something else.
--
-- ⛔ THE MESSAGE BODY IS NOT A COLUMN HERE AND MUST NEVER BECOME ONE. It carries the OTP. `bodyLen`
-- answers the cost and truncation questions; the text would only make this the richest credential
-- store on the platform.
--
-- ⛔ EXPAND ONLY: two new enums, one new table, four indexes. The previously-deployed container never
-- names any of them, so it keeps serving unchanged through Railway's overlap window.
-- ⛔ NO CONCURRENTLY (prisma migrate deploy runs inside a transaction). IF NOT EXISTS on every
-- statement so the file is re-runnable; the enums use the DO-block form, which is the only way to get
-- IF NOT EXISTS semantics for CREATE TYPE on PostgreSQL. The table is new and empty, so there is no
-- lock to measure.

DO $$ BEGIN
    CREATE TYPE "SmsPurpose" AS ENUM ('OTP', 'INVITE', 'OPS');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "SmsStatus" AS ENUM ('QUEUED', 'ACCEPTED', 'DELIVERED', 'FAILED', 'UNKNOWN');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "SmsMessage" (
    "reference"   TEXT           NOT NULL,
    "msisdn"      TEXT           NOT NULL,
    "purpose"     "SmsPurpose"   NOT NULL,
    "provider"    TEXT           NOT NULL,
    "senderId"    TEXT           NOT NULL,
    "bodyLen"     INTEGER        NOT NULL,
    "status"      "SmsStatus"    NOT NULL DEFAULT 'QUEUED',
    "providerMsg" TEXT,
    "dlrStatus"   TEXT,
    "dlrDesc"     TEXT,
    "balanceTzs"  DECIMAL(18, 2),
    "attempts"    INTEGER        NOT NULL DEFAULT 0,
    "targetType"  TEXT,
    "targetId"    TEXT,
    "createdAt"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt"      TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "failedAt"    TIMESTAMP(3),
    CONSTRAINT "SmsMessage_pkey" PRIMARY KEY ("reference")
);

CREATE INDEX IF NOT EXISTS "SmsMessage_status_createdAt_idx"     ON "SmsMessage" ("status", "createdAt");
CREATE INDEX IF NOT EXISTS "SmsMessage_msisdn_createdAt_idx"     ON "SmsMessage" ("msisdn", "createdAt");
CREATE INDEX IF NOT EXISTS "SmsMessage_createdAt_idx"            ON "SmsMessage" ("createdAt");
CREATE INDEX IF NOT EXISTS "SmsMessage_targetType_targetId_idx"  ON "SmsMessage" ("targetType", "targetId");
