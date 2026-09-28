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

### ▶ Next

1. Drive the page + **read every rendered artifact** (rasterise the PDFs, read XLSX back with
   exceljs). ⚠️ Chromium treats `#page=N` on an open PDF as a same-document nav and stays on page 1
   — go `about:blank` between loads and check the toolbar page number in the shot. ⚠️ `rm -rf .next`
   first: a stale production `.next` makes `next dev` 404 every route.
2. Confirm the head button's group label, each card's **Covers …** line, that the window survives a
   tab switch and a pagination click, and that a pasted ISO instant in `?from` shows the warning.
3. The EAT stamps are proven in the suite at a pinned instant; a live generation between 21:00 and
   24:00 EAT would confirm filename + reference + period agree on one day end-to-end.

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
