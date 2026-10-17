-- MASWALI MILLIONEA — the hub notices a player has seen (MASWALI-BUILD S5; MASWALI-PLAN §7b S5 item 7, §10 2.1).
--
-- "Each fact performs once, for its owner, then rests": a ticket's own facts (a result stamp, the carry, the cut) rest on
-- "MaswaliTicket"."lastViewedAt", which S1 already created. The facts that belong to a player-WEEK — the rollover line, the
-- week void, the week's result — rest here: one row per player, week and notice, and the first stamp stays (the reader
-- inserts ON CONFLICT DO NOTHING). ⛔ NO MONEY AND NO PICKS: a seen record says when a player saw a notice, nothing more.
--
-- Hand-written, additive, re-runnable (AGENTS.md §5): CREATE TABLE IF NOT EXISTS with its CHECK and FOREIGN KEY inline
-- (ADD CONSTRAINT has no IF NOT EXISTS). Nothing existing is altered. The foreign key takes a brief SHARE ROW EXCLUSIVE lock
-- on "MaswaliCycle" while the empty table is created.
BEGIN;
SET LOCAL lock_timeout = '3s';

CREATE TABLE IF NOT EXISTS "MaswaliNoticeSeen" (
    "userId" TEXT NOT NULL,
    "cycleId" TEXT NOT NULL,
    "notice" TEXT NOT NULL,
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MaswaliNoticeSeen_pkey" PRIMARY KEY ("userId", "cycleId", "notice"),
    CONSTRAINT "MaswaliNoticeSeen_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "MaswaliCycle"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "MaswaliNoticeSeen_notice_check" CHECK ("notice" IN ('ROLLOVER', 'WEEK_VOID', 'RESULT'))
);

COMMIT;
