# The S5 lead's merge notes and rulings (2026-10-21/22, OMEGA-COMPILE01, Claude asheib-65)

## 2026-10-22 PM — the Claude session asheib-f3 (OMEGA-COMPILE01), STOP 4: every lane's final state, every lead ruling, the merge-time wiring

### Done by the lead
- `81e312f01` §0 ⏳ IN FLIGHT (docs). `41e61987c` three ratchets read and moved: wallet-status-writers 39→42 (three S5 dev
  fixtures: maswali-hub-act, seed-maswali-register, seed-maswali-tickets — each proven dev-only, production writers still 3),
  spacing-scale ceiling 393→391 (measured), house-bot-holder-lifecycle scripts 38→39 (maswali-doors.test.mts `queue.push(r);`
  in its import-graph walk — a conservative catch, writes nothing).
- `test:harm-watch` alone (slot 7, KP 5477): 15/15 PG, ALL PASS — the test:all crash (exit 3221225794 = 0xC0000142,
  STATUS_DLL_INIT_FAILED) was the loaded machine, not a defect.
- main's six CI reds on the release: r5a, r5j, r6c, dead-css, rate-copy GREEN; r7c fails only 1.4 (PLATFORM owns).
- Parity harness unchanged since 9a0c6b033 (pre-check empty); no r2 branch touches it. Baseline
  `$S/s5par/parity-v5-bfa0b7d57.json` stays valid for S5 (main since bfa0b7d57: marketing server files, tests, docs only).

### Merge forecast (dry runs at 09:10Z on the r2 heads as they stood)
- Each r2 branch alone merges clean into the release; cumulatively (tickets, register, hub, slip, doors, platform) only
  `scripts/millionea-shell.test.mts` conflicts (1.1b re-pins) → resolve to "no call left" and delete MillioneaPreviewMark.
- Stray `claude/maswali-s5-release-merge-20261022`: `e70672fe0` (sealLineOf → pure module) conflicts only in
  `scripts/maswali-tickets.test.mts` → apply after the six merges; `da6b5e68a` superseded by REGISTER r2 item (1) (compare,
  then drop); `d5e99de99` superseded by the lanes' own removals (reference for the last call + the component deletion);
  `a995dd936` applies clean BUT its "item 13" pointers are wrong for the release (§M8a item 13 = week chip, 18 = way-back) →
  re-derive by hand after D11 is numbered. Then bundle + delete the branch.

