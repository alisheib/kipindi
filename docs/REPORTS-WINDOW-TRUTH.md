# Reports window truth — ✅ DONE, LIVE ON MAIN

> **STATUS: CLOSED 2026-09-28.** Merged to `main` and deployed; production verified serving the
> exact commit SHA (read off `?dpl=` on a live asset, not assumed). Everything below is the record.
> The one item deliberately left open is named under **Owner items**.


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

### ✅ Commit 4 — the stale removed, and the last divergence closed

**Stale removed (it was dead code, not documentation).**

- `date-range.ts` carried its own `RANGE_PRESETS` + `RangePresetId` — a **second preset
  vocabulary with ZERO readers** (only its own two lines and a doc-comment pointing at itself),
  missing `28d`, `qtd` and `all`, three ids the resolver genuinely resolves and which live callers
  genuinely pass as defaults. It contradicted `lib/query/windows.ts`, which was created in
  September expressly to be the ONE home of these ids. **Deleted.**
- `windows.ts` now also owns `RESOLVABLE_PRESETS` — the closed set the resolver understands — with
  `FULL_PRESETS`/`PLAYER_PRESETS` proven at compile time to be subsets of it, and `resolveRange`'s
  `defaultPreset` typed against it so an unresolvable default is a **compile error**. A module-load
  check throws if the vocabulary and the resolver's arms ever disagree.
- 🔴 **The `default:` arm self-recursed.** `default: return resolveRange({ range: defaultPreset },
  now, defaultPreset)` re-enters `default` for any id the switch does not handle and recurses until
  the stack dies — a crash, not a window. Latent only because all thirteen call sites happened to
  pass a valid id. The arms are a pure non-recursive lookup now.
- 🔴 **A repeated query param was a crash.** Seven pages hand raw Next `searchParams` straight in;
  `?from=a&from=b` arrives as `string[]` and `parseEatLocal` called `.trim()` on it, taking out the
  whole server component from a URL anyone can type. The resolver normalises to the first value.
- `test:date-range` **23 → 30**: `qtd` and `28d` were only ever in a "sane and capped" sanity sweep
  that a UTC-quarter `qtd` would have satisfied; both are now pinned to exact EAT instants with a
  discriminating control, plus vocabulary↔resolver agreement and the two crash cases.

**The last divergence closed.** The route now honours `?period=YYYY-MM` for entries whose declared
coverage kind is `calendar-month` — read off the registry, not a second list of ids. Malformed and
unfinished months are **refused with 400**, never coerced. The pack card links its own period, so
the Download beside a card's `periodLabel` and sha256 can no longer serve a different month.
⚠️ It still re-renders rather than re-serving the hashed bytes (a fresh `generatedAt` alone means
the sha256 differs); that is stated in the tooltip and the remaining half is below.

**Guard grew 34 → 39** with a §4b: an explicit period must move BOTH the bounds read from SQL and
the period printed; and no entry may be both `windowed` and `calendar-month`, because the route
passes `win ?? packPeriod` into one argument. Red proof **8/8**.

⚠️ **The disjointness red case caught the wrong assertion first.** Flipping `finance-window`'s kind
to `calendar-month` **emptied** the windowed population, so disjointness passed trivially and the
vacuity control fired instead. A plant that removes a population is not a plant on the property —
it has to produce the exact overlap the assertion looks for. It now sets the `windowed` flag on a
calendar-month entry. (Also why the assertion compares the FLAG against the KIND: two different
mechanisms that can genuinely disagree. Kind-vs-kind would be vacuous — one field cannot hold two
values, so it could never fail.)

⚠️ **`networkidle` is the wrong wait for this app, and it hid behind a warm cache.** The drive
threw `TimeoutError` before a single assertion on a cold dev server: a 15s payment poll, a 60s
lifecycle ticker and SSE heartbeats mean the network never goes idle. It "worked" the first time
only because a warm `.next` answered before the pollers started. Every wait in the drive is now on
the element the assertion is about.

