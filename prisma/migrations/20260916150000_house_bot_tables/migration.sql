-- HOUSE BOTS — the tables (PLAN §2; 04 A3, A4, A8, A10, A11, A16, A20, A23, A24, C1, C2, C8, F2, F4,
-- F5, P1; N1 §2 and N2 §2, the sealed text). docs/COMPLIANCE-DECISIONS.md (House bots) is the record;
-- this file carries the mechanics.
--
-- ⛔ MIGRATION LAW (04 S1 + A23). Applied from the operator's machine with `prisma migrate deploy`
-- BEFORE the push (REL-2), so the deploy's own `migrate deploy` is a no-op; CI replays it on an empty
-- database. Therefore:
--   · The first statement is SET LOCAL lock_timeout: a blocked apply fails with 55P03 within 3 s
--     instead of queueing every write behind it. `migrate deploy` sends this file as one script, which
--     Postgres runs as one implicit transaction, so SET LOCAL holds for the whole file — proven by
--     test:house-bot-migrations (b), never assumed.
--   · EVERY statement is re-runnable: CREATE … IF NOT EXISTS; seeds use ON CONFLICT DO NOTHING
--     (INSERT has no IF NOT EXISTS); every CHECK is inline in its CREATE TABLE (ADD CONSTRAINT has no
--     IF NOT EXISTS).
--   · Every constraint and index has a FIXED name. The house DAL's uniqueViolation() maps the unique
--     names, and houseBotSchemaReady() and the migration preflight check them. The names N1 §2 and
--     N2 §2 fix (hbp_*, hbi_*, hbe_*, hbt_*) are used verbatim; every other plain or unique index
--     keeps Prisma's default name, so schema.prisma and the database agree without drift.
--   · No CONCURRENTLY (one transaction). All eight tables are new and empty.
--   · No KYC table and no existing table is altered. The two FOREIGN KEYs take a brief SHARE ROW
--     EXCLUSIVE lock on "User" and "HouseBot", bounded by the lock_timeout.
-- ⚠️ TEXT + CHECK, never a Postgres enum (PLAN §2). Every time column is TIMESTAMPTZ(3) (04 A4); the
-- engine refuses to boot unless current_setting('TimeZone') is UTC. TZS caps are BIGINT, seconds and
-- counts INTEGER, NULL = not set, 0 only where the minimum is 0 (04 C1).
-- ⛔ NO ON DELETE CASCADE anywhere: every house row is kept 7 years (04 A20). Market, round, position,
-- intent, target and actor ids are soft references (04 A16).

SET LOCAL lock_timeout = '3s';

