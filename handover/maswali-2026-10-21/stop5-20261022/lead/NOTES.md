# Lead notes — asheib-f3, 2026-10-22 PM (copy into the hand-over branch's top section at each milestone)

## Done by the lead
- `81e312f01` §0 ⏳ IN FLIGHT (docs). `41e61987c` three ratchets read and moved: wallet-status-writers 39→42 (three S5 dev
  fixtures: maswali-hub-act, seed-maswali-register, seed-maswali-tickets — each proven dev-only, production writers still 3),
  spacing-scale ceiling 393→391 (measured), house-bot-holder-lifecycle scripts 38→39 (maswali-doors.test.mts `queue.push(r);`
  in its import-graph walk — a conservative catch, writes nothing).
- `test:harm-watch` alone (slot 7, KP 5477): 15/15 PG, ALL PASS — the test:all crash (exit 3221225794 = 0xC0000142,
  STATUS_DLL_INIT_FAILED) was the loaded machine, not a defect.
- main's six CI reds on the release: r5a, r5j, r6c, dead-css, rate-copy GREEN; r7c fails only 1.4 (PLATFORM owns).
- Parity harness unchanged since 9a0c6b033 (pre-check empty); no r2 branch touches it. Baseline
  `$S/s5par/parity-v5-bfa0b7d57.json` stays valid for S5 (main since bfa0b7d57: marketing server files, tests, docs only).

## Merge forecast (dry runs at 09:10Z on the r2 heads as they stood)
- Each r2 branch alone merges clean into the release; cumulatively (tickets, register, hub, slip, doors, platform) only
  `scripts/millionea-shell.test.mts` conflicts (1.1b re-pins) → resolve to "no call left" and delete MillioneaPreviewMark.
- Stray `claude/maswali-s5-release-merge-20261022`: `e70672fe0` (sealLineOf → pure module) conflicts only in
  `scripts/maswali-tickets.test.mts` → apply after the six merges; `da6b5e68a` superseded by REGISTER r2 item (1) (compare,
  then drop); `d5e99de99` superseded by the lanes' own removals (reference for the last call + the component deletion);
  `a995dd936` applies clean BUT its "item 13" pointers are wrong for the release (§M8a item 13 = week chip, 18 = way-back) →
  re-derive by hand after D11 is numbered. Then bundle + delete the branch.

