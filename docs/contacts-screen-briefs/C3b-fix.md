# C3b-fix — the review round for C3b (brief for the builder)

## Context
C3b ("the readers forgiving of real files") is built and integrated on branch `contacts-c3b-int` but NOT live. Read its
two commits first: `git show 579f194d` (the feature) and `git show 3127bb3c` (a test fix), and the plan's row C3b in
docs/CONTACTS-SCREEN-PLAN.md. An adversarial review found the defects below. Fix exactly these — nothing else — and
prove each one. Every decision below is MADE; do not reopen it.

## The decisions
**D1 · BLOCKER — the split's cost must be linear and bounded.** `wordSeparatorAt` rescans a run of blanks from every
blank in it, so a phone cell of 200,000 spaces costs ~2·10¹⁰ steps inside a server action on the live money server.
(a) In `phoneCellParts` (src/lib/contacts/phone-cell.ts), when the word-separator test fails at a blank, jump past the
whole blank run (the test would fail at every later blank of the same run). (b) Never split a cell longer than the phone
field's own limit — `CONTACT_LIMITS.phone` (40) in src/lib/contacts/contact-fields.ts; a longer cell is already invalid
there ("longer than 40"). ONE number: import it, or pin the equality in a test — never a second literal. Then
`firstMobileIn` / `phoneCellRefusal` answer a longer cell from the whole cell only. (c) Check every per-character loop C3b
added (the browser's extra-numbers count, G4's per-row scan in import-read.ts, the CSV G1 path) for the same shape.
Prove: a suite case feeds a 200,000-space cell and a 32,767-character "a a a …" cell to every public function of
phone-cell.ts and asserts each returns within 50 ms; a red plant restoring the rescan fails on time.

**D2 · G4 reads only the person's OWN phone columns.** The fallback list (`OTHER_PHONE_HEADERS` and `isPhoneColumnHeader`
in src/lib/contacts/import-read.ts) keeps: Outlook's Mobile Phone, Business Phone, Business Phone 2, Home Phone, Home
Phone 2, Other Phone, Primary Phone, Car Phone; Google's "Phone N - Value"; the strong English/Swahili phone headings U28
knows. It NEVER takes: Assistant's Phone, Company Main Phone, Callback, Pager, any Fax, Telex, TTY/TDD, ISDN, Radio Phone —
nor a WEAK alias (Number, Namba, Nambari, Contact, Contacts): a weak column counts only when the officer maps it as Phone.

**D3 · Several mobiles in one row (decision S15-14).** A row is one person, and the platform cannot check a person's
OTHER number against the stop list or an erasure when that number never reaches the server. So — until step C3e designs
that look-up for every format — a number is taken out of several ONLY when the row holds exactly ONE DISTINCT Tanzanian
mobile:
- G3 (one cell): a cell whose parts hold exactly one distinct mobile (the others landlines, foreign numbers, labels or the
  SAME mobile again) yields it. A cell with two or more DISTINCT mobiles yields none, and its sentence says so in words —
  e.g. "This cell holds more than one mobile number. Keep one (one number per person) and import again." — never a number.
