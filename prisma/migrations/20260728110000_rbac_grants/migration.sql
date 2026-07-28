-- RBAC (2026-07-28): the grant matrix + role-change audit columns.
-- Every statement is additive + idempotent, so this is safe on the LIVE database:
--   • CREATE TYPE / CREATE TABLE IF NOT EXISTS       — new objects, no table rewrite
--   • ADD COLUMN … (nullable, no default backfill)   — catalogue-only on PostgreSQL 11+
-- No FK on RoleDomainGrant: role/domain are ENUM columns, not references. The
-- composite PK (role, domain) is safe because the table is BRAND NEW — the
-- "no UNIQUE/PK on a live table" rule only applies to ALTERing an existing one.
-- The matrix is SEEDED by the app (idempotent upsert of DEFAULT_GRANTS), NOT here,
-- so a fresh env self-seeds and this migration never inserts a just-added enum value.

-- AdminDomain enum. CREATE TYPE has no IF NOT EXISTS, so guard it for idempotency.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AdminDomain') THEN
    CREATE TYPE "AdminDomain" AS ENUM (
      'accounting', 'growth', 'compliance', 'trading', 'ops', 'support', 'overview'
    );
  END IF;
END $$;

-- The grant matrix. `canView` drives nav + route; `canAct` drives mutations.
-- ADMIN (Owner) is never stored here — it bypasses the table in code.
CREATE TABLE IF NOT EXISTS "RoleDomainGrant" (
    "role"      "UserRole"    NOT NULL,
    "domain"    "AdminDomain" NOT NULL,
    "canView"   BOOLEAN       NOT NULL DEFAULT false,
    "canAct"    BOOLEAN       NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3)  NOT NULL,
    "updatedBy" TEXT,
    CONSTRAINT "RoleDomainGrant_pkey" PRIMARY KEY ("role", "domain")
);

-- Role-change audit trail on User (nullable — only staff ever get set).
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleChangedAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "roleChangedBy" TEXT;
