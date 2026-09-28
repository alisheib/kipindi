# Reports window truth — running state

> **Branch `reports-window-truth`, off `origin/main` @ `d3379fef`.** Worktree `F:\kipindi-reports`.
> Commissioned 2026-09-28 after users reported that `/admin/reports` "gets the date ranges for
> reports wrong." This file is the resume point: any machine can pick the work up from the branch
> alone. ⛔ Do not work this in `F:\kipindi-main` — it is on `landing-v3-resume` with another
> session's uncommitted edits.

## The validated diagnosis

**The date-range arithmetic is correct.** `resolveRange` is EAT-safe on every preset
(`startOfEatDay`/`startOfEatMonth`, offset-shift then `getUTC*`, never a local getter), `?from`/`?to`
parse as EAT wall-clock with a rollover round-trip guard, bounds are half-open `[start, end)`
consistently from `within()` through `listInRange`'s `gte`/`lt`, and the download filename was
already moved off UTC to EAT (`brand.ts:93-103`).

**The defect is that the window was invisible, and one control lied by adjacency.** Only **1 of 9**
catalogue entries follows the page's date rail (`finance-window`); the other eight compute their own
statutory or point-in-time period. That is a deliberate, correct ruling. But:

1. The Excel/PDF pair in the page head is `gbt-monthly` — fixed to the previous complete calendar
   month — drawn ~40px from the rail, with no window in its query and the generic tooltip "Download
   as Excel (.xlsx)". Set the rail to "Today", press Excel, receive **last month**.
2. `meta.period` was computed by all nine builders and rendered by **neither** renderer. So
   `fiu-sar`, `sx-register`, `kyc-reverify` and `rg-engagement` reached a regulator with **no stated
   coverage window at all**, and `fiu-sar`'s notes said "within the period above" pointing at nothing.
3. The library cards advertised filing **cadence** where an officer reads **coverage**: "Quarterly"
   on a cumulative-to-date document, "Weekly" on a point-in-time register, "Daily SFTP" on a
   genesis→oldest-25k export.
4. Two window stamps were still UTC — `makeReference` (the reference printed on every page and
   stored in the audit row) and `kyc-reverify`/`rg-engagement`'s `meta.period`. For the last three
   hours of every EAT day, including every month end, they named **yesterday**.
5. The window was silently dropped by the tab links and by log pagination.
6. `range.unreadable` was never read here, though `/admin/finance` renders it — a pasted ISO instant
   in `?from` became `now−24h → now` still labelled "custom".

### How each report's range is computed (the answer to the original question)

| Report | Window | Follows the rail? |
|---|---|---|
| `finance-window` | `win ?? {now−7d, now}` | **yes** |
| `daily-ops` | current EAT day, `startOfEatDay(now)` → `+24h` | no |
| `gbt-monthly` | previous complete EAT calendar month | no — statutory, by ruling |
| `fiu-sar` | previous complete calendar month | no |
| `sx-register` | point-in-time, as-of `now` | no |
| `iso-audit` | genesis → oldest 25,000 entries, no date filter | no |
| `kyc-reverify` | all-time approved roster, due dates from `now` | no |
| `rg-engagement` | point-in-time + newest 200 events, no date filter | no |
| `match-integrity` | cumulative to date, three unwindowed reads | no |

## Decisions (Ali, 2026-09-28)

- **No builder's window moves.** Statutory periods are correct and stay. The fix is to make every
  window *stated*.
- The head button stays `gbt-monthly` but **names the month it produces**.
- New worktree + own branch; push after every commit.
- Verification = local drive + **read the rendered artifacts**, not just green suites.

## Progress

### ✅ Commit 1 — every report declares and prints its coverage

- **NEW `src/lib/server/reports/coverage.ts`** — one declared coverage contract per report. Six
  closed kinds (`selected-window`, `eat-day`, `calendar-month`, `as-of`, `since-genesis`,
  `cumulative`), each with `describe(now)` for the UI, `statement(now, detail?)` for the artifact
  face, and `bounds(now)` **only** for the kinds that have them — a kind with no bounds leaves it
  undefined rather than hand the guard something false to agree with.
- **`catalogue.ts`** — every registry entry declares `coverage`. `as const satisfies Record<string,
  { name; coverage; [k: string]: unknown }>` makes a new entry without one a **compile error**
  (proven: removing `coverage` from `daily-ops` fails `tsc` with TS2741, then restored to green).
  New `reportCoverage(id)` accessor, same discipline as `isWindowedReport`.
- All nine `meta.period` values now come from the declaration — no hand-typed period strings left.
- **`makeReference` UTC → EAT** (`eatDateLabel`), the unfixed sibling of the `reportFilename` fix.
- `kyc-reverify` / `rg-engagement` `meta.period` UTC day → the as-of EAT instant.
- `sx-register`'s undated `"Active register"` → a point-in-time statement with its as-at instant.
- `iso-audit` no longer prints the word **"Lifetime"** — `reports-verify-live.mts` asserts
  `!/lifetime/i` on `meta.period`, and the untruncated branch said exactly that. Unreachable on
  production (log ≫ 25k cap), so the false FAIL was waiting for the first scratch or fixture
  database with fewer entries.