## Lead's own fixes at the merge (found while the lanes ran)
- Ali's ruling 7 (2026-10-21, COMPLIANCE-DECISIONS): English "Buy ticket · {price}" / "Ticket bought" / "Buying…" replace
  "Cut ticket" (sw keeps "Kata tiketi", zh 出票). The dictionary is right, but:
  - `scripts/maswali-player-drive.mjs` :22 (doc), :223 (`/^Cut ticket/` button) and :229 ("Ticket cut" stamp) still use the
    old words on EVERY r2 branch → the render job "player" would fail at the buy step. DOORS r2 fixed only
    `maswali-player-shots.mjs:126`. Fix the drive at the merge.
  - `src/app/legal/privacy/page.tsx:235` (English): "removed once your ticket is cut" → "… is bought" (one wording; the sw/zh
    lines keep their ruled verbs); re-run `test:privacy-notice` (§4p's title says "the cut ticket" — a test title, reword it).
  - Internal names (`maswali-cut` motion, `cut?: "cut" | "undo"`) and test titles are not player words — leave them.

## Release commits since STOP 3
`81e312f01` §0 in flight · `41e61987c` three ratchets · `c58b316ff` English buy wording in the privacy notice (never-printed
Millionea paragraph; v2026-10-17 entry amended; pins re-measured) + the player drive's buy button · `87f19f3a9` D19a's
privacy source → c58b316ff. CI run 39753560721 on 41e61987c: test (in-memory) FAILED exactly the known list —
ui-consistency, guards-exist, house-bot-disclosure, house-bot-blob-pin, updown-filter-sheet, measure, maswali-fence,
visual-pass-r7c, visual-pass-r10, visual-pass-r5h (all owned by lanes or the final D19a re-pin). main's own CI red:
r5a, r5j, r6c, r7c, dead-css, rate-copy — the release turns all but r7c (PLATFORM) green.

## Ali's answers (2026-10-22, one batch) — memory project-maswali-approvals-20261022
Push when ready; pre-approved: read-backs, STAFF_PREVIEW switch, ONE SmsMessage size/count, branch deletes at the end; staff
check = QA staff + QA player sign-in once each; S8 = the first public week is the live test (QA accounts buy in week 1,
rollback ready) — rewrite S8 / OD-21 / §6 line 12 to match; OD-21's drive code stays dormant.

## S6 review (lane abda3585a3c0e1630, A–D) and the lead's rulings
- N round 17: no BLOCKER. M-1 winner SMS FAILED counted "already" → ruled: no auto resend, truthful `notResent`, desk list.
  M-2 letters retried hourly ×14 days uncapped → cap 3 per letter + skip while emailHealth DOWN (one probe). M-3 merge-
  critical: S5's owed seal/confirm/correct rows lack `sealedAt` that N keys on → add at the merge; notices after `await
  recordOwed`. M-4: S16/S17 + a timed notice run on the integrated head. L-1…L-10 fixed in the integration.
- MB-44 rule: no next-jackpot figure in any notice (N's "TZS X carried forward" goes).
- Claims lint: every classic-campaign effect gated behind an ACTIVE ceiling (a dark merge changes no classic behaviour).
- H.10e: reword main's 2026-10-21 COMPLIANCE marker description (no thresholds published), Ali's quote verbatim.
- Millionea controls pin = 25. Merge order: S5+S7 → int (merge) → R (squash) → N (squash). Controls, plants unique names.
- Its five helper pieces (lint review, int map + Codex verdict, R/N hunk map, open items, wording/RG) were cut off — the lane
  finishes or redoes them first in its integration step. Its working files: `$F/s6/`.

## Lane findings ruled by the lead (in flight)
- DOORS 0c746829b: the ⛔ dark-safety blocker fixed (markets/loading.tsx only-when-true spread; MarketsGhost typed
  `millionea?: true; preview?: true`; route-ghost.tsx:118 same shape; maswali-doors §5: RUN of both loadings at Flight level
  for 6 readers + an AST census of 20 hand-off sites (8 cross into client code, all only-when-true) + 4 plants; doors 63/0).
  Real-bytes drive `qa:maswali-door-dark` (WITHDRAWN + STAFF_PREVIEW, document + RSC flight) in progress. Its finding (c) —
  red:journey-home's ambiguous anchor — fixed by the lead `edf79c2b0` (255/255).
- REGISTER: a parent segment's loading.tsx wraps its children, so on a throttled client hop the HUB's drawing paints 14–22 s
  instead of the destination's (register→how, hub→how, how→register; register→week shows the index's). Ruled: HUB fixes
  millionea/loading.tsx with a RoutePick map (route-pick.tsx technique) + a census guard; REGISTER fixes
  register/loading.tsx and commits the hop drive `qa:millionea-ghost-hops` (+ plant); TICKETS fixes tickets/loading.tsx for
  [serial]. The lead runs the hop drive in full on the integrated head.

## Merge-time wiring owed by the lead (collect here)
- HUB's no-week EmptyState (HUB page.tsx ~609) → TICKETS' client wrapper `MaswaliEmptyState`
  (`src/components/maswali/maswali-empty-state.tsx`, TICKETS 15212eeaf): `import { MaswaliEmptyState } from
  "@/components/maswali/maswali-empty-state";` and swap `<EmptyState title={t.millionea.hubNoWeek} body={…} fill />` for
  `<MaswaliEmptyState … />` (same props). A server component cannot hand the kit a function prop (bodyPart).
  Expect "00:01" and "15" mono in sw/en/zh; test:maswali-tickets 11.3's census allows the wrapper under src/app/millionea/.

- Phase 4 check: REGISTER's drive saw /millionea/slip need > 90 s to land at 12 KB/s. At `next build`, compare the Millionea
  routes' First Load JS with classic routes (/markets, /wallet); an outlier → PLATFORM's "perceived performance" row.
- PLATFORM got HUB's two gaps: route-ghost.tsx lacks /millionea/how, /millionea/register, ^/millionea/register/[^/]+$
  entries (journey readers see AnyPageGhost); app-shell's MainLandmark marks a guest only in the journey (classic guest's
  hub ghost lands 24 px off) — only with a census proving no classic rule changes. BetBreakNotice stays platform-faced.

## S6 addendum (2026-10-22 PM) → S6 integration started (`claude/maswali-s6-release` from claude/maswali-s7-s5)
- Lint NOT merge-ready (escapes 1–6, over-refusals 7, 8, 10, 12; finding 9 = quadratic time, one save can block the single
  production process for minutes) → the whole lint round in the integration, 9 first.
- H2: a self-excluded winner is promised a payout no code can make (OD-13 never built) → BUILD OD-13 (money path); interim
  truthful sentence until it lands. Letters need zh (main's email.ts rule). Decided words via the millionea namespace.
- Open: item 7 privacy notice NOT STARTED (tickets in exports, the salt, the 7-year keep → version + entry); Terms section
  NOT STARTED; rules version stamp on tickets (MB-69); stale-form rule in §11; operator guide + MASWALI-ARCHITECTURE gaps;
  MB-11 (float before crediting; alert visibility to Finance/Compliance), MB-35, MB-44 caller, MB-91, item 8 float_unread.
- Player UI owed on S5 surfaces (a UI lane with critics after S5 ships): MB-33 register criteria + seal evidence, MB-70 the
  slip's rules strip, L17 "corrected on objection" on the public register.
- Merge map: M1 = S7×S5; merge --no-ff mln-s6-int (keeps 902afae56), D19a; R squash (H.10e: reword main's marker sentence;
  keep MUTED); N squash (M-3; 13 old-API calls in its notify child; REFUND; null-aware payout); controls 25; plants 89.
- Lead rulings: keep migration names (prove in production order); reword dangling shas to reachable commits; S5's
  ClusterReport.coverage object; REFUND; S5's held-share word; royal chrome/no buttons for non-sign-in readers; win notice
  shows pool/fee/shared-by (R-HEADLINE); Auditor = MB-92 exactly.

## ALI'S LIST FOR S8 (collect; present at the close)
Rotate Railway variables (security incident) · licence basis on production · fund TZS 2,000,000 (Owner ceremony) · Finance's
float letter · primary + backup officers · Gate B line 7 (dated ruling amending S16 item 8 / OD-22 + Vodacom notice) ·
OD-18's legal sanity check + the Terms section's legal check · the death script's legal review (MB-86) · GBT's OD-08 answer
(Finance's is recorded) · approve the Millionea campaign wording set (MB-47) · L15 (two zh nouns for "ticket") · production
QA sign-ins for the drive · the launch word. (Already answered: S8 drive = first public week.)

## More merge-time wiring
- SLIP makes the stamp's "View ticket" the kit's Link (OperationResultModal opt-in `primaryHref`). After merging SLIP:
  `scripts/maswali-player-drive.mjs` ~227 and `scripts/maswali-player-shots.mjs` ~127 (DOORS' r2 touches it) press it as
  `getByRole("link", { name: "View ticket" })`, not "button". SLIP's ghost marker: 84254b974 (wrapper around everything).

## S7 × S5 merge (S7 lane aaabf818e50d7d32b)
`claude/maswali-s7-s5` `dfb438dd2` = S7 0f0d42fcc + release 81e312f01: 30 files / ~92 hunks resolved per FIX-SRV's map
(every resolution in the commit body); 6b = the release's two-premise form; D19a re-pinned once on that branch (dict blob
6c1d110fa); 0.232.2 re-derived; S7's harness callers given FIX-SRV's fields; the release's three dev routes set S7's close
seam. Light proof: tsc 0, red-anchors 7863/0, memory children engine 202, purchase 113, settle 106, void 52, close-race 13,
shared-paths 15, integrity 11, player 194, adversarial 197 (+3 known-red), reports 255, design 150, register 60 (+red
111/111), ui 151, money 410, hub 53, disclosure 123/0; fence 5.1 = DOORS' (identical on the release). Heavy both-store
battery running (slot 6).
Rulings: (a) ONE final-week sentence everywhere = the release's finalWeekRule + MR-30's floor clause (en ", with no floor
top-up"; sw ", bila nyongeza hadi kiwango cha chini"; zh "，不进行保底补足"), drawn by slip, confirm, hub, How — on S7's
branch; (b) L22's "It opens {date}" only while ahead, else S7's F1 no-date words; (c) §0: test:maswali-i18n exists (fold at
S5's push), "a backup carries none" false since S7's backup work (fold at S7's push); (d) Millionea's AI resolver cannot seal
(fence) — case + plants added; classic polls' AI path unchanged (2026-07-24 ruling).

## Phase 3 render plan
Each lane fast-forwards its own tree to the integrated head (its branch is merged → ff) and runs ITS full state shots there
(tickets: states/moments/ghosts/sunset; register: states/sunset; hub: drives a/b/c + states; slip: final-run pieces; doors:
job-doors + job-preview; platform: D10–D15 drives) + the lead's `render-jobs.sh <tree> <port> <tag> player` for the default
seed's every page. Tiles → `$F/render/<tag>/<lane>/`. Critics: `$F/critics/COMMON-R2.md` + their R1 report.

## Machine
~15 GB free (Firefox 3.7 GB, ChatGPT app 3.1 GB, VS Code 1.6 GB are Ali's). 43 Codex desktop helper node processes (1 MB each)
are Ali's Codex app — not ours.

## STOP 4 — lane final states (filled as reports arrive)
- DOORS DONE at 13d8ca918 (clean, no WIP): 0c746829b blocker (MarketsGhost typed `millionea?: true; preview?: true`),
  5056da01a fence census classifies /results' Up & Down view branch, 13d8ca918 `qa:maswali-door-dark` (WITHDRAWN + plant
  44/0, STAFF_PREVIEW 43/0, document + RSC flight). qa:live dark section local: WITHDRAWN 116/0, STAFF_PREVIEW 116/0.
  doors 63/0 (floor 63), fence mem 36/0 + PG 29/0, red:maswali-fence 17/17, ACTIVE door drive 513/0 (334 tiles read),
  qa:maswali-door-preview 111/0, tsc 0. Merge notes: keep the only-when-true spread; remove MillioneaPreviewMark at
  results/millionea-results-view.tsx:41 with the component (re-pin maswali-results-section 72/186); add
  qa:maswali-door-dark to the integrated render (WITHDRAWN server with DOOR_DARK_PLANT=1 + a STAFF_PREVIEW server).
  Observation for U43 (paused): its floating Needle sits half off-screen at the right edge of /positions at 320/360
  (tiles door-positions-sw-360, door-positions-zh-320).
- REGISTER at 926ebc6c1 (WIP 20 = two script changes, syntax-checked only; clean): 15 68e80add4 How ghost bar
  `h-[var(--h-control-md)]` (ui-consistency ALL PASS), 16 3af5d0f43 zh week event line "事件 2026年…" (own `registerEventAt`),
  17 848cefefa SEP settled — NO CSS change (fact lists = typed " · " to 0.0 px in eyebrows; body lists within 1 px; 0.9em
  stays), 18 4c1cde4e9 register/loading.tsx RoutePick + data-ghost-page (how/register/week) + `qa:millionea-ghost-hops`,
  19 9cfdead12 How's drawing in the page's own type (`GhostTextLine` added to maswali-ghost.tsx). tsc 0; design-register
  36/0 (red 61/61), maswali-register 59/0 (floor 58→59, red 111/111), week-money 10/0 (red 13/13) + ~20 readers green.
  qa:maswali-register-shots 122/12 (How's bands sit 6 px high: MaswaliGhostHead's bare eyebrow bar). Hops drive: 12 of 17
  ran (24/12: the hub's drawing first on six hops until HUB lands its pick; six "landed within 90 s" on heavy pages at
  12 KB/s; slip rail + tickets drawing unmarked). LEFT in order: (1) maswali-ghost.tsx:36 GhostLine → GhostTextLine, re-run
  how-ghost shots (expect 0 px); (2) the hops drive with WIP 20's 90 s network release + `--prove-red`; (3) redraw the index
  and week drawings in the page's own type, re-pin maswali-register §12, register-ghosts on the states seed, tsc; (4) the
  full drive passes after HUB's/TICKETS' picks + all markers. Loading/error critic row 9 until then. At the merge: the
  merge-time zh grep also needs the reverse case (a Han-ending template filled with a digit-initial value). slip → hub showed
  no drawing and no landing for 90 s — not diagnosed.
- S7 at be37a9683 (`claude/maswali-s7-s5`; be37a9683 = an EMPTY WIP commit recording state; dfb438dd2 = S7-MERGE 1;
  clean; slot 6 released; R9's plant restored, .red lock deleted). At dfb438dd2: tsc 0; both stores — engine 202/210,
  purchase 113/116, settle 106/110, void 52/57, close-race 13/13, shared-paths 15/16, integrity 11/11, player 194/194,
  adversarial 197/206 (+3 known-red OB.0, RD.5, TK.2 each store), fence mem 35/1 (5.1 = DOORS', fixed on r2-doors
  5056da01a) + PG 29/0; reports mem 255/0, disclosure 123/0, red-anchors 7863/0, register red 111/111, design 150, register
  60, ui 151, money 410, hub 53, design-register 34. red:maswali-money-path PARTIAL: 35/77 caught (incl. 6b), 0 missed —
  plants 36–77 (incl. the four re-pointed by the merge) and red:dal-parity NOT RUN.
  Lead rulings at STOP 4 (S7's two questions): TK.2's alert uses password writes only (reset/change followed by a
  withdrawal soon after a credit) until a device identity exists; a number change has no flow (E-215/TK.1). RD.5's hold
  covers the paid, not-yet-held winning shares whose tickets were bought at or after the reversed deposit was credited.
  S7's finding: S6's Millionea rules (`_content-millionea.tsx` on mln-s6-int) lack the Yes/No payment-reversal/forfeiture
  clause (`_content-yes-no.tsx:225`) → S6's legal work carries it (MB-74).
  LEFT (S7, in order; exact strings in be37a9683's message): floors purchase 113/116, player 194; item 3's guard (fence
  cases + plants); ruling (a) one finalWeekRule + floor clause (S6's L lane rewrites ruleSunset — reconcile at S6's merge);
  ruling (b) L22's date only while ahead; TK.2 alert; RD.5 hold (webhook review-mark path under maswali:chain + heal keyed on
  the deposit id; both stores, S16 cross-instance act, money-path plant); FAILURE-INVENTORY §9; §7b targets in
  s17-maswali-rush.mts; then full red:maswali-money-path + red:dal-parity; then merge the release's round-2 UI delta.
- PLATFORM at 04d3e3d93 (WIP 10 = HUB's two items, guarded, not typed, not seen in a browser; clean): 5 61f25fa94 r5h 3.5
  ChatRoot classified (3.5 now lists only SLIP's two files) + r7c 1.4 census (66/0); 6 9a0bfce47 four-tab rail: sw tracking
  closes 0.04em only between 332.8–348.8 px (r9c 80/0; rail-gaps four tabs 36 cells ≥ 8 px, sw 9.3 px at 333 was 4.0; five tabs
  36 cells ≥ 8 px); 7 2ffc834ad reduced-motion end frames for every kit entrance + the route entrance (reduce-motion rule 3,
  red 15/15; qa:route-entrance 19/0, 0 frames below full opacity under reduced motion); 8 b15c09a1c F10 census (every
  programmatic Millionea navigation starts the progress bar); 9 69db29b45 §M6 restored; 10 04d3e3d93 WIP route-ghost How/
  register/week entries + app-shell `viewer={!session ? "guest" : undefined}` (data-viewer census: only six journey-ghost CSS
  rules read it; no script). qa:millionea-break-nav 7/0. qa:chat-yield 27/1: week page at 320, scrollY 120 — the bubble still
  yields where nothing is under it (hypothesis: the drive judges before the product re-checks after scroll-end).
  Classic-visible changes for parity: hover tints only on hover-capable pointers; NoticeBar last-word pair; reduced-motion
  first frames everywhere (dialogs, sheets, scrims, menus, route entrance, seals/reveals/drawn lines); journey 4-tab sw
  tracking 333–348 px; classic guests' <main data-viewer="guest"> (DOM only).
  qa:live PREVIEW_TESTIDS: keep `millionea-preview-mark` (it is the BAR's own testid, not the deleted component's).
  LEFT (in order): tsc on 04d3e3d93; browser proofs of commit 10 (journey hop into How/register/week shows its ghost;
  classic guest data-viewer with 0 matching classic rules; HUB's guest door in place); qa:chat-yield week-320 cause +
  `--prove-red` with WEEK_PATH=/millionea/register/MLN-2026-W46; the serial red batch `$F/platform/batch2.sh`; perceived
  performance on a production build `$F/platform/batch3.sh`; the integrated render's tiles/motion. Critic rows: reduced
  motion 10; perceived performance 9 (until commit 10 is seen + the 2-frame hub-ghost flash on classic How→register — HUB's
  pick removes it); chat yield 9 (week-320).
  Merge notes: number D11 in §M8a item 11; MillioneaPreviewMark deletion map (millionea-parts.tsx:39–49; imports/calls at
  how/page 50/151, page 61/530, register/page 31/68, register/[week]/page 59/460, slip/page 39/65/133, tickets/page 49/148,
  tickets/[serial]/page 53/197, results/millionea-results-view 4/41; maswali-results-section :72/:186; millionea-shell §1
  1.1/1.1′(:88–90)/1.1b; doc comments millionea-shell.test.mts:9, millionea-preview-bar.tsx:6); HUB's guest-door rule must
  name a hub class/attribute in its subject (millionea-shell 4.2); any new one-time entrance needs both reduced-motion
  branches; §0 ~227 still describes D10's deleted View Transition observers — fix at S5's push.
- TICKETS at fdbeae5a4 (WIP 6, 3 reds open; clean): 5 15212eeaf the kit EmptyState opt-in numeral part finished (zh too
  — hangCjkMarks fragment fix), ONE Millionea door `MaswaliEmptyState` (src/components/maswali/maswali-empty-state.tsx),
  every caller byte-identical (11.2 over 12,126 bodies × 3 langs + 1,302 drawings; 11.3 census 63 calls in 45 files),
  seal facts set by Millionea (`win-celebration.tsx` round-2 change is only `facts?: ReadonlyArray<ReactNode>`); tsc 0 on
  15212eeaf; tickets 43 → 46 at the WIP (floor 41 → 46, red 83/83) + ~40 readers green + 5 red twins. WIP 6 fdbeae5a4:
  tickets/loading.tsx RoutePick + `contents` wrappers with data-ghost-page "tickets"/"ticket" (spacing moved onto them) —
  REDS: r4j 3.4/3.4′ (the ghost must be the one its loading file renders), r5h 1.2 (the loading element's Flight payload 162 B
  > 128 B: RoutePick's routes/patterns props travel) and r5h 1.3 (a server loading file may import only a fixed list).
  ⚠️ LESSON FOR EVERY MILLIONEA LOADING FILE (HUB's millionea/loading.tsx, REGISTER's register/loading.tsx too — check
  r4j 3.4 + r5h 1.2/1.3 on both): put the destination pick in a small CLIENT drawing (as route-ghost.tsx does) and keep the
  server loading file a one-line `return <XLoadingGhost />;`. LEFT (TICKETS): that client pick + r4j/r5h/maswali-ui 1.3/1.4/
  tickets 25.x + tsc; `list-empty-*` shots ($F/tickets/job-empty-shots.sh, port 3570) incl. the computed-style face check;
  red:deposit-status-read to the end (stopped 31/45 caught, 0 missed); re-score on the integrated render (F Visual 9 until
  ticket-wonBig-sw-320 proves REGISTER's note; I loading 9 until the pick + the hop drive). Classic-visible: the seal's amount
  fit (stays 38 px when it fits, steps down only when it would not) — name it in parity. r7c 2.1 green on the release
  (35ff078c9 fixed main's old maswali-ticket.tsx:249). Merge: hub no-week → MaswaliEmptyState; maswali-ui 1.4 (~133–138) and
  the list's two MaswaliEmptyState (~794–797) tight re-pins; tickets floor 46 (red 83).
- HUB at a76e03f96 (ONE WIP commit on a7b7c894c; clean, LF blobs): at a7b7c894c via heavy-r2 — tsc 0, red:glyph-source
  26/26, red:journey-shell 230/230; drive a 3410/340 (all 340 = stale drive code, now fixed in the drive: 281 font-family
  string compare, 38 no-week numerals awaiting the merge wiring, 14 pausedShort "Sales paused for now", 6 L12 "Next event",
  1 old drawing), drive b 633/0, drive c (STAFF_PREVIEW) 236/0. WIP: src/app/millionea/loading.tsx → `MillioneaGhostPick`
  (hub-ghost.tsx, the platform's RoutePick, a CLIENT pick — r5h §1 1.1–1.7 ok: client refs only ≤ 100 B Flight): /millionea →
  hub; how/register/slip/tickets → their own; register/[week] → the week's; tickets/[serial] → the ticket's; else hub;
  addresses from MILLIONEA_HREF; journey readers get LazyJourneyRouteGhost for /millionea/tickets only; data-ghost-page="hub";
  guards maswali-hub §15 (census of every Millionea page.tsx × own loading × 3 langs, plants 15.1′/15.2′), r4j 3.4 re-pinned.
  Plus `hub-frame.ts` (one frame for page and drawing: the reader's tickets LAST in the buy column after the ledger, per
  §10 §3.3 / v6; a closed week's results line = the door's status line; the drawing's tickets band = one neutral block; a
  guest's door via main[data-viewer="guest"]; WRAPS per-language line table); the jackpot rule's facts balance when they
  wrap (sw 320 "ya 10/10" no longer stranded); noWeekBody keeps the day with its clock. Static: maswali-hub 70/0 (floor
  55→70), ui 151, r9a 63, r5j 62, r4j 92, gold-is-money 61, journey-shell 566. REDS: maswali-design 138/3 (4.P4b, 5.P15,
  5.P8 — source pins on class strings moved into hub-frame.ts: re-pin), millionea-shell 17/1 (1.1b, the merge's), r5h 3.5 and
  measure (SLIP/PLATFORM's). NOT RUN: tsc on the new code; the green hop probe ($F/hub/heavy-c1.sh); the plant run + green
  targeted drive ($F/hub/heavy-c2.sh, plants.mjs). LEFT (in order): re-pin the three maswali-design pins; tsc; heavy-c1;
  heavy-c2 + fix WRAPS from printed lines; read the new tiles sw first; optionally split the WIP (drafts msg-1..3.txt in
  $F/hub/); decide the pending-carry week's +20 px head line (+44 sw 360) and the voiding head's bare "—"; verify the
  readers' unverified findings (cap callout "Wiki 44 inafunguliwa Jumatatu" vs Wiki 49 — likely the seed vs the real clock;
  REGISTER's WeekCommitments card ~64 px short at 1280/1920; the pinned head slides 8–13 px under the header at the page's
  end; zh ASCII ":" "?" "(" in dictionary strings → Gate B). Merge wiring: `<MaswaliEmptyState title={t.millionea.hubNoWeek}
  body={noWeekBody(t, locale, hub.paused ? null : msOf(hub.nextOpensAt))} fill />` then drop the drive's T5_THEIRS entry for
  `[data-testid="millionea-hub-no-week"] p.leading-relaxed`.
  HUB's tile readers (partial: sw desktop 80/238, zh desktop 151/189, en desktop 73/190 — readers hit ~70 images each:
  give fresh readers ≤ 60 files) flagged, UNVERIFIED, for the next session: en 1280/1920 void words strand "voided" on its
  own line (HUB); REGISTER's ledger "1 tickets at TZS 1,000" (plural defect) and the voiding refund row's "TZS 1,000" alone
  on a line; "WEEK 48 · WEEK IS BEING VOIDED" says "week" twice; the cap line "Wiki 44" vs week 49 (likely seed vs clock);
  the commitments card ~64 px short at 1280/1920; the pinned head slides 5–13 px under the header at the page's end; footer
  wording differs between the two shells; zh ASCII ":" "?" in a few strings (Gate B).
  HUB supplement (later readers, run a tiles in $F/hub/r2/tiles-a + sheets-a; UNVERIFIED): HUB files — en voiding 1280/1920
  "…due to be / voided" (voidWordsOf: keep the last pair); sw 320 paused Callout's last line "salama." alone; sw 320 open
  grading door "Matokeo 15 kati ya 15 yametolewa" within 2–5 px of its chevron; sw no-week "Maswali / 15" splits (add
  Millionea's fact runs to noWeekBody's keep list). REGISTER's shared ledger on the hub — en voiding "1 tickets at TZS 1,000"
  (regTicketsSold not plural-aware); "…every ticket is refunded / TZS 1,000" strands the figure; sw 320 "Jumla ya bwawa" with
  "angalau TZS 57,000" wraps into two left-aligned lines short of the amount column; the pending carry row breaks loose
  ("Kiasi kutoka / Wiki 47 ›", "Bado / haijakamilika"). PLATFORM chrome on a break — the classic rail lights "Masoko" and
  still shows the Amana deposit coin while deposits are suspended; the journey rail drops the Millionea tab (maybe by design,
  §M8a 11 / D13 — check).
- SLIP at d5f24f569 (all verified, no WIP; clean): 6 21d6a66b8 caret guards re-pinned in the open (r10 93/0, was 88/2;
  updown-filter-sheet 59/0, red 20/20); 7 81c453679 page widths → the kit's `max-w-form` / `var(--w-form)` (measure ALL PASS,
  red 8/8); 8 97d2a86a7 r5h 3.5 classifies operation-result-modal + maswali-slip (read-only motion settings); 9 7331c69ca
  guards for the stamp's per-ticket free-cancel note and the cancel confirm's dim hand-off; 10/11 768bc3fa2 + 84254b974 the
  ghost marker wrapping everything; 12 571ff9cc6 the multi-slip drive cancels leftover tickets first (run-order safe) and
  measures ruling (a): two pills on one row at en/sw 320/360 (top 285, 40 px, unclipped); 13 d5f24f569 "View ticket" = the
  kit's Link (OperationResultModal opt-in `primaryHref`, inert for every other caller; 0 computed-style differences over 26
  properties; holds the opening focus; Enter works). maswali-slip-design 92/0 (floor 80→92); enter-where-pressed all + red
  123/123; tsc 0 (7331c69ca and with the Link change); ~25 readers green. Browser: qa:dialog-way-back --prove-red 26/0
  (Chromium 6/6; WebKit moved the page on 2/6, reported); qa:maswali-multi-slip 47/0 (fresh and after the way-back drive);
  the ticket's band lands within 2 px of its loading drawing; the cancel's confirm → result keeps one dim every frame.
  main's CI reds r5a 8.13, r5j 1.1, r7c 3.9: all fixed by the release (guards byte-identical to main's). Critic: every
  R1-slip cell 10; motion "Stamp → ticket" 8 until HUB's/TICKETS' loading picks land. LEFT: read the rest of the r2c tiles
  (C:/50pick-ssd/kipindi-mln-dslp/.50pick-shots/maswali-multi-slip/ + $F/slip/frames/); after the picks merge, the hop
  drive's slip→ticket and hub→slip. Merge: millionea-shell 1.1b conflicts only with TICKETS + REGISTER; r5h 3.5 green once
  PLATFORM merges (60/0 on the merged tree); the two drives' "View ticket" → link (player-drive also needs "Buy ticket" —
  the lead already fixed the latter on the release c58b316ff).
- S6 at 272658bbf (`claude/maswali-s6-release`, base M1 = dfb438dd2; clean; slot released): 8620862fc S6-INT 1 = `merge
  --no-ff mln-s6-int` (13 conflicts + the sprite rename resolved per the map; glyphs:gen once → app.378cc33b/admin.216a71c9,
  PREVIOUS = production's pair, app.76a3696e byte-identical to production's; ruling (c): ClusterReport.coverage = S5's object
  via a new `wholeReadCoverage()` in maswali-cluster-coverage.ts, board share = `boardCoverage`, the evidence pack keeps its
  own number; the integrity page's group pager `gpage`; /help reads `ruleSharedJackpot`; six typed "→" in the desk scripts
  → words); 272658bbf S6-INT 2 = D19a re-pinned at that merge (dict U43 blob 6c1d110fa → f88a4470d; rules/page.tsx →
  8620862fc; the legal lane's two files stay at 902afae56). tsc 0 (after 3 fixes); rbac 390/0; register 60/0; admin-nav 29/0;
  glyph-map/-sync rc 0; disclosure 123/0; blob-pin 8/0. REDS: glyph-source §7 (console types 129 icon chars > 128 — the
  same count measured at dfb438dd2; not proven on it by the suite), r10 1.4/3.1 (files byte-identical to dfb438dd2 — S7-s5
  lacks SLIP's r2 caret re-pins), maswali-integrity-list 35/2 (S5's reportWired/warningWired pins + 3 plants read S5's
  bounded read, now the data lane's whole read → adapt per ruling c). NOT RUN: maswali-integrity/-evidence/-fairness both
  stores, red:maswali-rbac, red:house-bot-chatbot, red:house-bot-console, fairness L.10–L.11, the lookup census decisions,
  page renders. LEFT (in order): fetch + merge s7-s5 if moved; finish S6-INT 1's owed list (integrity-list adapt, the
  both-store suites, the reds, `cpage`/`cgroup`/`gpage` in integrityListParams); reword dangling shas → 902afae56/8620862fc;
  R squash (8 files; H.10e rewording; R5.18/R5.19; nullable payout; "Cannot be read"; house-book floor 64); N squash (12
  files; M-3; 13 old-API calls; REFUND; null-aware payout; registry key; rbac 25 + plant (26) + §10; 89 money-path plants;
  house-bot-reports floor); then rulings a–q + 1–8 and the lane split. Its kit: `lanes-20261022/s6/` on the hand-over (tools
  resolve.mjs/replace.mjs keep CRLF; spec-*.json; mm-rn/bin/apply-prop.mjs = R/N's exact texts; lint/, open/, words/).

### Resumed 2026-10-22 11:41Z (Ali "proceed"; paused 17 min ~11:50–12:10Z on his word, account switched; "proceed" again)
- main da3d32180 (docs) deployed SUCCESS; read back 11:45:50Z: dpl da3d32180 on www/apex/Railway host, health ok,
  qa:chunks-prod 6/6 both origins, production qa:live 365/0.
- DOORS merged into the release: 9c17de3d7 (clean; tsc 0; doors 63, guards-exist 9, dark-edge 36, r4j 92, r5d 45,
  journey-question, maswali-design 141, dead-css, journey-home, millionea-shell 18, results-section green; r5h 59/1 = 3.5,
  green once PLATFORM + SLIP merge). Pushed.
- DOORS agent now builds OB.0 on `claude/maswali-s7-ob` (from claude/maswali-s7-s5; S7's shared-block plan relayed).
- PLATFORM approved: classic break deposit doors closed — the Amana coin → the Wallet door, the header deposit pill withheld,
  the balance capsule's WalletSheet gets onBreak (Deposit dropped, Withdraw full width); no words change; three classic
  changes for parity (a player on a break, classic shell).
- SLIP's observation for TICKETS: "Mauzo yanafungwa Ijumaa 18:00" on the ticket page may lack "EAT" + the mono clock.
- SLIP merged into the release: 7fcbdd599 (clean) + 9b3f23b11 (the two player drives take "View ticket" as a link). tsc 0
  at 9b3f23b11; maswali-ui 151, slip-design 92, r10 93/0, updown-filter-sheet 59/0, measure ALL PASS, enter-where-pressed,
  maswali-design 141, millionea-shell 18 green; r5h 59/1 (3.5 = only PLATFORM's ChatRoot now). Pushed.
- CI 39773482477 on 9c17de3d7 (DOORS merged): FAILED ui-consistency (REGISTER), house-bot-disclosure + blob-pin (D19a final
  re-pin), updown-filter-sheet + measure + r10 (SLIP — fixed by 9b3f23b11), r7c (PLATFORM), r5h (PLATFORM + SLIP; SLIP's
  part fixed by 9b3f23b11). guards-exist and maswali-fence gone. No new failing suite.
- ~12:05Z an account switch killed OB, REGISTER, S7, TICKETS ("Not logged in"); resumed with SendMessage (their context
  intact); HUB, PLATFORM, S6 ran through. Uncommitted at the kill: OB 9 files, REGISTER 3, S7 4 — each told to commit first.
- HUB found: keepFact (maswali-facts.tsx) merges sw "Matokeo 5 kati ya 15 yametolewa" into one ~211 px run (box 216 at 320):
  the graded-week row runs 3 px into its chevron. Assigned to SLIP on `claude/maswali-s5-facts` (sw NOUN_THEN_NUMBER no
  longer takes an OF_CAP number; a width-budget census in a NEW suite — maswali-design.test.mts is edited by five lanes).

### ⭐ FINAL DELIVERABLE (Ali, 2026-10-22 ~12:15Z): an admin guide PDF on his Desktop
"when done please generate on the desktop a pdf with no unneeded wording, no unneeded things. clear, perfect for admins to
know how maswali works, how they work it and what everything means." → after S5/S7/S6 are done: bring
`docs/maswali-operator-guide.html` (S6 legal lane; on claude/maswali-s6-release with `docs/50pick-maswali-operator-guide.pdf`)
up to the finished product (how Millionea works; the admin's weekly run step by step — open, questions, seal, objections,
results, settlement, pause/stop, the Owner's switches, staff preview; and a glossary of every term), concise, one wording per
truth with the console and the rules; render with the repo's own pipeline (scripts/generate-pdfs.mjs; siblings
docs/updown-operator-guide.html, docs/ai-cycles-admin-guide.html for the house style); rasterise and READ every page;
commit the source + PDF; copy the PDF to C:\Users\asheib\Desktop\.
- TICKETS merged into the release: e34bcdc95 (one conflict, millionea-shell 1.1b → the union: ≤ 9 calls, none on the slip
  nor the tickets pages). Release now = DOORS + SLIP + TICKETS. Suites green; r5h 59/1 (PLATFORM's ChatRoot).
- Ruling: ONE sales-close wording = `salesCloseColon` "Sales close: {when} EAT" everywhere (hub → HUB, register → REGISTER,
  home card + ghost → SLIP on claude/maswali-s5-facts). Journey footer "Leseni" widow → PLATFORM. HUB head: the card's
  order (figure, carry, rule).
- OB milestone 1 (claude/maswali-s7-ob de681ddec): server green both stores + s18 cross-instance 18/0; OB.0 real; new control
  ruleMaswaliObjection approved (role = whatever decides classic objections; sealer separation; Owner fallback). Control
  count after S7 + OB + S6-N = 26.
- S6 milestone (60f54d955): R squashed (H.10e applied, Ali's quotes verbatim). Rulings: D1 keep the legal clauses, pool
  clause = finalWeekRule, /help draws finalWeekRule too; D2 zh rules text + Terms → 事件 now (unpublished version, hash +
  COMPLIANCE line); D3 S7 rewords the takeover card (no signal in public source). S7 told to merge the release (e34bcdc95)
  now (its tip lacks the three ratchet fixes). red:journey-measures' 3 S9 plants also miss on main (main's, not ours).

### Ali, 2026-10-22 PM: "admin — make sure full control with the right sorting etc. and management … just affirming"
Affirmed from the code: /admin/maswali (weeks: sort/search/filter/paging), /new (week builder), /[weekId] + /edit (the
week's acts), /pools (sort/search/filter/paging), /integrity (sort/search/filter/paging); S6 adds the support lookup and the
per-week evidence export, OB the objections card. PROOF OWED, added to the plan:
- each release's gates run qa:maswali-admin-drive + qa:maswali-admin-shots (+ qa:admin-filters, qa:admin-act-gate,
  qa:admin-view-matrix where they read Millionea) and the tiles are READ;
- ONE independent ADMIN-COMPLETENESS review on S6's final integrated head (S5 + S7 + OB + S6), before S6's push: walk
  MASWALI-PLAN §6.2's weekly runbook through the console — every step has its control, the right role (control-gates),
  its confirmation, its audit, and every list has search/filter/sort/paging with the right defaults; plus the Owner's
  switches (pause, stop, rollout, staff preview) and the console's empty/error states; gaps fixed (guards + plants) before
  the push; the admin guide PDF (Ali's Desktop deliverable) is written from the same walk.
- FACTS merged into the release: 3771ef634 (claude/maswali-s5-facts 311e0e092: a kept run fits its line — sw "Matokeo"
  free, money figures their own run, 0 runs over the 180 px budget; the home card + ghost use salesCloseColon; a fact's
  mark is out of flow so it never stands alone on a line, test:maswali-fact-mark Chromium + WebKit). Suites green; pushed.
- Ali (PM): "assign an agent to fix a small bug: on change language the colored animation is still on grey scale — give it
  back its color" → LANGFIX lane on fix/lang-switch-color from origin/main (lead hypothesis: conviction-dial.tsx:1269
  saturate(0.1) while !armed). A CLASSIC release of its own: the lead pushes it under main-push.lock with AGENTS §4 gates
  + read-back, then the S5 release merges main.
- S7: RD.5 landed 378b842d0 (adversarial RD.5–RD.10 both stores, S16 §6b 37/0, 7 plants). S7-MERGE 2 70a22747d (release
  e34bcdc95, no conflicted hunk) + proof ea645baab: ratchets hold (spacing 391/156 files, holder-lifecycle 16/0,
  wallet-status-writers 63/0), D19a once (475f305f6), fence mem 39/0 (floor 38→39) PG 32, tsc 0, both stores engine
  202/210, purchase 113/116, settle 106/110, void 52/57, close-race 13/13, shared-paths 15/16, integrity 11/11, player
  194/194, adversarial 214/223 (1 known-red OB.0 — fixed on claude/maswali-s7-ob), glyph-source 0 failures. Next: TK.2
  wording, FAILURE-INVENTORY §9, the full reds.
- More small fixes routed (HUB's readers): REGISTER ledger (refund-note last pair, plural, first-row rhythm); SLIP on
  `claude/maswali-s5-facts2` (en one-letter word, a shared zh struck style ending at the glyph's ink, the seed's open time
  = the config's); HUB (one week-naming form per page, lastWeekRolled fee via formatTzs, zh reserves head not repeated).
  Rulings: zh ordinals (第N周/张/题) stay unspaced (record in §M8a at the merge); the 768 closed/voiding gap → critics.
- PLATFORM 15/16 (37e4dc61c, 7b180b113): the sw licence line ("Leseni" alone) fixed on the journey footer, the opt-out page,
  the offline document and the classic hero's trust row by removing round 7's sw keep conditions at the source (every line
  takes the even balance; en/zh conditions kept); r9b 5.4 lays out all four lines 320–1920 (60/0, 3 plants); r5a 6.3 label
  corrected. CLASSIC-VISIBLE for parity (sw only): opt-out 351–390, offline 351–363, hero trust row 353–395 now read
  "Leseni ya Bodi ya Michezo" / "ya Kubahatisha Tanzania.".
- Ali (PM): a small line on the LANDING page — "Be this week's winner?" — linking to Millionea, in the Millionea tab's
  animated colour, "perfect visually and logically; you pick the approach". Lead's approach → TICKETS agent on
  `claude/maswali-s5-landing-door`: classic "/" only, one line under the hero's actions; en "Be this week's winner?" /
  sw "Kuwa mshindi wa wiki hii?" / zh "成为本周赢家？" + productLabel in `.kp-millionea-ink` (the tab's ink + glow) + family
  chevron; the whole line one link to the hub; drawn only when Millionea is offered to this reader AND a public week
  sells AND not on a break (the home card's own server answer); no figure; dark-safe (doors §5 census +
  qa:maswali-door-dark extended); tiles 320–1920 × 3 langs; critics judge it in Phase 3 with the doors.
- 13:24Z another account switch killed HUB, PLATFORM, S7, LANGFIX (resumed; HUB's heavy-c4 and LANGFIX's server kept
  running in their slots).
- LANGFIX: the "grey" animation = the language-change LOADER (LocaleChangeOverlay, src/lib/i18n.tsx: the orbiting
  Hi/语/Ha/好/Sw/En ring) — R5-I 42a2003d6 (2026-10-09) moved its glyphs from YES green / NO red to pale brand blues, which
  render blue-grey. ALI CHOSE (2026-10-22 PM): "Its green and red" — the original alternating green/red glyphs back, blue
  centre dot kept; an owner exception to §B2a's U43 amendment, recorded in DESIGN_AUTHORITY; guards re-pinned with plants.
  A classic release of its own (main-push.lock, AGENTS §4 gates, read-back). No "stays grey after a switch" bug otherwise
  (guest runs: every element equals a fresh load; signed-in + journey runs pending).

### ⭐ ALI'S CLOSE-OUT INSTRUCTION (2026-10-22 PM): "perfect results and finalize; when done give me the pdf. clean stales,
### clean temp files, misleading rules. mark done progress and end session."
When S5, S7 and S6 are live and verified:
1. The admin guide PDF on C:\Users\asheib\Desktop (from the admin-completeness walk; every page read) + committed source.
2. Stale: every Maswali lane worktree (junctions unlinked first), every merged Maswali branch local + origin (verified bundle
   under F:\kipindi-archive first), the hand-over branch (bundled, then deleted; §0 on main carries S8's runbook), the
   claude/maswali-s5-release-merge-20261022 stray, codex/* Maswali leftovers, the S6 lane branches mln-s6-*.
3. Temp: the old scratchpads (408dbc60…, 35419d73…), this session's scratchpad leftovers, C:\50pick-ssd\tmp, .pgscratch
   folders, render tiles — after the hand-over content is in git.
4. Misleading rules: docs that contradict the rulings (S8 work order vs Ali's first-public-week ruling, R10c "open"
   mentions, §6 line 12's deadlock, stale "owed" lines in §0/§0a that are done, the old SESSION-PROMPT-MASWALI-* headers
   marked as records), and stale memory entries (prune or correct).
5. Mark done: MASWALI-PLAN §1 S5/S6/S7 ✅, §0 = "build done; S8 waits on Ali's list", §8 Closes, NEXT-PLAN ▶ 0i, memory.
6. End the session.
- OB milestones 2+3 (claude/maswali-s7-ob f42a98baa, S7 b6eac4034 merged in): the console card on /admin/maswali/integrity
  (control ruleMaswaliObjection: compliance — the classic objections' own role; typed confirmations; the queue by question)
  qa:maswali-objection-console 69/0; the player door on the ticket page (own components + action file, one mount line;
  RG-calm; one question per dialog; Enter = new line) qa:maswali-objection-door 131/0 (80 tiles); test:maswali-objections
  48/0 both stores, red 22/22; rbac 23→24; FAILURE-INVENTORY §9 now closes all three (OB.0, RD.5, TK.2). MR-16 EXTENDED
  (lead accepts; record in MASWALI-PLAN §3 MR-16 + MB-23): the officer whose UPHELD ruling set a question's present result is
  barred from its later objections, like the sealer (audit maswali.objection.author_blocked; Owner fallback; case 2.17 +
  plant 22). Objection notices wait for S6's registry (S6 adds them when it stacks on S7 + OB). §6.1 line 14 → the lead
  closes it at S7's push. Next: S7 merges claude/maswali-s7-ob into claude/maswali-s7-s5 once OB's batch is green.
- Ali's bottom-rail ruling: classic phone rail = Markets · Up & Down · (coin) · Millionea · More while Millionea's door is
  drawn; Live → More's first row; whole bar tested; §M8a item 11 rewritten → PLATFORM.
- Ali: "make sure any change is final rule and documented everywhere … so nothing is misleading" → LANE-COMMON section;
  every lane told; the lead records Ali's own rulings of the day in COMPLIANCE-DECISIONS + MASWALI-PLAN.
- ee6075609 (release, pushed): Ali's 2026-10-22 rulings recorded — COMPLIANCE-DECISIONS entry "2026-10-22 · Maswali
  Millionea — build done, launch later; …" (6 items + boundary); MASWALI-PLAN §6.1/Gate A/line 6/line 12 "(after ACTIVE)"/
  §7b S8/OD-21+OD-23 superseded/§0a/§1 S8 row/MB-45; maswali-plan.test §4 (S8 starts with only the after-ACTIVE line
  unticked, ✅ needs all) + plant + control. test:maswali-plan 13 rows 9 ✅ 0 fail; red 23/23 + control held; test:docs ok;
  hero-copy 18/0; red-anchors 7722/0.
- §M8a NUMBERING (lead allocates): 19, 20 = S7/S6 (final week wording; final week ahead); 21 = TICKETS (landing line);
  22 = REGISTER client pick ("a loading picture is the page being opened"); 23 = REGISTER SEP; 24+ via the lead. PLATFORM's
  rail swap = inside item 11 (COMPLIANCE entry item 4 says so). AT MERGE: repoint the COMPLIANCE entry item 5's "The design
  rule lives in DESIGN_AUTHORITY" → §M8a item 21 + landing ruling R19 (INHERIT-MANIFEST §2).
- TICKETS' landing plan approved: Live first (stable place), row wraps only between the doors, no count on Live, Live in link
  blue + glyph in link ink, Millionea door in the tab's ink; R19 in landing-ten INHERIT-MANIFEST §2. Live door is
  CLASSIC-VISIBLE → parity names it.
- MERGE-TIME list additions: delete dict key `salesCloseAt` after HUB switches page.tsx:373 (D19a re-pin once); take
  REGISTER's test:maswali-hub 1.1 line; sweep MASWALI-PLAN's quoted sample wordings vs the dictionary (~2987, 3034, 3116,
  3234 "ada 0", 3245) once all lanes are in.
- S6 split APPROVED (S6 agent = integrator, writes briefs $F/briefs/S6-{NOTICES,LINT,MONEY,DOCS}.md): trees NOTICES →
  kipindi-mln-not, LINT → kipindi-mln-rep, MONEY → kipindi-mln-fsrv, DOCS → kipindi-mln-fply; branches
  claude/maswali-s6-<lane> from origin/claude/maswali-s6-release; slots 6+4 shared. S6-INT 15 at d97266317 (correctSeal
  stale "from" fixed; notify 138/0 ×2). MB-93/MB-68 rows: S6 writes them on its branch.
- Readers 12/13 (ghost pairs) outputs are EMPTY files — their reports were not captured; re-read on the integrated render.
- ~14:05Z the account's usage limit (429, "resets 9:20pm Beirut") stopped 8 agents; Ali switched accounts ("proceed");
  all resumed with their state (REGISTER never stopped). Surviving jobs: REGISTER job-r2e (slot 2, server 3580), OB
  heavy-batch-7 (slot 3, server 3530), S6 red:maswali-claims (slot 7 — S6 moves to 6/4 after) + chain-owed.sh.
- §M8a MAP (final): 19, 20 S7/S6 · 21 TICKETS landing line · 22 REGISTER client pick · 23 REGISTER SEP · 24 SLIP facts
  ("drawn whole, struck to ink, seeded on the product's clock") · 25 HUB loading frame (links 22) · 26 HUB line order +
  wording (links 24 for salesCloseColon) · 27 HUB buy column · 28+ S6 via the lead · rail swap inside item 11.
- HUB: (2) salesCloseColon already done on its branch (closeWords; hub 18.1/18.2); (1) ghost LEDGER gap in batch 4,
  measured against REGISTER's pushed ledger via a one-run overlay (restored). heavy-c4: tsc 0, plants 1620/141 (8/8 red),
  green a 2976/28 b 713/11 (32 pinned-foot checks assumed 16px → batch 4; 7 expected sw-320 door rows = SLIP).
- CI dispatched on the release ee6075609: run 39793230085.
- Ali's launch list drafted: $F/lead/ali-list.md.
- e3a31ce46 (release, pushed): main da3d32180 merged (docs; §0 ours, the ▶ 0i row rewritten to today's truth, 9/13 ✅);
  six board guards green (maswali-plan, landing-ten, marketing-setup, mobile-visual 718/0, phosphor, vodacom).
- S6 lanes SPAWNED (~14:25Z) from the integrator's briefs: NOTICES, LINT, MONEY, DOCS (ids in agents.md). DOCS writes
  the admin guide from its own console walk; the independent ADMIN-COMPLETENESS review runs on S6's final head (lead).
  S6 battery on d97266317 green: notify 138/144, settle 110, void 57, purchase 116, integrity 51, house-bot-money 177,
  console 832, fairness 31, reporting 58, fence 32, evidence 69, red:claims 29/29, red:rbac 26/26.
