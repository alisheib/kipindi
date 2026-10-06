STATUS: ⚪ **RECORD** — the session diaries of the Marketing Campaign & Contacts programme, moved VERBATIM out of
[`MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`](MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md) on 2026-10-05 (session S11, on
Ali's instruction: "remove the stales that confuse developers, keep a clean plan").

# MARKETING CAMPAIGN & CONTACTS — the session record (S4 → S10′, STEPS 1–39)

> ⛔ **NOTHING HERE DECIDES WHAT IS DONE OR WHAT IS NEXT.** The tracker's §0 (RESUME AT) and §1 (the board) do, and
> `npm run test:marketing-setup-plan` holds them to the truth. This file is kept because every lesson in it was paid
> for — the traps, the review findings, the measurements behind each ✅ — and because a future audit may need to know
> why a thing is the way it is. Read it for the WHY; never act on a "▶ NEXT", a "RESUME HERE" or a builder named in it:
> each of those was true on the day it was written and has since been done, superseded or abandoned.

What it holds, newest first, exactly as §0 carried it:

- S11's ✔ LAST SESSION block (2026-10-05, OMEGA-COMPILE01 — STEPS 40–42, the gate track finished), moved on 2026-10-06
  when S12 began;

And, as §0 carried it on 2026-10-05:

- the S10 pause and its afternoon resumption on OMEGA-DEV072 (S10′): STEPS 33–39, Ali's twelve answers, the three
  builders that were in flight and what became of them;
- 🟡 S10 in flight (2026-10-01 → 04, Ali-Blade15), with its two review rounds;
- 🔎 S9, reconstructed from its commits; ✅ S7c live (`d3379fef`) and S8 that shipped it;
- 🔎 the validation audit of 2026-10-03 and its 49 fixes;
- the S8-era ▶ NEXT, ✔ LAST SESSION and ◐ HALF-DONE blocks, the rulings taken on Ali's delegation of 2026-09-26, and the
  full ⚠ TRAPS list with each trap's story;
- after the §0 diaries: the tracker's old §10, the design-time S1–S27 session order (superseded 2026-10-03).

## The tracker's §0 ✔ LAST SESSION block for S11, as it stood on 2026-10-06 (verbatim)

```
✔ LAST SESSION: S11 — 2026-10-05, OMEGA-COMPILE01 (`F:\kipindi-main`, on `main`): the session that took the programme
  over from OMEGA-DEV072 the same day, on a freshly set-up PC.
  STEP 40 · U37s LIVE `549f1ba4` (served from 14:16:40 UTC, proved by discrimination — `68c176e8` before it; the new
  container's `/api/health` ok, the database reachable and migrated). Every DRAFT save stamps the SAVED source line,
  read FRESH from the row (a read that cannot answer refuses the save, `source_unreadable`), and the server's verdict
  prices it; a draft whose stamp differs from the saved line is flagged, Save is offered and the screen says why. The
  adversarial review said SHIP and found four things, all fixed before the push. Guard `test:campaign-compose`
  §17.13–§17.20; `red:campaign-compose` 245/245. Nothing visible changes until Ali saves the line (G5).
  STEP 41 · U37c-1 — THE TEST SEND TO A TYPED NUMBER, THE SERVER PATH (inert: no screen sends a recipient until U37c-2).
  The action takes (campaignId, variant, recipient), re-typed on the server (`testRecipientOf`: own, or typed with a
  number of at most 40 characters and the BOOLEAN true as the 18+ tick; anything else `bad_recipient`). A typed number is
  a CONTACT-BOOK recipient (the `{jina}` fallback, the stored source line) and is decided by the ONE gate with this
  attempt's attestation as its context — so a number an account holds is governed by that account, and the tick counts
  only for a number nobody holds, only while licence outreach is open, never over a stop, a withdrawal or an erased
  record. Refused UP FRONT, the same for any number: outreach closed, `adult.test` unsaved, no source line on the draft.
  Two more budgets spent only after those checks (`marketing.testSendTyped` per officer, `marketing.testSendTo` per
  number under a keyed letters-only bucket); a 3-second floor on every typed outcome at the gate or after it (a throw
  included); D19's one sentence for a masked viewer and the collapsed reason for a reader; the measurement token shown,
  never the number's real stop link; the gate asked again at the send. The officer's own number typed in another
  spelling is the own path. 🔎 The adversarial review said FIX FIRST — one MAJOR, fixed before the push: a typed test's
  RG COMPLIANCE row would have appeared on /admin's activity feed the moment a protected player's number was refused (a
  membership oracle) — OD61, typed tests write none; and its gaps closed (shapes, the floor on every path, the re-ask,
  a keyed bucket). Guard `test:campaign-compose` §16.4, §18.2, §18.5′, §18.13–§18.14, §18.17–§18.31;
  `red:campaign-compose` 288/288; `test:campaign-audience` 4.9 now allows exactly the typed test's ONE pinned gate call
  (two new plants). Owed from the review, none reachable until licence outreach opens: OD61's feed restriction (before
  U43), the erasure marker for an account erased with no book row (U16a), and U33r (agent referees).
  STEP 42 · U37c-2 LIVE `0d3f08d7` (served from 16:48 UTC, proved by discrimination — `a92c3be8` before it; the new
  container's `/api/health` ok, the database reachable and migrated; the dev seed route answers 404 on production) —
  THE TEST CARD (the gate track's last unit; its server path is STEP 41): "Send the test to" — my own number (masked, the default) or another number, offered only while licence outreach is open, `adult.test` is
  saved and the draft carries the source line, and otherwise disabled with the reason beside it. Another number: the
  kit's number field (the plan's own sentence under it, said ONCE — the line beside Send is a way back to the field),
  the 18+ tick labelled with the SAVED words, the contact-book preview (the `{jina}` fallback, the source line, the stop
  link never shown) and the typed outcomes; the consent link only for an OWN refusal. 🔎 The adversarial review said FIX
  FIRST — one BLOCKER, fixed before the push: the 18+ tick outlived an edited number, so a confirmation given for one
  number was posted for another. The tick is now bound to this draft, these words and this number; any edit or switch
  unticks it; every Send spends it; and the post names the words' version, so the server refuses a tick given for words
  reworded since the page opened (`attestation_stale`, §18.32 — the page re-reads and shows the new words). Its minors
  too: the reason order (a typed test refused up front no longer says "Updating…" for ever), a reason beside "Another
  number" on a new composer, the kit field honouring `autoComplete="off"`, the explanation no longer dimmed, and claims
  that could not see a log or a second consent link. A second review of the fixes found no blocker; its minors were
  closed too (the loader offers a typed test only with a preview, the card re-reads on every out-of-date refusal, each
  pinned by a claim and a plant). Visual drive `PASS=typed` (its
  own fresh server; the world stepped through `/api/dev-test/marketing-typed-test-seed`, 404 in production, which calls
  only the platform's own writers): Appendix A §A.9's 13 states plus 8b (an edit unticks), 13b (outreach open: the
  licence basis hands the own test over) and 14 (words reworded while open), at 1280 and 360 as GROWTH and as ADMIN —
  179/179, every capture opened and read — and the console (198), live-closed (18) and dead-rail (10) passes re-run on
  the new card, each on its own fresh server. Guard `test:campaign-compose` §16.4, §16.17–§16.20, §18.22, §18.32;
  `red:campaign-compose` 322/322. ⚖️ §A.9's state 13 (own refused, with the consent link) is a CLOSED-outreach state:
  once the record opens, U33a-G's licence basis reaches an adult account that never said no.
  Then (between STEPS 41 and 42) this §0 was rewritten (Ali: "remove the stales that confuse developers, keep a clean plan"): the session diaries
  it had grown — S7c to S10, and the STEP log 1–39 — are in `MARKETING-CAMPAIGN-HISTORY.md`, verbatim. ⭐ The diaries
  are a RECORD: nothing in them decides what is done or what is next.
  Before it, the same day on OMEGA-DEV072 (S10′): STEPS 35–39, all live — U33a-R the licence-outreach record
  (`ec02e993`), U33a-G the gate that reads it (`b5680d5d`), U33a-P the profile switch, U33b-L the list-basis writer and
  the Lists card — and Ali's twelve answers, recorded in COMPLIANCE-DECISIONS § "2026-10-05 · Marketing outreach
  rulings".
```

## The tracker's §0, as it stood on 2026-10-05 before the clean-up

```
⏸ S10 PAUSED — 2026-10-04 ~10:50 UTC (Ali: "push now what you finished, we continue in a new session later").
  EVERYTHING FINISHED IS LIVE — last `2a0c311f`, live 10:45:49 UTC: validation batch 7 (STEP 28) · qa:live's market-card
  block (28b) · U33a-0, the pre-ledger census = 0 (29) · U33w, the consent wordings tab (30) · U33a-L, the list-basis
  table (31) · U33p, the public policy lines tab (32) · the admin guide v1.2 (20 pages; on Ali's Desktop).
  ▶ RESUMED the same afternoon (Ali: "proceed with the plan, end to end until live, generate the instructions PDF"):
  STEP 33 · U43-0 LIVE `bf166ff3` (the one migration of the engine track, pushed alone, read back on production).
  STEP 34 · U41 decided — a campaign is authorised by one officer's typed confirmation, at any size (OD60).
  STEP 35 · U33a-R **LIVE `ec02e993`** (pushed 08:47 UTC, serving 08:50 — the new container booted clean, `ok:true`,
  database reachable and migrated; no migration in this unit, so the smoke is the boot and the card itself) — the
  licence-outreach record: the four opening checks, the two audited writers and the
  "Licence outreach" card under the policy lines on /admin/system (`?tab=policy`). R1–R6 green, 5/5 red plants caught.
  STEP 36 · U33a-G **LIVE `b5680d5d`** (Railway SUCCESS 09:31 UTC, the live deployment; the app read back ok, database
  reachable and migrated) — the gate reads the record: `{ basis, basisRef }` on every ALLOWED (CONSENT · LICENCE_PLAYER ·
  LICENCE_LIST · LICENCE_TEST), `no_basis` as its own reason, the two new reads, the split pricing the record once per
  chunk, dispatch carrying the basis, and U37c's `usableTestAttestation`. ⛔ WITH THE RECORD CLOSED NOTHING CHANGED —
  same reads, same reasons, same details — which is what the suite's closed column asserts, because production is closed
  today and that column is a parity check against what is live right now.
  Guard: `scripts/marketing-consent/licence-basis.mts`, the §3.2 table EXECUTED over one seeded world in BOTH states
  (G1–G17); `test:marketing-consent` 155 green, `red:marketing-consent` 90/90 with the six licence plants each caught on
  its own row. ⚠️ **STILL OWED on §9 U33a-G, so U33a-G is 🟡 and not ✅:** G0 parity against the pre-change model, and the
  twelve SOURCE-level plants in `gateWithDefect`. The red cases that shipped wrap the real gate and corrupt one decision
  each — that proves every assertion is live, and it cannot catch a defect nobody thought to name.
  ⚠️ `test:marketing-optout`'s fixture A had to become a REAL consent (an unpinned `source: "IMPORT"` row with
  `recordedBy: null` cannot exist on production; it passed only because the old contact branch answered `age_unknown` to
  ANY GIVEN row). Labels 1 and 12 still read `age_unknown`.
  ▶ NEXT on the gate track: U33a-P (the profile switch under OD58), U33b-L (recording a basis on a list), U37c (the typed
  test), and U37s. Then ENGINE-SPEC's order.
  STEP 37 · U33a-P — **the profile switch under OD58**. `MarketingToggleState` gains `outreach`, and a non-consenting
  player's switch can now read ON because licence outreach reaches them. ⛔ THE LICENCE PATH IS STRICTER THAN THE
  CONSENT PATH, deliberately: ANY active stop turns it OFF — an OPERATOR stop that a consenting player's switch rightly
  ignores — because nobody said yes here, and a switch that reads ON while the gate refuses is the D4 defect in a new
  place. A WITHDRAWN row, a lapse, and a closed record each read OFF; a break that ENDED with no yes since reads PAUSED.
  The screen prints the admin-edited `profile.outreachNote` beside it, and ONLY while the switch is ON by outreach — a
  line explaining why offers reach you is a lie beside an OFF switch. The DSAR export gains `outreach: { basis, since }`,
  computed FROM THE SWITCH rather than recomputed, so the screen and the export cannot disagree: a person asking what we
  hold is entitled to be told we message them without their consent, and under what.
  Guard: `test:marketing-consent` T-O1–T-O6 (161 green) with three plants in the toggle model — an outreach ON over an
  OPERATOR stop, outreach ON while the record is closed, and a GIVEN written by "nothing to do". `red:marketing-consent`
  **93/93**. ⚠️ Two fixture facts worth keeping: the RG break column is `coolingOffUntil`, not `breakUntil` (a fixture on
  the wrong column reads as a passing player), and `scripts/` is NOT typechecked — `npm run typecheck` does not cover it,
  so a model literal missing a new field fails only at runtime.
  STEP 38 · U33b-L (the WRITER half) — `list-basis.ts`, `recordListBasis` and `revokeListBasis`: the only writer of
  `ContactListBasis`, and so the only thing in the platform that can make a person reachable WITHOUT their consent.
  Until it existed the gate's `LICENCE_LIST` branch was a branch nothing could reach. It refuses while the licence
  wording or its 18+ sentence is unsaved (a default nobody approved is not evidence), stores the SAVED texts and both
  versions as seven-year evidence, audits COMPLIANCE with COUNTS AND IDS ONLY — never the note's text — and ⛔ never
  touches `messagingConsent`, `marketingOptIn`, `suppression.lift` or `mirrorContactCache`: a licence basis is not a
  consent, and a file that could write one would eventually be asked to. A revoke is never refused for a rule about the
  WORDS — stopping outreach must not wait on a wording, as closing the record is never refused for a failing check.
  ⚠️ **THE ENTRANCE IS NOT BUILT: there is still no way for a human to record a basis.** The Lists card on
  /admin/contacts (its actions, loader, copy, the `marketing.listBasis` rate limit and the masked-viewer rule) is owed,
  and until it ships `LICENCE_LIST` is reachable only from a test. The writer landed first on purpose — it is the half
  with the rules and the evidence — but the unit is NOT done.
  Guard: `test:contacts-lists` (new, in predeploy after `test:licence-outreach`) — B1–B7, 8 green; `red:contacts-lists`
  3/3. ⭐ `test:dal-parity` 27.writers CAUGHT the new writer before the suite did: it refuses any caller of the DAL's
  two writers that is not named in `WRITERS27`, so the file had to declare itself. That is the guard working, not an
  obstacle — a second surface learning to record a basis is now a failure rather than a discovery.
  STEP 39 · U33b-L COMPLETE — **the Lists card**, the entrance STEP 38's writer was missing. /admin/contacts gains a
  "Lists" card: each list with its member count, its basis standing, and the coverage line that matters —
  "covers 412 of 420 — 8 added since, record again to cover them". ⛔ THE GAP IS SAID IN WORDS, not left as arithmetic:
  an officer who adds people to a recorded list and assumes they are covered is the mistake that line exists to prevent.
  The 18+ tick is labelled with the SAVED sentence, so the officer attests to the words that will be stored on the row
  and never to a paraphrase. The card shows no Record button at all while the wordings are unsaved — the writer would
  refuse, and a control that always fails is worse than none. The revoke asks for its REASON BEFORE the confirmation
  (a dialog that fires on a reason nobody has written yet asks the wrong question first). Rate rule
  `marketing.listBasis` 10 at once then one a minute, spent BEFORE the writer so a refused recording spends it too; the
  act gate is `softRequireStaff("growth", …)` — Ali's Q12 ruling of 2026-10-05.
  ⭐ D19 · nothing on this card is maskable: a list row is counts, names and instants, never a phone number.
  🔴 **`test:unsaved-changes` CAUGHT THE FIRST CUT OF THIS CARD**: it let an officer type a proof note and navigate
  away with it silently lost. ⭐ The fix is not just "add the guard" — the card now WARNS on exit and deliberately
  keeps NO draft: a half-written attestation resurrected on a later visit and submitted without being re-read is worse
  than retyping it. ⚠️ It was visible only because the battery's FAILURE SET was diffed against the previous run —
  428→427 green with a list that looked the same length. Compare the set, never the count.
  Guard: `test:contacts-lists` B1–B8, 9 green, red 3/3. **B8 is the card's own contract** — both actions ask the gate
  FIRST and spend the budget before the writer, the card decides nothing itself (no `currentWording`, no `db.`), it
  labels the tick from the saved text, and the loader reads coverage from the DAL rather than counting members again.
  STEP 40 · U37s — **the source line, stamped** (OMEGA-COMPILE01, `F:\kipindi-main`: the session that took the programme
  over from OMEGA-DEV072 on 2026-10-05). Every DRAFT save now stamps the SAVED `source.phrase` wording onto the campaign
  — on the first save AND on every edit — and the server's verdict prices exactly that line. Until it existed the only
  writer wrote `sourcePhrase: null`, so G5's line could be saved on Admin → System and still reach no campaign. Blank
  while unsaved: the row stores null (a line of spaces too), the counter reserves the 30-septet maximum, and a book
  recipient is refused, as before. A confirmed campaign keeps its own line. ⚖️ The composer's counter prices the line the
  NEXT save will stamp (`composerSourcePhrase`), not a draft's earlier stamp — which would let the counter pass a body
  its next save refuses. Nothing visible changes until Ali saves the line (G5, "Namba yako ipo orodhani kwetu.").
  🔎 THE ADVERSARIAL REVIEW (before the push) said SHIP and found four things, all fixed in the same push: (1) a draft
  saved before the line existed showed "set" and refused Save as "no changes", so it could never be re-stamped — the
  loader now flags it (`composerSourceLineStale`), Save is offered and the screen says why; (2) the stamp read this
  process's cache, which answers "nothing saved" until the boot read lands — it is now read FRESH (`freshWording`, the
  row re-read) and a read that cannot answer refuses the save (`source_unreadable`) rather than blanking a good line;
  (3) the wordings card still said "campaigns start using it in a later update"; (4) every claim injected the line — a
  real-wiring claim now saves it through the shipped setter and the shipped deps.
  Guard: `test:campaign-compose` §17.13–§17.20; `red:campaign-compose` 245/245 with nine new plants, each firing its
  own claim — the spec's "the save keeps a stale phrase" among them. ⚠️ OWED: the stale note's drive (1280 + 360) rides
  with U37c-2's Test-card drive.
  ▶ NEXT on the gate track: U37c (the typed test) — the last; then ENGINE-SPEC's order (U49s ∥ U38b).
  ✅ **OWNER ANSWERS, 2026-10-05 — Ali took twelve questions and three gates one at a time; eleven CONFIRM the built
  default.** Full record: `COMPLIANCE-DECISIONS.md` § "2026-10-05 · Marketing outreach rulings". In one line each:
  Q1 never-asked players ARE reached under the licence · Q2 the unticked-since-09-28 cohort IS reached, **after the
  registration box is reworded** · Q6/OQ11 an old-wording yes is NOT consent · Q7 no basis expiry (recycled-number risk
  accepted) · Q8 **the agent-referee exclusion IS to be built** · Q9 a lapse is not reached · Q11 typed tests only while
  open · Q12 growth officers record a basis · G12 Suppress is permanent · G3 stay inside the ledger cap and ask first ·
  G8 still NO real numbers on production · G5 the source line is "Namba yako ipo orodhani kwetu." (30 septets — the 58-character line first proposed was
  refused by the cap, corrected before anything was saved) · G9 the price is TZS 6 · G10 the DSAR sentence APPROVED (it corrects a published inaccuracy) · G4 the wordings
  to be drafted for him to paste and save.
  ⚠️ **THREE THINGS THE ANSWERS CREATED, none of them built yet:** (1) the registration box rewording (Q2); (2) the
  agent-referee exclusion (Q8) — until it exists a referee can be reached, against a written promise; (3) setting
  `SMS_PRICE_PER_SEGMENT_TZS=6` on Railway (G9).
  ⛔ **G7/G11 STAY OPEN — his own admin login was offered and refused.** An ADMIN/owner account bypasses role checks, so
  it cannot prove the role gating those gates exist to prove, and it would attribute every action to him. The 🔵 units
  stay 🔵 until a TOTP-enrolled GROWTH account exists.
  ⛔ THE THREE BUILDERS' SCRATCH OUTPUTS ARE NOT REACHABLE FROM EVERY MACHINE, AND ONE SESSION HAS ALREADY HAD TO
  REBUILD FROM SPEC. STEP 35 was built on **OMEGA-DEV072** (`C:\kipindi-main`, a THIRD machine — not Ali-Blade15, not
  OMEGA-COMPILE01), where `C:/Users/Ali/AppData/Local/Temp/...` does not exist: `u33r/`, `u430/` and `u16a/` could not
  be read at all. U43-0 was already live, so only U33a-R was needed and it was built FRESH from spec §5.3 · §6 · §7.7 ·
  §8 · §9. ⚠️ **U37s and U16a are still owed, and their drafts should be treated as LOST** unless Ali-Blade15 still
  holds that scratch root — a session scratchpad is pruned without warning (the ZAMEL lesson, same week). Rebuild them
  from spec rather than hunting for them.
  THE ADMIN GUIDE IS v1.3 (22 pages, was 20): a new section 7, "Licence outreach — who a campaign may reach", with the
  card photographed as an admin meets it today (Closed, its three remaining steps listed, Open not pressable), and six
  new rows in "Messages you may see". ⛔ ITS FIRST BUILD PHOTOGRAPHED THE WRONG CARD AND REPORTED 0 FAILURES: the step
  scrolled with `getByText("Licence outreach")`, which matches a SUBSTRING, and the policy-lines card above carries the
  hint "…once licence outreach is built". The locator is exact and scoped to `main` now, and it THROWS when the card is
  absent rather than shooting whatever is on screen. A screenshot count is not a screenshot — look at every one.

  ⚖️ A TECHNICAL CALL TAKEN ON ALI'S STANDING DELEGATION (2026-10-02), recorded because §0 asked the lead to decide it:
  **closing licence outreach is ANY admin's, not owner-only** — a stop that waits for one person is not a stop. Opening
  is the guarded act; closing is never refused for a failing check.
  ⚠️ `main` WAS ALREADY RED WHEN THIS SESSION OPENED, on gates nothing here touches — `test:type-scale` (+4 arbitrary
  `tracking-[…]` over its ratchet), `test:live-target-safe` (13 standalone scripts defaulting to production, ceiling 5),
  `test:red-anchors`, `test:decomment`, `test:kyc-copy-truth`, `test:stacking`, `test:updown-digest`,
  `test:updown-source-class`, `test:payout-view`, `test:eyebrow-roles`, `test:failure-reasons` and `test:orphans`. Each
  was re-run against a STASHED tree and fails on pristine `main` too, so they are somebody's unrun ratchets, not this
  unit's. Whoever picks the programme up next should clear them or they will keep masking real breakage.
  ▶ RESUME HERE, in order:
  1. Read `docs/marketing-specs/ENGINE-SPEC.md` §0 — the send engine and its monitoring, 18 units (~119–196 h), the
     parallel sets and the deploy order — and `docs/marketing-specs/U33a-U37c-OD58.md` §11 for the gate track still to
     build (U37s, U33a-R, U33a-G, U33a-P, U33b-L, U37c).
  2. THREE BUILDERS WERE IN FLIGHT when S10 paused; their outputs are UNREVIEWED DRAFTS and may be partial (the
     session's teardown stops them): U37s + U33a-R (`u33r/`), U43-0 (`u430/`), U16a (`u16a/`), under the scratch root
     `C:/Users/Ali/AppData/Local/Temp/claude/C--Users-Ali/83bc643c-a332-4527-ac4c-d62e1711c811/scratchpad/`. A complete
     `MANIFEST.md` ending in a summary is the sign one finished; otherwise re-launch it from its spec section. Nothing
     of theirs is merged or committed.
     ✔ U37s + U33a-R FINISHED after the pause (complete `u33r/MANIFEST.md`, base `31777791`, none of its files changed
     since): MERGE → adversarial review → battery — do not re-run it. Its open calls for the lead: close = any admin
     (recommended, so outreach stops at once) vs owner-only like U49s; apply its three-line `reloadRow` fix (a deleted
     malformed row left "couldn't be read" until the next write) to U33p's and U33w's stores too; its spec-vs-code items
     1–11; package.json — chain its outreach-record suite into predeploy right after the policy-lines suite, by hand.
     ✔ U43-0 FINISHED after the pause too (complete `u430/MANIFEST.md`; migration
     `20261004140000_sms_recipient_unconfirmed`, one `ALTER TYPE … ADD VALUE IF NOT EXISTS 'UNCONFIRMED'`; no package.json
     change — it extends `db:probe-campaign-models`): MERGE → adversarial review → `prisma generate` first → its battery +
     the whole chain (store.ts / prisma-dal.ts) → PUSH IT ALONE (check `git diff --stat origin/main..HEAD --
     prisma/migrations` shows only its folder; re-check its stamp sorts last) → prove it on production (the deploy log,
     `?dpl=`, and a READ ONLY read of the `_prisma_migrations` row and the enum ending in UNCONFIRMED) BEFORE U43b ships.
     ⇒ DONE: LIVE `bf166ff3`, proved on production — STEP 33.
     ✔ U16a FINISHED after the pause too (complete `u16a/MANIFEST.md`, base `2a0c311f`; its merge hunks do not overlap
     U43-0's): erasure UNLINKS campaign recipient rows (nothing deleted, tokens kept), the access export gains three
     campaign sections, retention two rows (7 years, policy only). MERGE → review → its battery (MANIFEST §9; `red:erasure`
     detached and alone) + the whole chain → push BEFORE U42. Add in the same commit: `test:campaign-privacy` (predeploy,
     after `test:erasure`), `red:campaign-privacy`, `db:probe-campaign-privacy` (via `pg-probe-run.mts`) and
     `qa:marketing-retention` — DATA-RETENTION names them and `test:docs` checks. Its D1–D9 become ODs. ⚖️ OWNER (G10,
     before the first real campaign): `/legal/privacy` §5 and the DSAR erasure sentence must say campaign records are
     kept 7 years — the suggested line is in its MANIFEST §6, not applied.
  3. THE PATTERN THAT WORKED (STEPS 30–32): a static builder agent (spec → complete files in scratch, no Node) → merge
     into the worktree (3-way `git merge-file` for package.json and shared docs) → ONE detached battery under the
     heavy-node lock (+ the drive, its tiles READ) → an adversarial reviewer agent on the SCRATCH copies → resume the
     SAME builder with the rulings → the final battery (the whole chain when a platform-wide file changes) → docs
     (STEP n, the §1 row, the §9 body, NEXT-PLAN) → `git commit --only` → push → watch `?dpl=` → smoke (a migration:
     read back on production in ONE `SET TRANSACTION READ ONLY` transaction).
  4. OWNER ACTS waiting on Ali (none blocks building): save the consent wordings (Admin → System → Marketing wordings)
     and the policy lines (→ Public policy lines) — G4/G10; the 13 OD59 questions and ENGINE-SPEC's 8 (each with its
     built default); "my authenticator works" (2-step back on before G2); G2's message, audience and day.
  ESTIMATE told to Ali 2026-10-04 (corrected the same morning): the first real campaign realistically 18–25 October.
  ⚠ TRAPS THIS STRETCH: a `timeout` around a lock WAIT made a battery run lockless and delete another session's lock —
  every wait gets a DEADLINE THAT EXITS, never one that proceeds; a detached battery lives at most two hours and a hard
  kill skips its trap — after a kill or a session restart, kill survivors by command line, remove the lock only while
  its owner still names the job, and `cmp` every file against its source (a red killed mid-run leaves its plant); the
  build can fail fetching Google Fonts (network — re-run); the dev server died once on a V8 heap check (this laptop's
  RAM — re-run); Git Bash heredocs mangle backslashes (build them with chr(92)); `test:house-bot-disclosure` §5.1 is red
  for ANY uncommitted edit to a legal page until it is pushed (by design).

🟡 S10 IN FLIGHT — 2026-10-01, Ali-Blade15, worktree `C:/kipindi-marketing`, branch `marketing-s10` (pushed
  `HEAD:main` step by step). Ali: "proceed with other sessions in parallel, push live, prove it".
  ✅ STEP 1 · THE CONSENT TIE IS FIXED (◐ HALF-DONE item 1 below, the S8 finding). Decided on Ali's standing
  delegation of technical calls, because the alternative (leave it) let U18b's erasure writes land on a coin
  flip. `src/lib/server/marketing/ledger-stamp.ts` is now the ledger's ONE clock: `createdAt` never steps
  back, and the id is fixed-width lowercase hex (clock 12 + in-millisecond counter 6 + random 14), so
  `createdAt desc, id desc` is exactly the order of writing, the same under byte order, `localeCompare`
  and Postgres' `en_US` collation. Both writers (`consent-ledger.ts`, `optout-service.ts`) spread
  `...ledgerStamp()`. MEASURED BY DISCRIMINATION, in-process: 400 back-to-back appends, 390 of them
  sharing a millisecond — the pre-fix writer read back WRONG 249 times, the fix 0 times.
  Guards: `test:marketing-consent-ledger` §9/§10 (16/16 red cases caught, two of them the tie: the old
  writer, and the clock with a random id), and `test:dal-parity` §20 (every `db.messagingConsent.create(`
  caller in `src/` is a declared writer and takes the stamp; `red:dal-parity` 56/56 incl. 3 new). ⚠️ The
  order is per PROCESS; production runs one instance. Rows written before the fix keep their random ids.
  ✅ STEP 2 · U18b (`0e68d59e`, then REWORKED after an adversarial review — see below) — the book inside
  erasure and the data export (U18's other half). `marketing/erase.ts`, called from `anonymizeClosedAccount`
  BEFORE the phone tombstone: for every number the person is known by (the account's, and each linked book
  row's) whose latest ledger row is GIVEN, a WITHDRAWN row recorded by the officer (`fulfillDsarRequest`
  now passes it; third declared writer in §20); every book row found by LINK, or by the account NUMBER
  when nobody else's, EMPTIED (kept, holding only the number; the consent cache mirrors the ledger).
  `marketing/dsar.ts` — one allowlist, both access doors (`buildDsarBundle`, `exportUserData`) carry
  `marketing`. `listByUserId` in both DALs. The memory store now re-keys a changed phone (as Postgres
  does), so suites finally run the LEDGER branch an erased number takes on production.
  🔎 THE REVIEW (a refuting agent, before the push) CONFIRMED FOUR DEFECTS IN THE FIRST CUT, all fixed:
  (1) the first cut wrote an OPERATOR stop — liftable by NOBODY — so a recycled number's next owner (TZ
  operators recycle numbers) would tick yes and be refused for ever with the switch reading ON. ⛔ Now no
  stop is written; the WITHDRAWN refuses the erased person and gives way to a new person's consent
  (12.4, 12.9c). (2) the export read every record keyed by the number, so a new owner's own download held
  the last holder's history and erasure row — now bounded to the account's creation (12.9d, 12.10d),
  staff notes withheld. (3) the sweep allowlisted whole marketing buckets, so a name in a ledger row's
  evidence would pass — now key columns are masked in strict buckets and allowlisted alone. (4) an erased
  account's tombstone (`erased:usr_712345678bcd`) normalised naively to a STRANGER's valid number — keys
  now come only from `parseTzNumber` (`marketingKeyOf`, 12.9b). Also: another live account's number is
  never withdrawn (12.16), and idempotency is proven by calling the step twice (12.15; 9.3's zeros pass by
  construction). `test:erasure` 226 → 335. `red:erasure` 20 → 29 anchors.
  🔎 A SECOND REVIEW ROUND (same agent, on the rework) — fixed: an emptied row is marked `sourceRef =
  erasure` and U31's text now collapses such a row to KEEP (the first cut's stop had been doing that job);
  the export applies erasure's holder check to a linked row's old number (12.16b); a stop refusing the
  person today is listed undated whatever its age (a re-armed stop keeps its first `createdAt`, 12.10e/f);
  the account key is read exactly as the ledger writers key it (`toMsisdn255` + a 255[67]+8 check, so a
  064 number still finds its rows); the memory re-key refuses a phone another account holds (Postgres'
  P2002). ⚖️ Recorded asymmetry: erasure empties an unlinked row found by number WHATEVER its age (when in
  doubt, erase); the export withholds one older than the account (when in doubt, do not disclose).
  `test:erasure` 338, `red:erasure` 33 anchors.
  ⭐ ALI, 2026-10-02 (mid-S10): "take any decision needed as per architecture and keep pushing live" — every
  technical and architectural call is the session's, recorded in §4 / §9 and pushed; a gate below whose SAFE default
  is already built (G5 book recipients refused, G6 old wording refused, G9 "not yet measured", G12 suppress
  permanent) does not stop the build. What still needs his own hand: G1 (the first live send, to his phone), G7 (a
  production staff login), and the legal/public wordings (G4, G5, G10).
  ❓ FOR ALI — THE OWNER GATES G1–G12, ONE LIST (DECISIONS-U29-U40; his alone — the build STOPS at each):
  G1 · the first OPEN of the live switch `marketing.sms.live` (absent = CLOSED) — recommended: his own test, own number.
  G2 · the first real campaign start to real players (U42/U43/U47/U52) — CONFIRMED (U40) never implies sending.
  G3 · real spend beyond the §11.4 ledger cap, or any Blackball top-up (each test send after G1 costs TZS 6).
  G4 · U33's four consent-basis wordings + the 18+ sentence (append-only evidence); until then nothing live imports them.
  G5 · OQ3 — the source phrase in the SMS body; until answered it is priced in, and a book recipient without one refused.
  G6 · OQ11 — whether a yes given under the old wording counts as SMS consent (the gate refuses it as built).
  G7 · a production QA GROWTH staff account (TOTP-enrolled, never his login) for live checks and U32's ping measurement.
  G8 · which real phone numbers a live production import may write, and their removal after (unanswered = none).
  G9 · setting SMS_PRICE_PER_SEGMENT_TZS on Railway — a configured money figure in front of officers (U39).
  G10 · public/DSAR text — the DSAR `rights.erasure` sentence says "we erase your contact details", but since U18b the
        number is KEPT in the ledger and the emptied book row. Proposed, not shipped: "We keep your phone number only in
        our record of your marketing choices, so that we never send you marketing again." Plus any wording U29b's staged
        rows add to the access export (DATA-RETENTION.md may gain rows; no published period changes).
  G11 · every 🔵 → ✅ that needs an admin session on www.50pick.tz (U17, U20, U34, U36–U40): no QA admin; his login unused.
  G12 · officer "Suppress" (U23) permanence — BUILT unless he rules otherwise: an OPERATOR stop nobody can lift (the
        recycled-number trap S10 removed from erasure) — a staff decision recorded with the officer's name, not the
        person's to undo — and U23's confirmation says so in words.
  ⚠️ Not reached, owned by U16 (S20): accounts erased BEFORE this (their number is gone from `User`),
  `MarketingOptOutToken`, a retention period for untouched book rows, the `/admin/retention` table.
  ✅ STEP 3 · `red:rbac` (`be0a82ac`) — U17's §7b control made durable (2/2 in-process).
  ✅ STEP 4 · U19 SHIPPED (`addf5351`) — `contactPhone` in the registry (a CONTACT id, `MarketingContact`
  targetType, re-read through `db.marketingContact.find`); ONE mask for every spelling (`maskPhone` reads a
  bare `255…` key as `+255…`, which also fixed the SMS refusal audit, the delivery-receipt audit and the
  opt-out mint log — all printed `2557••••NN`); `<Sensitive copyable>` → Copy on the `read` branch only,
  through the audited reveal. `test:read-tiers` 8.22–8.25 (79/79), `red:read-tiers` +4 anchors.
  ✅ STEP 5 · U20 SHIPPED (`733522d3`, 🔵 — its live check needs an admin session, G11) — the book's list,
  server-paged, searched by a WHOLE number in any spelling or by name; D19 fixed before it shipped (row-by-row
  player signals only for a viewer whose identity.contact cell is `read`).
  ✅ STEP 6 · THE DECISIONS, THEN THE FIRST BUILD TRANCHE (`0dc25b98`, with `006c31bb`, merged with main in `f40b804e`).
  Two read-only design workflows (U21–U28, then U29–U40: one spec agent per unit, then a critic over each set)
  found 26 + 29 conflicts between the specs; every one is decided in §9 (A1.1–A1.8, X1–X29, M1–M16), and the calls
  taken while building are §4's OD47–OD52. Then, each unit adversarially reviewed BEFORE the push (the findings
  fixed by agents, every fix run here — agents on this laptop run no Node), each with its own in-process red proof:
  · U24 commit 1 — the ONE resolver: `test:contacts-audience` 37/37, `red:contacts-audience` 15/15;
    dal-parity §21 (1667/1667; `red:dal-parity` 64/64); a Postgres probe 21/21 after every migration from EMPTY.
  · U28a + U27a — the field list, the CSV writer, the parsed shape, the Excel limits: `test:contacts-import`
    78/78 (`red` 82/82), `test:contacts-boundary` 35/35 (`red` 28/28).
  · U31-A — decide(), the erasure disguise reworked after review (OD47). · U33a — the consent-basis catalogue,
    DRAFTS until G4 (OD50): `test:marketing-consent` 133/133 (`red` 77/77). · U35a — `SmsPurpose.MARKETING`
    in its own migration: `test:campaign-models` 4/4 (`red` 3/3). · U37a — the renderer, one campaign
    one verdict (OD48, OD49): `test:campaign-compose` all 135 checks (`red` 106/106 proofs). · U39a — the estimate:
    `test:campaign-estimate` 34/34, 0 send requests (`red` 27/27). · U40 — the confirmation's pure rule:
    `test:campaign-confirm` 46/46 (`red` 48/48).
  🔴 THE BATTERY CAUGHT WHAT NO SUITE COULD (`006c31bb`): `tsx` strips types without checking them, so a U24 line that
  did not typecheck passed every suite; the generated Prisma client predated U35a's enum value (production
  regenerates it on install); and a test file cited a suite that does not exist yet (`test:guards-exist`). And
  `red:marketing-setup-plan` had stood at 27/28 since S10's own rewrite of the ◐ HALF-DONE line: one plant was
  anchored on the line's colon and silently stopped applying — re-anchored on the marker in this push (28/28).
  ⭐ AND A PLATFORM FIX THE SCREENSHOTS FOUND (`006c31bb`): every admin table's zero-row message sat off-centre at phone
  width wherever its table cannot scroll (`AdminTableEmpty`'s visible-strip cap assumed a padded card) — measured
  centred on 8 admin pages at 360 and 1280, with an in-page control that puts the old cap back and sees it lopsided.
  ⚠️ None of these units is ✅ — each is the first part of its row (🟡 on §1), and nothing a player sees changed.
  ✅ LIVE: `ea87308f` served by production 3 minutes after the push — proved by what REVERSES, not by the build id
  alone: the live stylesheet carries the new empty-state rule (`data-table-empty-pin`), which no earlier build had.
  ✅ STEP 7 · U24 COMMIT 2 (`c792901e`) — `mirrorContactCache`: the book's `consentState` and `suppressedAt` are a COPY of
  the ledger's latest word and the active stop, and no writer touched them (after a /s/ stop the row still read
  GIVEN and unsuppressed). Now every writer mirrors them — the opt-out page's stop and start-again (in a `finally`,
  so a half-landed stop still shows suppressed and an `already` retry repairs), the ledger's one append, the
  profile lift, erasure (the stop included) and the dev seed. `test:contacts-audience` 45/45 (§6 executes each
  writer; the population holds every src writer of either store), `red:contacts-audience` 21/21; on Postgres a
  stale row is put back at the stop's own millisecond and the second call is a READ (probe 24/24); `red:erasure`
  33/33. ✅ U24 LIVE 2026-10-02: production serves `0e60952a`; `/s/` renders on the new module graph.
  ✅ THE WHOLE `predeploy` CHAIN — 186 commands, each run on its own so one red cannot hide the next — green on
  `0e60952a`, the tree production serves: the tranche broke no other lane's gate.
  ✅ STEP 8 · U26 (`b4faac34`) — the vCard reader: quoted-printable breaks and folding decided in ONE walk (separate
  passes lose data in both orders), every TEL kept in preference order with the first sendable one chosen, card
  ordinals as lines and skipped cards in `unreadable`, a streaming reader that never holds a 1 MB PHOTO.
  `test:contacts-import` 118/118 across 3 sections (40 vCard), `red:contacts-import` 120/120 (+38). 🔵 until a
  real `.vcf` is parsed on production (U30/U32).
  ✅ STEP 9 · U21 (`c0cce85a`) — the filter rail: six axes over the ONE resolver, every pill through `contactsHref`,
  role-shaped (no Consent or Source axis for a masked viewer), the Operator column from the one numbering table,
  and the rail kept on screen through a no-match, a refused filter and a failed read. `test:contacts-page` 42/42
  (red 25/25), `test:filter-language` 271 (red 39/39, file-mutating, every file restored), the drive 150/150 at
  1280 and 360. 🔵 — its live check needs an admin session (G7 / G11).
  ✅ STEP 10 · U21 AFTER ITS OWN REVIEW (`bb83acf9`) — the builder had the shipped rail refuted by a second agent (0
  blockers, 1 major, 7 minor): six fixed (Clear filters on a failed read; long labels clipped with the full text in
  the title; two new tests and five plants; a drive stall; a false comment), two declined with reasons (§9 U21).
  🔴 `test:type-scale` §3 HAD GONE 744 → 754 since its ratchet (2026-09-19): five were THIS lane's — the contacts
  page's filtered line, its "N lists" and "+N" counts, the rail foot (all 11px captions on reading copy) and U19's
  icon-only Copy button — all lifted or freed here (§3 = 749). The other +5, and §6's +4 arbitrary tracking, sit in
  other lanes' files (the house-bots desk pages, `admin/finance`, `admin/reports`, two Vodacom sites). The ratchet is
  not in `predeploy`, so nothing is blocked; those lanes own their sites.
  ✅ STEP 11 · U25 (`928265b9`) — the CSV reader: incremental (any chunking equals the whole parse, each character
  tokenized ONCE — 150,000 rows in 4,093-character chunks), the delimiter voted outside quotes on the first record,
  `sep=` honoured and hidden, utf-8 / utf-16 / windows-1252 sniffed, content beating the file name. `test:contacts-import`
  164/164 across 4 sections (46 CSV), `red:contacts-import` 169/169 (+49). 🔵 until a real CSV is parsed on production.
  ⚠️ The first commit took the builder's files minutes before its last three edits (a note's wording, a narrowing,
  a comment); `21c72715` is the final text, the same counts re-run. ⛔ Copy an agent's files only after its REPORT.
  ✅ STEP 12 · U28b, FIRST HALF (`a0535f80`) — the samples back through the REAL readers, never a parser of the suite's own:
  the CSV sample (BOM stripped, its first header resolving to Phone), its Swahili-header and `sep=;` variants through
  U25, and the sample vCard through U26 with no header row and card 1 surviving (A1.2) — each to the literal drafts.
  `test:contacts-import` 168/168, `red:contacts-import` 173/173 (+4). The A1.3 xlsx case waits for U27b.
  🔴 PREDEPLOY WAS RED FOR AN HOUR, AND THE MISS WAS THE LEAD'S (fixed `b7bdc7db`): U25's sniffer listed the literal
  "<" + "table" as DATA, `test:ui-consistency` (a `predeploy` step) read it as a hand-rolled table element, and U25's
  battery had not run that suite. ⛔ From here every push first runs the WHOLE `predeploy` chain (186 commands, each on
  its own) on the tree being pushed — a unit battery names the unit's suites, not the repo's scanners.
  ✅ STEP 13 · U22 (`e4f04528`) — add and edit ONE contact: `newContactRow` (X6) then `mirrorContactCache`, no ledger row and
  no link ever written by the form, no consent control, the unique index as the duplicate check (a race included), a
  player's number answering like a stranger's (D19), erased numbers refused with no id and missing to `?edit=`
  (C3 / A1.7), compare-and-set edits with an explicit `updatedAt` (C25), the live number verdict from the one table,
  `contactEmail` masked (M5), and no consent value anywhere for a masked viewer (A1.1). `test:contacts-form` 42/42
  (red 23/23), dal-parity §22 (red 67/67), the drive 279/279 at 1280 and 360. 🔵 — its live check needs G7 / G11.
  ✅ STEP 14 · U22 AFTER AN ADVERSARIAL REVIEW (`03919fa2`): a paste MERGED into digits already in the box no longer
  governs (`governingPaste` — the lookup and the save get the number the box shows; a pasted +254… is still judged
  before truncation), the dialog's Save and email toggle obey the act gate, and a refused email focuses its input.
  `test:contacts-form` 44/44 (red 25/25). Deferred (recorded in §9 U22): typed fields pass through U28's CSV unguard.
  ✅ STEP 15 · U27b (`2438d66a`) — the XLSX reader, server-side: the exact size gate (A1.4) before any decode, a zip
  pre-pass that inflates every entry for real under one budget (a bomb with a forged size is refused) and counts rows
  and cells before exceljs builds anything, exceljs in memory, the first visible sheet, sheet rows as lines, one typed
  cell switch, and A1.3 (a numeric 255713000000 reads 2.55713E+11, so U28's one detector refuses it — never a stranger's
  number). `test:contacts-import` 200/200 across 5 sections, `red:contacts-import` 211/211 (+38). MEASURED: the densest
  ~700 KB workbook holds 59,377 rows (322 ms, heap +108 MB), the realistic one 28,604 — every cap at least twice the
  densest. U27 and U28 are 🔵: complete, waiting for U30 to reach them on production.
  ⭐ A PLATFORM FIX FOUND ON THE WAY (`75324dde`, outside this programme's units): a failed sign-in or sign-up never
  marked the refused field for a screen reader — the Input atom derives aria-invalid from `error` alone and drops a
  caller's own — so /auth/login's identifier and /auth/register's phone and email pass `error` now. Proved by
  discrimination (`scripts/live/auth-invalid-probe.mjs`: before, 4 FAIL; after, 8/8).
  ✅ STEP 16 · U23 (`2809af63` + `9caf4646`) — selection and bulk: ticks that survive paging, or "all N matching", which carries
  the FILTER (never a list of ids); tag · untag · add to a list · record a withdrawal · suppress · remove. The server
  recounts on every request (a forged count of 3 for 60 ticked rows changes nothing), an audience that moved since the
  preview is refused `confirm_mismatch`, the typed word is the SERVER's count, the 1,000 per-number cap is checked
  before any write, one audit row with the number masked. Set-based in both twins (`tagWhere` / `untagWhere` /
  `addWhere` / `removeWhere`) and PROVED ON POSTGRES — `contacts-audience-pg-probe` §6, 38/38: the `::timestamptz` and
  `::int` casts, the tag cap inside the statement, `skipDuplicates` keeping a member's first `addedAt`, the P2003
  row-by-row retry forced through a trigger, the cascade, and no evidence deleted. Each row gains an "edit" link (the
  id, never the number — §9 U22's owed item). `test:contacts-bulk` 30/30 (red 16/16), dal-parity 1701/1701 (§23, red
  75 anchors), the drive 419/419 at 1280 and 360. 🔵 — its live check needs G7 / G11. ⚠️ FOUND ON THE WAY:
  `test:popup-fit` had been red since `e4f04528` (the contact form's Modal was never reviewed) and no chain runs it —
  fixed in the same commit; the typecheck caught one circular inference the static builder could not (TS7022).
  ⭐ TWO PLATFORM FIXES FOUND ON THE WAY (outside this programme's units), each one caught by the U23 drive:
  1. THE CONSOLE IS ENGLISH (`c4df0f21`). The kit words admin pages borrow through `useT()` — every dialog's
     Cancel and Close, a typed confirmation's "Type 49 to confirm" — followed the PLAYER default (Swahili) or a player
     cookie: U23's bar asked "Andika 49 kuthibitisha" above an English sentence, and 41 admin files mount the shared
     dialogs. The admin layout wraps both render paths in a PINNED English provider with `lang="en"`; the desk rail's
     own unpinned provider is gone (inside the pinned console it would have handed that rail back to the cookie).
     `test:i18n` holds it, each check with a control; the drive runs U23 with a Swahili cookie in the browser.
  2. ONE ROLE-GRANT STORE PER PROCESS (`a986dd58`). `rbac.ts` kept its grant caches in module-scope `let`s, and
     Next.js gives route handlers a different module instance from pages — so with a database, a grant edited on
     /admin/roles never reached an `/api/admin/*` route until a restart (a revoked view still answered there); with
     none, U23's view-only state waited on a page that never saw the grant. Pinned on `globalThis`, the idiom the
     store and the email outbox already use; `test:rbac` §14 loads a second instance and each sees the other's writes.
  ⚖️ U23 AFTER AN ADVERSARIAL REVIEW (`9caf4646`; 2 MAJOR, 4 MINOR, no blocker — every one fixed): F1 the KPI band's
  consent split answered per row once one row could be written (tick ONE, withdraw it, watch "Consent given") — a masked
  viewer now gets the book's size and its stops only (OD53); F2 a per-number run that died mid-way wrote no audit row and
  left the number it died on unmirrored — now ONE audit row marked partial, the mirror in `finally`; F3 "and N more" stood
  under a typed confirmation that listed nobody; F4 the per-number walk could hold more than the recount (refused now,
  before any write); F5 "select all matching" let go of ticks made under another filter silently (said now); F6 a rolling
  window cleared "all matching" every minute (the filter's identity is the address's now). `test:contacts-bulk` gains
  B17–B19, S8–S10 and plants R17–R21. ⚠️ The review also showed D19 reaches SUPPRESSION (OD54, decided, built next).
  ⭐ AND A REPO-WIDE SWEEP IT LED TO: three regexes whose word boundary a file-writing tool had decoded into a raw
  BACKSPACE could never match — `test:deploy-skew` §2g (the double-submit guard), `test:house-bot-console` 1.541's control,
  the house-bot panel drive's pager filter — each green and blind. Fixed (`8de52856`); NEW `test:source-bytes` (in predeploy) refuses
  a backspace, vertical tab or form feed anywhere in src/, scripts/ or prisma/, and any other raw control character
  outside five named fixtures.
  ✅ LIVE 2026-10-02 05:20:28 UTC (`36aa9bf0`, after the whole predeploy chain: 189/189 + the plan's red proof).
  Proved by reversal, not by a build id alone: production's Link header moved `?dpl=22770e8a` → `?dpl=36aa9bf0`, and the
  provider chunk every page loads now opens its cookie effect with the pinned branch (`if(s)return;` before the
  cookie read) that the old source never had. Public pages and `/api/health` answer 200; `/admin/*` still redirects
  to sign-in. The admin screens themselves stay 🔵 until a staff login exists on production (G7 / G11).
  ✅ STEP 17 · U35b (`bfc37a74`) — the campaign tables, in both twins behind ONE rule set (`campaign-model.ts`):
  `SmsCampaign` born a blank DRAFT, saved by compare-and-set on `draftRevision`, moved only by ONE conditional write
  (`status in from` — two racing writers, one winner), its confirmation keys written only on DRAFT → CONFIRMED, all at
  once; `SmsCampaignRecipient` unique on (campaignId, msisdn) — a restarted enqueue dedupes on the key — with the
  contact and account LINKS set null (never a copy, never a cascade) and the campaign link RESTRICT; no stored counter.
  Migration `20261002120000_sms_campaign_models` hand-written and expand-only; all 92 migrations proven from EMPTY on
  embedded PostgreSQL 18.3 with a drift diff naming none of the new objects; the campaign probe 13/13 on Postgres and
  the contacts probe 38/38 beside it. `test:campaign-models` 29/29 (red 32/32), dal-parity 1863/1863 (§26; red 101/101).
  The typecheck caught one inference the static builder could not (TS7006, a store read widened by `??`). 🔵 — the live
  check is the migration on production — ✅ MET 2026-10-02 06:05:54 UTC: production's deploy log reads "Applying migration
  `20261002120000_sms_campaign_models` … All migrations have been successfully applied", on `df839f30`. ⚠️ The FIRST
  build of that push FAILED and production kept serving `36aa9bf0` for 20 minutes: Turbopack could not fetch the Google
  font `next/font/google` downloads at BUILD time (fonts.gstatic.com) — nothing in the code. Found with the Railway CLI
  (`railway deployment list`, then the build log) and rebuilt with `railway redeploy --from-source`. A push is live only
  when `?dpl=` says so; a failed build also blocks every later push until it is rebuilt.
  ✅ OD54 (`ef72dcd7`) — D19 covers SUPPRESSION: for a viewer whose identity.contact cell is not `read`, `roleRefusal`
  refuses `suppressed` (yes and no alike) before any row is read, at the page and on U23's POSTed audience; the rail is
  Operator · List · Tag; no row names a stop; the masked KPI band is "In the book" + "Added in the last 7 days"; a masked
  officer may still suppress and is told the total only. `test:contacts-page` +5b/9h/13b (red 35/35), `test:contacts-bulk`
  +B14c/B14d (red 25/25), `test:contacts-audience` +2.16 (red 22/22); the drive re-cut and confirming one suppression per
  width on its own fixture row. Readers keep everything.
  ✅ STEP 18 · U29 (`dbdc0018` + `3dd4f399`) — import staging: ONE model (`ContactImport`, `ContactImportRow`) in both twins and its
  server service, writing NO contact, consent or stop. `stageRows` applies the cursor's compare-and-set FIRST, with the
  inserts, in one short transaction — two tabs or a retried request stage a batch once, a duplicate line rolls the whole
  batch back; `after` is a keyset on ordinal. Both caps (2,000 rows AND 200 KiB) are asked before the run is read; every
  key is re-derived on the server against the STORED mapping; the sweep never touches a PAUSED commit. PROVED ON POSTGRES
  IN TWO PROCESSES (`test:contacts-staging-db`): a fresh process — the redeploy — resumes a half-staged 10,000-row run at
  `stagedThrough + 1` with totals equal to a recount; racing stage calls and racing transitions each leave one winner;
  ~165 ms a 2,000-row batch. `test:contacts-staging` 30/30 (red 10/10), dal-parity §24 (red 107/107), all 93 migrations
  from empty. Its migration was renamed `20261002130000_…` so it sorts after U35b's, already on production. predeploy
  gains `test:contacts-staging`, `test:erasure`, `test:read-tiers` and `test:client-graph-safe` (M10 / OD51).
  ⚖️ U29 AFTER AN ADVERSARIAL REVIEW (`3dd4f399`; 1 MAJOR, 6 MINOR, 1 NIT, no blocker): F2 (MAJOR, Postgres only)
  a NUL in a phone, email or tag cell — a vCard's `=00`, a CSV past the binary sniff — made Postgres refuse the WHOLE
  batch on every resume, wedging the run; every cell is cleaned before drafting and a line past the 32-bit integer is
  refused before the database (probe B.11 on Postgres). F1 only a well-formed run id reaches the signed audit chain;
  F3 adoption compares the mapping too; F4 the later of two open runs is refused `superseded`; F5 the access export
  reads newest first; F9 the byte cap stops at the cap instead of stringifying a forged batch whole. Found with it: the
  shared email shape let control characters through (U22's form too) — refused now. `test:contacts-staging` 36/36 (red
  16/16). ⏳ Owed: a PAUSED or COMMITTING run has no retention period until U32 settles it (recorded in DATA-RETENTION).
  ✅ U29 LIVE 2026-10-02 06:42:34 UTC — production serves `81102ce8` and its deploy log applied
  `20261002130000_contact_import_staging` ("All migrations have been successfully applied"). U29 ✅; 17/52.
  ✅ STEP 19 · U34a (`d8fce713` + its review `95a48ae6`) — the contact book as a CSV: GET /api/admin/contacts/export, the
  viewer decided on the STORED row (never the cookie's role), the second factor, U24's one parser and one role rule
  (OD54 included), columns from U28's one list — a masked viewer gets the phone and email masked, no consent, no
  source, and (after the review) every number or email inside a name, a tag or a note masked too; pii.revealed and
  contacts.exported AWAITED before the first byte (503 with no file if a row did not record); a keyset walk capped at
  the audited count; the export's own instant bounds the window (X7); 200,000 the ceiling; U28's one writer, the BOM
  once, the file read back through U25's real reader. ⚖️ ITS REVIEW (1 MAJOR, 5 MINOR): a link on ANY site could make
  a signed-in officer's browser start the export and write a permanent bulk-reveal row in their name (SameSite=Lax
  cookies ride a top-level navigation) — the route now refuses a cross-site request and a HEAD before the session is
  read, and the TRANSACTIONS export, which had the same live hole, got the same gate (`test:read-tiers` 8.11b); U24's
  audit scrub now catches a spaced or hyphenated number; a cancelled download is not logged as a failed walk.
  `test:contacts-export` 39/39 (red 24/24), the drive 483/483 — both files downloaded and parsed in a real browser,
  through the gate; a cross-site fetch and a HEAD measured 404. 🟡 — U34b, the round trip, follows U30/U31.
  ✅ OD56 (`980ebbce`) — the cache mirror writes the row's own `updatedAt` back, so a one-row suppress or withdrawal no
  longer moves the edit dialog's token (the side channel OD54's own review found); `test:contacts-audience` 6.6 + R23.
  ⛔ LOCK STARVATION (measured 2026-10-01): `~/heavy-node-lock.sh` waiters poll every 30 s, and a session
  running jobs back to back re-takes the lock within seconds of releasing it — S10's typecheck waited
  40+ minutes without once getting in. S10 ran its battery through the same mkdir protocol polling every
  2 s. Not fixed in the shared script (other sessions' waiters are inside it).

🔎 S9 — RECONSTRUCTED FROM ITS COMMITS (2026-09-28, office PC, branch `marketing-s9`, merged and gone).
  It shipped U17 (`7bef9f97`) and U18a (`fb194038`) to `main` — both LIVE since that day — and ended
  without touching this file, so §0 still said "NEXT: U17 and U18" for three days. ⛔ LESSON: the tracker
  rides in the SAME push as the code, or the next session rebuilds it from `git log`.
  · U17 — /admin/contacts is SIX doors, not five: the page carries its OWN `AdminPageGate` (a layout gate
    alone is refused by `test:admin-section-gate` §0b′); `test:rbac` §7b (NEW) asserts each nav item's
    `domain` equals `domainForPath(href)` — the two were independent copies, so deleting the
    `ROUTE_DOMAINS` row refused the page while the sidebar still showed the link; `test:admin-nav` joined
    `predeploy`. The skeleton equals the real block BY CONSTRUCTION (230.38 px both at 1280, 272.63 at
    360). The `filter-language` entry moves to U21 (declaring a page with no FilterPill fails §6). States
    driven: loading, empty, refused — `populated` and `error` are U20's (no store to fill or fail yet).
    ⚠️ 🔵, not ✅: the live check needs an admin session — production has no QA admin, only Ali's own
    login (⛔ never used). S10 added the durable red control S9 lacked: `red:rbac` (in-process, 2/2).
  · U18a — `MarketingContact`, `ContactList`, `ContactListMember` in `schema.prisma`, both DALs (named
    types) and `test:dal-parity` §19, with 8 new `red:dal-parity` cases. Migration
    `20260928170000_marketing_contact_book` hand-written, all 86 migrations proven from EMPTY on embedded
    PostgreSQL 18.3. `consentState` is a NEW enum (`ContactConsentState`: UNKNOWN/GIVEN/WITHDRAWN) and only
    a CACHE — the gate asks the ledger. `userId` is `onDelete: SetNull`, never Cascade.
  · ⛔ U18 IS NOT DONE: U18b owes the erasure, retention and DSAR-export arms (S9: "§1 does not tick until it
    lands"). No contact writer exists yet, so nothing has been written under the tie.

✅ S7c IS LIVE — shipped 2026-09-28 as `d3379fef` (session S8, office PC OMEGA-COMPILE01, worktree
  `F:/kipindi-s8`, branch `marketing-s8`). PROVED BY DISCRIMINATION, never by a build id alone: before the
  push /auth/register served the OLD sentence ("Nipe matangazo" 2 hits, the new one 0); after it, the NEW
  one ("Nitumie ofa na habari za 50pick kwa SMS" 2 hits, the old one 0), on `?dpl=d3379fef…`. A check that
  reads the same before and after proves nothing — this one reverses.

✅ STEP 20 · U36 LIVE (`06c21ac4`, its review fixes inside it; pushed as `db4a11a7`, live 2026-10-02 17:32:40 UTC) — the SMS campaign
  list: /admin/campaigns behind its six doors (the Growth item "SMS campaigns", ROUTE_KEYS, ROUTE_DOMAINS growth, the
  section gate, loading.tsx, the page gate), the status rail over the WHOLE table, server-counted progress (HELD is
  outstanding), stop reasons in words, and the nav badge read only for a growth viewer. No migration.
  ⚖️ ITS REVIEW (1 MAJOR, 2 MINOR): F1 a campaign confirmed then cancelled before it started painted "0 of 300
  prepared" — progress is null until the first row is written; F2 the loader parsed sort/dir untrimmed while every
  link trimmed them — one trim; F3 (the badge's plan) CLOSED BY MEASUREMENT — `campaigns-list-pg-probe` §9: on
  PostgreSQL 18 the relation filter is an index-only skip scan, a correlated EXISTS was planned as a hashed
  sequential scan (tried, reverted), and production runs 18 (Railway image `postgres-ssl:18`). Found while
  photographing it: at 1280 the seven columns ran 26px past the card and 16 of 20 names wrapped — fixed (progress
  152px, "Segments per SMS", the day over its clock), and the drive now measures the fit. `test:campaigns-page` 36/36
  (red 16/16), `red:dal-parity` 118/118, the probe 10/10, the drive 106/106. 🔵 — the ✅ needs the production look
  (G11). Recorded, not U36's: the badge goes stale across soft navigation like every sidebar badge; "Last activity"
  is the row's updatedAt, which U43's recipient writes will not move (U43/U47 decide).
✅ STEP 21 · U37b LIVE (`fb6cca81`, live 2026-10-02 20:21:16 UTC) — the composer at /admin/campaigns/new: one Message card (Swahili
  required, English optional, a live counter per language that sizes the worst case, the sender a read-only line), the
  save (re-validated on the server, the server's own coding and segments stored, compare-and-set on draftRevision,
  DRAFT-only, OD55), and the TEST SEND to the officer's OWN number only — through dispatchSlice and the one gate, behind
  the ONE live switch `marketing.sms.live` (ABSENT = CLOSED; no writer exists; opening it is G1, Ali's own act), 3 tests
  then one per 10 minutes, one reused opt-out link per number, one masked audit row per attempt, and "handed over" only
  when the gateway took it. CAMPAIGN_SCREENS.compose flipped in the same commit, so the list now offers "New campaign".
  ⚖️ ITS REVIEW (1 MAJOR, 5 MINOR — all fixed before the push): M1 the suite ran its own stand-ins for the switch, the
  token and the audit, so a switch hard-coded open in `CAMPAIGN_TEST_DEPS` stayed green — §18.5 now runs the shipped
  reader, §18.14 pins the five wires, §18.15/§18.16 run the shipped token rule and audit, each with its own plant; m2 an
  all-digit "campaign id" reached the never-pruned audit row — the row names only a campaign that was found; m3 a switch
  row with a key beside { enabledBy, enabledAt } read OPEN — it reads closed; m4 OD55 read only the canonical search key
  — a number in a tag, a list id, an import id or a padded search is refused too; m5 the save had no rate rule — it
  spends `marketing.campaignSave` (30, then 10 a minute) first; m6 the composer saved the first value of a repeated
  filter key while describing their union — it posts the parsed filter. Checked at the policy: typecheck; `test:campaign-compose` all checks and `red:campaign-compose` 164 proofs held; the compose drive 172/172 (console), 16/16 (switch closed, a carrier configured) and 10/10 (dead rail); the U36 drive 106/106; the section gate 21/21; `next build`; after the rebase onto main `b3153d98`, `test:dal-parity` 2041/2041 and the build again. Production reports 0 SMS sent.
  ⏳ OWED, recorded: a create whose reply is lost and is retried makes a second identical draft (no idempotency key yet —
  harmless, a draft sends nothing); U50 registers `marketing.campaign_created` / `marketing.campaign_test`; U15 allowlists
  the test send (M9); U14's cap excludes it (M12); U42/U43 adopt ensureOptOutToken, renderForRecipient and the switch.
  ⚠️ BEFORE G1: "own number" means the phone on the officer's account, and password registration does not prove a phone
  (the interim path) — for a staff account the guarantee rests on the Owner's promotion step.
  ⚠️ RECORDED, NOT THIS LANE'S: `test:house-bot-reports` (not in predeploy) fails 7 line-pinned checks 0.232.* — the
  positioned-write sites in market-service.ts moved under today's cash-out fix (`2bb881e0`), and 0.232.4 fails in both
  store twins; the house-bot lane owns those pins.
✅ STEP 22 · §25 + U38a LIVE (`bd097333`, live 2026-10-03 10:19:29 UTC) — critical-path steps 2 and 3a. §25: the four bulk keyed reads
  in both twins (`marketingContact.msisdnsPresent` keys only and NULL-safe on the erasure mark, `user.findByPhones` with
  the avatar omitted, `suppression.findActiveAmong` on `liftedAt: null`, `messagingConsent.latestAmong` in the ledger's
  own `createdAt desc, id desc`), duplicates folded, more than 2,000 keys REFUSED (never truncated), an empty set asked
  nothing; plus `user.playerWalk`, §21's keyset read for the player arm (PLAYER role and +255 numbers only, key-only).
  U38a: ONE resolver gains a `population` axis (book · players · both) — the same filter type, parser, key and describer;
  a book-only axis beside a population refused by name; the book's own doors refuse a population; ONE walk (the book by
  id, then players by id; cursor `b:` · `p:` · `done`, a digits-only id refused; a number in the book walked once, by its
  book row; tombstones, staff and non-+255 numbers never walked); `campaignAudienceCount` is the population U40 fences and
  U42 enqueues (X9); `audience-split.ts` asks the REAL gate about every number with only its three reads batched — counts
  counted, never derived; protected standing ONE line; past the 10 s budget the rest `unchecked`; one split per filter
  key and at most 2 per process; a sample of five in walk order, no per-row detail for a masked viewer; nothing written.
  X25 (D19): the campaign audience refuses ticked `ids` for every role and any `q` for a masked viewer. consent.ts gains
  a defaulted, frozen `reads`; the rg-doors line is byte-identical and the send loop still calls the gate with one
  argument. X24 REVERSED (decided 2026-10-02): U38a lands before U33a; book contacts read "not receiving" until then.
  ⚖️ The builder commissioned its own adversarial review (6 findings: a posted population read as a generic failure,
  ticked ids accepted at the campaign door, an overstated cost claim, no timeout on a split slot, reassignable read
  wiring, a store snapshot that recorded nested Maps as {}) — five fixed with plants, the slot timeout documented for
  U52 to size. Checked (focused): typecheck; `test:campaign-audience` with `red:campaign-audience` 24/24; `test:dal-parity` with `red:dal-parity` 140/140; the resolver and gate suites (contacts-audience, marketing-consent, rg-doors and contacts-bulk with their reds; filter-language, erasure, the contacts and campaign suites); `bulk-reads-pg-probe` 9/9 — its check 7 FOUND that Prisma reads a nested `OR: []` as no condition (an empty prefix list walked every player on Postgres; the memory twin walked none), fixed before the push with dal-parity pinning the early answer; the build, again after the rebase onto main `679acf72`.
  ⏳ OWED, recorded: U38b passes "campaign" to `parseContactAudienceJson` (composer-loader.ts, campaign-draft.ts) and
  uses `campaignAudienceCount` — until then a stored population reads "unreadable", the safe state; a masked viewer can
  still narrow the figures to one person through a tag, a list, an import or a very narrow window — a minimum audience
  size is U38b/U40's decision; U30 passes `excludeSourceRef: null` wherever tombstones count (X22); the RG, identity
  and harm reads are still one player at a time inside the gate (bounded by the budget and the 2-split limit) — U52
  measures them; AGENT accounts are not walked (PLAYER only, X9); `test:orphans` (not in predeploy) lists the unkeyed
  probe, like U24's and U36's.
✅ STEP 23 · EVERY CLIENT IS A CONTACT — LIVE (`08add760`, 2026-10-03 12:22:46 UTC). Ali, 2026-10-03: "every client is a
  contact in 50pick but not every contact is a client — like Awarkeh Mobiles, any number who registers to 50pick is
  added to contacts." Both sign-up doors now add the new client (role PLAYER, a +255 mobile) to the book — source
  REGISTRATION ("Signed up"), linked to the account, its consent cache mirrored from the ledger (never invented) —
  bounded at 1.5 s and never failing or slowing a sign-up; an officer's or an import's row for the number is LINKED,
  nothing typed overwritten; an erased tombstone is never revived and a row linked to another account is kept (U18b).
  ✅ THE PRODUCTION BACKFILL RAN the same day (Ali approving each run): dry run → 54 of 57 accounts walked (3 staff or
  agents not), 54 to create; the real run CREATED 54, failed 0, consent cache 41 already true and 13 repaired; a second
  dry run → created 0, already linked 54 (idempotent). Run under `railway run --service 50pick` so production's audit
  secret signed its rows (the chain takes a second writer: each append reads the DB head, `@@unique([prevHash])`).
  `test:registration-contact` 23 checks, red 25/25; the contacts drive 483/483. ⚖️ ACCEPTED under Ali's rule: with
  every client in the book, a whole-number lookup tells an officer a number is probably a client (the D19 cost the
  audit and the builder both named). ⚠️ Owed: on a recycled number a previous holder's typed name could reach the new
  client's data export once linked (U16); the schema comment at MarketingContact still says no name is copied.
✅ STEP 24 · A SAVED DRAFT REOPENS FROM THE LIST — LIVE (`c6282309`, 10:59:37 UTC). The validation audit's blocker: a
  DRAFT row's name opens the composer at its own ?draft= address (campaignDraftHref, from the ONE route table, behind
  the compose flag); every other row stays plain until U47. `test:campaigns-page` 5k + a plant; the drive 108/108.
✅ STEP 25 · VALIDATION BATCHES 5 + 8 — LIVE (`a3b98f26`, live 2026-10-03 15:17:14 UTC). Batch 5, the shared field rules: ONE phone rule in
  free text — `holdsPhoneRun` REFUSES a Tanzanian mobile number (any stretch of digit groups the numbering plan reads as
  one, through brackets, dots, dashes, no-break spaces, full-width digits and invisible characters) in a contact's name and
  tags, a new list's name, a consent proof note, a role change's reason and a campaign audience's text; `scrubPhoneRuns`
  MASKS every run of nine digits in a masked export and the audit chain (the bracketed, dotted, no-break and en-dash
  spellings the old mask let through). ONE email rule (`checkContactEmail`) for the contact form, the importer and the
  invites screen; the contact form says EVERY problem at once; a search of invisible characters only, or past 120
  characters, is refused (never the whole book), a lone quote searched literally. Its review (1 MAJOR, 5 MINOR), all
  fixed in the same push: M1 bulk Untag reads a tag as the book holds it, so a phone-number tag stored earlier can still
  be taken off; m1/m2 the name sentences say the fix ("remove the number"; a name may be left empty); m3 nine digits
  alone no longer refuse — a deposit band ("5000-10000"), a photo's name or a dotted date with a time pass, and are still
  masked; m4 the masked export is proven on every spelling; m5 an address's separator refusal states the rule; and a new
  list's name can't hold a phone number. OD55 reads the officer's text through the same refusal and ids through the mask.
  Batch 8, staff and invites: the add-staff phone is the kit PhoneInput (a pasted +255 number is reduced), every problem
  sits under its own field with the first one focused, and a refused form opens no confirmation and raises no toast; a
  reason is refused (never cut) past 500 characters or when it holds a phone number, and cleaned of control characters
  before the audit chain; the invites screen checks an email by the ONE rule on blur and says "an email or a phone" under
  Email. Production read-only count (m1, counts only): 57 contacts, all from sign-ups (3 joined through the hook since
  the backfill), 0 names and 0 tags holding a number, 0 lists — nothing to clean. Battery (focused): typecheck; contacts-import 208, contacts-audience 52, marketing-consent 133, contacts-form 44, contacts-bulk 40, contacts-export 39, campaign-compose, staff-role 35, invites 42 — each with its red (bulk 28/28, audience 30/30, the composer's 164 proofs); registration-contact, campaign-audience, the contacts page, staging and boundary, client-graph-safe, dal-parity, invite-flow, email-stress, read-tiers, single-save, hooks-order, admin-act-gate, search-adoption and ui-consistency green; red-anchors and validation-focus only their older reds (two other lanes' anchors; the affiliate form's 8 unstamped fields — fixed with batch 6); the contacts drive 483/483; the new staff + invites drive 24/24 (its first runs caught its own stale selector and scripted paste); next build.
✅ STEP 26 · VALIDATION BATCHES 3 + 4 — LIVE (`ffb92ace`, live 2026-10-03 15:30:24 UTC). Batch 3, one phone rule for every spelling: the trunk
  zero after +255 is dropped (a number cut short reads "too short — check whether some digits were cut off", never an
  invented 007 range); "too long" says what to fix; every refusal ends with the next step; another keyboard's digits
  are read through ONE table (phone-normalize's toAsciiDigits — house-bot's rules.ts imports it, and its import
  allowlist names it); PhoneInput REPLACES the box on a whole-number paste or one that would overflow it — never a mix
  of two numbers — while a short paste that fits inserts; the dispatch hands the wire the gate's own key; the contacts
  search reads "+255 0712 345 678". Batch 4, the composer: a name refuses a phone number only (dates and times pass) and
  says so before Save; a stale or no-longer-draft copy reloads only through a confirmation, "Save as a new draft"
  keeps the audience; the saved line invites a test only when one can go; the own-number remedy names the owner and
  Staff & roles. ONE PHONE DETECTOR: contact-fields' phoneNumberIn is the refusal's finding — holdsPhoneRun asks it and
  the campaign name calls it (vb4's private copy removed); digits from other keyboards are judged like any figure and
  masked to 0–9. ⚖️ Delegated: a single digit pasted into a full box replaces it (the box shows it, Save is off — no
  wrong number can be saved). ⚠️ Owed: PhoneInput keeps no caret through its reformat (older than vb3); the opt-out
  token mint keys on the gate's key before U42/U43; the Android clipboard chip, on a real phone. Battery (focused):
  typecheck; tz-msisdn, phone-normalize, marketing-consent, contacts-page, contacts-import (Arabic-Indic vectors,
  phoneNumberIn), campaign-compose and campaign-audience each with its red; contacts-form, house-bot-rules 577,
  read-tiers, client-graph-safe, the contacts suites, staff-role, ui-consistency, hooks-order, campaigns-page,
  campaign-models, pii-logs green; red-anchors and type-scale only their older reds (749/239 unchanged); the paste
  drive 21/21; the composer drive in three boots (console, live-closed, dead-rail); next build.
✅ STEP 27 · VALIDATION BATCH 6 — LIVE (`08da7cc6`, live 2026-10-03 16:16:10 UTC). A whole-number money box never
  multiplies, at the kit Input every admin and player money field inherits: a pasted "12,500.00" keeps 12500, a typed
  dot is refused and the digits typed straight after it dropped, a stray dot inside a number keeps every digit, the
  Field says so in en/sw/zh only when digits were really cut, a select-all replacement is never swallowed, the hold ends
  where the caret goes, the ideographic full stops read as a dot, the notice region is always mounted for screen readers.
  ⭐ THE LIVE DEFECT IT CLOSED: Players → a player → Adjust balance deleted dots, so a pasted "9,500.00" credited TZS
  950,000 — under the two-person threshold, one officer. Now the kit Field + Input (threshold, typed word, countersign,
  reason unchanged; the server re-validates on its own); the drive credited a pasted 9,500.00 as exactly TZS 9,500.
  The affiliate form's 8 money fields stamp their address (validation-focus §4.1 green for the first time); spacing-scale
  464 → 463. Two adversarial reviews (round 2: nothing MAJOR; 7 MINOR in a follow-up round — a comma typed after a
  refused dot, a comma-decimal paste, "Tsh. 9,500", the affiliate editor's own decimal cut, a stray dot in an empty
  deposit box trapping digits, two pins). Battery: typecheck; numeric 85, ui-consistency, unsaved-changes + red,
  lifecycle-e2e, i18n, labels, confirm-gate + red, campaign-confirm + red and 25 kit-reading suites green; the money
  drive 12/12, contacts 483, composer 198, staff + invites 24; next build. Older reds seen, other lanes': stacking z=11
  in globals.css (Vodacom S6 WP11, cb4e8c95), tap-target (datetime-range-filter, reports/generate-button),
  eyebrow-roles (the OG image route), decomment 24 > 20, red-anchors 2, type-scale 749/239.
✅ STEP 27b · BATCH 6 ROUND 3 — LIVE (`b236f422`, live 2026-10-03 17:54:08 UTC). The second review's seven MINORs:
  a comma or letter typed at a refused dot keeps the hold ("9500.,00" → 9500); a pasted comma before the last one or
  two digits is a decimal mark ("9 500,00" → 9500); "Tsh. 9,500" keeps 9500; the affiliate editor's boxes are plain
  whole-number kit boxes ("5000.50" → 5000); a stray "." in an EMPTY box no longer traps digits (the deposit form);
  a tap ends the hold; two pins tightened. numeric 98 judges each with a plant; the money drive 15/15 (the deposit
  box at 390 included); red:player-invite-unpaid left the affiliate file byte-identical. Owed (§A7): a typed comma
  decimal, a decimal box's Chinese full stop, DurationInput's "1.5".
✅ STEP 28 · VALIDATION BATCH 7 — LIVE (`ad0e7549`, live 2026-10-03 20:16:37 UTC). The contacts screens, 17 fixes (1
  major, 16 minor), the last batch. The Add / Edit dialog judges every field as it is typed (an email when its box is
  left, tags "N of 20", counters); Save waits with its reason beside it; an Edit with nothing changed can't be saved;
  ✕ / Cancel / leaving the page ask before typing is discarded; the optional fields carry the kit's optional mark
  (§A7); a paste longer than a phone number is refused whole; the notes refusal now writes "1,000" as the counter
  under the box does (it said "1000"). The automatic number lookup uses the new
  `softCheckStaff`: a lapsed 2-step is refused IN WORDS instead of redirecting the console mid-typing (it had to be
  live before admin 2-step returns — it now is). The search box reads a whole number ("Whole number — matched
  exactly", SearchBox's optional `describe`), and a search of excluded words alone reads "Name doesn't contain …".
  Bulk: the tag box holds 32, Untag offers the book's tags, a list name can't hold a phone number, Add to list starts
  empty, ticking a row in "All N matching" says the selection narrowed, the rail's Select reaches every list and tag
  past the 20 pills, and tag / untag / add-to-list / remove write ONLY the contacts counted at the confirmation (Remove
  in one Postgres transaction, 5,000 ids a chunk — the probe: all-or-nothing under a planted fault). Export refuses a
  filter the page never writes (nothing exported), says a read failure in words, and sends a lapsed 2-step to the
  step-up page. Verified: contacts-form 53, contacts-page 51, contacts-bulk 46, contacts-export 44, contacts-audience
  53, rbac 145, dal-parity 2066, admin-soft-gate 24 — each with its red; the contacts drive 487/487; next build; the
  live smoke (signed out: /admin/contacts → sign-in, the export door a bare 404). ⚖️ THE WHOLE PREDEPLOY CHAIN, ONCE
  (rbac-guard.ts is platform-wide — the policy's own trigger): 199 of 203 green; the four reds are other lanes' —
  `test:stacking` and `test:kyc-copy-truth` (Vodacom), `test:wallet-status-writers` 37 against its pin of 36 (the tax
  report's dev fixture `seed-tax-books`, d1b82f9a — batch 7 adds no wallet write), and `qa:live` (STEP 28b).
🔧 STEP 28b · qa:live's MARKET-CARD BLOCK RUNS AGAIN (`78f65958`, harness only). Since 8fc9c638 (2026-09-23, the cards
  lane) a market card opens through a stretched link laid over its body, so qa:live's element click on the question
  was refused and the script stopped there whenever the board had a market — the authed betting checks after it (the
  YES button's locked dial, the drag lock, the typed stake) never ran; on a fresh in-memory boot it said "no live card
  found" instead. qa:live now seeds the market catalogue on a local run and clicks the question at its POINT, as a
  finger does (the overlay takes it, which is what a player gets). On a fresh, unseeded boot: the served board held 0 cards, qa:live seeded the catalogue itself, and ALL 303 checks passed, the card block's 13 among them (the whole-chain run had 289 passed and 1 failed; a seeded run before the fix died at the click).
⚠️ RECORDED, NOT THIS LANE'S (seen in batch 7's runs, neither in predeploy): `test:unsaved-changes` is red on main for the
  tax report's three forms (`app/admin/tax/lock-panel.tsx`, `period-jump.tsx`, `rates-form.tsx` — d1b82f9a), so its
  red control proves nothing until that lane guards them; `test:red-anchors` has two anchors rotted since 2026-09-24
  (`query-bar.tsx`, the mobile lane; `updown-card-phase.ts`, Up & Down).
✅ STEP 29 · U33a-0 · THE PRE-LEDGER CENSUS = 0 (read-only, on production, 2026-10-03 ~21:05 UTC). The first unit of U33a's
  build order: `scripts/live/marketing-preledger-offs.mjs`, run by a scratch runner that reads both cutoffs from Railway
  (U6 `6429f86f` first deployed in `32067c92`, build created 2026-09-25 10:49:49 UTC; the next deploy 11:02:17) and reads
  through the Postgres public proxy; every query inside ONE `SET TRANSACTION READ ONLY` transaction (it reported
  `read-only: on`). Accounts whose latest own marketing-switch audit row is a withdrawal before the cutoff, with the
  switch off now and no later ledger row: 0 under either cutoff, and 0 with none. ⭐ THE CONTROL — the same read saw
  61,251 audit rows (10,629 COMPLIANCE) and NOT ONE `privacy.*` action: the profile switch and its audit action arrived
  together (`6f0495ef`, 2026-09-14, the E-409 window's first day) and no player ever changed it on production. So U33a-R
  ships `PRE_LEDGER_OFFS = "reconciled"`, citing this count; no backfill and no `preledger-withdrawals.ts` are needed.
✅ STEP 30 · U33w · THE CONSENT WORDINGS, EDITABLE — LIVE (`bdd02bb1`, live 2026-10-04 01:13:44 UTC). Admin → System
  gains a "Marketing wordings" tab: the ten
  wordings marketing evidence is recorded under — the five bases' per-person sentences (OWN_FORM, OWN_EVENT, AGENT_ROSTER,
  THIRD_PARTY, and LICENCE_OUTREACH, new under OD57/OD58), the three 18+ sentences (with a consent, confirming a list,
  for a typed test), the bought-list notice and the campaign source line. The code's words are SUGGESTIONS: nothing is
  recorded, composed or recognised under a wording until it is SAVED (W1), and an unsaved suggestion is saved only when
  its own "Approve and save this wording" box is ticked or it is edited — one Save never approves the rest (decided:
  the safer reading of G4). Each save APPENDS a version (server-stamped, audited `config.marketing_wordings_updated`);
  recognition accepts every saved version, composition takes the newest. A consent basis must say the person agreed;
  the licence and bought-list bases must say plainly they did not ("never agreed", "has not agreed" or "did not
  agree") and claim agreement nowhere; no wording holds a phone number or markup. The import door refuses the licence
  basis (it is a LIST record, U33b-L). `CONSENT_BASIS_G4` is removed: G4 now means "saved on the card, audited". Built
  from the spec by a static builder (no Node), merged on `1be05fbf`. Verified: typecheck; `test:marketing-wordings` 16 (W0–W14) with `red:marketing-wordings` 36/36 caught; `test:marketing-consent` 138 with its red 90/90; the repo unchanged by the reds; every guard that reads a modified file or package.json's wiring green, the three known other-lane reds aside (red-anchors' two rotted anchors, unsaved-changes' tax forms, orphans' landing-lane scripts); the five Postgres probes through their new keys; the drive at 1280 and 360, 42/42, its tiles opened and read; next build. The adversarial review — 0 blockers, 3 majors, 7 minors — was fixed before the push, one item recorded: a saved history the reader cannot read in full now refuses every save instead of being wiped by the next one (M1); the approval tick is a server rule — a suggestion posted without its approval is refused — with a test and a plant (M2); the catalogue's default field is `defaultWording`, which no writer may read in any shape (M3); a page left open cannot save over a version saved since (m1); look-alike letters, phone numbers joined by “/” or “,”, and agreement claims in a non-consent basis are refused (m3, m6); the card has its own tab (m7). Recorded, not fixed: the config factory does not await its audit write (m5).
  Found on the tiles and fixed before the push: the pending bar's Save did nothing while a box had a problem (it now
  takes the admin to the problem), and a three-row box cut the licence wording off mid-sentence on a phone (the boxes
  now fit their words at every width). Nothing turns on: no writer records a basis yet; G4 is Ali's act — saving each
  wording on the card.
🧹 THE LANE'S ORPHAN SCRIPTS (`test:orphans`, not in predeploy): eleven drives and probes, the guide and the census are npm keys now
  (`qa:marketing-*`, `qa:validation-*`, `qa:auth-invalid`, `qa:admin-guide`, `ops:marketing-preledger-offs`), and the
  import suite's six sections are named by path, so the gate sees the runner reach them. Owed: the five Postgres probes
  need a portable runner before they can be keyed (each expects its caller to export DATABASE_URL and migrate, in a bash
  wrapper npm cannot run on Windows). The other twelve orphans are the landing lane's.
✅ STEP 31 · U33a-L · THE LIST-BASIS TABLE — LIVE (`7692eba7`, live 2026-10-04 08:43:42 UTC; production read back in a
  READ ONLY transaction: the migration row finished, not rolled back; the table there and empty; its foreign key
  RESTRICT). `ContactListBasis`: the basis 50pick reaches a contact LIST's numbers
  on (a person's consent, or outreach under the Gaming Board licence — OD57/OD58), recorded per list, with the saved
  wording and 18+ sentence (and their versions) it was recorded under, the officer's proof note, who and when, and a
  one-way revocation. A hand-written, additive migration (`20261004120000_contact_list_basis`: one table, two indexes,
  a foreign key to ContactList with RESTRICT), applied by `prisma migrate deploy` at the container start — the old build
  ignores the new table through the 60-second overlap. `db.contactListBasis` in BOTH twins: `create`, `revoke`,
  `listForList`, `standingFor`, `standingAmong` and `coveredCount` — no update and no delete. A list's ONE standing is
  its NEWEST recording: revoking it stops the list's coverage, and an older recording never comes back into force
  (the review's major — the first draft let it). Ids are `lb_` and twenty lower-case letters, so the same-millisecond
  tiebreak orders alike in both twins; `coveredCount` answers `{ live, covered }` from one pass (an account's number is
  never a list's to cover — the player branch). Nothing reads or writes the table outside the data layer yet: U33b-L
  records, U33a-G reads. Verified: prisma generate; typecheck; `test:dal-parity` 2114 (§27's 48 lines) with `red:dal-parity` 176/176, the working tree untouched; the Postgres probe 22/22 (every migration from empty, no drift against the schema, RESTRICT refusing a list delete, the same-millisecond boundary, 2,000 keys, the newest recording revoked covering nobody, 21 rule refusals alike in both twins, the memory twin answering identically); migration-ownership; dead-schema; next build. ⚖️ THE WHOLE PREDEPLOY CHAIN ONCE (the shared data layer is platform-wide): all 205 commands green but the two known Vodacom reds (stacking, kyc-copy-truth); its build failed once fetching Google Fonts (network) and passed on the re-run, with verify:house-bot-bundle. The adversarial review — 0 blockers, 1 major, 3 minors, 6 nits — was fixed before the push: the major (revoking a list's newest recording revived the previous one, so the reads failed open on the very act meant to stop outreach) is now the rule above; ids are pinned; neither twin's `contactList` may gain a delete; `coveredCount` returns both numbers; both twins refuse the same bad input (blank words, malformed instants and versions, NULs); the retention row says exactly what is held.
✅ STEP 32 · U33p · THE PUBLIC POLICY LINES, EDITABLE — LIVE (`31777791`, live 2026-10-04 09:55:18 UTC; production
  still prints both code versions, RG 2026-09-26 and Privacy 2026-10-01 — nothing saved). Admin → System gains a
  "Public policy lines" tab: the
  Responsible Gambling page's §4 marketing promise, the Privacy Notice's §3 Consent bullet, a NEW §3 licence bullet
  (blank — not printed — until saved) and its §4 Blackball (SMS gateway) bullet, and the note under the profile's offers
  switch (stored only; U33a-P prints it) — each in English, Swahili and Chinese, the English binding — in
  `defineConfig("legal.policy_lines")`, audited `config.policy_lines_updated`, every saved version kept. NOTHING PRINTS
  DIFFERENTLY UNTIL A SAVE: each page keeps its literal bullet inside a `PolicyLine` wrapper (the page's text and DOM,
  both versions and both English hash pins unchanged). A save is refused for a promise the code does not keep — read
  in EVERY language: today a late-night window (U13) and a frequency cap (U14) — a missing gateway fact or Consent word,
  markup, a run of seven digits, an unbroken run over 30 characters, or a blank language. New words move their page's
  version (the stamp records the code version it was made against, so no label is reused over different text); a
  review of today's words — the tick opening check 2 needs — is a marker that moves nothing and prints nothing. The card
  re-checks every saved line against today's rules and flags one whose code default changed since. Verified: the whole predeploy chain once (the public legal pages are platform-wide): all 206 commands green but the two known Vodacom reds and `test:house-bot-disclosure` §5.1 — the house-bot lane's pin of the legal pages' source bytes against origin/main, red for any uncommitted edit to those files and green once pushed (re-run after the push); `test:policy-lines` 10 (L0–L9) with `red:policy-lines` 40/40; `test:rg-policy` 25 with `red:rg-policy` 20/20; `test:privacy-notice` 67; `red:marketing-wordings` 36/36 (W8 now judges only its own action); the repo unchanged by the reds; the policy-lines drive 89/89 (before a save every page and version identical in three languages; a review moves nothing; new words move the version once; after, the saved lines print and the consent-only clause is gone; no sideways scroll at 360) and the wordings drive 42/42, tiles read; next build. The adversarial review — 6 majors, 7 minors — was fixed before the push (a review no longer moves the public version; late-night and frequency promises are caught in English, Swahili and Chinese; a review is a marker and saved lines are re-checked against today's rules; the printed version cannot collide with a code version; the suite cannot touch a real database), and so was a second static audit's one finding. Found on the tiles: an admin-facing refusal named a source file — the card now speaks in plain words.
✅ STEP 33 · U43-0 · UNCONFIRMED, THE STATUS OF A SEND WITHOUT AN ANSWER — LIVE (`bf166ff3`, live 2026-10-04 14:08:04 UTC,
  pushed alone; production read back in ONE READ ONLY transaction: the migration row finished, not rolled back, and the
  newest; the enum PENDING · HELD · SENT · DELIVERED · FAILED · SKIPPED · UNCONFIRMED; 0 recipient rows, 0 holding it). ENGINE-SPEC E4: a message handed to the gateway whose answer never came (a stranded claim
  the reaper finds, a reply lost mid-read) is neither SENT nor FAILED — it is UNCONFIRMED: settled for progress, never
  sent again by itself (a second send could be a second charge and a second message), and a late receipt may still
  settle it. One hand-written migration, `20261004140000_sms_recipient_unconfirmed` — a single `ALTER TYPE … ADD VALUE IF
  NOT EXISTS 'UNCONFIRMED'`, deployed one deploy BEFORE any writer, because Postgres refuses a value used in the
  transaction that added it (55P04) — and the code that knows the value: both twins' unions, the counts' status set
  (which refuses a status it does not know, so the knowledge ships first), and the campaign list's split (UNCONFIRMED is
  settled: 4 SENT, 1 UNCONFIRMED and 5 PENDING read 5 of 10). Nothing writes it until U43b's slice (`test:campaign-models`
  3.2 pins every writer). Built by a static builder from ENGINE-SPEC §4.2, merged on `9b782dab`. Verified: prisma
  generate; typecheck; `test:campaign-models` 33 with its red 41/41; `test:campaigns-page` 38 with its red 20/20;
  `test:dal-parity` 2118 with its red 179/179, the repo unchanged by the reds; the Postgres probe 22/22 (every migration
  from an empty cluster, the enum's seven values in Postgres' own order with UNCONFIRMED last, a write of it in a later
  transaction accepted and read back by the generated client, the drift diff naming only the new value, 55P04 shown real
  on Postgres 18) and the campaign-list probe 10/10; migration-ownership; dead-schema; client-graph-safe; next build;
  `test:red-anchors` red only for its two known rotted anchors (another lane's files). Not run, by the verification
  policy: the whole predeploy chain (the twins gained a union member and one cast — typecheck and the build reach every
  caller) and a separate adversarial review (no writer, no screen; the probe proves the migration on Postgres).
✅ STEP 34 · U41 · ONE OFFICER AUTHORISES A CAMPAIGN — DECIDED (docs only; OD60). Under Ali's 2026-07-24 single-admin
  ruling, a campaign is authorised by one officer's typed confirmation (U40) at any size; OD18's two officers, grant and
  in-loop re-check are withdrawn (nothing of them was built); the owner's control is the live switch and Start as a
  separate act. Recorded in COMPLIANCE-DECISIONS; its guard (`test:campaign-gates` G7.1, no `twoOfficerGate(` in the
  campaign path) lands with U40a, which turns the U41 row ✅.
📘 THE ADMIN GUIDE (PDF) — Ali, 2026-10-03: "include screenshots on which pages the admin should go for each step". Every
  step shows the page the admin opens for it (and the menu path to it); none is a step without its page. ✅ v1 BUILT
  2026-10-03 on the live code (batches 1–6): `docs/guides/50pick-admin-guide-contacts-and-sms-campaigns.pdf` — 23 pages,
  22 steps, 29 screenshots with the control outlined in red, the SMS balance's six states, and 26 messages each checked
  against the source before the PDF may build. Regenerate: `scripts/live/admin-guide.mjs` (+ `admin-guide-messages.mjs`)
  on a live-closed dev boot. ✅ v1.1 BUILT 2026-10-03 on the live code (batch 7): 27 pages, 22 steps, 29
  screenshots, 38 messages each checked against the source (rbac-guard.ts now read too). The dialog's steps say each
  box is checked as you type, Save waits with its reason (outlined in red), an unchanged edit can't be saved and Cancel
  asks before discarding; eleven new messages (the long paste, the discard question, the lapsed 2-step, the lookup
  and save fallbacks, the bulk and export refusals). Copied to Ali's Desktop.
  ✅ v1.2 BUILT 2026-10-04 (Ali: "no extra info, no unneeded data — perfect and well made"): 20 pages (27 before),
  22 steps, 25 screenshots, 27 warnings (one row stands for every "something failed" message), the balance's six states.
  Cut: the intro to four lines, notes the warnings table already holds, a "coming next" promise, a test-server caveat,
  three redundant screenshots. Made well: a dialog is shot by itself and printed tall, so its words read at a normal
  size; a step's title, list and first picture never split across a page; the SMS credit tile shows an ordinary
  balance (a loopback stand-in answers the guide boot's balance read). Every quoted message checked against the source
  before the PDF may build. The final version adds "Send a campaign" and "Watch it send" when the engine ships.
🔎 THE VALIDATION AUDIT (2026-10-03, Ali: "full input form validation and field validation everywhere — clean, perfect,
  working"): six read-only auditors over every admin input → 49 fixes (6 blocker, 7 major, 36 minor) in 8 batches with
  disjoint files and one shared validator per kind of field. Batch 1 = STEP 23, batch 2 = STEP 24, batches 5 + 8 =
  STEP 25, batches 3 + 4 = STEP 26, batch 6 = STEP 27 (all LIVE; 4 dropped its private phone detector for the book's
  `phoneNumberIn`; 6 closed the live 100× balance-adjust defect). Batch 6's follow-up round is LIVE (STEP 27b) and batch 7, the contacts screens, is LIVE (STEP 28) — ALL EIGHT BATCHES ARE LIVE.
  Owed from the reviews: the opt-out token mint keys on the gate's own key before U42/U43 (`optout-service.ts`);
  DurationInput's typed "1.5" (DESIGN_AUTHORITY §A7); the Android clipboard chip on a real phone (a drive, no suite
  can).
⚠️ RECORDED, NOT THIS LANE'S ALONE: `test:house-bot-holder-lifecycle` 2.2 (not in predeploy) counts 31 scripts that write
  an account fact against a shrink-only ceiling of 25. Two are this lane's suites (U7 `marketing-consent.test.mts`, U38a
  `campaign-audience.test.mts`); the rest are other lanes' (agents, deposits, the Vodacom journey, invites, ops). STEP 23
  added none. The ceiling's owner (the house-bot lane) reads and admits each member — this lane did not raise it.
⚖️ VERIFICATION POLICY — Ali, 2026-10-02: "checks that are already 100% functional — no need to go over them again;
  focus on what has to be checked." Binding from U36's push on:
  · PROVEN STAYS PROVEN. A ✅ unit, and a 🔵 unit whose suite, red, drive and review are green and whose only open
    item is the production look (G11) or a real file through the import, is NOT re-run in any battery unless a commit
    MODIFIES its files. Today: the 17 ✅ units, and U17, U20–U23, U25–U28 and U36.
  · EACH PUSH RUNS WHAT ITS CHANGE CAN REACH — never again the whole `predeploy` chain per push (Railway itself runs
    only `next build`): typecheck · `next build` · `test:source-bytes` · the unit's own suite and red · each guard whose
    script reads a file the commit MODIFIES (a file merely added beside it does not re-run it) · `test:dal-parity` and
    `test:red-anchors` when a DAL twin or an anchored file changes · the ~49 guards that pin predeploy wiring when
    the predeploy line of package.json changes (U36 skipped them and broke test:contacts-form 6.13) · a browser drive
    only for a screen that changed ·
    the Postgres probe only when a query or the schema changed. Each battery records what it skipped and why. U36's
    push was the first: after its rebase onto main it ran 11 commands in ~7 minutes, where the old routine ran the
    whole ~200-command chain (measured ~11 minutes of commands per run) plus every drive, on every push.
  · THE ADVERSARIAL REVIEW STAYS ONLY WHERE THE DAMAGE WOULD BE REAL: a unit that touches consent, money or SMS
    credit, can send to a real phone, or reveals personal data or money (U13–U16, U37b, U38, U39b, U40–U47, U48's
    export, U49, U52). Every review so far found a real MAJOR, so these keep it; a screen-only or docs unit gets its
    drive and screenshots instead.
  · THE FULL CHAIN RUNS ONCE MORE, inside U52a (the live drive) before G2 — the first real campaign — and whenever a
    commit modifies a platform-wide file outside this lane (middleware, money paths, the root layout). G1 is only the
    first opening of the switch, for the officer's own test send at U37b.
  · 🔴 THE WHOLE-CHAIN RUNNER COULD NOT SEE A FAILURE (found 2026-10-02 by the census): its log line
    `echo "$(printf %03d $i) $cmd exit $?"` reads $? AFTER the printf substitution, so every command logged "exit 0".
    In S10's eight full runs the real reds were: `test:bridge` — OURS, a dead colour class `text-text-primary` on the
    contacts page (2 sites) that U36 copied onto the campaign list (fixed the same day: `text-text`, the primary
    ink); `test:stacking` 6.1 — the LIVE strip's z-index 11 in globals.css (`2ab8830e`, not this lane);
    `test:kyc-copy-truth` §2 — the privacy page's Swahili journey-counts line (Vodacom S3b `ad43b996`, not this
    lane); and `qa:live` / `test:admin-section-gate` never ran (no dev server). Before the one full run: capture
    rc=$? first, start a dev server for the browser checks (or log them NOT RUN), print a failure count.
⚖️ DELEGATED BY ALI, 2026-10-03 ("all other you tick them, instead of me"; each step approved by him manually):
  · OQ8 — opt-out by LINK alone for now (replying STOP waits for a Blackball reply number, U46b).
  · G9 — the price is TZS 6 per SMS until our own sends measure it (measured twice: 2026-09-16 and 2026-10-03).
  · G3 — credit topped up (TZS 600,184); the FIRST campaign's spending cap is TZS 10,000 (~1,600 SMS) — U40 writes
    it as budgetTzs; Ali may raise it.
  · G1 — Claude opens `marketing.sms.live` ONLY for each test send and closes it straight after.
  · G7 — Jay Kaba (+255 772 619 619) is ALREADY an admin, so the first campaign SMS goes to him through the
    composer's test send WITH JAY SIGNED IN AS HIMSELF (the test reaches the signed-in officer's own number only); if
    the gate refuses his account it names the remedy (tick "send me offers by SMS" on his own profile — his own
    consent). Claude opens the switch for that one test and closes it after. ⛔ Claude never signs in as Jay or Ali.
  · ⚖️ SCOPE REVERSED BY ALI (2026-10-03): "we won't be sending just to 50pick members — it's a marketing campaign, so
    it would be sent to anyone with a phone." The PLAYERS-ONLY first release (2026-10-02) is withdrawn: the CONTACT
    BOOK is in the first release. U33a (the gate's contact branch and the consent writer) and U33b (the consent-basis
    panel and bulk record-consent) join the critical path before G2, with G4 (Ali approves the four consent-basis
    wordings and the 18+ sentence — drafted in U33a-catalog, OD50). ⛔ A contact still receives NOTHING without a
    recorded basis and an 18+ attestation — the legal floor the gate holds. The bulk FILE import (U30–U32) follows the
    first campaign; small lists go in through the live add form (U22) and bulk record-consent (U33b).
  · ⚖️ OD57 (Ali, 2026-10-03, twice): the campaigns are made to ATTRACT NEW CLIENTS to 50pick under 50pick's Gaming
    Board of Tanzania licence — "remove any rules that prevent us from sending messages to non-50pick people; we got a
    licence that allows us to send to anyone." DECIDED: a NON-MEMBER needs NO prior consent of their own. U33a's contact
    branch admits a contact on a recorded BASIS — the person's consent, OR "acquisition outreach under 50pick's GBT
    licence", recorded per list (U33b) and never written as a consent the person did not give. KEPT, each because it
    protects 50pick: a stop honoured for ever (carriers block senders that ignore opt-outs); self-excluded people never
    (50pick's own published promise — OD58); adults only, attested per list (the Gaming Act bars minors); the "50pick"
    opening and the opt-out link in every SMS (ETA s.32); the 08:00–20:00 window and the frequency cap. A 50pick PLAYER
    keeps their OWN choice — they were asked, and a player who did not say yes is not messaged. Recorded once: the GBT
    licence covers gambling advertising, while SMS to non-customers also falls under the communications and data rules
    (TCRA, PDPA) — the basis is Ali's ruling and is recorded as his.
  · ⚖️ OD58 (Ali, 2026-10-03, the same afternoon): "our licence allows us to send to anyone, whether they like it or not,
    based on GBT — if they don't want messages it's their duty to talk to GBT, and we stop after GBT tells us; our
    platform has nothing to do with preventing the audience." DECIDED (Claude, delegated; told Ali the same hour):
    (1) a 50pick PLAYER who never ticked the SMS box is reachable on the same basis as a non-member (the licence outreach
    basis, recorded per list) — OD57's "a player keeps their own choice" now means only that a player who turned SMS OFF
    has used their stop. (2) A GBT instruction is a stop: an officer records it as an OPERATOR stop (U23's Suppress —
    nobody can lift it). (3) KEPT, each re-checked against the law that day: the person's OWN stop (the opt-out link) —
    the Electronic Transactions Act 2015 s.32 requires every commercial SMS to offer a way to refuse further messages
    (and asks for consent — recorded as a legal risk Ali accepts with OD57), and the Personal Data Protection Act 2022
    s.35 gives anyone the right to stop direct marketing, complaints going to the Data Protection Commission, not GBT;
    TCRA registers the sender ID with every network, and spam complaints can block it, taking the login and withdrawal
    codes that share the Blackball rail with it. SELF-EXCLUDED people and anyone UNDER 18 never — 50pick publishes the
    promise itself (/legal/responsible-gambling: "No marketing messages to a self-excluded player … or to anyone under
    18 or whose age we cannot confirm"; the self-exclude dialog: "no marketing"), and the Gaming Act bars minors. If Ali's
    lawyer confirms in writing that the opt-out can go, Claude revisits that one; the self-exclusion and under-18 blocks
    stay regardless. ⚠️ For U33a/G4: the RG page's "whose age we cannot confirm" must be squared with the per-list 18+
    attestation before a non-member is messaged. (4) THE TEST SEND TAKES ANY NUMBER the officer types (Ali: "don't
    hardcode my number") through the same gate, the officer's own number a one-tap default — built on batch 4's composer.
    (5) Before G2, read the Board's advertising code (iGaming Business, 2024: every ad to carry the safer-gambling message
    and the helpline; no reward as an inducement) against the first campaign's message. Sources: fbattorneys.co.tz
    (ETA s.32), cyrilla.org (PDPA notes), telerivet.com (TCRA sender IDs), igamingbusiness.com (the code).
  · 📐 OD59 (2026-10-03) · THE U33a + U37c DESIGN is written and tracked: `docs/marketing-specs/U33a-U37c-OD58.md` (a
    read-only design pass, re-read as an adversary). Every unit ships INERT: a non-consent basis counts only while ONE
    admin record (`marketing.outreach.licence`, Admin → System) is OPEN, and it cannot open until the policy lines and
    wordings are saved — so tests to typed numbers stay refused until Ali approves those words. No licence basis is ever
    written to the consent ledger (a new append-only `ContactListBasis` per list; players covered by the record); every
    allowed verdict names its basis; a masked role learns nothing (one neutral sentence, a 3-second floor); typed tests
    capped per recipient and per officer; every wording and policy line editable with validation + audit (the
    admins-can-change-everything rule). ⚠️ ALI'S 13 QUESTIONS (built defaults in brackets): Q1 never-ticked players reached
    without a list [yes] · Q2 sign-ups since 09-28 who left "Send me offers by SMS (optional)" unticked [reach them;
    reword the box first] · Q3 Privacy §3/§4 lines · Q4 RG §4 line · Q5 the outreach wording, 18+ confirmations, notice ·
    Q6 the source line · Q7 list basis expiry for recycled numbers [no] · Q8 agent referees promised no marketing [build
    the exclusion] · Q9 lapsed consents kept out [yes] · Q10 the profile switch reads ON under outreach + its note · Q11
    typed tests only while outreach is open [yes] · Q12 who records a list basis [growth officers] · Q13 the stop-link
    lawyer question.
  · ⛔ NOT done by Claude: ticking Ali's OWN consent (his personal legal record) and re-enabling admin 2-step login
    (it would lock Ali out unless his authenticator is enrolled — waits for "my authenticator works").
🔎 WHAT STILL HAS TO BE CHECKED — and nothing else is re-checked:
  1. The production look, in ONE sitting with a production GROWTH staff login (G7): Growth → Contacts (U17, U20–U23,
     U34a) and Growth → SMS campaigns (U36) render for that role, and a FINANCE login does not see them. A look, not a
     re-test — and suppress or withdraw is never tried on a real contact.
  2. A real CSV, vCard and XLSX file through the import, once U30/U32 land (U25–U28 are built and wait for that).
  3. Each unit still to build, at the policy above, the critical path first (▶ NEXT).
  4. Before the first real campaign (G2): the full chain once (with the runner fixed), the U52a live drive, and the
     officer's own test sends (G1 opens the switch for them; each costs real SMS credit — G3).
  ⚠️ STILL ALI'S, in the order the path needs them: G7 one production GROWTH staff login with its 2-step code
  (never his own); his own account ticks the NEW "send me offers by SMS" box and has a date of birth and a phone (the
  gate has no bypass — an old "product updates" tick is refused); G1 a yes to test sends to his own phone (~TZS 6
  each); G3 the most the first campaign may spend — the credit is TOPPED UP (TZS 600,184 on 2026-10-03, read after
  one operational test SMS proved the rail end to end — BLACKBALL-SMS §5; login codes share it); G9 (optional)
  a price of TZS 6 per SMS in settings until our sends measure it; OQ8 is opt-out by link alone acceptable for now
  (replying STOP needs a Blackball reply number); production `/api/health` reports `adminTotp: DISABLED` — turn the
  admin 2-step login back on before the first campaign; G2 the go-ahead, with the Swahili message (it starts with
  "50pick", at most 80 characters) and the day. G4 (the consent wordings) is needed only for contact import.
▶ NEXT: U33a — in its build order (spec §11): U33a-0, U33w, U33a-L and U33p are done (STEPS 29–32); then U37s, U33a-R and U33a-G, the
  gate under OD58 (never-ticked players and non-members on the
  licence basis, recorded per list; a person's own stop, self-exclusion and under-18 kept) — then U37c, THE TEST SEND TO
  ANY TYPED NUMBER (Ali, 2026-10-03: "don't hardcode my number"; through the same gate, the officer's own number a
  one-tap default; ⚠️ campaign-compose's red "a typed test number honoured" is then inverted on purpose, never deleted),
  then U38b the audience card, U33b and U40 the confirmation. (The validation audit and the admin guide are DONE —
  STEP 28 and the guide's v1.1.)
  THE CRITICAL PATH to G2, in order — re-derived by the 2026-10-03 census: about 83–172 focused hours, G2
  realistically between 12 and 25 October 2026 (owner waits come on top). The contact-FILE import (U30–U32) still
  follows the first campaign; typed contacts and lists are in it (OD57):
    1. ✅ U37b the composer — write, save, the test send to the officer's own phone (LIVE, STEP 21; switch CLOSED).
    2. ✅ §25 the four bulk keyed reads in both twins (LIVE, STEP 22; taken out of U30: msisdnsPresent, findByPhones, findActiveAmong,
       latestAmong) — U38a's count asks the gate about every player through them.
    3. U38 the audience — ✅ U38a LIVE (STEP 22: the player arm, ONE walk, the will-receive split); U38b the card NEXT. X24 is reversed on
       purpose: U38a goes before U33a, and U33a later re-threads its read accounting (~2.5 h).
   3b. U33a + U33b — THE CONTACT BOOK IN THE FIRST RELEASE (OD57): the gate's contact branch on a recorded basis (consent,
       or acquisition outreach under the GBT licence) with 18+ attested per list, and the basis panel + bulk record.
   3c. U37c — THE TEST SEND TO ANY TYPED NUMBER (Ali, 2026-10-03: "don't hardcode my number"), through the same gate;
       the officer's own number a one-tap default (spec: `docs/marketing-specs/U33a-U37c-OD58.md`).
    4. U40 the confirmation — the typed count against a server recount, scope and spend frozen, budgetTzs written.
    5. U41 — RECORD THE DECISION ONLY: U40's typed confirmation is the authorisation (Ali's single-admin ruling;
       `test:two-admin` asserts there is no two-officer lock). The two-officer toggle waits until Ali asks for one.
    6. U16a — erasure, the access export and retention reach SmsCampaign, SmsCampaignRecipient and the opt-out tokens
       (a legal duty, and DATA-RETENTION's row).
    7. U13 the send window, 08:00–20:00 EAT — the slice's first check (50pick's own rule, OQ5).
    8. U42 enqueue — the recipient rows over U38a's walk, one reused opt-out token per number, restart-safe.
    9. U43 the slice — reap, claim, gate, send, settle. The biggest piece: UNCONFIRMED is a new recipient status whose
       migration deploys ALONE first (Postgres 55P04), and a gateway timeout must never read as "failed".
   10. U49a the marketing credit floor and the refusal at Start (login codes share the credit).
   11. U47b the live page's controls — Start/Continue, Pause, Resume, Stop — with a slice driver run from the open page
       (U44's pump is deferred) and the "money never waits for marketing" yield inside the slice; no Retry yet.
   12. U52a the live drive on production — at most 6 sends to Jay's phone (+255 772 619 619, G7) through a book list,
       a suppressed control refused, the stop link tapped on the handset (G1, G3) — then G2.
  AFTER THE FIRST CAMPAIGN (about 103–200 focused hours, the 2026-10-03 census): U14 the frequency cap (⛔ BEFORE A SECOND CAMPAIGN); U44 the pump; U46a
  receipts; U46b inbound STOP (needs Blackball's answer, OQ8); U49b the 90% auto-pause; U45 scale; U15 one send path
  (⛔ never set FEATURE_BONUS=ACTIVE before it lands); U16b; U39b the estimate card; U41's toggle; U47a polish and
  Retry; U48 results; U50 declarations; U51 the guide; U52b the Seal; the production looks; and the import track
  (U30–U34, with U25–U28's live proof).
  Specs are written just in time — only for the next two or three units on this path, against the code as it stands.
  ⛔ OWNER GATES STOP THE BUILD (G1–G12 above). ⚠️ G4 now gates the import going live — U32's start action and U33b's
  panel both reach the draft wordings (OD50) — so asking it early saves a stall at S15/S16.
  ⚠️ VERIFY EACH PREMISE BEFORE BUILDING — this plan's text has been wrong at the start of most sessions.

✔ LAST SESSION: S8, 2026-09-28 (office PC OMEGA-COMPILE01, worktree `F:/kipindi-s8`, branch `marketing-s8`)
  — **S7c WENT LIVE. No unit ticked and none attempted: 12/52 units, 12/25 defects.** Ali: "ship it first",
  then "end session here, mark progress, clean stales". The whole session was the ship: merge, gates, shots,
  push, prove. On the merged tree typecheck and `npm run build` are green, every marketing / SMS / DAL / RG /
  comms suite is green, all ten red controls catch every plant, the capture wrote 90 screenshots at 0px
  overflow, and the shots were OPENED AND READ — all ten SMS-credit states at 1280 and 360, the /s error and
  busy screens, the consent HELD card in three languages, /help FAQ 5, the register consent box.
  ⭐ THREE THINGS WERE FIXED BEFORE THE PUSH, none of them optional:
  1. `since` WOULD HAVE LIED. The nine D1 sentences said they first faced a player on 2026-09-27; the batch
     did not ship that day. Measured first — production still served "Nipe matangazo" — so no ledger row
     existed under them and the date was still free. Corrected to 2026-09-28, re-pinned the append-only hash
     (9b041893ec43a670 → 718250ee6e8280ed), and ⭐ PROVED THE GUARD STILL FAILS on an EDIT and on a REMOVAL
     before trusting the new pin. "Never update the hash to make this pass" is that file's own rule; the one
     thing that makes this legal is that the date had never faced a person.
  2. THREE GUARDS CITED BY THE WRONG NAME — a guard named by its SCRIPT FILE, not by the `package.json` key
     that runs it, which `test:guards-exist` counts as a guard that does not exist. Two were S7c's, one was
     already on main, so that repo-wide gate was RED for every lane. `scripts/dev-route-guard.test.mts` runs
     as `test:cert-devroutes`; `scripts/stacking-contract.test.mts` runs as `test:stacking` (its line 161
     really does read the skip link's focus z-index that the app-shell comment describes). Cited by key, green.
  3. 🔴 A MERGE THAT SILENTLY DROPPED MAIN'S WORK. The first `git merge origin/main` ran against a STALE ref:
     a parallel session's `git fetch` moved `refs/remotes/origin/main` mid-command (every worktree shares one
     `.git`), so MERGE_HEAD was two commits behind the `origin/main` that the same shell had just printed.
     The merge was clean, silent, and quietly lost the landing lane's `FIRST_LICENSED_EVIDENCE` block. Caught
     only by diffing BOTH sides against the merge base, per file. ⛔ AFTER ANY MERGE HERE, VERIFY IT: for every
     file both sides touched, `main→merged` must equal `base→ours` AND `ours→merged` must equal `base→theirs`.
     The i18n dictionary was then checked leaf by leaf (98 of ours kept, 158 of main's kept, 30 of main's
     deletions honoured, 0 wrong) with a PLANTED defect first, to prove the checker could fail at all.
  ⚠️ Red elsewhere, NOT ours, each proven by three independent facts (byte-identical to `origin/main`, S7c
  never touched the file, and the failing label names another lane): `test:stacking` 6.1 (`z-index: 11` on
  `.ticker-viewport:focus-visible`, the LIVE strip) and `test:red-anchors` (two rotted anchors, in
  `query-bar.tsx` and `updown-card-phase.ts`).
  🔴 INSTRUMENT LESSONS: (1) `test:marketing-consent-ledger` §2c/§2d FLAKE — red once, then green on three
  straight re-runs; the cause is the consent-tie defect in ◐ HALF-DONE, not the suite. (2) The U8 drive fails
  its BUSY case when the capture runs it NESTED (1 of 266) and passes 266/266 standalone, twice: the opt-out
  budget refills one token every 6 s and the drain loses that race on a loaded machine. The drive's own
  comment predicted exactly this. ⛔ Never call a nested-drive failure a product defect without re-running it
  alone. (3) A viewport TILE is not a verdict on legibility: the consent HELD card looked covered by the chat
  bubble and cut off by the bottom rail, and measuring it per PAINTED LINE (Range rects + `elementFromPoint`,
  scrolled into view) showed every line clear in all three languages. The tile had merely frozen a scroll
  position. ⛔ Measure the rectangle before reporting a visual defect.

✔ BEFORE IT: S7c (the end-to-end review of everything live and its fixes — built on Ali-Blade15, SHIPPED by
  S8), S7b (Ali's OQ1/OQ2/OQ4 rulings, the live SMS balance on Admin → System), S7 (U11, U12 ✅, D10 ✅,
  the U6 index repair), S6 (U9, U10 ✅), S5 (U8 ✅), S4 (U7 ✅), S3/S3b (U5, U6 ✅), S2 (U3, U4 ✅), S1 (U1, U2 ✅),
  S0b, S0 — each in §2, newest first. ⭐ The habit that found most of it: audit the INSTRUMENT, not only
  the code.

◐ HALF-DONE — three items. Item 1 was FIXED by S10 (see 🟡 S10 above); its record stays for the reason.
  1. ✅ FIXED 2026-10-01 (S10, `ledger-stamp.ts`). WAS: 🔴 `latestFor` ANSWERS BY COIN FLIP UNDER A TIE — and U18's contacts are the population it decides for.
     `db.messagingConsent.latestFor` orders `createdAt desc, id desc` in BOTH twins, but the id is
     `randomUUID()` (`consent-ledger.ts`, `optout-service.ts`), so a tie is broken at random. MEASURED on the
     shipped tree: **396 of 400 back-to-back appends shared a millisecond, and 46% of those answered GIVEN
     when the person's latest word was WITHDRAWN.** Both twins agree — and are wrong together, which is why
     `test:dal-parity` cannot see it. ⚠️ NOT S7c's: `randomUUID()`, the sort and the two failing test labels
     are byte-identical on `origin/main`, so it is LIVE today. For a PLAYER the send gate is saved by two
     records ahead of the ledger (`marketingOptIn`, then the suppression row), so nobody is texted after
     saying stop. ⛔ BUT FOR A NON-PLAYER THE LEDGER IS THE ONLY RECORD — which is exactly what U18's
     `MarketingContact` creates. Ali was asked on 2026-09-28 whether to fix it inside S8 or leave it; ⛔ do
     not let U18 write a contact before that is answered. The fix is a monotonic, sortable ledger id (or an
     ordering that does not lean on the id at all), in BOTH twins, with its own `dal-parity` control.
  2. THE PRODUCTION DRIVES ARE OWED. §0 step 5 asked for the U6 and U8 drives on production AFTER the push;
     the session was ended before them. Everything else in that step is done — pushed, and production proved
     to serve `d3379fef` by discrimination. ⚠️ Both drives mint tokens through `/api/dev-test/*`, which 404s
     in production BY DESIGN, so establish whether either can run against `LIVE_BASE=https://www.50pick.tz`
     at all before trusting a green exit. `node scripts/live/marketing-e2e-capture.mjs prod` is the
     read-only public-pages pass and needs no dev route.
     ✅ THE READ-ONLY HALF RAN 2026-10-02 (S10, production on `64f1c754`): /auth/register's consent box and
     /legal/responsible-gambling §4, in sw / en / zh at 1280 and 360 — every page 200, 0 px overflow, the shipped
     sentences ("Nitumie ofa na habari za 50pick kwa SMS (hiari)." — optional, unticked, its own box). The U6/U8
     drives mint tokens through `/api/dev-test/*`, which 404s on production BY DESIGN, so they cannot run there;
     they stay local-only until a production QA account exists (G7).
  3. Unchanged from S7c, all of it needing a person, none of it this lane's code: S7b's SMS balance read on
     Admin → System is still proven against a local stand-in only — ask Ali to open Admin → System and compare
     the "SMS credit" figure with the Blackball portal (⛔ never log in as him), then record the date here and
     in §2. Also open: a native Swahili (and Chinese) speaker's read of the D1 consent sentences and the new
     `/s/<token>` copy; where Blackball stores SMS data (BLACKBALL-SMS.md §8); and Ali's one line on OQ4 —
     is 0800 11 0011 answered by 50pick staff, or by the independent national service the site says it is?
     Recorded as the latter, which changes no public label.

? RULINGS TAKEN ON ALI'S DELEGATION OF 2026-09-26 (recorded here so no session re-asks them):
  1. OQ6 — answered: build the under-25 segment AND re-version §4 to what runs (COMPLIANCE-DECISIONS
     § "2026-09-26 · RG Policy v2026-09-26"). §4a's OQ6 row says so.
  2. D10 — closed (§8 D10).
  3. HARM MARKERS STAY WINDOW-BASED for marketing, the same live-computed standard the Board-facing
     /admin/compliance panel uses; a persisted, officer-reviewed flag store is a Player Safety programme,
     not this one. The gate refuses while a marker shows and when the check cannot be read.
  4. RE-CONSENT UX: the rule stands (a consent must post-date the break or the restore); showing a player
     WHY their toggle is on but inactive is the composer era's (U37) profile wording — ⛔ no new Swahili
     sentence is invented for it before then. ⚠️ Superseded in part 2026-09-26 (ruling 8): the toggle now
     shows the EFFECTIVE consent, so a lapsed consent reads OFF (not "on but inactive"), with one line
     (`push.marketingPaused`). Reworded 2026-09-27 to a neutral statement, never a nudge to switch gambling
     offers back on: "Turned off when your break or self-exclusion ended. It stays off unless you switch it
     on." / "Ilizimwa baada ya mapumziko yako au kipindi chako cha kujitenga kuisha. Itabaki imezimwa
     usipoiwasha." / "您的冷静期或自我排除期结束时，此项已关闭。除非您重新开启，否则将保持关闭。" — the words "Paused",
     "Imesitishwa" and "已暂停" are no longer used. While the break or self-exclusion is still IN FORCE the
     switch is held (ruling 8). Since 2026-09-27 the zh source string carries invisible U+200B phrase hints
     for `break-keep`; the text shown is unchanged.
  5. THE OPT-OUT PAGE's "Ingia"/"Jisajili": ruled — a page somebody reaches to LEAVE should not upsell
     them. ✅ DONE 2026-09-26 by the audit-fix pass (ruling 10): `/s/<token>` (and, since 2026-09-27, bare
     `/s`) renders in its own minimal shell — logo, language menu, the content, and a footer of the licence
     lines, the responsible-gambling sentence and the helpline only; no Ingia/Jisajili, no nav, no bottom
     rail, no chat, no first-visit primer, no "Pendekeza masoko upate pesa".
  6. ✅ ANSWERED BY ALI HIMSELF, 2026-09-26 (COMPLIANCE-DECISIONS § "2026-09-26 · Marketing SMS rulings"):
     OQ1 — the Gaming Board says marketing SMS is not part of its approval, so there is NO approval gate
     (OD17/§5.3 withdrawn, U41 re-scoped); OQ2 — PDPA registration not needed; OQ4 — "the right helpline is
     ours", recorded as: the helpline 50pick already publishes, 0800 11 0011, is the right one. ⛔ Not a
     claim that 50pick runs it — the site labels it the NATIONAL helpline. The footer now reads
     `support-config.ts` and §12 asserts one helpline (D6 ✅). Consent and every RG/age gate stay.
     Still his alone: any real spend beyond the live-drive ledger cap.
  7. ONE CONSENT, ONE NAME (audit-fix pass, 2026-09-26 — COMPLIANCE-DECISIONS § "2026-09-26 · Marketing
     consent names SMS"): the register box reads "Send me 50pick offers and news by SMS (optional)." /
     "Nitumie ofa na habari za 50pick kwa SMS (hiari)." and the profile toggle "Offers and news by SMS" /
     "Ofa na habari kwa SMS" (OD8 rewritten). Every ledger write — register (password and OTP), profile,
     opt-out stop and resume — stores the sentence in the language the person SAW, with that locale, and
     registration stores it on `User.locale` (OD42 amended). Since 2026-09-27 the register form and the
     profile switch POST the language they were DRAWN in (the form's hidden `shownLocale`; the switch's
     `useT().locale`), accepted only as exactly en/sw/zh by `renderedLocaleOf`, with the `kp-locale` cookie
     as the fallback; the opt-out acts read the cookie on the server. The posted value only chooses which
     dictionary sentence is stored — no client text reaches the ledger. ⚠️ Rows written 2026-09-25 → this
     pass say SW whatever the person saw; append-only, so they stay and are not evidence of language.
  8. OQ11's SAFE DEFAULT IS BUILT: a PLAYER is marketable only with `marketingOptIn` AND a latest GIVEN
     ledger row whose wording is one of the pinned SMS-naming sentences (`src/lib/marketing/consent-wording.ts`,
     append-only). A "yes" under "product updates / Product news / Nipe matangazo" is `no_consent`
     ("consent predates the SMS wording"). No backfill; only Ali may relax it (§4a OQ11). The profile toggle
     shows the EFFECTIVE consent, and turning it ON lifts only a suppression the person created (their stop
     link) — never COMPLAINT, OPERATOR or SELF_EXCLUSION.
     ⭐ HELD (2026-09-27; the code calls it D4b, an audit label, not this plan's §8 D4): while a break
     or self-exclusion is IN FORCE the switch reads OFF and is locked, for every player, consenting or
     not — a "yes" counts only if given after it ends, so an ON
     shown mid-break was a consent the gate would never honour. The line under it reads "Off during your
     break or self-exclusion, until {date}. It stays off after that unless you switch it on." ({date} = the
     end of the break or exclusion on EAT days, in the page's own language since 2026-09-27 —
     `formatHeldUntil`, `src/app/profile/notifications/held-until.ts`: "2 Dec" / "2 Des" / "2026年12月2日",
     en/sw add the year when it falls in a later year, an end under a day away adds the EAT 24-hour clock
     rounded up to the minute ("27 Sep, 13:01"), and the date never wraps; it was `formatDate`, English on
     every page; no date for a permanent or diverged hold). An ON is
     refused on the server with reason `held` and nothing is written; an OFF is still recorded.
     `marketingToggleState` asks the RG standing FIRST, then consent, then the person's own suppression,
     then the lapse (`paused`).
  9. KYC IN THE GATE (§9 U11): a final KYC refusal refuses — UNDERAGE → `age_minor`, SANCTIONED /
     DUPLICATE_IDENTITY → `account_status` — and a KYC document date of birth makes the YOUNGER age govern.
     A re-opened case is marketable again.
  10. THE OPT-OUT PAGE (§9 U8, ruling 5): minimal shell; the heading and body follow the state; resume shows
     and records its OWN consent sentence; the token is case-insensitive; resume lifts only person-created
     reasons (any other stop answers "already", writes nothing and never says why); a bad link gives a next
     step and never says "this link is not ours"; only a MISS spends the per-address budget. Since
     2026-09-27 a dry budget reads as BUSY and a failed read as "did not go through", each with a retry, and
     bare `/s` is the same refusal as a bad link (§9 U8).
  11. THE ADMIN SMS CARD HEADLINES THE CREDIT (§9 U49, BLACKBALL-SMS.md §5): "SMS credit" (gloss "Salio"),
     the state in words — and, when the read fails, WHY ("Blackball refused our keys", no answer, a reply we
     couldn't read, keys not set; the refused and unset fixes name BOTH `BLACKBALL_CLIENT_ID` and
     `BLACKBALL_CLIENT_SECRET`, whole, one per mono line), including after a first reading (2026-09-27) — a
     figure past the 15-minute TTL shown as "—", the old value in the note and its time on the provenance
     line under the dash, a ~2.5 s render budget, one read in flight, a short pause after a failed read.
     ⛔ It never says "Healthy" on a rail that cannot send (no sender ID, keys unset or refused, an unknown
     provider) or while sends are failing (2026-09-27), and a confirmed healthy figure names its alert line
     ("Healthy · alert at TZS 150");
     `sendBatch` re-checks a stale or low reading before refusing at the floor; crossing the alert line,
     and since 2026-09-27 the floor, alarms by bell and email (never by SMS) the officers who can open
     Admin → System — by default the Owner only (BLACKBALL-SMS.md §5).
  12. INBOUND STOP IS NOT BUILT. A reply to a marketing SMS reaches nothing today; the only opt-out is the
     `/s/` link. §9 U46 owns it, and ⛔ no reply keyword is printed in any message until it is live (OQ8).

◐ CARRIED — THE PLATFORM CONSISTENCY BATCH (Ali's standing rule, 2026-09-27; a parallel session may take it)
  S7c's final visual review fixed these on marketing's own screens only; the rule is to fix the same defect
  everywhere, in this batch or the next. One item each: the fix · its file · the guard that should pin it.
  (a) PULSE AS AN ALARM — `AdminKpi`'s `pulse` draws the aqua "live" badge, used as an alarm on non-live
      tiles: `admin/page.tsx` (AML pending), `admin/approvals/page.tsx` (AML pending, SOF declarations),
      `admin/aml/page.tsx` (Pending review), `admin/compliance/page.tsx` (Pending), `admin/moderation/page.tsx`
      (In queue), `admin/bonuses/page.tsx` (Outstanding bonus), `admin/system/page.tsx` (Audit chain BROKEN).
      Add an additive alarm/attention variant to `components/admin/admin-shell.tsx` (words + tone, rose/amber);
      keep `pulse` only on `admin/live/page.tsx`'s real feeds; audit the other `pulse=` callers under
      `src/app/admin` too (`test:kyc-stage` pins the approvals KYC tile's). Guard: `test:ui-consistency`.
  (b) ARROW AS STATUS (DG-A-10) — ▲/▼ `deltaDir` as a status: `admin/players/page.tsx` and
      `admin/players/cohorts/page.tsx` (Active %), `admin/page.tsx` (AML pending), `admin/config/page.tsx:104`,
      `admin/finance/page.tsx` (the trial-balance tiles). The word and the tone carry it. Guard: `test:admin-clip`.
  (c) BUSY LABEL — a `.btn[aria-busy="true"]:disabled` rule in `src/app/globals.css` (opacity .85, cursor
      progress); then delete `BUSY_LEGIBLE` in `src/app/s/[token]/optout-client.tsx` and point
      `test:marketing-optout` S18j at the CSS. Guard: `test:marketing-optout` S18j.
  (d) CALLOUT + HEADING WRAP — `components/ui/callout.tsx`: stack title `text-balance`, body and row
      `text-pretty`; `components/ui/page-header.tsx`: zh `break-keep`, only on titles that carry U+200B hints
      (keep-all without hints breaks only at punctuation, `trust-band.tsx`). Then delete the /s call-site
      wrappers (`optout-refusal.tsx`'s title span, `optout-classes.ts`). Guard: `test:marketing-optout` S18k/S7h.
  (e) RG DATES — `profile/responsible-gambling/page.tsx:107/109` still `formatDate` (en-GB "28 Sept 2026")
      while the consent card says "28 Sep" in the page's language: use `formatHeldUntil` (or move it into
      `src/lib/eat-day.ts`). MOBILE-VISUAL-FINDINGS S13-15. Guard: `test:marketing-consent` C9's rule on that page.
  (f) PUBLIC COPY (the final visual pass) — one line each:
      · sw FAQ questions (`faq1q`–`faq8q`, e.g. `faq8q` "Mfumo huu uko sawa?") · `i18n-dict.ts` · `test:i18n`
      · sw AML nav label "Kuzuia Uoshaji" · `src/app/legal/layout.tsx` · `test:translation-safety`
      · Privacy §4 "FIU" unexpanded, "Tanzania Revenue Authority" left in English in zh · `legal/privacy/page.tsx`
        — en text, so a new Privacy version and a COMPLIANCE-DECISIONS entry · `test:privacy-notice`
      · the doubled "Legal" eyebrow at 360 (MOBILE-VISUAL-FINDINGS S08-info-CP02) · `legal/layout.tsx` +
        `legal/_components.tsx` · `test:eyebrow-roles`
      · en FAQ "Will my odds change after I place?" (`faq2q`) · `src/lib/i18n-dict.ts` · `test:i18n`
      · RG §2 "One-way until expiry" jargon and the "24h" style · `legal/responsible-gambling/page.tsx` en block
        — a new RG version, `RG_EN_SHA` re-pinned, a COMPLIANCE-DECISIONS entry · `test:rg-policy`
      · sw help-card subtitles' "kutoa" (`help.depositWithdrawHolds`, `help.openSettledCashOut`) · `i18n-dict.ts`
      · three sw names for the RG settings page ("Kucheza kwa busara" · "Vikomo" · "Mchezo Salama") · dict +
        `legal/responsible-gambling/page.tsx` · `test:rg-policy`
  (g) SMS GLOSS — `admin/system/page.tsx` "SMS credit" `sw="Salio"` → "Salio la SMS" once that wording has
      shipped (today only in this batch's unpushed officer-alarm copy, `notification-service.ts`); bare "Salio"
      reads as the player's wallet balance. Guard: `test:sms-cost-guard` §8.
  (i) ADMIN SEARCH BOXES SPEAK SWAHILI — the shared `SearchBox` (`components/ui/search-box.tsx`) reads the viewer's
      locale (`useT()`), so on the English admin console its word-count hint reads "1 maneno" (also ungrammatical for 1:
      "neno"). Seen on /admin/contacts (S10 drive); the same on every admin search. Fix once: admin chrome passes "en",
      or the hint takes a count-aware form. Guard: `test:i18n` or `test:translation-safety`.
  (h) TYPE-SCALE REDS THAT ARE NOT MARKETING'S — `origin/main` is itself red on `test:type-scale` §3/§6 (a
      static count, 2026-09-27): `admin/desk/page.tsx`, `admin/desk/[id]/page.tsx`, `admin/desk/[id]/why-panel.tsx`
      (sentences in `text-caption` → `text-body-sm`; owner: house bots) and `admin/finance/page.tsx` (a
      `text-caption` sentence, and the hand-typed `tracking-[0.10em]` labels at :253, :262, :650, :668,
      undeclared in `scripts/design-gate/eyebrow-roles.mjs`; owner: finance). Also: `RATCHET_MONEY`'s responsible-gambling
      entry is hidden, not fixed (`profile/responsible-gambling/page.tsx:160` still sets `font-display` over
      `formatTzs`), and `components/layout/public-footer.tsx`'s licence and copyright lines are still 11px
      (the /s shell's is 13px). Re-derive the ratchets in `scripts/type-scale.test.mts` from a run after the
      lifts; they only fall. Guards: `test:type-scale`, `test:eyebrow-roles` (it runs in `test:all`; add it to
      the lane's serial battery).

⚠ RECORDED, NOT OURS TO CHANGE (U34a, 2026-10-02): the TRANSACTIONS export keeps two residuals the contacts export
  does not copy — it decides the msisdn cell on `mayReveal(session.role, …)`, the cookie's role (a demotion never
  reaches a minted cookie, W25), and it writes the raw `q` into its audit row. Its cross-site / HEAD hole, found the
  same day, WAS fixed (the shared export gate, `test:read-tiers` 8.11b) because it was live and a two-line guard.
⚠ RECORDED, NOT OURS TO CHANGE: `selfExclude` keeps the FIRST `selfExclusionStartedAt` across a restore
  and a new exclusion (U10 does not trust that stamp). ERASURE CAN RE-OPEN MARKETING on Postgres — U16's,
  written into its §9 text. ⚠️ `predeploy` at S7's close, all 154 steps run and recorded on the final
  tree: typecheck, build and every marketing/RG suite GREEN; red only in other lanes' areas, none on a
  marketing file — `test:betting-ink` (the landing hero's open-markets figure), `qa:live` (its card-body
  click is intercepted by the market card's own `a.mcardp-open` overlay — selector drift after the
  market-card change, the overlay leads to the same page), and `test:revoked-deadend` (E-381, mid-visit).
  ✅ `test:sms-cost-guard` — the proof of the balance read U49 will lean on — is in `predeploy` since the
  2026-09-26 audit-fix pass (after `test:pii-logs`), and its own §8 asserts it stays there. *(It had run only
  inside CI's `test-all`, never all green on clean main, so until then it gated nothing.)*
  ✅ DONE 2026-09-27 (S7c, both DALs, `test:dal-parity` §17.supersede / §17.liftreason + `red:dal-parity`):
  a re-armed suppression takes the NEW stop's reason, evidence and recorder, a non-`WITHDRAWN` stop takes
  over an active `WITHDRAWN` one (`createdAt` untouched), and `lift` lifts only a `WITHDRAWN` row — so an
  erasure or officer stop can never be lifted by the person's old SMS link (§9 U16's owed half).
  `test:marketing-optout` 32b drives it. ⚠️ `prisma/schema.prisma`'s note on `SuppressionReason.WITHDRAWN` names "a keyword" and
  "the profile toggle" as writers; neither writes a suppression (inbound STOP is not built, U46; the profile
  OFF writes the boolean and a ledger row only).
  ⚠️ PLATFORM-WIDE, OUTSIDE THIS LANE (found 2026-09-27): `src/lib/i18n.tsx`'s mount effect restores a
  stored language by writing the `kp-locale` cookie WITHOUT `router.refresh()`, so a first load after the
  cookie expires paints the server's text in one language and the client's in another. The consent ledger
  is immune (the register form and the profile switch post the language they were drawn in, ruling 7);
  the mixed page is not.
  ⚠️ `test:house-bot-holder-lifecycle` 2.2 (the script writer population over its ceiling) is red on main,
  recorded in `HOUSE-BOTS.md` (the walkers' row) and never widened by us: this lane's
  `scripts/marketing-consent.test.mts` (U7) is one of that population, having joined after the ceiling was
  set on 2026-09-21. S7c's dev-only seed route briefly added three src writers (1.2); since 2026-09-27 it
  takes a real break through `coolOff`, and the src writer set is the same as main's, at its ceiling.

⚠ TRAPS — each cost someone a session somewhere:
  ⛔ `prisma migrate diff` SWEEPS IN every object `schema.prisma` does not declare — the eight trigram
     indexes and the Transaction unique every time. A unit's migration holds ONLY its own statements;
     `test:migration-ownership` refuses an undeclared drop of another migration's object.
  ⛔ ALI-BLADE15's RAM FAILS UNDER LOAD (two heavy jobs at once bluescreen it). A crash mid-`red:*` harness
     zero-fills the files it is writing — or worse, flushes a DEFECT-INJECTED file that greps fine. After
     any unexplained session death: `git status` lists only files you meant to edit, NUL-scan, then grep
     the harness's `to:` strings. Run every heavy job (build, dev server, tsc, Playwright, predeploy,
     test-all, file-mutating `red:*`) through `bash ~/heavy-node-lock.sh run <who> <cmd>` (§0a step 4).
  ⛔ `test:red-anchors` has been red on clean main (S7b saw 4 failures, all in other lanes). Do not trust
     that number: run it on clean `origin/main` in the SAME session and diff the failing LABELS, not the
     count, against your tree. ⛔ Do not bump the ceiling.
  ⛔ SAME-DATE COMPLIANCE ENTRIES CARRY NO ORDINAL. Cite a `COMPLIANCE-DECISIONS.md` entry by its heading
     title (§ "2026-09-26 · Marketing SMS rulings"), never "second": other lanes' merges interleave them.
  ⛔ A CONSENT SENTENCE IS EVIDENCE. Rewording `auth.optionalUpdates`, `push.marketingTitle`,
     `push.marketingBody` or `optout.resubscribeButton` without APPENDING the new sentences to
     `src/lib/marketing/consent-wording.ts` turns every new opt-in into `no_consent`;
     `test:marketing-consent-ledger` fails until they are appended (it prints the sentence to append), pins a
     hash of the existing entries, and checks that the register, profile and resume sentences name 50pick,
     the same noun and SMS in each language. ⛔ Never edit or remove an entry there. ⚠️ The one exception,
     taken 2026-09-27 BEFORE any row existed: the first nine entries' `since` moved from 2026-09-26 (the
     decision day) to 2026-09-27 (the ship date the field means) and the hash was taken again; no wording
     changed. ⛔ If the deploy that first ships them slips past 2026-09-27, `since` AND the hash must both be
     corrected in the deploying commit, before any production row is written under them.
  ⛔ EDITING A FILE IS EXACTLY WHEN A RED ANCHOR ROTS — `npm run test:red-anchors` after touching any
     file an anchor quotes (`responsible-gambling.ts`, `marketing/rg.ts`, the gate, push, watchlist).
  ⛔ Ali-Blade15 checks out CRLF (`core.autocrlf=true`); a guard anchored on "\n" text sees nothing —
     normalise on read.
  ⛔ `test:docs` fails on any `npm run <name>` or `scripts/<file>.<ext>` in `docs/*.md` that does not
     exist. THIS DOCUMENT NAMES SUITES BY KEY ONLY.
  ⛔ A `curl` 200 is not proof a BROWSER reaches a page, and a client crash is also a 200.
  ⛔ A STALE `.next` MAKES EVERY `/api/dev-test/*` ROUTE 404 ON `next dev` (S7c, 2026-09-27): the seed route
     never ran, the admin capture photographed the SIGN-IN page, and the run still exited 0. `rm -rf .next`
     before every dev-server run, and have every capture assert what it photographed (a heading, a label).
  ⛔ AGENTS IN A WORKFLOW RUN NO NODE HERE. Five fix agents told to run tests "through the lock" spent an
     hour queued behind another session's job. Static agents on disjoint files, ONE serial battery after.
  ⛔ `git commit --only <paths>`, new files `git add`ed BY NAME first. ⛔ Never `git add -A`.
  ⛔ THE TRUNK MOVES UNDER YOU. `git fetch origin && git merge --no-edit origin/main` before you start and
     before every push (`git pull --ff-only` refuses on a detached worktree and once you have a commit),
     and re-run your suites AFTER the merge.
```

## The tracker's §10, as it stood on 2026-10-05 — the design-time session order (superseded 2026-10-03)

> ⚠️ **SUPERSEDED FROM S11 ON (2026-10-03).** S10 built U21–U28, U36, U37b and U38a itself, and OD57 + OD58 re-ordered
> the path. The order to follow is §0's critical path (▶ NEXT); the rows below S10 are the design-time pairing only.

| S | Units | Why this pairing |
|---|---|---|
| S1 | U1 · U2 | one key and one number library — everything else reads them |
| S2 | U3 · U4 | the counter and the envelope: what a message costs and what it must contain |
| S3 | U5 · U6 | one helpline; the ledger and the suppression list |
| S4 | U7 · U8 | the gate, and the way out of it (a gate with no exit is not lawful) |
| S5 | U8 (second half) | carried over: S4 shipped U8's store and stopped rather than half-apply the `liftedAt` decision |
| S6 | U9 · U10 | prove the gate runs in the loop; the RG predicate |
| S7 | U11 · U12 | age, and the published promise reconciled |
| S7c | — | the end-to-end review of U1–U12 + S7b and its fixes (2026-09-26 → 27, §2) |
| S8 | — (the S7c ship) | S7c went LIVE (`d3379fef`); no unit attempted (§2). The plan had paired U17 · U18 here |
| S9 | U17 · U18a | the route exists; the book exists, its erasure and export arms (U18b) still owed — reconstructed from its commits (§2). The plan had paired U19 · U20 here |
| S10 | U18b · U19 · U20 · the design · the first build tranche | U18b, U19 and U20 shipped and the consent tie was fixed; then the session that RAN THE DESIGN — the U21–U28 and U29–U40 workflows (a spec per unit, two critics, two decisions files) — and the FIRST BUILD TRANCHE: the U21–U28 decisions commit, U24 commit 1 ∥ U28a ∥ U27a, U35a (deployed alone) and the P1 pure engines (U31-A, U33a-catalog, U37a, U39a, U40-pure). §1 and §2 record what actually shipped; whatever did not opens S11 |
| S11 | U24 c2 · U21 (∥ U26) | the cache mirror before the first contact writer, then the rail that filters on it; the parser track starts with vCard |
| S12 | U22 · U23 (∥ U25 → U27b) | one contact, then bulk (server and UI in ONE push); the CSV and XLSX readers alongside |
| S13 | U28b · U29a · §25 | the round trips close the parser track; the staging tables (dal-parity §24); the ONE bulk keyed-reads commit, built for U30 (X10) |
| S14 | U29b · U30a · U33a | staging's service and privacy arms (LIVE before any staging is exposed); the pre-flight engine; the gate's contact branch and the uncalled import writer (Option A) |
| S15 | U30b + U31 UI + U33b (+ U32's ping) | ONE push, so the live dialog is never a dead end; then deploy and the 20-call ping on www (G7). ⛔ U33b is G4-gated (Option A), so this push waits for G4 |
| S16 | U32b+c · U34 | the start action, `commitBatch`, the loop and the bar (needs the measurement, and G4: the start fixes a basis); the export and its round trip (U34a may land earlier on disjoint files, P2) |
| S17 | U35b · U36 | the campaign tables (dal-parity §26), then the list behind six doors — SMS campaigns in the menu |
| S18 | U37b · U38a | the composer, save and test send (the live switch CLOSED; U35a deployed first); the audience count (U38a, before U33a since 2026-10-02) |
| S19 | U38b → U39b → U40 | serialised on /admin/campaigns/new: the audience card, the estimate it quotes, then the confirmation that freezes both (U40a + U40b; if S19 overruns, U40b opens S20) |
| S20 | U15 · U16 | one send path before anything enqueues; erasure and retention reach every marketing store |
| S21 | U13 · U14 | the window and the cap — now there is a campaign to pause and a MARKETING purpose to count |
| S22 | U41 · U42 | authorisation, then the enqueue it guards |
| S23 | U43 · U44 | the slice, then the pump that drives it |
| S24 | U45 · U46 | scale, then receipts |
| S25 | U47 · U48 | the live page, then its results |
| S26 | U49 · U50 | budget; declarations |
| S27 | U51 · U52 | the guide, then the live drive and the Seal |

⭐ **REORDERED 2026-09-27 (S7c), on Ali's approval** (*"keep going with your plan"* — the plan put to him: the
contacts page next session). He asked when he would see something in the admin console; the old order had
four invisible units first (S8–S9). The pairs are unchanged; only their order moved: the contacts book (U17–U34)
now runs S8–S16, campaigns' visible half (U35–U40) S17–S19, then U15·U16 (one send path must precede U42's
enqueue) and U13·U14 (whose premises needed U35's MARKETING purpose and a campaign to pause). ⛔ U16's rule
for the NEW store — erasure and retention reach it — is part of U18's Accept; U16 at S20 covers every other
marketing store. Still 27 sessions end to end.
⚠️ **Relabelled 2026-09-25 (S6).** This table said S5 = U9 · U10 while §0 called them S6's pair — off by one
since S4 carried U8 into S5. Every row from S5 on moved down one; the pairings are unchanged. ⚠️ §2 rows
written before this date are a log and keep the OLD labels (S4's row says "U35 (S18)", "U42 (S21)") —
read them as S19 and S22.

⚠️ **RE-CUT 2026-10-01 (S10) to the BUILD ORDER, on Ali's standing delegation — S8–S19 are no longer pairs.** S8 and
S9 now say what those sessions did. S10–S19 follow the decided order. U21–U28 in decision C22's order: the decisions
commit → U24 commit 1 ∥ (U28a, U27a) → U24 commit 2 → U21 → U22 → U23, with the parser track U26 → U25 → U27b alongside
U24 commit 2 → U23 and U28b last (U21 is UI only over U24's resolver and filters on the cache commit 2 keeps honest, so it
cannot come first). Then U29–U40 in the U29–U40 critic's order, as DECISIONS-U29-U40 fixed it: U35a first and deployed
alone · the P1 pure engines · U29a · the §25 bulk reads · U29b · U30a · U33a · the U30b + U31 UI + U33b push · U32b+c ·
U34 · U35b · U36 · U37b · U38a · U38b → U39b → U40. What binds that order: nothing writes MARKETING before U35a is
deployed; U29b is live before any staging is exposed; U33a comes after U29b (`erase.ts`) — and AFTER U38a since 2026-10-02 (X24 reversed; it re-threads U38a's `consent.ts` reads);
every `*Action` ships with its UI (X16); the serial-only files — the DAL, schema, migrations and dal-parity; `consent.ts`;
`erase.ts`; the import dialog and `import-actions.ts`; `/admin/campaigns/new`; `contacts/page.tsx`; `rate-limit.ts`;
`optout-service.ts`; the admin shell, nav and roles; `predeploy` — take one edit at a time, and on Ali-Blade15 parallel
agents edit statically with ONE serial battery after. ⛔ G4 is on the import's critical path: S15's push carries U33b and
S16's start action writes a basis (Option A). S20–S27 are unchanged, so it is still 27 sessions end to end.

⚠️ U30, U43 and U47 are the three most likely to overrun (U30 is split since 2026-10-01: U30a · U30b). If one will not
fit, **split it before starting** and write the split into §2 — a half-built unit is worse than a smaller one.