- G4 (other columns): read only when the mapped phone cell yields no mobile; then the own-phone columns of D2 yield a
  mobile only when together they hold exactly one distinct mobile. Two or more → the row is invalid with a sentence naming
  the COLUMNS (headers, never cell content; a header holding 7 or more digits is never echoed — the copy table's rule), e.g.
  "This row has no mobile number in its phone column, and more than one in its other phone columns (Business Phone, Home
  Phone). Keep one in the phone column and import again." PREFERRED MECHANISM (use it unless you find it wrong, and then
  say why): the added column's cell carries ALL the distinct mobiles of the row's own-phone columns, in column order,
  joined by " / " — so the server's ONE rule (G3 under D3) yields the single mobile, or refuses two or more with its
  multi-mobile sentence, and the server sees every number the row holds (which C3e's stop/erasure look-up will need).
  Then the G4-specific sentence above may be the G3 one if it reads true for the added column; say which you chose.
- The S15-4 "row" count (`extraNumbersOf`, unit "row", and its notes on the done panel and the columns step) is REMOVED
  for CSV, Excel and the paste table: under D3 no mobile is ever left out silently. The vCard count stays exactly as it was
  before C3b (a vCard already chooses one TEL — that is C3e's subject, unchanged here).
- A whole cell that IS one number (parseTzNumber ok) is unchanged.

**D4 · A bare nine-digit part is never a mobile.** After a split, a part counts only when it is a COMPLETE number: its
digits begin with 0 or 255, or a "+" or "00" stands before them. "+254, 712 345 678" or "254/712345678" must never become
+255 712 345 678 (a stranger). A WHOLE cell of bare nine digits keeps today's reading (Excel drops a number cell's 0).

**D5 · G1 — honest counts when an unclosed quote swallows lines.** (a) Count the physical lines swallowed (line breaks
inside the open quote). (b) The unreadable record's sentence says "Row N opens a quote (") that is never closed, so it
and the M lines after it could not be read. …" (keep the way out). (c) A READER NOTE at the columns step says it in one
line. (d) The check's and the result's sum lines never claim "every row of your file is counted once" when lines were
swallowed — they say how many lines after row N were not read. (e) G1 applies only when at least ONE DATA row (after the
header row) came before the broken record; otherwise the file is refused whole with today's sentence. Update C1l's
mid-file case to the new truth.

**D6 · G2 — choose the sheet by its CONTENT, through ONE shared function.** Create
`src/lib/contacts/sheet-choice.ts` (pure, client-safe, imports only other client-safe contacts modules; pin it in
scripts/client-graph-safe.test.mjs): `chooseSheet(sheets)` where each sheet is `{ name, visible, sample }` and `sample` is
its first ≤ 200 non-empty rows as cell texts; it returns `{ index, note }`. Rule: per VISIBLE sheet, count the sample's
cells that yield a mobile (`firstMobileIn`); choose the visible sheet with the MOST; a tie → the earliest in tab order;
none anywhere → the first visible sheet (as before C3b). A hidden or veryHidden sheet is never read. The note (through
the copy table's sheet-name rule) names the sheet read and its place counted among VISIBLE sheets only, and names every
other visible sheet whose sample holds mobiles as NOT read, with the way to import it (move it to the first place in
Excel, or save it as its own file). The server reader (src/lib/server/contacts/import-xlsx.ts) calls it; its header-only
`pickSheet` / `hasPhoneColumn` rule goes. ⚠️ A parallel builder (step C3c, branch `contacts-c3c`) is writing a browser
reader for big workbooks that will call this SAME function — keep the signature exactly as above.

**D7 · G5 — a title above the column names (every format).** A shared pure function over a read file (used by the CSV
reader's result, the server's XLSX reader and, later, C3c's reader — put it in a client-safe module): if the file's first
non-empty row maps NO Phone column and is not itself a contact (S15-5's test), and one of the next 9 non-empty rows maps a
Phone column by a STRONG heading, that row becomes the header; the rows above it leave the data with a note ("Rows 1–2,
above the column names, were not read — a title.") that never quotes them. Nothing changes for a file whose first row is a
header or a contact. Lines keep their real row numbers.

**D8 · The sheet hint (import-mapping-panel.tsx).** "No visible sheet … has a column named for phone numbers" shows only
when the READER said so (a flag the read carries), never from the officer's current column choice.

**D9 · Pre-existing privacy leak (rule D19) — fix it here.** The columns step's preview (`previewCell`, import-read.ts)
masks a cell for a viewer who may not read numbers by its DIGITS, not its punctuation: any cell holding 7 or more digits
in total is masked with the book's one masking rule, whatever separates them (commas, slashes, dots, letters). Fix
`scripts/live/contacts-import-drive.mjs`'s privacy check the same way (count digits, ignore separators). Suite case:
"255,757,300,014" and "0712/345/678" never shown whole to a non-reader.

**D10 · H4's KEY_SHAPE half can never fail** — replace it with an assertion that can, or remove it and say why.

## Proof (house style — labels, red plants; every plant fails its OWN label for its stated reason)
- phone-cell (D1 timing, D3, D4), csv (D5), xlsx (D6: a title-row customer sheet after a small staff sheet; two phone
  sheets; a header-only phone sheet before the data sheet; hidden tabs not counted in "sheet N of M"), flow (D2: an Outlook
  row whose Assistant's Phone and Company Main Phone hold mobiles; a Namba column never used by G4; D3's two-mobile row and
  its sentence; D7 title rows for CSV and XLSX), the preview masking (D9).
- The generator (scripts/lib/real-world-contact-files.mts): add a CSV broken mid-file (keep the end-of-file one), an
  Outlook export whose Assistant's/Company Main Phone hold mobiles, a workbook with a title row and a staff sheet, a CSV
  with a title row; update every manifest truth; update `scripts/live/contacts-import-drive.mjs` to the new truths.

## Rules of the house (binding)
- Read docs/CONTACTS-SCREEN-PLAN.md §0, §1, §4 first; the importer's contract is src/lib/contacts/import-flow.ts. Do NOT
  edit the plan doc or the marketing tracker — the integrator records the step.
- Personal data (§5.14): no sentence, note, log or audit row quotes a cell.
- Comments: the repo writes long, reasoned header comments (WHY, the decision, the guard that holds it) — match them, and
  correct every C3b comment your change makes untrue.
- Tailwind scans comments: never write a class-shaped string in a comment. Build every control character and backslash
  from its code — the editing tools decode escape text into raw characters; phone-cell.ts is scanned for both.
- ⛔ RAM: run Node ONLY through the lock, ONE job at a time:
  `bash /c/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/2540536f-6d58-44e1-b079-609d2a18516a/scratchpad/fastlock.sh c3bfix-builder <command>`
  (run from your checkout; it waits for the lock — other jobs hold it for up to 20 minutes; never touch the lock).
  Allowed: `npm run typecheck`, `npm run test:contacts-import` (+ `red:`), `npm run test:contacts-boundary` (+ `red:`),
  `npm run test:contacts-staging` (+ `red:`), `npm run test:client-graph-safe`, `npm run test:source-bytes`,
  `npm run test:docs`, `npx tsx <a script>`, the generator. NEVER next build, next dev, Playwright, npm install / npm ci
  (node_modules is a junction into another tree), prisma generate.
- Git: only your checkout and branch; small commits; push each to its origin branch; never main, never force.
- Your final message is all that is returned: what you built (files, functions), every decision beyond this brief with
  its reason, the exact suite results you saw through the lock (counts; red caught/total; any plant left green), the
  commits (sha + subject), and plainly what is NOT done or NOT run.
