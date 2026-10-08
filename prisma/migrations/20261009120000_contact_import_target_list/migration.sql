-- S15 · THE IMPORT'S TARGET LIST — ContactImport.targetListId (docs/CONTACTS-SCREEN-PLAN.md §4.4; decisions S15-1 ·
-- S15-6). The start freezes the officer's decision on the run (`contactImport.freezeDecision`) and, with it, the contact
-- list the import adds its contacts to; every commit step reads it back from the run, so a reload, another tab or an
-- adopting admin carries on with the list the officer chose — never one a later request names.
--
-- HAND-WRITTEN AND EXPAND-ONLY. Three statements, each creating something that did not exist: one NULLABLE column, its
-- index and one foreign key. Nothing is altered or removed, no enum is created or extended (55P04 never arises), and the
-- foreign key only REFERENCES "ContactList" — it changes nothing on it.
--
-- ⭐ SAFE WHILE THE OLD BUILD RUNS (the deploy overlap). The old Prisma client does not know the column and never names
-- it; every existing run reads NULL ("no list"), which is exactly what a run started before this file means. Adding a
-- nullable column without a default rewrites no row. The foreign key validates the new column, which is NULL on every
-- row, so it checks nothing and holds its locks for milliseconds; the index is built over the same NULLs.
--
-- ⛔ SET NULL, NEVER CASCADE. A run is the record of what an import wrote to the book (its settled rows are kept 90
-- days, docs/DATA-RETENTION.md); deleting a list must stop the run adding to it — the next commit step reads NULL and
-- adds to nothing — and must never delete the run. (`ON UPDATE CASCADE` is Prisma's default for a key that never changes.)
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does not declare — the eight
-- `gin_trgm_ops` indexes and the `Transaction` unique, every time (read the head of 20260928170000_marketing_contact_book).
-- `test:migration-ownership` inspects removals only, so a purely additive file passes it trivially; the statements below
-- are typed from the model in exactly the shape Prisma writes for it (the column, `<Model>_<field>_idx`,
-- `<Model>_<field>_fkey`), so a drift diff against this schema names none of them.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs each file in ONE transaction, and CREATE INDEX CONCURRENTLY cannot run
-- inside one. The import table is small (a run per file; retention purges finished runs after 90 days).

-- AlterTable
ALTER TABLE "ContactImport" ADD COLUMN     "targetListId" TEXT;

-- CreateIndex
CREATE INDEX "ContactImport_targetListId_idx" ON "ContactImport"("targetListId");

-- AddForeignKey
ALTER TABLE "ContactImport" ADD CONSTRAINT "ContactImport_targetListId_fkey" FOREIGN KEY ("targetListId") REFERENCES "ContactList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
