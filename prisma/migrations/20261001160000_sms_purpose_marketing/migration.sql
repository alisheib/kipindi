-- Marketing U35a (S10, 2026-10-01): the MARKETING lane for SmsMessage (D22).
-- Folding a 50k-recipient campaign into INVITE would destroy the invite lane's meaning and make a per-lane
-- cost report impossible, so marketing SMS gets its own purpose.
--
-- ⛔ ALONE IN ITS OWN MIGRATION, AND IT SHIPS ONE COMMIT BEFORE ANYTHING WRITES IT. Postgres refuses to USE a
-- value in the transaction that added it (55P04, measured at S3b), so the campaign tables (U35b) and the first
-- writer (U37's test send, behind the closed live switch) come in later migrations and commits, after this one is
-- deployed. Precedents: 20260728100000_rbac_roles, 20260701120000_bonus_queued_status.
ALTER TYPE "SmsPurpose" ADD VALUE IF NOT EXISTS 'MARKETING';
