# MARKETING CAMPAIGN & CONTACTS SETUP — work order and tracker

**STATUS — 🟢 BUILDING. 17/52 units ✅ LIVE, 13/25 defects ✅ · 52 units · defects D1–D25 · owner decisions OD1–OD67, taken on
Ali's delegation · 11 legal questions, each shipping with a safe default that IS built. LIVE today: the contacts book
(/admin/contacts — the list, filters, add and edit, bulk, the Lists card), the campaign list and the composer (a test to the
officer's own number, or — once licence outreach opens — to another number with an 18+ confirmation, behind the CLOSED live
switch), and the consent wordings, policy lines and licence-outreach record on Admin → System. Latest: STEP 53, the
final-rule units (the agent-referee exclusion U33r, Privacy v2026-10-07, the sign-up box removed), LIVE `d77442f5`
2026-10-08 (S14), production's referee keys recorded (STEP 53b);
before it STEP 52, the engine (nothing reachable until U47b-2's page), LIVE `21244826`, and STEP 51, U40b, LIVE `41eb8fb2`. Ali's
FINAL rule of 2026-10-07 (anyone with a phone; consent decides nothing; the stop kept) is in COMPLIANCE-DECISIONS. ⏳ S14
in flight on OMEGA-COMPILE01 (§0), continuing S13's handover. First real campaign: about 12–14 October if Ali's answers come in time.**

> ⚠️ **THIS FILE IS BOTH THE PLAN AND THE PROGRESS TRACKER.** Any session, on any machine, learns where
> the programme stands by reading §0 (RESUME AT) and §1 (status board) — and nothing else. `npm run
> test:marketing-setup-plan` refuses a ✅ that cannot show a real commit, a measured before → after, a
> guard key that resolves to a script that exists **with a red control beside it**, and a live date.

| | |
|---|---|
| **Opened** | 2026-09-16 (session S0 — planning only, no product code; committed 2026-09-17) |
| **Owner instruction** | Ali, 2026-09-16: *"a page for contacts, with all its features, bulk and normal contact import, duplication detection, everything perfect, progress bars, loading systems, rendering perfection. Also campaign for broadcast SMS sending page… for Tanzanian numbers, the right formats, input validation"* · *"take decisions based on what you think is perfect and compatible with our platform… make it fully functional, a perfect version, you decide"* · *"save the plan and the prompt and push it, naming it the marketing campaign and contacts setup"* · *"make it perfectly working for 50pick, perfect design and logic"* |
| **Scope** | `/admin/contacts` (the address book: single + bulk import, duplicate detection, pre-flight, determinate progress, export) and `/admin/campaigns` (broadcast SMS: compose, audience, confirm, send, results) — plus the permission layer neither can lawfully exist without |
| **Repo / branch** | Your 50pick checkout — find it with `hostname && git rev-parse --show-toplevel && git worktree list`; ⛔ never copy a path from a doc (the office PC uses `F:\`, Ali-Blade15 `C:\`, and each has worktrees). Work lands on `main`: a checkout on another branch, or carrying another session's edits, means your own worktree off `origin/main`, pushed with `HEAD:main`. ⛔ Push to `main` is a LIVE deploy. ⛔ Never the House Bots checkout, which runs its own programme in parallel |
| **Live state rule** | ✅ **No Gaming Board approval gate** — Ali, 2026-09-26: the Board says marketing SMS is not part of its approval (OQ1, `COMPLIANCE-DECISIONS.md` § "2026-09-26 · Marketing SMS rulings"). Broadcast opens as soon as the engine is BUILT and every message passes the consent/suppression/RG/age gate; the law that remains is consent (ETA s.32, EPOCA reg 7(4)) and no promotion to the self-excluded (GN 478T reg 49(3)) |
| **Evidence** | `.qa-shots/marketing-setup/<unit>/…` (gitignored). ⛔ A `shots/…png` path may only be written into a doc in the commit that also commits the PNG |
| **Tracker guard** | `npm run test:marketing-setup-plan` · red control `npm run red:marketing-setup-plan` (the same file, `--prove-red`, plants in memory) |
| **Cadence** | **TWO units per session** (Ali's standing cadence). 52 units → 27 sessions (S5 closed U8's carried-over half, §10) |
| **Priority** | The Mobile Visual Plan keeps `NEXT-PLAN.md` ▶ 0 START HERE. This programme is ▶ 0a and runs when Ali says so, on any machine |

---

## §0 — RESUME AT

1. Run `npm run test:marketing-setup-plan`. If it fails, the board is lying — fix the board before any code.
2. Read the fenced block below, then §1 (status board), then the two units named in ▶ NEXT (§9).
3. `git log --oneline -5 -- docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md` — every marketing session commits this
   file, so a commit HERE newer than the commits ✔ LAST SESSION names (other than that session's own closing docs
   commit) means another MARKETING session is in flight: stop and ask. Commits from other programmes on `main`
   (house bots, finance, mobile, invite) are normal and are not a stop.
4. Work per §11. Close per §0a step 6.
5. ⛔ LANE SPLIT (Ali, 2026-10-09): the CONTACTS SCREEN — the importer (U30, U31-B, U32, U34b), duplicate detection,
   validation, visuals, crash control and stress — is S15's on Ali-Blade15, tracked in
   [`CONTACTS-SCREEN-PLAN.md`](CONTACTS-SCREEN-PLAN.md). The campaign path below (▶ NEXT) stays S14's. Neither starts
   or pushes the other's units.

```
▶ NEXT: Ali's approved texts saved on PRODUCTION through the owner door (G5, G4, G10 — from a machine whose clock is
  right; the exact lines in `scripts/ops/marketing-owner-save.mts`'s header). Then, as each is
  verified (`docs/marketing-specs/ENGINE-SPEC.md` §0.1's order): U47b-2, the live page (its review's fixes) → U48a, its
  results → (U48b) → licence outreach opened (an owner act, on Ali's delegation) → U52a, the live drive on production.
  WHAT IS LEFT TO THE FIRST REAL CAMPAIGN — each its own unit, commit and live proof (hours: the spec's estimates; what
  is left of a built unit is review, fixes and verification):
     1. U43a  ✅ LIVE (STEP 47, `89775271`, served as `0f1b143c`) — the recipient doors: claim, settle, find the stranded, requeue
     2. U38b  ✅ LIVE (STEP 48, `a5feb9f1`, served as `fefa358d`; its save fixes STEP 50) — who a campaign goes to: the audience card
     3. U13   ✅ LIVE (STEP 49, `53fd74ad`, served as `b6652201`) — the 08:00–20:00 EAT send window, enforced where messages are sent
     4. U40a  ✅ LIVE (STEP 50, served as `88792619`) — the confirmation on the server: the typed count over a sealed audience, the frozen estimate and budget
     5. U46a  ✅ LIVE (STEP 50, served as `88792619`) — delivery receipts reach the campaign recipients (inert until U43b sends)
     6. U40b  ✅ LIVE (STEP 51, served as `41eb8fb2`) — the confirmation on screen: the card and its dialog, three review rounds closed
     7. U42   ✅ PUSHED (STEP 52) — enqueue: the rows, capped at the confirmed count
     8. U49a  ✅ PUSHED (STEP 52) — the credit kept for codes, Start's and Resume's refusals
     9. U43b  ✅ PUSHED (STEP 52) — the send engine: the dispatch hooks (U43b-1); the slice, the reaper, the settlement (U43b-2)
    10. U47b  the live campaign page: U47b-1 (its services) ✅ PUSHED (STEP 52); U47b-2 (the page) BUILT, UNDER REVIEW
    11. U48a  results on the live page (U48b — the recipients table and its CSV — may follow) ........... 5–8 h
    12. U52a  the live drive on PRODUCTION: at most 6 real SMS to the approved test number ............. 4–8 h
  ⛔ Tell Ali BEFORE the first real SMS (U52a), and send it only to the approved test number, within the ledger cap.
  Then: the admin guide v1.4 (the switch, the Marketing SMS settings, a test to another number) as a PDF, with a copy
  on Ali's Desktop.
  ✅ The owed items of ◐ HALF-DONE 3a–4 shipped in STEP 53: U33r, the agent-referee exclusion (Q8 — honoured for every
  referee already told, re-worded for new ones), the sign-up box REMOVED (Q2), OD61's feed restriction, and the Lists
  card's 18+ words posted with the version on screen. ⛔ Licence outreach still waits for production's referee keys to
  be recorded (the fifth opening check). (The erasure marker shipped in STEP 45, U16a.)

WHERE THE PROGRAMME STANDS (the board, §1, is the authority): 17/52 units ✅ · 13/25 defects ✅. LIVE and usable on
  www.50pick.tz today: the contacts book on /admin/contacts (the list, the filters, add and edit, bulk actions, the
  Lists card with its recorded basis), the campaign list and the composer (a test to the officer's own number, or —
  once licence outreach opens — to another number with an 18+ confirmation, behind the CLOSED live switch), and Admin → System's marketing wordings, public policy lines and licence-outreach record (closed). ⛔ Nothing
  can send a marketing SMS yet: the engine is pushed but no page drives it until U47b-2, and the live switch is closed.
  Realistic window for the first real campaign: about 12–14 October if Ali's yes and go come in time (re-stated to Ali
  2026-10-08; earlier 18–25 October).

⏳ IN FLIGHT: S14 — 2026-10-07 from ~10:00 EAT, OMEGA-COMPILE01 (`F:\kipindi-m14`, branch `marketing-s14` cut from
  `origin/main` at `9352de7c`), continuing S13's HANDOVER below (Ali, to this PC: "please proceed with the sms campaign
  plan … another machine was working earlier today"). ⛔ Another session must not start or push a unit named
  here. NOW (18:20 EAT · 2026-10-08) — where each piece is, for a session on ANY machine (another PC: every commit
  below is on origin as a backup branch, `origin/backup/marketing-s14-*`). Ali, 2026-10-07: "keep going and putting
  progress updated until you're done, I'll be away. Keep pushing live." — and "take decisions and fix for perfection".
  · U38b, U13, STEP 50 (the owner door, U40a, U46a, the U38b save fixes), STEP 51 (U40b) and STEP 52 (THE ENGINE) LIVE
    · THE FINAL-RULE UNITS PUSHED (STEP 53 below).
  · ⛔ THE ACCOUNT'S WEEKLY OPUS LIMIT stopped every Opus builder and reviewer at ~22:40Z 2026-10-07 (it resets
    2026-10-09 08:00 Beirut = 05:00 UTC). Sonnet agents still run: the independent re-reviews of U43b-2's round 2 and U47b-1's
    fix round, the check of their fixes and the U47b-2 builder ran on Sonnet; an Opus pass follows once the limit resets.
  · ⚠️ red:house-bot-console (484 defects, about two hours) outran its hour in turn B: its two defects in a file U40b
    changes (rate-limit.ts) run with --only; the WHOLE drive is owed in a quiet turn, as red:house-bot-c5 is.
  · STEP 52 LIVE `21244826` (14:01Z 2026-10-08: www and the apex, /api/health ok, the database reachable and migrated).
  · ⛔ BLOCKED — ALI'S APPROVED TEXTS ON PRODUCTION (G5, G4, G10): `status` and `check` ran (production has no wordings
    and no policy lines saved yet; G5's check passes — "Namba yako ipo orodhani kwetu.", version 1), but the door REFUSES
    the apply: OMEGA-COMPILE01's clock is ~96 s behind real time (google.com, cloudflare.com and www.50pick.tz agree) and
    the door allows 20 s. The PC takes its time from the domain controller; `w32tm /resync` needs administrator rights.
    ⚠️ 2026-10-08: "Sync now" does not help — this PC syncs from the office time server (192.168.66.201,
    finolog.NT_DOM), which is itself ~98 s behind. FIX: run the three apply lines (`scripts/ops/marketing-owner-save.mts`'s
    header) from a machine whose clock is right (Railway's own container, on Ali's "full permission" of 2026-10-08) — and
    ⛔ only AFTER the final-rule units are live: a privacy POLICY LINE saved first would make /legal/privacy print a
    version after v2026-10-07, and `REFEREE_PROMISE_REWORDED_IN` must be the version printed when §9 first goes live.
    Then ONE `railway redeploy --service 50pick` and the pages read back.
  · THE ENGINE — LIVE (STEP 52, served as `21244826`): U42 + U49a + U43b-1 + U43b-2 + U47b-1's services in one tree, each unit built,
    independently reviewed, fixed and re-reviewed (the last check's 3 MINOR fixed in `fdb516a0`). Nothing in it is
    reachable until U47b-2's page lands, and the live switch stays CLOSED.
  · U47b-2 (the live page itself) — `marketing-s14-u47b2` (`F:\kipindi-m14p`): BUILT `84167b81` (Sonnet), merged with the engine's last fixes
    and main (`70ab0d49`); REVIEWED (Sonnet, 2026-10-08: 1 MAJOR — the presses waited behind the driving tab's own step in
    Next's one-at-a-time action queue — 9 MINOR, 8 NIT, no blocker); its fix round is running (the step moves to a guarded
    route handler, so Pause and Stop never wait behind it). Then a check of the fixes, tsc and its drive — STEP 54.
  · U48a (results on the live page) — `marketing-s14-u48a` (`F:\kipindi-m14q`, cut at `47c088c1`): BEING BUILT (Sonnet).
  · Then U52a (the live drive on production: at most 6 real SMS to the approved test number) — after Ali's go.
  · THE FINAL-RULE UNITS — LIVE (STEP 53, served as `d77442f5`, 15:09Z 2026-10-08: /legal/privacy prints "Version
    2026-10-07" with "(not the number itself)"). Production's referee keys RECORDED (STEP 53b below): the census and the
    backfill ran on production — 0 agent applications, so 0 keys, the RECORD reconciled — copied into
    `REFEREE_KEYS_ON_PRODUCTION`, so the fifth opening check passes. ⚠️ `REFEREE_NEW_WORDS_LIVE_AT` STAYS null — every
    referee excluded, the safe side (the new words say offers MAY come): setting it turns test:marketing-consent G22, G23,
    R8 and test:privacy-notice §5ap, §5ar red, whose fixtures assume null. OWED: rebase them on a set cutoff, then set it.
  · ✅ ALI, 2026-10-08: YES to the SIX public wordings (recorded in COMPLIANCE-DECISIONS on `marketing-s14-final`,
    `aa1841bb`). "Create your own users, delete them when done testing" and "you have full permission": Claude's own GROWTH
    login "QA Growth (Claude)" provisioned on production through the audited door (`usr_ad90e82c52580e31ba36f50f`,
    +255 700 000 090; its password only in the git-ignored `.env.qa.local` as QA_GROWTH_PROD_*) — ⛔ DELETE IT, and every
    test contact, when the live testing is done. He wants the whole engine finished and sealed end to end before he is
    reported to, then the admin guide v2 as a PDF on his Desktop and the repository cleaned. ⛔ Still: Ali is TOLD before
    the first real SMS (U52a), which goes only to the approved test number, within the ledger cap.
  · Order to land now: Ali's texts saved on production (from a machine whose clock is right) → U47b-2 (STEP 54) → U48a
    → licence outreach opened (an owner act, on Ali's delegation) → the engine's dry-fire stress run (Ali, 2026-10-08:
    "stress test … dry fire it … on data sets of your own") → U52a → the admin guide v2 (PDF on Ali's Desktop) → the
    clean-up and the handover.
  · THE LOCK: the Vodacom and money-doors sessions run beside this one on the same PC. Every heavy job (tsc, builds,
    dev servers and drives, scratch Postgres, batteries) takes `F:/kipindi-locks/heavy-node.lock` (a `mkdir` mutex;
    the owner line's first word is the session) and queues with ONE note, `F:/kipindi-locks/heavy-node.wait`: a note
    that is not yours goes first, and a job clears only its OWN note, word for word; a session that takes another's
    place by agreement writes that place back into the note when it takes the lock. ⛔ Release the lock ONLY if you took
    it. While queued, keep working on everything that needs no lock (the `keep-working-while-waiting` skill). In a
    worktree whose node_modules is a junction, start db:scratch from a real checkout (its sweep misses its own orphan
    io_worker otherwise — Vodacom's fix is on `vodacom-dbscratch`). A ready
    helper: `F:/kipindi-locks/withlock.sh`. This lane uses ports 3101-3109 and scratch Postgres 5461-5463.
  ▸ 10:08 EAT: S14's first session closed mid-task; a second session on the same PC continues S14 in the same worktree
  (Ali: "proceed with the sms campaign plan … check what's left and proceed").
  STEP 53b · PRODUCTION'S REFEREE KEYS RECORDED — `ops:marketing-referee-keys` through Railway on production, after STEP 53
  went live: `status` then `backfill` — 0 agent applications, 0 promised, 0 keys written, 0 missing, 0 unreadable — and
  its RECORD (environment production, ranAt 2026-10-08T15:11:39Z by this PC's clock, ~98 s early) copied into
  `REFEREE_KEYS_ON_PRODUCTION`: the fifth licence-outreach / live-switch check (`referee_keys`) now passes. With it the
  door's own fix (`70e9ba96`): its first census failed off Railway — the store was loaded by a STATIC import before the
  public-proxy rewrite; now ONE dynamic import below the rewrite, R10 pinning the order with a plant (172/172 caught).
  STEP 53 · THE FINAL-RULE UNITS PUSHED — LIVE `d77442f5` (15:09Z 2026-10-08, /api/health ok, the migration applied) — `marketing-s14-final` (merged with main as `2db2d2d4`; Ali's FINAL rule of
  2026-10-07 and his YES of 2026-10-08 to the six public wordings, recorded in COMPLIANCE-DECISIONS `aa1841bb`): ① U33r, THE
  AGENT-REFEREE EXCLUSION (Q8) — every referee named before Privacy v2026-10-07 is kept as a coded form of the number
  (an HMAC under the server's pepper, never the number) and refused by the ONE gate on every path (the engine, the
  test send, the profile switch — "Off for good: 50pick has promised never to send offers to this number."), the table
  `AgentRefereeKey` shipped EMPTY by its migration and filled by `ops:marketing-referee-keys` on production; ② Privacy
  v2026-10-07 in en/sw/zh — §5 the 7-year record of marketing SMS and the coded referee numbers, §6 Erasure "subject to
  the records the law requires us to keep", §9 the promise kept only for referees already given it, the data-rights
  sentence and the note under "Erase my data"; ③ the sign-up box REMOVED (Q2); ④ OD61 — the overview's activity feed
  shows COMPLIANCE rows only to a viewer who may read compliance; ⑤ the Lists card posts the adult.list version its 18+
  tick was given for, and a save refuses a rewording; Q9 reversed (a lapsed player is reached under the licence).
  ⛔ LICENCE OUTREACH AND THE LIVE SWITCH STAY SHUT until production's referee keys are recorded (the fifth opening
  check, `referee_keys`): `railway run --service 50pick npm run ops:marketing-referee-keys -- status`, then `-- backfill`,
  its RECORD line into `REFEREE_KEYS_ON_PRODUCTION` and `REFEREE_NEW_WORDS_LIVE_AT` = the instant this step went live,
  in one small push. Under the lock: prisma generate 0 (the AgentRefereeKey model); typecheck: ONE error on the merged tree, dsar.ts:250 — a cast that hid three fields the profile switch reads (a real defect), fixed in 19706e93, tsc 0 after; the in-process reds marketing-consent, admin-overview-feed, campaign-gates 84/84, campaign-audience, campaign-privacy and marketing-setup-plan 28/28 all caught; qa:marketing-audience 144/0; /legal/privacy and /auth/register 200 in en, sw and zh; admin-section-gate 21/0; admin-action-gate 15/0; db:probe-referee-keys 32/0; verify:backup-schema 13/0 (the migration); 28 planting reds on the changed files caught and the repo unchanged by them (red:house-bot-console with --only its one defect there); red:house-bot-c5 refused on a red baseline — the house-bot D19 guard lacked the marketing lane's two audit readers (campaign-live.ts since STEP 52, referee-exclusion.ts), classified in 002bcec4 with the reports suite green, its three defects in the changed files owed in the next turn; red:house-bot-chatbot's floor (test:house-bot-disclosure 116 of 118: its 5.1 pin to cb87df44) fails the same on main before STEP 51 — the house-bots lane's.
  STEP 52 · THE ENGINE PUSHED — LIVE `21244826` (14:01Z 2026-10-08, www and the apex; /api/health ok) — U42 + U49a + U43b-1 + U43b-2 + U47b-1's services in ONE tree (`marketing-s14-u47b1` at
  `fdb516a0`, merged with main as `9740bb45`), every unit built, independently reviewed, fixed and re-reviewed (ENGINE-SPEC
  §4.7–§4.15 and their "as built" blocks): ① U42, the enqueue — the confirmed audience written as recipient rows in
  chunks, capped at the confirmed count, never twice; ② U49a — the credit kept for login codes, and Start's and Resume's
  refusals judged on the stored counts; ③ U43b-1 — the dispatch hooks, every answer read, never trusted; ④ U43b-2, THE
  ENGINE — the slice (claim → the gate again → the message → the send → the settle), the reaper and the settlement, the
  send-age bound checked three times so a claim a reaper could release never reaches the wire (no message twice), too
  slow counted by route; ⑤ U47b-1 — the live page's services and view-model (Start · Pause · Resume · Stop · Make a copy,
  the step dispatcher, the floor E23, every sentence true for every reader), and two additive indexes (migration
  `20261008120000_sms_recipient_outcome_index`: the live page's groupBy and its newest-claim read). ⛔ NOTHING IN IT IS
  REACHABLE YET: no page calls the services until U47b-2 (STEP 53), and the live switch stays CLOSED.
  ⭐ PROVEN — light suites on the push tree: marketing-engine 91 (red 125/125), campaign-visuals 31 (red 43/43),
  campaign-models 53, sms-cost-guard 111, dal-parity 2171, campaigns-page 39, control-gates 281, pii-logs 15,
  source-bytes 7, docs, marketing-setup-plan. Under the lock: typecheck 0; the light suites and in-process reds on the merged tree all green (marketing-engine 91, red 125/125; campaign-visuals 31, red 43/43; campaign-models 53 + red; campaign-gates 65, red 84/84; campaign-compose, red 332/332; campaign-privacy, marketing-consent 204, marketing-optout 121, campaign-estimate, campaign-confirm, campaign-audience and campaigns-page, each with its red; sms-cost-guard 111, otp-delivery 45, blackball 71, sms-dlr 82, dal-parity 2171, migration-ownership, dead-schema, read-tiers, pii-logs, client-graph-safe, orphan-actions, source-bytes, guards-exist, docs, marketing-setup-plan + red 28/28 — test:red-anchors failing only the 4.1/4.2 ceiling, as on main before this tree); the 14 planting reds on the files it changes (blackball, sms-cost-guard, otp-delivery, sms-dlr, dal-parity, dead-schema, erasure, id-documents, notifications-page, read-tiers, chain-purge, chart-one-home, rg-doors, bonus-relock) all caught, the repo unchanged by them; db:probe-campaign-models 52 passed, 3 failed — all three a probe artifact (a jsonb trail compared as text; jsonb reorders keys), every value right, the compare made canonical in dd22204e — and 10j′ measured: the activity read is ONE row down the new claimedAt index (a backward index-only scan); verify:backup-schema 13/0 (the migration); STEP 50's owed settings drive on Turbopack exit 0.
  STEP 51 · U40b PUSHED — LIVE `41eb8fb2` (12:26Z 2026-10-08, www and the apex; /api/health ok) — THE CONFIRMATION ON SCREEN (ENGINE-SPEC §4.6; `d35fd5cd` + `8e861dd1` + `2f31ebf3` + `5a48e843`,
  merged with main as `4f8d20a1`, THREE independent review rounds, every finding closed): the "Confirm audience…" card and
  its dialog on the composer — the confirmation counted ONLY when the officer presses (never on a render), its own fresh
  count (never joined to an older walk — OD27's case) inside the split's two per-process slots with a 15-second bound and a
  true "Counting is busy right now"; ⭐ OD67 on screen: a viewer who may not read a number types the count, never a list,
  the tier taken from the server's view only; a refusal re-arms the dialog without a remount (no blink); the dialog never
  opens by itself on an answer the form no longer matches; the read action role-checked before any comparison (no
  equality oracle), rate-limited per officer, audited under its own id; every sentence true for every reader.
  CONFIRMED sends nothing. ⭐ PROVEN — light suites on the push tree: campaign-gates 58 claims (+1 pending, U42; red
  84/84 after round 3), campaign-audience 41 (red 49/49), campaign-compose, campaign-confirm 46, campaigns-page 39,
  contacts-audience 53, unsaved-changes, confirm-gate 9, popup-fit 13, ui-consistency, orphan-actions 9, feedback-law
  150, design-frozen, read-tiers 83, redis-failopen 94, and the rest of the push tree's 28 — every one green. Under the
  lock: typecheck 0; the drives qa:marketing-audience 144/0, qa:marketing-console 198/0, qa:marketing-typed 179/0, admin-section-gate 21/0, admin-action-gate 15/0 and qa:marketing-confirm 342/0 (its second full run); the planting reds blackball, sms-cost-guard, otp-delivery, sms-dlr, dal-parity, filter-language, confirm-gate, unsaved-changes, feedback-law, admin-soft-gate, reduce-motion 12/12, motion-ladder, keyframes, measure and read-tiers all caught; red:house-bot-console's full run outran its hour (owed in a quiet turn), its --only over rate-limit.ts 2/2 caught; db:probe-campaign-models 42/0.
  STEP 50 · FOUR PIECES IN ONE DEPLOY, PUSHED — LIVE `88792619` (19:41Z 2026-10-07, www and the apex; /api/health ok) — (the push tree `ed128b73`: `main` `b2e9db81` with each piece merged onto
  it first) — ① THE OWNER DOOR `ops:marketing-owner-save` (`51a4acb0` + `8e508606` + `f5db4ea9`, reviewed twice, every
  finding fixed): Ali approves a text in the session and Claude saves it through an audited door, never with his login —
  `status` · `check` · `apply`; the approval a strict UTF-8 JSON file holding only its gate's keys (G4 the nine wordings,
  G5 the source line, G10 the five public lines; at most 7 days old), each text normalised by its record's own normaliser
  and named by its sha256 (`--expect`: the bytes written are the bytes approved); the COMPLIANCE record written FIRST,
  the SAME writer the card calls, the row read back, DONE only on four conditions; production's own environment for
  check and apply, and the 20 s clock rule; Ali's approvals of 2026-10-07 committed (`docs/marketing-approvals/2026-10-07/`).
  ② U40a · THE CONFIRMATION ON THE SERVER (ENGINE-SPEC §4.5; `39a4fc50` + `6fd388df` + `e4348bae`, reviewed twice): the
  audience counted only through the ONE walk and SEALED (a keyed HMAC over the filter, the count and a members key bound
  to its draft — the review's MAJOR), the typed count equal to the sealed one, the draft unchanged, the source line saved
  and current, the spend inside the campaign limit with the budget frozen at the measured price; ⭐ OD67 (§4): a viewer
  who may not read a number confirms by TYPING the count at every size, never by a list. CONFIRMED sends nothing.
  ③ U46a · DELIVERY RECEIPTS ON THE RECIPIENTS (§4.14; `4b41f032` + `0b5126b2` + `23a138e8`, reviewed, every finding
  fixed): ONE receipt door `recordReceipt` in both twins — conditional, monotonic, identity-checked (a campaign receipt
  needs its own number), the provider's words scrubbed before they are cut, ONE 16-character floor for the webhook
  secret (the current one too, with a boot warning), the rotation runbook's confirm step; inert until U43b sends.
  ④ THE U38b SAVE FIXES (`e25de55d` + `db841d68`): a saved draft whose only change is its audience saves it (never
  "Nothing to save"), and every save goes to the draft's own address, so a window saved as "7 days" never reads as
  unsaved the next minute (the U40b review's MAJOR, fixed at its root). ⭐ PROVEN — light suites on `07b7cd60` (the same code: main moved since by docs and the red:all runner only):
  40 suites, every one green — campaign-gates 43 (+1 pending, U42; red 36/36), campaign-confirm 46, campaign-estimate 34 (0 send requests), campaign-audience 41 (red 49/49), campaign-compose, campaigns-page 39, unsaved-changes, marketing-owner-save 20 (red 62/62), policy-lines 11, marketing-wordings 16, rg-policy 23, marketing-settings 21, privacy-notice 67, sms-dlr 82, webhook-secret 19, cert-a6 16, support-contact 77, dal-parity 2159, campaign-models 51, campaign-privacy 27, pii-logs 15, source-bytes 7, guards-exist 9, client-graph-safe 5, docs, marketing-setup-plan, money-minimums 35, contacts-audience 53, read-tiers 83, i18n (2,627 keys × 3), marketing-consent 162, marketing-window 9, otp-delivery 42, blackball 59, sms-cost-guard 96, admin-nav 27, rbac 145; production's webhook secret measured at 48 characters (U46a's new floor is 16 — receipts keep landing). Under the lock, on `ed128b73`: typecheck clean; the owner door REHEARSED on a scratch PostgreSQL as production would run it — status → check → apply G5, G4, G10, each DONE, then NOTHING TO DO for G5 and G10, the COMPLIANCE `marketing.owner_save_applying` / `_applied` rows and the factory's `config.*_updated` rows read back in SQL; THE DRIVES on Turbopack, each on a fresh server: `qa:marketing-policy-lines` 89/0 (the drive now waits for the card to hydrate, `11194f79` — on the slower webpack server it had typed before React listened), `qa:marketing-audience` 144/0 (AUDIENCE ONLY and WINDOW SAVED included), `qa:marketing-compose` console 198/0 and typed 179/0; on webpack, `qa:marketing-wordings` 42/0 and `qa:marketing-settings` on a scratch PostgreSQL 180 functional checks green (its 4 loading-ghost checks name Turbopack's chunks — ⛔ OWED on Turbopack); `red:sms-dlr` and `red:dal-parity` every plant caught; `red:house-bot-c5` stopped at its 60-minute bound with 55 of 99 plants caught and none missed (its plants touch no file of this push; the one file it had planted restored and the tree verified clean before the push) — ⛔ OWED in full; `db:probe-campaign-models` 42/0 (U46a's receipt door, §11, on PostgreSQL).
  STEP 49 · U13 PUSHED `53fd74ad` — LIVE `b6652201` (16:00Z 2026-10-07, www and the apex; /api/health ok) (with `cb3fb2c7`, the contacts drive's corrected check) — THE 08:00–20:00 EAT SEND
  WINDOW, ENFORCED WHERE MESSAGES ARE SENT (ENGINE-SPEC §4.8, D13 · OQ5): ONE rule (`lib/marketing/window.ts`) read by the
  send path, the officer's test send and the composer's Test card; the live reader `liveSendWindow` (dispatch.ts).
  `dispatchSlice` reads the window first — closed → every row held `quiet_hours`, no gate asked; hours that cannot be read
  → every row held `window_unreadable`, the same shop-wide wait, never a pause and never the default hours obeyed (SP-2);
  the window judged again at the wire against the slice's own elapsed time (SP-1); the test send refused `held` in the
  window's own sentence before a token, a row or the wire, and the composer says so up front (M12); ⭐ R1 — new hours on
  Admin → System refused while the responsible-gambling page's marketing line names a time they would not keep
  (`published_hours`), or while the public lines cannot be read (`published_unread`), the line read for word times too
  (English hour words, the Swahili clock, Chinese numerals) after NFKC (the review's MAJOR #1); every suite that drives
  `dispatchSlice` hands it a fixed window (`scripts/lib/send-window.mts`), W6 walking the callers; a dev-only clock door
  (`/api/dev-test/marketing-send-window`) for the drives. Moved onto U38b by a three-way merge from the S13 drafts and the
  S14 build (two overlaps settled by hand). ⭐ PROVEN: `test:marketing-window` 9 (red 9/9), `test:marketing-settings` 21
  (red 73/73), `test:policy-lines` 11, `test:rg-policy` 23 (red 26/26), `test:marketing-consent` 162 (red 94/94),
  `test:campaign-audience` 40, `test:campaign-privacy` 27, `test:campaign-compose` (with §18.33), `test:client-graph-safe`,
  `test:guards-exist`. THE BATTERY on `cb3fb2c7`: typecheck clean; 82 light suites three at a time — every failure red on a
  clean `main` too (`red:policy-lines`, `test:red-anchors`, `test:house-bot-holder-lifecycle`, `test:orphans`), and
  `test:admin-section-gate` driven live below; 5 of the 21 database suites green (`test:cashout-price-guard`,
  `verify:backup-schema`, `test:kyc-restart-docs`, `test:house-bot-migrations`, `test:house-bot-money`) — the battery was
  cut short to hand the lock to the deposits release Ali asked to go first, and the other 16 (house-bot and rehearsals —
  none names a file U38b or U13 changed, the rehearsals only through their registry reading package.json) are OWED on this tree; `red:chart-one-home` caught every plant; `red:sms-cost-guard` 53/53 caught on their own assertion, the tree byte-identical after; `red:house-bot-c5` REFUSED before any plant on the drive tree — its disclosure baseline holds every published word to `main`'s, and that tree (`e25de55d`) lacks the money doors' words; none of its plants touches a file U13 changed. ⛔ OWED: it runs on main's words in the next lock turn.
  THE DRIVES, each on a fresh server: on the U13 tree with the first U38b save fix (`e25de55d` — NOT in this push; it lands with its follow-up `db841d68`): `qa:marketing-audience` 142/0 · `qa:marketing-compose` window-closed 17/0 (the dev clock door), console 198/0, typed 179/0, live-closed 18/0, dead-rail 10/0 · `qa:marketing-policy-lines` 89/0 · `qa:marketing-contacts` 487/0 · `test:admin-section-gate` live and warm 21/0 · `qa:marketing-settings` on a scratch PostgreSQL 184/0.
  WITH IT: the staff door `ops:provision-staff` (`4bd4c728` — run from a PC through Railway's public proxy; no database, no
  run; `--execute` only in production; the password written to a gitignored file, never printed; test 10/10, red 6/6) and
  `c9a5a6fa` (the section gate waits for the URL after a soft navigation, not a fixed six seconds).
  STEP 48 · U38b PUSHED `a5feb9f1` (merged with `main` as `fc49aeb5`, then `2c89a953`) — THE AUDIENCE CARD ON THE COMPOSER
  (ENGINE-SPEC §4.4): who a campaign goes to (Contact book · Player accounts · Both — the `pop` key read only at the
  campaign door), the audience rail, and a keyed Suspense count from ONE pure view-model; the campaign list says each
  row's audience in words, role-shaped; the contacts page says "Will receive". The 28 drafts of
  `backup/marketing-s13-wip` `u38b/` applied on `main`. ⭐ OD65 (D19-1, decided on Ali's delegation, told to him): before
  a campaign sends, a viewer who may not read a number sees the COUNT ALONE at every size — the ONE walk's count inside
  the split's own slots, the gate never asked about the people they chose, the sentence "Your role sees how many people
  match, not who will receive it." — because a size floor cannot hold against an officer who pads a tag with numbers of
  their own; E23 amended (its floor stays for the surfaces that count messages actually SENT, U47b/U48a). ⭐ OD66: such
  a viewer may not count both populations at once (the walk counts a book-held player once, so one added contact would
  say who is a player) — refused at the campaign door, not offered on their Who pills. 🔎 An independent review's
  findings all fixed before the push: STD-1 (no in-app navigation meets the page's redirect any more — a new draft's
  save answers its canonical address, the list links there, "Remove the filter" goes there, Reload after a stale save
  goes to the stored audience), no false unsaved-changes prompt from the rail's pills, role-shaped loading ghosts, the
  reasons printed from the view-model's own counts, the save's read-back on the memory twin, the masked count inside the
  split's slots. ⭐ PROVEN: `test:campaign-audience` 40 (`red:campaign-audience` 46/46), `red:campaign-compose` 326/326,
  `red:campaigns-page` 21/21, `test:contacts-page`, `test:filter-language`, `test:unsaved-changes`; typecheck clean.
  THE BATTERY on `fc49aeb5` (the push differs from it only in docs): 88 light suites three at a time — every failure is
  red on a clean `main` too (`red:policy-lines`, `test:red-anchors`, `test:house-bot-holder-lifecycle`, `test:orphans`,
  `test:decomment`); `test:admin-section-gate` needs a server (its static half green; driven live below); `test:all` was
  stopped at the battery's 15-minute cap (every suite in it that reads a touched file ran on its own); 4 of the 21
  database suites green (`test:cashout-price-guard`, `verify:backup-schema`, `test:kyc-restart-docs`,
  `test:house-bot-migrations`), the other 17 — which reach U38b only through `package.json` — moved to U13's battery so
  the lock could go to the money-doors release Ali was waiting on; `red:filter-language` and `red:unsaved-changes` caught
  every plant, the tree byte-identical after. THE DRIVES, each on a fresh in-memory server: `qa:marketing-audience`
  140/140 at 1280 and 360, as the owner and as GROWTH (the count alone, the floor, the reasons, the sample, loading,
  refused, error, empty — the captures read); `qa:marketing-contacts` 485/487 — its two misses one stale check (an "Age not confirmed" row, which a fresh server cannot produce since U33a-G), corrected in `24ab95c0` and re-run in U13's turn; `qa:marketing-compose` console
  198/198, typed 179/179, live-closed 18/18, dead-rail 10/10; `test:admin-section-gate` live 19/21 on the first, cold run — one scenario's two claims (an AUDITOR's soft navigation from /admin/kyc into /admin/players, read 6 s after the click while that route was still compiling); 21/21 on `main` with the routes warmed first; U38b touches no file on that path; driven again warm in U13's turn.
  STEP 47 · U43a PUSHED `89775271` — THE RECIPIENT DOORS IN BOTH TWINS (ENGINE-SPEC §4.10), inert until U43b: `claim`,
  `claimedBy`, `settle`, `findStranded`, `requeueHeld`, `lastActivity` and `smsMessage.findByTargets`, each asking the
  one rule set (`campaign-model.ts`) first. The seven files of `backup/marketing-s13-wip` `u43a/` applied on `main` (six
  byte-identical to the backup; the anchors file merged by hand, keeping main's two U16a TGT-6 anchors the backup
  lacked). ⭐ P10 ROUTED: `test:campaign-privacy`'s fixture rows are claimed and settled through the real doors
  (`claim` · `claimedBy` · `settle` · `requeueHeld`); only U46a's receipt shapes and PE-08's unreachable state stay by
  hand (`afterTheDoors`); `P10_ACCOUNTED` takes U43a's six; R-P10d now plants U46a's `recordReceipt`; NEW R-P10e (the
  settle door writing the account into the trail) proves the routing; DATA-RETENTION's "no settle door exists yet"
  sentence rewritten. 🔎 An independent review of the whole diff found nothing at MAJOR or above; both its findings were
  fixed before the push: (MINOR) a trail `source` split on symbols let a phone number written with separators through
  (`msisdn 0712 345 678`) — the source is now read piece by piece, the words that hold a letter taken out whole and a
  number between them refused in any spelling (§2.17 +2 refusals, +1 lawful case of references, an instant and the
  window; a new plant, caught); (NIT) ENGINE-SPEC §4.10's settle table said a release clears `claimedAt` — rewritten as
  built, with D15 (a release keeps `claimedAt`) and D16 (a fresh token per claim). Found in the battery and fixed: a
  comment in `store.ts` cited a guard that does not exist yet (`test:guards-exist`). Found by the probe and fixed: §10's
  `firstLine` read a Prisma error's empty first line as "no error" (10h). ⭐ PROVEN: `test:campaign-models` 48
  (`red:campaign-models` 72/72), `test:dal-parity` 2,150 (`red:dal-parity` 198/198, the working tree byte-identical
  after), `test:campaign-privacy` 27 (`red:campaign-privacy` 32/32), typecheck clean; ON POSTGRESQL 18.3 (scratch,
  port 5461): `db:probe-campaign-models` 35/35 — five claimers TRULY CONCURRENT over 1,000 rows: 1,000 won, none twice,
  none lost, no error; the forced race (five claims waiting on one row lock at once: exactly one winner); one
  transaction or nothing (P2002, the first statement rolled back) — and `db:probe-campaign-privacy` 9/9. THE BATTERY:
  the 208 suites that read a touched file (203 three at a time, the 5 database ones alone) — every failure but the
  fixed `test:guards-exist` is red on a clean `main` too, with the same failures (`red:policy-lines`,
  `test:house-bot-holder-lifecycle`, `verify:reports-live`, `test:updown-digest`, `red:simple-journey-flag`,
  `test:orphans`, `test:failure-reasons`, `test:decomment`, `test:red-anchors`); the 184 red-harness anchors that plant
  into a touched file each still resolve exactly once. ✅ READ BACK LIVE: `?dpl=0f1b143c` (the pushed head) on 50pick.tz and on www at 08:43 UTC 2026-10-07 — a fresh container, up since ~08:28 UTC, after the push at 08:23; `/api/health` ok, the database reachable and migrated (no migration in this unit).
⏳ (S13's block, kept as the handover) S13 — 2026-10-06, ALI-BLADE15 (`C:\kipindi-marketing`, branch `marketing-s13` cut from `origin/main` at
  `85866b36`; docs-only commits from `C:\kipindi-s13-docs`). Taken over ~21:50 EAT: OMEGA-COMPILE01's S12 stopped after
  STEP 44's push — no read-back and no closing commit followed for over three hours — and Ali asked this PC to continue
  ("if omega compile 01 is still working … let it finish, then continue; I think it stopped already"). ⛔ Another
  session must not start or push U16a, U43y, U43a or U38b. STEP 44 READ BACK LIVE by S13: `?dpl=4093dc54` on 50pick.tz
  and on www (18:38 UTC; the container up since ~15:35 UTC, `/api/health` ok, the database reachable and migrated).
  S13's first three units were BUILT on this PC on 2026-10-04 (S10) and never pushed: U16a (reviewed once; its round-2
  fixes are D10 — the 5,000 cap, read one past and said in words; D11 — another number is another person's until
  linked; D12 — created OR sent since the account), U43y (batteried green that day, never reviewed) and U43a (static,
  never run). All three are ported onto `main` by a three-way merge — one conflict, `dsar.ts`, where U33a-P's
  `outreach` field sat beside U16a's fields (both kept) — and re-reviewed before each push. S10's merged worktree is
  parked on the LOCAL branch `wip/marketing-s10-unshipped-2026-10-04` (`10b457f4`, never pushed).
  ▶ HANDOVER — where everything is, for ANY machine (state 2026-10-07 ~09:20 EAT; Ali: "push the progress now to
  continue from another machine"):
  · STEP 45 (U16a, `d2fe9731`) + STEP 46 (U43y, `18e6192b`) PUSHED to main with this record, after ONE battery on
    `marketing-s13` @ `18e6192b` (2026-10-06 22:50 → 23:54 UTC, 315 steps): the whole predeploy chain + U16a's reach +
    the planting reds + `db:probe-campaign-privacy` 9/9 + `next build` + `qa:live` 303/303 + `qa:marketing-retention`
    30/30 (tiles read: both new schedule rows at 1280 and 360). Own suites: `test:campaign-privacy` 27/27 and its red
    complete, `test:money-busy` 34/34 and its red complete, `test:backup` 134/134 (U43y's BLOCKER), dal-parity 2,129,
    `red:erasure` 33/33. NO failure that clean main does not have — compared on main: decomment (24 > 20), red-anchors
    (the same 2), orphans (identical but the 4 new reachable scripts), updown-digest; admin-section-gate, revoked-deadend
    and needle-rest need a server on :3009, verify-house-bot-bundle ran before the build, the old-build verify needs
    `HOUSE_BOT_OLD_BUILD_DIR`, red:journey-header-fit runs only by name. ⏳ OWED: `red:house-bot-c5` ALONE with no time cap
    (the battery's 20-minute step cap killed it; its one plant in `scripts/lib/house-bot-reports-cases.mts` and its lock
    file were restored byte-for-byte). ✅ READ BACK LIVE: `?dpl=023eae9f` on 50pick.tz and on www from 06:19:55 UTC
    2026-10-07 (a fresh container; `/api/health` ok, the database reachable and migrated).
  · Branch `backup/marketing-s13-wip` (`4384fc3a`, never for main): `wip-s13/notes/README.md` says what each folder is —
    `u43a/` fixed and ready to merge (then P10 through the real settle), `u38b/` with ONE D19 MAJOR open (a GROWTH officer
    can pad a tag with 9 of their own contacts so the floor of 10 opens: decide count-only for masked viewers), `u13/`
    (review partial), `owner-door/` (PARTIAL), `fr-public/` · `fr-lists/` · `fr-feed/` (PARTIAL), and every finding and
    the approved texts.
  · ⚠️ ~02:10 EAT this session hit its usage limit: the U38b fixer, U13's promise lens and fixer (with ruling R1: a
    settings save that changes the hours is refused while the published RG line names an hour the new window drops), the
    owner-door builder and the four final-rule builders stopped mid-task — re-run them.
  · Recorded on main: Ali's FINAL rule and every approval of 2026-10-07 — COMPLIANCE-DECISIONS § "2026-10-07 · Marketing
    SMS go to anyone with a phone — consent is not a condition" (the stop kept; his "people cannot stop offers" recorded,
    not implemented).
  · The final-rule units: (1) the gate — Q9 reversed (a lapsed player is reached under the licence) + U33r, the referee
    exclusion for every referee already promised "we never contact you for marketing", the promise re-worded for new
    referees (its new words to Ali first); (2) the public texts — the sign-up box removed + the approved 7-year
    campaign-record texts (/legal/privacy §5, the data-rights file, "Erase my data"; `test:privacy-notice`'s version and
    hash move with a COMPLIANCE "Privacy v…" entry); (3) OD61 — the /admin activity feed's COMPLIANCE rows for compliance
    viewers only; (4) ◐ 3b — the Lists card posts the 18+ version it showed and a mismatch is refused.
  · Order to live: U43a → U38b (decide D19-1) → U13 → the owner door, then apply Ali's approved texts (G4, G5, G10) and
    redeploy once → the final-rule units → open licence outreach → the engine (U40a → U40b → U42 → U49a → U43b → U46a →
    U47b → U48a → U52a). ⛔ On ALI-BLADE15 check the lock owner and LastBootUpTime before any battery (it rebooted once).

✔ LAST SESSION: S12 — 2026-10-06, OMEGA-COMPILE01 (`F:\kipindi-main`, on `main`): the send engine begins (Ali: "proceed
  please, next steps until we go live, fully done and perfect"). S11's block (STEPS 40–42 — the gate track finished,
  U37c-2 LIVE `0d3f08d7`) is in `MARKETING-CAMPAIGN-HISTORY.md`, verbatim.
  STEP 43 · U49s-1 LIVE `34c1ea7f` (served from 09:35 UTC 2026-10-06, proved by discrimination — `0652f61f` before it;
  the new container's `/api/health` ok, the database reachable and migrated; production's switch read through the ops
  door: OFF (absent)) — THE LIVE SWITCH'S CLOSING TIME AND ITS TWO AUDITED WRITERS, AND THE MARKETING SMS SETTINGS
  RECORD — the server half of U49s (ENGINE-SPEC §4.3), split before it was started like U37c; inert: no screen writes
  either yet (the card above the rail and the "Marketing SMS" tab are U49s-2, ▶ NEXT). ⭐ OD62 (E13): the switch row is
  now `{ enabledBy, enabledAt, closesAt }` and reads CLOSED from `closesAt` on (an opening lasts 30 min – 24 h, 2 h
  unless chosen); the old two-key row, a fourth key, a future `enabledAt`, a date that does not round-trip and anything
  malformed read closed, and the gate checks the closing time itself. OPEN reads first (never over an opening, never
  over an unreadable switch), RECORDS FIRST (`marketing.live_switch_opening`, before the row exists), writes, READS BACK
  and confirms (`…_opened`); CLOSE removes the row once with DELETE … RETURNING and records exactly what it removed. The
  audited ops door, `npm run ops:marketing-live-switch -- status | open | close` (refused unless run through
  `railway run` in production's environment, with its own audit secret), calls the same two writers as `via: "ops"` with
  a screened `by`/`reason`. ⭐ OD63 (E14): `marketing.sms.settings` — TZS 6 per SMS, TZS 20,000 kept for login and
  withdrawal codes, TZS 10,000 the most one campaign may spend, 08:00–20:00 EAT — one pure rule the tab and the server
  share, the row replaced whole, a stale page and a row it cannot read in full refused, the window kept or dropped as a
  pair; the estimate re-reads it for every estimate. `SMS_PRICE_PER_SEGMENT_TZS` is gone (never set on Railway — checked
  with `railway variables`, names only), so G9's TZS 6 is in force with no Railway change. 🔎 The adversarial review said
  FIX FIRST — one MAJOR, fixed before the push: opening could leave the switch ON with no COMPLIANCE row while telling
  the owner it was off, on a database fault in the wrong millisecond (a save that committed then threw; a read-back that
  failed, then a silent delete) — every such path now goes through ONE rollback that deletes only the row this call
  wrote (a jsonb compare-and-delete) and says "off" only on a read that proves it, otherwise "couldn't be confirmed off
  — switch it off now"; a second owner's opening is never taken; a close removes stale rows too. Its minors fixed with
  it (the ops door's screen, a wider writer-population pin, the estimate's fresh read, the reader's clock and dates, the
  gate's own check). 🔎 A second review of the fixes found the record still written AFTER the row (an instant when the
  switch could read on with no record) and an opening laid over another: fixed — the opening is recorded first, the
  switch is read first, and a close records the row it actually deleted. 🔎 A third review found two more MAJORs, both
  fixed before the push: a close whose delete committed and lost its reply could tell the owner "It was already off"
  with no record of the close, and a blind retry could delete an opening that landed after — a close now looks before it
  retries, records the close as `was: unknown` and leaves a later opening standing (the owner is told it is on again);
  and two openings in the same instant could both be told "on" while the second replaced the first — the write is now
  conditional (`createConfigIfAbsent` where there is no row, `replaceConfigIfValue` for the exact stale row read), so
  exactly one stands and the other is told whose. With them: the ops door's numerals capped across `by` and `reason`
  together, lone surrogates refused, and "it is off now" said only where a read proved it. 🔎 A fourth review found one
  more MAJOR, fixed before the push: a close whose first read failed and whose delete then failed without effect could
  RECORD a close that never happened (the unreadable first read, set beside the opening still standing, read as
  "replaced") — "gone" is now decided by comparing the stored values, only against a first read that succeeded; a close
  tries again only on a readable look showing the very row it first read, and then deletes only that row; a look that
  proved the row gone is believed though every read after it fails; a stale row kept through failed deletes is never
  recorded closed; and with no read to be had the owner is told `close_unconfirmed`, never "It was already off". With it
  (m4): an opening stamped by a clock ahead of this one is never replaced as stale, and the ops door refuses to write
  from a PC whose clock is over 20 s off the database's. Known limit, recorded in the module: a row holding jsonb `null`
  (SQL by hand only) reads absent and blocks the switch until it is deleted by hand. 🔎 Found in the pre-push check,
  fixed: the ops door did not rewrite Railway's private database host to the public proxy, as every other ops script
  does — run from a PC it could not reach the database (every read unreadable, every write refused); proven READ-ONLY
  against production: `railway run --service 50pick npm run ops:marketing-live-switch -- status` → "OFF (absent)". 🔎 A
  fifth review found nothing at MAJOR level; its minors were fixed before the push: a readable proof that the row is
  gone is never thrown away (a look that finds no row though the first read failed; a retry's compare-and-delete that
  finds nothing); with no read after a close, whether somebody's opening stands comes from the look that proved the row
  gone, and the ops door never prints OFF from a read that never landed; ONE rule, `openingSince`, says what an opening
  is wherever a writer asks (one stamped by a clock ahead included); and the ops door's clock check gates an OPEN only —
  a close only warns.
  ⭐ PROVEN ON POSTGRES: `npm run db:probe-marketing-settings` — the shipped writers, reader, store and estimate dep on a
  scratch PostgreSQL 18.3 migrated from empty (96 migrations): 17/17 — the opening row first on the chain, the
  compare-and-delete (a different, an undefined and a null value refused; the identical one taken in another key order),
  the rollback through the shipped writer, a second owner's row standing, the conditional write (P2002 "exists"; a
  replace only of the identical value), DELETE … RETURNING and P2025, both of the third review's MAJORs through the
  shipped writers (a raced opening writes nothing; a lost-reply close is recorded and a later opening stands), the
  fourth review's M1 (a failed first read and a failed delete record nothing), and REAL CONCURRENCY on separate
  connections — five openings over an absent switch, five over one stale row, three closes at once: exactly one of each
  stands, one close recorded. Guard `test:marketing-settings` (17 claims, in predeploy after `test:marketing-wordings`),
  `red:marketing-settings` 43/43 against a baseline it first proves green; campaign-compose §18.6 rewritten for E13 (red
  326/326); campaign-estimate 2.5 seeds TZS 7.50 so the record is told apart from a default (red 27/27); the 64 guards
  and red controls that read a touched file (test:config, test:config-audit-diff, test:config-hydration-gate and
  test:erasure among them), re-run on `0652f61f` (the helpline ruling, pushed meanwhile by another session) on the final
  code — 61 green; `test:audit-drain` flaked once under a parallel Postgres probe (9 of 10 appends queued at exit) and
  is green on three runs alone; `test:admin-section-gate` (needs a server on :3009) and `test:kyc-copy-truth` (a Swahili
  line on the privacy page, untouched) are red on `main` as well. The 56 guards that read the docs touched: the
  tracker's four green (`red:marketing-setup-plan` 28/28, `test:tracker-hygiene` 14/14); `test:failure-reasons` red on a
  clean checkout of `main` too (a raw server string in the agent application's toast); `red:social-panel` held 8/8 (it
  exits 1 by design); `red:house-bot-c5` refuses a tree whose COMPLIANCE-DECISIONS differs from HEAD, so it ran on the
  commit itself, beside the push: 99 caught, 0 wrong-assertion, 0 missed, 0 stale, 0 files left dirty.
  STEP 44 · U49s-2 — THE "MARKETING SMS SENDING" CARD ABOVE THE RAIL AND THE "MARKETING SMS" TAB (OD64; ENGINE-SPEC
  §4.3) — the screens over U49s-1's writers, so U49s is whole. On Admin → System the card stands above the rail beside
  Maintenance mode (a kill-switch, §K 7d): the switch's state in words (off; on until HH:MM EAT, by whom; switched
  itself off at; a stored row this version does not read; a switch that could not be read), the limits line (TZS 6 per
  SMS · TZS 20,000 kept for login and withdrawal codes · at most TZS 10,000 per campaign · sends 08:00–20:00 EAT — for a
  viewer who may not read money, the window only), "Switch on…" — six durations as radios, 2 hours every time it opens,
  the closing time in EAT read out as the choice changes — and "Switch off now", offered while it is on and for a
  malformed or unreadable switch too (an opening stamped ahead of this clock blocks a switch-on as `already_open`, so the
  owner must be able to clear it). The fifth tab "Marketing SMS" holds the settings form (every problem at once under
  its own box, the window as two quarter-hour selects, the measured price beside the price box, Save off with its
  reason, the pending bar, the leave guard). Three `requireOwner` actions (the switch-off under its own label); both
  writers and the setter decide again; the dialog stays up, its Confirm spinning, until the server answers, and focus
  then lands on the state sentence. ⭐ No money is handed to a viewer who may not read it — the owner included: an owner
  whose own money.figures cell hides money (D3) reads text, never a form whose money boxes are blank and can never save;
  a record that cannot be read in full shows no value to anyone; what only the form prints (a save ever made, the
  floor, the measured price) goes with the form only; and the page asks ONE loader, `loadSmsMoneyForViewer` — one read
  of the stored role answers the owner and the money — never the decider itself. ⛔ A refused switch-on says "weren't
  switched on" only for a refusal made before this click wrote anything; one that wrote and was taken back "didn't
  complete"; anything else is "Couldn't confirm whether marketing SMS are on" — the words live in a pure module that S14
  runs against every writer path; no title repeats its body or contradicts the card, and a refusal stays until
  dismissed.
  ⚠️ By default only the owner may open Admin → System (no other role holds the ops view): another role sees the card —
  the buttons disabled with the reason beside them — only once the owner grants it on Roles.
  🔎 FOUR REVIEWS BEFORE THE PUSH. A read-only review of the drafts (four lenses, every finding put to three skeptics;
  40 upheld) found two build breakers and a drive that could never have passed (the kit dialog is `alertdialog`, danger
  toasts are `role="alert"`, the loading hold caught the section layout that wraps the ghost) — all fixed before the
  code entered the repo. A visual review of every capture (19 findings) — fixed: the stamped-ahead refusal said "already
  on" over a card that says Off (now "Clear the stored switch first"; one that lands behind a loaded page is "Switched
  on since this page loaded"), a title that repeated its body, "TZS" wrapping away from its amount on a phone, the
  read-only settings ungrouped on a phone, and four captures that did not frame what they were about. A last review of
  the code as applied (five lenses, each finding put to three skeptics) upheld four, all fixed: a phone number written
  in groups could be named as who switched it on (now four numerals in a row, or more than six in all — the ops door's
  own limit); no suite ran the money loader itself (S11 now drives it, its reads injected: no role, a no, a decider
  that throws — no money and no walk; the history walked for the owner's form only); the page read the role twice; and
  — older than this unit, owed (◐ 0) — the SMS credit tile shows its amounts to every viewer. Twenty of its checkers
  were cut off by a session limit, so its five accessibility findings were checked by hand against the kit, and fixed:
  the durations became radios inside the dialog (the kit Select's list is portalled outside the aria-modal dialog,
  hidden from VoiceOver, and the dialog's Escape closed it whole — kit-wide, owed), the dialog holds until the answer,
  focus lands on the new state, refusals stay, and the closing time is a polite live region. A last review of those
  fixes found no blocker or MAJOR; its five minors and five nits were fixed: the durations locked while the server
  works; a switch-on that wrote and was taken back now "didn't complete" (it was never "weren't switched on");
  `already_open` and "already off" are worded from the server's read AFTER the answer (a stale row three deletes could
  not remove is said as such, never "It was already off."); the card's words moved into a pure module and run against
  every writer path in memory (S14); the drive now holds the action's reply to prove the dialog holds, finds a refusal
  still there after 6 s, drives "already off" and fails on any browser exception; a role read that fails is said as
  such, never as "only an owner can"; the ops door's `by` is screened again as it is read; and two titles that echoed
  their bodies were reworded.
  ⭐ DRIVEN FOR REAL: `qa:marketing-settings` on a local server backed by a scratch PostgreSQL 18.3 — the switch opened
  and closed through the card, every change read back IN SQL (the row's three keys, the "opening"/"opened"/"closed"
  COMPLIANCE rows, `was: open` and `was: malformed`), a malformed, an expired and a stamped-ahead row, an opening that
  lands behind a loaded page, the durations chosen by the arrow keys, the dialog held — busy, its durations locked,
  Escape refused — while the action's reply is held 2.5 s, "already off", a refusal still on screen after 6 s, every
  settings refusal at once, a save, a stale save refused, a half-read record, GROWTH (no money) and COMPLIANCE (money,
  not the owner) viewers granted the ops view in the scratch cluster, the loading ghost, and no uncaught exception in any
  page — 184/184 at 1280 and 360 (+ reduced motion), every capture opened and read. The card's ghost is the card's height at both widths (200/200.25 · 272/272.25); ⚠️ the System page's older
  ghosts above it no longer match today's page — about 192 px at 1280 and 231 px at 360 — recorded as owed (◐ 0). Guard
  `test:marketing-settings` 20 claims (S6, S11 and S14 new), `red:marketing-settings` 72/72 against a proven-green
  baseline (29 new plants); the 140 light guards that read a touched file, on the final code: 122 green, and the same
  18 red that are red on a clean `main` too (red:decomment, red:icon-sizes(-slack), red:policy-lines,
  red:simple-journey-flag, red:social-home/-panel/-promo/-rel/-token, test:decomment, test:failure-reasons,
  test:house-bot-holder-lifecycle, test:kyc-copy-truth, test:orphans, test:red-anchors, test:stacking,
  test:type-scale) — none new; the slower ones one at a time: every red that plants into real files caught each of its
  defects and restored its files (chart-one-home 9/9, dal-parity 179/179, read-tiers 37/37, sms-cost-guard 53/53,
  support-contact 10/10, tax-report, unsaved-changes); the scratch-database suites green (cashout-price-guard,
  contacts-staging-db, house-bot caps · comms · console · engine · info-edge · migrations 661/661) but two that read
  none of this unit's code — test:house-bot-designation (one Postgres check of a self-exclusion dated today, refused in
  other words than it expects) and test:house-bot-money (hung starting its database) — re-run on a clean `main` beside
  the push, with red:house-bot-console alone (it needs over 15 minutes) and red:house-bot-c5 on the commit.

◐ HALF-DONE — started and not finished:
  0. U49s is WHOLE (STEP 43 + STEP 44). Owed from STEP 44 — each older than this unit's code, none of it reachable by
     default: (i) the System page's loading skeleton above the new card (the KPI row, Maintenance mode — written before
     the SMS credit tile grew its provenance and note lines) no longer matches the page, which drops about 192 px at
     1280 and 231 px at 360 when it swaps in: re-measure those ghosts against today's tiles (`loading.tsx`; the card's
     own ghost matches); (ii) the SMS credit tile (D7, widened by U39) shows the credit and its floor and alert amounts
     to every viewer of Admin → System, money.figures or not — reachable only once the owner grants another role the ops
     view: hand `smsCreditTile` the money answer (`loadSmsMoneyForViewer`) and drop every amount without it; (iii) the
     kit `<Select>` inside a `<Modal>` (hold-button, the contacts bulk bar, proposals) portals its list outside the
     aria-modal dialog, where VoiceOver cannot reach the options, and the dialog's Escape closes the whole dialog over an
     open list: portal into the enclosing dialog and let an open combobox take its own Escape (the switch's dialog
     avoids it with radios).
  1. U33a-G is 🟡, not ✅: G0 parity against the pre-change model and the twelve SOURCE-level plants in
     `gateWithDefect` are owed (§9 U33a-G).
  2. The 🔵 units owe their live proof, and none of it is code: the screens (U17, U20–U23, U36, U37) one look each as a
     GROWTH officer on www.50pick.tz (G7/G11 — a TOTP-enrolled GROWTH account, never Ali's own login: an owner account
     bypasses the very role checks those looks exist to prove); the readers (U25–U28) a real file through the import
     entrance, which is U30/U32.
  3. (closed in STEP 42: U37s's stale-line note was driven with U37c-2's Test card, and U37c is whole.)
  3a. Owed from U37c-1's review, each unreachable while licence outreach is closed, each to land BEFORE it is opened:
     (i) OD61 — the /admin activity feed shows COMPLIANCE rows to non-compliance viewers (restrict it before U43 writes RG
     lines in bulk); (ii) an account erased before it ever had a book row leaves no erased marker, so the gate reads it
     as a stranger (`erase.ts` should always append the erasure WITHDRAWN row — U16a); (iii) U33r, the agent-referee
     exclusion — typed tests reach any number no account holds.
  3b. Owed from U37c-2's review, same rule (before licence outreach is opened): the Lists card's 18+ confirmation
     (U33b-L, `list-basis.ts`) records the `adult.list` words CURRENT at the save, not the version the officer read —
     post the version and refuse a mismatch, as the typed test now does (§18.32).
  4. Three things Ali's 2026-10-05 answers created, none built yet: the registration box reworded (Q2); the
     agent-referee exclusion (Q8 → U33r). (G9, the price of TZS 6, is in force since STEP 43 — the settings record's default;
     the variable it replaced is gone, so nothing is owed on Railway.)
  5. Carried from S7c, needing a person: Ali to compare Admin → System's SMS credit with the Blackball portal; where
     Blackball stores SMS data (BLACKBALL-SMS.md §8). (The native Swahili read is CLOSED — management accepts the
     Swahili as written, 2026-10-07.)

⭐ THE FINAL RULE (Ali, 2026-10-07 — COMPLIANCE-DECISIONS § "2026-10-07 · Marketing SMS go to anyone with a phone —
  consent is not a condition"): anyone with a Tanzanian mobile number may be sent offers under the licence; consent is
  recorded when given but decides nothing; the lapse refusal (Q9) is reversed; licence outreach opens as soon as its
  checks hold; the sign-up box is REMOVED. Never the self-excluded, under-18s or players in RG standing.
⭐ MANAGEMENT'S ANSWERS (Ali for management, 2026-10-07, put to him in four rounds by S14 — COMPLIANCE-DECISIONS §
  "2026-10-07 · Management's answers for the first marketing campaign — a small pilot, no frequency cap, two-step
  sign-in off, and the stop link (owner rulings, put to Ali in the session)") — the authority for every point below:
  · THE FIRST CAMPAIGN: a small pilot (~200 players; ~115 accounts exist today, so in practice every reachable player);
    Claude drafts the Swahili message, management approves the exact words; sent as soon as ready (right after U52a,
    inside 18–25 October, Ali told first); the TZS 10,000 per-campaign limit kept.
  · NO PER-PERSON FREQUENCY CAP — management decides each campaign: U14 / D14 are CLOSED BY RULING, not built (one
    message per number per campaign stays).
  · ADMIN TWO-STEP SIGN-IN STAYS OFF, during campaigns too — nothing is owed before the first campaign.
  · NEW REFEREES are told "50pick may send you offers by SMS." (+ the stop sentence while the stop link exists);
    referees already promised "we never contact you for marketing" stay excluded (U33r).
  · THE STOP LINK — management's instruction: no stop link in offers and nothing said about stopping, in messages or on
    the policy pages; players keep the offers switch on Profile → Notifications; non-players get no way to stop (risk
    accepted). Basis: TRA and the Gaming Board, verbally — A WRITTEN COPY TO FOLLOW. ⛔ So U43b builds the stop link as
    ONE setting, on until the written confirmation is filed in that COMPLIANCE entry; the commit that files it switches
    the setting off and re-words the policy lines, the consent-wording ledger and the referee sentence to say nothing
    about stopping, keeping `/s/<token>` working for links already sent.
  · THE GROWTH TEST LOGIN (G7/G11): "QA Growth (Claude)", `qa.growth@50pick.test`, the phone Ali gave (in
    `.env.qa.local`, `QA_GROWTH_PHONE`; its password goes in `QA_GROWTH_PROD_PASSWORD` when it is created), no
    two-step, the Growth role unchanged — used by Claude only, to look.
OWNER ACTS — Ali's, in the order the path needs them (none of them blocks building). Since 2026-10-07 he approves each
  in the session and Claude saves it through the audited `ops:marketing-owner-save` door (pushed, STEP 50) — never his login:
  1. G4 · the nine wordings — ✅ APPROVED 2026-10-07 as written (saved once the door ships). G10 · the five public policy
     lines — ✅ APPROVED 2026-10-07 as written (saved once the door ships; re-worded to say nothing about stopping in the
     commit that files the stop-link confirmation, then shown to him again).
  2. G5 · the source line "Namba yako ipo orodhani kwetu." — ✅ APPROVED 2026-10-07 (saved once the door ships); then any
     draft made before it is re-saved (the composer says so on each one).
  3. ✅ DECIDED 2026-10-07: the Growth test login (above) — Claude creates it; admin two-step sign-in stays OFF.
  4. ✅ CONFIRMED 2026-10-07: the Marketing SMS defaults — TZS 6 per SMS (G9), TZS 20,000 kept for login and withdrawal
     codes, TZS 10,000 per campaign (G3), 08:00–20:00 EAT — nothing to save, they are the record's defaults.
  5. The approved test phone is Jay's (G7, ENGINE-SPEC §0.3) — confirmed by Ali 2026-10-05 ("we have already sent Jay a
     test SMS"). The live switch is opened for U52a's drive window only (G1), within the §11.4 ledger cap.
  6. G2 — the first real campaign: ✅ DECIDED 2026-10-07 (above); owed from him only the approval of Claude's draft text.
  7. The stop link's written confirmation (TRA / the Gaming Board, or an advocate's opinion) — management to send.

⚠ TRAPS — the ones that still bite (every one, with its story, is in the history file):
  ⛔ Every push to `main` is a LIVE deploy. `git commit --only <paths>`, a new file `git add`ed by name first; ⛔ never
     `git add -A`. `git fetch origin && git merge --no-edit origin/main` before you start and before every push.
  ⛔ VERIFICATION IS FOCUSED (Ali, 2026-10-02, and again 2026-10-05: "ignore previous fails, focus on ourselves"): a
     push runs the suites its change can reach, typecheck and the docs guards. Red suites elsewhere on `main` are not
     this lane's — never bump a ratchet to pass one. When a whole battery runs, compare the FAILURE SET with clean
     `main`, never the count.
  ⛔ A CONSENT SENTENCE IS EVIDENCE: rewording one means APPENDING to `src/lib/marketing/consent-wording.ts` in the same
     commit (`test:marketing-consent-ledger` prints what to append); never edit or remove an entry.
  ⛔ Cite a COMPLIANCE-DECISIONS entry by its heading title, never by an ordinal — same-date entries interleave.
  ⛔ `scripts/` is NOT typechecked: a model literal missing a new field fails only at runtime.
  ⛔ A stale `.next` makes every `/api/dev-test/*` route 404 on `next dev`: delete `.next` before every dev drive, and
     have every capture assert what it photographed. A screenshot count is not a screenshot — open and read each one.
  ⛔ `test:docs` fails on any `npm run <key>` or scripts path named in a doc that does not exist: name suites by key.
  ⛔ The database suites boot a scratch PostgreSQL this repo does not ship — on a new PC install it once with
     `npm i -D --no-save embedded-postgres@18.3.0-beta.17` (18.3, as production), or they fail in a second.
  ⛔ THE SCRATCH POSTGRES ON A FRESH WINDOWS PC (`db:scratch`, every `db:probe-*`): after `npm i -D --no-save
     embedded-postgres@18.3.0-beta.17`, initdb dies with 0xC0000135 (VCRUNTIME140_1.dll missing) or 0xC0000005 (the
     2018 MSVCP140 in System32, 14.13 — too old for the bundled ICU) when the PC lacks the current Visual C++ runtime.
     Fix without admin: copy a current Microsoft-signed set (`msvcp140.dll`, `vcruntime140.dll`, `vcruntime140_1.dll` —
     Edge's application folder carries one) into `node_modules/@embedded-postgres/windows-x64/native/bin`; or install
     the VC++ 2015–2022 x64 redistributable (an admin prompt). Found on OMEGA-COMPILE01, 2026-10-06.
  ⛔ The build can fail fetching Google Fonts (the network) — re-run it. On Ali-Blade15 every heavy job goes through
     `~/heavy-node-lock.sh` (its RAM fails under two); on another PC run heavy jobs one at a time.
  ⛔ Production has no QA admin: never sign in as Ali for a live check (G7/G11).
```

---

## §0a — THE SESSION PROMPT (copy-paste, any PC, no memory required)

> Paste everything between the lines into a fresh session on any PC with a 50pick checkout (step 1 finds it).

---

You are continuing the **MARKETING CAMPAIGN & CONTACTS SETUP** programme for 50pick.

**1 · Get the truth before you touch anything.**
```
hostname && git rev-parse --show-toplevel && git worktree list   # find YOUR checkout; never copy a path from a doc
git status --short
git branch --show-current          # expect: main, or this lane's own marketing-sN branch named in ✔ LAST SESSION
git fetch origin && git merge --no-edit origin/main   # works on a branch or a detached worktree
git log --oneline -5 -- docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md
npm run test:marketing-setup-plan   # the tracker cannot lie; if it fails, fix the board first
```
⚠️ **OTHER SESSIONS ARE WORKING IN THIS REPO AT THE SAME TIME, ON THEIR OWN PROGRAMMES.** So:
`git fetch origin && git merge --no-edit origin/main` before you start and again before every push (⛔ not
`git pull --ff-only`: it refuses on a detached worktree, and as soon as you have a commit and `main` has
moved — exactly when you need it); `git commit --only <paths>` and ⛔
**never `git add -A`** — files you did not touch belong to someone else; and ⚠️ **the checkout may be on
another branch, or carry their uncommitted work.** Check `git branch --show-current` and
`git status --short` FIRST. If it is not on `main`, or their edits are in the tree, ⛔ do not switch the
branch and do not stash — work in your own worktree instead (`git worktree add <dir> origin/main
--detach`), commit there and push `HEAD:main`. ⭐ If ✔ LAST SESSION names this lane's OWN worktree and
`git status --short` is empty there, reuse it rather than making a new one: `git switch -c marketing-sN
--track origin/main` (N = your session) — it already has real `node_modules`. A NEW worktree has none: run
`npm ci` in it through the heavy-node lock (step 4), ⛔ never a junction — `next dev`/`next build` refuse
one (§2 S2, S5). ⛔ Do not remove a worktree with `--force` in this repo: it
has deleted `node_modules/.bin` through the junction before (if `npm run` then says *"tsx is not
recognized"*, run `npm install`; `node scripts/<file>.mts` works meanwhile).

⭐ **PUSH YOUR WORK LIVE AS YOU GO — one unit, one commit, one push.** Do not hold a branch of finished
units to merge later: this repo's trunk moves under you and other sessions are pushing to it. Each unit
lands on `main`, deploys, and is re-measured live before its row is ticked (§11.4). A unit that is not
pushed is not done.

The planner and the progress tracker are ONE file: `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`.
§0 is where we are, §1 is the board, §9 is the work, §10 is the order. Nothing else — not your memory,
not a summary, not another document — decides what is done. If the path-scoped `git log` above shows a
commit to THIS FILE newer than the commits §0's ✔ LAST SESSION names (other than that session's own
closing docs commit), another marketing session is in flight: **stop and ask Ali**. Commits from other
programmes on `main` are normal and are not a stop.

**2 · Read, in this order.** `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md` §0 → §1 → **§3a and §3b
(what the SMS rail actually does now, and what the vendor is — these replace premises the plan was
written on)** → §5 (hard rules) → §6 (what you may not change) → the two units named in ▶ NEXT, in §9.
Then `docs/BLACKBALL-SMS.md` §1 and `CLAUDE.md`. ⛔ Do not read the whole `docs/` tree; this file is the
contract.

**3 · Say the plan back.** Before writing code, state in one message: the two units, the guard each one
gets, the RED control that proves that guard, and what you will measure. If a unit will not fit in half a
session, SPLIT IT FIRST and write the split into §2 — do not start and leave it half-built.

**4 · Work, exactly this way, one unit at a time.**
- Write the guard **before** the feature, and prove it RED against the real defect (in-memory plants, or
  anchors in `scripts/anchors/`), then green. ⭐ The question for every guard: *"would this still pass if
  the feature were absent?"* If yes, the guard is decoration.
- Two stores or it does not exist: every new `db.*` namespace lands in `src/lib/server/store.ts` AND
  `src/lib/server/prisma-dal.ts`, with **named** types (never an inline object literal in a DAL
  signature), and `test:dal-parity` gets a new section with its own planted-key control.
- Migrations are expand-only. A value added to an **EXISTING enum** (`ALTER TYPE … ADD VALUE`) **ships in
  its own migration one commit before anything writes it** — Postgres refuses to use it in the transaction
  that adds it (`55P04`, measured at S3b); this bound U35/D22's `MARKETING`, which shipped ALONE as U35a
  (S10). OD9's `UNKNOWN` is void (no enum migration — §4 OD9). A brand-new enum TYPE may be created and used
  in one migration (U6 did).
- Swahili is the DEFAULT player language: every player-facing string is Swahili first. The admin console
  is English chrome with a Swahili gloss on headings only, and ⛔ a `sw` gloss is copied verbatim from
  text already shipped — never invented.
- Run the unit's own suites, then `npm run predeploy`. New suites are NOT auto-added to `predeploy` —
  add the key to the chain in `package.json` in the same commit, or it never gates anything.
- ⛔ **HEAVY NODE GOES THROUGH THE LOCK.** On Ali-Blade15 (its RAM bluescreens under two heavy jobs) every
  `next build` / `next dev` / `next start`, `npm run typecheck`, Playwright drive, `npm run predeploy`,
  `node scripts/test-all.mjs` and every file-mutating `red:*` harness runs as
  `bash ~/heavy-node-lock.sh run marketing-sN <command>`. Check `bash ~/heavy-node-lock.sh status` first;
  it waits for the holder by itself. One `tsx` suite is light. On a PC without that script, run heavy jobs
  one at a time. ⛔ Never pipe a gate into `tail` (`… | tail` exits 0 while the runner exited 1): redirect
  to a file and read `$?`.
- Visual units: drive the states listed on the unit at **1280×800** and **360×780**, plus
  `prefers-reduced-motion: reduce`, keep `HeadlessChrome` in the UA, and **open the screenshots and read
  them**. A green assertion is not a picture.
- Commit with `git commit --only <paths>` (⛔ never `git add -A`). The commit that ships a unit sets its
  §1 row to 🔵 with the SHA (no date) and rewrites §0. After the live re-measure below, a docs-only commit
  sets ✅ with the date, appends §2, and updates the `docs/NEXT-PLAN.md` ▶ 0a counts and its Next cell.
- Push, wait for the deploy, then re-measure on `www.50pick.tz` and confirm you are on the new build by
  `?dpl=<sha>` on any `_next/static` asset or the preload `Link` header
  (`curl -sI https://www.50pick.tz/ | grep -o 'dpl=[0-9a-f]*'`). ⚠️ `<html data-dpl-id>` is absent on some
  routes (measured 2026-09-25 on `/auth/register`); it is a fallback only. ⭐ Prove it by DISCRIMINATION —
  a check that passes before and after proves nothing. Only then may the row read ✅ with today's date.

**5 · Stop and ask Ali ONLY for these.** Everything else is already decided in §4 — decide and proceed.
- Any of the legal questions in §4a still open moving from "safe default" to "we may now do X". (OQ1, OQ2
  and OQ4 were answered by Ali on 2026-09-26 and OQ6 on his delegation the same day — see §4a.) ⛔ This
  includes OQ11: counting a "yes" given under the old "product updates / Product news / Nipe matangazo"
  wording as SMS-marketing consent is Ali's call alone; the built default refuses it.
- Spending real money: any live send beyond the ledger cap in §11.4, or a balance top-up.
- Anything that would send a real marketing SMS to a real player for the first time.
- A change to `tzPhone`, `isLockedOut`, the money rails, or anything in §6's must-not-change column.

**6 · Close cleanly.** Rewrite §0's fenced block (▶ NEXT, ✔ LAST SESSION, ◐ HALF-DONE, ⚠ TRAPS you hit),
tick §1, append a §2 row, update the ▶ 0a counts in `docs/NEXT-PLAN.md`, run
`npm run test:marketing-setup-plan` and `npm run test:tracker-hygiene`, push, and end with:
**"We're done here. Run the prompt in a new session."**

---

## §1 — STATUS BOARD

**Legend:** ⬜ not started · 🟡 in progress · 🔵 shipped (commit exists, not re-measured live) · ✅ verified
live · ⏸ held (reason required).

⛔ A row may only claim what it can show. ✅ needs: a commit SHA that exists, a measured `before → after`,
a Guard key that resolves to a script on disk, `yes` plus the backticked `red:` key that proves it in the RED column, and a live date.

| Unit | Kind | Status | Session | Commit | Before → After (measured) | Guard | RED | Live ✅ (date) · notes |
|---|---|---|---|---|---|---|---|---|
| U1 | pure | ✅ | S1 | c0552156 | 4 malformed numbers billed as send attempts, one of them 16 digits → refused `BAD_MSISDN`, no row, no request | `test:phone-normalize` | yes · `red:phone-normalize` | 2026-09-25 · live on `934f8d80`: pasting `00255712345678` into /auth/register carries `712345678`, ⛔ not the pre-fix `255712345` |
| U2 | pure | ✅ | S1 | db44ebf3 | no operator map at all, and the table drafted for it had 5 of 19 rows wrong → TCRA v1.16, seven verdicts, 064 refused, two formatter copies collapsed to one | `test:tz-msisdn` | yes · `red:tz-msisdn` | 2026-09-25 · live on `db44ebf3`: the moved formatter groups 3-3-3 from its new home at 1280 and 360, and the deploy building at all is the client-graph proof |
| U3 | pure | ✅ | S2 | ccc32526 | no segment arithmetic anywhere and the only GSM-7 table locked inside a server module → one pure table, PACKED segments, the gateway delegating to it | `test:campaign-compose` | yes · `red:campaign-compose` | 2026-09-25 · live on `ccc32526`. The delegation is proven by EXECUTION — `test:otp-delivery` and `test:sms-cost-guard` drive the real send path through `smsCodingFor`. ⛔ Biller reconciliation is U52 |
| U4 | pure | ✅ | S2 | b760fefe | no sender identity and no RG footer in any SMS, and a body-only quote would be 49 septets short → footer computed, counted and un-removable; operator budget 111, not 160 | `test:campaign-compose` | yes · `red:campaign-compose` | 2026-09-25 · live on `b760fefe`; the U2 drive re-run green on it, so the new modules did not break the client bundle |
| U5 | guard | ✅ | S3 | 64d6bc05 | a 15-section helpline guard with NO red control at all, and a product half already built → 4/4 mutations caught each on its own assertion | `test:support-contact` | yes · `red:support-contact` | 2026-09-25 · live on `64d6bc05`: every helpline-LABELLED link on /legal/responsible-gambling dials the pinned 0800110011, while the support desk legitimately differs. D6 stayed ⬜ until its substance (OQ4) was answered — ✅ closed 2026-09-26: "the right helpline is ours", i.e. the number 50pick already publishes (which the site labels the national helpline) |
| U6 | data | ✅ | S3b | 6429f86f | no consent ledger and no SMS suppression list anywhere, and `marketingOptIn` a bare boolean with no channel, wording, evidence or history → two append-only stores in BOTH DALs with named types, the 82nd migration generated offline and APPLIED on real PostgreSQL 18.3 (10/10, two controls), dal-parity 1380 → 1440 | `test:dal-parity` · `test:marketing-consent-ledger` | yes · `red:dal-parity` (24/24) · `red:marketing-consent-ledger` (4/4) | 2026-09-25 · live on `32067c92`: production starts `prisma migrate deploy && next start`, so serving AT that SHA is the migration having applied to the live database. 7/7 on the drive, three of them controls — and ⭐ the Swahili sentence the ledger stores VERBATIM is the sentence /auth/register really shows. ⚠️ **Corrected 2026-09-26 (audit):** true for a SWAHILI viewer only — every REGISTRATION and PROFILE row from this unit until the audit-fix pass stored the Swahili sentence and locale `SW` whatever language the player saw (append-only, so those rows stay; COMPLIANCE-DECISIONS § "2026-09-26 · Marketing consent names SMS"). 🔴 **Found at S6:** its migration also dropped other lanes' retired schema and the eight trigram search indexes — no consequential data lost, repair first in S7 (§0) |
| U7 | engine | ✅ | S4 | e14e4204 + b60dc492 | nothing asked whether a number may be marketed at all, and a gate written the obvious way would have found NO player: `User.phoneE164` is `+255…` while the marketing key is bare `255…`, unequal for every input → one ordered gate, suppression first, with the bridge pinned in both directions and four mutually exclusive outcomes in one run | `test:marketing-consent` | yes · `red:marketing-consent` (4/4) | 2026-09-25 · live on `b60dc492`. ⚠️ The gate has no HTTP surface until U42, so its behaviour is proven by EXECUTION (15 assertions, 5/5 red) rather than by a live drive — stated plainly rather than dressed up as one. The deploy landing IS the build proof, and the U6 drive re-ran green on it |
| U8 | visual | ✅ | S4 + S5 | 5942332f + 80a8b0a4 | the resubscribe button U8 promises COULD NOT HAVE WORKED — suppression rows are never deleted and U7's gate asks suppression FIRST, so "start them again" would have reported a success while the row refused for ever → a row is never DELETED but may be SUPERSEDED (`liftedAt`), one expand-only migration proven from an EMPTY database on real PostgreSQL 18.3, and stop → start → stop proven in one run with the GATE asked after every step | `test:marketing-optout` · `test:dal-parity` §17/§18 | yes · `red:marketing-optout` (8/8) · `red:dal-parity` (35/35) | 2026-09-25 · live on `80a8b0a4`: production starts `prisma migrate deploy && next start`, so serving AT that SHA is the 84th migration having applied to the live database. The production drive is 14/14 and REFUSED to report until it reached the SHA — `noindex` proven by DISCRIMINATION (`/s/<token>` answers `noindex, nofollow` while `/legal/responsible-gambling` answers `index, follow`), and a real signed-out browser LANDS on `/s/` while `/wallet` is sent to `/auth/login`, so the no-login check can fail. ⭐ Six states driven at **1280 and 360**, plus `prefers-reduced-motion: reduce`, and the screenshots OPENED AND READ — 47/47, and reading them found a defect no assertion had: the refusal told the reader to "tap once to stop" on a page that renders NO BUTTON. ⚠️ **The token-bearing states are driven against a local `next dev`, not production, and that is stated rather than dressed up:** nothing mints a token until U42, and the dev-test seed route correctly 404s in production. What production proves is that the page serves, refuses a bad token with no false success, and is NOT sent to sign in. ⚠️ **Corrected 2026-09-26 (audit):** S5 photographed FIVE states (invalid, valid, stopped, resumed, already), as full-page shots; loading and error were never driven. The audit-fix pass extended the drive (loading, error, a forced first-visit primer, a lower-case link, viewport tiles at 1280×800 and 360×780) — §9 U8 |
| U9 | guard | ✅ | S6 | 4dfea77e | there was NO send loop to put the gate in — nothing looped over recipients and U7's gate had no caller → `dispatchSlice`, the loop's innermost step: the gate asked per recipient immediately before the one send, a refusal `skipped` never `failed`, settled by key; and a two-slice contract in which an opt-out, a self-exclusion and a break between the slices never reach the wire — the gate hoisted to list-build time SENDS the opted-out number | `test:marketing-consent` | yes · `red:marketing-consent` (13/13 — 8 gate + 5 loop, each on its own assertion) | 2026-09-25 · live on `4dfea77e` (production served it at 21:38 UTC). ⚠️ **RE-SCOPED, stated rather than dressed up:** there is no production loop until U43, and `send` has no default until U35 gives the wire a purpose, so the behaviour is proven by EXECUTION (36 assertions, a real opt-out through `stopMarketing`, a real `selfExclude` and `coolOff` between slices, a wire answering in reverse). U43 joins the contract as a second driver (§9 U43). What production proves is that the changed module chain LOADS: `/s/<token>` imports optout-service → consent → rg, and at `4dfea77e` it renders the Swahili invalid-link refusal with `noindex` |
| U10 | engine | ✅ | S6 | f1ad4417 | a player who took a one-hour break was refused for ever as `account_status`, a restored self-excluder for ever, harm markers were never asked, and U7's "deciding must not write" fix still REWROTE any RG row whose pending limit had come due → one read-only standing predicate: an exclusion lifts only on an officer restore + six calendar months + a consent after the restore, a break only on a consent after it ended, a harm marker refuses for its window and an unreadable check refuses | `test:rg-doors` · `test:marketing-consent` | yes · `red:rg-doors` (19/19 real-file mutations, 8 of them on `marketing/rg.ts` and the gate) · `red:marketing-consent` | 2026-09-25 · live on `12c37673` then `4dfea77e`. ⚠️ No HTTP surface until U42, so proven by EXECUTION (`test:rg-doors` §8, 37 assertions, both lifts proven to EXIST, a control proving the no-write fixture really exercises the write path) — not by a live drive. ⚠️ Harm markers are NOT standing (nothing persists a flag) — an owner item in §0, not a hidden gap. D10 stays ⬜: an owner ruling |
| U11 | engine | ✅ | S7 | 40b83931 | nothing asked age before a marketing message → one age definition (`ageOnPlatformDate`) in the gate after harm markers: under 18 `age_minor`, missing `age_unknown`, a contact `age_unknown` until U33 records an attestation (none is inferred) | `test:marketing-consent` | yes · `red:marketing-consent` (16/16 — incl. a null date of birth treated as adult, a contact marketed with no attestation) | 2026-09-26 · live on `40b83931`. ⚠️ No HTTP surface until U42, so proven by EXECUTION (adult / minor / unknown as a three-outcome property) — the deploy is the build proof. ⚠️ The 2026-09-26 audit found the gate clearing a player KYC had refused as UNDERAGE; the audit-fix pass asks the identity check too (§9 U11) |
| U12 | docs | ✅ | S7 | 40b83931 | §4 of /legal/responsible-gambling promised "no marketing to players under 25 in vulnerability segments" and "no sign-up nudges in the late-night window" with NO code behind either, and the page had no version pin → the under-25 segment DEFINED and BUILT (under 25 + a self-exclusion or break ever on record, no lift until 25), §4 re-versioned v2026-09-26 to name exactly what the gate runs, the late-night bullet CUT; ruled on Ali's delegation (COMPLIANCE-DECISIONS § "2026-09-26 · RG Policy v2026-09-26") | `test:rg-policy` | yes · `red:rg-policy` (7/7) | 2026-09-26 · live on `40b83931`, proven by DISCRIMINATION in all three languages: each locale serves its OWN new §4 (and none of the other two), the new version, and neither the old version nor the late-night promise; screenshots at 360 (sw, zh) and 1280 (en) OPENED AND READ — 0px horizontal overflow, the bullets wrap inside the column |
| U13 | engine | 🔵 | S14 | 53fd74ad | no send path asked the hour → ONE window rule read by the send loop (held `quiet_hours`, or `window_unreadable` when the hours cannot be read), the test send and the composer, judged again at the wire; new hours refused while the published RG line names a time they would not keep | `test:marketing-window` | yes · `red:marketing-window` | quiet hours. LIVE `b6652201` (§0 STEP 49): `qa:marketing-compose` window-closed with the dev clock door. 🔵 until a campaign's slice runs on production (U43b). |
| U14 | engine | ⏸ | — | — | — | `test:marketing-consent` | — | frequency cap — ⏸ HELD BY RULING: management, 2026-10-07, wants no per-person cap ("we decide, we are management"; COMPLIANCE-DECISIONS § "2026-10-07 · Management's answers for the first marketing campaign", item 2). Not built unless management asks. |
| U15 | guard | ⬜ | — | — | — | `test:marketing-engine` | — | D15 one send path |
| U16 | data | 🟡 | S13 | d2fe9731 | — | `test:campaign-privacy` · `test:retention` | yes — `red:campaign-privacy` (in-process) | erasure reaches it. U16a pushed 2026-10-07 (§0 STEP 45): erasure, the access export and retention reach the campaign records and the opt-out links, plus the erasure marker; U16b (SmsMessage's retention and export reach, the lapse's ledger row, the import-row expiry, the never-finished campaign's trigger) follows. |
| U17 | visual | 🔵 | S9 | 7bef9f97 | /admin/contacts did not exist, and nothing compared a nav item's domain with the page's → six doors (the page carries its own `AdminPageGate`), `test:rbac` §7b holds menu = page, the skeleton equals the real block (230.38 px / 272.63 px, delta 0) | `test:rbac` · `test:admin-section-gate` · `test:admin-nav` | yes · `red:rbac` (2/2 in-process, S10 — the ROUTE_DOMAINS row deleted; the nav item's domain edited) | live since S9's push (production serves later builds); ✅ owes ONE admin-session look at Growth → Contacts on www.50pick.tz — production has no QA admin, only Ali's login (⛔ never used) |
| U18 | data | ✅ | S9 · S10 | aa2767e9 | there was no contact book, and erasure reached no marketing store — an erased player's sign-up GIVEN decided on Postgres, and neither export had a marketing section → the three tables in both DALs (U18a `fb194038`); erasure appends WITHDRAWN for every number the person consented with (never a stop, so a recycled number's next owner can consent) and empties every book row by link or number; both exports carry the book, the ledger and the stop history from the account's creation, through one allowlist | `test:erasure` · `test:dal-parity` | yes · `red:erasure` (29) · `red:dal-parity` | 2026-10-01 · live: U18a since S9's push (`fb194038`); U18b + both review rounds (`0e68d59e` → `2d4ca3b6` → `aa2767e9`) inside production's `1931d4c3` (proved by DISCRIMINATION: `aa2767e9` absent from the `2d4ca3b6` build, present in `1931d4c3`). No erasure is run on production by a drive (no QA account may be erased), so the behaviour is proven by EXECUTION — `test:erasure` §12, 338/338 |
| U19 | guard | ✅ | S10 | addf5351 | a contact number had no registry entry, and the ONE mask printed every bare `255…` key as `2557••••01` (the operator digit) — in the SMS refusal audit and the delivery-receipt audit already → `contactPhone` (a CONTACT id, targetType MarketingContact, identity.contact: GROWTH sees `+255••••01` and no control); `maskPhone` reads a bare key as the `+` form, platform-wide; "Copy number" is a reveal through the same audited action, on the `read` branch only | `test:read-tiers` | yes · `red:read-tiers` (35/35, +4) | 2026-10-01 · live on `2d4ca3b6` (proved by DISCRIMINATION: production served `45794cc9` before the push, `2d4ca3b6` after). ⚠️ No live surface to look at yet — no contact exists on production (no writer until U22/U25) — so, like U11, proven by EXECUTION: read-tiers 8.23 runs the mask on a bare key. ⚠️ The export half lands with the export (U34), which must mask through `maskPhone` and name its column (read-tiers 8.9/8.10 are the precedent) |
| U20 | visual | 🔵 | S10 | 733522d3 | /admin/contacts showed only an empty state and no store could be listed → the book, server-paged (page + summary in both twins), searchable by a WHOLE number in any spelling or by name (never a part of a number), whole-book KPIs, nameless-last sort with an id tiebreak, the page clamp, every number masked, and NO row-by-row player signal for a role that may not read a number (D19, found by the design critic before shipping) | `test:contacts-page` | yes · `red:contacts-page` (8/8, in-process) | awaiting the deploy; drive 65/65 at 1280 + 360 + reduced motion, ghost = real by measurement (KPI band 110/236 px, card top 350/476 px) |
| U21 | visual | 🔵 | S10 | c0cce85a | the book could not be filtered → one rail of six axes over the ONE resolver, role-shaped (a masked viewer gets no Consent or Source axis), never gated on rows | `test:contacts-page` · `test:filter-language` | yes — `red:contacts-page` 25/25 (in-process, first, M11) · `red:filter-language` 39/39 | the filter rail, and its review follow-up `bb83acf9`. Pushed — its live check needs an admin session on production (G7 / G11). |
| U22 | visual | 🔵 | S10 | e4f04528 | the book could not be written → add and edit ONE contact: the unique index is the duplicate check, no consent control, the cache mirrored, compare-and-set edits, erased rows refused | `test:contacts-form` · `test:dal-parity` | yes — `red:contacts-form` 23/23 (in-process) · `red:dal-parity` §22 | add / edit. Pushed — its live check needs an admin session on production (G7 / G11). |
| U23 | visual | 🔵 | S10 | 2809af63 | the book could only be changed one row at a time → tick rows (across pages) or take all N matching (the FILTER, never ids) and tag, untag, list, withdraw, suppress or remove: the server recounts every time, set-based in both twins, proved on Postgres | `test:contacts-bulk` · `test:dal-parity` | yes — `red:contacts-bulk` 16/16 (in-process) · `red:dal-parity` §23 | bulk. Pushed and serving (`36aa9bf0`, §0) — its live check needs an admin session on production (G7 / G11). |
| U24 | engine | ✅ | S10 | c792901e | a filter reached the book by four paths and the consent/stop cache was written by no writer → ONE resolver (`audience.ts`) and every writer of the ledger or the stop list mirrors the cache (`contact-cache.ts`) | `test:contacts-audience` | yes — `red:contacts-audience` 21/21 (in-process) · `red:dal-parity` §21 | ONE resolver. Commit 1 `0dc25b98` (the resolver, four DAL members in both twins, the list on it, dal-parity §21); commit 2 `c792901e` (`mirrorContactCache`, called by the opt-out page, the ledger append, the profile lift, erasure and the dev seed; §6 executes each writer; the Postgres probe shows a stale row put back and the second call a read). LIVE 2026-10-02 — production serves `0e60952a` (23:19 UTC); `/s/` renders on the new module graph (the opt-out service imports the mirror). No contact link can be minted before U42, so the writers are proven by execution: §6 on the memory twin, probe 5.1–5.3 on Postgres. |
| U25 | pure | 🔵 | S10 | 928265b9 | no CSV reader → an incremental RFC 4180 reader: the delimiter voted outside quotes on the first record, sep= honoured, the encoding sniffed, the BOM stripped once | `test:contacts-import` | yes — `red:contacts-import` 169/169 (in-process) | CSV. 🔵 until U30/U32 parse a real CSV on production — nothing reaches it before then. |
| U26 | pure | 🔵 | S10 | b4faac34 | no reader for a phone's contact export → a streaming vCard reader: both continuation rules in one walk, every card counted, card ordinals as lines | `test:contacts-import` | yes — `red:contacts-import` 120/120 (in-process) | vCard. 🔵 until U30/U32 parse a real .vcf on production — nothing reaches it before then. |
| U27 | guard | 🔵 | S10 | 2438d66a | an XLSX could only be read by trusting exceljs with whatever arrived → an exact size gate, a capped zip pre-pass and one typed cell switch, server-side, and the boundary that proves exceljs never reaches the browser | `test:contacts-boundary` · `test:contacts-import` | yes — `red:contacts-boundary` 28/28 · `red:contacts-import` 211/211 (in-process) | XLSX server-only: U27a `0dc25b98` + U27b `2438d66a`. 🔵 until U30 reads a real .xlsx on production. |
| U28 | pure | 🔵 | S10 | a0535f80 | no shared field list → ONE field list, limits table and tag rule for the form, bulk, import and export, and the samples proven back through every real reader | `test:contacts-import` | yes — `red:contacts-import` 211/211 (in-process) | one field list: U28a `0dc25b98`, U28b `a0535f80` (CSV, Swahili, sep=;, vCard round trips) and its xlsx case through U27b's reader (X13, `2438d66a`). 🔵 until U30 mounts the import entrance and its sample button. |
| U29 | data | ✅ | S10 | dbdc0018 | an officer's contacts file had nowhere to wait between reading and importing → ONE staging model in both twins: a compare-and-set cursor applied first with the inserts, a keyset on ordinal, both caps before any read, keys re-derived on the server, a sweep that never touches a paused commit — proved on Postgres in two processes | `test:dal-parity` · `test:contacts-staging` | yes — `red:contacts-staging` 16/16 (in-process) · `red:dal-parity` §24 | staging. LIVE 2026-10-02 06:42:34 UTC — production serves `81102ce8` and its deploy log applied `20261002130000_contact_import_staging`; the staging probe proved the resume in two processes on Postgres. |
| U30 | visual | 🔵 | S15 | 493e58bd | no file could be imported — the readers and the staging table reached no screen → the import dialog (a file or a paste → the columns, a headerless file accepted → the upload → THE CHECK: five boxes that add up to the file, nothing written; no player box for any role, S15-2) | `test:contacts-import` · `qa:contacts-import` | yes — `red:contacts-import` 308/308 (in-process) | C3 of `CONTACTS-SCREEN-PLAN.md`. The drive 761/0 over 28 generated real-world files at 360 and 1280. |
| U31 | engine | 🔵 | S15 | 493e58bd | decide() had no facts loader and no screen → the facts read from the authority in bulk (snapshotsAmong + the §25 reads), the whole run's first line per number in ONE grouped read (firstLinesAmong), keep · use the file's · fill blanks with the changes listed and per-row exceptions — for a viewer who may read numbers only (S15-10); an account's row never changed (S15-11) | `test:contacts-import` · `test:dal-parity` §29 | yes — `red:contacts-import` · `red:dal-parity` (in-process; a copied tree) | C5. U31-A `0dc25b98` (the pure rule). |
| U32 | visual | 🔵 | S15 | 493e58bd | nothing wrote the book from a file → the commit loop: 500-row steps, each ONE transaction with a compare-and-set on the cursor; the bar is the server's cursor; resumable after a closed tab, a reload or a deploy; stop · resume · cancel; bets first (busy waits); stuck runs swept after 14 idle days and adoptable by an admin (S15-12); the result and its failures | `test:contacts-import` · `test:contacts-import-db` (PostgreSQL 18.3, 45/0) | yes — `red:contacts-import` · `red:dal-parity` §29 | C4. 20,000 rows settled in 9.7 s on PG 18.3 (p95 0.19 s a step). |
| U33 | engine | 🟡 | S10 | 0dc25b98 | — | `test:marketing-consent` · `test:marketing-wordings` · `test:dal-parity` §27 · `test:policy-lines` · `test:licence-outreach` · `test:marketing-consent` §licence-basis | `red:marketing-consent` · `red:marketing-wordings` (in-process) · `red:dal-parity` §27 · `red:policy-lines` · `red:licence-outreach` | basis at import. U33a-catalog landed (`0dc25b98`); U33a-0, the pre-ledger census = 0 (§0 STEP 29); U33w, the wordings editable and approved on Admin → System, every saved version kept (§0 STEP 30) — G4 is now "saved on the card"; U33a-L, the list-basis table in both twins, a list's one standing its newest recording (§0 STEP 31); U33p, the public policy lines editable on their own tab, today's words printed until a save (§0 STEP 32) — G4/G10 are "saved on the card"; U33a-R, the licence-outreach record — the four opening checks, the two audited writers and the card under the policy lines, the row replaced whole so a close leaves nothing behind (§0 STEP 35); U33a-G, the gate that READS it — a basis on every ALLOWED, `no_basis` its own reason, the protections untouched by it, the decision table executed closed and open (§0 STEP 36, 🟡: G0 and the source plants still owed). U33a-P, the switch and the export (§0 STEP 37); U33b-L, recording a basis on a list — the writer and the Lists card (§0 STEPS 38–39); U37s, the source line stamped on every draft save (§0 STEP 40); U37c-1, the typed test's server path (§0 STEP 41); U37c-2, the Test card (§0 STEP 42) — the gate track is built. The engine and the panel follow. U33r (the agent-referee exclusion) and the final-rule texts PUSHED (§0 STEP 53, Ali's yes 2026-10-08 `aa1841bb`); production's referee-key backfill owed before licence outreach opens. |
| U34 | guard | 🔵 | S15 | 3fbceb46 | the book could be exported but nothing read an export back → U34a (`d8fce713` + review `95a48ae6`): the masked/full CSV, audited before the first byte, the cross-site gate; U34b (S15, C7): a reader's full export imported back changes NOTHING (every row already in the book, 0 updated under "use the file's version", 0 added) and a masked export is refused whole in words | `test:contacts-export` · `qa:contacts-import-roundtrip` | yes — `red:contacts-export` (in-process) | C7 of `CONTACTS-SCREEN-PLAN.md`. |
| U35 | data | ✅ | S10 | bfc37a74 | campaigns had a purpose (U35a `0dc25b98`, live) and nowhere to live → two tables in both twins behind ONE rule set: a draft saved by compare-and-set, a confirmation frozen in one conditional move, recipients deduped on (campaign, number), links never copies, no stored counter — 92 migrations proven from empty | `test:dal-parity` · `test:campaign-models` | yes — `red:campaign-models` 32/32 (in-process) · `red:dal-parity` §26 | campaign models. LIVE 2026-10-02 06:05:54 UTC — production serves `df839f30` and its deploy log applied `20261002120000_sms_campaign_models` (after a first build failed on a Google-font fetch and was rebuilt from source). |
| U36 | visual | 🔵 | S10 | 06c21ac4 | /admin/campaigns did not exist → the campaign list behind six doors (nav item "SMS campaigns", ROUTE_KEYS, ROUTE_DOMAINS growth, the section gate, loading.tsx, the page gate), the status rail over the WHOLE table, server-counted progress (HELD outstanding), the nav badge only for a growth viewer | `test:campaigns-page` · `test:admin-nav` · `test:rbac` · `test:dal-parity` §26 | yes — `red:campaigns-page` (in-process) · `red:rbac` 4/4 · `red:dal-parity` §26 | list + badge. Pushed and serving (`db4a11a7`, §0 STEP 20) — its live check needs an admin session on production (G7 / G11). |
| U37 | visual | 🔵 | S10 | fb6cca81 | /admin/campaigns/new did not exist → the composer: one Message card with a worst-case counter per language, the save re-validated on the server (its own segments, compare-and-set, OD55 in every field), and the test send to the officer's own number only, through the one gate and behind the closed live switch | `test:campaign-compose` | yes — `red:campaign-compose` (in-process) · `red:campaign-models` | composer. U37a `0dc25b98` + U37b (§0 STEP 21) + U37s, the saved source line stamped on every draft save (§0 STEP 40) + U37c-1, the test to a typed number — the server path (§0 STEP 41) + U37c-2, the Test card: my own number or another, the 18+ tick bound to the number and its words, the typed preview and outcomes (§0 STEP 42). Pushed and serving — its live check needs an admin session on production (G7 / G11), and its first real test send needs G1. |
| U38 | visual | 🔵 | S10 | bd097333 + a5feb9f1 | the campaign could only target the book → U38a: ONE resolver with a population axis, the player arm, ONE walk, and the will-receive split asked of the real gate, over §25's bulk reads | `test:campaign-audience` · `test:dal-parity` §21 §25 | yes — `red:campaign-audience` (in-process) · `red:dal-parity` §21 §25 | audience. U38a + §25 landed (§0 STEP 22). U38b pushed (§0 STEP 48, `a5feb9f1`): the card on the composer — who, the rail, ONE view-model's count; OD65 (a viewer who may not read a number sees the count alone, the gate never asked) and OD66 (no both-at-once for them); `qa:marketing-audience` 140/140 at 1280 and 360. 🔵 until a GROWTH session looks at it on production (G7). |
| U39 | visual | 🟡 | S10 | 0dc25b98 | — | `test:read-tiers` | — | estimate. U39a landed (`0dc25b98`): the price from the difference of two delivered reads, the model, the server loader; `test:campaign-estimate`. U39b (the card) follows. |
| U40 | guard | 🟡 | S10 | 0dc25b98 | — | `test:campaign-gates` | — | confirm. U40-pure landed (`0dc25b98`): the confirmation's one rule; `test:campaign-confirm`. U40a (server) PUSHED (§0 STEP 50, `39a4fc50` + `6fd388df`): the typed count over a sealed audience, the members key bound to its draft, the frozen estimate and budget, OD67 — `test:campaign-gates`, `red:campaign-gates`. U40b (UI) PUSHED (§0 STEP 51, `d35fd5cd` + three review rounds): the Confirm card and its dialog, counted on the press, OD67 on screen. |
| U41 | guard | 🟡 | S10 | — | — | `test:campaign-gates` | — | officer authorisation — DECIDED (OD60, 2026-10-04): one officer's typed confirmation at any size, under the 2026-07-24 single-admin ruling; ✅ when U40a's push carries the guard (G7.1). |
| U42 | engine | 🟡 | S14 | fdb516a0 | — | `test:marketing-engine` | — | enqueue. U42 PUSHED (§0 STEP 52, with U49a, U43b and U47b-1): the confirmed audience written as recipient rows in chunks, capped at the confirmed count, never twice — `test:marketing-engine` §E, `red:marketing-engine`. Reachable with U47b-2's page. |
| U43 | engine | 🟡 | S10 | bf166ff3 | — | `test:marketing-engine` | — | the slice. U43-0 landed (STEP 33): UNCONFIRMED, the migration alone + the code that knows the value, no writer; `test:campaign-models` §1.8c/§1.12/3.2, `db:probe-campaign-models` §9. U43y pushed 2026-10-07 (§0 STEP 46, `18e6192b`): money first — ONE busy signal (`money-busy.ts`) fed by one-line mirrors in the lifecycle pass, the deposit poll, market fires and Up & Down chain fires (`test:money-busy` 34 claims, `red:money-busy` in-process); nothing calls it until U43b. U43a LIVE 2026-10-07 (§0 STEP 47, `89775271`, read back as `0f1b143c`): the recipient doors in both twins — claim, claimedBy, settle, findStranded, requeueHeld, lastActivity, smsMessage.findByTargets — each asking the one rule set first (`test:campaign-models` §2.14–§2.27, `red:campaign-models` in-process; `test:dal-parity` §26.u43a; `db:probe-campaign-models` §10 on PostgreSQL, five truly concurrent claimers); `test:campaign-privacy` P10 sweeps rows the real doors settled; inert until U43b. U43b (the slice) follows. ⚠️ U43b owes DC-4 (ENGINE-SPEC §4.13 decision 6, recorded by U46a's review): when a receipt beats the slice's settle, a narrow send-record door in both twins (`recordSend`) still writes the row's gate trail, opt-out token, locale, segments, body length and `sentAt` — `test:marketing-engine` S16, before the slice settles a real row. U43b PUSHED (§0 STEP 52, `fdb516a0`): U43b-1 the dispatch hooks, every answer read; U43b-2 THE ENGINE — the slice, the reaper, the settlement, the send-age bound checked three times (no message twice), DC-4's `recordSend` — `test:marketing-engine`, `red:marketing-engine`, `test:sms-cost-guard` §11. |
| U44 | engine | ⬜ | — | — | — | `test:marketing-engine` | — | the pump |
| U45 | engine | ⬜ | — | — | — | `test:dal-parity` | — | D20 scale |
| U46 | engine | 🟡 | S14 | 4b41f032 | — | `test:sms-dlr` | — | D21 receipts. U46a PUSHED (§0 STEP 50, `4b41f032` + `0b5126b2` + `23a138e8`): ONE receipt door `recordReceipt` in both twins — conditional, monotonic, identity-checked; inert until U43b sends; `red:sms-dlr`, `db:probe-campaign-models` §11. Inbound STOP (U46b) NOT built (§9 U46). |
| U47 | visual | 🟡 | S14 | fdb516a0 | — | `test:campaign-visuals` | — | live page. U47b-1 (the services and view-model) PUSHED (§0 STEP 52): Start · Pause · Resume · Stop · Make a copy, the step dispatcher, the floor E23 — `test:campaign-visuals`, `red:campaign-visuals`. U47b-2 (the page) built, under review. |
| U48 | visual | ⬜ | — | — | — | `test:campaign-visuals` | — | results |
| U49 | engine | 🟡 | S12 | — | — | `test:marketing-settings` · `test:sms-cost-guard` | yes — `red:marketing-settings` (in-process) | D24 budget. U49s WHOLE: U49s-1 LIVE `34c1ea7f` (§0 STEP 43) — the live switch's closing time and its two audited writers, the Marketing SMS settings record, the estimate's price from it (OD62 · OD63); U49s-2 (§0 STEP 44) — the card above the rail and the Marketing SMS tab (OD64). U49a (the credit kept for codes, Start's and Resume's refusals on the stored counts) PUSHED (§0 STEP 52, `fdb516a0`); U49b (the 90 % pause) later. |
| U50 | guard | ⬜ | — | — | — | `test:cert-c1` | — | registry + boot |
| U51 | docs | ⬜ | — | — | — | `test:docs` | — | the operator's guide |
| U52 | live | ⬜ | — | — | — | `test:marketing-engine` | — | live drive + Seal |

**Defects this programme closes** (detail in §8):

| Id | Owner | State | One line |
|---|---|---|---|
| D1 | U1 | ✅ | `toMsisdn255("00255…")` produces a 16-digit MSISDN — latent today, live the day an importer exists |
| D2 | U1 | ✅ | no refusal at the wire boundary: a malformed number is billed as a send attempt |
| D3 | U2 | ✅ | no operator map; `tzPhone` accepts NDCs no licensee holds — ⚠️ re-scored at S1: **60 only**, not "60 and 70" (§3d), and the sharper case is 064, allocated on paper and dead on the wire |
| D4 | U3 | ✅ | no segment arithmetic anywhere; the only GSM-7 table is inside a server module |
| D5 | U4 | ✅ | no statutory RG footer and no sender identity in any SMS body |
| D6 | U5 | ✅ | the helpline we publish (0800 11 0011) is not the one the Gaming Board's code names — closed 2026-09-26: Ali ruled the number 50pick already publishes is the right one (OQ4) and the marketing footer now reads it |
| D7 | U6 | ✅ | there is no SMS suppression list at all |
| D8 | U6 | ✅ | `marketingOptIn` is a boolean with no channel, no wording and no ledger |
| D9 | U10 | ✅ | `isLockedOut` lifts itself when the chosen period elapses — marketing must not use it |
| D10 | U10 | ✅ | `push-service` inherits that lift — closed S7 on Ali's delegation: the STATUS decides for push and watchlist alerts too |
| D11 | U11 | ✅ | nothing checks age before an outbound marketing message |
| D12 | U12 | ✅ | `/legal/responsible-gambling` §4 publishes three commitments with no code behind them |
| D13 | U13 | ⬜ | the published "late-night window" does not exist in code |
| D14 | U14 | ⬜ | no per-person frequency cap; uniqueness is per-campaign only — accepted by management 2026-10-07: U14 is held by ruling, so this stays open on purpose |
| D15 | U15 | ⬜ | `invite-service.sendCampaign` is a second, ungated send path holding `withLock` across sends |
| D16 | U16 | ⬜ | new PII stores would sit outside erasure and retention, as `SmsMessage` already does |
| D17 | U17 | ⬜ | a new admin section is five doors; missing one renders it to the Owner alone |
| D18 | U30 | ⬜ | no admin uploader, no CSV parser, and a 1 MB server-action ceiling — owned by U30 (the uploader) since 2026-10-01; U25 and U27 close the other two clauses |
| D19 | U30 | ⬜ | a pre-flight that says "400 of these are players" is a membership oracle |
| D20 | U45 | ⬜ | `sendBatch` updates `SmsMessage` rows one at a time — 10k serial UPDATEs for a 10k campaign |
| D21 | U46 | ⬜ | the DLR route fans out to `InviteEntry` only — receipts now arrive (§3a), and a campaign recipient has nowhere to receive one |
| D22 | U35 | ✅ | no `MARKETING` purpose: per-lane volume and cost are unreadable — U35a's own migration added it (`0dc25b98`, live 2026-10-02), and U35 is ✅ |
| D23 | U43 | ⬜ | the 30 s `withLock` transaction timeout makes the existing send shape unusable at scale |
| D24 | U49 | ⬜ | no campaign budget; the only spend control is a floor worth eight messages |
| D25 | U50 | ⬜ | `comms-registry.ts` states as fact that SMS is "OTP + invite campaigns" |

### §1a — Closure conditions (all nine, or it is not 🏁 CLOSED)

1. Every unit ✅ and every defect ✅.
2. `test:marketing-setup-plan` green, and its red control catches every plant.
3. `predeploy` green, and `test:all` shows no suite red that is not already red on clean `main`.
4. A real campaign has been sent on production to the ledger-capped test number and **read on a handset**.
5. The provider's own `COUNT` (portal export) equals this platform's segment arithmetic for that send.
6. Opt-out has been exercised end-to-end from the handset, and the number is suppressed on production.
7. Every one of the eleven questions in §4a is either answered by Ali or carries a default he has confirmed.
8. `/legal/responsible-gambling` §4 and `/legal/privacy` are re-read and agree with what the engine does.
9. `HOW-TO-SEND-A-CAMPAIGN.md` exists and an operator who is not its author has followed it once.

---

## §2 — SESSION LOG (newest first)

| Session | Date | What happened |
|---|---|---|
| S12 | 2026-10-06 | **STEPS 43–44 · U49s-1 LIVE `34c1ea7f` — the live switch's closing time and its two audited writers, and the Marketing SMS settings record — then U49s-2, its card and its tab, so U49s is whole** (OMEGA-COMPILE01; Ali: "proceed please, next steps until we go live, fully done and perfect"). The send engine's first step, split like U37c; inert. Its review said FIX FIRST — a MAJOR: opening could leave the switch ON with no COMPLIANCE row while telling the owner it was off, on a database fault in the wrong millisecond — fixed with one rollback that takes back only its own row and says "off" only on proof; a second review found the record still written after the row and an opening laid over another — fixed (record first, read first, a close that records the row it removed); a third review found two more MAJORs — a close whose delete committed and lost its reply told "already off" with no record, and two openings in one instant both told "on" — fixed (a close that looks before it retries and records `was: unknown`; a conditional write, so exactly one opening stands); a fourth review found a close that could record a close that never happened when its first read and its delete both failed — fixed ("gone" only by comparing stored values against a readable first read; no retry without a readable look showing that very row; `close_unconfirmed` when nothing can be read), with its minors (an opening stamped by a clock ahead never replaced; the ops door's clock checked against the database's); a fifth review found nothing at MAJOR level — its minors fixed (a readable proof of "gone" never thrown away; never OFF from a read that never landed; one rule for an opening; the clock gates only an open); and the ops door's public-proxy rewrite, found before the push, proven read-only against production (`status` → OFF (absent)). Proven on a scratch PostgreSQL 18.3 (`db:probe-marketing-settings` 17/17 — real concurrency included, after the fresh-PC runtime trap in §0 ⚠ TRAPS). `red:marketing-settings` 43/43 against a proven-green baseline (OD62 · OD63). ⭐ STEP 44 · U49s-2 (Ali: "kepe going untul we finish the sms campaign") — the "Marketing SMS sending" card above Admin → System's rail and the "Marketing SMS" tab (OD64): owner-only acts, a stop never withheld, no money handed to a viewer who may not read it (the owner included), one loader answering the owner and the money. Four reviews before the push — the drafts (40 upheld), every capture (19), the code as applied (4 upheld, all fixed; twenty of its checkers cut off by a session limit, so its accessibility findings were checked by hand and fixed: radios inside the dialog, the dialog held until the answer, focus on the new state, refusals that stay), and those fixes (no MAJOR; five minors and five nits fixed — the switch's words moved into a pure module and run against every writer path, S14). Driven for real on a scratch PostgreSQL 18.3 at 1280 and 360 — 184/184; `red:marketing-settings` 72/72. Owed, each older than this unit (◐ 0): the System page's older ghosts, the SMS credit tile's amounts for every viewer, the kit select inside a dialog. |
| S11 | 2026-10-05 | **STEP 40 · U37s LIVE `549f1ba4`, and §0 made clean.** OMEGA-COMPILE01, a freshly set-up PC (`F:\kipindi-main` on `main`), taking the programme over from OMEGA-DEV072 the same afternoon. U37s: every DRAFT save stamps the SAVED source line, read fresh from the row, and the verdict prices it; a draft whose stamp differs is flagged and can be re-saved. The adversarial review said SHIP with four findings, all fixed before the push (§0 ✔ LAST SESSION). Guard `test:campaign-compose` §17.13–§17.20, `red:campaign-compose` 245/245 — verification focused on what the change reaches (Ali: "ignore previous fails, focus on ourselves"). Then, on Ali's instruction ("remove the stales that confuse developers, keep a clean plan"), §0 was rewritten to the current truth and its diaries — S7c to S10′, STEPS 1–39 — moved VERBATIM to `MARKETING-CAMPAIGN-HISTORY.md`, with §10's superseded S1–S27 pairing. U37c was split into U37c-1 (the server path) and U37c-2 (the Test card) before it was started. STEP 41 · U37c-1 the server path: its review said FIX FIRST — a typed test's RG COMPLIANCE row would have been a membership oracle on /admin's activity feed — fixed before the push (OD61), with its gaps closed; `red:campaign-compose` 288/288. STEP 42 · U37c-2 the Test card: its review said FIX FIRST — a BLOCKER, the 18+ tick outliving an edited number — fixed, and a second review of the fixes found no blocker (its minors closed too) before the push (§0 ✔ LAST SESSION); the typed drive 179/179 at 1280 and 360 as GROWTH and ADMIN, `red:campaign-compose` 322/322. |
| S10′ | 2026-10-04 → 05 | **STEPS 33–39 on OMEGA-DEV072 (`C:\kipindi-main`) — the S10 lane resumed after its pause.** U43-0 LIVE `bf166ff3` (the UNCONFIRMED migration, pushed alone); U41 decided (OD60); U33a-R LIVE `ec02e993`; U33a-G LIVE `b5680d5d`; U33a-P; U33b-L (the writer, then the Lists card); the admin guide v1.3; and Ali's twelve answers and three gates (COMPLIANCE-DECISIONS § "2026-10-05 · Marketing outreach rulings"). It wrote no row of its own: this one is reconstructed from its commits and its STEP log, which is in the history file. |
| S10 | 2026-10-01 | **PAUSED 2026-10-04 and continued as S10′ (the row above) — Ali-Blade15, `marketing-s10`. U18b SHIPPED `0e68d59e` + review rework** — erasure withdraws the consent for every number the person is known by (no stop: a recycled number's next owner can consent) and empties the book (by link AND by number); both exports carry marketing from the account's creation (`test:erasure` 226 → 335; §8's sweep gained the bare-key needle). Before it: Ali: *"proceed with other sessions in parallel, push live, prove it"*. Found §0 three days stale: S9 had shipped U17 + U18a and closed no docs — the board was rebuilt from the two commits (🔎 S9 in §0). ✅ **The consent tie FIXED** on Ali's standing delegation of technical calls: one ledger clock (`ledger-stamp.ts`), both writers stamped; 400 back-to-back appends, 390 sharing a millisecond — the pre-fix writer wrong 249 times, the fix 0; `test:marketing-consent-ledger` §9/§10 (16/16 red) and `test:dal-parity` §20 (`red:dal-parity` 56/56). U18b's first cut was then REFUTED by a review agent before the push (an unliftable stop on recycled numbers; an export that leaked a previous holder's history; two sweep buckets that could not fail; a tombstone read as a stranger's number) and reworked — §0 STEP 2. U19 shipped (`addf5351`, ✅), `red:rbac` (`be0a82ac`). U18 ✅ (`aa2767e9`, round 2 of the review). U20 shipped (`733522d3`): the list, with D19 fixed before it shipped. A design workflow then specced U21–U28 (8 spec agents + a critic: 26 conflicts to resolve first), a second one U29–U40 (29 more); all decided into §9, and the calls taken while building are OD47–OD52. Then the first build tranche, `0dc25b98` (+ `006c31bb`, merged in `f40b804e`): U24 commit 1 (the ONE resolver), U27a, U28a, U31-A, U33a, U35a, U37a, U39a, U40-pure — every unit reviewed adversarially before the push, every fix run here. The merged-tree battery: typecheck, 38 suites, every red proof, the three repo-mutating harnesses, Postgres from empty, the pages rendered and driven, `next build`. All 🟡 — first parts. LIVE `ea87308f` (the live stylesheet carries the new rule). Then U24 commit 2 `c792901e` — every writer of the ledger or the stop list mirrors the book's cache (`test:contacts-audience` 45/45, red 21/21, Postgres probe 24/24); U24 🔵, then ✅ LIVE in `0e60952a`; the whole predeploy chain (186) green on that tree. Then U26 the vCard reader `b4faac34` and U21 the filter rail `c0cce85a` (both 🔵), U21's review follow-up `bb83acf9` and the lane's five sub-floor type sites lifted (type-scale §3 754 → 749). Ali, mid-session: "take any decision needed as per architecture and keep pushing live". U25 the CSV reader `928265b9` (🔵), U28b's CSV/vCard half, U22 the add/edit form `e4f04528` (🔵); predeploy red one hour (ui-consistency read U25's markup list as a table) — fixed `b7bdc7db`, and every push now runs the whole chain first. U22's review fixes `03919fa2`; U27b the XLSX reader `2438d66a`; U27 and U28 🔵. |
| S9 | 2026-09-28 | **RECONSTRUCTED BY S10 from `7bef9f97` and `fb194038` — the session wrote no row.** U17 shipped (six doors, `test:rbac` §7b, `test:admin-nav` into `predeploy`, the skeleton equal by construction) and U18a shipped (three tables, both DALs, `test:dal-parity` §19, 8 red cases, the migration proven from EMPTY on PostgreSQL 18.3). Both LIVE that day. U18b (erasure / retention / export) was named as owed, and §1 deliberately left unticked. |
| S8 | 2026-09-28 | **S7c WENT LIVE — `d3379fef`. No unit ticked (12/52 units, 12/25 defects); the session was the ship itself.** Ali: *"ship it first"*, then *"end session here, mark progress, clean stales"*. Own worktree `F:/kipindi-s8` off `origin/marketing-s7c`, real `npm ci` (⛔ no junction), merged `origin/main` — which moved **three times** during the session, 23 → 54 → 4 commits, because the landing lane was pushing in parallel. ⭐ **Proven by:** typecheck; `npm run build`; every marketing / SMS / DAL / RG / comms suite; all ten red controls (`red:dal-parity`, `red:rg-doors`, `red:marketing-consent`, `red:marketing-consent-ledger`, `red:marketing-optout`, `red:campaign-compose`, `red:sms-cost-guard`, `red:rg-policy`, `red:support-contact`, `red:marketing-setup-plan`); 90 screenshots at 0px overflow, OPENED AND READ (ten SMS-credit states × two widths, /s error + busy, consent HELD ×3 languages, /help FAQ 5, register consent); and the live proof by DISCRIMINATION — /auth/register served "Nipe matangazo" before the push and "Nitumie ofa na habari za 50pick kwa SMS" after, on `?dpl=d3379fef…`. ⭐ **Fixed before the push:** (1) the nine `since` dates said 2026-09-27 for a batch shipping on the 28th — corrected and the append-only hash re-pinned (`9b041893ec43a670` → `718250ee6e8280ed`) only after proving production had never shown those sentences AND that the guard still fails on an EDIT and a REMOVAL; (2) three guards cited by SCRIPT FILE instead of `package.json` key (`test:dev-route-guard` → `test:cert-devroutes`, `test:stacking-contract` → `test:stacking`), which had `test:guards-exist` RED for every lane, one of them already on main. 🔴 **The trap that nearly shipped a regression:** the first `git merge origin/main` took a STALE ref — a parallel session's fetch moved `refs/remotes/origin/main` mid-command — and silently dropped the landing lane's `FIRST_LICENSED_EVIDENCE`; the redone merge was verified per file against the merge base, and the i18n dictionary leaf by leaf (98 ours / 158 main's / 30 deletions honoured / 0 wrong) with a planted defect to prove the checker could fail. ⚠️ Red elsewhere, not ours: `test:stacking` 6.1 (LIVE strip `z-index: 11`) and `test:red-anchors` (two rotted anchors in other lanes) — each byte-identical to `origin/main`. 🔴 **Instrument lessons:** a suite that flakes once and passes 3× is pointing at a real race (here the `latestFor` tie — see ◐ HALF-DONE); a nested drive's failure (U8 BUSY, 1/266) vanished at 266/266 standalone twice, because the opt-out budget refills 1 per 6 s; and a viewport TILE froze a scroll position that made the consent HELD card look obstructed, while a per-painted-line measurement showed it clear in all three languages. |
| S7c | 2026-09-26 → 27 | **THE END-TO-END REVIEW OF EVERYTHING LIVE, AND ITS FIXES — no unit ticked (12/52 units, 12/25 defects); §10 reordered on Ali's approval so the contacts book is next.** Ali: *"make sure it's all end to end perfect, visually, logically, no screen is weak, nothing lacking."* ⭐ **The method:** every marketing screen photographed on production and on a local build (1280 and 360, three languages), then an adversarial review — eight lenses (three visual, four logic, one docs/prompt), each finding handed to a second agent told to REFUTE it: 99 of 105 survived. The fixes were written by parallel agents on disjoint files that ran NO Node (this laptop's RAM fails under load and other sessions hold the heavy-node lock for long stretches), then one copy pass wrote every string in en/sw/zh, then the suites ran serially on the merged tree. A SECOND review of the fixes (four visual lenses over fresh captures, two code lenses over the diff) confirmed 42 of 54 more, no blockers; fixed the same way. ⭐ **What changed for a person:** the consent names SMS in one noun everywhere and the ledger stores the sentence in the language actually shown (rows written 2026-09-25 → 27 say SW whatever was seen — append-only, so they stay); OQ11's safe default (an old "product updates" yes no longer counts; no backfill); the toggle shows EFFECTIVE consent and is held during a break or self-exclusion; the gate refuses a KYC final refusal (an UNDERAGE refusal used to pass on the self-typed date of birth); the opt-out page is a minimal shell whose heading follows the state and whose resume records its own consent sentence; a stronger stop now takes over a person's own and `lift` lifts only a person's own (both DALs — U16's owed half, done); Admin → System's card headlines the SMS CREDIT with the state and the reason in words and alarms the Owner at the alert line AND the floor (bell + email, never SMS). ⭐ **Proven by:** typecheck; every marketing, RG, SMS, DAL and comms suite; the red controls (`red:dal-parity`, `red:rg-doors`, `red:marketing-consent`, `red:marketing-consent-ledger`, `red:marketing-optout`, `red:campaign-compose`, `red:sms-cost-guard`, `red:rg-policy`, `red:support-contact`, `red:marketing-setup-plan`), each catching every plant; and the screens re-photographed and read. 🔴 **Instrument lessons:** (1) a stale `.next` made every `/api/dev-test/*` route 404 on `next dev`, so a capture photographed the admin SIGN-IN page as "the SMS card" with a green exit — ⛔ `rm -rf .next` before every dev run; (2) `red:marketing-optout`'s baseline raced a fire-and-forget audit write (S22 now polls); (3) the stopped first fix run's agents were waiting on another session's lock for an hour — static-only agents plus one serial battery is the shape that works here. ⚠️ Red elsewhere, not ours: `test:stacking` 6.1 (z-index 11 from the landing lane's LIVE strip), two rotted `test:red-anchors` anchors in other lanes, and `red:feedback-law`'s updown anchor. |
| S7b | 2026-09-26 | **Ali answered OQ1, OQ2 and OQ4 himself — D6 ✅, 12/25 defects.** *"gaming board said they don't care — it's not part of their approval, we can send anything as long as we have SMS gateway · PDPA is not needed · the right helpline is ours."* Recorded verbatim in `COMPLIANCE-DECISIONS.md` 2026-09-26 · Marketing SMS rulings with what the rulings do NOT change (consent under ETA s.32 / EPOCA reg 7(4), no promotion to the self-excluded under GN 478T reg 49(3), every RG/age gate). OD17 and §5.3 withdrawn, U41 re-scoped to the officer authorisation (and flagged to reconcile with Ali's single-admin precedent), OQ2's registration hold dropped. ⭐ **OQ4 implemented:** the marketing footer now reads `support-config.ts`'s helpline — one number — and `test:campaign-compose` §12, which ASSERTED the two helplines differ, now asserts they are the same and that the Board's number appears nowhere; still 49 septets. ⭐ **And Ali asked how much SMS balance we have:** the app could not say — the reading is in-process and empty after every restart, and nothing but a send refreshed it. `refreshSmsBalance` (the same free, authenticated endpoint `sendBatch` already used) now feeds `/admin/system`'s SMS card on render, reused for a minute; `test:sms-cost-guard` §7 proves it reads, records into the one snapshot, SENDS nothing, reuses a fresh reading and never records a refusal's 0.0 (red 7/7). ⛔ Not read by logging in as Ali — the QA admin password is his own login and one session per account would have signed him out. The stale-text sweep for "closed until the Board approves" ran across BLACKBALL-SMS, LIVE-HOSTING-STATUS, RAILWAY-LIVE, README, NEXT-PLAN, CLAUDE.md, COMPLIANCE-DECISIONS and two code comments. |
| S7 | 2026-09-26 | **U11 ✅ and U12 ✅ LIVE (`40b83931`), D10 ✅ (`aa98f383`), the U6 repair LIVE (`2b8ba0a2`) — 12/52 units, 11/25 defects.** Run on Ali's delegation of 2026-09-26 (*"take any decision needed based on overall decisions I took ever and architecture of platform, keep going until live"*), every ruling recorded with its precedent. ⭐ **The repair:** the eight trigram indexes U6's migration dropped are restored with byte-identical SQL, proven from EMPTY on PostgreSQL 18.3 (85 migrations) and applied on production (`/api/health` migrated at `2b8ba0a2`); the same run proved the trap is live — a fresh `migrate diff` still wants to drop all eight. So `test:migration-ownership` (in `predeploy`) keeps a registry of which migration created every object and refuses a drop of another migration's object unless its owner document authorises it by name; ten pre-rule files grandfathered by literal content pins; red 9/9 with a control that a declared drop is ACCEPTED — and it caught its own first parser registering no enum-typed column. `test:dead-schema` is green again (a dated, sha-pinned exemption, waived not weakened) and `red:dead-schema`, which could not start while it was red, catches 7/7. ⭐ **D10 closed** on Ali's 2026-08-27 ruling: push and watchlist alerts refuse a SELF_EXCLUDED account until an officer reopens it — the bet path's own rule; `isLockedOut` untouched; guarded by a console spy on the real `[push-stub]` line, because "returned 0" is true of a delivered stub push too. ⭐ **U11** on the platform's one age definition, three answers; a contact is `age_unknown` until U33 — nothing inferred — which changed U8's suite to pin what labels 1 and 12 always meant (a resume gives back EXACTLY the pre-stop answer). ⭐ **U12** — OQ6 answered on delegation: the under-25 segment defined and built, §4 re-versioned v2026-09-26 in three languages from the page's own vocabulary, the late-night bullet cut, and `test:rg-policy` maps every §4 promise by its words to a named control (red 7/7); verified live by discrimination and by screenshots opened and read. 🔴 **The machine crashed mid-`red:rg-doors`:** the two files it was writing — `market-service.ts` and `marketing/rg.ts` — came back 100% NUL; neither had uncommitted edits, both restored from HEAD, `git fsck` clean, all 12 worktrees NUL-scanned clean, the harness re-run through the lock, nothing reached main. ⚠️ **Two instrument defects of this lane's own:** a first launch of an agent workflow was passed a placeholder instead of its data (stopped within seconds, before any write), and 9.1b first read the push audit row before the fire-and-forget write had landed (now polled, not slept). |
| S6 | 2026-09-25 | **U9 ✅ LIVE (`4dfea77e`) and U10 ✅ LIVE (`f1ad4417`) — 10/52 units, 8/25 defects (D9).** Run on Ali-Blade15 in its own worktree (`marketing-s6`) with a real `npm ci`, pushed `HEAD:main` unit by unit. ⭐ **U9's premise failed, and the plan had even named the wrong unit:** there was no send loop, and the loop is U43, not U35. Rather than wrap a gate round nothing, U9 shipped the loop's innermost step (`dispatchSlice`) and a two-slice contract that U43 must join as a driver; the gate hoisted to list-build time sends the opted-out number, and that is the red control. 🔴 **U10 found U7's no-write fix was half a fix** — an EXISTING row is still rewritten by `effectivize` — and three premises false: cooling-off was already refused for ever under the wrong reason (nothing clears `COOLED_OFF`), a restore leaves no column (only an audit row, which is what is now read), and harm markers cannot be standing (nothing persists a flag — owner item). The gate's order was not §5.6's; now it is. **Measured:** `test:rg-doors` 54 → 91, `red:rg-doors` 11 → 19 real-file mutations, `test:marketing-consent` 15 → 36, `red:marketing-consent` 5 → 13; typecheck clean; both deploys confirmed by `?dpl=`. ⚠️ **Two instrument defects of this lane's own, caught before they cost anything:** the tracker's red control scored 26/28 on CLEAN main on this PC — `core.autocrlf=true` puts CRLF on disk and two plants anchored on `"\n---\n\n## §10 —"` found nothing (it said so, loudly; the reader now normalises line endings, 28/28); and a first launch of the stale-text fixers passed a placeholder instead of the findings — stopped within seconds, before any agent had written, and relaunched reading the findings from disk. ⭐ **And Ali's standing instruction, applied repo-wide:** a find-and-refute sweep of stale SMS/Blackball/marketing text — 89 candidates, 74 confirmed by a second agent told to refute each — fixed in docs, code comments and schema notes, plus §10's off-by-one, the NEXT-PLAN "Next" cell stuck at S1, and BLACKBALL-SMS.md's pre-fix claims that the callback never fires. 🔴 **And the finding the next session must act on first, surfaced by the sweep's verifier running `test:dead-schema`:** U6's migration (S3b) was generated with `prisma migrate diff` and dropped other lanes' retired schema — F-05's four empty tables, three columns and three enums, AGENT-PROGRAMME's `AffiliateAgent.tier` — and the eight trigram search indexes, all without `IF EXISTS`, on production. Checked before concluding: the tables/columns were measured empty and already scheduled for dropping by their own lanes (whose SQL uses `IF EXISTS`, so no boot hazard — both docs now say the step is done), and the indexes were a bet on growth the planner ignores at today's size, so nothing is broken NOW. The repair (restore the indexes, a guard against a migration dropping another lane's objects, a dated `dead-schema` exemption for the applied file) is §0's first S7 item. |
| S5 | 2026-09-25 | **U8 ✅ LIVE (`80a8b0a4`) — 8/52 units.** ⭐ **The decision S4 refused to rush was taken and it was right:** a suppression row is never DELETED but may be SUPERSEDED. `liftedAt` + `liftedReason`, expand-only, proven FROM AN EMPTY DATABASE on real PostgreSQL 18.3 — 84 migrations, both columns nullable, a SECOND lift touching 0 rows, the row still present. §17's "no delete" assertions all stand. 🔴 **AND THE DECISION SURFACED A SECOND FALSE SUCCESS THE PLAN DID NOT NAME**, pointing the other way: `suppression.create` is an upsert with `update: {}`, so once a row can be lifted, `stop → start again → stop again` hands back the LIFTED row — telling somebody they will never be marketed again while the lift stands and the next campaign sends. The update now CLEARS the lift, and §17's `update: {}` assertion was REPLACED rather than softened: it says what it always meant — the block must not touch `createdAt`, and it must re-arm. 🔴 **AND A THIRD, FOUND BY RUNNING U7's SUITE:** the memory twin asked `r.liftedAt === null`, which is FALSE for a row carrying no lift field — so an un-lifted suppression read as LIFTED and a person who said stop came back MARKETABLE. It failed OPEN. Now `!r.liftedAt`. ⭐ **And the repo-wide fact behind it:** `tsconfig.json` includes `scripts/**/*.ts` while every suite is `.mts`, so **no test file in this repo is typechecked** — a DAL type change breaks fixtures in silence. ⭐ **The red control caught the GUARD lying, twice:** the expiry plant reached nothing because the assertion called the SHIPPED resolver instead of the object under test, and the fail-closed fixture stopped being legacy once `create`'s idempotence re-armed it — a fixture that stops being the shape it is named for is a control that has quietly stopped controlling. Both are cases now; 8/8 caught. ⭐ **And reading the screenshots found what no assertion did:** the invalid-token refusal told the reader to "tap once to stop" on a page that renders NO BUTTON. ⚠️ **Two instrument defects of my own, both in the drive:** `button.first()` resolved to a hidden language-picker option in the SITE CHROME, and the text assertions could not fail — `optout.title` is the SAME STRING as the stop button's label, so "the stop button is on the page" was TRUE on a page with no button. Controls are counted by role and accessible name now. ⚠️ **`next dev` cannot run in a junctioned worktree either**, not only `next build` — same Turbopack symlink refusal, after printing "Ready". |
| S4 | 2026-09-25 | **U7 ✅ LIVE (`b60dc492`); U8 🟡 store half live (`5942332f`), page not built.** ⭐ **The trap U7 exists to survive:** this platform stores phone numbers in TWO formats and nothing said so — `User.phoneE164` is `+255…` from `tzPhone` (`validators.ts:32-37`), the marketing key is bare `255…` from `toMsisdn255`, and they are unequal for EVERY input including `+255712345678` itself. So the obvious gate finds NO player, hands the entire player base to the ledger branch — the one branch that must never govern a player (OD10) — and never throws or logs. `userPhoneKeyFor` is the bridge and the suite pins it in BOTH directions, because a bridge asserted only in the working direction can be deleted without the guard noticing. 🔴 **U7 SHIPPED WITH A DEFECT AND WAS FIXED THE SAME SESSION:** `selfExclusionStanding` → `getRgSettings` ends in `db.responsible.upsert(fresh)` (`responsible-gambling.ts:90`), so ASKING THE GATE A QUESTION WROTE A ROW — 150,000 ResponsibleGambling rows per campaign, created by deciding NOT to message people. ⚠️ Found by an adversarial read of the SHIPPED unit, not by a failing test: the defect writes correct-looking data, so nothing went red. Assertion 14 now pins it and red case 4 plants it. ⛔ **Three of this plan's own instructions were stale again:** OD9 named a `MessagingConsent{GRANTED}` status the shipped enum does not have (it is `GIVEN`, matching the existing `privacy.marketing_consent.given` audit action) and OD9's `UNKNOWN` is not in the enum either — both corrected, with the 55P04 cost of adding it later recorded on OD9 itself. ⭐ **U8's premise failed twice over**, which is why only its store shipped: there is no recipient row to hang a token on until U35 (S18) and nothing mints one until U42 (S21), and `marketingFooter` has no callers outside its own test — so U8's stated Accept (a minted token suppressing on production) is unreachable at S4 and now belongs to U42/U52. 🔴 **And the number OD43's length hides:** the token is 8 characters and never expires, so the obvious hex `randomId(4)` (16⁸ = 4.3×10⁹) gives ≈2.6 EXPECTED collisions per 150k campaign — near-certain on the first one. The 32-char ambiguity-free alphabet gives ≈1%, still compounding, so a taken token is REFUSED rather than upserted (an upsert would silently re-point somebody else's live opt-out link). 🔴 **THE OPEN DESIGN QUESTION THIS SESSION SURFACED AND DID NOT HALF-APPLY:** U8 promises a resubscribe button, but suppression rows are never deleted and the gate asks suppression FIRST — so resubscribe would show a success that is not one. The fix is a nullable `liftedAt` (superseded, never deleted); it is written into ▶ NEXT rather than rushed into the live gate at the end of a long session. |
| S3b | 2026-09-25 | **U6 ✅ LIVE on `32067c92` — D7 and D8 closed; the consent ledger and the SMS suppression list exist, in both stores.** ⭐ **The unit was never blocked — the blocker was.** §0 had stopped U6 for a whole session on "`docker` is not on PATH, so `db-scratch.mts` cannot raise a scratch Postgres". That script does not use Docker: it loads `embedded-postgres` (`:129-146`), whose 107 MB binaries are already installed, and it raised **PostgreSQL 18.3 — production's own major version** here. All 82 migrations apply from empty through the real `prisma migrate deploy`. The lesson is the one this lane keeps re-learning: **audit the instrument, not only the code** — the blocker named a MECHANISM (`docker`) and nobody opened the file to see whether that was the mechanism. ⛔ **Two more of the plan's own instructions were stale**, both because parallel programmes moved underneath it: `dal-parity` was to gain "§7 with its own planted-key control", but §7–§16 have been taken since house bots' build and the gate has had a planted-key control at §0 all along — so U6 took §17 and EXTENDED `red:dal-parity` rather than shipping a second control beside a working one. ⭐ **The red control then found a hole in this unit's own guard**: the tiebreak assertion asked whether the ordering appeared ANYWHERE in the namespace, and each twin has TWO readers — so planting its removal from `latestFor` left the gate GREEN, because `listFor` still carried it. An assertion a sibling can satisfy on your behalf is not an assertion about you; it counts both readers now, with a control proving one is not enough. ⭐ **And the enum rule is narrower than this plan states** — measured, not assumed: adding a value to an EXISTING enum cannot be used in the same transaction (`55P04 unsafe use of new value`), which binds U35/D22 adding `MARKETING` to `SmsPurpose`; a BRAND-NEW type created and used in one transaction is allowed, so U6's five types ship in ONE migration rather than two. 🔴 **A FINDING OUTSIDE THIS PROGRAMME, RECORDED AND NOT FIXED (§6 forbids it):** `schema.prisma` has declared `@@unique([provider, providerRef])` on `Transaction` since 2026-06-08 (`1112ee3c`, "Hardening sprint") with **no migration** — the init migration creates only a non-unique `Transaction_providerRef_idx`, so production has never had the constraint. Its own comment says "a retried webhook with the same providerRef must not" duplicate. Money is NOT leaking today: `settlePaymentWebhook` is idempotent in application code (`wallet-service.ts:1015`, `txn.status !== "PROCESSING"`). The exposure is that `findByProviderRef` is `findFirst({ where: { providerRef } })` — it does not even use the compound key — so two rows sharing a ref would resolve arbitrarily. ⚠️ It also means **`prisma migrate diff` sweeps it into any unrelated migration**, which is exactly what happened here: it was generated into U6's SQL and removed by hand before the commit. ⚠️ **Environment, recorded so it costs nobody else a session:** `prisma migrate dev` needs a shadow database, dies `P1017` on the embedded cluster and leaves ~14 orphaned `postgres.exe` holding `.pgscratch` against deletion — use `migrate diff --from-url` + `migrate deploy` instead; and ⛔ do not clear those orphans with a global kill, because sibling sessions run their own clusters and this session killed theirs. ⚠️ **Also recorded for U7:** `isSuppressed` is ALREADY an exported name (`email-suppression.ts`) meaning bounced/complained — deliverability, not consent — and `marketingOptIn` has FIVE writers, of which U6 wired two. |
| S3 (part) | 2026-09-25 | **U5 ✅ LIVE.** ⭐ Its product half was ALREADY BUILT and the plan did not know: the statutory helpline is already one pinned constant with no setter, `global-error.tsx` already keeps its four hand-written copies BY DESIGN (root error boundary, imports nothing, renders when the root layout has already failed), and `test:support-contact` §15 already DISCOVERS every helpline-shaped literal there and pins each to the constant. Building it again would have been a second implementation of a working one. **What was actually missing was the control** — that suite is fifteen sections, among the most careful in this repo, and had NO `red:` key at all. `red:support-contact` ships it: 4/4 caught each on its own assertion, tree restored byte-identical, DECLARED anchors so the undeclared ratchet stays at 68. Two of the four are controls on the suite's own controls — §15.1 passes perfectly over a file that has stopped printing the helpline altogether, so one mutation DELETES a copy rather than drifting it. ⭐ **And the suite under test caught this unit's own first draft:** the mutation seeding an operator-settable helpline used the operator's REAL desk number as its literal, and §8 (no support-contact literal outside `support-config.ts`, sweep includes `scripts/`) refused to run at all. A red harness that seeds a real contact number into the tree is one that leaks one. ⚠️ **The live drive's first answer was also a false alarm** — it asserted every `tel:` link dials the helpline, but the page carries three and one is 50pick's own support desk under "Wasiliana nasi", which SHOULD be there and SHOULD differ. The defect was never "another number exists" but "a link that says helpline dials something else"; the drive now classifies by LABEL, with controls that it found at least two helpline links and at least one non-helpline link, so the classifier is proven to discriminate. ⛔ D6 stays ⬜: engineering half closed, substance is OQ4. ⛔ U6 NOT STARTED — no Docker and no `DATABASE_URL` on this machine, so a migration cannot be verified anywhere, and a push deploys it straight onto production. |
| S2 | 2026-09-25 | **U3 and U4 ✅ LIVE — D4 and D5 closed.** The GSM-7 table came out of `lib/server/sms-blackball.ts` into a pure client-safe `sms-compose.ts` and the gateway now DELEGATES to it, so the price an officer is quoted and the coding the wire receives come from one table; the move is asserted lossless byte-for-byte against a copy of the pre-move string. **Two findings worth more than the units themselves.** ① **Segments are PACKED, not divided** — a two-septet extension character cannot be split across a boundary, so 152 plain characters then 77 euro signs is 306 septets, which `ceil()` prices as TWO segments and which sends as THREE; at 150,000 recipients that one unit of slack is TZS 900,000. ⛔ And **every boundary vector this plan SPECIFIED is blind to it** — all eight are plain text, and on plain text packing and division agree exactly, so the suite as drafted would have looked thorough, passed, and never caught the defect that costs the money. The red control now asserts that about itself: the division plant breaks exactly ONE assertion in the file. ② **`String.length` is CORRECT for UCS-2** — it already counts an emoji as its two UTF-16 units — and wrong only for GSM-7 extension characters, which is precisely why pricing from `bodyLen` looks fine. U4 made the statutory footer computed (49 septets), counted, and impossible to omit — there is no call shape that produces a marketing body without it — so the operator budget is 111 rather than 160; every Swahili fragment is copied from a shipped string with the line cited, and §12 ASSERTS the footer helpline still DIFFERS from the published one so that OQ4 cannot be closed by an "obvious cleanup". ⚠️ **Two red anchors rotted by this lane own edits** (`otp-delivery`, `blackball`) were flagged by a parallel session and re-anchored here, then re-proven by EXECUTION (8/8 and 11/11 on their own assertions, tree restored byte-identical). ⭐ Two of the first red plants written this session were AIMED AT NOTHING and the baseline-plus-named-assertion shape is what caught them. ⛔ Recorded: `npm run build` cannot run in a junction worktree, so the build proof is typecheck + client-graph-safe + the Railway deploy. |
| S1 | 2026-09-25 | **U1 ✅ LIVE — the first product code in this programme. D1 and D2 closed.** Worked in a worktree off `origin/main`: the checkout was on another session's branch (`mobile-s2`) with their files in the tree, and `main` moved twice under this lane mid-session. **Three premises in the plan were false and are corrected here rather than worked around.** ① U1's text said it extends "its existing red control" — `test:phone-normalize` had NO red control and never touched `toMsisdn255` at all, while §1's own rule needs a backticked `red:` key to tick a row; `red:phone-normalize` was added, in-process, costing the `red-anchors` ceiling zero (measured: **68 vs 65 on clean `origin/main` AND 68 vs 65 here** — that suite was already red and is not claimed). ② The suite gated nothing: it was in no `predeploy` chain. ③ §3d — the NDC table U2 was drafted from is the 2020 edition and five rows are wrong today. **Two findings came from auditing the instruments rather than the code:** `00712000101` has sat in this suite since August labelled "the double-zero fat finger", the one input it calls a real user mistake — and nothing anywhere evaluated `toMsisdn255` on it, which returned a THIRTEEN-digit msisdn; and `test:shell-boundary`, named on U2 as its gate, is E-70 (plain `<a>` across shells) and cannot pass or fail on a module move — the real import guard is `test:client-graph-safe`, whose pinned set a new module must be added to or the guard is decoration. Ali added two standing requirements mid-session, both written into the contract so they bind later units rather than living in a chat: **§5.15** (every grid ships paging, sorting, a determinate loading state, an empty state and a retryable error state) and **§3c** (the import is ~150k contacts or a `.vcf`, *and* could be small — which breaks D18's 1 MB server-action ceiling outright, makes a full send TZS 900,000 against a measured float of TZS 232, and rules out pairwise duplicate detection at 1.1 × 10¹⁰ comparisons). ⚠️ RECORDED, NOT FIXED — outside §6's permission: `payout-destination.ts`'s canonical `destination.msisdn` is computed at `wallet-service.ts:1597` and **never read again**; the ledger and the gateway both take `parse.data.msisdn`. Harmless today because the two are equal, but the comment describes a reader that does not exist.  **U2 ✅ LIVE — D3 closed.** The NDC table was researched from the regulator rather than trusted: TCRA has re-issued the numbering plan three times since the edition U2 was drafted from, and 63, 64, 66, 70 and 72 all changed holder, so five of nineteen rows were wrong — including the one the unit had chosen AS its red control (070 was spare in 2020 and is Honora/Yas, operational, in v1.16, so planting `verdictFor("701234567") === "ok"` as the DEFECT would have pinned the wrong answer permanently). Cross-checked row by row against libphonenumber TZ ranges and carrier map, which carry GSMA IR21 provenance; the two sources agree on every code except 60. **Three rulings the research forced:** the operator is the RANGE HOLDER and never the network, because MNP has been live in Tanzania since March 2017 — so `walletHint` is display-only and §7 asserts no money module reads the table; where the regulator and the carriers disagree the parser ACCEPTS and flags, because a false refusal is invisible for ever and a false send is a receipt that never arrives; and 064 is allocated on paper and dead on the wire, which `isGatewayMsisdn` cannot see by design, so this module is the only thing in front of it. ⚠️ **An instrument nearly lied about the most important one:** the ITU E.164 notification answers "sans objet" in its portability row, which reads like "no portability here" and in fact answers a request for a LINK to a database TCRA never published — a blank field is not a negative finding. Also folded in: the display formatter had a SECOND, drifted copy in `wallet/withdraw/page.tsx` (no nine-digit cap, groups every run of three) that agreed with the first on every nine-digit input and diverged on everything else; both now resolve to one function. ⛔ Recorded for every worktree lane: `npm run build` cannot run where `node_modules` is a junction (Turbopack refuses the symlink), so the build proof in a worktree is typecheck + client-graph-safe + the Railway deploy itself. |
| S0b | 2026-09-23 | **The SMS rail was sealed, and its lessons folded in — no code, board untouched at 0/52.** Delivery receipts now work end to end: a production-issued OTP was DELIVERED and its receipt settled the real row in 11 seconds (`applied: 1`, `unknownRef: 0`, `mismatch: 0`), after the gateway's first unattended batch of three receipts in one POST. §3a replaces the "no receipt has ever arrived" premise this plan was written on; §3b records the vendor's measured vocabulary and operational facts, plus the seven lessons from eleven days of chasing it — chief among them that four vendor claims of "it is fixed" produced four identical silences, that the real fault (a missing `?token=` on their saved URL) only became visible because our receiver records REFUSED attempts, and that our own probe was briefly mistaken for theirs until it was discriminated by `srcIp`. D21, OD41, §7.7, U46, U47 and U51 were rewritten against the new truth; every guard and unit count is unchanged. |
| S0 | 2026-09-16 | **Planning only.** Nine agents: four research lenses (Tanzanian law · data model + engine · contacts + import · campaign UX), one draft, three adversarial critics (compliance/abuse/money · code truth · completeness/trackability), one revision. 52 critique findings, all resolved or refuted in writing. **Four critic claims were refuted with evidence:** (1) the `00255…` defect is *latent*, not live — every current caller is pre-validated, so it becomes live only when an importer exists; (2) `isLockedOut` is not "wrong" — Ali ruled on 2026-08-27 that a chosen period is a MINIMUM and the account is not reinstated by itself, so marketing needs its OWN predicate and ⛔ `isLockedOut` is not modified; (3) the helpline is not a citation-free assertion — the Gaming Board's own Advertising Code names `0800110051` three times while `support-config.ts:120` pins `0800 11 0011`, so the defect is real but the remedy is an owner question, not a silent edit; (4) routing campaign bodies through `test:cert-c1`/`c3` aims at a gate that structurally cannot fail — `comms-registry.ts` places SMS outside the module, so marketing gets its own wording assertion instead. Unit count was raised from 22 to **52** after measuring the shipped equivalent at Awarkeh (8,625 + 8,948 lines): 22 units would have been ~800 lines each, which is not half a session. ⚠️ Recorded as UNVERIFIED at S0 and to be re-scored at S1: §0a's self-sufficiency on a fresh machine, and whether the two-unit cadence holds for U30/U43. |

---

## §3 — MEASURED CONTEXT (what is true on 2026-09-16, with citations)

**The SMS rail is live and has never carried marketing.** `SMS_PROVIDER=blackball` since `b726cb7f`;
sender `50pick`; **TZS 6 per delivered single-segment GSM-7 SMS**, measured (balance 250 → 244 on one
send); balance **TZS 232** — thirty-eight single-segment messages; `BATCH_MAX` 50 per request; every
gateway failure is HTTP 400, so the `status` boolean is the only verdict; the success reply carries no
per-message id. ✅ **Delivery receipts WORK** — see §3a, which supersedes the "no receipt has ever
arrived" premise this plan was written on. Guide: `docs/BLACKBALL-SMS.md`.

⚠️ **The paragraphs below are the 2026-09-16 BASELINE, kept as the "before" U1–U10 measure against — not
today's state.** Since then U1–U8 built the phone key, the number library, the segment arithmetic, the
footer, the helpline guard, the consent ledger, the suppression list, the one gate and the opt-out page,
and U9–U10 the dispatch step and the RG standing. §1 is the current state.

**Nothing on this platform checks marketing permission before an SMS.** There is no suppression list, no
consent ledger, no opt-out, no age check and no responsible-gambling gate on the SMS rail.
`User.marketingOptIn` exists (default **false**, withdrawable, 730-day lapse) and is read by nothing that
sends. `push-service.ts` gates push notifications on `isLockedOut`; SMS has no equivalent.

**Phones.** `validators.ts:21` `tzPhone` = `^(?:\+?255|0)?[67]\d{8}$` — it accepts NDCs no licensee holds
(60, 70) and gates registration, sign-in and both money forms. `phone-normalize.ts:82` `toMsisdn255`
turns `00255712345678` into a 16-digit string. `phone-input.tsx:29` holds a private `formatTzPhone`
inside a `"use client"` file. There is no NDC → operator map anywhere.

**Read tiers.** `scripts/read-tiers.test.mts:373-397` governs **both** `phoneE164` and `msisdn` under
`identity.contact`; GROWTH's ceiling for that class is **masked** (`roles.ts:446`), and GROWTH's
`money.figures` is **none**. So the officer who runs campaigns may not read a number and may not read a
TZS figure — that is a design input, not an obstacle (§4 OD24, OD25).

**Responsible gambling.** `responsible-gambling.ts` `isLockedOut` returns `locked:false` the moment
the chosen period elapses; `selfExclusionStanding` is the predicate that knows an account is still
not reinstated; `:780` `detectHarmMarkers` is the only vulnerability signal that exists.
`two-officer.ts:51` `twoOfficerGate` already exists and is reusable.

**Platform mechanics.** No job queue. `lifecycle.ts` ticks every 60 s under a leader lease and also runs
payment reconcile. `locks.ts:142` gives every `withLock` a 30 s transaction timeout.
`invite-service.sendCampaign` holds one across `sendBatch` (D15). `chain-purge.ts` +
`purge-chain-card.tsx` are the platform's only long-job precedent: a durable row, one `advance()` per
call, a determinate `ProgressBar`. Server actions carry Next's default **1 MB** body; there is no admin
file-upload component and no CSV parser in `package.json` (`exceljs` is present, server-side, for
exports). `predeploy` (`package.json:248`) is a hand-written chain — a new suite that is not added to it
gates nothing. `red-anchors.test.mts:239` caps undeclared harnesses at 65 with `===`.

**The law, read this session** (full citations in §5): marketing SMS requires consent (ETA Cap 442 s.32,
EPOCA GN 61 reg 7(4)); the message must disclose sender and purpose **at the beginning**, carry an
opt-out in **every** message, and state the **source** of the number (ETA s.31(c)); personal data must be
collected **directly from the data subject** and Tanzania has **no legitimate-interests ground** (PDPA
Cap 44 ss.22–23, and 50pick's own recorded position in `docs/COMPLIANCE-DECISIONS.md`); 🔴 **a gaming
advertisement may not be published without Gaming Board approval, and unsolicited SMS needs the Board's
PRIOR WRITTEN approval** (GN 478T reg 56(1); GBT Advertising Code 2023 cl. 2.2.6) — ⚠️ *as read on
2026-09-16; on 2026-09-26 Ali reported the Board's own position, that marketing SMS is not part of its
approval (OQ1, withdrawn gate)*; every marketing SMS
must **end** with the condensed responsible-gaming message, plus the Board's toll-free number above 160
characters (Code cl. 3.7.1–3.7.2) — *(OQ4, 2026-09-26: Ali ruled the right helpline is the one 50pick
already publishes, so the footer carries 0800 11 0011, not the Code's 0800110051)*; **no promotional material to a self-excluded player** (GN 478T reg
49(3)); penalties are criminal — not less than TZS 5,000,000 or 12 months (GN 61 reg 15(1)), TZS
10,000,000 or a year (ETA s.32(3)), and licence suspension or revocation (GN 478T reg 64).

---

### §3a — ✅ THE RECEIPT RAIL IS PROVEN (2026-09-23) — this replaces the premise above

Measured on production, end to end, on a message production itself sent:

```
07:14:42.373Z  SmsMessage sms_de5d…  purpose=OTP            production wrote the row
07:14:43.770Z  sms.accepted   HTTP 200 · balance=196        the gateway took it
07:14:53.760Z  sms.dlr.received  {lines:1, applied:1, unknownRef:0, mismatch:0}
               row → status=DELIVERED   dlr=DELIVRD / Success
```

**Eleven seconds.** `applied: 1` with `unknownRef: 0` and `mismatch: 0` is the discriminator: the receipt
carried OUR `sms_…` reference, passed the msisdn cross-check, and moved a real row. Earlier the same
morning the gateway sent its first unattended batch — **three receipts in ONE POST**, one per earlier
test send, each echoing our reference.

**What this hands the campaign engine, free:**

- ⭐ **`DELIVERED` is a real state, not an aspiration.** U47's figures, U48's results and the export can
  show delivery as fact. ⛔ But `accepted → delivered` still takes seconds to minutes, so OD41 stands:
  `accepted` is never rendered as delivered, and `UNCONFIRMED` after 15 minutes (U46) is still needed.
- ⭐ **The reference echo is PROVEN**, which is what makes `SmsCampaignRecipient.smsReference` a usable
  join. The plan hedged on this (§3 of `BLACKBALL-SMS.md` warned their emailed example carried a
  23-character id of their own); the hedge is discharged.
- ⭐ **The multi-line batch shape is real** — `{statuses:[…]}` with several lines in one POST, handled
  line by line. A campaign will receive receipts in batches, not one per call.
- ⛔ **Still unproven, so U46 keeps its RED controls:** the `SmsCampaignRecipient` arm (unbuilt), every
  failure token (only `DELIVRD` has ever arrived — see §3b), and behaviour at campaign volume.

### §3b — WHAT THE VENDOR IS, MEASURED (and how the last exchange with them actually went)

**Their delivery-status vocabulary, given in writing 2026-09-17 and checked against `mapDlrStatus`:**
`DELIVRD` → DELIVERED · `UNDELIV`, `REJECTD`, `EXPIRED`, `FAILED` → FAILED · `SENT` → *no verdict yet*
(the row stays ACCEPTED, which is correct: it means the network has it). ⚠️ Only `DELIVRD` has ever been
seen in a live callback; the rest are their words, not our measurements, so U46's failure fixtures stay
synthetic until one arrives.

**Their operational facts:** callbacks retry **5 times** on a non-200 (interval not given) · three sender
IDs are whitelisted on the account (the exact strings still not supplied) · the portal's `COUNT` column is
the **segment** count, i.e. the billed unit — the cross-check for U3's arithmetic and U52's drive ·
`CODE 0` accompanies `DELIVRD` (the failure codes are still unknown).

**And the part worth keeping for the next vendor, because it cost eleven days:**

1. ⛔ **A vendor's "it is fixed" is a claim, not evidence.** Four separate claims of a fix produced four
   identical silences. Each retest cost TZS 6 of the float that belongs to login codes. **The rule this
   earns: re-test on evidence, not on assurance** — a log line from their side, or a receipt they posted
   by hand. U52 inherits this: the live drive is capped and ledger-counted for the same reason.
2. ⭐ **The fault was a missing `?token=` on the URL they had saved** — invisible from our side until
   they were asked to POST by hand and the 401 appeared **in our own audit rows**. ⭐ The receiver
   recording *refused* attempts is what turned "nothing is happening" into "your token is wrong". Every
   guard this plan writes should record the refusal, not only the success (§5.14 already says so for
   audit content; this is the same rule for coverage).
3. ⛔ **Our own probe is indistinguishable from the vendor's call.** A `curl -X POST` reachability check
   wrote the same `webhook.blackball.rejected` row and was briefly read as "they are calling us at last".
   ⭐ Discriminate on `srcIp`, exclude the operator's own address, and never probe an endpoint while a
   watch on it is running. U52's drive and any campaign watch inherit this.
4. ⛔ **`railway logs --http` is a TAIL, not a history** — measured: 5,000 lines covered **fifteen
   minutes**, and `--json` returned nothing while the plain form returned thousands. It can be trusted
   only LIVE, during a watch. **The durable instrument is the audit chain**, which is why every unit in
   this plan writes an audit row for refusals as well as sends.
5. ⛔ **`curl` reports `200` where a browser is redirected**, because the redirect is streamed
   (`/auth/otp`). Any "is this page reachable" check in this programme uses a browser, not a status code.
6. ⭐ **A flag can gate a PAGE and not the SERVICE behind it.** `OTP_ENABLED` gates only
   `src/app/auth/otp/page.tsx`; `requestLoginOtp` was never gated. U17's five doors and U41's approval
   gate are written on the opposite principle — the refusal lives in the server action, not the route.
7. ⚠️ **The webhook secret travelled through chat and WhatsApp during the fix.** Rotating it is an open
   owner item in `BLACKBALL-SMS.md`; if it is rotated while this programme runs, the campaign engine
   needs nothing — the secret lives only in Railway and the vendor's saved URL.

### §3d — 🔴 THE NDC TABLE IN U2's §9 TEXT IS THE 2020 EDITION, AND FIVE ROWS ARE WRONG TODAY

Found at S1, 2026-09-25, by researching the regulator rather than trusting the plan. **TCRA has
re-issued the National Numbering and Signaling Point Codes Plan three times since the edition U2 was
drafted from** (June 2024 → v1.15 July 2025 → **v1.16, 1 July 2026**, doc
`TCRA/DICT/CRTM/PLA-NMSP/002`). Codes **63, 64, 66, 70 and 72 all changed holder.** ⛔ Do not type
U2's list into the module; U2's own commit rewrites that §9 paragraph against the edition it ships.

| NDC | U2's §9 text says | v1.16 (Jul 2026) says |
|---|---|---|
| 63 | Amotel | **Viettel (Halotel)** — Amotel's holder was *Mkulima African Telecommunication Co. Ltd*; dropped in 2024, reserved in v1.15, reassigned 2026 |
| 64 | CooTel (Wiafrica) | **Telxer Enterprise Ltd — NOT operational** |
| 66 | Smile, A2P reach unproven | **Airtel, operational** (Smile ceased; Vodacom bought it Apr 2024; reserved in v1.15; Airtel in v1.16) |
| 70 | unallocated — U2's RED control plants `verdictFor("701234567") === "ok"` as the DEFECT | **Honora (Yas), operational.** ⛔ The specified red control is therefore BACKWARDS and must not be written as drafted |
| 72 | MO Mobile | **Vodacom** |

Unchanged and confirmed: 61/62 Viettel·Halotel · 65/67/71/77 Honora·**Yas** (77 was Zanzibar Telecom
/ Zantel — the "formerly Zantel" claim holds; MIC Tanzania PLC is now **Honora Tanzania PLC**, Tigo →
Yas on 2024-11-26) · 68/69/78 Airtel · 73 Tanzania Telecommunications Corporation (TTCL) ·
74/75/76/79 Vodacom. **60 is still reserved** (`060AXXXXXX`, "Reserved for future use").

⚠️ **D3's wording is half right and must be re-scored when U2 lands:** `tzPhone` does accept NDCs no
licensee holds, but **60 is now the only such code in 6X/7X**, not "60 and 70".

⭐ **THE LESSON THIS PROGRAMME KEEPS, AND WHY IT IS RECORDED HERE RATHER THAN IN U2:** a numbering
table is a REGULATOR'S document with an edition, and it moved three times in the six years this
plan's version was current. That is exactly why U1's `isGatewayMsisdn` is coarse (twelve digits,
`255` then `6` or `7`) and refuses to know about allocation at all: a table on the money wire goes
stale on TCRA's schedule, and its failure mode is **refusing to text a real customer**. U2's module
therefore carries its edition, its source URL and a `PLAN_REVIEWED` date in the file, and its suite
PRINTS that date's age rather than failing on it. ⚠️ The ITU's E.164 notification for Tanzania
(1.XI.2024) is a primary source but is **two editions behind** — it still shows 66 as Vodacom and
omits 79 — so it is a corroborating source, never the table.

---

### §3c — ⭐ THE SCALE THIS MUST ACTUALLY CARRY (Ali, 2026-09-25) — a premise the plan was NOT written on

> *"keep in mind what we are planning now is not a small contact list to Excel list — it's 150k approx
> contacts, or VCF."* · *"it could be small and could be large."*

**Both ends of that range are requirements, and the small end is the trap.** A design that only works
at 150,000 makes a 40-contact import feel broken (a job queue, a poll, a progress bar, three screens),
and a design that only works at 40 loses the file. Every import unit is therefore specified for BOTH:
the same code path, chosen by measured size, never a second implementation.

**What 150,000 actually costs, computed rather than asserted:**

| | |
|---|---|
| A 150k `.vcf` | tens of MB. ⛔ D18's **1 MB server-action ceiling** makes a direct upload impossible — the file cannot arrive the way the plan assumed |
| One single-segment campaign to 150k | 150,000 × TZS 6 = **TZS 900,000**. The account's measured balance was **TZS 232** (§3), so a full send is ~3,900× the float on hand. ⭐ This is what makes U49's budget cap structural, not a nicety |
| D20's serial `SmsMessage` UPDATE | 150,000 round trips where a grouped update is one. At 5 ms each that is **12½ minutes of pure latency** inside a job that also has to survive a restart |
| D23's `withLock` | `pg_advisory_xact_lock` inside a `$transaction` with a **30 s** timeout. 150k rows cannot pass through it, and §5.5 already forbids holding it across a send or an import |
| Duplicate detection | ⛔ pairwise comparison is 1.1 × 10¹⁰ comparisons. It is a hash on the ONE phone key (U1) — O(n) — or it does not ship |

**What this binds, and it binds them now rather than at the unit:**

1. ⛔ **The file never arrives through a server action.** U23/U27 upload in chunks to a staged row, or
   direct to storage with the server reading it back — decided at U23, but the 1 MB ceiling is not
   negotiable and must not be discovered at U27.
2. ⭐ **Parse is STREAMING, never `readFile` then `split`.** A 40 MB vCard read whole is a 40 MB string
   plus its parsed array in one request's heap. U25/U26 parse a stream into batches.
3. ⭐ **Staging (U29) is the resume point, and the progress bar (U32) counts ROWS STAGED, not bytes
   read.** An import that dies at row 120,000 resumes at 120,000. ⛔ A progress bar that is a timer is
   the defect this plan already names.
4. ⭐ **Every per-row helper is allocation-cheap by construction** — `parseTzNumber` (U2) is called
   150,000 times per import, so its NDC lookup is a prebuilt map and its regexes are module-level
   constants, never rebuilt per call. U2's suite asserts the table is built **once**.
5. ⛔ **No `fetch-all-then-slice` anywhere** — not in the grid (§5.15), not in the pre-flight (U30), not
   in the audience resolver (U24). The count and the page come from the database.
6. ⚠️ **And the small end is asserted too:** every import unit carries a fixture of ~40 rows alongside
   its large one, and the 40-row path must not show a queue, a poll, or an indeterminate spinner.

---

## §4 — OWNER DECISIONS, TAKEN ON ALI'S DELEGATION

*"Take decisions based on what you think is perfect and compatible with our platform… you decide."* Each
is decided, with what it rules out. They are not questions.

**Shape and scope**

- **OD1 · The plan of record is `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`**, guarded by
  `test:marketing-setup-plan`, red control `red:marketing-setup-plan`. One name, in Ali's own words.
- **OD2 · CONTACTS leads.** The address book ships before a single message is sent; the campaign engine
  is useless and dangerous without it, and the contacts page has standalone value (ops, invites, roster).
- **OD3 · ONE key: the bare 12-digit `255XXXXXXXXX`**, the output of `toMsisdn255`, stored in a column
  named `msisdn` on every new model. It is already what `SmsMessage.msisdn` holds, already what the DLR
  cross-check compares, and already governed by name in `read-tiers` §7. A player link is one indexed
  equality: `User.phoneE164 = "+" + msisdn`. ⛔ Rules out a second `phoneKey`/`phoneE164` column that
  could drift.
- **OD4 · `tzPhone` is not touched.** It gates sign-in and both money forms; narrowing it retroactively
  invalidates stored numbers. The new validator is **additive and marketing-only**.
- **OD5 · An unallocated NDC (60, 70) WARNS in the contacts book and REFUSES at dispatch.** An allocated
  but unlaunched NDC (62, 63, 64, 72) is valid and counted on its own line — refusing a real number
  because a regulator's PDF says a licensee has not launched is refusing a number off a business card.
  ⚠️ *Superseded by U2 (S1, TCRA v1.16, §3d) — the codes above are the 2020 edition's.* `parseTzNumber`
  (`tz-msisdn.ts`) is the one verdict: **60 is ACCEPTED and flagged** (TCRA reserved, the operator's own
  IR21 filing says Airtel), **70 is valid** (Honora/Yas), **064 is REFUSED** (allocated to Telxer, no live
  network — billed and never delivered). Since 2026-09-26 the gate's `bad_msisdn` step uses the same verdict.
- **OD6 · No new contact model for players.** A player is not copied into the book; the audience unions
  the book and the player table on the one key, and the `User` row always governs.

**Permission (the part the law writes)**

- **OD7 · A marketing SMS is sent only on CONSENT.** There is no other lawful basis in Tanzania.
- **OD8 · A player's consent is `User.marketingOptIn = true` AND a GIVEN ledger row in a sentence that
  names SMS** — ⚠️ **REWRITTEN 2026-09-26 (audit, on Ali's delegation; COMPLIANCE-DECISIONS § "2026-09-26 ·
  Marketing consent names SMS").** This said the boolean alone was consent "because the profile screen
  says so in the shipped wording". The screens never said so. **What was actually shown:**
  - **2026-06-05 → 06-29** — the register box, one bilingual line for everyone: "Send me product updates
    (optional). *Nipe matangazo (hiari).*"
  - **2026-06-29 → the audit-fix pass** — the same box per language: en "Send me product updates
    (optional).", sw "Nipe matangazo (hiari).", zh "向我发送产品更新（可选）。" (`auth.optionalUpdates`).
  - **2026-09-14 → the audit-fix pass** — the first way to change it after sign-up (E-409), the profile
    toggle "Product news — Occasional news about 50pick. Turn it off at any time …" / "Habari za bidhaa —
    Habari za mara kwa mara kuhusu 50pick …" / "产品动态 — 不定期接收 50pick 的动态 …", on a page framed as
    device notifications.
  - None names SMS or a phone number; only the Swahili register line says "matangazo" (promotions). From
    U6 (2026-09-25) the register and profile acts appended ledger rows — but stamped Swahili and `SW`
    for every player whatever they saw.

  **The wording now (§0 ruling 7 — one name for the one consent, naming sender, content and channel):**
  register "Send me 50pick offers and news by SMS (optional)." / "Nitumie ofa na habari za 50pick
  kwa SMS (hiari)." / "通过短信向我发送 50pick 的优惠和资讯（可选）。"; profile "Offers and news by SMS — Occasional
  50pick offers and news by SMS to your phone number. Turn it off at any time — messages about your account,
  bets and money still reach you." / "Ofa na habari kwa SMS — Ofa na habari za 50pick mara kwa mara kwa SMS
  kwenye namba yako. Zima wakati wowote — ujumbe kuhusu akaunti yako, dau na fedha bado utakufikia." / zh
  "短信优惠与资讯 — …". Every ledger write stores the sentence in the language the person SAW, with that locale.
  **The gate (OQ11's safe default, BUILT):** a player is marketable only when `marketingOptIn === true`
  AND the latest `(SMS, identifier, MARKETING)` row is GIVEN AND its wording is one of the pinned sentences
  in `src/lib/marketing/consent-wording.ts` (append-only literals, never a read of today's dictionary);
  otherwise `no_consent`, detail "consent predates the SMS wording". **The toggle shows EFFECTIVE consent**
  — ON only when the consent part of the gate would pass (the above, no suppression the person created, a
  consent that post-dates any ended break or restore, `rg.ts`). Turning it ON writes `true` + a GIVEN row
  in the shown sentence and lifts a suppression the PERSON created (their stop link) — ⛔ never COMPLAINT,
  OPERATOR or SELF_EXCLUSION; OFF writes `false` + WITHDRAWN. ⛔ No backfill, still — a ledger row nobody
  was shown is a fabricated record, and a "yes" to "product updates" is not a yes to SMS promotions.
  **The card, since 2026-09-27:** a break or self-exclusion in force HOLDS the switch OFF and locked (§0
  ruling 8). The consent sentence always stays on screen. The card answers like the push switch above it: a
  success toast ("Offers and news by SMS turned on" / "… turned off") and, on a failure, a factual toast
  with a title and the next step. A lapsed session answers `signed_out` with nothing written, and the card
  says "Your session has ended. Sign in again, then try the switch." with a Sign in link; when the saved
  state is unknown the page is re-read (`router.refresh`). `recordPlayerMarketingChoice` never guesses: a
  throw after the writes re-reads the state, so `on` is the state READ (or null when even that read fails)
  and `ok` means the re-read matches what was asked. When the account or consent read fails, the card no
  longer disappears: it shows without a switch, with "We couldn't load this setting. Reload the page, or
  contact us to stop offers." and our own support phone and email (`support-config`) — ⛔ never the
  helpline. **From the final visual review (2026-09-27):** the held note's `{date}` is `formatHeldUntil`
  (`src/app/profile/notifications/held-until.ts`) — the page's own language on EAT days, "2 Dec" / "2 Des" /
  "2026年12月2日", the year in en/sw when the end falls in a later year, the EAT 24-hour clock rounded up to
  the minute when the end is under a day away ("27 Sep, 13:01"; zh "2026年9月27日 13:01"), in a
  `whitespace-nowrap` span so it never wraps; the page no longer uses `formatDate` there (the RG page's
  banners still do — §0 ◐ CARRIED (e)). Under zh the held, paused and unreadable-card lines and the
  watchlist hint are `break-keep [overflow-wrap:anywhere]` with `text-pretty`, and their zh strings
  (`push.marketingPaused`, `marketingHeld`, `marketingHeldNoDate`, `marketingUnavailable`,
  `watchlist.alertsHint`) carry U+200B phrase hints; `push.marketingBody` is deliberately left without
  hints or `break-keep`, because it is fixed consent evidence. The push card no longer shows its own
  "Notifications" eyebrow (the page header carries it), and the watchlist block is one whole-row link to
  `/watchlist` (`data-testid="notifications-watchlist"`) with its count at 13px (`text-body-sm`, was 11px).
  Dev-only capture aids, both no-ops in production: `POST /api/dev-test/marketing-consent-seed?do=break`
  (`&period=1h|24h|1w`, default `1h`) takes a REAL break through `coolOff` — the row, the COOLED_OFF status,
  the holder hook, the audit row, the email and the in-app notice — without signing the player out, so the
  HELD card shows at once; `?do=end-break` is gone and answers 410 (a break cannot be ended early, and the
  direct RG write it made was a state production never reaches). The PAUSED card is photographed after a
  `1h` break has really ended, with consent given before the break. And
  `/profile/notifications?qa_consent=unreadable` renders the read-failure card. Guards:
  `test:marketing-consent` T8–T8g (held), T9–T9b (the re-read), C0–C11 (the card's source rules, RG copy,
  the held date in the page's language, `break-keep` only where hints are) and H1–H5 (the date formatter on
  a fixed clock), with the toggle, card and held plants in `red:marketing-consent` (its summary reads
  `gate · loop · toggle · card · held`; toggle case 2 now plants the defect in both the service and the
  store's lift filter, beside control T2c: the store refuses on its own); re-derive the counts from a run.
- **OD9 · An imported contact is marketable only when BOTH hold**: a `MessagingConsent{GIVEN}` row with
  the **verbatim wording** the person was shown, **and** a first-party basis (our own form, our own
  event, our own agent roster — the person gave us the number). ⛔ A bought or third-party list is
  STORED and never marketed; its rows carry `UNKNOWN` and the audience query cannot return them. ⚠️ **`UNKNOWN` IS NOT IN THE SHIPPED ENUM.** U6 shipped `MessagingConsentStatus` as `GIVEN | WITHDRAWN`, because those are the only two states anything writes today. Adding `UNKNOWN` is a value on an EXISTING enum, which Postgres refuses to use in the transaction that adds it (`55P04`, measured on 18.3) — so it must ship in its OWN migration ONE COMMIT before U33 writes it. ✅ **CORRECTED 2026-10-01 (S10, U33a; decisions X5 · X23): the premise is void and no enum value ships.** A bought or third-party list writes NO ledger row at all, so `MessagingConsentStatus` stays `GIVEN | WITHDRAWN`; `UNKNOWN` lives only on the book row's cache (`ContactConsentState`, U18a), and the gate refuses a number with no GIVEN row exactly as before.
- **OD10 · Consent can never be granted by a file.** No column alias, no checkbox, no import path may set
  consent to granted; a withdrawn row can never be re-granted by a spreadsheet. ⛔ Un-buildable, not
  defaulted off.
- **OD11 · Suppression is checked BEFORE consent**, and a suppression row is never deleted — not by
  contact deletion, not by re-import, not by an officer. Deleting one re-permits marketing to someone who
  said stop. *(Since U8/S5 a row may be SUPERSEDED — `liftedAt` — and since 2026-09-26 only by the person's
  own act on a stop the person made, reason `WITHDRAWN`: the `/s/` resume or the profile toggle ON. A
  COMPLAINT, OPERATOR or SELF_EXCLUSION row is never lifted by the person. ~~⚠️ The DAL half — re-arm
  precedence and a reason filter on `lift` — is owed before U16/U23, §0 ⚠ RECORDED.~~ ✅ 2026-10-01: that DAL
  half LANDED in S7c — the re-arm precedence and the WITHDRAWN-only `lift` in both twins, guarded by
  `test:dal-parity` 17.supersede / 17.liftreason — so it gates neither U16 nor U23 (decision M9).)*
- **OD12 · Marketing suppression on self-exclusion uses `selfExclusionStanding`, never `isLockedOut`**,
  and treats any self-exclusion as lasting at least six months (GN 478T reg 48(3)), lifted only by an
  officer restore **plus** a fresh consent after restoration. ⛔ `isLockedOut` itself is not modified.
- **OD13 · Cooling-off and `detectHarmMarkers` also suppress marketing**, with their own skip reasons.
- **OD14 · 18+ is enforced in the loop.** An account's `dob` must yield ≥18; a contact with no account
  is marketable only when the import recorded an explicit 18+ attestation with the consent. Unknown age
  is `skipped`, never sent. *(Since 2026-09-26 the identity check is asked too: a final KYC refusal
  refuses, and a KYC document date of birth makes the YOUNGER age govern — §9 U11.)*
- **OD15 · One message per number per 72 hours, four per 30 days**, counted from `SmsMessage` rows with
  purpose MARKETING, enforced inside the loop.
- **OD16 · The send window is 08:00–20:00 EAT**, self-imposed, server-evaluated in the loop. ⛔ The
  document states plainly that no statute imposes it; the window is ONE named constant (`SEND_WINDOW_EAT`),
  so the answer to OQ5 is a one-line change. Outside the window rows are **HELD**, never failed. *(This
  said "the two candidate windows"; only one was ever named anywhere — corrected 2026-09-26.)*
- **OD17 · ~~Dispatch is closed until a Gaming Board advertising approval is on file~~** — ⛔ **WITHDRAWN
  2026-09-26 on Ali's ruling (OQ1): the Board says marketing SMS is not part of its approval.** No approval
  record is built or required. What stays checked at Start and in the loop is the gate itself (consent,
  suppression, RG, age) and, when U41 lands, the officer authorisation.
- **OD18 · ~~Two officers above 50 recipients or TZS 10,000~~** — ⛔ **WITHDRAWN 2026-10-04 (U41, OD60): one
  officer's typed confirmation authorises a campaign at any size**, under Ali's 2026-07-24 single-admin ruling
  (`test:two-admin` asserts there is no two-officer hard-lock). ~~Reusing `twoOfficerGate`; the approver may not be
  the composer; the authorisation carries an id, expires in 60 minutes, and is re-checked in the loop.~~ Nothing of it
  is built.

**Engine**

- **OD19 · Hybrid driver: a leader-leased pump is the authority, the open page is an accelerator.**
  Browser-only stops when the laptop closes; pump-only gives no feedback. Both drive the same conditional
  claim, so they cannot conflict — the loser's `count` is 0.
- **OD20 · The pump has its OWN timer and lease and yields to the lifecycle ticker** (`if
  lifecycleTickerHealth().running return`). ⛔ Marketing never delays money, mechanically.
- **OD21 · No lock on the send path.** `withLock` wraps state transitions only (confirm/start/pause/
  cancel), never an HTTP call. Claims are conditional `updateMany` with a token.
- **OD22 · A number messaged twice is unrepresentable**: `@@unique([campaignId, msisdn])` + the
  conditional claim + the one normalization key. All three, or the property is gone.
- **OD23 · A message we are not sure about is `UNCONFIRMED`, never retried automatically.** The claim is
  written before the HTTP call, so an interrupted slice does not know whether the gateway took it;
  re-sending is a second charge to a real person. Retry is an explicit operator act on a named failure
  set, and it re-runs the whole gate.
- **OD24 · GROWTH reads SEGMENTS; TZS renders only to a role holding the accounting tier.** Segments are
  the honest unit anyway — the gateway bills per segment.
- **OD25 · Every number is masked on every contacts and campaign surface for every role**, revealed only
  through `<Sensitive>` with a `pii.revealed` audit row. The operator chip is derived from the NDC, so a
  masked row still shows "Yas" — the fact the marketer actually needs.
- **OD26 · Counts are always a `groupBy` over rows.** ⛔ No stored counters: two surfaces cannot disagree
  if only one number exists.
- **OD27 · The typed-number confirmation compares against the count the SERVER recomputes**, never the
  one the client posted. A gate built from the value it checks can never fail.
- **OD28 · Above the confirmed audience, Start refuses** (`audience_moved`) and sends nothing; below it,
  it proceeds and reports. More people than were approved is money nobody approved.

**Contacts and import**

- **OD29 · CSV, vCard and paste are parsed in the BROWSER and posted as rows**; XLSX goes to one server
  action as base64, capped at 700 KB, with the remedy named ("save it as CSV — there is no size limit").
  ⛔ Rules out raising the global 1 MB body limit (the money forms inherit it) and rules out inventing
  the console's first multipart upload endpoint alongside everything else.
- **OD30 · The import STAGES rows in the database**, so a run survives a closed tab, a reload and a
  deploy — and the totals come back from the server, never from client arithmetic.
- **OD31 · The pre-flight writes nothing**, and its six buckets are asserted to add up to the rows read.
- **OD32 · `msisdn` is `@unique` on the contact book**, so duplicate detection is the index, not a
  pre-check that can be raced. "Add a second row" is therefore not offered — the three choices are keep /
  take the file's version (tags MERGE) / fill blanks only.
- **OD33 · In-file duplicates: the FIRST row wins**, the rule is printed on screen, and the loop never
  sorts.
- **OD34 · The progress bar counts rows the server reports written.** ⛔ Never a timer, never an eased
  animation, never an optimistic increment.
- **OD35 · No undo, said out loud** — and instead: a pre-flight that writes nothing, an enumerated
  overwrite confirmation, a run record naming every row touched, and a filter on the run id so "remove
  everything that run created" is one click the OPERATOR performs.
- **OD36 · One audience resolver.** The list, the whole-book counts, every bulk action, the export and
  the campaign all read `contactAudience(filter)`; a ticked-row selection is expressed AS a filter. ⛔
  This is the Awarkeh debt (two send paths) made structurally impossible.

**Screen**

- **OD37 · Zero tabs in this programme** — §K 7a fails on all three routes; the recipient-state rail is a
  FilterPill rail, because it chooses which rows show.
- **OD38 · Zero new keyframes, zero new tokens, zero new durations.** Every motion is a primitive that
  already ships with its reduced-motion branch. ⛔ No indeterminate bar (`progress-bar.tsx` is
  deliberately determinate), no count-ups, no pulsing dot.
- **OD39 · No global progress strip.** A nav `CountBadge` on "SMS campaigns" counts campaigns wanting
  attention — a reachability signal that cannot go stale and lie.
- **OD40 · Failures are grouped by reason with the dominant one visible**, and "not receiving" is neutral
  ink, never danger. Nothing failed: the consent gate worked. ⛔ Retry is offered only for retryable
  reasons — never for a skip.
- **OD41 · `accepted` is never rendered as delivered.** ⭐ Amended 2026-09-23: receipts now arrive
  (§3a), so the page's honesty line is rendered FROM THE DATA — "no receipt yet for this campaign" while
  none has landed, and gone by itself once one does. ⛔ The rule it protects is unchanged: handing a
  message to the gateway is not delivery, and only a receipt earns the delivered count.
- **OD42 · One campaign carries a required Swahili body and an optional English one**; per-recipient
  selection from `User.locale`, defaulting to Swahili; an empty English body means everyone gets Swahili,
  stated on screen. ⛔ No machine translation, ever. Exactly one placeholder, `{jina}`. ⚠️ **Amended
  2026-09-26 (audit):** `User.locale` was written `"SW"` for EVERY account registered before the audit-fix
  pass, whatever language the player used; from that pass registration stores the language the sign-up
  form was shown in (since 2026-09-27 the form's own hidden `shownLocale`, the `kp-locale` cookie only as
  the fallback — §5.7). The language menu still writes only the cookie, so
  a later switch never reaches the column, and the profile's basics form accepts `EN` or `SW` only (no
  `ZH`) — U37/U43 must not treat `User.locale` as a live language signal until something writes it on a
  switch.
- **OD43 · The opt-out link is a per-recipient 8-character token at `/s/<token>`**, never expiring, no
  login, one click out with resubscribe beside it. Its length is pinned by a guard against a real minted
  token, and the footer is composed BEFORE the message is sized. ⚠️ **Shipped as ONE action at a time**
  (`optout-client.tsx`, the "EXACTLY ONE ACTION" comment): two opposite buttons side by side invite a
  mis-tap on a one-tap page, so the way back is offered after a stop and on an already-stopped load, and
  "stop" after a resume. Since 2026-09-26 the resume shows and records its OWN consent sentence (§9 U8),
  and the token is matched case-insensitively.
- **OD44 · The statutory footer is appended by the engine and cannot be removed by any control**, and the
  body must BEGIN with `50pick` (ETA s.32(1)(b)). Both are counted in the segment arithmetic.
- **OD45 · The sender ID is a server constant.** ⛔ Never operator-editable — a spoofed header is a
  Cybercrimes Act offence.
- **OD46 · `HOW-TO-SEND-A-CAMPAIGN.md` is written for Ali in plain words**, by the session that ships the
  live page, and an operator who did not write it follows it once before the Seal.
- **OD47 · An erased number is indistinguishable in the import preview** (S10, U31-A, after review). Every decision
  carries `shown` — what a browser may see — beside `reason`, the server's truth. An erased row shows exactly what an
  ordinary in-book contact holding the file's own values would (keep → "kept, your choice"; take the file's version or
  fill blanks → "no change"), and like any number it still shows "on the stop list" and "repeated in this file" — a
  disguise that dropped those two would itself be the tell. No preview or plan carries a contact id. The server's own
  count still says erased.
- **OD48 · One campaign, one verdict** (S10, U37a). Before any recipient's message the renderer re-runs the WHOLE stored
  template's check — both languages, the worst-case counter, the fallbacks, the source-line rules — and refuses every
  recipient if any part fails. Never a half-sent campaign whose confirmation counted people who were then refused.
- **OD49 · The source phrase is the footer's own line, capped, and priced in while blank** (S10, U37a; OQ3 / G5). At most
  30 septets; while it is blank the composer reserves that room, so the officer's single-message room is 80 characters
  until G5 supplies the wording (then 111 minus the phrase and its space). A BOOK contact is refused at render while the
  phrase is blank; an account recipient is not. A blank phrase is not a save error — a players-only campaign saves and
  sends.
- **OD50 · Draft consent wordings reach nothing in production** (S10, U33a, Option A). While the catalogue reads DRAFT
  (until G4), no production entry — any `src/app` file, any `"use server"` module, the boot hook and the proxy — may
  import the catalogue or a draft writer, directly OR through its imports (a commit action that calls a helper that
  calls the writer counts). The gate may read the catalogue; an uncalled writer and its in-memory tests may land.
- **OD51 · `test:read-tiers` joins `predeploy` at U29b** (M10), not U30 (X26) — the earlier of the two.
- **OD52 · The masked contacts export drops `source` AND `consent`** (X11 with A1.1: until U33 a recorded consent can
  only come from a player, so it is a player signal like the source).
- **OD53 · A masked viewer's KPI band carries no consent split** (S10, the U23 review's F1 — amends A1.1). A1.1 kept
  whole-book counts for every role ("a count over the book is not a per-number answer"); U22's add and U23's one-row
  writes broke that premise — whether "Consent given" fell after ONE ticked row's withdrawal says what that row was, and
  until U33 only a player writes GIVEN. A viewer whose identity.contact cell is not `read` gets "In the book" and
  "Added in the last 7 days" (OD54 took "Suppressed" out too) in the `1-lg2` rung, which holds the four-tile band's
  rows at every width (no skeleton jump).
- **OD54 · D19 covers SUPPRESSION too — decided, BUILT (`ef72dcd7`)** (S10, from the U23 review). Until the import goes live a
  stop comes from a player's own opt-out link or from an officer, and U22's add makes ANY number typeable — so for a
  masked viewer the per-row stop, the `suppressed` URL axis, the Suppressed KPI and a suppression's split answer "is
  this a player?" exactly as consent did. They go for a viewer whose identity.contact cell is not `read` (the loader
  refuses a typed `suppressed` with the role refusal, as A1.1 does), in their own change; the masked band's second
  tile then becomes a neutral whole-book fact.
- **OD55 · A campaign audience never holds a whole phone number** (S10, from U35b's hand-off). U24's filter keeps a
  whole-number search as its bare `255…` key, and a confirmed campaign freezes its filter: a number frozen there is a
  key erasure would have to chase (U16), and a campaign that targets one person is a message to one person, which is
  only ever the officer's own test send. So U37b's save REFUSES an audience whose `q` is a whole number (a name search
  stays), with a sentence on the audience card, an executed assertion and its own plant.
- **OD56 · The cache mirror keeps the row's own `updatedAt` — decided, BUILT (`980ebbce`)** (S10, found while building OD54).
  `mirrorContactCache` stamps the caller's instant when it rewrites a row's consent/stop cache, and that `updatedAt` is
  the edit dialog's compare-and-set token, carried to the browser. So a masked officer could read it, suppress (or
  withdraw) ONE row, and read it again: it moves only if the row had no stop (or no withdrawal) before — the very
  signal OD54 and A1.1 hide. The mirror will write `row.updatedAt` back unchanged: a cache refresh is not an edit, and
  an officer's compare-and-set then moves only on officers' edits (the edit patch carries no cache field, so nothing
  is overwritten). One line in `contact-cache.ts`, with an executed assertion and its plant; the suites pinning the
  mirror's stamp (dal-parity §20, `test:contacts-audience` 6.6) are re-read first.
- **OD60 · A campaign is authorised by ONE officer's typed confirmation, at any size — decided (U41, S10 2026-10-04)**,
  under Ali's 2026-07-24 single-admin ruling (COMPLIANCE-DECISIONS § "2026-07-24 · Single-admin resolution by default;
  two-admin authorization optional; officer-conflict block removed"; `test:two-admin` asserts there is no two-officer
  hard-lock). OD18 is withdrawn: no second officer, no 60-minute grant, no in-loop re-check of an authorisation. The
  owner's control over sending is the live switch (G1) and Start as a separate act (G2) — a confirmed campaign never
  sends by itself. A two-officer toggle for campaigns is not built; if Ali asks for one it follows
  `resolution-policy.ts`'s optional-toggle precedent, never a hard lock. Guard (lands with U40a): `test:campaign-gates`
  G7.1 — nothing under `src/lib/server/marketing/` or `src/app/admin/campaigns/` calls `twoOfficerGate(` or reads a
  second approver — with its in-process plant. Recorded in COMPLIANCE-DECISIONS § "2026-10-04 · Marketing campaigns
  are authorised by one officer's typed confirmation".
- **OD61 · A typed test writes NO RG COMPLIANCE row — decided (U37c-1, S11 2026-10-05)**, on the adversarial review's
  MAJOR finding: the `/admin` overview's live activity feed shows the newest audit rows (`action · targetType#id`) to any
  overview viewer, GROWTH included, so a `marketing.suppressed.rg · User#…` row appearing the moment ONE officer-typed
  number is refused would tell a masked officer that the number is a protected player — the D19 oracle §7.1/§7.2 exist
  to prevent. The spec's §8 row for that line ("dispatch.ts and the typed pre-check, through one helper") is superseded
  for typed tests: neither the pre-check nor dispatch's re-ask writes it (`SliceDeps.rgAudit`, a no-op that only the
  typed test passes); the masked `marketing.campaign_test` row records the collapsed `protected` reason. A campaign's
  send loop still writes the line. ⚠️ OWED before U43 writes RG lines in bulk: the overview feed itself shows COMPLIANCE
  rows to non-compliance viewers — restrict it to a compliance view (`houseAuditForConsole`, the house console's file,
  not this programme's). Guard: `test:campaign-compose` §18.30 (the loop's own row is its control) and §18.14's wire.
- **OD62 · The live switch closes itself, and opens through two audited doors only — decided (U49s-1, S12 2026-10-06;
  ENGINE-SPEC E13).** The `marketing.sms.live` row is `{ enabledBy, enabledAt, closesAt }`: an opening lasts 30 min – 24 h
  (2 h unless chosen) and reads CLOSED from `closesAt` on — nothing has to run for a forgotten switch to close, and the
  gate checks the instant itself. Two doors call the SAME two writers: the owner's card on Admin → System (U49s-2,
  `requireOwner`) and the ops door `npm run ops:marketing-live-switch` (Claude on Ali's G1 delegation, refused unless run
  through `railway run` in production's environment, with its own audit secret). OPEN reads first — never over an opening,
  never over an unreadable switch — and RECORDS FIRST (`marketing.live_switch_opening`, before the row exists, so there is
  no instant at which the switch reads on without a record naming it), then writes CONDITIONALLY — it creates the row only
  where none exists, or replaces only the exact stale row it read (`createConfigIfAbsent` / `replaceConfigIfValue`), so of
  two openings in the same instant exactly one stands and the other is told whose (the third review's MAJOR-2: an upsert
  let the second replace the first after the first was told "on until 09:30") — reads back and confirms
  (`marketing.live_switch_opened`). ⭐ The first review's MAJOR: every path that cannot stand behind an opening — a write
  that threw (it may have committed), a read-back that failed or disagreed, a confirmation not recorded — goes through ONE
  rollback that deletes only the row this call wrote (a compare-and-delete on jsonb, proven on PostgreSQL 18.3 by
  `db:probe-marketing-settings`) and says "off" only on a read that proves it; otherwise the owner is told it "couldn't be
  confirmed off — switch it off now"; every such ending is recorded (`marketing.live_switch_open_failed`, with what was
  found). A second owner's opening is never taken. CLOSE removes the row with DELETE … RETURNING and records exactly the row
  it removed — an opening, or an expired or old-shape row (`was`) — so no stale row outlives the code that knows it is
  stale. ⭐ The third review's MAJOR-1: a delete that commits and loses its reply is not "nothing happened" — the close
  looks before it tries again, RECORDS the close (`was: unknown`) once a readable read proves the row it read is gone,
  never says "It was already off", and never deletes an opening that landed after it (that one stands, and the owner is
  told it is on again). ⭐ The fourth review's MAJOR: "gone" is decided by comparing the STORED VALUES, and only against a
  first read that succeeded — an unreadable first read set beside an opening still standing once recorded a close that
  never happened; a close tries again only on a readable look showing the very row it first read, and then deletes only
  that row (a compare-and-delete); with no read to be had it answers `close_unconfirmed`. Only a switch with nothing to
  remove writes nothing. ⭐ The fifth review (no MAJOR): a readable proof that the row is gone is never thrown away, and
  with no read after a close whether somebody's opening stands comes from the look that proved it — never "off" over it;
  ONE rule (`openingSince`) says what an opening is wherever a writer asks. Taken on Ali's standing delegation of technical calls, beyond the spec: an `enabledAt` more than
  a minute in this server's future, or a date that does not round-trip (30 February), reads malformed — and such a row,
  another writer's opening stamped by a clock ahead of this one, is never replaced as stale (`already_open`; the fourth
  review's m4), while the ops door refuses to OPEN from a PC whose clock is over 20 s off the database's (a close only
  warns — a stop never waits on a clock); the ops door's
  `by`/`reason` are NFKC-normalised, hold no hidden, default-ignorable or lone-surrogate characters and at most six
  numerals of any kind across the two (a phone number has no place in an append-only chain). Known limit: a row holding
  jsonb `null` (SQL by hand only) reads absent and blocks the switch until it is deleted by hand. Guards:
  `test:marketing-settings` S1–S7 · `test:campaign-compose` §18.6 · `db:probe-marketing-settings`.
- **OD63 · One Marketing SMS settings record — decided (U49s-1, S12 2026-10-06; ENGINE-SPEC E14).**
  `marketing.sms.settings` = the price per SMS (TZS 6, G9), the credit kept for login and withdrawal codes (TZS 20,000),
  the most one campaign may spend (TZS 10,000, G3) and the send window (08:00–20:00 EAT — OQ5's `SEND_WINDOW_EAT`, the one
  constant U13 re-exports), owner-editable on Admin → System → Marketing SMS (U49s-2). One pure rule is shared by the tab
  and the server (every problem at once, each under its own box); the row is replaced whole; a stale page is refused; a
  row it cannot read in full reads `readable: false` and refuses every save. ⭐ A caller that ACTS on a setting re-reads it
  (`reloadMarketingSmsSettings`) and refuses on `readable: false` — the spec's `Promise<MarketingSmsSettings>` signature
  was widened so no caller can act on a stale or half-read value without seeing that it is one. It replaces the
  `SMS_PRICE_PER_SEGMENT_TZS` variable (never set on Railway — checked with `railway variables`, names only), so G9's TZS 6
  is in force with no Railway change; the estimate re-reads the record for every estimate and prices nothing from a
  half-read row. Known gaps, recorded in the module: the factory's ADMIN row is fire-and-forget (U33w m5); two owners
  saving in the same instant can both pass the stale check. Guards: `test:marketing-settings` S8–S10 ·
  `test:campaign-estimate` 2.5 · `db:probe-marketing-settings`.
- **OD64 · The Marketing SMS card and tab: owner-only acts, nothing withheld from a stop, no money to a viewer who may not
  read it — decided (U49s-2, S12 2026-10-06; ENGINE-SPEC §4.3 decision 8).** The "Marketing SMS sending" card stands
  above Admin → System's rail (a kill-switch, §K 7d) and the settings are a fifth tab. Taken on Ali's standing delegation
  of technical calls, beyond the spec: (1) "Switch off now" is offered while the switch reads malformed or unreadable,
  not only while it is on — a stop is never withheld, and an opening stamped by a clock ahead of this one would
  otherwise block "Switch on…" with no way to clear it; (2) a refused switch-on is titled "weren't switched on" only for
  a refusal made before the click wrote anything; one that wrote and was taken back (proven off) "didn't complete"; any
  other (a reply lost after the server opened it, a read that failed, a write that lost a race) is "Couldn't confirm
  whether marketing SMS are on"; `already_open` and "already off" are worded from the server's read after the answer,
  never from the page as it was before the click; no title repeats its body or contradicts the card's state, and a
  refusal stays on screen until it is dismissed; (3) the owner's own
  money.figures cell is honoured: an owner who hid money reads the settings as text, with the sentence why (D3); (4) a
  settings record that cannot be read in full shows no value — its gaps hold defaults nobody chose; (5) whether a viewer
  is the owner and may read money is asked of ONE loader in `estimate.ts` (`loadSmsMoneyForViewer`, one read of the
  stored role), never of the decider from a page; (6) another role sees the card only once the owner grants it the ops
  view on Roles (only ADMIN holds it by default), and then with the buttons disabled and the reason beside them; (7) the
  duration is six radios inside the dialog, not the kit select (whose list VoiceOver cannot reach inside an aria-modal
  dialog). Guards: `test:marketing-settings` S6 · S11 · S14 · `qa:marketing-settings`.
- **OD65 · Before a campaign sends, a viewer who may not read a number is shown the COUNT ALONE, at every size — decided
  (U38b, S14 2026-10-07, on Ali's delegation; the U38b pre-review's D19-1; amends ENGINE-SPEC E23 and §4.4 decision
  7).** The spec's floor of 10 (`MASKED_BREAKDOWN_MIN`) cannot hold: a GROWTH officer — who may add contacts and tag
  them — can pad a tag or a list with nine numbers of their own whose verdicts they know, and the tenth person's verdict,
  protected standing included, is the difference between two counts. So the composer's audience card (and, when it
  lands, U40's confirmation) shows such a viewer how many people match — the ONE walk's count, `campaignAudienceCount`
  — and nothing else: no will-receive figure, no reason, no sample, and the gate is NEVER asked about the people a masked
  officer chose, so no verdict exists to leak, not even through how long the answer takes. A reader sees everything, as
  before. The floor of 10 stays for the surfaces that count messages actually SENT (U47b's live page, U48a's results),
  where every probe costs a real campaign — the owner's live switch, a typed confirmation and an audit row; that
  residual is recorded for them. Told to Ali in plain words the same day ("staff who can't see phone numbers will see
  only how many people match, never the breakdown"). Guards: `test:campaign-audience` B6 (R-B6 · R-B6b · R-B6c ·
  R-B6d · R-B6e), B4 (R-B4c), `qa:marketing-audience`.
- **OD66 · A viewer who may not read a number counts the contact book OR the player accounts — never both at once —
  decided (U38b, S14 2026-10-07, on Ali's delegation; the U38b review's #1).** The ONE walk counts a number the book
  holds once (a player whose number a live book row holds is skipped in the player phase, X8), so with both arms on, one
  contact added by a GROWTH officer moves the count by 0 or 1 as that number is or is not a player's — "is this a
  player?" through a bare count, which OD65 alone does not close. So the campaign door (`campaignAudienceRefusal`)
  refuses `pop=both` to such a viewer, naming `pop` in its own words ("For your role, choose the contact book or player
  accounts — not both together."), and their Who pills offer the two alone; the card's read, the save and U40 inherit
  it; a draft a reader saved with both is "hidden for your role" to them, as any filter their role may not use. A
  reader keeps all three. Guards: `test:campaign-audience` B3m (R-B3m · R-B3n), B6.
- **OD67 · Before a campaign sends, a viewer who may not read a number confirms by typing the count, never by a list —
  decided (U40a, S14 2026-10-07, on Ali's delegation; the U40a review's finding beside its MAJOR; extends OD65).** The
  confirmation's list — a masked number and an operator for each person — went to every role, beside a members key
  that named the same people alike on every draft holding them, so a GROWTH officer could set a one-contact tag beside a
  one-minute window of player accounts and read "is this contact a player?" off two equal keys, the question OD66
  closed. So U40's confirmation shows such a viewer the COUNT ALONE at EVERY size — no sample and no list — and always
  uses the TYPED tier: they type the number, because a list of numbers they may not read is not one they can check.
  Their watermark carries no members key, and the confirmation holds its fresh claim to the same tier, so a list
  watermark they post is refused as a typed tier is refused without its number (`typed_required`), and what they confirm
  is frozen TYPED. A reader keeps both tiers and the list, as built; the members key is bound to its draft (its id and
  revision inside the HMAC), so no two drafts share one. Guards: `test:campaign-gates` G6c (R-OD67), 2.2b (R-2.2b), 4.18.

### §4a — The eleven legal questions (each with the safe default that is BUILT)

| Id | Question for Ali + a lawyer | Safe default shipping meanwhile |
|---|---|---|
| OQ1 | Does 50pick hold a Gaming Board advertising approval, does it cover SMS (Code cl. 2.2.6 requires PRIOR WRITTEN approval), and has our own advertising code of practice been submitted (GN 478T reg 56(2))? | ✅ **ANSWERED by Ali, 2026-09-26: the Board says marketing SMS is not part of its approval** — read as "we can send … as long as we have [an] SMS gateway" (his words as typed are in `COMPLIANCE-DECISIONS.md` § "2026-09-26 · Marketing SMS rulings"). No approval record is required; OD17 and §5.3 are withdrawn. Consent and the RG gates stay (they are other law) |
| OQ2 | Is 50pick registered with the Personal Data Protection Commission (PDPA s.14(1))? | ✅ **ANSWERED by Ali, 2026-09-26: not needed.** He typed "pdf is not needed", read as PDPA registration (the only open question it could answer; `COMPLIANCE-DECISIONS.md` § "2026-09-26 · Marketing SMS rulings" keeps the words as typed apart from the reading). The contacts import does not wait on a registration reference |
| OQ3 | How must ETA s.31(c)'s "source of the personal information" be given inside a 160-character SMS? | For any non-account source the footer carries a short source phrase and the opt-out page states the particulars in full. If the answer is "in the body", it costs a second segment — priced in §9 U4. *(Since 2026-09-26 the cap is ONE segment (`SMS_MAX_SEGMENTS` = 1, §9 U3), so the phrase costs operator budget instead — 111 → about 85 GSM-7 characters with a realistic phrase, counted with its trailing space.)* |
| OQ4 | Which helpline is correct — our `0800 11 0011` or the Gaming Board code's `0800110051`? | ✅ **ANSWERED by Ali, 2026-09-26: "the right helpline is ours"** — recorded as: the helpline 50pick already publishes, `0800 11 0011`, is the right one. ⛔ Not a claim that 50pick runs it: the site labels it the national helpline (RG §5, `support-config.ts`). The marketing footer reads `support-config.ts`'s number; `test:campaign-compose` §12 asserts ONE helpline, and since 2026-09-26 `red:campaign-compose` carries a plant that puts the Board's number back into the footer (§12 had none); D6 closed |
| OQ5 | Are there lawful quiet hours for promotional SMS? (Nothing found imposes any; the 6am–2pm blackout is radio/TV only) | 08:00–20:00 EAT, self-imposed, documented AS ours, ONE named constant (`SEND_WINDOW_EAT`) — the answer is a one-line change to it |
| OQ6 | `/legal/responsible-gambling` §4 promises no marketing to "players under 25 in vulnerability segments" — build the segment, or re-version the page? | ✅ **ANSWERED 2026-09-26 on Ali's delegation (U12, COMPLIANCE-DECISIONS § "2026-09-26 · RG Policy v2026-09-26"):** BOTH — the segment is defined and built (under 25 + a self-exclusion or break ever on record, refused until 25), and §4 re-versioned v2026-09-26 to name only what the gate runs; the late-night bullet cut |
| OQ7 | Does marketing suppression follow the player's chosen self-exclusion period or GN 478T reg 48(3)'s six months? | Six months minimum, and permanent absent a fresh post-restoration consent |
| OQ8 | Does the Blackball account have an inbound number for STOP keywords, and what is the payload? | Link-based opt-out only (`/s/<token>`, U8 — built). ⚠️ Inbound STOP is **NOT built**: a reply reaches nothing today and the person stays marketable. §9 U46 owns it. ⛔ No reply keyword is printed in any message until it is live. *(This cell said inbound STOP was "specified and built behind a guard"; nothing inbound existed — corrected 2026-09-26.)* |
| OQ9 | What is the authorised wording of the "condensed responsible gaming message"? (The Code uses the term four times and defines it nowhere) | Shipped: `18+` and the published helpline (OQ4) — no compressed RG sentence is carried; adding one re-prices the 49-septet footer (§9 U4). ⛔ No new Swahili sentence is invented |
| OQ10 | Is an operator attestation ("collected on our form, holder is 18+") sufficient evidence of consent for an imported contact? | Yes, recorded verbatim with a proof note, and marketable only on a first-party basis — everything else is stored and never marketed |
| OQ11 | Do opt-ins given before the SMS-naming wording shipped (the 2026-09-26 audit-fix pass) under "Send me product updates" / "Product news" / "Nipe matangazo" / "Habari za bidhaa" — none of which names SMS — cover promotional SMS, or must those players consent again under the SMS-naming wording? (Raised by the 2026-09-26 audit; OD8) | **Not covered — BUILT.** A player is marketable only with `marketingOptIn === true` AND a latest GIVEN ledger row whose wording is one of the pinned SMS-naming sentences (`src/lib/marketing/consent-wording.ts`, append-only); an older "yes" is `no_consent`, detail "consent predates the SMS wording". No backfill: the player is asked again (register box, profile toggle, or the opt-out page's resume). ⛔ Only Ali may relax it |

---

## §5 — HARD RULES (law first, then platform)

**5.1 · Consent is the only basis.** ETA Cap 442 R.E. 2022 s.32(1)(a) and EPOCA GN 61 reg 7(4)(a) both
forbid unsolicited commercial SMS without the recipient's consent. PDPA Cap 44 s.23(1) requires personal
data to be collected **directly from the data subject**, and Tanzania has **no legitimate-interests
ground** (50pick's own recorded position, `docs/COMPLIANCE-DECISIONS.md`, 2026-09-15). ⛔ No soft opt-in
audience is built anywhere.

**5.2 · Every marketing SMS: identity and purpose at the START, opt-out in EVERY message, the condensed
responsible-gaming message (`18+` plus the published helpline) at the END.** ETA s.32(1)(b)–(c), s.32(2)(d);
GBT Code cl. 3.7.1–3.7.2 (the Code names `0800110051`; on 2026-09-26 Ali ruled the right helpline is the
one 50pick already publishes, `0800 11 0011` from `support-config.ts` — OQ4). Engine-composed,
un-removable, counted in the segment arithmetic; `test:campaign-compose` §12 refuses a second number.

**5.3 · ~~A gaming advertisement needs the Board's approval; unsolicited SMS needs its PRIOR WRITTEN
approval.~~** ⛔ **Withdrawn 2026-09-26 on Ali's ruling (OQ1):** the Board told him marketing SMS is not part of
its approval. The regulation text (GN 478T reg 56(1), Code cl. 2.2.6) is left cited here as the reason the
question was asked; the Board's own reading is the one 50pick acts on. §5.1, §5.2 and §5.4 are other law and stand.

**5.4 · No promotional material to a self-excluded player during the exclusion period.** GN 478T reg
49(3), and 50pick's own published §4. The predicate is `selfExclusionStanding`, never `isLockedOut`.

**5.5 · Never a lock across a send or an import.** `locks.ts:142` — 30 s transaction timeout.

**5.6 · The gates run INSIDE the send loop, immediately before dispatch.** SLICE-WIDE first: campaign
status, the send window (U13) and, when U41 lands, the officer authorisation. If any refuses, EVERY row of
the slice is `held`, because nothing about any person was decided. Then PER RECIPIENT: `suppression →
consent (the toggle AND an SMS-naming GIVEN row, OQ11) → self-exclusion → cooling-off → harm markers → age
(the account's date of birth and the identity check, U11) → under-25 history → account status (incl. a
final identity refusal) → frequency cap → dispatch`. A per-person refusal is `skipped`, never `failed`.
Somebody who opts out in minute two must not receive minute four's message. *(Rewritten 2026-09-26: this
put the window after the per-person gates and still listed the withdrawn Board approval, while ▶ NEXT and
U43 need the window slice-wide, and it omitted the shipped under-25 and account-status steps.)*

**5.7 · Consent wording is stored VERBATIM, in the language the person SAW, and never re-rendered from
current strings.** The register form and the profile switch post the language they were DRAWN in (the
form's hidden `shownLocale`; the switch's `useT().locale`), accepted only as exactly `en`, `sw` or `zh`
(`renderedLocaleOf`); anything else, or nothing, falls back to the `kp-locale` cookie read on the server,
which is also what the opt-out acts use. ⛔ The posted value only CHOOSES which of the dictionary's own
sentences is stored (`marketingConsentWording`) — no text from the client ever reaches the ledger — and the
locale is never a literal (a literal `"SW"` stamped every English and Chinese registrant as having read the
Swahili sentence, 2026-09-25 → the audit-fix pass). *(Until 2026-09-27 this read "the cookie, ⛔ never taken
from the form". The cookie alone was wrong whenever it changed between drawing and submitting — the language
provider rewrites it on mount, and another tab can switch language — so a Swahili tick was stored as the
English sentence.)*

**5.8 · Records are kept per recipient per campaign**: the wording shown, the source, every check that
ran and its verdict, the body, the provider reference, the status, the receipt, and the cost the
**provider** reported. GN 478T reg 51(1); our published audit retention is seven years.

**5.9 · A new admin section is FIVE doors**: `NAV_GROUPS` + `ROUTE_KEYS`, `ROUTE_DOMAINS`, a `layout.tsx`
rendering `AdminSectionGate`, a `loading.tsx`, and a `filter-language` `ADMIN_SURFACES` entry with
`data-filter-rail`. Miss one and the page is invisible to the role that owns it.

**5.10 · Two stores or it does not exist**, with named types and a new `dal-parity` section carrying its
own planted-key control.

**5.11 · Every guard ships with a RED control that reintroduces the real defect** — in memory
(`--prove-red`) or declared in `scripts/anchors/`. ⛔ A new red harness that writes files breaks
`test:red-anchors` for every session in both checkouts.

**5.12 · `test:cert-c1`/`c3` do NOT cover campaign bodies** — `comms-registry.ts` places SMS outside the
module. The registry declares the ENVELOPE (sender, purpose, footer, consent gate, no `Notification`
row); marketing gets its own verbatim-wording assertion. ⛔ Do not aim a gate that cannot fail.

**5.13 · Swahili is the default player language**; admin chrome is English with copied glosses only.

**5.14 · No raw phone number in any audit payload, log line or error string** — `maskPhone` or nothing.
The chain is unprunable: a marketing list inside it is one nobody can ever delete.

**5.15 · EVERY LIST OR GRID THIS PROGRAMME SHIPS IS A COMPLETE ONE.** Ali, 2026-09-25: *"make sure
any grid created, or any development, should fully satisfy our platform requirements — paging,
sorting, loading, everything."* A table that renders rows is not a finished grid here. Each one ships
**paging** (server-side once the contact book can exceed one screen — ⛔ never fetch-all-then-slice,
which is how U45's D20 shape gets reinvented in the UI), **sorting** on the columns an operator
actually works by, **a determinate loading state** (a `loading.tsx` plus in-place skeletons that hold
the row height, so the page does not jump), **an empty state that says what to do next**, **an error
state that can be retried without losing the filter**, and **the filter language the rest of the
console already speaks** (§7.6, one filter language). The counts a grid prints are computed from the
same resolver the send uses (U24), never from a second query — two numbers that disagree on a
confirmation screen is the class §12 is written against. ⛔ This rule binds U20, U22, U23, U30, U32,
U36, U38, U47 and U48; their §9 **States:** lines are the mechanical hold on it, and a `visual` unit
whose states omit `loading` or `error` cannot be ticked ✅ (`test:marketing-setup-plan` §1c).

---

## §6 — WHAT THIS PROGRAMME MAY AND MAY NOT CHANGE

| May change | Must NOT change |
|---|---|
| `phone-normalize.ts` (fix + vectors, with the payout and OTP suites run) | `tzPhone` in `validators.ts` — it gates sign-in and both money forms (OD4) |
| `sms.ts` (MARKETING purpose, second floor, grouped updates) | the OTP path's behaviour, its floor exemption, or `SmsStatus` semantics |
| the DLR route (a third fan-out arm) | the `InviteEntry` arm, the msisdn cross-check, the monotonic guard, the `{"status":"Ok"}` reply |
| `invite-service.ts` (retire the SMS half) | `InviteEntry`, `bindRegistration`, the email lane, the admin pages |
| `retention.ts`, `DATA-RETENTION.md` (new rows) | the published retention periods |
| `comms-registry.ts` (a MARKETING lane) | the certification gates' meaning |
| new `db.*` namespaces, new models, new routes | `isLockedOut` and every one of its call sites (§7.2 — thirteen at 2026-09-26, including push and watchlist; re-derive with `grep -rn isLockedOut src`) |
| `/legal/*` — only with an owner ruling and a version bump | the published helpline, silently (OQ4) |

---

## §7 — INHERITED RULINGS (standing, not re-litigated here)

1. **Design is FROZEN.** No new colour, radius, shadow or duration; `FROZEN_RATCHET` is per-file and may
   only shrink, so a new `.tsx` with a hand-typed value is an instant red with nowhere to put an
   exemption.
2. **Ali, 2026-08-27:** a self-exclusion period is a MINIMUM; the account is not reinstated by itself.
   This is why marketing needs its own predicate and `isLockedOut` is left alone.
3. **Read tiers (2026-08-26):** masked at rest, reveal audited; the §7 list shrinks only.
4. **Swahili is the default** since `8822b648`; `sw` glosses are copied, never invented.
5. **No fabrication:** a promise about money is computed from measured data, never stated as a constant.
6. **One filter language** across the console; one home for every design decision.
7. **Blackball facts** (`docs/BLACKBALL-SMS.md`): 400-for-everything, `status` is the verdict, 12-char
   sender, ≥20-char reference, no per-message id. ⭐ Receipts arrive and settle rows since 2026-09-23 (§3a).

---

## §8 — DEFECT REGISTER (D1–D25)

Each is a real defect measured this session, owned by exactly one unit, and named inside that unit's §9
text. The one-line summaries are in §1; what follows is what each one actually is.

- **D1 · `toMsisdn255("00255712345678")` → `"2550255712345678"`** (`phone-normalize.ts:82`). ⚠️ **Latent
  today**: every current caller is pre-validated by `tzPhone`, which rejects the `00` form. It becomes
  live the day a file supplies numbers — which is this programme. **U1**
- **D2 · Nothing refuses a malformed msisdn at the wire boundary.** `sendBatch` writes its row, posts,
  and reads back a 400 with no per-message reason. A `BAD_MSISDN` refusal must happen **before** the row
  is written. **U1**
- **D3 · No NDC → operator map, and `tzPhone` accepts 60/70**, which no licensee holds. Additive,
  marketing-only validation (OD4/OD5). **U2**
- **D4 · No segment arithmetic exists**, and the only GSM-7 table lives inside `sms-blackball.ts`, a
  server module a composer cannot import. Two tables would disagree invisibly, and the disagreement is a
  bill. **U3**
- **D5 · No SMS carries a sender identity, an opt-out or the statutory RG message.** **U4**
- **D6 · The helpline has two values and six print sites.** `support-config.ts:120` pins `0800 11 0011`;
  the Gaming Board's Advertising Code names `0800110051` three times. ⚠️ `global-error.tsx` keeps its own
  hand-written copies **by design** (it must not import), so the guard asserts they EQUAL the constant
  rather than removing them. ✅ **Closed 2026-09-26 on Ali's ruling (OQ4): "the right helpline is ours"**
  — recorded as: the number 50pick already publishes, which the site labels the national helpline (⛔ not
  a line 50pick runs). The marketing footer now reads `support-config.ts`'s `HELPLINE_TEL()`, and
  `test:campaign-compose` §12 asserts ONE helpline where it used to assert two. **U5**
- **D7 · There is no SMS suppression list.** **U6**
- **D8 · `marketingOptIn` carries no channel, no wording, no evidence and no history.** **U6**
- **D9 · `isLockedOut` lifts itself** when the chosen period elapses (`responsible-gambling.ts`,
  `isLockedOut`), so a 24-hour self-exclusion is marketable 25 hours later. **U10**
- **D10 · `push-service` gates on that same predicate** and inherits the lift. Filed here; changed only
  by owner ruling. ✅ **Closed at S7 (2026-09-26) on Ali's delegation of that day, resting on his
  2026-08-27 ruling** (a self-exclusion is a MINIMUM; the account is not reinstated by itself): push and
  its sibling, watchlist alerts ("a market you follow closes soon"), now refuse a `SELF_EXCLUDED`
  account whatever the timer says — the rule the bet path already uses ("the STATUS decides"). ⛔
  `isLockedOut` untouched; cooling-off keeps its timer (nothing clears `COOLED_OFF`); the inbox row and
  email still go. Guard `test:rg-doors` §9 (a console spy on the real `[push-stub]` delivery line — "returned
  0" proves nothing in stub mode), red `red:rg-doors` (both doors mutated back to the timer, both caught). **U10**
- **D11 · No age check anywhere on outbound messaging.** **U11**
- **D12 · Three published RG commitments have no code** (`legal/responsible-gambling/page.tsx:84,86`).
  Vacuously unbroken only because nothing markets yet. **U12**
- **D13 · The published late-night window does not exist.** **U13**
- **D14 · No per-person frequency cap.** **U14**
- **D15 · `invite-service.sendCampaign` is a second send path**, ungated by consent and holding `withLock`
  across `sendBatch` — closed today only by the withdrawn-bonus flag. ⚠️ No suite executes that branch,
  which is why it is removed rather than maintained. **U15**
- **D16 · New PII stores would sit outside erasure and retention**, as `SmsMessage` already does. The
  guard is structural: grep the schema for phone/e-mail columns and require each owning model to appear
  in both files or be listed with a reason. **U16**
- **D17 · Five doors** (§5.9). **U17**
- **D18 · No admin uploader, no CSV parser, 1 MB actions.** Three defects in one: U25 builds the parser and U27
  derives a 700 KiB XLSX cap under the 1 MB ceiling, but the uploader — the first admin file entrance, with the XLSX
  action beside its caller — is U30's, so the defect closes there (re-owned 2026-10-01, decision C26). **U30**
- **D19 · A pre-flight that reports which numbers are players is a membership oracle** for a role that
  may not read a number at all. **U30**
- **D20 · `sendBatch` updates `SmsMessage` rows one at a time** — and the patch is identical for every row
  in a chunk, because the gateway's verdict is per-request. **U45**
- **D21 · The DLR route fans out to `InviteEntry` only** — it settles the `SmsMessage` row for every
  receipt, then has exactly one per-target arm, and a campaign recipient has none. ⭐ Rewritten 2026-09-23: receipts now arrive and settle real rows in seconds (§3a), so this is no longer "a fan-out nothing feeds" — it is the one arm a campaign recipient needs and does not have. **U46**
- **D22 · No `MARKETING` purpose** — folding 50k rows into `INVITE` destroys the invite lane's meaning
  and makes a per-lane cost report impossible. **U35**
- **D23 · The 30 s `withLock` timeout** makes the existing send shape unusable at campaign scale. **U43**
- **D24 · No budget.** The only spend control is a TZS 50 floor — eight messages. **U49**
- **D25 · `comms-registry.ts` states as measured fact that SMS is "OTP + invite campaigns".** That
  sentence becomes false on the first marketing send. **U50**

---

## §9 — THE UNITS

Every unit: what it ships, the guard, the RED control that proves the guard, an **Accept** line, and —
for `visual` units — a **States:** line naming at least six states to build and capture, `loading` and
`error` among them. ⛔ Suites are named by
key only (e.g. `test:tz-msisdn`); each lives at `scripts/<key without the prefix>.test.mts` and is created
in the commit that first names it in code (§11a.1).

### Phase A — foundations and permission (U1–U16)

**U1 · One phone key, and a refusal at the wire** — `src/lib/phone-normalize.ts`, `src/lib/server/sms.ts` — ✅ LIVE S1
Fix D1 (`00`/IDD prefix, and `normalizeTzLocalDigits`'s matching wrong answer). Add D2: `sendBatch`
refuses a message whose msisdn is not exactly 12 digits starting `2556|2557`, with code `BAD_MSISDN`,
**before** the `SmsMessage` row is written. Twelve written-out vectors (⛔ not round numbers):
`0712345678`, `712345678`, `255712345678`, `+255712345678`, `00255712345678`, `+255 712 345 678`,
`255-712-345-678`, `+254712345678`, `0222123456`, `0701234567`, `'+255712345678` (our own export's
formula guard), `255712345` (short).
Extends `test:phone-normalize`. *(Corrected 2026-09-25: this said "and its existing red control — no new
`red:` key"; the suite had NO red control, so S1 added `red:phone-normalize`, in-process, at zero cost to
the `red-anchors` ceiling — §2 S1 ①.)*
**Gates:** `test:phone-normalize`, `test:selcom`, `test:payout-rails`, `test:payout-destination`,
`test:msisdn-prefill`, `test:otp-delivery`, `test:shell-boundary`.
**RED:** restore the naive `startsWith("0")` branch → the `00255…` vector must fail.
**Accept:** every vector maps to one stated result; a 16-digit msisdn can no longer reach the gateway; the
payout suites are green in the same run.

**U2 · The Tanzanian number library** — `src/lib/tz-msisdn.ts` (pure, client-safe) (D3) — ✅ SHIPPED S1
`parseTzNumber(raw) → { verdict, e164, msisdn, ndc, operator, display, reason }` with verdicts `ok |
not_a_number | too_short | too_long | landline | foreign | unallocated_prefix`, each carrying **one
sentence in words** for the operator, never a code. `isSendableTzNumber` is the one-line form.
⛔ `e164` and `msisdn` are non-null **only** when the verdict is `ok`, so a refusal cannot hand out a
number something downstream might send to.
**The NDC table is TCRA v1.16 (issued 2026-07-01, doc `TCRA/DICT/CRTM/PLA-NMSP/002`)**, not the 2020
edition this unit was drafted from — see §3d for the five rows that moved. Corroborated row by row
against Google libphonenumber's TZ ranges and carrier map, which carry GSMA **IR21** provenance per
range (the filing international aggregators actually route from); the two sources agree on every code
except 60. The edition, publisher, document number, both source URLs and a human `reviewed` date are
in the file.
⭐ **Three rulings the research forced, none of them in the original text:**
① **The operator is the RANGE HOLDER, not the network the subscriber is on.** ⭐ Mobile number
portability has been LIVE in Tanzania since **March 2017**, under TCRA's own MNP Regulations — a
ported number keeps its NDC and changes network, and has been able to for nine years.
⚠️ **The instrument that nearly said otherwise is worth keeping.** The ITU's E.164 notification
answers *"sans objet"* in its portability row, which reads like "not applicable — no portability
here". It is not: that row asks for a **LINK** to a public real-time ported-number database, and TCRA
supplied no URL. ⛔ A BLANK FIELD IS NOT A NEGATIVE FINDING — one careless reading of it would have
licensed exactly the inference this rule forbids.
⛔ `walletHint` is therefore display-only and **may never choose a payout rail** —
§7 of the suite asserts no payment module and no wallet screen imports the table (the pure display
formatter is allowed, and the withdraw page uses it). A withdrawal routed on "074… therefore M-Pesa"
reaches the wrong provider for anyone who has ported.
② **Where the regulator and the carriers disagree, the parser ACCEPTS and flags.** The asymmetry is
not close: a number wrongly refused is dropped from every campaign for ever and nobody finds out; a
number wrongly accepted costs TZS 6 and produces a receipt that never arrives — which, since §3a, is
something this platform can see. NDC 60 is exactly that case and is marked `disputed` in the file.
③ **064 is allocated on paper and dead on the wire** — Telxer Enterprise Limited, no carrier-map entry
since 2022-09-08, excluded from libphonenumber's TZ mobile pattern, absent from TCRA's own quarterly
subscriber table. ⛔ `isGatewayMsisdn` ACCEPTS `25564…` by design, so this module is the only thing in
front of it; §5 asserts that seam in both directions.
⚠️ **Reach is not uniform across the codes this calls `ok`.** Since 2025-06-16 an unregistered
alphanumeric sender ID is blocked outright on Vodacom, Airtel, Yas and Zantel; Halotel and TTCL may
REPLACE a registered one; numeric sender IDs are supported by nobody. `ok` means "a real Tanzanian
mobile number", never "this will arrive looking the way you wrote it". U41 and U52 inherit this.
⭐ Moves `formatTzPhone` out of `phone-input.tsx` into this module and has the input import it back —
and takes the **second, drifted copy** with it: `wallet/withdraw/page.tsx` rendered the same shape with
`.replace(/(\d{3})(?=\d)/g, "$1 ")`, which has no nine-digit cap and groups every run of three. The two
agreed on every nine-digit input and diverged on everything else, which is why nothing caught it.
⛔ No calendar-triggered assertion: the suite asserts the review date parses and PRINTS its age.
⭐ Built for §3c's scale: every regex is a module-level constant and the NDC index is built once at
module load. `tzTableBuildCount()` makes that falsifiable — measured at 20,000 parses in 23 ms
(~870,000/s), so 150,000 rows cost about 0.2 s.
**Guard:** `test:tz-msisdn` (in-memory `--prove-red`). **Also:** `test:client-graph-safe`, whose pinned
set this unit ADDS `tz-msisdn.ts` and `phone-normalize.ts` to — ⚠️ that ratchet walks only a hard-coded
list, so it had no opinion about either module and was decoration for them. ⛔ `test:shell-boundary`,
named on this unit in the original draft, is E-70 (plain `<a>` across shells) and can neither pass nor
fail on a module move.
**RED:** `red:tz-msisdn`, 24 proofs — the 2020 answers for 63 and 66; ⛔ **070 refused as unallocated,
which is the unit's own drafted control, backwards**; 064 accepted; the formatter re-inlined with the
withdraw page's regex; a wallet screen importing the table; an always-ok and an always-refusing parser;
a refusal that still hands out an msisdn; a disputed row refused rather than accepted; and a parser that
rebuilds the index per call.
**Accept:** every verdict has a fixture; both call sites of the display formatter resolve to one
function; the table's edition, sources and review date are in the file.

**U3 · Segment arithmetic, one home** — `src/lib/sms-compose.ts` (pure, client-safe) (D4) — ✅ SHIPPED S2
`SMS_LIMITS`, `sizeSms`, `planSms`, `encodingFor`, `offendingChars`, `SMS_MAX_SEGMENTS`, the GSM-7 basic
table and its extension set (`€ [ ] { } \ ^ | ~` and form feed cost **two septets** each), UCS-2 at 70/67,
an emoji at two UTF-16 units. 🔴 In the same commit `smsCodingFor` in `sms-blackball.ts` **delegates** to
this module, and §5 asserts identity over a corpus — without that, the price the officer reads and the
coding the gateway gets come from two tables. Boundary vectors: 159/160/161, 305/306/307, 69/70/71,
133/134/135, plus a 160-septet body whose last character is an extension character.
⭐ **THREE THINGS FOUND WHILE BUILDING IT, EACH OF WHICH CHANGES A NUMBER SOMEONE PAYS:**
① **Segments are PACKED, not divided.** `ceil(units / perSegment)` is the arithmetic everyone writes and
it is wrong: a two-septet character may not be SPLIT across a segment boundary. 152 plain characters then
77 euro signs is 306 septets, which division prices as **2** segments and which actually sends as **3** —
one segment of slack, or **TZS 900,000** at 150,000 recipients (§3c).
② ⛔ **THE SPECIFIED BOUNDARY VECTORS CANNOT SEE THAT.** All eight round-number vectors above are plain
text, and on plain text packing and division agree exactly. A suite built only from them would have looked
thorough, passed, and never caught the defect that costs the money. The red control asserts this about
itself: the division plant breaks **exactly one** assertion, and it is the extension-character one.
③ ⚠️ **`String.length` is CORRECT for UCS-2** — it already counts an emoji as its two UTF-16 units — and
wrong only for GSM-7 extension characters. That is why pricing from `bodyLen` looks fine: it agrees with
the truth on every emoji and every Chinese body, and disagrees only on `€ [ ] { } \ ^ | ~`.
⛔ **THE STANDARD IS NOT THE BILLER, AND THE MODULE SAYS SO.** All of this is GSM 03.38. No multi-segment
message has ever been sent on this account, so none of it is reconciled against a Blackball invoice —
`SMS_ARITHMETIC_VERIFIED_AGAINST_BILLER` is `false` and `planSms` marks every answer `estimated`. The one
place the two could differ is whether the provider charges extension characters at two septets or counts
characters. U52's capped live drive cross-checks a deliberately multi-segment body against the portal's
own `COUNT` column (§3b: that column IS the billed segment count), and flips the flag from an invoice,
never from a reading of the standard.
⭐ `planSms` returns **quantity, never currency** — the rate is the provider's and belongs with the ledger
(U49), not in a pure module that would go stale the day it changes and would then be a fabricated promise
about money (§7.5). `SMS_MAX_SEGMENTS` is 2, computed from money: one segment to 150,000 contacts is
TZS 900,000, so a third needs an owner's signature rather than a longer text box. ⚠️ **Reconciled
2026-09-26 (audit-fix pass): it is now 1.** It said 2 while `composeMarketing` refused anything over one
segment, so a screen reading `withinCap` and the composer disagreed; the stricter, shipped refusal won and
both now read the one constant. The operator budget is also ENCODING-AWARE now — a single `’` makes the
message UCS-2, where 70 − 49 = **21** characters fit, and the refusal quotes 21, not 111
(`test:campaign-compose` §13).
**Guard:** `test:campaign-compose`. **Also:** `test:client-graph-safe`, whose pinned set this unit adds
`sms-compose.ts` to — from the commit that MOVES the table, not the one that first imports it.
**RED:** `red:campaign-compose`, 15 proofs — priced from `String.length`; UCS-2 counted by code point
(the plausible over-correction); segments divided rather than packed; a second GSM-7 table that dropped
the euro sign; an always-one-segment sizer; an always-GSM-7 sizer. ⛔ Two of the first plants written here
were aimed at nothing and the control caught them — the baseline-plus-specific-assertion shape is what
made that visible.
**Accept:** `smsCodingFor(s) === sizeSms(s).encoding` over a corpus containing both encodings; `bodyLen`
is never used to price; the moved table is asserted byte-for-byte against a copy of the pre-move string.

**U4 · The statutory envelope** — `src/lib/marketing/footer.ts`, `src/lib/sms-compose.ts` (D5) — ✅ SHIPPED S2
The engine-appended footer, per locale, un-removable and counted:
`\n50pick 18+ 0800110011 Acha: 50pick.tz/s/<8>` — **49 septets, computed and asserted, never typed**.
*(Shipped at S2 with the Board Code's `0800110051`; the published helpline since S7b, OQ4 — same length.)*
A compose-time gate that the body **begins** with `50pick` (ETA s.32(1)(b)), one that the opt-out token
is present and the right length (a message with no way to stop is unlawful), and one that names the
character that pushed a body out of GSM-7. The single-segment operator budget is therefore **111**
characters — `160 − 49`, computed — and the composer prints THAT, not 160.
⭐ **Every Swahili fragment is COPIED, and the lines are cited in the file** (§5.13, OQ9): `miaka 18+`
from `i18n-dict.ts` `tanzaniaMobile18` — the string on the registration screen every player already
passes — and `Acha` from `unfollow` ("Acha kufuatilia soko hili"), this product's existing verb for
"stop doing this". `18+` is a symbol rather than prose deliberately: the shipped sentence "miaka 18 au
zaidi" is fifteen septets and the whole footer has forty-nine to spend.
⭐ **THE SHORT DOMAIN IS DERIVED FROM `appUrl()`, NEVER TYPED.** A typed domain is a bill waiting to
happen: a longer one silently pushes every single-segment campaign into two, and a stale one prints a
link that no longer resolves. Deriving it makes a domain change a failing assertion instead of an
invoice. Measured 2026-09-25: the apex `https://50pick.tz/` answers 200, so the `www.` is dropped and
four septets are returned to the officer — ⚠️ but §3b says a `curl` 200 is not proof a BROWSER reaches
a page, so U8's live drive confirms the opt-out link before any message carries it.
✅ **SUPERSEDED 2026-09-26 (S7b, OQ4 answered by Ali):** the footer reads `support-config.ts`'s
`HELPLINE_TEL()` — the number 50pick already publishes; §12 asserts ONE helpline and that `0800110051`
appears nowhere, and since the audit-fix pass `red:campaign-compose` carries a plant that puts the Board's
number back; still 49 septets. *(Was, at S2: "the helpline here is deliberately NOT the one
`support-config.ts` publishes, and §12 asserts that they DIFFER" — correct while OQ4 was open, and ⛔ no
longer a rule: making the two differ again is now the defect.)*
⚠️ **OQ3 is priced rather than argued about:** `operatorBudget(locale, sourcePhrase)` takes the source
phrase, and with a realistic one the budget falls from 111 to **84** (re-derived 2026-10-02 from the suite's own
output, "budget 111 without a source phrase, 84 with one"; the 85 here was off by one). If the lawyer's answer is "in
the body", that is the number the composer will show. Until G5 answers, the composer reserves the longest allowed
phrase (30 septets), so it shows **80** (§4 OD49).
**Guard:** `test:campaign-compose` §9–§12. **RED:** `red:campaign-compose` — the composer sizing the
BODY while the engine sends body + footer (every quote short by 49 septets: a 147-character body reads
as one message and sends as two); the identity check dropped; the footer made optional; the opt-out
token unchecked; and (since 2026-09-26) the Board's `0800110051` back in the footer in place of the
published helpline, which must fire both §12 assertions.
**Accept:** no marketing body can be composed without the footer — there is no call shape that
produces one, which is the only way "un-removable" is true of software rather than of a policy
document; the footer's length is asserted against a token of the real minted length; the 111 is
computed from the footer and the single-segment limit, not written down.

**U5 · One helpline** — `src/lib/support-config.ts` and its print sites (D6) — ✅ SHIPPED S3
🔴 **THE PRODUCT HALF OF THIS UNIT WAS ALREADY BUILT, AND THE PLAN DID NOT KNOW.** Measured at S3
before writing any code: the statutory helpline is already ONE pinned constant with no setter and no
persisted field; `global-error.tsx` already keeps its four hand-written copies **by design** (it is
the root error boundary and must import nothing, because it renders when the root layout itself has
failed); and `test:support-contact` §15 already **discovers** every helpline-shaped literal in that
file rather than listing line numbers, asserts each equals the constant, and carries its own controls
that the file still publishes the number at all and that the detector rejects a drifted copy. The
support-and-care campaign shipped it. ⛔ Building it again would have been a second implementation of
a working one.
⭐ **WHAT WAS ACTUALLY MISSING WAS THE CONTROL.** `test:support-contact` is fifteen sections, one of
the most careful suites in this repo — and it had **no `red:` key at all**. Fifteen sections on trust.
§5.11 says every guard ships with a control that reintroduces the real defect, so this unit ships
`red:support-contact`: four mutations, 4/4 caught each on its OWN named assertion, tree restored
byte-identical.
⭐ **DECLARED ANCHORS, NOT AN IN-MEMORY PLANT, AND THE REASON MATTERS.** The suite reads the tree from
disk — that IS its method — so an in-memory plant would have to fake the whole sweep and would then be
testing the fake. Mutating the real file is what proves the sweep sees it. Declaring the anchors in
`scripts/anchors/support-contact.anchors.mjs` also keeps `test:red-anchors`'s undeclared count at 68
against its ceiling of 65 — ⭐ measured before and after: **unchanged**.
⚠️ **TWO OF THE FOUR MUTATIONS ARE CONTROLS ON THE SUITE'S OWN CONTROLS.** §15.1 passes perfectly over
a file that has stopped printing the helpline altogether — every surviving copy still matches — so one
mutation DELETES a copy rather than drifting it and requires §15.2 to be the thing that fires. Another
drifts the `tel:` href while leaving the printed text right: a drifted display string is a bad number
to read out; a drifted href dials one.
⭐ **AND THE SUITE UNDER TEST CAUGHT THIS UNIT'S OWN FIRST DRAFT.** The mutation that makes the
statutory helpline operator-settable first used the operator's REAL desk number as its replacement
literal, and §8 — "no support contact is a literal outside `support-config.ts`", whose sweep includes
`scripts/` — refused the whole harness because the tree was already red. A red harness that seeds a
real contact number into the tree is a red harness that leaks one. The replacement is now plainly fake.
✅ *(Closed 2026-09-26 by Ali's OQ4 ruling, §8 D6: the right helpline is the one 50pick already publishes;
`test:campaign-compose` §12 now asserts the footer's number is the SAME as the published one. The paragraph
below is the S3 record, kept as it was written.)*
⛔ **D6 IS NOT CLOSED BY THIS UNIT AND STAYS ⬜.** Its engineering half is done — one home, every copy
pinned, drift now impossible and PROVEN impossible. Its substance is **which number is correct**, and
that is OQ4: we publish `0800 11 0011`, the Board's own Advertising Code names `0800110051`. ⛔ Not a
thing to settle by making them agree — `test:campaign-compose` §12 asserts the marketing footer's
number still DIFFERS from the published one, precisely so an "obvious cleanup" fails instead of
turning an open owner question into a silent product decision. When Ali answers, the constant moves
and §15 forces all four copies to move with it.
**Guard:** `test:support-contact` (already on `predeploy`; §13.1 asserts that).
**RED:** `red:support-contact` — 4/4, declared anchors. *(2026-09-26 audit-fix pass: /help's at-risk answer
(FAQ 5) printed the helpline as untappable text with no label — MOBILE-VISUAL-FINDINGS S08-05 / S08-info-H02.
It now shows the helpline label and a `tel:` link; §14.5–§14.7 refuse a contact shown as plain text and pin
FAQ 5's link, and a fifth `red:support-contact` mutation plants the old text back.)* *(2026-09-27, the
final visual review: every open FAQ answer on /help carries `pb-3` — 16px on this repo's override scale,
the summary's own bottom padding — so it no longer sits about 6px off the next row's divider; the faq5
answer alone is `break-keep [overflow-wrap:anywhere]` (`WHOLE_WORD_ANSWERS` in `src/app/help/page.tsx`),
so zh no longer splits 充值, while the paragraph answers keep ordinary CJK breaking on purpose — keep-all
half-empties their lines at 360, the `trust-band.tsx` rule. §14.8 pins both, with control §14.9. The /help
disclaimer is 13px (was 11px), balanced and `break-keep`. Re-derive the counts from a run.)*
**Accept:** `grep` finds the number in exactly the declared places, all equal — and, added here, the
guard that says so is now proven able to fail.

**U6 · Consent ledger + suppression** — schema, both DALs, `dal-parity` §17 (D7, D8) — ✅ LIVE S3b
`MessagingConsent` (append-only: channel, `identifier` = the one key, category, status, source, **verbatim
wording**, locale, evidence, recorder, time) and `Suppression` (`@@unique([channel, identifier,
category])`). From this commit, the profile toggle and registration ALSO append a ledger row. ⛔ Zero
backfill (OD8). ⛔ `Suppression` rows are never deleted — not by contact deletion, not by re-import.
**Guard:** `test:dal-parity` §17 + `test:marketing-consent-ledger`. **RED:** `red:dal-parity` gains nine mutations
(the wording dropped from the read mapper and from the create; an `update` added to the ledger; a
`deleteMany` added to suppression; an upsert that refreshes `createdAt`; the id tiebreak removed from
either twin) — 24/24 caught. `red:marketing-consent-ledger` is in-process: the wording re-rendered from
English, the second decision lost, an unusable identifier accepted, re-suppression replacing the row —
4/4, after a §0 baseline proving the shipped code passes first.
**Accept:** both DALs, named types, the new section's own control green; a withdrawal survives a
re-import. ✅ All four met and MEASURED, and ✅ LIVE on `32067c92` — the drive is `scripts/live/marketing-u6-consent-ledger-drive.mjs`, which REFUSES to report unless it reached the commit it was told to prove (7/7, three controls). The withdrawal/re-import pair is proven twice over: in Postgres
(a second suppression for the same triple refused `23505`, two consent rows coexisting, the GIVEN row
un-overwritten) and in the memory twin (re-suppression returns the row already there, with its
ORIGINAL `createdAt`).

⛔ **THREE THINGS THIS UNIT WAS TOLD THAT WERE NOT TRUE, corrected here rather than worked around:**
① §0 said a migration could not be verified on a machine without Docker. `db-scratch.mts` does not use
Docker — it loads `embedded-postgres` (`:129-146`), already installed, and raises PostgreSQL 18.3.
② This unit was told to add §7 "with its own planted-key control". §7–§16 were long since taken, and the
gate has had a planted-key control at §0 since it was written; U6 took §17 and EXTENDED the existing
`red:dal-parity`. A second control beside a working one is the U5 mistake in mirror image.
③ The enum rule is narrower than §0a states: it binds a value added to an EXISTING enum (`55P04`), which
is U35/D22's problem, not a brand-new type, which may be created and used in one transaction.

⚠️ **AND `marketingOptIn` HAS FIVE WRITERS, NOT THE TWO THIS UNIT WIRED.** Registration and the profile
toggle now append; the 730-day retention lapse (U16 owns it, explicitly), account closure
(`user-service.ts:147`) and erasure (`erasure.ts:476`) do not. Until they do, the ledger and the boolean
disagree after any of those three. ⛔ Not absorbed into U6 — closure and erasure are currently unowned.

🔴 **FOUND BY THE 2026-09-26 AUDIT — THE LEDGER RECORDED A LANGUAGE NOBODY CHECKED.** Both registration
paths passed a literal `"SW"`, and the profile toggle `User.locale` (itself `"SW"` for every account), so
every REGISTRATION and PROFILE row from this unit until the audit-fix pass says the player read the
Swahili sentence — an English or Chinese registrant included. §5.7's own rule, broken by its writer. The
fix (§0 ruling 7): every writer — register password and OTP paths, the profile toggle, the opt-out stop
and resume — resolves the sentence from the `kp-locale` cookie on the server, the way `/s/[token]` already
did, and stores that locale; registration also stores it on `User.locale` (OD42). ⚠️ Narrowed 2026-09-27
(§5.7): the register form and the profile switch now post the language they were DRAWN in, and the cookie
is only the fallback; the opt-out acts still read the cookie. ⛔ The earlier rows are
not edited (append-only) and are not evidence of language; COMPLIANCE-DECISIONS § "2026-09-26 · Marketing
consent names SMS" records the window. ⭐ The sentences that count as SMS consent are pinned in
`src/lib/marketing/consent-wording.ts` (OQ11), and `test:marketing-consent-ledger` asserts every sentence
the dictionary shows TODAY is in that list, so a copy change cannot silently disqualify new opt-ins.
The first nine entries carry `since` 2026-09-27, the ship date (re-dated once before any row existed — §0
⚠ TRAPS). The posted language is guarded by `test:marketing-consent-ledger` §7 (7, 7a, 7b, 7d, and 7e,
which EXECUTES `renderedLocaleOf` against case variants, padding and free text) with its red cases, and by
the live U6 drive's 3e (each sign-up page posts `shownLocale` beside its own sentence).
⚠️ **"Latest" has a tie.** `latestFor` orders by `createdAt`, then by id — and ids are random UUIDs, so two
rows for one number stamped in the same millisecond have a random "latest". Real acts are separate
requests, so the production risk is negligible; the suites step the clock between a stop and the next act
so they stay deterministic. A monotonic tie-break in both DALs would remove it.

**U7 · The ONE gate** — `src/lib/server/marketing/consent.ts` — ✅ LIVE S4 (order and RG step reworked at U10)
`mayReceiveMarketingSms(msisdn) → { ok } | { ok:false, skipReason, detail }`, ordered exactly as §5.6.
Suppression first; then, if the number belongs to a `User`, that user governs (RG standing → account
status → `marketingOptIn`); otherwise the ledger governs. ⛔ A contact-book row can never override a
player's own "no".
**Guard:** `test:marketing-consent` (the gate executed on real fixtures; it grew at U9/U10 — re-derive the
count, never quote it). **RED:** `red:marketing-consent`, in-process — at U7: consent asked before
suppression, the phone bridge dropped, an elapsed self-exclusion re-permitting marketing, an imported row
speaking over a player's own no. ⭐ It runs TWO controls before
planting anything: the shipped gate green, and the defect-free MODEL proven to agree with it on every
fixture, so a red case's failure is attributable to its flag rather than to a sloppy model.
**Accept:** four mutually exclusive states in one run (allowed / suppressed / no consent / RG), so neither
an always-open nor an always-closed gate can pass. ✅ Asserted as a PROPERTY (assertion 13), not hoped for.

🔴 **THE TRAP THIS UNIT FOUND, AND THE REASON IT IS THE MOST IMPORTANT LINE IN IT:** this platform
stores phone numbers in **two** formats and nothing said so. `User.phoneE164` is written from `tzPhone`
(`validators.ts:32-37`), which returns **`+255XXXXXXXXX`**; the marketing key, the SMS wire and
`MessagingConsent.identifier` all use `toMsisdn255`, which returns **`255XXXXXXXXX`**. Measured: unequal
for EVERY input, including `+255712345678` itself. So `db.user.findByPhone(<marketing key>)` returns null
for **every player**, and the obvious gate would hand the entire player base to the ledger branch — the
one branch that must never govern a player (OD10) — silently, with no error anywhere. `userPhoneKeyFor`
is the bridge; assertions 12 and 12b pin it in BOTH directions, because a bridge asserted only in the
working direction is a bridge that can be deleted without the guard noticing.
⚠️ **Any later unit that looks a player up by a marketing key inherits this** — U8, U24, U30 and U44 all
do. Use `userPhoneKeyFor`, never a bare `findByPhone`.

⛔ **NOT in this unit, by design, so nobody reads a false completeness into it:** cooling-off and harm
markers (U10), age (U11), the frequency cap (U14), the window (U13) and the officer authorisation (U41;
the Board-approval half withdrawn 2026-09-26, OQ1) are separate gates in the loop. U7 answers suppression,
consent, self-exclusion standing and account status.
⭐ `minimum_served` is refused, not only `serving` — a 24-hour self-exclusion that elapsed a year ago is
still a refusal (D9, OD12). U10 adds the rest ON TOP of this; it does not replace it.

⚠️ **CHANGED BY THE 2026-09-26 AUDIT-FIX PASS (§0 rulings 8–9), so read the code, not only the text above:**
① a player's consent is the toggle AND a latest GIVEN ledger row in a pinned SMS-naming sentence (OD8,
OQ11) — the ledger is now read for a player too, but only as a SECOND condition the toggle must also meet,
never as a grant (OD10 stands); an older "yes" is `no_consent` ("consent predates the SMS wording").
② The profile toggle reads the same consent step (`marketingToggleState`) and its writer
(`recordPlayerMarketingChoice`) lifts only a suppression the person created (`isPersonCreatedSuppression`:
reason `WITHDRAWN`) — never COMPLAINT, OPERATOR or SELF_EXCLUSION; `/s/`'s `personMayLift`
(`optout-service.ts`) is the same rule, and `test:marketing-consent` pins that the two agree on all four
reasons (one could delegate to the other with no import cycle). ③ `bad_msisdn` is judged by the
numbering plan (`parseTzNumber`, U2), not by length: a Kenyan `+254…`, a landline or a dead NDC is
twelve-plus digits and undeliverable. ④ Age and account status also ask the identity check (§9 U11).

**U8 · Opt-out that works** — `src/app/s/[token]/{page,actions}.tsx`, `src/lib/marketing/optout.ts` — ✅ LIVE S4 + S5
An 8-character token minted per recipient at enqueue (unique index), never expiring, no login. One click
writes: the suppression row, a `WITHDRAWN` ledger row carrying the page's exact wording, and — when the
number belongs to a player — `marketingOptIn = false` through the **existing** `privacy.
marketing_consent.withdrawn` audit action. Resubscribe is the second button on the same page, never a
condition of the first. Rate-limited per IP; `noindex`; a bad token says so plainly and ⛔ never shows a
false success. ⚠️ *Shipped as ONE action at a time (`optout-client.tsx`, the "EXACTLY ONE ACTION"
comment): two opposite buttons side by side invite a mis-tap on a one-tap page, so the way back is offered
after a stop and on an already-stopped load, and "stop" after a resume (OD43).*
**Guard:** `test:marketing-optout`. **RED:** make the token expire; make the click require a confirmation.
**States:** loading · valid token · already suppressed · resubscribed · invalid token · error.
**Accept:** a minted token suppresses on production in the U52 drive, and the number is refused at the
next dispatch.

⛔ **SCOPE CORRECTED BEFORE BUILDING (S4), because this unit's premise fails twice over.**
① **There is no recipient row to hang a token on.** `SmsCampaign` does not exist; `InviteCampaign` /
`InviteEntry` (`schema.prisma:783,806`) are the unrelated invite-CAMPAIGN system (`/admin/invites` — not the player referral link on `/profile/invite`, which is `AffiliateAgent` / `ReferralReward`) and carry no token. The
recipient table is U35 (S19) and the minting is U42 (S22) — both far downstream of S4. Worse, U35's own
field list in this plan names no opt-out token column at all (the `claimToken` there is U43's slice
token). So U8 ships **its own** token store, keyed by token and mirroring `Suppression`'s triple, which
U42 later writes into at enqueue.
② **Nothing mints one yet, so the production half of Accept cannot be met in S4.** `marketingFooter()`
(`footer.ts`) builds the string `50pick 18+ 0800110011 Acha: 50pick.tz/s/<token>` (the S4 string carried
the Board Code's `0800110051`; the published helpline since S7b, OQ4), but `composeMarketing`
and `marketingFooter` have **no callers outside `campaign-compose.test.mts`** — no message carries a `/s/`
link today. ⭐ The production half therefore moves to **U42 (minting) and U52 (the Seal drive)**, and is
NOT claimed here. What U8 proves on production is that the page serves, answers `noindex`, refuses a
bad token without a false success, and is NOT sent to sign in; the token-bearing states (stop, already
stopped, start again) are proven on a local `next dev`, because the seed route that plants a token 404s in
production (§1's U8 row). *(Corrected 2026-09-25: this said production "suppresses a token planted
through the DAL", which the live drive did not do.)*

🔴 **AND A COLLISION NUMBER OD43's LENGTH HIDES.** `randomId` returns **hex** (`crypto.ts:109-111`),
so the obvious `randomId(4)` is 16⁸ = 4.3×10⁹ — about **2.6 expected collisions per 150k-recipient
campaign** (§3c), i.e. near-certain. The repo's ambiguity-free 32-character `CODE_ALPHABET`
(`agent-application-service.ts:1330`) gives 32⁸ = 1.1×10¹² and ~1% per campaign — and because OD43 says the
token **never expires**, that 1% compounds for ever. ⛔ So the alphabet is the 32-character one, the column
is UNIQUE, and **minting retries on conflict**. ⚠️ U42 must NOT use `createMany({ skipDuplicates: true })`:
that emits `ON CONFLICT DO NOTHING` with no target, so a token collision would silently drop the whole
recipient row — a person who is never messaged and never appears as a failure.

⚠️ **Three things this unit needs that the plan does not say:** `/s` joins `GA_EXCLUDED_PREFIXES`
(`google-tag.ts:32-41` already names this exact hazard for the invite token, so a token would otherwise be
sent to Google in a page path); `/s` must stay OUT of `PROTECTED_PREFIXES` (`proxy.ts:40`) or the no-login
promise breaks; and every player lookup goes through `userPhoneKeyFor` (U7), never a bare `findByPhone`.

⚠️ **REWORKED BY THE 2026-09-26 AUDIT-FIX PASS (§0 rulings 5 and 10):**
① **A minimal shell** — `app-shell.tsx` gives `/s` the logo, the language menu, the content and a footer
of the licence lines, the responsible-gambling sentence and the helpline only (the sentence added
2026-09-27, below): no Ingia/Jisajili, nav, bottom rail, chat, first-visit primer or
"Pendekeza masoko upate pesa". A page somebody reaches to leave does not sell to them (ruling 5, done).
② **The heading and body follow the state** (valid, already stopped, stopped, resumed, error), so the
headline never contradicts the one button under it.
③ **Resume is a consent, so it shows and records its OWN sentence:** `push.marketingBody` sits next to the
resume button, and the ledger stores "<`optout.resubscribeButton`> — <`push.marketingBody`>" in the
language shown (pinned in `consent-wording.ts`, OQ11). The resumed copy says what happened — the stop is
lifted — and ⛔ never promises that messages will arrive (the gate still decides).
④ **Resume lifts only a suppression the person created** (`WITHDRAWN`) — never COMPLAINT, OPERATOR or
SELF_EXCLUSION.
⑤ **The token is case-insensitive** — the alphabet is uppercase-only, and somebody TYPING the link from
the SMS on a phone keyboard usually types lowercase; folding it cannot collide and does not widen the
guessing space.
⑥ **A bad link gives a next step** — sign in → Profile → Notifications, or contact support
(`support-config.ts`) — and ⛔ never says "this link is not ours", which read as a phishing warning to
somebody holding a genuine, truncated 50pick link. A read that FAILED says "did not go through", not
"this link does not work" — and since 2026-09-27 it offers a retry, as the BUSY refusal does (below).
⑦ Confirmations are announced (`role=status` / `aria-live`) with focus moved to them, at a readable size
and contrast, and the number is masked the way `/profile` masks a phone (`+255••••21`, not `2557••••21`).
**What the code now does, in detail (read it before touching the page):**
- **The shell** (`OptOutShell`) is chosen from the request path BEFORE the session is read, so an ended
  session can never redirect somebody who is trying to stop onto the sign-in page (an opt-out behind a
  login, ETA s.32(1)(c)). It renders the 50pick lockup (not a link), the language menu, a skip link and the
  page, then only the regulator lines: 18+, the GBT licence number (13px mono, `text-body-sm`, since
  2026-09-27 — the full footer's is still 11px, §0 ◐ CARRIED (h)), the full footer's italic
  responsible-gambling line (`footer.stopGambling`) and the helpline. ⭐ Since 2026-09-27 that sentence sits
  directly above the helpline, as in the full footer — alone, "Simu ya msaada · 0800 11 0011" read as
  50pick's own number, often the only number on the page — and the 18+ roundel carries no `aria-label`
  (ARIA prohibits one on a generic span; "18+" is its text). The chat bubble, the first-visit primer and
  the socials panel keep off `/s` through their own hide lists.
  ⚠️ **Which paths get this shell** (`isOptOutPath`, 2026-09-27): only `/s`, `/s/` and `/s/<one segment>`
  — a segment match, so `/settings` and `/support` never do. It used to match any `/s/…` path, and
  `/s/<token>/<more>` has no route, so the root 404 rendered inside the stripped shell and its soft links
  opened the landing page with no nav until a hard reload; a deeper path now renders the full player
  shell's 404. The overlays' own hide lists still hide chat, primer and socials on any `/s` path, which is
  harmless.
- **One heading per state:** idle "Acha ofa na habari kwa SMS" (en "Stop offers and news by SMS", zh
  "停止接收短信优惠与资讯"); stopped or already stopped `optout.stoppedTitle` ("Ofa na habari kwa SMS
  zimesimamishwa"); resumed `optout.resumedTitle` ("Umechagua kupokea ofa na habari kwa SMS tena"). Since
  2026-09-27 every opt-out sentence names what it stops with the consent's own noun (`push.marketingTitle`).
  Exactly one action is on screen. The ledger stores STOP as
  "<`optout.stopButton`> — <`optout.body`>" and RESUME as "<`optout.resubscribeButton`> — <`push.marketingBody`>"
  (pinned as the `OPT_OUT_RESUME` entries), in the language shown. The STOP sentence changed with the
  rename and stays UNPINNED by design — a withdrawal is never consent (`test:marketing-consent-ledger` 8b) —
  and the RESUME sentence did not change. ⛔ `optout.resubscribeButton` cannot be reworded without appending
  the new sentences there.
  **Wrapping (final visual review, 2026-09-27):** the sw headings hold a no-break space in "kwa SMS" and
  the en headings in "by SMS"; the zh headings and notices carry U+200B phrase hints and render
  `break-keep`. The shared classes `KEEP_WORDS`, `TITLE_TEXT` and `NOTICE_TEXT` live in
  `src/app/s/[token]/optout-classes.ts`. The ledger evidence strings (`optout.body`, `optout.stopButton`,
  `optout.resubscribeButton`, `push.marketingBody`) carry neither mark (`test:marketing-optout` S7h.<loc>),
  and the act sentence under the button, which shows that evidence, gets `text-pretty` only.
- **"Start them again" on a stop the person did not make** (OPERATOR, COMPLAINT, SELF_EXCLUSION) answers
  "already", writes nothing, and offers no way back; the reason is never sent to the page. The resumed
  sentence is the same for everybody, so it discloses no RG standing, and a SELF_EXCLUDED player's toggle
  is never switched back on from a link.
- **A STOP whose ledger write failed after the suppression landed is repaired by the retry:** the "already"
  answer appends the missing `WITHDRAWN` row and switches the player's toggle off.
- **Evidence never holds the live token.** The suppression's evidence, `liftedReason` and the audit payload
  store a reference (`optout:` + the first two characters + six stars). `mintOptOutToken` normalises its
  number with `toMsisdn255` and returns null for an unusable one — a caller that gets null must not send.
- **Rate limit `optout.ip`** (30 burst, 10 a minute) is spent only by a MISS — a token that does not
  resolve — on the page load and on both acts; a hit is refunded, so a genuine stop never spends it, and
  each valid link's acts are also capped on their own hashed per-link key. An address that has run dry gets
  the BUSY refusal (`optout.busy`: the page is busy, nothing has changed, try again in a few minutes) with a
  "Try again" link, and no lookup is made — so the answer is identical for every token, live or not, and
  is not an oracle. *(Until 2026-09-27 a dry address got the plain invalid-link refusal, which told a person
  holding a GENUINE link that it did not work, so they had no reason to try again.)* Malformed and unknown
  tokens still share the one invalid-link sentence, and a read that THROWS gets the "did not go through"
  refusal (`optout.error`) with a retry; the mapping is `refusalKindFor` in `optout-service.ts`.
  Trade-off: a genuine link opened behind the same
  address as an active guesser is refused until the bucket refills. ⚠️ The key is the FIRST
  `X-Forwarded-For` entry; whether Railway's edge appends to or replaces that header is unverified — probe
  it before U42 mints real tokens. Every `rateCheckAsync` / `rateRefundAsync` call in `optout-service.ts`
  types the literal `"optout.ip"` (since 2026-09-27): `test:house-bot-reports` 0.L52.3 reads each call's
  action from the syntax tree, so a constant counted as an undeclared rule. `OPTOUT_BUDGET` stays exported
  for the suite; the bucket and its numbers are unchanged.
- **The invalid-link refusal** (`optout.invalid`, `optout.invalidNext`) says the link does not work — it may
  be incomplete or mistyped — and that nothing has changed, and names the next step: sign in and switch off
  the SMS toggle under Profile → Notifications, or contact the desk (phone and email from
  `support-config.ts`; ⛔ never the helpline).
  Support has NO tool to record a suppression by hand yet, so the page promises contact, not a manual stop
  — a unit is owed for an officer-recorded suppression (U23's "suppress" is the nearest).
- **The refusals, in one place** (`src/app/s/optout-refusal.tsx`, 2026-09-27), shared by `/s/<token>` and
  bare `/s`. The BUSY refusal (warning) and the failed-read refusal (danger) lead with a primary "Try again"
  (`optout.retry`) — a plain `<a>` back to the same `/s/<token>` — then "Open notification settings"; since
  2026-09-27 those two are one group sharing one width with a 12px gap (`gap-2` on this repo's spacing
  scale), and the desk's phone and email are a separate group below (`test:marketing-optout` S5e, and the
  drive's read-failure check: same width, gap ≥ 8px). The invalid-link refusal (neutral) has no retry:
  retrying a link that does not work changes nothing. The refusal's title is a block span with
  `text-balance` and its body `text-pretty` — call-site wrappers until `callout.tsx` does it (§0 ◐ CARRIED (d)).
- **Bare `/s`** (`src/app/s/page.tsx`, 2026-09-27) — an opt-out link that lost its token — renders the
  invalid-link refusal, `noindex`, inside the opt-out shell. It used to be the root 404 inside the stripped
  shell. No catch-all route was added for deeper paths (they get the full shell's 404, above).
- **A failed Stop or Resume tap moves nothing under the thumb (2026-09-27):** the danger alert renders
  BELOW the button, with the desk's phone and email INSIDE it, lined up with its sentence (read from
  `support-config` on the SERVER and handed to the client as a rendered node, so the client never reads the
  support config). Nothing above the button changes on a failure: the heading and the status message read
  `said`, the last OK answer, which a failure never updates. The alert takes focus without scrolling
  (`preventScroll`). The retry is still the same button. *(Before this the alert and the desk were inserted
  ABOVE the button, which dropped it about 210px at 360 and put the desk's `tel:` row under the thumb, so a
  retry opened the dialer.)* The U8 drive asserts the stop button's box is unchanged after a refused tap and
  that the tapped point still hits the button, never a link.
- **A pending tap stays readable (2026-09-27):** the tapped button renders at opacity 0.85
  (`BUSY_LEGIBLE` in `optout-client.tsx`) instead of `.btn:disabled`'s 0.45; the drive asserts ≥ 0.8. A
  platform-wide `.btn[aria-busy="true"]:disabled` rule in `globals.css` would make it redundant
  (§0 ◐ CARRIED (c)).
- **The loading skeleton is the page's own parts** (2026-09-27): the same `PageHeader` (its `title` prop is
  now a node), the class names in `src/app/s/[token]/optout-classes.ts` (shared with `optout-client.tsx`) and
  the same dictionary strings, with the data-dependent text made transparent on visible bars
  (`bg-bg-elevated` with a `ring-border` ring, `box-decoration-clone`), so every line wraps where the real
  one will in every language and width. The screen-reader line is the LAST child of the stack. 🔴 Root
  cause of the old 24px drop at 360: that line was the FIRST child of the `space-y-5` stack, so every child
  after it took the gap.
- **Naming: CLOSED 2026-09-27.** The page's title, headings and buttons now say "ofa na habari kwa SMS" /
  "offers and news by SMS" / "短信优惠与资讯" like the register box, the profile toggle and the resume
  sentence. Guard: `test:marketing-optout` S7g.<loc> — the headings and the stop button contain
  `push.marketingTitle`, and no "marketing messages/texts", "matangazo" or "营销" is left in the opt-out
  copy. The Swahili and Chinese opt-out copy still awaits a native speaker's read (§0 ◐).
- **For the camera — dev-only hooks, every one a no-op in production:** `?qa_hold_ms=N` holds the page
  render (capped at 5 s) so the loading skeleton can be photographed; `?qa_fail_read=1` makes the page's
  read throw, to show the failed-read refusal; the cookie `kp-qa-hold-act-ms=N` holds the Stop/Resume
  server action (capped at 5 s) to photograph the pending button. The drive
  `scripts/live/marketing-u8-optout-drive.mjs` (`qa:marketing-u8-optout`; local `next dev` with the
  in-memory store) reads every expected sentence from `i18n-dict.ts` per language and refuses to run if a
  key is missing. It photographs invalid, valid, stopped, resumed and already in Swahili at 1280×800,
  360×780 and 360×780 reduced-motion, and in English and Chinese at 1280 and 360, as viewport tiles; then
  loading in all three languages at 1280 and 360 (the stop button must land where the skeleton drew it),
  pending (sw and zh), the read failure, bare `/s`, a deeper `/s/…/x`, a forced primer with a control on
  `/?primer=1`, a lower-case link, and last the error tap and the busy refusal (an address drained by
  misses). Swahili tiles keep their old names (`valid-360`); English and Chinese carry the language
  (`valid-en-360`, `valid-zh-1280`, `loading-zh-360`). It asserts no sales chrome, `role=status`/`alert` with
  focus moved, and the masked number. *(This bullet said the drive was "not an npm script"; it is.)* Since
  2026-09-27 it also asserts the refused tap (the stop button's box unchanged, measured with the pointer
  moved off first because `.btn:hover` lifts a button 2px, and the tapped point still the button, never an
  `a[href]`), the pending opacity, the read-failure buttons (same width, gap ≥ 8px) and keep-all on the zh
  H1; heading and text comparisons fold the no-break space and drop U+200B.
**Guard since 2026-09-26:** `test:marketing-optout` also drives the acts' budget through the object under
test; `red:marketing-optout` adds in-memory surface plants against the page, client, loading, actions,
shell and overlay source and the dictionary — each anchor must resolve exactly once. Since 2026-09-27 it
also has 37c (a dry budget reads BUSY, with its model and a red case), S5d (the refusal is chosen through
`refusalKindFor`, and busy and failed offer a retry), S6b–S6d (the skeleton), S7g (the noun), S18h (the
desk under a failed tap), S20d (the helpline under its RG sentence), S21b (rewritten: the segment match)
and S23 (bare `/s`), each with a plant; S5b and S5c now read `optout-refusal.tsx`. From the final visual
review (2026-09-27): S5e (the refusal's two buttons are their own group), S7h.<loc> (break hints where
`break-keep` relies on them, none in ledger evidence), S18i (a failed tap moves nothing under the thumb),
S18j (the pending label stays readable) and S18k (zh keeps its words whole on the headings and notices),
each with in-memory red plants; S18c (the status and alert callouts, two refs), S18f (every client callout
is `md`) and S18h (the desk inside the alert) were rewritten, and S6b now also requires the title span's
class in the skeleton and the client. Re-derive the counts from a run; none is quoted here.

**U9 · The gate runs in the loop, and the proof of it** — `test:marketing-consent` — BUILT S6, RE-SCOPED
The unit is the guard: a fixture that opts out **between** slice one and slice two, and must not receive
slice two's message.
**RED:** hoist the gate to list-build time → the suite must fail. ⭐ If it still passes, the suite was
testing the list, not the send, and the control has found the worse defect.
**Accept:** the mid-send opt-out fixture is red before the in-loop gate exists and green after.

⛔ **RE-SCOPED BEFORE BUILDING (S6), BECAUSE THE PREMISE FAILED — and not the way the plan guessed.** There
is no send loop to put a gate in: nothing loops over marketing recipients, `mayReceiveMarketingSms` has no
caller outside tests, `SmsPurpose` has no `MARKETING` (D22) and `SmsMessage` has no `skipped` status. ⚠️ The
loop is not U35 either, as §0 said — U35 is the tables; the loop is **U43** ("the slice", `engine.ts`).
So U9 does not wrap a gate round nothing. It ships **the innermost step of U43's loop** —
`dispatchSlice` in `src/lib/server/marketing/dispatch.ts`: the gate asked per recipient IMMEDIATELY before
ONE send, a refusal `skipped` (never `failed`), results settled by KEY (never by position), a shop-wide
refusal or an unanswerable gate `held` (nothing about the person was decided — U43 returns it to PENDING),
a thrown transport `unconfirmed` (never retried by itself, OD23), and the RG audit line
`marketing.suppressed.rg` written HERE, when a refusal is acted on (an audience count asks the same gate and
must not write). ⛔ `send` has NO default — until U35 gives the wire an honest purpose, nothing in
production can reach it through this step. And **the loop contract**: a real two-slice drive in which three
people change their minds between the slices through the REAL acts (`stopMarketing`, `selfExclude`,
`coolOff`), the wire answering in reverse order. ⭐ **U43 inherits it: its engine joins the contract as a
second DRIVER and must pass the same assertions** — this is the proof U9 promised, waiting for its loop.
**Measured:** the hoisted driver sends the opted-out number (red), `dispatchSlice` does not (green) ·
`test:marketing-consent` 20 → 36 · `red:marketing-consent` 8 → 13 (loop: hoisted gate · settle by
position · skip recorded as failed · unanswerable gate sends · RG refusal unaudited), each on its own
assertion, after the shipped step and the defect-free model both pass the contract first.

**U10 · The marketing RG predicate** — `src/lib/server/marketing/rg.ts` (D9, D10) — BUILT S6
`marketingRgStanding(user, identifier)` built on the ONE standing definition (⛔ not `isLockedOut`, which is
not modified), cooling-off, and `detectHarmMarkers`, with six-months-minimum semantics and a fresh
post-restoration consent required. Each refusal carries its own skip reason; the audit line matching the
`push.suppressed.rg_lockout` precedent is written by the LOOP when it acts on the refusal (U9), never by
the predicate — an audience count must not write to the chain. D10 is filed as an owner item, not silently
changed.
**Guard:** `test:rg-doors` §8 + `test:marketing-consent`.
**RED:** plant a player whose standing is `minimum_served` — a control planting only `serving` would pass
today and prove nothing.
**Accept:** a player who self-excluded for 24 hours a year ago is still refused.

⭐ **WHAT SHIPPED, AND THE FOUR PREMISES IT HAD TO CORRECT (S6, 2026-09-25):**
① **U7's "deciding must not write" fix was half a fix.** It skipped `selfExclusionStanding` when no RG row
existed — but on an EXISTING row that call still goes through `getRgSettings` → `effectivize`, which
REWRITES the row whenever a pending limit change has come due (and, on the memory store, mutates the live
object). The predicate now reads `db.responsible.get` and computes from the raw row through
`selfExclusionStandingOf`, the pure half split out of `selfExclusionStanding` so there is still ONE
definition — and `red:rg-doors`' existing `minimum_served` mutation now reaches marketing too.
② **Cooling-off was already refused for ever — under the wrong reason.** Nothing ever clears `COOLED_OFF`,
so U7 refused anyone who had ever taken even a one-hour break as `account_status`. ⭐ RULED ON DELEGATION: a
break is standing for marketing — refused while it runs, and after it until the player consents again
AFTER it ended; only then is the `COOLED_OFF` status admitted. (Betting still reads the timer, by design.)
③ **The restore leaves no column.** `restorePlayerAction` writes only the audit row
`rg.self_exclusion.reopened`, so that is what the predicate reads (`getAuditForTargetsDurable`, one indexed
query, only for a player who has consented and served the minimum). A restore must postdate the latest
`rg.self_exclusion.activated`; six months are six CALENDAR months and never under 182 days (the platform's
"6m" is 182 days, shorter than some half-years), counted from the last activation or, without one, from the
END date — the safe direction; and the consent must postdate the restore. Missing record → refuses.
④ **Harm markers are NOT standing, and the plan's wording cannot be met as written.** Nothing persists a
harm flag (no table, no namespace, no audit action — a code comment claiming otherwise was corrected), so a
marker refuses for as long as its detector's window, ≤ 8 days. A check that cannot be read REFUSES (the
compliance panel's `.catch(() => [])` turns a failed read into "no flags"). Standing harm markers need a
persisted, officer-reviewed flag store — an owner item in §0, not invented here.
⭐ **And U7's order was not §5.6's.** It asked self-exclusion before consent; the gate now asks suppression →
consent → self-exclusion → cooling-off → harm markers → status, which also keeps the 10,000-transaction harm
scan off every non-consenting player.
**Measured:** `test:rg-doors` 54 → 91 (§8: 37 assertions, 4 mutually exclusive outcomes as a property, both
lifts proven to EXIST) · `red:rg-doors` 11 → 19 mutations, each caught by its own named check, tree restored
· `test:marketing-consent` 15 → 20 · `red:marketing-consent` 5 → 8, three of the plants being U7's SHIPPED
shapes (the half-fix that still wrote, RG before consent, the permanent break refusal).
⚠️ *(2026-09-26 audit-fix pass)* An unreadable `selfExclusionUntil` on an account that is not SELF_EXCLUDED
now refuses as `rg_self_excluded`, the same as the break branch already did (it read as "no exclusion").
A refusal for "no consent given since" an ended break or an officer restore carries `consentLapsed`, which
the profile toggle reads to show OFF with one neutral line (`push.marketingPaused`, reworded 2026-09-27:
"Turned off when your break or self-exclusion ended. It stays off unless you switch it on."); a tap then
writes a fresh GIVEN row even when the boolean already reads true. Guards `test:rg-doors` §8 and its red
anchors. ⭐ *(2026-09-27)* A break or self-exclusion still IN FORCE holds the toggle OFF and locked
for every player, and an ON is refused with `held` and writes nothing (§0 ruling 8); guarded by
`test:marketing-consent` T8–T8g with `red:marketing-consent`'s `heldReadsOn` and `heldWrites`.

**U11 · 18+** — the loop (D11)
Account-linked: `dob` must yield ≥18 at send time. Contact-only: marketable solely when the import
recorded an explicit 18+ attestation (U33). Unknown → `skipped` with `age_unknown`.
**Guard:** `test:marketing-consent`. **RED:** treat a null `dob` as adult → the fixture must fail.
**Accept:** three fixtures — adult, minor, unknown — each with its own outcome.
⭐ **BUILT S7 (2026-09-26).** One age definition — `ageOnPlatformDate` (EAT calendar date, whole years), wrapped
as `marketingAge` because `isOfAge` folds "unreadable" into "minor" and marketing needs a THIRD answer: under 18
→ `age_minor`, missing or unreadable → `age_unknown`, asked straight after harm markers (§5.6). ⛔ A contact is
`age_unknown` until U33 records an attestation — no field carries one today, and reading an 18+ out of `source`
or free-text `evidence` would be inventing it, so the contact path is SHUT until U33 builds what it waits on.
⚠️ That changed U8's suite: its gate-facing contact is no longer "marketable" before a stop, so labels 1 and 12
now pin the property they always meant — a stop turns the gate's answer into `suppressed`, and a resume gives
back EXACTLY the pre-stop answer (the lift-ignored red case still fails it). ⚠️ Registration writes `User.dob`
while KYC writes `KycSubmission.dob`; the gate reads the ACCOUNT's (OD14's wording).
🔴 **FOUND BY THE 2026-09-26 AUDIT, FIXED IN ITS FIX PASS (§0 ruling 9) — THE GATE CLEARED A PLAYER KYC HAD
REFUSED AS A MINOR.** When the date of birth on an identity document gives under 18, `kyc-service` freezes
the wallet and writes `KycSubmission` REJECTED/UNDERAGE — it changes neither `User.status` (still ACTIVE)
nor `User.dob` (still the adult date typed at sign-up), so reading only the account cleared a minor the
platform itself had found, against RG §4's "no marketing … to anyone under 18". SANCTIONED and
DUPLICATE_IDENTITY (possibly the second account of somebody self-excluded on the first, GN 478T reg 49(3))
passed the same way. **Now:** a FINAL KYC refusal refuses — UNDERAGE → `age_minor`, SANCTIONED /
DUPLICATE_IDENTITY → `account_status` ("identity refused (…)"); when the KYC row carries a document date of
birth the YOUNGER of the two ages governs (so the under-25 step uses it too); a KYC record that cannot be
read refuses as `age_unknown`; and a case an officer re-opens is marketable again with no extra code
(`reopenFinalRefusal` restarts the row). Guard `test:marketing-consent` (fixtures: adult sign-up date +
KYC UNDERAGE → `age_minor`; SANCTIONED → refused).
⚠️ **What this does NOT make true:** KYC is asked only at withdrawal, so most players are still marketed on
the date of birth they typed (and attested 18+) at sign-up. RG §4's "anyone under 18 or whose age we cannot
confirm" is read as: no readable date of birth, or an identity record that cannot be read, is `age_unknown`
— not "every player without a KYC check". The page was not re-versioned; a stricter reading is an owner
call and a new RG version.

**U12 · The published promise, reconciled** — `/legal/responsible-gambling` (D12, OQ6)
Build what exists (U10 + U11 suppress self-excluded, cooling-off, harm-marked and under-18 recipients).
Then either build an age band and a vulnerability-segment definition, or re-version §4 to say only what
runs — Ali's call, recorded. ⛔ The engine does not go live while the page claims something it cannot do.
**Guard:** `test:rg-policy` (re-scoped at S7 — see below). **RED:** `red:rg-policy`.
**Accept:** the page and the engine agree, and the guard can prove it.
⭐ **BUILT AND RULED S7 (2026-09-26), on Ali's delegation of that day** — the full record is
`docs/COMPLIANCE-DECISIONS.md` § "2026-09-26 · RG Policy v2026-09-26". Precedents: "build it first, then write it here" (2026-09-14, third)
and "a public promise the code refuses is worse than a shorter one it keeps" (2026-09-05). So: the cheap
protective half is **BUILT** — "under 25 in a vulnerability segment" is DEFINED as under 25 with a
self-exclusion or a break ever on record, and refused as `rg_under25_history` with no lift until 25 (⛔ it
excludes, never selects: Privacy §6 says "we do not profile you for marketing"); §4 is **RE-VERSIONED**
(v2026-09-26) to name exactly the exclusions the gate runs; and "no sign-up nudges in the late-night window" is
**CUT** — no window exists in code, and U13 may write a promise back when it builds one — ⚠️ only on the
three conditions in §9 U13 (the existence-only control strengthened first).
⚠️ **Why the guard moved.** The key named above, `test:privacy-notice`, reads only the PRIVACY page, and the
"audience whitelist" it was to assert is U24's and does not exist. `test:rg-policy` pins this page's version, a
hash of its binding English and a COMPLIANCE-DECISIONS heading (the page had none of the three), and maps
every §4 promise BY ITS WORDS to a named control in code — a promise with no control is D12 exactly, and red.
*(2026-09-26 audit-fix pass, translations only: in zh and sw every number now stays with its unit — "24 小时",
"18 岁", "miaka 18", "sehemu ya 2" — and the zh §2 sentences are joined, so no space follows "。". The
English is untouched, so the version and the pinned English hash do not move; `test:rg-policy` 3.1/3.2
guard both, with three new `red:rg-policy` cases.)* *(2026-09-27, the final visual review, markup only: the
zh §2 link "负责任博彩设置" is `whitespace-nowrap` — it broke "负责任博彩设" / "置" at 360 — pinned by
`test:rg-policy` 3.4 with a new `red:rg-policy` case. The en block is untouched, so the policy stays
v2026-09-26 with the same pinned English hash, and no COMPLIANCE-DECISIONS entry is needed. The other zh
splits in legal body prose (RG §2 bullets, §3, §4; Privacy §1, §4) are left BY DESIGN: breaking between
hanzi in long prose is conventional, keep-all on `LegalSection` was rejected (half-empty lines), and word
joiners would change policy text. The shared legal chrome moved onto the reading floor on every /legal
page: the `LegalHeader` version line and the `LegalSection` number are 13px (`text-body-sm`; were 11px and
12px). Re-derive the suite counts from a run.)*

**U13 · The send window** — `src/lib/marketing/window.ts` (D13, OQ5)
`08:00–20:00 EAT`, evaluated server-side in the loop against `Africa/Dar_es_Salaam`; the window is ONE
named constant (`SEND_WINDOW_EAT`) with the arithmetic written out *(this said "both candidate windows";
only one was ever named — corrected 2026-09-26)*; outside the window rows are **HELD**, the
campaign pauses with `quiet_hours` and resumes by itself. ⛔ The document and the UI both say this is
50pick's own rule, not a TCRA rule.
**Guard:** `test:marketing-window`. **RED:** clock at 03:00 EAT → every dispatch must be held.
**Accept:** a campaign started at 19:55 holds at 20:00 and resumes at 08:00, and the held rows are counted
as outstanding, never as failures.
⚠️ **What S8 can actually prove (2026-09-26 audit).** The Accept above needs a campaign (U35), a pump (U44)
and a page (U47). Rewrite it, in the commit that builds this unit, to: `window.ts` answers open or closed
at 07:59 / 08:00 / 19:59 / 20:00 and 03:00 EAT, and outside the window `dispatchSlice` holds EVERY row
(reason `quiet_hours`) and asks no gate (§5.6: the window is slice-wide). Move "the UI says it is 50pick's
own rule" to U47. Pin `lib/marketing/window.ts` in `test:client-graph-safe`'s set, as `footer.ts` is.
⛔ **Do NOT restore the late-night bullet on `/legal/responsible-gambling` in the same breath.**
`test:rg-policy`'s late-night control holds on `existsSync(window.ts)` alone, which an empty file passes.
Restoring any §4 promise needs ALL of: (1) that control strengthened to require that
`src/lib/server/marketing/dispatch.ts` imports the window AND calls it, with an in-memory red plant that
removes the call — and ⚠️ creating `window.ts` turns `red:rg-policy`'s "late-night bullet restored with no
window in code" case into a MISS (its world spreads the real one), so give that case `windowExists: false`
in the same commit; (2) wording that names only what runs ("no marketing SMS outside 08:00–20:00 EAT"),
not "sign-up nudges"; (3) a new policy version in en/sw/zh, a COMPLIANCE-DECISIONS entry and an owner
ruling (§6).

**U14 · Frequency cap** — the loop (D14)
One message per number per 72 h, four per 30 days, counted from `SmsMessage` rows with purpose MARKETING;
the skip carries the release date.
**Guard:** `test:marketing-consent`. **RED:** two campaigns an hour apart → the second must skip.
⚠️ *(2026-09-26 audit)* "Two campaigns an hour apart" needs campaigns (U35). If U14 is built as a
predicate over an injected send-history source, rewrite its RED to that form (history says one send 71 h
ago → the next is skipped with the release date). If U14 moves behind U35 instead, re-order §10 and the
▶ NEXT pair in the same commit.

**U15 · One send path** — `src/lib/server/invite-service.ts` (D15)
Retire the phone half: delete the `sendBatch` block (unreachable today behind the withdrawn-bonus flag),
replace it with a refusal naming the new surface, keep `InviteEntry`, `bindRegistration`, the email lane,
the admin pages and the DLR's invite arm untouched. Then the **structural** guard: grep the pattern
`sendBatch(` across `src/` and assert the non-OTP call sites are exactly one module. ⛔ A hand-written
file list is the consolidation trap; grep the pattern.
**Guard:** `test:marketing-engine` §1 + `test:invites` + `test:invite-flow` + `test:withdrawn-features`.
**RED:** add a second non-OTP caller → red.
**Accept:** exactly one module may send a non-OTP SMS, provable by grep.

**U16 · Erasure and retention reach the new stores** — `retention.ts`, DSAR export/erasure,
`docs/DATA-RETENTION.md` (D16)
Import rows expire 90 days after the run; recipient rows are the proof of what was sent and are **not**
deleted; ledger rows are never deleted; suppression rows are **never** deleted, ever. ⭐ Since U35b (2026-10-02) the
campaign models exist (M9): `SmsCampaignRecipient` holds the number each person was sent to (`msisdn`), their opt-out
token and the gate's trail, with its contact and account links set null — erasure, a period and the access export
reach it BEFORE U42 writes the first recipient; `SmsCampaign` holds the audience as a filter, never a number (OD55). ⚠️ Fix in the same
pass: the 730-day marketing lapse clears the boolean without appending a ledger row, so the two disagree
after the first lapse. The guard is structural — grep the schema for phone/e-mail columns and require each
owning model to appear in both files or be listed with a reason.
**Guard:** `test:retention` + `test:dsar-secrets`. **RED:** add a model with a phone column → reported.
**Accept:** `/admin/retention` and the published schedule name the same rows.
🔴 **FOUND AT S6, OWNED HERE — ERASURE CAN RE-OPEN MARKETING, AND THE MEMORY STORE HIDES IT** (worked out
from the code, not yet executed on Postgres). Erasure tombstones `User.phoneE164` to `erased:<id>`
(`erasure.ts`) but touches neither `MessagingConsent` nor `Suppression`. On Postgres `findByPhone("+255…")`
then returns null, so the gate falls to the LEDGER branch — and an erased player whose last ledger row is a
registration or profile GIVEN passes. ⛔ The memory store refuses instead, because `usersByPhone` is written
only on create and never re-indexed on update, so every suite (all run on memory) finds the erased row —
a DAL-parity defect that makes the dangerous branch unreachable in tests. ✅ CLOSED BY U18b (S10, `0e68d59e` and
its review rework): erasure appends a WITHDRAWN row for every number the person is known by, the memory store
re-keys a changed phone, and the erased number is refused on BOTH stores. ⛔ NO suppression row at erasure — U18b's
review reversed that: a stop is kept for ever, so it would bar a recycled number's NEXT owner from ever consenting. ⚠️ The lapse and closure writers (`retention.ts`,
`user-service.ts`) also clear the boolean with no ledger row — seven `marketingOptIn` writer sites now, three
unwired.
✅ **DONE 2026-09-27 (S7c) — the DAL half below is built and guarded (`dal-parity` §17.supersede and
§17.liftreason, `red:dal-parity`, `test:marketing-optout` 32b). The erasure writes landed with U18b (above). What
U16 still owes: U16a — erasure, the access export and retention reach `SmsCampaign`, `SmsCampaignRecipient` and the
opt-out tokens, before U42 writes the first recipient; U16b — the rest (the 730-day lapse's ledger row, import-row
expiry, the published schedule).**
🔴 **AND A NON-WITHDRAWN SUPPRESSION MUST OUTRANK A PERSON'S OLD STOP (found 2026-09-26, both DALs; ✅ built at S7c —
U23's officer Suppress, an OPERATOR stop, relies on it; U16 itself writes no suppression).**
Suppression is one row per (channel, identifier, category). `db.suppression.create` on an existing row only
clears its lift and keeps the FIRST row's reason, evidence and recorder; `db.suppression.lift` has no reason
filter. So if the person once stopped by link and resumed, an erasure (or U23's officer "suppress") layered
on top still reads `WITHDRAWN` — and that old SMS link, or the profile toggle, could lift it. Before this
unit or U23 writes a non-`WITHDRAWN` row: in `store.ts` AND `prisma-dal.ts`, a re-arm by SELF_EXCLUSION,
COMPLAINT or OPERATOR overwrites reason, evidence and recorder (`createdAt` untouched); `lift` takes
`reason: "WITHDRAWN"` in its where-clause; `test:dal-parity` cases for both. ⚠️ The profile OFF writes no
suppression at all (the boolean and a WITHDRAWN ledger row), so erasure cannot lean on one being there.

### Phase B — the contacts book (U17–U34)

**U17 · Five doors** — `/admin/contacts` exists and is reachable (D17)
`NAV_GROUPS` + `ROUTE_KEYS` (Growth group, label **"Contacts"**), `ROUTE_DOMAINS` `["/admin/contacts",
"growth"]`, `layout.tsx` with `AdminSectionGate`, `loading.tsx` (`SkKpiRow` + `SkFormCard` +
`SkTableCard`), and the `filter-language` `ADMIN_SURFACES` entry. ⚠️ Prefix order in `ROUTE_KEYS` is
load-bearing.
**Guard:** `test:rbac`, `test:admin-nav`, `test:admin-section-gate`, `test:filter-language`.
**RED:** remove the `ROUTE_DOMAINS` row → the page must become invisible to GROWTH, and the suite red.
**States:** loading · empty · populated · in-progress (n/a) · refused (no act right) · error.
**Accept:** a GROWTH session reaches the page; an unlisted role does not; the skeleton's declared height
equals the real block.

**U18 · The book** — `MarketingContact`, `ContactList`, `ContactListMember` + both DALs + a new `dal-parity` section
`msisdn` (bare 255, `@unique` — OD3/OD32), `rawInput`, `displayName?`, `email?`, `ndc` (denormalised so
the operator filter is an index scan), `operator?`, `source`, `sourceRef`, `userId?` (a LINK, never a
copy — an erased player must not survive inside a marketing row), `consentState`, `suppressedAt`, `tags`,
`notes`, `importId?`, audit columns; GIN index on `tags`, indexes on `ndc`, `consentState`, `createdAt`.
**Guard:** `test:dal-parity` — a NEW section at the next free number (§1–§18 are taken: §6–§16 house bots, §17 U6, §18 U8; corrected 2026-09-25, this said §8), extending `red:dal-parity`. **RED:** a planted key in one mapper only.
**Accept:** named types, both halves, the section's own control green.

**U19 · Masked by construction** — `sensitive-fields.ts`, `read-tiers` §7/§8 (OD25)
A new `contactPhone` registry entry keyed by **contact** id (⛔ a separate field from `phone`, for the
same reason `msisdn` is separate — the subject is a different row). Every render goes through
`<Sensitive>`; the query-shaping object literal gets its `GOVERNED_REVIEWED` entry with a reason. ⛔ "Copy
number" is a REVEAL: a masked role gets no copy control at all, because an absent control cannot be
forged.
**Guard:** `test:read-tiers`. **RED:** render the raw column → red.
**Accept:** a GROWTH session sees `+255••••01` everywhere, including the export and the failure lists.

**U20 · The list** — `/admin/contacts` server-paged
Nine columns (select · Name · Number · Operator · Consent · Reachable · Lists/Tags · Source · Added),
`SortTh`/`parseSort` tie-breaking on `id`, ⚠️ **"Operator" sorts by `ndc`** and the header says so (a
localised label cannot survive paging), `Pagination` with `parsePage` clamped, whole-book `AdminKpi`
counts by `groupBy` (⛔ never the filtered view), and `SearchBox` in url mode whose `q` is **normalized
through `parseTzNumber`** so `0712 345 678`, `712345678` and `+255712345678` all find one row.
**Guard:** `test:contacts-page` + `test:search-adoption`.
**RED:** drop the query normalization → the `0712…` fixture returns 0 rows.
**States:** loading · empty book (its own copy) · populated · in-progress (n/a) · no-match (different
copy, with the clear-filter action) · error (`AdminLoadError`, never a zero).
**Accept:** page 4 of a 3-row result renders row 1–3, not "no matches".

**U21 · Filters** — `contact-filters.tsx`: a rail over U24's resolver, UI only (decisions C1 · C2 · C9 · C13 · M11 · A1.1)
One server-rendered rail of `FilterPill rank="dense"`, six axes: consent · suppressed · operator · source · list · tag.
⛔ U21 turns no filter into a query (C1): U24's `parseContactAudienceParams` reads the URL and `contactAudience` runs
it; the rail draws what is applied and builds every pill and Clear filters through C9's ONE href builder,
`contactsHref`. URL per C2 — `consent`, `suppressed`, `op`, `list`, `tag`, `source`, multi-valued as a comma list —
plus U24's recorded extension (`player`, `import`, `range`/`from`/`to`), for which the rail draws NO axis: an applied
one shows as one selected, clearable pill, and Clear filters removes it. An unknown value is refused by the loader
(C8) and the page shows the refused state with Clear filters, never a wider table.
🔴 **D19 / A1.1 — the rail is role-shaped.** There is NO player axis, for any viewer. For a viewer whose
identity.contact cell is not `read`, the Consent and Source axes are NOT rendered, and a typed `?consent=`,
`?source=` or `?player=` is REFUSED by U24's loader with the role refusal ("This filter isn't available to your
role.") BEFORE any row is read: Source "Sign-up" means the number came with an account, and until U33 a GIVEN or
WITHDRAWN consent can only come from a player or an erasure, so either axis answers "is this a player?" for a number
the viewer typed. Whole-book KPI counts stay (a count over the book is not a per-number answer). Readers (`read`) see
all six axes. ⚠️ Corrected premises: (1) no "reachability" axis — Reachable is the send gate asked per row (RG, KYC,
age, account), which no column equals; the axis is **Suppressed**, over the `suppressedAt` cache U24 commit 2 keeps
honest (so U21 lands after that commit, C22). (2) The operator value is the licensee ID (`?op=VODACOM`), never the brand (Tigo became Yas in 2024): label
`TZ_OPERATORS[id].brand`, prefixes from C10's `ndcsForOperator`, and the Operator COLUMN reads `operatorBrand(c.ndc)`
only — never the stored `operator` string, which could read "Tigo" under the Yas pill. (3) Nothing writes a list or
a tag yet, so those axes render only when options exist OR a value is applied; an applied value is always a
selected, clearable pill ("Unknown list"; a tag outside the top 20 is appended), grouped by U28's `tagKey` (C11),
counted by U24's `tagCounts` (M8). CONSENT/SOURCE labels move from `page.tsx` to `contacts-copy.ts` once; UNKNOWN
reads "Not recorded" (C13). Rail and search strip are gated on `!emptyBook` alone, never the match count; a failed
read draws the rail from the URL, so the filter stays visible (§5.15). `contact-filters.tsx` and its
`filter-language` ADMIN_SURFACES entry land in ONE commit. ⚖️ Settled in review (S10): a failed TAG or LIST read
fails the page (an axis silently dropped would say "the book has no tags" — the never-a-zero rule); a masked viewer's
pill links keep a refused axis rather than strip it (C2: a pill changes only its own axis; the refusal's Clear filters
is the way out). Long labels clip at 38 characters with the full text in the title.
**Guard:** `test:contacts-page` (C14 — rail model, hrefs, the rail surviving no-match, the Operator column, the
role-shaped rail) · `test:filter-language` (the declaration; dense rank 1 of 1).
**RED:** `red:contacts-page` FIRST (M11; in-process): a masked viewer with `?source=REGISTRATION` or `?consent=GIVEN`
gets rows, or sees the Consent or Source axis drawn, instead of the role refusal (A1.1); a hand-typed 2020-edition
operator map (Vodacom without 72), pills keeping `page` or dropping the search, only the top-N tags drawn, the rail
gated on rows, the column reading `c.operator`. Then `red:filter-language` +2 (rail undeclared → §0.4; dense rank
removed → §6.6) — it WRITES real files: run it detached under the heavy-node lock, alone, then `git status`.
**States:** loading · none applied · applied (one axis; combined, paged and re-sorted) · in-progress (n/a) · no-match
with the rail STILL rendered (Clear filters keeps search and sort) · refused (the value named) · refused (role — the
filter would show which numbers are players; Clear filters) · error (the rail still shows the filter) · empty book
(no rail, no search).
**Accept:** page 2 of `?op=VODACOM&tag=vip` sorted by name still carries both filters and the sort; the KPI band is
the whole book under every filter; `?op=NOKIA` shows the refused state; a GROWTH (masked) session sees no Consent or
Source axis, and its `?source=REGISTRATION` shows the role refusal with no row read.

**U22 · Add and edit one contact** — `contact-form.tsx` in a `Modal` (decisions C3 · C4 · C9 · C11 · C12 · C24 · C25 · M5 · M12 · A1.1 · A1.7)
⛔ **No consent control** — nothing lawful can be chosen: a contact needs OD9's basis and an 18+ attestation, which
only U33 builds. The dialog states Consent **"Not recorded"** (the list's label, C13): "This form never records
consent; a contact with no consent recorded is never sent marketing." No consent key in the request, NO ledger row
(dal-parity §20's comment naming U22 a writer is reworded); the row's caches come from U24's `mirrorContactCache`
(C4). 🔴 **D19 / A1.1 — the mirrored consent is a player signal.** Until U33 a GIVEN or WITHDRAWN ledger row can only
come from a player (sign-up, profile, opt-out) or an erasure, so for a viewer whose identity.contact cell is not
`read` the post-save consent chip, and any mirrored consent in the edit dialog, is NOT rendered: that viewer sees the
form's own sentence above and nothing per-number (the list's Consent cell and `?consent=` are already closed to them,
U24 commit 1 and U21). Readers see the mirrored value. `PhoneInput` gains three ADDITIVE props — `onPasteRaw` (a pasted `+254…` is judged before truncation, never
called a Mbeya landline), a forwarded ref (the Modal focuses the number, not ✕), a caller's `title` winning — and
the form is `noValidate`. A pure `src/lib/contacts/contact-number.ts` (pinned, M3) gives the live verdict: the
operator `Chip` at two digits from C10's `ndcRow`, "4 of 9 digits" while typing, too-short only once settled, 064
refused at two digits, every sentence `parseTzNumber`'s own. ⛔ No "save anyway": the unique index IS the duplicate
check — a create returning null (a race included) is a refusal carrying the existing id. "Open the existing
contact →" opens `?edit=<contact id>` through `contactsHref`, to which U22 adds `edit` as an explicit patch key
(additive; C9, M12: filters ride along; `edit` is never carried forward from `sp`, so it never reaches SortTh,
pagination or the SearchBox, and the dialog's close link is `contactsHref(sp)` without it; a cuid travels, never a
number). The create goes through the ONE builder `newContactRow` (`src/lib/server/contacts/contact-write.ts`, X6 — U22
creates it; U31, U32 and U33 reuse it), then `mirrorContactCache` for the new row's caches. It never sets `userId` —
never linked to a player, even when one holds the number — and a player's duplicate shows the same sentence and the
same Open link as any other (D19). ⛔ **Erased rows (C3, A1.7).** Adding
an erased number (`sourceRef = "erasure"`) refuses with "This number can't be added to the book." and opens NOTHING —
the refusal payload carries NO id. To `?edit=` an erased row is MISSING: the edit loader and `editContact` treat
`sourceRef = "erasure"` as not found (`CONTACT_MISSING`), so no officer can write a name back onto an erased
person's number — the U22 spec's case that let an erasure-emptied row be edited (its 15.1) is REVERSED and must
refuse. Fields: Name, Email, Notes, Tags — limits from U28's ONE table (C12), tags through
`splitTags`/`tagKey` (C11); a stored email renders only through `<Sensitive field="contactEmail">`, a NEW registry
entry masked like `email`, re-read by contact id (M5). Edit is compare-and-set: `updateIfUnchanged` in both twins,
writing an EXPLICIT `updatedAt` (C25), never touching the number, `sourceRef`, link, caches or created-by.
`contact-form-actions.ts` (C24): `softRequireStaff("growth", …)`, per-officer rate rules, every field re-typed, an
audit row with the MASKED number and field names only. "Add contact" sits in the page head, disabled with its
reason when the role cannot act (never hidden); the loading ghost reserves its box.
**Guard:** `test:contacts-form` (C14 — NEW, in `predeploy`, in-process `--prove-red`) · `test:dal-parity` §22 (C7).
**RED:** `red:contacts-form` — default consent to granted → red (the plan's own); also a spread client draft, a
constant cache, the number stored as typed, lookup saying "is a player", last write wins, an ungated action, a
"save anyway" button, a masked viewer adding a seeded player's number and reading "Given" (A1.1), `?edit=` of the
erased fixture opening the dialog (A1.7), the erased refusal carrying an id. `red:dal-parity` §22: the Prisma where
loses `updatedAt`; the memory twin loses its compare.
**States:** loading · blank · typing (chip + verdict) · checking (duplicate lookup held) · saving · saved (toast,
the row first) · refused (duplicate / invalid / erased / stale / missing — an erased row included / act gate /
rate-limited) · error.
⚖️ **Reviewed in S10 (`03919fa2`):** a paste governs only when it produced the whole field (`governingPaste`); the dialog
obeys the act gate; a refused email focuses its input. ⏳ Deferred: typed fields pass through U28's CSV formula-unguard
(a typed leading `'` is dropped). ✅ Closed by U23 (`2809af63`): each row carries an "edit" link into `?edit=` (D19-safe:
the contact id, never the number).
**Accept:** `0712 345 678` then `+255712345678` leaves ONE row and a duplicate refusal with its link; for a reader, a
number whose ledger says WITHDRAWN is added reading "Withdrawn" (the mirror), while a GROWTH (masked) session adding
a seeded player's number sees no consent value at all; the form wrote zero ledger rows; `?edit=` of the erased
fixture shows the missing refusal.

**U23 · Selection and bulk** — the bar (decisions C3 · C4 · C5 · C6 · C11 · C23 · C24 · M4 · M10)
Selection is a `Map<id, row>` of server-projected rows `{ id, name, masked }` (masked for every role; no `msisdn`
reaches the client), or "select all N matching", which stores the FILTER. Both travel as U24's audience JSON (C6:
`parseContactAudienceJson`, ticks as the `ids` arm, ≤ `MAX_AUDIENCE_IDS` = 1,000, `[]` = nothing); every count is
`contactAudience(f).count()` (U23 joins U24's READERS) and every audit row describes it with `auditContactAudience`.
Erased rows are in no audience (C3). Actions: tag · untag · add to list (existing, or a new name ≤ 60 characters; a
case-insensitive duplicate is refused) · record a withdrawal · suppress · remove. ⚠️ Corrected: no staff "record
consent" (no wording, basis or 18+ attestation until U33, which adds "Given" to this bar), and export is U34's,
posting the same JSON. A tag runs U28's ONE rule (C11), so a bulk "VIP" is stored as the form stores it. Up to 50
ticked rows ENUMERATE from the server preview (first 20, masked, "and N more"); above 50, or ANY filter audience, the
typed word is the SERVER's recomputed count — the run recounts and refuses `confirm_required` / `confirm_mismatch`
with the new count (OD27/OD28). Tag, untag, list and remove are SET-BASED over the resolver's where (`tagWhere`,
`untagWhere`, `removeWhere` — the memory twin cascades members and frees the number's index — and `addWhere`).
Withdraw and suppress write per number, capped at 1,000 (refused above with the reason; re-measure p95 after the
deploy). Withdraw appends WITHDRAWN (source OPERATOR, a fixed officer wording, `...ledgerStamp()`; a fourth §20
writer), turns a player's toggle off only through `syncPlayerToggle(…, actor)` (C5), and calls `mirrorContactCache`
(C4, M4); `contact-bulk.ts` joins U24's CACHE_WRITERS (M4). A filter audience POSTed by a masked role is refused
`consent`, `source` and `player` exactly as the URL is (U24, A1.1), so a forged body cannot turn the recount into a
player oracle. ⚠️ Suppress writes an OPERATOR stop NOBODY can lift — not the person, not a recycled number's next owner
(C23/M13; Ali may rule otherwise, §0 ❓ FOR ALI) — and the confirmation says so in words. The old warning that the
DAL would let a person's stop link lift it is struck: the re-arm precedence and the WITHDRAWN-only lift shipped in
S7c. Server and UI ship in ONE push (M10, `test:orphan-actions`): `contact-bulk-actions.ts` (C24), the pure
`src/lib/contacts/bulk-rules.ts` (pinned, M3), `contact-bulk.ts`, the bar, a select column (+1 to both column counts).
**Guard:** `test:contacts-bulk` (C14 — NEW, in `predeploy`, in-process `--prove-red`) · `test:dal-parity` §20 / §23 (C7).
**RED:** confirm from a client-supplied count → the server must refuse (`red:contacts-bulk`; also a reused preview
count, a filter treated as ticks, a person-liftable suppress, a cascade-less memory remove, a raw search in the audit,
a masked role's POSTed `sources` audience answered with a count).
**States:** loading · none selected · selected (bar; rows across pages / all N matching) · confirming (enumerate /
typed) · acting (overlay) · done (server-counted toast) · refused (act gate, reason in `title`, never hidden;
audience moved; over the cap) · error.
**Accept:** a forged count of 3 for 60 ticked rows changes nothing; after a withdrawal a player's number is refused
`no_consent` (its toggle is off) and a stranger's `consent_withdrawn`.
⚖️ **Shipped in S10 (`2809af63`), with what the build measured or left open:** the Prisma twin is proved on Postgres
(probe §6). ⏳ The 1,000 per-number cap is an ESTIMATE — re-measure the per-number p95 after the deploy. A filter
audience is recounted, then written by a set-based statement: a contact added between the two is written too (the
counts are the store's own; `full` is approximate under concurrency). Ticks live in the page, so a full reload — "Clear
filters" is a plain link — drops them. A whole-number search's bare `255…` key reaches the RSC payload through "select
all matching"'s filter key: the viewer's OWN query from the address, accepted. The 1,000 cap cannot be driven in a
browser (B8b holds it in-process), and the error state is a planted HTTP 500 (there is no fault switch).

**U24 · One audience resolver** — `src/lib/server/marketing/audience.ts` (OD36; decisions C1–C4 · C6–C10 · M4 · M8 · A1.1)
`contactAudience(filter)` is the ONE place a filter becomes a query — the list, the KPIs, U21's rail, U23's bulk,
U34's export and the campaign's counts all read it; a ticked selection is its `ids` arm. audience.ts exports the
filter type `ContactAudienceFilter`, `parseContactAudienceParams` over the URL vocabulary below (an unknown VALUE
refuses, never drops; `ids` never in a URL), `parseContactAudienceJson` (an unknown KEY refuses; `ids` ≤
`MAX_AUDIENCE_IDS` = 1,000), `contactAudienceKey`, `auditContactAudience` (a whole number masked, ids as a count),
`describeAudience`, `contactsSearch` (moved from `contacts-query.ts`), `toAudienceWhere` and count · breakdown ·
page (clamped) · walk (keyset on id). The DAL's where is the named `ContactAudienceWhere` in store.ts (`null` =
unconstrained, ⛔ `[]` = NOTHING), which each twin translates privately.
⚠️ C1's wording calls `ContactAudienceWhere` audience.ts' filter type. As built: the filter type is
`ContactAudienceFilter` (audience.ts); `ContactAudienceWhere` is the DAL's where (store.ts); the twin translations
stay private to store.ts and prisma-dal.ts, and `toAudienceWhere` is the only filter → where translation. Do not
"fix" this back to C1's letter.
⭐ **The URL vocabulary, recorded once (a C2 extension, 2026-10-01, matching the resolver as built).** C2's keys —
`q`, `consent`, `suppressed`, `op`, `list`, `tag`, `source`, `sort`, `dir`, `page` — plus `player` (yes or no),
`import` (a run id: OD35's "remove everything that run created" is a filter on it) and the Added window `range` /
`from` / `to` (a named preset, or EAT dates, resolved to absolute instants). Each extension key refuses on its own
terms, each with its own case in `test:contacts-audience`: `player` not yes/no; `import` not an id; a `range` the
page does not offer; an unreadable or inverted `from`/`to`; a `range` beside a `from`/`to`; `range=custom` with no
date. `contactsHref`'s key list mirrors this one, and the suite fails the moment the two differ.
🔴 **D19 / A1.1 — role-refused axes.** For a viewer whose identity.contact cell is not `read`, the loader REFUSES a
typed `consent`, `source` or `player` with the role refusal ("This filter isn't available to your role.") BEFORE any
row is read — C8's refused, with a role reason beside the unreadable one — and the page's per-row Consent chip (U20's
column) renders only for a `read` viewer. Whole-book KPI counts stay. The same refusal guards an audience POSTed as
JSON (U23's bulk entrance), so a forged body cannot ask what the URL may not.
C10's `ndcRow`/`ndcsForOperator` are exported from `tz-msisdn.ts` here. Every reader excludes erased rows (C3) — on
Prisma as `OR: [{ sourceRef: null }, { sourceRef: { not } }]`, since a bare `not` drops NULL rows. Both twins gain
`countWhere`, `summaryWhere` (replacing `summary()`), `walk` and `tagCounts` (M8).
COMMIT 1 also moves the loader onto it — `loadContacts(sp, deps?: { reads? })` returns ok or refused (C8; the
`search` injection goes, D19's `reads` stays; KPIs = the whole-book `breakdown()`) — and creates C9's `contactsHref`
in `contacts-query.ts`, since this is the commit in which a filter first reaches the URL: pagination and Clear search
carry every filter and never `page` unless patched; it NEVER carries `edit` forward from `sp` — only an explicit
`edit` patch sets it (U22's open link; U22 adds that patch key) — and SortTh, pagination and the SearchBox are
handed `sp` without it. Plus the refused state with Clear filters, and the role refusal above.
COMMIT 2, before U21 (C22): `mirrorContactCache(identifier)` (C4) recomputes `consentState` (latest ledger status, else
UNKNOWN) and `suppressedAt` (the active stop's createdAt, else null) for every book row with that number, called by
every ledger and stop writer (consent-ledger, optout-service, erase, consent.ts' toggle path, then U22 and U23); the
schema comment that the resolver keeps the cache true is corrected. ⚠️ Corrected: no export or campaign exists yet,
so U24 ships a READERS contract that U34 and U40 JOIN; there is no `reachable` predicate (the gate hoisted to list
time is U9's defect); the campaign's player arm goes INSIDE `audience.ts` (U38/U42).
**Guard:** `test:contacts-audience` (NEW, in `predeploy`, in-process `--prove-red`) · `test:dal-parity` §21 (C7) ·
`test:contacts-page` (the loader: the refused state and the role refusal).
**RED:** a second query path → the structural scan fails (outside the twins only `audience.ts` reads the book in
bulk; the population names `tagCounts` and U23's where-driven bulk methods too, M4); `red:contacts-audience` also
plants `[]` widening, a dropped unknown value, a dropped extension key, the href key list drifting from the parser's,
erased rows counted, an offset walk, a leaked number in the audit and (commit 2) a writer skipping the mirror;
`red:contacts-page` skips the role refusal for a masked viewer; `red:dal-parity` §21 deletes the Prisma NULL arm.
**Accept:** for about twelve filters the list total, `count()`, `breakdown().total`, the walked total and the
page-union, read in ONE run, are equal, and the KPI band equals the whole-book breakdown without the erased row; a
masked viewer's `?consent=GIVEN` is refused before any row is read, and its list shows no Consent cell.

**U25 · The CSV reader** — `src/lib/contacts/import-parse.ts` (pure, streaming; decisions C15–C19 · M6)
RFC 4180 as an INCREMENTAL reader (`createCsvReader().push/end`; `parseCsv` is push + end — §3c.2 forbids
read-then-split): quotes, doubled quotes, embedded newlines (one row), CRLF and lone CR, the `sep=` directive (first
line, after the BOM), and a delimiter vote counted outside quotes on the FIRST NON-BLANK RECORD, once per candidate
with that candidate's own quote rules (a quoted header cell can hold a newline). A manual delimiter beats both. Cells
stay RAW — no trim, no coercion, no unguard; Excel's scientific `2.55713E+11` is flagged by U28's `draftContactRow`
(M6), not here. It emits C15's ONE shape from `parsed-file.ts` (U27a), with `format: "csv"` — each row's `line` is
the record as Excel numbers it (the `sep=` line hidden; blanks counted in `blankRows`, never emitted); warnings
become `notes` sentences (capped at 50, the true total beside them); a fatal problem (an unterminated quote, a field
over 32,767 characters, a header over 1 MiB) is a refusal naming its row, never a file. ⭐ BOM: `stripBom` is the
decode-time stripper (C19), and `DECODE_OPTIONS` sets `ignoreBOM: true` so the platform decoder cannot eat the BOM
first — otherwise U34's BOM-pair red can never fail; U26's and U28's strips are belts. ⚠️ Corrected: Excel's "Unicode Text" is UTF-16LE with TABs and its "CSV" is windows-1252 on
an English PC, so `sniffEncoding` (first 4 KB) picks utf-8 / utf-16le / utf-16be / windows-1252, and rows still
holding U+FFFD are counted and named. `detectFormat(head, fileName)` lets content beat the name (a `.txt` of vCards
is vCards) through `vcard.ts`'s `looksLikeVcard` (C17) and `xlsx-limits.ts`' ONE spreadsheet sniffer and refusal
copy (C18). It may import only `src/lib/contacts/*` and `tz-msisdn` (C17), and defines NO guard pair (C16: that is
`csv-write.ts`). Every special character is written as a char code — the Write/Edit tools decode escapes. Pinned (M3).
**Guard:** `test:contacts-import` (C21 — U25's `csv` section module in the one runner).
**RED:** count the delimiter inside quotes → the embedded-comma header `"Jina, kamili";Simu;"Makundi, lebo, zaidi"`
mis-splits (`red:contacts-import`; also a whole-file vote, no BOM strip, `sep=` ignored, physical-line numbering, a
stateless chunk parser, buffer-and-reparse, an extension-trusting detector, the platform-default decoder).
**Accept:** that header gives 3 cells with `Jina, kamili` intact, and a 150,000-row corpus fed in 4,093-character
chunks equals the one-chunk parse, each character tokenized once.
⚠️ **Built in S10 (`928265b9`, final text `21c72715`) — three premises corrected.** (1) The vote rule as written FAILS its own
Accept: under the comma's own quote rules the header's second quoted cell does not start a field, so its commas count —
comma 2, semicolon 2, a tie the candidate order gives to the comma. ⭐ The rule that holds: a candidate under whose rules
the record's QUOTING BREAKS (a quote not around a whole cell) loses to every candidate that reads it cleanly; C3a pins
the counts. (2) Rows arrive at `end()`, as U26's `push(): void` does — §3c.2's "parse a stream into batches" means U32
stages after `end()`, and may stop early on `stats().refused`. (3) The 1 MiB header cap is the VOTE's: with `sep=` or a
manual delimiter there is no vote, so no cap; `detectFormat` is handed the whole file when it is at most
`XLSX_MAX_BYTES`, else at least the first `SNIFF_BYTES`.

**U26 · The vCard reader** — `src/lib/contacts/vcard.ts` (pure, streaming; decisions C15 · C17 · C20 · A1.2 · A1.8)
⛔ **Both** continuation rules in ONE walk, decided by the property head — separate passes corrupt each other
silently, in BOTH orders: unfold-first eats the leading space of a quoted-printable continuation (`Mama Asha`
arrives as `Mama=Asha`); QP-first swallows the `END:VCARD` after a base64 PHOTO line ending `==`, or after a plain
`NOTE:Lipa=`, so a whole card is lost. ⚠️ Corrected: the fold is version-aware — 2.1 keeps the whitespace (RFC 822
style), 3.0/4.0 drop one character (RFC 2425 / 6350). Also: `itemN.` group prefixes stripped; bare 2.1 params
(`TEL;CELL;PREF`, a bare `QUOTED-PRINTABLE` read as the encoding); 4.0 `tel:` URIs with the scheme stripped and cut
at the first `;` (a `;ext=101` URI otherwise reads too long, and a `+254` one is never seen as foreign).
⚠️ "Preferred-first" taken literally is wrong for SMS: every TEL is ordered by preference and kept, and the row's phone
is the first one `isSendableTzNumber` accepts (a preferred work landline yields to the card's mobile). Cards are
counted apart from rows: `assertVcardCounts` throws unless cards = rows + unreadable, and `describeVcardCounts` makes
"12 cards, 9 rows — 2 cards have no phone number; 1 card is cut off before its end." sayable. A streaming push/end
reader — any split point, a CR|LF split included, equals the whole parse; a 1 MB PHOTO is never buffered. It owns
`looksLikeVcard`, the ONE sniff (C17), and imports only `tz-msisdn` and `contact-fields` (C20): the field mapping is
`CONTACT_FIELDS[*].vcard` — name = FN, else N given + family, else ORG. ⛔ **It emits C15's shape (`format: "vcard"`)
with NO header row (A1.2):** each row's cells sit in the fixed `fileColumns()` order of `CONTACT_FIELDS`, and its
`line` is the card's ordinal — 1-based, counted over EVERY card, strictly increasing — so `isParsedContactsFile` holds
and the number U30 prints is the card's own (a header row would either be read as card 1 or collide with card 1 on
its line). A skipped card goes to `unreadable` (A1.8 / X19: `{ line: its ordinal, reason }`, a reason carrying no
digits) — the source of U30's unreadable count — with one summary note beside it. Pinned (M3). It stays 🔵 until
U30/U32 parse a real `.vcf` on production — no production surface reaches it before then (U25's `detectFormat`
imports its `looksLikeVcard`, C17). ⚠️ Built in S10 (`b4faac34`): C20's two imports leave no room even for a type-only import of
`ParsedContactsFile`, so `vcard.ts` restates the shape and `isParsedContactsFile` proves the fit at run time — a candidate
amendment (allow a type-only import; both import walkers already ignore them); text escapes are undone for 2.1 cards too;
`fields.mts`' §F19b (the round trip of U28's sample vCard) is U28b's, not U26's.
**Guard:** `test:contacts-import` (C21 — U26's `vcard` section module).
**RED:** split the two continuation rules into two passes → red — planted in BOTH orders against two fixtures, each
failing its own assertion (`red:contacts-import`; also the group prefix kept, bare params ignored, the `tel:` URI kept
whole with `;ext=` and `+254` fixtures and a plain `tel:` as the control, a preferred landline winning, skipped cards
uncounted or sent to `notes` instead of `unreadable`, a header row emitted (card 1 lost or on a duplicate line), a
chunk end read as a line end).
**Accept:** the 12-card fixture says exactly the sentence above, each row's `line` is its card's ordinal (card 1 is
never lost to a header) and the skipped cards' ordinals are in `unreadable`; 20,000 cards fed in 64 KB chunks give
20,000 rows with the NDC table built once.

**U27 · XLSX, server-side, and the boundary that proves it** — `src/lib/server/contacts/import-xlsx.ts`
(contributes D18's ceiling; D18 itself is now U30's, decision C26 · also C15 · C18 · C24 · M3 · M6 · A1.3 · A1.4 · A1.6 · A1.8)
U27a (first, beside U28a): `src/lib/contacts/parsed-file.ts` — C15's ONE `ParsedContactsFile` (a `format` of csv,
xlsx, vcard or paste; `fileName`; `rows: { line, cells }[]`; `width`; `blankRows`; `notes`; and, by A1.8 / X19,
`unreadable: { line, reason }[]` — the records a producer could not read, counted and listed by U30) plus its runtime
validator; `src/lib/contacts/xlsx-limits.ts` — the derived caps, the ONE spreadsheet sniffer and refusal copy table
(C18), the ONE phone-format remedy clause ("format the phone column as Number with 0 decimal places", A1.6), and the
Excel-shortened detector `looksExcelShortened` with its sentence — the ONE copy (M6, C18): `contact-fields.ts`
imports both and never redefines them, and `test:contacts-import` fails on a second definition anywhere in src; and
`test:contacts-boundary`. U27b: the reader. ⭐ The cap is DERIVED: Next 16 caps a whole server-action request at 1 MB
(1,048,576 B); 700 KiB (716,800 bytes) is 955,736 base64 characters, which fits with an 8 KiB envelope — asserted
against the installed Next's own constant, with no `bodySizeLimit` raised (OD29). ⛔ **The gate measures the EXACT
decoded size (A1.4):** from the base64 length alone, 3·len/4 minus the `=` padding (a length that is not a multiple
of 4 is refused), and it refuses above 716,800 bytes before any decode — a length-only gate would let +1 and +2
bytes through, because 716,800, 716,801 and 716,802 bytes all encode to 955,736 characters. ⚠️ Premise false:
exceljs 4.4.0's `cell.text` of a number is EXACT; `2.55713E+11` is Excel's DISPLAY, written on a save-as-CSV or a
paste. `Math.round` on every number would corrupt decimals, and `cell.text` mangles a Date and drops a formula result
of 0 — so one typed `xlsxCellText` switch: integers exact, float noise rounded, decimals kept, a Date as ISO, a
formula as its cached result. 🔴 **Excel's NUMERIC shortened form (A1.3):** a CSV holding `2.55713E+11` re-saved as
xlsx stores the NUMBER 255713000000, which reads as a valid Yas number — a stranger's. So a numeric cell that is an
integer ≥ 1e11 AND divisible by 1e6 is written as Excel's scientific text (`255713000000` → `2.55713E+11`), and a text
cell already holding that form is kept VERBATIM; both pass through for U28's one detector, which makes the row
`invalid` with the shortened-number sentence. U27 flags nothing itself (M6). A genuine number ending in six zeros is
refused too — the safe side; the sentence sends the officer back to the formatted column. A zip pre-pass inflates
every entry for real under caps (a bomb, a forged size) and refuses zip64, encryption, xlsb, ods and Strict before
exceljs loads in memory (never its streaming reader, which spools to tmp); the first VISIBLE sheet; 1-based sheet
rows; one read in flight; an audit row of counts only. Every refusal that sends the officer to CSV carries the ONE
remedy clause (A1.6) — "Before you save, format the phone column as Number with 0 decimal places, or Excel will
shorten long numbers to 2.55713E+11." — and "no size limit on CSV" is a promise U25/U29 keep. ⛔ The action ships
with its caller in U30's `import-actions.ts` (C24): alone it reds `test:orphan-actions`.
**Guard:** `test:contacts-boundary` (NEW, in `predeploy`, in-process `--prove-red`: a `"use server"` module is a LEAF;
a server module imports only PascalCase bindings from a `"use client"` file; no directive under `src/lib/contacts`;
every file there pinned in `test:client-graph-safe` by its own unit, M3; exactly two exceljs importers; the reader
never reaches the book or the disk) · `test:contacts-import` (the `xlsx` section module).
**RED:** import `exceljs` into the dialog → the boundary guard goes red **while `typecheck` and `next build` stay
green** (exceljs ships a browser build) — planted as a VIRTUAL file, since the dialog is U32's (`red:contacts-boundary`;
in `red:contacts-import`: `cell.text` everywhere, `Math.round` everywhere, scientific text "repaired", declared sizes
trusted, a numeric 255713000000 written as exact digits (A1.3), a length-only base64 gate (A1.4), a second
`looksExcelShortened`).
**Accept:** base64 for 700 KiB + 1 byte, and + 2, refuses `too_large` before any decode — the load spy is never
called — while exactly 716,800 bytes is read; an xlsx numeric 255713000000 drafts `invalid` through U28, never a
contact.
⚠️ **Built in S10 (`2438d66a`).** The slot and the audit row live in `import-xlsx-run.ts`, because the boundary forbids the
reader any audit import (§5.1). Premises corrected: `cell.value` drops a formula result of 0 as `cell.text` does — the
result is read from `cell.result`; `getRow`/`getCell` CREATE rows, so the reader walks the sparse `eachRow`; and the
inflate and row caps do not bound memory — exceljs builds a Cell for every styled empty `<c>` — hence a cell-element
cap (`XLSX_MAX_CELL_ELEMENTS` = rows × 5) and a grid cap (`XLSX_MAX_GRID_CELLS` = rows × 20), both provisional in
`import-xlsx.ts` (candidates for `xlsx-limits.ts`' one table). Measured: the densest ~700 KB workbook 59,377 rows
(322 ms, heap +108 MB), the realistic 28,604.

**U28 · One field list, five readers** — `src/lib/contacts/contact-fields.ts` (pure; decisions C11 · C12 · C16 · C20 · C21 · M6 · A1.2 · A1.3 · A1.5 · A1.6)
`CONTACT_FIELDS` (phone · name · first_name · last_name · email · tags · notes) feeds the export header, the import
aliases, the sample sheets, the mapping panel and U26's vCard mapping (`vcard` per field, C20 — the fifth reader). It
holds the ONE limits table (C12: name 120, email 254, notes 1000, tag 32, tags 20, list name 60) and the ONE tag rule
(C11: `splitTags`/`tagKey` — split on `,` `;` `|`, trim, collapse inner spaces, STORED LOWERCASE, letters, digits,
space, `-` and `_`, 1–32 characters, at most 20 a contact, case-insensitive dedupe), called by U22's form, U23's bulk
and U31's import and grouped by U21's rail. Headers match by exact lookup of the normalised text, never a substring.
⚠️ Swahili corrected from shipped text: strong phone aliases `simu`, `namba ya simu`, `nambari ya simu`, `simu ya
mkononi`; `namba`, `nambari`, `number` and `contact` are WEAK and lose to any strong one (a sheet's "Namba" is often
the serial); plus `jina`, `jina kamili`, `jina la kwanza`, `jina la mwisho`, `barua pepe`, `kikundi`, `kundi`,
`makundi`, `maelezo`. ⛔ No consent field exists (OD10): consent-shaped headers are "not imported" and no mapping may
point at one; a masked export (`phone_masked`) is REFUSED. ⛔ Google Contacts' `Group Membership` and `Labels` are NOT
tag aliases (A1.5): they sit in `CONTACT_NOT_IMPORTED` with their own sentence (Google's `* myContacts ::: …` labels
are not tags; map a cleaned column if you want them) — C11 is unchanged. One `displayName`, never split. ⛔ **A vCard
is never header-matched (A1.2):** `format: "vcard"` is mapped by the fixed `fileColumns()` order U26 writes, with no
header row, and `line` stays the card ordinal; header matching and the "first row looks like a contact" refusal apply
to the other producers only. `draftContactRow` unguards every cell, flags Excel's scientific form ONCE for every
producer (M6) — with U27a's `looksExcelShortened` and sentence, imported from `xlsx-limits.ts` and never redefined
here (U27a lands first or in the same push) — and since U27b writes an xlsx NUMERIC shortened value as that same text
(A1.3), the one detector covers every producer: the row is `invalid` with the shortened-number sentence and is never
imported as a stranger's number. The phone field's hint uses the ONE remedy clause exported from `xlsx-limits.ts`
(A1.6), never its own wording. A problem names the field and the limit, never the value.
`contactExportHeader(full)` is English snake_case (the reasons head the file; Swahili headers are READ, never
WRITTEN). `csv-write.ts` is the ONE writer and the guard pair (C16): `guardCell` adds `'` to the transactions
export's lead set, so `unguardCell(guardCell(s)) === s` for every s. `sample-sheet.ts`: a BOM'd CSV with phones
written `0XXX XXX XXX` (Excel keeps text), a 3.0 vCard, no XLSX (exceljs is server-only), and `SAMPLE_MSISDNS`
derived by `parseTzNumber` for U30 to refuse (a sample may be a real subscriber). `<SampleSheetButton>` ships
UNMOUNTED until U30's entrance. U28a (beside U24 commit 1) creates the ONE runner — per-unit section modules
`fields` · `csv` · `vcard` · `xlsx`, one harness (the contacts-page `Impl` swap with in-memory plants, C21) — and
pins its files (M3); U28b (last) drives each sample through U25's and U26's REAL parsers, never one of its own, and
round-trips the two A1 cases through the real readers: the vCard sample's card 1 survives as a draft (A1.2), and an
xlsx holding the NUMBER 255713000000 drafts `invalid` through U27b's reader (A1.3).
**Guard:** `test:contacts-import` (C21 — NEW, in `predeploy`, in-process `--prove-red`).
**RED:** add a field with no sample value → red (`red:contacts-import`; also `simu` removed, a weak alias made strong,
a consent alias on a field, `phone masked` accepted, `Group Membership` or `Labels` mapped to tags, tags not
lowercased, an identity unguard, a vCard header-matched (card 1 lost), a second shortened-number detector, an entrance
with no button).
**Accept:** every export and sample header resolves to its own field; (U28b) the CSV sample re-reads through U25 as
three drafts with no problem, the vCard sample re-reads through U26 with card 1 as its first draft, and an xlsx
numeric 255713000000 is `invalid`, never a draft.

**U29 · Staging** — `ContactImport`, `ContactImportRow` + both DALs (OD26, OD30; decisions X1 · X2 · X18–X20 · X23 · X28 · X29 · M10)
*(Codes in U29–U40: X· and a bare M· are DECISIONS-U29-U40's; C·, A1.· and anything marked "U21–U28's" are DECISIONS-U21-U28's.)*
U29 owns the ONE staging model (X2). **U29a · data** — ONE hand-written, expand-only migration with every agreed column
(brand-new enum types only, so no 55P04 two-step and no conditional migration later): `status` ∈ STAGING · STAGED ·
COMMITTING · PAUSED · DONE · CANCELLED; compare-and-set cursors `stagedThrough` / `committedThrough` (the name `cursor`
is banned); `decision` (U31's, frozen by U32's start action); the consent `basis` columns (U33); `pausedAt` ·
`pausedBy` · `finishedAt`; the file digest; the mapping as U28's `ColumnMapping` (X20). A row carries `line` (the file
row, C15's name), the drafted fields, `readError`, `outcome` and `outcomeReason` (X4). ⛔ No stored counter (OD26 — "the
run row carries the buckets" was false): totals are groupBys over rows, and the run holds only the cursors and the
browser's two figures (`totalRows`, `unreadable`, shown as "read from your file"). Both twins: create (never an upsert),
find, findOpenFor, transition (CAS on status), stageRows (the CAS `stagedThrough = from - 1` FIRST, in one short
transaction), totals, after (a keyset on ordinal, never an offset), deleteUnsettled, deleteByMsisdn, purgeFinished.
⛔ The commit write is U32's ONE `commitBatch` (X3). `MarketingContact.importId` stays a soft key (no FK).
**U29b · service + privacy arms** (LIVE before any staging is exposed): `src/lib/contacts/import-limits.ts` (pure — a
batch is ≤2,000 rows AND ≤200 KiB of UTF-8 JSON, since "2,000 rows ≈ 200 KB" was false; the 1 MB ceiling and the
200,000-row cap come from `xlsx-limits.ts`, X28) and `src/lib/server/contacts/import-staging.ts` (server-only, NOT
"use server" — its actions ship with U30b's `import-actions.ts`): open (the same digest adopts), stage, view, discard,
sweep; every key re-derived by `parseTzNumber`; a field over its limit REPORTED by U28's `draftContactRow` into U30's
`invalid`, never clipped (X20 — the spec's clip and fallback limits are dropped); each parsed-file `unreadable` record
staged as a row with `readError` (X19). Ownership (X18): the creator, or an ADMIN adopting (pause/resume); the screen
names who started it. Erasure deletes staged rows by every number the person is known by; the access export carries
them from the account's creation, notes withheld; the sweep cancels only STAGING/STAGED runs idle 14 days — NEVER a
PAUSED commit (X29, said on screen) — and purges a run 90 days after `finishedAt`; a DATA-RETENTION.md row (public or
DSAR wording is G10). Audit `contacts.import.*`, refusals as `contacts.import.stage_refused` (X23), no number. M10:
`test:erasure`, `test:read-tiers` and `test:client-graph-safe` join `predeploy` here, each green on clean main first —
the ONE insertion each (U30 and U39 add none, X26).
**Guard:** `test:dal-parity` §24 (U31/U32/U33's members are sub-assertions, X1) · `test:contacts-staging` (NEW, in
`predeploy`, in-process `--prove-red`) · `test:erasure` · `test:contacts-staging-db` (redeploy evidence on embedded
PostgreSQL 18.3, outside `predeploy`).
**RED:** `red:dal-parity` §24: a planted key in one mapper only (the plan's own); the stageRows CAS dropped; after() by
offset. `red:contacts-staging`: a posted msisdn trusted; the byte cap removed; any digest adopted; deleteByMsisdn a
no-op; the sweep cancelling a PAUSED run.
**Accept:** a closed tab, a reload and a redeploy (a fresh process on real Postgres) resume at `stagedThrough + 1` with
totals equal to a recount; a 40-row file is one open plus one stage call; staging 5,000 rows writes no contact.
⚖️ **Shipped in S10 (`dbdc0018` + `3dd4f399`), with its builder's calls:** the format and outcome enums are lower-case, exactly the
TS unions (no translation in either twin); `findOpenFor` answers the EARLIEST open run, so two tabs opening one file
converge; beyond §9's list, `listIdle` (the sweep) and `listByMsisdn` (the access export); the same file with different
figures is refused `read_differently`; an unreadable sentence holding seven or more digits is replaced. ⏳ Residual: a
staged row whose number is not a sendable mobile has no key, so erasure cannot find it by number — it leaves with its
run (the 14-day sweep, or 90 days after the run ends). ⚠️ OWED BY U30: (1) `xlsx-limits.ts` promises "no size limit
on CSV" and tells a workbook over 200,000 rows to save as CSV — X28's run cap now refuses that CSV at open, so the
remedy must become "split the file"; (2) Postgres stores the mapping as JSONB, which reorders its keys — render a
run's mapping in CONTACT_FIELDS order, never object-key order (adoption compares it as sorted entries); (3) OD54
reaches the import report: `SHOWN_KEEP_REASONS` (import-decide.ts) names "on the stop list" row by row, so a masked
viewer's preview must carry no per-row stop reason; (4) a retried LAST batch (a lost response) answers `not_staging`
— U30 treats a STAGED run in the view as success. The erasure residual covers every number that is not a sendable
mobile (an unallocated prefix such as 064 included), and a run still staging after an erasure re-stages the person's
row — U31 keeps it out of the book, and it leaves with its run.

**U30 · Pre-flight** — writes nothing (OD31, D18, D19; decisions X10 · X16–X20 · X22 · X26 · M1–M3 · M11 · M14, and U21–U28's C26 · M7)
**§25 · the ONE bulk keyed reads** (X10) land first, as their own commit after U29a — built by U30, the first consumer,
and reused by U31, U32, U33 and U38: `marketingContact.msisdnsPresent`, `user.findByPhones` (avatar omitted),
`suppression.findActiveAmong`, `messagingConsent.latestAmong` (the ledger's own `createdAt desc, id desc`), key-only
where PII matters, ≤2,000 keys a call. **U30a · the engine** (invisible): `src/lib/contacts/preflight.ts` (pure: the
buckets, an exported `assertPreflightAdds`, the viewer shaper) and `src/lib/server/contacts/preflight.ts` (injected
deps), the rate rule `contacts.preflight` (12 runs per officer a day) and U31's pure `planImportRows` for the Apply
label's tallies. It runs on the SERVER over a STAGED run (U29), for its creator or an ADMIN (X18), whose mapping holds
the phone field (U28's own refusal names the column, X20). Six buckets, recomputed and NEVER stored (OD31) — `new` ·
`inBook` · `isPlayer` · `dupInFile` · `invalid` · `unreadable` — decided in FILE order: a `readError` → unreadable
(X19; a skipped vCard card lands there, A1.2); a draft problem → invalid with its sentence and the FIELD named (M2/M3:
U2's sentence, a sample-sheet number, an Excel-shortened number, an over-limit or malformed field); a repeat →
dupInFile citing the first row's `line`, under the printed rule *"When a number appears twice, the FIRST row in your
file wins."*; then inBook — an ERASED row counts as present, "already in the book" (X22: erasure is never disclosed) —
then isPlayer (via `userPhoneKeyFor`, asked only for keys not in the book), else new.
🔴 **D19:** for a role whose identity.contact cell is not `read` (the matrix, never a role name), `isPlayer` is a COUNT
with no per-row flag and `new` never carries a list; each run is rate-limited and audited (`contacts.preflighted` /
`contacts.preflight_refused`, awaited, no number; U50 registers both, M14). U20 already gates its Player chip.
**U30b · the screen** — ONE push with U31's choice UI and U33b's panel (X16), owning (X17)
`src/app/admin/contacts/import/contacts-import-dialog.tsx` and its ONE action file `import-actions.ts` (staging,
`readXlsxContactsAction`, pre-flight, paste, U32's ping; U32 adds start, commit and pause): the first admin file
entrance (M1) — a browser-side size check, sniff and `isParsedContactsFile`; the paste producer (`format: "paste"`,
U21–U28's M7); the mapping panel on U28's `autoMapHeaders`/`validateMapping`; `<SampleSheetButton>` mounted; upload through
`import-loop.ts`, the ONE driver U32 reuses ("Reading x of y", the server's count); lists paged at 25 with the true
totals (M11). 🔴 **D18** closes here (C26): the ceiling is proven through the REAL action, and every CSV-directing
refusal reads U27's ONE copy table and remedy clause (A1.6).
**Guard:** `test:contacts-import` (the `preflight.mts` section module, C21/X26) · `test:dal-parity` §25 ·
`test:read-tiers` (the D19 shape) · `test:contacts-boundary` · `test:orphan-actions`.
**RED:** `red:contacts-import`: drop one bucket increment — every bucket is non-empty in the fixture, so the sum check
must throw (the plan's own); last-row-wins; a per-row flag or a `new` list reaching GROWTH; the limiter always allowing;
an erased row counted as new; any store delta over 5,000 rows. `red:dal-parity` §25: a read that is not key-only; the
avatar omit dropped. 700 KiB + 1 byte through the REAL `readXlsxContactsAction` must refuse `too_large` before exceljs
loads (D18).
**States:** loading (adopting a run; skeleton = the real block) · no file · reading (the server's count) · pasted ·
pre-flighted, masked role (the count only) · pre-flighted, read role (account rows listed) · refused (no Phone column,
named; too_large or wrong_format with the remedy; rate-limited, with the EAT time; not your run) · error (Retry; never a
zero).
**Accept:** the 40-row fixture's six buckets add up to 40; a GROWTH payload carries no player row number; the run
writes nothing; 700 KiB + 1 byte refuses before any decode.

**U31 · `decide()`** — one rule, three choices (OD32, OD33; decisions X3 · X4 · X5 · X10 · X19 · X21 · X22)
**U31-A** (pure, P1): `src/lib/marketing/erasure-mark.ts` (`ERASURE_EVIDENCE`; `erase.ts` imports and re-exports it, its
usage lines — the red anchors — untouched), `src/lib/contacts/import-decide.ts` (THE rule, plus `planImportRows` over
the facts it is handed) and `src/app/admin/contacts/import-copy.ts`. **U31-B**: the server facts loader over §25's bulk
reads, landing with U30a. **U31 UI**: the choice and per-row override controls, in U30b's push. ⛔ X3: U31 ships no
apply step and no DAL write — the guarded write is U32's `commitBatch`, which re-decides through this same `decide()`.
Choices: **keep what's in the book** (the default; kept, ⛔ never failed) · **take the file's version** (a non-blank
file value replaces a different book value; a blank cell NEVER blanks one; tags MERGE through `tagKey`, stored
lowercase — X21, so the spec's "keeping the book's spelling" is moot) · **fill blanks only** (tags only when the book row
has none). One bulk choice with per-row overrides keyed by the file's `line` (X19; ⛔ never an array index — an array, a
malformed key or a line not in the file is refused). With a book row, in order: erased (`sourceRef = ERASURE_EVIDENCE`)
→ keep; on the stop list (the ACTIVE suppression, never the `suppressedAt` cache) → keep; created by this run (the first
row wins, OD33, across batches) → keep; then the choice; an empty patch → keep. With no book row: the ledger's erasure
WITHDRAWN → keep, else create.
**The ONE outcome union** (X4) lives here: `ImportOutcome` = create · update · keep · fail; `ImportOutcomeReason` =
chosen_keep · erased · suppressed · same_run · no_change · write_refused · changed_during_import · invalid — the row
column, U32's sentences and `import-copy.ts` all read it.
**Consent** (X5): `decide()` never writes consent, and an existing row never receives an import consent write; a CREATE
carries `consentWritable` = no ledger row at all AND not suppressed AND no player holds the number — the ONLY seam U33
writes through. This replaces the old "⛔ Consent is never written by an import path": no FILE can ever grant consent;
U33 records the officer's run-level attestation, for created rows only. The patch carries only name, email, notes, tags.
⛔ **X22 (decided in S10, reworked after the U31-A review — §4 OD47):** a browser never learns a number was erased.
Each decision carries `shown` beside `reason` (the server's truth, where `erased` is still counted): an erased row's
`shown` is what an ordinary in-book contact holding the file's own values would get (keep → `chosen_keep`; take the
file's version or fill blanks → `no_change`), and it still reads `suppressed` on the stop list and `same_run` when the
file repeats it. `shownTally(decisions)` folds per decision. No preview or plan carries a contact id: an erased number
(in the book or ledger-only) previews as an in-book row showing the file's own name in stored form — as every ordinary
in-book row now does. The run's first-line map is REQUIRED (`firstLines` over every staged row of the run; the rule
skips invalid and unreadable rows itself); tags are written in stored form (lowercase, de-duplicated) whenever the
patch writes tags; notes compare through U28's `cleanNotes`; the field-name allowlist excludes the two DAL twins.
⚠️ Owed downstream: U30's `msisdnsPresent` counts a ledger-only erased number as present; U32's browser-facing reads
carry `shown`, never the stored `erased`; U30 and U32 pass `firstLines` over every staged row. D19: a create preview
carries no consent or player fact.
**Guard:** `test:contacts-import` (the `decide.mts` section module, C21/X26) · `test:client-graph-safe` (both pure
modules pinned).
**RED:** `red:contacts-import`: write `GIVEN` over a `WITHDRAWN` row — `consentWritable` true over any ledger row (the
plan's own); remove the suppressed collapse (the plan's own); remove the erasure collapse; overrides read by index; tags
replaced, or a blank cell blanking a value; fill-blanks overwriting; the same-run collapse removed; `erased` reaching a
browser-facing tally or preview; the label computed from U30's buckets instead of `decide()`.
**States:** loading (no figure until the server's tallies land) · idle (keep; the label from the per-choice tallies) ·
take the file's version (the enumerated overwrite list: the first 20 and "and N more", email and notes named, never their
values) · fill blanks only · per-row override · all kept · refused (a bad override; the decision frozen) · error (never a
zero tally).
**Accept:** the Apply button's label, the confirmation and the request all read the same `decide()`; re-importing
identical values under take-the-file's-version is 0 updated; an erased row's preview, tally and plan are identical to an
ordinary contact's holding the same values — on the stop list and repeated included.

**U32 · The commit loop and its bar** — the ONE commit write path (OD26, OD34; decisions X2–X6 · X16–X18 · X23 · X29 · M1/M4 · M13)
**U32a · ping + budget** — `importPingAction` (the act gate plus one indexed read, reporting server and database time;
also the dialog's adoption read) ships inside U30b's push (X16), with `src/lib/contacts/import-budget.ts`: the batch size
is DERIVED from 20 sequential calls on www.50pick.tz (Cloudflare ends a proxied request at 100 s; the budget is 60 s),
p50/p95 recorded in §3 with the date and the build's `?dpl=` — which needs G7 (a production QA GROWTH account) or Ali
at the keyboard; until that measurement exists, production refuses `unmeasured`. **U32b+c · engine, loop and bar** —
ONE push, the actions with their panel (X16).
**The ONE start action** (M1/M4), in `import-actions.ts` (X17): it freezes U31's decision on the run row, fixes U33's
basis and moves the run STAGED → COMMITTING, audited — so it is G4-gated too (Option A: it writes a basis).
**`commitBatch`** (X3), in `src/lib/server/contacts/import-commit.ts`, is ONE transaction through its DAL member in both
twins: the CAS on `committedThrough` → creates through U22's ONE builder `newContactRow` (X6; duplicates skipped;
`sourceRef` = the run id) → updates guarded by `updatedAt` AND `sourceRef ≠ "erasure"`, null-safe (Prisma's `{ not }`
drops NULL rows, so the `sourceRef: null` arm is required) → ONE re-decide on a refused write, after which the row is
kept as `changed_during_import`, never failed → outcomes (X4's union) → `mirrorContactCache` for every touched number →
U33's consent write, idempotent over "importId = this run and no ledger row" and re-run at resume and finish (X5). The
staged payload is blanked as it settles. No withLock, no `Promise.all` over the database, one write at a time (the
premise "a per-row fallback of 6–8" was false: bets leave only 2–4 spare connections); `busy` is refused while bets
queue. Status per X2 (COMMITTING · PAUSED · DONE · CANCELLED, which is "leave the rest unimported"); the creator or an
adopting ADMIN drives it (X18: "Stopped by Amina at 14:02"); the idle sweep never cancels a PAUSED commit (X29).
**The bar** reuses `import-loop.ts` (U30b's — never a second loop): its value is ONLY the server's `committedThrough`,
a ProgressBar `label` plus the caption pair "Batch 4 of 12 · 1,847 of 5,912 rows done" ("done", not "written": a kept
row is not written); after a thrown call it asks for the status first (a 524 may still have committed); a deploy
mid-run says "reload to resume". Done shows created · updated · kept · failed from the groupBy, the first 50 failures by
`line` with the true total, and the REQUIRED "Show this import's contacts" link (U24's `import` filter, M13). Audit under
`contacts.import.*`, a refusal as `contacts.import.commit_refused` (X23), no number.
**Guard:** `test:contacts-import` (the `commit.mts` section module, X26) · `test:dal-parity` §24 (commitBatch's CAS, the
null-safe arm, failures read with take ≤ 50 plus a separate count).
**RED:** `red:contacts-import`: drive the bar from a timer → the stubbed-slow-batch assertion fails (the plan's own); an
optimistic increment; done counts summed in the browser; a blind re-commit after a throw; a resume from 0; a memory
commitBatch without its CAS (two drivers both advance); a "consent: yes" column written as GIVEN; a write bypassing
`decide()` that rewrites an erased row; a concurrency of 8. `red:dal-parity` §24: the CAS or the `sourceRef: null` arm
dropped.
**States:** loading (the adoption read; the panel's height held) · idle (Apply, disabled with its reason: no act right,
no basis, unmeasured) · importing (bar, batch caption, the busy wait) · stopped (by you; by another officer; refused;
platform updated) · adopted ("Resume — N rows remaining", and who started it) · done (four tiles, failures capped at 50
with the true total, the import link) · refused (no act right: read-only, never hidden) · error (never a zero).
**Accept:** a 40-row file finishes in ONE call; a 5,000-row run stopped after batch 2 and resumed from the run id alone
ends identical to an uninterrupted run; a replayed batch changes nothing.

**U33 · Consent basis at import** — required before Apply enables (OD9, OD10, OQ10; decisions X5 · X6 · X23 · X24 · M4 · M7 · G4)
**U33a-catalog** (pure, P1): `src/lib/marketing/consent-basis.ts`, the ONE append-only catalogue — OWN_FORM ·
OWN_EVENT · AGENT_ROSTER (first-party) and THIRD_PARTY, each with its verbatim per-person wording, plus the 18+
sentence, the THIRD_PARTY notice and ONE input check (a proof note of 10–500 characters holding no phone-shaped run; 18+
asked for a first-party basis only). 🔴 **G4 (superseded by U33w, below):** the wordings were DRAFTS behind
`CONSENT_BASIS_G4` until Ali confirmed them; they are now SUGGESTIONS until an admin saves each on the card. From the first
production row they are append-only evidence, shown in the person's DSAR export. ⛔ **Option A (decided in S10 — §4 OD50; REPLACED by U33w's W1 rule — a production entry may now read the catalogue,
the card prefills its suggestions, but no writer may record and no reader may recognise an unsaved default; draft2 is W1's
detector over the real tree, draft3 its control):** while the wording was DRAFT, no production entry — any `src/app`
file, any `"use server"` module, the boot hook and the proxy — may import the catalogue or `import-consent`, call
`recordImportConsentBatch` or `fixConsentBasis`, or reach a draft writer through its imports; the gate may read the
catalogue, and an uncalled writer and its in-memory tests may land (draft2, with its detector's own control draft3).
The stored proof note is NFC with invisible characters removed (the phone screen reads a separate NFKC copy, never
stored), and `importConsentEvidence` answers null for a phone-shaped note, a malformed run id or a key outside the
catalogue — ⛔ U32 and U33b treat that null as "write nothing".
**U33w · the wordings, editable** (§0 STEP 30; spec `docs/marketing-specs/U33a-U37c-OD58.md` §6): ten wordings — the
five bases' per-person sentences (with LICENCE_OUTREACH, `licence: true`, OD57/OD58), the three 18+ sentences, the
bought-list notice and the campaign source line — in `defineConfig("marketing.wordings")`
(`src/lib/server/marketing/wordings.ts`; the rules in `src/lib/marketing/marketing-wordings.ts`, pure and client-safe),
edited on Admin → System's "Marketing wordings" tab. A wording is recorded, composed or recognised only once SAVED (W1); an unsaved
suggestion is saved only when its own "Approve and save this wording" box is ticked (or it is edited). Each save appends
a version, server-stamped and audited (`config.marketing_wordings_updated`); recognition accepts any saved version,
composition the newest. The import door refuses `LICENCE_OUTREACH` (a LIST record, U33b-L). **Guard:**
`test:marketing-wordings` (W0–W8) · **RED:** `red:marketing-wordings` (in-process). Drive: `qa:marketing-wordings`.
**U33p · the policy lines, editable** (§0 STEP 32; spec §5.2 and §6): five public lines — the RG page's §4 marketing
promise, the Privacy Notice's §3 Consent and NEW licence bullets and its §4 Blackball bullet, and the profile's outreach
note (stored only) — in `defineConfig("legal.policy_lines")` (`src/lib/server/legal/policy-lines.ts`; keys, defaults,
rules and versions in `src/lib/legal/policy-lines.ts`; the promises the code keeps in `src/lib/legal/kept-promises.ts`),
edited on Admin → System's "Public policy lines" tab. Each page prints its literal until a line is saved; a saved line is
read against `KEPT_PROMISES` in every language; new words stamp the page's version, a review stamps nothing. Owed to
U33a-R: refuse every licence send while `policyLinesReadable()` is false, and wire the opening checks
(`policyOpeningProblems`). **Guard:** `test:policy-lines` · `test:rg-policy` K1/K2 · `test:privacy-notice` · **RED:**
`red:policy-lines` · `red:rg-policy` (in-process). Drive: `qa:marketing-policy-lines`.
**U33a · engine** (after U29b; ⚠️ X24 REVERSED 2026-10-02 — U38a went first, so U33a re-threads U38a's read accounting): `consent.ts`'s contact branch rewritten — the latest GIVEN must be an
officer's import attestation or a pinned SMS sentence, else `no_consent`; age is an attestation read BACK through the
ledger to the number's last erasure WITHDRAWN, so stop → resume keeps an attested contact marketable and no attestation
ever crosses an erasure (the rg-doors anchor line stays byte-identical). `src/lib/server/marketing/import-consent.ts` is
the fourth declared ledger writer (dal-parity §20, `...ledgerStamp()`) and a C4 cache writer (caches only through
`mirrorContactCache`, X6): it reads the basis from the RUN row only and appends GIVEN only for a row the run CREATED that
`decide()` marked `consentWritable` (X5), idempotent over "importId = this run and no ledger row". The marketing-optout
fixture is rewritten in the same commit (its labels 1 and 12). ⚠️ Corrected premises: a bought list writes NO ledger
row — `MessagingConsentStatus` stays GIVEN/WITHDRAWN, UNKNOWN lives only on the book row's cache, and OD9's "UNKNOWN …
its own migration ONE COMMIT before U33" is void (no enum migration; U33a corrects OD9's text); an imported row's
`sourceRef` is the run id (X6), never a basis key.
**U33a-L · the list-basis table** (§0 STEP 31; spec §4 and §6): `ContactListBasis` (`prisma/schema.prisma`; migration
`20261004120000_contact_list_basis`, hand-written and additive) and `db.contactListBasis` in both twins — `create`,
`revoke`, `listForList`, `standingFor`, `standingAmong` (three keyed queries on Postgres, each empty `in` answered before
the query, more than `BULK_KEYED_READ_MAX` keys refused, never cut) and `coveredCount` (`{ live, covered }`). No update or
delete member, and neither twin's `contactList` may gain a delete (RESTRICT has no memory twin). A list's ONE standing is
its NEWEST recording — revoked, it covers nothing, and an older one never returns. Ids `lb_` + twenty lower-case letters;
`recordedAt` is stamped by the SERVER (owed to U33b-L, which writes the first row). **Guard:** `test:dal-parity` §27 ·
**RED:** `red:dal-parity` §27 · **Probe:** `npm run db:probe-list-basis` (every migration from empty, no drift, RESTRICT,
the boundary, 2,000 keys, the memory twin answering alike).
**U33b · the panel** (production-reachable, so G4-gated): the picker in U30b's pre-flighted state — radio cards each
showing its FULL wording, a preview rendered from the catalogue (never a hand copy), the proof note with a live count, the
18+ box hidden for THIRD_PARTY, a neutral THIRD_PARTY callout before Apply ("stored and never sent a marketing SMS") —
and a locked view on a resumed run. The basis columns are U29a's (X2), written once by U32's start action (M4); audit
`contacts.import.consent_basis` (X23; the note's length, never its text). U33b also brings the bulk "Record consent →
Given" to U23's bar through this same picker (M7; U23 omits it until then and says so on the bar).
**Guard:** `test:marketing-consent` (the consent-basis section module: pin, catalogue, input, writer, gate, draft1 and
draft2) · `test:marketing-optout` · `test:dal-parity` §20 (WRITERS) and §24 (the basis, write-once) ·
`test:client-graph-safe` (the catalogue pinned).
**RED:** `red:marketing-consent`: edit a stored wording → the pin fails (the plan's own); make the third-party basis grant
consent (the plan's own); drop the player, on-record, importId or basis-from-the-run check; an attestation walk stopping
at any WITHDRAWN, or crossing an erasure; a DRAFT catalogue imported by an `src/app` file or a "use server" module
(draft2).
**States:** loading · unchosen (Apply disabled with its reason) · first-party incomplete (the first missing item named) ·
note refused (phone-shaped) · ready, first-party ("Import N contacts with consent") · third-party ("… without consent") ·
locked (a resumed run) · refused (the server's reason) · error (nothing imported; the draft kept).
**Accept:** a first-party run of three fresh numbers writes exactly three GIVEN rows, each ALLOWED by the gate; a
third-party run writes none; a player's, an erased and a suppressed number get nothing; stop → resume stays ALLOWED.

**U34 · Export** — `GET /api/admin/contacts/export` (OD25, OD36; decisions X7 · X11 · X27, and U21–U28's C2 · C3 · C6 · C13 · C16 · C19 · M5 · A1.1)
**U34a · the export** (parallel-safe with U29a–U32 on disjoint files, P2, once U24, U28a's `csv-write.ts` and U22's
`contactEmail` entry exist): `src/app/api/admin/contacts/export/route.ts` (a thin GET: the session, the viewer decided
on the STORED role row, then `checkAdminTotp` — every failure the identical 404), `src/lib/server/contacts/export.ts`
and the page-head link. **U34b · the round trip** (after U25, U28, U30 and U31).
ONE writer (X11, C16): U28's `csv-write.ts` — a guard pair that reverses exactly, every cell quoted (that keeps the BOM
red sensitive: `trim()` eats U+FEFF, but not a broken quote), CRLF, and the BOM written by it and stripped as a PAIR by
U25's `stripBom` (C19). No second writer and no labels module (C13: `contacts-copy.ts`). Columns come from
CONTACT_FIELDS (`contactExportHeader`) plus export-only columns (operator, consent, source, added_at); a masked viewer
gets the phone AND the email masked (the `contactEmail` entry, U21–U28's M5) and NO `source` column (X11) — and, by A1.1, no
`consent` column either (a per-row consent value is a player signal to a masked role); no `player` column for anyone. A
full pull writes `pii.revealed` with the row count, awaited BEFORE the first byte, then `contacts.exported`
(`contacts.export_refused` on a refusal); an audit row that did not record answers 503 with no CSV.
Rows travel as the FILTER through U24's ONE resolver: `parseContactAudienceParams` (an unknown value refuses, C2), a
keyset walk by id capped at the audited count, erased rows never exported (C3), the export's own instant as the Added
window's upper bound (X7 — no DAL change), and the filter described in the audit by `auditContactAudience` (C6: no raw
number, never "all"). Filters only: no ticked-selection export, and ids never travel in a URL (X27). Over 200,000
matching → 422 naming both numbers. A masked file is refused by name (`phone_masked`) on re-import. ⚠️ The transactions
export's two residuals — `mayReveal(session.role)` and a raw `q` in its audit — are never copied; U34's commit records
them under §0's ⚠ RECORDED (that route is outside §6's permission).
**Guard:** `test:contacts-export` (NEW, in `predeploy`, in-process `--prove-red`) · `test:contacts-audience` (the export
leg: the list total = `X-Rows-Matched` = the rows parsed back).
**RED:** `red:contacts-export`: drop the read-cell (`mayReveal`) branch → a masked file holds a full number (the plan's
own); write the BOM and stop stripping it → the round-trip fixture's first header mangles (the plan's own); the cell
decided on the cookie's role; `recorded` ignored; a raw number in the audit; a fetch-all walk; erased rows exported; a
walk error swallowed into a short file.
**States:** loading (the head re-measured at delta 0) · populated, read role ("Export CSV") · populated, masked role
("Export CSV (masked)") · empty book (no control) · no-match (no control; the rail kept) · over the ceiling (disabled,
the reason visible) · error (no control).
**Accept:** (U34a) GROWTH downloads a masked file and ADMIN a full one, both audited before the first byte; (U34b) export
→ re-import returns 0 invalid and 0 changed under take-the-file's-version AND fill-blanks-only, and a one-edit control
reports exactly 1 changed.
⚖️ **U34a shipped in S10 (`d8fce713` + review `95a48ae6`):** the gate — GET only, and a cross-site request refused before
the session is read (Sec-Fetch-Site same-origin, none or absent passes); free text masked for a non-reader (a number
or an email inside a name, a tag or a note); a `none` cell reads "Export CSV (masked)" and carries neither identity
column; over 200,000 is proven in-process only (it cannot be seeded on this laptop); audit ordering is proven in-process
(A1), not by the drive. ⏳ Owed: U50 registers `contacts.exported` / `contacts.export_refused`; READ-TIERS.md gains the
export's row; there is no rate limit on exports (none on the transactions export either).

### Phase C — campaigns (U35–U49)

**U35 · Campaign models** — `SmsCampaign`, `SmsCampaignRecipient`, `SmsPurpose.MARKETING` (D22; decisions X1 · X8 · X12–X15 · M5 · M6 · M9)
**U35a · enum-only migration** — ONE statement, `ALTER TYPE "SmsPurpose" ADD VALUE IF NOT EXISTS 'MARKETING'`, alone in
its own migration with the store union, and `test:campaign-models` §1.1 (the ADD VALUE stands alone) and §3.1 (the
MARKETING writer pin, empty); DEPLOYED by itself — production's `/api/health` migrated at that SHA — before anything
writes MARKETING (U37b's test send), because Postgres refuses a value used in the transaction that added it (55P04).
**U35b · tables** — three new types, both tables, both twins with named types, `src/lib/server/marketing/campaign-model.ts`
(the frozen-key list, the seed checks, the zero-filled counts) and dal-parity §26, in ONE hand-written expand-only
migration (never `prisma migrate diff`); U36 starts only once it is live.
**SmsCampaign** carries X12's model: status DRAFT · CONFIRMED · PREPARING · RUNNING · PAUSED · DONE · CANCELLED (no
approval status — OQ1 removed the gate; a status added later is a 55P04 two-step); name, `bodySw`, `bodyEn?`, per-variant
`codingSw` · `segmentsSw` · `codingEn` · `segmentsEn` (U37's SAVED counts) and `nameFallbackSw` / `nameFallbackEn`;
`sourcePhrase` (M5); `draftRevision` (the ONE optimistic mechanism); `confirmTier`; `audienceFilter` (U24's canonical
key JSON, X13 — a filter, never a list of ids, so a confirmed scope cannot be widened); `audienceCount`;
`audienceWatermark` (U40's keyed members key, null on the typed tier; the client's fence token is never stored);
`estimateSegments` / `estimateTzs` (frozen at confirm, X15); `enqueueCursor` (`b:<id>` · `p:<userId>` · `done`, parsed in
`audience.ts` only — no phone number ever forms a cursor, X8) and `enqueuedAt`; stopReason, budgetTzs, createdBy,
confirmedBy, timestamps. Frozen keys change only in DRAFT; status moves only by a conditional transition (one winner).
**SmsCampaignRecipient**: `msisdn` (the bare key; a batch holding a non-gateway spelling is refused whole), `contactId?`
and `userId?` (SetNull, never Cascade; the campaign link RESTRICT — the proof we messaged someone outlives a deleted
contact), status PENDING · HELD · SENT · DELIVERED · FAILED · SKIPPED (X12), `smsReference` (nullable-unique),
`optOutToken`, locale, `failureClass`, `error` (never a number), `skipReason` / `skipDetail`, `claimToken` /
`claimedAt`, attempts, segments, `bodyLen`, `costTzs`, `gateTrail` (JSON: every check, its verdict, the wording and the
source — written by U43 for EVERY recipient, sent or skipped, M6) and timestamps; `@@unique([campaignId, msisdn])`, an
index on (campaignId, status). ⛔ No stored counters (OD26) and no delete in either twin.
**The ONE live-send switch** is SystemConfig `marketing.sms.live` = { enabledBy, enabledAt }, ABSENT meaning CLOSED
(X14): every marketing-purpose send path checks it, and MARKETING_WRITERS lists `campaign-test-send.ts` from U37 on.
Owes downstream (M9): U16 brings both models inside erasure, retention and the DSAR export BEFORE U42 writes the first
recipient. ⚠️ U43's reaper (claim → UNCONFIRMED) and U46's ACCEPTED → UNCONFIRMED name statuses X12 does not carry:
reconcile at U43 (a value added later is a 55P04 two-step).
**Guard:** `test:campaign-models` (in `predeploy` from U35a, in-process `--prove-red`) · `test:dal-parity` §26 (U36 and
U40 extend it, X1).
**RED:** `red:campaign-models`: the ADD VALUE file also carrying a CREATE TABLE (55P04); the recipient unique index
removed from the migration or the schema → the dedupe fixture fails (the old RED, "drop the unique index → U43's control
fails", cannot run before U43, which still plants it in its five-driver control); a CASCADE link; a stored counter; a
frozen audience widened after DRAFT; an unconditional transition; an undeclared MARKETING writer. `red:dal-parity` §26:
a planted key in one mapper only; skipDuplicates removed.
**Accept:** U35a live alone at its SHA; then 1,000 seeds plus the same 1,000 shuffled with 200 new ones give 1,200 rows;
a confirmed scope cannot be widened; two racing transitions leave exactly one winner.
⚖️ **Shipped in S10 (U35b `bfc37a74`), with the calls its builder made — each one place to reverse:** `audienceFilter` and
`confirmTier` are TEXT (JSONB reorders keys and U40 compares the stored key byte for byte; TEXT → enum later is not
expand-only). Two doors: `update` writes draft keys only; `transition` moves the status, writes engine keys by status,
and writes the confirmation keys only on DRAFT → CONFIRMED, all at once — ⚠️ U40a's `confirm` member (the plan's "ONLY
writer" of those keys) builds on `transition` or takes them out of its patch type (the key table and a compile-time
check force a one-place change). `budgetTzs` freezes at confirm (U49 may reclassify). MOVES: DRAFT → CONFIRMED |
CANCELLED · CONFIRMED → PREPARING | CANCELLED · PREPARING → RUNNING | PAUSED | CANCELLED · RUNNING → PAUSED | DONE |
CANCELLED · PAUSED → PREPARING | RUNNING | CANCELLED; DONE and CANCELLED terminal (U47: a Retry on DONE adds DONE →
RUNNING with its test). Values checked in both twins (exact ISO instants, money ≤ 2 decimals, INT4 counts, a 32-hex
watermark, a cursor never a phone number, no `ids` arm). No `by` on a transition: the caller audits. Owed: U36 the
`page` member, U40a `confirm`, U43 the HELD / UNCONFIRMED reconciliation and the recipient writers, U16 both models
(M9) before U42 writes the first recipient; a whole-number search in a campaign audience is refused at save (OD55).

**U36 · The campaign list** — `/admin/campaigns` + its SIX doors + the nav badge (OD24, OD38, OD39; decisions X1 · X12 · M8)
Only after U35b is LIVE. SIX doors, not five (U17 measured it): a Growth NAV_GROUPS item labelled **"SMS campaigns"**
(⚠️ never "Campaigns" — `/admin/invites` already heads "Invite campaigns"), its ROUTE_KEYS row, the ROUTE_DOMAINS row
`["/admin/campaigns", "growth"]` (THE section's visibility; `test:rbac` §7b holds it equal to the nav item's domain), a
`layout.tsx` with a literal `AdminSectionGate title="SMS campaigns"`, a `loading.tsx` whose skeleton equals the real block
by construction, the status rail declared in ADMIN_SURFACES (dense on every pill), and the page's OWN AdminPageGate —
plus CRUMB_LABELS `campaigns: "SMS campaigns"`, so neither the breadcrumb nor the refusal heading says "Campaigns".
`src/lib/marketing/campaign-status.ts` (pure) is the ONE vocabulary over X12's statuses: the rail (drafts · sending ·
paused · finished); OUTSTANDING = PENDING + HELD and SETTLED = SENT + DELIVERED + FAILED + SKIPPED (HELD still owes
someone a message); `campaignProgress` (null for an empty campaign — no 0 % bar); `wantsAttention` (PREPARING or RUNNING,
or PAUSED with an outstanding row or `enqueuedAt` still null); `stopReasonLabel` ("Engine reason: <key>" for an unknown
key, never the raw key alone); and the CAMPAIGN_SCREENS flags — U37 flips compose (M8), U47 detail — so the list links
only to pages that exist. The loader counts the rail over the WHOLE table, clamps then re-reads the page, breaks ties on
id, reads recipient counts with ONE groupBy over the page's ids (no N+1), and lets a failed read THROW into
AdminLoadError with the rail kept. Its reads extend dal-parity §26: page, statusCounts, attentionCount, countsByCampaign.
The badge: `getSidebarBadges(canSeeMoney, canSeeGrowth)` reads the count ONLY for a viewer who may see growth (the badges
object ships to every staff client), through an async wrapper so a synchronous memory-twin throw cannot take every admin
page down (B-28). No TZS, budget or estimate on the list (OD24), no raw `audienceFilter`, no pulse (OD38); U38 adds the
filter in words (`describeAudience`) to each row (M8).
**Guard:** `test:campaigns-page` (NEW, in `predeploy`, in-process `--prove-red`) · `test:admin-nav` · `test:rbac` ·
`test:admin-section-gate` · `test:filter-language` · `test:layout-staleness` · `test:dal-parity` §26.
**RED:** `red:campaigns-page`: a nav item labelled "Campaigns"; HELD counted as settled ("a campaign that still owes
people a message reads as complete"); the badge read for a viewer without growth; the rail counted from the filtered
page; a timer-driven bar; `formatTzs` on the list; the detail flag on with no page. `red:rbac`, extended to 4/4: the
ROUTE_DOMAINS row deleted and the nav domain edited, for /admin/contacts AND /admin/campaigns.
**States:** loading (ghost card top = real, delta 0) · empty (no rail; no compose link until U37) · populated (the rail
with server counts; paging past 20) · in-progress (a RUNNING row's determinate bar; the badge) · no-match (the rail still
rendered; Show all) · refused (a role without growth: "SMS campaigns" restricted, no nav item, no count in its payload) ·
error (the rail kept with no counts; no badge, never "0").
**Accept:** GROWTH reaches the page while FINANCE and SUPPORT do not and their payloads carry no campaign count; a
RUNNING campaign with 4 SENT and 6 HELD rows reads 4 of 10.
⚖️ **U36 shipped in S10 (`06c21ac4`, live as `db4a11a7` — §0 STEP 20):** its review's F1 refined the progress rule above — the
preparing phase is ALSO null until the first row is written (a campaign confirmed then cancelled before it started
read "0 of 300 prepared"); F2 put the loader's sort parse on the links' trim; F3 (the badge's plan) is CLOSED by
measurement — on PG 18 an index-only skip scan, a correlated EXISTS planned worse, and production runs 18. The 1280 fit was
measured in the served page (26px over, 16 of 20 names wrapped) and fixed: progress 152px, "Segments per SMS", the day
over its clock; the drive measures it at 1280, and 360 scrolls sideways like the contacts table. The status rail stays
on the dense rank (32px), as filter-language §6.6 and rule 6 set every admin filter rail, the contacts rail included.

**U37 · The composer** — `/admin/campaigns/new` (OD42, OD44, OD45; decisions X12 · X14 · X15 · X16 · M5 · M8 · M9 · M12)
**U37a** (pure, P1): `src/lib/marketing/campaign-template.ts`, THE ONE renderer and the only src file allowed to call
`composeMarketing`. Exactly one `{jina}`, with a per-variant fallback (`nameFallbackSw` / `nameFallbackEn` — one fallback
cannot serve both languages), filled only from the player's OWN account name (the first word, folded, GSM-7 letters, at
most 12, never cut); a book contact always gets the fallback, because a recycled number would print a previous holder's
name. The counter sizes the WORST case — `{jina}` as 12 septets, the footer and the source phrase — since `{` and `}`
cost 2 septets each and a long name would otherwise double the segments; UCS-2 is a REFUSAL with the offender named and
the plain-character fix offered; `variantFor` sends English only to an English account when an English body exists;
`renderForRecipient` is what the test send and U43 both call. ⛔ **M5 (decided in S10):** the source phrase
(`SmsCampaign.sourcePhrase`) is priced into the worst-case counter, and the renderer REFUSES a non-account (book)
recipient while the campaign has none — never dropped until G5 (OQ3) is answered. The phrase is the footer's own
first line (`marketingFooter(token, locale, sourcePhrase)`), capped at `SOURCE_PHRASE_MAX_CHARS` = 30 septets (refused
on its own field), and while it is blank the counter reserves the longest allowed phrase: the officer's room is **80**
until G5 (§4 OD49). ⛔ **One campaign, one verdict (§4 OD48):** the renderer re-runs `validateCampaignTemplate` on the
WHOLE stored template before any recipient's message and refuses every recipient if any part fails; the recipient's
own message is checked too (its token is the one thing only it can get wrong). ⚠️ U37b's test send picks its origin
deliberately (a non-account origin is refused while the phrase is blank); U38/U40 warn at confirm when a population
holding book contacts meets a blank phrase.
**U37b · page, save, test send** (after U35a is DEPLOYED and U36 is live): the page with its own AdminPageGate; one
Message card (Swahili required, English optional, a live counter per variant, a read-only sender line from
SMS_SENDER_ID that speaks Admin → System's dead-rail words — never an input, OD45); `saveCampaignDraft` re-validates on
the server, stores the server-computed per-variant coding and segments that the confirmation's estimate reads (X15), and
saves by compare-and-set on `draftRevision` (X12 — no `baseUpdatedAt`, no second update method); `marketing.campaign_created`.
The test send (`campaign-test-send.ts`, declared in MARKETING_WRITERS, X14) reaches the officer's OWN number only — the
action takes (campaignId, variant) and no number or body — through `dispatchSlice` and the ONE gate (no bypass: the
officer needs consent and a date of birth on their own account), with `ensureOptOutToken` (reuse, else mint), a
per-officer rate rule (3, refilling one per 10 minutes) and a masked `marketing.campaign_test` row. ⛔ **X14:** it checks
the ONE live switch `marketing.sms.live` — ABSENT means CLOSED → `live_sends_closed`, with zero rows, transport calls and
token mints (only the console stub, with no handset and no money, passes while closed). Opening it is G1, and each test
after that is a real TZS 6 (G3). M8: the same commit flips CAMPAIGN_SCREENS.compose and adds the admin-nav
REACHED_WITHOUT_NAV row. Owes downstream: U15 allowlists the test send (M9); it obeys the send window once U13 exists,
and U14's cap excludes `SmsCampaignTest` (M12); U42 and U43 adopt `ensureOptOutToken`, `renderForRecipient` and the switch.
**Guard:** `test:campaign-compose` (§15 template · §16 one composer · §17 save · §18 test send) · `test:campaign-models`
§3.1 (the writer pin) · `test:client-graph-safe` (the renderer pinned).
**RED:** `red:campaign-compose`: size before appending the footer — planted at the NEW layer, the variant counter (the
`composeMarketing`-layer plant already exists); allow a typed test number (the plan's own); `{jina}` sized as typed; a
raw display name inserted; a book recipient rendered with no source phrase; a test send that skips the gate; the switch
read as open with no row; a save trusting posted segments, or saving without the `draftRevision` compare.
**U37s · the source line, stamped** (as built 2026-10-05, §0 STEP 40; spec `U33a-U37c-OD58.md` §6 · §9 U37s): every
DRAFT save stamps the SAVED `source.phrase` wording (`savedSourcePhrase`, the ONE reader — trimmed, null while unsaved or
cleared, a line of spaces included) on the first save and on every edit, and the server's verdict prices exactly that
line; a campaign past DRAFT keeps the line frozen on it (its save is refused `not_draft`). ⚖️ The composer's counter
prices the line the NEXT save will stamp (`composerSourcePhrase`): the saved line for a new composer and a DRAFT, the
frozen one past DRAFT — the spec said "the stamped phrase", and a draft's earlier stamp would let the counter pass a body
its next save refuses. Until Ali saves G5's line on Admin → System → Marketing wordings, every draft stores none and a
book recipient is refused, as before. The stamp is read FRESH (`readSavedSourcePhrase` → `freshWording`, the row
re-read; a read that cannot answer refuses the save `source_unreadable`, never a guessed or blank stamp), and a DRAFT
whose stamp is not the saved line is flagged (`composerSourceLineStale`) so Save is offered and the screen says why.
⛔ Owed downstream: U37c's typed test and U40's confirmation read the ROW's line, never the composer's view of it — a
stale row is re-stamped by a save, and U40 refuses to confirm one. **Guard:** `test:campaign-compose` §17.13–§17.20.
**RED:** `red:campaign-compose` — the save never stamps; the save keeps a stale line on an edit (the spec's plant); a
line of spaces stored as text; the counter prices the draft's earlier stamp; an unread line stamped as none; the stale
flag never raised; and three wires swapped in memory (the deps, the loader, the screen's no-changes rule) — each fires
its own claim.
**U37c-1 · the test to a typed number, the server path** (as built 2026-10-05, §0 STEP 41; spec `U33a-U37c-OD58.md` §3.7,
§6 U37c, §7, Appendix A §A.3–§A.8): `sendCampaignTestAction(campaignId, variant, recipient?)`, the recipient re-typed by
`testRecipientOf` and the viewer's read grant taken from the session; `campaign-test-send.ts` runs §3.7's fourteen steps
— the typed number a BOOK recipient, the ONE gate asked with this attempt's `TestAttestation` (`mayReceiveMarketingSms(m,
deps.now(), deps.gateReads, { testAttestation })` — the one call in `src/` that passes the gate more than a number, pinned
by `test:campaign-audience` 4.9), refused up front while outreach is closed, `adult.test` unsaved or the draft has no
source line; `marketing.testSendTyped` and `marketing.testSendTo` (a keyed, letters-only bucket, `pepperedLetters`)
spent only after those; `TYPED_TEST_MIN_MS` = 3000 on every outcome at the gate or after it, a throw included; D19's
`typed_refused` for a masked viewer and the collapsed reasons (`protected`) for a reader; the measurement token on the
returned text; and ⛔ OD61 — no RG COMPLIANCE row for a typed number, at the pre-check or on dispatch's re-ask.
`composeTypedView` (the loader) gives the Test card `{ allowed, why, preview, attestation }` and takes no number.
**Guard:** `test:campaign-compose` §16.4 · §18.2 · §18.5′ · §18.13–§18.14 · §18.17–§18.31. **RED:** `red:campaign-compose`
— the plan's own "a typed number honoured", inverted on purpose and kept; and one plant per new claim (no tick, a book
number rendered as an account, the player branch skipped, a masked refusal itemised, the real token shown, the preview
built from a number, either budget missing or spent early, the floor skipped, the switch skipped, a token minted early,
typed allowed while closed, the own number made to need a tick, a stand-in gate, an uncapped number, a generic number
sentence, the RG row written, no re-ask) — each fires its own claim.
**U37c-2 · the Test card** (as built 2026-10-05, §0 STEP 42; spec `U33a-U37c-OD58.md` §6 U37c, §7.5, Appendix A §A.1–§A.2,
§A.9): "Send the test to" — a fieldset of two radio cards, my own number (masked, the default) or another number,
disabled with the loader's reason beside it while licence outreach is closed, `adult.test` is unsaved, the draft carries
no source line or its text cannot render for a book recipient (a new composer says "save first"). Another number: the
kit `PhoneInput` (`autoComplete="off"`, which the kit now honours) in a `Field` that shows the numbering plan's own
sentence once — the line beside Send is then a way back to the field (`COMPOSE_TEST_FIX_NUMBER`, the Save reason's
pattern); the kit `Checkbox` labelled with the SAVED `adult.test` words; the contact-book preview and its note; the typed
outcomes; and the consent link only when the target is own. ⛔ THE 18+ TICK IS BOUND (the review's BLOCKER): held as the
key it was given for — this draft, the words' version, the digits — so any edit of the number, a switch of target, a
rewording or another draft unticks it, and every Send spends it; the post carries `attestedVersion`, and the server
refuses a confirmation given for words since reworded (`attestation_stale`, step 6, number-independent) — the page
re-reads (as it does for every refusal that means the page is out of date) so the box shows the new words. The digits live in the card's state alone (never the address, storage, a log
or the router). ⚖️ §A.9 state 13 (own refused, with the consent link) exists only while licence outreach is CLOSED: once
it opens, U33a-G's licence basis reaches an adult account that never said no, and the own test is handed over.
**Guard:** `test:campaign-compose` §16.4 · §16.17 · §16.18 · §16.19 · §16.20 · §18.22 · §18.32. **RED:** `red:campaign-compose` — a second
number control, the number in the address or a log, a typed refusal drawn as own, a second unguarded consent link, the
number's problem said twice, the tick outliving its number or never spent, an edit keeping it, the version not posted,
the server honouring a tick for old words, an unrenderable text offered, "updating" for ever, a disabled choice with no
reason, the choice switchable mid-send, and a rewording not re-read — each fires its own claim.
**Drive:** `scripts/live/marketing-compose-drive.mjs` `PASS=typed` (its own fresh console server; the world stepped
through `/api/dev-test/marketing-typed-test-seed`, 404 in production, which calls only the platform's writers).
**States:** loading (skeleton = the real blocks) · blank · typing (the counter announced only on a change) · `{jina}` in
use · over-cap · refused (no Swahili body; not starting "50pick"; UCS-2 with the fix; a placeholder or fallback; no
source phrase; not a draft; edited elsewhere) · saved · test idle (the masked own number, the verbatim text) · test
refused (live sends closed; no consent; rate-limited; dead rail) · test handed over (never "delivered") · test
unconfirmed · error (the text kept).
**Accept:** for 40 written-out names the rendered size never exceeds the counter's; an input cast with a number still
reaches only the officer's own key; with the switch absent, a real carrier sends nothing.

**U38 · The audience** — same page (OD6, OD26, OD36, OD40; decisions X7–X10 · X24 · X25 · M8 · C2 · A1.1)
**ONE resolver** (X7): U38 EXTENDS U24's `ContactAudienceFilter` inside `audience.ts` with a `population` axis (book ·
players · both) and the player arm — the same parser (an unknown value REFUSES, C2; A1.1's role refusals hold), the same
key and the same `describeAudience` (string[]). No second filter type, parser, key or describer: the spec's
`audience-filter.ts`, its URL parser that "ignores" unknown values and its second describer are dropped. The window is
U24's (absolute EAT instants, an unreadable or inverted bound refused), and no "last 7 days" default may leak in from
`DateTimeRangeFilter` or `resolveRange` (`defaultPreset="all"`).
**U38a · the count** (engine, no surface; LIVE before U33a — X24 reversed 2026-10-02, §0 STEP 22): the player arm inside `audience.ts` and ONE walk (X8) — the
book by `id`, then players by user `id`, cursor `b:<id>` · `p:<userId>` · `done`, parsed in `audience.ts` only; a number
in the book is walked once, by its book row; erased tombstones, staff and non-+255 phones are never walked. The
campaign-audience count (book ∪ players) IS the confirmed population U40 fences and U42 enqueues (X9). The player keyset
read extends §21, the resolver's own section; the gate's prefetch reuses §25's bulk reads (X10). `consent.ts` gains a
defaulted `reads` parameter that accounts for U33's attestation walk, the rg-doors anchor line byte-identical; the send
loop still calls the gate with one argument. The split (`audience-split.ts`): **matching · reachable · will receive ·
not receiving**, computed by asking the REAL gate for every number with only its reads batched — one decision
definition, no write, no send; protected standing (rg_*, age_minor, account_status) is ONE line for every role, never
itemised; a time budget leaves the rest `unchecked` (shown "≥ N"), never guessed; single-flight per filter key and at
most 2 per process (the pool is shared with bets). A sample of five, masked, in the walk's own order. The operator pill
reads "Operator (by prefix)", never "network" (numbers are portable). The permanent callout names all three day-one
reasons: offers start off for players, a yes under the old wording does not count, and a contact needs a recorded
consent AND an 18+ attestation.
🔴 **X25 (D19):** the sample shows NO per-row player flag to a masked role, and no number search runs against the
player arm (a 1-vs-0 count is the oracle). ⛔ **Decided in S10 (safe default):** a whole-number `q` on the BOOK arm also asks
the gate, which reads the player table — so a masked viewer's `q` on the campaign audience is REFUSED (a role refusal,
A1.1); U38a may lift it only with a proof in `test:campaign-audience` that the split cannot answer "is this a player".
**U38b · the card**: the rail (ADMIN_SURFACES, dense), a Suspense keyed by the filter key (unkeyed, old numbers show
under a new filter), every figure from one server view-model (no browser arithmetic), neutral ink (OD40); U20's
"Reachable" column reads "Will receive" (one vocabulary); `describeAudience` joins U36's list rows (M8).
**Guard:** `test:campaign-audience` (NEW, in `predeploy`, in-process `--prove-red`) · `test:dal-parity` §21 and §25
(bulk equals single per element; `liftedAt: null`; the ledger's identical order; the avatar omit) · `test:filter-language`
· `test:marketing-consent` · `test:rg-doors`.
**RED:** `red:campaign-audience`: derive a count on the client → red (the plan's own); decide from the consent cache
instead of the gate; a lifted stop prefetched as active; the ledger tiebreak dropped; protected reasons itemised;
`unchecked` counted as will receive; the sample out of walk order; a player flag in a masked sample; the Suspense key
removed; a walk restart that re-includes the cursor row.
**States:** loading (the ghost equals the real block) · no filter (nothing computed; "Everyone" is an explicit choice) ·
filtered (the split) · computing (the keyed fallback under the new sentence) · empty audience (the rail kept; real
zeros) · error (Count again; never 0).
**Accept:** on a fixture holding every skip reason, each number's bucket equals the gate's own answer; the projection
equals a dry `dispatchSlice` over the same walk; a GROWTH sample carries no player flag.

**U39 · The estimate** — segments for every role, money only for a role that may read it (OD24; decisions X15 · X26 · M9 · M16)
**U39a** (engine, P1): `src/lib/marketing/segment-cost.ts` — the per-segment price MEASURED by a balance walk over
DELIVERED, segment-certain chunks (bodyLen ≤ 70; the vendor bills per delivered message, so a walk over accepted sends
under-prices), the median of at least 3 valid pairs; else `SMS_PRICE_PER_SEGMENT_TZS`, captioned "configured, not yet
measured" (setting it on Railway is G9); else "not yet measured" — never 0, never a bare constant.
`src/lib/marketing/campaign-estimate.ts` — `campaignEstimate`, the ONE arithmetic U40 and U49 reuse, and `estimateView`
(every display string; money strings exist only when money is present). `src/lib/server/marketing/estimate.ts` —
`campaignMoneyVisible(role)`, THE decider (accounting view AND money.figures `read`; READ_CLASS_SUMMARY now names the
campaign estimate, so the class is not silently widened), and the loader, which resolves the STORED role itself.
**The estimate a confirmation freezes** (X15, M16) is computed on the server from the SAVED per-variant segments (U37's
save) × the campaign POPULATION — the spend ceiling, not the forecast — with the will-receive forecast beside it; only
the composer's live card may follow the typing. Coverage keeps the login-code reserve; the duration is a FLOOR ("At
least …, not a promise") at the fastest measured chunk with MAX_SLICES_IN_FLIGHT = 1, which U43 must enforce.
**The credit** is the FRESH read — `refreshSmsBalance` (S7b, reworked by the audit-fix pass), at most 60 s old within the
render budget, never the in-process snapshot: a stale, pending or failed answer shows "—" with its reason (no answer;
keys refused; keys not set; still checking; no balance on this provider) and NEITHER the kept figure NOR "Was" —
Admin → System's tile prints "Was"; this card must not.
**U39b** (visual, after U38b): the card in a Suspense holding the role's own tile count, the page wiring that shares
U38's ONE split promise (the two cards cannot disagree), and a dev-only seed route that drives the real `sendBatch` into
a loopback stand-in only (U15 allowlists it, M9). X26/M10: `test:read-tiers` joins `predeploy` once, at U29b — U39 adds
no insertion of its own.
**Guard:** `test:campaign-estimate` (in `predeploy`, in-process `--prove-red`) · `test:read-tiers` §9 (the decider and the
READ_CLASS_SUMMARY wording).
**RED:** `red:campaign-estimate`: render TZS unconditionally → a GROWTH session must show no `TZS` and make zero balance
reads (the plan's own); a domain-only decider, or `masked` read as readable; accepted-but-undelivered chunks measured; a
mean instead of the median; every body counted as 1 segment; a stale figure kept; the snapshot read instead of the
vendor; coverage without the reserve; the floor at the slowest chunk; a frozen estimate built from live sizes or from
the forecast instead of the population.
**States:** loading (the role's own tile count; delta 0) · no audience yet · segments only (GROWTH) · segments and money,
measured · segments and money, configured · cost not yet measured · balance unreadable (the reason, no kept figure) ·
error (the audience count failed; Refresh).
**Accept:** a GROWTH page's HTML and flight carry no "TZS"; seven clean delivered chunks measure exactly 6; the confirm's
frozen estimate equals the population × the saved segments.

**U40 · Confirm** — `ConfirmModal` over a server-recomputed fence (OD27, OD28; decisions X1 · X9 · X12 · X13 · X15 · X16 · M14)
**U40-pure** (P1): `src/lib/marketing/campaign-confirm.ts` — `CONFIRM_ENUMERATE_MAX` = 5; `confirmTier` (≤5 people
under a filter → enumerate every one; more, or no filter → a typed number); `parseTypedCount` (strict digits, grouping
allowed); the fence claim; `decideConfirm`, the OD27 gate — 🔴 the typed value is compared ONLY with the count the
SERVER recomputes, never a posted one; and `startAudienceVerdict` (OD28: above the confirmed count Start refuses, below
it proceeds and reports), which U42 calls before its first row.
**U40a · server**: `src/lib/server/marketing/audience-fence.ts` counts through U38's campaign-audience count and walk
(X9: book ∪ players — never the book-only `contactAudience().count()`, or every Start refuses `audience_moved`, or
players are messaged unconfirmed) and derives a KEYED members key (a domain-separated HMAC; a bare digest of a
one-person audience brute-forces back to the number), stored as `audienceWatermark` on the enumerate tier and null when
typed — the signed fence token the browser holds is never stored (X13). `campaign-confirm-service.ts` recomputes OUTSIDE
any lock → `decideConfirm` → `db.smsCampaign.confirm`, conditional on DRAFT AND `draftRevision` (it extends §26; the
ONLY writer of audienceCount, confirmTier, audienceWatermark, confirmedAt and confirmedBy) — and freezes
`estimateSegments` / `estimateTzs` from U39's arithmetic over the SAVED segments × the population (X15). **U40b · UI**:
`campaign-confirm.tsx` and its action file in ONE push (X16 — the action alone reds `test:orphan-actions`), wired on
U37's page, with an additive numeric keypad option on `modal.tsx`.
The number to type is MATCHING — U47's "On campaign", the rows U42 will write; will receive is shown as a forecast.
Refusals: `audience_moved` (the count or, when enumerated, the members changed — it shows the new number and sends
nothing), `typed_mismatch`, `typed_required`, `audience_empty`, `stale_view`, `draft_changed`, `not_draft`. The
destructive button is never focused on open (`initialFocus={isHard ? inputRef : cancelRef}`, now pinned). Audit
`marketing.campaign_confirmed` / `marketing.campaign_confirm_refused` (M14), with no number. ⛔ CONFIRMED sends nothing:
the first real campaign start is G2.
**Guard:** `test:campaign-confirm` (U40-pure; in `predeploy`, in-process `--prove-red`) · `test:campaign-gates` (U40a —
NEW: the keyed watermark, the service on the memory twin, the conditional write, "nothing is sent"; U41 extends it) ·
`test:dal-parity` §26.
**RED:** `red:campaign-confirm` and `red:campaign-gates`: compare against the posted count → the stale-client fixture is
accepted, so the suite must fail without the fix (the plan's own); the freeze writing the shown count; the enumerate tier
skipping the members compare; "unfiltered" ignored; an unconditional confirm (five racing confirms, exactly one may win);
a bare sha256 members key; the fence counting the book only; `initialFocus` on Confirm; TZS in a GROWTH view.
**States:** loading (counting: refresh, then open) · idle · blocked (the reason in `title`, never hidden) · enumerate
open (focus on Cancel) · typed open (focus on the input) · confirming · refused (`audience_moved` remounts with the new
number) · confirmed (a toast: nothing has been sent) · error (the typed text kept).
**Accept:** a view taken at 7, then one matching contact added, then "7" typed with the old fence → `audience_moved` at
8 and nothing confirmed; "8" on the fresh view confirms; the SmsMessage, token and recipient counts never move.

**U41 · Authorisation** — the officer authorisation — ✅ DECIDED 2026-10-04 (OD60; docs only, its guard lands with U40a)
~~`SystemConfig` `gbt.advertising_approval` {reference, grantedAt, expiresAt, scope, documentUrl} — absent or
expired ⇒ dispatch refuses~~ — ⛔ **withdrawn on Ali's OQ1 ruling (the Board says marketing SMS is not part of
its approval); nothing of it is built.** ~~`twoOfficerGate` above 50 recipients or TZS 10,000; the approver may not
be the composer; the grant expires in 60 minutes and is re-checked in the loop~~ — ⛔ **withdrawn too (OD60):** a
campaign is authorised by ONE officer's typed confirmation (U40) at any size, under Ali's 2026-07-24 single-admin
ruling (`test:two-admin` asserts there is no two-officer hard-lock). No second officer, no grant, no in-loop
re-check of an authorisation; the owner's control is the live switch (G1) and Start as a separate act (G2). A
two-officer toggle waits until Ali asks for one (then `resolution-policy.ts`'s optional-toggle precedent, never a
hard lock). Recorded in COMPLIANCE-DECISIONS § "2026-10-04 · Marketing campaigns are authorised by one officer's
typed confirmation".
**Guard:** `test:campaign-gates` G7.1 (U40a). **RED:** its in-process plant — a call to `twoOfficerGate(` or a read of a
second approver under `src/lib/server/marketing/` or `src/app/admin/campaigns/` must fail the suite.

**U42 · Enqueue** — `src/lib/server/marketing/enqueue.ts`
U38a's ONE walk (X8: the book by `id`, then players by user `id` — no phone number ever forms a cursor), its prefixed cursor carrying the phase,
`createMany({ skipDuplicates: true })` against the unique index, chunks of 1,000, resumable, with a stated
backstop of 200,000 recipients reported rather than silently truncated. The opt-out token is minted here.
**Guard:** `test:marketing-engine`. **RED:** restart mid-walk → no duplicate row, no skipped row.
⚠️ *(2026-09-26 audit, before this unit mints real tokens)* ① Mint ONE token per identifier and reuse it,
rather than one per recipient per campaign, so the number of live never-expiring tokens stays near the
number of distinct recipients (not built; the review's recommendation). ② `mintOptOutToken` returns null
for a number `toMsisdn255` cannot use — a recipient with no token must not be sent to. ③ Probe whether
Railway's edge appends to or replaces `X-Forwarded-For`: `/s/`'s per-address budget keys on its first
entry (§9 U8).

**U43 · The slice** — `src/lib/server/marketing/engine.ts` (D23, OD21, OD22, OD23)
`reap stranded claims (→ UNCONFIRMED, ⛔ never back to PENDING) → check status and window → claim ≤50 with
a token (findMany → conditional updateMany → findMany by token, so the won set is exactly readable) →
GATE each claimed row immediately before dispatch → ONE `sendBatch` → settle by `targetId` (⛔ never by
array index) → re-read the campaign status every chunk so Stop does not have to wait out a slice`.
A shop-wide refusal (balance floor, not configured, provider unrecognised) returns every claimed row to
PENDING, pauses the campaign with **one** reason and **one** audit row — ⛔ never N failed rows for one
shop-wide fact. Slice budget ≤50 recipients or 10 s, re-derived in U52.
**Guard:** `test:marketing-engine`. **RED:** ⭐ five concurrent drivers over 1,000 rows must produce exactly
1,000 sends — a single-driver test passes with or without the conditional claim, which is why the control
is concurrent; and removing the unique index must fail it.
⭐ **And U9's loop contract (added S6):** the "GATE each claimed row immediately before dispatch → ONE
`sendBatch` → settle by `targetId`" middle of this slice already exists as `dispatchSlice` (U9) — call it,
do not rewrite it — and the engine joins `test:marketing-consent`'s U9 section as a second DRIVER, passing
the same assertions (an opt-out, a self-exclusion and a break between two slices never reach the wire).
It supplies the real `send`, with `purpose: "MARKETING"` from U35.
⭐ **U43-0 (STEP 33) — the reaper's state exists:** `UNCONFIRMED`, added by its own one-statement migration
(`20261004140000_sms_recipient_unconfirmed`) one deploy before any writer (55P04). Settled for progress, never retried by
itself, a late receipt may still settle it (ENGINE-SPEC E4). The counts know it; nothing writes it before U43b.

**U44 · The pump** — `src/lib/server/marketing/pump.ts` (OD19, OD20)
Its own timer and its own leader lease, started from `instrumentation.register()`, yielding whenever the
lifecycle ticker is running, releasing its lease on SIGTERM so a redeploy hands over in seconds.
**Guard:** `test:marketing-engine`. **RED:** remove the yield → the fixture where lifecycle is running must
fail.
**Accept:** a campaign finishes with every browser closed, and a deploy mid-send resumes without a
duplicate.

**U45 · `sendBatch` at scale** — `sms.ts`, both DALs (D20)
`updateManyByReference(references, patch)` driven through the existing column map (same coercion, same
throw on an unmapped field, ⛔ no allow-list), turning 50 round trips into 1; and `settleMany(rows)` for the
per-row recipient write-back as ONE `$transaction([...])`. ⛔ No raw SQL — it would have no memory twin, and
every behavioural suite runs on memory.
**Guard:** `test:dal-parity` §13 — the `SmsMessage` section (three new lines; this said §6, which is the house tables) + `test:marketing-engine`.
**RED:** an unmapped field must throw; a patch applied to a reference outside the list must fail.

**U46 · Receipts** — the DLR route's third arm (D21, OD41)
`targetType === "SmsCampaignRecipient"` fans out to the recipient with the monotonic guard **in the WHERE**,
mirroring the existing `SmsMessage.recordDlr`. `ACCEPTED` becomes `UNCONFIRMED` after 15 minutes without a
receipt; ⭐ `UNCONFIRMED` is deliberately **not** terminal, so a late receipt can still settle it — exactly
as `SmsStatus.UNKNOWN` is not terminal one layer up, and the two layers must agree.
**Guard:** `test:sms-dlr`. **RED:** a receipt must move the row; a replay must not; a late FAILED after
DELIVERED must be discarded; an `UNCONFIRMED` row must still settle.
⭐ **The `SmsMessage` half of this is PROVEN on production (§3a)** — 11 seconds, `applied: 1`,
`mismatch: 0` — so this unit adds the recipient arm to a rail that works, and its live acceptance is a
campaign receipt moving a `SmsCampaignRecipient` row, not the first receipt of any kind. ⚠️ Receipts
arrive in BATCHES (three lines in one POST, measured), so the fixtures use multi-line bodies, and only
`DELIVRD` has ever been seen live — every failure fixture is synthetic until one arrives (§3b).
🔴 **INBOUND STOP — NOT BUILT, AND OWNED HERE (assigned 2026-09-26 by the audit).** §4a OQ8 said inbound
STOP was "specified and built behind a guard". Nothing inbound exists: no route receives a reply to an SMS,
no unit owned one (the S0 review called it "specified-but-unclaimed", §13), and the schema's note that a
"keyword" writes WITHDRAWN names a writer that does not exist. **A reply of STOP or ACHA to a marketing SMS
reaches nothing today, and the person stays marketable.** The only opt-out is the `/s/` link (U8) — and
the footer's `Acha: 50pick.tz/s/…` may read to a feature-phone user as "reply Acha". This unit owns the
fix because it is the vendor's other inbound rail: answer OQ8 first (does the Blackball account have an
inbound number, and what is the payload); then a receiver authenticated like the DLR route (secret token,
refusals recorded, `srcIp` discriminated — §3b lessons 2–3) that maps STOP / ACHA, case-folded, by msisdn
to the SAME path as `stopMarketing` (suppression reason `WITHDRAWN`, a WITHDRAWN ledger row carrying the
keyword as its wording, the player's toggle off) and sends nothing chargeable back. **RED:** a STOP reply
that leaves the number marketable must fail the suite. ⛔ No reply keyword is printed in any message until
this is live and proven by a real reply.

**U47 · The live campaign page** — `/admin/campaigns/[id]` (OD34, OD41)
The standing facts first, because each changes what the numbers mean: the list is not finished · the rail
is not configured · nobody is driving this (running, and no slice for 90 s, and the pump is not holding the
lease) · **no receipt yet for THIS campaign** (rendered from the data — receipts do work platform-wide
since 2026-09-23, §3a — so it disappears by itself the
day one does) · the mapped stop reason (⛔ never the raw key; an unrecognised key is still shown, labelled
as the engine's own words). Then four KPIs (**On campaign · Handed over · Failed · Skipped** — "handed
over", not "sent", and `accepted` is info, never green), two determinate bars that are never shown at once
(preparing: rows written / audience confirmed; sending: settled / rows), per-state chips from the
`groupBy`, and the controls (Start/Continue · Pause · Resume · Retry N failures · Stop) — **disabled with
the reason in `title`, never hidden**. Pause writes the campaign's status, not a tab's flag. ⛔ Retry is
never offered on a paused campaign: it would silently lift the pause.
**Guard:** `test:campaign-visuals` + `test:campaign-plan` (bucket arithmetic: HELD is **outstanding**, not
settled; `progressPct` of an empty campaign is **null**, so nothing paints a 0 % bar as progress).
**RED:** freeze the count server-side and require the painted width to be byte-identical after 10 s; move
HELD into settled → "a campaign that still owes people a message reads as complete" must fail.
**States:** loading · draft/not-prepared · sending (bar + spinner) · paused with a reason · done · error.

**U48 · Results** — same page
Failures and not-sent are **two sections**, because they need different actions. `AdminBarList` shows which
reason dominates; each label filters the recipients table below (one filter language, two views). The
table is server-paged, masked, with `AdminTableEmpty` **and the rail still rendered**. Export reuses the
one CSV writer. The event log reads the hash chain filtered on the campaign id, newest first, as
one-sentence rows — ⛔ no per-recipient audit row: the recipient rows are the record, and flooding an
unprunable chain is permanent.
**Guard:** `test:campaign-visuals`. **RED:** offer Retry on a skip → refusal required.
**States:** loading · no failures · grouped failures · filtered to one reason · empty filter result · error.

**U49s-1 · the live switch's closing time and its two audited writers, and the Marketing SMS settings record** (as built
2026-10-06, §0 STEP 43; spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3; OD62 · OD63): the server half of U49s, split
before it was started like U37c, inert — no screen writes either yet. `live-switch.ts`: the three-key reader (`now` taken
after the read lands; dates that do not round-trip refused), the gate checking `closesAt` itself, `openMarketingLiveSwitch`
(read first, record first, a conditional write, read back, confirm; a row stamped ahead of this clock never replaced) and
`closeMarketingLiveSwitch` (DELETE … RETURNING, recording the removed row; a lost-reply delete looked at before any retry,
a retry that takes only the row first read, "gone" only on a readable read comparing stored values, recorded as `was:
unknown`; `close_unconfirmed` when nothing can be read), `readDatabaseClockMs` for the ops door's clock check, the one rollback
`takeBackOpening` (compare-and-delete `deleteConfigIfValue`, then a read that proves off — or `other_open`, or
`unconfirmed_off`), and `screenOpsText`; `config-store.ts` gains `deleteConfigIfValue`, `takeConfig`,
`createConfigIfAbsent` and `replaceConfigIfValue` (and `takeConfig` an `expected` value for a retry's
compare-and-delete); `src/lib/marketing/sms-settings.ts` (pure, pinned in
`test:client-graph-safe`) and `src/lib/server/marketing/sms-settings.ts` (the `defineConfig` record, its row reader, the
verified setter); `estimate.ts`'s price from a fresh read; the ops door `npm run ops:marketing-live-switch` (the public-proxy
rewrite every ops script makes; `status` proven read-only against production). **Guard:**
`test:marketing-settings` (S1–S5d, S7–S10, S12–S13; S6 and S11 arrive with U49s-2) · `test:campaign-compose` §18.6 ·
`test:campaign-estimate` 2.5 · on Postgres, `db:probe-marketing-settings` (17/17, real concurrency included). **RED:**
`red:marketing-settings`,
against a baseline it first proves green — the old two-key row or an expired row read open, "now" taken before a slow
read, the gate ignoring the closing time, an opening that trusts its write, a rollback that takes an unreadable read as
off (the first review's MAJOR), a failed confirmation that leaves it open, a rollback that deletes a second owner's
opening, an unconditional write over a concurrent opening (the third review's MAJOR-2), an opening stamped ahead of this
clock replaced as stale (the fourth review's m4), the switch written with no opening record first (the second review's
M1), an opening laid over another, a close without a read-back, that leaves a stale row, that is blind to the row it
removed, that treats a lost-reply delete as nothing removed (the third review's MAJOR-1) or that retries blind onto a
later opening, a close that takes an unreadable first read for a row (the fourth review's MAJOR), forgets the look that
proved the row gone, records a stale row it could not remove as closed, or answers "already off" with no read after it
(the fourth review), disbelieves a look that found no row, takes a retry's clean miss for a lost reply, drops an opening
its look saw land, or judges an opening stamped ahead by the reader's closed state — at the close or the rollback (the
fifth),
a number split across the ops door's two fields, its text screened for decimal digits only, a second writer or caller
(three ways), the 2-hour window rule removed, a partial post filled in, the base ignored, a half-read row saved over, the
environment read restored, the estimate priced from the per-container cache, and the ops door writing SystemConfig
itself, outside production's environment, without its clock check (or with its sign flipped, or gating a close) or on
Railway's private host — 43/43.

**U49s-2 · the "Marketing SMS sending" card above the rail and the "Marketing SMS" tab** (as built 2026-10-06, §0 STEP
44; spec `docs/marketing-specs/ENGINE-SPEC.md` §4.3; OD64): `src/app/admin/system/marketing-sms-card.tsx` (the card:
the state sentence, the limits line, Switch on… with its duration dialog — six radios, 2 hours every time it opens, the
closing time in EAT following the choice in a polite live region; the dialog held until the server answers, then focus
on the state sentence — and Switch off now, offered for a malformed or unreadable switch too; refusals and caveats kept
until dismissed; success toasts deferred to the refresh), `marketing-sms-words.ts` (pure: the words a refused or
answered switch is said in — "weren't switched on" only before any write, "didn't complete" for a switch-on taken back,
never "off" unread; `already_open` and "already off" worded from the server's read after the answer; no title repeating
its body), `marketing-sms-form.tsx` (the tab: live validation with the server's rule, every problem under its box,
the window as quarter-hour selects, numbers compared as numbers, the pending bar and the leave guard; text for everyone
the server did not hand the form, with the reason in words, each label over its value on a phone),
`marketing-sms-view.ts` (the props, built on the server: S11 — no money to a viewer who may not read it, owner
included; no value from a half-read record; what only the form prints handed with the form only; who switched it on
never a number), the three `requireOwner` actions in `actions.ts` (switch-on reads only the duration; switch-off reads no
form, under its own label, and an "already off" answer carries no `recorded`; the page refresh in its own try),
`page.tsx` (the card above the rail on every tab, the fifth tab, the owner and the money from `loadSmsMoneyForViewer`),
`loading.tsx` (the card's ghost, measured), `estimate.ts`'s `loadSmsMoneyForViewer` and its role-taking twin for the
suite, the switch's durations moved into the pure module (re-exported by `live-switch.ts`), a no-break space binding
"TZS" to its amount in the limits line and the limit's refusal, the unsaved-changes exemption for the dialog's radios.
**Guard:** `test:marketing-settings` (S6 · S11 · S14 added — S14 runs the card's words against every path the real
writers take in memory; S7 lets the drive name the keys by exact path, only while it refuses a non-loopback database
before it connects; S13 the `qa:marketing-settings` key). **RED:** the settings action
guarded by a staff grant, who switched it on read from the form, the switch-off reading a form, an await above
requireOwner, the switch-on reading the whole form, the switch's key named in another drive, the drive's loopback
refusal removed, the money line for every viewer, the fingerprint, the measured price and an owner's form handed
without money, a half-read record shown with values, the page asking the decider itself, what only the form prints
handed to a text viewer, a phone number in groups named as who switched it on, the money loader failing open on a
decider that throws, the price walked for every money viewer, the owner read apart from the loader, the loader's twin
called from a page, "TZS" left free to wrap in the limits line and in the limit's refusal, a role read that failed said
as "not the owner" (in the view and in the loader), the ops door's `by` shown unscreened, a lost race or a switch-on
taken back said as "weren't switched on", `already_open` worded from the page as it was before the click, "It was
already off." over a stale row, an unconfirmed switch-off said as off — 72/72. **Drive:** `qa:marketing-settings` (scratch Postgres, the switch opened and closed for
real) — 184/184 at 1280 and 360 (+ reduced motion).

**U49 · Budget** — `budgetTzs` and the floor (D24)
A budget authorised at approval, decremented by **segments accepted**, auto-pausing at 90 % with a named
reason; a second, higher marketing floor enforced in the one place `sms.ts` already decides whether a batch
may spend money; and a refusal at **Start** when the projection exceeds the live balance — not at message
40. ⛔ A refused reply's `balance: 0.0` is never recorded as the account's balance.
**Guard:** `test:sms-cost-guard`. **RED:** projection above the live balance must refuse at Start; a
MARKETING batch below the marketing floor must refuse while OTP still sends.
⭐ **What this unit starts from (S7b + the 2026-09-26 audit-fix pass, §0 ruling 11):** `refreshSmsBalance`
is the ONE balance read — the free, authenticated balance endpoint, reused for a minute, never recording a
refusal's `0.0`. A caller may give it a budget (Admin → System waits ~2.5 s, `/api/health` ~1 s; the read
carries on and records itself when it lands); concurrent callers share one read in flight; a failed read is
remembered briefly (`SMS_BALANCE_RETRY_MS`, 30 s by default) so a dead vendor is not hammered; and the answer
says fresh / reused / pending / failed / unavailable, with `stale` when the figure could not be confirmed and,
on a failure, WHY — `refused` (the vendor turned our credentials down: only a `status:false` 400/401/403),
`unreachable` (no answer, a timeout, a 429 or a 5xx), `unexpected` (any other reply, 2026-09-27) or
`not-configured` — because this read is the platform's one free live credential check, and wrong keys must
not look like an outage. A reading is stamped with when it was asked, and one that lands after a newer
one never overwrites it. `sendBatch` uses the same function (no second inline copy) and
re-checks a stale or below-floor reading before refusing at the floor, so a top-up is honoured within
about a minute. Crossing the alert line — and, since 2026-09-27, the floor, with its own alarm and a
`level` in the payload — writes the `sms.balance_low` audit row AND reaches, by bell and email (never by
SMS), the officers who can open Admin → System (`rolesThatCanOpen`; by default the Owner only) — once per
downward crossing, and at most once per low episode a day for a restart that finds the balance already low
(an episode closes with `sms.balance_recovered`). Admin → System's tile headlines the credit ("SMS credit",
gloss "Salio", value in TZS or "—" when unknown) with the state as a sentence under it, and never says
"Healthy" on a rail that cannot send (`BLACKBALL-SMS.md` §5).
✅ `test:sms-cost-guard` is in `predeploy` since the audit-fix pass (§0 ⚠ RECORDED), so what this unit leans
on gates every deploy. A figure past the 15-minute TTL is headlined "—" on the tile (the old value in the
note, its time on the provenance line under the dash), because the floor itself treats it as unknown — show
"unreadable" in U39/U40 the same way.

### Phase D — registry, docs, proof (U50–U52)

**U50 · Declarations** — `comms-registry.ts`, `boot-checks.ts`, audit actions (D25)
A MARKETING lane declaring the **envelope** (sender, purpose, footer, consent gate, no `Notification` row)
and its own verbatim-wording assertion (§5.12). Boot warns when marketing is enabled without the webhook
secret — without it DELIVERED is structurally zero and the report reads as "nobody got it". New audit
actions registered: `marketing.campaign_created|started|paused|cancelled|slice`, `marketing.optout`,
`marketing.suppressed`, `contacts.imported|exported`, `pii.revealed`.
**Guard:** `test:cert-c1`, `test:cert-c3`, `test:audit`. **RED:** send a body with no footer → red.

**U51 · The operator's guide** — `docs/HOW-TO-SEND-A-CAMPAIGN.md` + updates (OD46)
Plain words, for Ali: what a campaign costs, what "handed over" means and why DELIVERED lags it by seconds
to minutes (and what `UNCONFIRMED` means when a receipt never comes), how
to stop one, what the refusals mean and what to do about each. Plus `docs/BLACKBALL-SMS.md` (the marketing
lane), `docs/DATA-RETENTION.md` (the new rows), `docs/COMPLIANCE-DECISIONS.md` (every ruling in §4 and
§4a).
**Guard:** `test:docs`. **Accept:** an operator who did not write it follows it once, and what they got
stuck on is fixed in the doc.

**U52 · The live drive, and the Seal** — production, ledger-capped
`live:marketing` drives a real campaign of **≤6 chargeable sends to +255772619619 only**, with its own
ledger file (gitignored), proving by **discrimination**: a suppressed number is refused while an eligible
one is sent in the same run; the opt-out link is tapped on the handset and the next send to that number is
refused; the provider's own portal `COUNT` is compared against `planSms`; the slice budget and batch size
are re-derived from the measured latency; and the session confirms it is on the new build by `?dpl=<sha>`
on a `_next/static` asset or the preload `Link` header (⚠️ `<html data-dpl-id>` is absent on some routes —
a fallback only).
**Guard:** `test:marketing-engine` + the §1a closure list. **RED:** the drive must fail if the gate is
removed — the refusal is the evidence, not the send.
**Accept:** all nine closure conditions in §1a, ticked with dates.

---

## §10 — SESSION ORDER (two units per session)

The order is §0's ▶ NEXT — the critical path to the first real campaign — and it comes from two specs: the gate
track's build order (`docs/marketing-specs/U33a-U37c-OD58.md` §11, down to U37c) and the send engine's
(`docs/marketing-specs/ENGINE-SPEC.md` §0.1, with its parallel sets in §0.2). What the engine track leaves out follows
the first campaign, in ENGINE-SPEC §0.4's order: U14 the frequency cap (⏸ held by management's ruling of 2026-10-07 — no per-person cap), U44 the pump, U45
scale, U46b inbound STOP (it needs Blackball's reply number, OQ8), U15 one send path, U16b, the import entrance U30–U32,
U34b, U39b, U50, U51 the operator's guide and U52b the Seal.

⚠️ U43 and U47 are the most likely to overrun and are pre-split (U43b-1/-2, U47b-1/-2). Split anything else BEFORE
starting and write the split into §2 — a half-built unit is worse than a smaller one. The design-time S1–S27 pairing
this section used to carry (superseded 2026-10-03) is kept in `MARKETING-CAMPAIGN-HISTORY.md`.

---

## §11 — VERIFICATION

1. **Per unit:** the guard is written first and proven RED against the real defect, then green; the unit's
   own suites pass; `npm run predeploy` passes (with the new key added to the chain in the same commit).
2. **Two stores:** `test:dal-parity` gains a section with its own planted-key control.
3. **Whole tree:** `node scripts/test-all.mjs`, run against clean `main` on this machine IN THE SAME SESSION
   and diffed. ⚠️ Clean `main` is not all green and WHICH suites are red keeps changing — measure it, never
   compare against a written number; the only claim allowed is "no suite red that is not red on clean main". ⚠️ `predeploy` includes
   `qa:live` and `test:admin-section-gate`, which need a dev server on the expected port.
4. **Live, by discrimination:** after the deploy, confirm the build by `?dpl=<sha>` on a `_next/static` asset
   or the preload `Link` header (`<html data-dpl-id>` is absent on some routes — a fallback only), then run the check
   that fails when the feature is absent. For U52, the evidence is the **refusal** (a suppressed number not
   sent) alongside a successful send in the same run, capped at **6 chargeable sends to +255772619619**
   with a gitignored ledger.
5. **Visual:** every `visual` unit's six states at 1280×800 and 360×780, plus reduced motion, with
   `HeadlessChrome` in the UA — screenshots **opened and read**, into `.qa-shots/marketing-setup/<unit>/`.
6. **Tracker:** `test:marketing-setup-plan` and `test:tracker-hygiene` before every push.

### §11a — The four repo-wide gates that punish a new programme

1. **`test:docs`** fails on any `npm run <name>` or `scripts/<file>.<ext>` in `docs/*.md` that does not
   exist. **This document names suites by KEY only** (`test:tz-msisdn`), never as a path and never after
   the words "npm run", until the commit that creates them — at which point that unit's §9 text is
   rewritten to the full forms in the same commit, and `test:docs` then guards them too. The only full
   forms written today are the tracker guard's, which commit 1 creates. ⛔ A `shots/…png` path is written
   only in the commit that commits the PNG.
2. **`test:red-anchors`** counts undeclared harnesses with `===` against 65. Every new `red:` key either
   plants in memory or declares anchors. ⛔ The tracker guard's own file contains no write-call token, even
   in a comment.
3. **`test:tracker-hygiene`** reads the topmost `⏭️ **RESUME AT` block in `LIVE-QA-CAMPAIGN.md` §6b and
   cross-checks the finding ids it names. Our pointer is prose **inside** that block: no new marker, no new
   finding id.
4. **`test:guards-exist`** hard-fails on a backticked `test:*` cited from `src/`, `scripts/` or `prisma/`
   that has no `package.json` key. The key lands in the same commit as the first docblock citing it.

---

## §12 — RISKS

| Risk | Why it is real here | What this plan does |
|---|---|---|
| A marketing send breaks the law before the lawyer answers | the penalties are criminal (≥ TZS 5m / 12 months; licence revocation) | every send passes the per-recipient gate (consent, suppression, RG, age — U7–U11) asked by the loop (U9), and every one of the eleven questions has a built default or an answer (§4a; OQ1, OQ2, OQ4 answered by Ali 2026-09-26 — no Board approval gate) |
| A GROWTH officer learns who gambles | a pre-flight that separates "already a player" from "new" is a membership oracle | U30 returns a COUNT for masked roles, rate-limits the run, audits it, and its RED control runs **as the masked role** |
| The tracker reports progress that did not happen | a "yes" in a Guard column is free text | the guard **resolves** the key in `package.json`, the script on disk, and a sibling red control (WIRING §4, plants 10–13) |
| A fix to `phone-normalize` breaks payouts | `selcom.ts` shares `toMsisdn255` | U1 runs the payout, OTP and prefill suites in the same gate list |
| A session breaks a repo-wide gate at 2am | three gates fail on things a new programme naturally does | §11a, repeated in §0's TRAPS |
| One number is messaged twice | three mechanisms hold it, and removing any one silently loses the property | U43's control runs **five concurrent drivers over 1,000 rows** |
| A unit proves too big for a session | the shipped equivalent is ~17,500 lines | 52 units; §10 names the three likely to overrun and requires a split **before** starting |
| A prose citation rots | no gate can check a sentence in a document | every citation in §3 and §8 is re-derived at the start of the session that touches that file |

---

## §13 — SIX-LENS REVIEW (S0, 2026-09-16)

| Lens | What it attacked | What changed |
|---|---|---|
| **Compliance & law** | a consent flag collected under three different promises; imported leads with no lawful basis; three published RG commitments with no code; self-exclusion that expires on its own timer; a mandatory safer-gambling suffix missing from the arithmetic; a URL-only opt-out in a feature-phone market; **and the one nobody had: a gaming advertisement needs the Board's approval, and unsolicited SMS needs its prior WRITTEN approval** | U6/U7's verbatim ledger · OD9's first-party-only rule · U11/U12/U13 · U10's standing predicate · U4's counted footer · U8 plus a specified-but-unclaimed inbound STOP (claimed by U46 on 2026-09-26; still not built) · **U41 and OQ1: the surface ships closed** |
| **Money & cost** | a floor worth eight messages as the only spend control; per-segment billing costed per message; a 15-minute balance snapshot treated as current; `accepted` counted as delivered | U49's budget and the refusal at Start against a fresh balance read · U3's septets · U39's measured unit cost · U46's `UNCONFIRMED` |
| **Code truth** | a red control that would have turned `test:red-anchors` red for both checkouts; an enum used in the transaction that added it; a 1 MB action carrying a 30k-row file; a segment counter that cannot import its own table; five code doors called three | in-memory `--prove-red` · U35's two migrations · OD29's browser parse · U3's pure module with `smsCodingFor` delegating · §5.9's five doors, repeated in §0 |
| **Completeness & trackability** | 22 units for ~17,500 lines of precedent; a guard column nothing resolved; four owner requirements (progress bars, loading systems, rendering perfection, animations) with no acceptance | 52 units · the resolving Guard column · a six-state **States:** line on every `visual` unit, enforced by the tracker |
| **Adversarial / red-proof** | a typed-number gate built from the value it checks; boundary vectors chosen as round numbers; a progress bar a timer could fake; a concurrency claim provable by a single driver | OD27 · U1's twelve written-out vectors and U3's 159/160/161 · U32's rows-not-time control · U43's five concurrent drivers |
| **The officer's screen** | a failure list with no dominant reason; a retry that re-sends to someone who opted out; a refusal with no remedy; a dashboard showing 0 % delivered as failure | OD40 · retry only for retryable reasons · U41's plain sentence · U47's data-driven receipts callout |

**The four claims a reviewer should attack first**, because each is the kind that passes while being wrong:

1. *"One number messaged twice is structurally impossible."* It rests on the unique index **and** the
   conditional claim **and** one normalization key. Remove any one and the property is gone.
2. *"The consent gate runs before every dispatch."* True only while the gate is **inside** the loop — U9
   exists to keep it there.
3. *"The counter and the invoice cannot drift."* True only while `smsCodingFor` delegates to the one
   module (U3), and U52 closes it against the provider's own `COUNT`.
4. *"The broadcast surface ships closed."* True only while the approval is re-checked **in the loop** as
   well as at Start (U41) — a start-only check lets an expired approval finish a 50,000-message send.
   *(Moot since 2026-09-26: Ali ruled no Board approval is required (OQ1). The lesson still binds U41's
   officer authorisation, which must also be re-checked in the loop.)*

---

## WIRING — what session S0 did (2026-09-16/17) — RECORD

> ⚠️ **A record of the programme's first session, not an instruction and not the current state.** The
> counts it seeded (`0/52 · 0/25`) and the "nothing checks consent, suppression or opt-out" line it put in
> three doors were true then; each session now keeps them current (§0a step 6). Read §0 and §1.

**1 · Write the plan of record.** This document becomes `docs/MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`.

**2 · Write the tracker guard** — `scripts/marketing-setup-plan.test.mts`, registered as
`test:marketing-setup-plan`, with `red:marketing-setup-plan` = the same file with `--prove-red`. Copied
from the Mobile Visual Plan's guard (same `ok()` harness, same `section()`/`cells()`/`isTableRow()`
helpers, same `commitExists()` via `git cat-file -e <sha>^{commit}`), re-anchored on this file, plus four
checks that guard does not have:

- **§1 · status discipline** — ✅ needs an existing SHA, a `→` with content either side, `yes` in
  RED-proven and a live date; 🔵 a SHA and no date; ⏸ a reason; ⬜ nothing. An unknown status fails.
- **§1b · ⭐ the Guard and RED columns are RESOLVED, not read** — for every ✅/🔵 row the Guard key exists
  in `package.json.scripts` and the script it runs exists on disk; for every ✅ row the RED cell names a
  backticked `red:` key that exists and is either in-process (`--prove-red`, write-free source) or names
  an anchors file. ⛔ Without this a session can write "yes" beside a harness nobody wrote.
- **§1c · visual units show their states** — a ✅ row of kind `visual` whose §9 body has no `**States:**`
  line naming at least six states, `loading` and `error` among them, fails. This is the
  only mechanical hold on "progress bars, loading systems, rendering perfection".
- **§2 board ↔ units**, **§3 defect integrity** (owner exists, one owner in both places, named inside its
  unit, never ✅ before its unit), **§4 ▶ NEXT names no ✅ unit**, **§5 the two doors agree** (anchored on
  this programme's own token **and** asserting the matched slice names this file, so it cannot read the
  neighbouring row), **§6 closure is earned** (every unit and defect ✅, the nine §1a conditions, U52 ✅),
  **§7 every table renders**, **§8 every OQ named anywhere has a §4a row with a non-empty default**.
- **Positive controls:** at least 52 units and 25 defects are asserted directly and printed (a split
  raises the count, never lowers it) — a parser that finds nothing must go red, not green. And the
  red control itself first requires the untouched plan, a fully valid ✅ `pure` row and a fully valid ✅
  `visual` row to pass cleanly, so no plant can be caught by a break it did not make.
- **28 in-memory `--prove-red` plants** (built and caught 28/28 on 2026-09-17), each requiring the named rule
  to fire — and three controls that must pass cleanly first (the untouched plan, a fully valid ✅ `pure`
  row, a fully valid ✅ `visual` row): a ✅ with a SHA that is not a commit · no measurement · `→` alone ·
  RED `no` · no live date · a 🔵 carrying a date · a ⬜ carrying a SHA · a ⏸ with no reason · an unknown
  status glyph · a Guard key absent from `package.json` · a guard script missing from disk · a RED cell
  naming no red control · a red control that writes files with no anchors · a `visual` ✅ with its States
  line deleted · one naming only five states · a board row with no §9 heading · a §9 heading with no
  board row · a defect owned by a unit that does not exist · a defect with two different owners · a
  defect id missing from its unit's body · a defect ✅ above a ⬜ unit · ▶ NEXT naming a ✅ unit ·
  mismatched NEXT-PLAN counts · a NEXT-PLAN row that never links this file · an orphan table row · an
  unearned closure claim · a legal question named but never asked · a legal question with no default.
- ⭐ **Its first real run caught this plan.** Four units (U2, U3, U4, U6) did not name the defects they
  own; the unit text was fixed, not the guard.

**3 · Open the three doors.**
- `docs/NEXT-PLAN.md` — a new `## ▶ 0a · MARKETING CAMPAIGN & CONTACTS SETUP` row **directly under** the
  Mobile Visual Plan's `▶ 0 · … START HERE` row, which keeps its place per Ali's 2026-09-15 instruction.
  It carries the counts (`0/52 units ✅ · 0/25 defects ✅`), which machine and session runs it, and the
  rule that every session updates those counts in its own commit.
- `docs/README.md` — a Start-here row: what the programme is, that §0a is a copy-paste prompt for any PC,
  and that nothing on this platform checks marketing consent, suppression, opt-out or RG exclusion today.
- `docs/LIVE-QA-CAMPAIGN.md` §6b — one paragraph appended **inside** the existing topmost RESUME AT block
  (⛔ no new marker, ⛔ no new finding id) saying the programme exists, is not in flight, and that the
  mobile visual plan still has priority.

**4 · Gate and push.** `test:marketing-setup-plan`, its red control, `test:docs`, `test:tracker-hygiene`,
`test:red-anchors`, then `git commit --only` the six paths and push to `main` (docs + one script + two
`package.json` keys — no product code, so the deploy is a no-op).

**5 · Hand Ali the prompt.** Paste §0a into the chat so he can run it on the other PC.



