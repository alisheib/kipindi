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

- **`LEAD-A.2`** (`docs/MONEY-GATE-REMEDIATION.md`): the `market.resolved` audit payload records a
  levy figure the ledger never booked — **the third site of the levy defect**, untouched here.
  Same fix shape: read the ledger, do not recompute.
- **`buildDailyOps` walks the WHOLE `Transaction` table** (`db.txn.listAll()`), which threw once
  against production during verification and passed on retry. It is the exact pattern
  `report-parity` exists because of. Latent scale risk; not a correctness bug.
- **The XLSX headline "At a glance" block writes money as fused strings** (`"158,000   (11 txns)"`)
  — unsummable in Excel. Needs `SummaryItem` widened to carry a raw number + format.
- **`REPORT_PERIODS` and the `"today"`/`"mtd"` arms of `report-money.periodBounds` have NO
  readers** — dead vocabulary, safe to delete in a tidy-up.
- **`reports-verify-live.mts` and `report-renderers-smoke.mjs` are NOT npm-wired**, so they never
  run in `test:all`. They are the only instruments that read real money and the real route.
- ⚠️ **Rotate the production DB password.** It was echoed into a session transcript on 2026-09-25.

---

## §3 · The instruments this pass added — and what each one PROVES

Every one has a red control; a guard without one is a claim on trust.

| Command | What it holds | Proven by |
|---|---|---|
| `npm run test:finance-window` | legend == bars, EAT labels, day-aligned series, bucket grain, active-player basis | §5's controls: a FAILED-only player moves the count by 0, a CONFIRMED one by exactly 1, and the all-status count really is higher |
| `npm run test:report-cells` | renders the real documents and reads CELLS back with ExcelJS | reverting the fixes reproduces the documented symptoms: an EMPTY totals cell, and "width 10 vs 27 chars" |
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
