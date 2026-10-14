# S13 — the measures panel and reporting: build plan (drafted 2026-10-14)

> The working plan for VODACOM-PLAN S13, "Measures panel and reporting: the panel, CSV/PDF export, the definitions table
> and the agency cadence" (`docs/VODACOM-PLAN.md`:5009; the board row :3883; the specification §3.10 :4795-4823; the
> baseline S3b, §0f :3620-3697). Drafted read-only on 2026-10-14 by one planner on OMEGA-COMPILE01 (worktree
> `C:\50pick-ssd\kipindi-s13`, branch `codex/vodacom-s13-plan`), who read every file cited below. No file in the
> repository but this one was written. The only things run were existing in-process suites on the memory store, at the
> base: `test:journey-funnel` (all pass), `red:journey-funnel` (26/26 caught), `test:funnel-share` (22/0),
> `test:report-formats` (8/0) and `test:house-bot-surfaces` (74/0). Status lives in `docs/VODACOM-PLAN.md` §0 (a new S13
> section, opened by WP0); this file is the how. Its Open points are decisions taken under Ali's delegation, each with
> the overrule he may choose; WP0 files them as numbered §0h points after the last one.
>
> **Base.** Line numbers are at `f830a091c` (live main, 2026-10-14). S9's preparation is read from
> `origin/codex/vodacom-s9` at `9869dd701` and cited with the branch named; none of it is on main. S8 (in progress),
> S9, S10, S11 and S12 still edit files cited here (`bet-sheet-host.tsx`, `markets/actions.ts`, `wallet-service.ts`, the
> deposit page and action, `prisma-dal.ts`, `store.ts`), so WP0 re-reads every number at S13's real base before any
> package starts (S7-PLAN A24's method).

## Amendments — WP0's re-read at `c14cb403e` (2026-10-14, the build session; they override the body below)

The build branch is `codex/vodacom-s13-build` (worktree `C:\50pick-ssd\kipindi-s13b`), from `origin/main` `c14cb403e`.
Every citation below was re-read there (about 214 occurrences); what moved or was wrong is listed, and the body's own text is
left as written. Progress, results and the proposed records are in "§ Build record" at the end of this file.

**A1 · Line numbers that moved (the content is unchanged).** `docs/VODACOM-PLAN.md` grew by 3 lines in §0 and 41 in §0k,
and 2 more after line 3562: old lines 28–964 are +3, every line after 3562 is +46. So §5 S13 is :5055 (was :5009), the §1 row
:3929 (:3883), §3.10 :4841–4869 (:4795–4823), §0f :3666–3743 (:3620–3697), the session law :392–423 (:389–420), the
OMEGA-COMPILE01 SSD rule :411–416 (:408–413), "`origin` is persisted on the deposit row and the position" :4859 (:4813), the
definitions table :4851–4857 (:4805–4811), the export line :4865 (:4819), "House-bot rows are excluded per row" :4847
(:4801), S15 "one commit" :5070–5071, §8's harm markers :5228–5229. `docs/COMPLIANCE-DECISIONS.md` gained 60 lines at its
head: D20a is :3024 (:2964), "Keep them in reports as normal players" :3019 (:2959), D20d :3027 (:2967), and "Watched after
launch … next to the 'short balance → deposit' measure" :1540–1541 (:1480–1481) — the old numbers now point at other rulings.
`bet-sheet-host.tsx` gained the A21 warm-up: `open()`'s `sheet_open` is :259–271 (:258–270), the card tap :425 (:424), the
deposit link with `from=low-balance` :394 (:393), the counted low-balance frame :512–517 (:498–503, the send at :515).

**A2 · Correction 26's first bullet is resolved.** §0 now reads "its review fixes ready on `codex/vodacom-s9-fixes`
(`daaffe1b3`, not on main)". Neither that branch nor S9's release candidate is on origin: the candidate is the LOCAL branch
`codex/s9-release` (`402a3d79f`, then `d1753e5e0`), which merges the fixes onto `c14cb403e`. S9's cited lines (S9-PLAN
:234–247 and :345–387; `deposit-state.ts` :16, :19, :34, :200–209) are identical there and on `origin/codex/vodacom-s9`.

**A3 · The harm detector's citation.** `responsible-gambling.ts`:671–693 is the doc header and the start of the marker union.
The detector Player Safety runs is `detectHarmMarkers` (:863–885; the DETECTORS list :734–858), called for every user by
`detectHarmMarkersForAllUsers` (:887–902, not :892–903) from `admin/compliance/page.tsx`:581. It has no `now` parameter
(it reads `Date.now()`), so WP3's snapshot time sets only the day key and the candidate window.

**A4 · Correction 7 overstates `test:report-parity` §4.** It counts only the literal `db.txn.listAll()` in four named files
(:267–274, the regex at :275): it would not catch `db.user.list()` or a Prisma `findMany` with no `where`. WP5 adds its files
there as a belt, and the real proof of "no whole-table walk" is the Postgres child recording every client call (WP5).

**A5 · Classifying a key does not delete it.** `scripts/ops-prelaunch-reset.mts` deletes `SystemConfig` rows with hand-written
SQL in step 8 (:698–703) and checks them in its verify step (:989–990); `CONFIG_DROP_PATTERNS` (:152) only classifies. WP2 and
WP3 add `journey.rollout.observed` and `journey.harm.daily` to all three places. Because the next lifecycle pass writes both
rows again by design, the standalone `--verify` holds them to the reset's start (a new `resetStartedAt` in the receipt), while
the in-transaction check requires them gone.

**A6 · WP2 cannot observe `simpleJourneyStateNow()`.** It never rejects: a failed read of the stored switch (`UNREAD`) answers
WITHDRAWN, so an observer built on it would record a rollback on any transient database error. WP2 reads `journeySwitchNow()`
with `simpleJourneyCeiling()`: a WITHDRAWN ceiling is a real WITHDRAWN (the store is not read); an `UNREAD` stored switch is
"state unreadable" and writes nothing; MALFORMED is recorded, because it is what players are shown. What WP2 calls
`buildStartedAt` is the process start (`processStartedAt`).

