# C3c — big Excel workbooks read in the officer's browser (brief for the builder)

## Why
Today an .xlsx over 700 KB (about 25,000 contact rows) is REFUSED at the import dialog with "save it as CSV". That
remedy carries a real data-loss trap: Excel writes a 12-digit number in General format to CSV as `2.55713E+11`, and the
last digits are gone for good. Ali (the owner) wants "any extreme normal-life scenario from all types of imports,
Excels, contact lists from phones" to just work. The 700 KB cap exists only because the workbook is UPLOADED to ONE
server action (Next's 1 MB body ceiling) and parsed on the live money server with exceljs (memory). The fix is to read a
big workbook IN THE BROWSER, the way CSV and vCard files already are, and stage its rows exactly like a CSV's.

## The decision (made — do not reopen)
- Workbooks of 700 KB or less keep TODAY'S PATH unchanged (the server reader `src/lib/server/contacts/import-xlsx.ts`
  through `readXlsxImportAction`) — proven, audited, untouched.
- A workbook OVER `XLSX_MAX_BYTES` (today refused with `xlsxRefusalSentence("too_large")`) is read by a NEW pure,
  client-safe reader in the browser and returned as `{ kind: "parsed", file, digest, extraNumbers }` — the CSV path's
  outcome — so the dialog carries on exactly as for a CSV (columns → upload in batches → check → import).
- So a defect in the new reader can only touch files that are refused today. The two readers are held to ONE meaning by
  (a) sharing the pure cell rules and (b) a DIFFERENTIAL test over a corpus both can read (below).

## What to build
1. `src/lib/contacts/xlsx-cells.ts` (pure, client-safe, imports nothing from `src/lib/server`): MOVE the server reader's
   pure cell semantics here and import them back into `import-xlsx.ts` — `xlsxNumberText` (integers exact; float noise
   past 15 significant digits rounded; genuine decimals kept; A1.3: an integer ≥ 1e11 divisible by 1e6 → Excel's
   scientific text, e.g. `2.55713E+11`), the date text (ISO day at midnight, else day + time to the second), booleans
   TRUE/FALSE, the cell flags (`merged`, `formula_without_result`, `error`) and the note sentences that name their rows.
   ONE copy of each rule, used by both readers. Pin the new file in `scripts/client-graph-safe.test.mjs` like the other
   client-safe contacts modules, and keep `test:contacts-boundary` green (§1 keeps `src/lib/server` out of client graphs).
