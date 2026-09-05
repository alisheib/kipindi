-- "HAS THIS ACCOUNT EVER SATISFIED US?" — THE QUESTION `status` CANNOT ANSWER.
--
-- Owner record: docs/COMPLIANCE-DECISIONS.md (2026-09-05, Ali). Identity verification
-- becomes a precondition of DEPOSITING, BETTING and WITHDRAWING. Deposit and betting ask
-- `status = 'APPROVED'` — current standing, because they add NEW exposure. Withdrawal
-- asks this column.
--
-- 🔴 WHY THE TWO QUESTIONS DIFFER, AND IT IS THE ONE PATH THAT TRAPS MONEY.
-- `forceReverifyKyc` moves an APPROVED player to ADDITIONAL_INFO_REQUIRED. That player
-- HOLDS REAL MONEY, earned under an identity we accepted. Gating their withdrawal on
-- CURRENT status would freeze it — precisely the harm docs/BOARD-DISCLOSURE-B-E.md §6
-- recorded when it noted that force-reverify had STOPPED being a money control. The same
-- column covers the real race: a deposit authorised while approved whose Selcom callback
-- lands after a rejection.
--
-- ⛔ THE BACKFILL IS NOT OPTIONAL, AND IT IS THE HALF THAT WOULD HAVE BITTEN.
-- The launch plan says production is emptied the day before go-live, so "there are no
-- existing APPROVED rows" is true — RIGHT UP UNTIL THAT RESET SLIPS. Without the UPDATE
-- below, every already-approved player wakes with `approvedAt IS NULL` and CANNOT
-- WITHDRAW: a money freeze on exactly the verified players, caused by the change meant to
-- protect them, and nothing would go red. `reviewedAt` is when an officer decided;
-- `updatedAt` is the fallback for any row that somehow lacks one. The migration is
-- therefore correct whether or not the reset happens, which is the only acceptable
-- property for a DDL that ships in the same week as a data reset.
--
-- ⛔ EXPAND ONLY — nothing dropped, renamed, or destructively rewritten, so this is safe
-- in ONE release. Same direction as 20260821140000: `start` is
-- `prisma migrate deploy && … && next start`, so this DDL commits inside the NEW
-- container before it serves, while the OLD container — whose generated client does not
-- name `approvedAt` — is still taking traffic and is unaffected by a column it never
-- selects. Adding is safe in one release; only DROPPING needs two.

ALTER TABLE "KycSubmission" ADD COLUMN "approvedAt" TIMESTAMP(3);

UPDATE "KycSubmission"
   SET "approvedAt" = COALESCE("reviewedAt", "updatedAt")
 WHERE "status" = 'APPROVED'
   AND "approvedAt" IS NULL;
