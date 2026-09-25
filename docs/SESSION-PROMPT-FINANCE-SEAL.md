# SESSION PROMPT — the Finance tab seal

> **Written to be picked up on ANOTHER MACHINE.** Everything a next session needs is in this
> file and in git; nothing here depends on the local memory of the machine that wrote it.
> Branch `finance-seal`, merged to `main` and deployed live on 2026-09-25.

---

## §0 · Read this first — the one shape every defect in this pass had

Every single finding was **a money or time word that meant two different things**, and in every
case the screen stated one of them confidently. Not one was found by a suite; all were found by
reading the code against production, or by the owner looking at a screen.

| The word | Meant here | And also meant | Cost |
|---|---|---|---|
| the levy base | window GGR | the booked settlement fee | **14× overstatement** on a tax tile |
| `HOUSE:COMMISSION` | "our fee" | our fee **net of the levies** | 15% understatement after the first fix |
| `"today"` | rolling 24h in `analytics` | the EAT calendar day everywhere else | two consoles that can never agree |
| "active player" | any txn, any status | money that actually moved | a declined deposit counted as activity |
| "aligned" | a shared top edge | a shared left edge, once stacked | a guard describing the past |

⛔ **The lesson that generalises: do not compute a figure the ledger already knows.** Three
separate fixes in this pass ended at the same place — read `HOUSE:TRA_LEVY` / `HOUSE:GBT_LEVY`,
delegate to `moneyForWindow`, stop re-deriving. Every formula that reconstructs a booked number
is a second implementation that will drift.

---

## §1 · What shipped (3 commits, all live)

1. **`Finance says only what it computed`** — the page: the provider legend named the wrong bars,
   three chart subtitles claimed windows they never plotted, x-labels were 3h off (UTC vs EAT),
   the sparkline ignored the picker and returned 8 points for "7 days", an unreadable `from`/`to`
   silently became last-24h, and the date field sat 8.5px below the time field.
2. **`The export follows the window`** — a `finance-window` report covering the on-screen range
   (the old button always built the previous calendar month); a `date` column that ERASED
   non-date labels, so the match-integrity totals row shipped to the Gaming Board with a blank
   first cell; REP-07 worksheet-global column widths; UTC filename stamps on EAT figures.
3. **`Three money words stop meaning two things each`** — the levy base, `"today"`, "active", and
   two guards that could not fail.

---

## §2 · 🔴 STILL OPEN — pick these up

- ~~**`LEAD-A.2`** (`docs/MONEY-GATE-REMEDIATION.md`): the `market.resolved` audit payload records a
  levy figure the ledger never booked — the third site of the levy defect.~~ ❌ **NOT A DEFECT —
  already REFUTED 3/3** in `MONEY-GATE-REMEDIATION.md` §7.5; only its row in the findings table
  had never been annotated (done 2026-09-25). The payload's `levies` and the ledger's levy lines
  come from ONE `levySplit` since §6.1. Re-confirmed at `360935a3`: `test:levy-allocation` 26/0,
  `red:levy-allocation` 7/7. ⛔ This bullet sent a session to "fix" a closed finding — do not
  reopen it.
- ✅ **The neighbouring `LEAD-F.1` / `LEAD-F.2` are ALSO already fixed** (`781f397e`,
  `MONEY-GATE-REMEDIATION.md` §7.15: `HOUSE:TAX` is subtracted from free cash and captioned
  "Statutory tax held — owed to the state, NOT ours"; `test:house-solvency` 21/0). Their rows
  still read 🟠 with no marker — the same stale-row shape as `LEAD-A.2`. Annotated 2026-09-25,
  and the two code comments that still called `HOUSE:TAX` "retired" (`house-book.ts`,
  `house-ledger.ts`) corrected. ⭐ **Before working a 🟠 row in that table, search the file for
  its id: a later section may already have closed it.**
- ~~**`buildDailyOps` walks the WHOLE `Transaction` table** (`db.txn.listAll()`), which threw once
  against production during verification and passed on retry.~~ ✅ **FIXED 2026-09-25 — and it
  was TWO builders, not one.** `buildFiuSar` (one pack month) walked the table the same way. Both
  now read `db.txn.listInRange(start, end)` — the exact `>= start, < end` bounds of the JS filters
  they replace. Guard **`npm run test:report-window-reads`** (in `test:all`): every `db.txn` read
  method is instrumented and the real builders run on the in-memory store, so it sees a
  whole-table walk by ANY route; figures are checked against the fixture's own arithmetic with a
  row ON each boundary; §3 drives all nine builders. On the pre-fix code it fails 8 checks; RED
  7/7 on mutations. Found by the same review and fixed in the same pass:
  - 🔴 **match-integrity told the Gaming Board it shows "the most recent 200 of N" and showed
    roughly the OLDEST 200** — the first 200 of an unordered read. Now newest-first, then capped.
  - the SAR's equal-amount rows are ordered by time then id (they followed the store's order);
  - `packPeriodBounds` refuses a malformed period (it returned NaN bounds: nothing in memory, an
    opaque throw in Prisma — on the filing an officer signs; the prepare action takes it from a
    form field);
  - `report-parity` §4 now also scans `reports/finance-window.ts`, the one `windowed` builder.
