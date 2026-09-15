-- FIRST-PARTY VISIT COUNTS — two aggregate tables for the cookieless counter (Ali, 2026-09-15: every visitor counted,
-- Google Analytics detail only with consent). Written by /api/pv; read by the admin traffic view.
--
-- ⭐ NOTHING HERE IDENTIFIES A PERSON. Daily totals per (EAT day, masked path) and per (day, referrer host, campaign
-- tags). No user id, no IP, no session, no identifier of any kind — which is why it may run without consent.
--
-- ⛔ EXPAND ONLY: two new tables and their indexes. The previously-deployed container never names them.
-- ⛔ NO CONCURRENTLY (prisma migrate deploy runs inside a transaction). IF NOT EXISTS on every statement, so the file is
-- re-runnable. Both tables are new and empty, so there is no lock to measure.

CREATE TABLE IF NOT EXISTS "SiteVisitPage" (
    "id"      TEXT    NOT NULL,
    "day"     TEXT    NOT NULL,
    "path"    TEXT    NOT NULL,
    "views"   INTEGER NOT NULL DEFAULT 0,
    "entries" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SiteVisitPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteVisitPage_day_path_key" ON "SiteVisitPage" ("day", "path");
CREATE INDEX IF NOT EXISTS "SiteVisitPage_day_idx" ON "SiteVisitPage" ("day");

CREATE TABLE IF NOT EXISTS "SiteVisitSource" (
    "id"       TEXT    NOT NULL,
    "day"      TEXT    NOT NULL,
    "referrer" TEXT    NOT NULL DEFAULT '',
    "source"   TEXT    NOT NULL DEFAULT '',
    "medium"   TEXT    NOT NULL DEFAULT '',
    "campaign" TEXT    NOT NULL DEFAULT '',
    "visits"   INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "SiteVisitSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SiteVisitSource_day_referrer_source_medium_campaign_key"
    ON "SiteVisitSource" ("day", "referrer", "source", "medium", "campaign");
CREATE INDEX IF NOT EXISTS "SiteVisitSource_day_idx" ON "SiteVisitSource" ("day");