- `fiu-sar` subtitle now leads with its month, so its own "within the period above" notes are true.
- **`pdf.ts`** — the meta row now **measures and wraps** instead of running off the page (it drew
  every pair with `lineBreak: false` at an accumulated `mx`), and `Period` prints on its own
  full-width wrapped line. Its own line deliberately: a point-in-time statement passes 120
  characters, and an ellipsized window is worse than none (REP-05b is the same defect one tile over).
- **`xlsx.ts`** — `Period:` leads the merged A7 meta cell.

Verified: `typecheck` clean · `test:report-parity` 50 · `test:report-cells` 23 ·
`test:report-note-truth` 11 · `test:report-formats` 8 · `test:report-window-reads` 41 ·
`test:finance-window` 20 · `test:date-range` 23 — all 0 failed.

### ✅ Commit 2 — the page stops lying, and a guard makes it stay fixed

- **`page.tsx`** — the head button now carries a group label reading `Monthly pack · August 2026`
  plus a tooltip naming the full coverage and saying it does **not** follow the rail. ⛔ The button
  text stays "Excel"/"PDF": `generate-button.tsx` carries a dated ruling that the format belongs on
  the button and *which document* on the group label the caller renders beside the pair. That ruling
  is why `Coverage` gained `short()` rather than the page gaining a label prop.
- Each library card now prints a **Covers …** line from `reportCoverage(id).describe()`, and the
  cadence chip reads **"Filed weekly"** so it can no longer be mistaken for a window.
- `withWindow()` carries `range`/`from`/`to`/`cmp` through **both tab links**, and `buildBaseHref`
  now carries them plus `tab` through the generation-log pagination.
- The `range.unreadable` warning from `/admin/finance` is rendered here too, extended to say the
  substituted window also reaches any windowed report generated from it.
- `report-pack-card.tsx` — the Download link beside the artifact's sha256 now states that it
  **re-renders** and so cannot byte-match that hash (see the owner item below).
- **NEW `scripts/report-window-truth.test.mts`** — `test:report-window-truth` **34 passed, 0 failed**
  and `red:report-window-truth` **6/6 caught**, both run 3× with identical results. Registered in
  `predeploy`. Six sections: every entry declares a contract (and each kind describes itself in
  exactly one way, no two kinds sharing a phrase) · bounded kinds are EAT-aligned and half-open ·
  unbounded kinds declare **no** bounds · **the bounds the builder handed to SQL == the bounds its
  declaration claims == the EAT dates the document prints** · both renderers carry the period · every
  stamp is the EAT day.

Two things the suite taught while being written, both recorded in its comments:

- The PDF assertion first read *"grew by more than 500 bytes"* and **failed on correct code**: 2,441
  characters of repetitive padding compressed to +443 bytes, so the threshold was measuring zlib.
  The control then showed the real property — `renderPdf` is **byte-deterministic** for identical
  input (42,936 vs 42,936 exactly) — so the assertion is now "the bytes differ at all", with no
  tolerance to blind it.
- Red case 6 first "caught" its defect by pinning the clock to an hour where the EAT day and the UTC
  day coincide. That is not a red control — it proves only that the assertion is unsatisfiable when
  the two days are the same string. Its own vacuity control went red to say so. It now plants the
  **actual pre-fix line** (`toISOString().slice(0,10)`) at an instant where the two days differ.

**REP-01 from the 2026-09-02 audit is already fixed on main** — the matcher is `/^GGR\b|gross
gaming/i` and a "the GGR label was actually FOUND" control sits beside it. Another reason to
re-verify that doc rather than cite it.

⚠️ Noticed while registering: **`test:report-parity` and `test:report-window-reads` are not in
`predeploy`** at all. Out of scope here; worth a decision.

### ✅ Commit 3 — driven and READ, not just green

Reproduce with: `rm -rf .next` → `DISABLE_ADMIN_TOTP=true npx next dev -p 3010` → then
`BASE=http://localhost:3010 npm run qa:reports-window-drive <shotDir>` and
`BASE=http://localhost:3010 npm run qa:reports-window-artifacts <outDir>`.
⚠️ A stale production `.next` makes `next dev` 404 every route — clear it first.

| Step | Instrument | Result |
|---|---|---|
| Production path | `BASE=… node scripts/report-renderers-smoke.mjs` (regulator-grade seed: 20 markets, 12 users, 150 bets) | **23/23 PASS** — all 9 × pdf+xlsx through the real route |
| **What the documents SAY** | `qa:reports-window-artifacts` — downloads all 9 × both formats, reads XLSX `A7` back with exceljs | **ALL 9 REPORTS STATE A PERIOD** (they stated four fewer before this branch) |
| **What the page says** | `qa:reports-window-drive` — 8 assertions | **DRIVE CLEAN** |
| **LOOK at the PDF** | `scripts/rasterise-pdf.mjs`, every frame read by eye | kyc-reverify (longest period, portrait) and gbt-monthly pp.1–2 |