- 🟡 **STILL OPEN, named on purpose — `buildMatchIntegrity` reads the whole table**, ALL-TIME by
  design: it reconciles every voided market against every refund, so there is no window to push
  down and bounding one side would print refunds with no market to explain them. The fix is a
  scale one — a type-filtered SQL count + sum + the newest 200 — and `test:report-window-reads` §3
  allows exactly this one read. Two whole-table reads of OTHER tables also sit on windowed paths
  and no scan sees them: `settlementFeesByPoll` (every RESOLVED market) and
  `loadMoneyAttribution` (every market and position).
- ~~**The XLSX headline "At a glance" block writes money as fused strings**
  (`"158,000   (11 txns)"`) — unsummable in Excel.~~ ✅ **FIXED 2026-09-25.** `SummaryItem` is
  now EITHER `{ num, format }` OR `{ value }` — never both, and the display words come only from
  `summaryText()` so a tile cannot carry two figures. 32 numeric tiles moved (29 always present,
  plus daily-ops' three levy tiles, which exist only when the ledger is readable); the workbook
  writes B as a number cell with the table's own number format, the delta in C, sizes A/B itself
  (a number wider than its column prints `#####`; text only spills), and writes a non-finite
  figure as "—" (never `<v>NaN</v>`, which Excel refuses to open).
  **Proven in real Excel** (COM, the rendered `finance-window.xlsx`): all six glance cells are
  `Double`, `SUM()` = 273,000 and `COUNT()` = 6 — both were 0 on the old text cells.
  ⚠️ **And the daily-ops Margin is rounded ONCE in the builder** (`marginShown`): Excel rounds the
  raw fraction half-up in decimal while `toFixed` rounds the binary double, so GGR 23,000 on
  80,000 retained read 28.8% in the workbook and 28.7% in the PDF and the same file's "Operator
  margin" row. `test:report-cells` 22/0 (§5 carries 13 of them — per-report tile counts pinned,
  exact number formats, the tie case, a negative and a NaN tile), RED **10/10**. The count deltas
  now use the repo's `adminCount()` (utils.ts) — "1 txns" is gone.
- ~~**`REPORT_PERIODS` and the `"today"`/`"mtd"` arms of `report-money.periodBounds` have NO
  readers**~~ ✅ **DELETED 2026-09-25**, and `"7d"` with them: it survived only as
  `dailyKpiSeries`' DEFAULT, the rolling window that returned eight daily points with a short
  first bar, and no caller used it. `ReportPeriod` is now `"30d"` alone (`/admin/insights`'
  `categoryBreakdown("30d")`); `dailyKpiSeries` takes no default. In the same pass the module's
  header — its "normative definitions" — stopped saying GGR is "the commission we keep", that the
  levy is "15% of GGR" and that "the report and the ledger finally agree": all three false, and the
  reason the over-tax was re-derived twice. NGR now names agent commission; analytics.ts' GGR/NGR
  docs and its dangling `periodBounds("today")` pointer corrected.
- **`reports-verify-live.mts` and `report-renderers-smoke.mjs` are NOT npm-wired**, so they never
  run in `test:all`. They are the only instruments that read real money and the real route.
- ⚠️ **Rotate the production DB password.** It was echoed into a session transcript on 2026-09-25.

---

## §3 · The instruments this pass added — and what each one PROVES

Every one has a red control; a guard without one is a claim on trust.