Verified this round: `typecheck` clean · **`npm run build` exit 0** · smoke **23/23** · artifacts
**ALL 9 + the pack period honoured** (`?period=2026-06` produced a June document; malformed → 400;
unfinished month → 400; a non-monthly report ignores it) · drive **CLEAN** on a cold server ·
date-range **30** · report-window-truth **39** + red **8/8** · report-parity **50** ·
report-window-reads **41** · finance-window **20** · report-cells **23** · report-note-truth **11** ·
report-formats **8** · money-invariants **88** · filter-language green · i18n en=sw=zh=**2540**.

### ✅ Close-out — final verification, 2026-09-28

Run on the clean merged tree that is now live. **Every suite run three times with identical
results** (the "run the same check 3×" rule — a single green run has lied on this repo before):

```
                            run 1        run 2        run 3
test:date-range             30 / 0       30 / 0       30 / 0
test:report-window-truth    39 / 0       39 / 0       39 / 0
test:report-parity          50 / 0       50 / 0       50 / 0
test:report-window-reads    41 / 0       41 / 0       41 / 0
test:finance-window         20 / 0       20 / 0       20 / 0
test:report-cells           23 / 0       23 / 0       23 / 0
test:report-note-truth      11 / 0       11 / 0       11 / 0
test:report-formats          8 / 0        8 / 0        8 / 0
test:money-invariants       88 / 0       88 / 0       88 / 0
red:report-window-truth     8/8 caught   8/8 caught   8/8 caught
```

Also green: `test:filter-language` (257 assertions) · `test:i18n` en=sw=zh=2540 · `test:docs` ·
`test:tracker-hygiene` 14/0 · `typecheck` exit 0 · **`npm run build` exit 0**.

Live, against a server built from this exact tree: `report-renderers-smoke` **23/23** ·
`qa:reports-window-artifacts` **ALL 9 REPORTS STATE A PERIOD · THE PACK PERIOD IS HONOURED** ·
`qa:reports-window-drive` **DRIVE CLEAN**.

Code cleanliness: no unused imports across the changed files (one genuinely dead one found and
removed — `verifyChain` in `catalogue.ts`, which uses `verifyChainFull`; `verifyChain` itself stays
live in four other modules), no `TODO`/`FIXME`/`console.log`/`debugger` left behind, working tree
clean, build artifacts removed, no stray dev servers.

Production after the push: health `ok`, uptime reset (new process), database reachable + migrated,
`/admin/reports` 307 and the report API 401 for anonymous — the gate is intact.

### ✅ Commit 6 — the month in progress, offered honestly

Ali asked for a current-month option on the monthly report, with the click telling the officer how
much of the month is still to run. The risk IS the feature: a month-to-date total under a bare
"September 2026" heading reads exactly like September's statutory return.

**One place decides.** `monthCompleteness(period, now)` answers "has this month ended, and how much
is left"; `calendarMonth()` renders every form from it, so the card, the dialog and the printed
document cannot disagree about the days remaining.

**The window is clamped to `now` while partial.** Reading to the month's nominal end would read the
FUTURE and return a complete-month total quietly missing its last days — on the page,
indistinguishable from a finished month with poor trade. Clamping is a no-op for a finished month,
so one expression is right for both.

**Four things change together on a partial run**, because any one left in filing dress is enough to
get an unfinished month signed: the **title** says `PARTIAL (month in progress)`; the **period** says
`PARTIAL, THE MONTH HAS NOT FINISHED … 3 days still to run · NOT a statutory filing`; the
**classification** drops to `Internal`; and the **attestation block is omitted** — its absence is the
strongest statement on the page. A note names the days remaining and says it must not be submitted.

**The route** allows the running month and refuses only a month that has not **begun** (an empty
document titled with next month is a fabricated zero). **The dialog** states the days remaining
before anything is built, names the format pressed, and Cancel generates nothing.

Two faults found by **reading the rendered PDF**, not by any suite — both now asserted by §4c:

