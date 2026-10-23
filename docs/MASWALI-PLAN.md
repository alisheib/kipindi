# MASWALI PLAN — Maswali Millionea, the third product (programme `MASWALI-BUILD`)

> ⭐ **Say "proceed with Maswali plan" in any session, on any machine.** Read §0 RESUME AT below, then do the session
> it names. §1 is the board; §6 is the launch gate; §7 holds every session's full work order.

> **The one tracker for this programme.** Owner: Ali. Re-planned 2026-10-16 for the Product Owner's proposal of that
> date (management-reviewed); every earlier Maswali ruling is void.
> - **Rulings:** [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md) § "2026-10-16 · Maswali Millionea — the
>   management-reviewed proposal of 2026-10-16 is final; every 2026-08-29 Maswali ruling is void (owner)".
> - **Money law:** from S1, [`RULES.md`](RULES.md) §2.12 owns every Millionea figure and rate. Until S1 writes it, §3
>   below is the product's statement; S1 replaces the figures here with pointers in the same commit.
> - **Design round R2:** [`design-brief/maswali-2026-10/BRIEF.md`](design-brief/maswali-2026-10/BRIEF.md) — the Claude
>   Design commission, its predicted output and the receiving protocol.
> - **Records (the August proposal — read for engineering practice only):**
>   [`SESSION-PROMPT-MASWALI-BUILD.md`](SESSION-PROMPT-MASWALI-BUILD.md),
>   [`MASWALI-MILLIONEA-IMPLEMENTATION.md`](MASWALI-MILLIONEA-IMPLEMENTATION.md),
>   [`SESSION-PROMPT-MASWALI-DESIGN.md`](SESSION-PROMPT-MASWALI-DESIGN.md) and the R1 handover
>   [`design-brief/maswali-2026-08/handover/`](design-brief/maswali-2026-08/handover/README.md).
>
> **Guard:** `npm run test:maswali-plan` keeps §0, §1 and the board row honest; `npm run red:maswali-plan` proves each
> check can fail.
>
> **Where:** the documentation pass ran in the SSD worktree `C:\50pick-ssd\kipindi-maswali` (OMEGA-COMPILE01) on
> branch `maswali-plan`. Build sessions work on branch `maswali-build` off `origin/main` in their own worktree (§7,
> "Branch and worktree strategy"); on Ali-Blade15 that is `C:\kipindi-maswali`. Merge to `main` = a live deploy.
> **Who merges (Ali, 2026-10-17):** *"any session that finishes, let it push … each session pushes whatever it
> finished, until the final session, who finishes everything, puts it live."* Millionea is merged **dark**: its rollout
> stays `WITHDRAWN` in code until Ali decides (STAFF_PREVIEW after S5, ACTIVE only at S8).

## §0 · RESUME AT

**⭐ MILLIONEA IS ACTIVE ON PRODUCTION (Ali's ruling, 2026-10-23 — COMPLIANCE-DECISIONS § "2026-10-23 · Maswali
Millionea — switched ON for everyone ahead of the launch gate; …").** The Railway variable `FEATURE_MILLIONEA=ACTIVE` on
`main` `3aecf0edd` (the S5 release), live from 2026-10-22 23:32 UTC; the code's shipped ceiling stays WITHDRAWN on purpose
(delete the variable, or the Owner's stored switch, to hide it again). Every visitor sees the product; NOTHING SELLS until
the Owner sets the licence basis, funds the guarantee and a week opens (the earliest Monday 00:00 EAT). ⛔ DEADLINES:
before any week OPENS — S6's Millionea rules page (`/legal/rules/millionea`, a 404 at the switch) and its Terms section
live; before the FIRST settlement — S7 and S6's notices, tax-report lines and payout-float check live. §6.1's lines stay
unticked until each is true.

**⏳ S5 IS ON `main` — `2ed817395`, pushed 2026-10-22 19:09 UTC (the Claude session ali-7e on ALI-BLADE15, on Ali's
word "continue maswali … push all now"). ⭐ RESUME FIRST from the hand-over branch `maswali-handover-20261021`, file
`handover/maswali-2026-10-21/stop6-20261022/README.md` (every lane's state, the runner tools, the findings).** Every gate ran
at the exact commit on GitHub's machines (that laptop runs no Node): typecheck and the production build; CI's 702/702
in-memory suites and its browser gates; e2e:money 64/0 (drift 0.00), e2e:fault 34/0, e2e:card 100 passed,
e2e:maswali-money 3/0 (38/0 per store), e2e:maswali-fault 16/0 — `2ed817395` itself is the suite's own fix: its kill now
reaches the release on Linux too, and 1.2 also holds that the killed release never finished (its plant caught); the
cross-instance proofs s10, s11 and s12 on PostgreSQL; production's configuration — qa:live 390/0, the player drive's step
W 15/0, revoked-deadend, motion, admin-section-gate, and the door census on WITHDRAWN with its plant and on STAFF_PREVIEW;
classic parity against live main: 66/67, its one difference named — S5's Millionea results section adds an empty Suspense
boundary to /results (two HTML comments, no element, no box) in its 8 book cells; null compares 68/68 (a flaky cell of the
instrument seen in two other null compares is recorded in the hand-over). `test:needle-rest` is red on live main itself:
55/35, the same cases at both commits (U43's, since 7e3a06ea0). ⛔ Railway's first build of `2ed817395` failed (19:11:55
UTC; production kept serving `da3d32180`, healthy); this record's own push to `main` builds it again. Read back before
anything else (AGENTS §4), then STAFF_PREVIEW (the Railway variable; Ali's pre-approval), then round 2, S7 and S6 as the
hand-over's README orders them.

**⏹ STOP 5 (2026-10-22 ~15:05 UTC, OMEGA; Ali: "I'll continue from another machine", the session's tokens ran out).
RESUME HERE, from any machine — "continue maswali":** the S5 dark push was IN PROGRESS and is NOT done; production still
serves `da3d32180` (nothing of S5–S8 is live). Its state, to finish first:
1. This branch's head (the STOP 5 commit) = the gated `b120fcbe0` + three small red fixes, each green: `visual-pass-r7c`
   1.4 (PLATFORM's re-pin: the hub's calm bars draw through NoticeBar, 66/0), `visual-pass-r5h` 3.5 (PLATFORM's
   classification of ChatRoot.tsx's mark, 60/0), `ui-consistency` (REGISTER's line: the How-to-play ghost's button at
   `--h-control-md`, no drift). The release CI run on `ee6075609` failed only on cases this head fixes (guards-exist, the
   D19a pins, these three); CI run `39799912310` was dispatched on `b120fcbe0`.
2. Printed at `b120fcbe0`: tsc 0; e2e:maswali-money 3/0. NOT finished when the session stopped: `next build`, the dark
   checks (qa:live + the WITHDRAWN player drive + door-dark on WITHDRAWN and STAFF_PREVIEW), classic parity against
   `parity-v5-bfa0b7d57.json`, e2e:money/fault/card and e2e:maswali-fault. Re-run ALL of them at this head (a fresh
   gate), plus CI on it, then push to `main` under `main-push.lock`, read back (AGENTS §4), switch STAFF_PREVIEW, one QA
   staff + one QA player sign-in (all pre-approved, COMPLIANCE-DECISIONS § "2026-10-22 · Maswali Millionea — …").
3. Every lane was told to commit (WIP marked "not verified" where so) and push before the stop: S5 round 2 —
   `claude/maswali-s5-r2-hub`, `-r2-register`, `-r2-platform` (rail swap `748003c0d`), `claude/maswali-s5-landing-door`
   (`d75b56704`, done); S7 `claude/maswali-s7-s5` + `claude/maswali-s7-ob` (`1c8b42284`, done; MR-16 as built goes into
   §3 at its merge); S6 `claude/maswali-s6-release` + `claude/maswali-s6-{notices,lint,money,docs,admin}`. Their briefs,
   the lead's log and the job scripts are on the hand-over branch `maswali-handover-20261021` (`handover/maswali-2026-10-21/`,
   STOP 5). The admin guide's DRAFT is on Ali's Desktop on OMEGA; the final comes from S6-DOCS.
Then continue with the ⏳ block below ("Next").

**⏳ IN FLIGHT — S5 GOES TO `main` DARK (2026-10-22 from ~14:40 UTC; the Claude session asheib-f3 on OMEGA leads).**
Ali chose "the checked parts now" (COMPLIANCE-DECISIONS § "2026-10-22 · Maswali Millionea — …" items 7–10): the
language-change loader's colour fix (`fix/lang-switch-color`, merged into this release) rides in the same push; this
release goes to `main` dark — the rollout stays `WITHDRAWN` in code and players see no Millionea — once its gates pass at the
exact commit (typecheck, the production build, local `qa:live` with its dark section, classic parity, the CI battery,
the money suites); the staff preview follows (pre-approved). Every Millionea screen is still scored 10/10 before players
get it. The admin guide's DRAFT is on his Desktop; the final follows S6. The admin console works whatever the rollout,
so the Owner's ceremonies (licence basis, guarantee) and week drafts can start on production after this push.

**State (2026-10-23):** S1–S5 are on `main` — S5 at `2ed817395`: every player surface, round 1 of Ali's 10/10
pass, and round 2 of DOORS, SLIP, TICKETS and FACTS — and the rollout is ACTIVE on production (the Railway variable,
Ali's ruling of 2026-10-23; nothing sells until the Owner's steps and an open week). Not in it, each pushed on its own branch: S5 round 2's REGISTER,
PLATFORM (with the phone rail's Millionea track) and TICKETS' landing line and Live link, merged on
`claude/maswali-s5-r2-int`; HUB (`claude/maswali-s5-r2-hub`) and the phone-renderer fixes (`claude/maswali-s5-r3-fix`)
to merge; S7 (`claude/maswali-s7-s5`, the objection door merged in, the release merged in); S6
(`claude/maswali-s6-release`: S7, ADMIN and DOCS merged in; LINT, MONEY and NOTICES to finish).

**Next:** "continue maswali" resumes here, in order: (1) S5 round 2 — merge HUB, REGISTER, PLATFORM and TICKETS' landing
door into this branch, run the integrated render, have the independent critics score every cell to 10, push the next S5
release; (2) S7 — merge the objection door, the reds, the S17 rush and MB-97, the migration proof, push dark; (3) S6 —
the integrator merges its five lanes, the ADMIN-COMPLETENESS review, push dark, the final admin guide PDF; (4) S8 —
Ali's launch list in §6.1, then his launch word. §M8a numbers taken: 19–20 S7/S6, 21 TICKETS, 22–23 REGISTER, 24 FACTS
(in), 25–27 HUB, 28 NOTICES, 29 ADMIN. The lead's log and the lane briefs go to the hand-over branch
`maswali-handover-20261021` before the session ends.

**⏳ RESUMED (2026-10-22 11:41 UTC, Ali: "proceed"; the same session asheib-f3 leads, every lane resumed with its own
context):** HUB, TICKETS, REGISTER, PLATFORM and SLIP finish their STOP 4 lists on their r2 branches; S7 its list on
`claude/maswali-s7-s5` (TK.2 = the takeover alert as the lead ruled it — an alert to Compliance, never a hold; RD.5 = shares from tickets bought at or after the reversed deposit);
S6 the integration on `claude/maswali-s6-release` (R and N next); DOORS (done) now builds the objection door OB.0 on
`claude/maswali-s7-ob` from `claude/maswali-s7-s5`. main `da3d32180` (docs) deployed SUCCESS while stopped. The STOP 4
record below still names every head and list.

**⏹ STOP 4 (2026-10-22 ~10:45 UTC, OMEGA-COMPILE01, the Claude session asheib-f3 led; Ali: "push the progress we reached
cleanly and stop the session cleanly so we proceed later on a clean base"). RESUME HERE, from any machine:** the hand-over
branch `maswali-handover-20261021`, `handover/maswali-2026-10-21/` — README's top section (STOP 4: every branch and head,
what each lane left, the next steps in order, Ali's answers) and MERGE-NOTES' top section (every lane's final report, every
lead ruling, the merge-time wiring, the reader findings). Ali's scope (2026-10-22, never re-ask): **build done, launch
later** — S5, then S7, then S6, each verified (critics 10/10 + every gate) and pushed to `main` DARK; STAFF_PREVIEW right
after S5 is live; S8 prepared and handed to him. Pre-approved by him: each verified push, the production read-backs, the
STAFF_PREVIEW switch, one read-only "SmsMessage" count, branch deletes at the very end; QA staff + QA player sign-in once
each for the staff check; **S8's live test is the first public week** (rewrite S8, OD-21 and §6 line 12 to match). At the
stop: DOORS ✅ (the ⛔ dark-safety blocker fixed and proven on real bytes, `13d8ca918`) and SLIP ✅ (`d5f24f569`) are done;
HUB `a76e03f96`, TICKETS `fdbeae5a4`, REGISTER `926ebc6c1` and PLATFORM `04d3e3d93` hold WIP tops with exact lists left; S7
is merged with S5 on `claude/maswali-s7-s5` (`be37a9683`, proven on both stores); S6's integration is on
`claude/maswali-s6-release`. This release gained the lead's `41e61987c` (three ratchets), `c58b316ff` + `87f19f3a9` (Ali's
English buy wording in the never-printed privacy paragraph and the player drive) and `edf79c2b0` (red:journey-home's
anchor). Nothing of S5–S8 is live; production serves `67e47f8d2`.

**State on 2026-10-21 (record):** S1–S4 are on `main` dark. S5's release candidate is branch
`claude/maswali-s5-release` (Codex's mirror `codex/maswali-coord-20261019` retired 2026-10-21 PM): Codex's integrated
S5 (`bd139142`) merged with production `main` `4471bb44` (U43's house-gold restore `dd1386f0` and PHOSPHOR
release 2b, W6) at `d1c5910f`. That merge took `main`'s copies of the three U43 RED anchor files and
`u43-chart-direction-red.mjs`, set `test:visual-pass-r5c`'s globals.css gold census to 103 (U43's +24 and S5's
ruled Millionea ink +7 are independent), and set `PREVIOUS_SPRITES` to the pair `main` serves (`app.76a3696e`,
`admin.75aeb290`) before re-running `glyphs:gen`. S5 holds the player and admin surfaces, global admin
search/filter/sort/paging, bounded integrity report coverage, reviewed consequential actions, partial-seal and
device-audit feedback, versioned seal corrections, the multi-ticket slip, the separate Results section, the public
settled-week sitemap and share image, and bounded public week and register caches. The rollout stays `WITHDRAWN`.

**⏹ STOP 3 (2026-10-22 ~08:10 UTC, Ali: "finish here on a clean level … then continue Maswali from a new prompt"; only
verified work goes live). RESUME HERE:** hand-over branch `maswali-handover-20261021`, `handover/maswali-2026-10-21/`
README's top section (STOP 3: the six round-2 branches and heads, what each left, the next steps in order) and
MERGE-NOTES.md (today's part first: the round-2 reports, test:all's real reds by owner, and ⛔ the dark-safety blocker —
`src/app/markets/loading.tsx` hands the client MarketsGhost `millionea={false}`, so /markets' payload carries the prop and
qa:live's dark rule fails; fix before S5 deploys). Round 2 stopped clean on `claude/maswali-s5-r2-{hub,slip,tickets,
register,doors,platform}`; none merged yet; S5 is not live. `main` `67e47f8d2` (U43's CI repair and the marketing
harm-marker mute) went LIVE at 08:12:48Z; its read-back is green (dpl on www, apex and the Railway host; health ok;
qa:chunks-prod 6/6 on both; production qa:live 364/0) — U43's record in MOBILE-VISUAL-PLAN §0 rides with S5's push.

**The 2026-10-22 morning (from ~07:00 UTC, Ali: "proceed … until done") — the Claude session asheib-65 on OMEGA led.**
EVERY S5 lane is merged into this release (`7e9a314f0`: FIX-SRV, PLATFORM D1–D15, DOORS, HUB, TICKETS, REGISTER, SLIP; the
salesPaused Fill with one glyphs:gen, app sprite `app.b899eae1.svg`); tsc 0 and every Maswali suite green; each merge's
resolutions are in its commit (the old-shape moveClose/attestParity calls in three dev routes and one suite now use
FIX-SRV's API; maswali-ui 4.8b's flake fixed). Round 2 runs on `claude/maswali-s5-r2-<lane>` branches from this head
(brief: hand-over `critics/ROUND2.md`), then the critics re-score; `test:all` runs in parallel on a gate tree. Railway: a
**security incident** (status.railway.com; Railway advises rolling every env var stored there — Ali's, at the providers);
builds are back for Pro since 06:29Z, and `main` `67e47f8d2` was requested at 07:15Z on Ali's word ("deploy main now").
Hand-over for any machine: branch `maswali-handover-20261021` (README top section + MERGE-NOTES). S7 is at `0f0d42fcc`
(S17 rush first green); S6-N owes its blind 6b guard.

**⏳ The PM round (2026-10-21 from ~12:35 UTC, Ali: "proceed") — the Claude session asheib-65 on OMEGA-COMPILE01 led:**
- Lanes resumed with their own context, each on its branch and SSD tree, heavy jobs in Maswali slots 1–3:
  S5-DESIGN-HUB, -SLIP, -TICKETS (plus P6 on a ticket and the tickets ghost's third box), -REGISTER (its shared pieces
  first, merged early for round 2), -DOORS (the owed browser re-run and tile read), S5-FIX-PLATFORM (verify 8–11, then
  D12–D14) and S5-FIX-SRV (finding 2's class in openWeek, closeWeek, voidWeek, claimCarry and sunsetMaswali).
- This release now holds fix-srv `9935dfd47` + fix-player `54512f311` + parity `9a0c6b033` + fix-platform 1–7 `f74aaa312`
  + `main` `bfa0b7d57` (merge `b7292198d`: U43 took S5's five red fixes verbatim, and its watchlist repair supersedes S5's
  interim poll; four conflicts, each explained in the commit) and `b4fcc4e4b`, which deletes `.kp-track-end--10` (no
  label since U43's `1384383fd`; test:dead-css has been red on `main` since). Green there: tsc 0, test:maswali-player 187
  per store, house-bot-reports, maswali-fence, watchlist, maswali-ui 151, journey-tickets 51, r4j 91, r5g 65, r5a 97,
  r7c 65, r5j 62, dead-css; test:house-bot-blob-pin is red only on D19a's dictionary blob (re-pinned once at the final
  merge). Since then: fix-srv 2b merged (`6e6949a4f`: the open, close, week void, carry and the Owner's stop each commit
  whole, audits after the commit; engine 189, purchase 102, settle 100, void 57 on PostgreSQL, tsc 0); `main` `8175dbca3`
  merged (`a413e75be`, the marketing harm-marker mute; rg-doors 130, campaign-audience 42, tsc 0); S5-DESIGN-DOORS merged
  (`60eb085bc`, the doors at 10/10, with REGISTER's shared pieces; the route ghost hands the home ghost the locale; tsc
  queued). red:maswali-money-path on this release: 30/30 caught (plant 6b included — S6-N's miss is its own).
  Next to merge: HUB, SLIP, TICKETS, REGISTER, platform 8–15 and fix-srv's last items; `glyphs:gen` (HUB's `salesPaused`
  Fill) and the D19a re-pin once, at the final merge. Every PM ruling and merge step: `MERGE-NOTES.md` on branch
  `maswali-handover-20261021` (`handover/maswali-2026-10-21/`).
- Classic parity is calibrated on `main` `bfa0b7d57`: baseline 52/52 (224 cells) and null compare 68/68, no flaky cell
  (the baseline file lives in the OMEGA lead's scratchpad, `s5par/parity-v5-bfa0b7d57.json`; another machine re-captures
  it with the hand-over's `tools/job-par-base.sh`). The candidate compare runs at the final integrated head.
- ⏰ Ali (~15:20Z): "work for 2 hours and push everything and progress in case any issue happens so we continue from
  another machine" — every lane pushes after each commit and stops at 17:05Z with its state in its head commit.
- Railway's builds are still paused (status.railway.com, 12:23Z). A watcher asks Railway every 10 min to deploy `main`'s
  head and stops at the first accepted request; then U43's read-back, which U43 asked the Maswali lead to run.
- OMEGA: the S6 notices lane's two leftover chains still run its owed checks in `kipindi-mln-not` (slot 4); their summary
  is `s6n/heavy/summary.txt` in the lead's scratchpad. On `bd74c982c`: tsc 0, maswali-notify 144 and house-bot-reports 81
  on both stores, maswali-engine 109, red:maswali-rbac 7/7, red:dal-parity 285/285, red:house-bot-money 82/0,
  red:house-bot-c5 --only 24/24, red:deposit-recheck and red:payment-background green; **red:maswali-money-path 41/42 —
  plant (6b) "a voided ticket's refund reverses wagering it never accrued" MISSED** (the purchase suite's 7.3b stayed
  green). The S6 lane owes the cause; the lead re-runs the same proofs on this release to see whether S5 shares it.
- Slots: U43 (paused) lent `mln-slot-5..8`; the S5 lanes use 1, 2, 3, 5 (`mln-slot-s5x.sh`), S7 uses 6 and 4.
- S7 resumed (~13:15Z) on `claude/maswali-s7`: the refused release's lift in bounded sections, the S17 rush, the F7 6–8
  render read, red:house-bot-c5 and red:house-bot-console.
- The lead's rulings in the 10/10 pass (2026-10-21 PM), recorded with the merge in DESIGN_AUTHORITY §M8a where they set a
  rule: the ticket's lock moment plays once at the week's RECORDED close (a "close" fact; `.m-seal` stays, Ali's N-block);
  a paid seal lists its serials as stacked facts; zh puts no space between two Han characters (a space only where a
  Latin letter or digit meets Han — typography, the ruled words unchanged); ONE ledger builder for the register, the hub
  and the ticket (MR-26's money in = money out), with a core money record of any visibility for a DRIVE week's ticket and
  the public register still refusing DRIVE weeks; one week row (`WeekRow`) for the register and /results.

**⏹ STOPPED (2026-10-21 ~10:45 UTC, on Ali's word: "finish … so we proceed on another session with clean pushed").
The lanes' state at that stop (superseded by IN FLIGHT above where they differ). RESUME HERE, from any machine:** read branch `maswali-handover-20261021`, folder `handover/maswali-2026-10-21/` —
README.md (every branch, each lane's state at the stop, the next steps in order), `critics/` (round 1 of Ali's 10/10
design pass: scores and fixes per surface, the LEAD RULINGS, the design lanes' brief and file ownership) and `tools/`.
Every lane committed and pushed at the stop; a commit marked "WIP … not verified" does not compile or was not run.
- Finished and verified: `claude/maswali-s5-fix-srv` (`9935dfd47`, all 16 server/console findings with guards and plants);
  `claude/maswali-s5-fix-platform` commits 1–7 (D1–D9, r5j 3.7.2; head `c1e3a1b28`: 8–11 written, not fully verified;
  D12–D14 not started); `claude/maswali-s5-parity` (`9a0c6b033`, the instrument fixed, --prove-red 299/299).
- `claude/maswali-s5-fix-player` (`54512f311`): P1–P15 and P17–P19 fixed, P16 not reproduced (44px). Verified: tsc 0,
  test:maswali-player 186/186 on both stores, the 8 Maswali red twins, 129 of 142 reader suites green — the 11 reds are
  D19a's dictionary pin (re-pinned once at the merge) or pre-existing U43 reds, each proven on 8c468393b; on screen: P1's
  free-cancel promise moves with the clock on a sheet left open, P7, P8, P10 (slip and ticket), P17, P6 on the hub. NOT
  verified: P6 on a ticket (the drive's seed held no ticket in a week inside its objection window).
- WIP, not compiling: `claude/maswali-s5-design-hub` (`7fe758046`), `-slip` (`524128dbb`), `-register` (`3bf97ffdf`),
  `-tickets` (`96e5e9a94`). `claude/maswali-s5-design-doors` (`5bc6e2c57`): H1 and nearly all of R1-doors done and
  verified (the ghost equals the card: 188/188px at 360, 74/74 at 1280); its last commit (L7 and three small items) is
  verified by static suites only — the full browser re-run and tile read are owed.
- `claude/maswali-s7` (`2cba1f577`, Codex's integration contained in it): S7-F8 1–6. **The money finding (S7-F8 4,
  `66f3af8be`):** a final week whose ~7,000 winners are all held could never settle — one hold per winner inside the chain
  lock's single 30 s transaction expired, rolled back, and left wallets frozen; the holds are now placed in 5 s sections of
  the lock (each re-reads the week), paying only in a section with budget left. Measured on scratch PostgreSQL: S16 43/0,
  the all-held week settles once in 15 sections (81.6 s), the wide week in one 6.7 s section, exactly once, conservation
  exact. tsc 0; every two-store suite at or above its floor (settle 102/106, purchase 112/115, house-bot-reports 253/81,
  adversarial 194/202 …); e2e:maswali-fault 16/0; red:maswali-money-path 73/73, red:dal-parity 285/285. Owed: the S17 rush
  (no measured rush figures), the S7-F7 6–8 render read, a refused release lifting thousands of holds one by one (minutes);
  after S5 lands: merge, re-pin D19a, red:house-bot-c5 and red:house-bot-console, test:all and the money battery.
- ⚠️ OMEGA only: the S6 notices lane's background loops (Git Bash pids 194830, 200821, 194836) survived the stop and were
  running its red twins in `C:\50pick-ssd\kipindi-mln-not` (slot 4) — the session's classifier refused to kill them, so
  Ali decides. Before using that tree: `git -C C:/50pick-ssd/kipindi-mln-not status --short` must be clean; if
  `src/lib/server/maswali-settlement.ts` shows modified, `git checkout -- src/lib/server/maswali-settlement.ts` and delete
  `scripts/.red-maswali-money-path.lock` (a red twin's plant — never commit it). The pushed branch is clean.
- `mln-s6-notices` (`bd74c982c`): round 17 COMPLETE — M5, L1, H2, H3, M3, M4, L2, L3, L4 in 14 commits, both Codex attempts
  reconciled (their branches archived in `F:\kipindi-archive\codex-s6n-attempts-20261021.bundle` and deleted);
  maswali-notify 138/0 mem + 144/0 PG, maswali-claims 635/0, red:maswali-claims 29/29, ~60 derived light suites green.
  Owed at the final head: tsc, the both-store suites, full red:maswali-money-path (plants N6–N12 never run), red:maswali-rbac,
  red:dal-parity, red:house-bot-money, red:house-bot-c5 --only (24 plants) and the other reds the lane lists in its commits.
- `main` = `c63c89387` (U43's CI-repair release + docs) — NOT deployed: Railway paused builds platform-wide
  (status.railway.com); production serves `d268ef919`. Pushes during a pause are dropped: re-trigger by hand with the
  hand-over's `tools/railway-deploy-main.mjs` when builds return, then U43's owed read-back (see the README).
- `test:needle-rest` (server-bound, never run by CI) is red on production since U43 Release B — bisected: 92/0 at `1b7a91782`; 89/3 from `1384383fd` (3 small §9 CONTROL failures); **55/35 from `7e3a06ea0`** ("fix(u43): align card states and truthful market evidence": the Needle never glides off a control). U43's to fix (paused); it rests over Millionea's held-ticket chevron too.
- The repository was cleaned on Ali's word (stale branches merged or archived in `F:\kipindi-archive\*-20261021.bundle`).

**⏳ The day's record (2026-10-21, OMEGA-COMPILE01 — the Claude session asheib-65 took S5 over from Codex on Ali's word):**
- Running on `d1c5910f`: `test:all` with the database suites in the release tree; the classic-parity calibration on
  a `main` tree (`--prove-red`, the baseline, a null compare); every `red:*` that reads an S5-changed file in its own
  tree; four read-only reviews (server and data, player, admin and shared UI, dark-release safety).
- Found: production `main` is red on `test:house-bot-rules` 11.5 and `test:house-bot-seam` 4.1, 4.2 and 6.g since
  U43's `c29cb752` (`locks.ts`, `market-service.ts`; S5 touches neither). The U43 lane (Claude asheib-bb) owns that
  repair and lands it on `main`; S5 then merges `main` again and repeats every gate the merge touches. S5 already
  carries self-contained fixes for five of U43's reds (`342574e6`, `678314ca`, the watchlist half of `e3cb7acf`,
  `0823ecc2`, `a075174d`); U43 takes or replaces them so that each red is fixed once.
- Lanes on OMEGA: Maswali (asheib-65, `F:/kipindi-locks/mln-slot-1..4`), U43 (asheib-bb, slots 5–8), PHOSPHOR
  (asheib-66, slots 9–12). `main-push.lock` as below; each lane messages the others before taking it. Release order
  agreed: U43's CI repair → PHOSPHOR 2c+2d → S5 → PHOSPHOR 3.
- **Ali's rulings of 2026-10-21** (COMPLIANCE-DECISIONS § "2026-10-21 · Maswali Millionea — staff preview after S5, no
  separate drive-week buying phase, …"): STAFF_PREVIEW right after S5 is live; R10c closed — no staff-only buying
  phase, Millionea opens to everyone at launch; the softer tab ink; the ruled sw/zh words final (no native review);
  Finance confirmed OD-08 and MB-77; five days to answer a complaint; English "Buy ticket"; the old Codex branches
  deleted. And his request: every Millionea surface rated 10/10 by a player, a UI/UX engineer and an animation
  specialist, consistent with 50pick's design, before it ships — round 1 of the critics scored every surface; the fix
  and design lanes are working from their reports.

**Next on 2026-10-21 (record):** Finish S5's gates on its exact release commit — after U43's repair lands, merge `main` again — every
changed-file reader and mutation proof, current-`main` classic parity, the admin and player browser drives and
tile reads (every page to its end, 320–1920 × en/sw/zh), the compiled responsive sweep (the leaderboard empty
panel), the multi-slip drive, `test:all` with the database suites, typecheck, the exact-commit production build,
bundle verification and local `qa:live`; fix what any of them or the reviews confirm. Recheck current `main` and
`main-push.lock` before the push. Deploy S5 dark only after every gate passes, then AGENTS.md §4's three-host,
health, chunk, live-QA and browser read-back. S7 follows on `claude/maswali-s7` (its held-winner settlement fix
S7-F8 4 verified on both stores and under the 10,000-ticket load — see the STOPPED block above);
S6 follows in L → D → R → N order. S8 remains at its owner and regulatory gates in §6. Do not flip the rollout as
part of a dark release.

## §0a · Historical handovers (superseded by §0 above)

> ⚠️ **A record, not the rules in force.** Statements below were true on their date and some are superseded — e.g. R10c is
> closed (Ali, 2026-10-21 ruling 2: no staff-only buying phase); the live drive is the first public week (2026-10-22, §7b
> S8); Millionea's tab and the classic rail's Millionea track replace "Millionea under More" (DESIGN_AUTHORITY §M8a item 11).
> The rules in force are §0, §2, §3, §6, §7b and the owning documents they link.

**Codex's S5 checkpoints (2026-10-20) — record.** Codex's state line of that day: the earlier ACTIVE player drive,
WITHDRAWN-route drive and three-language player tile read passed; classic parity against the then-current `main`
passed 67/67; the disposable-PostgreSQL money battery passed 198/198 on the integrated source.

**Cross-device checkpoint (2026-10-20):** Fetch the remote branch
`codex/maswali-coord-20261019` and read its HEAD; it merges U43 `a12f7b26`
and hotfix `3ec111a83` above the
clean S5 source commit `46135acdec22f9404decaac20f6d62ec4d6c0286` and its
documentation checkpoint `d566067acf54808c90a9cb172b6592af763bb6ff`. This is
a branch checkpoint, not a `main` release. The first clean two-store `test:all` baseline found four
failures in the new work (the house-bot report line pin and visual passes R5-G,
R8-B and R9-A); all four were repaired and their focused checks pass on the
checkpoint. A subsequent exact-commit `46135acd` two-store `test:all` finished
635/637 green: the only two reds were spacing-scale's stale 405 count and
week-controls' stale `xs` token; both were corrected in the newer merged branch
and their focused guards pass. The compiled `d566067a` responsive sweep found
9 leaderboard empty-state heading alignment failures at tablet, laptop and
desktop across all three languages (11,376 passes, 19 warnings); this remains
open and must be fixed and rechecked. A real-browser `47a9d7f9` Swahili probe
confirmed the five-tab rail and full `Juu na Chini` label fit at 320 and 360
without overflow. None of those earlier-commit results substitutes for a fresh
exact-commit two-store `test:all`, current-`main` classic
parity, final 135-cell admin tile/tap sweep, compiled multi-slip browser drive,
exact-commit build and local live QA are in progress or still owed. New devices
must fetch the branch, recheck remote `main` and both shared locks, and use their
own authorized nonpersonal GitHub credential; OMEGA's repository deploy key is
local to that machine. U43 may advance `main` again for its hotfix, in which case merge its
actual remote commit and repeat every affected release check. Never use the
personal token offered in chat or write production data.

**Latest S5 branch checkpoint (2026-10-20):** The coordinator branch now also
contains the objection-rollback cache invalidation and seven-site freshness
proof, repaired U43 RED anchors and post-commit watchlist assertion, the
leaderboard empty-panel alignment and report/visual guard repairs, and
versioned, input-validated admin seal corrections. These changes were tested
with focused guards and mutation proofs on their source branches; the objection
verdict memory test passed 75/75 and results freshness passed 59/59 in each
store. Their combined exact commit still needs the full two-store suite,
money battery, real-browser tile and responsive reads, typecheck, build and
local live QA. The leaderboard fix still needs compiled-browser confirmation.
U43 still owns `main-push.lock`; S5 has not pushed `main`, and Millionea remains
`WITHDRAWN`. Fetch and read the remote coordinator branch HEAD rather than
assuming an older hash in this section is final.
The interrupted two-store run at `7f91c8ea9` recorded 264 passed checks and
seven actual reds: house-bot-rules, house-bot-seam, results-freshness,
wallet-status-writers, red-anchors, watchlist and report-parity. The latter
five have focused fixes in the coordinator branch; the two house-bot guards
still need diagnosis. The test process and its disposable PostgreSQL were
stopped, and the run is not a final suite verdict.

**⏹ STOPPED (2026-10-19, last updated ~13:45 UTC, OMEGA-COMPILE01 — the lead) — RESUME HERE, from any machine (Claude or
Codex).** Ali, at the second wrap-up: *"push everything you have now live as it is, and give me a prompt for Codex to
proceed after you."* This block supersedes the LIVE STATE below wherever they differ. Every branch named here is on origin
and every OMEGA worktree is clean (nothing uncommitted anywhere). The detail behind each line — each lane's final state,
its proofs and its steps in order, the S5 tile-read findings and the decided words, the briefs, the OMEGA tools and the
lanes' scripts — is on branch **`maswali-handover-20261019`**, `handover/maswali-2026-10-19/` (`HANDOVER-LANES.md`,
`S5-VIS-FINDINGS.md`, `briefs/`, `omega-tools/`, `lane-scripts/`).
- **Live on `main` from this lane today:** `13299425` (item 3 — four red harnesses re-anchored, test-only) and `2d237839`
  (the PLATFORM fix — an aborted route cross-fade is never an uncaught page error, `route-transition.tsx` observes the View
  Transition's promises, proven in a browser: 0 errors on the fix vs 3 in 16 moves before it, `visual-pass-r4j` 2.1b +
  plant; and main's docs no longer citing S5's maswali-i18n suite, `test:guards-exist` green). On each pushed tree: `tsc` 0,
  `next build` ✅, local `qa:live` 386/386. ⏳ **The production read-back of `2d237839` is still owed** (the PHOSPHOR session
  read production back on `70c069cb` just below it — all three hosts, health, sprites, `qa:chunks-prod`, production
  `qa:live` 363/363). This lane's Claude session could not run it: the auto-mode classifier refuses it as "Production
  Reads" (Ali can approve it in manual mode). Whoever resumes runs it FIRST (`omega-tools/mln-readback.sh <sha> <tree>`, or
  AGENTS.md §4 by hand).
- **Known reds on `main` (S5's foundations; measured by the U43 session's full `test:all`):** `visual-pass-r5a` (8.13 the
  slip's ✕ while pending; 1.1 counts not through formatNumber), `-r5j` (1.1; 10.1 the slip's unruled Modal; 11.2 the census
  64 vs 62), `-r6c` (10.1, 11.2; 2.1 the ticket's trailing tracking), `-r7c` (2.1; 3.9 the slip's h1 stem), `-r5h` (3.5
  `maswali-carry.tsx` unclassified), `rate-copy` (1b.sw/1b.zh: `ruleCheck` doubles the unit beside {hours}),
  `presence-class` (8.1/8.3: awayWon/awayLost/awayMixed defined three times). Each names a Millionea file and leaves with
  the S5 push (S5's branches carry the census updates — check each is green on the merged tree).
- **⏭ NEXT, IN ORDER:**
  1. **S5 → `main`, dark.** `maswali-s4` = `f54d5745` (S5 + `main` `04b24a44`; the drive/shots fixes; the player shots shoot
     every page to its end and at 1024). Merge into it: `mln-s5-tab` = `85e67d9f` — **DONE** (Millionea's own tab: one drawn
     list for the journey's rail and links; the classic bar's core link after Up & Down, Results then More's first row at
     every width — measured; the ink; More's rows aligned, its panels opaque; the English five-tab rail label "Tickets";
     trial merge clean). Then FINISH and merge the two tile-read fix lanes (both started from `maswali-s4` `7270c3d8`):
     `mln-s5-vis-p` = `d0b80065` — steps (1)–(16) CODED (the fact lines wired; P1–P16, A2, A4, §D; maswali-design §4
     written) and NONE verified: left (a) `tsc`, (b) `test:maswali-design` (§4 and three re-pins) green with every plant,
     (c) two maswali-ui guards (P14's product-free hint; the drive's settle), (d) every light check reading its 27 changed
     files, (e) the OperationResultModal byte-identity proof for every other caller, (f) the re-shoot + the drive, every
     tile read, (g) the finding → tile mapping. `mln-s5-vis-r` = `9979ede2` — the week page rebuilt (cards below 1024, a
     six-column table from 1024), the first zh re-shoot read and its findings fixed (R 5); left: its final steps as its
     last report and HANDOVER-LANES list them (R9 the index rows, the ghosts, A3's zh rule, its guards in
     `test:maswali-register`, `tsc`, the full re-shoot, the seed-using drives). At that merge: wire the slip's source line
     to `sourceLabel`; `glyphs:gen` re-run on the merged `map.ts` with `PREVIOUS_SPRITES` = the pair production serves
     (PHOSPHOR W4 and 1b landed first, so the S5 merge is the second lander); re-pin D19a's dictionary pin ONCE, at the merge
     commit; merge `origin/main`. Then the four render jobs (dark, player, console, servers), the full tile read (every
     page to its end, 320/360/768/1024/1280/1920 × en/sw/zh) until nothing is wrong, `tsc`, `next build`, local `qa:live`,
     push, read-back. Then STAFF_PREVIEW — Ali's decision.
  2. **S7 → `main` after S5:** `mln-sf` = `55a5f6ce` — rounds 4–6 merged, D19a re-pinned at the merge, S7-F7 1–5 (five
     pre-existing test defects fixed: planted defects that could never be caught before) and S7-F7 6–8 (an unknown
     two-officer setting names no ceremony; the bulk bar and the ceremony read whole at 360). Green with floors raised to
     printed counts: `maswali-purchase` 110/113, `-adversarial` 194/202, `house-bot-reports` 253/81, `maswali-config` 77,
     `house-bot-surfaces` 74, `maswali-money` 410, and every other two-store suite at its floor; 234 derived light suites;
     the reds (money-path 67/67, rbac 9/9, bulk-resolve 49/49, engine 7/7, fence 17/17, house-bot-money 82/0, labels 22/22…);
     the console renders in all three two-officer states. Left: the re-render of S7-F7 6–8 (its drive is
     `lane-scripts/s7/render-f7.mjs` on the handover branch), `test:house-bot-reports` and `test:house-bot-console` on
     `55a5f6ce`; merge `main` (D19a then green), then `red:house-bot-c5` (~2 h) and `red:house-bot-console` (~3 h), the
     merge's derived suites, `tsc`, `next build`, `test:all` + `e2e:money`/`e2e:fault`/`e2e:card` on a throwaway Postgres,
     push, read-back.
  3. **S6, squash-merged after S7, in the order L → D → R → N:** L and D are squashed on **`mln-s6-int` = `81c60f0f`** (off
     `mln-sf` `3f6af84e`; D19a re-pinned; the PDFs regenerated). Open there: `maswali-config` floor (take the merged tree's
     printed count); three census decisions on D's lookup form (`admin-act-gate`, `unsaved-changes`) and `type-scale`; the
     stale-form rule stated only in How to play's `ruleSunset`; lane shas that will dangle when the lane branches go; the DB
     suites and reds not yet run. R = **`mln-s6-reports` = `57624a2f`** — round 15 REVIEWED and ACCEPTED by the lead
     (rulings: the two narrow gaps it found by hand stay documented limits; capital-led ids read as references; Swahili and
     Chinese number words are scanned once a scanned file carries such prose). N = **`mln-s6-notices` = `d6e4544d`, round 17
     in progress** — DONE and green: B1 (the running-jobs set has its own global: two launches give one run and one letter
     per holder, on both stores), B2 (an unreadable holder keeps the run owed), M1 (the integrity page awaits its control
     check), H1 (`test:maswali-notify` compiles and runs green for the first time on the lane, 129/134, floors re-pinned), M2
     (Ruling 235 admits the winner SMS as a second known caller; `house-bot-reports` 254/81). LEFT: M5 (the officer's check
     closes the letters), L1, the lint rulings H2/H3/M3/M4/L2/L3/L4 — each designed in HANDOVER-LANES — the runs, then a
     fresh independent review of round 17.
- **Rulings taken today (each reversible):** the English five-tab rail label "Tickets" (sw "Tiketi", zh unchanged); More's
  Millionea row ink-only; More's panels opaque; Results is More's first row at every width while Millionea's link shows
  (measured: the bar never holds both); the tile read's P8/P9 were mid-transition captures (measured settled) and P15 keeps
  the v6 delivery's 1080 reading measure; zh Millionea ordinals unspaced ("第{week}周"); the register's guards in their own
  suite (`test:maswali-register`); one `sourceLabel` (drops "www.") for the register and the slip; the dev seed seals as a
  real MODERATOR; an unknown two-officer setting names no ceremony; the notices' M2 (a second known caller) and M5 (the
  officer's check closes the letters) and the lint rulings H2–L4 (HANDOVER-LANES); the words of S5-VIS-FINDINGS §D (zh 派奖 ·
  正选题 · 事件 · 由所有 10/10 彩票平分 · 认证人 · 每周公示 · 已中奖 · 待结算 · 退款; sw itakapokamilika · linahamishiwa · Kiwango
  cha chini kilichohakikishwa · Makuu · Limesitishwa · UTHIBITISHO · Zinazoendelea / Zilizokamilika / Ulizoshinda ·
  Imerejeshwa; en "Week register", "Week {n}'s questions", "Refunded").
- **For Ali:** the production read-back of `2d237839`; the tab's ink tint (-300 vs -400) at STAFF_PREVIEW; STAFF_PREVIEW after
  the S5 push (`FEATURE_MILLIONEA=STAFF_PREVIEW` on Railway — reversible); R10c (who may buy a DRIVE-week ticket); the
  complaint-answer default (5 days, now on the Owner's rules form); the platform-wide words for native review at Gate B
  (sw "bwawa", "NDIO", "Jackpot"; zh "EAT").
- **Other sessions on OMEGA today:** PHOSPHOR (W4 live `70c069cb`, release 1b) and the Up & Down visual pass (U43 A live,
  A.1 `ee76c948`, release B next). They push `main` too: fetch and rebase immediately before any push, and message them
  before a release window. Agreed: whoever lands second re-runs `glyphs:gen` and re-points D19a's dictionary pin.
- **⛔ PUSHING `main` — the shared lock (agreed by the three lanes, 2026-10-19, for Codex sessions that cannot message each
  other):** before any push to `main`, `mkdir F:/kipindi-locks/main-push.lock` (on OMEGA-COMPILE01) and write
  `<LANE> <UTC time> <sha>` to `F:/kipindi-locks/main-push.lock/owner`; push; run the production read-back (`?dpl=` on the
  three hosts, `/api/health`, `qa:chunks-prod` on both origins, production `qa:live`); then delete your owner file and
  `rmdir` the lock. If it is held, keep working and retry later — never delete another lane’s lock. Before a release,
  §0 names what is about to be pushed and the shared files it touches. **Maswali’s shared files:** `src/lib/i18n-dict.ts`
  (the `millionea` namespace), `src/app/globals.css` (the `kp-millionea-*` / `kp-mln-*` blocks), the navs (`bottom-nav`,
  `nav-more`, `top-app-bar`, `app-shell`, `journey-tabs`, `journey-top-bar`, `lib/nav/active-tab`), `scripts/glyphs/map.ts`
  and the generated sprites, `scripts/lib/house-bot-absence-cases.mts` (D19a), `market-service.ts` (S7),
  `operation-result-modal.tsx`, `stepped-progress.tsx`, `not-found-words.ts`, `journey-home.tsx`. The other lanes’ handovers:
  U43 `docs/design-brief/u43-2026-10/BRIEF.md`; PHOSPHOR `docs/PHOSPHOR-MIGRATION.md` §0.
- **OMEGA worktrees kept for the resume** (each with its own npm ci, all clean): `C:\50pick-ssd\kipindi-mln-{s4,tab,vp,vr,f4,
  rep,not,int,redfix}`. Another machine needs none of them.

**⏩ LIVE STATE (2026-10-18 22:44 UTC, Ali-Blade15 — STOPPED for the day, resumable from any machine; read this first.
The State paragraph below is the last push's.)**
- **`main` = `32eb5084` + this docs commit:** S1–S4 and S5's foundations, dark (`WITHDRAWN`; every Millionea route
  answers not found). Seven Millionea `test:all` reds on `main` leave with the S5 push. Six other red harnesses on `main`
  are other lanes' anchors: four repaired on `mln-redfix` (below), two the phosphor session's.
- **⏭ NEXT, IN ORDER (any machine):**
  1. **S5 → `main`.** `maswali-s4` = `817e2a02` = S5 + main's PHOSPHOR W3, a clean merge proven by `tsc` and every census
     either side changed. Still owed before the push: the four render jobs, each on one fresh `next dev` (in-memory
     store: no `DATABASE_URL`; `DISABLE_ADMIN_TOTP=true`; `BASE=http://localhost:<port>`):
     - **dark** (`FEATURE_MILLIONEA=WITHDRAWN`): `node scripts/pre-deploy-live-check.mjs`, then the player drive
       (`maswali-player-drive.mjs`, in `maswali-s4`'s scripts folder — S5's, not yet on `main`);
     - **player** (`FEATURE_MILLIONEA=ACTIVE`): the player drive, then the player shots (`maswali-player-shots.mjs`, the
       same folder);
     - **console** (`ACTIVE`): `node scripts/maswali-admin-shots.mjs`, `node scripts/maswali-admin-drive.mjs`;
     - **servers** (`ACTIVE`): `revoked-deadend.test.mjs`, `motion-adoption-verify.mjs`, `admin-section-gate.test.mjs`,
       `needle-rest.test.mjs` (the five server-bound `test:all` members);
     then read the player shots tile by tile (320–1920, sw/en/zh), merge `origin/main` into `maswali-s4` — ⚠️ main
     gained CODE since: another session's "Counts as by hand" (`50cfe630`, with a migration), so `prisma generate`,
     the migration probe and the censuses it touches before the gate — then `tsc` + `next build`, push, the production read-back (AGENTS.md §4: `?dpl=` on www and the apex, `/api/health`,
     `qa:chunks-prod`, production `qa:live`, the Millionea routes 404), then **STAFF_PREVIEW** — Ali.
     ⭐ **Ali's ruling of 2026-10-19 — Millionea's OWN TAB** (his words: "a new tab next to up and down like them …
     unique design … mixed glowing green red color and gold like 50pick design … like kalshi"; it reverses S5's "no
     tab"): right after Up & Down / Juu/Chini in every nav that has tabs, the same tab as its siblings, its label drawn
     in 50pick's three money colours — one still gradient, green → gold → red, on Ali's own reference (Kalshi's
     "Midterms" tab: the same type as its siblings, nothing moving), at most a faint gold halo, plain under forced colours
     (one choice is left to the eye at the render: the stops are the tokens' -300 tints, whose darkest point beats the
     unlit siblings' contrast; the -400s are more vivid, nearer Kalshi's, and still far above the reading minimum); the classic phone rail keeps it as More's first row in the same ink.
     **Built so far on `mln-s5-tab` = `8e73700f`** (nothing run): the ink — ONE class, the colour tokens' -300 tints as
     one still gradient, a faint gold drop-shadow halo, the -200s on hover and on a lit pill, plain under forced
     colours, no motion of any kind (guarded: `test:maswali-ui` §5b) — worn by the More rows of the classic phone rail
     and the top bar; Ali's ruling recorded in DESIGN_AUTHORITY §M8a item 11 (O-7's old line struck), the plan's §10
     §3.2 and the design delivery's DECISIONS (D-13 (b) and D-15 superseded in part). Contrast ruled: at least 7:1 on
     the desktop links (the ink gives 8.98:1), the -200s on a lit pill (6.85:1). **Left — the journey tab first**, by
     the helper's plan, ready to build in one pass: `journeyTabsFor(millionea)` the one drawn list (Millionea spliced in
     after Juu/Chini); the `/millionea` row lights it, falling back to Maswali when the drawn tabs lack it
     (`/millionea/tickets` stays Tiketi zangu's, above it); `activeTabFor`/`tabAriaCurrent` read the drawn list;
     AppShell hands the visibility to both journey components; a five-track rail modifier beside the byte-identical
     four-track rules; the pip's Millionea glyph exists (the registry's "millionea"). Re-pin: `journey-shell.test.mts`
     (§1's table and census — whether the 9.entrance census then counts `/millionea` as a journey root is settled by
     its run — §8's components, and the red worlds that plant four-tab lists), `maswali-ui` 5.1 and 8.5,
     `simple-journey-flag`, `visual-pass-r4i`, `-r6c`, `-r9c` (a five-label twin of §4's widths), and
     `qa-journey-shell.mjs`'s copy of the table. ⭐ The lead's ruling on the widths (measured with r9c's own model:
     with five tabs a slot is 72px at 360, and the Swahili "Tiketi zangu" needs 83.2): while five tabs show, the rail's
     tickets tab carries a short Swahili label, "Tiketi" (its page keeps the title). U43's full "Juu na Chini" name
     wraps on the five-tab rail below 416, with all pips top-aligned; English and Chinese centre from 317. The thresholds
     are re-derived from the five real labels. **Then** the classic top
     bar's core link after Up & Down — Results folds into More at 1024–1279 only while Millionea shows, which needs
     More's lit state to know the band (at 1280 and up the hidden Results row would light More too) and its
     screen-reader text; the header-fit anchors and red read that file. Merge it into
     `maswali-s4` BEFORE the four render jobs, so they shoot it: both shells, 320–1920 × sw/en/zh, shown and
     withdrawn, lit and unlit, reduced motion, forced colours — then Ali's look at STAFF_PREVIEW.
  2. **S7 → `main`** after S5: `mln-sf` = `1b8744e8` in code (S5 + S7 + the lead's F1–F5 + rounds 2 and 3 + W3; the
     commits above it carry only this block).
     ✅ **PROVEN before round 3 (`acf4caf8`, 2026-10-18 15:13 UTC): `tsc` and all 54 derived suites green** — every
     static census and gate, and on both stores `maswali-player` (180/180), `maswali-adversarial` (184/192),
     `-engine` (109), `-settle` (100), `-purchase`, `-void`, `-shared-paths`, `-close-race`, `-config`, `-rbac`;
     `e2e:maswali-fault` 16/0; and `prisma migrate deploy` applied every migration — the fence's lock-wait retry
     included — to a scratch Postgres 18.
     ✅ **Round 3 MERGED** (`e47159f7`; reviewed clean: no BLOCKER, no HIGH; its one conflict, the adversarial floor,
     taken at round 3's until the merged run prints its counts; D19a re-pinned at the merge in `1b8744e8`): a slip
     opened before its week was made final never sells (`millionea_week_final`); a running week's frozen rules are
     read against their own version; the float latch (replaced in round 4); the platform's own resolution fails closed on an unread
     two-officer setting; the close retry is measured from the refusal; `/pools` shows unreadable figures as unknown;
     the holiday-save plant. ✅ **On the merged tree (`1b8744e8`, 18:24 UTC) the twelve derived checks that need no
     Postgres are green:** `test:house-bot-disclosure` (the D19a re-pin), `test:failure-reasons`, `test:i18n`,
     the maswali-i18n suite (S5's, its npm entry lands with S5), `test:red-anchors`, `test:control-gates`, `test:privacy-notice`, `test:popup-fit`,
     `test:maswali-design`, `test:maswali-ui`, `test:two-admin`, `test:bulk-resolve`.
     **Still owed on the merged tree:** `tsc`; the derived suites that need Postgres or a server — `test:maswali-purchase`
     (103/106), `test:maswali-player` (182/182), `test:maswali-adversarial` (185/193), `-config`, `-engine`, `-void`,
     `-shared-paths`, `test:maswali-rbac` and its red, `red:maswali-money-path`, `test:house-bot-reports`,
     `test:results-freshness` — each floor then raised to its printed count; shots of `/admin/maswali` (the rules and
     holiday forms) and `/pools`; round 4 (below); then `test:all` + `e2e:money`/`e2e:fault`/`e2e:card` on a
     throwaway Postgres (a money push), and the push.
     ⏭ **S7 round 4 — BUILT on `mln-s7-f4` = `a9e6c8ce`** (rounds 4–6) (all seven items of round 3's review; nothing run yet).
     **Its review (22:2x UTC):** items 1–4 confirmed — the locks (no cycle), every interleaving of a purchase and a stop,
     each same-key replay, the census re-pin; not mergeable as it stood: two money-path plants anchored on text round 4
     removed, the Pools next-act cases unreachable in a full run, and an unreadable two-officer setting drawn strict
     removed the seal's typed confirmation (MEDIUM). **Round 5 DONE (`2f3425b8`)** (nothing run): the float plants resolve again (a third for the
     drained-by-others case); the Pools next-act cases run on a live line before §15, and the stop's words in the
     passes-on state are its own (SU.7, SU.7b); while the two-officer setting is unknown no resolve control is drawn,
     and the action refuses any ceremony but the one the page drew (closing the toggle-between-render-and-click race);
     red plants for the in-lock check, the stop's market lock and the OPEN guard; the toggle names an unknown setting;
     the config test's floor at its static count; the stop's patch inside the lock transaction; SF.2b. Ruled: the
     float measure stays — a winner's completed withdrawals are drawn on the share first (the alert tracks the jackpot
     shares still to leave; every balance's cover is the platform's own float control); one grouped read instead of
     one per winner is a LOW for later. **Round 5's review:** both HIGHs fixed (every plant resolves once and each is killed by
     its case; the Pools cases run on a live line; the passes-on words are true), the seal fixed on both single-market
     controls; one MEDIUM of the same kind left on the bulk bar (an unknown setting drawn strict, so a recovered read
     could seal markets the officer confirmed as staging) and a LOW (the action and the service each read the setting).
     **Round 6 DONE (`a9e6c8ce`)**: the bulk bar is hidden while the setting is unknown, posts the
     ceremony it drew, and the bulk action refuses a missing or different one before any market; one read decides the
     ceremony in both actions (passed through to `resolveMarket`); its plants re-anchored (run `red:house-bot-c5`
     too, and a render of `/admin/resolver-queue` with the setting unknown, on and off). What round 4 built: the stale-slip refusal is an OPEN week's only (SF.7, SF.8), and runs inside the locks too — the
     money service refuses after its fresh week read, after the wallet-lock replay and before the money transaction —
     while the stop makes an OPEN week final under that week's market lock (SF.2a, SF.6a, SF.6b; the Ruling 232 census
     re-pinned, both positioned writes byte-identical, six lines lower); its words say the final week's rule now
     applies (en/sw/zh — D19a red until re-pinned at the merge); the ops census and both resolver pages read the
     two-officer setting fail-closed (an unknown drawn strict and named); `/admin/maswali/pools`' stop control names the
     Owner's next act when it offers no week (`stopNextActNow`, on the console's standing read; SC.1, SC.2); the float
     finding is judged against the winners' shares not yet withdrawn — round 3's latch removed, so a drain by other
     withdrawals brings the alert back (FL.4g, FL.4i); a version-1 money ceiling under which every sum stays exact
     (4.13, 4.14). Floors (static, after round 5): `test:maswali-purchase` 109/112, `test:maswali-adversarial` 190/198,
     `test:maswali-config` 56, `test:bulk-resolve` 206. Run (its derived
     list): `test:maswali-purchase`, `test:maswali-adversarial`, `test:maswali-config`, `test:maswali-shared-paths`,
     `test:maswali-void`, `test:maswali-engine`, `test:maswali-player`, `test:house-bot-reports`,
     `red:maswali-money-path`, `test:failure-reasons`, `test:predictor-shown`, `test:bulk-resolve`, `test:one-sided`,
     `test:unsaved-changes`, `test:house-bot-console` (each with its red twin where one exists), `test:control-gates`,
     `test:labels`, `test:overdue-format`, `test:house-bot-surfaces`, `test:i18n`, the maswali-i18n suite (lands with S5),
     `test:criterion-i18n`, `test:red-anchors`, `test:eyebrow-roles`, `test:maswali-settle`, `test:betting-ink`,
     `test:admin-action-gate`, `test:two-admin`, `tsc`, and a render of `/admin/resolver-queue` and `/admin/resolver/[id]`
     (the setting unknown and known) and `/admin/maswali/pools`. Then merge it into `mln-sf` (D19a re-pinned at the merge).
  3. **`mln-redfix` = `a418e3bf` → `main`** (test-only): four red harnesses re-anchored on the code as it stands
     (`enter-where-pressed`, `journey-tickets`, `journey-updown`, `root-has`). ✅ **PROVEN 2026-10-18 15:29 UTC:** each
     red alone caught every plant and each green suite passed (8 of 8). Every text it plants on exists exactly on
     `main` `d09fd050` (checked), so it need not wait for S5: cherry-pick it onto `main`, then `tsc`, the four reds and
     their four green suites on that tree, push. (`red:shell-boundary` and `red:wallet-reach` 21 are W2's: the phosphor session has the details.)
  4. **The S6 lanes**, each SQUASH-merged after S7 on its last clean review (some early commit messages quote removed
     wording; delete each lane branch on origin after its merge):
     - `mln-s6-legal` `c7bd32ec` — **merge-ready** (rounds 5, 6 and 7 reviewed clean; round 8 = the decision table's
       attribution and H.12's own control). Its merge resolution is below.
     - `mln-s6-data` `80992915` — **merge-ready** (round 8 reviewed clean: THREE tiers on the integrity page — weeks not
       yet settled, then settled weeks still holding a share, then decided weeks, the one order within each; round 9 =
       comments and labels only; floors `test:maswali-integrity` 50/store, `test:maswali-evidence` 67/69, 22 red plants).
     - `mln-s6-reports` `94a92579` — **not merge-ready: round 14 below, then its runs.** Built and reviewed through round 10: R4
       reads each sign-up's FIRST ticket only and R2 each chunk's own span (both confirmed exact); the harm watch's
       ticket read has its own time budget, its race proven on the real clock (H.11i2); one header vocabulary;
       "Cannot be read" for every missing figure on the Pools page; the pack's jackpot metric names stay (the
       regulator pack's own — ruled). The public repository: each fixture is described by what its account exercises;
       the harm watch's header, `docs/S13-PLAN.md`, `COMPLIANCE-DECISIONS.md` and `rg-doors.test.mts` (its control
       fixtures now built from made-up tokens) say what the detectors enforce — the pushed history stays as it is;
       H.10 sets aside only the module's own constants, by name, and fails any other constant, product or literal
       carrying a figure; H.10e reads the prose of the cases, the test, `harm-watch.ts` and the plan sentence by
       sentence and fails a sentence that names a detector beside a figure with a time unit or a counted number, or
       slack beside a span — a plant per form, every figure made up (its review: every earlier gap closed, nothing
       legitimate flagged). Round 11 (`bafccdc1`, not yet reviewed): those test strings and H.10's allowlist; the read's
       chunk-size seam refuses any size but a whole number ≥ 1; M.12j reads with a marked unit last in a chunk and
       counts the reads on both stores. **Round 12** (the lead's ruling from round 10's review): a sentence that names
       a detector carries no unit of time at all, figure or not (the detectors are described as recent); the scan
       reads string and template literals as well as comments, every name a detector goes by, each sentence with the
       one before it, and every file that discusses the detectors (`rg-doors.test.mts`, `COMPLIANCE-DECISIONS.md`
       added); its slack and abbreviation words widened. Round 12 (`89f5a577`) did the policy pointers: the plan's owner
       summary and the compliance record now point at the published responsible-gambling policy instead of restating
       its patterns. The stricter guard is modelled (it flags the sentences still to reword) but not yet ported.
       **Round 13** (the lead's rulings on its three questions): the harm watch's own cadence — its daily count, its
       EAT day, its weekly report — is described in sentences that name no detector (split them; the rule stays
       strict); the bare word "detector" counts in the harm-watch files only — elsewhere only the harm markers' own
       names and "harm detector" count (the AML and ticket detectors are other things; a ledger entry is reworded only
       where it names a harm detector's parameter); the pairing with the previous sentence applies to a figure or an
       article with a unit, not a bare unit word; every plant's text built from joined tokens. Then reword until the
       model prints none, port the rule, a plant per new form — **DONE (`53611f41`)**: reworded until its model finds
       none in the six files; the rule ported (comments and string literals, the six files, the rulings above); thirteen
       new plants, every name and unit joined from tokens (its red twin now 49 plants). Floors (static counts): `test:harm-watch` 28/store (its red
       twin 51 plants), `test:journey-measures` 29/32, `-view` 51, `test:maswali-reporting` 53/58; run
       `test:rg-doors`, `test:harm-watch`, `test:journey-measures` (each with its red twin), `-view`,
       `test:maswali-reporting`, typecheck. **The review of rounds 11–13:** merge-ready for the six scanned files — every earlier finding
       closed, nothing legitimate flagged, each of the 26 plants fires once; open: three files outside the scan still
       state detector parameters (a marketing module's comment, a campaign test, a support doc — reworded and added to
       the scan, never repo-wide, where legitimate figures abound), and a figure without a unit (a bare threshold, a
       multiplier, an amount) still passes in a sentence that names a detector. **Round 14** (those, two unit forms, and
       M.12j's Postgres order) — item 1 **DONE (`63623dd3`)**: the three files reworded by what the
       detectors enforce and named in the scan (nine files; its model finds none). **Left — round 15:** any figure in a
       sentence that names a detector fails it — the lead's ruling: a REFERENCE is no figure (a date, a file's line
       reference, a plan or section id with its hyphen or §, a case id), carved out exactly; every other digit run,
       number word, multiplier word or currency amount fails; a plant per form. Rounds 14's small items **DONE (`94a92579`)**: two more unit words (a plant each; 28
       forms caught); the first-ticket read sorts the ids it reads, so M.12j's chunk-last unit is marked whatever order
       Postgres returns — a read that skips a chunk's last unit fails on both stores.
       **Left for the lead to schedule:** derive the harm watch's candidate window from the detectors' own constants
       (`responsible-gambling.ts` exports none: inline literals in a module that many anchor files and scripts pin).
     - `mln-s6-notices` `1d22c1e3` — **not merge-ready: rounds 13–16 await their review and runs** (round 12's letter-path
       blocker is fixed in round 13). The LETTER PATH (reviewed through round 10 as merge-ready, LOWs only): an uncertain win or refund letter is resolved through the provider's outbound
       search on THAT letter's own metadata within the attempt's own dates — found → confirmed; absent → resent once,
       never again; unreadable → listed for an officer on `/admin/maswali/integrity`, never resent automatically; only
       an attempt older than a margin is searched, so a search never races the provider's own send; a bare attempt, or
       an outcome that never landed, stays unresolved, never done; the attempt records the address it went to as a
       peppered hash, and a letter whose address has changed is left for an officer (a pepper rotation leaves every
       pending letter listed, never resent — a runbook line); "never left" needs the connection's own failure; the
       unresolved-letters read is bounded and says so on the page; the officer's clear action (a typed confirmation and
       a note, its own compliance control in every registry, one audited record that must land; a later run lists the
       row again). The CLAIMS LINT (prize stems, implicit claims, number words, look-alike digits; the lead's rulings
       below), round 11 (not yet reviewed): a prize or win word anywhere in a figure's sentence ends the limit reading;
       a figure is a price only when a ticket, entry or price word heads its phrase; a reader word makes a money figure
       a claim outside a question too; a "next" frames a figure beside the reader or in a "who … next" question, a
       waiting verb in its present or future forms frames it, and a sales count after a figure reads as a count — the
       review's ordinary campaigns are controls (`5bfb267f`; the lead confirmed both readings). **Round 12 DONE (`b6a7261c`), the LOWs:** the console orders weeks by when they
       ended (a drive week never hides behind public ones) and says on the card when a record read was cut; a phone word
       after a number makes it a phone; a third person's figure in a reader question with no prize word is not a claim
       (a get or earn verb before a figure stays a claim — ruled); a provider 5xx is ambiguous, searched before any
       resend. ⛔ **MERGE BLOCKER found in round 12:** the letters' record targets and the address hash were keyed with
       the sign-in codes' pepper, so rotating it would RESEND pending money letters. **Round 13** (the lead's ruling):
       a letter's record target is stable for its whole life (the week and the account, never that pepper); the
       address hash records its pepper's version, and an attempt whose version cannot be read is listed for an officer,
       never searched or resent; cases across a rotation; then the runbook line — **DONE (`3d191e0c`):** the target is
       the week and the account; each attempt records its pepper's version, an unreadable version is listed, never
       resent; cases 8.11k–m (a rotation between an attempt and the next run; a confirmed letter and a completed run
       stay done); the runbook line in the notices module's header. Round 14 (the lead's ruling): no internal account
       id leaves for the provider — the letter's metadata is a one-way digest of its stable target — **DONE (`f70398b6`)**, neither the
       account id nor the address leaves (8.11n). **Rounds 11–12 reviewed:** every earlier finding fixed and the letters
       and console path sound; the LINT not merge-ready — its reader rule refused ordinary campaigns, its price rule
       admitted a prize figure, and some comments described exemptions. **Round 15** (the lead's rulings: a reader word
       counts only where it governs the figure; a figure belonging to someone else, an account figure or a price is
       read as such only on its own words and never beside a prize word; the comments say what is enforced; the
       LOWs) — **DONE (`a9d1691d`)**: every probe claim refused and every ordinary campaign the
       review found passing, by the lane's own model (no suite has run); a provider 5xx stays ambiguous for money
       letters only. Then (ruled) a payment by 50pick is a claim unless its sentence names a tax, fee or levy — **DONE (`1d22c1e3`)**. Floors (static
       counts): `test:maswali-claims` 480, `test:maswali-notify` 124/129, `test:maswali-rbac`'s control count one
       higher than its base; run typecheck, `test:maswali-claims`, `test:maswali-notify`, `test:cert-c2`,
       `test:control-gates`, `test:maswali-rbac`, `test:audit`, `test:dal-parity`, `test:house-bot-reports`, and
       whatever the diff derivation adds — then the review of rounds 13–16.
- **At the merges** (each branch trial-merged onto `mln-sf` with `git merge-tree` before round 3 merged, 15:30 UTC — re-run it on the current head; ⛔ resolve every hunk by
  hand, never `checkout --ours/--theirs` a file — either side alone drops the other's work; after any change to a
  file D19a pins — `house-bot-absence-cases.mts` APPROVED_EXTRA: the dictionary, the legal pages — re-pin it in a
  follow-up commit to a commit whose copy equals the merged file, ⛔ always one on the integration branch (the merge
  itself), never a lane commit: the lanes are squash-merged and their branches deleted, so a fresh clone could not
  read it):
  - **`mln-s7-f4`** (rounds 4–5) merges onto `mln-sf` with no conflict (trial merge, 22:35 UTC); it changes the
    dictionary (the refusal's words): re-pin D19a at its merge. **`mln-s5-tab`** merges onto `maswali-s4` and onto
    `mln-sf` with no conflict; it changes no file D19a pins.
  - **L:** the dictionary's three `ruleSunset` lines (take L's, then add round 3's stale-form clause), the rest of
    both sides' strings kept; COMPLIANCE-DECISIONS (L's 2026-10-18 entries above S5's 2026-10-17 one); `package.json`
    a union; L also changes `src/app/legal/rules/page.tsx`, which D19a pins too — re-pin the dictionary and that page
    (and approve any new legal file the census names; of the lanes, only L and round 3 touch a pinned file);
    `test:maswali-fairness` on the merged tree; regenerate the PDFs (`node scripts/generate-rates-pdf.mjs`,
    `node scripts/generate-pdfs.mjs` — the operator guide has never been made).
  - **D:** `maswali-rbac.anchors.mjs` (both sides number new plants from (7): keep both, renumber D's after S7's and
    their `expect` strings with them); `maswali-rbac.test.mts` (both sides take §6: D's sections follow S7's, the case
    names with them); `admin-nav-groups.ts` (main's PHOSPHOR rows carry a `glyph`: D's Evidence and Ticket-lookup rows
    need one too, from the Phosphor set); `maswali-config.ts` (take round 3's `rulesV1Problem`: a frozen snapshot is
    read against its own version, and D's new setting is one no week freezes, so D's adaptation of the old check falls
    away).
  - **R:** `package.json` a union; round 3 and R made the same unknown-never-zero change to `poolsView` and the Pools
    table independently — keep R's (its `money()` helper), with the union of `maswali-console.ts`'s imports; one word for a missing figure on the Pools
    page, "Cannot be read" (align S7's "Needed now: Unreadable" and `/admin/maswali`'s standing figures, `page.tsx:57-60`), and `pools/page.tsx`'s `formatTzs(v.requirement)`
    → the nullable-aware `money()`; `test:house-book` MIN_ASSERTIONS to its printed count.
  - **N**: `package.json`; the money-path anchors and red harness (both sides' suites);
    `control-gates.test.mts` (each role's row gains both sides' controls); ⚠️ `maswali-rbac.test.mts`'s Millionea
    control count — both sides now pin the SAME number, so git merges it with no conflict although the union is
    higher: recount it after the merge; `maswali-console.ts`'s imports; `maswali-service.ts` (the close's lock callback keeps
    S7's lock transaction AND N's after-commit hook). Measure the production "SmsMessage" table read-only before its
    winner-SMS migration ships (the query is in its header).
  - **Between the lanes** (pairwise trial merges): the integrity page (D, R, N), `maswali-console.ts` (R, N, round 3),
    `maswali-config.ts` (round 3, D), `pools/page.tsx` (round 3, R), `package.json` (all) — merge in the order S7 with
    round 3 → L → D → R → N, each onto the one before, so every later lane resolves against what landed.
- **Decisions taken under delegation this round** (each reversible): a stop ordered after a week's sales close cannot
  take that week (it settles under its own rules), and the Owner's next act makes the next week to open (once drafted)
  the final one, even at short notice; a measure leaves out a unit only when its player bought a Millionea ticket
  within that unit's own horizon (any week's, the drive's included); the cluster report orders every line by one rule
  (a winner's line first), in three tiers of weeks — not yet settled, settled still holding a share, decided; a campaign
  named as Millionea's is never grandfathered by the claims lint, and elsewhere a figure is a claim beside a prize or
  win word, judged within the figure's own clause; a figure is a limit only where a money-movement or limit word
  introduces it — a period alone never makes one (weekly is Millionea's own cadence); a prize or win word anywhere in a
  figure's sentence makes it a claim, in a question too and the limit reading included (a limit message names no
  prize), and so does a sentence putting the figure in the reader's hands or future; a money letter whose fate is unknown is
  checked against the provider's search, never resent blind; the rules and holiday forms are the Owner's; a final week's
  carry stays in the jackpot account; a week made final while on sale is announced to every form opened after it, and a form opened before it cannot buy;
  (2026-10-19) the Millionea tab's look on Ali's Kalshi reference — one still gradient, no motion, at most a faint
  halo; while five tabs show, the Swahili tickets tab carries the short rail label "Tiketi"; a reader word governs a
  figure only where it governs it, and a figure belonging to someone else, an account figure or a price is read as such
  only on its own words, never beside a prize word; a payment by 50pick is a claim unless its sentence names a tax, fee
  or levy; a money letter's record target is stable for its whole life, and only a one-way digest of it reaches the
  provider; the float alert draws a winner's completed withdrawals on the share first; in the harm watch's guard a
  reference (a date, a line reference, a plan, section or case id) is no figure.
- **Gate B (before ACTIVE):** MB-23 the objection door; OD-26 the regulator's stop and a week void for a 50pick fault;
  MB-69 the rules version on each ticket; S7's three KNOWN-RED cases (§6.1 line 14 and `FAILURE-INVENTORY.md` §9, on
  `mln-sf`); the restore runbook re-applies the database's triggers and functions (a backup carries none).
- **Helpers** follow AGENTS.md (the one rules file). On Ali-Blade15 (failing RAM) a lane writes and runs nothing — the
  lead runs every heavy job through `~/heavy-node-lock.sh`, one at a time — and spawns no agents; at most four agents per
  session. Each lane round is briefed from its independent review's findings.
- **For Ali:** the Millionea tab — your look, on STAFF_PREVIEW, with the tint choice above; STAFF_PREVIEW after the S5 push (`railway login` once on the lead's machine, or set
  `FEATURE_MILLIONEA=STAFF_PREVIEW` in the Railway dashboard — a restart; `WITHDRAWN` undoes it); R10c (who may buy a
  DRIVE-week ticket); and, when S6 merges, the complaint-answer time (a setting, default 5 days).

**State (2026-10-18):** S0.5 to S4, D3, the S3 review's fixes and S5's foundations are on `main`, dark: no Millionea
screen, door or sale exists for anyone. The rollout is `WITHDRAWN` on production, and no week can open there without
the licence basis and the guarantee (Gate A, §6).
- **Done:** S0 ✅ at `de8a00619`; D1 ✅ at `e224aef46` (the R2 package, stamp `72ca5cff9`); D2 ✅ at `2b335451f`;
  S0.5 ✅ at `9834aaf0`; D3 ✅ at `2b6bf5bf`.
- **On `main`, dark, at `f312d652`.**
  - S1 to S4 complete: the law, config, accounts and schema; the week engine; the money path; the admin console with
    its seal console, release, pause and Owner ceremonies.
  - The adversarial review's R1 to R10. Only R10c is open, and it is Ali's to rule (the table below).
  - S5's components, read models, gate and actions. No player route exists yet.
  - Two defects found on the way, fixed:
    - the builder's checklist said "every check passes" while the open refused for want of a licence basis or the
      guarantee (`b495ede2`);
    - the "limits used" panel left out an in-flight deposit the deposit-limit gate counts. It is a platform defect
      older than Millionea, fixed for every player (`f5433f86`).
  - Read from the console's own shots: its status tiles clipped money and times on a phone and at 1280. They now
    stack, and show the day as the figure (`6bf726ef`).
  - S1 to S4 stay 🔨 until `test:all` runs at the milestone close (§1).
- **The verification of `f312d652`.** Each heavy step took its own turn on the machine-wide lock (below).
  - **Types and build** on the merge with W2 (`ca1febdc`): `tsc` ✅ and `next build` ✅.
  - **Icons and design guards** on the same merge: `test:glyph-map`, `-sync`, `-source` and `-motion` (0 failures).
    `grid-paging` 41, `type-scale`, `spacing-scale` (405, at its ratchet), `ui-consistency`, `admin-clip` 14,
    `measure`, `eyebrow-roles` 672, `admin-nav` 27 and `layout-staleness` 79. `visual-pass-r5i` 117, `-r7b` 50, `-r8a` 89,
    and `-r9a` 55 (Millionea's How-to glyph named at Phosphor's own placement, `1fe0f4a9`).
    `test:maswali-rbac` 278 and `test:house-bot-disclosure` 122.
  - **Every two-store suite, green on memory AND Postgres** (on the code W2's merge left unchanged; W2 changed icons
    only): `test:maswali-player` 149, `-void` 57, `-settle` 100, `-engine` 109, `-purchase` 100, `-close-race` 13,
    `-integrity` 10, `-shared-paths` 16, `-fence` 29, `test:results-freshness` 58, `test:house-bot-reports` 81.
    `e2e:maswali-fault` 16/0, the migration probe 15/0 and `verify:backup-schema` 13/0.
  - **The platform's money battery** on a throwaway Postgres (`6bf726ef`): `e2e:money` 64/0, `e2e:fault` 34/0 and
    `e2e:card` 100/0. These are the same counts as the last baseline, so Millionea's edits to the shared money paths
    leave deposits, withdrawals, bets, faults and cards intact.
  - **The render check on `f312d652`:** `qa:live` 377 of 377 up to its Millionea-dark section. That section runs on
    production in the read-back, where Millionea is WITHDRAWN. Also `admin-section-gate` 21/0 and `needle-rest`
    92/0, plus `revoked-deadend` 46/0 and `motion` 43/0 on `6bf726ef`. The console: its shots 65/0, and its acceptance drive 61/0 with one skip that names its
    reason (no calendar fixture in the memory store). The checklist names the licence basis and the guarantee, and
    the week opens at the first press (4.3, 4.4). The status tiles were re-read at 360 and 1280 after their fix.
  - **Not run on this push: `responsive-audit`.** On Ali-Blade15 one surface's sweep on a `next dev` drove free memory to
    346 MB, and the machine guard stopped it. It runs at the milestone close, in route chunks, one fresh server each.
- **On branches, not yet merged:**
  - `mln-s5-pages`: S5's player routes, doors and shells. Its independent review's 13 UI findings are fixed, and the
    S5 server lane's round 3 (`mln-s5-srv3`) is merged into it. A second independent review read the live surfaces
    with Millionea `WITHDRAWN`. Its two HIGH findings are being fixed in the lane:
    - the live privacy page named Millionea while dark — the paragraph and its version now publish only with the
      ceiling;
    - a signed-in player who typed the tickets address saw the product's name in its loading drawing.
    It merges after those fixes, with its suites, the player drive and the shots at 320–1920 in Swahili, English
    and Chinese, each read one by one.
  - S6 is written in four lanes:
    - `mln-s6-notices` (done, waiting for its review);
    - `mln-s6-reports`, `mln-s6-data` and `mln-s6-legal` (writing, or next).
  - S7's adversarial suite, `mln-s7-adv`, is next.

**Ali, 2026-10-17 — the build programme.** *"take your time and start implementing the whole maswali development …
when you face a decision take the decision based on how 50pick operates, based on previous bypasses we made as
management and the perfect final architecture … keep pushing so other machines always know where we reached …
perfect, consistent, work only accepted and fully responsive … at the level of the Vodacom plan and normal 50pick
until we decide what goes live."* He also answered three numbered choices the same day:
1. **Each finished session merges into `main` dark** (rollout `WITHDRAWN`).
2. **Production goes to STAFF_PREVIEW** once S5's screens are verified.
3. **Any session that finishes pushes `main` itself** (the header's quote). The route was approved in plan mode and is
   below.

**Next:** S5. In order:
1. Merge `mln-s5-pages` after its review.
2. Run the S5 batch: tsc, build, the derived suites, the render check, the player drive, and the shots read one by one.
3. Push.
4. The staff preview waits on two things: the phosphor lane's W2 on `main` (Millionea's 13 icons draw through `I`
   only after it), and Ali's look.

Then S6's four lanes merge, each after its own review and suites; then S7; then S8's preparation for Gate A.

- **The adversarial review of S3** (an independent reviewer, 2026-10-17). Each finding was confirmed or refuted against
  the code before its fix, and each fix carries a case that fails on the old code:

  | # | Finding | Severity | State |
  |---|---|---|---|
  | R1 | A week void that fails after its stamp never refunds; at a few thousand tickets the generic VOID arm times out | HIGH | merged (`6c2eef1e`): one bulk refund transaction (2,000 tickets inside the budget), retried by the tick and the heal until it lands, a critical alert until then |
  | R2 | The close is not serialized with a purchase or cancel in flight | HIGH | merged (`cac6daa2`); `test:maswali-close-race` 13/13 on Postgres, red plant (R2) |
  | R3 | The same carry can be claimed twice; nothing checks that the jackpot covers R | MEDIUM | merged (`6774db38`): the claim inside the payout's own transaction, in calendar order, under the jackpot |
  | R4 | Three reads after a joined money transaction see pre-commit data on Postgres | MEDIUM-LOW | merged (`b5fa9249`, `6774db38`) |
  | R5 | The "limits used" panel sums a different net from the loss-limit gate | MEDIUM-LOW | merged (`b5fa9249`); its deposit meters' in-flight deposit fixed for every player (`f5433f86`) |
  | R6 | A held share's freeze can be lifted mid-settlement | LOW-MEDIUM | merged (`6774db38`): holds and lifts on one lock; the stray-hold heal |
  | R7 | Funding the guarantee has no idempotency | LOW | merged (`b5fa9249`, `25c5f99d`): one reference books once, in any case |
  | R8 | Forfeit and hold write the ticket outside their transaction | LOW | merged (`6774db38`) |
  | R9 | A final week with a wide top-score tie may never settle | LOW | merged (`6774db38`): winners in bulk; about 7,000 distinct winning players fit the 30 s budget (S7 measures it) |
  | R10 | Defence in depth | LOW | (a, b, d) merged; (c) is Ali's to rule — who may buy a DRIVE-week ticket |

- **The S5 lanes' reviews** (independent, 2026-10-18):
  - The UI lane: 2 HIGH, 5 MEDIUM and 6 LOW, all confirmed and fixed on `mln-s5-pages`. The HIGH ones: a past-tense
    refund shown while a week was only voiding, and a win line drawn before the objection window closed.
  - The server lane: no HIGH. Its 3 MEDIUM and 6 LOW are fixed in round 3: weeks in calendar order; the final week's
    "cannot win"; forfeited shares; paging; the seen-mark race.
- **The machine (Ali-Blade15, 2026-10-17/18).** Two bluescreens (18:18 and 20:08 UTC; failing RAM). Ali: *"coordinate
  between sessions to prevent pc crash again"*. Both sessions now share:
  - one heavy-job lock (`~/heavy-node-lock.sh` v4): first come, first served; a memory floor; a watchdog;
    boot-aware; a shared event log;
  - a machine guard that stops the newest heavy Node job before memory runs out (`~/machine-guard.sh`; after a
    reboot, `bash ~/machine-guard-start.sh`);
  - at most four helper agents per session.

The route:

| Order | Session | What ships | Ali |
|---|---|---|---|
| 1 | S0.5 | No door, screen or report can treat a Millionea week as a Yes/No poll, in either store. One integrator commit | — |
| 2 | S1 | RULES §2.12 ceremony, `maswali.config`, ledger accounts, 3 additive migrations, rollout switch (WITHDRAWN) | — |
| 3 | S2 | Grading with reserves, money arithmetic, salted commitment and Merkle root, week lifecycle, scheduler | — |
| 4 | S3 | Buy, free cancel, settle, rollover, top-up, refunds, guarantee ceremonies, sunset — both stores | — |
| 5 | S4 | `/admin/maswali`, `/pools`, `/integrity`; seal console, release, pause, Owner ceremonies | — |
| 6 | D3 | DA §M8 "Millionea exceptions", glyphs, status rows (filed from the answers below) | already answered |
| 7 | S5 | Every player screen in both shells, three languages, five widths; then STAFF_PREVIEW on production | **looks at it** |
| 8 | S6 | `/fairness`, notices, tax report and statutory pack, data, support, final legal and PDFs | Finance OD-08 (Gate B) |
| 9 | S7 | Adversarial: concurrency, clock changes, the Friday rush, covering clusters | — |
| 10 | S8 | Drive scripts ready; then **stop** for Gate A (§6) | **Gate A** |

**How every session ships.**
- **Work and commits.** Work in the session's own worktree on `maswali-build`. Commits are staged by name, with the
  tracker in the same commit.
- **Checks during the work.**
  - Each change carries its own guard and red twin.
  - Each push runs the suites derived from the diff (grep `scripts/` for every changed path), then `tsc`,
    `next build` and local `qa:live`.
  - A money session also runs `test:all`, `e2e:money`, `e2e:fault` and `e2e:card` on a throwaway PostgreSQL.
- **Merge and read-back.** Merge `origin/main` into `maswali-build`, push `main`, then read back production per AGENTS.md §4.
  `?dpl=` must match on all three hosts, health must pass, `qa:chunks-prod` and production `qa:live` must pass, the changed pages are looked
  at in a real browser, and every Millionea route must 404 while WITHDRAWN.
- **Docs-only pushes.** Run the changed document guards and mutation proofs, plus AGENTS.md §4's typecheck,
  exact-commit build, local `qa:live` and production read-back. Every `main` push deploys the real-money app.

**Decisions taken under Ali's delegation (2026-10-17).** They are recorded here and in the v6 manifest's L-rows.
1. **The won chip.** O-6's success chip is a Millionea-only `STATUS_TONE_EXCEPTIONS` row. Yes/No and Up & Down won
   chips stay gilt, which `visual-pass-r5c` and `r7b` pin.
2. **The receipt's legal line.** It prints `resSingleOfficer` and switches to `resTwoOfficer` only when the platform's
   two-officer flag was on at stage 1 (L3).
3. **Rule figures.** Every rule figure in a string is a placeholder filled from `maswali.config` or the week's frozen
   `rulesSnapshot` (L2: admins can change everything).
4. **The home card.** It sits after the head and before the chips (O-7). `test:journey-home` 7.order is re-pinned on
   purpose.
5. **The slip and `MONEY_ROUTE`.** The slip does not join `MONEY_ROUTE`, because `surfaces.ts` is pinned VERBATIM. The Needle and the chat bubble
   stand down through route rules of their own.
6. **Files shared with Vodacom.** The unmerged Vodacom S15/S16 flip branches touch `feature-state.ts`, `i18n-dict.ts`
   and `market-service.ts`. Millionea's edits there are additive and in separate regions: the `millionea` namespace is
   appended at each locale block's end.
7. **⭐ Icons are Phosphor (Ali, 2026-10-17, while the build ran).** *"as u build the maswali another session
   implemented new source for icons and glyphs phosphorus. please dont use the glyphs … use the more creative ones and
   more reasonable and client like ones from the new kit, check what the phosphorus used and mark this in your plan
   perfectly visually."* So Millionea draws **no hand-drawn glyph**: the delivery's `sealNil`, `sealX` and the
   three-pearl coronet (O-5) are replaced, and every Millionea icon is a Phosphor icon reached through the family `I`
   (`PHOSPHOR-MIGRATION.md` R-NEW-PAGES). The picks, by meaning, are in **§10c**, with the specimen Ali can open.
   Motions are unchanged: N1–N3 as approved, on the platform's existing easing primitives (DA §M5).

**The answers to Claude Design's owner-ruling form (2026-10-17).** Each was checked against this plan and the live code
before it went to Ali.

| Item | Answer | Source |
|---|---|---|
| O-1…O-3 · N1 Kubeba, N2 Kugonga Muhuri, N3 Kukata Tiketi | Approve all three | RECEIVING Step 5's recommendation; each is built from existing parts. N1 stands only if it holds 50fps on the target phone (D3) |
| O-4 · a fourth motion | Keep unspent | Its only candidate, the needle aligning the ten sockets, is barred by the prompt (§8) and by DA §M8 |
| O-5 · the `millionea` glyph | Approve the three-pearl coronet | The family `crown` already carries two meanings: the Leaderboard icon (`avatar-menu.tsx`) and the "Matokeo mashuhuri" flag on `/results`. R1's coronet reads as its own shape at 14px |
| O-6 · the IMESHINDA tone | Approve: the word in success green, gold only on the amount | Missing from the form as Ali pasted it, so it was answered in the form's free-text box |
| O-7 · the home-card position | After the head (the How-to card and the headline), before the topic chips | The prompt's and RECEIVING's recommendation. It deviates from the sponsor deck's home, so Vodacom will see it in the preview before the flip (S15 waits for their approval) |
| O-8 · the reserve label | A1–A5 "Akiba" | It is R-RESERVES: "R1–R5, shown as A1–A5". R1–R5 stays the name in code and in the rules |
| Q5 · the closing pill | Both: the close time is always printed; the `.closing-pill` appears only in the last hour, counting minutes, as on Yes/No markets | The platform's C1a rule: `closingSoon` at one hour or less in `src/app/markets/[id]/page.tsx`, worded "Inafunga karibuni · {n} Dak" |
| Q7 · the door on a won ticket before the seal | "Ona matokeo", and the away line's "Fungua" becomes the same | It is the platform's existing door to the seal: `t.notif.awayView` opens it in `away-summary-bar.tsx`. "Muhuri" is art direction, not a dictionary word |
| Q11 · the sunset week's score line | Keep "Alama ya juu wiki hii: 9 kati ya 10 · tiketi 2" | The prompt's own wording for its rule 15 |
| Q2 · the second sample serial | MLN-W42-003310 (the player's 2nd ticket, bought Tue 20 Oct 09:41); MLN-W42-002083 (the 1st, Mon 19 Oct 20:15) if a frame needs it | Both are lower than 004417 because both were bought before it |
| Q3 · the moved close | Ijumaa 23 Okt 16:00 EAT, moved earlier from 18:00, announced Alhamisi 22 Okt 10:15 | A later move could reach only Ijumaa 19:00: the first event is at 19:30 and the buffer is 30 minutes (OD-15, MB-28) |
| Q1 · the attestation times missing from the sample | main 2 Mon 00:12 · main 3 Mon 09:10 · main 5 Mon 10:41 (the last, so results final) · main 6 Sun 20:36 · main 7 Sun 20:41 · main 9 Mon 00:14 · main 10 Sun 21:06 · A2 Mon 00:16 · A5 Mon 10:24. Timelines B and E reuse them. In D the week void becomes certain at Mon 10:24 (A5), so refunds are Tue 27 Oct 12:00 | Each time falls after its event. None falls before Sun 12:00, so the live frame's "5 kati ya 15" still holds. The windows follow MR-16 |

**Blocked on Ali:** nothing until S5's staff preview (to look at it) and S8's Gate A (§6). R10c (who may buy a DRIVE-week
ticket) is his to rule before S8.

**Before the staff preview (2026-10-18):**
- **The icons.** The phosphor lane's W2 swap must be on `main`, so Millionea's 13 icon keys render through `I`. Until
  then they draw as empty boxes, and `I.void` still reads as a miss.
- **The S5 UI review's findings, fixed in the composition lane:**
  - HIGH: the voiding view says "refunded" before any refund exists;
  - HIGH: the seal line draws the win line before the objection window closes;
  - five MEDIUM and six LOW.

**Owed by others:** Finance's written confirmation of the tax-report reconciling lines and of no withholding on
winnings (OD-08, MB-77) — Gate B, before ACTIVE; it does not block the build.

**Last handoff (2026-10-18, Ali-Blade15, S1–S4 and S5's foundations pushed dark at `f312d652`).**
- **Worktrees on Ali-Blade15.**
  - `C:\kipindi-maswali` (`maswali-build`) is the gate tree: real node_modules, and the only tree where `next build`
    and `next dev` run.
  - `C:\kipindi-maswali-s4` (`maswali-s4`) is the work tree. Its node_modules is a junction to the gate tree's, so
    `tsc` and `tsx` work there and Turbopack refuses.
  - The helper lanes live in `C:\kipindi-mln-*`. ⛔ Remove a junction with `[System.IO.Directory]::Delete(path,
    $false)` before `git worktree remove`, and never run `npm ci` through it.
- **The throwaway Postgres binaries are not a dependency.** They are installed with `npm i -D --no-save
  embedded-postgres@18.3.0-beta.17` (`scripts/db-scratch.mts` says why), so an `npm ci` removes them, and every
  two-store suite then fails at once with exit 2. Re-install them after any `npm ci`.
- **Heavy work goes through the machine-wide lock**, shared with the other session: `~/heavy-node-lock.sh`, `run` or
  `light`.
  - A job starts only with memory free, and its watchdog stops it before memory runs out.
  - The machine guard (`~/machine-guard.sh`) stops the newest heavy Node job at 0.5 GB free. After a reboot, restart
    it with `bash ~/machine-guard-start.sh`.
  - Read `~/.heavy-node-events.log` after any stop: a stopped job's result is invalid.
- **A render job runs one dev server, with its routes warmed one at a time, and one browser suite at a time.**
  `responsive-audit` runs per surface on a fresh server (it compiles every route it visits). The dev server must be a
  direct child of the job, so that a stop takes it too.
- **The money battery's fault suite** refuses a database without the disposable marker: plant it with
  `scripts/load/ci-plant-marker.mjs` (loopback only).
- **Five `test:all` members need a running server** (`admin-section-gate`, `motion`, `needle-rest`, `responsive`,
  `revoked-deadend`). They run in the render jobs.
- **One debt carried to S5.** `qa:seal` part B is stale: it waits for a "Day" field the sign-up form no longer has.
  S5's seal drive repairs it, unless another session already has.

The working tree `F:\kipindi-main` (OMEGA-COMPILE01) and `C:\kipindi-main` (Ali-Blade15) are shared by several sessions:
never build there. The repository is public: describe anti-abuse controls by what they enforce, never by their signals.

## §1 · Board

| Session | Title | Status | Note |
|---|---|---|---|
| S0 | Rulings recorded; plan, board, pointers, guard, R2 commission filed | ✅ | de8a00619 (2026-10-16), merged to `main` the same day on Ali's word |
| D1 | Design R2: the commission cut live and sent | ✅ | e224aef46 (2026-10-17): sent at stamp 72ca5cff9; its owner-ruling form answered the same day (§0) |
| S0.5 | Fence the third product line | ✅ | 9834aaf0 (2026-10-17): the fence on both stores, its red twin 17/17, test:all and the money battery green, merged to `main` dark |
| S1 | Law, config, accounts, schema, rollout switch | ✅ | on `main` dark at `f312d652` (2026-10-18); milestone close: source/database `test:all` 615/615 and its five server-bound browser suites individually green on S5's integrated tree |
| S2 | Week engine (no money, no UI) | ✅ | on `main` dark at `f312d652` (2026-10-18); the same milestone battery closes its deferred `test:all` gate |
| S3 | Money path (local and throwaway PostgreSQL) | ✅ | on `main` dark at `f312d652` (2026-10-18); the milestone battery and disposable PostgreSQL money, fault and card E2E are green |
| D2 | Design R2: received and inherited | ✅ | 2b335451f (2026-10-17): filed raw at `design-system/v6-2026-10-17-millionea/` with its INHERIT-MANIFEST; no gate failed |
| S4 | Admin console and operations | ✅ | on `main` dark at `f312d652` (2026-10-18); the milestone battery closes its deferred `test:all` gate, and the console's shots were read tile by tile at 360/768/1280/1920 |
| D3 | Ali's N1–N4 rulings, filed in DESIGN_AUTHORITY and motion.css | ✅ | 2b6bf5bf (2026-10-17): DESIGN_AUTHORITY §M8a, COMPLIANCE-DECISIONS, the manifests, the agency note; the N-block lands in `motion.css` with its first consumer in S5 (`test:dead-css`) |
| S5 | Player surfaces | 🔨 | on `claude/maswali-s5-release`, with the fix lanes and `main` `bfa0b7d57` merged (2026-10-21 PM) and the design lanes' 10/10 pass in flight; focused source and two-store action checks, the 198/198 disposable-PostgreSQL money battery, earlier player tiles and classic parity are green; final exact-commit suite, render, build, local live QA, dark deploy and production read-back remain |
| S6 | Fairness, notices, reports, legal, data | 🔨 | legal + data squash-merged on `mln-s6-int` `81c60f0f`; reports round 15 accepted on `mln-s6-reports` `57624a2f`; notices round 17 complete on `mln-s6-notices` `bd74c982c` (both BLOCKERs fixed; its final-head checks owed) — §0 |
| S7 | Adversarial hardening | 🔨 | on `claude/maswali-s7` at `2cba1f577`: F7 integrated, and S7-F8 1–6 — the held-winner release placed in 5 s sections of the lock (a 7,000-held week settles once in 81.6 s), measured on both stores and under the S16 10,000-ticket load; the S17 rush and the F7 6–8 render read are owed; lands after S5 |
| S8 | Live drive and public launch | ⬜ | starts when every §6 line but "(after ACTIVE)" is ticked; the first public week is the drive (Ali, 2026-10-22); closes on its record |

**Status values:** ⬜ not started (cites no commit) · 🔨 in progress · ✅ done (cites a commit that exists) · ⛔ blocked
(cites an `OD-nn` from §9 or an `R-` ruling from §2).

**Ordering law** (asserted by the guard): S0.5 before any session that writes a MASWALI row · D1 after S0 ✅ · S5 never
🔨/✅ before D3 ✅ · S8 never 🔨/✅ while §6 holds an unticked ☐.

**The standing rule.** Every session that changes anything rewrites §0 (State, Next, Blocked on Ali, Last handoff),
ticks its §1 row, writes its commit into the *Closes* cells it closes in §8, and updates the ▶ 0i heading count in
[`NEXT-PLAN.md`](NEXT-PLAN.md) — all in the SAME commit as the work. A handoff lives only in §0, never in a new file. A
session that ends red still rewrites §0 and records what ran, what passed, what failed and what did not run.

## §2 · The rulings in force (2026-10-16)

Ali, 2026-10-16: *"disregard any august ruling the new plan is final ruling"* · *"the new pdf is reviewed by management
and updated lately so any old rules replace them by those from the new pdf"*. Where the PDF speaks it wins; where it is
silent these rulings apply. Every 2026-08-29 Maswali ruling (D-1…D-7, D-10, G-15, Nav, Receipt) is void. The verbatim
record is the COMPLIANCE-DECISIONS entry named at the top of this file.

| Key | Ruling |
|---|---|
| R-RESERVES | The player answers all 15 at purchase (M1–M10 + R1–R5, shown as A1–A5). Voided mains are replaced, in question order, by the first unused non-void reserves; a voided reserve is skipped. More voided mains than non-void reserves ⇒ the whole week voids and every ticket is refunded in full. A ticket wins when all 10 graded questions are correct |
| R-GUARANTEE | A guaranteed floor of TZS 1,000,000 per week, counted before the fee: jackpot = max(floor, rollover in + this week's sales). The house tops up only in a week with a winning ticket; the top-up never rolls |
| R-FEE | 13% of the jackpot, taken only when a jackpot is paid; nothing in a no-winner week, so all ticket money rolls. TRA and GBT levies are booked on that fee when it is taken. A third, product-specific fee model |
| R-SHARE | Shared equally per winning ticket |
| R-HEADLINE | Wherever the figure appears: "Jackpot TZS X · shared by every 10/10 ticket · {pct} fee at payout"; the win result shows pool, fee and paid. Mono neutral ink, never gold |
| R-ROLLOVER | Rolls until won; no cap. Sunset: if the product is stopped, the unwon pool goes to that final week's highest-scoring tickets, shared equally. The pool sits in its own HOUSE ledger account as a player liability |
| R-CAP | 10 tickets per player per week (config), enforced in the purchase transaction, printed on the slip |
| R-BONUS | Real (main) balance only; bonus refused with a message that names the reason |
| R-CATEGORIES | No politics (licence term in `categories.ts`) |
| R-CANCEL | The platform's free-cancellation rule (RULES §2.6), its runway measured to the sales close |
| R-WEEK | Template: open Monday, close Friday 18:00 EAT, events Friday evening to Sunday, results and payout Monday/Tuesday. An officer may move the close; the system refuses any question whose event starts before it |
| R-NAME | Label "Millionea", title "Maswali Millionea", route `/millionea`; code modules `maswali-*` |
| R-PLACEMENT | No new journey tab. A Millionea card on the Maswali home; Tiketi zangu's switch becomes Maswali \| Juu/Chini \| Millionea; the classic shell gets an entry point |
| R-RESOLUTION | One officer seals each result and each void (the platform default). No AI auto-seal |
| R-INSIDERS | Admin-role accounts and house/desk accounts are barred from buying; house bots `MASWALI: "denied"` |
| R-LAUNCH | Public as soon as built and the live drive passes; the Vodacom S16 baseline must account for it |
| R-MOTION | Claude Design may propose at most four new signature motions (N1–N4); each returns to Ali for yes or no |

**Ruled later the same day:** every remaining recommendation accepted as a batch (§9) · the guarantee pre-funded with
TZS 2,000,000 by an audited owner ceremony · licence basis = Ali's dated ruling (risk accepted) · one 24-hour dispute
window per week, never closing before 12:00 EAT.

**Not a ruling, a fact of the rules:** which reserve is drawn in which voided slot is presentation only. The graded set
is always "the first *k* non-void reserves", so the lowest-numbered voided main takes the first such reserve.

## §3 · The rulebook (MR-1 … MR-32)

> The product's statement until S1 writes RULES §2.12, which then owns every figure and rate below. Tags in square
> brackets name each rule's authority. Five corrections from the register (MB-99) are folded in where marked ⭐.

### A · Name and placement

**MR-1 · Name.** `[Ali 2026-10-16: R-NAME]`
- The player label is **Millionea** and the page title is **Maswali Millionea**.
- The player route is `/millionea` (`/millionea/[weekId]`, `/millionea/tickets/[ticketId]`). The admin route is `/admin/maswali`.
- Code modules keep the `maswali-*` names, and the product line value is `"MASWALI"`.
- The word "Maswali" alone never names this product, because in the journey it means the Yes/No questions tab (SJ-19).
- The August records still write the route as `/maswali…`; they are records and are not renamed. The route is `/millionea`.

**MR-2 · Placement.** `[Ali 2026-10-16: R-PLACEMENT]`
- The journey keeps its four tabs exactly: Maswali · Juu/Chini · Tiketi zangu · Akaunti.
- The Maswali home tab carries a Millionea card.
- The Tiketi zangu switch becomes **Maswali | Juu/Chini | Millionea**. That means a third `TicketKind`, with `/millionea/tickets` added to `TAB_ROUTES` above `/millionea`.
- A Millionea ticket never renders as a Yes/No position, either in `/positions` or in `/positions/[id]`.
- The classic shell needs an entry point because launch may come before the S15 flip (OD-23, accepted): a Millionea
  card at the head of the classic `/markets` board, "Millionea" as the first row of More (and of the desktop overflow
  menu from 1024), a notice row on classic `/positions` when tickets are held, and **no** bottom-rail slot.

### B · The week

**MR-3 · Week lifecycle.** `[PDF §2.4, §5; Ali 2026-10-16: R-WEEK]`
- A week moves through DRAFT → OPEN → CLOSED → RESOLVING → SETTLED. VOIDED is a terminal alternative.
- At most **one** week is OPEN at a time. A ticket always binds to the OPEN week.
- Week N+1 opens on its own schedule, even while week N is RESOLVING. The PDF says "next round begins immediately".
- Weeks settle **strictly in order**: week N+1 may not settle until week N is SETTLED or VOIDED.
- ⭐ A partial unique index allows one OPEN week per visibility. There is deliberately **no** "one closed-unsettled
  week" index: a stalled week N would then stop week N+1 from closing (MB-16).
- Each week is one `PredictionMarket` row (`productLine "MASWALI"`) plus one `MaswaliCycle` row.

**MR-4 · Sales window and close.** `[Ali 2026-10-16: R-WEEK]`
- The default template:
  - sales open Monday;
  - sales close **Friday 18:00 EAT**;
  - events run Friday evening to Sunday;
  - results and payout are Monday or Tuesday.
- An officer may move the close time. On open, and on every move, the system **refuses** unless
  `closesAt ≤ min(eventStartsAt) − minLockBufferMinutes` across all 15 questions (the buffer is 30 minutes, OD-15,
  frozen per week) and `closesAt > now`. A move earlier keeps every sold ticket's full cancellation window; a move is
  never made after the close has passed (MB-28).
- `eventStartsAt` is the start of the observation window named in the criterion: kickoff, the opening of the measured session, or the start of the rainfall window.
- After the close, no purchase and no cancellation is possible.
- Test cases:
  - a question whose event starts at 17:59 Friday makes a 18:00 close impossible to save;
  - moving the close later than the earliest event start is refused, and the reason names the question.

**MR-5 · An event moved earlier after sales open.** `[Derived from R-WEEK]`
- If a question's real event start moves before the current close, the officer must do one of two things:
  - (a) move the close to at or before the new start, if that is still in the future; or
  - (b) where any ticket was sold after the event actually began, seal that question **VOID** (MR-15). The reserves then apply.
- No ticket may ever be graded on a question whose event began before that ticket was bought.

### C · Questions

**MR-6 · The fifteen questions.** `[PDF §2.2, §2.4; Ali 2026-10-16: R-RESERVES]`
- Every week publishes exactly **10 main (M1–M10) and 5 reserve (R1–R5)** binary Yes/No questions at open.
- A week cannot open with fewer than 15.
- Text (EN/SW/ZH), criterion (EN/SW/ZH), source host, `eventStartsAt` and `deadlineAt` freeze at open. They are absent from `QUESTION_PATCHABLE`, and a patch throws.
- Every `deadlineAt ≤ opensAt + 7 days`.
- A week cannot open with any SW criterion missing.

**MR-7 · Admissibility and categories.** `[Ali 2026-10-16: R-CATEGORIES; PDF §6; Platform: categories.ts]`
- Allowed categories are those in `MARKET_CATEGORIES`: sports, macro (stocks), weather, crypto, culture (entertainment), tech, other. **Politics is refused**, and the PDF's "Politics" is struck.
- Each question names:
  - a source that passes `isSourceTrusted()` at open;
  - an instrument or fixture;
  - a window with a time zone;
  - a threshold;
  - its own void condition (for example, "if not played by [date], VOID").
- The test is that two officers, reading only the criterion and opening only the source, would reach the same verdict.

### D · The ticket

**MR-8 · Ticket.** `[PDF Key facts, §3(1)]`
- One ticket costs **TZS 1,000**, fixed. The amount is frozen in the week's `rulesSnapshot`, and `stakeBoundsForMarket` returns min = max = 1,000 for MASWALI. That sits inside RULES §2.3's 500–1,000,000 range.
- A ticket is one `Position` (`side "YES"`) plus one `MaswaliTicket` row.
- Purchase goes **only** through `buyPosition`, with a Maswali context. `buyPositionAction` refuses a MASWALI market that arrives without picks.
- "Via mobile money" means deposit first, then buy from the wallet. Agents never sell tickets.

**MR-9 · Picks.** `[Ali 2026-10-16: R-RESERVES]`
- The player answers **all 15** (M1–M10 and R1–R5) before purchase. The slip refuses fewer.
- Picks are immutable once bought.
- ⭐ Each ticket gets a 128-bit **salt**, held server-side and shown only to its owner, and
  `selectionsHash = SHA-256(weekId|ticketId|salt|canonicalSelections())` is written at purchase. Without the salt the
  hash could be brute-forced: there are only 2^15 possible pick sets (MB-32).
- This overrides PDF §3(3) ("reserves are not answered") by ruling.

**MR-10 · Eligibility.** `[Ali 2026-10-16: R-BONUS, R-INSIDERS; Platform: RULES §2.9, RG]`
- **Real balance only.** A purchase that would draw bonus money is refused with a registered `failure-reasons.ts` reason (en/sw/zh) that names the cause.
- **Insiders refused** with a clear message:
  - any account holding a staff/admin role (the 7 roles in `roles.ts`);
  - any house or desk account.
- **House bots:** `HOUSE_PRODUCT_POLICY.MASWALI = "denied"`, and MASWALI is absent from `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`.
- Every responsible-gambling gate fires through `buyPosition`:
  - self-exclusion and cool-off;
  - session limit;
  - rolling-24h loss limit;
  - account status and wallet freeze;
  - rate limit and maintenance.
- A ticket bought before a self-exclusion still settles.

**MR-11 · Cap.** `[Ali 2026-10-16: R-CAP]`
- The cap is **10 tickets per player (account) per week**, held as the config value `maswali.ticketCapPerWeek`.
- Inside the wallet lock and the same `withMoneyTx`: count this account's non-cancelled tickets for the week, refuse at 10, and insert the new ticket.
- The slip prints "Ticket n of 10 this week".
- Test: 20 concurrent buys from one account produce exactly 10 tickets.

**MR-12 · Free cancellation.** `[Ali 2026-10-16: R-CANCEL; Platform: RULES §2.6]`
- `sellable = hadRunway && withinWindow && !bonusFunded`, unchanged.
- RUNWAY is measured against `closesAt`: at least 5 minutes of sales time must remain when the ticket is bought.
- A cancel refunds 1,000 in full, marks the `MaswaliTicket` cancelled, decrements `ticketCount`, and leaves the ticket out of the hash and out of grading.

**MR-13 · Close and the ticket commitment.** `[Engineering: Aug G-5; corrected by MB-32]`
- ⭐ At close, a **Merkle root** over every non-cancelled `selectionsHash` (sorted by ticket id), the ticket count and
  the close time are stamped once, published on `/fairness` and the week's register page, and never rewritten.
- A ticket's owner can obtain an inclusion proof for their own ticket. After settlement an anonymised graded table is
  published. The question-set hash is published separately, at open.

### E · Resolution

**MR-14 · Who seals.** `[Ali 2026-10-16: R-RESOLUTION]`
- **One officer** sets each question's result (YES, NO or VOID), with evidence.
- If the platform-wide `requireTwoOfficer` flag is on, Millionea follows it like every other product. There is no Millionea-specific second signature.
- **No AI auto-seal.** MASWALI is excluded from `nextDeadlineFor` and from the AI sentinel's resolve path. The AI may attach evidence and a suggested outcome to a question, and only an officer's act seals it.
- Every seal and every void is audited.

**MR-15 · Void grounds — a closed list.** `[PDF §2.2; OD-04 and OD-09b, accepted]`
- A question is VOID only on one of these grounds, each with a reason code from `maswali-void-reason.ts`, evidence,
  and publication on the register:
  - not played or finished by its void deadline (scheduled start + 48 hours, capped at Monday 23:59 EAT of the
    results week, frozen per question and printed on it);
  - abandoned with no official result;
  - no reading from the primary or the named fallback source by the deadline;
  - the outcome was publicly settled before the sales close (MR-5);
  - the criterion is materially wrong, or the English and Swahili texts diverge, found before the close or upheld by
    an objection.
- The Yes/No markets' discretionary "management may refund" grounds do **not** carry over. A platform error voids the
  whole week (an integrity failure), never a single question.

**MR-16 · Objections — one 24-hour window per week, one question at a time.** `[Ali 2026-10-16; OD-05; corrected by
MB-23; built S7-OB 2026-10-22; the author bar: the lead's ruling under Ali's "separation stays absolute"]`
- Any holder of a live (non-cancelled) ticket in the week may object, **per question**: `Objection.questionOrdinal`
  1–15 (M1–M10 and R1–R5, shown as A1–A5), keyed (week, question, player) — **once per question**, open or decided (a
  partial unique index) — with a reason from the platform's list and 10–1,000 characters of their own words, from the
  ticket's page.
- ⭐ Millionea has its own window, frozen in the week's rules: **24 hours, opening when the graded set becomes final,
  never closing before 12:00 EAT**. It is not the platform's live `objectionWindowHours`. A filing at the close itself
  is refused; only a question with a result can be objected to.
- Rulings: **REJECT**, or uphold with **REVERSE**, **VOID** (a ground from the closed list, MR-15; by default
  `criterion_objection`) or **REINSTATE** (a voided question back, with its result). A void is never REVERSEd.
- A Compliance officer rules on `/admin/maswali/integrity` (control `ruleMaswaliObjection`); the Owner is the fallback.
  The bars: never the officer who sealed the question or confirmed its seal, never the officer whose upheld ruling set
  its present result, never the objector, never an officer holding a live ticket in the week. The ruling is a typed
  confirmation on the result the officer reviewed (a result changed since is refused). Its note is shown to the player.
  Every act is audited.
- Settlement and the week void refuse while any objection is OPEN, failing closed. An upheld ruling re-runs MR-17; when
  the graded set changes, the window restarts **once** per week, from the ruling; a later change re-grades but keeps the
  window. Filing, ruling and release serialize on the chain lock.
- A SETTLED or VOIDED week is final: no objection is filed or ruled on it.

### F · Grading

**MR-17 · Reserve substitution and the win condition.** `[Ali 2026-10-16: R-RESERVES; PDF §2.2, §3(4)]`

```
grade(week, picks):
  voided  = [i in 1..10 where M[i].outcome == VOID]          // ascending ordinal
  usable  = [j in 1..5  where R[j].outcome in {YES, NO}]     // ascending; void reserves skipped
  if len(voided) > len(usable): return WEEK_VOID             // MR-18
  graded  = [M[i] for i in 1..10 if M[i].outcome != VOID]
          + [R[usable[k]] for k in 0..len(voided)-1]         // k-th voided main <- k-th usable reserve
  assert len(graded) == 10
  score   = count(q in graded where picks[q] == q.outcome)
  return { graded, score, wins: score == 10 }
```

- Reserves that are not used are never graded.
- The graded **set** depends only on how many mains voided, so it does not matter when or in what order they voided. The pairing ("M4 → R1") exists only for display.
- Table-driven test, covering 0..10 voided mains against every reserve-void pattern:
  - 0 voids: M1..M10 are graded.
  - M3 void and R1 void: R2 is graded.
  - 5 voids with R3 void: WEEK_VOID.
  - 6 voids: WEEK_VOID.
- The scorer is `src/lib/maswali-score.ts`. It is pure and isomorphic, and the slip, the ticket page and settlement all use it.

**MR-18 · Whole-week void.** `[Ali 2026-10-16: R-RESERVES]`
- When voided mains outnumber the non-void reserves, the week becomes VOIDED and **every ticket is refunded 1,000 in full**.
- No fee or levy is taken, and no top-up is paid.
- R is untouched and carries to the next week.
- Implementation (R1, 2026-10-17). It replaced the Up & Down pattern, whose `settleMarket` VOID arm made about six round
  trips per ticket inside one 30 s transaction and was never retried once the week was stamped:
  - `voidWeek` stamps the week VOIDED once (`stampVoid`), only on the final record, after the objection window and with
    no objection standing;
  - `refundVoidedWeek` (`maswali-void.ts`) then refunds every LIVE ticket in ONE bulk transaction under `maswali:chain` →
    `market:<id>`, and takes no `wallet:` lock: one wallet credit per player in bulk (`db.wallet.creditMany`, row updates
    only), the positions VOID, one `BET_REFUND` row per ticket, one ledger group `maswali_void_<weekId>` (POOL → each
    player), the tickets REFUNDED, and the market stamped settled. REFUNDED is a ticket state since
    `20261017130000_maswali_ticket_refunded`, which drops and re-adds `MaswaliTicket_status_check` wider by that one value;
  - the market's `settledAt` is the one truth that the refunds landed. A VOIDED week without it is resumed by `voidWeek`,
    retried by the tick and the heal, and raised critical by the console; `settleMarket` refuses every Millionea market;
  - after the commit, each refunded player's balance is pushed to their open page (R10d). It is not `emergencyVoidMarket`,
    which refuses a system actor.

**MR-19 · Settlement gate.** `[Derived from R-RESERVES]`
- Settlement needs:
  - all 10 mains sealed;
  - R1..Rj sealed, where j is the smallest index whose non-void count reaches the number of voided mains (j = 0 when no main voided);
  - if no such j ≤ 5 exists, all five reserves sealed (which leads to MR-18);
  - the objection window elapsed and no OPEN objection;
  - `market.settledAt IS NULL`, checked inside the lock.
- ⭐ Officers seal **all 15 by default**: an objection that voids a main can pull an unused reserve in (MB-14). Later
  reserves do not gate payout, but they are sealed for the record.
- Settlement is **released by one accounting officer** after a system preview (OD-06, accepted); an alert fires if it
  is not released within 4 hours of the gate passing.

### G · Money

**MR-20 · Jackpot.** `[Ali 2026-10-16: R-GUARANTEE; PDF §4.1]`
- **J = max(1,000,000, R + S)**. The floor is counted before the fee.
- R joins week N's figure only once week N−1 is terminal. Before that, the page shows "plus week N−1's carry-over once its results are final".

**MR-21 · Rollover.** `[Ali 2026-10-16: R-ROLLOVER, R-GUARANTEE]`
- Rollover money lives in one ledger account, `HOUSE:MASWALI_JACKPOT`, held as a **player liability**. It is added to `playerLiability` in `house-book.ts`.
- In a no-winner week:
  - `POOL:{market} −S → HOUSE:MASWALI_JACKPOT +S`;
  - no fee is taken and 100% rolls;
  - there is no cap and no must-be-won week.
- Only real ticket money (and carried dust, MR-25) ever enters the account. The top-up never does.
- R for week N is the account balance at N's settlement. Because settlement is sequential (MR-3), a rollover is claimed exactly once.

**MR-22 · Top-up.** `[Ali 2026-10-16: R-GUARANTEE; Engineering: Aug §5]`
- The house tops up only in a week with **k ≥ 1**:
  - `Out = F + k × floor((J − F)/k)`;
  - `U = max(0, Out − (R + S))`.
- U is debited from a funded `HOUSE:MASWALI_GUARANTEE`.
- If the account cannot cover U, settlement **aborts** with a CRITICAL alert. It never pays less.
- A week does not open unless the guarantee account holds at least Σ (1,000,000 − confirmed carry-in) over every
  unsettled week, the new one included (OD-02, accepted). The Owner pre-funds **2,000,000** before week 1 through an
  audited owner-capital ceremony, because week N+1 opens while week N is still unsettled. The floor figure is shown
  only while that holds.

**MR-23 · Fee.** `[Ali 2026-10-16: R-FEE; PDF §4.2]`
- **F = round(0.13 × J)**, taken **only when k ≥ 1**. The rate is read from the week's frozen snapshot.
- J includes R and any U.
- While no dust is carried, J is a multiple of 1,000, so F is exact (130 per 1,000).
- PDF check: J = 1,050,000 gives F = 136,500 and a payout of 913,500.

**MR-24 · Levies.** `[Ali 2026-10-16: R-FEE; Platform: RULES §2.2]`
- `levySplit(F)` is called once: TRA = round(0.10F), GBT = round(0.05F), operator net = F − TRA − GBT.
- Both levies are booked at settlement to `HOUSE:TRA_LEVY` and `HOUSE:GBT_LEVY`. Nothing is booked in a no-winner week.

**MR-25 · Sharing and dust.** `[Ali 2026-10-16: R-SHARE; OD-19, accepted]`
- Each winning **ticket** receives `floor((J − F)/k)`. A player with two winning tickets gets two shares.
- Dust is `(J − F) − k × share`, which is always less than k.
- Dust stays in `HOUSE:MASWALI_JACKPOT` and joins the next jackpot, printed on the register as "rounding carried to
  the next jackpot". In a week with a top-up, U already excludes it, so house money never carries forward.
- A dedicated equal-split allocator is required. It has **no winner floor**: `assertWinnerFloor` would throw once
  k > 870 at the floor. Millionea is exempt from the "never paid below stake" invariant, and the rules and the chat
  assistant say so.

**MR-26 · Booking and conservation.** `[Engineering: Aug G-4, §7]`
- Ticket money sits in `POOL:{market}` until settlement and is **split only at settlement**.
- One balanced group, `maswali_settle_{weekId}`:
  - `POOL −S`
  - `JACKPOT −R`
  - `GUARANTEE −U`
  - `COMMISSION +F` (then the existing `−TRA/−GBT` pair)
  - `TRA_LEVY +TRA`
  - `GBT_LEVY +GBT`
  - `PLAYER:{u} +share` for each winning ticket
  - `JACKPOT +carried`
- Per-component assertions: `S + R + U = F + Σshares + carried`; `F = TRA + GBT + net`; `Σshares = k × share`.
- ⭐ `POOL:{market}` ends at **exactly 0** — no rounding tolerance for this product (MB-02).
- `rulesSnapshot` is write-once at open and settlement reads only it.
- Losing tickets become `Position LOSS` with `finalPayout 0`. Winning tickets become WIN.

**MR-27 · Credit and withdrawal.** `[Platform: COMPLIANCE-DECISIONS 2026-09-13 (third), 2026-10-07, 2026-10-10; RULES §2.7]`
- Winnings are credited to the real wallet immediately at settlement. There is no AML hold.
- The win notification states what withdrawal needs:
  - verified identity;
  - a confirmed email;
  - at most 5,000,000 per withdrawal;
  - a 1.5% withdrawal fee (870,000 withdrawn arrives as 856,950).
- It never promises an AML review.

### H · Display

**MR-28 · Headline and results.** `[Ali 2026-10-16: R-HEADLINE]`
- Everywhere it appears, the headline reads: "**Jackpot TZS X · shared by every 10/10 ticket · {pct} fee at payout**". X = J (MR-20) and `{pct}` is interpolated from the snapshot.
- The figure is mono neutral ink: never gold, no count-up, no loop, no confetti. It changes only on a real sale, a cancellation (it can move **down** by 1,000 above the floor), or N−1 settling.
- A win result shows the pool, the fee, the amount paid, the number of winning tickets and the share.
- A no-winner week's public page states the amount carried to week N+1.

**MR-29 · Motion.** `[Ali 2026-10-16: R-MOTION]`
- Claude Design may propose at most **N1–N4** new signature motions, built from 50pick symbols.
- Each one goes to Ali for yes or no.
- Each yes is written into DESIGN_AUTHORITY as a Millionea exception to M8, and into `motion.css`.
- Everything else uses the existing ladder. `.value-flash` flashes `--gold-300`, so it may not be used on X (OD-24 (ruled — §9)).

### I · End of life and launch

**MR-30 · Sunset.** `[Ali 2026-10-16: R-ROLLOVER]`
- If the product is stopped, the unwon pool goes to that final week's **highest-scoring** tickets (the MR-17 score:
  graded correct answers out of 10), shared equally per ticket. That week is the only place a score decides money.
- (OD-03, accepted) The final week is announced at least one full week before its sales open and runs normally. The
  13% fee and its levies apply to the sunset payout; there is no floor top-up unless a ticket gets 10/10 (then normal
  settlement applies). If the final week voids or sells nothing, the next scheduled week becomes final. An
  Owner-ordered stop mid-week lets the current week run as the final week; a regulator-ordered stop refunds the
  current week, and the pool goes to the highest-scoring tickets of the last fully graded week unless the regulator
  directs otherwise. The trigger is an Owner-only ceremony with typed confirmation.

**MR-31 · Launch.** `[Ali 2026-10-16: R-LAUNCH]`
- Millionea launches publicly once it is built and its live drive passes. It does not wait for the Vodacom S16 check.
- The S16 baseline accounts for it (OD-22, accepted): the five measures exclude Millionea, and harm markers are
  reported for all players and for players without a ticket, by a dated ruling amending S16's "in bounds".
- The licence basis is **Ali's dated ruling of 2026-10-16** (OD-01): he chose it over a written Gaming Board note and
  accepted the risk. The Owner-only `maswali.licenceBasis` records it, and no week opens while it reads NONE.

**MR-32 · Filing the law.** `[Ali 2026-10-16: R-FEE, R-CAP; Platform: RULES §5]`
- The RULES §5 ceremony runs in full:
  - a COMPLIANCE-DECISIONS entry;
  - a RULES §1 row, a new **§2.12** (because §2.10, §2.10a and §2.11 are taken), and §3 changed from "two fee models" to three (`jackpot-payout`);
  - the cap recorded as a product exception to §2.4;
  - code, config and every surface in one commit: `/legal/terms` §4 and a new `/legal/rules/millionea` in 3 locales, `chat.ts`, `/help`, and a `/admin/config` caption of 17 characters or fewer (for example "13% at payout");
  - red-first guards;
  - verification on production;
  - the two PDFs regenerated.

---

### §3b · The grading algorithm (pseudocode for `src/lib/maswali-score.ts`)

```
type Q = { role: MAIN|RESERVE, ordinal, slot, outcome: YES|NO|VOID|null }
const mains    = questions.filter(MAIN).sortBy(ordinal)      // M1..M10
const reserves = questions.filter(RESERVE).sortBy(ordinal)   // R1..R5 (frozen order)

function voidedMains()  = mains.filter(q => q.outcome == VOID)               // ascending ordinal
function usableReserves()= reserves.filter(q => q.outcome in {YES, NO})       // void reserves skipped

// MR-19 / MB-14: what must be sealed before settlement may run
function settlementGate():
  if any main.outcome == null: return WAIT("mains unsealed")
  v = len(voidedMains())
  if v == 0: return READY(graded = mains)
  usable = 0
  for j in 1..5:
    r = reserves[j]
    if r.outcome == null: return WAIT("R"+j+" needed")      // a needed reserve is unsealed
    if r.outcome != VOID: usable += 1
    if usable == v: return READY(graded = gradedSet())
  return WEEK_VOID                                           // all 5 sealed, still short

function weekVoidCertain():                                  // stops sales early, never auto-executes
  v = len(voidedMains()); vr = count(reserves where outcome == VOID)
  return v > 5 - vr

function gradedSet():                                        // the SET depends only on v (order of voiding irrelevant)
  live = mains.filter(q => q.outcome != VOID)
  subs = usableReserves()[0 .. len(voidedMains())-1]
  assert len(live) + len(subs) == 10
  return live ++ subs

function displayMap():                                       // built ONLY from the final record (no "un-carry")
  zip(voidedMains(), usableReserves()) → [{main: "M4", reserve: "R1"}, ...]   // k-th void (by ordinal) ← k-th usable

function grade(picks /* 15 slots */):
  g = settlementGate()
  if g == WEEK_VOID: return { weekVoid: true }
  if g is WAIT:      return { provisional: true, matchedSoFar: count(q sealed in live mains where picks[q.slot]==q.outcome) }
  graded = gradedSet()
  score  = count(q in graded where picks[q.slot] == q.outcome)
  return { graded, score, wins: score == 10 }

function sunsetScore(picks) = grade(picks).score            // OD-03: graded correct out of 10, shared equally per ticket
```

**Invariants the tests table-drive:**
- `len(graded) == 10` whenever READY.
- No ticket is graded on a reserve that was not used.
- A voided reserve is never graded.
- READY never holds while a needed reserve is unsealed.
- The graded set is the same for any order in which the voids arrived.
- An objection that changes an outcome re-runs `settlementGate`, and if the graded set changes, the window restarts once per week, from the ruling; a later change re-grades but keeps the window (MR-16, OD-05).

---

## §4 · Architecture

**Principle inherited from Up & Down: the product's own tables never hold money.** Money moves only through
`PredictionMarket` / `Position` / `Transaction` / `LedgerEntry`. The full Prisma models are in S1's work order (§7b);
every ledger movement is in §5b.

| Concern | Decision | Reuse (verified on `origin/main`, 2026-10-16) |
|---|---|---|
| The week | One `PredictionMarket` row (`productLine: "MASWALI"`, all ticket money in `yesPool`, `noPool` 0) + a `MaswaliCycle` row: state DRAFT→OPEN→CLOSED→RESOLVING→SETTLED/VOIDED, `seq` for strict settlement order, write-once `rulesSnapshot`, `questionSetHash` at open, Merkle root + count + sales at close, stamped-once `rolloverIn`, settlement columns mirrored from the ledger, `settlementGroupId @unique`, `isFinal`, `visibility` PUBLIC/DRIVE | `createMarket({productLine, rateOverrides})`, as `updown-service.ts openRound` does |
| The questions | `MaswaliQuestion`: role MAIN/RESERVE, ordinal, slot 1–15, category, text and criterion ×3 locales, source + fallback frozen at open, `eventStartsAt` in its own zone, `voidDeadlineAt`, probability estimate, outcome YES/NO/VOID, void reason, evidence, AI suggestion (never seals) — no money | `isSourceTrusted`; a `QUESTION_PATCHABLE` allowlist like `ROUND_PATCHABLE` |
| The ticket | A `Position` (stake 1,000, side YES) + `MaswaliTicket`: 15 canonical picks, an owner-only salt, the Merkle leaf, serial minted at payment, LIVE/CANCELLED/SETTLED, rules version, score/won/payout written once | `buyPosition` → `buyPositionInner` with a Millionea context (picks, the cap counted inside the `wallet:` lock, bonus refused before the real/bonus split, insiders refused), so every responsible-gambling gate fires on the one bet path |
| Ledger | `HOUSE:MASWALI_JACKPOT` (carried player money — a liability) and `HOUSE:MASWALI_GUARANTEE` (the house's floor fund) | `withMoneyTx`, `postLedgerEntries`, `levySplit`, `stakeEntries`, `refundEntries`; both accounts added to `house-book.ts` liabilities |
| Settle (winners) | Its own function: grade → J = max(floor, R+S) → top-up from GUARANTEE → fee → `levySplit` → a **new** equal-split allocator with **no** winner floor → one balanced group, exactly-once inside the `market:` lock | ⛔ not `settleMarket` (it refunds a one-sided pool) and ⛔ not `allocateWinnerPayouts` (its floor throws below stake) |
| Settle (no winner) | The week's sales move POOL → `HOUSE:MASWALI_JACKPOT`; no fee; tickets LOSS | a new rollover builder |
| Week void | Stamp the week VOIDED once, then ONE bulk refund transaction (`maswali-void.ts`, R1): every live ticket's position VOID, one credit per player, one `BET_REFUND` per ticket, one ledger group, the tickets REFUNDED and the market stamped settled — the one truth, retried until it lands | `withMoneyTx`, `refundEntries`, `postMaswaliLines`; ⛔ not `settleMarket` (its VOID arm timed a week out, and it now refuses every week) and ⛔ not `emergencyVoidMarket` (officer-only) |
| Scheduling | `maswali-scheduler.ts` + boot hydrate + lifecycle heal and reconcile | the Up & Down scheduler pattern; `nextDeadlineFor` returns null for MASWALI |
| Two-product assumptions | S0.5 widens every closed list and coercion before any MASWALI row exists | `test:product-line` extended + a red control that plants a MASWALI row |
| Resolution | One officer seals; per-question objections in Millionea's own 24-hour window, ruled by a Compliance officer: REJECT, or REVERSE/VOID/REINSTATE (MR-16) | `objections-service.ts`, `maswali-objections.ts`; `twoOfficerGate` only if the platform flag is ever on |
| Rollout | `MILLIONEA_SHIPPED` (WITHDRAWN → STAFF_PREVIEW → ACTIVE) under an env ceiling and the Owner's stored switch — the lowest wins | the journey's `feature-state.ts` pattern |
| Admin | `/admin/maswali` (trading), `/admin/maswali/[weekId]`, `/admin/maswali/pools` (accounting; listed before `/admin/maswali` in `ROUTE_DOMAINS`) | `ROUTE_DOMAINS`, `CONTROL_DOMAIN`, `control-locked.tsx`, `defineConfig` |
| Player | `/millionea`, `/millionea/how`, `/millionea/slip`, `/millionea/tickets` and `/[serial]` (owner only), `/millionea/register` and `/[week]` (public, works without JavaScript), the journey home card, Tiketi zangu's third kind, the classic entry, `/legal/rules/millionea` | `PageContainer` tiers `reading` and `receipt` |
| Reports | A third product in the tax report (filter, `byProduct`, CHECK) with the reconciling lines; the statutory pack reads `"ALL"`; a week attestation on `/fairness` | `tax-report-data.ts`, `catalogue.ts`, `attestations.ts` |

## §5 · The money, worked

### §5a · Economics

**Platform rates.** The fee is 13% of J, taken at payout. TRA is 10% and GBT 5% of the fee. Operator net is therefore 11.05% of J.

**Probability model.** Picks are random and independent and outcomes are 50/50. A ticket wins with probability 1/1,024, and P(≥1 winner) = 1 − (1023/1024)^T.

#### 5a.1 · A fresh week (R = 0)

| Tickets | S | J | P(≥1) | No winner | Top-up U | Fee F | TRA | GBT | Operator net | 1 winner gets | 3 winners, each | House result (k ≥ 1) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 200 | 200,000 | 1,000,000 | 17.75% | rolls 200,000; house 0 | 800,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−689,500** |
| 300 | 300,000 | 1,000,000 | 25.41% | rolls 300,000 | 700,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−589,500** |
| 500 | 500,000 | 1,000,000 | 38.65% | rolls 500,000 | 500,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **−389,500** |
| 1,000 | 1,000,000 | 1,000,000 | 62.36% | rolls 1,000,000 | 0 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 290,000 | **+110,500** |
| 1,500 | 1,500,000 | 1,500,000 | 76.91% | rolls 1,500,000 | 0 | 195,000 | 19,500 | 9,750 | 165,750 | 1,305,000 | 435,000 | **+165,750** |
| 5,000 | 5,000,000 | 5,000,000 | 99.24% | rolls 5,000,000 | 0 | 650,000 | 65,000 | 32,500 | 552,500 | 4,350,000 | 1,450,000 | **+552,500** |

- House result = operator net − U.
- Conservation for 300 tickets with one winner: 300,000 + 700,000 = 870,000 + 130,000, and 130,000 = 13,000 + 6,500 + 110,500.
- In a floor week the house pays the fee on its own 700,000, which is 91,000 of fee carrying 13,650 of levies. That cost is real.
- PDF case, J = 1,050,000: F 136,500, TRA 13,650, GBT 6,825, operator net 116,025, paid 913,500 (304,500 each to three winners).
- A player holding 2 of the 3 winning tickets in a floor week receives 580,000.
- **Dust, 7 winners at 1,500 tickets:** 1,305,000 ÷ 7 = 186,428 each, paying 1,304,996. The remaining 4 carries in the jackpot account.
- **Dust, 7 winners at 300 tickets (floor week):** 869,995 is paid. U = 699,995, so nothing carries: 300,000 + 699,995 = 130,000 + 869,995.

#### 5a.2 · Expected weekly house result

There are two views:
- **Fresh week:** every week starts at R = 0. E = P(≥1) × (operator net − U).
- **Long run:** T is constant and carry-overs are real. Over the life of the product all ticket money is paid out, so E[house per week] = 0.1105·S − 0.8895·E[U per week]. Here E[U] = q·Σₘ q(1−q)^(m−1)·max(0, 1,000,000 − m·S), where m counts the weeks since the last win.

| Tickets | E[winners] | Fresh-week E[house] | Long-run E[top-up]/week | Long-run E[house]/week | Long-run per year |
|---|---|---|---|---|---|
| 200 | 0.195 | −122,387 | 52,786 | **−24,853** | −1.29M |
| 300 | 0.293 | −149,769 | 68,034 | **−27,366** | −1.42M |
| 500 | 0.488 | −150,529 | 74,678 | **−11,176** | −0.58M |
| 1,000 | 0.977 | +68,905 | 0 | **+110,500** | +5.75M |
| 1,500 | 1.465 | +127,470 | 0 | **+165,750** | +8.62M |
| 5,000 | 4.883 | +548,324 | 0 | **+552,500** | +28.73M |

The fresh-week view overstates losses below 1,000 tickets. At 300 tickets a week the pot clears the floor by itself in week 4, so most wins are paid from real money.

**Break-even:**
- **about 630 tickets a week** over the long run (629 gives −57; 630 gives +81);
- **890 tickets** in a fresh-week view (110,500 ≥ 1,000,000 − 1,000·T);
- **1,000 tickets** to remove top-up exposure entirely.

**Caveat.** Real picks crowd on favourites. With 50/50 outcomes, P(≥1 winner) equals the number of distinct combinations covered divided by 1,024. That makes it a measurable exposure meter at close, and `/admin/maswali/pools` should show it. Real outcomes are not 50/50, so measure P(≥1) after launch instead of trusting this table.

**Arbitrage.**
- Covering every combination costs 1,024,000 (1,024 tickets, so at least 103 accounts at the cap).
- With nothing else in the pot it loses: 0.87 × 1,024,000 = 890,880.
- It turns positive, before dilution by other winners, once R plus other sales exceed **153,012**.
- Any rollover makes the cover profitable. The ticket cap counts per account, and identity is only checked at withdrawal (OD-16 (ruled — §9)).
- This is a fairness risk, not a solvency risk: a covered week never needs a top-up.

#### 5a.3 · A six-week trajectory

| Week | Tickets | R in | R + S | Headline X | Result | U | F | TRA | GBT | Operator net | Paid | House | Jackpot account after |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 300 | 0 | 300,000 | 1,000,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 300,000 |
| 2 | 400 | 300,000 | 700,000 | 1,000,000 | 1 winner | 300,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | −189,500 | 0 |
| 3 | 500 | 0 | 500,000 | 1,000,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 500,000 |
| 4 | 600 | 500,000 | 1,100,000 | 1,100,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 1,100,000 |
| 5 | 700 | 1,100,000 | 1,800,000 | 1,800,000 | no winner | — | 0 | 0 | 0 | 0 | 0 | 0 | 1,800,000 |
| 6 | 800 | 1,800,000 | 2,600,000 | 2,600,000 | 3 winners | 0 | 338,000 | 33,800 | 16,900 | 287,300 | 2,262,000 (754,000 each) | +287,300 | 0 |
| **Σ** | 3,300 | | | | | 300,000 | 468,000 | 46,800 | 23,400 | 397,800 | 3,132,000 | **+97,800** | |

- Conservation: sales 3,300,000 + top-up 300,000 = paid 3,132,000 + fee 468,000.
- During week 5's sales, week 4 is still RESOLVING. Week 5's headline shows only its own sales until week 4 settles; then the 1,100,000 joins it (MR-20).

#### 5a.4 · Tax-report filing model compared with the booked fee

The tax report files Commission = round(13% × Payout), then TRA and GBT on the rounded commission, step by step. The ledger books 13% of J. Because Payout = 0.87J, the filed commission is 0.87F, a gap of 0.13F.

| Case | Payout | Filed C / TRA / GBT | Booked F / TRA / GBT | Gap (fee / levies) |
|---|---|---|---|---|
| Floor week, J 1,000,000 | 870,000 | 113,100 / 11,310 / 5,655 | 130,000 / 13,000 / 6,500 | 16,900 / 2,535 |
| PDF, J 1,050,000 | 913,500 | 118,755 / 11,876 / 5,938 | 136,500 / 13,650 / 6,825 | 17,745 / 2,661 |
| J 1,500,000 | 1,305,000 | 169,650 / 16,965 / 8,483 | 195,000 / 19,500 / 9,750 | 25,350 / 3,802 |
| J 5,000,000 | 4,350,000 | 565,500 / 56,550 / 28,275 | 650,000 / 65,000 / 32,500 | 84,500 / 12,675 |
| Six-week trajectory | 3,132,000 | 407,160 / 40,716 / 20,358 | 468,000 / 46,800 / 23,400 | 60,840 / 9,126 |

- A no-winner week files 0 and books 0. However, Report 1's check is then out by S, because settled tickets leave On hold for a rollover account that is not a Report 1 line.
- In a payout week the check is out the other way, by R + U.
- GGR swings for the same reason: week 1 shows +300,000 and week 2 shows −470,000. See OD-08 (ruled — §9).

---

### §5b · Settlement, rollover, top-up, refund and sunset — ledger movements to the shilling

#### Accounts and entry types

**Accounts:**
- `PLAYER:{u}`;
- `POOL:{marketId}` (one per week);
- `HOUSE:MASWALI_JACKPOT` (the player-liability pool, R);
- `HOUSE:MASWALI_GUARANTEE`;
- `HOUSE:COMMISSION`, `HOUSE:TRA_LEVY`, `HOUSE:GBT_LEVY`;
- the owner-capital counterparty.

**Movements**, written "from → to". Each group nets to 0:

| Event | Movement | Entry type |
|---|---|---|
| Ticket bought | `PLAYER:u → POOL` 1,000 | `STAKE_DEBIT`, via `stakeEntries` |
| Free cancel | `POOL → PLAYER:u` 1,000 | `REFUND` |
| Guarantee funded | `OWNER_CAPITAL → GUARANTEE` | `MASWALI_GUARANTEE_FUND` |
| Guarantee returned | `GUARANTEE → OWNER_CAPITAL` | `MASWALI_GUARANTEE_RETURN` |
| No winner (k = 0) | `POOL → JACKPOT` S | `MASWALI_ROLLOVER_OUT` (F = 0, U = 0; R stays where it is) |

**Winner week (k ≥ 1), one group `maswali_settle_{weekId}`:**

| Movement | Entry type |
|---|---|
| `JACKPOT → POOL` R | `MASWALI_ROLLOVER_IN` |
| `GUARANTEE → POOL` U (only if U > 0) | `MASWALI_TOPUP` |
| `POOL → COMMISSION` F | `SETTLEMENT_COMMISSION` |
| `COMMISSION → TRA_LEVY` TRA | `SETTLEMENT_TRA_LEVY` |
| `COMMISSION → GBT_LEVY` GBT | `SETTLEMENT_GBT_LEVY` |
| `POOL → PLAYER:u` share, per winning ticket | `PAYOUT_CREDIT` |
| `POOL → JACKPOT` carryOut, i.e. dust (only if > 0) | `MASWALI_ROLLOVER_OUT` |

**Other events:**
- **Week void:** every LIVE ticket `POOL → PLAYER:u` 1,000 (`REFUND`), in one group `maswali_void_{weekId}` beside one
  `BET_REFUND` row per ticket, in one transaction with the market's settled stamp (R1, `maswali-void.ts`). JACKPOT is
  untouched; R carries to the next week.
- **Forfeit:** a frozen share goes `PLAYER:u → JACKPOT` (`MASWALI_FORFEIT_RETURN`, OD-07).

**Formulas (MR-20…MR-25):**
- J = max(1,000,000, R+S)
- F = round(0.13·J)
- (TRA, GBT, net) = `levySplit(F)`
- share = ⌊(J−F)/k⌋
- U = max(0, F + k·share − (R+S))
- carryOut = R + S + U − F − k·share

**Per-component asserts:**
- `S + R + U = F + k·share + carryOut`
- `F = TRA + GBT + net`
- POOL ends at **exactly** 0
- JACKPOT after settlement = carryOut (k ≥ 1), or R + S (k = 0)

#### Worked example A: the six-week trajectory (fresh launch, 1,000 per ticket)

| Wk | Tickets (S) | R claimed | k | J | F | TRA | GBT | net | share | U | Paid | carryOut | JACKPOT after | GUARANTEE Δ |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 300 (300,000) | 0 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 300,000 | 300,000 | 0 |
| 2 | 400 (400,000) | 300,000 | 1 | 1,000,000 | 130,000 | 13,000 | 6,500 | 110,500 | 870,000 | 300,000 | 870,000 | 0 | 0 | −300,000 |
| 3 | 500 (500,000) | 0 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 500,000 | 500,000 | 0 |
| 4 | 600 (600,000) | 500,000 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 600,000 | 1,100,000 | 0 |
| 5 | 700 (700,000) | 1,100,000 | 0 | — | 0 | 0 | 0 | 0 | — | 0 | 0 | 700,000 | 1,800,000 | 0 |
| 6 | 800 (800,000) | 1,800,000 | 3 | 2,600,000 | 338,000 | 33,800 | 16,900 | 287,300 | 754,000 | 0 | 2,262,000 | 0 | 0 | 0 |
| **Σ** | 3,300,000 | | | | 468,000 | 46,800 | 23,400 | 397,800 | | 300,000 | 3,132,000 | | | −300,000 |

> **Corrected 2026-10-18 (MASWALI-BUILD S6, round-2 review): the carryOut of weeks 4 and 5.** They read 1,100,000 and
> 1,800,000, which is the jackpot AFTER the week, not what the week carried. A no-winner week stamps carryOut = S, the
> `POOL → JACKPOT` S it moved (the movements table above, and `maswali-settlement.ts`). Its R never left the jackpot, so
> the JACKPOT after column (R + S) is unchanged, and the carryOut formula above is the winner week's (k ≥ 1).
> `test:maswali-reporting` R1.1 replays these six weeks and holds each carryOut to S; `test:maswali-money` §2 holds the
> jackpot after each week.

**Week 2's group, line by line.** POOL starts at +400,000 from the stakes.

| Movement | POOL after |
|---|---|
| JACKPOT → POOL 300,000 | 700,000 |
| GUARANTEE → POOL 300,000 | 1,000,000 |
| POOL → COMMISSION 130,000 | 870,000 |
| COMMISSION → TRA 13,000; COMMISSION → GBT 6,500 | (COMMISSION nets +110,500) |
| POOL → PLAYER 870,000 | **0** ✓ |

**Week 6's group.** POOL starts at +800,000.

| Movement | POOL after |
|---|---|
| JACKPOT → POOL 1,800,000 | 2,600,000 |
| POOL → COMMISSION 338,000 | 2,262,000 |
| COMMISSION → TRA 33,800; COMMISSION → GBT 16,900 | (COMMISSION nets +287,300) |
| POOL → PLAYER 754,000 × 3 | **0** ✓ |

**Totals:**
- Sales 3,300,000 + top-up 300,000 = paid 3,132,000 + fee 468,000 = **3,600,000** ✓.
- House result = operator net 397,800 − top-up 300,000 = **+97,800**.
- R is claimed by weeks 2, 4, 5 and 6, each exactly once (`rolloverIn` stamped once per week).

**Overlap.** While week 5 is selling, week 4 is still RESOLVING. Week 5's headline therefore reads its own sales "plus week 4's carry-over once final". At week 4's settlement it becomes 1,100,000 + sales so far.

#### Worked example B: a floor week with dust (300 tickets, R = 0, k = 7)

- J = 1,000,000, F = 130,000, TRA 13,000, GBT 6,500, net 110,500.
- J − F = 870,000, so share = ⌊870,000/7⌋ = **124,285**. Seven shares = 869,995.
- U = 130,000 + 869,995 − 300,000 = **699,995**.
- carryOut = 300,000 + 699,995 − 130,000 − 869,995 = **0**. The top-up already excludes the 5 of dust, so the house never carries money forward.

#### Worked example C: a real-money week with dust (1,500 tickets, R = 0, k = 7)

- J = 1,500,000, F = 195,000, TRA 19,500, GBT 9,750, net 165,750.
- share = ⌊1,305,000/7⌋ = **186,428**. Paid = 1,304,996.
- U = max(0, 195,000 + 1,304,996 − 1,500,000) = 0.
- carryOut = **4**, moved `POOL → JACKPOT` (`MASWALI_ROLLOVER_OUT`, memo "rounding carried to the next jackpot"; OD-19).

#### Worked example D: a week void (450 tickets, R = 1,100,000)

- Three mains void, and R2 and R4 are void, leaving only R1, R3 and R5 usable.
- 3 voided mains is not more than 3 usable reserves, so the week **grades**: M-voids are replaced by R1, R3 and R5.
- If a fourth main then voids, 4 > 3 and the week **voids**:
  - 450 × `POOL → PLAYER` 1,000 = 450,000 refunded;
  - F = U = 0;
  - JACKPOT stays at 1,100,000, and the next week's R = 1,100,000.

#### Worked example E: guarantee funding (OD-02, ruled)

- **Before week 1 opens:** requirement = 1,000,000 − 0 = 1,000,000. The Owner funds 2,000,000, because week 2 opens on Monday while week 1 is still unsettled, raising the requirement to 2,000,000.
- **After week 2** pays a top-up of 300,000: the fund holds 1,700,000.
- **When week 3 opens:**
  - Unsettled weeks are week 3 only, so the requirement is 1,000,000. The open passes.
  - When week 4 opens while week 3 is unsettled: (1,000,000 − 0) + (1,000,000 − 0) = 2,000,000 > 1,700,000, so **open refused** until the Owner adds 300,000. The requirement uses only *confirmed* carry-in.

#### Worked example F: sunset (OD-03, accepted)

**Scenario:** the final week has no 10/10, S = 600,000, R = 1,800,000, and the top score of 9 is held by 4 tickets.
- J = R + S = 2,400,000. There is no floor and no top-up, because nobody has 10/10.
- F = 312,000; TRA 31,200; GBT 15,600; net 265,200.
- Each top-scoring ticket receives ⌊2,088,000/4⌋ = **522,000**.

**Movements:**
- `JACKPOT → POOL` 1,800,000 (`MASWALI_SUNSET`);
- `POOL → COMMISSION` 312,000, followed by the two levy lines;
- `POOL → PLAYER` 522,000 × 4.

POOL ends at 0. If a 10/10 exists in the final week, normal settlement (floor included) applies instead.

---

## §6 · Launch gate and the weekly runbook

### 6.1 Launch gate: what must be true before the first real ticket

R-LAUNCH means "launch once built and the drive passes". **Since Ali's rulings of 2026-10-21 (ruling 2: no staff-only
buying phase) and 2026-10-22 (COMPLIANCE-DECISIONS § "2026-10-22 · Maswali Millionea — …"), the live drive IS the first
public week:** real money enters at ACTIVE, so **gate A and gate B are both checked before ACTIVE**, and line 12 — the
first public week's acceptance record — is the one line ticked **after** ACTIVE (it carries "(after ACTIVE)"; S8 closes on
it). Each is a `☐` line in §6 that `test:maswali-plan` reads: S8 may start once every line but the after-ACTIVE one is
ticked, and is ✅ only when that one is too.

**Gate A, before any real-money ticket (the first public week is the drive):**

1. ☐ **Licence basis recorded (OD-01):**
   - Ali chose his own dated ruling (2026-10-16, the COMPLIANCE entry) over a written Gaming Board note, and accepted
     the risk; the entry names the fixed price, the house floor, the rollover across weeks, the payout-only fee and
     the sunset;
   - `maswali.licenceBasis = OWNER_RULING`, pointing at that entry, set by the Owner and audited;
   - the GLI change-management row added.
   - A Board disclosure letter is optional and is written only on Ali's word.
2. ☐ **Guarantee account funded** with TZS 2,000,000 (OD-02, ruled) through the Owner ceremony. The pools page shows
   it, and refuse-to-open was proven red in S3.
3. ☐ **Payout float funded:** the Selcom float covers the largest possible floor payout plus a buffer. Finance confirms in writing. The low-float alert is wired.
4. ☐ **Insider bar** verified against production's live staff list and desk designations (read-only counts). `HOUSE_PRODUCT_POLICY.MASWALI = "denied"` is live.
5. ☐ **Officer staffing:** a primary and a backup officer named for the weekend seal. `DEFAULT_GRANTS` checked on production for every Millionea control.

**Gate B, before rollout ACTIVE:**

6. ☐ **The classic-shell entry points** (OD-23, as amended: the bar's Millionea link — DESIGN_AUTHORITY §M8a item 11 —
   the phone rail's Millionea track in Live's place and the landing's Millionea line, Ali 2026-10-22) and the journey entry
   (home card plus the third Tiketi switch) are live behind the same rollout. They were shot at 320/360/768/1280 in sw, en
   and zh, and read one by one.
7. ☐ **Vodacom S16 baseline note:**
   - a dated COMPLIANCE-DECISIONS ruling amending S16 "in bounds" item 8 (OD-22): the five measures exclude MASWALI, and harm markers are reported for all players and for players without a ticket;
   - `journey-measures-dal.ts` filter live;
   - the launch date marked on the measures view;
   - VODACOM-PLAN §0 notified through the Vodacom lane, not edited by this lane.
8. ☐ **Tax treatment ruled (OD-08)** and the reconciling lines live. Otherwise the first no-winner week jams locking and filing of the **whole** book. Withholding tax on winnings confirmed by Finance/TRA (MB-77). *(2026-10-21: Finance's confirmation of both is recorded on Ali's word — COMPLIANCE-DECISIONS § "2026-10-21 · Maswali Millionea — …"; the box ticks when S6's reconciling lines are live.)*
9. ☐ **RULES §5 step 6** verified on production (database and screen). Both PDFs regenerated and rasterised.
10. ☐ **Agent terms** version bumped per OD-20. Terms and Millionea rules versions effective at ACTIVE.
11. ☐ **Monitoring and runbook:** alerts proven, operator guide published, support scripts live.
12. ☐ (after ACTIVE) **The S8 drive record — the first public week's acceptance record** — exists at
    `docs/qa/millionea-live-drive-2026MMDD.md`, and its numbers equal §5's formulas to the shilling.
13. ☐ **Rollback is understood:**
    - the Owner switch to WITHDRAWN hides surfaces and never deletes tickets;
    - a sales pause never blocks settlement, refunds or withdrawals;
    - a product stop is the sunset.
14. ☑ **S7's three KNOWN-RED cases closed or accepted in writing** (the S7 review, 2026-10-18; `FAILURE-INVENTORY.md`
    §9) — all three CLOSED on 2026-10-22, on `claude/maswali-s7-s5` at S7-MERGE 3 (the objection lane's `1c8b42284`
    merged over S7-F9 13, the merged tree green): OB.0 — the per-question objection door MR-16 promises (MB-23), built
    by S7-OB; RD.5 — a deposit reversed after its winner was paid (MB-74): the share held at once (S7-F9 9,
    `378b842d0`); TK.2 — account-takeover alerting (MB-96): an alert for Compliance, never a hold (S7-F9 8 and 11,
    `32b7f7992` and `8194bf3e3`).

### 6.2 Weekly runbook (all times EAT; week N, with N+1 overlapping)

| When | Who | What |
|---|---|---|
| **Wed (week N−1)** | Trading officer | Draft week N+1 from the template. AI candidates come from `EventCalendar` and the officer approves them. 15 questions on the criterion template, each with source and fallback, an event start in the source's zone, a void deadline (OD-09b), a probability and its source, and the OD-14 caps. Holiday review: 25 Dec 2026 and 1 Jan 2027 are Fridays |
| **Thu–Sat** | Second reader | EN/SW/ZH parity attestation (MB-79). Banned-topic and category screen |
| **Sun** | Trading + accounting | **Pre-open checklist:** 15/15 present; every event start ≥ Fri 18:00 + buffer; licence basis on record; guarantee ≥ requirement (Σ unsettled weeks); float OK. A week that is not ready **does not open**, never short, and the hub says so |
| **Mon 00:00** | Scheduler | Week opens. The question-set hash is published, `rulesSnapshot` frozen, and the headline is the funded floor or real money, "plus week N−1's carry-over once final" |
| **Mon–Fri** | Officer + watch | Sales. Fixture-drift watch daily (hourly on Friday). If an event moves earlier, move the close earlier (MR-5; OD-10 if sales already ran past it). Marketing only from approved wordings, to opted-in players |
| **Fri 17:00** | System | "Closes in 1 hour" to opted-in players (marketing gate) |
| **Fri 18:00** | Scheduler | **Close**, checked on the DB clock. Merkle root, count and sales stamped; hash time shown. Exposure meter (combinations covered ÷ 1,024). Cluster report to compliance |
| **Fri eve–Sun** | One officer (backup on call) | Seal each question with evidence as results land; the AI prepares evidence and a suggestion only. Voids by reason code; reserves sealed in order (all 15 by default). Alerts at +2h and +12h for anything unsealed. Settlement gate checklist on `/admin/maswali/[weekId]` |
| **Graded set final** | System | The objection window opens (MR-16, OD-05: 24 hours, never closing before 12:00 EAT). An upheld objection that changes the graded set restarts it once per week, from the ruling; a later change keeps the window |
| **Mon/Tue** | Accounting officer | Settlement **preview**: S agrees three ways, the arithmetic, the guarantee in-transaction, the float. **Release** (OD-06). Credits, notices, register, rollover or payout. Week N+1's headline now includes the confirmed carry |
| **Tue 12:00** | Alert | "Unsettled by Tuesday" escalates to the Owner and compliance |
| **Nightly** | Lifecycle | Maswali invariants, column ↔ ledger reconciliation, `trialBalance()` |
| **Month end** | Finance | Tax report with the Millionea pill and reconciling lines; GBT pack with the liability note; period lock |

**Incident playbook** (operator guide):

| Incident | Response |
|---|---|
| Wrong question found before close | Void it on the OD-04 ground; the reserve applies |
| Fixture brought forward | Move the close, or OD-10 |
| Source outage | Use the fallback; by the deadline with no reading, VOID |
| Week doomed | Sales stop automatically; the void executes after its objection windows close |
| Guarantee short at settlement | Aborts; the Owner funds; release again |
| Float short | Finance tops up before release |
| Officer unavailable | The backup seals |
| Pause / stop | Pause and stop are distinct acts. A stop runs the sunset (OD-03) |

---

## §7 · The sessions — full work orders

### §7a · Branch and worktree strategy

**Worktree.** Each active build session uses its own SSD worktree and branch, following AGENTS.md §§4 and 10. Check the
actual host, path and branch in the shell before work; continue an existing on-board branch only after fetching current
`main`. Install dependencies in that worktree after a dependency or schema change. On OMEGA-COMPILE01, keep builds, tests,
servers and temporary files on the SSD; copy the three MSVC DLLs into embedded-postgres `native/bin` when needed. Check
ports before use, and run only one `next dev` per worktree. Never delete a `node_modules` junction as if it were a folder.

**Session start, every time:**

1. `hostname && pwd && git rev-parse --show-toplevel && git branch --show-current && git status --short`.
2. Fetch using the access AGENTS.md §9 permits, then bring current `origin/main` into this session's branch. Rebase only
   if nothing has been pushed since its last merge.
3. Read NEXT-PLAN ▶ 0i, then §0.

**Commits:**
- Stage files by name only, never `git add -A` or `git add .`.
- Run `git branch --show-current` before every commit.
- Every commit subject starts `MASWALI-BUILD Sx:`.
- Commit a type together with its users.

**Pushes and merges:**
- Non-release sessions push only their own branches. The board names the sole release owner; the release owner alone
  pushes `main` after the gates in AGENTS.md §4, including typecheck, exact-commit `next build`, local `qa:live`, deploy
  read-backs and production `qa:live`. Docs-only pushes follow the same push gates.
- A money session also runs `test:all`, `e2e:money`, `e2e:fault` and `e2e:card` on a throwaway PostgreSQL first.
- Every push to `main` is a live deploy. Millionea is merged **dark**: the rollout ceiling is `WITHDRAWN` in code until S8.
- Small, frequent merges keep the diff against the Vodacom lane small.

**Migrations:**
- Hand-written, additive and re-runnable (`IF NOT EXISTS`).
- Applied with `prisma migrate deploy` on a throwaway PostgreSQL that holds production's exact migration set.
- `npm run verify:backup-schema` is run.
- They reach production only through the deploy. All are additive, so no zero-overlap cutover is expected.

**Coordinating with the Vodacom lane:**
- These files belong to the Vodacom lane, which is still active (S8 V2, S9–S13, the S14–S16 releases):
  - `market-service.ts` (bet path), `market-dal.ts`;
  - `i18n-dict.ts`, `active-tab.ts`, `journey-tabs.tsx`, `ticket-switch.tsx`;
  - `journey/home/*`, `/positions`, `surfaces.ts`, `feature-state.ts`;
  - `comms-registry.ts`, `journey-measures-dal.ts`.
- Rules for touching them:
  - S0.5's widening lands as **one integrator commit** before any other Millionea change to those files (MB-72).
  - After that, each touch is a small commit, merged in a window the release owner names on the board.
  - Rebase before every merge.
  - Never edit a file that has an unmerged Vodacom release in flight.
- `i18n-dict.ts`: one `millionea` namespace, appended as a single block in each locale.
- `house-bot-disclosure` §5.1 pins dictionaries and rulebooks byte-identical. Register any parity diffs in advance.

**Coordinating with the house-bots lane (HOUSE-BOTS-N3):**
- S0.5 adds `MASWALI: "denied"` to `HOUSE_PRODUCT_POLICY`. Widening `ProductLine` turns its `satisfies Record<ProductLine, …>` into a compile error, which is the intended trigger.
- MASWALI stays out of `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`.
- `scopeAlerts` returns early for MASWALI, so no daily `PRODUCT_DENIED` false alarm.
- Every new context comparison sits under a `SEAM:` marker (`test:house-bot-seam`).
- Tell the house-bots lane on the board before S0.5 merges.

**Heavy jobs:**
- Take the `F:/kipindi-locks/heavy-node.lock` mkdir mutex.
- Queue with a single `heavy-node.wait` note.
- Release the lock only if you took it.
- While waiting, follow the `keep-working-while-waiting` skill.

**Production:**
- Read-only proxy only (`default_transaction_read_only=on`), printing counts and names only.
- Never point a destructive drive at production.
- QA sign-ins on production need Ali's authorization each time.

---

### §7b · The sessions

**Gates for every session (§4):**
- `npx tsc --noEmit`;
- the session's own `test:maswali-*` suites and their red twins;
- `test:product-line`, `test:i18n`, `test:labels`, `test:docs`, `test:maswali-plan`;
- the suites derived from the diff (grep `scripts/` for every changed path);
- `test:all` at session close, and before the push for a money session (Ali's efficiency ruling, 2026-10-10);
- for UI work, the design suites in S5;
- for money work, AGENTS.md §4's money list.

New suites join `test:all` on their own. `predeploy` is a hand-written list in `package.json`, so a new money suite must
be added to it by hand.

**Corrections of 2026-10-17** (the code map made before the build started). Where these and a session's text below
differ, these win.

- **S0.5 · the fence is wider than its list.**
  - *The DAL first.* On PostgreSQL, `market-dal.ts` reads every non-UPDOWN value as MARKET:
    - `storedLine` :126 and `toStoredMarket` :192;
    - memory `bookByIds` :790; Postgres `attribution` :1260 and `bookByIds` :1338;
    - the leaderboard buckets :901 and SQL :1523, which become `= 'MARKET'`.

    No door check fires on PostgreSQL until the DAL passes MASWALI through. NULL keeps reading as MARKET, MASWALI reads
    as MASWALI, and an unknown value raises an alarm without throwing at boot.
  - *More sites to make exhaustive:*
    - market-service :812, :874, :951, :1005, :1790, :2061, :4127 and :4309;
    - `/live` (`page.tsx:169`, `pulse-grid.tsx:231`) and `/markets/[id]` :202;
    - `journey-sheet.ts:142`, `journey-card.tsx`, `card-face.ts`, `estimate.ts`;
    - the deposit `return-choice` route and `notification-service.ts:668`;
    - `/admin/house` (both pages) and `/admin/markets/[id]`;
    - `tax-report-data.ts:506`, `short-title-service.ts`, `position-permalink.ts`, `results/archive.ts`.
  - *Hand-written two-value types widen on purpose:* `LabelProductLine` (with no default), `PositionProductLine`,
    `GameLine`, `PRODUCT_IDS` and tax `ProductFilter`. Three stay without MASWALI: `IntentProductLine`,
    `INTENT_PRODUCT_LINES` and `TARGET_PRODUCT_LINES`. The DB CHECKs and `test:house-bot-migrations` pin them.
  - *More doors:*
    - `settleMarketAction`, `holdSettlementAction` and `recheckMarketNowAction`;
    - `setMarketShortTitlesAction`;
    - the settlement queue reads `listSettlementQueue` and `getSettlementHealth`, through `pending("ALL")`.
  - *Three smaller fixes:*
    - `chargedFee` (`payout.ts:565`) has no product input, so the guard goes at its callers or through a new parameter.
    - `scopeAlerts` lives in `house-bot/trigger.ts:406`. It must skip a line whose policy is `"denied"`, so there is no
      daily false `PRODUCT_DENIED`.
    - `test:product-line` B8 asserts the coercion. It is rewritten, and the suite gains a red twin.
  - *A census guard* lists every productLine read and classifies it: a door that refuses, an ALL-read with its
    MASWALI handling, a MARKET-default read, or a widened type. An unlisted site fails. The red twin runs on **both**
    stores (`runTwoStores`, db-scratch).
- **S1.**
  - *The rollout lives in its own module,* `src/lib/millionea-rollout.ts`, which imports only `RolloutState` and
    `lowerRollout`. It stays out of `feature-state.ts`, because the Vodacom S15 flip edits that file.
  - *STAFF_PREVIEW gets its own audience.* It means staff sessions plus holders of a Millionea preview pass, built like
    `journey-preview.ts` and working in **both** shells. The journey's `kp_preview` forces the journey shell, and
    the S8 drive needs non-staff QA players.
  - *`/api/health` gains a Millionea rollout field.* A `qa:live` "dark" section, in its own module with one call
    line, proves on production that `/millionea*` 404s and that no card, More row or notice shows while below the
    rollout. A local control shows them.
  - *The `/legal/terms` sentence and the TERMS_VERSION move are deferred* to S8's launch commit (OD-18: existing
    terms do not change). The binding text is `/legal/rules/millionea`, with its own version and hash.
  - *Optional:* a `NOT VALID` → `VALIDATE` CHECK on `PredictionMarket.productLine`.
- **S1 · as built (2026-10-17), decided under Ali's delegation.** Where these differ from S1's work order, these win.
  - *No `productLine` CHECK.* The house-bot suites plant an unknown line on purpose, to prove a denied product is
    refused; `storedProductLine`'s alarm is the guard for a corrupt row.
  - *`MaswaliCycle.marketId` and `rulesSnapshot` are NULL while DRAFT.* The open creates the market, because a draft
    market row would sit in the poll moderation lists, and stamps the rules once. The database refuses any week past
    DRAFT without both (`MaswaliCycle_market_after_draft_check`, `…_frozen_after_draft_check`).
  - *`parityAttestedBy` / `parityAttestedAt` on the week* hold MB-79's second reader. Any draft edit clears them, and
    the open refuses without them.
  - *The fee has one home per week:* `jackpotFeeRate` freezes into the market's `feeSnapshot` beside the levies; the
    rules snapshot does not copy it.
  - *The guarantee is committed, not owed:* the owner's book subtracts `HOUSE:MASWALI_GUARANTEE` from free cash on its
    own line beside the jackpot liability, and neither counts as retained earnings. `/admin/house`'s derivation table
    also gained the `HOUSE:TAX` line it was already subtracting (a platform-wide fix).
  - *STAFF_PREVIEW is staff sessions only until S4.* The preview pass for non-staff QA players is a cookie, so it
    ships with the route that writes it and its privacy-notice sentence (`test:privacy-notice` §4), not ahead of them.
  - *Player-facing statements move to S5:* `/legal/rules/millionea`, the chooser, the chat assistant's block and
    `/help` land with the screens. No player can see Millionea before S5's staff preview, and the binding text must
    describe the engine as built (S2, S3), not as intended. The `/admin/config` caption lands with S4's console.
  - *The licence gate's suite* folds into `test:maswali-config` §5 (the gate) and S2's engine suite (the open refused
    without it); there is no separate `test:maswali-licence-gate`.
  - *The nine refusal reasons move to S3, with the buy path that emits them.* `test:failure-reasons` 9d refuses a
    reason nothing emits (E-232: copy in three languages no player can see). Their drafted copy (en/sw/zh, the
    `ticketCap` figure) is kept on branch `maswali-s3-reasons` for S3 to land beside its emitter.
  - *Carried to S6:* the house book's per-game identity must count the rollover and top-up legs before a winning week
    settles on production, or it reports a variance on a correct week; and `purge-protected.ts` must classify the three
    Millionea tables.
- **S3.**
  - *The Millionea slip travels as a `BuyOpts` field,* not as a third `BetContext.kind`. `ctx.kind` means who is
    betting, and the house-bots lane pins every comparison (`SEAM_SITES`). Millionea gets its own `MASWALI:` markers,
    its own guard, and a test that MARKET and UPDOWN output is unchanged.
  - *Every Yes/No notice is muted on every Millionea path:* `settleMarket`'s VOID arm, which a week void used until R1
    (a week now refunds through `maswali-void.ts`, which sends none), and the cancel. Muting them is S3's job; S6 adds
    Millionea's own notices.
  - *The cancel is a real one-transaction write that fails loudly.* Today `cashOutPosition` writes outside
    `withMoneyTx`, and its ledger write is fire-and-forget.
  - *OD-17's loss limit:* `sumGamblingNetSince` (`prisma-dal.ts:2727`, and its memory twin) drops `BET_PAYOUT`
    rows on MASWALI positions.
  - *S3 releases on its own,* with the full money battery.
- **S3 · as built (2026-10-17), decided under Ali's delegation.** Where these differ from S3's work order, these win.
  - *The purchase.* `purchaseMaswaliTickets` (`maswali-service.ts`) asks the rollout first — a PUBLIC week sells only at
    ACTIVE, a DRIVE week from STAFF_PREVIEW (who may hold a drive ticket is S8's, OD-12); otherwise
    `millionea_not_available`. Then `buyPosition` with the slips; its ticket arm (`buyMaswaliTickets`,
    `maswali-money-service.ts`) runs below every shared gate. Each ticket keys its position `<key>#i`; a replay answers
    only the whole purchase with the same picks, and L2's pre-gate answer has a Millionea reader (`landedMaswaliAnswer`).
  - *Stake bounds* are min = max = the frozen price of one ticket; a week without rules stakes nothing.
  - *The free cancel* is one transaction — the ticket, the wallet, the position, the pool, the week's count and the
    ledger group — only inside the frozen free window, never twice. There is no paid exit (MB-50).
  - *The void arm* sends no Up & Down notice, reverses no wagering (a ticket accrued none, OD-27) and prices no poll fee
    for a week (`poolFee` keeps refusing the jackpot model). ⚠️ Superseded by R1: a week no longer reaches that arm; its
    void refunds in bulk through `maswali-void.ts` (MR-18), with the same three silences.
  - *The settlement.* `previewMaswaliSettlement` prepares every figure and a digest; `settleMaswaliWeek({ weekId,
    releasedBy, digest })` recomputes inside `maswali:chain` and `market:<id>` and pays only the figures the officer
    saw. S is read three ways and must agree with the week's own count and its sales at close. Every refusal comes
    before the first write; the guarantee is read inside the transaction. One transaction per week: the winners one by
    one, the losers in one statement (`positionStore.settleMaswaliLosers`), the tickets in bulk, one ledger group
    `maswali_settle_<weekId>`, the week's mirrored columns, the market stamped RESOLVED. A k = 0 week claims its carry
    too, so the line of weeks always advances in `seq` order.
  - *The sunset (MR-30, OD-03).* A final week with no 10 of 10 pays its highest score: J = R + S, no floor, no top-up,
    R moved by `MASWALI_SUNSET`. `sunsetMaswali` (the Owner, typed `SUNSET MILLIONEA`) makes the week on sale final at
    once, or a drafted week only a full week ahead. ⛔ A week whose sales have closed (CLOSED, RESOLVING, or OPEN past
    its close) is refused, the lead's decision of 2026-10-18 (S7-F): the 13% fee is taken from a sunset payout and never
    from a rollover, so a stop ordered while a week's results are being decided could choose who is paid with them in
    view. That week settles under its own rules, and the stop takes effect from the next week to open, which may then be
    made final although it opens in less than a full week (only that one draft, only while no week is on sale and a
    week's results are being decided; its buyers are told at purchase). After a final week that ran nothing opens; a
    final week that voided or sold nothing hands the role to the next week to open. The regulator-ordered stop is S4's
    own ceremony.
  - *Held shares (MB-43, MB-74, OD-07).* Roles and status are re-checked at settlement. A winner with a staff role, a
    live desk designation, or a suspended or closed account is credited the full share, the ticket carries the reason,
    and the wallet is held BEFORE the credit by a new freeze reason, `MILLIONEA_SHARE`; account closure is refused while
    it stands on money. Compliance then holds a share found later (`holdMaswaliShare`), releases it, or forfeits it
    (typed `FORFEIT SHARE`): the whole share to the jackpot, never the house, refused if the wallet no longer holds it.
  - *The drive's own jackpot (OD-21).* `HOUSE:MASWALI_JACKPOT_DRIVE`: a DRIVE week claims and rolls through it, so no
    drive money can reach public week 1; S8 returns what it holds to the drive accounts. The owner's book counts both
    jackpots as players' money.
  - *The guarantee requirement (OD-02)* counts every unsettled week of BOTH lines, each at its own frozen floor. The
    open had used the new week's floor for every week, of its own line only.
  - *OD-17, as built.* The exclusion sits in the loss limit's own net (`responsible-gambling.ts → lossLimitNetSince`),
    not in the DAL sum: the platform's gambling net, minus Millionea winnings settled in the window, minus refunds of
    tickets bought before it (`ticketStore.lossLimitExclusionsSince`, both stores). The gate and the player's "used today"
    read the same number, and the activity summary still reconciles with the DAL sum it was built on.
  - *The owner's book.* The unsettled weeks' POOL is a liability (`maswaliOpenPools`), with its own row on `/admin/house`.
  - *The sales pause (MB-62)* lands with the purchase it stops: its own key `maswali.salesPause`, read fresh and fail
    closed, refusing `millionea_paused`; it never blocks a cancel, a settlement or a refund. S4 builds its control.
  - *Nightly invariants* (`maswali-invariants.ts`), daily beside the trial balance; a broken one is a COMPLIANCE record.
  - *Ruling 232.* Eleven positioned writes: the four Millionea writes copy the marker from their own position. The
    census reads coverage per file, and four marker plants join `house-bot-money.anchors.mjs`.
  - *`e2e:maswali-money`'s drive of the real action lands with the action, in S5.* S3 drives `purchaseMaswaliTickets`,
    the function that action will call, on both stores (`test:maswali-purchase` §5), and `e2e:maswali-fault` drives the
    settlement on a real Postgres across processes.
  - *S1, S2 and S3 release together* from `maswali-s3`, after one money battery on the combined tree: the heavy-job lock
    is shared with another lane, and three batteries would measure the same files three times (Ali's efficiency ruling,
    2026-10-10). The commits stay separate.
- **S4 · as built (2026-10-17, parts 1–2), decided under Ali's delegation.** Where these differ from S4's work order,
  these win.
  - *Routes.* `/admin/maswali` (trading: the weeks, the alerts, "Draft a week"), `/admin/maswali/new` and
    `/[weekId]/edit` (the builder), `/admin/maswali/[weekId]` (the timeline, the open's checklist in words, the second
    reader's attestation, the open, the close move, the seal console), `/admin/maswali/pools` (accounting) and
    `/admin/maswali/integrity` (compliance), the last two ABOVE the bare prefix in `ROUTE_DOMAINS`. One Millionea nav
    group: Weeks, Pools, Integrity.
  - *21 controls*, each in `CONTROL_DOMAIN` and enforced as `requireStaff(CONTROL_DOMAIN.<id>, "<id>")` in its route's
    action file: trading — create, edit, attest, open, move the close, seal, void a question, confirm, correct;
    accounting — release; compliance — void a week, pause, resume, hold, release and forfeit a share; ops (the Owner)
    — fund and return the guarantee, the sunset, the licence basis, the rollout switch. Each sits on a page its acting
    role can open.
  - ⚠️ *The S4 finding (item 6): the platform has no separate re-authentication for an Owner ceremony.* Its Owner
    controls (the journey switch, the desk) check the stored ADMIN role and the console's 2FA step-up, and Millionea's
    do the same through `requireStaff` → `requireAdminTotp`. A password re-check exists only for account changes
    (`reauth.ts`). Recorded, not invented: a new re-auth step would be a platform-wide change of its own.
  - *Typed confirmations in the kit dialog* (`ConfirmModal` hard tier): `SEAL`, `VOID`, `CORRECT`, `RELEASE`, `PAUSE` /
    `RESUME`, `HOLD`, `RECORD`, and the services' own words `FUND GUARANTEE`, `RETURN GUARANTEE`, `FORFEIT SHARE`,
    `SUNSET MILLIONEA`; the rollout types the state it moves to.
  - *The seal console shows no ticket data* (MR-14, MB-34): a bulk YES/NO by one officer with its evidence, a void on
    its own with its ground, the correction inside the window, the second officer's confirmation, the AI's suggestion
    beside a row (never a seal), and the gate checklist ("9 of 10 mains sealed · needs M7").
  - *The builder:* fifteen cards, three languages each, the event start in the SOURCE's zone (shown again in EAT on the
    week page); its counters (110 for a question, 240 for a criterion) are guidance for the player screens and never
    block a save; the edit mode saves only the rows that changed.
  - *Pools:* every balance null-aware; the requirement over both lines at each week's frozen floor; the payout float
    against the prepared payouts; each open week's coverage (distinct answers to the ten mains ÷ 1,024 — a count, never
    a holder) and its worst top-up; the prepared settlement with its release; the rollover trail with the levy on the
    house's own top-up, `round((TRA + GBT) × U / J)` (MB-10).
  - *Integrity:* the pause; the weeks that void whole; held shares; every winner with role, status and account age; the
    seal log, only for weeks whose results can no longer change (MB-34).
  - *The /admin overview* carries a full-width Millionea strip only when Millionea has an alert, and the product's
    standing (licence, pause) speaks only once a week exists — so the overview is unchanged before the first draft.
  - *Operations:* `ops:maswali-pause`, `ops:maswali-heal`, `ops:maswali-invariants`, dry run by default.
  - *Suites:* `test:maswali-rbac` (7 roles and 2 non-staff × 21 controls × the four routes, each control's enforcement
    site, the nav) and `red:maswali-rbac` (6 plants, all caught); `test:maswali-shared-paths` (the paths every product
    shares, both stores); `test:admin-nav`, `test:control-gates`, `test:rbac` re-pinned and green. `test:maswali-seal` and
    `test:maswali-admissibility` are held today by `test:maswali-engine` §1–§2 and §6–§7.
  - *Part 3, next:* AI drafting through `EventCalendar` / `MarketCandidate` / `ai-poll-generation` (item 7); the
    criterion template fields (MB-21); the watches the alerts do not cover yet — fixture drift, a linked Yes/No market
    that disagrees with a seal, the holiday review, a seal from a new device (MB-94), the cluster report and pick-shift
    alerts; `qa:maswali-admin-shots` at 360/768/1280/1920, read one by one; the acceptance drive on `next dev`.
- **D3.** The rulings are all in hand, so D3 is the filing. N1 is filed as *"yes, if it measures"*. It is measured at
  S5's acceptance and on a real phone at S8, and if it fails its drawn fallback ships. The values (glyphs, status rows,
  the N-block) land in S5 with their first consumer, as `test:dead-css` requires.
- **S5.**
  - *The home card is a server component,* placed between the head and the chips (O-7). `home-lazy.tsx` and its
    `HT_PARTS` pin are untouched; only `test:journey-home` 7.order is re-pinned.
  - *The slip does not join `MONEY_ROUTE`.* `test:journey-shell` §2 pins that line VERBATIM, and changing it would hide
    the Needle platform-wide. A narrow predicate covers the slip and the confirm sheet (D-25).
  - *After each dark merge,* trial-merge the parked S15 candidate (`git merge-tree`) and tell the Vodacom lane about
    any conflict.
- **S6 before any production settlement.** `chargedFee` throws on MASWALI by design, so the tax report and the
  statutory pack learn the product before the S8 drive week settles.
- **Laptop capacity (Ali-Blade15).**
  - `test:all` runs in chunks well under 3 hours each, with `--jobs` 2–3, because the lock's 3-hour takeover would
    otherwise put two heavy jobs on failing RAM.
  - The database suites run one at a time on this lane's own `KP_SCRATCH_PORT`.
  - `embedded-postgres` is installed with `--no-save`, and `npm ci` removes it again.
  - `.env.qa.local` is needed before any signed-in QA.

#### S0 · Rulings recorded; plan, board, pointers, guard, R2 commission filed (documentation only)

**Goal:** turn the 2026-10-16 rulings into the record, and leave one door a cold session can resume from.

**Inputs:** the PDF; Ali's seventeen R-rulings and the accepted decision batch; the rulebook, register, design
concept, Claude Design prompt and session plan produced by the 2026-10-16 analysis.

**Work items (all written 2026-10-16 on branch `maswali-plan`):**

1. **`COMPLIANCE-DECISIONS.md`**, newest first: § "2026-10-16 · Maswali Millionea — the management-reviewed proposal of
   2026-10-16 is final; every 2026-08-29 Maswali ruling is void (owner)" — Ali's words verbatim, every R-ruling, the
   accepted batch, what does NOT change, accepted consequences, ⛔ do not restore. The two 2026-08-29 Maswali entries
   are marked in place with a pointer.
2. **This file**, `docs/MASWALI-PLAN.md`.
3. **Records:** a RECORD banner naming AGENTS.md and this file on `SESSION-PROMPT-MASWALI-BUILD.md`,
   `MASWALI-MILLIONEA-IMPLEMENTATION.md` and `SESSION-PROMPT-MASWALI-DESIGN.md`. They are not renamed or rewritten.
4. **Board and index:** NEXT-PLAN ▶ 0i, the old §2 Maswali row struck with a pointer; `docs/README.md` rows; one
   pointer in AGENTS.md §2 (no rate, count, date or status).
5. **The R2 commission folder** `docs/design-brief/maswali-2026-10/` — BRIEF, PROMPT.txt, ATTACHMENTS, PREDICTED-OUTPUT,
   RECEIVING (§10).
6. **The guard:** `scripts/maswali-plan.test.mts`, with `test:maswali-plan` and `red:maswali-plan` in `package.json`.

**Not done, deliberately:** no rename of `/maswali` in the August records (they are records); no Gaming Board
disclosure letter (Ali chose his own dated ruling as the licence basis — a letter stays available on his word).

**Suites:** `test:maswali-plan`, `red:maswali-plan`, `test:agent-rules`, `test:docs`, `test:design-one-door`.

**Acceptance:** the five suites are green; the diff touches only `docs/**`, one line of AGENTS.md, the guard and two
`package.json` keys; the COMPLIANCE entry quotes Ali verbatim.

**Closes:** MB-99 (corrections folded into §3), MB-54 (the journey deviation filed), MB-70 (the binding-text inventory).

#### S0.5 · Fence the third product line (no MASWALI row may exist yet)

**Goal:** no generic door or read can treat a MASWALI row as a Yes/No poll. Behaviour for MARKET and UPDOWN is unchanged.

**Inputs:** S0 ✅. A merge window agreed with the Vodacom and house-bots lanes.

**Work items:**

1. **The type:** `ProductLine = "MARKET" | "UPDOWN" | "MASWALI"` (market-service.ts).
2. **`src/lib/product-line.ts`** (new, isomorphic): `isKnownProductLine`, `assertNeverLine`, and a `switchLine()` helper with an unreachable default.
3. **`market-dal.ts`:**
   - `storedLine()`, `toStoredMarket()` and the three other `!== "UPDOWN" → "MARKET"` coercions pass known lines through and alarm on unknown ones (never throw at boot).
   - The active-player SQL `<> 'UPDOWN'` becomes `= 'MARKET'` where it means polls.
4. **The 20 ternary sites in 13 files** become exhaustive switches. The files: `positions/performance`, `positions/[positionId]`, `results/page`, `results/results-bar`, `house-bot/{alert-copy,decide,enter-now,fire,planner,trigger}`, `market-dal`, `market-service` (×2), `report-money`.
5. **`market-scheduler.ts` `nextDeadlineFor`:** return `null` unless `productLine === "MARKET"`.
6. **Doors that refuse MASWALI** unless called from `maswali-service` with a `SEAM:`-marked context:
   - `resolveMarket`, `resolveDueMarket` and the sentinel;
   - `emergencyVoidMarket`. A whole week is voided by its own control (S4);
   - `adminReopenMarket`;
   - `cashOutPosition`'s paid exit;
   - `buyPositionAction` (markets/actions.ts) without picks;
   - `/admin/markets/[id]` and `/admin/resolver/[id]` (read-only notice "managed in /admin/maswali").
7. **`settleMarket`:** refuses MASWALI unless `resolvedOutcome === "VOID"` (MR-18's arm). `chargedFee()` throws on MASWALI until S6 teaches it the model.
8. **`side-label.ts`:** `LabelProductLine` gains `"MASWALI"`, with no default.
9. **`house-bot/constants.ts`:** `MASWALI: "denied"`; `scopeAlerts` returns early.
10. **`tax-report.ts`:** `ProductFilter` gains `"MASWALI"`, hidden in the UI until S6. The DB CHECK migration is in S1.

**Suites:**
- `test:maswali-fence`, and `red:maswali-fence`, which plants a MASWALI row in the memory store, drives every door and every `"ALL"` read, and expects a refusal or a MASWALI-labelled row each time. It must never see MARKET.
- `test:product-line` extended: `"ALL"` keeps MASWALI uncoerced, and a money or regulator read without `"ALL"` fails.
- Also: `test:house-bot-seam`, the house-bot suites, `test:tax-report`, `test:labels`, `test:all`.
- Classic parity against live `main` with zero differences.

**Acceptance:**
- tsc is green.
- The planted row is refused at every listed door and never read back as MARKET.
- Parity shows zero differences.
- Merged by the release owner as one integrator commit.

**Closes:** MB-01, MB-42, MB-72, and the classification half of MB-90.

#### S1 · Law, config, accounts, schema, rollout switch (no behaviour)

**Goal:** the law, the frozen-rates machinery, the ledger accounts, the tables and the switch exist. Nothing sells yet.

**Inputs:** S0.5 ✅. OD-02, 03, 04, 05, 09b, 15, 18, 19, 20 and 26 ruled.

**Work items:**

1. **The RULES §5 ceremony, in one commit:**
   - **RULES.md §1:** new rows for the Millionea ticket price, fee model, floor, rollover and cap.
   - **New §2.12** "Maswali Millionea — fixed ticket, weekly jackpot, fee at payout", with decided, enforced, configured and stated subsections. It covers:
     - J = max(floor, R+S), with the floor counted before the fee;
     - F = 13% of J, taken only when k ≥ 1;
     - levies of F;
     - an equal floored share per ticket, with dust carried (OD-19);
     - the top-up taken only when k ≥ 1 and never rolled;
     - rollover of real money only, no cap;
     - the sunset (OD-03);
     - the winner floor does not apply (Invariant-1 exemption, OD-19).
   - **§2.4:** cap exception, 10 per account per week.
   - **§2.8:** "Nothing else" extended to Millionea (the fee at payout plus the withdrawal fee).
   - **§3:** "THE THREE FEE MODELS", adding `jackpot-payout`.
   - **§6:** history row.
   - Code, config and every stated surface change in the same commit:
     - `/legal/terms`: a new Millionea section in 3 locales, with a version stamp that is effective only at rollout ACTIVE (OD-18);
     - `/legal/rules/millionea/page.tsx` and `_content-millionea.tsx`;
     - the chooser's `CARDS` and `INTRO` say three products;
     - `_actions/chat.ts`: Yes/No and Up & Down statements scoped, and a Millionea block filled from config (MB-71);
     - `/help`;
     - the `/admin/config` caption.
   - Player surfaces render the legal pages only when rollout ≥ STAFF_PREVIEW.
2. **`payout.ts`:**
   - `FeeModel` gains `"jackpot-payout"`.
   - `readRates` **refuses** an unknown model instead of coercing it.
   - `describeFeeModel` caption is at most 17 characters ("{pct} at payout"), checked by `test:fee-model-caption`.
   - `poolFee` and `allocateWinnerPayouts` are untouched.
3. **`ledger.ts`:**
   - `acct.maswaliJackpot = "HOUSE:MASWALI_JACKPOT"`.
   - `acct.maswaliGuarantee = "HOUSE:MASWALI_GUARANTEE"`.
   - The owner-capital counterparty: reuse the existing external account if `acct` has one, otherwise add `EXTERNAL:OWNER_CAPITAL`.
   - Entry builders: `maswaliSettlementEntries`, `maswaliRolloverEntries`, `maswaliGuaranteeFundEntries`, `maswaliGuaranteeReturnEntries`, `maswaliForfeitReturnEntries`, `maswaliSunsetEntries`. Stakes reuse `stakeEntries`; refunds reuse `refundEntries`.
4. **`src/lib/server/maswali-config.ts`** via `defineConfig`, key `maswali.config`, validated and audited:

   | Key | Default | Note |
   |---|---|---|
   | `ticketPriceTzs` | 1000 | |
   | `floorTzs` | 1,000,000 | |
   | `jackpotFeeRate` | 0.13 | |
   | `ticketCapPerWeek` | 10 | |
   | `openTemplate` | Mon 00:00 Africa/Dar_es_Salaam | |
   | `closeTemplate` | Fri 18:00 | |
   | `minLockBufferMinutes` | OD-15 | |
   | `voidDeadlineHours` | OD-09b | |
   | `finalDeadlineTemplate` | Mon 23:59 of the results week | |
   | `objectionWindowHours` and `objectionNotBeforeLocal` | OD-05 | Millionea's own, frozen per week |
   | `questionCaps` | OD-14 | |
   | `guaranteeReservePolicy` | OD-02 | |
   | `paidExitWindowMinutes` | 0 | |

   - TRA and GBT rates come from global config and freeze into `feeSnapshot`.
   - A separate Owner-only key, `maswali.licenceBasis` = `{kind: "NONE" | "GBT_WRITTEN" | "OWNER_RULING", ref, recordedAt, recordedBy}`.
   - ⛔ All of these freeze into `rulesSnapshot` when a week opens. `/admin/config` says "applies from the next week" (MB-75).
5. **Rollout switch (`feature-state.ts`):**
   - `MILLIONEA_SHIPPED: RolloutState = "WITHDRAWN"`.
   - `millioneaCeiling()` reads env `FEATURE_MILLIONEA` (exact words only).
   - `server/millionea-switch.ts` holds the Owner's stored switch. The effective state is `lowerRollout(ceiling, switch)`, which is the journey's pattern.
   - This switch controls visibility. The sales pause is a separate act (S4).
6. **`prisma/schema.prisma` and migrations** (hand-written, additive):
   - `2026101x…_maswali_tables`: the three models below, `Objection.questionOrdinal Int?` (values 1..15), the Objection remedy gains `REINSTATE`, and a partial unique index `(marketId, questionOrdinal, userId)` for MASWALI rows only. The existing one-per-player-per-market rule stays for other products.
   - `…_maswali_ledger_types`: `ALTER TYPE "LedgerEntryType" ADD VALUE IF NOT EXISTS` for `MASWALI_ROLLOVER_OUT`, `MASWALI_ROLLOVER_IN`, `MASWALI_TOPUP`, `MASWALI_GUARANTEE_FUND`, `MASWALI_GUARANTEE_RETURN`, `MASWALI_FORFEIT_RETURN`, `MASWALI_SUNSET`. ⛔ This goes in its own migration file: a new enum value cannot be used in the transaction that adds it.
   - `…_maswali_tax_product`: the `TaxPeriodLock` CHECK widened to `MASWALI`. The `HouseBotIntent` CHECKs are unchanged.

```prisma
model MaswaliCycle {                       // "week"; product tables never hold money
  id String @id @default(cuid())
  marketId String @unique                  // the PredictionMarket (productLine "MASWALI") whose POOL holds S
  code String @unique                      // "MLN-2026-W44" from eat-day.ts, immutable
  seq Int @unique                          // the drafting counter; the chain is the calendar (2026-10-17)
  visibility String @default("PUBLIC")     // PUBLIC | DRIVE (OD-21)
  state String                             // DRAFT|OPEN|CLOSED|RESOLVING|SETTLED|VOIDED
  opensAt DateTime; closesAt DateTime      // closesAt mirrors market.selectionClosedAt
  finalDeadlineAt DateTime
  closedAt DateTime?                       // stamped once
  rulesSnapshot Json                       // ⛔ write-once at open; absent from CYCLE_PATCHABLE
  questionSetHash String?                  // at open
  ticketMerkleRoot String?; ticketCount Int @default(0); salesAtClose Decimal? @db.Decimal(18,2)
  gradedSetFinalAt DateTime?; objectionsCloseAt DateTime?; objectionRestarted Boolean @default(false)
  rolloverIn Decimal? @db.Decimal(18,2)    // stamped once at settlement (WHERE rolloverIn IS NULL)
  jackpot Decimal? @db.Decimal(18,2); fee Decimal? @db.Decimal(18,2)
  traLevy Decimal? @db.Decimal(18,2); gbtLevy Decimal? @db.Decimal(18,2)
  topUp Decimal? @db.Decimal(18,2); winningTickets Int?; sharePerTicket Decimal? @db.Decimal(18,2)
  paidTotal Decimal? @db.Decimal(18,2); carryOut Decimal? @db.Decimal(18,2); dustCarried Decimal? @db.Decimal(18,2)
  settlementGroupId String? @unique; settledAt DateTime?; releasedBy String?
  isFinal Boolean @default(false)          // sunset week
  createdBy String; createdAt DateTime @default(now()); updatedAt DateTime @updatedAt
  questions MaswaliQuestion[]
  @@index([state, closesAt])
}  // + SQL partial unique: ONE state='OPEN' row per visibility. ⛔ no "one CLOSED-unsettled" index (MB-16)

model MaswaliQuestion {
  id String @id @default(cuid())
  cycleId String; cycle MaswaliCycle @relation(fields:[cycleId], references:[id], onDelete: Restrict)
  role String                              // MAIN | RESERVE
  ordinal Int                              // MAIN 1..10, RESERVE 1..5 (reserve order)
  slot Int                                 // canonical 1..15 (M1..M10 = 1..10, R1..R5 = 11..15)
  category String                          // ∈ MARKET_CATEGORIES; never politics
  textEn String; textSw String; textZh String
  criterionEn String @db.Text; criterionSw String @db.Text; criterionZh String @db.Text
  sourceUrl String; sourceDomain String; fallbackSourceUrl String?; fallbackSourceDomain String?
  readingTolerance String?; eventKind String  // SPORT|PRICE|WEATHER|ANNOUNCEMENT
  eventStartsAt DateTime; eventZone String    // IANA zone the officer typed in
  observedStartsAt DateTime?                  // fixture-drift watch
  voidDeadlineAt DateTime
  probabilityEstimate Decimal? @db.Decimal(5,4); probabilitySource String?
  linkedMarketId String?
  outcome String?                          // YES | NO | VOID
  voidReason String?                       // code from maswali-void-reason.ts
  evidence String? @db.Text; evidenceCaptureRef String?
  sealedBy String?; sealedAt DateTime?
  twoOfficerAtStage1 Boolean?              // the platform flag's value when stage 1 began (MB-82)
  stage2By String?; stage2At DateTime?
  aiSuggestion Json?                       // evidence + suggested outcome; never seals
  @@unique([cycleId, slot]); @@unique([cycleId, role, ordinal])
}

model MaswaliTicket {
  id String @id @default(cuid())
  positionId String @unique; cycleId String; userId String
  serial String @unique                    // minted at payment
  selections Json                          // 15 canonical slots → "YES"|"NO"; read only via canonicalSelections()
  salt String                              // 128-bit, owner-only
  selectionsHash String                    // SHA-256(cycleId|ticketId|salt|canonical) — leaf of the Merkle tree
  picksKey String                          // SHA-256(canonical) — server-only, idempotent-replay compare
  status String                            // LIVE | CANCELLED | SETTLED
  cancelledAt DateTime?; closeAtPurchase DateTime; rulesVersion String
  score Int?; won Boolean?; payout Decimal? @db.Decimal(18,2)
  frozenReason String?; lastViewedAt DateTime?
  createdAt DateTime @default(now())
  @@index([cycleId, userId, status]); @@index([cycleId, score]); @@index([userId, createdAt])
}
```

7. **`src/lib/failure-reasons.ts`**, in en, sw and zh. Each states a reason and a next step:
   - `millionea_cap_reached`
   - `millionea_bonus_refused`
   - `millionea_sales_closed`
   - `millionea_staff_barred`
   - `millionea_account_ineligible` (the neutral desk wording, D19)
   - `millionea_picks_incomplete`
   - `millionea_week_not_open`
   - `millionea_paused`
   - `millionea_not_available` (the licence gate or WITHDRAWN)
   - `idempotency_key_conflict` (reuse it if it already exists)

**Suites:**
- New: `test:maswali-law` (RULES rows and §3 say three models; terms, chat and help are scoped; caption fits) with `red:maswali-law`; `test:maswali-config` (validation; snapshot shape); `test:maswali-rollout` (three states and lower-of); `test:maswali-licence-gate` with red (an open is refused while the basis is NONE; positive control with a basis recorded).
- Also: `test:rate-copy`, `test:fee-model`, `test:fee-model-caption`, `test:money-invariants`, `test:loser-share-fee`, `test:levy-allocation`, `test:failure-reasons`, `test:i18n`, `test:terms-cancellation`, `test:docs`.

**Acceptance:**
- All three migrations apply and re-apply cleanly on a throwaway PostgreSQL that holds production's migration set.
- `verify:backup-schema` is green.
- The null-aware `ledgerGroupAccountSum` reads 0 for both new accounts.
- `trialBalance()` is clean.
- The rollout reads WITHDRAWN in code, env and switch.

**Closes:** MB-03 (account, type, gate), MB-05, MB-10 (recorded), MB-17 (schema half), MB-23 (column), MB-39 (code gate), MB-49 (reasons), MB-69 (law text), MB-71, MB-75.

#### D1 · Design round R2: the commission cut live and sent (after S0 ✅; runs alongside S0.5–S4)

**Goal:** Claude Design receives the R2 commission for "Daftari na Muhuri" while the engine is built, because the
design round trip is the long pole.

**Why it does not wait for S1.** The prompt is an outbound commission and must be self-contained: Claude Design cannot
read this repository, so `PROMPT.txt` states the rules and the figures it may draw. Once sent it is a record. RULES
§2.12 (S1) remains the law; if S1 changes any figure, a round-3 delta prompt carries the change.

**Work items** (the full procedure is
[`design-brief/maswali-2026-10/ATTACHMENTS.md`](design-brief/maswali-2026-10/ATTACHMENTS.md)):
1. Assemble the package OUTSIDE the checkout from live files at `origin/main` (a copy of DESIGN_AUTHORITY inside the
   repository turns `test:design-one-door` red). Run the package self-checks.
2. Fill `{FULL_SHA}` and `{YYYY-MM-DD}` in `PROMPT.txt` and `STAMP.txt`; capture the `06-frames` from a local server at
   that commit (QA personas only; never committed).
3. Ali opens Claude Design, starts a new project, uploads the zip, pastes all of `PROMPT.txt`, sends.
4. Record the send date and the stamp in §0; set D1 ✅ citing the commit that records it.

**Acceptance:** the self-checks pass; Ali confirms the send; §0 carries the stamp.

#### S2 · Week engine (no money, no UI)

**Goal:** the week lifecycle, the close guard, grading with reserves, the commitment and the pure arithmetic are complete and proven in the memory store.

**Inputs:** S1 ✅. OD-04, 09, 09b, 10, 14, 15 and 19 ruled.

**Work items:**

1. **`src/lib/maswali-score.ts`** (pure, isomorphic, no Prisma, no `server-only`, no config):
   - `grade(questions, picks)`;
   - `weekVoidCertain(questions)`;
   - `settlementGate(questions)`;
   - `displayMap(questions)`, built only from the final record;
   - `sunsetScore(...)`.

   These are §4 of this plan. The slip preview, the ticket page and settlement all import this one module.
2. **`src/lib/maswali-money.ts`** (pure): `settleArithmetic({R, S, k, floor, feeRate, rates})` returns `{J, F, TRA, GBT, net, share, U, carryOut, dust}`. It calls `levySplit` once. It also exports `guaranteeRequirement(unsettledWeeks)` (OD-02).
3. **`src/lib/maswali-commitment.ts`** (isomorphic):
   - `newSalt()` (128-bit), `leafHash`, `merkleRoot(leaves sorted by ticket id)`, `inclusionProof`, `verifyInclusion`.
   - `questionSetHash` over the frozen 15 rows, including role, ordinal and reserve order.
4. **`src/lib/maswali-void-reason.ts`:** a closed list of codes per OD-04. Its shape copies `updown-refund-reason.ts`.
5. **`src/lib/maswali-week-label.ts`:** week and ticket state words, which reach the screen only through the dictionary.
6. **`src/lib/server/maswali-dal.ts`:** Prisma and in-memory stores.
   - `CYCLE_PATCHABLE` and `QUESTION_PATCHABLE` allowlists in both stores. `patch` throws `'<k>' is not a patchable column`.
   - After DRAFT, these are absent from the allowlist: text ×3, criterion ×3, source and fallback, role, ordinal, slot, `eventStartsAt`, `eventZone`, `voidDeadlineAt`, `rulesSnapshot`, `questionSetHash`, `ticketMerkleRoot`.
   - `closesAt` is patchable only through `moveClose`.
7. **`src/lib/server/maswali-service.ts`:**
   - `createWeek` (DRAFT, from a template) and `editDraft`.
   - `attestParity` (a second reader confirms EN/SW/ZH; MB-79).
   - `openWeek`, which refuses unless all of these hold:
     - 10 MAIN plus 5 RESERVE;
     - every category in `MARKET_CATEGORIES`, plus the banned-topic screen over EN and SW;
     - `isSourceTrusted` on source and fallback, with the host frozen;
     - all three locales non-empty;
     - `closesAt ≤ min(eventStartsAt) − minLockBufferMinutes` and `closesAt > now`;
     - every `voidDeadlineAt ≤ finalDeadlineAt` and every deadline at most 7 days after open;
     - the OD-14 caps, with no same-event or dependent pairs;
     - the licence gate;
     - the guarantee requirement, through an interface S3 implements.

     Then it stamps `rulesSnapshot` (write-once) and `questionSetHash`, and calls `createMarket({productLine: "MASWALI", rateOverrides: {feeModel: "jackpot-payout", paidExitWindowMinutes: 0}, resolutionMode: "human"})`.
   - `moveClose` (MB-28):
     - earlier: only to at least now + 5 minutes + grace;
     - later: only up to the earliest event start minus the buffer;
     - never once the close has passed;
     - re-runs the 15-question check, audits, and notifies holders (the emitter is wired in S6).
   - `closeWeek`: exactly once. Stamps `closedAt`, `ticketCount`, `salesAtClose` and the Merkle root, and moves the state to CLOSED, then RESOLVING.
   - `sealQuestion(officerId, slot, outcome, evidence, voidReason?)`:
     - one officer;
     - if `getRequireTwoOfficerResolution()` is true at stage 1, `twoOfficerGate` applies to that seal;
     - refuses an officer who holds a ticket in that week;
     - an AI suggestion is stored, never applied.
   - `correctSeal` (OD-09): allowed inside the window; restarts it.
   - `proposeVoidAtDeadline`: the system proposes, an officer seals.
   - `recomputeGate`: re-run on every seal, void or objection.
   - `voidWeek`: stamp the week VOIDED once, then `refundVoidedWeek` (`maswali-void.ts`) refunds every live ticket and stamps the market VOIDED and settled in one bulk transaction (R1; MR-18's implementation note). ⚠️ Superseded by R1: it first called `settleMarket(id, {actorId: "system_maswali"})`, the existing VOID arm, which timed a large week out. It runs only after the objection windows of the triggering voids have closed. A pre-close void that dooms the week stops sales immediately.
   - `claimCarry(weekId)`: under a `maswali:chain` lock. Stamps `rolloverIn` once (`WHERE rolloverIn IS NULL`). Settlement is in CALENDAR order (`calendarStartMs`, read from the week's fixed `finalDeadlineAt`); `seq` is only the drafting counter. Ordering by drafting stranded an out-of-order draft (the re-review, 2026-10-17).
8. **`src/lib/server/maswali-scheduler.ts`:**
   - One timer per non-terminal week (open, close, void-deadline proposals, objection close).
   - `reconcileMaswaliWeeks`, every 5 minutes from `lifecycle.ts` in its own try/catch.
   - `healMaswaliWeeks`, every tick.
   - `hydrateMaswaliOnBoot` in `instrumentation.ts`, as a third independent block.
   - All schedule maths goes through `eat-day.ts`. Times are compared in UTC.

**Suites:**
- `test:maswali-score`: 11 voided-main counts × 32 reserve-void patterns = 352 cases, plus late reserve voids and display-map stability.
- `test:maswali-money`: R ∈ {0, 500k, 2M}, S ∈ {0, 300k, 1.2M}, k ∈ {0, 1, 3, 7, 870, 1,000, 1,400}. Asserts the identities `R+S+U = F+k·share+carryOut`, `F = TRA+GBT+net`, and U = 0 when k = 0.
- `test:maswali-commitment`: proofs verify, and a plant brute-forcing an unsalted hash is caught.
- `test:maswali-engine` (≥80 assertions):
  - lifecycle; the close guard (an event at 17:59 is refused); MR-5;
  - freeze in both stores; the write-once snapshot; exactly-once close;
  - the chain order; one OPEN week; the EAT-midnight boundary;
  - the 25 Oct and 1 Nov clock changes; a Friday 25 Dec close.
- `red:maswali-engine`: freeze removed; close guard off by one minute; void reserve not skipped; double close; seal after settle.
- `red:maswali-money`.

**Acceptance:** in the memory store, a week runs open → 15 seals → gate → arithmetic for every table row in §5, exact to the shilling. The 352-case table is green. Every frozen-column patch throws in both stores.

**Closes:** MB-02 (module), MB-09, MB-14, MB-15 (logic), MB-16, MB-17, MB-18, MB-19, MB-20, MB-22, MB-25 (pure), MB-26, MB-28, MB-29, MB-30 (compare), MB-32 (lib), MB-59 (locales), MB-79, MB-80, MB-83.

#### S3 · Money path (local and throwaway PostgreSQL)

**Goal:** buying, cancelling, settlement, rollover, top-up, refunds, forfeits and sunset move real ledger money correctly in both stores.

**Inputs:** S2 ✅. OD-02, 06, 07, 12, 16, 17 and 27 ruled.

**Work items:**

1. **`purchaseMaswaliTickets(userId, weekId, slips[], idempotencyKey)`** in `maswali-service.ts`:
   - Validates 15 picks per slip and the rollout state, then delegates to `buyPosition` with `ctx = {kind: "maswali", weekId, slips}`, marked `SEAM:`.
   - In `buyPositionInner`, inside `wallet:${userId}` and the existing `withMoneyTx`:
     - the insider check (the 7 `STAFF_ROLES`, live desk designations, QA markers on PUBLIC weeks per OD-12);
     - the close check against the **DB clock**;
     - the cap: count LIVE tickets for this account and week from `mine`; refuse at 10;
     - bonus refused **before** the real/bonus split;
     - N tickets in one admission slot, one lock and one group (MB-31);
     - picks-hash replay compared with `picksKey`, else `idempotency_key_conflict`;
     - ticket rows with salt and `selectionsHash`;
     - the Position description "Millionea ticket · {week}";
     - `potentialPayout` null;
     - suppressed: the poll receipt email and notice, the house trigger, wagering accrual (OD-27), and `onRecruitBet` / first bet (OD-20).
   - Every RG gate fires unchanged: rate limit, maintenance, `isLockedOut`, session limit, account status, wallet freeze, `checkLossLimit`.
   - The saved deposit bet from S9 is refused for MASWALI, never placed automatically.
2. **`stakeBoundsForMarket`:** a MASWALI arm with min = max = the snapshot price.
3. **`cashOutPosition`:** a Millionea arm, free cancellation only (RULES §2.6, with the runway measured to `closesAt`). It sets the ticket to CANCELLED and decrements `ticketCount` in the same transaction.
4. **`settleMaswaliWeek(weekId, {releasedBy})`** (OD-06: the system prepares a preview, one accounting officer releases). Under `market:${marketId}`:
   - `settledAt IS NULL` and `settlementGroupId` free;
   - the gate passes and no objection is OPEN;
   - S computed three ways (`yesPool`, `POOL` ledger, Σ LIVE tickets) and refused unless all agree;
   - `claimCarry` stamps `rolloverIn`;
   - arithmetic from `maswali-money`;
   - the guarantee balance read **inside the transaction**; if it is below U, abort with a CRITICAL alert and never pay less;
   - bulk writes: `updateMany` LOSS, one `createMany` for ledger lines, one `BET_PAYOUT` Transaction per winner, wallets credited, WIN plus `finalPayout`;
   - the column mirror on `MaswaliCycle`, `settledAt` and the state in the same `lockTx`;
   - `audit(SYSTEM, "maswali.week.settled", …)`;
   - `afterCommit`: notices (S6) and the float check (alert when Σ shares exceeds the float minus a buffer) — the float read once before any hold or credit, recorded here before any notice, never a block (S6-MONEY, MB-11).
5. **Guarantee ceremonies:** `fundMaswaliGuarantee` and `returnMaswaliGuarantee` (Owner, typed confirmation, rail reference, audited). `openWeek` refuses below `guaranteeRequirement`.
6. **Disqualification after settlement** (OD-07): the share is credited and frozen (`frozenReason`). Compliance decides; a forfeit returns it to JACKPOT (`MASWALI_FORFEIT_RETURN`). A deposit reversal that funded a winning ticket is frozen the same way (MB-74).
7. **`sunsetMaswali`** (Owner, OD-03), booked per §5.
8. **`house-book.ts`:**
   - the JACKPOT balance and Σ unsettled POOL go into `owedToOthers` / player liability;
   - the guarantee is shown as its own earmarked line;
   - `RateProvenance` gains `jackpot-payout`.
9. **Nightly invariants in `lifecycle.ts`:**
   - the JACKPOT balance equals the single outstanding carry;
   - every settled week's POOL is 0;
   - the mirrored columns equal the ledger;
   - the guarantee is at least the requirement.

**Suites:**
- `test:maswali-purchase` (both stores).
- `test:maswali-cap`: 20 and 50 concurrent buys produce exactly 10, on real PostgreSQL across instances.
- `test:maswali-settle`.
- `e2e:maswali-money`: **drives the real action** for self-excluded, cooling-off, session-limit, loss-limit, suspended, bonus-only, staff and desk accounts (all refused with their reason), then for a real-balance buyer.
- `e2e:maswali-fault`: crash mid-settlement, resume, settle once; two instances settling at once; 10,000 tickets inside the transaction budget.
- `test:concurrency` extended; `test:house-book` extended.
- `red:maswali-money-path`: cap counted outside the lock; bonus allowed; double settle; POOL tolerance of 1.
- Before merge: `test:all`, `e2e:money`, `e2e:fault`, `e2e:card`.

**Acceptance (local PostgreSQL, drift 0, POOL 0, `trialBalance()` and the Maswali invariants clean):**
- (a) A 200-ticket no-winner week rolls 200,000 into JACKPOT with F = 0.
- (b) A 300-ticket floor week with one winner: U 700,000, F 130,000, TRA 13,000, GBT 6,500, paid 870,000.
- (c) 1,500 tickets with 7 winners: 186,428 each, and 4 carried.
- (d) A week void refunds every 1,000 and leaves R untouched.
- (e) The six-week trajectory in §5 replays to a house result of +97,800.
- (f) An under-funded guarantee aborts with no partial writes.

**Closes:** MB-02 (booking), MB-03, MB-04 (liabilities), MB-06, MB-07, MB-08, MB-11 (float check), MB-15, MB-16, MB-31 (path), MB-40, MB-41, MB-43, MB-49, MB-50, MB-51, MB-52, MB-73, MB-74, MB-76.

#### D2 · Design round R2: received and inherited (blocks D3 and S5)

**Goal:** the delivery is landed, judged and filed without letting it bend a law, and the canvas sources are never
lost.

**Work items** — the full protocol, with its scripts, is
[`design-brief/maswali-2026-10/RECEIVING.md`](design-brief/maswali-2026-10/RECEIVING.md):
1. Extract OUTSIDE the repository; any `DESIGN_AUTHORITY.md` or extra token copy inside it is a packaging fault.
2. Export completeness first; commit the raw canvas sources on the branch **the same day** (a 102-board canvas that
   lived only as a claude.ai link was lost on 2026-10-03).
3. The mechanical checks (tokens used vs defined at the stamp, literals, timing, `infinite`/`--m-pivot`, keyframe
   count, JS timing, gold, front-door phrases, politics words, i18n parity, glyph attributes) — every hit read by hand.
4. Score the prompt's 14 acceptance items PASS / NOTE / FAIL; items 1–5 are gates.
5. File the delivery raw at `docs/design-system/v6-<date>-millionea/` (without its token copies) with an
   `INHERIT-MANIFEST.md` in v5's format: verdict per file, Ali's D3 rulings, the L-rows where our law beats the
   delivery, the open questions.
6. Mark the R2 BRIEF as SENT and RECEIVED (a RECORD banner); add the README rows.
7. Prepare **the D3 sheet**: each N shown on a real 4-core phone with the low-end toggle on, plus the `millionea`
   glyph, the IMESHINDA tone, the home-card position and the A1–A5 label.
8. If gates fail: a round-3 delta prompt (key `MASWALI-DESIGN-R3`).

**Suites:** `test:design-one-door`, `test:docs`.

**Acceptance:** zero invented tokens; every acceptance item scored; the manifest names every file; the D3 sheet is
ready.

**Closes:** MB-55 (the classic entry drawn as ruled).

#### S4 · Admin console and operations

**Goal:** one trading officer runs a week without a terminal; accounting releases; compliance pauses and voids; the Owner funds, sunsets and records the licence basis.

**Inputs:** S3 ✅. OD-13 and OD-26 ruled.

**Work items:**

1. **Routes** (each with `layout`, `loading` and `actions`):
   - `/admin/maswali` (trading): weeks, templates, schedule, the pre-open checklist, monitoring.
   - `/admin/maswali/[weekId]` (trading):
     - the 15-row × 3-locale builder, with character counters and the criterion template fields (MB-21);
     - event times typed in the source's IANA zone and shown in both local time and EAT;
     - probability and source; parity attestation; open; move close;
     - **the seal console**, which shows **no ticket data**: the AI evidence panel, bulk seal by one officer, void with a reason code, correction;
     - the gate checklist ("9 of 10 mains sealed · R1 needed"), never a dead button.
   - `/admin/maswali/pools` (accounting):
     - the JACKPOT and GUARANTEE balances, read null-aware;
     - the requirement;
     - the float against the pending payout;
     - the exposure meter (distinct combinations covered ÷ 1,024, worst-case top-up);
     - settlement preview and release;
     - the rollover trail; "levy on own top-up".
   - `/admin/maswali/integrity` (compliance):
     - the cluster report at close: accounts that act as one are shown as one group, each with its tickets and what
       its picks cover (the repository is public: the report's own rules are in its code, never listed here);
     - pick-shift alerts;
     - the counterfactual seal log, visible only after the fact (MB-34);
     - insider and winner screening;
     - the objection queue (S7-OB, MR-16): every week being decided that has an objection, by question, with the seal, each
       filer's reason and words, and the ruling — never offered to the question's sealer or confirmer, the officer whose
       upheld ruling set its present result, the objector or a ticket holder;
     - the per-week evidence export (S6).
2. **`roles.ts` `ROUTE_DOMAINS`:** `/admin/maswali/pools` → accounting and `/admin/maswali/integrity` → compliance, both placed **above** `/admin/maswali` → trading. `assertRouteDomainsComplete` must pass.
3. **`control-gates.ts` `CONTROL_DOMAIN`**, each control registered once:

   | Control | Domain |
   |---|---|
   | `createMaswaliWeek`, `openMaswaliWeek`, `moveMaswaliClose`, `sealMaswaliQuestion`, `voidMaswaliQuestion`, `correctMaswaliSeal` | trading |
   | `releaseMaswaliSettlement` | accounting |
   | `voidMaswaliWeek`, `pauseMaswaliSales`; `ruleMaswaliObjection` (S7-OB: a ruling on an objection, MR-16); `payLockedWinnerShare` (S6-MONEY: OD-13's payment of a share owed to a winner who cannot sign in) | compliance |
   | `fundMaswaliGuarantee`, `returnMaswaliGuarantee`, `sunsetMaswali`, `setMaswaliLicenceBasis`, the rollout switch | ops (Owner) |

   Check `DEFAULT_GRANTS` per role on production, read-only; do not reason by analogy (trading and compliance are disjoint). Add an `admin-nav-groups.ts` group and its `ROUTE_KEYS`. `rolesThatCanOpen` resolves officer alert links.
4. **Sales pause:** audited. It never blocks settlement, refunds, cancellation or withdrawals. It is distinct from the rollout switch and from the sunset: three named acts (MB-78).
5. **Automated watches:**
   - the fixture-drift watch (daily, hourly on close day);
   - a mismatch alert against a linked Yes/No market;
   - the holiday review in the pre-open checklist;
   - alerts at +2h and +12h for an unsealed question, an exhausted void budget, no settlement by Tuesday, an unstamped close, a short float, an unfunded floor, clusters, and pick shifts;
   - a Millionea card on `/admin`.
6. **Re-authentication and confirmation:** typed confirmation in a kit dialog on seal, void, fund, sunset, pause and release. Reuse the re-authentication the Owner's money controls use today; if none exists, record it as an S4 finding. Alert on a seal made from a new device (MB-94).
7. **AI drafting:** reuse `EventCalendar`, `MarketCandidate` and `ai-poll-generation`. The officer edits and approves; nothing is published automatically.
8. **`ops:maswali-*`** scripts, dry-run by default: pause, a stuck-week heal, and an invariant report.

**Suites:**
- `test:maswali-rbac`: 7 roles × 4 routes × every control, with the locked state.
- `test:admin-nav`, `test:rbac`, `test:control-gates`.
- `test:maswali-admissibility`: template fields, banned topics, categories, three locales, both clock-change weekends.
- `test:maswali-seal`:
  - one officer;
  - with the flag on, the gate applies, and the flag value is taken at stage 1;
  - the AI cannot seal;
  - an officer holding a ticket is refused;
  - a correction restarts the window.
- `red:maswali-rbac`.
- `qa:maswali-admin-shots` at 360/768/1280/1920 (needs `next dev`; `/api/dev-test/seed-admin`).

**Acceptance:** on `next dev` in the worktree, trading drafts, attests, opens, has an invalid close move refused, and bulk-seals 15. Accounting previews and releases. Compliance pauses and voids a week. Support sees the locked state. The Owner funds the guarantee. The screenshots are read one by one.

**Closes:** MB-13, MB-20 (UI), MB-21, MB-27, MB-30, MB-34, MB-36, MB-37, MB-48, MB-60, MB-61, MB-62, MB-63, MB-78, MB-81, MB-82, MB-85, MB-94.

#### D3 · Ali's N1–N4 rulings, filed (blocks S5)

**Goal:** each proposed motion gets a dated yes or no from Ali, and each yes is law and value in the same commit.

**Work items:**
1. Put the D3 sheet to Ali: N1 Carry, N2 Attestation Press, N3 Cut, N4 (recommended unspent); the `millionea` glyph; the IMESHINDA tone.
2. For each **yes**:
   - **DESIGN_AUTHORITY §M8:** a dated "Millionea exceptions" paragraph quoting Ali, plus a pointer in §M6.
   - **`motion.css`:** the keyframes and class in their blocks, with calm branches in **both** clamp lists (`prefers-reduced-motion` and `html.kp-reduce-motion`). No `--m-pivot`.
3. For each **no**: delete the motion from the plan; the fallback named in the concept applies.
4. In the same commit:
   - §M7: "Millionea seals do not count" (`roll: false` on the `WinCelebration` payload);
   - §C3 (R-HEADLINE), §M3 (unearned), §F9 (weekly routing, one seal per player per week);
   - §K8b (placement as ruled); §B11 rows in `status-tone.ts` with `STATUS_TONE_EXCEPTIONS`;
   - ~~`glyphs.tsx`: `sealNil` and `millionea`; rename `voidX` → `sealX`~~ — **superseded 2026-10-17 (Ali, §0 item 7):**
     no hand-drawn glyph. Millionea's icons are the Phosphor keys of §10c, added to the Phosphor lane's `map.ts` and
     drawn by its codegen; `voidX` is left to that lane;
   - `08-motion` docs and the provenance changelog;
   - a COMPLIANCE-DECISIONS entry naming the home card and the third Tiketi switch as deviations from the sponsor deck (R1/SJ-22); an AGENCY-REPLY; a v5 INHERIT-MANIFEST row naming the deviation, and a v6 manifest ruling row.

**Suites:** `test:keyframes`, `test:reduce-motion`, `test:motion-ladder`, `test:dead-css`, `test:glyph-motion`, `test:design-frozen`, `test:gold-is-money` (new `UNEARNED_SURFACES` arm), `qa:calm`.

**Acceptance:** every N has a dated answer; every yes is present in DESIGN_AUTHORITY and `motion.css` with both clamps; the suites are green.

**Closes:** MB-56 (flash: no gold), and the motion half of MB-58.

#### S5 · Player surfaces (needs D3 ✅)

**Goal:** a player discovers, fills, buys, cancels, follows and reads a Millionea ticket in both shells, in three languages, at five widths.

**Inputs:** D3 ✅, S4 ✅. OD-23, OD-24 and OD-29 ruled.

**Work items:**

1. **Routes**, each with a matching `loading.tsx` and `error.tsx`, and returning 404 while the rollout is WITHDRAWN:

   | Route | Tier | Notes |
   |---|---|---|
   | `/millionea` (hub) | reading | |
   | `/millionea/slip` | reading | |
   | `/millionea/how` | reading | |
   | `/millionea/tickets` | — | |
   | `/millionea/tickets/[serial]` | receipt | owner-only; ids cannot be enumerated |
   | `/millionea/register` and `/millionea/register/[week]` | reading | public, server-rendered, works without JS |

   `/positions/[positionId]` redirects MASWALI to the ticket.
2. **`src/components/maswali/*`:** `maswali-pool-figure` (no gold), `maswali-win-ledger` (the only gold, on "Kwa tiketi yako" / "Jumla yako"), `maswali-seal-line`, `maswali-slip`, `maswali-ticket`, `maswali-week-strip`, `maswali-home-card`, `maswali-outcome-stamp`, `maswali-unbroken-line`.
3. **Reused components, one prop each:**
   - `SteppedProgress` `groups`;
   - `OperationResultModal` `stamp`;
   - `WinCelebration` `roll: false`.
4. **Journey shell:**
   - the card in `journey-home.tsx` through `home-lazy.tsx`, second in the column;
   - `TicketKind` gains `"millionea"`;
   - `TAB_ROUTES`: `/millionea/tickets` (Tiketi zangu) **above** `/millionea` (Maswali tab).
5. **Classic shell:** the entry point per OD-23, plus the `/positions` notice row.
6. **Surfaces and wiring:**
   - `surfaces.ts`: `COMMIT_ROUTE` and `JOURNEY_ROUTE` entries.
   - `side-label.ts` MASWALI arm.
   - The `millionea` i18n namespace in en/sw/zh. "Millionea" stays in Latin script.
   - `event-bus.ts`: `KNOWN_EVENTS` gains a coalesced `maswali:pool`. The figure is derived server-side from `maswali-money` and the ledger, never stored.
   - Metadata, and OG images only after close; a sitemap for settled weeks; the week page cached.
7. **Seen state:** a server-side "seen" record, `MaswaliTicket.lastViewedAt` plus a per-player-week notice key (an additive migration if needed). It enforces "each fact performs once, for its owner, then rests".
8. **The slip:** kept in session storage keyed by week, with a privacy-notice version bump (a COMPLIANCE entry). It returns intact after a deposit and never places a ticket automatically.
9. **Exclusions:** `/leaderboard` ROI tiers, performance and streaks exclude MASWALI; `/results` gets its own section (MB-90).
10. **Closure:** the account-closure screen lists open tickets.

**Suites:**
- The maswali-i18n suite (S5's; its npm entry lands on `main` with S5): key-set equality, and every lookup map resolved.
- `test:maswali-ui`.
- `test:maswali-design`:
  - no gold on unearned surfaces;
  - at most one lit control per row;
  - no emoji, no count-up;
  - no score on a loss;
  - `potentialPayout` absent;
  - a countdown only on the slip and the buy block.
- `test:journey-shell` (route order), `test:timer-date`, `test:gold-is-money`, `test:responsive`, `test:contrast`, `test:type-scale`, `test:ui-consistency`, `test:design-frozen`, `qa:sse-edge`.
- `qa:maswali-player-shots`: 320/360/768/1280/1920 × en/sw/zh with the longest Swahili strings, asserting rectangles (the figure above the fold at 360, the pay control reachable).
- Classic parity.

**Acceptance:** on `next dev`, a real browser drives sign-in → hub → slip (15/15) → confirm → stamp → ticket → cancel inside the window → buy again → Tiketi zangu's Millionea segment. The classic entry reaches the hub. Rollout WITHDRAWN hides every route (positive control). The tiles are read one by one.

**Closes:** MB-38, MB-44 (closure screen), MB-53, MB-54 (built), MB-55, MB-56, MB-57, MB-58, MB-59 (UI), MB-84, MB-87 (copy), MB-89, MB-90, MB-95, MB-97 (cache).

#### S6 · Fairness, notices, reports, legal, data

**Inputs:** S5 ✅. OD-08, OD-22, OD-25 and OD-30 ruled. Finance and GBT have answered OD-08.

**Work items:**

1. **`/fairness`:** a Millionea section (question-set hash, Merkle root, count, close and hash time), a "verify my ticket" explainer, and the owner-only inclusion proof.
2. **`comms-registry.ts`:** templates, kinds and emitters, sent exactly once and stamped:
   - receipt; cancel; sales closed (to holders); question voided with its reserve; results; week void; rollover (holders only);
   - the win notice, stating the withdrawal ladder: confirmed email, typed identity, at most 5,000,000 per withdrawal, the RULES §2.7 fee; **no AML review text**;
   - one service SMS per winner (OD-25).

   Yes/No notices are suppressed. Gold chrome appears on the paid-win email only. A desk list of uncontacted winners; SMS credit checked before a winner batch.
3. **Marketing:** approved wordings carrying the three R-HEADLINE facts with `{pct}` from the snapshot; a lint in `composeMarketing`; messages to non-holders pass the marketing consent gate.
4. **Tax report** (OD-08):
   - a MASWALI product pill, `byProduct` and `ProductFilter`;
   - Report 1 gains **Jackpot brought forward**, **House floor top-up** and **Carried to the jackpot**;
   - Report 2's treatment as ruled;
   - `chargedFee` learns `jackpot-payout`;
   - the "Polls + Up & Down + Millionea = All" check.
5. **Statutory pack (`catalogue.ts`):** reads with `"ALL"`; GGR plus jackpot-liability and guarantee lines, with a note; `report-money` `moneyByGame`; the `house-book` waterfall step "Jackpot guarantee paid"; `finance-window.ts`.
6. **S16 measures:** `journey-measures-dal.ts` excludes MASWALI from the five measures and reports harm markers twice (OD-22).
7. **Data:** DSAR and export allowlists gain tickets (picks, salt shown to the owner only); the tables are purge-protected and added to DATA-RETENTION's "never touched" row; the privacy notice updated.
8. **Per-week evidence export** for audits (MB-92), with AUDITOR read access.
9. **Support:** en/sw scripts (win, loss, void, reversal, death, holiday, wrong question) and a per-ticket support lookup that is audited.
10. **Final legal and docs:** `/legal/rules/millionea` final; chat and help final; regenerate and **rasterise** `50pick-betting-rules-final.pdf` and `50pick-rates-for-admins.pdf`; `docs/maswali-operator-guide.html/.pdf`; `docs/MASWALI-ARCHITECTURE.md` (as built: file map, tests, permissions, "one control, one place"); README rows.

**Suites:** `test:maswali-fairness`, `test:maswali-reporting` (report equals ledger to the shilling), `test:maswali-notify` (exactly once, three locales), `test:maswali-claims`, `test:tax-report` (§12 extended) with `red:tax-report`, `test:house-book`, `test:product-line`, `test:retention`, `test:dsar-secrets`, `test:erasure`, `test:cert-c1`, `test:cert-c3`, `test:rate-copy`, `test:docs`.

**Acceptance:** a simulated month containing the §5 six-week trajectory files with Report 1 balanced by the reconciling lines, and the monthly pack equal to `ledgerAccountBalance` per account to the shilling. Every notice is sent once. Both PDFs are regenerated and checked by eye.

**Closes:** MB-04 (waterfall), MB-11 (notice), MB-33, MB-35 (report), MB-44, MB-46, MB-47, MB-64, MB-65, MB-66, MB-67, MB-68, MB-69, MB-70, MB-71 (final), MB-86, MB-88, MB-91, MB-92, MB-93.

#### S7 · Adversarial hardening

**Work:**
- reserve patterns × late voids × a REINSTATE objection;
- a six-week chain with week 3 voided and week 4 skipped;
- two instances settling at once; an objection during settlement;
- a source domain disabled mid-week;
- an under-funded guarantee at k ≥ 1; a short float;
- 10,000-ticket settlement;
- **the Friday 18:00 rush at 10× the S7 test reference with Up & Down running** (cross-instance on real PostgreSQL, `scripts/load`);
- clock skew past the close; an attempt to reclassify `productLine`;
- an insider promoted mid-week; a reversed deposit funding a winner;
- the winner-takeover pattern; ticket-id enumeration; OG images leaking picks;
- a 1,024-ticket covering cluster; both clock-change weekends; a holiday Friday.

**Suites:** `test:maswali-adversarial`, and a `red:maswali-*` for every guard added.

**S7 rush test target:** engineering sets a synthetic reference of **30 Millionea purchases/minute**, so the 10× run sends **300/minute** before the close and **900/minute** in its final-minute burst, from two instances, while Up & Down also sends bets. The ten-minute fixture plans 3,600 purchases before close; its requested ticket-size mix averages 26/9 tickets per purchase, about 10,400 planned tickets, exercising the separate 10,000-ticket settlement shape. These are planned test inputs, **not a measured production peak, a demand forecast or a claim that the database lands that rate**. S17 checks that the scheduled arrivals actually reach the purchase path, then reports the landed throughput and ledger results. Revisit the test reference when measured demand becomes available.

**Acceptance:** every finding is fixed or recorded in `FAILURE-INVENTORY.md`. Latency targets for the rush are set at the start of S7 from measured baselines and recorded with their results.

**Closes:** MB-31 (load), MB-35 (alerting), MB-97, and re-verification of MB-06, MB-16, MB-40, MB-94 and MB-95; and the
three KNOWN-RED cases the S7 review booked (§6.1 Gate B line 14, `FAILURE-INVENTORY.md` §9), all closed on 2026-10-22:
MB-96 (TK.2, S7-F9 8 and 11), MB-74 (RD.5, S7-F9 9) and MB-23 (OB.0, S7-OB, merged at S7-MERGE 3).

- **S7 · as built (2026-10-18), decided under Ali's delegation.** The independent review of `mln-s7-adv` + `mln-s7-fix`
  found no BLOCKER; its one HIGH and the lead's own follow-ups are on `mln-sf`:
  - *The fence migration* (`20261018130000_maswali_product_line_fence`) runs at container boot beside a live container:
    its trigger's create retries its 3 s lock wait up to 20 times, 1.5 s apart, holding no lock between attempts (the
    shape S2-BOOT-1 ruled for this table), and is skipped once the trigger stands; its header carries the P3009 recovery.
  - *A final week never opens before the time it was announced with* (MR-30, OD-03; `openWeek`, SU.5c), and a draft's
    open time cannot be patched, so the announcement holds.
  - *"Objection upheld" is no void ground while a week is on sale* (MR-15, MR-16; `sealQuestion`, VG.1–VG.3): there a
    criterion found wrong voids on "criterion wrong". A correction already needs a closed or resolving week.
  - *The announcement is seen* (F1): the hub's read model names the public final week while it is still a draft
    (`finalAhead`), the hub prints it with its open time while that is ahead, and the home card names it whatever week
    it shows — the final week's presale when nothing else can be shown. *Its rule is told at purchase* (F3): the slip's
    first rule and the confirm sheet's line beside the fee rule.
  - *The rounding remainder's note follows the settled figures* (F4, MR-25; `remainderFate`): the next jackpot as far as
    the week's own money covered it, the guarantee for the rest — all of it in a week the guarantee topped up. The
    register and the win receipt say it through one helper, the receipt in every paying week; no note names the house.
  - *Recorded, no change* (the review's L2, L3): the deadlines' re-freeze autocommits before the open's claim (a failed
    open leaves moved void deadlines on a draft, which the next open recomputes); OD-12's check before a staff promotion
    can be raced and the bootstrap admin-on-login path skips it — the purchase's staff bar, the seal and confirm bars and
    the settlement's hold all still hold — and its "no override" departs from OD-12's refund-first text.
  - *The review's smaller items* (`mln-s7-f2`, merged at `9088c5a5`):
    - **Admins can change everything:** `/admin/maswali` carries the rules form (every `maswali.config` field, read
      fresh, validated by the config's own validator, a confirm listing each change, MB-75's sentence) and the holiday
      list. Both are the Owner's (`ops`: trading never touches money config, and accounting on a trading page would
      break E-23); everyone else sees the values read-only. The licence basis is not on the form.
    - A close refused on the database clock re-arms at `closesAt − dbNow + 1 s`, never waiting for the reconcile; every
      sunset refusal names the Owner's next act; a purchase whose reads fail refuses `system_busy` (never "the week is
      shut"); a seal made while the two-officer setting cannot be read is refused (the platform's poll resolution reads
      the same flag fail-open, matching its ruled single-admin default, `test:two-admin` — recorded, not changed).
    - **Unreadable floors fail closed everywhere:** one helper, `unsettledFloors`, serves the console's requirement
      ("Needed now: Unreadable" and a critical alert naming the week), the guarantee's return and the open (both
      refused) and the invariants. The short-float alert is judged on the live float, and an unreadable float is its
      own critical alert — so dev and staging, which read no Selcom float, show it on every paying week.
    - The role change moved to `staff-role-change.ts`: an export of a "use server" file is a callable action, and that
      core has no Owner check of its own. PL.3/PL.4/IN.1b now fail on the old code.
- **S7 · the 10,000-ticket settlement, measured (S7-F8, 2026-10-21; S16 on scratch PostgreSQL 18.3, OMEGA under other
  lanes' load).** On the batched release (`9277c9ab5`): three winners — the release's transaction 3.3 s to its last
  write; about 7,000 distinct winners — 14.0 s of the lock's 30-second budget (7,000 BET_PAYOUT rows, 14,008 ledger lines,
  the pool at 0, every balance to the shilling). The same 7,000 winners all HELD: one hold per winner, each its own
  committed write and audit row (about 64 ms each there), placed inside that one transaction — it overran the budget, the
  release rolled back with nothing paid, and its failure path then lifted the holds one at a time. **Fixed:** the holds
  take sections of the chain lock (`HOLD_SECTION_MS`, 5 s of holds a section, at least one hold); every section re-reads
  the week (found settled: `already`) and every hold placed before it (one a lift removed while the lock was let go is
  placed again before any money); the money runs only in a section that reached it inside its share — a release with
  few holds is one section, as before. Guards: `test:maswali-settle` S7F8.0–S7F8.2 on both stores; plants (S7-F8-recheck),
  (S7-F8-yield) and (S7-F8-pay-fresh) in `red:maswali-money-path`; S16's all-held shape judges each section's transaction
  against the budget. **Measured after the fix** (S16 at `66f3af8be`, 43 passed, 0 failed): the all-held week settled
  once in 15 sections of the lock — 14 of holds at 5.0 s each, the paying one 9.4 s, each inside the budget, 81.6 s in
  all (about 10.5 ms a hold on a quieter machine): 7,000 payouts, 14,010 ledger lines, the pool at 0, every balance to the
  shilling, 7,000 wallets held with one audit row each, and a replay paid nothing and held nothing again. The wide week
  stayed one section (6.7 s). The trial balance (14,808 wallets) and every invariant held.
- **S7 · the lifts, in sections too (S7-F8 7–8, 2026-10-21; S16's refused shape on scratch PostgreSQL).** A release refused
  after its holds lifted them one chain-lock transaction per account: 7,000 in 134.5 s (none left frozen when nothing
  stopped it; on a busier machine a stop after 1,214 left 5,785 frozen for the nightly heal). **Now** every lift — a
  refusal's, a rollback's, an `already`'s, the heal's and a single share's — goes through ONE lifter in sections of the
  chain lock (`liftHoldsIfClear`): each section reads its accounts' wallets and held shares in batches under the lock, a
  held share keeps its hold, each lift joins the section's transaction (S16 measured one transaction per lift at 44 ms an
  account behind a release's holds), a hold already gone writes and records nothing, and a stop between sections leaves
  each account lifted or held, never half. **Measured** (S16 at `4699b4898`, 41 passed, 0 failed): the 7,000 lifts took
  56.9 s in 12 sections, none left frozen; a second refused attempt whose process ended after 3 lift sections left 1,633
  lifted and 5,367 held, each whole, and the heal lifted exactly those 5,367 (60.3 s, 13 sections), none left frozen; each
  account's trail then read three holds and two lifts, and the week settled once (21 sections, the paying one 15.6 s,
  every one inside the budget). Guards: `test:maswali-settle` S7F8.3–S7F8.6 on both stores; plants (R6-lift),
  (S7-F8-lift-held) and (S7-F8-lift-yield) in `red:maswali-money-path`.
- **S7 · the Friday rush, measured (S17 at `dd9bea8f6`, 2026-10-21 15:30–15:43Z; scratch PostgreSQL 18.3 on OMEGA with
  other lanes running; 24 passed, 0 failed).** The planned shape (the synthetic reference above — a test input, not a
  measured demand): two instances, each its own pool of 20; 300 purchases a minute for nine minutes, 900 in the last,
  300 more in the minute after the close; Up & Down at 300 bets a minute throughout. **What landed:** 3,644 purchases
  (10,012 tickets) of 3,648 sent before the close — every one of minutes −10 to −2 (282 to 320 a minute) and 909 of the
  913 in the last minute (4 met the close at its edge) — and none of the 314 sent after it: 318 refused in all, every one
  as "sales closed" (17 within two seconds of the close); no BUSY and no other refusal; 3,307 Up & Down bets, every one
  landed. Latency of a landed
  purchase, first send to answer: p50 103 ms, p95 699, p99 1,425, max 2,037 (in the last minute p95 1,042, p99 1,356); a
  refusal p95 146; an Up & Down bet p95 230, p99 387. The close: the timer started it 2 ms after its instant and its
  stamp's audit row followed 975 ms after. Every identity held: no ticket at or after the close on the database clock,
  the week closed once, the commitment counts exactly the 10,012 live tickets, the pool agrees three ways
  (10,012,000), no account above the cap, every account paid for exactly what it was told it has, all 50 retries after
  the close answered with their receipts, Up & Down's books whole, the trial balance (2,640 wallets) and every invariant.
  These are the first baseline. **The targets, set by the lead (2026-10-22, S7-F9 6) from it:** a landed purchase p95
  ≤ 1,000 ms and p99 ≤ 2,000 ms (measured 699 / 1,425), and 0 BUSY after retries — S17's constants
  (`TARGET_PURCHASE_P95_MS`, `TARGET_PURCHASE_P99_MS`, `TARGET_BUSY_PERCENT`), each now a verdict; the refusal,
  Up & Down and close-stamp targets stay TBD-BASELINE (printed, not judged). The rush ran again on S7's merged head with
  MB-97 beside it, on a GitHub runner against its own baseline (the next record).
  ⚠️ The prep had never run green: it opened its week two weeks ahead and could not move the close to the run against
  `MaswaliCycle_close_after_open_check` — fixed in the harness (S7-F8 11: the week opens at the real clock).
- **S7 · the rush again, with MB-97 beside it — on a GitHub runner, against its own baseline (S7-F9 17, 18 and 20,
  2026-10-22; run 39824076563, one job on one machine: Ubuntu 24.04.5, 4 vCPU AMD EPYC 9V74, 16 GB, image ubuntu24
  20261012.334.1).** MB-97 asks what the week page costs in the rush — "rendering per request, SSE fan-out to every
  viewer, and the cost of computing Merkle proofs" — and S17 now loads all three beside the purchases (S7-F9 17): the
  week page read per request (what `/millionea` awaits on every request, it being `force-dynamic`: `millioneaHub`, then
  `millioneaCloseMove` and `millioneaHubCommitments`; half guests, half signed in) at one read a planned purchase, the
  purchases' shape; 800 live streams, 400 a container, wired as `/api/events` wires a viewer's (`forwardMillioneaPool`);
  and after the close the root and 100 inclusion proofs over the week's live tickets. ⚠️ Under the harness the questions
  are read uncached (`hubQuestionsOf` takes Next's data cache only inside a request), so the page read measured is an
  upper bound for that part. Both runs are synthetic test inputs on one machine, never compared with OMEGA's figures.
  - *The baseline* — the harness before MB-97 (`66ec6e9be`; the product code is the head's), with only S7-F9 18's Linux
    fix (the worker now waits for its answer to reach the pipe: on Linux the check's answer arrived cut off, so no rush
    had ever finished there). ALL PASS, 27 passed: 3,884 purchases sent (3,597 before the close, 904 in its last minute),
    3,594 landed (9,704 tickets), 290 refused, every one "sales closed" (10 at its edge, 280 after), no BUSY; 3,218 Up &
    Down bets, every one landed. A landed purchase p50 24 ms, p90 75, **p95 126, p99 294**, max 928 (the last minute
    p95 112, p99 201); a refusal p95 26; an Up & Down bet p95 101, p99 215. The close: the timer 2 ms after its instant,
    the stamp's audit row 391 ms after it. Every identity held (2.1–2.12).
  - *The head* (`4c5969df1`, MB-97's load beside the rush). ALL PASS, 32 passed: 3,856 purchases sent (3,570 before the
    close, 931 in its last minute), 3,570 landed (9,589 tickets), 286 refused, every one "sales closed" (5 at its edge,
    281 after), no BUSY; 3,316 Up & Down bets, every one landed. A landed purchase p50 25 ms, p90 99, **p95 150, p99
    314**, max 742 (the last minute p95 187, p99 355); a refusal p95 9; an Up & Down bet p95 98, p99 236. The close: 1 ms,
    its audit row 351 ms. Every identity held (2.1–2.12, 3.1–3.4, 4.1).
  - *MB-97, measured.* The week page: 3,786 reads, p50 13 ms, p90 16, p95 18, p99 25, max 45 (a guest p95 17, signed in
    19; the last minute 21; after the close 18). The live figure: 1,812 and 1,758 purchases landed on the two containers
    and the feed published 252 and 248 frames over the ten minutes (at most 301 fit the feed's window there), about 25 a
    minute each against about 180 sales a minute; each of the 400 streams on a container was given every frame (about 265 bytes a frame a stream), and a
    frame reached its last stream in 1 ms at p95 (max 3). The proofs: over 9,589 live tickets one inclusion proof costs
    p50 96.5 ms, p95 109.9, max 126.9, every sampled proof under the committed root and a forged leaf refused; the root
    itself 108.2 ms, so every ticket's proof made on request, one at a time, would be about 929 s of one CPU — MB-97's
    "precompute proofs at the close" stands for the day a surface serves them (none does yet: `inclusionProof` has no
    caller outside its suite).
  - *The plants* (short rushes, 5 minutes at 100 a minute: the product refuses to bring a close under 6 minutes away),
    each failing its own identity alone (31 passed, 1 failed) and every file restored: the feed's coalescing removed →
    3.3 (355 and 353 frames against at most 152 and 151 — one a sale); guests' streams dropped → 3.2 (fewest 0); the
    figure 500 ahead → 3.4; the proof's path reversed → 4.1 (0 of 100 verified); the hub naming no week → 3.1 (765 reads).
  - *The lead's targets on this machine, against the baseline measured with them:* the baseline meets them (p95 126 ≤
    1,000 ms, p99 294 ≤ 2,000 ms, 0 BUSY) and so does the head with MB-97's load (p95 150, p99 314, 0 BUSY): with the page
    reads and the streams beside it (the proofs run after the close) a landed purchase took about 24 ms more at p95 and
    20 ms more at p99, within two runs' own spread of each other. MB-97's three new targets — the page
    read's p95, a frame's reach, one proof's p95 — print as TBD-BASELINE for the lead to set from these figures.
- **S7 · the automatic resolver against two-admin authorization (S7-F9 2, 2026-10-22).** The question: can the AI seal a
  Millionea question alone while two-admin authorization is on? It cannot. A question is sealed only by `sealQuestion`,
  `confirmSeal` and `correctSeal`, and only officer actions call them. The automatic seal (`resolveDueMarket`) stamps
  both stages as `system_auto_resolver` and never reads the two-admin setting (the 2026-07-24 ruling: automatic
  resolution is its own axis), and its door skips a week (`isFencedMaswali`) before any claim, verdict or stamp; the
  scheduler arms no deadline for a week and the sentinel answers nothing for one. **Guards:** `test:maswali-fence`
  2.4b–2.4d on both stores — two-admin ON, the week in automatic mode, a confident verdict citing its own source:
  skipped, nothing stamped; the operator's re-check of a closed week records nothing; CONTROL: the same verdict seals a
  poll.
  Plants (18) and (19) in `red:maswali-fence` (the door's fence removed; the fence narrowed to calls with no verdict),
  each caught on its own case. *Recorded, no change* (the lead's ruling): on a classic poll the automatic seal still
  stamps both stages with two-admin on.
- **S7 · the final week's rule in one wording (S7-F9 3; the lead's ruling of 2026-10-22, citing MR-30 and the S6 legal
  review).** `finalWeekRule` — the release's sentence with MR-30's floor clause last (en "…, with no floor top-up"; sw
  "…, bila nyongeza hadi kiwango cha chini"; zh "…，不进行保底补足") — is the one key the hub, the slip, the confirm sheet
  and How to play draw (How through `ruleSunset`'s `{rule}`); S7's own purchase line, `finalRule`, is gone; D19a
  re-pinned. DESIGN_AUTHORITY §M8a item 19. Guards: `test:maswali-design` 2.F3a and 2.F3b (with its plant),
  `test:maswali-hub` 3.1 and §10. ⚠️ S6's L lane rewrites `ruleSunset` in all three languages: its merge keeps this key
  as the rule's one wording. *The law says it the same way* (S7-F9 14): RULES §2.12's sunset paragraph no longer says
  only that the final week "runs normally" — it states MR-30's rule as players read it (no 10/10: the highest scores
  share the pool equally, with no floor top-up; J = R + S, the fee and its levies taken), and that a final week which
  voids or sells nothing passes the role to the next week to open (`sunsetState`, PASSES_ON).
- **S7 · L22's day only while it is ahead (S7-F9 5; the lead's ruling (b) of 2026-10-22, MR-30, OD-03).** The hub's bar
  says the final week's opening day ("It opens 30 Nov.") only while the open is still to come; a final week still a
  draft once its time has passed, or whose time cannot be read, is announced with S7's reviewed F1 words and no date
  (`finalAhead`, back in en/sw/zh; D19a re-pinned). DESIGN_AUTHORITY §M8a item 20. Guards: `test:maswali-hub` §13 (with
  its plant) and `test:maswali-design` 2.F1d.
- **S7 · the winner-takeover watch (S7-F9 8 and 11; MB-96, TK.2; the lead's rulings of 2026-10-22).** After a
  Millionea credit, a winning account that may have been taken over is raised for Compliance (`maswali-takeover.ts`): on
  the console's alert strip as a count per paying week, never an account (MR-14, MB-34), and by account on the integrity
  page ("Possible account takeovers after a payout"), where Compliance reviews it and can hold the share (OD-07). An
  alert only: nothing is held or blocked (2026-10-10), and no money path is touched. A watch that cannot be read says so
  on the strip (fail closed). The public words say what the control enforces, never what it watches for (the lead's
  ruling). Guards: `test:maswali-adversarial` TK.2–TK.6 on both stores, with three controls and TK.4b (the alert and the
  card in their reviewed words); plants (S7-F9-tk-alert), (S7-F9-tk-credit-order), (S7-F9-tk-order),
  (S7-F9-tk-fail-closed) and (S7-F9-tk-words) in `red:maswali-money-path`.
- **S7 · a deposit contradicted after its winner was paid (S7-F9 9; MB-74, RD.5; the lead's ruling of 2026-10-22).**
  When the provider contradicts a CREDITED deposit — a reversal, or the same deposit re-reported at another amount — the
  webhook marks it for review (the platform's rule: nothing is clawed back) and at once holds every PAID winning
  Millionea share of that account whose ticket was bought at or after the deposit was credited and that is not held
  already (`holdSharesForReversedDeposit`): in the release's own words ("deposit under review"), with the wallet's
  Millionea hold and a COMPLIANCE record naming the deposit; Compliance releases or forfeits it to the jackpot (OD-07).
  A share whose ticket was bought before the deposit was credited is left free — that money cannot have bought it.
  Nothing moves. Idempotent: the mark is placed once, and a share held once for a deposit is never held for it again,
  whatever Compliance decided. Under the chain lock, as every hold of this reason (R6, R8); from inside a wallet lock the
  hold runs once that lock has committed, outside every lock. The nightly heal (`healReversedDepositHolds`, before the
  stray-hold heal) places a hold a stopped process left unplaced. The integrity page's held shares show the deposit's
  provenance (MB-74). The shares are read under the chain lock, never before it: a reversal landing while a release is
  in flight waits for it, then holds the share it paid. Guards: `test:maswali-adversarial` RD.5–RD.10 on both stores
  (RD.5c the amount contradiction, RD.5d the provenance, RD.7 a share bought before the credit stays free, RD.8 the
  heal, RD.9 never a second hold, RD.10 the release in flight, made at the settlement's "money" seam); S16 §6b across
  instances (a reversal heard by two instances at once holds each share once; a reversal racing the release holds it
  once, by either); plants (S7-F9-rd5-trigger), (S7-F9-rd5-trigger-amount), (S7-F9-rd5-bought-after),
  (S7-F9-rd5-once-per-deposit), (S7-F9-rd5-heal), (S7-F9-rd5-provenance) and (S7-F9-rd5-read-in-lock) in
  `red:maswali-money-path`. The rules' reversal clause is the S6 legal lane's to carry (the Yes/No "payment reversals …
  forfeiture" clause; not on `mln-s6-int` at 81c60f0f5).
- **S7 · a figure a record lacks is never read as 0 on the money path (S7-F9 13; S6-R's rule, the lead's word of
  2026-10-22).** A winning ticket whose stored payout is not on record is a PAID share wherever S7's code reads it. The
  short-float alert (MB-11) counts it as still owed, at the week's own share per ticket; when the week's share is not on
  record either, what the winners can still withdraw is unknown, and that is its own critical alert — never the float
  judged against less. RD.5's hold (MB-74) holds it. TK.2's watch (MB-96) watches it, and a week whose paid total is not
  on record: only a record of 0 paid is passed over. Compliance can hold and release it; a forfeit refuses it ("…'s share
  is not on record; nothing was forfeited") — never a share forfeited as 0. (How the integrity page prints such a share
  is S6-R's: "Not on record".) Guards: `test:maswali-adversarial` FL.4j–FL.4m, RD.11, RD.11b and TK.7 on both stores (a
  declared fixture writes the stored payout, and the week's share or paid total, as null, and puts each back); plants
  (S7-F9-float-share-zero), (S7-F9-float-unknown-silent), (S7-F9-forfeit-zero), (S7-F9-winning-share-unread),
  (S7-F9-rd5-share-unread), (S7-F9-tk-share-unread) and (S7-F9-tk-total-unread) in `red:maswali-money-path`.
- **S7 · the staff-role notice where it is sent (S7-F9 13; the S6 review's finding).** S7-F2 moved the Owner's role
  change, and the notice it sends, into `staff-role-change.ts`; the e-mail registry (`comms-registry.ts`) now names that
  file as the notice's trigger, so `test:cert-c1`'s two `staffRoleChangedHtml` checks read where the act lives. Proven by
  two plants, each caught: the notice dropped from the send, and the registry pointed back at the actions file.

#### S8 · Live drive and public launch

**Inputs:** S5, S6 and S7 ✅; every §6 line ticked except line 12 "(after ACTIVE)"; OD-01 ruled. *(Ali, 2026-10-21
ruling 2 and 2026-10-22 — COMPLIANCE-DECISIONS § "2026-10-22 · Maswali Millionea — …": the live drive is the FIRST PUBLIC
WEEK; there is no private DRIVE week and no second drive week. OD-21's DRIVE-week code stays in the product, dormant.)*

**Work items:**
1. STAFF_PREVIEW has run since S5 went live (Ali, 2026-10-21 ruling 1); staff have looked at every surface.
2. **Launch** (Ali's word, after Gates A and B): the launch commit sets `MILLIONEA_SHIPPED = "ACTIVE"` and Railway's
   `FEATURE_MILLIONEA` is set to `ACTIVE` or cleared (the variable overrides the code's ceiling), merged by the release
   owner. The first PUBLIC week opens on the next Monday at the funded floor with no carry.
3. **The first public week is the live drive:**
   - Approved, non-staff QA accounts buy tickets that exercise the forced cases: a cancel inside 5 minutes, a cap refusal,
     a bonus refusal and a staff refusal. Every QA ticket is cancelled inside its free-cancel window, so no company ticket
     stays in the draw (the insider bar). Each production sign-in needs Ali's approval: one attempt, never retried.
   - The cases only real play produces — a voided main replaced by R1, a winner, the floor top-up, the fee and levies,
     the share — are verified as week 1 (and the first weeks) produce them; the rollover is proven by the first week with
     no 10/10.
   - The rollback switch (`WITHDRAWN`) stands ready, with its triggers named in advance: any figure that differs from §5,
     any refusal not as ruled, any notice not sent exactly once.
   - The scheduler closes the week. One officer seals. Accounting releases.
4. Read back:
   - the database (read-only proxy, counts and names only);
   - the ledger's zero-sum group, POOL 0, `trialBalance()` and the Maswali invariants;
   - the tax-report lines;
   - verification of the hash and an inclusion proof;
   - the screens at 360 and 1280 in sw.
5. RULES §5 step 6, verified on production.
6. Write the record at `docs/qa/millionea-live-drive-2026MMDD.md` (the first public week's acceptance record), with a
   README row; tick §6 line 12.

**Acceptance:** the first public week opens on schedule, and its record shows every money figure equal to §5's formulas
to the shilling.

**Closes:** MB-45, MB-73 (verified live), MB-39 (gate satisfied).

---

## §8 · The blind-area register (MB-01 … MB-99)

> A session that closes a row writes `✅ <commit>` into that row's *Closes* cell in the same commit. Signals that
> would help someone evade an anti-abuse control are not written here: the repository is public.

#### Money

| ID | Sev | Gap | Treatment (within the rulings) | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-01 | C | The generic market doors treat a MASWALI row as a poll. `storedLine` and the other coercions turn it into MARKET. `nextDeadlineFor` skips only UPDOWN. `settleMarket`'s one-sided branch (noPool = 0) refunds every ticket at zero fee. `resolveMarket`, `resolveDueMarket`/sentinel, `emergencyVoidMarket`, `adminReopenMarket`, the paid exit in `cashOutPosition`, `/admin/markets/[id]` and `/admin/resolver/[id]` all accept it. The live `resolutionMode` setting would let the AI seal it, which breaks R-RESOLUTION. | Widen `ProductLine`, with one `isKnownProductLine` and exhaustive switches that have an unreachable default. `nextDeadlineFor` returns null for anything other than MARKET. Every generic door refuses MASWALI unless the call comes from `maswali-service` under a SEAM marker. `settleMarket` is reached only through its VOID arm. The cycle market is pinned to `resolutionMode` human. `chargedFee` throws on MASWALI. Add `red:maswali-fence`: plant a MASWALI row, drive every door and every read, expect a refusal each time. | Eng | S0.5 (the fence), before any MASWALI row is written · ✅ `9834aaf0` | A1, B1, C20p |
| MB-02 | C | Nothing states a formula that keeps house money out of the rollover. `settlementPayoutEntries` tolerates a POOL that ends a shilling or two off zero. | One pure, isomorphic module:<br>• **No winner:** carryOut = R + S, F = 0, U = 0.<br>• **k ≥ 1:** J = max(1M, R + S); F = round(0.13 J); `levySplit` called once; share = floor((J − F)/k); U = max(0, F + k·share − (R + S)); carryOut = R + S + U − F − k·share.<br>One group, `maswali_settle_{id}`. POOL must end at exactly 0 (no tolerance for this product), with conservation asserted per component. Table tests over R ∈ {0, 500k, 2M}, S ∈ {0, 300k, 1.2M}, k ∈ {0, 1, 7, 870, 1,000, 1,400}. | Eng | S2 (module), S3 (booking) | A2 |
| MB-03 | C | The 1,000,000 floor has no funded account, no entry type, no funding timing and no rule for a shortfall. HOUSE:COMMISSION is too small to cover it. When weeks overlap, the house can owe about 2M at once. | Create `HOUSE:MASWALI_GUARANTEE` and a new `MASWALI_GUARANTEE_FUND` entry type (ALTER TYPE). Funding is an Owner-only ceremony from an `EXTERNAL:OWNER_CAPITAL` counterparty, with a rail reference and typed confirmation, and a mirror ceremony to return surplus. A week refuses to open below the level set in OD-02; the balance is read inside the transaction with a null-aware read. Settlement aborts with a CRITICAL alert rather than pay less. The floor figure is shown only while it is funded. | Ali (level), Eng, Finance | S1, S3, S4 | A3, C2 |
| MB-04 | H | The house book misreads the product in four ways:<br>• The solvency line counts the jackpot balance, every unsettled POOL and the guarantee earmark as free house cash, overstating it by 1–2M.<br>• The waterfall books the 13% fee on the house's own top-up as revenue.<br>• `gameBook` raises a false "books do not close" alarm every week.<br>• `RateProvenance` knows only two fee models. | • Add the jackpot balance and Σ unsettled POOL balances to `owedToOthers`.<br>• Show the guarantee as its own earmarked line.<br>• Add a waterfall step "Jackpot guarantee paid".<br>• `gameBook` gains carryIn, topUp and carryOut; the identity becomes handle + carryIn + topUp − paid − fee − carryOut = 0.<br>• Widen `RateProvenance`.<br>• Add RED anchors in `test:house-book`. Apply the same changes to `/admin/finance` and `finance-window.ts`. | Eng | S3 (liabilities), S6 (waterfall) | A5, A6 |
| MB-05 | H | Code built for two fee models (FeeModel, `readRates` coercion, `chargedFee`, `roundKeep`, `describeFeeModel`) would misread the third. RULES §1 and §3 would become false. | Run the full RULES §5 ceremony:<br>• a COMPLIANCE-DECISIONS entry quoting Ali's words and voiding the August entries by heading;<br>• RULES §1 rows, a new §2.12, §3 changed to three models, a §2.4 cap exception and an amended §2.8 "Nothing else" line;<br>• FeeModel `jackpot-payout`, or the fee kept only in `rulesSnapshot`; `readRates` refuses an unknown value instead of coercing it;<br>• a caption of 17 characters or fewer and `{pct}` taken from the snapshot;<br>• a red-first guard, both PDFs regenerated, and a check on production. | Eng, Ali (ceremony) | S1 | A7 |
| MB-06 | H | One 30-second transaction cannot settle 5,000–10,000 tickets. LedgerEntry has no unique `groupId`, so a re-entered settlement could double-pay. | Bulk writes (`updateMany` for LOSS, one `createMany` for the ledger, one Transaction per winner). Add `MaswaliCycle.settlementGroupId @unique` and an in-lock "no group exists" check. `settledAt`, the cycle state and the carry stamp go in one transaction. `e2e:maswali-fault` covers a crash mid-settle, two instances settling at once, and 10,000 tickets. | Eng | S3, S7 | A9 |
| MB-07 | H | The jackpot and guarantee exist only in the ledger, which the platform calls a secondary mirror that may post fire-and-forget. `ledgerAccountBalance` returns 0 when there is no database. | • Every Millionea post runs inside the transaction and throws on failure.<br>• Mirror carry, top-up, fee and levies as columns on `MaswaliCycle`.<br>• Reconcile the columns against the ledger nightly.<br>• Money decisions use null-aware in-transaction reads only. | Eng | S3 | A11 |
| MB-08 | H | Sales S can be read from three sources that may disagree: `yesPool`, the POOL ledger, and the tickets. Production already has one column/ledger split (mkt_037b…, −19,999). | Inside the settlement lock, compute S three ways and refuse unless they agree. Stamp `ticketCount` and sales at the close. Add a drift test for each source. | Eng | S3 | A12 |
| MB-09 | M | Rounding is unruled:<br>• Largest-remainder allocation breaks "equal" shares.<br>• `assertWinnerFloor` throws once a share drops below 1,000 (k > 870 at the floor).<br>• The dust has no home (OPEN-4). | One fee-rounding rule, `levySplit` called once, a floor share for every ticket, and a dedicated no-floor equal-split allocator. The dust home and the Invariant-1 exemption are OD-19. Tests at k = 7, 870, 1,000 and 1,400. | Eng, Ali | S2 | A20, A30, B36, C36 |
| MB-10 | M | The fee on the house's own top-up carries TRA and GBT levies paid from house money. Levies on stakes carried across months are booked in the month of payout. | Record both as accepted consequences in the COMPLIANCE-DECISIONS entry. Show "levy on own top-up" on the pools page. Put both in the Finance/GBT review (OD-03). | Finance | S1, S4 | A18 |
| MB-11 | M | A jackpot can drain the Selcom float in one or two withdrawals. Nothing tells the winner truthfully how a share becomes cash. | • Before crediting and before notifying, compare Σ shares with the float minus a buffer, and alert the Owner and Finance.<br>• The pools page shows the float against the pending payout.<br>• The win notice states the ladder: confirmed email, typed identity, at most 5M per withdrawal to the registered number only, 1.5% fee (870,000 arrives as 856,950). It never mentions an AML review.<br>• SAR rows record the jackpot provenance.<br>✅ **The float before crediting, its audience (S6-MONEY 6; `FAILURE-INVENTORY.md` §9b SM.3; the build lead's ruling of 2026-10-23):** the release reads the float once before any hold or credit and records a short or unreadable float — never a block: the credit is the winners' entitlement, and the float matters only to withdrawals. Pools shows the releasing officer the same comparison beside the button (the human gate "Finance tops up before release"); the console's front page shows the float's alerts to Finance and Compliance too. The win notice's ladder and the SAR provenance are not built here. | Eng, Finance | S3, S6 | A28, C12 |
| MB-12 | M | Agent commission and the invite first-bet prize are undefined for a fee that exists only in winning weeks and partly comes from the top-up (OPEN-3). | Per OD-20. If excluded: explicit product checks in `onRecruitSettlement` and in the invite milestone, an `/legal/agent-terms` version bump, and a test. | Ali | S0, S3, S6 | A27, C35 |
| MB-13 | H | Nobody can see the house's exposure. Break-even is about 630 tickets a week in steady state and about 890 in a cold week. Below that, the floor costs money. | `/admin/maswali/pools` (accounting domain only) shows P(≥1 winner) computed from the distinct combinations sold, the expected and worst-case top-up, and realised against modelled results. The guarantee fund and marketing plan are sized on these figures. | Eng | S4 | A13 |

#### Rules / Engine

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-14 | H | The reserve engine, the settlement gate and the displayed substitution are undefined for 15 questions. Whether unused reserves must be sealed is open, and the displayed mapping can relabel itself as later voids arrive. | `maswali-score.ts` (pure, isomorphic) owns the graded set, `weekVoid` and the display mapping. The mapping is built only from the final record. Until then the ticket shows "voided · a reserve counts in its place".<br>Officers seal all 15 by default, because an objection-VOID can pull an unused reserve in. The settlement gate follows MR-19 and is re-evaluated whenever the void count changes.<br>`test:maswali-engine` table-drives 0–15 voids, including voided reserves and late reserve voids. | Eng | S2 | A25p, B15, B26 |
| MB-15 | H | The whole-week void path is unbuilt: `emergencyVoidMarket` refuses the system actor; the carry could be stranded; a doomed week keeps selling; a buyer would still be asked to pick a dead question. | • Use the Up & Down pattern: stamp VOIDED, then call `settleMarket`'s VOID arm. The jackpot account is never touched; N+1's carryIn equals N's.<br>• A void is certain when voided mains > 5 − voided reserves. It executes only after the objection windows of the triggering voids close, so a REINSTATE can still stop it.<br>• A void before the close disables that row on the slip (stored as null in canonical selections) and stops sales the moment the week is doomed.<br>• Receipt: "all tickets refunded; the jackpot carries to next week". | Eng | S2, S3 | A25p, B16, B21 |
| MB-16 | H | Overlapping weeks have no carry-claim protocol and no chain invariants. `trialBalance` would still pass with a carry claimed twice. | • One function under a `maswali:chain` lock stamps carryIn exactly once (`WHERE carryIn IS NULL`).<br>• Settlement is strictly in order (MR-3), so N's carry always joins N+1. R-WEEK already covers this; no decision is needed.<br>• A skipped week leaves the carry waiting for the next week that opens.<br>• Partial unique index: one OPEN week. Do NOT add the raw finding's "one closed unsettled week" index: a stalled N would then stop N+1 from closing.<br>• Nightly invariant: jackpot balance equals the one outstanding carry, and every settled POOL is 0. | Eng | S2, S3 | A10, B20, C4p |
| MB-17 | H | The question set and the reserve ORDER are neither frozen nor committed at open. Editing them after open would let someone choose which reserve decides the week. | `QUESTION_PATCHABLE` excludes, in both stores: text ×3, criterion ×3, source and fallback, role, ordinal and reserve order, `eventStartsAt`, `voidDeadlineAt` and the observation definition. Publish `questionSetHash` at open. Red test: patching the order after open throws. | Eng | S1, S2 | B24 |
| MB-18 | H | Void grounds are open-ended. The Yes/No "Management may refund an ambiguous market" and "any technical error" clauses would carry over and give one officer a lever to choose winners. | A closed list of grounds, each with a reason code in `maswali-void-reason.ts`, evidence, and publication. A platform error voids the whole week only for an integrity failure. The list's contents are OD-04. | Ali, Eng | S0, S2, S6 | B12, B13, A21p |
| MB-19 | M | No question has its own void deadline and the week has no final deadline, so the timing of a postponement void is discretionary. | Freeze `voidDeadlineAt` per question, at or before a cycle `finalDeadlineAt`. At the deadline the system proposes VOID and an officer seals it. All 15 events must sit inside the template window. Value: OD-06. | Ali, Eng | S2 | B14 |
| MB-20 | M | Correlated voids are possible: a reserve on the same match as a main, dependent pairs, or many questions sharing one league, day or source (OPEN-11). | `openCycle` refuses same-event pairs and dependent pairs (officer attestation plus an AI check). Caps per competition, day and source are config values frozen in the snapshot. Hard or soft refusal: OD-14. | Eng, Ali | S2, S4 | B11 |
| MB-21 | M | The criterion leaves open overturned results, data revisions, abandoned matches, extra time, a draw on a "win" question, an exact tie on the threshold, and exchange holidays. | A criterion template with mandatory fields: named authority; regulation time (extra time and penalties excluded); draw = NO; strict inequality; instant, time zone and instrument; exchange calendar checked at open. Revisions count only inside the objection window. `test:maswali-admissibility` checks all three locales. | Eng | S4 | B31 |
| MB-22 | M | A source outage, or a mid-week change to the live `isSourceTrusted` registry, has no rule. | Freeze the primary source, a named fallback and a reading tolerance at open (the Up & Down `capturedSourceDomain` precedent). Registry edits never touch an open week. No reading by the deadline means VOID with a reason code. | Eng | S2 | B32 |
| MB-23 | H | Today's objections cannot serve this product:<br>• one per player per market, only after the whole market resolves;<br>• no `questionOrdinal`;<br>• a VOID cannot be contested (REVERSE is refused on VOID);<br>• a reserve becomes decisive after its window has closed;<br>• the sealer may rule on objections to their own seal;<br>• the window is a live 1h setting that can be 0 and can fall at night. | • Millionea objections are keyed (cycle, ordinal, user). Standing follows MR-16: any live ticket holder.<br>• Three remedies: REVERSE, VOID and REINSTATE.<br>• The window is keyed to the moment the graded set becomes final; any change to the graded set reopens it for newly graded questions.<br>• Any OPEN objection blocks settlement.<br>• Window length, timing, restart and the ruling officer are OD-05.<br>✅ **Built as decided (S7-OB, 2026-10-22; `FAILURE-INVENTORY.md` §9 OB.0 closed):** any live ticket holder objects to one question, once per question (open or decided), from the ticket's page, while the week's window is open (24 h from the graded set's finality, never closing before 12:00 EAT, frozen at the open); a Compliance officer rules on `/admin/maswali/integrity` (control `ruleMaswaliObjection`), the Owner the fallback — never the question's sealer or its seal's confirmer, the officer whose upheld ruling set its present result, the objector or an officer holding a ticket in the week; REJECT, REVERSE, VOID or REINSTATE on the result the officer reviewed; any OPEN objection holds the settlement and the week void; an upheld change re-grades (MR-17) and restarts the window once. The rule: `RULES.md` §2.12 "Objections"; the code: `maswali-objections.ts`. | Eng, Ali | S1 (column), S2, S4 | B2, B3, B4, B18, B19, C20 |
| MB-24 | H | A seal cannot be corrected. `resolveMarket` refuses a re-seal, `upholdObjection` refuses after `settledAt`, and nothing covers an error found after payout. | An officer may correct their own seal inside the window; the correction is audited, restarts the window and notifies holders. After payout, nothing is ever clawed back. The remedy is OD-09. | Ali, Eng | S2, S4 | B5 |
| MB-25 | M | The sunset rule leaves gaps: a final week that voids or sells nothing, a regulator stop mid-week, the fee and floor, what "score" means, notice, and who triggers it. | A pure "highest score" function (graded correct answers out of 10). Ledger path JACKPOT → POOL(final) → tickets. Owner ceremony. The rule is in the binding text from week one. Contents: OD-03. | Ali, Eng | S0, S2, S6 | A26, B22, C22 |

#### Timing

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-26 | H | "Event start" is undefined for price, stock and weather questions. A Friday-close equity session opens at 16:30 EAT (17:30 after 1 Nov), before the 18:00 close. The PDF's Bitcoin sample leaks information. | This follows from MR-4 and R-WEEK; no decision is needed. Event start = start of the observation window, defined per type:<br>• sports: scheduled kickoff;<br>• point price: start of the observation day or session;<br>• weather: 00:00 local on the first observed day;<br>• entertainment: broadcast or announcement start.<br>A machine check enforces windowStart ≥ close for all 15. Consequences: Friday-close equity questions are barred by construction, and price thresholds are fixed at open and checked against the reading at the close. Reword the PDF sample. | Eng | S2, S4 | A15, B9, C5p |
| MB-27 | H | A fixture brought forward after the week opens creates a past-posting window. Event times are typed once and nothing watches them. | Store the scheduled start frozen at open and an observed start beside it. A fixture-drift watch runs daily, and hourly on close day. The officer moves the close earlier (R-WEEK). If sales ran past the real start: OD-10. | Eng, Ali | S4 | B6, C5p |
| MB-28 | M | Moving the close after open changes the cancellation runway after the fact. Re-opening after the close would undo the commitment. | R-WEEK allows moves in both directions. B7's "never later" narrows the ruling and is NOT adopted. Instead:<br>• Earlier: only to at least now + 5 min + grace, so every sold ticket keeps its full window.<br>• Later: only up to the earliest start minus the buffer (OD-15).<br>• Never after the close has passed (MR-13 makes the hash write-once).<br>• Re-run the 15-question check, notify holders, audit, and stamp `closeAtPurchase` on each ticket. With the runway rule, every cancellation window ends at or before the close, so the hash can be taken at the close. | Eng | S2 | A22p, B7 |
| MB-29 | M | A close equal to the first event leaves no time to publish the hash, no allowance for clock skew, and no margin for kickoff drift. | Freeze `minLockBufferMinutes` in the snapshot. Show `hashComputedAt` on `/fairness`. Raise a CRITICAL alert and flag the attestation if the hash is not out before the earliest start. Buffer value: OD-15. | Ali, Eng | S2, S6 | B8 |
| MB-30 | M | Officer-typed times across the UK (25 Oct 2026) and US (1 Nov 2026) clock changes can let in a question that has already started. | Enter times in the source's local time with an IANA zone. Convert and compare in UTC. Show both local and EAT absolute times. Red test over both weekends. | Eng | S4 | B10 |
| MB-31 | H | The Friday 18:00 rush lands on one shared admission queue and one market lock. Ten tickets mean ten lock acquisitions. A retry after the close must return the receipt. A deposit can confirm after the close. The ticker would cause a broadcast storm. | • Buy N tickets in one transaction: one admission slot, one lock, one group, the cap counted once.<br>• The close is enforced on the database clock inside the lock.<br>• Extend the L2 replay to Millionea keys.<br>• In the last 15 minutes, the slip warns that a deposit may not confirm in time.<br>• Coalesce ticker updates.<br>• Load-test at 10× the S7 test reference with Up & Down running; compare against measured demand when available. | Eng | S3, S7 | C25, A32 |

#### Fairness

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-32 | H | `selectionsHash` over 15 binary picks has only 2^15 possible inputs, so publishing it reveals every ticket. One SHA over all tickets cannot prove inclusion to a player. The cited precedent `test:lock-hash` tests advisory-lock hashing, not a commitment. | A 128-bit salt per ticket, held server-side and shown only to its owner. A Merkle root, the ticket count and the close time published at the close. An owner-only inclusion proof. An anonymised graded table after settlement. Write the spec into the door before S2. **This corrects MR-9 and MR-13.** | Eng | S2 (spec), S6 (publish) | B23 |
| MB-33 | M | `/fairness` has no record per week, and `listTerminalMarkets` defaults to MARKET. | A permalink per week: the 15 questions with criteria and sources, seals with evidence, voids and their replacements, the close time, the ticket count and root, pool, fee, top-up and paid amounts, k and the share. No names. A "verify my ticket" explainer. | Eng, Design | S6, D2 | C31 |
| MB-34 | H | The single sealing officer could see the projected winners before a seal or void. A void moves the employer's money (it can avoid a top-up). | The seal/void console shows no ticket data, and no pre-settlement view shows pick splits, alive counts or winners. The counterfactual (winners and top-up with and without the void) is computed at each seal, audited, and visible to Compliance only after the fact. Alert when a void changes the winner set or avoids a top-up, or comes after the named source has already published a result. | Eng | S4 | B17, A21 |
| MB-35 | H | Groups of accounts, each under the cap, can cover the board. Identity is checked only at withdrawal. The same pattern is a laundering route. | A cluster report at close: accounts that act as one are shown to Compliance as one group, with what its picks cover. Compliance is alerted before settlement when a cluster holds a winner. Weekly coverage report. A fair-play clause in the Millionea rules. SAR provenance on withdrawals. Cap definition: OD-16.<br>✅ **The alert before settlement (S6-MONEY 6; `FAILURE-INVENTORY.md` §9b SM.4):** once a week's results are final and until it pays, a line of its connected-accounts report holding a winning ticket raises a critical alert — on the integrity page and, for Compliance, the Auditor and the Owner (never the trading officer who seals), on the console's front page; an unreadable report for such a week is its own alert. SAR provenance is not built here. | Eng, Ali | S6, S7 | A16, B28, C8 |
| MB-36 | H | How predictable the questions are is a solvency parameter. If favourites win 70% of the time and players follow them, P(≥1 winner) at 300 tickets doubles to about 50%. | Each question records an estimated probability with its source. The modelled exposure is shown at the close. The band and override: OD-14. | Ali, Eng | S4 | A14 |
| MB-37 | M | A jackpot rewards fixing one low-tier match. `buildMatchIntegrity` does not know these questions. | Alert on unusual pick-distribution shifts before the close (Compliance only). Feed the questions into the integrity report. Restricting competitions: OD-14. | Eng | S4, S6 | C23p |
| MB-38 | H | The "still alive" status flips both ways, and a jackpot figure next to it reads as a promised return (C3, SJ-4). | Provisional wording ("X of Y settled questions match · final when all 10 counted questions settle"). Never "eliminated" or "winner" before the result is final. No figure on a held ticket. `potentialPayout` is null everywhere. Public alive count: OD-24. | Design, Ali | S5, D1 | B25 |

#### RG / Compliance

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-39 | C | Voiding the August rulings removed the only gate on real money. Ali's general statements on 2026-09-29 and 2026-10-14 name no jackpot. The licence file never describes a fixed-price ticket, a house floor, a rollover across weeks, a payout-only fee or a sunset (OPEN-1). | • COMPLIANCE-DECISIONS gets a dated entry.<br>• Write `docs/BOARD-DISCLOSURE-MILLIONEA.md`.<br>• Add a GLI change-management row and publish the void policy.<br>• Ask which tax class applies.<br>• Code gate: `maswali.config.licenceBasis` (Owner-set, audited); `test:maswali-licence-gate` proves the refusal with a positive control.<br>• A feature-state guard. | Ali, Board | S0, S1; before S8 | A4, C1 |
| MB-40 | H | The responsible-gambling gates hold only on the one purchase path. A jackpot payout or week-void refund lifts the rolling-24h loss limit by that amount. The session-limit refusal arrives after the player has built 15 picks. | • One path only (`buyPositionInner` with a Millionea context).<br>• e2e drives the real action for self-excluded, on-a-break, session-limit, loss-limit and suspended players.<br>• The draft is kept on refusal.<br>• Harm markers tracked per product.<br>• Loss-limit offset: OD-17. | Eng, Ali | S3, S7 | C10 |
| MB-41 | H | The insider bar leaves four things open:<br>• which accounts (7 `STAFF_ROLES` and live desk designations);<br>• promotion mid-week;<br>• QA personas, which have no marker;<br>• D19, which forbids house wording, while R-INSIDERS wants a "clear message". | Check in the purchase lock. Staff get an explicit refusal reason. Desk accounts get a neutral one ("This account can't buy Millionea tickets. Contact support."), which satisfies both R-INSIDERS and D19. The seal path refuses an officer who holds a ticket in that week. Winners are screened against staff phones and devices. Mid-week edges, QA accounts and households: OD-12. | Eng, Ali | S3 | B29, C6 |
| MB-42 | M | MASWALI = "denied" for house bots triggers a daily false `PRODUCT_DENIED` alarm in `scopeAlerts`. `predictorExtra` inflates counts players see. | Return early before `scopeAlerts` for MASWALI. Remove MASWALI from INTENT/TARGET lines. The ticket count comes only from the week's own count. File a COMPLIANCE-DECISIONS entry for the denial. | Eng | S1 · ✅ S0.5 `9834aaf0` for the false alarm and the INTENT/TARGET lines; the week's own ticket count (S5) and the COMPLIANCE-DECISIONS entry remain | C7 |
| MB-43 | H | No rule for a winning ticket disqualified after settlement (under-18, duplicate identity, sanctions, a staff alternate account, cap evasion). Settlement cannot be re-run. | Never reopen a settled week. The share is credited, frozen, and decided by Compliance under Terms §3a. New entry type `MASWALI_FORFEIT_RETURN`. Roles re-checked at settlement. The forfeited share's home: OD-07. | Ali, Eng | S3, S4 | A17, C9 |
| MB-44 | H | Winners whose account is closed, self-excluded, suspended or cooling off cannot see or withdraw the money. Many journey players have no email. | The closure screen lists open tickets. The `CANNOT_SIGN_IN` letter goes out. No next-jackpot figure appears in any notice. Payment procedure: OD-13.<br>✅ **OD-13's payment built (S6-MONEY 2–5; `FAILURE-INVENTORY.md` §9b SM.2):** Compliance pays a locked winner's share on `/admin/maswali/integrity` ("Winners who cannot sign in", control `payLockedWinnerShare`), at the holder's request, through the platform's own withdrawal to the registered number only — the identity and email rules unchanged, the freeze kept, exactly once, recorded. A holder who never verified identity or email is paid once they do. | Ali, Eng | S5, S6 | C11 |
| MB-45 | M | Under R-LAUNCH the live drive either dilutes a public week or rolls staff money into week 1. | ~~Per OD-21.~~ The drive is the first public week (Ali, 2026-10-22): QA tickets are cancelled inside their free window, so no company ticket and no drive money is in any pool (§7b S8). | Ali | S8 | B30 |
| MB-46 | H | Launching before S16 skews the sponsor's "in bounds" measures. `journey-measures-dal.ts` has no product-line filter (OPEN-13). | After the widening, exclude MASWALI from the five measures. Report the harm markers twice. Mark the launch date on the measures view. OD-22. | Ali, Eng | S6 | C16 |
| MB-47 | H | Nothing guards marketing claims. The SMS composer sends text as typed, so "Shinda TZS 1,000,000 kwa TZS 1,000!" is false three ways. OG images and push are unchecked. | • An approved set of wordings that carries the three R-HEADLINE facts, with `{pct}` filled from the snapshot.<br>• A lint in `composeMarketing` (amount, shinda, milioni, uhakika).<br>• `test:millionea-claims` (no gold, no count-up, no "first").<br>• Messages to non-holders pass the marketing consent gate.<br>**As built (S6):** a campaign declares its product by its name (`campaignProductOf`). The composer's one door holds a Millionea campaign to the three facts and no claim (`millionea-claims.ts`), and at a server door to the week's own fee while Millionea is open. A campaign not tagged Millionea meets the untagged rules (its Millionea signals and a Chinese body refused) only where a server door hands them in: they are the server's alone (`millionea-untagged.ts`, S6-LINT 1), never in a browser bundle. Held by `test:maswali-claims` and `red:maswali-claims`. | Eng | S6 | C3 |
| MB-48 | M | Banned topics go beyond politics: religion, adult, violence, war, and the health or death of an individual. Hand-typed questions bypass the AI filter, and "other" is an escape hatch. | One shared banned-topic screen in `openCycle` over EN and SW text and criteria. Category must be in `MARKET_CATEGORIES`. "Other" needs a compliance note. Red test. | Eng | S4 | B33, C23p |

#### Player UX

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-49 | M | Purchase-path details:<br>• `stakeBoundsForMarket` has no Millionea arm, so a higher platform minimum could refuse every ticket;<br>• it is unclear whether the cap counts cancelled tickets;<br>• the real-first split would spend bonus before any refusal. | • Millionea arm: min = max = the frozen price, validated at open.<br>• Freeze the cap in the snapshot; count live tickets only.<br>• Refuse bonus before the split.<br>• Register reasons in en/sw/zh: `millionea_cap_reached`, `_bonus_refused`, `_sales_closed`, `_staff_barred`, `_account_ineligible`.<br>• Test: 50 concurrent buys produce 10 tickets. | Eng | S3 | A31, C37p |
| MB-50 | M | Cancellation has no hook to remove a ticket from the count, the hash or the cap. A paid exit priced on pool odds could appear. | Millionea arm: mark the ticket CANCELLED and decrement the count in the same transaction. Pin `paidExitWindowMinutes` = 0 in the snapshot. In the last 5 minutes the slip says "no free cancellation" (the E-197 lesson). | Eng, Design | S3, D1 | A22p, C37p |
| MB-51 | M | Replaying a request id ignores the picks: a reused key with an edited slip returns the old ticket. | A replay requires the same picks hash, otherwise `idempotency_key_conflict`. A fresh key per confirmed slip. Identical tickets: OD-24. | Eng | S3 | A23, B27 |
| MB-52 | M | The purchase path quotes a payout for a one-sided pool and labels the ticket "YES". | `potentialPayout` null, `payoutIfWin` omitted, description "Millionea ticket · {week}". Test the receipt, notice and email. | Eng | S3 | A24 |
| MB-53 | M | Tiketi zangu cannot show tickets: `/positions` lists MARKET only, and `/positions/[id]` would draw a Yes/No dial. | • A third `TicketKind`, with `/millionea/tickets` above `/millionea` in `TAB_ROUTES`.<br>• A held ticket shows picks and status only.<br>• A win shows pool, fee and paid, per ticket and in total.<br>• A loss shows the score as bookkeeping.<br>• `/positions/[id]` redirects.<br>• The losing-ticket rollover line: OD-24. | Eng, Design | S5, D1 | C38 |
| MB-54 | M | The home card and the third switch item depart from the sponsor deck (R1, SJ-22) without a record. | A COMPLIANCE-DECISIONS entry naming both as deviations, plus an AGENCY-REPLY. Measure the switch at 320 and 360px in sw, en and zh. | Eng, Ali (filing) | the record ✅ 2b6bf5bf (D3) · the measurement S5 | C14 |
| MB-55 | M | The classic shell has no entry point before S15 (OPEN-5). | Per OD-23. Remove it when S16 unmounts the classic shell. | Design, Ali | D2, S5 | C15 |
| MB-56 | M | The headline is not always true: the carry is pending while N resolves, the floor may be unfunded, and `.value-flash` is gold. | X = max(1M, confirmed carry + sales), shown only while the floor is funded. A "plus week N's carry-over once final" line. Derived figure on an allow-listed SSE event. No gold flash (OD-24). | Eng, Design | the law ✅ 2b6bf5bf (D3, §M8a items 6–7, 9) · S5 | A29, C4p |
| MB-57 | M | A 15-pick slip on a cheap phone must survive a deposit round trip, a reload and sign-in. S9's saved bet holds one bet. A new storage key needs a privacy-notice version. | Server-rendered slip. Session storage keyed by week id, with the privacy version bumped. After a deposit, return to the slip with picks intact and never place the ticket automatically. Page-weight budget and a 2G/3G test. | Eng, Design | S5, D3 | C26 |
| MB-58 | M | Accessibility of the 15-row ballot, the results and the figure. | Fieldset and legend per row, radio pairs, an aria-live "n of 15", 44px targets, neutral marks for right and wrong (not YES/NO colours), absolute dates beside countdowns, and a reduced-motion form for each N1–N4. | Design, Eng | the motion half ✅ 2b6bf5bf (D3, §M8a items 1–5) · S5 | C27 |
| MB-59 | M | Question text in three locales lives in the database, where `test:i18n` cannot see it. Email is EN+SW only. | `openWeek` refuses any empty locale. "Millionea" stays in Latin script. Reasons in 3 locales. The help text says email is EN+SW. Respect the SW length budget. | Eng | S2, S5 | C28 |

#### Admin / Ops

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-60 | M | No ruling on who voids a question, who voids a whole week by hand, or who triggers the sunset. | Register each control once in `CONTROL_DOMAIN`. In `ROUTE_DOMAINS`, `/admin/maswali/pools` (accounting) sits above `/admin/maswali` (trading). Show the control-locked state. `test:maswali-rbac` covers 7 roles. Authority: OD-26. | Eng, Ali | S4 | C21 |
| MB-61 | M | No weekly calendar or staffing for 90 strings, 15 sources and weekend seals. One missed seal stalls two weeks. | Calendar: draft Wednesday, freeze Sunday, open Monday 00:00 EAT, close Friday 18:00, seal by Monday 12:00. A primary and a backup officer. Pre-open checklist; a week never opens short. Alerts at +2h and +12h per question. A settle checklist. | Eng, Ali (staffing) | S4 | C24, B35 |
| MB-62 | H | No Millionea sales stop and no incident runbook. | An audited sales pause (compliance domain) that never blocks settle, refund, cancel or withdraw. `ops:millionea-*` scripts, dry-run by default. A runbook covering each scenario. Semantics: OD-03. | Eng | S4 | C34 |
| MB-63 | H | No monitoring for a weekly product's failure modes. | Nightly invariants (MB-16, MB-07). Alerts: unsealed question, void budget exhausted, unsettled by Tuesday, close not stamped, float short, floor unfunded, clusters, pick shifts. A Millionea card on `/admin`. | Eng | S4, S6 | C33 |
| MB-64 | M | Support has no scripts and no Millionea view. | en/sw scripts, including those listed in MB-91. A read-only per-ticket lookup for the support domain, audited and opened per request, so it never gives the sealing officer aggregate data. Chat handoff. Operator guide PDF. | Eng, Ali | S6 | C29 |

#### Reports

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-65 | H | The tax report breaks:<br>• A no-winner week makes Report 1's check fail by the week's sales (RESULT_MISMATCH), which blocks locking or filing the whole book, Polls and Up & Down included.<br>• Report 2 files 13% × Payout = 0.87F against the booked F.<br>• `ProductFilter`, `byProduct` and the `TaxPeriodLock` CHECK know two products. | A third product pill and the CHECK migration. Three reconciling lines. A Report 2 rule. A "not reconciled" note until ruled. Reads use `productLine "ALL"`. `test:tax-report` §12 and `red:tax-report`. The basis is OD-08. | Finance, Board, Eng | S6 (S0 decision) | A8, C30 |
| MB-66 | M | GGR in the GBT pack swings: a no-winner week shows its whole sales as GGR, a payout week can be deeply negative, and there is no liability note. | Lines for jackpot-liability movement, guarantee contribution and GGR excluding that movement. A product split and a note. Presentation: OD-08. | Finance, Board | S6 | A19, C30p |
| MB-67 | M | Picks appear in neither data-export door, and cascade deletes could destroy the 7-year betting record. | Add a ticket view to `buildDsarBundle` and `exportUserData` through one allowlist. Mark the tables purge-protected and add them to DATA-RETENTION's "never touched" row. `test:erasure`. Update the privacy notice. | Eng | S6 | C32 |

#### Notifications

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-68 | H | The poll notices would say false things about a ticket ("Bet placed · YES", "the exact amount you receive"). There is no plan by week state, and no line between service and marketing messages. | A registered set per state: receipt, cancel, sales closed, a void with its reserve, the result, a week void, a rollover message to holders only. Suppress the poll notices. Each sent exactly once, stamped. Gold chrome only on the paid-win email. Winner SMS: OD-25. ⭐ As built (S6-INT 14): the cancel's and the week void's refund notices are the REFUND kind (the platform's refund kind), registry and emitter together. | Eng, Ali | S6 | C13 |

#### Legal surfaces

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-69 | H | The binding text has no Millionea section. Terms §10 promises 14 days' notice of a material change. The chooser still says "two products". | A Terms section and `/legal/rules/millionea` in en/sw/zh, with the rules version stamped on each ticket. Update the chooser. Run the §5 ceremony. Notice question: OD-18.<br>**Built (S6; S6-INT 30, 2026-10-23):** `/legal/rules/millionea` published as v2026-10-23 with the S6 release; `/legal/terms` §4's paragraph above the ceiling (Terms v2026-10-23, stamped at registration there; COMPLIANCE § "2026-10-23 · Terms v2026-10-23 …", no §10 notice, for Ali's confirmation). **The stamp on each ticket (S6-MONEY 1):** `MaswaliTicket.rulesVersion` = `MILLIONEA_RULES_VERSION` · the week's code@the instant its figures froze (`millioneaTicketRulesStamp`; `test:maswali-purchase` 2.14 on both stores, plant (SM1)). | Eng, Ali | S6 (S0 decision) | C18 |
| MB-70 | M | The PDF's rule 3 ("reserves are not answered") contradicts R-RESERVES and will leak into copy and agent pitches. | The binding rules and the slip's rules strip state: all 15 are answered, the reserve order, the week void, the void deadlines, the absolute close, the cap, and no cancellation in the last 5 minutes. Marketing copy is derived from the binding rules only. Extend `test:terms-cancellation`. | Eng, Design | S6, D1 | B34 |
| MB-71 | H | `chat.ts` and `/help` would state falsehoods: "13% of the losing side, both games", "a winning bet is never paid less than its stake … impossible", "one-sided means refunded". | Scope each statement to Yes/No and Up & Down. Add a Millionea block filled from config. Never suggest picks. Run `test:rate-copy`. Coordinate the `house-bot-disclosure` §6 pin. | Eng | S6 | C19 |

#### Platform / IA

| ID | Sev | Gap | Treatment | Owner | Closes | Src |
|---|---|---|---|---|---|---|
| MB-72 | M | Collisions with the Vodacom lane: shared files, and `house-bot-disclosure` §5.1 pins dictionaries and rulebooks byte-identical. | The widening lands first, in one integrator commit. Shared files change in small commits inside agreed windows. One `millionea` dictionary namespace. Parity diffs registered in advance. | Eng | S1, S5 · ✅ S0.5 `9834aaf0` for the integrator commit | C17 |

---

#### Still missing — rows added by the completeness critic

| ID | Area | Sev | Gap | Treatment | Owner | Closes |
|---|---|---|---|---|---|---|
| MB-73 | Money | H | **The very first week.** There is no predecessor, carry is 0, and the floor applies. Expected house result at 300 tickets is about −150k. There is no minimum-sales threshold, so 50 tickets with one winner still pays 870,000. Week 2 opens while week 1 is unsettled, which needs about 2M funded. | Stamp `carryIn = 0` at open with no chain wait. Fund before week 1 (OD-02). The live drive never seeds week 1 (OD-21). No "first" claims (SJ-24). The headline shows the funded 1,000,000. The S8 acceptance check covers the floor paths. | Eng, Ali | S3, S8 |
| MB-74 | Money | H | **A reversed deposit funded a ticket.** A CONFIRMED→FAILED callback (chargeback or mobile-money reversal) is only escalated. `wallet-service.ts` says the bets it funded are an unmade policy decision. A reversed stake could fund a jackpot-winning ticket. | The ticket stays in the committed set and is graded, so the commitment holds. If it wins, its share is credited and frozen pending Compliance, with forfeiture per OD-07. Show the provenance in the cluster/integrity report. Carry the Yes/No "payment reversals … forfeiture" clause into the Millionea rules.<br>**Built (S7-F9 9 and 13; the lead's ruling of 2026-10-22):** a deposit the provider contradicts after its winner was paid — reversed, or re-reported at another amount — holds at once every paid winning share of that account whose ticket was bought at or after the deposit was credited (a share its record lacks counts as paid); Compliance releases or forfeits it (OD-07); the integrity page names the deposit behind the hold. | Ali, Eng | S0, S3, S6 · S7 ✅ `378b842d0` (the hold) · S6 ✅ S6-INT 30 (the rules' clause, §12 "Reversed payments", v2026-10-23) |
| MB-75 | Rules | M | **Config edited mid-week.** Price, fee rate, cap, objection window, buffer, caps and the two-officer flag are live settings. | Freeze every Millionea value in `rulesSnapshot` at open. `/admin/config` shows "applies from week N+1". The one exception is `requireTwoOfficer`, which R-RESOLUTION leaves platform-wide: a mid-week toggle applies only to seals not yet started (MB-82). | Eng | S1 |
| MB-76 | Money | L | **Legacy bonus balances.** Sign-up bonus grants still sit in `bonusBalance`. Nothing says whether a Millionea ticket accrues bonus wagering turnover (RULES §2.5). | The slip shows "Real balance X · bonus can't be used for Millionea". `bonusFunded` is always false. Turnover: OD-27. | Eng, Ali | S3, D1 |
| MB-77 | Money | M | **Tax on winnings.** RULES §2.8 says "No withholding tax" on players. Nobody has confirmed that a single jackpot win of millions draws no gaming-winnings withholding. | Finance and TRA confirm in writing. If any applies, change §2.8, the win notice and settlement. | Finance | S0 |
| MB-78 | Rules | H | **The product is killed mid-week.** Three different acts are conflated: pausing sales, voiding the week, and stopping the product. Nothing says what happens to the in-flight week when Ali stops it rather than the regulator. | Three named acts:<br>• **pause:** sales only; settlement continues;<br>• **week void:** refund, carry untouched;<br>• **product stop:** the sunset.<br>Semantics for each origin of the stop: OD-03. | Ali, Eng | S0, S4 |
| MB-79 | Rules | H | **A wrong question is published.** A typo in the threshold or date, a wrong reserve order, or Swahili text that differs from English. Text freezes at open. `legal/_components.tsx` makes English binding, while most players read Swahili. | DRAFT is freely editable. A second-reader EN/SW parity attestation is required before open. After open, the only remedy is a void on a closed-list ground: "criterion materially wrong or EN/SW divergent", found before the close or upheld by an objection (OD-04). Audit and publish the case. | Ali, Eng | S2, S4 |
| MB-80 | Rules | M | **The source is ambiguous at the deadline.** The primary and fallback conflict, the data is provisional, or the official result is under appeal. | The named primary authority wins. Provisional data is not final. A result under appeal stands as published at the deadline; later revisions are ignored (MB-21). Nothing final by the void deadline means VOID with a reason code. Evidence is captured (archived page or screenshot) at the seal. | Eng | S2, S4 |
| MB-81 | Rules | M | **The same event is also a Yes/No market.** Two different officers could seal the same fact differently. | Link the question to any matching Yes/No market. Alert on a mismatch between the two seals. Neither seal is evidence for the other. Both results are published. | Eng | S4 |
| MB-82 | Admin | L | **The two-officer flag changes mid-week.** A seal that is half done changes its completion rule. | A seal follows the flag value at the moment its first stage begins. Audit it. | Eng | S4 |
| MB-83 | Timing | M | **EAT midnight.** "Monday open" is 00:00 EAT (Sunday 21:00 UTC). Week codes, "results Monday" labels and the cap must not use server-local or ISO-calendar weeks. | All schedule math goes through `eat-day.ts`. Week identity and the cap are keyed by cycle id. Dates are printed absolute, in EAT. Red test across the midnight boundary. | Eng | S2 |
| MB-84 | Timing | M | **The Friday 18:00 boundary.** The close needs one authoritative instant. The last cancellable purchase is at 17:55. S9's saved deposit bet must never place a Millionea ticket automatically, and must be refused after the close. Between Friday 18:00 and Monday 00:00 no week is on sale. | The close is exclusive and checked on the database clock inside the lock. A purchase whose lock wait crosses 18:00 is refused. The saved bet carries the slip or is refused for MASWALI. The page shows "next week opens Mon 00:00 EAT" and has no pre-sale. | Eng, Design | S3, D1 |
| MB-85 | Timing | M | **Holiday weeks.** Holidays are not modelled. 25 Dec 2026 and 1 Jan 2027 are Fridays, so the default close falls on a public holiday. Boxing Day; Eid moves (lunar); 9 Dec falls mid-week; US Thanksgiving is 26 Nov with a half-day on Friday 27 Nov. Days of national mourning cancel fixtures in bulk. | A holiday review in the pre-open checklist. The officer may move the close (R-WEEK). An exchange calendar check at open. A rule capping correlated voids (MB-20). Run or skip: OD-27. | Ali, Eng | S4 |
| MB-86 | RG/Comp | M | **A winner has died.** No procedure exists anywhere on the platform. | Freeze the account. Compliance pays the estate on proof (death certificate and letters of administration), audited. Script and legal review. OD-07. | Ali | S4, S6 |
| MB-87 | RG/Comp | M | **How the chance of winning is stated.** A jackpot invites "odds" claims. "1 in 1,024" is true only for coin-flip questions. | No numeric odds. State that "every one of the 10 counted questions must be right", publish a record of weeks won and not won, and put the RG link on the slip. OD-24. | Design, Ali | D1, S6 |
| MB-88 | Legal | M | **Winner publicity.** Big winners will be asked for publicity. Privacy law (PDPA) and the winner's own safety are at stake. | Public pages are anonymised. A name or photo appears only with written opt-in. Marketing never names a winner without consent. OD-30. | Ali | S6 |
| MB-89 | Player UX | L | **Several tickets at once, and quick picks.** One confirm for several different slips; a random "lucky dip" is not in the PDF. | Multi-ticket slip tied to buying N in one transaction (MB-31). Quick pick: OD-29. | Design, Ali | D1, S5 |
| MB-90 | Platform/IA | M | **Player statistics.** "View performance" on `/positions`, leaderboard ROI tiers, `/results`, streaks and achievements would mix 1,000 TZS LOSS tickets into Yes/No statistics through "ALL" reads. | Each reader names its MASWALI handling (exclude, or show as its own section), held by `test:product-line`. | Eng | S5 · ✅ S0.5 `9834aaf0` for the classification: each reader names its MASWALI handling |
| MB-91 | Admin/Ops | M | **Disputes after settlement.** Player complaints, GBT escalation and the remedy for a proven error. Desk scripts are also missing for a death, a reversed deposit, a holiday, a wrong question and a week void. | A complaint path with a response time and an evidence pack per week (MB-92). Remedy per OD-09. Extend the MB-64 scripts. | Ali, Eng | S6 |
| MB-92 | Reports | H | **The Board asks for an audit.** No per-week evidence export exists, and the AUDITOR role has no read access. | A per-week export: snapshot, questions, seal and void audit rows with evidence captures, objections, the commitment, the settlement group's ledger lines, guarantee funding entries, the integrity and cluster reports, ticket CSV. Read-only AUDITOR access to `/admin/maswali`. Kept 7 years. | Eng | S6 · as built: the evidence pack on `/admin/maswali/evidence` (S6); and (S6-DOCS 2, the lead's ruling (m) of 2026-10-22: "`/admin/maswali`" means the Millionea console) the Auditor reads every Millionea console screen but the desk's lookup — the week list, each week page and its edit page through the console's one route exception (`auditorReadsPath` in `roles.ts`, asked by `canViewPath`, the page gate and the nav), which stands on its compliance view grant — opens no other trading page and acts on none (`test:maswali-rbac` §7, red plants (27)–(29)) |
| MB-93 | Notifications | M | **Push or SMS fails.** SMS is OTP and marketing only, with a 20,000 TZS credit floor kept for codes. Push reaches subscribers only. Email goes only to confirmed addresses. | The bell and the ticket page are the record. Log delivery status. Check SMS credit before a winner batch. Alert when a winner has had no notice for 24h. A desk list of uncontacted winners. ⭐ As built (S6-INT 17, the lead's ruling 1, M-1): a winner SMS that did not go — refused by the gateway, or lost in transport — is never resent (once per player-week); it is counted not resent, never as sent, the run is complete, and the desk list is the remedy (a winner counts as reached only by a DELIVERED receipt, a seen mark or the desk's recorded call). A winner whose share is missing from its record gets no money notice and stays on the desk list ("Not on record"). Recorded: `docs/FAILURE-INVENTORY.md` §9b. | Eng | S6 |
| MB-94 | Security | H | **An officer account is compromised.** One officer seals and voids. Guarantee funding, sunset and pause move money or stop sales. | Step-up re-authentication and typed confirmation on seal, void, fund, sunset, pause and settle release. Alert on a seal from a new device. All audited. | Eng | S4, S7 |
| MB-95 | Security | M | **Ticket access and pick privacy.** `/millionea/tickets/[ticketId]` could be read by guessing ids, picks could leak through SSE or the API, and OG share images could expose picks before the close. | Owner-only access; ids that cannot be enumerated. Inclusion proof to the owner only. No pick aggregates before settlement. Share images only after the close. | Eng | S5, S7 |
| MB-96 | Security | M | **Winner account takeover.** A jackpot winner is a SIM-swap target. | Alert Compliance when a winning account may have been taken over after a credit: a count per paying week on the console, the account on the integrity page, where Compliance reviews it and may hold the share (OD-07). An alert, never an automatic hold: 2026-10-10 removed withdrawal holds, and any hold needs its own ruling. | Eng, Ali | S7 ✅ `32b7f7992`, `8194bf3e3` |
| MB-97 | Performance | M | **The week page in the rush.** Rendering per request, SSE fan-out to every viewer, and the cost of computing Merkle proofs. | Cache the week page, with the headline on a coalesced SSE event and polling or no ticker on 2G. Precompute proofs at the close. Include in the S7 load test.<br>**Measured (S7-F9 17–20, §7b S7):** in the rush on a GitHub runner the page read costs p95 18 ms, the coalesced feed about 25 frames a minute a container against about 180 sales, a frame's fan-out to 400 streams 1 ms, and one inclusion proof over 9,589 tickets about 100 ms — every proof on request about 929 s of one CPU, so a surface that serves proofs precomputes them at the close (none serves one yet). | Eng | S5 (the cache), S7 ✅ `4c5969df1` (the load test) |
| MB-98 | Legal | L | **Sports data rights.** Source terms of use for fixture and price data used in a betting product. | Check the terms for each trusted source. Record them in the source registry. | Ali | S4 |
| MB-99 | Platform/IA | H | **The rulebook needs five corrections before the door is written:**<br>(a) MR-9/MR-13: an unsalted `selectionsHash` can be brute-forced (MB-32);<br>(b) MR-16: the window opens when the graded set is final and restarts ONCE per week, from the ruling, when an upheld objection changes the graded set (a later change re-grades but keeps the window), not "at the last gating seal" (MB-23);<br>(c) MR-26: POOL must end at exactly 0, with no `settlementPayoutEntries` tolerance (MB-02);<br>(d) no "one closed unsettled week" index (MB-16);<br>(e) MR-19 reconciled with "seal all 15 by default" (MB-14). | Fold all five into door §6 and §7 before S1. | Eng | S0, S1 |

**Prompt topics → rows:**
- first week: MB-73
- last week: MB-25, OD-03
- kill switch: MB-62, MB-78
- wrong question: MB-79
- ambiguous source: MB-80, MB-22
- midnight and Friday 18:00: MB-83, MB-84, MB-31
- holiday weeks: MB-85
- overlapping weeks: MB-16
- self-excluded, closed or suspended winner: MB-44
- deceased winner: MB-86
- refused winner (under-18, sanctions, duplicate identity): MB-43
- deposit reversal: MB-74
- legacy bonus: MB-76
- disputes: MB-91, MB-24
- care desk: MB-64, MB-91
- Board audit request: MB-92
- data export: MB-67, MB-92
- tax report: MB-65, MB-77
- statutory pack: MB-66
- accessibility: MB-58
- Chinese locale: MB-59
- low data: MB-57, MB-97
- push and SMS: MB-93
- classic entry point: MB-55, OD-23

---

## §9 · Owner decisions OD-01 … OD-30 — all accepted 2026-10-16

**Ali, 2026-10-16: "Accept all recommendations".** Read every "Rec" below as the ruling, with three explicit
answers given the same day, which override the text where they differ:
- **OD-01 · licence basis:** Ali's own dated ruling is enough — not the Gaming Board's written note. Risk accepted.
- **OD-02 · guarantee funding:** pre-fund TZS 2,000,000 by the audited owner ceremony before week 1.
- **OD-05 · objections:** one 24-hour window per week, never closing before 12:00 EAT, ruled by another officer.

**Still owed by someone other than Ali:** Finance's written confirmation of the tax-report lines in OD-08 and of no
withholding on winnings (MB-77). Both sit on Gate B (§6) — they block going ACTIVE, not the build. Each item stays
changeable later by a new dated ruling.

These are only the items his rulings do not cover, ordered by how much they block. "Rec" is the recommendation.

**Block S1 (the law) or the first real ticket. Decide in S0.**

1. **OD-01 · Licence basis (OPEN-1, MB-39).**
   - Options: (a) the GBT's written confirmation; (b) Ali's dated ruling recording a verbal GBT answer and accepting the risk; (c) neither.
   - Rec: (a), falling back to (b) before the live drive. Either one must name the fixed price, the house floor, the rollover across weeks, the payout-only 13% fee and the sunset. The code gate opens only once one is recorded.
2. **OD-02 · Guarantee funding (OPEN-6, MB-03).**
   - Options: (a) pre-fund; (b) pay from house cash at payout. Level: 1M per unsettled week, or 1M minus the confirmed carry.
   - Rec: (a). The Owner deposits 2,000,000 before week 1 through an audited owner-capital ceremony. A week opens only if the fund is at least Σ (1,000,000 − confirmed carry-in) over every unsettled week, including the new one. Settlement aborts rather than pay less.
3. **OD-03 · Sunset and kill semantics (OPEN-7, MB-25, MB-78).** These must bind from week one.
   - Rec:
     - announce at least one full week ahead; the final week runs normally; score = graded correct answers out of 10, shared per ticket;
     - 13% fee and levies apply at the sunset payout; no top-up unless a 10/10 exists;
     - if the final week voids or sells nothing, the next scheduled week becomes final;
     - an Owner-ordered stop mid-week lets the current week run as the final week;
     - a regulator-ordered stop refunds the current week, and the pool goes to the highest-scoring tickets of the last fully graded week unless the regulator directs otherwise;
     - Owner-only ceremony with typed confirmation.
4. **OD-08 · Tax and statutory pack (OPEN-2, MB-65/66/10/77).** Finance and GBT decide. This blocks the first month-end, because the first no-winner week jams filing of the whole book.
   - Rec:
     - Report 1 gains three lines: carried to the next jackpot, jackpot brought forward, house floor top-up;
     - Report 2 files the booked 13% of J;
     - statutory GGR is unchanged, with added liability and guarantee lines and a note;
     - the levy on the house's own top-up and the period shift are recorded as accepted;
     - no withholding tax on winnings, confirmed in writing.
5. **OD-04 · Void grounds and wrong questions (MB-18, MB-79).**
   - Options: (a) a closed list; (b) the Yes/No discretionary refund carried over.
   - Rec: (a). The list:
     - not played or finished by the void deadline;
     - abandoned with no official result;
     - no datum from the primary or fallback source;
     - outcome publicly settled before the close;
     - criterion materially wrong, or EN/SW divergent, found before the close or upheld by an objection.
   - A platform error voids the whole week, never a single question. English stays binding, but a divergence counts as ambiguity.
6. **OD-05 · Objection model (MB-23, OPEN-12).**
   - Options: (a) the live platform setting (1h); (b) one window per week, frozen at open.
   - Rec: (b):
     - length 24h (payout still lands by Tuesday), never closing before 12:00 EAT;
     - opens when the graded set is final;
     - restarts once after an upheld objection that changes grading;
     - ruled by an officer other than the sealer, with the Owner as fallback;
     - REINSTATE is available.
   - **As built (S7-OB, 2026-10-22; accepted):** the ruling officer is "an officer other than the sealer", and also not
     the officer whose upheld ruling set the question's present result — the author bar, audited
     `maswali.objection.author_blocked` (`test:maswali-objections` 2.17, plant (22)): the lead's ruling under Ali's
     "separation stays absolute", 2026-10-22. MR-16 carries the whole rule.
7. **OD-06 · Settlement release.**
   - Options: (a) automatic once the gate passes; (b) the system prepares a preview and one accounting officer releases it.
   - Rec: (b), because credit is instant and withdrawals are not held. Alert if not released within 4 hours.
8. **OD-07 · Forfeited and unpayable money (MB-43, MB-74, MB-86).**
   - Rec:
     - a disqualified ticket's share returns to the jackpot account, never the house; fee and levies stay as booked; other winners are not re-paid;
     - a minor's stakes are refunded;
     - a winning ticket funded by a reversed deposit is frozen, then forfeited to the jackpot;
     - a deceased winner's share is paid to the estate on proof.
9. **OD-09 · Correcting results (MB-24).**
   - Rec: before payout, an officer may correct their own seal inside the window, which restarts it. After payout, never claw back; tickets wronged by a proven error are compensated from operator funds, never from the jackpot.
10. **OD-10 · Sales ran after an event started (MB-27; MR-5 is derived, so confirm it).**
    - Options: (a) void the question for every ticket and apply the reserve; (b) refund only the tickets bought after the actual start.
    - Rec: (a). It keeps the committed ticket set intact and removes any advantage. Pull the close in as soon as a move is known.
11. **OD-12 · Insider edge cases (OPEN-8, MB-41).**
    - Rec:
      - refuse a staff promotion or desk designation while the account holds an unsettled ticket (Owner override refunds the tickets first);
      - QA accounts are marked and barred from public weeks;
      - the Terms bar staff households;
      - AGENT accounts may play;
      - the desk refusal wording stays neutral under D19.
12. **OD-13 · Winners in locked accounts (MB-44).**
    - Rec: a Compliance officer pays to the registered number at the holder's request. Identity and email rules are unchanged. No marketing goes with the notice.

**Block S2/S4 (engine and admin).**

13. **OD-14 · How questions are built (MB-36, MB-20, MB-37, OPEN-11).**
    - Options: (a) warn only; (b) hard refusal.
    - Rec: (b), with a typed Owner override:
      - every question carries an estimated probability between 30% and 70%, with its source;
      - no shared events or dependent pairs;
      - per competition, day and source caps (at most 4 per competition; reserves drawn from at least 3 sources);
      - sports only from competitions with public integrity monitoring.
14. **OD-09b · Void deadline (MB-19).**
    - Rec: scheduled start + 48h, capped at Monday 23:59 EAT of the results week, printed on each question.
15. **OD-15 · Close buffer (MB-29).**
    - Rec: sales close at least 30 minutes before the earliest of the 15 events (frozen per week). The commitment is published inside that buffer.
16. **OD-26 · Authority (MB-60).**
    - Rec: a question's result or void by one trading officer; a manual whole-week void by Compliance with a typed reason; the sunset and the guarantee funding by the Owner only.
17. **OD-16 · What "player" means for the cap, and covering (OPEN-9, MB-35).**
    - Options: (a) per account, with cluster detection; (b) also cap per deposit number.
    - Rec: (a) for v1, reviewed by Compliance before settlement. Add (b) only if clusters appear.

**Block S3/S5/S6 (money path, surfaces, legal).**

18. **OD-17 · Loss limit (MB-40).**
    - Rec: Millionea winnings never offset the 24h loss limit. A week-void refund offsets only stakes placed inside the same 24h window.
19. **OD-18 · Terms §10 notice (MB-69).**
    - Rec: the new section binds only on purchase, with the version stamped on each ticket. Existing terms do not change, so no 14-day notice is needed. Get a legal sanity check first.
20. **OD-19 · Dust and the winner floor (OPEN-4, MB-09).**
    - Rec: equal floored shares. The remainder goes to the jackpot account, and any top-up is reduced by it. Millionea is exempt from Invariant 1, which is disclosed in the rules and in chat.
21. **OD-20 · Agents and invites (OPEN-3).**
    - Rec: no agent commission and no invite first-bet credit for v1. Bump the agent terms version. Review after three months.
22. **OD-24 · Display set (MB-38, MB-53, MB-56, MB-87, OPEN-10/14/15).**
    - Rec:
      - no public alive count before settlement;
      - the carried figure only on the public week page, not on the losing ticket;
      - no flash on the figure unless an N-slot proposes a neutral one;
      - identical tickets allowed within the cap, with "same picks as ticket n";
      - no numeric odds.
23. **OD-25 · Winner SMS (MB-68).**
    - Rec: one service SMS per winning holder, with no link, stating the amount and "open the app". Non-holders get only approved marketing.
24. **OD-27 · Holiday weeks and bonus turnover (MB-85, MB-76).**
    - Rec: run every week, with a holiday review before open. A week may be skipped with notice, and the carry waits. Millionea tickets accrue no bonus turnover.
25. **OD-29 · Quick pick (MB-89).**
    - Rec: no quick pick in v1. A slip with several tickets, each with its own picks, is allowed.
26. **OD-30 · Winner publicity (MB-88).**
    - Rec: never name a winner without written opt-in.

**Block launch logistics (S8 and the design round).**

27. **OD-21 · Live drive (MB-45).**
    - Rec: a private, unlinked week whose unwon money is refunded and kept out of the measures. Public week 1 starts at the floor with no carry.
    - **Superseded for S8 (Ali, 2026-10-21 ruling 2 and 2026-10-22):** the live drive is the first public week, with QA
      tickets cancelled inside their free window (§7b S8). The DRIVE-week code stays in the product, dormant.
28. **OD-22 · S16 baseline (OPEN-13).**
    - Rec: the five measures exclude Millionea. Harm markers are reported for all players and for players without a ticket, and judged on the latter. Amend item 8 by a dated ruling.
29. **OD-23 · Classic-shell entry point (OPEN-5).**
    - Rec: Millionea under More at every width, plus one card at the top of the Markets board. The rail does not change. D2 proposes the exact form.
    - **Superseded:** Millionea has its own tab (Ali, 2026-10-19 — DESIGN_AUTHORITY §M8a item 11); on the classic phone rail
      its track takes Live's place while its door is drawn, Live moving to More's first row, and the classic landing
      carries a Millionea line and a Live link (Ali, 2026-10-22 — the same item and COMPLIANCE-DECISIONS § "2026-10-22 ·
      Maswali Millionea — …").

## §10 · Design round R2 — "Daftari na Muhuri · The Register and the Seal"

> ⚠️ **SUPERSEDED BY THE DELIVERY (2026-10-17).** This section is the panel's concept as commissioned. The build follows
> the filed delivery [`design-system/v6-2026-10-17-millionea/`](design-system/v6-2026-10-17-millionea/INHERIT-MANIFEST.md)
> and its manifest's L-rows. Where this section differs, the delivery and Ali's 2026-10-17 rulings win. These differences are known:
> - **The slip.** The slip's Endelea is brand primary; gold sits only on the confirm sheet's armed commit.
> - **Words.** The main balance is "salio kuu", never "salio halisi".
> - **The closing pill** shows only in the last hour (Q5).
> - **The seal door.** It reads "Ona matokeo", not "Fungua" (Q7).
> - **N2's press stops** are 1.02 / 0.98, the `seal-place` stops in the adopted N-block.
> - **The "cannot win" line** is ruled, in the owner's wording.
> - **One grading module.** `maswali-score.ts` is the one implementation (L9).
> - **The home card.** It sits after the head and is a server component outside `home-lazy.tsx` (O-7).
> - **Routes.** The slip never joins `MONEY_ROUTE`.
> - **The receipt's legal line** follows the real resolution mode (L3).
> - **The filing** is `v6-2026-10-17-millionea/INHERIT-MANIFEST.md`.
> - **Icons (Ali, 2026-10-17):** every icon the delivery drew — its three adopted glyphs and the house-idiom icons inside
>   its frames — is replaced by the Phosphor icons of §10c. Where a frame shows a hand-drawn mark, the built screen shows
>   §10c's Phosphor icon for that meaning.

**What is commissioned.** The commission Claude Design receives (D1 sends it) is
[`design-brief/maswali-2026-10/PROMPT.txt`](design-brief/maswali-2026-10/PROMPT.txt), with its brief, predicted output
and receiving protocol beside it. Where the spec below and the prompt differ, the prompt wins: it carries the later
corrections ("salio kuu" for the main balance because "halisi" means NET in the dictionary; the closed category
labels; N2's press stops 1.02/0.98 from `seal-place`; the gold allow-list including the shipped deposit doors; no
jackpot figure on any held-ticket surface; the classic entry drawn as ruled; N4 offered as one bold slot).

**How it was chosen.** Three concepts were drawn independently — Hati na Muhuri (the deed and the seal), Sindano Kumi
(ten needles) and Ngazi (the ladder) — and a five-judge panel (brand, motion, responsible gambling, Swahili mass-market
UX on low-end Android, front-end engineering) scored them 54, 48 and 53 of 70, then grafted the best of each onto the
winner. The needles lost on law: borrowing the needle's identity motion breaks §M8, ±14° is about 1.5px at 14px, and
the pick letter "N" means YES in Swahili but NO in English.

**Still Ali's (D3):** N1–N4 yes or no, the `millionea` product glyph, the IMESHINDA status tone, the home-card position
and the A1–A5 label. Every other item the spec below marks OPEN was settled by the accepted batch (§9).

The judged concept follows, as the panel wrote it.

#### 1. The idea

**In one line:** every ticket is an entry in the week's public register. Every result is stamped onto it along the mark's own −14° axis. Every shilling is a line in the ledger. Only ten matching marks in an unbroken line open the Seal.

*Daftari* is the word every Tanzanian knows twice: the school exercise book a teacher marks with ✓ and ✗, and the official register (*daftari la wapiga kura*, the voter register). That double meaning is the design. The product feels familiar the way a daftari is familiar, and official the way a register is official.

The metaphor is art direction only. Player copy keeps the dictionary words: *tiketi*, *bwawa*, *akiba* (reserve), *batili* (void), and *Daftari la Wiki* (the week's register).

The design is built from five objects. All of them are made of parts 50pick already ships.

1. **The ticket (a document with a stub).** Fifteen numbered clauses:
   - Ten mains, 1–10, on the flat rung.
   - Five reserves, A1–A5, below a ruled divider on `.mat-inset` (motion.css:394). The divider's heading carries the rule.
   - Under a perforated rule sits the stub: serial, week, TZS 1,000, purchase time and the short question-set hash. The perforation is the `ticket` glyph's own notch line, drawn at document scale.
2. **The Seal Line (the instrument).** Ten sockets in one row, with five smaller annex sockets beneath. Every socket is a member of the r8.6 status-ring family in `glyphs.tsx`.
3. **The ledger (the money).** The jackpot figure is never a hero number. It is a line in a short public ledger, in mono neutral ink, with the R-HEADLINE rule attached.
4. **The week strip.** Three static phases in plain words, with nothing ticking.
5. **The Seal.** The existing Struck Seal, unchanged except that it does not count. It is reached only through an unbroken line of ten matches, and on the player's tap.

**The socket grammar.** Four shapes in one ring, each carrying a word wherever there is room.

| State | Glyph | Ink | Word (SW / EN) |
|---|---|---|---|
| Awaiting the event | `clockPending` (dashed ring + hands) | `--text-muted` | Inasubiri / Awaiting |
| Pick matched | `sealCheck` (ring + tick) | `--success-fg`, never `--yes-*` | Imelingana / Matched |
| Pick did not match | `sealX` (the existing `voidX` geometry, renamed; zero consumers) | `--text-muted`, never rose | Haikulingana / No match |
| Not counted: a voided main, a voided reserve, or an unused reserve | **`sealNil`** (NEW: ring + level bar, the accountant's nil) | `--text-muted` (faint only if the rendered composite is at least 3:1) | Batili / Haikutumika |
| Reserve standing by | `clockPending` at annex size | `--text-muted` | Akiba |

**How each rule is taught, without a paragraph:**

| Rule (as ruled) | How the design teaches it |
|---|---|
| **15 picks, answered up front.** | The ticket has fifteen clauses. The sticky rail reads "Kuu 7/10 · Akiba 2/5" (mains 7 of 10, reserves 2 of 5). The pay control arms only at 15/15. |
| **A reserve counts only when a main question is voided, in order; a voided reserve is skipped.** | Annex sockets stay "Akiba" (standing by) whatever their event does. A reserve becomes a mark only after the Carry (N1) moves it into the vacated main socket. The annex socket keeps "→4". A voided reserve shows `sealNil` and "Batili", and the next reserve carries. |
| **More voided mains than valid reserves voids the week and refunds every ticket.** | A live line reads "Akiba halali zilizobaki: 4 kati ya 5" (valid reserves left: 4 of 5). When it can no longer cover the voided mains, the week band reads "Wiki imebatilishwa" and every stub rejoins (N3 reversed). |
| **The guaranteed floor and the rollover.** | The ledger has two lines, real money and the floor, and the jackpot line repeats the larger. When real money passes the floor, the floor line drops to muted ink but stays visible. |
| **The 13% fee is taken at payout, and only then.** | It appears in the R-HEADLINE everywhere. The ledger's fee line reads "—" until a payout. Rollover strata print "ada 0". |
| **An equal share per winning ticket.** | The win ledger reads "÷ tiketi 3 zilizoshinda" (÷ 3 winning tickets), and "× 2" when the player holds two. |
| **Sales close before the first event.** | Slip and hub print "Mauzo yanafungwa: Ijumaa 18:00" over "Tukio la kwanza: Ijumaa 19:30". The officer tool refuses any other order (R-WEEK), so the second time is always later. |

#### 2. Motion governance (applies to every moment)

1. **Each fact performs once, for its owner, then rests.**
   - A press, carry, cut, rollover or refund plays the first time *this player* views it after it happened. That is tracked by a server-side `lastViewedAt` per ticket and per player-week for hub notices.
   - After that, the moment renders as its end frame.
   - A poll never fires a ceremony. A data change while the player is viewing may fire N2 and nothing more.
2. **A backlog rests.**
   - If more than four facts are unseen, none of them animate.
   - The reckoning moment (M5 or M6) carries the beat instead.
   - Staggers never exceed 4 steps × `--m-stagger`.
3. **Presence routing follows §F9.**
   - A weekly settlement is almost always RETURNING. The AwaySummaryBar line is the door.
   - The seal opens only on the player's tap, or LIVE inside `MAX_LIVE_AGE_MS`.
   - Win and loss share `DWELL_RESULT_MS`.
4. **Every moment is one-shot.**
   - So each is visible on the `data-motion="reduced"` throttle tier, which is the target device.
   - No §6 entry is needed, and there are zero new loops.
5. **Budget.**
   - Only transform, opacity, the individual `translate` and `scale` properties, `clip-path` and `stroke-dashoffset` animate. No blur in any new motion.
   - At most 12 composited layers at once.
   - `will-change` is set only for the run and cleared on `animationend`.
   - One layout measurement before a run, none during.
   - At least 50fps measured on a device with 4 cores or fewer and 4GB RAM or less, at 360 (INTAKE §4b).
6. **Haptics.**
   - `confirm` on a purchase, and on a cancel the player makes inside 5 minutes.
   - `success` on the seal.
   - Nothing else: no haptic on close, results, voids, carries, rollover, a week void, or any render or poll.

#### 3. The screen set

Every money figure is `.amount`: mono, tabular, never letter-spaced, sized for `TZS 1,000,000+`, and U+2212 for negatives. Every page states its tier once in `<PageContainer>`, and each `loading.tsx` states the same tier. Titles use `text-title-lg` (28px). Swahili comes first: labels fit at 1.75× and are proven at 2.25×, with zero horizontal overflow at 360.

##### 3.1 Journey home card (the Maswali tab, `/`; ruled under R-PLACEMENT)

**Placement and build.**
- It sits after the head (`LazyHowToCard` and `HomeHeadline`) and before `HomeChips`, at every width (O-7, ruled 2026-10-17).
- The whole card is one `<Link>` to `/millionea`.
- It is a server component with no countdown and no poll. Its figure is fixed at render time.
- It loads through `home-lazy.tsx` so a classic visitor's first-load JS stays unchanged (§0h point 20).

**360.** A row of three:
- A 48px `IconPlate` in the how-to card's royal material, carrying the `millionea` glyph. Never gilt.
- A text column:
  - "Millionea · Wiki 42".
  - The R-HEADLINE: "Jackpot TZS 1,000,000 · inagawanywa sawa kwa kila tiketi ya 10/10 · ada 13% wakati wa malipo". It wraps freely and is never clipped.
  - The meta line: "Mauzo yanafungwa Ijumaa 18:00 · Tiketi zako 2/10".
- A chevron (`edge="end"`).

**768.** The same card, full column width. The figure moves to a right-aligned block and the meta line fits on one line.

**1280.** The card spans the board column above the card grid. Text sits on the left, the figure block on the right, all in one row.

**States:**
- Pre-sale: "Jackpot —" with "Inafunguliwa Jumatatu".
- After the close: "Matokeo 6 kati ya 15 yametolewa" (6 of 15 results out).
- Settled: "Wiki 42: tiketi 3 zilishinda" (3 tickets won) or "hakuna 10/10 · TZS 601,000 imeletwa mbele" (no 10/10; carried forward).
- Paused: "Millionea imesimamishwa kwa muda".
- Cooling-off or self-exclusion (`viewerDoorsFor.onBreak`): the card is not drawn.

##### 3.2 Classic-shell entry point (OPEN; recommendation)

⭐ **Ali, 2026-10-19 — Millionea's own tab** (`docs/DESIGN_AUTHORITY.md` §M8a item 11, with his words): *"the maswali should
have a new tab next to up and down like them but it should have a unique design the same tab but with writing in it kind of
colors … in mixed glowing green red color and gold like 50pick design for uniqueness like kalshi"*. Millionea's tab sits
right after Up & Down in every nav that has tabs, while it is visible to the viewer, its label in one still gradient of the
three money colours (`.kp-millionea-ink`; no animation, by the lead's reading of the Owner's Kalshi reference). It reverses
(c) below and the journey's "no tab" (D-13 (b), D-15); (a), (b) on the phone rail, (d) and (e) stand.

- **(a) The same card at the head of the classic `/markets` board,** above the filters, at every width. Record it as a change to the accepted v3 discovery layer.
- **(b) "Millionea" as the first row of the phone rail's `NavMore`,** for signed-in players and guests, wearing the tab's ink (S5-TAB 1). Guests reach the hub, and buying asks them to sign in.
- **(c) At 1024 and above, a core link of the top bar right after Up & Down** (Ali, 2026-10-19). While it shows, Results moves into More as its first row, at every width — the link's room. ~~Results folds into More at 1024–1279 and returns inline from 1280~~ (struck the same day, measured in S5-TAB: the bar's room is capped at `--w-board`, 1280px, and with both inline the Swahili bar of a signed-in player at TZS 999,999 needs 12px more at every width from 1280 and pushes the account menu off the screen — E-190's failure). ~~A row in the top bar's overflow menu; no inline link~~ (struck 2026-10-19).
- **(d) No bottom-rail slot on the classic phone rail.** It is five equal tracks with the centre coin, so Millionea stays More's first row there.
- **(e) Classic `/positions`:** one NoticeBar-style row, "Tiketi za Millionea wiki hii: 2 →", only when the player holds tickets.

##### 3.3 Hub `/millionea` (`reading` tier)

**360, top to bottom:**
1. Page title "Maswali Millionea".
2. The week strip as a compact vertical list. The current phase is in `--text`, the others muted:
   - "Mauzo · Jumatatu – Ijumaa 18:00 EAT"
   - "Matukio · Ijumaa jioni – Jumapili"
   - "Matokeo na malipo · Jumatatu/Jumanne"
3. The pool block (`MaswaliPoolFigure`): the figure, the rule line, and the ledger:
   - Imeletwa mbele (Wiki 41) TZS 389,000
   - Mauzo wiki hii TZS 212,000
   - Pesa halisi TZS 601,000
   - Dhamana ya chini TZS 1,000,000
   - **Jackpot TZS 1,000,000**
   - Ada 13% · wakati wa malipo tu: —
4. The buy block:
   - A brand primary door, "Kata tiketi · TZS 1,000" (not gilt).
   - The existing `closing-pill` countdown, scoped to this block only.
   - "Tiketi zako wiki hii: 2 kati ya 10", with a row per ticket carrying a Seal Line at 18px.
5. "Maswali ya wiki": the fifteen public questions as compact rows. Each shows its number, its prose ("Je, …"), its event time, and once attested, the outcome stamp. Player picks never appear here.
6. Last week as one closed ledger row, e.g. "Wiki 41 · hakuna 10/10 · TZS 389,000 imeletwa mbele".
7. Links: "Jinsi ya kucheza" (how to play) and "Daftari la wiki" (the week's register).

**768.** The strip goes horizontal. The pool block becomes a two-column ledger table, and the buy block sits beside it.

**1280.** Two columns:
- Left (about 640px): the strip, the questions and last week.
- Right (about 400px, sticky): the pool block, the buy block and my tickets.

**Pre-close states:**
- If the previous week has not settled, the rollover line reads "— · inasubiri Wiki 41 ikamilike" and the figure is labelled "angalau" (at least). That is a true lower bound from the settlement function, never a guess (§C2, §F7).
- After the close, the buy block's door is replaced by "Fuatilia matokeo" (follow the results) and "Akiba halali zilizobaki" (valid reserves left).

##### 3.4 How to play `/millionea/how` (`reading` tier)

- **Four sentences:** answer fifteen; reserves count only for a voided main, in order; ten of ten shares the jackpot equally per ticket, with 13% at payout; nobody wins and the pool is carried forward.
- **A static example:** a Seal Line with "4 → A1".
- **A player-tapped "Tazama mfano" (see an example).** It plays N1 once on the example strip. It is the only demo in the product and it never auto-plays.
- **The PDF's worked ledger, labelled "Mfano" (example):** 1,050,000 − 136,500 = 913,500 ÷ 3 = 304,500.
- **The floor week:** 1,000,000 − 130,000 = 870,000.
- **The week timeline.**
- **A rules list:**
  - A cap of 10 tickets per week.
  - Real balance only.
  - A free cancel within 5 minutes, if the sales close is still far enough away.
  - Every event starts after the sales close.
  - Staff and house accounts cannot buy.
  - The sunset rule: if Millionea is ever stopped, the unwon pool goes to that last week's highest-scoring tickets.
  - A link to the register.

##### 3.5 The slip `/millionea/slip` (`reading` tier)

**360:**
- **Header:** "Jaza tiketi · Wiki 42". Below it, the two times stacked: "Mauzo yanafungwa Ijumaa 18:00" / "Tukio la kwanza Ijumaa 19:30".
- **Rules strip (three lines):**
  - "Akiba zinahesabiwa tu swali kuu likibatilishwa" (reserves count only if a main question is voided).
  - "Kikomo: tiketi 10 kwa wiki · hii ni ya 3" (cap: 10 tickets a week; this is your 3rd).
  - "Salio halisi pekee" (real balance only).
- **Ten main rows:**
  - A mono number and the question prose, starting "Je, …" and never clamped.
  - A muted meta line: source · event time.
  - NDIO / HAPANA at 44px.
  - At most one lit control per row. YES/NO ink appears only on the lit control; unselected controls stay `--border-control`.
- **Divider:** "Akiba · A1–A5 — zinahesabiwa tu swali kuu likibatilishwa, kwa mpangilio" (reserves count only if a main is voided, in order).
- **Five annex rows** on `.mat-inset`, with muted A-numbers. Tap size and contrast stay full.
- **Sticky bottom rail:** docked above the journey tabs, casting upward with `--shadow-overlay-up`.
  - `SteppedProgress` with the new `groups={[10,5]}` prop: "Kuu 7/10 · Akiba 2/5".
  - The pay control: disabled and neutral as "Jibu maswali 15" (answer 15 questions); `.gilt-metal` "Endelea · TZS 1,000" (continue) at 15/15 (§M3a).
  - The `closing-pill` lives here and nowhere in the chrome.

**768.** One column inside the reading tier. Each row's controls move to the right of its prose.

**1280.** Two columns. Questions on the left. On the right, a sticky panel replaces the bottom rail: grouped progress, a live 15-socket preview showing picks as "N/H" text (no lean), the price, the cap and the pay control.

##### 3.6 Confirm (a `.m-sheet-in` sheet with `.m-scrim`; a dialog from 640px up)

- Fifteen picks in a two-column compact list ("4 · NDIO"), the annex grouped and labelled.
- "TZS 1,000 · kutoka salio halisi (TZS 44,196)" (from your real balance).
- "Tiketi 3 kati ya 10 wiki hii" (ticket 3 of 10 this week).
- The cancel line, computed from the RULES 2.6 window measured to the sales close: "Unaweza kughairi bure hadi 14:07" (free cancel until 14:07). If there is no window, the line is absent.
- The fee rule line.
- The armed `.gilt-metal` "Lipa TZS 1,000" (pay). While the request is in flight it shows the kit `Spinner`.

##### 3.7 Purchase result (`OperationResultModal`; see M1)

- **Header:** variant `success`, `stripTone="brand"`, and the **new `stamp` prop** so the crest takes `.seal-commit`. Eyebrow "Tiketi imekatwa" (ticket cut); title is the serial "MLN-W42-004417".
- **Details:** Wiki 42 · TZS 1,000 (salio halisi) · Ghairi hadi 14:07 (cancel until 14:07).
- **Buttons:** primary "Tazama tiketi" (view ticket). There is no "buy another" button.
- **Also:** a secondary toast and `haptics.confirm()`.

##### 3.8 The ticket `/millionea/tickets/[serial]` (`receipt` tier, 560, at every width)

Top to bottom:
1. A status word with its §B11 tone, the serial and the week.
2. The Seal Line: mains at 24px, annex at 18px.
3. The fifteen clauses. Each shows the pick; after attestation, the outcome stamp and its socket. A voided main is struck and labelled "Batili → A1".
4. The perforated rule and the stub (serial, week, TZS 1,000, time, hash `7f3a…`).
5. While the cancel window is open: "Ghairi" (cancel) with a scoped countdown that is removed when the window expires.
6. Once sales close, a lock line on the stub: `lockSide` "Imefungwa Ijumaa 18:00 EAT".

##### 3.9 Tiketi zangu, Millionea segment `/millionea/tickets`

- **The switch.** It becomes **Maswali | Juu/Chini | Millionea**: a third link in `TicketSwitch`, with `TicketKind` gaining `"millionea"`. It stays `aria-current="page"`, and the 360 fit is proven at 2.25×.
- **Rows** are grouped by week, current week first. Each row shows the serial, a Seal Line at 14px, a status word, and the amount only when the ticket won (`.gilt-ink`).
- **Row text** matches the receipt byte for byte.
- **Layout:** 768 and 1280 keep the same list inside its tier.

##### 3.10 Live week (the ticket page, Friday to Monday)

- **Rows** fill in by question number. Sockets change by `GlyphSwap`; stamps land with N2.
- **One week-level line:** "Matokeo 6 kati ya 15 yametolewa · linalofuata Jumamosi 16:00" (6 of 15 results out · next Saturday 16:00).
- **No running score.**
- **A voided main** reads "Batili · akiba itachukua nafasi yake" (void · a reserve will take its place). No carry plays yet. "Akiba halali zilizobaki: 4 kati ya 5" is shown.
- **The "cannot win" line is OPEN** (§9). Recommended wording, which is provisional: "Kwa matokeo yaliyotolewa hadi sasa, tiketi hii haiwezi kushinda wiki hii" (on the results published so far, this ticket cannot win this week). Once it is shown, sockets keep updating but N2 stops pressing on that ticket.

##### 3.11 The reckoning (the week settles)

When all fifteen results are final, the substitution map is final too. Carries play (M4), then the win path (M5) or the loss receipt (M6).

##### 3.12 Substitution (M4)

- The voided main's socket becomes `sealNil` and its row is struck.
- The reserve token carries into that main socket and becomes ✓ or ✗ there.
- The annex keeps "→4".
- Unused reserves close as `sealNil` "Haikutumika" (not used).

##### 3.13 Win

- **Route:** the AwaySummaryBar line "Millionea Wiki 42: tiketi yako ilipata 10 kati ya 10 · Fungua" (your ticket got 10 of 10 · Open), then the ticket, then the Unbroken Line, then the seal (M5).
- **The win ledger after the seal** (`MaswaliWinLedger`, the receipt tier):
  - Jackpot TZS 1,050,000
  - Ada 13% −TZS 136,500. A small line notes TRA 10% and GBT 5% *of the fee*.
  - Kwa washindi (to winners) TZS 913,500
  - ÷ tiketi 3
  - **Kwa tiketi yako TZS 304,500** (to your ticket)
  - × 2 if the player holds two winning tickets, then **Jumla yako** (your total).
- **A floor week adds** "Nyongeza ya dhamana TZS 399,000" (house top-up). It is printed, and it never rolls.
- **Gold:** only "Kwa tiketi yako" and "Jumla yako" wear `.gilt-ink`. The jackpot line stays neutral even on a winning receipt.
- **Net line:** when the player's week spend exceeds the win, the net line prints with U+2212 (OPEN §9).

##### 3.14 Loss (receipt tier, 560)

- The headline "Haikushinda" (did not win), then the outcome first.
- The ten counted positions, each with pick, outcome stamp and socket (✓ in success ink, ✗ in muted ink). Carried reserves are shown inline: "4 → A1".
- **No score, and no line naming the misses.** The rows are the facts.
- One week line: "Tiketi 3 zilishinda wiki hii" (3 tickets won this week) or "Bwawa limeletwa mbele kwenda Wiki 43" (the pool is carried to Week 43).
- The finality line "Kila takwimu hapa ni ya mwisho — hakuna kinachodaiwa zaidi."
- The closing double rule (M6).
- **No buy control on the receipt.**

##### 3.15 Rollover (M7)

- A hub NoticeBar, once per player-week: "Wiki 41: hakuna tiketi ya 10/10. TZS 389,000 imeletwa mbele kwenye Wiki 42." It is past tense and has no call to action.
- Then the carry plays on the ledger.

##### 3.16 Week voided, and the player's own cancel (M8)

- **Week void:** a neutral band, "Wiki imebatilishwa: maswali makuu 3 batili, akiba halali 2 tu. Kila tiketi imerejeshwa TZS 1,000." (week voided: 3 mains void, only 2 valid reserves; every ticket refunded TZS 1,000). The stub rejoins. If the player is LIVE, a neutral `OperationResultModal` appears; otherwise a NoticeBar.
- **The player's cancel inside 5 minutes:** a neutral modal, "Tiketi imeghairiwa · TZS 1,000 imerudi kwenye salio halisi" (ticket cancelled · TZS 1,000 back in your real balance), with `haptics.confirm()`.
- The same reversed Cut plays for both.

##### 3.17 Daftari la Wiki (the public register) `/millionea/register` and `/[week]` (`reading` tier)

- **Access:** unauthenticated, rendered on the server, works without JavaScript. It follows the `/fairness` pattern.
- **Header:** the week, the question-set hash published at sales open, and its timestamp.
- **The fifteen questions as a table:** source, event start, the attesting officer's role, attested time, outcome, and the void reason (`maswali-void-reason`).
- **The substitution rule and map, plus a timestamped log:** "Swali 4 batili 2026-10-25 11:02 → A1".
- **The full ledger:**
  - Rollover in, tickets sold × 1,000, real money, floor, jackpot.
  - Winning tickets, the 13% fee with TRA/GBT of the fee, the house top-up, paid, the per-ticket share.
  - **The rounding remainder line**, and what was carried out.
- **The strata history:** "Wiki 40 · TZS 412,000 imeletwa mbele · ada 0", one row per carried week.
- **After settlement only:** the standing-count history ("tiketi zisizo na kosa baada ya kila tokeo", tickets without a miss after each result).
- **Last:** a link to the audit-chain entry on `/fairness`. No personal data.

##### 3.18 Refusals

Each is a `factual` toast with no haptic, or an inline notice. Each gives a reason and a next step in EN, SW and ZH. Warnings use amber, never claret.

| Case | Swahili draft |
|---|---|
| Cap reached | "Umefikia tiketi 10 za wiki hii. Wiki 43 inafunguliwa Jumatatu." |
| Sales closed | "Mauzo yalifungwa Ijumaa 18:00, kabla ya tukio la kwanza. Fuatilia matokeo hapa." |
| Insider (admin role or house/desk account) | "Akaunti za watumishi na za nyumba haziruhusiwi kununua tiketi za Millionea." (info tone) |
| Bonus offered | "Millionea inalipwa kwa salio halisi tu; bonasi haitumiki hapa. Salio halisi: TZS 4,000." Next step: Weka pesa (deposit). |
| Not enough real balance | The existing deposit door. |
| Product paused | A NoticeBar, "Millionea imesimamishwa kwa muda. Tiketi zilizonunuliwa ziko salama." No slip door. |
| Product stopped for good | The SUNSET line. |
| Cooling-off or self-exclusion | No door anywhere (`onBreak`). |

#### 4. Signature moments

##### M1 · The purchase ("Kukata Tiketi"): the modal stamp, then N3

**t0.** The player taps the armed gilt pay control. The kit `Spinner` shows while in flight.

**On success:**
- The sheet closes. `OperationResultModal` arrives with `.m-dialog-in` and `.m-scrim`.
- Its crest takes `.seal-commit` (`seal-place`, `--t-stage`, `--m-settle`) through the new `stamp` prop.
- `haptics.confirm()` fires once, then the toast.

**On the ticket's first view** (the player taps "Tazama tiketi"):
- t0: the perforation row reveals with `.m-axis-reveal` (`--t-stage`). The blade crosses on the mark's tilt.
- t0 + `--t-base`: the stub takes `.maswali-cut` (N3, `--t-base`). It settles 8px away, with one hair of overshoot.
- Done at about 520ms.

**Reduced motion:** the crest is static and the ticket renders at rest, separated.

**Budget:** 2 layers, plus the modal's own.

**Must never imply:** a prize. The stub is ink; the strip is brand.

##### M2 · Sales close: existing motion only

- **When:** LIVE on the slip or hub when the close time passes.
- **What moves:**
  - The band "Mauzo yamefungwa · Ijumaa 18:00" reveals with `.m-axis-reveal`.
  - The pay control leaves with `.m-out`.
  - The hub door swaps to "Fuatilia matokeo" via `.g-swap-in`.
  - The held ticket's stub gains its `lockSide` line with `.m-seal` (a dormant class adopted).
- **Haptic:** none; the lock is the platform's act.
- **Reduced motion:** the end state.

##### M3 · A result is attested ("Kugonga Muhuri"): N2

- **When:** a data change while viewing, or up to 4 attestations unseen on opening.
- **Stamp:** a mono block, "MATOKEO · NDIO" or "MATOKEO · BATILI".
  - Neutral `--text` on `--border-strong`, `--r-xs`.
  - It moves 8px *down the needle's own line* with `.maswali-attest` (`--t-base`, `--m-settle`), with a press of 1.02 → 0.98 → 1 (the `seal-place` stops).
- **Socket:** swaps by `GlyphSwap` (`.g-swap-out` `--t-quick`, then `.g-swap-in` `--t-base`).
- **Sameness:** identical for NDIO, HAPANA and BATILI, and for matched and unmatched rows.
- **Stagger:** at most 4 × `--m-stagger`.
- **Haptic:** none.
- **Reduced motion:** the stamp is present, `translate: 0 0`.
- **Budget:** at most 4 stamps and 4 swaps.
- **Must never imply:** a verdict on the player. The stamp states the world; the socket states the match.

##### M4 · The substitution ("Kubeba"): N1, with existing parts

- **When:** the substitution map becomes final, which happens only when all fifteen are final. So there is never an "un-carry".
- **t0:**
  - The voided main's socket swaps to `sealNil`.
  - A 1px strike draws through its row with `.m-draw` (`--t-max`, settlement) in `--border-strong`. The prose stays at 4.5:1 or better.
- **t0 + `--t-base`:**
  - The annex token (its socket plus the mono "A1") takes `.maswali-carry` (`--t-move`, `--m-settle`).
  - It goes from the annex position and 0.75 scale to the main socket at 1.
- **On `animationend`:**
  - The token's socket swaps from `clockPending` to `sealCheck` or `sealX`.
  - The annex position shows "→4".
- **Several carries:** they stagger, capped at 4 steps. A voided reserve stays at `sealNil` "Batili" and is visibly passed over.
- **Total:** about 780ms.
- **Haptic:** none.
- **Reduced motion:** strike drawn, token in place, "4 → A1" printed.
- **Budget:** at most 5 composited tokens plus 5 one-path strikes.
- **Must never imply:** a rescue or luck. Timing and copy are the same whether the reserve matched or not. The caption reads "Swali 4 limebatilishwa; akiba A1 imechukua nafasi yake" (question 4 was voided; reserve A1 took its place).

##### M5 · The win: the Unbroken Line (existing `.m-draw`), then the Struck Seal

- **When:** the player taps the AwaySummaryBar line, or LIVE within `MAX_LIVE_AGE_MS`. Never from a poll.
- **t0:** one SVG hairline through the centres of the ten `sealCheck` sockets draws on with `.m-draw` (`--t-max`, `--m-glide`) in `--success-fg`.
  - A line is drawn only when it is unbroken, so a loss never shows a partial line.
- **t0 + `--t-stage`:** `dispatchWinCelebration` fires with **`roll: false`** (the new payload flag).
  - It routes `RollingAmount` through its existing snap path: the amount lands final and the gilt strike is colour only.
  - Everything else is unchanged: `.seal-arrive`, `.needle-sweep`, `.seal-cascade`, `.seal-mark-flip`, `.seal-sheen`, the `.gilt-metal` Continue button, `haptics.success()`, and 7s.
- **One seal per player-week.** Several winning tickets in a week sum to one figure (§F9.4: every result is a win). The ledger then shows × N.
- **After the seal:** the win ledger cascades with `.seal-cascade` and the line rests on the ticket.
- **Reduced motion:** the line is present and the seal fades.
- **Budget:** 1 path, plus the existing seal.
- **Must never imply:** that 9/10 is partial. There is no tier escalation; the seal is the one every win gets.

##### M6 · The loss: the closing rule (existing)

- **When:** a settled receipt opens. This covers losses, the win receipt after its seal, and refunds.
- **What moves:** two hairlines draw under the last ledger line with `.m-draw` (`--t-max`). The timing is identical for every outcome, inside the same dwell.
- **Haptic:** none.
- **Reduced motion:** the rules are drawn.
- **Must never imply:** "so close". There is no score, no emphasised row, and no mark or needle on the receipt.

##### M7 · Rollover: N1 reused, plus `.m-tick`

- **When:** the first hub view after a week with no winner.
- **What moves:**
  - The closed week's carried figure, as a mono text cell, takes `.maswali-carry` (`--t-move`) to the new week's "Imeletwa mbele" line. Its value never changes in flight.
  - Then the jackpot line takes `.m-tick` only if the larger-of-two value changed.
- **Total:** about 560ms.
- **Haptic:** none.
- **Reduced motion:** both lines static.
- **Must never imply:** that the house top-up rolled, or "bigger next week, buy now".

##### M8 · Refund or cancel: N3 reversed, plus existing parts

- **What moves:**
  - The stub takes `.maswali-cut-undo` (`--t-base`, `--m-glide`) and rejoins. The perforation stays as the record.
  - The band "IMEREJESHWA · TZS 1,000" reveals with `.m-axis-reveal`.
  - On a week void, each voided main shows the M4 strike with no carries.
  - The M6 closing rule ends it.
- **Haptic:** `confirm` only for the player's own cancel.
- **Never:** claret, red, or an error crest.

##### M9 · The example (How to play)

- **When:** only when the player taps "Tazama mfano".
- **What moves:** N1 plays once on a static example strip. It never auto-plays and keeps no seen-key.

#### 5. The new motions, for Ali's yes or no

All three are one-shot and filed in `motion.css`. Each keyframe goes in its Keyframes block and each class in its Utilities block, with calm branches added to **both** clamp lists that already exist: the `prefers-reduced-motion` list and the `html.kp-reduce-motion` list (motion.css about 596–613).

- **No new token, curve or duration.** Each "from" frame reads runtime data bindings or existing tokens.
- **No `--m-pivot`.**
- **The names are new,** so `test:keyframes` passes.

```css
/* N1 Kubeba / The Carry — Millionea only (DA §M8 exception, Ali yes <date>) */
@keyframes maswali-carry { from { translate: var(--carry-dx) var(--carry-dy); scale: var(--carry-s, 1); } to { translate: 0 0; scale: 1; } }
.maswali-carry  { animation: maswali-carry var(--t-move) var(--m-settle) both; animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }

/* N2 Kugonga Muhuri / The Attestation Press — travels on --m-tilt (first consumer) */
@keyframes maswali-attest {
  0%   { opacity: 0; translate: calc(var(--sp-2) * sin(var(--m-tilt))) calc(-1 * var(--sp-2) * cos(var(--m-tilt))); scale: 1.02; }
  60%  { opacity: 1; translate: 0 0; scale: 0.98; }
  100% { opacity: 1; translate: 0 0; scale: 1; } }
.maswali-attest { animation: maswali-attest var(--t-base) var(--m-settle) both; animation-delay: calc(min(var(--i, 0), 3) * var(--m-stagger)); }

/* N3 Kukata Tiketi / The Cut — the end frame IS the layout; the direction comes from --cut-from */
@keyframes maswali-cut { from { translate: 0 var(--cut-from); } to { translate: 0 0; } }
.maswali-cut      { --cut-from: calc(-1 * var(--sp-2)); animation: maswali-cut var(--t-base) var(--m-settle) both; }
.maswali-cut-undo { --cut-from: var(--sp-2);            animation: maswali-cut var(--t-base) var(--m-glide)  both; }
```

| # | Name | Purpose | Rung | Law line for DA §M8 (Millionea exception) | Fallback without it |
|---|---|---|---|---|---|
| N1 | Kubeba · The Carry | Teaches reserve order and "carried, never lost". Shared by substitution and rollover. | `--t-move` (more than 200px at 360) · `--m-settle` | "In Millionea only, a reserve token or a carried figure travels once, per viewer, from where the rule takes it to where the rule puts it; never on a timer, never counting." | `GlyphSwap` in place, plus the printed "4 → A1". |
| N2 | Kugonga Muhuri · The Attestation Press | One officer-attested result lands as a stamp. Teaches R-RESOLUTION. | `--t-base` (8px; results are settlement, so one rung up) · `--m-settle` | "A Millionea outcome stamp travels the mark's −14° axis by `--sp-2` without `--m-pivot` and without touching the mark; identical for every outcome." | The stamp appears with `.g-settle`. |
| N3 | Kukata Tiketi · The Cut | The purchase document issued; reversed, the money returned. | `--t-base` (8px; money moves it one rung up) · `--m-settle`, or `--m-glide` for undo | "A Millionea stub separates once when a ticket is paid and rejoins once when its money returns; neutral ink, never gold." | `.m-seal` on the stub. |
| N4 | **Unspent** | The win prelude is built from existing `.m-draw`. C1's gather and C2's needle alignment were judged and rejected. | — | — | — |

**For all three:**
- **Reduced motion:** both clamps set `animation: none`, so the layout's own end frame shows and nothing is invisible.
- **Throttle tier:** plays at full duration.
- **Haptic:** none is fired by the motion itself.
- **Fallback for older engines:**
  - If CSS `sin()` and `cos()` are unsupported, N2's "from" translate is dropped at parse time, so the stamp only scales and fades.
  - If `var()` inside keyframes misbehaves on a measured WebView, the same classes switch to a `translate` transition. The seal-recoil precedent covers the individual `translate`.

#### 6. Components

##### New (code modules named `maswali-*` per R-NAME)

| Component | What it is |
|---|---|
| `maswali-pool-figure.tsx` | An **unearned surface**: the figure, the rule and the ledger. It must contain zero gold. |
| `maswali-win-ledger.tsx` | The earned lines only. |
| `maswali-seal-line.tsx` | Sizes 24/18/14; the socket grammar; FLIP measurement for N1. |
| `maswali-slip.tsx` | The page, built from the existing pick controls. |
| `maswali-ticket.tsx` | The document, the perforation and the stub. |
| `maswali-week-strip.tsx` | The static three-phase strip. |
| `maswali-home-card.tsx` | Shared by the journey home and the classic board. |
| `maswali-outcome-stamp.tsx` | The N2 stamp. |
| `maswali-unbroken-line.tsx` | One SVG path for M5. |
| Register pages | `/millionea/register` and `/[week]`. |
| `src/lib/maswali-substitution.ts` | A pure function from mains, reserves and voids to the counted set and the display map. It is referenced from RULES.md. |
| `src/lib/maswali-void-reason.ts` | Void-reason words. |

##### Reused, each with at most one new prop

| Component | Change |
|---|---|
| `SteppedProgress` | `groups` |
| `OperationResultModal` | `stamp` |
| `WinCelebration` payload | `roll: false` |
| `TicketSwitch` / `TicketKind` | `"millionea"` |
| `AwaySummaryBar`, `NoticeBar`, `GlyphSwap`, `IconPlate`, `PageContainer`, `PageHeader`, `Tabs` (link rail), the `factual` toast, `Spinner`, `.closing-pill`, the modal sheet, `.mat-inset`, `.gilt-metal`, `.gilt-ink`, `.amount`, the `/fairness` pattern, `HowToCard` anatomy | Reused unchanged. |
| `side-label.ts` | Gains `productLine` "millionea" with no default. |
| `status-tone.ts` | Gains new rows. |

#### 7. New design facts and where each is filed (DESIGN_AUTHORITY §0)

**Motions**

| Fact | Where it is filed |
|---|---|
| **N1, N2, N3** | Keyframes, classes and both calm branches in `src/app/motion.css` with a "why" comment. The law is a dated "Millionea exceptions" paragraph in DA §M8, with Ali's quote. A one-line pointer goes in §M6. |
| Motion docs and provenance | `docs/design-system/v2-2026-07-27/08-motion/`; provenance in `07-provenance/CHANGELOG.md`. |
| **N4** | Recorded as deliberately unspent in the same §M8 paragraph. |

**Glyphs**

| Fact | Where it is filed |
|---|---|
| **Glyph `sealNil`** (ring r8.6 + level bar) | A new key in `glyphs.tsx` through `G`, proven at 14/18/24px. |
| **Glyph `millionea`** (the R1 coronet; the supa and mini tier glyphs are not merged, since there are no tiers) | A new key in `glyphs.tsx`. Needs Ali's yes as a product mark. |
| **Rename `voidX` → `sealX`** (zero consumers) | `glyphs.tsx`. A session-level technical call; recorded in provenance. |

**Words and tones**

| Fact | Where it is filed |
|---|---|
| **§B11 rows**, filed in `src/lib/status-tone.ts` | Ticket rows: INASUBIRI (neutral), IMESHINDA (success word; gold only on the amount; **Ali rules this one, because it repaints money**), HAIKUSHINDA (neutral), IMEREJESHWA (neutral), IMEGHAIRIWA (neutral). Week rows: WAZI (brand); IMEFUNGWA, MATOKEO YANATOLEWA, IMEKAMILIKA (never gilt) and IMEBATILISHWA (all neutral). Each exception goes in `STATUS_TONE_EXCEPTIONS`. |
| **Laws** | §C3: the R-HEADLINE form for Millionea. §M3: the jackpot is unearned. §F9: weekly routing and one seal per player-week. §K8b: the home card and the third Tiketi kind, as ruled 2026-10-16. The same deviation is recorded in the v5 `INHERIT-MANIFEST.md`. |
| **The seal's `roll: false`** | A §M7 note: "Millionea seals do not count (Ali, 2026-10-16)". |

**Code and process**

| Fact | Where it is filed |
|---|---|
| **Routes in `src/lib/surfaces.ts`** | `COMMIT_ROUTE` gains `/^\/millionea\/slip$/` and `/^\/millionea\/tickets\/[^/]+$/`. `JOURNEY_ROUTE` gains exact entries for `/millionea`, `/millionea/slip`, `/millionea/tickets` and `/millionea/tickets/[serial]`. If the fidget covers the sticky pay control at 360, the slip also joins `MONEY_ROUTE`. |
| **Guard** | `test:gold-is-money` gains an `UNEARNED_SURFACES` arm listing the pool-figure, home-card, hub, register and ticket-list files. Gold is banned there outright. The win ledger stays a separate file so the arm can see the difference. |
| **Component specs** | `02-components/<name>/spec.md`. |
| **The Claude Design delivery** | Filed raw on 2026-10-17 in [`docs/design-system/v6-2026-10-17-millionea/`](design-system/v6-2026-10-17-millionea/INHERIT-MANIFEST.md) with its `INHERIT-MANIFEST.md` (D2). The outbound brief is [`design-brief/maswali-2026-10/`](design-brief/maswali-2026-10/BRIEF.md). |
| **Strings** | `src/lib/i18n-dict.ts`, in EN, SW and ZH. |

**Guards that must pass:**
- `test:keyframes`, `test:reduce-motion`, `test:motion-ladder`, `test:dead-css` (it shrinks: five dormant classes gain consumers).
- `test:glyph-motion`, `test:gold-is-money`, `test:design-frozen` (new files land at zero), `test:feedback-law`, `test:presence-class`, `test:journey-shell` §2 and §9, `test:i18n`.
- `qa:calm`.
- `qa:seal`, including a `roll: false` case.
- `npm run build && qa:bundle-css`.
- Frame timings measured on the target device.
- The S16 baseline must include the home card and the third Tiketi kind (R-LAUNCH).

#### 8. Law compliance in brief

- **Gold** sits only on the armed pay control (§M3a), the seal, and "Kwa tiketi yako" / "Jumla yako". The jackpot, the floor, the rollover and the stub are neutral mono.
- **No count-up anywhere** (the seal uses `roll: false`). The figure changes only by `.m-tick` on a real sale or settlement.
- **No confetti, no loops, no bloom,** and no `value-flash` or `--g-jackpot`.
- **YES/NO ink** only on the lit slip control. ✓ uses `--success-fg`.
- **Colour is never the only signal:** four shapes plus words.
- **Exactly three new motions,** with no `--m-pivot` and the mark untouched. The seal is unchanged apart from the roll.
- **One-shot motion with both clamps written,** so it is seen on the throttle tier.
- **Haptics follow §H.** The countdown appears only on the slip and in the hub's buy block, never in the chrome (Q8) or on the home card.
- **Four journey tabs, unchanged.** No sub-brand beside the 50pick mark. No emoji.
- **Tiers and type:** reading and receipt tiers; the 28px title; Swahili proven at 2.25×; 44px taps.

#### 9. OPEN items (recommendations only)

| Item | Recommendation |
|---|---|
| **Licence cover** | Get the Gaming Board's written confirmation, or Ali's dated ruling, that a fixed-stake jackpot with a house-guaranteed floor is covered, **before the first real ticket**. The register and How to Play then cite it. |
| **Tax report** | Reconciling lines for "rollover carried in and out" and "house top-up paid", sourced from the HOUSE ledger account (Finance and GBT). |
| **Agents and invites** | No agent commission on Millionea, and a Millionea ticket does not count as an invite's first bet, until Finance rules. |
| **Rounding dust** | Floor each share to the whole shilling. Roll the remainder into next week as real money, printed on the register (870,000 ÷ 7 leaves TZS 5). |
| **Classic-shell entry** | §3.2. |
| **Substitution order** | Map the k-th voided main *by main number* to the k-th valid reserve. Which reserves count is the same either way; only the display changes. Write it into RULES.md. |
| **Carried-in pool on a voided week** | It carries forward again in full. |
| **The live "cannot win" line** | Yes, with the provisional wording in §3.10. |
| **A share smaller than the player's week spend** | The seal still fires, because the rules call it a win. The ledger prints the net with U+2212. |
| **Seal count-up on market wins** | Platform-wide; out of scope here. |
| **Withdrawal or AML review line** | Generate it from the live policy if a large share triggers a review. |
| **Yes/no from Ali** | N1, N2 and N3; the `millionea` glyph; the IMESHINDA tone. |

## §10c · Icons — Phosphor, one meaning, one icon (Ali, 2026-10-17)

**The ruling** is §0 item 7: no hand-drawn glyph on any Millionea surface; every icon comes from the Phosphor kit the
platform is moving to (`PHOSPHOR-MIGRATION.md`, branch `phosphor-migration`), reached only through the family `I` in
`src/components/ui/glyphs` (R-NEW-PAGES: never an inline `<svg>`, never a library import, never a text character).

**How they are drawn**, from the Phosphor lane's rulings, so Millionea looks like the rest of the platform:
- **Weight:** Phosphor **Bold** up to 26 px, Regular from 27 px (R-WEIGHT 1B).
- **Duo tier:** Phosphor Duotone with the tone layer at 20% (R-TONE 2B) — the hub's plate and the empty states.
- **Selected:** the **Fill** icon on the opaque royal pill with its lit edge (R-INDICATOR 3B) — the Tiketi zangu
  "Millionea" segment and the More row's active state.
- **Tabs:** 24 px (R-RAIL 4B). Millionea has no tab of its own (R-PLACEMENT), so this applies only inside the switch.
- **Ink:** an icon never carries gold; gold is earned money only (DA, `test:gold-is-money`). A win's gold stays on the
  amount (O-6).

**The picks.** Every name was checked against `@phosphor-icons/core` 2.1.1, the version the Phosphor lane pins
(2026-10-17). The `I` key is the name Millionea's code calls; the Phosphor lane's `map.ts` maps it, and where the
platform's lexicon already owns a meaning, Millionea uses that key and adds none.

| Meaning | Where it shows | `I` key | Phosphor | Why this one |
|---|---|---|---|---|
| **Millionea, the product** | home card, the journey rail's tab (S5-TAB: a More row and the classic bar's link carry no mark), the Tiketi zangu segment, the hub's head | `millionea` (new) | `diamond` — ⏳ **Ali's pick** among `diamond` (recommended), `star-four`, `crown-simple`, `medal` | Phosphor's `diamond` is the card-suit rhombus, not a cut gem (its only gem is a brand logo); it reads as "the big prize" at 14 px and is unlike any other mark on 50pick. Not `crown` (the Leaderboard) nor `trophy` (a win). Replaces the coronet (O-5) |
| A ticket | the ticket page, the switch's ticket counts | `ticket` (lexicon) | `ticket` | The platform's word for a held position |
| A question not yet sealed | the ticket's 15 marks, the register | `markPending` (new) | `circle-dashed` | An open ring: "not known yet", never "wrong". Replaces `sealNil` |
| Your answer matched the result | the ticket's marks | `checkCircle` (lexicon) | `check-circle` (Fill, success ink) | The platform's own "done right"; the word beside it carries the meaning (glyph + ink + word, Phosphor W4) |
| Your answer missed | the ticket's marks | `xCircle` (lexicon) | `x-circle` (muted danger ink) | The pair to `checkCircle`; replaces `sealX` |
| A question voided | the ticket's marks, the register | `void` (lexicon) | `prohibit` | The platform's void, one meaning platform-wide |
| The reserves (A1–A5, "Akiba") | the slip's reserve block, the register | `reserve` (new) | `lifebuoy` | A reserve is the backup that saves the ticket when a main question voids |
| A reserve stood in ("M4 → A1") | the ticket and the register | `standIn` (new) | `arrow-bend-down-right` | The swap, pointing from the voided main to its reserve |
| The jackpot this week (J) | the hub, the home card | `coins` (lexicon) | `coins` | Money in the pot, without gold ink |
| Carried to the next jackpot | the hub's carry line, the register | `carry` (new) | `arrow-bend-double-up-right` | Carried forward to the next winning week. Not `piggy-bank` (the lexicon's savings, `sofSavings`) nor `hand-coins` (its cash-out) |
| The house floor guarantee | the hub's floor line, `/fairness` | `floor` (new) | `vault` | Money held safe behind the promise; `shield-check` already means "verified" (lexicon) |
| Time left to buy | the closing pill, the slip | `hourglassHalf` (lexicon) | `hourglass-medium` | A countdown, distinct from the clock that shows a time |
| A time or date | the close time, an event start | `clock` (lexicon) | `clock` | |
| The week's register (Daftari la Wiki) | `/millionea/register`, the hub's link | `register` (new) | `notebook` | The daftari itself |
| The week's ticket commitment (every ticket fixed at the close, MR-13) | Millionea's section of `/fairness`, the register's root | `commitment` (new) | `fingerprint` | One unique print for the week's tickets. Millionea's own proof, so its own key: the platform's resolution proof on `/fairness` keeps `attestation` (its hub row) and `shieldcheck` (its page head) |
| Results recorded | the register, a settled week | `sealCheck` (lexicon; the same drawing as `resolved`) | `seal-check` | The platform's "a result is recorded" (R-LEXICON 5.5A) |
| A win | the ticket, the receipt | `trophy` (lexicon) | `trophy` | The platform's win, with the existing seal moment only (§M7) |
| Cancel a ticket (free window) | the ticket, the receipt | `rotateCcw` (lexicon) | `arrow-counter-clockwise` | "Take it back", and the money returns in full |
| Refunded (the week voided) | the ticket, the register | `refund` (new) | `arrow-u-down-left` | Money coming back to you |
| Sales closed | the hub, the slip | `lock` (lexicon) | `lock` | The lexicon's drawing, not `lock-simple` |
| Sales paused | the notice, the hub | `salesPaused` (new) | `pause-circle` | An operator's pause of sales. Not `pause`: the lexicon's `pause` is the player's own Take a break, a different meaning |
| How it works | the How page, the hub's link | `howTo` (new) | `book-open-text` | `question` stays Help (lexicon) |
| Object to a result | the ticket's question row | `flag` (lexicon) | `flag` | |
| The source of a result | a question's evidence link | `externalLink` (lexicon) | `arrow-square-out` | |
| The cap (10 a week) | the slip's ticket count | `cap` (new) | `stack` | A stack of tickets with a top |
| The final week (sunset) | the hub, the home card | `finalWeek` (new) | `flag-checkered` | The finish line |
| Staff preview | the preview mark | `eye` (lexicon) | `eye` | |

**Checked against the Phosphor lane (2026-10-17).** Its owner (session ali-d1) reviewed this table against its map on
`phosphor-w2` (`2b63893e`): where the lexicon already owns a meaning, Millionea now uses that key (`checkCircle`,
`xCircle`, `coins`, `hourglassHalf`, `rotateCcw`, `eye`, `lock`, `sealCheck`); `pause` and `piggy-bank` belong to
other meanings, so the sales pause and the carry have their own keys; and `voidX` is retired by W2 (a void is
`prohibit`). Re-checked the same day: none of the new keys below collides with a key in that map, and none of their
drawings is already claimed there.

**The new keys Millionea adds** (13): `millionea` (the product mark; its drawing is Ali's pick), `markPending`,
`reserve`, `standIn`, `carry`, `floor`, `register`, `commitment`, `refund`, `salesPaused`, `howTo`, `cap` and `finalWeek`.
(`commitment` was first written `fairness`; the icon lane pointed out that `/fairness` already means the platform's
resolution proof, so the key is named for what it shows.)

**How it lands.** Millionea's code calls only the `I` keys above. At S5 the new keys go into the Phosphor lane's
`scripts/glyphs/map.ts` (on its branch until W2 lands) and its codegen draws them in every weight; nothing is added to `glyphs.tsx` by hand,
and until W2's swap lands on `main` a key `I` does not yet hold waits for it rather than being drawn inline here.
`test:glyph-source` (that lane's guard) holds the rule. **The specimen** — every pick above drawn from Phosphor's own files, the product-mark choice first:
https://claude.ai/artifact/Xub9GztHh1c15CtRyrUwTh (private to Ali; published 2026-10-17). Until Ali picks the mark,
S5 builds with `diamond`; his pick changes one line of the Phosphor lane's `map.ts`.

## §11 · Traps already paid for — do not re-pay

- ⛔ Never route a Millionea week through `settleMarket`'s normal arm (it refunds a one-sided pool),
  `allocateWinnerPayouts` (its floor throws below stake), `emergencyVoidMarket` (officer-only), or the poll scheduler
  and AI sentinel (they would auto-resolve it).
- ⛔ Never seed a ticket in an end-to-end test — drive the purchase. The responsible-gambling gates live only on
  `buyPosition`.
- ⛔ Never let house money enter `HOUSE:MASWALI_JACKPOT`; never show the floor unless it is funded; never pay less than
  owed (abort instead).
- ⛔ Never gold on the jackpot, the floor, the rollover or the stub; never `.value-flash` or `--g-jackpot`; never a
  count-up — the Millionea seal lands its amount final.
- ⛔ Never publish an unsalted pick hash; never show pick aggregates or an "alive" count before settlement; never a
  potential payout on a held ticket.
- ⛔ Never a score on a loss — only the sunset week's settlement states a score.
- ⛔ A cross means "did not match", never "void" — in Tanzanian school marking a cross means wrong.
- ⛔ "halisi" means NET in the dictionary; the main balance is "salio kuu".
- ⛔ `main` is a live deploy with one release owner; stage files by name; never `git add -A`.
- ⛔ The repository is public: describe anti-abuse controls by what they enforce, never by their signals.
- ⛔ Never extract a design package inside the checkout — `test:design-one-door` globs the disk. Commit canvas
  sources the day they arrive.
- ⚠️ The Vodacom lane is changing `app-shell`, `journey-tabs`, `market-service`, `positions` and `i18n-dict`: land
  the S0.5 fence as one integrator commit and coordinate every shared file with the release owner.
- ⚠️ The August records still say `/maswali`, "13% of losing stakes", a fifth rail slot and a 20M guarantee — they are
  records. Read them for engineering practice only.