| Command | What it holds | Proven by |
|---|---|---|
| `npm run test:finance-window` | legend == bars, EAT labels, day-aligned series, bucket grain, active-player basis | §5's controls: a FAILED-only player moves the count by 0, a CONFIRMED one by exactly 1, and the all-status count really is higher |
| `npm run test:report-cells` | renders the real documents and reads CELLS back with ExcelJS; §5 — every "At a glance" figure is a formatted NUMBER cell with its delta beside it, the money tiles SUM to the builder's figures, and a ten-figure sum is never `#####` | reverting the fixes reproduces the documented symptoms: an EMPTY totals cell, and "width 10 vs 27 chars"; §5 caught 10/10 mutations (2026-09-25) |
| `npm run test:report-window-reads` | a windowed report reads its WINDOW: daily-ops and fiu-sar make exactly one `listInRange` of exactly their day/month and no other `db.txn` read; no builder but the all-time match-integrity walks the table; its "most recent 200" are the newest 200; a malformed pack period is refused | 8 failures on the pre-fix code; RED 7/7 (2026-09-25) |
| `npm run test:brand-assets` | every report/brand asset is pixel-identical to `src/lib/brand-mark.ts` | decoded-pixel compare, 0 differing samples of 1,048,576 |
| `npm run qa:finance-alignment` | 63 rectangle measurements at 360/768/1280 | **fails 15 assertions on the pre-fix code** |

⛔ **`qa:finance-alignment` needs a server**: `rm -rf .next` → `DISABLE_ADMIN_TOTP=true npx next
dev -p <port>` → `BASE=http://localhost:<port> node scripts/finance-filter-alignment.mjs`.
`next start` will NOT work — `/api/dev-test/seed-admin` 404s when `NODE_ENV=production`.

---

## §4 · Traps paid for in this pass — do not re-pay them

- ⛔ **A byte-compare of a checked-out text file LIES.** `core.autocrlf` rewrites LF→CRLF on
  checkout (449 bytes on disk vs 442 in the blob), so the first brand verifier reported 4 phantom
  "drifts" on identical files. Normalise line endings; for images compare **decoded pixels**, not
  bytes — encoders drift between versions.
- ⛔ **A zero rect is not a measurement.** `domcontentloaded` fires before CSS applies; the first
  probe run measured 0px at one breakpoint and invented two failures. Wait for a non-zero box.
- ⛔ **Never `networkidle` against `next dev`** — the HMR socket never idles, so every navigation
  dies on its timeout and reads like a broken page.
- ⛔ **Measure the element you NAME.** `.closest(".rounded-lg.border")` selected the DATE FIELD,
  not the panel — `DateSelect` wears the same class pair — so "the panel is inside the viewport"
  was measuring a 115px field. Use a dedicated hook (`[data-range-panel]`) and print what you matched.
- ⛔ **A strip fitting is not a FIELD fitting.** The date box is `overflow-hidden` with a `flex-1`
  strip and a `shrink-0` trigger, so what gets clipped is the **trigger**. An assertion that only
  measured the strip certified a visibly cropped calendar glyph as fine — the owner caught it.
- ⛔ **A stale `next dev` survives and serves your OLD build.** Read the server log for
  `EADDRINUSE` before trusting any measurement; kill by PID and check the command line is yours.
- ⚠️ **`next build` leaves a production `.next` that makes `next dev` 404 every route.**
- ⚠️ **After merging `main`, run `npx prisma generate`** — a merge that adds Prisma models leaves
  your client stale and tsc fails in `prisma-dal.ts` with errors that are not yours.
- ⚠️ **A transient build/DB failure is not a defect.** One `npm run build` failed on a Google
  Fonts fetch and passed on retry; one prod `daily-ops` build threw on the whole-table walk and
  passed on retry. Read the first failure's text before believing it.
- ⛔ **Do not write `rank="dense"`, `rank: "dense"` or `rounded-pill` into COMMENTS in
  `datetime-range-filter.tsx`** — `test:filter-language` greps that file's RAW TEXT and a comment
  counts as code to it.

---

## §5 · Decisions taken, with the reasoning, so they are not re-litigated

- **Levies are READ, never computed.** No formula reproduces the booked figure: each settlement
  rounds its own levy, `HOUSE:COMMISSION` is net of them, and `WITHDRAWAL_FEE` sits in the same
  account carrying none. A failed ledger read OMITS the levy lines — never prints 0.
- **`buildDailyOps` was NOT a regulator filing** (`classification: "Internal"`, no signature
  block); the statutory pack `gbt-monthly` computes no levy at all, and no pack has ever been
  prepared/approved/submitted. That is why changing it was safe.
- **`"today"` was NOT unified onto the EAT day** — it was deleted from `analytics.Period`. Every
  caller was already labelled "24h" honestly, so re-pointing it would have falsified six correct
  captions AND collapsed `moneyFlowSeries`' buckets below an hour at every instant of every day.
  `src/lib/query/windows.ts` already rules: do not regularise a rolling window into a calendar one.
- **AML_REVIEW is excluded from "active players"** — `WITHDRAWAL_AML_HOLD` has been off since
  2026-09-13, so what sits there is deposits owed back to self-excluded players.
- **House-bot volume stays INSIDE** GGR/NGR/stakes/active/Top-10 (owner rulings D20/D21b).