**A7 · The compare-and-swap writers throw without a database** (`config-store.ts`:162, :181). WP2 and WP3 keep an inline
memory twin (a `globalThis` row, `simple-journey-switch.ts`'s pattern) and use the two writers only on Postgres.

**A8 · WP3's "a plant that narrows 8 days to 7 fails" cannot fail.** RAPID_DEPOSIT_ESCALATION needs a confirmed deposit in the
last 24 hours and CHASING_LOSSES three in the last 7 days, so a 7-day candidate window loses no flagged account — the eighth day
is margin. A plant that cannot fail proves nothing (`50pick-standards` §5b rule 8): the plants narrow to 24 hours and to 6 days,
and a fixture whose three top-ups are 6.88–6.96 days old makes the 6-day plant lose a flagged account at any hour of the day.

**A9 · WP4 is not built on this branch** (it edits `bet-sheet-host.tsx` and waits for S10's edits there). Two of its facts
change what the definitions may claim, so they are two flags in `measures.ts`, false today and turned true by WP4 in the same
commit as its code: `HOME_OPEN_ONE_PER_VIEW` (until then the words say one home-page view can open several sheets, each
counted) and `BET_COUNTER_SKIPS_AUTOMATION` (until then the notes say the bet counter does not yet skip automated browsers).
For WP4 itself: `isAutomatedAgent` already matches HeadlessChrome and Playwright (case-insensitive) and also refuses an empty
or under-12-character agent, so "or `HeadlessChrome|Playwright`" adds nothing; and `funnelBetFields`' origin type is
`"dial" | "quick" | "sheet"`, which S9 must widen before any bet can be counted `deposit_return`.

**A10 · S9 is not on main, and the S9-dependent figures say so.** Measure 3 after launch, measure 4 after launch and the
reference row's question/round split read `Transaction.pendingBet` and `Position.origin`. Until S9 lands they print a new
status, **unavailable** ("not available in this build yet") — never a counted 0 — through one seam,
`src/lib/server/journey-measures-s9.ts`, whose plug-in is a single file edit that `test:journey-measures` holds to the schema
(it refuses a build whose schema carries S9's columns while the seam is shut, and the reverse). Before launch nothing S9 reads is
shown anyway (measure 3 is "no offer", measure 4 "not recorded"). The 30-minute rule is `DEPOSIT_FOLLOW_UP_MS` in `measures.ts`
until S9 lands; the plug-in makes it S9's `DEPOSIT_RETURN_WINDOW_MS`.

**A11 · Measure 4's match follows S9 on `completedAt`.** `isDepositReturnBet` needs a parseable `completedAt` (a NULL never
matches, `deposit-state.ts`:205–208), so the one-to-one match uses `completedAt` only, while windows place a deposit by
`COALESCE(completedAt, createdAt)`.

**A12 · Rows are read through Prisma's typed API, not raw SQL.** `Position.placedAt` and `Transaction.createdAt/completedAt`
are naive UTC timestamps; the typed API converts them, so the plan's SQL is the meaning, not the text, of the Prisma twin.
A bet is a `Position` row (the plan's definition); S3b's report counted `BET_PLACED` transactions.

**A13 · `src/lib/journey/funnel-measures.ts` is deleted, not trimmed.** `cellFor` holds E-103's hold; the module's only
importers were the S3b card, the S3b report and `test:journey-funnel` §10, all retired or moved.

**A14 · Both visit reads live in `site-visits.ts`** (the module that owns `SiteVisitPage` and `SiteVisitSource`, in both
twins): `pathViewsByDay` and `campaignVisitsByDay`. The measures DAL calls them.

**A15 · Records (the coordinator's rule, 2026-10-14).** `docs/VODACOM-PLAN.md`, `docs/NEXT-PLAN.md`,
`docs/qa/claude-vodacom-continuation-20261014.md` and `docs/COMPLIANCE-DECISIONS.md` are not edited on this branch. WP0's
annotations of §0, §1, §3.10 and §5, and the §0h points, are proposed as exact text in "§ Build record", for the coordinating
session to apply when it lands this work. `docs/DATA-RETENTION.md` gains its two rows here (it is that document's own fact).

**A16 · "The second decimal dropped" (WP1's plant list)** is read as two plants: whole numbers, and two decimals.

## Summary

### What S13 builds

- **The agency's five measures, defined once.** A definitions module holds each measure as data: its unit, its two
  halves, where each half is counted, whether it splits by campaign and whether it exists before the launch. The panel,
  the PDF, the workbook, the CSV and §3.10 all read that one module. The names are the agency's own words from the deck
  ("home → bet sheet, bet sheet → bet placed, short balance → deposit, deposit → bet completed, time to first bet").
- **Every measure is a nested pair.** Each numerator counts units that are, by construction, inside its denominator
  ("The measures, defined" below). Three pairs read two different counters, so a lost count on one side can still push a
  numerator past its denominator. In that case the share is held at 100% and marked, never printed above the whole
  (E-103; `funnel-measures.ts`:49-53), and both halves are always printed.
- **Before vs 7/14/28 days after the launch.**
  - "Before" is the 14 full East Africa days before the launch day.
  - "After N" is the first N full days on which the new journey was on all day.
  - The launch day itself counts on neither side.
  - Before the launch, the panel shows the baseline so far and "Not launched", never a figure for "after".
  - The launch moment comes from a launch record the system keeps (WP2). Today nothing records it (Correction 18).
- **The panel on `/admin/insights`.** It replaces S3b's "Journey funnel" card in place and shows:
  - the five measures before and after;
  - the split by campaign, for the measure that can be split;
  - the definitions table;
  - the agency report: which report is due, and its downloads;
  - a launch watch, shown only to staff who may see it: S15's rollback figures, and the two harm markers that the
    compliance record says are "watched next to the 'short balance → deposit' measure"
    (`COMPLIANCE-DECISIONS.md`:1480-1481).
- **The weekly report as PDF, Excel and CSV.** It is built from the same view by the existing report machinery: the
  `Report` shape, its two renderers and the shared CSV writer. It has its own route, as the Government Tax Report does,
  because the catalogue route is pinned to two formats (Correction 4).
- **The agency cadence, as screen state and audit rows — never as sending.** The panel says which report is due: each
  Monday for the first eight weeks after the launch, then each month. It also lists the downloads already taken. Ali
  downloads the file and emails it himself. The platform sends nothing to the agency: no plan line or ruling asks it to.
- **Three counter corrections**, so that the pairs nest by construction in the new journey (WP4):
  - at most one sheet open counted as `home` per home-page view;
  - no bet counted from an automated browser, as the beacons already do;
  - a returned bet counted inside "bet sheet → bet placed".

### What changes for players

Nothing on screen. The served bytes that change:
- (a) the allow-list in `funnel.ts` gains one origin string, `home_repeat` (WP4). The file is client-safe and rides in
  the beacon's chunk on classic pages too;
- (b) the journey host's lazy chunk keeps a per-home-view flag (WP4; journey readers only).

There is no new markup, storage, cookie or step. The privacy notice names steps, not origins (`privacy/page.tsx`:145),
so it does not change. The server's bet counter stops counting a bet sent from an automated browser (WP4). That changes
a count, not anything a player sees.

### What S13 leaves to later sessions

- **The first real "after" figures and the first weekly report.** They come with S15 and the first Monday after it. Ali
  sends the report (§5 S15, VODACOM-PLAN.md:5040).
- **The agency's written sign-off.** S14 already carries it (:5022). S13 makes a baseline report, with the definitions,
  that the agency can agree before signing (Open point 26).
- **The rollback decision.** It stays S15's: S13 only shows the triggers' figures (Open point 20).
- **"The measures in bounds".** This is S16's go condition (:5042), and no document defines it. S13 does not invent the
  bounds (Point for Ali 12).
- **Up & Down's own journey.** S12 changes Up & Down's low-balance flow. S13 shows Up & Down's shortfall notices and
  deposits only as counts, in a reference row on the internal panel.

### Order (11 packages, each green on its own)

1. WP0: the start line — S9's records on main, today's reds, the records, the §0h points.
2. WP1: the pure core — the measures as data, the windows, the statuses, the schedule, one formatter.
3. WP2: the launch record — the rollout observed and kept, on both stores.
4. WP3: the harm watch's daily count, on both stores.
5. WP4: the counters, corrected — one home open per view, no automated bet, the returned bet.
6. WP5: the reads — an inline DAL on both stores, and the visit counter's per-day read.
7. WP6: the view — one model for the panel and the files, with the launch watch.
8. WP7: the panel on `/admin/insights`.
9. WP8: the document and its export route.
10. WP9: the drive — a seed, the tiles and the downloads.
11. WP10: proof, records, merge, deploy.

WP1–WP4 can run in parallel after WP0. WP5 needs S9 on main for its row reads (Open point 1). WP7 and WP8 can run in
parallel once WP6 exists.

### Corrections to the maps, verified in the files

1. **`Position.origin` is not on main.** §3.10 still says "`origin` is persisted on the deposit row and the position
   (new nullable columns)" (VODACOM-PLAN.md:4813). The history:
   - §0f deferred the position column to S8 (:3663-3664), and S8 moved it to S9 (S8-PLAN.md:93-94; Open point 31,
     :1371-1372);
   - on main, `Position` has no `origin` (`schema.prisma`, model Position);
   - `Transaction.origin` exists (`schema.prisma`:698-701, migration `20261001120100_transaction_origin`).

   S9's branch adds `Position.origin` and `Transaction.pendingBet` in the unmerged migration
   `20261013160000_deposit_return_intent` (S9-PLAN §5b on `origin/codex/vodacom-s9`, :345-387). Neither column has a
   writer yet. WP0 annotates :4813.
2. **§3.10's definitions table (:4805-4811) does not give nested pairs as written:**
   - "Sheet → bet" counts *bets* over *opens*, and only bets with origin `sheet`. The old dial can take several bets
     per open (Correction 13). And if S9 counts a returned bet under `deposit_return` (the allow-list already has it,
     `funnel.ts`:21), that bet leaves the `sheet` count while its open stays in the denominator.
   - "Short → deposit" divides by every low-balance state, Up & Down's included (`funnel.ts`:19). Yet on a question the
     old journey offered no deposit at a shortfall (Correction 12), and the confirmed-deposit counter cannot tell a
     question deposit from an Up & Down one (`journey-funnel.ts`:145-149).
   - "Deposit → bet" counts *bets* with origin `deposit_return` over *deposits*. Two bets after one deposit would count
     twice. "Journey deposits" is not defined.
   - "Time to first bet" has no cohort and no horizon. The live median (`journey-funnel-report.ts`:80-87) takes the
     window's sign-ups and their first bet *ever*, so a player who joined yesterday and has not bet yet drops out of the
     median, which is biased short.
3. **The campaign filter prints made-up zeros today:**
   - **Short → deposit:** `totalsFor` filters every step by campaign (`funnel-measures.ts`:29), including the
     confirmed-deposit rows. Those rows never carry a tag (`journey-funnel.ts`:145-149: no browser), so under a
     campaign the figure is "0 of N", 0%.
   - **Home → sheet:** the home-page views are set to 0 under a campaign (`journey-funnel-report.ts`:59), so it prints
     "N of 0".

   DESIGN_AUTHORITY §C2 forbids both ("Never render a guessed, placeholder, or zero-as-unknown number"). The defect is
   latent: the filter shows only when a campaign has been seen (`journey-funnel-card.tsx`:73), and no campaign traffic
   exists yet. Only "bet sheet → bet placed" has both halves tagged.
4. **"A weekly CSV/PDF export" (:4819) cannot go through the catalogue route:**
   - `/api/admin/reports/[id]` refuses any format but xlsx and pdf (`route.ts`:59);
   - three guards pin that: `test:report-formats` §1 (`report-formats.test.mjs`:60), `qa:report-renderers`'
     "bad format → 400" on `format=csv` (`report-renderers-smoke.mjs`:94-95), and `GenerateButton`'s
     `type Format = "xlsx" | "pdf"`;
   - the Government Tax Report met the same wall and took its own route, loosening none of the pins
     (`api/admin/tax/export/route.ts`:7-11).

   S13 follows it.
5. **"House-bot rows are excluded per row" (§3.10 :4801) contradicts owner ruling D20a.**
   - D20a (`COMPLIANCE-DECISIONS.md`:2964): "every admin count, … the finance and insights figures and the harm and AML
     detectors carry no house memo, column, split, exclusion or line". Ali's words were: "Keep them in reports as normal
     players" (:2959).
   - The live S3b code excludes marked rows anyway: the deposit counter (`journey-funnel.ts`:137) and the row pass
     (`journey-funnel-report.ts`:65, :74).
   - The S3b lane met D19 here and changed only the card's wording (`6f0e18e9a`). D20a was never reconciled, and no
     Vodacom record mentions it.

   Point for Ali 1.
6. **The agency reply makes two promises the platform cannot keep as written** (`AGENCY-REPLY.md`:42-43):
   - "They exclude our staff and our own liquidity activity": "liquidity" is a house word under D19
     (`scripts/lib/house-bot-vocabulary.mjs`:124);
   - "They can be split by campaign": only one measure can be split by campaign (Correction 3).

   Point for Ali 2.
7. **The S3b report walks two whole tables on a windowed path.** It calls `db.txn.listAll()` and `db.user.list()`
   (`journey-funnel-report.ts`:55-56; its header :12 says so). The Prisma twin warns against exactly this
   (`prisma-dal.ts`:2529-2530: "Never on a windowed path"), and `test:report-parity` §4 forbids it in the files it lists
   (`report-parity.test.mts`:263-277). This file is not in the list, and the read is uncached on every `/admin/insights`
   render.
8. **The S3b windows include today and censor their own follow-ups:**
   - `toDay = eatDayKey(now)` (`journey-funnel-report.ts`:46), so a "7 days" read early in the morning is six days
     and a few hours;
   - a deposit confirmed in the last 30 minutes is counted with an unfinished follow-up (:76-78);
   - time to first bet has no horizon (Correction 2).
9. **Home-page views are given to the journey that is on *now*** (`journey-funnel-report.ts`:58-59, :90-91). After the
   flip, any window that spans the launch gives the old journey's home views to the new journey's column.
10. **Home views come from a top-50 ranking** (`siteVisitsReport(fromDay, toDay, 50)`, :53, then `pages.find(... "/")`).
    A "/" outside the top 50 would read 0. A per-day read of one path is needed (WP5).
11. **"The old journey is counted from 2026-10-01"** (`journey-funnel-card.tsx`:69-70). The S3b deploy finished at
    22:47 UTC on 2026-09-30, which is 01:47 EAT on 2026-10-01 (§0f :3680-3685), so that first East Africa day is
    partial. The first full counted day is **2026-10-02**. The 14-day baseline (2026-10-02 → 10-15) agrees with §0f's
    "runs to 2026-10-15".
12. **On a question, the old dial offered no deposit at a shortfall.**
    - The dial counts its low-balance state (`conviction-dial.tsx`:796-803) and shows a sentence with no link
      (:1722-1730).
    - The only shortfall deposit link before launch is Up & Down's (§0f :3633; `test:journey-funnel` 8.links).
    - So "short balance → deposit" on questions has no "before". The deck's own Today column says the same
      (VODACOM-PLAN.md:4308: "Dial disables its button; no path").
13. **The old journey's "bet sheet → bet placed" is not nested.** The side picker counts one open per page
    (`side-picker.tsx`:61-68), while the dial counts every bet it places (`conviction-dial.tsx`:979). The new sheet takes
    at most one bet per open: its receipt's only exit, "Endelea kucheza", closes it (`bet-sheet.tsx`:133), a retry
    reuses the key, and a replay is never counted (`markets/actions.ts`:112).
14. **The new journey counts every sheet opened from the home page as `home`.**
    - The card stamps `data-sheet-origin="home"` (`journey-card.tsx`:238), and the host sends one `sheet_open` per open
      (`bet-sheet-host.tsx`:258-270, :424).
    - One home-page view can open several sheets, and a query-only change is not a new view (`site-visit-beacon.tsx`:14).
    - So "home → bet sheet" can pass 100% by construction in the new journey.
15. **The server's bet counter has no automation check.** It reads the session's role and the preview, and nothing else
    (`journey-funnel.ts`:113-128). The browser beacons skip automation (`funnel-beacon.ts`:24, :45; `/api/funnel`
    `route.ts`:29). A scripted bet is therefore counted with no counted open.
16. **The two halves of "home → bet sheet" exclude different people:**
    - the visit counter counts everyone, staff and guests included (`site-visit-beacon.tsx`:22-35, mounted in the root
      layout, `layout.tsx`:228);
    - the funnel scope switches staff and previews off (`app-shell.tsx`:411).

    So the share is understated, never overstated. Before the launch, guests could not open the dial at all (§0f
    :3677-3678).
17. **"Players" means two things.**
    - The counters exclude staff only (`isStaffRole`, `journey-funnel.ts`:116, :143), so AGENT accounts are counted.
    - The row pass keeps `role === "PLAYER"` only (`journey-funnel-report.ts`:62), so AGENT accounts are dropped.

    S13 uses "not a staff role" (`roles.ts`:76-91) everywhere.
18. **No launch instant is recorded anywhere.**
    - The journey's state is the lower of a code/env ceiling and the Owner's stored cap (`feature-state.ts`:404,
      :432-436; `simple-journey-switch.ts`:341).
    - Only the cap's ceremony writes a row (`journey.rollout.set`, `simple-journey-ceremony.ts`:119).
    - The S15 flip is "one commit" (VODACOM-PLAN.md:5024-5025). If the cap is absent, the deploy alone flips the journey
      and writes nothing.
19. **The harm markers keep no history.** "NOTHING persists a harm flag"; each flag lasts as long as its detector's
    window, at most 8 days (`responsible-gambling.ts`:790-795). The compliance page recomputes them for every user on
    each render (:892-903; `admin/compliance/page.tsx`:581, :616-621). So "watched next to measure 3" (§8 :5182-5183;
    S8-PLAN Risk 21, :1291-1294; `COMPLIANCE-DECISIONS.md`:1480-1481) needs a daily count before anything can be
    compared.
20. **One rule, two constants.** The 30 minutes is `DEPOSIT_TO_BET_MS` here (`journey-funnel-report.ts`:24) and
    `DEPOSIT_RETURN_WINDOW_MS` on S9's branch (`deposit-state.ts`:16).
21. **Percentages are rounded two ways.** The panel shows whole numbers (`funnel-measures.ts`:52). The report renderers
    print one decimal (`xlsx.ts`:32 `0.0%`; `pdf.ts`:338). A file and a screen made from one view would disagree.
22. **The S3b card's window and campaign controls are plain links** (`journey-funnel-card.tsx`:46-55, :73-81). They are
    not the kit's filter language, and `filter-language`'s `ADMIN_SURFACES` (`filter-language.test.mts`:253-297) does
    not declare them.
23. **The catalogue route records a download without checking the record landed.** Its audit call is not awaited
    (`route.ts`:186). The tax route refuses to release a file whose row did not land (`tax/export/route.ts`:97-121).
    S13 takes the tax rule.
24. **Two spellings of a campaign tag.**
    - The funnel keeps `[a-z0-9._~ -]`, up to 64 characters, and drops anything else (`funnel.ts`:34-43).
    - The visit counter lowercases, strips control characters and truncates (`src/lib/site-visits.ts`:32).

    So "Launch!" is a visit campaign and no journey campaign.
25. **The §1 S13 row's done-when cannot be met before S15** ("The panel shows before vs after", :3883): nothing is
    "after" until the launch. "The CSV/PDF export and its definitions are sent to the agency" is Ali's act, not the
    build's (Open point 2).
26. **Two stale pointers in §0:**
    - "its review fixes on `codex/vodacom-s9-fixes`" (:26-27): no such branch is on origin (`git ls-remote`,
      2026-10-14);
    - §5's session loop still names `C:\kipindi-journey` and "`test:all` before each push" (:4863-4866), which the
      session law (:389-420) and the OMEGA-COMPILE01 SSD rule (:408-413) replaced.

---

## What exists today (verified at `f830a091c`)

### The counters (S3b, live since `64a63b7c`)

| Piece | Where | What it does |
|---|---|---|
| The allow-list | `src/lib/journey/funnel.ts`:15-24 | `sheet_open`: home, board, market, card · `low_balance`: dial, updown, sheet · `bet`: dial, quick, sheet, deposit_return · `deposit_confirmed`: low_balance, direct. Browser steps are `sheet_open` and `low_balance` only (:32). Tags `[a-z0-9._~ -]`, ≤ 64 (:34-43) |
| The table | `schema.prisma` `JourneyFunnelDay` (:3076-3092) | Daily totals per (EAT day, step, origin, variant, utmSource, utmCampaign). No identifier. Pinned by `test:journey-funnel` §4 and `test:privacy-notice` §4h |
| The store | `src/lib/server/journey-funnel.ts` | Inline memory/Prisma twin (:36-78). `recordFunnel` (:90), fire-and-forget `countFunnel` (:101), kept 400 days (:19), pruned by `retention.purge.daily` |
| The browser endpoint | `src/app/api/funnel/route.ts` | Same-origin only, `isAutomatedAgent`, `funnel.ip` rate limit, 204 always, no cookie (:25-40) |
| The beacon | `src/lib/journey/funnel-beacon.ts` | Sends only under the shell's `data-kp-funnel` scope, which is "off" for staff, previews and unread accounts (`app-shell.tsx`:411, :480). Skips automation (:24, :45). First-touch tags in `kp-utm` (:27-40) |
| Server: bet | `journey-funnel.ts`:113-128, called at `markets/actions.ts`:112 | After `r.ok && !replayed`; not staff, not a preview. Origin and tags come from the form (`funnelBetFields`, `funnel-beacon.ts`:53-58). No automation check (Correction 15) |
| Server: deposit | `journey-funnel.ts`:136-151, called at `wallet-service.ts`:459 | In `settleDepositConfirmed`'s post-lock block. Origin `low_balance` or `direct` from the row. Variant "new" only once the rollout is ACTIVE. No campaign tag (no browser) |
| Old-journey calls | `side-picker.tsx`:59-68 (open, once per page), `conviction-dial.tsx`:796-803 (low balance, once per dial), :979 (bet `dial`), `use-quick-bet.ts`:257, :344 (Up & Down) | The baseline's sources |
| New-journey calls | `bet-sheet-host.tsx`:270 (open, every open), :501 (low balance, once per open), `sheet-state.ts`:389 (bet `sheet`), `bet-sheet-host.tsx`:393 (the deposit link, `from=low-balance`); origins from `journey-card.tsx`:238 (home/card), `journey-bet-buttons.tsx`:9 (market), the address (:304, :307: home/board) | Behind the flag. Staff and previews are scoped off, so nothing of the new journey has been counted yet |

### What the baseline actually recorded

These are §0f's production reads (:3685-3697):
- **2026-10-01** (partial day): bet 81 (quick 76, dial 5) · low_balance 3 (updown 2, dial 1) · sheet_open 10 (board 5,
  market 4, home 1);
- **2026-10-02**: bet 82 (quick 80, dial 2) · low_balance 16 (updown 9, dial 7) · sheet_open 11 (board 8, market 2,
  home 1);
- **Both days**: `deposit_confirmed` 0, checked against `Transaction` (no player deposit was confirmed); every row
  `variant = old`.

That scale matters. About one home-page sheet open a day means the old journey's "home → bet sheet" is a ratio of very
small numbers (Risk 5).

### Origin on the rows the definitions need

| Row | On main | On `origin/codex/vodacom-s9` (`9869dd701`, unmerged, not deployed) |
|---|---|---|
| Deposit: `Transaction.origin` | ✅ `"low_balance"` or NULL. Create-only in both twins (`prisma-dal.ts`:1179, :2442, :2511; `store.ts`:2921). Written by `deposit()` (`wallet-service.ts`:265) from the page's `from=low-balance` field (`deposit/page.tsx`:282; `actions.ts`:49). The sheet's deposit link carries it (`bet-sheet-host.tsx`:393) | Unchanged |
| Deposit: `Transaction.pendingBet` | ✗ | `JSONB`, nullable, create-only. The envelope is `{ v: 1, bet, returnPath }`, parsed only by `parseSavedDepositBet` (`deposit-state.ts`:19, :34). No application writer yet (S9-PLAN §5b) |
| Bet: `Position.origin` | ✗ | `TEXT`, nullable, create-only, kept through cash-out, void and win (S9-PLAN §5b). Written `deposit_return` only on a new manual question bet that matches an owned CONFIRMED deposit's saved bet (same market, side and stake) within 30 minutes of its completion, never for a marked stake (`isDepositReturnBet`, `deposit-state.ts`:200-209). The writer is S9 WP7 (S9-PLAN :234-247), which also promises to "prove the numerator and denominator of §3.10 against row times and the actual report/counter" |

### The S3b panel and its report

- **`/admin/insights`** mounts the card after the page's access check (`page.tsx`:42-47, :134). The window comes from
  `?jf=7|14|28` and the campaign from `?jfc=` (:36-39).
- **The card** (`journey-funnel-card.tsx`) shows three counted measures per journey (old/new) over a trailing window
  that includes today. Under them it shows deposit → bet (30 min) for all players and the median time to a first bet
  (:126-138). It contains its own read failure (:45, :56-62).
- **The report** (`journey-funnel-report.ts`) is the read behind it, with Corrections 3 and 7-10.

### The report machinery S13 reuses

| Piece | Where | What S13 takes from it |
|---|---|---|
| The `Report` shape | `src/lib/server/reports/types.ts`:88-125 | meta (period printed by both renderers), summary, sections with `titleSw`, notes, classification |
| The renderers | `reports/pdf.ts` (`renderPdf`, `findPdfOverflows`), `reports/xlsx.ts` (`renderXlsx`) | Unchanged |
| The CSV writer | `src/lib/contacts/csv-write.ts`:44-91 (`CSV_BOM`, `CSV_EOL`, `csvCell` with the formula guard) | Unchanged; the tax CSV already uses it (`tax-report-doc.ts`:654) |
| An own-route export | `src/app/api/admin/tax/export/route.ts` | Stored role plus accounting VIEW (:41-46), admin 2FA (:47-49), same-origin (:50-52, `exportRequestAllowed`, `contacts/export.ts`:196-198), pdf/xlsx/csv (:57), the record before the first byte (:97-121) |
| Window truth | `scripts/report-window-truth.test.mts` | The method: the bounds a builder hands to SQL, recorded, against the bounds it states and the dates it prints, under a zone that is neither UTC nor EAT (:1-41) |
| Renderer drives | `scripts/report-renderers-smoke.mjs` (`qa:report-renderers`) | The method: magic bytes, content type, filename, refusals, localhost only |
| Download buttons | `src/app/admin/tax/export-buttons.tsx` | The three-format pattern (fetch, say the refusal, the server's filename, a 60-second ceiling) |

### Who can see it today

- `/admin/insights` maps to `accounting` (`roles.ts`:241). ADMIN sees everything. By default FINANCE, COMPLIANCE and
  AUDITOR hold accounting VIEW (`roles.ts`:184-212); the grants can be edited at `/admin/roles`.
- MODERATOR, GROWTH and SUPPORT cannot open it.
- The page checks the role again in its body (`page.tsx`:45).

---

## The measures, defined

### Words used below

- **Day**: a full East Africa day, 00:00–24:00 EAT (`eatDayKey`, `src/lib/eat-day.ts`:27). Today is never in a window.
- **Launch day L**: the EAT day of the first observed move to ACTIVE (WP2).
- **Player**: an account whose role is not a staff role (`STAFF_ROLES`, `roles.ts`:76-84), read at read time.
- **Unmarked**: `houseBotId IS NULL` (the default; Point for Ali 1).
- **C(step, origins, variant, days[, campaign])**: a counter sum over `JourneyFunnelDay`.
- **V(days)**: home-page views from `SiteVisitPage` with path "/".
- **R1–R4**: the row reads below.

### The definitions table (what the panel shows and the agency receives)

| # | Measure | Unit | Numerator | Denominator | Before (old journey) | After (new journey) | Campaign split |
|---|---|---|---|---|---|---|---|
| 1 | Home → bet sheet | a home-page view | C(`sheet_open`, [home], v, days): at most one per view (WP4) | V(days) | v = old (the old home's side links, `from=home`) | v = new | No: views carry no campaign |
| 2 | Bet sheet → bet placed | a sheet open | old: C(`bet`, [dial]); new: C(`bet`, [sheet, deposit_return]) | C(`sheet_open`, every origin, v, days) | Yes; may overstate (Correction 13), marked | Yes; at most one bet per open | **Yes**: both halves carry the first-touch tag |
| 3 | Short balance → deposit (questions) | a not-enough-money state on a question | R1 rows whose saved bet is a question (`kind: "market"`) | old: C(`low_balance`, [dial]); new: C(`low_balance`, [sheet]) | "No deposit was offered" (Correction 12): the notices are counted, no share is printed | Yes | No: deposits carry no tag |
| 4 | Deposit → bet completed | a confirmed shortfall deposit on a question, its 30 minutes passed | those matched one-to-one to their returned bet (R3) | R1 rows (questions) whose 30 minutes have passed | "Not recorded before launch" | Yes | No |
| 4b | Deposit → any bet (30 min) | a confirmed player deposit, its 30 minutes passed | those followed by the same player's unmarked bet within 30 min (R2) | R2 rows whose 30 minutes have passed | Yes | Yes | No |
| 5 | Time to first bet | a new player whose first 24 h have passed | players whose first unmarked bet came within 24 h of sign-up (R4); also the median minutes among them | R4 players whose first 24 h have passed | Yes | Yes | No |
| ref | Up & Down and other shortfall deposits (internal panel only; counts, no share) | — | R1 rows with no saved question bet (a round, or none) | shown beside it: C(`low_balance`, [updown], v, days) | Yes | Yes | No |

**Why each pair nests, and where it can still break:**

1. **Home → bet sheet.** A counted `home` open always follows a counted view of "/":
   - in the old journey, the link from that view (`from=home`) leads to the market page where the dial is revealed;
   - in the new journey, the sheet opens on "/" itself, and WP4 lets each view send at most one `home`.

   Two things can break it, both rare, both held at 100% and marked: a lost visit beacon, or an old-journey market page
   reloaded with `from=home`. Staff and guests in the denominator only lower the share.
2. **Bet sheet → bet placed.**
   - New journey: at most one bet per open (Correction 13), and a returned bet counts here whether S9 records it as
     `sheet` or `deposit_return`.
   - Old journey: several bets per open are possible, so the before figure can overstate (Open point 6). It is marked
     whenever it passes 100%.
3. **Short balance → deposit.** A question deposit with a saved bet starts at the sheet's deposit row, which shows only
   inside a counted low-balance frame (`bet-sheet-host.tsx`:498-503, once per open). Two things can break it: a deposit
   page reached from a stored link, or an automated browser (its frame is not counted, its deposit row is). Rare,
   held and marked.
4. **Deposit → bet completed.**
   - Rows only, matched one-to-one. Each returned bet is given to the latest eligible deposit (same player; the saved
     bet equals the position's market, side and stake; completed at or before the bet, and the bet within 30 minutes;
     not yet matched; ties broken by the larger id). The count is of matched deposits.
   - It is strictly nested, and needs no hold.
5. **Deposit → any bet (30 min).** Rows only, an existence check per deposit. Strictly nested.
6. **Time to first bet.** Rows only, a subset of one cohort. Strictly nested. The median describes only the numerator
   ("k players").

### The SQL and DAL definitions (both stores)

The reads live in one inline DAL module (WP5): Prisma when a database is configured, memory otherwise. It follows the
`site-visits.ts` / `journey-funnel.ts` pattern, so `store.ts`, `prisma-dal.ts` and `market-dal.ts` are not touched (no
dal-parity mapper change, and no move of the house-report line pins in `market-service.ts`). The SQL below is the Prisma
twin's meaning, written as Postgres. WP5 runs every statement on the scratch PostgreSQL. The memory twin computes the
same answer from the in-memory maps, and the two-store suite holds the two equal on one fixture set. The saved bet is
parsed in TypeScript by S9's `parseSavedDepositBet` and `parseBetParam`, never re-implemented in SQL.

```sql
-- C · a counter sum. JourneyFunnelDay. $days = the window's EAT day keys (a window may skip a day, see Windows).
SELECT COALESCE(SUM("count"), 0) AS n
  FROM "JourneyFunnelDay"
 WHERE "day" = ANY($days) AND "step" = $step AND "origin" = ANY($origins) AND "variant" = $variant
   AND ($campaign::text IS NULL OR "utmCampaign" = $campaign);

-- V · home-page views per day. SiteVisitPage. (WP5 adds this narrow read in both twins of site-visits.ts.)
SELECT "day", COALESCE(SUM("views"), 0) AS views FROM "SiteVisitPage"
 WHERE "day" = ANY($days) AND "path" = '/' GROUP BY "day";

-- R1 · confirmed shortfall deposits completed in [$from, $to): players, unmarked. The saved bet is parsed in TypeScript.
SELECT t."id", t."userId", t."createdAt", t."completedAt", t."pendingBet"
  FROM "Transaction" t JOIN "User" u ON u."id" = t."userId"
 WHERE t."type" = 'DEPOSIT' AND t."status" = 'CONFIRMED' AND t."origin" = 'low_balance'
   AND t."houseBotId" IS NULL AND u."role"::text <> ALL($staffRoles)
   AND COALESCE(t."completedAt", t."createdAt") >= $from AND COALESCE(t."completedAt", t."createdAt") < $to;

-- R2 · every confirmed player deposit completed in [$from, $to), and whether the same player placed an unmarked bet
--      within 30 minutes of it (inclusive). The caller drops a deposit whose 30 minutes have not passed at the read.
SELECT t."id", COALESCE(t."completedAt", t."createdAt") AS "at",
       EXISTS (SELECT 1 FROM "Position" p
                WHERE p."userId" = t."userId" AND p."houseBotId" IS NULL
                  AND p."placedAt" >= COALESCE(t."completedAt", t."createdAt")
                  AND p."placedAt" <= COALESCE(t."completedAt", t."createdAt") + interval '30 minutes') AS "betWithin30"
  FROM "Transaction" t JOIN "User" u ON u."id" = t."userId"
 WHERE t."type" = 'DEPOSIT' AND t."status" = 'CONFIRMED' AND t."houseBotId" IS NULL AND u."role"::text <> ALL($staffRoles)
   AND COALESCE(t."completedAt", t."createdAt") >= $from AND COALESCE(t."completedAt", t."createdAt") < $to;

-- R3 · returned bets (S9) of R1's players, placed from the window's start to 30 minutes past its end.
SELECT p."id", p."userId", p."marketId", p."side", p."stake", p."placedAt"
  FROM "Position" p
 WHERE p."origin" = 'deposit_return' AND p."houseBotId" IS NULL AND p."userId" = ANY($users)
   AND p."placedAt" >= $from AND p."placedAt" <= $to + interval '30 minutes';

-- R4 · players who joined in [$from, $to), and the first unmarked bet of each.
SELECT u."id", u."createdAt",
       (SELECT MIN(p."placedAt") FROM "Position" p WHERE p."userId" = u."id" AND p."houseBotId" IS NULL) AS "firstBetAt"
  FROM "User" u
 WHERE u."role"::text <> ALL($staffRoles) AND u."createdAt" >= $from AND u."createdAt" < $to;

-- W · the launch watch: player deposits started per EAT day, by outcome (rows), for S15's confirm rate.
SELECT ((t."createdAt" + interval '3 hours')::date) AS "day",
       COUNT(*) FILTER (WHERE t."status" IN ('CONFIRMED', 'REVERSED')) AS confirmed,
       COUNT(*) FILTER (WHERE t."status" IN ('FAILED', 'CANCELLED')) AS failed,
       COUNT(*) FILTER (WHERE t."status" IN ('PENDING', 'PROCESSING', 'AML_REVIEW')) AS undecided
  FROM "Transaction" t JOIN "User" u ON u."id" = t."userId"
 WHERE t."type" = 'DEPOSIT' AND u."role"::text <> ALL($staffRoles) AND t."createdAt" >= $from AND t."createdAt" < $to
 GROUP BY 1;
```

Rules every read keeps:
- **Bounds.** `[from, to)` on instants, which are the EAT midnights of the window's segments (`eatDayWindow`,
  `eat-day.ts`:44). Inclusive 30-minute and 24-hour follow-ups.
- **Follow-ups that have not passed.** A deposit whose 30 minutes, or a sign-up whose 24 hours, have not passed at the
  read is dropped from its denominator and reported as "k waiting".
- **What counts as a deposit.** In the measures, a deposit is counted as CONFIRMED *at the read*; a deposit later
  REVERSED leaves the count, and the definitions say so. In the launch watch's confirm rate (W), a REVERSED deposit
  counts as confirmed, because the question there is whether the payment went through.
- **No whole-table walk** in the Prisma twin. Every query carries a window or an id list. `test:report-parity` §4 gains
  both measure modules (WP5). The PG child of the two-store suite records the client calls and fails on a `findMany`
  with no `where`.
- **Indexes.** R1, R2 and W use the `(type, status)` and `(createdAt)` indexes on `Transaction`. R3 and R4 use
  `(userId, …)` on `Position` and `(createdAt)` on `User` (`schema.prisma`). WP5 records `EXPLAIN` on the scratch
  PostgreSQL.

### Windows

| Case | Before | After N (N = 7, 14, 28) |
|---|---|---|
| No ACTIVE moment observed yet | the 14 days ending yesterday ("baseline so far"), clipped to the first full counted day, **2026-10-02** | "Not launched", no figure |
| Launched | the 14 days L−14 … L−1 | the first N days after L on which the journey was ACTIVE from 00:00 to 24:00, before today |
| Fewer days exist than the window asks | the figure over the days that exist, marked "k of 14 days" | the figure over the days so far, marked "k of N days" |
| A rollback | days with any non-ACTIVE moment are skipped and named ("not on the new journey") | the same |
| Older than 400 days | counter and visit totals are pruned (`journey-funnel.ts`:19; `site-visits.ts`) → "older than 400 days", no figure | the same |

- **Variants.** Counters filter on variant as well as days: before reads `variant = old` and after reads `variant = new`.
  A stale classic tab's beacon on an after day therefore falls in neither column.
- **Weekly report W (Monday M).** The days M−7 … M−1 that are wholly ACTIVE and after L. If the launch week is short, it
  is called so ("launch week: 4 days"); a week of 0 days produces no report.
- **Monthly report.** After week 8: the previous complete EAT calendar month, on the first Monday after it ends (Open
  point 16).

### Statuses: what is printed when a figure cannot be honest

One vocabulary, shared by the panel, the PDF, the workbook and the CSV (WP1). No status ever renders a 0 that is not a
counted zero.

| Status | When | What is printed |
|---|---|---|
| figure | denominator > 0 | the share to one decimal, over "n of d" |
| small | figure, with d < 30 | the figure and "small sample" (Open point 12) |
| held | n > d | "100.0%", the mark "*", both halves, and "two counters disagree" |
| none yet | d = 0 | "—", both halves, "no {unit} yet" |
| partial | fewer days than the window | the figure and "k of N days" |
| not launched | an "after" column before launch | "Not launched" |
| no offer | measure 3 before launch | "—", "no deposit was offered at a shortfall before launch", and d shown as "{d} notices shown" |
| not recorded | measure 4 before launch | "—", "the bet a deposit was made for is recorded from launch" |
| not split | a campaign is chosen and one half has no tag | "—", "not split by campaign" |
| unreadable | a source read failed | "could not be read" — contained to that cell, never a zero |
| pruned | the window is older than 400 days | "—", "older than 400 days" |
| not counted | a day inside a window with no counter row at all, while the visit counter shows home views (a counting gap) | the day is dropped from both halves, and the window is marked partial with the day named |
| waiting | follow-ups not yet passed | excluded from the denominator, "k waiting" |

**Changes.** "Change" is after minus before, in percentage points, to one decimal, with U+2212 for a fall. It is
printed only between two figure (or small) cells. Its ink is neutral: never the betting pair, success or danger
(DESIGN_AUTHORITY §B2/§B2a), and never gold (§M3). A change says what moved, not why.

### Exclusions (the sentence the agency reads)

**"Players only. Staff accounts, previews and automated visits are not counted."**
- The counters do this already (staff, previews and automation in the browser), and WP4 adds the server's bet.
- The rows keep non-staff roles.
- Marked stakes are outside the measures by default and are never named anywhere (D19). Point for Ali 1 decides
  whether they stay out.
- ⛔ No house word appears on the panel, in the definitions or in any file: no "liquidity", "house bot" or "house
  stake" (`HOUSE_WORD_SOURCE`, `house-bot-vocabulary.mjs`:124).
- `houseBotId` appears only in the server read module, never in a page, component or route file
  (`test:house-bot-surfaces` §2).

### Campaign split

- **Only measure 2 splits.** Under a campaign filter, measures 1, 3, 4, 4b and 5 print "not split by campaign".
- **The campaign table** (panel and files) lists each campaign seen in the window with its sheet opens (all origins),
  its home-page opens, its bets, its "bet sheet → bet placed", and its landing visits from the visit counter
  (`SiteVisitSource`, matched by exact tag; a visit tag with no journey twin says so, Correction 24).
- **Campaign tags are first-touch:** the `utm_campaign` of the visit's first page (`funnel-beacon.ts`:27-40).
- **For the agency.** Tags must use lowercase letters, digits and `. _ ~ -` or a space, up to 64 characters. Any other
  character makes a tag uncountable in the journey totals. The definitions say so.

---

## The agency's cadence: what the system does, what Ali does

| | The system | Ali |
|---|---|---|
| Before launch | Counts. Shows the baseline so far and "Not launched". Offers a **baseline report** (before only, with the definitions) for download | Sends the baseline report and its definitions to the agency, so they can agree how each measure is counted before S14's sign-off (Open point 26) |
| Each Monday, weeks 1–8 after launch | Shows "Week k of 8 — {Mon}–{Sun} — ready". Builds the PDF, Excel and CSV on demand for exactly that week, plus before and since launch. Records each download in the audit log (who, when, period, format, reference) and lists the downloads on the panel by date and format only | Downloads, reads, emails the agency |
| Then monthly | Shows "Month {name} — ready" on the first Monday after the month ends | The same |
| Never | Emails the agency, sends a reminder, or marks a report "sent". No plan line or ruling asks for it (Open point 17) | — |

---

## Who sees what

| What | Who | Gate |
|---|---|---|
| The measures card, the definitions, the agency report block | ADMIN, and roles holding accounting VIEW (by default FINANCE, COMPLIANCE, AUDITOR; editable at `/admin/roles`) | The page's existing gate (`page.tsx`:42-47) |
| The files | The same | The stored role plus accounting VIEW, admin 2FA, a same-origin request, and the audit row landed before the first byte (the tax route's four, WP8) |
| The launch watch: rollback figures | The same | — |
| The launch watch: harm markers | Roles holding **compliance** VIEW (ADMIN, COMPLIANCE, AUDITOR by default), the people who may open Player Safety (`roles.ts`:296). FINANCE sees no harm row at all | `canView(role, "compliance")` in the card, decided on the server |
| The agency | Only the files Ali sends. No console access; their 7-day preview link shows the journey, not the panel (SJ-23) | — |

GROWTH (campaigns, traffic) does not see the panel by default (Open point 18).

---

## Work packages

### WP0 — The start line: S9's records on main, today's reds, the records (S; checks S9 and S10, waits for neither)

**Goal.** Start S13 at a base where the rows the measures read exist and every citation is re-read. Today's reds are
named and the plan's stale text is annotated before anyone builds from it.

**Files.**
- `docs/VODACOM-PLAN.md`:
  - §0: a new S13 section, the status home;
  - §1 S13 row to 🔨, with this file's link and Open point 2's done-when;
  - §3.10's lines that Corrections 1, 2, 4 and 5 name, annotated in place and never rewritten;
  - §5 S13 (:5009);
  - the §0h points for this plan's Open points.
- This file: an amendment if the re-read changes a package.
- The session's memory file for the Vodacom plan.

**Steps.**
1. **Check the preconditions on main; never assume them** (Open point 1):
   - S9's migration `20261013160000_deposit_return_intent` is on main and applied (production's `_prisma_migrations`,
     read-only).
   - S9's writers exist: `Transaction.pendingBet` on a journey deposit, and `Position.origin = "deposit_return"` on a
     returned bet.
   - The journey deposit still stamps `origin = "low_balance"` from the sheet's link (`bet-sheet-host.tsx`:393 →
     `deposit/actions.ts`:49).
   - Record which funnel origin S9 counts a returned bet under, and that only a question bet can carry
     `deposit_return` (an Up & Down return must not, or measure 2 would count a bet whose open it never saw).
   - S10's edits to `bet-sheet-host.tsx` are merged (WP4 edits the same file).
2. **Re-derive today's reds** for the suites S13 touches: `test:journey-funnel` and its red, `test:funnel-share`,
   `test:report-formats`, `test:report-window-truth`, `test:report-parity`, `test:report-window-reads`,
   `test:house-bot-surfaces`, `test:filter-language`, `test:cert-devroutes`, `test:insights`, `test:privacy-notice`,
   `test:red-anchors`. Record each by its full label.
3. **Re-read every citation here at the base.** Record what moved or is gone; anything that changes a package becomes
   an amendment.
4. **The docs commit**, one, rebased onto main last:
   - §0, §1 and §5 as above;
   - §3.10 annotated ("S13-PLAN Correction n");
   - the §0h points, numbered after the last (82 at `f830a091c`; S9–S12 will add more).

   Gate names without a package key are written without the `npm run` prefix.

**Gates.** `test:docs`; `test:vodacom-plan` (the S13 row 🔨, no ✅ before a commit).

**Served bytes for a classic viewer.** None.

**Done when.**
- The preconditions are recorded true, or the packages that wait are named.
- The reds are named, and every citation has been re-read.
- §0, §1, §3.10 and §5 are annotated, and the §0h points are filed.

### WP1 — The pure core: the measures as data, the windows, the statuses, the schedule, one formatter (M; depends on WP0)

**Goal.** Put every rule a figure depends on in one pure, import-light module, so that the panel, the files and the
suites cannot read a measure two ways.

**Files.**
- `src/lib/journey/measures.ts` (new, pure; client-safe though only servers read it):
  - `MEASURES`, the definitions table above as data: key, the agency's English name, the Swahili draft, unit, numerator
    and denominator specs (step, origins per variant, or row read), campaign split, before availability, notes;
  - `FIRST_FULL_COUNTED_DAY = "2026-10-02"`, with its source (§0f);
  - `measureWindows(...)`;
  - the status union and `cellFor(n, d, ctx)`;
  - `agencySchedule(launch, now)`;
  - `percentText` (one decimal) and `changeText`.
- `src/lib/journey/funnel-measures.ts`: `measure()` keeps E-103's hold and exposes the exact fraction. The S3b
  `totalsFor` and `funnelMeasures` are retired with the S3b report in WP6.
- `scripts/journey-measures-core.test.mts` (new): in process, with `--prove-red`.
- `package.json`: `test:journey-measures-core`, `red:journey-measures-core`.

**Steps.**
1. **Encode the table above**, including the "ref" row as internal-only and as counts with no share: a shortfall
   deposit with no saved question bet may be Up & Down's or a question deposit that lost its saved bet, so the two
   counts are not a nested pair. Every measure needs both language
   titles, a unit, and a campaign-split flag that is true only when both halves are tagged sources. The core asserts
   this of itself.
2. **`measureWindows`**: given the launch record's ACTIVE periods (WP2's shape), `now` and the retention edge, it
   returns the before window, the after 7/14/28 windows, the latest Mon–Sun week and the since-launch window. Each is a
   list of days with its partial, skipped, pruned and not-launched facts. Every day is an EAT day.
3. **`cellFor`** decides the status by the table above, in its precedence order:
   unreadable → pruned → not launched → no offer / not recorded → not split → none yet → held → figure, with the
   small / partial / waiting / not-counted marks.
4. **`agencySchedule`** returns the due report (baseline, week k of 8, or month) with its dates. It also returns the
   eight Mondays, then the monthly cadence.
5. **One rounding rule:** one decimal everywhere, matching the renderers (`xlsx.ts`:32, `pdf.ts`:338; Open point 11).
6. **One 30-minute constant:** S9's `DEPOSIT_RETURN_WINDOW_MS`, imported from `deposit-state.ts` (Correction 20). The
   24-hour horizon is a named constant here.

**Gates.** `test:journey-measures-core` and its red twin, with plants:
- a window that includes today;
- the launch day counted after;
- the UTC day for the EAT day (run under a zone that is neither UTC nor EAT, as `report-window-truth.test.mts`:33-41
  does);
- a partial window unmarked;
- a share printed above 100%;
- a campaign split claimed for measure 3;
- "no offer" replaced by 0%;
- a week report on a skipped day;
- the second decimal dropped.

Also `test:client-graph-safe`, and `test:red-anchors` (in-process twins, declared).

**Served bytes for a classic viewer.** None (only servers import it).

**Done when.** The core's suite is green and every plant is caught.

### WP2 — The launch record: the rollout observed and kept (M; depends on WP0)

**Goal.** Make "the launch" a recorded fact. The record holds the first moment the new journey was ACTIVE for players,
and every later change, whatever caused it: the code ceiling, `FEATURE_SIMPLEJOURNEY`, or the Owner's cap (Correction
18).

**Files.**
- `src/lib/server/journey-launch.ts` (new):
  - `observeJourneyRollout(now)` reads `simpleJourneyStateNow()` (`simple-journey-switch.ts`:341);
  - it compares that with the last observation in the `SystemConfig` row `journey.rollout.observed`
    (`{ v: 1, transitions: [{ at, state, source, buildStartedAt }] }`, bounded; the first ACTIVE transition is never
    pruned);
  - on a change it appends by compare-and-swap (`replaceConfigIfValue` / `createConfigIfAbsent`, `config-store.ts`) and
    writes one SYSTEM audit row, `journey.rollout.observed`;
  - `journeyLaunchRecord()` returns `{ observedSince, firstActiveAt | null, periods }`, or `unreadable`.
- `src/lib/server/lifecycle.ts`: one chore line in the leader's pass, with its own `.catch` (the pattern at :622, :638).
- `scripts/ops-prelaunch-reset.mts`: classify the new key. It is dropped, like `journey.rollout.switch` (:152): a reset
  before launch clears it, and the next tick writes it again. An unclassified key makes the reset refuse (:546).
- `scripts/journey-launch.test.mts` and `scripts/lib/journey-launch-cases.mts` (new; `runTwoStores`,
  `scripts/lib/house-bot-two-stores.mts`:26).
- `package.json` keys.
- `docs/DATA-RETENTION.md`: a row.

**Steps.**
1. **Observe each tick, as leader only.** Each observation carries the process's start time. An observation from a
   process that started before the last recorded one is ignored, so two builds running together during a deploy
   cannot write a false move back (Risk 7).
2. **Writes are idempotent.** Two containers racing write one transition (compare-and-swap).
3. **A failed read writes nothing.** The panel's reader turns a failed or malformed row into `unreadable`, never into a
   guessed launch.
4. **Precision** is one tick plus the switch's 10-second snapshot
   (`simple-journey-switch.ts`: `JOURNEY_SWITCH_MAX_AGE_MS`).
   Windows work on whole days, and the launch day is excluded.

**Gates.** `test:journey-launch` on memory and PostgreSQL, with these cases:
- the first observation;
- a move to ACTIVE;
- a rollback and its return;
- a race between two containers that writes one row;
- an older build ignored;
- a malformed row read as unreadable;
- the audit row.

Also its red twin; `test:multi-container` and the suites that read `lifecycle.ts` (`multi-container.test.mts` and the
others the build greps); `test:red-anchors`.

**Served bytes for a classic viewer.** None.

**Done when.** On both stores, the record holds exactly the moves the cases make, and the plants are caught.

### WP3 — The harm watch's daily count (S; depends on WP0)

**Goal.** Give the compliance record's "watched next to the 'short balance → deposit' measure" something to compare. Once
per EAT day, the system counts the accounts flagged RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES by the same detector
Player Safety uses (`responsible-gambling.ts`:671-693).

**Files.**
- `src/lib/server/harm-watch.ts` (new):
  - `snapshotHarmMarkers(now)` runs once per EAT day after 03:00 EAT, leader only, idempotent by day;
  - the candidates are accounts with a CONFIRMED deposit created in the last 8 days. No other account can carry either
    marker: RAPID_DEPOSIT_ESCALATION needs a confirmed deposit created in the last 24 hours (:735-760), and
    CHASING_LOSSES one in the last 7 days (:762, :797-798). The eighth day is a margin;
  - `detectHarmMarkers(userId)` runs unchanged for each candidate;
  - the counts go to the `SystemConfig` row `journey.harm.daily` (`{day, rapidDeposit, chasingLosses, scanned}`, at most
    400 entries);
  - `harmWatchSeries(days)` reads them back.
- `src/lib/server/lifecycle.ts`: one daily chore line.
- `scripts/ops-prelaunch-reset.mts`: classify the key (dropped).
- `scripts/harm-watch.test.mts` (new; two stores) and its red twin.
- `docs/DATA-RETENTION.md`: a row.

**Steps.**
1. **One detector, unchanged.** The snapshot never adds a marker, and never excludes or splits an account: D20a and D20d
   (`COMPLIANCE-DECISIONS.md`:2964, :2967) keep the detector's population as it is.
2. **Prove the candidate set loses nothing.** On fixtures, the candidate count equals the count from a full walk of every
   user, and a plant that narrows 8 days to 7 fails.
3. **Keep the lifecycle tick on time.** The snapshot runs with a time ceiling and records "not counted today" if it
   overruns. A day with no snapshot is "not counted", never 0.

**Gates.** `test:harm-watch` on memory and PostgreSQL, and its red twin; the suites that read `lifecycle.ts` and
`responsible-gambling.ts`.

**Served bytes for a classic viewer.** None.

**Done when.** The daily count equals Player Safety's on the same fixtures, on both stores, and the plants are caught.

### WP4 — The counters, corrected (S; depends on WP0 and S10 merged)

**Goal.** Make the new journey's pairs nest by construction (Corrections 14 and 15) without changing what the old
journey counted during the baseline (Open point 6).

**Files.**
- `src/lib/journey/funnel.ts`: `sheet_open` allows `home_repeat`.
- `src/lib/journey/funnel-home.ts` (new, pure): `homeOpenOrigin(state, origin)`. The first `home` open in a home-page
  view stays `home`; any later one is `home_repeat`. The state resets when the pathname becomes "/" (a new view, the
  visit counter's rule, `site-visit-beacon.tsx`:14, :22-35).
- `src/components/journey/bet-sheet/bet-sheet-host.tsx`: the per-view state and one call in `open()` (:258-270).
- `src/app/markets/actions.ts` and `src/lib/server/journey-funnel.ts`: the action reads the request's `user-agent`
  synchronously and passes it on. `countBetFunnel` skips it when `isAutomatedAgent` or `HeadlessChrome|Playwright`
  says so, exactly as the beacon and `/api/funnel` do.
- `scripts/journey-funnel.test.mts`:
  - §8: the census admits `home_repeat` and the helper is pinned;
  - §9: an automated agent's bet is not counted and a phone's is;
  - plants for each.

**Steps.**
1. **The helper is pure and tested by itself.** The host keeps the state in a ref, never in storage, so §4h's "the
   beacon keeps only kp-utm" holds (`privacy-notice.test.mts`:721-722).
2. **The old journey's calls are untouched** (Open point 6). Its counts already nest for home opens (one per market page
   from a home link). The dial's repeated bets stay counted as recorded since 2026-10-01, and the definitions disclose
   it.
3. **The returned bet.** If S9 counts it as `deposit_return`, measure 2 already includes it (WP1). If S9 counts it as
   `sheet`, nothing changes. No change is made here.

**Gates.** `test:journey-funnel` and `red:journey-funnel` (the plant count rises); `test:privacy-notice` §4h;
`test:journey-shell` and the suites that read `bet-sheet-host.tsx` (the S8/S9/S10 battery: `test:bet-sheet` and its
red); `test:red-anchors`.

**Served bytes for a classic viewer.**
- `funnel.ts` (in the beacon's chunk on every page): one string longer.
- The host's lazy chunk: journey readers only.
- No markup. Parity at the session close proves it.

**Done when.** The suites are green with every plant caught, and two opens from one home-page view send `home` then
`home_repeat` (proved in process here; driven in WP9).

### WP5 — The reads: an inline DAL on both stores (M; depends on WP1 and S9 merged)

**Goal.** Every number the view needs comes from a narrow, windowed read that gives the same answer on both stores.

**Files.**
- `src/lib/server/journey-measures-dal.ts` (new; Prisma when configured, memory otherwise):
  - `counterTotals(days)` (C);
  - `homeViewsByDay(days)` (V);
  - `shortfallDeposits(from, to)` (R1);
  - `depositsWithFollowUp(from, to)` (R2);
  - `returnedBets(users, from, to)` (R3);
  - `joinedPlayers(from, to)` (R4);
  - `depositOutcomesByDay(from, to)` (W);
  - `campaignVisits(days)` (`SiteVisitSource`).
- `src/lib/server/site-visits.ts`: `pathViewsByDay(path, fromDay, toDay)` in both twins (Correction 10).
- `scripts/journey-measures.test.mts` and `scripts/lib/journey-measures-cases.mts` (new; `runTwoStores`); its red twin.
- `scripts/report-parity.test.mts` §4: add `journey-measures-dal.ts` and `journey-measures.ts` (:267-273).
- `package.json` keys.

**Steps.**
1. **Fixtures on both stores** hold a row on every boundary:
   - EAT midnight;
   - 30 minutes exactly and 30 minutes plus 1 ms;
   - 24 hours exactly;
   - `completedAt` NULL;
   - REVERSED and FAILED;
   - a marked deposit and a marked position;
   - a staff depositor, and an AGENT;
   - S9 envelopes: question, round, null and malformed;
   - two deposits before one returned bet (the one-to-one rule);
   - a returned bet on another stake (no match);
   - campaign rows, and a tag with a character the funnel drops.
2. **Each read** is asserted against the fixture's own arithmetic, and the two stores against each other.
3. **The Prisma upsert under concurrency.** On PostgreSQL, N concurrent first bumps of one counter key must make N
   (`journey-funnel.ts`:58-62). If Prisma runs it as read-then-write and loses counts, the twin moves to one
   `INSERT … ON CONFLICT … DO UPDATE` (Risk 8).
4. **`EXPLAIN`** on the scratch PostgreSQL for R1–R4 and W, recorded in the commit.

**Gates.** `test:journey-measures` (memory and PostgreSQL; no PostgreSQL is a failure, not a skip) and its red twin;
`test:site-visits`; `test:report-parity`; `test:journey-funnel`; `verify:backup-schema` only if WP0 found S9's
migration not yet proven on this base.

**Served bytes for a classic viewer.** None.

**Done when.** Both stores agree on every case, the plants are caught, and no Prisma query lacks a window or an id
list.

### WP6 — The view: one model for the panel and the files, with the launch watch (M; depends on WP1, WP2, WP3, WP5)

**Goal.** One function, `journeyMeasuresView`, produces everything the panel and the three files print. A screen and a
file made at one instant therefore cannot disagree.

**Files.**
- `src/lib/server/journey-measures.ts` (new): `journeyMeasuresView({ now, campaign, period })`. It returns:
  - the launch state, from WP2's record;
  - each measure's cells for before, after 7/14/28, the week and since launch;
  - the campaign table;
  - the definitions (from WP1);
  - the agency schedule;
  - the launch watch: rollback figures (Open point 20) and the harm series (WP3) when the caller may see it;
  - every source's read state.

  The result is memoised for 60 seconds per (campaign, period), as `getInsights` is (`insights.ts`).
- `src/lib/server/journey-funnel-report.ts`: retired. Its one importer is the S3b card (Correction 7), and
  `test:journey-funnel` §10 moves to the new suites.
- `scripts/journey-measures-view.test.mts` (new; in process, memory) and its red twin.

**Steps.**
1. **Compose without computing.** Every figure comes from WP1's `cellFor` over WP5's reads. The view never writes
   `?? 0` on a figure: a failed read is `unreadable`, and the suite plants a thrown read in each source.
2. **The launch watch:**
   - bets per day, from C(`bet`, [dial, sheet, deposit_return]) for each day, with all bets (`quick` included) for
     context;
   - the confirm rate from W: confirmed ÷ (confirmed + failed); the undecided are shown, not counted;
   - the baseline is the before window's mean and rate;
   - the trigger lines are 70% for three consecutive full ACTIVE days, and 80% over the trailing three days;
   - display only: no alert and no switch (Open point 20).
3. **The harm series:** the before mean against each after day. Only for a caller holding compliance VIEW, decided by
   the caller and passed in. The view holds no session.

**Gates.** `test:journey-measures-view` with these cases:
- not launched;
- launched partial;
- full;
- a rollback day;
- a campaign;
- each source failing alone;
- a small sample;
- held at 100;
- no offer and not recorded;
- the trigger lines.

Also its red twin; `test:funnel-share`.

**Served bytes for a classic viewer.** None.

**Done when.** Every status in the table renders from a real case, and every plant is caught.

### WP7 — The panel on `/admin/insights` (L; depends on WP6)

**Goal.** The measures as an officer reads them, in the console's kit. It is honest in every state, and right at 360,
768, 1280 and 1920.

**Files.**
- `src/app/admin/insights/journey-funnel-card.tsx`: replaced in place by the measures card. The path stays, so the
  suites' pins move in the open. It holds:
  - the state line;
  - the table: Measure · Before (14 days) · After 7 · After 14 · After 28, each cell with its share, halves, status and
    change; one block per measure below `sm`, as S3b's drive found necessary (§0f :3675-3677);
  - the reference row (Up & Down and other shortfall deposits, counts only);
  - "How each measure is counted" (the definitions);
  - the agency report block.
- `src/app/admin/insights/measures-rail.tsx` (new): the campaign rail, `FilterPill` at the dense rank, hrefs built on the
  server. It is declared in `filter-language`'s `ADMIN_SURFACES` in the same commit (`filter-language.test.mts`:253).
- `src/app/admin/insights/launch-watch-card.tsx` (new): the rollback figures, and the harm rows for compliance VIEW only.
- `src/app/admin/insights/measures-export-buttons.tsx` (new, client): PDF · Excel · CSV for the due period. It is made
  of the same kit parts and behaves as `TaxExportButtons` does (`tax/export-buttons.tsx`), and is not `GenerateButton`
  (which is pinned to two formats).
- `src/app/admin/insights/page.tsx`: the params (`jfc` kept for the campaign; `jf` retired) and the two mounts, after
  the access check.
- `src/app/admin/insights/loading.tsx`: the ghost gains the measures card's shape.
- `scripts/journey-measures-page.test.mts` (new; source level, each check with a planted control, as
  `tax-report-page.test.mts` does) and its red twin.

**Steps.**
1. **Kit only:**
   - `AdminCard` (title plus Swahili);
   - `admin-tbl` in `ScrollX`;
   - figures in mono with tabular numerals (§T);
   - links blue (§B4c);
   - no gold (§M3);
   - the rollback trigger state in the warning family (`--warning-*`, R8-A's amber), never claret or danger;
   - changes in neutral ink.
2. **Words.** English body, a Swahili pair on every heading ("Admin words" below), and no house word.
3. **A failure is contained.** A failed source says "could not be read" in its own cell, and the rest of the card and
   page render (S3b's rule, `journey-funnel-card.tsx`:56-62).
4. **The harm rows render only for compliance VIEW.** For anyone else the card renders no row and no hint.

**Gates.**
- `test:journey-measures-page` and its red;
- `test:filter-language` (declared) and `red:filter-language`;
- `test:house-bot-surfaces` (§1 words, §2 shapes, §3 one-hop painters);
- the suites that read the changed files: `test:insights`, `test:admin-section-gate` (needs a server), `test:contrast`,
  `test:tap-target`, `test:type-scale`, `test:dead-css`, `test:measure`;
- `test:red-anchors`.

Tiles come in WP9.

**Served bytes for a classic viewer.** None (admin only).

**Done when.** The page suite is green with every control caught, and every state renders on a local server (WP9
reads the tiles).

### WP8 — The document and its export route (L; depends on WP6)

**Goal.** The agency's weekly file in three formats, made by the existing machinery from the same view the panel
prints. It states the window it read, and it is never released without its audit row.

**Files.**
- `src/lib/server/journey-measures-doc.ts` (new):
  - `buildJourneyMeasuresDocument(view, opts)` → `Report`, which holds:
    - title "50pick — Simplified Journey measures";
    - subtitle: the period (baseline, week k of 8, or month);
    - classification "Confidential";
    - an EAT reference and the period statement in `meta.period`;
    - a summary of the five measures for the period;
    - sections: Before and after · This period · By campaign · How each measure is counted;
    - the notes: exclusions, EAT days, the launch day excluded, the counting start, small samples, "a change says what
      moved, not why";
  - `buildJourneyMeasuresCsv(view, opts)`: one long table (Section · Measure · Period · From · To · Days · Numerator ·
    Denominator · Percent · Status · Note), through `csvCell`, `CSV_BOM` and `CSV_EOL`;
  - `documentFilename` with the EAT date (`reportFilename` takes only xlsx|pdf, `brand.ts`:90).
- `src/app/api/admin/journey-measures/export/route.ts` (new):
  `?format=pdf|xlsx|csv&period=baseline|week|month&week=YYYY-MM-DD&month=YYYY-MM&campaign=…`.
  - The tax route's gates.
  - A refusal, never a substitute, for an unreadable or future period (the reports route's rule, `route.ts`:75-79,
    :109-122).
  - The audit row `journey_measures.exported` (window, format, reference, size, campaign) is awaited and checked before
    the first byte.
  - `no-store`.
- `scripts/journey-measures-export.test.mts` (new; in process) and its red twin.

**Steps.**
1. **Build, render, read back.** ExcelJS reads the workbook's cells, `findPdfOverflows` must be empty, and the CSV is
   parsed back: BOM, CRLF, every cell quoted, and a campaign named `-x` or `=x` guarded.
2. **Window truth, by the report-window-truth method.** Record the bounds every WP5 read was handed, and compare them
   with `measureWindows` and with the EAT dates the document prints. Three derivations of one window must agree. Run
   under a zone that is neither UTC nor EAT.
3. **The house-word scan.** Run `HOUSE_WORD_SOURCE` over all three files' extracted text, because the definitions
   module is two hops from the route and `test:house-bot-surfaces` reads one hop only (its 6.gap.1).
4. **The route's source-level checks**, each with a control: role, 2FA, same-origin, audit before release, a period
   refused not substituted, `houseBotId` absent from the route file.

**Gates.** `test:journey-measures-export` and its red; `test:report-formats` and `qa:report-renderers` stay as they are
(nothing of theirs moves); `test:house-bot-surfaces`; `test:red-anchors`.

**Served bytes for a classic viewer.** None.

**Done when.** The three files read back exactly what the view holds, the window is the same three ways, and every plant
is caught.

### WP9 — The drive: a seed, the tiles, the downloads (M; depends on WP7, WP8)

**Goal.** See the panel and the files in a real browser in every state, and download the files the way an officer does.

**Files.**
- `src/app/api/dev-test/journey-measures-seed/route.ts` (new). It refuses in production before its first await
  (`test:cert-devroutes`, `dev-route-guard.test.mts`). It seeds counter days, visit days, players, deposits and positions
  (unmarked only), and a launch record with a simulated launch and one rollback day. It holds no house rows: the
  two-store suites prove exclusion, so the dev route needs no exemption.
- `scripts/qa/journey-measures-drive.mjs` (new): localhost only, as `report-renderers-smoke.mjs`:29-33.
- `package.json`: `qa:journey-measures`.

**Steps.**
1. **One local in-memory server** with `DISABLE_ADMIN_TOTP=true`, an admin seeded through `/api/dev-test/seed-admin`.
   Each state is seeded by the new route, and each cell asserts its premise first: a failed premise is INVALID, never
   PASS.
   - WP2's observer keeps running on that server, so a seeded launch record must end in the state the server reports.
     The launched states run on a server started with `FEATURE_SIMPLEJOURNEY=ACTIVE`, and their seeded record ends in
     ACTIVE (a rollback is seeded as an interruption that returns to ACTIVE). The not-launched state runs on a fresh
     server with the shipped ceiling and no seeded record.
2. **Tiles** at 360, 768, 1280 and 1920 for each state, each read one by one:
   - not launched;
   - launched partial;
   - full 28 days;
   - a rollback;
   - a campaign chosen;
   - one source failing;
   - a small sample;
   - held at 100;
   - the harm rows as COMPLIANCE, and their absence as FINANCE.
3. **Downloads:**
   - the three formats for the baseline and for one week: status, content type, magic bytes and the filename's EAT
     date;
   - refusals: an unreadable period → 400, a future week → 400, anonymous → 401/307, a MODERATOR → 403, a cross-site
     request → 403;
   - the PDF's pages rasterised (`scripts/rasterize-pdfs-for-audit.mjs`) and read.
4. **The counter correction in a browser.** Two sheets opened from one home-page view arrive at `/api/funnel` as `home`
   then `home_repeat`. The drive's browser carries a normal agent and a staff-free session, because the beacon skips
   automation and staff (§0f :3672-3673).
5. **A red control, page only:** a stylesheet plant that pushes the table off the card at 360 must fail the fit check.

**Gates.** The drive and its red control; `test:cert-devroutes`; `test:orphans`; `test:docs`.

**Served bytes for a classic viewer.** None (the dev route is dead in production).

**Done when.** Every cell passes or is listed INVALID with its reason, every tile and PDF page has been read, and the
red control fails its plant.

### WP10 — Proof, records, merge, deploy (M; depends on all)

**Goal.** Prove S13 against its promise, ship it, and close the records.

**Steps.**
1. **The battery,** by the session law (VODACOM-PLAN.md:389-420):
   - `test:all` with the database suites;
   - `test:red-anchors`;
   - every red S13 added or touched, file-mutating ones alone with `git diff` clean after each.
2. **Two stores:** `test:journey-launch`, `test:harm-watch` and `test:journey-measures` on memory and PostgreSQL.
3. **Classic parity** at the last live main, plus one compare. The expected difference is none in markup: WP4's bytes
   are JS only.
4. **An adversarial review** of the change before its commit, the honesty lens first:
   - a made-up figure;
   - a ratio over the whole;
   - a window that states one thing and reads another;
   - a house word in a file;
   - a person in an aggregate.
5. **Records:**
   - §3.10 rewritten to point at the definitions module (the table stays readable, its text the module's);
   - §5 S13, S15 (the rollback lines point at the watch) and S16 ("in bounds" left to Ali, Point 12);
   - the S13 section and §1 row;
   - a COMPLIANCE-DECISIONS entry: what leaves 50pick in the agency file (aggregates, no person, no amount), its
     wording, and the D20a decision Ali takes (Point 1);
   - the DATA-RETENTION rows;
   - an annotation in AGENCY-REPLY (Point 2);
   - memory.
6. **Merge, push and read back:**
   - `?dpl=` on both hosts, health, the first-load chunks, and production `qa:live`;
   - read-only: the launch record's first observation and the harm count's first day (`railway run`, a READ ONLY
     session, as `qa-journey-funnel.cjs`:12-16 does; extended to print both).

**Done when (S13), as Open point 2 proposes:**
- **Locally, on memory and PostgreSQL**, with a seeded baseline and a simulated launch: the panel and the three files
  show the baseline and 7/14/28 days after, with every status in the table. The tiles and the PDF pages have been read,
  and the suites and their reds are green.
- **On production:**
  - the launch record holds its first observation ("observed since …"), and the harm count its first day;
  - the export route refuses signed-out and player requests;
  - Ali, the only login that can open the console there, sees "Baseline … · Not launched" on `/admin/insights`
    (Point for Ali 13).
- **The definitions and a baseline report are ready for Ali to send.** The first weekly report is S15's first Monday.

Only then is S13 ✅.

---

## Admin words (English · Swahili draft)

The body text stays English, as on the console's other cards. Each heading carries its Swahili pair. The drafts below are
signed off in `S4-COPY-AUDIT.md` by the build session, as the Swahili reviewer (§0h point 3). The measure names are the
agency's own.

| English | Swahili (draft) |
|---|---|
| Journey measures | Vipimo vya safari |
| Before launch | Kabla ya uzinduzi |
| After launch | Baada ya uzinduzi |
| Not launched | Bado haijazinduliwa |
| How each measure is counted | Jinsi kila kipimo kinavyohesabiwa |
| By campaign | Kwa kampeni |
| Agency report | Ripoti kwa wakala |
| Launch watch | Ufuatiliaji wa uzinduzi |
| Harm markers | Viashiria vya madhara |
| Home → bet sheet | Nyumbani → fomu ya dau |
| Bet sheet → bet placed | Fomu ya dau → dau limewekwa |
| Short balance → deposit | Salio halitoshi → kuweka pesa |
| Deposit → bet completed | Kuweka pesa → dau limekamilika |
| Time to first bet | Muda hadi dau la kwanza |

---

## Risks

1. **A made-up number on an owner screen, or in a file that leaves the company.** One status vocabulary (WP1), no
   `?? 0` on a figure (WP6, WP7), plants for each source failing, and a file read back after it is rendered (WP8).
2. **A pair that two counters feed** can pass 100% through a lost count. It is held at 100% and marked, and both halves
   are printed (E-103). Measures 4, 4b and 5 read rows only and cannot pass it.
3. **D19 and D20a.** A house word on the panel or in a file would disclose a programme that is never public; counting
   or not counting marked stakes is Ali's call (Point 1). This is guarded by `test:house-bot-surfaces` and by WP8's scan
   of the rendered files.
4. **Before vs after is an association, not a cause.** Campaigns, a holiday, a big match and the guest sheet's wider
   door all move these numbers. The definitions say so, and the change carries no colour.
5. **Small numbers.** The baseline has about one home-page sheet open a day (§0f :3690-3692). Early "after" weeks will
   be small too, so the "small sample" label is shown and Ali's note to the agency should repeat it.
6. **Whole-table reads on the console.** The inline DAL is windowed, `test:report-parity` §4 names its files, and the
   PostgreSQL child records the client calls.
7. **The launch record during a deploy.** Two builds may disagree for up to a minute. Observations from an older
   process are ignored, the launch day is excluded anyway, and WP2's race and old-build cases prove it.
8. **Lost counts under concurrency.** Prisma's upsert may run as read-then-write (`journey-funnel.ts`:58-62). WP5
   measures it and moves to one SQL statement if counts are lost.
9. **The harm snapshot's cost** on the lifecycle tick. It reads only the candidates with a recent deposit, has a time
   ceiling, and records a skipped day as "not counted".
10. **S9's records.** Measure 4 reads S9's envelope and `Position.origin`. If S9 changes either, WP5's parser is S9's own
    function, so it follows. If S9 has not landed, measure 4 shows "not recorded" and WP0 says so.
11. **Shared files.** S9 and S10 edit `bet-sheet-host.tsx` and `markets/actions.ts`, and other lanes edit
    `lifecycle.ts`, `site-visits.ts` (growth), `filter-language.test.mts` and `report-parity.test.mts`. WP0 re-reads,
    WP4 waits for S10, and the merge reruns the suites that read each file.
12. **Retention.** Counter and visit totals are pruned after 400 days, so the baseline disappears from the panel in
    about November 2027. The status says "older than 400 days" (Open point 24).
13. **EAT, not UTC.** Every window, reference and filename uses the EAT day. The suites run in a zone that is neither
    UTC nor EAT; on Windows the zone is set inside the script, not on the command line (`report-window-truth.test.mts`
    :33-41).
14. **CSV formula injection.** Campaign tags come from URLs, so every cell goes through `csvCell`'s guard.
15. **The QA player on production** is an ordinary player account (`pre-deploy-live-check.mjs`:669-674). It is unfunded,
    so it cannot deposit or bet. If S15's "real deposit → back → bet" re-measure runs on the launch day, that day is
    counted on neither side (Open point 25).
16. **Tailwind scans comments, and editors eat backslashes** (S7-PLAN Risk 16). New files' comments carry no
    class-shaped strings.

## Open points → §0h

Each is a call taken under Ali's delegation, filed as a numbered §0h point by WP0, with its overrule.

1. **S13's row reads wait for S9 on main;** WP1–WP4 do not. WP4 also waits for S10's edits to the sheet host.
   Overrule: wait for S12's close before any S13 package.
2. **Done-when.**
   - Proven locally on both stores with a simulated launch.
   - On production, the baseline, the launch record and the refusals.
   - The definitions and a baseline report ready for Ali.
   - The first real "after" and the first weekly report are S15's.

   Overrule: S13 closes only after seven real days after launch.
3. **Before is the 14 full days before the launch day.** The launch day counts on neither side, and after N is the
   first N wholly ACTIVE days. Overrule: a before window as long as each after window (7/14/28).
4. **The launch is recorded by the system** (WP2: a lifecycle observer and a `SystemConfig` record, audited).
   Overrule: Ali or S15 records the moment by hand.
5. **Home → bet sheet's denominator is the visit counter's "/" views** (everyone, staff included), and its numerator is
   one `home` open per view (WP4). Overrule: a new player-only home-view step, which needs a privacy-notice version bump
   in en/sw/zh and starts this measure's 14 days again.
6. **The old dial's repeated bets stay counted as they have been since 2026-10-01**, and the definitions disclose that
   the before figure can only overstate. Overrule: count the dial's first bet per open from now, and restart the
   baseline that day.
7. **Short balance → deposit is for questions.**
   - Before launch it prints "no deposit was offered", with the notices counted.
   - Up & Down's notices and deposits appear only as counts, in a reference row on the internal panel.

   Overrule: one row mixing questions and Up & Down from the counters alone.
8. **Deposit → bet is two rows.** The bet the deposit was made for (after launch only, matched one-to-one), and any bet
   within 30 minutes (both periods, the comparison). Overrule: one of the two only.
9. **Time to first bet counts new players whose first 24 hours have passed:** the share who bet within 24 hours, and
   the median among them. Overrule: 7 days (each figure a week later), or S3b's median over any time.
10. **Only "bet sheet → bet placed" splits by campaign.** The others print "not split by campaign", and a campaign table
    gives counts. Overrule: carry the campaign onto the deposit row (a person's money row, so a privacy change);
    refused by default.
11. **One decimal everywhere,** matching the renderers. Overrule: whole numbers, with the document writing text cells.
12. **Under 30 in the denominator reads "small sample".** Overrule: another threshold, or none.
13. **The exclusions:**
    - players are non-staff roles at read time, AGENT included;
    - staff, previews and automation are left out by the counters, and now the server's bet too;
    - marked stakes are outside the measures, never named (Point 1).

    Overrule: by Point 1.
14. **The export has its own route** (pdf, xlsx, csv; the tax precedent), and the catalogue route and its pins are
    untouched. Overrule: join the catalogue as xlsx and pdf only, with no CSV.
15. **PDF, Excel and CSV,** all from one view. Overrule: PDF and CSV only.
16. **The weekly report covers Monday–Sunday EAT.** The first Monday may be a short launch week; there are 8 Mondays;
    then the previous calendar month on the first Monday after it ends. Overrule: 7-day blocks counted from the launch,
    or 4-week blocks.
17. **The platform never sends to the agency.** Downloads are audited and listed by date and format, with no names.
    Overrule: a Monday reminder in the Owner's bell, or a "mark as sent" record.
18. **The panel is for accounting VIEW** (ADMIN, FINANCE, COMPLIANCE, AUDITOR), as `/admin/insights` is. Overrule: a
    growth-domain copy without money for GROWTH, for example on `/admin/traffic`.
19. **The harm watch.**
    - A daily count of accounts carrying the two markers, by Player Safety's own detector.
    - Kept 400 days, beside "short balance → deposit".
    - Compliance VIEW only, and never in a file.

    Overrule: current counts only, or shown to every insights viewer.
20. **S15's rollback triggers are built here as a display.**
    - Question bets per day against 70% of the before mean for three full days (all bets beside it for context).
    - The deposit confirm rate (confirmed ÷ decided) over the trailing three days against 80% of the before rate.
    - No alert, and no switch.

    Overrule: S15 builds them; all bets as the trigger; an Owner alert.
21. **S3b's card is replaced in place, and its report module is retired.** No SHELVED row: it is console code, not a
    player surface the journey takes out of use (ruling 6). Overrule: keep the S3b card beneath the new one until S16.
22. **No schema change:** the launch record and the harm series live in `SystemConfig`, classified in the prelaunch
    reset. Overrule: two aggregate tables, by hand-written migration.
23. **The definitions live once, in code.** §3.10 points at them, and the panel and files render them. Overrule: keep a
    copy in §3.10, pinned equal by a suite.
24. **The baseline is not frozen.** Each report recomputes from live data and says when. Overrule: freeze the before
    figures at the launch, which survives the 400-day pruning and keeps every weekly report's "before" identical.
25. **No QA-account exclusion list.** The QA player is unfunded, and a real re-measure belongs on the launch day.
    Overrule: an explicit list of QA accounts left out of every read.
26. **A baseline report** (before only, with the definitions) is offered before launch, so the agency can agree the
    definitions before S14's sign-off. Overrule: send nothing before launch.
27. **A day with no counter row at all, while the site had visits, is "not counted"**, never zero. Overrule: none
    proposed.
28. **The campaign rail is the kit's `FilterPill`** at the dense rank, declared in `filter-language`. Overrule: keep the
    plain links.
29. **Changes are in neutral ink, in percentage points.** No green or red for better or worse, and no gold. Overrule:
    none proposed (§B2a and §M3).
30. **One 30-minute constant,** S9's `DEPOSIT_RETURN_WINDOW_MS`. Overrule: none proposed.

## Points for Ali

1. [Corrections 5, Open point 13] **Should stakes placed from the platform's own accounts count in these measures?**
   - Your ruling D20 (17 September) says every admin figure treats those accounts like any player's, with nothing left
     out.
   - The Vodacom plan (29 September) and the note to the agency say they are left out, and the baseline has been
     counted that way since 1 October.
   - The measures describe what people did in the new journey, and those stakes never pass through it. Counting them
     would show "a bet after a deposit" when the person placed none.
   - Our proposal: leave them out of these five measures only, never say so on any screen or in any file, and record
     your choice in the compliance log.

   Overrule: count them, as D20 says.
2. [Correction 6] **The draft reply to the agency says two things we should change before the first report.**
   - It says the figures exclude "our own liquidity activity". That phrase names something your ruling D19 keeps
     private. The reports will say only "players only: staff, previews and automated visits are not counted".
   - It says the figures "can be split by campaign". Only "bet sheet → bet placed" can be split, because home-page
     visits and deposits carry no campaign tag.

   If the reply has not gone, change those two lines before sending it. If it has gone, the first report's notes say it
   plainly.
3. [Open points 3, 4] **"Before" is the 14 days before launch day; "after" is 7, 14 and 28 days after it.** Launch day
   itself is counted on neither side. The system records the launch moment by itself, so nobody has to note it.
4. [Open point 7] **"Short balance → deposit" has no "before" figure on questions.** The old bet dial never offered a
   deposit when money was short. The report says so instead of showing 0%.
5. [Open point 9] **"Time to first bet" looks at new players' first 24 hours:** how many placed a first bet, and how
   long it typically took. Overrule: look at their first 7 days, which means each figure arrives a week later.
6. [Open points 16, 17, 26] **Every Monday the Insights page shows which report is due.**
   - You download the PDF (and the CSV if they want the numbers) and email it to the agency yourself. Nothing is sent
     automatically.
   - Before launch you can already send them a "baseline" report with the definitions, so they agree how each measure
     is counted before they sign off.
7. [Open point 18] **Who sees the measures:** you, Finance, Compliance and Auditor. Overrule: also your Growth officers,
   on a page without money figures.
8. [Open point 19] **The warning signs of harm** (several deposits in an hour, top-ups right after betting) are counted
   once a day. They are shown beside "short balance → deposit" to you, Compliance and Auditor, and never sent to the
   agency.
9. [Open point 20] **The launch watch shows the figures behind S15's rollback rules:** bets per day, and the share of
   deposits that go through. Nothing switches off by itself, and no alert is sent.
10. [Open point 6] **Before launch, one bet dial could take several bets, and each was counted.** We keep it that way,
    so the 14 days before launch are counted one way only. It can only make "before" look better than it was.
11. [Open point 5] **Home-page visits include staff, and visitors who had to sign in before a bet slip could open.** We
    keep the full visit count so a "before" figure exists; it makes "before" look lower. Overrule: count only players'
    home visits from now, which needs a privacy-notice update and starts that measure's 14 days again.
12. **S16 says "the measures in bounds", but nobody has said what the bounds are.** S13 does not invent them. Before
    S16, say what would count as "in bounds" — for example, "no measure more than 10 points below its before figure".
13. [Open point 2] **S13 is finished when everything is proven on test data and production shows the baseline.** After
    S13 goes live, please open Insights once and check the card reads "Baseline … · Not launched". Only your login can
    open it on production. The first real "after" figures come in the week after launch.
