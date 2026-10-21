# The S5 lead's merge notes and rulings (2026-10-21 PM, OMEGA-COMPILE01, Claude asheib-65)

What the next integration must do, every ruling made in the 10/10 pass, and where each lane's work meets another's.
Paths under `$S` are the lead's scratchpad on OMEGA; re-point them on another machine.


## Do at the integration merge (once)
- scripts/glyphs/map.ts FILL_KEYS: after `"finalWeek",` add
  `"salesPaused", // MASWALI-BUILD S5-DESIGN-HUB (R1-hub P17 addendum): the hub's paused notice is a Callout (a status: Fill) and its glyph is the sales pause's own key (MASWALI-PLAN §10c salesPaused, pause-circle) — it drew the default info.`
  then `npm run glyphs:gen` ONCE with PREVIOUS_SPRITES = the pair production serves at that moment (check the live
  sprite names on www first: production may have moved from d268ef919 to main's head when Railway returns);
  then the hub's paused Callout → `glyph="salesPaused"` (hub lane: one token; it does not type-check before the Fill exists).
- D19a dictionary pin: re-pin ONCE at the merge commit.
- One wording: How's ruleSunset reuses millionea.finalWeekRule's clause (relayed to REGISTER 2026-10-21 PM):
  en "if no ticket gets 10/10, the pool is shared equally by this week's highest-scoring tickets" /
  sw "ikiwa hakuna tiketi itakayopata 10/10, bwawa litagawanywa sawa kwa tiketi zenye alama za juu zaidi wiki hii" /
  zh "若无彩票答对 10/10，奖池由本周得分最高的彩票平分" (finalWeekRule prefixes "Final week: " / "Wiki ya mwisho: " / "最后一周：").
- Platform 11 (c1e3a1b28) gave TicketsHeadGhost `kinds?: 2 | 3`; TICKETS draws the third box with the same signature.
- DOORS × PLATFORM D6 (route-ghost.tsx "/"): DOORS' JourneyHomeGhost props are
  `{ t; locale?; millionea?: false } | { t; locale: Locale; millionea: true }` (+ optional `preview`, the STAFF_PREVIEW chip's
  place, zero height). Platform's line `<JourneyHomeGhost t={t} millionea={millionea} />` fails tsc after the doors merge.
  FIX IN THE MERGE (platform's branch cannot pass locale to its own older type): `const { t, locale } = useT();` and
  `"/": <JourneyHomeGhost t={t} locale={locale} millionea={millionea} />` (+ preview if the ghost knows it); then verify
  D6's route-ghost path (platform's guard/drive) and DOORS' H1 ±2px at 320/360 sw.
  RE-PIN EXACTLY THREE (platform's correction): r4j 3.14 (+ plants 3.14′/3.14″, `homeEntry` = the "/" entry text), r5d 2.1
  (`shape` reads `const { t } = useT();` in route-ghost.tsx), millionea-dark-edge 6.4′ (its plant replaces that exact "/"
  entry). 6.3 untouched. Then `npm run test:millionea-dark-edge && npm run test:visual-pass-r4j && npm run test:visual-pass-r5d`.

## Lead rulings 2026-10-21 PM (record in §0 / DESIGN_AUTHORITY with the merge)
- L14 (TICKETS, the dead lock moment): a "close" MillioneaFact in maswali-player.ts (type + factsOf) at the week's
  RECORDED closedAt, only for a ticket live at the close, played once (.m-seal on the stub's lock line), reduced-motion end
  state; every consumer of MillioneaFact handles the kind. Not: deleting .m-seal (Ali's N-block) nor a dead prop.
- test:dead-css baseline: `.mat-raised-i` removed (consumed by the ticket card M1 and the hub's held row L4) — TICKETS and
  HUB both delete the same line.
- The paid seal's serials: stacked facts, each whole on its own line (not " · ", not joinList) — Codex vis-p superseded.
- DRIVE-week ledger (TICKETS × REGISTER): ONE builder — REGISTER splits a core money record of any visibility (no filter,
  no public cache); the public register read keeps its PUBLIC refusal + cache and calls the core (byte-identical for
  PUBLIC); the ticket page (holder-checked) uses the core for its own week. Until then no ledger on a DRIVE ticket.
- zh spacing (DOORS implements, i18n zh only): no space between two Han characters — checkWindowUntil "异议窗口至{when}";
  nextEvent / eventAt only if their {when} always starts with Han (callers traced); a rendered-string guard + plant.
  Typography under Millionea's zh convention, not a word change (Ali's "ship the ruled words" stands).
  DONE by DOORS d47b37e90 (checkWindowUntil, nextEvent, eventAt; guard doors 1.21, plant 4.13). Relayed: HUB nextOpensAt
  (+ closeMoved / weekVoidingBody if Han-initial fill), TICKETS emptyTicketsNext. At the merge: grep every millionea zh
  template once more for " {x}" after a Han character with a Han-initial fill.

- Modal focus return (SLIP implements in modal.tsx): `node.focus({ preventScroll: true })` in PAGE.focus — a dialog opened
  from a sticky control no longer jumps the page on close (use-modal-lock's overflow:hidden un-sticks sticky; focus()
  scrolled to the opener's in-document place: −2,248px at 360). A SECOND RULED CLASSIC CHANGE (recorded like D8). Guard at
  360 (+ WebKit if possible), activeElement = opener. Check the parity candidate compare for it.
- D15 (PLATFORM, from register critic M5): the chat FAB (.cm-fab) gets the Needle's census rule, FADE ONLY: over a text or
  .amount box at rest → a NEW semantic token `--state-yield-opacity` (state-tokens.css + DESIGN_AUTHORITY; "floating
  chrome yielding to content; live, never disabled" — NOT --state-disabled-opacity), its value MEASURED as the highest
  opacity at which every covered figure still meets the contrast minimum (.45/.55/.6 tried); :hover/:focus-visible
  restore 1; pointer-events stay on. THIRD ruled classic change. REGISTER's overlap check (tiles week-beforeFinal-en-320, week-sunset-en-320/360, How 320/360)
  re-run on the merged head.
- §T5 (DOORS implements once in keepFact/MaswaliFacts): every digit run in a Millionea fact line is .mono tabular —
  counts, %, "10/10", week numbers; no exceptions (DESIGN_AUTHORITY §T5 + families rule). Round 2: every lane re-shoots;
  tell HUB/TICKETS/REGISTER/SLIP at the merge (their fact lines change face).
  DONE by DOORS 8881bd0c4: `numeralRuns` (money .amount first, then numeral tokens .mono); display-face titles opt out
  (`numerals={false}` / keepFact(…, { numerals: false })). Side effects: plain-string money facts now .amount whole
  (REGISTER's weekFacts); DOORS re-pinned maswali-register.test.mts nowrapRuns (balanced span read) — keep at merge.
- DOORS moves the phase helpers (millioneaWeekPhase, weekPhaseWord, msOf, ordinalOf, gradableOf + types) verbatim into
  src/app/millionea/millionea-phase.ts (pure); millionea-view.ts re-exports them (journey-home 7.client: "/" reached
  maswali-carry + glyph-swap via millionea-view → maswali-seal-line). AT THE MERGE: fix the root once — millionea-view.ts
  imports `sealLineOf` as a VALUE from the "use client" seal-line file; move sealLineOf to a pure module (after the seal
  line's lanes settle), then check every route's client graph (journey-home 7.client and the first-load census).

## Lanes resumed 2026-10-21 ~12:35Z (SendMessage to the agent id)
- HUB a466ab2f848ba85f6 · SLIP a7295fc995c992e3c · TICKETS ab18c40ccf7d99c15 · REGISTER a65be128436b32119 ·
  DOORS a186c0f96051c12f9 · PLATFORM ae0c5485f207b1579 · FIX-SRV a9165eaefe7383d53 (the five lock/audit functions)
- PARITY a7ddb001b5154df82 resumed ~12:50Z: re-baseline at main bfa0b7d57 (tree kipindi-mln-pbase) + null compare, then stop.
- S7 a3b2b0171c14ef814 resumed ~13:15Z on mln-slot-s7.sh (slot 4); switch to s7b (4-5) only after U43 lends slot 5
  (asked 12:50Z; asheib-bb "waiting", no answer yet). Items: refused-release lift in sections, S17 rush, F7 6-8 render
  read, red:house-bot-c5 + red:house-bot-console.
- Not resumed yet: S6-N a14a0b895647644a0 · FIX-PLAYER a1bee7e5da8663f2c (P6 on a ticket moved to TICKETS)
- Release b4fcc4e4b: + delete .kp-track-end--10 (dead since U43's 1384383fd; dead-css red on main) with r5a 7.2 / r7c.

## Slots (2026-10-21 PM): U43 (asheib-bb) lent 5-8 while paused. S5 lanes: mln-slot-s5x.sh = 1,2,3,5. S7: mln-slot-s7c.sh
## = 6,4. 7-8 free. S6-N leftover chains: slot 4 (mln-slot-s7.sh). Lead: mln-slot.sh (MLN_SLOTS=3) or s5x.
- REGISTER shared pieces: d5446df25 + 26503c06c (WeekRow fixes for DOORS; r9a 4.10 mark registry) — merge 26503c06c.

## Parity (PARITY lane, done 2026-10-21 ~14:15Z): baseline at main bfa0b7d57 52/52 (224 cells, 2074 s) + null compare
## 68/68 (2352 s), no flaky cell. Baseline file: s5par/parity-v5-bfa0b7d57.json. Server tree kipindi-mln-pbase (main,
## real node_modules) left in place — remove after S5 lands.
- CANDIDATE COMPARE at the final integrated head (rollout dark; Playwright 1.59.1); first, this must print NOTHING:
  `git diff --stat 9a0c6b033 HEAD -- scripts/qa-classic-shell-parity.mjs scripts/qa scripts/lib/question-time-mask.mjs scripts/lib/parity-browser-cycle.mjs scripts/lib/classic-not-found-expected.mjs scripts/lib/classic-shell-navigation.mjs scripts/qa-parity-glyph-swap.generated.mjs`
  then: `bash $S/mln-slot-s5x.sh par bash $S/mln-server-run.sh maswali-coord-20261019 3541 $S/s5par/candidate-compare.log -- node scripts/qa-classic-shell-parity.mjs --compare $S/s5par/parity-v5-bfa0b7d57.json --allow-base`
  Expect: maswali-neutral-404-en / -sw each in all 32 cells (P14's 404 hint); anything else must be named or fixed. A
  one-off hydration timeout → re-run on a fresh server; recurring → bounded retry with its own plant.

## FIX-SRV 2b (7914904c8 + 827977a75) merged into the release at 6e6949a4f (clean). Its own run: engine 182/189 (floor
## raised), red --only (60)-(79) 20/20, purchase/settle/void/integrity/close-race/player/shared-paths/batch-edit/
## e2e:maswali-fault/e2e:maswali-money/results-freshness/house-bot-money green; money-path 30/30, money-action pass.
- Resumed for: (a) the five acts report `recorded` + the admin's owed-audit feedback (same as seal); (b) createWeek's two
  writes in one transaction (DAL tx on both stores → dal-parity); (c) seedDefaultSources inside openWeek's tx.
- S7 told: fix its own openWeek writes (editDraftQuestion outside tx; deadlines_refrozen audit inside the lock) and the
  sunset audit (afterCommit + recordOwed) NOW; at the S7×S5 merge: imports keep both; openWeek take fix-srv's block + S7's
  `finalDeadlineAt: due.finalDeadlineAt` (stampOpen + opened audit); closeWeek stampClose + S7's `closedAt: new Date(atMs)`;
  re-point engine plants (76)/(77) at S7's sunset lines; 12.3 needs the sunset audit wrapped.
- S7 did its own openWeek/sunset fixes at 4699b4898: copied fix-srv's `questionStore.editDraftQuestions(edits, tx?)` (both
  stores, byte for byte except memEventKindCheck) and `recordOwed` / `OwedAudit` / `__setMaswaliAuditWriterForTests`
  (byte for byte, not GateNow) placed just above sealQuestion where fix-srv's sit → at the S7 merge KEEP ONE COPY (check
  for duplicate identifiers if git keeps both). openWeek takes lockTx; refreeze edits in one editDraftQuestions(…, lockTx)
  + refreeze audit via afterCommit+recordOwed; sunset audit wrapped. adversarial 197/206; DL.6, DL.7, SU.5a, SU.6a.
  Also S7-F8 7 (ab7852d8b, one sectioned lifter) and 8 (64eaf4d9c, each lift joins its section's tx).
- Carried (decided, no action): attestation fails closed for old drafts until one recorded edit; admin week page English.

## main = 8175dbca3 (2026-10-21 ~15:00Z, asheib-bb's harm-marker mute on bfa0b7d57; its gates 44/44, red:rg-doors 51/51,
## build, qa:live 386/0). MERGE into the release after the running gate job (COMPLIANCE-DECISIONS: keep both top entries).
## main moving (2026-10-21 ~14:40Z): asheib-bb (U43 session, urgent marketing fix for Ali) pushes ONE commit on main
## (branch mute-harm-markers on bfa0b7d57): MARKETING_HARM_MARKERS_MUTED = true (rg.ts), consent.ts comment, rg-doors
## test + anchors, campaign-audience test, dry-fire world, marketing-u52a operator list, COMPLIANCE-DECISIONS entry. When it
## lands: merge main into the release again (COMPLIANCE-DECISIONS: keep both top entries), re-run what it touches; the
## watcher deploys main's head when Railway returns → read-back that sha (covers U43 + this) and message asheib-bb.
## Parity baseline was at bfa0b7d57: the marketing commit serves no classic page change? CHECK its diff before the
## candidate compare (if it changes a served classic page, re-baseline at the new main).

## Findings for later lanes
- S6-N (bd74c982c): red:maswali-money-path 41/42 — (6b) "a voided ticket's refund reverses wagering it never accrued"
  MISSED (purchase 7.3b stays green on S6-N). The S5 release (b4fcc4e4b) catches it: 30/30, 0 missed (lead/gate). So the
  blind guard is S6-N's own → S6-N lane fixes it in a FRESH tree (kipindi-mln-not is used by its leftover chains, whose
  restore step `git checkout --` any modified file — never edit there while they run).

## Done by the lead 2026-10-21 PM
- Integration int1 (fix-srv 9935dfd47, fix-player 54512f311, parity 9a0c6b033, fix-platform 1-7 f74aaa312, main bfa0b7d57)
  → release fast-forwarded to 0b918f4ff and pushed; int1 + codex/maswali-coord-20261019 deleted (contained).
- codex/maswali-s5-vis-p / -vis-r archived (F:\kipindi-archive\codex-s5-vis-wip-20261021.bundle), relayed to TICKETS /
  REGISTER, deleted. Only codex/maswali-s6-ld-prep-20261019 remains (S6 L+D prep, for the S6 lanes).
- Read-back tree C:/50pick-ssd/kipindi-mln-rb (detached at main, node_modules JUNCTION → maswali-coord's: unlink first
  when removing) + lead/readback.sh <full-sha>.
- Critics (round 2 later): hub af71a0d46f9c7c17b · slip a098461e0a0cb7d33 · tickets a8f73f41219139608 ·
  register a5845098c9976e387 · doors a006cc6402e6659ab · motion ab5ae996cb838ebd6