2. `src/lib/contacts/xlsx-read.ts` (pure, client-safe; browser APIs only — `Blob.slice`, `ReadableStream`,
   `DecompressionStream("deflate-raw")`, `TextDecoder`; NO `Buffer`, NO `node:*`; Node 24 has all of these globally, so
   the suites run it as is): `readXlsxInBrowser(file: Blob, opts) → ParsedContactsFile | refusal`.
   - ZIP: find the end-of-central-directory record from the tail (allow a trailing comment), walk the central directory,
     read each needed entry's LOCAL header for its data start (local extra fields may differ from the central ones —
     macOS Archive Utility), take sizes from the central directory (so entries written with a data descriptor, bit 3,
     read fine). Methods 0 (stored) and 8 (deflate) only; zip64, multi-disk, an encrypted entry (bit 0 → "protected"),
     a duplicate part name or an unknown method → the existing `xlsxRefusalSentence` refusals (never a new sentence).
   - Parts: `[Content_Types].xml` (a spreadsheetml workbook, else the existing wrong-format refusals; Strict Open XML and
     an .ods `mimetype` entry refused as the server refuses them), `xl/workbook.xml` (sheets in tab order with `state`
     visible/hidden/veryHidden and `r:id`; `workbookPr date1904`), `xl/_rels/workbook.xml.rels` (relative AND absolute
     targets, e.g. `/xl/worksheets/sheet1.xml`), `xl/sharedStrings.xml` (plain `<t>`, rich text runs joined, PHONETIC
     runs `<rPh>` excluded), `xl/styles.xml` (`numFmts` + `cellXfs` → is this style a DATE format — replicate exceljs
     4.4.0 exactly: read `node_modules/exceljs/lib/utils/utils.js` `isDateFmt` and its built-in format table, and
     `excelToDate` for the 1900/1904 serial), then the sheet(s).
   - XML: a small streaming scanner fed decoded chunks (never `DOMParser` — absent in Node and memory-hungry): element
     names by LOCAL name (the Open XML SDK writes `x:row`, `x:c`), attributes in either quote style, self-closing
     elements, entities (`&amp; &lt; &gt; &quot; &apos; &#NN; &#xHH;`), CDATA, and the OOXML `_xHHHH_` escapes exactly as
     exceljs's text xform decodes them. Strings are kept VERBATIM (never trimmed — `xml:space="preserve"` text keeps its
     spaces).
   - Cells, matching the server's ONE switch (`xlsxCellText`) — read exceljs's `lib/xlsx/xform/sheet/cell-xform.js`
     (`parseOpen`/`parseText`/`reconcile`) and replicate it: `t="s"` shared string · `t="inlineStr"` (`<is>`, rich
     runs joined) · `t="str"` a formula's string result · `t="b"` TRUE/FALSE · `t="e"` blank + `error` flag · `t="n"`
     or none: a number, a DATE when its style is a date format (formula results too, as exceljs's `reconcile` does) ·
     `t="d"` as exceljs reads it · a formula (`<f>`, shared or not) is its cached `<v>`, and none → blank +
     `formula_without_result` · a cell COVERED by a merge (`<mergeCells>`, which comes AFTER `<sheetData>`) is blank with
     the `merged` flag — so buffer the sheet's rows and apply the merges at the end (the CSV reader also holds the whole
     file). Cells and rows WITHOUT an `r` attribute are placed sequentially. A hyperlink's display text is the cell's
     own value.
   - The sheet (C3b · G2, the server's rule): the FIRST VISIBLE sheet in tab order whose header row (its first row with
     anything in it) maps a Phone column through `autoMapHeaders`; else the first visible sheet; a hidden or veryHidden
     sheet is NEVER read; all hidden → `no_visible_sheet`. The same `xlsxChosenSheetNote`.
   - The result: the same `ParsedContactsFile` the server builds — `line` = the 1-based SHEET row, blank rows counted,
     trailing empty cells trimmed, the same notes in the same order, the same caps (`XLSX_MAX_ROWS` / `IMPORT_MAX_ROWS` —
     stop reading the moment the cap is passed and refuse with `too_many_rows`; `XLSX_MAX_GRID_CELLS`). Inflated bytes
     of every part read share ONE budget (pick it — e.g. 1 GiB — and say why in the header); past it, `too_big_inflated`.
     Yield to the event loop between chunks and report progress (inflated bytes of the chosen sheet out of its
     uncompressed size from the central directory) through the existing `ReadProgress`, so the reading bar moves and
     Stop (the AbortSignal) works.
   - An old browser without `DecompressionStream` or its `"deflate-raw"` format (constructing it throws): fall back to
     TODAY'S answer for a big workbook (the `too_large` refusal with its save-as-CSV remedy) — never a crash, never a
     half-read file. Test it by planting a throwing constructor.
3. `src/lib/contacts/import-read.ts` `readContactsFile`: for `detected.kind === "xlsx"` with `size > XLSX_MAX_BYTES`, call
   the new reader instead of refusing; on success return `{ kind: "parsed", file, digest, extraNumbers }` with the digest
   over the exact bytes (as the CSV path does) and `extraNumbers` counted the way the dialog counts them for a workbook
   today (read how the server path's result reaches `extraNumbersOf` and match it — S15-4: one number per person, the
   rest COUNTED in the result, never dropped silently). A refusal returns through the same `refused(...)` with the copy
   table's sentence. The ≤ 700 KB branch is NOT changed.
4. The dialog/entrance copy: nothing an officer reads may still say an Excel file over 700 KB is refused or must be
   saved as CSV. Grep `import-copy.ts`, `import-entrance.tsx`, the sample/help text, `xlsx-limits.ts` and the plan doc's
   §4.2 step 3 ("An Excel file is read by the server (≤ 700 KB; larger ones are told how to save as CSV…)") and make
   each true. Keep `xlsxRefusalSentence("too_large")` for the server action itself (a direct post over the cap).

