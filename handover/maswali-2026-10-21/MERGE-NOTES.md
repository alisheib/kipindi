# The S5 lead's merge notes and rulings (2026-10-21/22, OMEGA-COMPILE01, Claude asheib-65)

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
- MaswaliLedger row `note` (REGISTER, found by TICKETS, tile s5dtkt/after-main/ticket-wonBig-sw-320-s2.png): the note
  moves UNDER the label+value on its own full-width line, its parts drawn as kept facts (never torn: "imelipwa kwa /
  washindi" at 320 sw). DONE by REGISTER b05e345ea (re-shoot won/rolled/voided at the merge; TICKETS too).
- zh `resultsOut` "15 个结果已公布 {n} 个" KEPT (count-of-total, as en/sw; Ali ruled the words final — a change needs a defect).
- D15 (PLATFORM, from register critic M5): the chat FAB (.cm-fab) gets the Needle's census rule, FADE ONLY: over a text or
  .amount box at rest → a NEW semantic token `--state-yield-opacity` (state-tokens.css + DESIGN_AUTHORITY; "floating
  chrome yielding to content; live, never disabled" — NOT --state-disabled-opacity), its value MEASURED as the highest
  opacity at which every covered figure still meets the contrast minimum (.45/.55/.6 tried); :hover/:focus-visible
  restore 1; pointer-events stay on. THIRD ruled classic change. MEASURED (platform, ceb06e8cb, 26 figures, 13–16px):
  .45 → 6.28–6.77, .55 → 4.51–4.97 (zero margin; p10 under the icon 4.1–4.5), .60 fails all. RULED .50 (≈5.3 everywhere)
  if its p10 ≥ 4.5 on every covered figure; else the highest value whose p10 passes. DONE edee61f4a: .50 = exactly the
  highest passing (32 figures; p10 4.58–5.31; /wallet tightest; .55 → wallet p10 3.90), recorded in state-tokens.css +
  DESIGN_AUTHORITY §A item 1. Classic case = /wallet (U43 keepout
  hides the bubble on /markets, /, /results, /watchlist, /updown).

## 2026-10-22 — ALL LANES MERGED: release 7e9a314f0 (+ §0 2f79ff04a). REGISTER 318d92741, maswali-ui 4.8b flake fixed
## b4853f23d, SLIP 0c1c6c7ad (§M8a: SLIP's way-back = item 18; DOORS' r5j/r8a/design re-pins per owners), the register
## seed's attest 29f72241a, salesPaused Fill + one glyphs:gen 7e9a314f0 (app.b899eae1.svg; PREVIOUS = app.76a3696e +
## admin.75aeb290 = main's GLYPH_SPRITES). tsc 0. ROUND 2 on claude/maswali-s5-r2-<lane> branches (brief critics/ROUND2.md).
## test:all on the gate tree (7e9a314f0), STOPPED by the lead at 08:03Z for the clean stop — 706 result lines; every
## "0.0s" FAIL (settle-winner-atomic-db, settle-refund-atomic-db, u43-snapshot-commit, u43-hedged-result-db,
## updown-position-read-fail-db, updown-objection-verdict-db, u43-market-history-join, journey-measures, house-bot-ops, …)
## is the STOP, not a defect — they never ran. Full log: $S/lead/gate2/test-all-7e9a314f0.log. Real reds, by owner:
## - server-bound (need a running server — the render jobs run them): responsive, motion, revoked-deadend,
##   admin-section-gate, needle-rest (needle-rest is red on production since U43's 7e3a06ea0 anyway);
## - DOORS: maswali-fence 5.1 — an `=== "UPDOWN"` branch in src/app/results/millionea-results-view.tsx (1) not in the
##   census → classify it; guards-exist phantom (fixed on DOORS' r2 branch, ed12bcf35);
## - SLIP: updown-filter-sheet 7 + visual-pass-r10 1.4/3.1 (the grouped caret rule — its r2 WIP plan); measure: NEW
##   hand-typed page widths `max-w-[640px]` in millionea/slip/page.tsx and slip-ghost.tsx (+ more listed) → the kit's
##   measure or the ratchet with a reason; r5h 3.5 DOM-mark writers in operation-result-modal.tsx + maswali-slip.tsx;
## - PLATFORM: r5h 3.5 ChatRoot.tsx (D15's census writes a DOM mark → classify); visual-pass-r7c 1.4 (the notices + both
##   preview markers draw through one component — check D12's bar);
## - REGISTER: ui-consistency (how-ghost h-10);
## - money census: wallet-status-writers 1.2 (42 sites vs 39 pinned — read §1's list: which 3 are new, from FIX-SRV's acts?);
## - house-bot: holder-lifecycle 15/1, disclosure, blob-pin (D19a, expected until the final re-pin), harm-watch 2/1 (a DB
##   suite) — read each; spacing-scale — read.
## RE-RUN test:all on the final integrated head (after round 2) — this partial run is the map, not the gate.
## (earlier note) RELEASE-ONLY REDS (green on main 67e47f8d2):
- test:ui-consistency: NEW numeric-size utility `h-10` in src/app/millionea/how/how-ghost.tsx L43 ("h-10 w-[160px]
  rounded-control") — REGISTER's: use the kit's size or re-baseline with a reason.
- test:wallet-status-writers 1.2 RATCHET: the census finds 42 wallet write sites, pinned 39 — read §1's list (which 3 are
  new: FIX-SRV's acts / S5 purchase paths?) and move the pin only after reading each (money path).
- test:guards-exist: NEW PHANTOM `qa:maswali-doors` cited in src/components/maswali/maswali-home-card-ghost.tsx:30 (no
  such script; the suite is test:maswali-doors) — DOORS': cite the real script.
- test:house-bot-holder-lifecycle 15/1 and test:house-bot-disclosure FAIL — read (D19a's dictionary pin is expected red
  until the final re-pin; check whether these two read the dictionary blob too).
- (test:house-bot-blob-pin: expected red — D19a re-pinned once at the final merge.)
- millionea-shell 1.1b counts MillioneaPreviewMark calls (9): goes red as the lanes remove theirs in round 2 → at the merge
  re-pin to "no call left" and delete the component (PLATFORM names its file/tests).

## ROUND 2 STOP (2026-10-22 ~08:00Z, Ali: "finish here on a clean level … continue Maswali from a new prompt")
- REGISTER r2 at a8e25a07d (claude/maswali-s5-r2-register): DONE items (1) covered() accepts --state-yield-opacity (+ waits
  for the bubble's opacity to settle), (4) preview-mark calls removed (index, week, How; millionea-shell 1.1b re-pinned to
  the other pages' 6 + plant; register-cache pageGate re-pinned), + text-balance headings on all three pages. NOT DONE:
  (2) the full re-shoot + read (stopped; partial tiles set aside — don't read), (3) the SEP measurement (built into the
  shot script, not run). Resume: `TSC=1 bash $S/mln-slot-s5x.sh dreg bash $S/s5dreg/r2/job-r2-shots.sh` (~45 min, 5 GB
  free), then sheets.ps1 / crops.ps1 / batches.mjs + readers.json + reader-brief.md (all in $S/s5dreg/r2/), read every
  tile sw first + motion frames, grep SEP/MEASURE lines, fix, re-score R1-register + How's R1-motion rows.

- HUB r2 at a7b7c894c (claude/maswali-s5-r2-hub; a7b7c894c is an empty WIP commit listing what's verified/left): DONE
  (static suites only — maswali-hub 55 (floor 53→55), design 141, r9a 63, r5j 62, journey-shell 566, ui 151,
  gold-is-money 61): L4/L20 (MaswaliHeldTicketRow gets t, cancelUntil from millioneaHubCancelEnds, serverNow); L5 (the
  graded week's facts = one row-door to /millionea/register/<code>; both carries link, PUBLIC only; DRIVE stays words);
  the preview-mark call gone; §T5 in the hub's own lines (tagline, cap line, "See all n tickets", the end statement, the
  voiding counts, the final week's number, a stand-in reserve's label). NOT RUN: tsc, red:glyph-source,
  red:journey-shell, drives a/b/c (c = STAFF_PREVIEW via the console's typed confirmation: one platform bar above the hub,
  none in its column, nothing to buy, the bar on Millionea pages and /results only). Resume:
  `bash $S/mln-slot-s5x.sh dhub bash $S/s5dhub/heavy-r2.sh` (tsc + red twins + drives → $S/s5dhub/r2/tiles-<run>), read
  every tile sw first + the drive's INFO lines, re-score. The loading-ghost 9 (UI, Motion) stays: the drawing can't know
  the reader's held rows without a read in loading.tsx, which by design makes none.
  Cross-lane gaps HUB saw (unconfirmed in tiles): TICKETS' maswali-ticket-cancel.tsx:38 CancelClock `<time>` lacks
  `.mono` (§T5/L7); the hub's no-week EmptyState body clock ("…Monday 00:01", page.tsx:612) needs the kit's opt-in
  numeral part (TICKETS is adding it to EmptyState in its round 2 — the hub then passes `numeralRuns`).

- DOORS r2 at 410997dc7 (claude/maswali-s5-r2-doors): DONE 5849ce9e3 (H1 through the route ghost's "/" — byte-identical to
  the journey home ghost in 3 langs ± Millionea; the preview chip moved UNDER the title at every width so a preview card is
  the common card's height; new `qa:maswali-door-preview` STAFF_PREVIEW pass), ed12bcf35 (guards-exist phantom
  `qa:maswali-doors` fixed → 9/0 — that test:all red is DOORS'-fixed on this branch). WIP 410997dc7 (unverified):
  maswali-player-shots clicks /^Buy ticket/ (SLIP renamed "Cut ticket"); shootDoorPreview asserts /results' empty state
  when no weeks (a STAFF_PREVIEW server's seed answers 409). STAFF_PREVIEW pass 94/100 (6 fails = one wrong check, fixed
  in WIP). Static green: doors 56 (floor 56), design 141, r9a 63, r4j 92, i18n 3141 keys, dead-css, guards-exist 9.
  LEFT: re-run the ACTIVE door drive (job-doors.sh) + qa:maswali-door-preview (job-preview.sh, expect 100/0), read every
  tile, re-score R1-doors + the card row of R1-motion.
  Red NOT DOORS': ui-consistency (REGISTER's how-ghost h-10); visual-pass-r5h 3.5 — DOM-mark writers not yet classified
  in ChatRoot.tsx (PLATFORM D15), operation-result-modal.tsx and maswali-slip.tsx (SLIP) → those lanes classify them.

- SLIP r2 at fe2d9fc79 (claude/maswali-s5-r2-slip; fe2d9fc79 = WIP): DONE d8e17bd73 (pills per ruling (a): group label
  `draftTicketsNoun` "Tiketi"/"Tickets"/"彩票", each pill "1 · 15/15", accessible name noun + count; kit tabs.tsx
  `TabItem.ariaLabel` — byte-identical for 5 caller shapes × 3 langs vs 7e9a314f0, slip-design 1.9 + plant), 723f41ea9
  (MaswaliGhostHint beside "View ticket"), 151208cce (TICKETS' cancel confirm: panelClassName kp-mln-zh, handoff,
  panelDelay — 9-line hunk), 0d4808239 (slip page's preview-mark calls gone; millionea-shell 1.1b → "at most 9, none in
  the slip page"). slip-design 80/0, ui 151, design 141, i18n 22 (3142 keys), multi-slip 16, tickets 39, tsc 0. WIP
  fe2d9fc79: the multi-slip drive finds pills by name + a "two pills on one row at 320" check (NOT RUN). LEFT: r10 1.4
  re-pin (read the grouped rule, require the exact fsheet selector; plant: rotation moved to the wrapper; control: main's
  two-selector rule), r10 3.1 list entry (the slip chevron, "edge" kind), updown-filter-sheet 7 re-pin (its regex needs the
  fsheet selector last — same cause, 57/1 on the release, green on main), then r10 90+/0, updown-filter-sheet 58/0, r9a
  63/0, tsc, red twins; the re-shoot (no-week, way-back guard --prove-red Chromium + WebKit, the drive, motion, full
  shots; measure two pills on one row at 320/360 en+sw; "View ticket" landing on the free-cancel band; the cancel's
  confirm → result under one dim); re-score.
- TICKETS r2 at 9dcd6fc6e (claude/maswali-s5-r2-tickets; 9dcd6fc6e = WIP): DONE 908a261b6 (preview mark gone from both
  tickets pages; millionea-shell 1.1b re-pinned to a CEILING "at most 9 calls, the tickets pages none" — so no lane edits
  an exact count; re-pin to "none left" at the merge), 5e57b5867 (the free-cancel clock `.mono`, door + held row),
  c60894b88 (the seal's serial whole in mono, "1 ticket at 10/10" numerals mono, held/forfeited counts via numeralRuns).
  WIP 9dcd6fc6e: EmptyState's opt-in `bodyPart` (emptyStateBody(body, part?)) + client wrapper `tickets-empty.tsx`
  passing numeralRuns (11.2 byte-identity vs 7e9a314f0 for every empty/notice body + 2 plants; r4k/r3c re-pinned).
  Checks: tickets 41 (red 65/65), ui 151, design 141, hub 53, journey-tickets 51, millionea-shell 18. LEFT: tsc after
  908a261b6; re-shoot list-empty-*; the full re-shoot (states, moments, ghosts, sunset — incl. ticket-wonBig-sw-320 to
  prove REGISTER's note fix, F's Visual 9 → 10); re-score. The hub's no-week EmptyState can pass numeralRuns through
  the same bodyPart once merged (HUB's gap).
- ⛔ DARK-SAFETY BLOCKER FOUND BY PLATFORM (must be fixed before S5 deploys): `src/app/markets/loading.tsx:16` (DOORS
  ebb6caa5f) ALWAYS passes `millionea={millionea}` and `preview={…}` to the client `MarketsGhost`, so every visitor's
  /markets payload carries `"millionea":false` — qa:live's dark section fails it ("/markets carries no Millionea entry, and
  no Millionea prop in its payload, for a signed-out visitor while Millionea is STAFF_PREVIEW … traces prop:"millionea":"),
  and the rule covers WITHDRAWN too, so production would trip it. FIX (D3's pattern): hand the props only when true —
  `{...(millionea ? { millionea: true as const, ...(preview ? { preview: true as const } : {}) } : {})}`; re-pin DOORS'
  markets-ghost/journey-question pins; re-run qa:live's dark section + the door drive. Check the other ghosts/loadings
  for the same shape (route-ghost "/" hands `millionea={millionea}` too — D6's; verify its payload rule).
- PLATFORM r2 at 68b8fab9d (claude/maswali-s5-r2-platform): DONE + verified — (1) red:journey-header-fit --alone 10/10
  caught, nothing to fix; (2) `.btn-ghost/.btn-claret/.btn-aqua-ghost:hover` gated under @media (hover: hover)
  (test:hover-touch 13/0, qa:hover-touch 14/0; D11's entry recorded in §M8a item 11 UNNUMBERED beside the More panel /
  SLIP / D15 — number it at the merge); (3) qa:live PREVIEW_TESTIDS += `millionea-preview-mark` (plant proof); (4) the
  kit NoticeBar keeps its last word pair together via keepLastWords (test:notice-bar-widow 12/0, qa:notice-bar-widow 145/0
  — two widows joined: Millionea en 320 "staff only." and the journey marker sw 360 "kabla haijazinduliwa."). LEFT: tsc
  on the r2 tree (only notice-bar.tsx typed); the reader sweep (191 scripts, list $S/s5fplt/sweep7-list.txt); the rest of
  the re-shoot (D13, D14, D15 guard + red, D10).
- MillioneaPreviewMark (delete at the merge once every call is gone): component src/app/millionea/millionea-parts.tsx:47;
  calls how/page.tsx:151, page.tsx:530, register/[week]/page.tsx:460, register/page.tsx:68, slip/page.tsx:65 + :133,
  tickets/[serial]/page.tsx:197, tickets/page.tsx:148, results/millionea-results-view.tsx:41 (DOORS' /results — not in
  any lane's r2 list: remove it at the merge); tests scripts/millionea-shell.test.mts §1 (1.1 + plant lines 82-90, 1.1b
  line 86), scripts/maswali-results-section.test.mts (pin line 72, plant line 186); doc comment
  src/components/layout/millionea-preview-bar.tsx:6.

## RELEASE at 08228d0c7 (17:00Z): + PLATFORM (a118f7545: r5d 5.1 classifies FIX-SRV's audit-warning reader) + TICKETS
## (2698b3bb5 per HUB's map; 730a8b615: the tickets seed and the hub's dev route attest/move with FIX-SRV's API). tsc 0;
## maswali-design 141, tickets 39, hub 53, doors 53, ui 151, register 46, design-register 27, r4j 92, r9a 63, r5d 45,
## dead-css, chat-yield 28, dark-edge 36, journey-shell 566, player 187 per store, hub-reads 17 per store.
## LEFT TO MERGE (dry-run vs 08228d0c7): REGISTER 33a2b4ea9 → docs/DESIGN_AUTHORITY.md, package.json,
## scripts/maswali-design.test.mts; SLIP 5139fce7d → DESIGN_AUTHORITY.md, package.json, maswali-design.test.mts,
## visual-pass-r8a.test.mts, globals.css. DESIGN_AUTHORITY §M8a numbering: item 11 = PLATFORM's "first change" (the More
## panel), 13 = SLIP's modal focus (second change), 14 = REGISTER's (row with no figure stands alone + one core),
## 15/16 = TICKETS', D15 = the third ruled change (PLATFORM's §A item 1 + its §M8a text) — renumber so each item keeps its
## content and every cross-reference ("item 13", "§M8a item 11") still points at the right one (grep them).
## After both: a full tsc, the design/hub/tickets/register/doors/slip suites, `test:all` light part, then round 2.

## TICKETS DONE at ae2ce1f0b (16:49Z): every row 10 except F (won) Visual 9 = the ledger note (REGISTER b05e345ea fixed
## it → re-shoot won tiles at the merge). qa:maswali-ticket-shots main 3194/0 + sunset 629/0; moments 8/8; ghosts 12/12
## (≤1px); test:maswali-tickets 39 (red 60/60); tsc 0. maswali-player.ts L14 lines: line 818 kind union gains "close";
## after the cancel push: `if (week.closedAt && Date.parse(t.createdAt) < Date.parse(week.closedAt) && !(t.cancelledAt &&
## Date.parse(t.cancelledAt) <= Date.parse(week.closedAt))) facts.push({ kind: "close", at: week.closedAt });` — its one
## consumer the page's `lock: has("close")`; test:maswali-player 8.7 re-pinned to 18.
- CLASSIC-VISIBLE CHANGE (name it in the parity compare + rulebook): a 6–7-digit platform win seal no longer wraps
  "TZS / 1,234,500" (seal fit factor = the money face's 0.6em; 4-digit wins pixel-identical).
- ROUND 2 wiring: HUB passes `t`, `cancelUntil`, `serverNow` to MaswaliHeldTicketRow; SLIP renders
  `<MaswaliGhostHint serial cancelUntil>` beside the stamp's "View ticket" and wires its kit options (`kp-mln-zh` panel
  class, `handoff`, `panelDelay`) into TICKETS' cancel confirm in ticket-acts.tsx. L15 (two zh nouns for ticket) → Gate B.

## RELEASE at ff9933e45 (16:47Z): fix-srv 1e88fdb93 + DOORS + HUB merged; the hub's dev act route and hub-reads now call
## moveClose with expectedClosesAt and attestParity with readVersion (FIX-SRV's API); tsc 0; hub-reads 17/17 both stores;
## player 187; engine 210 PG; doors 53 (its 1.11′ mono pattern takes a count's slash: "15/15"); hub 53; r9a 63.

## PLATFORM DONE at f2bcba995 (D1–D15 + qa: drives; 23 commits). D15 .50 (Run I 28/0 + --prove-red 8/8; Run H /wallet
## 10/10 + red 4/4). D12 preview bar qa:millionea-preview-bar 49/0; D13 qa:millionea-break-nav 7/0; D14
## qa:journey-rail-gaps 18 cells ≥8px. Sweeps: D12–D16 228/245 green, the rest red on base or need a server.
- AT THE MERGE: §M8a item 11 now calls the More panel "the first change"; SLIP's text = the second; D15 = the third.
  qa:maswali-register-shots' covered() must ACCEPT opacity == --state-yield-opacity (.50) (it still reports a cover).
  The route ghost's "/" locale (done in the DOORS merge); TICKETS' TicketsHeadGhost signature; MillioneaPreviewMark's 9
  dead call sites → remove in round 2.
- PLATFORM LEFT: red:journey-header-fit (--alone, ~30 min) never run in the lane.
- FINDINGS (not changed): sw four-tab rail "Juu na Chini"/"Tiketi zangu" 4.0px apart at 333px; `.btn-ghost`, `.btn-claret`,
  `.btn-aqua-ghost` hover fills not gated by @media (hover: hover); MASWALI-PLAN §0 line ~126 still describes the observer
  D10 deleted; NoticeBar leaves "only." alone at 320 en; qa:live PREVIEW_TESTIDS could add `millionea-preview-mark`; a dev
  overlay "1 Issue" on /wallet once (not investigated).

## REGISTER DONE at 33a2b4ea9 (round 1, every cell 10): commits 2–12; maswali-register 58 (floor 53→58, red 107/107),
## design-register 34 (red 57/57), week-money 10 (red 13/13); shots sunset 481/15 + states 833/16 — every failure a D15
## chat cover (fixed by D15 at the merge). Tiles older than commits 8/11/12 for selling/settling/objections/resolving.
- H4 changed: "Corrected on objection" not shown (the record holds no correction flag; a re-seal overwrites) — the page
  shows the officers' count only. L17 is Ali's / S6's.
- ROUTED TO LEAD: the fact separator `--mln-sep 0.9em` (VIS-P, globals.css) looks tight inside tracked mono eyebrows
  ("AKIBA·A1–A5"; crop scratchpad/batchE-crops/band-sw1280.png) — decide in round 2.
- RULED (lead): How's ruleSunset says "that week's / wiki hiyo / 该周" where HUB's finalWeekRule says "this week's / wiki hii /
  本周" — RIGHT: How speaks of a future final week; the clause is otherwise one wording.
- REGISTER's six sonnet tile readers were stopped by the lead at 16:44Z (their notes: scratchpad/s5dreg/*notes*; batch D's
  "OLD-contains-fabricated" file — trust only its corrected part).

## FIX-SRV DONE at 1e88fdb93 (16:31Z): (a) every act (open, close, week void, carry, stop, MOVE) reports `recorded`
## (owed rows via recordOwed after commit; the open's market row owed via createMarket(input, tx, owe)); one wording and
## one element (src/app/admin/maswali/audit-warning.tsx) for every lost-audit warning; (b) createWeek one tx (DAL
## weekStore.create / questionStore.createMany take tx?); (c) seedDefaultSources moved BEFORE the open's lock (inside the
## tx the first open on a fresh DB refused every source). Dev-only /api/dev-test/maswali-audit-fault (404 prod, 409 with
## a DB, staff). engine 202/210 (floor raised), red engine 105 plants, dal-parity 2377 + red 285/285, admin drive 105/0.
## Its new engine §14 census FLAGS S7's own openWeek writes on the merged tree until S7's 4699b4898 is in (it is).
## The S7 meeting points widen: openWeek (signature, lock line, seed before the lock, owed tail), closeWeek, moveClose,
## sunsetMaswali (signatures + owed tails; S7 edits all three), createWeek, voidWeek, claimCarry, seal/confirm tails;
## createMarket's 3rd parameter; the two DAL creates' tx?.

## HUB at 9776e6c2c (final for the day, 16:31Z): most cells 10; drives run a 80d2d35da 1285/1 (L16) + run b 9776e6c2c
## 245/0; hub-reads 17/17 both stores; player 186/186; maswali-hub 53 (floor 34→53). 882 tiles read.
- Below 10, waiting on merges: held row's aria/hover L4 + free-cancel window L20 → TICKETS' row b6eb551bf (data ready:
  millioneaHubCancelEnds; one line at the merge); paused Callout glyph → the salesPaused FILL_KEYS switch; grading week's
  L5 door → REGISTER's live register page (until then a pending carry names its week, links nothing); tab L11/L19/L23 →
  PLATFORM; honest 9s: ghost ledger lands 130–166px lower when the reader holds tickets (wordless drawing can't know rows).
- zh resultsOut: HUB (its owner) changed it to "已公布 {n}/15 个结果" — ACCEPTED (two lanes found the old one redundant; the
  n/15 run matches "10/10"); supersedes the "kept" note above.
- LEAD TO DECIDE (kit-wide, a classic change): L16 — kit `.btn-ghost` border measures 1.79:1 on bg-base (WCAG non-text
  3:1 if the border identifies the control). Raising it changes every page (parity cells) → decide with Ali's 10/10 ask;
  if raised, a 4th ruled classic change + parity named difference.
- MERGE MAP from HUB: DOORS × HUB i18n-dict — keep HUB's zh resultsOut + DOORS' nextEvent/checkWindowUntil (numeralRuns
  skips HUB's .mono spans). TICKETS × HUB: maswali-design 4.A4 order [maswali-ledger, pool-figure, how, win-ledger] =
  [1,0,1,0]; 5.P6c keep both; 5.P6d take TICKETS' + HUB's 5.P6′ plant; r9a SITES: TICKETS' ticket(2) + win-ledger entries
  + HUB's two page.tsx entries, drop the hub-notices entry.

## S7 at 0f0d42fcc (final for the day, 16:31Z): S7-F8 1–15 pushed. Lifts in sections joined to the section's tx: 7,000
## refused lifts 56.9 s in 12 sections (was 134.5 s), 0 frozen; a crash mid-lift heals exactly the rest. Finding 2 met
## with FIX-SRV's API verbatim. S17 Friday rush FIRST GREEN 24/0: 3,644/3,648 pre-close purchases landed (10,012 tickets),
## the 314 post-close all refused "sales closed", no BUSY; landed p50 103 / p95 699 / p99 1,425 / max 2,037 ms (Up & Down
## p95 230). Render read F7 6–8: 72 tiles; R1/R2 fixed (F8 13–15; red:bulk-resolve 54/54). settle 106/110,
## adversarial 197/206 (3 KNOWN-RED as before), engine 110/109, dal-parity 2379/0.
- S7 LEFT: red:house-bot-console --only the 5 PG plants (sort-pg-title-nulls-first, sort-pg-outcome-status-only,
  sort-pg-history-account-reversed, ca-shift-finished-sql, ca-shift-marker-only-sql); full red:house-bot-console (501) +
  red:house-bot-c5 (overnight-sized); the S5 merge (merge-tree: 26 conflicted files — money path maswali-service.ts,
  maswali-dal.ts, maswali-player.ts, maswali-purchase-child.mts, house-bot-reports-cases.mts [re-derive 0.232 on the merged
  settlement], house-bot-absence-cases.mts, house-bot-chatbot.anchors.mjs; the rest S5 UI/admin/tests) per FIX-SRV's map,
  engine plants (76)/(77) re-pointed, D19a re-pin, re-run r5e 6.5 + eyebrow-roles (both clear at the merge), test:all,
  money battery, build, read-back. Red checkout C:/50pick-ssd/maswali-s7-red-20261021 (node_modules JUNCTION → unlink first).
- LEAD TO DECIDE: S17 targets (TBD-BASELINE in §7b) — proposal from the first baseline: landed purchase p95 ≤ 1,000 ms,
  p99 ≤ 2,000 ms, max ≤ 3,000 ms; every pre-close purchase lands; post-close only "sales closed"; 0 BUSY; identities hold.
- OPEN, governance: is the AI auto-resolver able to seal ALONE while two-admin authorization is ON (the chip says "Would
  auto-seal")? Not checked — S7 next round must prove it stages, or fix it.
- R2 is ALSO ON MAIN (admin queue "this one will seal" with two-admin ON, row-select.tsx:108) — fixed when S7 lands
  (cherry-pick S7-F8 14/15 if main needs it sooner).
- Plan text still calls R10c open (MASWALI-PLAN lines ~108, 396–397, 407, 485, 569) → record Ali's ruling (no staff-only
  DRIVE-week phase) there.
- Admin design items (pre-existing): O1 one-word widows ("settle." ceremony footnote ON 1280/1920; "read." unknown
  Officers card 1280/1920); O2 360 ceremony POSITIONS value wraps "0 predictors · 0"/"open"; O3 the switch's visible label
  names the mode ≥640 ("SINGLE-ADMIN") but the setting <640 ("2-ADMIN").

## SLIP DONE at 5139fce7d (2026-10-21 ~16:45Z): every cell 10 except Multi-ticket composer Visual 9 (631 tiles read, slip
## shots 1189/0, multi-slip 34/0, motion 19/19, qa:dialog-way-back 26/0 Chromium+WebKit; modal focus preventScroll =
## §M8a item 13, the second ruled classic change). Did NOT take REGISTER's ReceiptRow variant (its confirm rows are
## eyebrow-labelled like the bet sheet's) — fine. sw counts now say "zote" (disambiguation: "tiketi 2" read as ticket #2).
- OWED (next round, SLIP's files): the multi-ticket composer's kit pills ("TIKETI 1 · 15/15", ~172px) stack one per row at
  320/360 en+sw. LEAD RULING (a): the noun once, as the group's visible label ("Tiketi"/"Tickets"/"彩票"), each pill
  "1 · 15/15" (number + progress, one format for every state); each pill's accessible name keeps the noun + count. Not (b)
  (a check mark drops the in-progress count).

## Dry-run merges into the release (98e3a4619, 16:00Z, git merge-tree): HUB → i18n-dict.ts; SLIP → DESIGN_AUTHORITY.md,
## package.json, maswali-design.test.mts, globals.css; TICKETS → package.json; REGISTER → maswali-design.test.mts;
## PLATFORM, FIX-SRV and main 67e47f8d2 (marketing docs) → clean. REGISTER's overlap check (tiles week-beforeFinal-en-320, week-sunset-en-320/360, How 320/360)
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
