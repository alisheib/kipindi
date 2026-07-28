-- RBAC (2026-07-28): staff roles for role-based admin access.
-- Adds FINANCE, GROWTH, AUDITOR to UserRole. Existing rows are unaffected — every
-- current user is PLAYER/AGENT/MODERATOR/ADMIN/COMPLIANCE/SUPPORT, and no data
-- migration is needed. MODERATOR is surfaced in the UI as "Trading"; the enum
-- value is unchanged (renaming an in-use enum value is a rewrite we don't want).
--
-- Kept in its OWN migration (separate transaction) so the new enum values are
-- COMMITTED before the RoleDomainGrant table — typed by UserRole — is created in
-- 20260728110000_rbac_grants. Postgres forbids USING a just-added enum value in
-- the same transaction that added it; splitting the files removes any doubt.
-- Precedent for this pattern: 20260701120000_bonus_queued_status.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'FINANCE';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'GROWTH';
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'AUDITOR';
