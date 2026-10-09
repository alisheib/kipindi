-- THE LISTS' NAME IS UNIQUE IN THE DATABASE WHATEVER ITS CASE (the duplicate audit, probe p6, S14 2026-10-08; ported to the
-- live tree in C8c · N3, 2026-10-09 — docs/contacts-screen-briefs/C8c.md; docs/marketing-specs/U23.md, "as built - the
-- duplicate audit"). "Arusha event" and "ARUSHA EVENT" are ONE list to a person and, until this file, two audiences to the
-- store: "ContactList"."name" is @unique, which Postgres reads case-sensitively. The bulk bar and the importer's start ask
-- `listNameKey` (NFKC, then lower case) over every list before they create one, so one officer cannot make the second
-- spelling - but two officers naming the same new list in the same second both pass that check, and both rows landed (the
-- bulk bar's create, or the importer's freeze, which inserts its new list inside its own transaction). One lower("name")
-- index closes the window, for every writer there will ever be.
--
-- ⚠️ RENUMBERED. The fix was written on 2026-10-08 as 20261008160000_contact_list_name_lower_unique on the branch
-- backup/marketing-s14-import (commit b97fed35) and never reached main; it is given a timestamp AFTER every migration main
-- holds (the last was 20261009120000_contact_import_target_list), so `prisma migrate deploy` applies it last and no
-- database that ran the old folder exists.
--
-- HAND-WRITTEN AND EXPAND-ONLY. One statement creates one index that did not exist; nothing is altered, dropped, renamed or
-- rewritten, no column, type or enum changes, and no row is read or written. An EXPRESSION index cannot be declared in
-- schema.prisma (the same reason as the eight gin_trgm_ops indexes of 20260728030000_search_trgm_small_tables), so the schema
-- is untouched and `prisma migrate diff` will always list this index as drift to drop - ⛔ never take it from a generated
-- file: `test:migration-ownership` stops any later migration dropping it without a written @drops declaration, and the
-- model's own @unique ("ContactList_name_key", the exact-case index) stays: the two together say "exact" and "any case".
--
-- ⭐ SAFE WHILE THE OLD BUILD RUNS. The running build's create already turns Prisma's P2002 into null and the bulk service
-- answers null as "list_exists"; the running build's import start already answers a P2002 from its freeze as
-- "list_name_taken" - both were written for the race this index closes - so an old process meeting the new index refuses
-- the second spelling in the words it already has. No query names the index.
--
-- ⭐ AND IT CAN NEVER STOP A DEPLOY. If two lists ALREADY differ only by case, creating the index would fail and the whole
-- release would stop on a migration. They cannot be merged or renamed by a migration (a list may carry a basis that is
-- evidence, and memberships are history), so the file creates nothing in that case and says so in a NOTICE: the pre-check
-- still refuses the second spelling one officer at a time, nothing is worse than before, and the index is created by hand
-- once an officer has renamed one of the pair (`lower("name")`, unique, the same name). After a release, ask
--   SELECT indexname FROM pg_indexes WHERE indexname = 'ContactList_name_lower_key';
-- and expect one row. The table was created empty with the book (U18), and lists are made only through the bulk bar and
-- the importer's start.
--
-- ⛔ lower(), NOT NFKC. Postgres lower() is the key a plain unique index can hold on every server (normalize() needs a UTF8
-- database and a server of 13 or later). The index is the BACKSTOP for the race, not the rule: the rule is `listNameKey`,
-- asked first, so a width variant is still refused before the index is reached - and the one pair the index could refuse
-- that the rule would allow is refused in the same words, which is safe.
--
-- ⛔ NO CONCURRENTLY. `prisma migrate deploy` runs a file in ONE transaction, and CREATE INDEX CONCURRENTLY refuses to run
-- inside one. The table holds a handful of rows, so the plain build is instant. IF NOT EXISTS lets a hand-applied run and the
-- recorded one both succeed.
--
-- Evidence for this file: `test:dal-parity` 19.listci.* (the file, both twins' create and find, the memory freeze's key),
-- `test:contacts-bulk` B7b (the race, executed on the memory twin), `test:contacts-import` commit M26 (the importer's start
-- meeting the same refusal), and on PostgreSQL `scripts/live/contacts-audience-pg-probe.mts` section 7 (a second spelling
-- refused in the DAL, the index in pg_indexes, BOTH branches of the DO block on a scratch table) and
-- `scripts/live/contacts-import-pg-probe.mts` section 8 (the start's new list refused in another case, rolled back).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "ContactList" GROUP BY lower("name") HAVING count(*) > 1) THEN
    RAISE NOTICE 'ContactList_name_lower_key was NOT created: two lists already differ only by case. Rename one of them, then create the unique index on lower(name) by hand.';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS "ContactList_name_lower_key" ON "ContactList" (lower("name"));
  END IF;
END
$$;