-- ── 1 · HouseBot — one row per designation ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HouseBot" (
    "id"                     TEXT NOT NULL,
    "userId"                 TEXT NOT NULL,
    "label"                  TEXT NOT NULL,
    "labelKey"               TEXT NOT NULL,
    "note"                   TEXT,
    "status"                 TEXT NOT NULL,
    "pauseReason"            TEXT,
    "pauseDetail"            JSONB,
    "pausedFromStatus"       TEXT,
    "passwordFingerprint"    TEXT NOT NULL,
    "verifiedAt"             TIMESTAMPTZ(3) NOT NULL,
    "verifiedById"           TEXT NOT NULL,
    "credentialChangedAt"    TIMESTAMPTZ(3),
    "credentialChangedVia"   TEXT,
    "consentVoidAt"          TIMESTAMPTZ(3),
    "consentVoidCause"       TEXT,
    "designatedAt"           TIMESTAMPTZ(3) NOT NULL,
    "designatedById"         TEXT NOT NULL,
    "removedAt"              TIMESTAMPTZ(3),
    "removedById"            TEXT,
    "removedCause"           TEXT,
    "removedReason"          TEXT,
    "rules"                  JSONB NOT NULL,
    "rulesVersion"           INTEGER NOT NULL DEFAULT 1,
    "stakeMinTzs"            BIGINT,
    "stakeMaxTzs"            BIGINT,
    "capPerMarketTzs"        BIGINT,
    "capDailyStakeTzs"       BIGINT,
    "capDailyLossTzs"        BIGINT,
    "capOpenExposureTzs"     BIGINT,
    "balanceFloorTzs"        BIGINT,
    "freqMinGapSec"          INTEGER,
    "freqMaxPerHour"         INTEGER,
    "freqMaxPerDay"          INTEGER,
    "freqMaxPerMarket"       INTEGER,
    "capStaffChosenPerDay"   INTEGER,
    "capStaffChosenDailyTzs" BIGINT,
    "targetsMaxActive"       INTEGER,
    "createdAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"              TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBot_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBot_userId_fkey" FOREIGN KEY ("userId")
      REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HouseBot_label_check" CHECK (char_length("label") BETWEEN 2 AND 32),
    CONSTRAINT "HouseBot_labelKey_check" CHECK ("labelKey" <> ''),
    CONSTRAINT "HouseBot_note_check" CHECK ("note" IS NULL OR char_length("note") <= 300),
    CONSTRAINT "HouseBot_status_check" CHECK ("status" IN ('ACTIVE','PAUSED','AUTO_PAUSED','REMOVED')),
    CONSTRAINT "HouseBot_pauseReason_check" CHECK ("pauseReason" IS NULL OR "pauseReason" IN (
      'NEW','MANUAL','PASSWORD_CHANGED','ROLE_CHANGED','SELF_EXCLUDED','COOLING_OFF','ACCOUNT_BLOCKED',
      'ACCOUNT_MISSING','WALLET_FROZEN','WALLET_MISSING','OWNER_LOSS_LIMIT','DAILY_LOSS_STOP',
      'ACCOUNT_SUSPENDED','ACCOUNT_CLOSED','IDENTITY_REFUSED','HOLDER_ERASURE_REQUEST','HOLDER_WITHDREW',
      'UNMAPPED_REFUSAL','RULES_INVALID','RULES_OUTDATED')),
    CONSTRAINT "HouseBot_paused_reason_check" CHECK ("status" NOT IN ('PAUSED','AUTO_PAUSED') OR "pauseReason" IS NOT NULL),
    CONSTRAINT "HouseBot_pausedFromStatus_check" CHECK ("pausedFromStatus" IS NULL OR "pausedFromStatus" IN ('ACTIVE','PAUSED')),
    CONSTRAINT "HouseBot_credentialChangedVia_check" CHECK ("credentialChangedVia" IS NULL OR "credentialChangedVia" IN ('SELF_CHANGE','RESET_LINK','OFFICER_TEMP','UNKNOWN')),
    CONSTRAINT "HouseBot_credentialChanged_pair_check" CHECK (("credentialChangedAt" IS NULL) = ("credentialChangedVia" IS NULL)),
    CONSTRAINT "HouseBot_consentVoidCause_check" CHECK ("consentVoidCause" IS NULL OR "consentVoidCause" IN ('SELF_EXCLUDED','COOLING_OFF','IDENTITY_REFUSED','HOLDER_ERASURE_REQUEST','HOLDER_WITHDREW')),
    CONSTRAINT "HouseBot_consentVoid_pair_check" CHECK (("consentVoidAt" IS NULL) = ("consentVoidCause" IS NULL)),
    CONSTRAINT "HouseBot_removedCause_check" CHECK ("removedCause" IS NULL OR "removedCause" IN ('MANUAL','ACCOUNT_CLOSED','SUNSET')),
    CONSTRAINT "HouseBot_removed_pair_check" CHECK (("status" = 'REMOVED') = ("removedAt" IS NOT NULL AND "removedCause" IS NOT NULL)),
    CONSTRAINT "HouseBot_removedReason_check" CHECK ("removedReason" IS NULL OR char_length("removedReason") <= 300),
    CONSTRAINT "HouseBot_rulesVersion_check" CHECK ("rulesVersion" >= 1),
    CONSTRAINT "HouseBot_stakeMinTzs_check" CHECK ("stakeMinTzs" IS NULL OR "stakeMinTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_stakeMaxTzs_check" CHECK ("stakeMaxTzs" IS NULL OR "stakeMaxTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_capPerMarketTzs_check" CHECK ("capPerMarketTzs" IS NULL OR "capPerMarketTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_capDailyStakeTzs_check" CHECK ("capDailyStakeTzs" IS NULL OR "capDailyStakeTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_capDailyLossTzs_check" CHECK ("capDailyLossTzs" IS NULL OR "capDailyLossTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_capOpenExposureTzs_check" CHECK ("capOpenExposureTzs" IS NULL OR "capOpenExposureTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_balanceFloorTzs_check" CHECK ("balanceFloorTzs" IS NULL OR "balanceFloorTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_freqMinGapSec_check" CHECK ("freqMinGapSec" IS NULL OR "freqMinGapSec" BETWEEN 0 AND 86400),
    CONSTRAINT "HouseBot_freqMaxPerHour_check" CHECK ("freqMaxPerHour" IS NULL OR "freqMaxPerHour" BETWEEN 1 AND 60),
    CONSTRAINT "HouseBot_freqMaxPerDay_check" CHECK ("freqMaxPerDay" IS NULL OR "freqMaxPerDay" BETWEEN 1 AND 1440),
    CONSTRAINT "HouseBot_freqMaxPerMarket_check" CHECK ("freqMaxPerMarket" IS NULL OR "freqMaxPerMarket" BETWEEN 1 AND 6),
    CONSTRAINT "HouseBot_capStaffChosenPerDay_check" CHECK ("capStaffChosenPerDay" IS NULL OR "capStaffChosenPerDay" BETWEEN 1 AND 50),
    CONSTRAINT "HouseBot_capStaffChosenDailyTzs_check" CHECK ("capStaffChosenDailyTzs" IS NULL OR "capStaffChosenDailyTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBot_targetsMaxActive_check" CHECK ("targetsMaxActive" IS NULL OR "targetsMaxActive" BETWEEN 1 AND 50)
);

-- One live bot per account; designating again after REMOVED creates a new row (PLAN §2).
CREATE UNIQUE INDEX IF NOT EXISTS "HouseBot_userId_live_key" ON "HouseBot" ("userId") WHERE "status" <> 'REMOVED';
-- Case-insensitive label uniqueness among live bots; a removed bot's label may be reused (04 C2).
CREATE UNIQUE INDEX IF NOT EXISTS "HouseBot_labelKey_live_key" ON "HouseBot" ("labelKey") WHERE "status" <> 'REMOVED';
CREATE INDEX IF NOT EXISTS "HouseBot_userId_idx" ON "HouseBot" ("userId");
CREATE INDEX IF NOT EXISTS "HouseBot_status_idx" ON "HouseBot" ("status");

-- ── 2 · HouseBotControl — the one 'global' row ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "HouseBotControl" (
    "id"                               TEXT NOT NULL,
    "enabled"                          BOOLEAN NOT NULL DEFAULT false,
    "switchedAt"                       TIMESTAMPTZ(3),
    "switchedById"                     TEXT,
    "switchedReason"                   TEXT,
    "offCause"                         TEXT,
    "limitsVersion"                    INTEGER NOT NULL DEFAULT 1,
    "limitsSchemaVersion"              INTEGER NOT NULL DEFAULT 1,
    "gCapDailyStakeTzs"                BIGINT,
    "gCapDailyLossTzs"                 BIGINT,
    "gCapOpenExposureTzs"              BIGINT,
    "gCapPerMarketTzs"                 BIGINT,
    "gMaxBetsPerMinute"                INTEGER,
    "gMaxBetsPerDay"                   INTEGER,
    "gCounterPerPlayerPerDay"          INTEGER,
    "gCounterPerPlayerTzsPerDay"       BIGINT,
    "maxDesignatedBots"                INTEGER NOT NULL DEFAULT 5,
    "bellAlertsPerHour"                INTEGER NOT NULL DEFAULT 20,
    "gCapStaffChosenPerDay"            INTEGER,
    "gCapStaffChosenDailyTzs"          BIGINT,
    "gTargetsMaxActive"                INTEGER,
    "gStaffChosenMaxCounterpartyShare" INTEGER,
    "createdAt"                        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                        TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotControl_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBotControl_id_check" CHECK ("id" = 'global'),
    CONSTRAINT "HouseBotControl_offCause_check" CHECK ("offCause" IS NULL OR "offCause" IN ('MANUAL','GLOBAL_LOSS_STOP','ENGINE_FAULT','ENGINE_ERRORS','SUNSET')),
    CONSTRAINT "HouseBotControl_switchedReason_check" CHECK ("switchedReason" IS NULL OR char_length("switchedReason") <= 300),
    CONSTRAINT "HouseBotControl_versions_check" CHECK ("limitsVersion" >= 1 AND "limitsSchemaVersion" >= 1),
    CONSTRAINT "HouseBotControl_gCapDailyStakeTzs_check" CHECK ("gCapDailyStakeTzs" IS NULL OR "gCapDailyStakeTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_gCapDailyLossTzs_check" CHECK ("gCapDailyLossTzs" IS NULL OR "gCapDailyLossTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_gCapOpenExposureTzs_check" CHECK ("gCapOpenExposureTzs" IS NULL OR "gCapOpenExposureTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_gCapPerMarketTzs_check" CHECK ("gCapPerMarketTzs" IS NULL OR "gCapPerMarketTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_gMaxBetsPerMinute_check" CHECK ("gMaxBetsPerMinute" IS NULL OR "gMaxBetsPerMinute" BETWEEN 1 AND 20),
    CONSTRAINT "HouseBotControl_gMaxBetsPerDay_check" CHECK ("gMaxBetsPerDay" IS NULL OR "gMaxBetsPerDay" BETWEEN 1 AND 28800),
    CONSTRAINT "HouseBotControl_gCounterPerPlayerPerDay_check" CHECK ("gCounterPerPlayerPerDay" IS NULL OR "gCounterPerPlayerPerDay" BETWEEN 1 AND 1440),
    CONSTRAINT "HouseBotControl_gCounterPerPlayerTzsPerDay_check" CHECK ("gCounterPerPlayerTzsPerDay" IS NULL OR "gCounterPerPlayerTzsPerDay" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_maxDesignatedBots_check" CHECK ("maxDesignatedBots" BETWEEN 1 AND 20),
    CONSTRAINT "HouseBotControl_bellAlertsPerHour_check" CHECK ("bellAlertsPerHour" BETWEEN 0 AND 60),
    CONSTRAINT "HouseBotControl_gCapStaffChosenPerDay_check" CHECK ("gCapStaffChosenPerDay" IS NULL OR "gCapStaffChosenPerDay" BETWEEN 1 AND 200),
    CONSTRAINT "HouseBotControl_gCapStaffChosenDailyTzs_check" CHECK ("gCapStaffChosenDailyTzs" IS NULL OR "gCapStaffChosenDailyTzs" BETWEEN 0 AND 1000000000),
    CONSTRAINT "HouseBotControl_gTargetsMaxActive_check" CHECK ("gTargetsMaxActive" IS NULL OR "gTargetsMaxActive" BETWEEN 1 AND 200),
    CONSTRAINT "HouseBotControl_gStaffChosenMaxCounterpartyShare_check" CHECK ("gStaffChosenMaxCounterpartyShare" IS NULL OR "gStaffChosenMaxCounterpartyShare" BETWEEN 10 AND 100)
);

-- ⭐ SEEDED DISABLED. Every cap NULL (not set), so nothing can bet until an owner sets them (PLAN §2).
INSERT INTO "HouseBotControl" ("id") VALUES ('global') ON CONFLICT ("id") DO NOTHING;

-- ── 3 · HouseBotRuntime — hot counters and engine health ─────────────────────────────────
CREATE TABLE IF NOT EXISTS "HouseBotRuntime" (
    "key"                TEXT NOT NULL,
    "hourKey"            TEXT,
    "countInHour"        INTEGER NOT NULL DEFAULT 0,
    "rateLimitedHourKey" TEXT,
    "rateLimitedCount"   INTEGER NOT NULL DEFAULT 0,
    "sweepPlacedAt"      TIMESTAMPTZ(3),
    "sweepPositionId"    TEXT,
    "scopeFrom"          TIMESTAMPTZ(3),
    "errorStreak"        INTEGER NOT NULL DEFAULT 0,
    "transientSince"     TIMESTAMPTZ(3),
    "boundsHash"         TEXT,
    "exitConfigHash"     TEXT,
    "rulesFutureSince"   TIMESTAMPTZ(3),
    "engineEnabled"      BOOLEAN,
    "bootAt"             TIMESTAMPTZ(3),
    "beatAt"             TIMESTAMPTZ(3),
    "pollerErrorAt"      TIMESTAMPTZ(3),
    "pollerErrorCode"    TEXT,
    "pollerErrorStreak"  INTEGER NOT NULL DEFAULT 0,
    "skewMs"             INTEGER,
    "updatedAt"          TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotRuntime_pkey" PRIMARY KEY ("key"),
    CONSTRAINT "HouseBotRuntime_key_check" CHECK ("key" IN ('global','beat:planner')
      OR "key" LIKE 'bot:%' OR "key" LIKE 'engine:%' OR "key" LIKE 'beat:poller:%'),
    CONSTRAINT "HouseBotRuntime_counts_check" CHECK ("countInHour" >= 0 AND "rateLimitedCount" >= 0
      AND "errorStreak" >= 0 AND "pollerErrorStreak" >= 0)
);

-- ⭐ 04 A11: the watermark starts at the moment of migration, so the first sweep never replays
-- history. ON CONFLICT DO NOTHING keeps the FIRST value on a replay. scopeFrom stays NULL
-- (= never switched on = nothing in scope).
INSERT INTO "HouseBotRuntime" ("key", "sweepPlacedAt") VALUES ('global', now()) ON CONFLICT ("key") DO NOTHING;

-- ── 4 · HouseBotAlertOnce — replica-safe once-only claims ────────────────────────────────
CREATE TABLE IF NOT EXISTS "HouseBotAlertOnce" (
    "key"       TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotAlertOnce_pkey" PRIMARY KEY ("key")
);
-- The nightly 30-day purge in batches of 5,000 (04 A20, P3) reads by time.
CREATE INDEX IF NOT EXISTS "HouseBotAlertOnce_createdAt_idx" ON "HouseBotAlertOnce" ("createdAt");

-- ── 5 · HouseBotEvent — append-only history, kept 7 years ────────────────────────────────
CREATE TABLE IF NOT EXISTS "HouseBotEvent" (
    "id"         TEXT NOT NULL,
    "houseBotId" TEXT,
    "userId"     TEXT,
    "marketId"   TEXT,
    "kind"       TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus"   TEXT,
    "reason"     TEXT,
    "actorId"    TEXT,
    "payload"    JSONB,
    "auditId"    TEXT,
    "createdAt"  TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotEvent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBotEvent_kind_check" CHECK ("kind" IN (
      'DESIGNATED','VERIFIED','STARTED','PAUSED','AUTO_PAUSED','RULES_SAVED','REMOVED',
      'SWITCH_ON','SWITCH_OFF','LIMITS_SAVED','OWNER_MONEY',
      'CREDENTIAL_CHANGED','HOLDER_CAUSE_ADDED','CONSENT_VOIDED','HOLDER_AGAINST_BOT',
      'HOLDER_EMAIL_CHANGED','HOLDER_2FA_ON','HOLDER_2FA_OFF','PENALTY_BOXED',
      'REIMBURSEMENT_RECORDED','BOARD_DISCLOSURE_RECORDED','SUNSET',
      'ENTER_NOW_PREVIEWED','ENTER_NOW_REQUESTED','OPENER_SIDE_DRAWN',
      'TARGET_ADDED','TARGET_UPDATED','TARGET_REMOVED','TARGET_ENDED','STAFF_INTENT_CANCELLED')),
    -- Officer reasons live here, never in "payload" (N1 §2); erasure rewrites them to "[erased]" (04 A5).
    CONSTRAINT "HouseBotEvent_reason_check" CHECK ("reason" IS NULL OR char_length("reason") <= 300)
);

-- ⭐ The OPENER side is drawn ONCE per market (N1 §2).
CREATE UNIQUE INDEX IF NOT EXISTS "hbe_opener_draw_uq" ON "HouseBotEvent" ("marketId") WHERE "kind" = 'OPENER_SIDE_DRAWN';
CREATE INDEX IF NOT EXISTS "HouseBotEvent_houseBotId_createdAt_idx" ON "HouseBotEvent" ("houseBotId", "createdAt");
CREATE INDEX IF NOT EXISTS "HouseBotEvent_userId_kind_createdAt_idx" ON "HouseBotEvent" ("userId", "kind", "createdAt");
CREATE INDEX IF NOT EXISTS "HouseBotEvent_kind_createdAt_idx" ON "HouseBotEvent" ("kind", "createdAt");

-- ── 6 · HouseBotIntent — the durable decision, written before the bet ────────────────────
CREATE TABLE IF NOT EXISTS "HouseBotIntent" (
    "id"                TEXT NOT NULL,
    "houseBotId"        TEXT NOT NULL,
    "botUserId"         TEXT NOT NULL,
    "kind"              TEXT NOT NULL,
    "anchorKey"         TEXT NOT NULL,
    "marketId"          TEXT NOT NULL,
    "productLine"       TEXT NOT NULL,
    "triggerPositionId" TEXT,
    "triggerUserId"     TEXT,
    "targetId"          TEXT,
    "requestedById"     TEXT,
    "entryCondition"    TEXT,
    "side"              TEXT NOT NULL,
    "stakeTzs"          BIGINT NOT NULL,
    "dueAt"             TIMESTAMPTZ(3) NOT NULL,
    "deadlineAt"        TIMESTAMPTZ(3) NOT NULL,
    "staleAt"           TIMESTAMPTZ(3) NOT NULL,
    "status"            TEXT NOT NULL,
    "reasonCode"        TEXT,
    "why"               TEXT,
    "decision"          JSONB NOT NULL,
    "attempts"          INTEGER NOT NULL DEFAULT 0,
    "transientAttempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt"     TIMESTAMPTZ(3),
    "claimedBy"         TEXT,
    "claimedUntil"      TIMESTAMPTZ(3),
    "positionId"        TEXT,
    "idempotencyKey"    TEXT NOT NULL,
    "finishedAt"        TIMESTAMPTZ(3),
    "alertedAt"         TIMESTAMPTZ(3),
    "createdAt"         TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotIntent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBotIntent_kind_check" CHECK ("kind" IN ('COUNTER','FILL','OPENER','MANUAL')),
    CONSTRAINT "HouseBotIntent_status_check" CHECK ("status" IN ('PENDING','CLAIMED','PLACED','SKIPPED','EXPIRED','FAILED','CANCELLED')),
    CONSTRAINT "HouseBotIntent_productLine_check" CHECK ("productLine" IN ('MARKET','UPDOWN')),
    CONSTRAINT "HouseBotIntent_side_check" CHECK ("side" IN ('YES','NO')),
    CONSTRAINT "HouseBotIntent_stakeTzs_check" CHECK ("stakeTzs" BETWEEN 1 AND 1000000000),
    CONSTRAINT "HouseBotIntent_attempts_check" CHECK ("attempts" >= 0 AND "transientAttempts" >= 0),
    CONSTRAINT "HouseBotIntent_requestedById_check" CHECK (("kind" = 'MANUAL') = ("requestedById" IS NOT NULL)),
    CONSTRAINT "HouseBotIntent_entryCondition_check" CHECK ("entryCondition" IS NULL OR "entryCondition" IN ('OPENER','THIN')),
    CONSTRAINT "HouseBotIntent_entryCondition_manual_check" CHECK (("kind" = 'MANUAL') = ("entryCondition" IS NOT NULL)),
    CONSTRAINT "HouseBotIntent_targetId_check" CHECK ("targetId" IS NULL OR "kind" = 'COUNTER'),
    -- Enter now is polls only (N1 §2).
    CONSTRAINT "HouseBotIntent_manual_polls_check" CHECK ("kind" <> 'MANUAL' OR "productLine" = 'MARKET'),
    -- Anchor identity (PLAN §2; N1 §2): COUNTER → trigger position id · FILL/OPENER → market id ·
    -- MANUAL → 'manual:' || requestedById || ':' || submitId.
    CONSTRAINT "HouseBotIntent_counter_anchor_check" CHECK ("kind" <> 'COUNTER'
      OR ("triggerPositionId" IS NOT NULL AND "anchorKey" = "triggerPositionId")),
    CONSTRAINT "HouseBotIntent_market_anchor_check" CHECK ("kind" NOT IN ('FILL','OPENER') OR "anchorKey" = "marketId"),
    CONSTRAINT "HouseBotIntent_manual_anchor_check" CHECK ("kind" <> 'MANUAL'
      OR ("anchorKey" = 'manual:' || "requestedById" || ':' || right("anchorKey", 36)
          AND right("anchorKey", 36) ~ '^[0-9a-f-]{36}$')),
    -- The bet key is derived from the id and written before the bet (PLAN I4).
    CONSTRAINT "HouseBotIntent_idempotencyKey_check" CHECK ("idempotencyKey" = 'hb:' || "id"),
    CONSTRAINT "HouseBotIntent_placed_check" CHECK ("status" <> 'PLACED' OR "positionId" IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS "HouseBotIntent_positionId_key" ON "HouseBotIntent" ("positionId");
CREATE UNIQUE INDEX IF NOT EXISTS "HouseBotIntent_idempotencyKey_key" ON "HouseBotIntent" ("idempotencyKey");
-- ⭐ EXACTLY-ONCE (N1 §2). One decision per trigger for ever, targeted reactions included.
CREATE UNIQUE INDEX IF NOT EXISTS "hbi_counter_anchor_uq" ON "HouseBotIntent" ("anchorKey") WHERE "kind" = 'COUNTER';
-- A CANCELLED FILL/OPENER may be planned again; a SKIPPED or EXPIRED one may not.
CREATE UNIQUE INDEX IF NOT EXISTS "hbi_fill_opener_anchor_uq" ON "HouseBotIntent" ("kind", "anchorKey")
    WHERE "kind" IN ('FILL','OPENER') AND "status" <> 'CANCELLED';
-- A press id is used once, ever.
CREATE UNIQUE INDEX IF NOT EXISTS "hbi_manual_anchor_uq" ON "HouseBotIntent" ("anchorKey") WHERE "kind" = 'MANUAL';
-- At most one live Enter now per market, across bots, tabs and replicas.
CREATE UNIQUE INDEX IF NOT EXISTS "hbi_manual_live_market_uq" ON "HouseBotIntent" ("marketId")
    WHERE "kind" = 'MANUAL' AND "status" IN ('PENDING','CLAIMED');
CREATE INDEX IF NOT EXISTS "HouseBotIntent_status_dueAt_idx" ON "HouseBotIntent" ("status", "dueAt");
CREATE INDEX IF NOT EXISTS "HouseBotIntent_houseBotId_createdAt_idx" ON "HouseBotIntent" ("houseBotId", "createdAt");
CREATE INDEX IF NOT EXISTS "HouseBotIntent_triggerUserId_createdAt_idx" ON "HouseBotIntent" ("triggerUserId", "createdAt");
CREATE INDEX IF NOT EXISTS "HouseBotIntent_marketId_status_idx" ON "HouseBotIntent" ("marketId", "status");
CREATE INDEX IF NOT EXISTS "HouseBotIntent_status_finishedAt_idx" ON "HouseBotIntent" ("status", "finishedAt");
-- Expiry on DB time (N1 §2).
CREATE INDEX IF NOT EXISTS "hbi_status_stale_idx" ON "HouseBotIntent" ("status", "staleAt");
-- 04 A8 alert outbox repair: PLACED rows whose alert never went out.
CREATE INDEX IF NOT EXISTS "HouseBotIntent_finishedAt_unalerted_idx" ON "HouseBotIntent" ("finishedAt")
    WHERE "status" = 'PLACED' AND "alertedAt" IS NULL;
-- TARGET_ONCE, reaction counts and removal (N2 §2).
CREATE INDEX IF NOT EXISTS "hbi_target_status_idx" ON "HouseBotIntent" ("targetId", "status")
    WHERE "targetId" IS NOT NULL;
-- Staff-chosen caps per bot (H2) and global (H4), N1 §2.
CREATE INDEX IF NOT EXISTS "hbi_staff_bot_finished_idx" ON "HouseBotIntent" ("houseBotId", "finishedAt")
    WHERE ("kind" = 'MANUAL' OR "targetId" IS NOT NULL) AND "status" = 'PLACED';
CREATE INDEX IF NOT EXISTS "hbi_staff_finished_idx" ON "HouseBotIntent" ("finishedAt")
    WHERE ("kind" = 'MANUAL' OR "targetId" IS NOT NULL) AND "status" = 'PLACED';

-- ── 7 · HouseBotTarget — one targeting bot per poll (N2 §2) ──────────────────────────────
-- createdAt and effectiveFrom (= createdAt + TARGET_ARMING_SEC) are written from DB now() in the
-- insert itself, never from the app clock (N2 §2).
CREATE TABLE IF NOT EXISTS "HouseBotTarget" (
    "id"            TEXT NOT NULL,
    "houseBotId"    TEXT NOT NULL,
    "marketId"      TEXT NOT NULL,
    "productLine"   TEXT NOT NULL,
    "status"        TEXT NOT NULL,
    "delayMinSec"   INTEGER NOT NULL,
    "delayMaxSec"   INTEGER NOT NULL,
    "timingFrom"    TEXT NOT NULL,
    "reactTo"       TEXT NOT NULL,
    "createdAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveFrom" TIMESTAMPTZ(3) NOT NULL,
    "createdById"   TEXT NOT NULL,
    "updatedAt"     TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedById"   TEXT NOT NULL,
    "version"       INTEGER NOT NULL DEFAULT 1,
    "endedAt"       TIMESTAMPTZ(3),
    "endCause"      TEXT,
    "removedAt"     TIMESTAMPTZ(3),
    "removedById"   TEXT,
    "snapshot"      JSONB NOT NULL,
    CONSTRAINT "HouseBotTarget_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBotTarget_houseBotId_fkey" FOREIGN KEY ("houseBotId")
      REFERENCES "HouseBot"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    -- Polls only (N2 §2).
    CONSTRAINT "HouseBotTarget_productLine_check" CHECK ("productLine" = 'MARKET'),
    CONSTRAINT "HouseBotTarget_status_check" CHECK ("status" IN ('ACTIVE','ENDED','REMOVED')),
    CONSTRAINT "HouseBotTarget_delayMinSec_check" CHECK ("delayMinSec" BETWEEN 5 AND 600),
    CONSTRAINT "HouseBotTarget_delayMaxSec_check" CHECK ("delayMaxSec" BETWEEN 5 AND 600),
    CONSTRAINT "HouseBotTarget_delay_order_check" CHECK ("delayMinSec" <= "delayMaxSec"),
    CONSTRAINT "HouseBotTarget_timingFrom_check" CHECK ("timingFrom" IN ('STAKE','EXIT_CLOSE')),
    CONSTRAINT "HouseBotTarget_reactTo_check" CHECK ("reactTo" IN ('FIRST','EVERY')),
    CONSTRAINT "HouseBotTarget_endCause_check" CHECK ("endCause" IS NULL OR "endCause" IN (
      'DONE','MARKET_CLOSED','CUTOFF_PASSED','MARKET_REOPENED','MARKET_GONE','OUT_OF_SCOPE',
      'INFO_BLACKOUT','BOT_REMOVED','SUNSET','VETOED','CONSENT_VOID')),
    CONSTRAINT "HouseBotTarget_ended_pair_check" CHECK (("status" = 'ENDED') = ("endedAt" IS NOT NULL AND "endCause" IS NOT NULL)),
    CONSTRAINT "HouseBotTarget_removed_pair_check" CHECK (("status" = 'REMOVED') = ("removedAt" IS NOT NULL AND "removedById" IS NOT NULL)),
    CONSTRAINT "HouseBotTarget_effectiveFrom_check" CHECK ("effectiveFrom" >= "createdAt"),
    CONSTRAINT "HouseBotTarget_version_check" CHECK ("version" >= 1)
);

-- ⭐ One targeting bot per poll (N2 §2, I3).
CREATE UNIQUE INDEX IF NOT EXISTS "hbt_active_market_uq" ON "HouseBotTarget" ("marketId") WHERE "status" = 'ACTIVE';
-- The never-retarget read: a poll ever ENDED(VETOED) or REMOVED, by any bot (N2 §2).
CREATE INDEX IF NOT EXISTS "hbt_market_idx" ON "HouseBotTarget" ("marketId");
CREATE INDEX IF NOT EXISTS "hbt_bot_status_idx" ON "HouseBotTarget" ("houseBotId", "status");
CREATE INDEX IF NOT EXISTS "hbt_bot_created_idx" ON "HouseBotTarget" ("houseBotId", "createdAt");

-- ── 8 · HouseBotPress — one row per officer press (N1 §2) ────────────────────────────────
-- houseBotId is a soft reference with no FK, so a press naming a missing bot is still recorded,
-- then refused (N1 §2).
CREATE TABLE IF NOT EXISTS "HouseBotPress" (
    "id"              TEXT NOT NULL,
    "actorId"         TEXT NOT NULL,
    "submitId"        TEXT NOT NULL,
    "purpose"         TEXT NOT NULL,
    "houseBotId"      TEXT NOT NULL,
    "marketId"        TEXT,
    "targetId"        TEXT,
    "intentId"        TEXT,
    "state"           TEXT NOT NULL,
    "code"            TEXT,
    "reason"          TEXT,
    "auditId"         TEXT,
    "auditClaimUntil" TIMESTAMPTZ(3),
    "createdAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HouseBotPress_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HouseBotPress_submitId_check" CHECK ("submitId" ~ '^[0-9a-f-]{36}$'),
    CONSTRAINT "HouseBotPress_purpose_check" CHECK ("purpose" IN ('ENTER_NOW','TARGET_ADD','TARGET_UPDATE','TARGET_REMOVE','STAFF_CANCEL')),
    CONSTRAINT "HouseBotPress_state_check" CHECK ("state" IN ('CHECKING','REFUSED','QUEUED','DONE')),
    -- A refusal always carries its code, and nothing else ever does (N1 §2).
    CONSTRAINT "HouseBotPress_refused_code_check" CHECK (("state" = 'REFUSED') = ("code" IS NOT NULL)),
    -- Only an Enter now press is ever QUEUED, and then it names its intent. Target and cancel
    -- presses go CHECKING → DONE inside their own transaction (N1 §2 press flow).
    CONSTRAINT "HouseBotPress_queued_check" CHECK ("state" <> 'QUEUED' OR ("purpose" = 'ENTER_NOW' AND "intentId" IS NOT NULL)),
    CONSTRAINT "HouseBotPress_reason_check" CHECK ("reason" IS NULL OR char_length("reason") <= 300)
);

-- ⭐ The same press again reads the existing row (N1 §2 press flow, step 2).
CREATE UNIQUE INDEX IF NOT EXISTS "hbp_actor_submit_uq" ON "HouseBotPress" ("actorId", "submitId");
CREATE INDEX IF NOT EXISTS "hbp_bot_created_idx" ON "HouseBotPress" ("houseBotId", "createdAt");
CREATE INDEX IF NOT EXISTS "hbp_state_created_idx" ON "HouseBotPress" ("state", "createdAt");