### Lead's own fixes at the merge (found while the lanes ran)
- Ali's ruling 7 (2026-10-21, COMPLIANCE-DECISIONS): English "Buy ticket · {price}" / "Ticket bought" / "Buying…" replace
  "Cut ticket" (sw keeps "Kata tiketi", zh 出票). The dictionary is right, but:
  - `scripts/maswali-player-drive.mjs` :22 (doc), :223 (`/^Cut ticket/` button) and :229 ("Ticket cut" stamp) still use the
    old words on EVERY r2 branch → the render job "player" would fail at the buy step. DOORS r2 fixed only
    `maswali-player-shots.mjs:126`. Fix the drive at the merge.
  - `src/app/legal/privacy/page.tsx:235` (English): "removed once your ticket is cut" → "… is bought" (one wording; the sw/zh
    lines keep their ruled verbs); re-run `test:privacy-notice` (§4p's title says "the cut ticket" — a test title, reword it).
  - Internal names (`maswali-cut` motion, `cut?: "cut" | "undo"`) and test titles are not player words — leave them.

### Release commits since STOP 3
`81e312f01` §0 in flight · `41e61987c` three ratchets · `c58b316ff` English buy wording in the privacy notice (never-printed
Millionea paragraph; v2026-10-17 entry amended; pins re-measured) + the player drive's buy button · `87f19f3a9` D19a's
privacy source → c58b316ff. CI run 39753560721 on 41e61987c: test (in-memory) FAILED exactly the known list —
ui-consistency, guards-exist, house-bot-disclosure, house-bot-blob-pin, updown-filter-sheet, measure, maswali-fence,
visual-pass-r7c, visual-pass-r10, visual-pass-r5h (all owned by lanes or the final D19a re-pin). main's own CI red:
r5a, r5j, r6c, r7c, dead-css, rate-copy — the release turns all but r7c (PLATFORM) green.

### Ali's answers (2026-10-22, one batch) — memory project-maswali-approvals-20261022
Push when ready; pre-approved: read-backs, STAFF_PREVIEW switch, ONE SmsMessage size/count, branch deletes at the end; staff
check = QA staff + QA player sign-in once each; S8 = the first public week is the live test (QA accounts buy in week 1,
rollback ready) — rewrite S8 / OD-21 / §6 line 12 to match; OD-21's drive code stays dormant.

### S6 review (lane abda3585a3c0e1630, A–D) and the lead's rulings
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

### Lane findings ruled by the lead (in flight)
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

### Merge-time wiring owed by the lead (collect here)
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

### S6 addendum (2026-10-22 PM) → S6 integration started (`claude/maswali-s6-release` from claude/maswali-s7-s5)
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

### ALI'S LIST FOR S8 (collect; present at the close)
Rotate Railway variables (security incident) · licence basis on production · fund TZS 2,000,000 (Owner ceremony) · Finance's
float letter · primary + backup officers · Gate B line 7 (dated ruling amending S16 item 8 / OD-22 + Vodacom notice) ·
OD-18's legal sanity check + the Terms section's legal check · the death script's legal review (MB-86) · GBT's OD-08 answer
(Finance's is recorded) · approve the Millionea campaign wording set (MB-47) · L15 (two zh nouns for "ticket") · production
QA sign-ins for the drive · the launch word. (Already answered: S8 drive = first public week.)

### More merge-time wiring
- SLIP makes the stamp's "View ticket" the kit's Link (OperationResultModal opt-in `primaryHref`). After merging SLIP:
  `scripts/maswali-player-drive.mjs` ~227 and `scripts/maswali-player-shots.mjs` ~127 (DOORS' r2 touches it) press it as
  `getByRole("link", { name: "View ticket" })`, not "button". SLIP's ghost marker: 84254b974 (wrapper around everything).

### S7 × S5 merge (S7 lane aaabf818e50d7d32b)
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

### Phase 3 render plan
Each lane fast-forwards its own tree to the integrated head (its branch is merged → ff) and runs ITS full state shots there
(tickets: states/moments/ghosts/sunset; register: states/sunset; hub: drives a/b/c + states; slip: final-run pieces; doors:
job-doors + job-preview; platform: D10–D15 drives) + the lead's `render-jobs.sh <tree> <port> <tag> player` for the default
seed's every page. Tiles → `$F/render/<tag>/<lane>/`. Critics: `$F/critics/COMMON-R2.md` + their R1 report.

### Machine
~15 GB free (Firefox 3.7 GB, ChatGPT app 3.1 GB, VS Code 1.6 GB are Ali's). 43 Codex desktop helper node processes (1 MB each)
are Ali's Codex app — not ours.

### STOP 4 — lane final states (filled as reports arrive)
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

---

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

## MAIN 67e47f8d2 LIVE (2026-10-22 08:12:48Z; Railway deploy requested 07:15Z on Ali's word). Read-back (lead, signed out,
## tools/readback.sh): dpl on www, apex and the Railway host; /api/health ok (DB reachable, migrated, configured);
## qa:chunks-prod 6/6 on www and apex (154 GETs each); production qa:live ALL PASS 364/0. OWED: record U43's part in
## MOBILE-VISUAL-PLAN §0 (its ⛔ deploy paragraph: "On main, NOT yet deployed" → live, with these results) WITH the next
## push to main (S5's) — no docs-only deploy during Railway's backlog. asheib-bb's session had ended (not told); the
## marketing check (Jay's own-number test of the harm-marker mute) can run now — its owner's.

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