- two section descriptions still said *"TZS totals for the **statutory calendar month**"* on a
  document covering part of one;
- the Source note said *"aggregated for the named EAT calendar month"*; it now points at "the period
  stated above", true on both runs.

⚠️ `tone="warning"` is the semantic choice and matches every other admin confirm — but
`ConfirmModal`'s `TONE_BTN` maps `warning` and `claret` to the **same** `btn-claret`, so the
three-tone type paints only two. Not repaired here: a real warning variant is a new token in a FROZEN
design system and would restyle a dozen dialogs at once.

⚠️ The visual took three passes and each fault was real: the month and days-remaining were stated
**twice** (chip line + Covers line); then the caption, sharing a row with the buttons, wrapped onto a
third line inside the two-column grid and made the subordinate row **taller** than the primary one.
It now mirrors the primary row — full-width caption, buttons right-aligned beneath.

Verified: `typecheck` 0 · `next build` 0 (twice; one `npm run build` exit 1 was a wrapper artifact —
`npx next build` and a re-run both 0) · every suite **3× identical**: date-range 30,
report-window-truth **50**, report-parity 50, report-window-reads 41, finance-window 20,
report-cells 23, note-truth 11, formats 8, money-invariants 88, red **10/10** · smoke 23/23 ·
artifacts ALL 9 + the running month allowed/PARTIAL/Internal and a not-begun month refused 400 ·
drive CLEAN including the new row, the dialog and Cancel · partial PDF rasterised and read — page 2
confirms **no attestation block**.

## Owner items (→ Ali)

1. **Storing the prepared pack artifact**, so the pack card's Download re-serves the hashed bytes
   instead of re-rendering. The MONTH half is closed — the link can no longer hand over a different
   month than the label beside it — but a fresh `generatedAt` still means the downloaded file's
   sha256 differs from the stored one. The tooltip says so.
2. **`test:report-parity` and `test:report-window-reads` are not in `predeploy`.**
   `test:report-window-truth` and its red proof now are.

### Notes kept for whoever picks this up

- The EAT stamps are proven in the suite at a pinned instant (2026-09-28T21:30Z, where the EAT day
  and the UTC day differ). A live generation between 21:00 and 24:00 EAT would confirm filename +
  reference + period agree on one day end-to-end in production.
- Merge decision for `reports-window-truth` → `main`.

## Flagged, deliberately not changed

- Statutory periods stay fixed; `?range=all` stays unclamped (both recorded rulings).
- **`Transaction.createdAt` is plain `DateTime`** (Postgres `timestamp` *without* zone) while 39
  other columns use `@db.Timestamptz(3)` (`schema.prisma:666`). Safe today — every read/write goes
  through Prisma with JS `Date`s and no raw SQL does date math on it — but any future
  `now()`/`current_date`/`AT TIME ZONE` on that column reads the DB session zone. Needs a migration;
  raise separately.
- ⛔ **`docs/REPORTS-CHECK-2026-09.md` IS DELIBERATELY UNTRACKED — DO NOT DELETE IT.**
  `docs/PLAYER-QUERY-CAMPAIGN.md:1272` states that decision in as many words, and three separate
  session close-outs in `LIVE-QA-CAMPAIGN.md` record leaving it (and `Ocean Logo/`) untouched
  because they belong to another session. It was considered for deletion in the 2026-09-28 stale
  sweep and **deliberately kept** on finding that rule.
  ⚠️ **Two of its filed defects are already fixed on `main`, so do not act on it without
  re-verifying.** REP-01 (the GGR matcher parsing 0): `reports-verify-live.mts` now matches
  `/^GGR\b|gross gaming/i` **and** carries a "the GGR label was actually FOUND" control. REP-02
  (the console caption omitting `− Refunds`): the page prints
  `GGR = Stakes − Payouts − Refunds`. Its §2 technical-architecture drift register is a separate
  subject whose figures are themselves now weeks old — re-derive, never quote.
