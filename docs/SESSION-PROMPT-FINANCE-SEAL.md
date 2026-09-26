# SESSION PROMPT — the Finance tab seal

> **Written to be picked up on ANOTHER MACHINE.** Everything a next session needs is in this
> file and in git; nothing here depends on the local memory of the machine that wrote it.
> Branch `finance-seal` (§1), merged to `main` and deployed live on 2026-09-25; follow-up branch
> `finance-seal-2` (the §2 strikes below) pushed to `main` step by step the same night, each step
> verified on production.

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
  margin" row — rounded half AWAY from zero, as Excel does, so a losing day's −28.75% agrees too.
  `test:report-cells` 23/0 (per-report tile counts pinned, a declared text-tile allowlist, exact
  number formats, the tie case on both signs, a negative and a NaN tile, and every report through
  `renderPdf` — nothing in `test:all` rendered a PDF before), RED **11/11**.
  **And on production** (`6427ef64`): the real "This view → Excel" download from 50pick.tz, opened
  in Excel over COM — six `Double` cells, `COUNT()` 6, `SUM()` working, "8 txns" in C. The count deltas
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
- ~~**`reports-verify-live.mts` and `report-renderers-smoke.mjs` are NOT npm-wired**~~ ✅ **WIRED
  2026-09-25**, neither as `test:*` (`test:all` runs every `test:*`, so it would then need a server
  or production credentials):
  - **`npm run verify:reports-live`** — every catalogue report built READ-ONLY against production.
    Run `railway run --service Postgres npm run verify:reports-live` from a Railway-linked,
    DEPLOYED checkout: Railway injects `DATABASE_PUBLIC_URL`, so the password never reaches a
    command line (the old `DATABASE_URL=<url> npx tsx …` usage is how it reached a transcript).
    It REFUSES with no `--prod`/URL (it used to print "all checks passed" about an EMPTY in-memory
    store), on an internal host, with uncommitted `src/`, or when HEAD is not deployed —
    `getGlobalConfig()`'s first hydration re-persists the config when the code's `CONFIG_VERSION`
    is ahead of production's, the one write any builder can make. Its checks were vacuous in four
    places and are now real: the totals-vs-rows block ran `check(…, true)`; the daily-ops levy
    check was circular (net vs the builder's own three figures — it passed on the computed-levy
    code too) and now compares the TRA/GBT tiles with an INDEPENDENT ledger read, before and after
    the build; chain integrity was never asserted (now asserted, or SKIPPED and said so without
    `AUDIT_CHAIN_SECRET`, never counted as a pass); only "(TZS)" tiles were checked for numbers.
  - **`npm run qa:report-renderers`** — the download smoke through the real route. Needs
    `rm -rf .next && DISABLE_ADMIN_TOTP=true npx next dev -p <port>` with NO DATABASE_URL; refuses
    any host but localhost (it seeds an ADMIN and bets); its seed is now CHECKED (a refused seed
    left an empty store and every download still passed); no browser binary, API context only.
- ✅ **STALE-TEXT SWEEP, 2026-09-25** (an adversarial review lane over docs + comments + on-screen
  copy, every change re-read against the code). The ones a reader actually saw:
  - the **Daily Operations document** called GGR "the operator's commission" two notes above its
    own levy note saying it is not;
  - **/admin/reports** printed `GGR = Stakes − Payouts · NGR = GGR − Bonus − Fees` (both missing a
    term), a **"Generation pipeline (production)" card** promising HMAC envelopes, SFTP/mTLS upload,
    on-call alerts and IP/reason logging that do not exist (deleted, with its skeleton), a Monthly
    card describing a "12-sheet workbook … Signed JSON" the builder never made, and an empty-state
    promising "a signed receipt the regulator can verify";
  - the **NGR tiles** on /admin/finance and /admin said "net of bonus + fees" — NGR also nets agent
    commission; the House-accounts panel now says `HOUSE:COMMISSION` is already net of the levies.
  - Docs presenting the false "report == ledger" as current truth corrected with dated notes (never
    rewritten history): `CLAUDE.md` tax section, `FEE-MODEL-DECISION` §3, `F6-LIQUIDITY` §6,
    `MONEY-GATE-REMEDIATION` (two §3.3 leads, the §7.16 LEAD-F.3 row, and LEAD-F.3's guard claim —
    it named two guards and neither guards it), `SESSION-PROMPT-HOUSE-LEDGER` glossary, `NEXT-PLAN`,
    `perfection-plan`, `feature-backlog`, `FLOWS` (a "placeholder formula" row), `MODULE-CERTIFICATION`
    K5/K7. `scripts/reports-retest.mjs` — a July orphan that could not pass on today's page — deleted.
  - ⚠️ Left for its owner: `plans/house-bots/01-scenario-register.md` CRA-30 still expects levies =
    rate × GGR (house-bots lane; told).
