# DECISIONS — U21–U28 (S10, 2026-10-01, taken on Ali's standing delegation of technical calls)

These resolve the 26 conflicts (C1–C26) and 13 gaps (M1–M13) the design critic found between the eight
specs (`specs/U21.md` … `specs/U28.md`, `specs/CRITIC-U21-U28.md`). Where a spec disagrees with this file,
THIS FILE WINS.

## The book's shared contracts
- **C1 · ONE audience resolver.** U24 owns it: `src/lib/server/marketing/audience.ts` exports the filter type
  (`ContactAudienceWhere`), the URL parser, the twin translations, and `contactAudience(...)`. U21 is UI only
  (the rail builds URLs and renders); U23 consumes U24 (the ids arm lives in U24). No other file turns a filter
  into a query (U24's structural guard).
- **C2 · URL vocabulary.** Params: `q`, `consent`, `suppressed`, `op` (operator ID, e.g. `VODACOM`, never the
  brand), `list`, `tag`, `source`, `sort`, `dir`, `page`. Multi-valued axes take a comma list. An UNKNOWN value
  is REFUSED (never silently dropped — a dropped predicate widens a bulk, export or campaign audience): the page
  shows a refused state with a Clear action.
- **C3 · Erased rows** (`sourceRef = "erasure"`, `ERASURE_EVIDENCE`) are EXCLUDED from every reader — list,
  KPIs, bulk, export, campaign, and a whole-number search for their own key. The ONLY code that still sees
  them is the duplicate check (U22's form, U31's importer): U22 refuses to add the number with one sentence and
  opens NOTHING ("This number can't be added to the book."); U31 collapses the row to KEEP.
- **C4 · ONE cache mirror.** `mirrorContactCache(identifier)` (U24 commit 2, in `audience.ts` or a sibling
  module) recomputes `consentState` (= the ledger's latest status, else UNKNOWN) and `suppressedAt` (= the
  active stop's createdAt, else null) for every book row with that msisdn. EVERY writer of the ledger or the stop
  list calls it (consent-ledger, optout-service, erase, consent.ts' toggle path, U22, U23). U24 §6 asserts the
  population.
- **C5 · ONE player-toggle writer.** `syncPlayerToggle` in `optout-service.ts` is exported with an `actor`
  parameter; U23 calls it, never writes `marketingOptIn` itself.
- **C6 · ONE audience JSON, ONE audit describer, ONE cap.** U24's `parseContactAudienceJson`,
  `auditContactAudience` (ids written as a COUNT, never listed) and `MAX_AUDIENCE_IDS = 1000`. U23 uses them; its
  counts come from `contactAudience`, never from `db.marketingContact.page(...)` directly.
- **C7 · dal-parity section numbers in landing order:** §21 = U24 (audience where + tagCounts), §22 = U22
  (`updateIfUnchanged`), §23 = U23 (bulk where methods). red:dal-parity anchors are labelled to match.
- **C8 · loadContacts contract:** `loadContacts(sp, deps?: { reads?: () => Promise<boolean> })` returns
  `{ kind: "ok", view } | { kind: "refused", reason }` (refused = an unknown filter value). The `search`
  injection goes; `reads` (D19, shipped in U20) stays.
- **C9 · ONE href builder:** `contactsHref(sp, patch)` in `contacts-query.ts` carries every filter param, never
  `page` unless patched, NEVER `edit`. Pagination, Clear search, Clear filters, every pill and U22's dialog
  open/close all go through it. SortTh is handed `sp` without `edit`.
- **C10 · ONE numbering lookup:** `tz-msisdn.ts` exports `ndcRow(ndc)` and `ndcsForOperator(id)` (from the one
  table); `operatorBrand` and every filter use them. NDC_INDEX stays private.
- **C11 · ONE tag rule** (U28's `contact-fields.ts`: `splitTags`, `tagKey`): split on `,` `;` `|`; trim; collapse
  inner spaces; STORED LOWERCASE; allowed characters letters, digits, space, `-`, `_`; 1–32 chars; at most 20
  tags per contact; case-insensitive dedupe. Every writer (form, bulk, import) uses it; the rail groups by it.
- **C12 · ONE limits table** in `contact-fields.ts`: displayName 120, email 254, notes 1000, tag 32, tags 20,
  list name 60. The form, bulk and import all read it.
- **C13 · Consent UNKNOWN reads "Not recorded" everywhere** (as U20 shipped it). The CONSENT/SOURCE label maps
  move to `contacts-copy.ts` ONCE (U21).
- **C14 · Suites:** `test:contacts-page` holds the read-only list + filters (U20, U21). Mutating units get their
  own: U22 `test:contacts-form`, U23 `test:contacts-bulk`, U24 `test:contacts-audience`. Each is in predeploy and
  has an in-process `--prove-red`.

## The import track
- **C15 · ONE parsed shape** in `src/lib/contacts/parsed-file.ts` (U27a creates it):
  `ParsedContactsFile = { format: "csv" | "xlsx" | "vcard" | "paste"; fileName: string | null; rows: { line: number; cells: string[] }[]; width: number; blankRows: number; notes: string[] }`.
  U25, U26 and U27b emit it; U27's assertion that exactly one `export type ParsedContactsFile` exists stands.
- **C16 · The formula-guard pair** (`guardCell`/`unguardCell`) lives in `csv-write.ts` (U28), with the `'` lead
  rule so `unguardCell(guardCell(s)) === s`. U25 defines none and imports nothing for it.
- **C17 · The vCard sniff** `looksLikeVcard` lives in `vcard.ts` (U26). `import-parse.ts` (U25) may import from
  `src/lib/contacts/*` and `src/lib/tz-msisdn` only (its zero-import rule is relaxed to that).
- **C18 · ONE spreadsheet sniffer and ONE refusal copy table** in `xlsx-limits.ts` (U27a); `detectFormat` calls it.
- **C19 · BOM:** `stripBom` (U25) is the decode-time stripper; U26/U28 strips are belts. Reword "the ONE stripper".
- **C20 · The vCard→field mapping** is owned by `contact-fields.ts` (`CONTACT_FIELDS[*].vcard`); `vcard.ts`
  imports `contact-fields.ts` (relax U26 §V11.1 to "imports only tz-msisdn and contact-fields"). Name = FN, else
  N given + family, else ORG.
- **C21 · ONE `test:contacts-import` runner** (`scripts/contacts-import.test.mts`) with per-unit section modules
  in `scripts/contacts-import/` (`fields.mts`, `csv.mts`, `vcard.mts`, `xlsx.mts`), one harness shape (the
  contacts-page `Impl` swap with in-memory plants). Created by U28a (first to land).
- **C26 · D18 belongs to U30** (the action + upload UI). §8's D18 row owner → U30, and U30's §9 text names D18.
- **M6 · Excel's scientific form** (`2.55713E+11`) is flagged once, in U28's `draftContactRow`, for every producer.
- **M7 · The paste producer** is U30's, emitting `format: "paste"`.

## Page track details
- **C22 · Build order:** decisions commit → U24 c1 ∥ (U28a, U27a) → U24 c2 → U21 → U22 → U23; parser track U26 →
  U25 → U27b in parallel with U24 c2–U23; U28b last.
- **C23 / M13 · Officer "Suppress" stays PERMANENT** (a staff decision recorded with the officer's name is not
  the person's to undo); U23's confirmation says so in words. Recorded as an owner question in §0 — Ali may rule
  otherwise.
- **C24 · Action files:** `contact-form-actions.ts` (U22), `contact-bulk-actions.ts` (U23), `import-actions.ts` (U30).
- **C25 · CAS:** both twins' `updateIfUnchanged` write an EXPLICIT `updatedAt` (the caller's `at`).
- **M3 · client-graph-safe pins:** each unit pins its own `src/lib/contacts/*` files in
  `scripts/client-graph-safe.test.mjs`.
- **M4 · U24's population** includes `tagCounts` and U23's where-driven bulk methods; CACHE_WRITERS includes
  `contact-bulk.ts`.
- **M5 · A `contactEmail` registry entry** (U22, the first surface to show an email; masked like `email`,
  re-read by contact id); exports mask it (U34).
- **M8 · U21's DAL members** fold into U24's §21.
- **M9 · OD11's stale "owed before U16/U23"** is struck — the DAL half landed (store.ts re-arm + lift filter).
- **M10 · U23 ships server + UI in ONE push** (test:orphan-actions).
- **M11 · U21's RED cell names `red:contacts-page` FIRST.**
- **M12 · U22's dialog URLs carry the filters** (contactsHref) and `edit` never reaches SortTh, pagination or the
  SearchBox.
- **D19 is honoured since U20** (shipped): row-by-row player signals render only for a viewer whose
  identity.contact cell is `read`. Every later unit keeps it: U21's rail has no "is a player" axis for masked
  viewers; U22's duplicate check on a player-linked number says the same sentence as any duplicate.

## AMENDMENT A1 (S10, after the tranche-1 reviews) — binding
- **A1.1 · D19 covers CONSENT too.** Until U33, a GIVEN or WITHDRAWN ledger row can only come from a player (sign-up,
  profile, opt-out) or an erasure, so a per-row Consent chip answers "is this a player?" for a number a masked role
  typed. For a viewer whose identity.contact cell is NOT `read`: the per-row Consent chip (U20's column), the post-save
  consent chip (U22), and the URL axes `consent`, `source` and `player` are not rendered, and the loader REFUSES a typed
  one with a role refusal ("This filter isn't available to your role.") BEFORE any row is read. Whole-book KPI counts
  stay (a count over the book is not a per-number answer). Readers (`read`) see everything.
- **A1.2 · vCard emits NO header row.** U28 maps `format: "vcard"` by the fixed `fileColumns()` order and never
  header-matches it; `line` stays the card ordinal (≥ 1, strictly increasing — `isParsedContactsFile` holds). Skipped
  cards go to `unreadable` (X19).
- **A1.3 · Excel's NUMERIC shortened form.** A numeric XLSX cell that is an integer ≥ 1e11 AND divisible by 1e6 is
  written by U27b as Excel's scientific text (e.g. `2.55713E+11`), so U28's one detector (`looksExcelShortened`)
  flags it and the row is `invalid` with the shortened-number sentence. Never imported as a stranger's number.
- **A1.4 · The XLSX size gate** computes the EXACT decoded size from the base64 length (3·len/4 − padding) and
  refuses above 716 800 bytes before any decode; U27's Accept (+1 byte refuses before decode) then holds.
- **A1.5 · Google Contacts labels** (`Group Membership`, `Labels`) are NOT tag aliases: they move to
  `CONTACT_NOT_IMPORTED` with their own sentence (Google's `* myContacts ::: …` labels are not tags; map a cleaned
  column if you want them). C11 is unchanged.
- **A1.6 · One phone-format remedy:** the Phone hint and every CSV-directing refusal use ONE exported remedy clause
  from `xlsx-limits.ts` ("format the phone column as Number with 0 decimal places").
- **A1.7 · An erased row is MISSING to `?edit=`** (U22's edit loader and `editContact` treat `sourceRef = "erasure"`
  as not found; the refusal payload carries no id).
- **A1.8 · `ParsedContactsFile` gains `unreadable: { line: number; reason: string }[]`** (X19) — landed on
  `parsed-file.ts` with its validator.