What the artifacts print, read off the real files:

```
daily-ops        2026-09-28 · 00:00–24:00 EAT
gbt-monthly      August 2026 · 2026-08-01 → 2026-08-31 (EAT)
fiu-sar          August 2026 · 2026-08-01 → 2026-08-31 (EAT)
sx-register      Point-in-time as at 2026-09-28 16:23 EAT — not a period total · active …
iso-audit        Since genesis, oldest first (no date filter) · all 208 entries
kyc-reverify     Point-in-time as at 2026-09-28 16:23 EAT — not a period total · all-time …
rg-engagement    Point-in-time as at 2026-09-28 16:23 EAT — not a period total · newest 200 …
match-integrity  Cumulative to 2026-09-28 (EAT) — not one filing period · filed quarterly …
finance-window   1 Sep 08:15 → 4 Sep 17:45 · 2026-09-01T08:15 → 2026-09-04T17:45 EAT
```

⭐ The `finance-window` row is the end-to-end proof: the drive asked the route for
`range=custom&from=2026-09-01T08:15&to=2026-09-04T17:45`, and the workbook prints exactly that
window to the minute.

**Read off the rendered PDF** (not inferred): the meta row **wraps** — `Generated · By · Reference`
on line one, `Classification` on line two — and `Period` sits on its own full-width line below the
divider, unellipsized, even for kyc-reverify's 122-character point-in-time statement on **portrait**.
gbt-monthly's attestation panel is uncollided and the notes render intact.

**Read off the page**: the rail on "Leo" (Today) with `Monthly pack · August 2026` beside the
Excel/PDF pair — the exact confusion users reported is now impossible to walk into; all 9 cards show
a `Covers …` line across 6 distinct phrases; the cadence chip reads `Filed Quarterly` beside
`Covers Cumulative to date — not one filing period`; `?tab=library` keeps `range=today`; and a pasted
ISO instant in `?from` raises the substitution warning.

⚠️ **An instrument lied first, and it was mine.** The drive initially reported "0 of 9 cards print a
Covers line" and a lost tab. Both were false: `waitForLoadState("networkidle")` resolves *before* a
client-side `Link` rewrites the URL, so the assertion read the old address and convicted a working
page. The committed script waits for the URL instead. Same class as the notes already in memory
about soft navigation — a red result is a claim about the instrument until the instrument is checked.

### ▶ Next

- The EAT stamps are proven in the suite at a pinned instant (2026-09-28T21:30Z, where the EAT day
  and the UTC day differ). A live generation between 21:00 and 24:00 EAT would confirm filename +
  reference + period agree on one day end-to-end in production.
- Merge decision for `reports-window-truth` → `main`.

## Owner items (→ Ali)

- **The pack card's Download link re-renders rather than re-serves.** `/api/admin/reports/gbt-monthly`
  builds a fresh `buildGbtMonthly(userId, currentPackPeriod())` on every hit, so the bytes the
  officer receives cannot match the sha256 displayed beside the link — and once the EAT month rolls
  over, `currentPackPeriod()` moves and the link serves a **different month** than the
  `pack.periodLabel` printed above it. The link now says so. The real repair is for the route to
  accept the pack's `?period=` and for prepare to STORE the artifact; both `buildGbtMonthly` and
  `buildFiuSar` already take a pack period and no caller passes one. Not taken here — it is the
  month-selector work that was explicitly deferred.
- **`test:report-parity` and `test:report-window-reads` are absent from `predeploy`.**

## Flagged, deliberately not changed

- Statutory periods stay fixed; `?range=all` stays unclamped (both recorded rulings).
- **`Transaction.createdAt` is plain `DateTime`** (Postgres `timestamp` *without* zone) while 39
  other columns use `@db.Timestamptz(3)` (`schema.prisma:666`). Safe today — every read/write goes
  through Prisma with JS `Date`s and no raw SQL does date math on it — but any future
  `now()`/`current_date`/`AT TIME ZONE` on that column reads the DB session zone. Needs a migration;
  raise separately.
- `date-range.ts` latent items: unguarded self-recursion on an unknown `defaultPreset` (`:178`),
  `s.trim()` on a param Next can deliver as `string[]` (`:81`), and `RANGE_PRESETS` / `RangePresetId`
  having **zero readers** while `datetime-range-filter.tsx:112-117` keeps a second, fuller list.
- `docs/REPORTS-CHECK-2026-09.md` (untracked in `F:\kipindi-main`) is a prior session's audit and is
  **stale in at least one place**: its REP-02, the console caption omitting `− Refunds`, is fixed —
  the page prints `GGR = Stakes − Payouts − Refunds`. Re-verify before citing it.
