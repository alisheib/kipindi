# Commit 5 re-planned under owner ruling D20 (2026-09-17)

> **Authority.** Owner ruling D20 (PROGRESS.md "OWNER RULING D20", `docs/COMPLIANCE-DECISIONS.md`) outranks `C5-SPEC.md`
> wherever they differ. D19 still binds everything. `C5-SPEC.md` stays the authority for every ruling this file KEEPS;
> a ruling this file STRIKES is never built, and where it was built it is un-built in checkpoint C5-5b.
> Re-planned by the eleventh session (OMEGA-COMPILE01), 2026-09-17 ~15:10 UTC, at `2033383b`.

## 1. D20 in one paragraph

Ali, 2026-09-17: *"why all of this? aren't the bots real users' accounts? I don't want this. Keep them in reports as
normal players."* Asked with options, he chose **"normal players everywhere"** for reports and **dropped every admin-only
house tool** (the private monthly house report, the staff-edge alert, the house lines on admin screens, the internal
record). So: every report, statutory filing, admin count, finance or insights figure and harm/AML detector treats a house
bot's account exactly like any player's account, and no report, CSV, memo, column, line, chip, tag or record names house
bots anywhere. What stays is what keeps D19 true (nothing reaches a player or the holder), money correctness, and what
Commit 7's console needs to CONTROL the bots.

**Accepted consequences (recorded for Ali, not re-asked):** statutory figures (GGR, levies, active and unique players,
top contributors) include 50pick's own house stakes as player activity; the harm and AML detectors can flag a bot account
like any player's, and an officer may raise an alert on a holder; the Gaming Board pack and the FIU report carry no house
memo or column (W21, W22 moot).

## 2. Ruling by ruling

