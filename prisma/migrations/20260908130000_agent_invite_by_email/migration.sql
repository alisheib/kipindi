-- AGENT INVITATIONS MOVE TO EMAIL — 2026-09-08.
--
-- ⭐ WHY. The agent programme shipped an officer-issued invitation delivered by SMS. There is
-- no licensed SMS provider on this platform: `src/lib/server/sms.ts` ships `console` as the
-- default, Beem and Africa's Talking are declared stubs that THROW, and the Selcom adapter's
-- body is written but its contract is unsigned. So the officer's console printed "A text with
-- the link is on its way" while `sms.ts` logged "console provider active in PRODUCTION … NOT
-- delivered". Postmark, by contrast, is live and already carries every transactional mail on
-- the platform.
--
-- ⚠️ NOTHING IS DROPPED AND NOTHING IS BACKFILLED. `phoneE164` is only RELAXED to nullable so
-- new email-addressed rows can exist. Invitations issued in the programme's first days keep
-- their phone and stay readable, revocable and acceptable through the same code path —
-- `invitationChannel()` reads whichever address a row carries. Inventing an email for a row
-- that never had one would be fabricating the very fact the acceptance check is built on.
--
-- ⛔ AND AN EMAIL WAS NOT WRITTEN INTO A COLUMN CALLED `phoneE164`. Both tables get their own
-- `email` column. A column whose name asserts one kind of address and holds another is how an
-- erasure query or a PII sweep silently misses rows — and `erasure.ts` deletes OTPs BY PHONE.
--
-- Additive plus two NOT NULL relaxations: no rewrite, no backfill, no lock beyond the
-- catalogue update. Safe on a live table.

-- ── AgentInvitation ───────────────────────────────────────────────────────────
ALTER TABLE "AgentInvitation" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "AgentInvitation" ALTER COLUMN "phoneE164" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "AgentInvitation_email_status_idx" ON "AgentInvitation" ("email", "status");

-- ── Otp ───────────────────────────────────────────────────────────────────────
ALTER TABLE "Otp" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "Otp" ALTER COLUMN "phoneE164" DROP NOT NULL;
CREATE INDEX IF NOT EXISTS "Otp_email_purpose_idx" ON "Otp" ("email", "purpose");
