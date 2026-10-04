-- U33a-L · ContactListBasis — the outreach basis recorded on a list (OD57 · OD58; docs/marketing-specs/U33a-U37c-OD58.md
-- §4). ⛔ NEVER A CONSENT: the consent ledger stays the person's own word, and nothing here is ever written to it (S1).
--
-- HAND-WRITTEN AND EXPAND-ONLY. Every statement below creates something that did not exist: one TABLE, its primary key,
-- two indexes and one foreign key. Nothing is altered or removed, no enum is created or extended (55P04 never arises), and
-- no statement names an object another lane owns — the foreign key only REFERENCES "ContactList", it changes nothing on it.
--
-- ⭐ SAFE WHILE THE OLD BUILD RUNS (§4.4). Nothing in the running code reads or writes this table: the old Prisma client
-- does not know it, and the first writer (U33b-L's Lists card) and the first reader (U33a-G's gate) push only after this
-- file is live. Adding the foreign key locks "ContactList" only for the moment it validates the NEW table, which is empty,
-- so it checks no row and lasts milliseconds; RESTRICT refuses deleting a list only once a basis row exists, and none can
-- exist before U33b-L (no code path deletes a list today in either twin).
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does not declare — the eight
-- `gin_trgm_ops` indexes and the `Transaction` unique, every time (read the head of 20260928170000_marketing_contact_book).
-- `test:migration-ownership` inspects removals only, so a purely additive file passes it trivially; the evidence for THIS
-- file is `test:dal-parity` §27.schema (the model, this file and the stored shape name one column set) and
-- `scripts/live/list-basis-pg-probe.mts`, which applies every migration from EMPTY on PostgreSQL 18.3 and requires the drift
-- diff to name only the four objects below.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs each file in ONE transaction, and CREATE INDEX CONCURRENTLY cannot run
-- inside one. The table is empty at creation, so a plain index costs nothing.
--
-- ⭐ APPEND-ONLY BY THE DATA LAYER, NOT BY THE DATABASE: recording again is a NEW row, a revocation sets "revokedAt",
-- "revokedBy" and "revokedReason" ONCE, and neither twin has an update or a delete member (`test:dal-parity` §27.3).
-- ⭐ RESTRICT, NEVER CASCADE: a basis is the evidence behind every message sent under it (GN 478T reg 51(1)), so it outlives
-- any wish to delete its list. (`ON UPDATE CASCADE` is Prisma's default for a key that never changes.)

-- CreateTable
CREATE TABLE "ContactListBasis" (
    "id" TEXT NOT NULL,
    "listId" TEXT NOT NULL,
    "basisKey" TEXT NOT NULL,
    "wording" TEXT NOT NULL,
    "wordingVersion" INTEGER NOT NULL,
    "adultWording" TEXT NOT NULL,
    "adultVersion" INTEGER NOT NULL,
    "proofNote" TEXT NOT NULL,
    "recordedBy" TEXT NOT NULL,
    "recordedAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "revokedBy" TEXT,
    "revokedReason" TEXT,

    CONSTRAINT "ContactListBasis_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
-- A list's bases, newest first: the Lists card's history and the standing read's unrevoked bases of a set of lists.
CREATE INDEX "ContactListBasis_listId_recordedAt_idx" ON "ContactListBasis"("listId", "recordedAt");

-- CreateIndex
CREATE INDEX "ContactListBasis_recordedAt_idx" ON "ContactListBasis"("recordedAt");

-- AddForeignKey
ALTER TABLE "ContactListBasis" ADD CONSTRAINT "ContactListBasis_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