## How it is proven (tests are part of the build — the repo's conventions are binding)
- A new section `scripts/contacts-import/xlsx-browser.mts`, registered in `scripts/contacts-import.test.mts`'s REGISTRY,
  in the house style of the other sections (labels `L`, `run`, `PLANTS` — every label named by at least one red plant,
  and the runner requires each plant's OWN label among the reds; build every control character from its code —
  the editing tools decode escape text into raw characters; no backslash escapes in new src files).
- ⭐ THE DIFFERENTIAL: for every workbook in the corpus, the server reader (`import-xlsx.ts` on the same bytes, called
  directly — under the cap) and the browser reader produce IDENTICAL `ParsedContactsFile`s (headers, every row's line
  and cells, unreadable list, notes) — or the identical refusal. The corpus: every .xlsx the generator writes
  (`scripts/lib/real-world-contact-files.mts`), the `xlsx` section's own fixtures where reusable, and NEW crafted
  workbooks written as raw XML parts in a zip the test assembles (node:zlib is fine in scripts) that mimic real
  writers: Excel (shared strings, rich text with phonetic runs, `_x000D_` escapes, a date-formatted column with a
  built-in id 14 and a custom `dd/mm/yyyy`, `date1904`, a merged block, a hidden and a veryHidden sheet, a cover sheet
  first), Apache POI SXSSF / phone "contacts to Excel" apps (inline strings, no shared strings), the Open XML SDK (`x:`
  prefixes, cells without `r`), LibreOffice and Google Sheets exports (as you know them), a formula with and without a
  cached value, a boolean, an error, a 12-digit phone stored as a NUMBER, `2.55713E+11` stored as a number and as
  text, a stored (method 0) entry, a data-descriptor entry, a zip comment, absolute rels targets.
- Big: a workbook past 700 KB (the generator's `big-50k.xlsx`, and add a `big-150k.xlsx` streamed the same way) reads
  in Node through the browser reader with counts equal to the generator's manifest truth; past the row cap → refused.
- Red plants at least for: the date rule off by the 1904 offset; phonetic runs joined; a merge's covered cell repeated;
  a hidden sheet read; a formula's missing value read as 0; `x:`-prefixed elements unseen; trailing cells not trimmed;
  the row cap not enforced; the big branch still refusing.
- `scripts/live/contacts-import-big-drive.mjs`: `big-50k.xlsx` (and `big-150k.xlsx`) must now be READ through the real
  dialog and checked (a refusal is a FAIL), its five boxes adding up to its records; import the 150k one to DONE.

## Rules of the house (binding)
- Read `docs/CONTACTS-SCREEN-PLAN.md` §0, §1, §4 first; the importer's contract is `src/lib/contacts/import-flow.ts`.
- Personal data (§5.14): no sentence, note, log or audit row quotes a cell; a sheet title only through the copy table's
  one sheet-name rule.
- Comments: the repo writes long, reasoned header comments (WHY, the decision, the guard that holds it) — match them.
- Tailwind scans comments: never write a class-shaped string in a comment.
- ⛔ RAM: this machine crashes under parallel Node load. Run Node ONLY through the lock, ONE job at a time:
  `bash <scratchpad>/fastlock.sh c3c-builder <command>` (it waits for the lock and holds it for the command). Allowed:
  `npx tsc --noEmit -p .` (or `npm run typecheck`), `npm run test:contacts-import`, `npm run red:contacts-import`,
  `npm run test:contacts-boundary`, `npm run test:client-graph-safe`, single tsx scripts. NEVER `next build`, `next dev`,
  Playwright, `npm install` / `npm ci` (the node_modules is shared with another tree — an install there deletes it).
- Git: work on the branch you are given; commit in small steps; push each commit to its origin branch; never push to
  main, never force-push, never touch another branch.
- Your final message is all that is returned: list what you built (files, functions), every decision you took beyond
  this brief with its reason, the exact suite results you saw (pass/fail counts, red caught/total), and what is NOT
  done or NOT run.
