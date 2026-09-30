-- THE JOURNEY FUNNEL — one aggregate table for the Vodacom plan's §3.10 measures (S3b, docs/VODACOM-PLAN.md §0f).
-- Written by /api/funnel (the two browser steps) and by the server after a bet or a deposit lands; read by the
-- admin insights panel.
--
-- ⭐ NOTHING HERE IDENTIFIES A PERSON. Daily totals per (EAT day, step, origin, variant, campaign tags). No user id,
-- no IP, no session, no market, no amount — the same rule as the visit counts.
--
-- ⛔ EXPAND ONLY: one new table and its indexes. The previously-deployed container never names it.
-- ⛔ NO CONCURRENTLY (prisma migrate deploy runs inside a transaction). IF NOT EXISTS on every statement, so the file is
-- re-runnable. The table is new and empty, so there is no lock to measure.

CREATE TABLE IF NOT EXISTS "JourneyFunnelDay" (
    "id"          TEXT    NOT NULL,
    "day"         TEXT    NOT NULL,
    "step"        TEXT    NOT NULL,
    "origin"      TEXT    NOT NULL DEFAULT '',
    "variant"     TEXT    NOT NULL DEFAULT '',
    "utmSource"   TEXT    NOT NULL DEFAULT '',
    "utmCampaign" TEXT    NOT NULL DEFAULT '',
    "count"       INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "JourneyFunnelDay_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "JourneyFunnelDay_day_step_origin_variant_utmSource_utmCampaign_key"
    ON "JourneyFunnelDay" ("day", "step", "origin", "variant", "utmSource", "utmCampaign");
CREATE INDEX IF NOT EXISTS "JourneyFunnelDay_day_idx" ON "JourneyFunnelDay" ("day");
