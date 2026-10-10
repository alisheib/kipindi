-- TYPED-ONLY KYC — the six columns that say WHICH KIND of identity approval a submission holds (owner ruling, Ali,
-- 2026-10-10, relaying the Gaming Board's request that players no longer upload identity documents —
-- docs/COMPLIANCE-DECISIONS.md, "2026-10-10 · Players verify identity with typed details").
--
-- From the release that follows this one, a PLAYER verifies with typed details only and is approved automatically
-- when the automatic checks pass; an AGENT applicant still verifies with a photo of the document and a selfie,
-- reviewed by an officer (the agent programme is unchanged). One `status` cannot say which of the two a row holds:
--   · "photoVerifiedAt"  — an officer approved it WITH the photos and the selfie on file (the agent gate);
--   · "autoApprovedAt"   — it was approved automatically from typed details;
--   · "autoFlags"        — the automatic checks' non-blocking flags at that moment (fixed codes only);
--   · "postCheckedAt" / "postCheckedById" — an officer checked an automatic approval afterwards;
--   · "priorIdentities"  — append-only history of the typed identities a restart or correction replaced (the typed
--                          details are now the only identification record, so a reset must never simply drop them).
--
-- HAND-WRITTEN AND EXPAND-ONLY. Six nullable columns are added and one column is backfilled; nothing is dropped,
-- renamed, retyped or constrained, and no index is created. Every statement is re-runnable (IF NOT EXISTS / a
-- WHERE that skips rows already done), because hand-applying before a push is normal practice here while CI
-- replays each migration exactly once.
--
-- ⭐ SAFE WHILE THE OLD BUILD RUNS. `prisma migrate deploy` runs before `next start`, and Railway keeps the previous
-- container serving for up to 60 s. That container's generated client does not know these columns, and Prisma
-- selects only the columns its client knows, so its reads and writes are untouched; every column is NULL by default.
--
-- ⭐ THE BACKFILL. Every identity approved before this release was approved by an officer looking at the document
-- photos and the selfie (uploads were compulsory until 2026-10-10), so "photoVerifiedAt" takes "approvedAt" for every
-- row that is APPROVED NOW. ⛔ NOT every row that was ever approved: "approvedAt" is never cleared, so a row approved
-- once and later refused and restarted still carries it — and a restart CLEARED that row's photos, so stamping it
-- would certify a photo check behind which no photo now stands (the agent programme's gate reads this column).
-- Production on 2026-10-10 (read-only, 15:05 EAT): 13 rows ever approved, all 13 APPROVED now, every one with an
-- officer and photos on file — so the two predicates agree there; the narrower one is the one that is true everywhere.
-- ⚠️ A row approved by the OLD container during the 60-second overlap after this file ran is not covered — the push
-- checklist re-runs the same UPDATE once the new build is serving (production held 0 cases awaiting an officer).
--
-- PUSH CHECKLIST — after the deploy, read-only:
--   SELECT count(*) FILTER (WHERE "status" = 'APPROVED') AS approved_now,
--          count(*) FILTER (WHERE "photoVerifiedAt" IS NOT NULL) AS photo_verified FROM "KycSubmission";
--   expect the two counts EQUAL until the first automatic approval exists.

ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "photoVerifiedAt" TIMESTAMP(3);
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "autoApprovedAt" TIMESTAMP(3);
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "autoFlags" JSONB;
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "postCheckedAt" TIMESTAMP(3);
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "postCheckedById" TEXT;
ALTER TABLE "KycSubmission" ADD COLUMN IF NOT EXISTS "priorIdentities" JSONB;

UPDATE "KycSubmission"
   SET "photoVerifiedAt" = "approvedAt"
 WHERE "status" = 'APPROVED'
   AND "approvedAt" IS NOT NULL
   AND "photoVerifiedAt" IS NULL;