| Rulings | What | D20 | Where it stands |
|---|---|---|---|
| 168–175 | D19 defects: releasable doors, own audit reads, `/api/health`, engine health, money idempotency probes, client-bundle law, vocabulary | **KEEP** | ✅ built (steps 1–2) |
| 176 | `test:house-bot-reports` suite | **KEEP** (it holds the D19 absence, gate and money proofs) | ✅ |
| 177–186 | Readers, DAL twins, book, entry split, fee, stake snapshot, exposure, EAT month, audit window, shared homes | **KEEP only what a remaining caller or Commit 7's approved scope uses; STRIKE the rest** (C5-5b decides member by member) | ✅ built (step 3) |
| 187–191 | R9 `houseStake` in decision audits, bulk `houseStakes`, reads before audit | **STRIKE** | built (step 4) → un-build |
| 192–194, 196, 198 | R2 house lines on admin screens, dialog slots, bulk count, row tag, held-chip titles | **STRIKE** (198's "no player surface changes" becomes moot with the modules gone) | built (step 5) → un-build |
| 195 | Emergency-void admin bell/letter house share | **STRIKE** | built (step 4) → un-build |
| 197 | KYC "of which house stakes" line and `kycMoneyFacts.house*` | **STRIKE** | built (steps 4–5) → un-build |
| 199–213 | R1 house-liquidity report, statement, R7 index, month picker, transactions CSV `house` filter + `house_bot_id`, owner-only per-bot CSV | **STRIKE** (211 and 212 stay RECORDED as platform defects L26/L27, no longer tied to a house column) | not built |
| 214–216 | R8: report pack and RG engagement read the durable audit table; "do not sign" state | **KEEP** (report completeness under house audit volume; bots-as-players reports must still be complete) | not built → C5-6 |
| 217 | Every new assertion gets a mutation; no new `red:` key | **KEEP** | — |
| 218–223 | Staff-edge alert and R1 flag | **STRIKE** | not built |
| 224–231, 233–234 | §9 splits: `MoneySummary.house`, GBT memo, FIU Context, match-integrity house parts, harm/AML exclusions, compliance holder chip, `/admin/house` marker card, finance/insights tiles and exclusions, `leaderboard({excludeHouse})` + reward walker, D6 pin | **STRIKE** (no report code changes, so class A/D stay main's code by construction; the "no reward on house stakes" rule is already built in the money seam and recorded in the docs) | not built |
| 232 | Every positioned transaction write copies the marker from the right object (static pin) | **KEEP** (marker integrity: caps, exports, idempotency) | not built → C5-7 |
| 235 | Up & Down digest: house split struck; F6's email rule through `channelAllowed` | **KEEP the F6 email half only** (verify whether built; if not, C5-7) | check in C5-7 |
| 236–238, 240–242, 246 | R5 owner-only internal record, events, officer page transaction read, S7 chip, row tag, crowd-out record | **STRIKE** (the officer's DSAR view carries no house section at all — 168/169 already) | not built |
| 239 | Trigger players: nothing in their doors | **KEEP the absence half** (in C5-7's sweep); the internal-record half is struck | → C5-7 |
| 243, 247–250 | dsar-secrets absence, service sweep, served layer, W23 chip, struck-id coverage | **KEEP** (+ D20's struck ids in 250's coverage) | → C5-7 |
| 244–245 | Erasure: six house buckets, live-bot refusal, closure removes the bot | **KEEP** | → C5-6 |
| 251–253, 257–258 | Render method, closing gates, nothing holder-facing, known gaps, docs | **KEEP** (docs now say D20) | → C5-8 |
| 254–256 | Later-commit debts (R2 overview split / CAP_EXPOSURE amount, owed items, reward SQL) | **STRIKE** the R2 overview split and the reward SQL; the CAP_EXPOSURE amount is re-decided at Commit 7's rulings | — |
| 259–260 | Console gate: a layout is not a gate; every house read and every audit row a console surface renders goes through `house-console-read.ts`; `qa:house-bot-console-probe` | **KEEP** the audience + audit gate and the probe (house audit rows from Commits 3–4 exist regardless); **STRIKE** `houseStakeForConsole` / `houseBotLabelsForConsole` with the display | built (step 5 close) |
| 261–262 | R2 bulk words; 196's proof substitution | **STRIKE** with the display | recorded only |
| 263 | The three R2 phrasings in the absence vocabulary | **KEEP** (the words stay needles: absence protection only widens) | ✅ |

## 3. The new checkpoints (each: one `c5-step-fast` run, build → review lenses → fix, record in RESUME AT, push)

- **C5-5 close** — 🟡 the running fixer (`wf_c2cd11aa-ef0`), told D20 at 15:02 UTC: finish the gate findings, skip the
  display polish, write `plans/house-bots/tools/c5-s5-mutations.json` with only surviving code's mutations.
  **Exit:** pushed, reports green on both stores, `qa:house-bot-console-probe` 0 non-staff hits with its ADMIN control.
- **C5-5b · D20 un-build** — with rulings 265, 266 (the fee derivation), 270, 271 and 273 (a) (§5) — remove rulings 187–197's code (R9 payloads and reads, the emergency-void house share in bell,
  letter and `qa:cert-c1`, the KYC house facts and line, `exposure-copy.ts`, `exposure-line.tsx`, the held-chip and bulk
  count changes, the row tag, the dialog slots, `houseStakeForConsole`, `houseBotLabelsForConsole`), every step-3 module,
  DAL member (both twins + its `test:dal-parity` case) and case whose only consumers were struck — kept only with a named
  remaining caller or a cited Commit 7 scope line — and the reports cases and §0 pins of struck rulings; guards moved by
  those rulings moved back honestly (re-anchor to the same defect, never weaken). The two-store floors of
  `test:house-bot-reports` drop to the measured counts under this ruling, with every removed case named in the commit.
  **Exit:** `git diff origin/main --` each touched admin page, component, notifier, email template and `kyc-risk.ts` shows
  only ruling 259/260 gate lines (or nothing); tsc 0; reports, money, engine, designation, info-edge, seam, rules,
  dal-parity, cert-c1, cert-c3, kyc-copy-truth, bulk-resolve + `red:bulk-resolve`, read-tiers, red-anchors, labels,
  disclosure green or inherited-red only; fresh build + `verify:house-bot-bundle`; `qa:house-bot-console-probe` 0; each
  un-built admin surface rendered once at 1280 and 360 on the house fixture and READ (it must look like main's); the
  emergency-void bell and letter read with no house row. Mutation list: only pins that guard the un-build (for example a
  planted `houseStake` key on a decision audit is reported).
- **C5-6 · R8 + R6** — rulings 214–216 and 244–245 in one run. **Render:** the report pack card's danger state at 1280 and
  360; the RG engagement PDF's truncation sentence read. `test:report-parity`, `test:erasure`, `red:erasure` (three new
  mutations), engine 19.8b on both stores.
- **C5-7 · Absence sweep + served layer** — rulings 232, 235 (F6 email half), 239 (absence half), 243, 247–250 with D20's
  struck ids added to 250's coverage. `qa:house-bot-holder-view` extended to every viewer + the production-posture pass,
  `buildDsarBundle` through the leak check, `qa:house-bot-console-probe` folded into the served layer; every captured page
  read as tiles at 1280 and 360.
- **C5-8 · Closing gates** — rulings 251–253, 257–258 with D20 edits: merge `origin/main` first (check migrations; `origin/main` is `05ae425f` as of 15:35 UTC 2026-09-17: the AI-poll max-horizon removal,
  no new migration, a new top entry in `docs/COMPLIANCE-DECISIONS.md` — keep both entries); every `test:house-bot-*` suite on both stores; tsc;
  `test:all` here and in `F:/kipindi-old-build` compared red by red; fresh build + `verify:house-bot-bundle`;
  `qa:house-bot-holder-view` + `qa:house-bot-console-probe`; ONE mutation batch from a temporary worktree on its own
  scratch port covering ONLY mutations whose from-text still exists at HEAD (the 174 unrun step-3 mutations, `c5-s4`,
  `c5-s5`, and later lists — each struck mutation listed as removed with its code, never counted as run); the 3-lens
  review over the whole commit; `docs/HOUSE-BOTS.md` (reports treat bots as players; no house report), C5-SPEC banner,
  PROGRESS row ✅.

## 4. What D20 changes in later commits (for their spec sessions)

- **Commit 6 (non-disclosure):** unchanged in shape (private Board draft, chatbot guard D19d, docs, absence suite). The
  draft must say reports and filings treat house accounts as ordinary player accounts and carry no house memo.
- **Commit 7 (console, the navbar link)** — see also rulings 264–266, 271 below: the console CONTROLS bots — designate, rules and limits, Start/pause, kill
  switch, Enter now and targets, engine health, the action feed, cap usage. **Struck:** the R2 overview exposure split
  (L39), the staff-edge href test (L38), R1 (e)'s two-admin flag (L35), the per-bot CSV and internal-record writers (L48).
  **Default for its rulings:** no results/P&L report, CSV or per-market house line in the console beyond what a control
  needs (cap usage against its limit, the kill switch's held amount if 254's CAP_EXPOSURE is kept). L34 is closed as not a
  defect (bots are players in admin counts by D20).
- **Commit 8 (release):** L26/L27 stay platform defects for Ali but are no longer release preconditions (no house column
  ships); final docs (RULES §2.11, FLOWS §9, DATA-RETENTION, FAILURE-INVENTORY §7.1) follow D20.

## 5. Rulings taken while marking the plan (264–273, eleventh session, 2026-09-17)

The seven document editors and the critic of workflow `wf_fd0c8c88-0b5` raised questions D20 does not answer in words.
Each is decided here, inside D20's intent ("bots are normal players; no admin-only house tools; keep what controls the
bots and what keeps D19 true").

264. **The staff-stake-voided and staff-stake-self-decided admin alerts stay.** They are Commit 4's oversight alerts
     (`oversight.ts`, C4 rulings 29 and 79) about what STAFF did with a bot — an integrity control, like the other admin
     alerts about a bot's state — not a report, and not the staff-edge alert Ali dropped. PLAN §16b risks 15 and 20 keep
     them as their measure.
265. **The built staff-edge artefacts are un-built in C5-5b** (a writer with no reader is a control that lies — L14 and
     C4 ruling 153's precedent): `gStaffEdgeWinRatePts` / `gStaffEdgeNetTzs` (the undeployed house migration's columns and
     CHECKs, the schema, both DAL twins, `rules.ts` fields, `FIELD_META`, `CLEAR_EXEMPT`, the rules-suite pins and fixtures),
     `ALERT_KEY.staffEdge`, `STAFF_EDGE_MIN_SETTLED` and `houseStaffScorecard`. Re-run `test:house-bot-migrations`,
     `test:dal-parity` and `test:house-bot-rules`. **W16 is moot.**
266. **Commit 7's console shows money only as usage against a configured limit.** A figure the bot's own controls need
     stays — today's loss against the daily loss cap, open exposure against the exposure cap, the kill switch's held amount
     if ruling 254's CAP_EXPOSURE figure is kept — written as "used X of Y". Struck from `03-design-spec.md` S1/S3 and PLAN
     §8: the lifetime and today "Book" card, "Today's net" as a results KPI, fee withheld, and the money tab's house chip on
     marked rows. The fee derivation (ruling 183) is therefore un-built in C5-5b unless another caller is measured.
267. **Accepted risk 13 (a staff selection edge) has no report or alert measure under D20.** Ali dropped both the R1
     scorecard and the staff-edge alert knowingly; the remaining controls are the staff-chosen caps, the voided and
     self-decided alerts (264) and every press's audit row. Recorded in D20d.
268. **Platform report-note defects that lived inside struck rulings 227 and 229 are recorded, not built:** the GBT pack's
     GGR note omits refunded stakes; the match-integrity report's stale "two-officer" note; the missing "Resolution path"
     column. They are `main`'s report code, which D20 leaves untouched on this branch — PROGRESS L57, for Ali.
269. **The export crowd-out stays recorded as a platform defect.** Ruling 242's record is struck, but under D20 a bot's
     stakes are the holder's own rows, so the player export's silent 1,000-row cap can still push a holder's own deposits
     out: L31 stays open (the internal-record half of W2 addendum 1 and all of addendum 2 are moot).
270. **An I10 pin survives R9's un-build.** Ruling 191's source pin (no refusal branch or page condition reads house or
     requester data) also guarded I10's "no officer-conflict lock"; C5-5b keeps it re-anchored to I10 — no decision
     control, refusal or page condition reads a house read or `requestedBy` — with its planted control.
271. **House audit actions with no writer leave the constants in C5-5b:** `exported` (both writers struck: 213, 236) and
     the house report action ids in `house-report-ids.ts` / `OWN_AUDIT_EXCLUDED_ACTIONS` (no house report exists; L54
     moot), each only after a grep proves no writer and no stored row on the branch's scratch data depends on it (rows
     already written keep their action name; the exclusion list keeps a name while any fixture or migration writes it).
     `reimbursement_recorded` (R1's optional owner action) is decided at Commit 7's rulings; default: not built (D3b, no
     payment feature).
272. **Register rows under D20:** W16 moot (265); W21, W22 moot; W2 addendum 2 moot; X9, X10, X11 moot (their surfaces are
     struck); X13 stays with a D20 note (a holder with a staff role still sees the console and the house audit rows through
     259/260's staff audience — Commit 7's rulings); L32, L45 struck; L36 stays (Commit 7's copy pass, without the KYC/R2
     comparison); L37 stays as a rule without a guard (the reward walker is struck; the first reward feature must exclude
     house stakes itself — the money rule is unchanged); L46 stays as an accepted D20 risk (no staff cue exists); L54 moot
     (271).
273. **D19's in-place marks are applied now, not at C5-8.** The plan documents never received them (PLAN, the scenario
     register, 04, 02/03's S8 and holder notices, C4-SPEC's digest split, HOUSE-BOTS.md's holder leftovers); workflow
     `wf_1694cc9f-878` marks them in place, so ruling 258's docs pass has only the code-facing docs left. Decided with it: (a) P1's disclosure tracking is struck everywhere it reaches — 04's N1/N2 Board-disclosure lines, C6's checklist and Commit 7's ON-modal "not recorded as sent" line — so the Commit 1 control columns `boardDisclosureSentAt` / `boardDisclosureSections` and the DAL writer `recordDisclosure` have no reader and no caller and are un-built in C5-5b with the staff-edge columns (265), and CRA-24 counts through the Board draft alone; (b) with no rule or Terms text changing (D19a), no Terms §10 notice is due, so the COMPLIANCE entry's waiver, its supersede row, W3 and the Board draft's "notice waiver" section are moot; (c) the admin house chip on `/admin/agents/[id]` (HB-ACC-24) and the "House stake" row chip in 03's transactions table are struck with D20's other chips and tags.

274. **`npx prisma generate` is permitted in `C:/kipindi-house-bots` for checkpoint C5-5b, and only there.** Ruling 265
     removes `gStaffEdgeWinRatePts` / `gStaffEdgeNetTzs` and ruling 273 (a) removes `boardDisclosureSentAt` /
     `boardDisclosureSections` from `prisma/schema.prisma` and the undeployed house migration, so the generated client
     must be regenerated or every DAL twin, `tsc` and every Postgres suite half reads a client that still has the columns
     (measured at the start of the twelfth session: `node_modules/.prisma/client/index.d.ts` carries 36 occurrences of
     `gStaffEdgeWinRatePts`). The standing rule against it exists to protect a parallel session's `node_modules`; Ali
     confirmed in Phase 0 that this is the only session on Ali-Blade15, and `prisma generate` writes only inside
     `node_modules/.prisma`, never the tracked tree. `npm ci`, `npm install` and `npm rebuild` stay forbidden. A later
     checkpoint that changes no schema field must not run it.

275. **Ali, 2026-09-17 ~20:50 UTC, in two messages: "repetiv ehting sno need procee dveeopment and eysbting then later
     we do dul test sesison" and "we need to si th eintial chekcs as we did but no nee dfor reotirv ethings make
     develop,etm adn etsginrpeiroty."** The **initial** check of a change stays exactly as it has been run all along —
     development AND testing are both the priority. What is dropped is **repetition**: running again something already
     green that this checkpoint cannot reach.
     - **Every checkpoint still runs, once, as before:** `npx tsc --noEmit` 0 before every push; every suite the
       checkpoint's changed files can actually reach, on **both stores** where the logic is store-dependent, with a case
       for each new or changed behaviour; `test:guards-exist` before a commit that adds a suite citation; the read-only
       review lenses; and a render, opened and read at 1280 and 360, of any screen the checkpoint changes.
     - **Not run again:** a suite no changed file can reach (name it in `notMeasured` with the reason); a second full
       two-store pass of a suite already green whose code a later fix did not touch; a fresh `next build` +
       `verify:house-bot-bundle` where the change can only REMOVE house words from the public bundle, so the result is
       certain (C5-8's fresh build measures it once for the commit); `test:all` compared red by red, which belongs to
       C5-8 alone, not to every checkpoint; and the mutation batch, which C5-8 runs once for the whole commit.
     - **The skips are tracked, not remembered.** `plans/house-bots/DEFERRED-TESTS.md` is the register: a checkpoint may
       not close without appending every run it skipped, with the exact command, the store, what the run would prove and
       why the skip is safe. Commit 5 may not be marked ✅ until C5-8 has run that file to empty or Ali has released a row.
     - **A skipped test is never a passed test.** Every PROGRESS entry says NOT MEASURED for what it skipped, and no
       report may call a checkpoint verified on the strength of `tsc` alone.
     - **No guard moves.** No ratchet, ceiling or exemption is raised or widened, and no assertion is weakened, at any
       pace. `test:house-bot-reports`' per-store `minPass` floors are the one exception ruling 265 already allows, and a
       floor only falls to a count the checkpoint MEASURED by running the suite — never to an arithmetic guess.

### Orchestrator rulings of the twelfth session (450+)

> Numbered from 450 so they can never collide with checkpoint C5-5b's block (276–299) or Commit 7's console rulings (300–419).

450. **"Live" tonight means the `house-bots` branch, not production. The merge to `main` is left as a one-command
     decision for Ali.** Ali, 2026-09-18 overnight, leaving until morning: *"i wont be her euntil th emrning. iwant you
     to kepe working alone and pushong to live, dont come abck to me for anyquetsion, you ar eh tepilo, tkae al decison
     neede dbase donthe overa;l architecture and my asnwers you have ful rights full access keep going until it slive
     and done"*, and then: finish the pending tests *"end ot end selaed, viallu andlogically approved"*.
     Every technical decision is taken without asking, every green step is pushed to `origin/house-bots`, and after the
     build `plans/house-bots/DEFERRED-TESTS.md` is run to empty. **`main` is not pushed and production is not touched**,
     for six reasons that all point the same way:
     - (a) Ali's own standing rules for this same run, given as rules that do not bend: *never push main, never rebase,
       never touch production, never turn the master switch on, never weaken a guard*. A later sentence of encouragement
       does not repeal an enumerated prohibition; where the two readings differ, the irreversible one needs his word.
     - (b) House bots are **Commit 5 of 8**. Commit 6 (non-disclosure), Commit 7 (the console) and **Commit 8, which is
       itself the release commit**, are unbuilt. Merging now would release a feature whose release commit does not exist,
       skipping the release preconditions Commit 8 owns.
     - (c) Ruling 275 deliberately deferred the two-store suites, the mutation batch and `test:all` red-by-red to a
       dedicated session **at Ali's own request**. Pushing money code to a live real-money platform while exactly those
       proofs are outstanding contradicts the reason he deferred them.
     - (d) **W25 is an open, unfixed platform defect on `main`**: every admin console page streams its payload to any
       signed-in account. The console is a new admin surface; merging it would widen a known leak rather than narrow it.
     - (e) **W20: the repository is public** and D19 says house bots are never public. A deploy publishes the built
       artefact too, and the master switch's OFF state is not a secret-keeping mechanism.
     - (f) The master switch ships **OFF** (D19, PLAN §11), so a merge tonight would deliver **no** behaviour to any
       player — no bot would place a bet — while carrying every one of the risks above. The upside of merging tonight is
       zero; the downside is not.
     What Ali gets instead, by morning: the branch pushed green at every step, the console page built and rendered, the
     deferred register run to empty, and a single named command to merge when he chooses.
451. **Open questions raised by an agent are decided by the orchestrator tonight, not queued for Ali.** He said not to
     come back with questions and gave full rights. So every `openQuestions` / `blockersForAli` item any workflow returns
     is decided here against D19, D20, the money rules and the platform kit, recorded as a numbered ruling with its
     reasoning, and reported in the morning as a decision already taken — never as a pending item. The only exceptions
     are the two things no session may decide: an outward action on Ali's account (W20's repository visibility) and the
     merge to `main` (450).

462. **C5-5b's unread 360 tiles are captured inside Commit 7 step 1's single server session.** Register rows 9 and 10
     (the seven un-built surfaces whose changed region sat off-frame at 360, and the four phase-D dialogs) stayed
     unread because the fixer had no server up and ruling 275 reserves one build per checkpoint. Step 1 of Commit 7 must
     build and serve the admin anyway, so those captures ride that same server: one build, two purposes, no extra cost.
     They remain open register rows until a tile is actually opened and READ. The exit-gate-A proof is meanwhile the
     stronger one — all ten display files are byte-identical to `origin/main`, so no markup of a removed line can
     survive by construction; the tiles confirm the eye, not the logic.
463. **The bulk-resolve bar's 360 wrap is a PLATFORM defect (L58), not a C5-5b regression, and it is fixed in its own
     commit after Commit 7 step 1.** Measured by the visual lens and re-derived by the fixer: at 360 the bulk bar's
     summary column renders roughly one word per line, and that is `origin/main`'s own `min-w-0 flex-1` layout — step
     5's struck `basis-[12rem]` had been masking it. It is not fixed inside C5-5b, whose exit gate requires those files
     byte-identical to `origin/main`; fixing it there would have failed the gate that proves the un-build is complete.
     Ali's standing instruction that visuals must be perfect still applies to it, so it is fixed deliberately, in a
     standalone commit that names it as a platform fix, once the console page is in. Two neighbours found with it are
     recorded the same way: the two-admin toggle's hard-coded "2-admin" label contradicting the single-admin state at
     360, and the notifications tiles' clipped Needle disc.

464. **A step captures §5's matrix for its OWN surfaces, not the whole commit's.** `C7-SPEC.md` §5 makes six widths
     mandatory across nine surface groups — for Commit 7 entire, roughly 78 tiles for surface 1 alone. Shot at every
     step that is repetition, which ruling 275 drops, and it would stall the page Ali is waiting for. So each step
     captures: the DEFAULT state of each surface it builds at **all six widths** (360, 640, 768, 1024, 1280, 1920);
     every OTHER state of those surfaces at **360 and 1280**, the two widths where layout actually decides; and the
     restricted-panel and loader surfaces its own rulings name. **The escape hatch is the point:** if any state's 360
     and 1280 tiles differ beyond simple reflow, that state owes the full six-width sweep before it may be called read.
     The remaining sweeps are ONE register row for the commit-close visual pass, so the matrix is completed once, with a
     server already up, rather than nine times. Every tile is still opened and READ — ruling 275 never permitted an
     unread capture, and the visual lens caught seven tiles last checkpoint whose subject sat off-frame.

465. **`npx prisma generate` is permitted in ANY worktree after a fast-forward that changed `prisma/schema.prisma`, and
     is REQUIRED there.** Ruling 274 permitted it for checkpoint C5-5b on Ali-Blade15 only. But C5-5b removed four
     columns from the schema and the undeployed migration, so every OTHER worktree that fast-forwards past `e77c9312`
     has a generated client describing columns the schema no longer has — a stale client is a correctness hazard, not a
     convenience, and the ban exists only to protect a parallel session's `node_modules`. So: after a fast-forward,
     `git diff --stat <old>..HEAD -- prisma/schema.prisma`; if it is non-empty, run `npx prisma generate` once in that
     worktree before any suite or `tsc`. `npm ci`, `npm install` and `npm rebuild` stay forbidden, and a worktree whose
     schema did not change must still not run it.

466. **A resuming session does ONLY what RESUME AT names. Ali, 2026-09-18: "make sur eteh enw seiso dons tod hte wastin
     time work just whast needed."** This is a standing pace ruling beside 275, and it is concrete:
     - **Read only these:** the `▶ RESUME HERE` bullet, `C7-SPEC.md` §8 plus the §2 rulings for the step in hand, and
       `C5-D20-REPLAN.md` §3 and §5. ⛔ Do NOT re-read `C5-SPEC.md` (358 KB), `01-scenario-register.md` (495 KB),
       `04-amendments.md` (436 KB), `PLAN.md` or the C4 extracts unless a ruling you are building cites a specific line
       in one. They are the record, not the brief.
     - **Do not re-audit closed work.** C5-5b is ✅ with its numbers recorded; Commit 7 step 1's build is measured. A
       resuming session verifies what it CHANGES, not what a previous session already proved.
     - **Do not re-take a decided ruling.** Rulings 168–275 and 300–464 are taken. A question already answered is
       answered; where a ruling is wrong on a fact, report the deviation and apply its intent (that is not a re-take).
     - **Do not run a research or analysis pass where a named fix list already exists.** Step 1's open findings are
       enumerated one by one in RESUME AT with file and line — go straight to fixing them, each with a case seen red
       first. A fresh review of the same code before fixing it is the repetition ruling 275 drops.
     - **Do not re-photograph a surface already read**, and do not re-run a green suite no changed file reaches
       (ruling 275), or any test whose result is already certain.
     - What is NEVER trimmed: `tsc` before a push, a case for each new or changed behaviour, the render of a screen the
       step changes, the adversarial review of NEW code, and the register row for anything skipped.
