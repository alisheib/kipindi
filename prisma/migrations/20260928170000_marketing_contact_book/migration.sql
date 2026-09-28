-- U18 · THE MARKETING CONTACT BOOK — the 86th migration.
--
-- HAND-WRITTEN AND EXPAND-ONLY. Every statement below creates something that did not exist;
-- there is no DROP, no ALTER of another migration's object, and no statement about a table
-- this unit does not own.
--
-- ⛔ WHY IT IS HAND-WRITTEN. `prisma migrate diff` sweeps in every object `schema.prisma` does
-- not declare — the eight `gin_trgm_ops` indexes and the `Transaction` unique, every time. The
-- 82nd migration (marketing_consent_suppression) shipped exactly that pollution to production:
-- read its head and it drops foreign keys belonging to anti-fraud. `test:migration-ownership`
-- refuses an undeclared DROP, but it inspects DROPs ONLY — so a purely additive file like this
-- one passes it TRIVIALLY, and a green there is not evidence the file is free of pasted drift.
-- The evidence is that this file was typed from the models and then applied from EMPTY.
--
-- ⛔ NO CONCURRENTLY. Nothing in this repo enforces that over an arbitrary migration
-- (`test:dead-schema` §3 only loops over migrations that drop a dead table), so it is written
-- down rather than assumed: `prisma migrate deploy` runs each file in ONE transaction, and
-- CREATE INDEX CONCURRENTLY cannot run inside one. These tables are empty at creation, so a
-- plain CREATE INDEX takes no meaningful lock anyway.

-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('IMPORT', 'REGISTRATION', 'OPERATOR', 'AGENT');

-- CreateEnum
-- ⭐ A NEW TYPE, not a value added to "MessagingConsentStatus". Adding a value to an EXISTING
-- enum costs its own migration ONE COMMIT AHEAD of any writer (Postgres 18.3 refuses
-- `55P04 unsafe use of new value` in the transaction that adds it); a new type does not.
CREATE TYPE "ContactConsentState" AS ENUM ('UNKNOWN', 'GIVEN', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "MarketingContact" (
    "id" TEXT NOT NULL,
    "msisdn" TEXT NOT NULL,
    "rawInput" TEXT NOT NULL,
    "displayName" TEXT,
    "email" TEXT,
    "ndc" TEXT NOT NULL,
    "operator" TEXT,
    "source" "ContactSource" NOT NULL,
    "sourceRef" TEXT,
    "userId" TEXT,
    "consentState" "ContactConsentState" NOT NULL DEFAULT 'UNKNOWN',
    "suppressedAt" TIMESTAMPTZ(3),
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "importId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "MarketingContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "ContactList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
-- ⭐ The compound primary key IS the deduplication: "add these 4,000 to the list" run twice
-- must not make anybody a member twice, or a campaign resolving this list counts and texts
-- them twice.
CREATE TABLE "ContactListMember" (
    "listId" TEXT NOT NULL,
    "contactId" TEXT NOT NULL,
    "addedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "addedBy" TEXT,

    CONSTRAINT "ContactListMember_pkey" PRIMARY KEY ("listId","contactId")
);

-- CreateIndex
-- ⛔ THE ONE KEY. Two spellings of one person is two verdicts, and an importer that creates a
-- second row for a number already in the book is an importer that texts somebody twice.
CREATE UNIQUE INDEX "MarketingContact_msisdn_key" ON "MarketingContact"("msisdn");

-- CreateIndex
CREATE INDEX "MarketingContact_ndc_idx" ON "MarketingContact"("ndc");

-- CreateIndex
CREATE INDEX "MarketingContact_consentState_idx" ON "MarketingContact"("consentState");

-- CreateIndex
CREATE INDEX "MarketingContact_createdAt_idx" ON "MarketingContact"("createdAt");

-- CreateIndex
CREATE INDEX "MarketingContact_userId_idx" ON "MarketingContact"("userId");

-- CreateIndex
CREATE INDEX "MarketingContact_importId_idx" ON "MarketingContact"("importId");

-- CreateIndex
-- ⭐ THE REPO'S FIRST ARRAY GIN INDEX. The eight existing GIN indexes are `gin_trgm_ops` on
-- TEXT; this one indexes an array for `tags @> ARRAY[...]` (U21's tag filter). It is DECLARED
-- in schema.prisma too — an index the schema does not declare is one `migrate diff` proposes
-- to DROP every time, which is how the trigram indexes keep being swept into other people's
-- migrations.
CREATE INDEX "MarketingContact_tags_idx" ON "MarketingContact" USING GIN ("tags");

-- CreateIndex
CREATE UNIQUE INDEX "ContactList_name_key" ON "ContactList"("name");

-- CreateIndex
CREATE INDEX "ContactList_createdAt_idx" ON "ContactList"("createdAt");

-- CreateIndex
CREATE INDEX "ContactListMember_contactId_idx" ON "ContactListMember"("contactId");

-- AddForeignKey
-- ⛔ SET NULL, NOT CASCADE. `userId` is a LINK, never a copy: deleting the account breaks the
-- pointer without deleting the book row, and `erasure` is what then suppresses the number. A
-- CASCADE here would silently delete marketing evidence; leaving the row marketable is D16.
ALTER TABLE "MarketingContact" ADD CONSTRAINT "MarketingContact_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_listId_fkey" FOREIGN KEY ("listId") REFERENCES "ContactList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactListMember" ADD CONSTRAINT "ContactListMember_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "MarketingContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
