-- F8 · Event calendar — real-world moments to schedule markets around.
--
-- OPERATOR-AUTHORED, never AI-authored. We have no fixtures feed, so letting the
-- model invent the calendar would mean inventing real-world events and dates on a
-- licensed real-money product. Each row is entered by an officer with an official
-- source URL validated against the TrustedSource allowlist. Additive table.
CREATE TABLE IF NOT EXISTS "EventCalendar" (
    "id"          TEXT NOT NULL,
    "title"       TEXT NOT NULL,
    "category"    TEXT NOT NULL,
    "startsAt"    TIMESTAMP(3) NOT NULL,
    "sourceUrl"   TEXT NOT NULL,
    "note"        TEXT,
    "generatedAt" TIMESTAMP(3),
    "aiPollId"    TEXT,
    "addedBy"     TEXT NOT NULL,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EventCalendar_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EventCalendar_startsAt_idx" ON "EventCalendar"("startsAt");
CREATE INDEX IF NOT EXISTS "EventCalendar_category_startsAt_idx" ON "EventCalendar"("category", "startsAt");