- ✅ **VERIFIED ON PRODUCTION, 2026-09-25 (`754a7fe3`).** `verify:reports-live` against the live
  database: every check passed across all nine reports, one honest SKIP (chain integrity —
  `AUDIT_CHAIN_SECRET` is an app variable, absent under `railway run --service Postgres`, and the
  tile then reads UNVERIFIED, which is not evidence). /admin/reports: the "Generation pipeline"
  card is gone, the GGR/NGR definitions name refunds and agent commission; /admin and
  /admin/finance at 360/1280: no NaN, no sideways scroll.
  - 🔴 **AND THE SCREENSHOT CAUGHT WHAT THE CHECKS COULD NOT: the NGR SPARKLINE HAD VANISHED.**
    `AdminKpi` put the spark (`flex-1`, no floor) and the caption chip on one row, so the truthful —
    longer — NGR caption took the whole row and shrank the trend line to ZERO width: no clip, no
    overflow, invisible to every scan. The component now gives the spark a 64px floor and lets the
    row WRAP (a caption that does not fit drops below the spark). `test:admin-clip` 1.5/1.6, each
    proven red. ⚠️ The probe that was meant to measure it returned `null` — it never found the
    tile — and only the photograph showed the defect.
  - `test:ui-consistency` was RED on main since `24dca6aa`: `finance/loading.tsx` sized six
    skeleton chips `w-12`, which on this repo's OVERRIDDEN spacing scale is 128px, not 48px. Now
    `w-[48px]`; the new spark floor is a literal for the same reason.
  - ⚠️ Two Railway builds (`c928b870`, `6d7561ce`) FAILED on a Google-Fonts fetch for Inter
    (`next/font/google … Can't resolve '@vercel/turbopack-next/internal/font/google/font'`); the
    next build of the same code passed. §4's "a transient build failure is not a defect" held —
    but read the deployment list after every push: a failed build leaves production on the OLD
    commit with nothing on the site to say so.
- ✅ **RULED BY ALI 2026-09-26 — "Net after tax" RELABELLED "GGR less levies booked"** on the Daily
  Operations report (tile, table row, note, and the `verify:reports-live` lookup). It is
  `GGR − booked TRA − booked GBT`: a tax on the settlement FEE subtracted from a TURNOVER figure,
  so it was never profit after tax. Relabel only — the arithmetic is unchanged, not re-based.
  ✅ Ali also confirmed the name `verify:reports-live` for the production-reading script.
- ⚠️ **Rotate the production DB password.** It was echoed into a session transcript on 2026-09-25.

---

## §3 · The instruments this pass added — and what each one PROVES

Every one has a red control; a guard without one is a claim on trust.

| Command | What it holds | Proven by |
|---|---|---|
| `npm run test:finance-window` | legend == bars, EAT labels, day-aligned series, bucket grain, active-player basis | §5's controls: a FAILED-only player moves the count by 0, a CONFIRMED one by exactly 1, and the all-status count really is higher |
| `npm run test:report-cells` | renders the real documents and reads CELLS back with ExcelJS; §5 — every "At a glance" figure is a formatted NUMBER cell with its delta beside it, the money tiles SUM to the builder's figures, and a ten-figure sum is never `#####` | reverting the fixes reproduces the documented symptoms: an EMPTY totals cell, and "width 10 vs 27 chars"; §5 caught 11/11 mutations (2026-09-25) |
| `npm run verify:reports-live` | PRODUCTION, read-only: every report builds; totals equal their rows (or a cap sentence says so); every non-text tile is a number; the daily-ops TRA/GBT tiles equal an INDEPENDENT ledger read | the refusals (no `--prod`, no URL, internal host, undeployed HEAD) each exit 2; run from `railway run --service Postgres` |
| `npm run qa:report-renderers` | every report × PDF/XLSX through the real route, the seed checked, the 400/404/anonymous refusals | needs `DISABLE_ADMIN_TOTP=true next dev`, no DATABASE_URL, localhost only |
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
