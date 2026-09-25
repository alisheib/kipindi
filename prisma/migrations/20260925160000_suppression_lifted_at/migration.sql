-- U8 · A SUPPRESSION ROW IS NEVER DELETED, BUT IT MAY BE SUPERSEDED.
--
-- ⛔ EXPAND ONLY. Two nullable columns, no backfill, no drop, no enum. Every existing row
-- keeps `liftedAt = NULL`, which the gate reads as "still refusing" — so this migration
-- cannot change the verdict for anybody already suppressed.
--
-- ⚠️ `prisma migrate diff` also reported `Transaction_provider_providerRef_key` here. That is
-- PRE-EXISTING DRIFT between the live schema and `schema.prisma`, not part of this change, and
-- it was stripped by hand. A migration that carries a difference its commit did not make is a
-- migration nobody can revert.
ALTER TABLE "Suppression" ADD COLUMN     "liftedAt" TIMESTAMP(3),
ADD COLUMN     "liftedReason" TEXT;
