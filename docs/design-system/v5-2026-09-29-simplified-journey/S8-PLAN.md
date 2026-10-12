# S8 — the bet sheet and low balance (flagged): build plan (drafted 2026-10-12)

> The working plan for VODACOM-PLAN S8, "Bet sheet + low balance (flagged): §3.3 and §3.4" (`docs/VODACOM-PLAN.md`
> :3952-3954; the board row :2914). Drafted read-only on 2026-10-12 by one planner, who read every file cited below;
> no suite, server or browser was run. Status lives in `docs/VODACOM-PLAN.md` §0 (a new §0k, opened by WP0); this file
> is the how. Its Open points are decisions taken under Ali's delegation, each with the overrule he may choose; WP0
> files them as numbered §0h points after S7's last.
>
> **Base.** Line numbers are at `2322cf09` (branch `vodacom-s7-land3`: S7 WP1–WP4, eight commits on origin/main
> `fdd662a9`). Two later S7 packages are read from their branches and cited with the branch named: WP5 (the journey card)
> at `origin/vodacom-s7-wp5` `8fff5425`, and WP6 (the shared lost-chunk guard and the How-to sheet) at
> `origin/vodacom-s7-wp6` `ba6faebb`. S7 WP7–WP12 have no commit yet (WP8's branch sits at the land3 tip). S7 still edits
> `app-shell.tsx`, `markets/[id]/page.tsx`, `journey-card.tsx`, `card-face.ts`, `i18n-dict.ts` and `globals.css`, so WP0
> re-reads every number here at S8's real base before any package starts (S7-PLAN A24's method).

## Summary

### What S8 builds

For a journey reader who is signed in, S8 draws the deck's frame 2 (the bet sheet) and frame 3 (balance too low) in
50pick's look, as the S4 canvas binds them: `s4-canvas/pick-2-bet-sheet.dc.html`, `pick-3-balance-too-low.dc.html`, 24
of the 25 `s4-4-*` boards (the guest board is S10's) and the six `s4-5-*` boards; choice 2A (§0h point 1).
- **The sheet opens in place** from every journey card's NDIO/HAPANA (S7 WP5's anchors), from the question page's two
  big buttons, and from a `?bet=` or `?side=` address. It draws on the tap frame from figures the server rendered into
  the card, with no network wait, then refreshes itself (§3.3 :3508, :3527).
- **Every figure is the engine's.** The TZS estimate and its "≈N.N×" come from `estimateFor` at the entered stake
  (estimate.ts:123-185). Every low-balance figure comes from `shortfallPlan` (shortfall.ts:161-211). The sheet types no
  number and computes no money of its own.
- **Placing is exactly-once.** The CTA "Weka dau · TZS X" is the confirm step (SJ-10, VODACOM-PLAN.md:3200-3206). One
  idempotency key per intent, reused only for a retry ("Exactly once" below).
- **Every refusal** the bet path can return is shown inside the sheet by one fixed table ("The refusal matrix" below). No
  refusal is shown as a generic error, and no server's English sentence is ever shown.
- **Balance too low (§3.4).** Every branch of the plan is drawn: deposit, bet what you have, short by less than the TZS
  1,000 deposit minimum, a deposit already pending, the deposit limit, source of funds and every rail paused. So are the
  blocks the plan asks first: maintenance, a break, the session limit, the account, a held wallet and the loss limit ("The
  low-balance branches" below).
- **The question page for a journey reader.** S7 left it to S8 (S7-PLAN.md:62-65; A19 item 5, :2087). The two big
  buttons come after the holder's ticket block, as the S4 market board draws them (`s4-10-market.dc.html`:73-77). The
  holder block takes S6's journey Sell look, and the page gets its own loading picture.
- **The home on a break** (S7-PLAN Open point 26, :1456-1457): the break notice and each card's "Mapumziko hadi {date}"
  row (`s4-3-home-break.dc.html`).
- **The SSE card patch** that S7-PLAN A7 moved here (:1706-1725), payload-free.
- **The proofs the done-when names:** `test:bet-sheet` (new, in-process), and V20 and the refusal matrix as a
  real-browser drive (`qa:bet-sheet`, new).

### Why a classic visitor's served markup does not change

Every S8 surface is either journey-only code or a same-slot ternary whose else arm is today's markup:
- **The sheet and its host** are client code. AppShell mounts the host only for a request that the resolver shows the
  journey to and that has a session (WP7). The host is a lazy part of `shell-lazy.tsx` (its parts :82-101; the guard
  imported from `lost-chunk.ts` on the WP6 branch, shell-lazy.tsx:48 there), so a classic visitor never downloads it. It
  renders nothing until opened, and the kit Modal draws nothing while closed (modal.tsx:504).
- **The journey card** (S7 WP5) is the only card that gains S8's attributes. `market-card.tsx` stays untouched.
- **The question page** asks the resolver once (S7 WP10 adds that read). Its bet panel's signed-in arm and its holder
  section each become one ternary whose else arm is today's element, not re-indented.
- **The two loading files** that a hop to a question meets keep today's drawing for a classic reader, moved verbatim into
  a ghost file (WP8).
- **The kit `Input`** gains two props that are inert unless set (WP5).
- **PullToRefresh** skips a touch only inside an element that only the sheet draws (WP7).

`qa:classic-shell-parity` v4 (WP1) proves the markup, the question page's whole body included, against a baseline
captured before S8's first product commit. `qa:served-skeleton --main` proves the bytes (S7-PLAN A9).

### What does change for a classic visitor

JavaScript, CSS, two RSC references, one RSC slot and one legal text change; page markup never does. Each has an S6 or S7
precedent and is recorded in §0k under "Served bytes for a classic viewer", with its proof:
- (a) **JS on every page:** the dictionary's new `journey.*` keys (WP4); `shell-lazy.tsx`'s chunk, one export longer
  (WP7); PullToRefresh's chunk, one skip clause (WP7). Output unchanged. Proof: parity v4 and qa:served-skeleton.
- (b) **JS on pages that draw a kit `Input`** (the deposit and withdraw forms, the profile and limits pages): the Input
  chunk gains `grouped` and `attention` (WP5). Proof: `test:numeric` with its plants, parity v4.
- (c) **CSS:** the sheet's, the big buttons', the break row's and the question ghost's rules match nothing on a classic
  page. One token is added (`--input-attention`). Proof: parity v4.
- (d) **RSC:**
  - AppShell's children gain one `false` slot, the host's (S6 WP7's precedent, VODACOM-PLAN.md:914, :931);
  - the question page's loading boundary and the markets segment's name a moved ghost module instead of the loading file
    itself (WP8).
  Proof: qa:served-skeleton `--main` and qa:first-load.
- (e) **The privacy notice:** §7 names the pending-bet marker `kp-pending-bet`, with a version bump (§3.10 :3800-3801;
  Open point 13). Every visitor can read it; it joins §2's pre-flip list.
- (f) **HTML of every other page:** none.

No new EXPECTED_DIFFS entry is expected. Any difference is named or fixed, never re-baselined.

### What S8 leaves to later sessions, and why

- **The guest sheet (S10, §3.7).** The host mounts only for a session. A journey guest's pick still navigates to the
  question page, whose guest arm is today's sign-in panel ([id]/page.tsx:792-856).
- **The journey deposit, the waiting page and the return (S9, §3.5).** S8's "Weka pesa TZS {D}" opens today's
  `/wallet/deposit` with the amount and the bet (Open point 11). "Fuatilia malipo" opens the pending deposit's receipt
  (Open point 12).
- **`Position.origin`.** §0f deferred it "to S8" (:2699-2700), but no S8 measure reads it. It moves to S9 with the
  deposit return (Open point 31).
- **The staff real bet on production (S14).** §0h point 4 (:1780-1782) holds every preview off production until the plan
  is done. S14 already carries "one real TZS 1,000 journey on production" (:3992). Open point 2.
- **Flip-time rewrites (S15).** CLAUDE.md's "UX commitments" and "Conviction dial" notes (:696-700, :718-725) and its
  "Betting flow invariant" (:908-927); RULES §2.1 and §2.3; `failBalanceInsufficient` (§3.9 :3764); the dual-mode
  `live-place-bet.mjs` and `live-rg-break.mjs` (§4's ripple row, :3813).
- **The Juu/Chini stake panel in the journey language (S12).**
- **Corrections to classic words players see today (S12, §0h point 3).** The sheet shows the corrected words through
  journey copies (WP4); the classic keys keep theirs (Open point 37).

### Order (13 packages, each green on its own)

1. WP0: the start line (S7 closed, today's reds, the records, the §0h points).
2. WP1: parity v4 (the question page's classic body; S8's trace), with its baseline.
3. WP2: the pure core — the sheet's rules, the refusal matrix, the quote and its key, `leftAfter` in the plan.
4. WP3: the server reads — the viewer's facts with no write, the pending deposit, the card's seed.
5. WP4: S8's words.
6. WP5: the kit additions — `Input` `grouped` and `attention`; the sheet's own disabled gold.
7. WP6: the sheet, every frame, mounted nowhere.
8. WP7: the host and its mount — taps, the address, deep links, refreshes, deploy skew.
9. WP8: the question page for a journey reader, and its loading picture.
10. WP9: the break — the home's notice and the cards' break row.
11. WP10: the SSE card patch, payload-free.
12. WP11: the drives — `qa:bet-sheet` (V20, the refusal matrix, exactly-once, the tap frame, the tiles) and qa:live.
13. WP12: proof, records, merge, deploy.

### Corrections to the maps, verified in the files

1. **The plan's line numbers at the base** (`docs/VODACOM-PLAN.md`):
   - §0 :17; §0j :495-618; §0i :620; §0h :1763 (its last point is 67, :2417; `origin/vodacom-s7-docs` `c0a9c826` runs
     to 76); §0g :2429; §0f :2656; §0e :2735;
   - §1 S8 row :2914; §3 table :2937 (S8's rows :2963-2977); SJ-10/SJ-11 :3200-3208; SJ-22 :3276-3282; §2 :3333-3365;
   - §3.1 :3371-3454; §3.2 :3456-3503; §3.3 :3505-3570; §3.4 :3572-3594; §3.5 :3596-3666; §3.7 :3704-3719; §3.10
     :3773-3801;
   - the ripple map's Bet sheet row :3813; §5 S8 :3952-3954; S14 :3983-3994.
2. **S7-PLAN A7 item 2's edits never landed.** :3474 still reads "`RefreshPoller 30s` plus the SSE `market-odds` patch
   for visible cards", and §5 S8 (:3952-3954) does not name the card patch. Neither is changed on
   `origin/vodacom-s7-docs`. WP0 makes both edits.
3. **"A staff real bet works on production" (§1 :2914; §5 :3954) contradicts §0h point 4 (:1780-1782).** S7 moved its
   own production clause to S14 for the same reason (S7-PLAN Open point 2, :1377-1379). S8 does the same (Open point 2).
4. **§3.2's card buttons (:3482-3484) name `market-card.tsx:430`'s `go()`.**
   - At the base the classic `go()` is market-card.tsx:447-454.
   - S7 built the journey card as its own server component (S7-PLAN Open point 3, :1380-1387). Its picks are real
     `<Link>`s to `/markets/<id>?side=…` (journey-card.tsx:204-214 on `origin/vodacom-s7-wp5`).
   - So nothing in market-card.tsx changes. S8's host intercepts the journey card's anchors (WP7).
5. **`html[data-bet-sheet]` (§3.3 :3560) is not needed** (S6-PLAN.md:604 left it to S8):
   - The kit Modal is `role=dialog aria-modal` only while open (modal.tsx:504-518), which is exactly what
     `isModalDialogOpen` reads (modal-open.ts:17-28).
   - The reality check and the channels panel already defer to it (reality-check.tsx:96; channels-panel.tsx:241).
   - The consent prompt's mount stays ungated by rule (S6-PLAN.md:602). It sits at z-50 (consent-prompt.tsx:73), under
     the dialog rung of 100 (modal.tsx:300), and nothing behind the top dialog takes a key (CLAUDE.md:929-942).
   - The install card is withdrawn (app-shell.tsx:610).
   Open point 15.
6. **"short_balance_shown" (§3.4 :3594) is not a funnel step.** The allow-list's step is `low_balance`, whose origins
   include `sheet` (funnel.ts:19), a client step (:32). The sheet's opens are `sheet_open` with origin `home`, `board`,
   `market` or `card` (:17); its bets are `bet` with origin `sheet` (:21), carried by `funnelBetFields(fd, "sheet")`
   (funnel-beacon.ts:52-58).
7. **`depositRails()` (§2 :3354; §0g item 6, :2464) does not exist** in `src/`. The deposit rails are
   `MOBILE_MONEY_METHODS` (payment-providers.ts:109) less the ones paused for deposits (`getKillSwitches`,
   payment-ops.ts:141-146). `heroRails` (payout-rails.ts:48-50) filters by both directions; it is the landing's.
8. **Not every bet refusal carries a reason** (§3.3 :3540-3545 assumes one):
   - five refusals in `buyPositionInner` carry none: "Account not found." (market-service.ts:1236), "Market not found."
     (:1328), "Market is not accepting predictions." (:1329), the pre-lock `SELECTION_CLOSED` (:1330) and "Market has
     closed." (:1331);
   - admission's BUSY carries only its code (:1078-1084), which `REASON_BY_CODE` maps to `system_busy`
     (failure-reasons.ts:500);
   - the action's two parameter refusals carry neither (markets/actions.ts:90, :93).
   The matrix classifies each by its code and a re-read of the sheet's facts, never by its prose (Open point 7).
9. **`balance_insufficient` "with the server's `{balance, needed}`" (§3.3 :3544-3545)** holds for the locked pre-check
   only (market-service.ts:1521-1530). The in-transaction abort returns the same reason with no `detail` (:1833-1837).
   The sheet then re-reads the viewer's half.
10. **The sheet's first focus.** §3.3 says the heading (:3510). CLAUDE.md's keyboard rule says money dialogs open on
    their primary (:932), and `test:enter-where-pressed` 2.2 holds three named dialogs to it
    (enter-where-pressed.test.mts:950-953). The sheet is a fourth: Open point 5.
11. **Three kit additions §2 names are not built:**
    - Modal's `dragToDismiss` (:3346). S7 kept "no drag" (S7-PLAN Open point 20, :1431-1439).
    - Input's `grouped` and `attention` (:3348). The Input's props are prefix, trailing, mono, error, size, the container
      class and the two numeric switches (input.tsx:46-60).
    - §3.3's keyboard lift (:3557). The kit Modal reads no `visualViewport`; only the Needle does (needle.tsx:262,
      :889-891).
12. **V20 is not implemented by any script.** `scripts/qa/landing-ten.mjs` has no V20 block; V20 is only listed in
    `scripts/landing-ten-plan.test.mts`:48. Its definition is LANDING-TEN.md:313 ("sheets trap focus, close on Esc,
    respect the safe area") and HANDOVER-LANDING-10.md:238 (a 34px inset); the safe-area method was left open
    (LANDING-TEN.md:773-774). WP11 builds it.
13. **`checkSessionTimeLimit` is not a read.** It writes the play clock on every call (responsible-gambling.ts:516-522).
    `shortfall.ts`'s premise, "every input is a fact the server already reads" (:14-16), holds for the sheet only
    through a write-free twin (WP3). Calling the gate from a sheet read every few seconds would keep a sitting alive with
    no bet attempt.
14. **Three approved canvas sentences are no longer true; S8 does not build them as drawn:**
    - The loss block's "Kitaanza upya kesho saa 00:00" (s4-4-block-loss.dc.html:26; the S12 correction,
      S4-COPY-AUDIT.md:124) states a midnight reset. The gate is a rolling 24 hours (responsible-gambling.ts:586-588).
      Open point 22.
    - The pending board's receipt "kwa barua pepe" (s4-5-low-pending.dc.html:39). Since 2026-10-07 money mail goes only
      to a confirmed address (COMPLIANCE-DECISIONS.md:612-614), and the live sentence keeps the receipt in the app
      (`depositPendingBody`, i18n-dict.ts sw :3390). Open point 24.
    - The inline session-limit line's "hadi 15:40" (s4-4-inline-refusals.dc.html). The refusal carries `limitMin` and
      `playedMin` only (market-service.ts:1222-1228). Open point 23.
15. **Every blocking board carries "Simu ya msaada · 0800 11 0011"** (`s4-4-block-*.dc.html`:27), and so does the home on
    a break (s4-3-home-break.dc.html:33). No player surface shows the helpline (COMPLIANCE-DECISIONS.md:834-876). S7-PLAN
    A6 item 6 named only the home-break line (:1697-1698). None is built.
16. **INHERIT-MANIFEST L6 (:90) says `Callout tone="neutral"`.** The panel's D5 made the low-balance warning
    `Callout tone="info"` (VODACOM-PLAN.md:3352, :2628). WP4 annotates L6.
17. **`sheetForUser`'s `bonusWarning` (journey-sheet.ts:134) is not SJ-22's bonus-wager warning.** That warning is the
    market page's B2: `bonus_wagering_one_side`, when the viewer holds the other side and an active grant
    ([id]/page.tsx:486-519). Open point 21.
18. **"Held wallet" is a block, not a low-balance variant (§3.4 :3592).** The plan blocks a held wallet before any option
    (shortfall.ts:179-180; §0e :2772-2774), and the canvas draws the frozen refusal for it (§0g :2561-2562).
19. **The below-minimum note needs a figure the plan does not compute.** "TZS 800 zitabaki" (s4-5-low-min500) is
    spendable + D − stake; `DepositOption` carries D, the chips and `belowDepositMin` only (shortfall.ts:125-133). WP2
    adds it, so no figure is computed in a component.
20. **estimate.ts:32-33's note** says that over the cap "the surface says 'Shinda zaidi ya {cap}× dau'". That is stale
    for the card (S7 Correction 9) and is not the sheet's wording, "≈ zaidi ya {cap}× dau lako"
    (s4-4-sheet-over-cap; S4-COPY-AUDIT.md:272). WP2 corrects the comment.
21. **The question page at the base:**
    - it asks no resolver (no `resolveSimpleJourney` in [id]/page.tsx); S7 WP10 adds the read;
    - its bet panel (:713-893) is `order-1` on a phone, above the content (:897);
    - the S4 board puts the two big buttons after the holder's tickets (s4-10-market.dc.html:73-77). Open point 26.
22. **The Sell button's journey look** (`look="journey"`, sell-button.tsx:34-35) has one host, the journey ticket card
    (ticket-card.tsx:150). The question page's holder block draws today's look ([id]/page.tsx:1076-1090); the S4 market
    board draws the journey's. Open point 28.
23. **The SSE wiring.** The event's window name is `50pick:sse:market-odds` (use-event-stream.ts:23). It is emitted after
    each bet (market-service.ts:1849) and at :3405. The stream opens only for a session (app-shell.tsx:577).
24. **The question page's loading picture is S8's** (S7-PLAN A19 item 5, :2087; its Points for Ali 16, :2261). Today a
    journey reader's document load draws the classic question skeleton through the root ghost (route-ghost.tsx:109,
    importing `[id]/loading.tsx` at :82). A hop from outside `/markets` meets `markets/loading.tsx` (the board's ghost,
    client code, :1) and then `[id]/loading.tsx` (client code; its note, :6-12).
25. **"Endelea kucheza" is Up & Down's key** (`market.udRcKeepPlaying`, i18n-dict.ts sw :4060). The classic poll receipt
    says "Endelea kutabiri" (`common.keepPredicting`, sw :3374). The sheet reuses the former, the deck's word.
26. **§3.3's deploy-skew line (:3569-3570) cannot lean on the route's boundary.** RouteError's once-per-build reload
    (route-error.tsx:129-140) runs in the route error files (app/error.tsx:3, :21), which wrap the pages. The host renders
    in the root layout, outside them, where an error reaches global-error.tsx, the last-resort boundary (:4), which
    reloads nothing. So the host reloads itself under RouteError's rule (WP7 step 7; Open point 14).

---

## The sheet's three tables

### The refusal matrix

Every way `buyPositionAction` (markets/actions.ts:85-122) and `buyPosition` (market-service.ts:1068-1088, :1124-1998)
can answer the sheet, and what the sheet shows. Rules for the whole table:
- **Channel.** A `modal`-channel reason (failure-reasons.ts:282-313) becomes a blocking frame the player must acknowledge
  (§3.3 :3541-3542). A `toast` or `inline` reason becomes one line in the sheet's last rows, above the CTA (s4-4-inline-
  refusals). Nothing toasts: every refusal is shown inside the sheet (§3.3 :3539).
- **Classification.** By `reason`, else by `code` (`reasonForCode`, failure-reasons.ts:540-543, or the codes named
  below). Never by the `error` prose (failure-reasons.ts:17-23).
- **Retry.** "same key" reuses the intent's key; "new key" mints one at the next tap; "—" ends the sheet's attempt.
- **Before the tap.** The plan's facts (WP3) show rows 5–21's states at open whenever the facts already say so (Open point
  8), so these rows mostly answer a fact that changed between the read and the tap.

| # | Where | code · reason · detail | Registry | The sheet shows | Retry |
|---|---|---|---|---|---|
| 1 | market-service.ts:1078-1084 (admission shed the request) | `BUSY` · none · `retryAfterSec` | `system_busy` by code: warning, toast | inline `journey.sheetBusy`; the CTA becomes "Jaribu tena · {amount}" | same key |
| 2 | the action's call throws (a dropped line, a server throw) | none; the sheet sets `system_error` (conviction-dial.tsx:1006-1010's rule) | error, toast | inline `error.failSystemError` ("check your wallet first"); "Jaribu tena · {amount}" | same key |
| 3 | the same throw when it is Next's `UnrecognizedActionError` (a deploy) | none | — | the host reloads the page itself, once per build, per tab and per path, under RouteError's own key and rule (route-error.tsx:129-140); the address and the marker reopen the sheet at the tapped stake, never placed (Open point 14) | — (the server never ran it) |
| 4 | markets/actions.ts:87 (no session) | the action redirects; the call resolves to nothing | — | nothing: the navigation to sign-in speaks (conviction-dial.tsx:1027's rule) | — |
| 5 | :1155 | `RATE_LIMITED` · `rate_limited` · `retryAfterSec` | warning, toast | inline `journey.sheetRateLimited` | new key |
| 6 | :1167-1168 | `SUSPENDED` · `maintenance` | error, toast | inline `error.failMaintenance` | new key |
| 7 | :1192-1193 | `SUSPENDED` · `cooling_off` · `until`, `untilAt` | error, modal | block (s4-4-block-cooling): `market.udErrSuspendedTitle`, `error.failCoolingOff` with `{until}` through `formatBreakEnd` (break-end.ts:81); "Weka mipaka" and "Sawa" | — |
| 8 | :1195 | `SUSPENDED` · `self_excluded` · `until`, `untilAt` | error, modal | block (s4-4-block-selfex): `error.failSelfExcluded`, "Sawa" only. In practice row 4: a self-exclusion revokes every session (responsible-gambling.ts:322) | — |
| 9 | :1212-1229 | `SUSPENDED` · `session_limit_reached` · `limitMin`, `playedMin` | warning, toast | inline `journey.sheetSessionLimit`, with no end time (Open point 23) | new key |
| 10 | :1236 | `NOT_FOUND` · none ("Account not found.") | `not_found` by code | block: `journey.sheetBlocked` (the account cannot bet; support can say why) | — |
| 11 | :1281-1315 | `SUSPENDED` · `account_blocked` | error, modal | block (s4-4-block-blocked): `journey.sheetBlocked`; "Wasiliana na msaada" (→ `/help`) and "Sawa" | — |
| 12 | :1328, :1329, :1331 | `NOT_FOUND` or `INVALID` · none | — | re-read the public half: a 404 or `bettable: false` → the closed frame (s4-4-sheet-closed: `journey.sheetClosedTitle`, `sheetClosedBody`, "Sawa") | — |
| 13 | :1330 | `SELECTION_CLOSED` · none | `selection_closed`'s row: info, toast | the closed frame, by the code | — |
| 14 | :1335-1349 | `INVALID` · `stake_not_whole`, `stake_below_min`, `stake_above_max` · `min`, `max` | warning, inline | the bounds line under the stake (`journey.sheetBelowMin`, `sheetAboveMax`, `error.failStakeNotWhole`) from `detail`'s bounds, a bound that moved since the open; the chips re-filtered; the CTA bare and disabled | new key |
| 15 | :1350 | `INVALID` · `market_not_live` ("Invalid side.") | info, toast | unreachable: the sheet sends YES or NO only (WP2's request builder). If it arrives: re-read; closed if not bettable, else inline `error.failMarketNotLive` | new key |
| 16 | :1374-1377; markets/actions.ts:98-100 | `INVALID` · `idempotency_key_conflict` | warning, toast | unreachable: a fresh UUID per intent, never an `hb:` key (house-bot/constants.ts:71). If it arrives: inline `error.failIdempotencyKeyConflict` | new key (the old one belongs to another bet) |
| 17 | :1405-1411 | `NOT_FOUND` · `wallet_frozen` | error, modal | block (s4-4-block-frozen): `journey.sheetFrozen`; "Wasiliana na msaada" and "Sawa" | — |
| 18 | :1405-1411 | `NOT_FOUND` · `wallet_missing` | error, toast | inline `error.failWalletMissing` ("nothing has been charged") | new key |
| 19 | :1488-1491 | `INVALID` · `loss_limit_daily` | error, modal | the plan decides from a re-read: room at least the minimum → the loss-room frame (s4-4-sheet-loss-room); less → block (s4-4-block-loss): `market.udErrRgLimitTitle`, `journey.sheetLossBlock`, "Weka mipaka" and "Sawa" | — |
| 20 | :1521-1530 | `INVALID` · `balance_insufficient` · `balance`, `needed` | warning, inline | never its sentence: the low-balance frame, spendable = `detail.balance`, then the viewer's half re-read (§3.3 :3544-3545) | new key |
| 21 | :1833-1837 | `INVALID` · `balance_insufficient` · no `detail` | warning, inline | re-read the viewer's half, then the low-balance frame (Correction 9) | new key |
| 22 | :1753-1762 | `SELECTION_CLOSED` · `selection_closed` (closed in flight; nothing debited) | info, toast | the closed frame | — |
| 23 | markets/actions.ts:90, :93 | none · none ("Invalid side.", "Invalid bet parameters.") | — | unreachable by construction. If one arrives: row 2's handling — an unknown outcome is never retried with a fresh key (Open point 35) | same key |
| 24 | :1366-1395 | `ok: true` · `replayed: true` | — | the receipt, with the ORIGINAL bet's facts | — |
| 25 | :1825 | `ok: true` | — | the receipt: side, stake, ticket id; no payout figure (SJ-4) | — |

The house seam's own refusals (`house_key_mismatch`, `house_intent_superseded`, market-service.ts:1374-1377, :1836) need a
house context, which no player call has (:1075). `test:bet-sheet` §2 holds this table against the source: it reads every
`reason:` and `code:` literal on the player path of `buyPositionInner` and the action, and fails on one with no row.

No identity or email gate stands on either money path the sheet reaches. A stake asks no identity question
(market-service.ts:1318-1325), and a deposit asks neither identity nor email (wallet-service.ts:123-139; COMPLIANCE
2026-09-13 and 2026-10-07). Both are asked before a withdrawal only, which the sheet never offers; so no KYC refusal can
reach it, and the low-balance plan has no KYC or email branch (shortfall.ts:12-13; §0i WP12, VODACOM-PLAN.md:1736).

### The low-balance branches

What each `shortfallPlan` answer (shortfall.ts:137-150) draws. The frame is derived on every render from the stake and
the viewer's facts: a chip tap at once, typing after about 250 ms (§3.4 :3575). Editing the stake down, or a deposit that
lands (`wallet:balance`), brings the edit frame back live (:3576). In the low frames the chips, the estimate box, the
Makadirio line and the balance row are hidden (:3590).

The minimums are the money doors' (COMPLIANCE-DECISIONS.md:669-700): `DEPOSIT_MIN_TZS` 1,000 (validators.ts:90) is D's
floor (shortfall.ts:200), and `PLATFORM_MIN_STAKE` 1,000 (payout.ts:166), floored on every read (market-config.ts:547-571),
reaches the sheet as its `min` through `stakeBoundsForMarket` (market-service.ts:994-1003). The sheet types neither.

| Plan | Frame | Board | What it says and offers |
|---|---|---|---|
| `blocked maintenance` | edit, CTA disabled | s4-4-inline-refusals | inline `error.failMaintenance` |
| `blocked self_excluded` (`until`) | block | s4-4-block-selfex | as matrix row 8 |
| `blocked cooling_off` (`until`) | block | s4-4-block-cooling | as matrix row 7 |
| `blocked session_limit` (`limitMin`) | edit, CTA disabled | s4-4-inline-refusals | inline `journey.sheetSessionLimit` |
| `blocked account_blocked` | block | s4-4-block-blocked | as matrix row 11 |
| `blocked market_closed` | closed | s4-4-sheet-closed | `sheetClosedTitle`, `sheetClosedBody`, "Sawa" |
| `blocked stake_*` (`min`, `max`) | edit, CTA bare and disabled | s4-4-sheet-below-min, -above-max | the bounds line; the box "TZS —" |
| `blocked wallet_held` | block | s4-4-block-frozen | as matrix row 17 |
| `blocked loss_limit`, headroom at least the minimum | loss room | s4-4-sheet-loss-room | chips above the room hidden; the stake in `attention`; `journey.lowLossTitle` and `lowLossRoom` with the headroom; "Weka mipaka"; the CTA bare and disabled (the panel's A3, :2624-2626) |
| `blocked loss_limit`, headroom below the minimum | block | s4-4-block-loss | as matrix row 19 |
| `unknown` | edit | s4-4-sheet-unknown-balance | the balance row "—" with `common.temporarilyUnavailable`; the CTA enabled; the server decides (shortfall.ts:18-19) |
| `enough` | edit | pick-2-bet-sheet | deck frame 2 |
| `pending` (`amount`, `txnId`) | pending | s4-5-low-pending | the compact row; `journey.lowPendingTitle`; the live `depositPendingBody` (Open point 24); "Fuatilia malipo" (Open point 12); the CTA disabled |
| `short`, deposit and bet instead | low | pick-3-balance-too-low | the compact row; the info callout `lowTitle` + `lowBody`; the eyebrow `lowChoose`; the deposit row "Weka pesa {D}" over the open rails' names; "Weka dau la {amount} badala yake" over `lowBetInsteadEstimate`; the CTA disabled, described by the callout |
| `short`, deposit only, `belowDepositMin` | low, no eyebrow | s4-5-low-min500, -zero | the deposit row and `lowMinNote` with the minimum and `leftAfter` |
| `short`, deposit only | low, no eyebrow | s4-5-low-zero | the deposit row |
| `short`, bet instead only, `rails_paused` | low, no eyebrow | s4-5-low-paused | `journey.sheetRailsPaused`, then bet instead |
| `short`, bet instead only, `deposit_limit` | low, no eyebrow | s4-5-low-limit | `journey.sheetDepositLimit` with D, then bet instead |
| `short`, no option, `sof_required` | low | s4-5-low-sof | `journey.sheetSofRequired` and "Jaza tamko" (→ `/profile/source-of-funds`, the gate's own address, wallet-service.ts:236) |
| `short`, bet instead only, `sof_required` | low, no eyebrow | (composed from the two boards above) | the SoF sentence, then bet instead |
| `short`, no option, `rails_paused` or `deposit_limit` | low | (composed) | the sentence alone |
| `short`, `deposit_max` | low | none drawn | `journey.sheetDepositMax`. Unreachable while every market's maximum stake is at most `DEPOSIT_MAX_TZS` (payout.ts:168: 1,000,000; validators.ts:91: 2,000,000); a per-market override could reach it |

The funnel counts `low_balance` with origin `sheet` once per open (Correction 6).

### Exactly once

1. **One key per intent.** The CTA's tap and the bet-instead tap each freeze a quote, `{ marketId, side, stake }`
   exactly as the tapped button prints it, and mint a key (`crypto.randomUUID()`, as the dial does at
   conviction-dial.tsx:838; use-quick-bet.ts:327-329's fallback where it is missing). There is no quote hold: the
   classic confirm's 10 s timer (`QUOTE_HOLD_MS`, bet-confirm-modal.tsx:40) is shelved for journey readers (SJ-10), and
   the quote a tap freezes is the stake itself.
2. **While placing,** the field, the chips and the CTA are locked; `aria-busy` is set; the scrim, Escape and the ✕ do
   nothing; Back puts the sheet's entry back (§3.3 :3535-3536). A second tap is swallowed; if one were ever sent it
   carries the same key, and the server answers the first bet (`findByIdempotencyKey`, market-service.ts:1366-1395).
3. **A retry reuses the key** after `system_busy` and `system_error` only (matrix rows 1–2), so a bet that landed before
   its answer was lost is answered by replay, never placed twice. Every other refusal ends the intent.
4. **Enter.** The sheet draws no `<form>`, so Enter in the stake box submits nothing, and no element of it reads a key
   (Open point 6). Enter on the focused CTA is its own click. A held Enter presses once, and a fresh press in the 400 ms
   after the sheet takes focus presses nothing (the key guard, CLAUDE.md:929-942; §0h point 59).
5. **A stale quote.** Unlike a sale (S6 A8c, §0h points 38-44), a bet's figure is an estimate, not the money (SJ-2):
   the request carries the stake alone, and no expected payout is sent or checked. A moved pool is told before the tap
   ("Makadirio yamesasishwa") and never blocks it (§3.3 :3528). A moved bound, a closed market and a short balance are
   the server's to refuse, and the matrix shows each.
6. **A deploy between the page and the tap** (matrix row 3): Next refuses the stale action before it runs, and the
   reload reopens the sheet at the tapped stake without placing it.
7. **Proof:** test:bet-sheet §3 (the key table, the frozen quote, the request builder's fields); the service's own
   replay proofs, unchanged (test:bet-retry, test:money-busy, test:concurrency); and the drive's four exactly-once cells
   (WP11 step 5), each counted on the player's positions and wallet rows.

---

## Work packages

### WP0 — The start line: S7 closed, today's reds, the records (S; depends on S7's close)

**Goal.** Start S8 on a closed S7, at a base whose citations are re-read, with today's reds named and the plan text
corrected before anyone builds from it.

**Files.**
- docs/VODACOM-PLAN.md:
  - §0 RESUME; a new §0k "S8 — the bet sheet and low balance (flagged)", the status home;
  - §1 S8 row to 🔨, with this file's link and Open point 2's done-when;
  - §3.2 :3474 and §5 S8 :3952-3954 (Correction 2);
  - the spec lines Corrections 4–7, 11, 12, 14, 16 and 26 name, annotated where they stand, never rewritten;
  - the §0h points for this plan's Open points.
- docs/design-system/v5-2026-09-29-simplified-journey/S8-PLAN.md: an amendment if the re-read changes a package.
- The session's memory file for the Vodacom plan.

**Steps.**
1. **Check the precondition on main; never assume it** (Open point 1):
   - S7 is closed: WP0–WP12 merged and live, its close record in §0j, and its §1 row as S7-PLAN Open point 2 words it.
   - Parity v3's last compare is recorded in §0j. WP1's VERSION 4 refuses a v3 baseline, as v3 refused v2
     (qa-classic-shell-parity.mjs:443).
   - S8 branches from origin/main at that close, in a worktree where `git status --porcelain -- src scripts docs
     package.json` is empty. It stages by path and reads `git diff --cached --stat` before every commit.
2. **Re-derive today's reds** under the heavy-job lock, detached and never piped:
   - `npm run test:all -- --serial --skip responsive,motion`;
   - `npm run test:red-anchors`;
   - the in-process twins S8 touches: red:journey-sheet, red:shortfall, red:pending-bet, red:journey-estimate,
     red:deposit-ceiling, red:enter-where-pressed, red:implicit-submit, red:failure-reasons, red:journey-shell,
     red:journey-home, red:simple-journey-flag, red:dal-parity.
   Record each red in §0k by its full label, read against S7's close record label by label (S7-PLAN A3 item 2).
3. **Re-read every citation in this file at the base.** Record what moved, changed or is gone. Anything that changes a
   package becomes an amendment here, as S7-PLAN A24 did.
4. **The docs commit** (one, rebased onto main last):
   - §1 S8 🔨; §0 RESUME names this file.
   - §3.2 :3474 becomes "`RefreshPoller 30s` in S7; the SSE `market-odds` patch for visible cards lands in S8,
     payload-free" (S7-PLAN A7 item 2).
   - §5 S8 gains A7 item 2's line (the card patch) and Open point 2's done-when. Gate names that have no package key yet
     are written without the `npm run` prefix (docs-links.mjs reads every top-level docs file).
   - The annotations ("S8-PLAN Correction n") on the spec lines above.
   - The §0h points: this plan's Open points, numbered after S7's last (76 on `origin/vodacom-s7-docs` `c0a9c826`;
     re-read).

**Gates.** test:docs; test:vodacom-plan (the S8 row 🔨, no ✅ before a commit).

**Served bytes for a classic viewer.** None.

**Done when.**
- The tree is clean at S7's close, and today's reds are named by label.
- Every citation is re-read, and any change is an amendment.
- §0k, §1, §3.2 and §5 are amended, and the §0h points are filed.

### WP1 — `qa:classic-shell-parity` v4: the question page's classic body, and S8's trace (M; depends on WP0)

**Goal.** Make the promise provable on the one page S8 re-lays. Parity v3 captures the shell's regions, the Sell region
and the BOOK's bodies: `/`, `/markets`, `/live`, `/results`, `/watchlist` and the similar rail
(qa-classic-shell-parity.mjs:443, :974, :1815). It never captures the question page's bet panel or content column. v4
does, in every classic state S8's ternaries stand beside.

**Files.**
- scripts/qa-classic-shell-parity.mjs (VERSION 4; a QUESTION phase; the trace's parts)
- docs/VODACOM-PLAN.md §0k (the baseline file and its base)

**Steps.**
1. **VERSION 3 → 4** (:443). `--compare` then refuses every v3 file, which is intended (WP0 step 1 records S7's last v3
   compare first).
2. **The QUESTION phase, after the BOOK,** through doors that already exist (no new dev-test route: test:cert-devroutes):
   - an open question with both pools (the BOOK's catalogue, seed-markets);
   - the same question as a holder (the Sell capture's `seedHolder`, :2026), at `?side=YES` (holding that side) and at
     `?side=NO` (the hedge warning, [id]/page.tsx:474-484);
   - a one-sided pool and an empty pool (the catalogue's questions with no pool, §0j :568);
   - selection closed (seed-watchlist's forced progress row); closed by time (fast-forward-market); settled
     (resolve-seed-markets);
   - a reader on a break: a second demo session (`scripts/live/journey-pass.mjs` `demoSession`, :82) that takes a
     cooling-off through `/profile/responsible-gambling`'s real form, captured last.
3. **Capture per cell** (guest and player; en and sw; 360 and 1280): the question page's `<main>` markup, boxes and
   computed styles. The bet panel (`aside[aria-labelledby="bet-panel-heading"]`, [id]/page.tsx:714) and the holder
   section (:993-1096) are fields of their own, so a difference names its region. The guest cells take the open,
   one-sided, closed and settled questions.
4. **The trace sees S8's names.**
   - `JOURNEY_CLASS_PARTS` (:908) gains `kp-bsheet`, `kp-jbet` and `kp-qghost`; P.8t (:2946-2955) is re-pinned in the
     open.
   - `RAW_TRACE` (:894) already reads any `journey-*` test id and `data-journey`; it gains `data-sheet`.
5. **`--prove-red` gains plants,** each reported where stated and nowhere else:
   - a class changed in the bet panel (the panel field only);
   - a `kp-jbet` element in a classic question body (a trace);
   - `data-sheet` on a classic card in the raw bytes (a trace);
   - a holder row's Sell label changed (the holder field only).
6. **Calibrate, one server at a time:**
   - `--prove-red` green; commit WP1;
   - capture `parity-v4-<sha8>.json` at WP1's commit on a fresh in-memory server;
   - a null `--compare` on a second fresh server exits 0.
   Normalise only what that null pair proves noisy (S7's calibrations: question ids, seeded dates, tied cards). After any
   rebase, capture again into a new file.

**Gates.** qa:classic-shell-parity in three modes (`--prove-red`, `--baseline`, a null `--compare`); test:orphans;
test:docs.

**Served bytes for a classic viewer.** None (scripts only).

**Done when.** v4's `--prove-red` catches every plant; the baseline at WP1's commit and a null compare on a fresh server
agree; §0k names the file and its base.

### WP2 — The pure core: the sheet's rules, the refusal matrix, the quote and its key (M; depends on WP0)

**Goal.** Put every decision the sheet makes into pure, client-safe modules, proven in process before any markup reads
them.

**Files.**
- src/lib/journey/sheet-state.ts (new, pure)
- src/lib/journey/sheet-refusal.ts (new, pure: the refusal matrix)
- src/lib/journey/shortfall.ts (edited): `DepositOption.leftAfter`
- src/lib/markets/estimate.ts (comment only, :32-33; Correction 20)
- scripts/bet-sheet.test.mts (new), plus package.json `test:bet-sheet` (joins predeploy) and `red:bet-sheet`
  (in-process)
- scripts/shortfall.test.mts (§5, `leftAfter`, with plants)

**Steps.**
1. **`sheet-state.ts`** — one total function per question the sheet asks. It imports only `estimate.ts`,
   `shortfall.ts`, `failure-reasons.ts` (types, `REASONS`, `reasonForCode`), `pending-bet.ts`, `funnel-beacon.ts`'s
   `funnelBetFields` and `quickStakes`/`parseStake` from `components/updown/stake-math.ts` (pure, :1-6):
   - `sheetChips(bounds, plan)` → `quickStakes(min, max)` (stake-math.ts:12-16): filtered to the bounds, never to the
     balance (SJ-10), less every chip above the loss room when the plan is `blocked loss_limit` (the panel's A3,
     VODACOM-PLAN.md:2624-2626). Labels are full figures, never `stakeChipLabel`'s "1K" (stake-math.ts:18-27).
   - `sheetEstimate(seed, side, stake)` → `estimateFor({ yesPool, noPool, rates, side, stake, bettable, bounds,
     productLine })`. The frame reads its `state`, `payout`, `multText`, `overCap`, `lean` and `emptySide`, nothing else.
   - `sheetStake(text, bounds)` → the stake (a whole positive number, `parseStake`, stake-math.ts:30-35) and the bound it
     breaks (below, above, not whole), for the bounds line (§0g :2545).
   - `sheetPlan(facts, seed, stake, nowMs)` → `shortfallPlan(…)`; `unknown` when the viewer's facts are null
     (shortfall.ts:187).
   - `sheetFrame(input)` → which frame draws (edit, low, loss room, pending, blocked with its reason, closed, placing,
     receipt) and the CTA: its label (`placeCta` with the amount, or `placeCtaBare`), whether it is enabled, and what
     describes it. The CTA reads "Weka dau" with no amount and is disabled when the stake is empty or out of bounds
     (§3.3 :3523), in the low, loss-room, pending and blocked frames, and while placing.
   - `estimateMoved(prev, next)` → true only when the stake is unchanged and the printed figure or multiple changed: the
     cue for "Makadirio yamesasishwa" (§3.3 :3528), never a keystroke's.
   - `closedAt(seed, nowMs)` → the sheet's own closed flip at `closesAt`, on the server-offset clock (§3.3 :3546; the
     dial's 200 ms tick, conviction-dial.tsx:232-249).
   - `quoteAt(frame)`, `nextKey(prior, outcome)` and `requestFor(quote, key)`: the rules of "Exactly once" items 1–3.
     The FormData holds `marketId`, `side`, `stake` as digits, `idempotencyKey` and `funnelBetFields(fd, "sheet")`'s
     three fields (funnel-beacon.ts:52-58), and nothing else.
   - `holderLine(heldSides, side)` → none, this side, the other side, or both (§3.3 :3552; s4-4-sheet-holder,
     s4-4-sheet-hedge).
2. **`sheet-refusal.ts`** — `refusalOutcome(result)` implements "The refusal matrix" row by row. It is keyed on
   `reason`, else on `code` through `reasonForCode` (failure-reasons.ts:540-543) and the codes the matrix names; it never
   reads `error`. Its output: `{ frame, line?, block?, retry: "same" | "new" | "none", reread: "public" | "viewer" |
   null, bounds? }`.
3. **`shortfall.ts`**: `DepositOption` gains `leftAfter = spendable + amount − stake` (s4-5-low-min500's "TZS 800
   zitabaki"), set on every deposit option. Every other output, and the header's step list, are unchanged.
4. **`estimate.ts`**: the comment at :32-33 states what each surface prints over the cap (the card `journey.cardOverCap`
   with no number; the sheet the TZS figure and `journey.estimatePillOver`). No code changes.
5. **test:bet-sheet §1–§6** (in process), each check with an in-memory plant in red:bet-sheet:
   - §1 the frames, on the deck's Dodoma pools (YES 24,825 / NO 50,462 at 13%; the §3.1 goldens, :3387): 1,000 → TZS
     2,700 ≈2.7×; 5,000 → TZS 12,360 ≈2.5×; a balance of 2,000 at a stake of 5,000 → "Una TZS 2,000. Unahitaji TZS 3,000
     zaidi.", a deposit of 3,000 and "bet 2,000 instead" at ≈ TZS 5,273 ≈2.6× (pick-3); and over the cap, a thin side,
     a legacy fee, the display switch off, an empty pool, an empty side and one side — each from `estimateFor`.
   - §2 the refusal matrix: every row as a golden (a result in, the outcome out), and the census of the source's
     `reason:` and `code:` literals on the player path (the matrix's closing note).
   - §3 exactly once: the key table (mint; reuse after busy and error; never after any other refusal; a double tap while
     placing reuses), the frozen quote (a stake edited after the tap is not sent), and the request builder (YES or NO
     only, a whole positive stake, never an `hb:` key).
   - §4 the plan's branches → frames ("The low-balance branches"), `leftAfter` included.
   - §5 the closed flip across `closesAt` with a skewed phone clock; "Makadirio yamesasishwa" on a pool change and never
     on a keystroke.
   - §6 the source: the two modules import only the modules named above; no `%`, no `×` figure and no TZS amount is
     typed; no clock read but the caller's; both are client-safe.

**Gates.** test:bet-sheet + red:bet-sheet (new); test:shortfall + red:shortfall; test:journey-estimate (unchanged);
test:failure-reasons (no reason added); test:client-graph-safe (the two modules); test:rate-copy; typecheck.

**Served bytes for a classic viewer.** None (nothing mounted).

**Done when.** The two modules exist; test:bet-sheet and its twin are green; `leftAfter` is proven with its plant.

### WP3 — The server reads: the viewer's facts with no write, the pending deposit, the card's seed (M; depends on WP2)

**Goal.** Serve the sheet every fact `shortfallPlan` asks, from the gates' own reads and without a side effect. And give
the card the sheet's public half, so the sheet draws on the tap frame (§3.3 :3508).

**Files.**
- src/lib/server/journey-sheet.ts (edited):
  - `sheetPublicFrom(m, bounds, nowMs)`: pure assembly, extracted from `sheetPublic` (:94-116), which then calls it with
    identical output;
  - `sheetSeedFor(m, nowMs)`: async, `stakeBoundsForMarket` (market-service.ts:994-1003) then `sheetPublicFrom`;
  - `sheetForUser` (:119-136) gains `facts` (every `ShortfallInput` field but the stake, the market and its bounds) and
    `bonusWager`, and drops `bonusWarning` (Open point 21).
- src/lib/server/responsible-gambling.ts (edited):
  - `sessionStandingOf(row, playStartedAt, nowMs)`: pure, the arithmetic of `checkSessionTimeLimit` (:498-526), which
    then calls it before its own write, unchanged in output and in write;
  - `readSessionStanding(userId, playStartedAt)`: the same answer, and it never writes.
- src/lib/server/store.ts and src/lib/server/prisma-dal.ts: `txn.newestProcessingDeposit(userId)` in both twins (Open
  point 10).
- src/app/api/markets/[id]/sheet/route.ts (edited): `?me=1` passes `session.playStartedAt` and the sheet's `?side=`
  (route.ts:33-40).
- scripts/journey-sheet.test.mts (§6–§8 with plants); scripts/deposit-ceiling.test.mts (the facts equal the gates);
  scripts/rg-doors.test.mts (the standing equals the gate's verdict and writes nothing); scripts/dal-parity.test.mts
  (the new read).

**Steps.**
1. **The facts** (one `Promise.all`; any read that fails makes `facts` null, which is unknown and never zero,
   shortfall.ts:18-19):
   - `maintenance`: `isMaintenanceMode()` (platform-config.ts:110), the bet path's own (market-service.ts:1167);
   - `lockout`: `isLockedOut(userId)` (responsible-gambling.ts:403-414), as `{ kind, until }`;
   - `session`: `readSessionStanding(userId, playStartedAt)`, the gate's arithmetic with no `touchPlayClock` (the write
     at :516-522 is the gate's alone);
   - `account`: the user's status and the cooling-off end (the bet path's own test, market-service.ts:1281-1284);
   - `wallet`: status, balance and bonus (`db.wallet.findByUserId`, as journey-sheet.ts:121-124 reads it);
   - `loss`: `dailyLossLimit` from `getRgSettings` (:64) and `lossToday` from `getLimitUsage` (:617-631), the very sums
     `checkLossLimit` computes (:579-597);
   - `pendingDeposit`: `db.txn.newestProcessingDeposit(userId)` → `{ amount, txnId }` or null;
   - `deposit.limits` and `deposit.usage`: the three windows from `getRgSettings` and `getLimitUsage`, counting
     PROCESSING deposits as the gate does (:608-616);
   - `deposit.sof`: `{ accepted, singleTxn: SOF_SINGLE_TXN_TZS, rolling30d: SOF_ROLLING_30D_TZS }` (wallet-service.ts:63-64;
     the declaration's status read as the gate reads it, :210-213);
   - `deposit.railsOpen` and `railNames`: the `MOBILE_MONEY_METHODS` (payment-providers.ts:109) that `getKillSwitches()`
     does not pause for deposits (payment-ops.ts:141-146), in chooser order (Open point 36).
2. **`bonusWager`** is the market page's B2: when the viewer holds the side opposite the sheet's and `getBonusSummary`
   reports an active grant with wagering left, `{ remaining }`; otherwise null; a failed read is null
   ([id]/page.tsx:497-519).
3. **`newestProcessingDeposit`** is the newest DEPOSIT row in PROCESSING for the user: a filter over the user's rows in
   memory, one `findFirst` ordered by `createdAt` descending in Prisma. `test:dal-parity` holds the twins equal.
4. **The seed.** `sheetSeedFor(m, nowMs)` returns `{ v: 1, id, yesPool, noPool, rates, feePct, min, max, closesAt,
   serverNow, bettable }`: `sheetPublicFrom`'s fields without `estimates`, which the sheet computes from the same rates.
   It is null where `sheetPublic` is null: an Up & Down round or a market that is not LIVE (journey-sheet.ts:95-97).
   The route still serves `sheetPublic`, unchanged in output, so a card, the sheet and the API cannot disagree (S7 WP3
   step 5's rule, journey-sheet.ts:12-14).
5. **The route** keeps its cache rules (route.ts:23-25): the public half `public, s-maxage=5`; `?me=1` adds
   `me = { spendable, balance, bonusBalance, heldSides, bonusWager, facts }` as `private, no-store`, and 401 without a
   session.

**Gates.**
- test:journey-sheet + red:journey-sheet:
  - §6 the facts on the memory store, each equal to the gate it mirrors: a lockout, a session over its limit, a held
    wallet, a loss limit with losses, a PROCESSING deposit, a deposit limit, an unaccepted declaration, a rail paused;
  - §7 `sheetPublic` unchanged after the extraction, and the seed equal to it;
  - §8 the route: `me` is private, and the public half names no viewer.
  Plants: a fact read from the wrong row; `checkSessionTimeLimit` called from the read; the pending read ignoring status.
- test:deposit-ceiling + red:deposit-ceiling: the facts drive `depositCeilingFor` and `lossHeadroomFor` to the REAL
  `deposit()` and `checkLossLimit` verdicts (its own method, shortfall.ts:16).
- test:rg-doors: `readSessionStanding` gives `checkSessionTimeLimit`'s verdict on every session case and writes neither
  `playStartedAt` nor `playLastSeenAt`; `checkSessionTimeLimit` is unchanged.
- test:dal-parity + red:dal-parity; test:client-graph-safe (journey-sheet.ts stays server-only); test:cert-d3 (the SoF
  thresholds stay in wallet-service.ts); typecheck.

**Served bytes for a classic viewer.** None. Nothing a classic page draws reads the route.

**Done when.** The facts are proven equal to the gates with no write; the seed equals the public half; the twins are
green.

### WP4 — S8's words (S; depends on WP2)

**Goal.** Every word the sheet, the low-balance frames, the break and the question page show comes from a key. No
existing value changes before S15 (§3.9 :3756-3757).

**Files.**
- src/lib/i18n-dict.ts: the journey namespace (en :2987-3144, sw :5467-5568, zh :7871-7972 at the base).
- docs/VODACOM-PLAN.md §3: the S8 rows marked built; an "S8 keys" note with the drafts table (as S7's, :3011-3033).
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md: "S8 drafts", and "Swahili review" 7, signed;
  the loss-limit correction's "saa 00:00" withdrawn (Correction 14).
- docs/design-system/v5-2026-09-29-simplified-journey/INHERIT-MANIFEST.md: L6 annotated (Correction 16).

**Steps.**
1. Add the keys in "New dictionary keys" below. sw comes from, in this order:
   - the §3 table, verbatim, where a row exists (:2963-2977);
   - the approved canvas word where one is drawn (S4-COPY-AUDIT.md:260-273);
   - the corrected live word review 2 approved (:92-126, :255-258), as a journey copy;
   - otherwise an S8 draft, for review 7.
   en follows the deck's English (SJ-21). zh is drafted: formal 您, 充值, 投注.
2. **Reuse, never copy** (the list under "New dictionary keys"). Never edit an existing value.
3. **No helpline key** (Correction 15).

**Gates.** test:i18n (parity; sw≠en, with an IDENTICAL_OK reason for `multOnly`; placeholder parity);
test:translation-safety; test:rate-copy (no literal N% or N×: `{pct}`, `{mult}` and `{cap}` only); test:labels (NDIO);
test:support-contact (§15, no helpline); test:docs. test:house-bot-disclosure 5.1 goes red by construction on any
dictionary change (S6-PLAN.md:124): re-derive it and record it.

**Served bytes for a classic viewer.** No visible word changes. The dictionary rides in the client bundle (`useT`), so
every page's JS grows by these keys (S7 WP4's record).

**Done when.** The keys exist in en, sw and zh; review 7 is signed in S4-COPY-AUDIT; §3, S4-COPY-AUDIT and
INHERIT-MANIFEST agree.

### WP5 — The kit additions: `Input` `grouped` and `attention`, and the sheet's own disabled gold (S; depends on WP1)

**Goal.** Build the two `Input` states §2 designed (:3348; the S4 design call 2, :2452-2454) as additive props, and the
navy disabled gold (design call 4, :2459-2461), scoped to the sheet (Open points 19 and 20).

**Files.**
- src/components/ui/input.tsx:
  - `grouped`: thousands separators while typing, a caret that stays where it was, the numeric keypad, a 9-digit cap;
  - `attention`: a strong neutral border; the caller's `aria-describedby`; never `error`, gold or NO ink.
- src/app/globals.css:
  - the token `--input-attention: oklch(78% 0.06 268)` (§0g :2454), declared with its family;
  - `.kp-bsheet .btn-gold:disabled`: the navy fill `oklch(28% 0.12 268)`, `--text-subtle` words, a 1px `--border`
    edge (:2459-2461). Never a bare `.btn-gold:disabled` (`.btn:disabled`, globals.css:1214, stays as it is).
- scripts/numeric.test.mts (grouped cases); scripts/contrast-audit.mts (two pairs) and red:contrast's plants.

**Steps.**
1. `grouped` shows the value through `formatNumber` (already imported, input.tsx:43) and keeps the field's value as
   digits. The caret maps by digit index across a regrouping. A paste follows `numericStep`'s rules unchanged
   (input.tsx:20-31, :190-230). Without the prop, every path is byte-identical.
2. `attention` sets the border token and `aria-invalid="false"`: it is not an error. Without it nothing changes.
3. test:numeric drives the grouped box key by key:
   - "5000" shows "5,000" with the caret after the last digit;
   - a digit typed inside a group lands where it was typed;
   - a pasted "12,500" keeps 12500, and nine digits is the cap;
   - an ungrouped box answers exactly as before (the control).
4. test:contrast gains two pairs, each with a red:contrast plant: the attention border on `--bg-inset` (non-text, 3.0),
   and the disabled gold's words on its navy fill (text, 4.5).

**Gates.** test:numeric; test:contrast + red:contrast (temp-copy: alone, detached); test:tokens; test:design-frozen;
test:ui-consistency; test:gold-is-money; test:betting-ink; qa:classic-shell-parity v4 `--compare` (the classic Inputs on
the deposit and withdraw pages are in its cells).

**Served bytes for a classic viewer.** JS: the Input chunk, on the pages that draw it; output unchanged. CSS: one token
and one scoped rule. Recorded in §0k.

**Done when.** Both props are proven inert when unset and right when set; parity v4 shows 0 differences.

### WP6 — The sheet: every frame, mounted nowhere (L; depends on WP3, WP4, WP5)

**Goal.** Build frames 2 and 3 and every undrawn state the canvas drew, in the kit's atoms, as one client component the
host (WP7) opens. It reads its figures only through WP2 and its facts only through WP3.

**Files.**
- src/components/journey/bet-sheet/bet-sheet.tsx (new, "use client"): the frame.
- src/components/journey/bet-sheet/sheet-parts.tsx (new, "use client"): the estimate box, the compact row, the low
  block, the block view, the receipt.
- src/app/globals.css: `.kp-bsheet*`.
- docs/design-system/v2-2026-07-27/02-components/: the sheet's spec and its CHANGELOG line, effective at the flip (B9's
  rule, as S7 WP5 did for the card).
- scripts/bet-sheet.test.mts §7–§9; scripts/popup-fit.test.mts (REVIEWED gains the sheet);
  scripts/enter-where-pressed.test.mts (2.2s, 5.10's list); scripts/market-result-announce.test.mts (its DIAL becomes a
  list: [dial, sheet], §4 :3813).

**Steps.**
1. **The frame** — the kit's sheet, as S7's How-to sheet uses it (how-to-play-sheet.tsx:12-17 on
   `origin/vodacom-s7-wp6`):
   - `<Modal sheet sheetUntil="lg" maxWidth={440} labelledBy={titleId} panelClassName="kp-wsheet kp-bsheet"
     initialFocus={headingRef} safeFocus={closeRef}>` (modal.tsx:209-282), on the default rung (100),
     `data-testid="journey-bet-sheet"`;
   - the grab handle below 1024 (`.kp-wsheet__grab`, globals.css:6627), with no drag (Open point 18);
   - while placing: `closeOnScrim={false}`, `closeOnEsc={false}`, the ✕ withheld and `ariaBusy` set
     (modal.tsx:225-237, :252-254);
   - the heading (`tabIndex={-1}`) takes first focus (Open point 5); the ✕ is the way out;
   - the Needle (z 45) and the chat bubble (z 60), which stay on `/live`, `/results` and `/watchlist` (S7-PLAN Open point
     11), sit under the dialog rung (install-invite.tsx:231-232 names both rungs) and take no key behind it.
2. **The order** (deck frame 2, §3.3 :3513-3520):
   1. the chosen chip, `Chip variant="yes"|"no"` with `journey.sheetChosen` and `sideWord` (§2 :3347), and the kit ✕.
      The chip is display only: the side is locked and there is no switch (SJ-10; CLAUDE.md:908-927's invariant);
   2. the question: the reader's short title, else the full one (`cardTitle`, as the card does), an h2;
   3. the holder or hedge line when the viewer holds a side here (`sheetHolds` and its body), in the warning box the
      market page uses ([id]/page.tsx:738-771), with the bonus-wager line under it when `bonusWager` is set (SJ-22);
   4. "Dau lako" and the stake: the kit `Input size="lg" grouped prefix="TZS" inputMode="numeric"
      enterKeyHint="done"`, labelled `journey.stakeLabel`; `attention` in the low, loss-room and pending frames;
   5. the bounds line under it when the stake breaks a bound, in the warning family (§3.3 :3524);
   6. the chips (`sheetChips`), full figures, the chosen one in the 2A royal ring (`--pill-active` with a `--brand-400`
      ring, §0g item 8, :2471). A tap SETS the stake (SJ-10);
   7. the estimate box (§2 :3350): `--bg-inset` and `--border`; `journey.estimateLead`; the figure "≈ TZS X" in
      `.amount` (mono, `--text`; never gold, green or a side ink), the box's largest number; the pill
      `journey.estimatePill` (or `estimatePillOver` over the cap); then `journey.estimateNote` with `{pct}` = `feePct`.
      By state:
      - `invalidStake` → "TZS —" and no pill (s4-4-sheet-below-min);
      - `emptyPool` → `market.noBetsYet`, `sheetEmptyPoolBody` and `sheetRefundRule` (s4-4-sheet-empty-pool);
      - `oneSidedRefund` → `market.oneSideOnly` and `market.oneSidedNote`, naming the empty side (s4-4-sheet-one-sided);
      - `fillsEmptySide` → the figure and `sheetFirstOnSide` (s4-4-sheet-empty-side);
      - `hidden` → `journey.ticketPayout` and `sheetLegacyBody`, and on a capped-commission market only
        `sheetLegacyFee` with `{pct}` from the market's frozen commission rate (s4-4-sheet-legacy);
      - a thin side (`lean === "thin"`) → the figure and `market.crowdedWarning` (s4-4-sheet-thin);
      - "Makadirio yamesasishwa" (`estimateUpdated`) above the box when `estimateMoved` (s4-4-sheet-updated);
   8. the balance row: `journey.balanceRow` and the spendable figure through `<Cash>` (the hide-balance preference), or
      "—" with `common.temporarilyUnavailable` when unknown (s4-4-sheet-unknown-balance);
   9. the CTA: a kit `Button` in `.btn-gold`, `type="button"`, full width, labelled by `sheetFrame`. A bet commit keeps
      gold (§M3a; DESIGN_AUTHORITY.md:2648).
3. **The keyboard** (s4-4-sheet-keyboard-360; §0g :2548): while the stake field has focus on a phone and the visual
   viewport is shorter than the window, the box collapses to the compact row (`estimateCompact` and `multOnly`) over
   `estimateNoteCompact`, the chips step aside, and the panel lifts by `innerHeight − visualViewport.height −
   visualViewport.offsetTop` (§3.3 :3557; Open point 17), read on the viewport's `resize` and `scroll` (the Needle's
   pattern, needle.tsx:889-891).
4. **The low frame** (deck frame 3, §3.4 :3578-3590):
   - the chip and the question; the stake in `attention`; the compact row at that stake;
   - the info callout (`Callout tone="info"` with `alertCircle`, §2 :3352) holding `lowTitle` and `lowBody`;
   - the eyebrow `lowChoose`, a microlabel uppercased by CSS for Latin script only, when two options show (§0g :2563);
   - the deposit row in `gilt-metal` (SJ-12): "Weka pesa {D}" over the open rails' names, each name `nowrap` so a break
     falls between wallets (§0g :2464-2466), then "›"; `lowMinNote` with `leftAfter` when `belowDepositMin`;
   - "Weka dau la {amount} badala yake" (`btn-outline`) over `lowBetInsteadEstimate` at that stake (the panel's A1,
     :2622-2623);
   - the disabled CTA naming the stake, `aria-describedby` → the callout.
5. **The other frames:**
   - the loss room (s4-4-sheet-loss-room) and pending (s4-5-low-pending; Open point 24);
   - the blocks (s4-4-block-*): the title by reason, the reason's sentence, "Weka mipaka" or "Wasiliana na msaada" as the
     matrix says, and "Sawa" — no helpline;
   - closed (s4-4-sheet-closed): `sheetClosedTitle`, `sheetClosedBody`, "Sawa";
   - placing (s4-4-sheet-placing): the CTA `dialog.placing` and the status `sheetPlacing`; the field, the chips and the
     CTA locked;
   - the inline refusal line (s4-4-inline-refusals), in the sheet's last rows, above the CTA.
6. **The receipt** (s4-4-sheet-receipt; §3.3 :3566-3567): `common.betPlacedEyebrow`; the side chip and the stake; the
   question; `common.ticket` with the server's `positionId`; the stake; `journey.ticketPayout` ·
   `journey.ticketPayoutAtResult` (no payout figure, SJ-4); `common.goodLuck`; "Endelea kucheza"
   (`market.udRcKeepPlaying`), which closes in place; "Tiketi zangu" (`journey.tabTickets`) to
   `positionPermalinkHref(positionId)` (position-permalink.ts:89; Open point 34). It closes itself at the shared 5 s
   unless it is being read (CLAUDE.md:694).
7. **One polite live region** (§3.3 :3563), written on entering the low, loss-room, pending or blocked frame, on
   "Makadirio yamesasishwa" (`estimateUpdatedLive`), on a refusal line and on the receipt; never per keystroke.
8. **No form and no key handler.** The sheet's files draw no `<form>` and no `type="submit"`, and no element carries
   `onKeyDown`, `onKeyUp` or `onKeyPress` (test:enter-where-pressed 2.6 forbids them in a file that draws a dialog,
   :934; Open point 6).
9. **Motion and targets** are the kit's: the sheet fades under reduced motion, with no press-pop; every target is at
   least 44px.

**Gates.**
- test:bet-sheet + red:bet-sheet:
  - §7 the frame's order per state, rendered in a test world in sw, en and zh, every printed figure equal to WP2's;
  - §8 no form, no key prop, no literal amount, the CTA `type="button"`, `<Cash>` on the balance;
  - §9 the tokens: the box `--bg-inset`, the figure `.amount` in `--text`, the CTA `.btn-gold`, the deposit row
    `gilt-metal`, the callout `info`.
- test:enter-where-pressed + red:enter-where-pressed: 2.2s, the sheet opens on its heading (no control), and its CTA's
  click IS the act; 5.10, its way out is the ✕; 2.6 over its files.
- test:implicit-submit (its census finds no form here); test:popup-fit (REVIEWED gains the sheet with its note);
  test:stacking (the default rung); test:market-result-announce (the sheet writes only the watch list
  `50pick-notify-markets`, never a payout figure: conviction-dial.tsx:1111-1118's rule); test:feedback-law;
  test:betting-ink (side ink on the chip only); test:gold-is-money (gold on the bet commit and the deposit entry only);
  test:contrast; test:design-frozen; test:ui-consistency (the kit Button, never a raw `btn` button); test:type-scale;
  test:tokens; test:rate-copy; test:i18n; test:hooks-order; test:client-graph-safe.

**Served bytes for a classic viewer.** None (nothing mounts it). CSS: `.kp-bsheet*`.

**Done when.** Every frame renders in a test world in three languages; §7–§9 and the Enter twins are green.

### WP7 — The host and its mount: taps, the address, deep links, refreshes, deploy skew (M; depends on WP6)

**Goal.** Open the sheet in place from every journey pick, keep its state in the address, refresh it as §3.3 asks, and
land every outcome. Classic readers never fetch any of it.

**Files.**
- src/components/journey/bet-sheet/bet-sheet-host.tsx (new, "use client"): `BetSheetHost`.
- src/components/layout/shell-lazy.tsx: `LazyBetSheetHost`, one loader line ending in `nothingIfLost`.
- src/components/layout/app-shell.tsx: one line after the Sell host (:586).
- src/components/journey/cards/journey-card.tsx (S7 WP5's): `data-sheet` on the article and `data-bet-side` on each
  pick, on an open card only; the page hands the seed.
- the pages that draw open journey cards (S7 WP7's home; WP10's `/live`, `/watchlist` and the similar rail): one
  `sheetSeedFor` per open card, inside the reads they already batch.
- src/components/ui/pull-to-refresh.tsx: its `touchstart` (:31-35) returns when the touch starts inside
  `[data-ptr-skip]`, which only the sheet's panel carries (Open point 16).
- src/app/legal/privacy/page.tsx (§7 `kp-pending-bet` in en, sw and zh; the version and its hash),
  docs/COMPLIANCE-DECISIONS.md (the dated Privacy entry), scripts/privacy-notice.test.mts (§4i): Open point 13.
- scripts/journey-shell.test.mts (§12's parts table, with plants); scripts/journey-home.test.mts (§4, the card's
  attributes); scripts/deploy-skew.test.mts (§5); scripts/bet-sheet.test.mts (§10).

**Steps.**
1. **The mount.** `{journeyShown && session && <Suspense fallback={null}><LazyBetSheetHost /></Suspense>}` after the
   Sell host, in AppShell's own idiom (:576-586). For a classic request it is a `false` slot (S6 WP7's precedent). The
   part renders on the server for a journey request, so next/dynamic names its chunk in the head (shell-lazy.tsx:7-13):
   the chunk arrives with the page, which is §3.3's "preloaded at idle" (:3509).
2. **A tap.** One `click` listener on `window` in the capture phase, so it runs before NavProgress's document listener
   (nav-progress.tsx:103-128) and before Next's Link (node_modules/next/dist/client/app-dir/link.js:319):
   - for an unmodified primary click on `a[data-bet-side]` inside an element carrying `data-sheet`, it calls
     `preventDefault()`. NavProgress then starts no bar (nav-progress.tsx:109) and the Link does not navigate
     (link.js:319-321);
   - it replays `.press-pop` on the anchor (globals.css:3036-3041; §3.2 :3483) and opens the sheet from the parsed seed
     on the same frame;
   - a seed that does not parse, an Up & Down card, or a card that is not `bettable` leaves the click alone: the link
     goes where it goes today.
3. **The address** (§3.2 :3484; Open point 13):
   - opening pushes the current address plus `bet=<id>.<side>` (`formatBetParam`, pending-bet.ts:58-60), keeping `cat`,
     `q` and `page`;
   - at the CTA's or the deposit row's tap, before the request, it replaces the address with
     `bet=<id>.<side>.<stake>` and writes the marker (`writeMarker`, :117-120, under `PENDING_BET_KEY`, :31). A reload
     then reopens at that stake (`stakeFromUrl`, :150-154) and never places it;
   - Back (a popstate without `bet`) closes the sheet, except while placing, when the host pushes the entry back;
   - closing pops the entry it pushed (`history.back()`), or replaces the address without `bet` when the page was
     loaded with it.
4. **Opening from the address,** on mount and on popstate, through `pendingBetFrom(path, search)` (:66-76):
   - a market bet opens from the card's seed when one is on the page, else after one read of
     `/api/markets/<id>/sheet?me=1&side=…`; a 404 strips `bet` and opens nothing;
   - a round bet (`udr_…`) is left to S12;
   - `?side=` opens preset at the minimum on a question page only (pending-bet.ts:71-75).
5. **Refreshing** (§3.3 :3527):
   - the public half: on open, every 10 s while the document is visible, on `50pick:sse:market-odds` for this market
     (at most once in 2 s), and on focus;
   - the viewer's half: on open, on `50pick:sse:wallet-balance` (the event `useLiveBalance` reads,
     wallet-balance-pill.tsx:56-67; it carries the cash balance, so spendable = it + `bonusBalance`), on focus, and on
     entering the low frame (Open point 9);
   - a failed read keeps the last good figures (shortfall.ts:18-19).
6. **Placing** follows the matrix and "Exactly once". The host holds the quote, the key and `spentSinceTruth`, the
   optimistic deduction (§3.3 :3551; stake-math.ts:56-63's rule), until a balance read lands. On success:
   - the receipt;
   - `50pick:refresh` and `50pick:refresh-notifications` (conviction-dial.tsx:1076, :1123);
   - the watch-list write (:1111-1118);
   - the bet's funnel count is the server's (markets/actions.ts:104-106).
7. **Deploy skew** (Open point 14). The request's catch tells Next's `UnrecognizedActionError` (raised at
   node_modules/next/dist/client/components/router-reducer/reducers/server-action-reducer.js:76-78; recognised by
   `unstable_isUnrecognizedActionError`, navigation.js:57-58; the contacts import's precedent, import-loop.ts:81-87)
   from every other throw:
   - on that error, after the address and the marker are written, the host reloads the page itself, once per build, per
     tab and per path, under RouteError's own key and rule (`kp:recovered:<path>` against `NEXT_DEPLOYMENT_ID`,
     route-error.tsx:129-140), so the two can never reload one tab twice for one build. The reload reopens the sheet;
     nothing is placed;
   - it does not rethrow: the host sits in the root layout, outside every route's error boundary, so a thrown error
     would reach global-error's critical screen (shell-lazy.tsx:27-30 records the same hazard), which does not reload;
   - every other throw is `system_error` (matrix row 2).
8. **The host's own error boundary.** The sheet renders inside a small boundary of the host's: a render error closes
   the sheet, sends one report to `/api/client-error` (the body the shell's guard sends, shell-lazy.tsx:57-79), and
   leaves the page up. A render never places a bet, so nothing is lost but the open sheet.
9. **The funnel** (Correction 6): `sendFunnel("sheet_open", origin)` once per open — `home` from a home card, `card` from
   any other card, `market` from the big buttons, `board` from an address (`home` when it carries `from=home`, the S3b
   rule at side-picker.tsx:60-68); `sendFunnel("low_balance", "sheet")` once per open (§3.4 :3594).
10. **Pull-to-refresh:** the panel carries `data-ptr-skip`.
11. **Privacy §7** names `kp-pending-bet` in this commit (§3.10 :3800-3801): sessionStorage, at most 24 hours, the bet a
    link names and the attribution it arrived with (pending-bet.ts:14-17, :86-94), in en, sw and zh, with the version,
    its hash and a COMPLIANCE entry.

**Gates.**
- test:bet-sheet §10 + red: the window-capture listener; the seed parse; the address rules; the marker written only at a
  tap; popstate while placing; the skew reload under RouteError's key and only on that error; no rethrow out of the host;
  the sheet inside the host's boundary (plants: the boundary removed; the skew test widened to every error; a rethrow).
- test:journey-shell §12 + red:journey-shell: the parts table gains `LazyBetSheetHost` (12.parts.table,
  12.parts.client), mounted only behind `journeyShown && session`; the `next/dynamic` census is unchanged (S7-PLAN A13's
  12.dynamic.census).
- test:simple-journey-flag (10.shell.*: AppShell's new line reads the one answer); test:journey-home §4 + red (the
  card's attributes: on an open card only, the seed equal to `sheetSeedFor`); test:deploy-skew §5 (the host's skew rule simulated beside
  §3's, equal to RouteError's — the same key, the same build test, once only — with the marker written before the
  request); test:privacy-notice §4i with its control (the key, its
  lifetime and the version pin); test:stacking (ROOT_MOUNTS); test:hooks-order; test:client-graph-safe; test:dead-css.
- qa:classic-shell-parity v4 `--compare`: 0 differences. qa:served-skeleton `--main`: a null pair, then `/`, `/live` and
  a question page, signed out and signed in.

**Served bytes for a classic viewer.**
- RSC: one `false` slot in AppShell's children.
- JS: shell-lazy's chunk (one export) and PullToRefresh's (one clause), on every page; output unchanged.
- The privacy page's §7 text and version.
- HTML elsewhere: none. The card's attributes are the journey card's.

**Done when.** A pass holder's tap on any open journey card opens the sheet in place; the address, Back, a reload and a
deep link behave as above; classic readers show 0 differences.

### WP8 — The question page for a journey reader: two big buttons, the holder's journey look, its loading picture (M; depends on WP7, WP1; S7 WP10)

**Goal.** §3.2's market page for a journey reader (:3497-3503), as the S4 board draws it: everything the page keeps, the
holder's tickets in the journey look, and the two big buttons after them, opening the sheet in place. `?side=` opens it
preset. Classic readers keep today's page.

**Files.**
- src/app/markets/[id]/page.tsx (edited, using S7 WP10's resolver answer):
  - the bet panel's signed-in arm (:726-791) becomes `journey ? <the D40 heading and the one-sided callout> : today's arm`;
  - the holder section (:993-1096) becomes `journey ? <JourneyHolder …/> : today's section`;
  - each else arm is today's text, not re-indented.
- src/components/journey/question/journey-bet-buttons.tsx (new, server): the two big buttons.
- src/components/journey/question/journey-holder.tsx (new, server): the holder block in the journey look.
- src/app/markets/[id]/loading.tsx (edited) and src/app/markets/[id]/market-detail-ghost.tsx (new: today's drawing,
  verbatim).
- src/app/markets/loading.tsx (edited) and src/app/markets/markets-ghost.tsx (new: today's drawing, verbatim).
- src/components/journey/route-ghost.tsx: the question pattern (:109) draws the journey question ghost; the pinned pages
  (`JourneyGhostPage`, :92) gain the question.
- src/app/globals.css: `.kp-jbet*`, `.kp-qghost*`.
- docs/SHELVED.md: rows in its six columns (S7-PLAN A18's rule).
- scripts/journey-home.test.mts §10; scripts/journey-tickets.test.mts §12 and scripts/sell-grace-truth.test.mts §3 (a
  third journey host, re-pinned in the open); scripts/visual-pass-r4j.test.mts §3 (route-ghost's question entry).

**Steps.**
1. **Ask once.** The page reads S7 WP10's `journey` answer; nothing else asks.
2. **The bet panel, signed in, for a journey reader:** the D40 heading (:734) and the one-sided callout (:735) only. The
   break arm (:716-725) and the guest arm (:792-856) are untouched for every reader: the break notice stands in the
   buttons' place (R6-A), and the guest panel stays until S10.
3. **The holder block, for a journey reader** (s4-10-market.dc.html, "Tiketi zako"; Open point 28):
   - the section's own reads (:993-1096), with `journey.ticketsHere` as its heading;
   - each open position's `SellButton` in `look="journey"` (sell-button.tsx:34-35), the S6 WP10 look Tiketi zangu
     already draws (ticket-card.tsx:150), with every prop as today's row passes it (:1076-1090). The A8b–A8h rules
     travel with the button, which both looks share (sell-button.tsx:21-54);
   - settled rows read as today.
4. **The two big buttons** (`JourneyBetButtons`, s4-10-market.dc.html:73-77; Open point 26):
   - after the holder block, or where it stands when the reader holds nothing;
   - only when the panel would take a bet: `bettingOpen && session && !breakBody` (:354, :716);
   - two `<a href="/markets/<id>?side=YES|NO" data-bet-side>` in `btn-yes` and `btn-no`, at least 64px tall, the side
     word on the 20px rung (`--type-h3`, globals.css:234), inside an element carrying `sheetSeedFor(m)` as `data-sheet`,
     `data-testid="journey-bet-buttons"`;
   - before hydration a tap loads `?side=`, which opens the sheet preset at the minimum.
5. **`?side=` on arrival** opens the sheet preset at the minimum stake (WP7 step 4). The Up & Down translation
   (:181-193) is untouched.
6. **The loading picture** (Open point 27):
   - `[id]/loading.tsx` takes `positions/loading.tsx`'s pattern (positions/loading.tsx:10-24; §0h point 21, :1851): a
     lone `resolveSimpleJourney()`; the journey arm `<LazyJourneyRouteGhost rails={[]} at=…>` pinned to the question;
     the classic arm `<MarketDetailGhost />`, today's drawing moved verbatim and still client code (its note, :6-12).
   - `markets/loading.tsx` the same, with S7-PLAN A19 item 4's guard (:2078-2085): the journey arm only when `x-pathname`
     (proxy.ts:253) is a question (`^/markets/[^/]+$`); every other path gets `<MarketsGhost />`, today's drawing
     verbatim.
   - route-ghost.tsx's journey question ghost (`.kp-qghost`): the page's header bands, the content column, the holder
     block's height, then the buttons' 64px row, measured against the landed page in WP11.
7. **SHELVED rows**, in the same commit, in the six columns:
   - the dial path on the question page, for journey viewers only: `SidePicker`, `ConvictionDial`, `BetConfirmModal`,
     `HouseLeanWarning` and `lib/dial-stake.ts` (§4 :3813), unmounted for a journey request by the ternary; re-mount by
     rendering the else arm for every request; tests: test:dial-stake, test:enter-where-pressed (2.2's bet confirm),
     test:feedback-law;
   - the question page's classic holder look, for journey viewers only; test: test:sell-grace-truth.

**Gates.**
- test:journey-home §10 + red:journey-home: the resolver asked once; each journey arm before its else arm, which is
  today's text; the buttons only when the panel takes a bet; their hrefs and seed; no `SidePicker` in a journey arm; the
  loading files' arms, with A19 item 4's five plants (the condition inverted; the journey return unconditional; the
  resolver not asked; a classic block lost; the path clause dropped).
- test:journey-tickets §12 + red and test:sell-grace-truth §3 + red: the third journey host, re-pinned in the open.
- test:visual-pass-r4j §3 (route-ghost's question entry); test:visual-pass-r5d §2 (the ghosts render on React's server
  renderer in every language).
- test:timer-date (the two Countdowns, :978 and :988, untouched); test:red-anchors (the question page's anchors resolve
  exactly once); test:measure; test:betting-ink; test:product-line; test:stacking.
- qa:classic-shell-parity v4 `--compare` (the QUESTION phase): 0 differences. qa:served-skeleton `--main` on a question
  page, signed out and signed in, and on a hop's loading picture: only the named module references differ.

**Served bytes for a classic viewer.**
- HTML: none.
- RSC: the question page's and the markets segment's loading boundaries name the moved ghost modules; the page's own
  rows are today's.
- JS: nothing new (the ghosts are today's code at a new path).

**Done when.** A pass holder's question page is the board's, in sw, en and zh, from 320 to 1280; the big buttons and
`?side=` open the sheet; classic readers show 0 differences.

### WP9 — The break: the home's notice and the cards' break row (S; depends on WP4; S7 WP7, WP10)

**Goal.** A reader on a break is not offered a bet: the home says the break once (s4-3-home-break), and every journey
card's picks become one row, "Mapumziko hadi {date}", that is not a control (Open point 29).

**Files.**
- src/lib/journey/card-face.ts (S7's; picks :54-57): a picks kind `{ kind: "break"; until }`, chosen before `open` when
  the reader's break runs (the card takes `onBreak`).
- src/components/journey/cards/journey-card.tsx: the break row (`.kp-jcard__break`: a lock glyph and `journey.cardBreak`
  with the date through `formatEatDate`, eat-day.ts).
- src/components/journey/home/journey-home.tsx (S7 WP7's):
  - the break read: `isLockedOut` → `breakStateOf` (break-end.ts:29-31), failing open as the question page does
    ([id]/page.tsx:254-258);
  - the notice under the bars and above the How-to card: `homeBreakTitle` with `formatBreakEnd` (break-end.ts:81) and
    `homeBreakBody`, `data-testid="journey-home-break"`; for a self-exclusion, `rg.exclusionActive`.
- the other open-card pages (S7 WP10's `/live`, `/watchlist` and the similar rail): the same `onBreak`.
- scripts/journey-home.test.mts §3 (the face), §4 (the row), §7 (the notice), with plants.

**Steps.**
1. The face: a running break draws `break` in place of `open` on an unsettled, bettable card. Closed and settled cards
   draw as before.
2. No helpline (Correction 15): the board's line (:33) is not built, and nothing replaces it.
3. A card on a break carries no `data-sheet` and no `data-bet-side`, so the host never opens from it (WP7 step 2).

**Gates.** test:journey-home §3, §4, §7 + red:journey-home; test:support-contact §15; test:timer-date (the break dates
through the localized formatters, S7-PLAN A24 item 3); test:contrast; test:i18n.

**Served bytes for a classic viewer.** None (journey components).

**Done when.** A pass holder on a cooling-off break sees the board's home in three languages, with no pick to tap
anywhere; off a break, nothing differs.

### WP10 — The SSE card patch, payload-free (S; depends on WP7)

**Goal.** S7-PLAN A7 (:1706-1725; §0h point 58 (c), VODACOM-PLAN.md:2283): when `50pick:sse:market-odds` names a
journey card on screen, that card's figures are re-read from the server. They are never computed from `yesPct`, and the event's payload (event-bus.ts:35) is never
widened (Open point 30).

**Files.**
- src/components/journey/bet-sheet/bet-sheet-host.tsx: the one listener, beside the sheet's own (A7's "with the sheet's
  SSE listener").
- scripts/bet-sheet.test.mts §11; scripts/journey-home.test.mts §7 (S7's pin that no file under the journey home or
  cards listens stays green).

**Steps.**
1. The host keeps the set of journey cards in the viewport: one IntersectionObserver over `article.kp-jcard[data-row-id]`.
2. On `50pick:sse:market-odds` whose `detail.marketId` is in that set, with the document visible and no sheet open, it
   dispatches `50pick:refresh` (RefreshPoller's event, refresh-poller.tsx:21, :56-60): at most once in 10 s, coalescing
   every event in between. An event that arrives while a sheet is open is held and released once, on close.
3. It reads `detail.marketId` and nothing else. event-bus.ts and use-event-stream.ts are untouched.
4. A page with no RefreshPoller answers nothing. Guests have no stream (app-shell.tsx:577) and keep the 30 s poll.

**Gates.** test:bet-sheet §11 + red (the listener reads only `marketId` and never `yesPct`; one refresh per window; held
while a sheet is open; event-bus.ts:35 byte-identical); test:journey-home §7; test:hooks-order.

**Served bytes for a classic viewer.** None (inside the host's chunk).

**Done when.** A bet placed in a second context moves the first context's on-screen card within one window; a card off
screen causes no refresh.

### WP11 — The drives (L; depends on WP8, WP9, WP10)

**Goal.** Measure in a real browser what no source check can: V20, the refusal matrix, exactly-once, the tap frame and
every frame's tiles; and prove that production carries no S8 trace. Every red control plants in the page only, never in
a repo file (S7's rule).

**Files.**
- scripts/qa-bet-sheet.mjs (new) and scripts/live/bet-sheet-cells.mjs (new: the cells and their rules, shared with the
  red control)
- scripts/pre-deploy-live-check.mjs ([E2], [E3])
- scripts/qa-first-load.mjs and scripts/qa-chunks-prod.mjs (S8's markers)
- package.json: `qa:bet-sheet`
- docs/VODACOM-PLAN.md: §5 S8 and the §1 S8 row name `qa:bet-sheet` in the commit that adds the key; §0k.

**Steps.**
1. **Where.** Locally only, one server, under the lock, behind `scripts/live/journey-pass.mjs`'s `premise` (:41), with a
   staff pass (`mintStaffPass`, :59). The player signs in through `/auth/demo` (`deposit=1` funded, `deposit=0` at TZS 0;
   auth/demo/route.ts:76-77) and `demoSession` (:82). Each cell asserts its premise first; a cell whose premise fails is
   INVALID, never PASS.
2. **V20** (LANDING-TEN.md:313; HANDOVER-LANDING-10.md:238), at 360×640, 390×844 and 1280×900, in sw, en and zh:
   - first focus on the heading; Tab and Shift+Tab never leave the sheet;
   - Escape closes, except while placing; the ✕ closes; the scrim closes, except while placing;
   - Back closes; a reload reopens, at the minimum, or at the tapped stake when the marker was written;
   - the safe area: with a 34px bottom inset — through the engine's safe-area override where it has one, else by reading
     the panel's computed bottom padding with the inset substituted (LANDING-TEN.md:773-774: the cell names its
     method) — the CTA ends at least 34px above the viewport's bottom;
   - the keyboard at 360×640: with the visual viewport shortened as a phone's keyboard does, the stake and the CTA stay
     visible above it, and the compact row shows;
   - Enter in the stake box sends no request; Enter on the focused CTA places once; a held Enter places once;
   - the keyboard cell also runs in WebKit (`ENGINE=webkit`, A8i-2's drive precedent).
3. **The tap frame** (§3.3 :3508): at 360×640 with the CPU throttled 4× (CDP), from the pick's pointerup to the first
   painted frame that holds the sheet's heading (a requestAnimationFrame probe): at most 150 ms, from a home card and
   from a `/live` card.
4. **The refusal matrix,** raised for real where a door exists, each with its tile:
   - maintenance (the seeded admin's `/admin/system`);
   - cooling-off, set in a second context after the sheet opened, then the tap;
   - a frozen wallet (an officer's freeze in a second context);
   - the loss limit lowered in a second context, then the tap (the loss block or the loss room);
   - the session limit: a 15-minute limit (the form's floor, validators.ts:250) and a sitting that passes it;
   - rate limited: bets past `bet.place`'s capacity of 30 (rate-limit.ts:107), then `/api/dev-test/reset-rate-limits`;
   - a short balance; a stake bound moved by an officer after the open; selection closed (fast-forward-market) before
     the tap and while placing;
   - busy: `/api/dev-test/stress-bulk-bet` flooding admission while the drive taps. A run whose tap was admitted is NOT
     MEASURED, never PASS;
   - the rows a browser cannot raise (the account-blocked divergence, a missing wallet, the key conflict, the two
     parameter refusals) are listed NOT DRIVEN, each with its in-process proof (test:bet-sheet §2).
5. **Exactly once,** each counted on the player's own positions and wallet rows before and after:
   - a double tap on the CTA, two pointer taps 30 ms apart: one request, one position;
   - the request aborted before it leaves (`route.abort`): `system_error` and "Jaribu tena"; one position after the
     retry;
   - the request delivered and its response dropped (`route.fetch`, then `route.abort`): the bet lands; the retry with
     the same key answers `replayed`; one position, and the receipt names the first ticket;
   - "Endelea kucheza", then a second bet: two positions, two keys.
6. **The low-balance branches,** each through a real door: TZS 0; short with two options; short of the deposit minimum;
   a PROCESSING deposit (the mock rail with `PAYMENTS_DEMO_ASYNC`, which answers PENDING and credits nothing,
   payments.ts:296-312); a deposit limit lowered on the limits page; an unaccepted declaration with a stake whose D crosses `SOF_SINGLE_TXN_TZS`; every rail paused (the officer's
   kill switches); a held wallet.
7. **The tiles:** every frame of the two tables, the receipt, the placing frame, the keyboard frame, the question page
   and its buttons, and the home on a break, at 320×640, 360×640, 390×844 and 1280, in sw, en and zh, read one by one.
8. **The controls:**
   - a classic reader (no pass) on `/`, a question page and `/live`: today's pages, no sheet, no `data-sheet`, and the
     dial on the question page;
   - a journey guest's pick navigates to the question page (S10 is later);
   - the red control, page-only: a stylesheet plant that pushes the CTA under the safe area must fail V20; a script
     plant that moves focus out of the sheet must fail the trap; a duplicated click listener that sends a second
     request must fail the double-tap cell.
9. **qa:live** [E2] (signed out) and [E3] (signed in as mobile01, GETs only; S7-PLAN A23 items 1-2): S8's list —
   `journey-bet-buttons`, `journey-home-break`, `journey-question-ghost`, the `data-sheet` attribute and the `kp-bsheet`
   class — is absent on `/`, `/markets`, `/live`, `/results`, `/watchlist` and a question page, with the matcher's
   controls. `journey-bet-sheet` is not listed: the Modal draws nothing while closed (modal.tsx:504).
10. **qa:first-load and qa:chunks-prod:** the host's chunk is a lazy part on every route and never in a classic route's
    entry files; production's initial scripts carry none of S8's markers.

**Gates.** Each drive's red control; test:orphans; test:docs.

**Served bytes for a classic viewer.** None (drives only).

**Done when.** Every cell passes or is listed NOT MEASURED or NOT DRIVEN with its reason; the red controls fail their
plants; the tiles are read.

### WP12 — Proof, records, merge, deploy (M; depends on all)

**Goal.** Prove S8 against its promise, ship it behind the flag, and close the records.

**Steps.**
1. **The battery,** under the lock, detached:
   - `npm run test:all -- --serial --skip responsive,motion`;
   - `npm run test:red-anchors`;
   - every in-process red S8 touched: bet-sheet, journey-sheet, shortfall, pending-bet, journey-estimate,
     deposit-ceiling, enter-where-pressed, implicit-submit, journey-shell, journey-home, journey-tickets,
     sell-grace-truth, simple-journey-flag, dal-parity;
   - red:contrast (a temp-copy harness) alone;
   - every file-mutating red S8 touched, each alone after committing, then `git diff --exit-code`;
   - §7's must-stay-green list (VODACOM-PLAN.md:4130-4133) runs inside test:all; each suite is read by its label.
2. **Parity v4:** `--prove-red`, then `--compare` against WP1's baseline. 0 differences in every cell.
3. **A local production build,** read by qa:first-load with S8's markers; and qa:served-skeleton `--main` (a null pair
   first) on `/`, `/live` and a question page, signed out and signed in.
4. **The drives (WP11)** are green, and their tiles have been read.
5. **An adversarial refute-and-mutate review** of the applied change before its commit (Ali's standing rule; S6's and
   S7's practice), the money lens first: a double bet, a wrong figure, a skipped refusal.
6. **Merge, push and verify:** the deploy commit through `/api/health` and `?dpl=`; qa:live on production with [E2] and
   [E3] (QA_SIGNED_IN=mobile01); qa:chunks-prod; qa:cls-budget on production in classic mode.
7. **Records:** §0k as built, with each package's served bytes; §1 S8; the SHELVED rows; §2's pre-flip list gains
   Privacy §7's `kp-pending-bet`; memory.

**Done when (S8), as Open point 2 proposes:**
- On a local in-memory server through a real staff pass, `test:bet-sheet`, V20 and the refusal matrix (`qa:bet-sheet`)
  are green in sw, en and zh from 320 to 1280, and exactly-once holds in every cell.
- Parity v4 shows 0 differences.
- Production proves that nothing changed for players beyond §0k's named served bytes.

"A staff real bet works on production" moves to S14 (§0h point 4). Only then is S8 ✅.

---

## New dictionary keys (journey.*)

### From the §3 table (sw binding; en the deck's; zh as drafted there)

| Key | sw | en | zh |
|---|---|---|---|
| `sheetChosen` | Umechagua {side} | You picked {side} | 您选择了{side} |
| `stakeLabel` | Dau lako | Your bet | 您的投注 |
| `estimateLead` | Ukishinda, unapata takriban | If you win, you get about | 若您赢，约可获得 |
| `estimatePill` | ≈{mult}× dau lako | ≈{mult}× your bet | ≈{mult}× 您的投注 |
| `balanceRow` | Salio lako | Your balance | 您的余额 |
| `placeCta` | Weka dau · {amount} | Place bet · {amount} | 投注 · {amount} |
| `placeCtaBare` | Weka dau | Place bet | 投注 |
| `estimateCompact` | Ukishinda ≈ {amount} | If you win ≈ {amount} | 若赢 ≈ {amount} |
| `lowTitle` | Salio halitoshi | Not enough balance | 余额不足 |
| `lowBody` | Una {have}. Unahitaji {short} zaidi. | You have {have}. You need {short} more. | 您有 {have}，还需 {short}。 |
| `lowChoose` | Chagua unachotaka kufanya | Choose what to do | 请选择操作 |
| `lowDeposit` | Weka pesa {amount} | Deposit {amount} | 充值 {amount} |
| `lowBetInstead` | Weka dau la {amount} badala yake | Bet {amount} instead | 改为投注 {amount} |

`estimateNote` exists (S7, i18n-dict.ts en :3121, sw :5550, zh :7954). `pendingBet` is S9's (the deposit strip).

### S4 canvas words, approved (S4-COPY-AUDIT.md review 3, :260-273)

| Key | sw | en (draft) | zh (draft) |
|---|---|---|---|
| `estimatePillOver` | ≈ zaidi ya {cap}× dau lako | ≈ over {cap}× your bet | ≈ 超过 {cap}× 您的投注 |
| `estimateUpdated` | Makadirio yamesasishwa | Estimate updated | 预估已更新 |
| `sheetEmptyPoolBody` | Makadirio yataonekana mtu akiweka upande mwingine. | The estimate appears once someone bets on the other side. | 有人投注另一方后将显示预估。 |
| `sheetRefundRule` | Kama upande mmoja tu una dau wakati wa kufunga, kila dau hurudishwa kamili. | If only one side holds bets at the close, every bet is refunded in full. | 若截止时仅有一方有投注，所有投注将全额退还。 |
| `sheetFirstOnSide` | Wewe utakuwa wa kwanza upande wa {side} — makadirio yatashuka wengine wakiweka upande huu. | You will be the first on {side} — the estimate falls as others bet on this side. | 您将是{side}方的第一位投注者——其他人投注此方后预估会下降。 |
| `sheetLegacyFee` | Kamisheni ya hadi {pct}% ya bwawa lote hutolewa kabla washindi hawajalipwa. | A commission of up to {pct}% of the whole pool is deducted before winners are paid. | 派彩前从整个奖池中扣除最高 {pct}% 的佣金。 |
| `lowLossRoom` | Kikomo chako cha hasara kinaruhusu hadi {amount} leo. | Your loss limit allows up to {amount} today. | 您的亏损上限今天最多允许 {amount}。 |
| `lowMinNote` | Kiasi cha chini cha kuweka ni {min} — {left} zitabaki kwenye salio lako. | The minimum deposit is {min} — {left} will stay in your balance. | 最低充值为 {min}——{left} 将留在您的余额中。 |
| `lowPendingTitle` | Malipo yako ya {amount} yanasubiri | Your {amount} payment is pending | 您的 {amount} 付款正在等待确认 |
| `lowPendingTrack` | Fuatilia malipo | Track the payment | 查看付款进度 |
| `lowSofCta` | Jaza tamko | Fill in the declaration | 填写声明 |
| `homeBreakTitle` | Uko kwenye mapumziko hadi {date} | You're on a break until {date} | 您的休息期至 {date} |
| `homeBreakBody` | Kuweka dau kumezimwa hadi wakati huo. Unaweza kuendelea kuangalia maswali. | Betting is off until then. You can keep browsing the questions. | 在此之前投注已关闭。您可以继续浏览问题。 |
| `cardBreak` | Mapumziko hadi {date} | Break until {date} | 休息至 {date} |

The figures are placeholders: the canvas's "TZS 3,000", "TZS 1,000", "TZS 800", "100" and "8 Okt" become `{amount}`,
`{min}`, `{left}`, `{cap}` and `{date}` (test:rate-copy).

### The panel's corrections to live words, as journey copies (review 2; S4-COPY-AUDIT.md:92-126)

The classic keys keep their words until S12 (§0h point 3); the sheet reads these (Open point 37).

| Key | Corrects | sw | en | zh |
|---|---|---|---|---|
| `sheetClosedTitle` | "Soko limefungwa" (:126) | Swali hili limefungwa | This question is closed | 此问题已截止 |
| `sheetClosedBody` | `failSelectionClosed` (:126) | Muda wa kuchagua umekwisha. Sasa tunasubiri matokeo. | Picking has closed. We're now waiting for the result. | 选择时间已结束，正在等待结果。 |
| `sheetHolds` | `youAlreadyHold` (:125) | Tayari una dau la {side} hapa | You already have a {side} bet here | 您已在此投注{side} |
| `sheetHoldAddBody` | `hedgeAddBody` (:125) | Kuweka tena kunaongeza dau lako kwenye swali hili. | Placing again adds to your bet on this question. | 再次投注将增加您在此问题上的投注。 |
| `sheetHedgeBody` | `hedgeOppositeBody` (:114) | Tayari una dau upande mwingine wa swali hili. Madau yote mawili yanabaki na kila moja hulipwa peke yake — upande mmoja tu unaweza kushinda, na ada yetu hutolewa kabla washindi hawajalipwa. | You already hold the other side of this question. Both bets stand and settle separately — only one side can win, and our fee comes out before winners are paid. | 您已持有此问题的另一方。两笔投注都成立并各自结算——只有一方能获胜，我们的费用在派彩前扣除。 |
| `sheetHedgeBothBody` | `hedgeBothBody` (:114) | Unaweka dau pande zote mbili za swali hili. Madau yote mawili yanabaki na kila moja hulipwa peke yake, lakini upande mmoja tu unaweza kushinda — na ada yetu hutolewa kabla washindi hawajalipwa, kwa hiyo madau yako yote mawili hayawezi kurudi yote. | You're backing both sides of this question. Both bets stand and settle separately, but only one side can win — and our fee comes out before winners are paid, so the two stakes cannot both come back in full. | 您在此问题上同时投注了双方。两笔投注都成立并各自结算，但只有一方能获胜——我们的费用在派彩前扣除，因此两笔投注无法都全额返还。 |
| `sheetLegacyBody` | `dialog.payoutCalcBody` (:96) | Inahesabiwa wakati wa matokeo kutoka bwawa la mwisho. Tutakuambia kiasi kamili mara uchaguzi utakapofungwa. | Calculated at resolution from the final pool. We'll tell you the exact amount as soon as betting closes. (the classic en, already right) | 根据最终奖池在结算时计算。投注一关闭，我们就会告知您确切金额。 (the classic zh) |
| `sheetBusy` | `failSystemBusy` (:98) | Tuna shughuli nyingi kwa sasa. Dau lako HALIJAWEKWA na hakuna pesa iliyokatwa — jaribu tena baada ya muda mfupi. | We're busy right now. Your bet was NOT placed and no money was taken — try again in a moment. | 系统繁忙。您的投注未下单，也未扣款——请稍后重试。 |
| `sheetBlocked` | `failAccountBlocked` (:99) | Akaunti yako haiwezi kuweka dau kwa sasa. Wasiliana na msaada na tutakueleza sababu. | Your account can't place bets at the moment. Contact support and we'll explain why. | 您的账户目前无法投注。请联系客服了解原因。 |
| `sheetFrozen` | `failWalletFrozen` (:100) | Pochi yako imegandishwa, kwa hiyo huwezi kuweka dau. Wasiliana na msaada kutatua hili. | Your wallet is frozen, so you can't place a bet. Contact support to resolve it. | 您的钱包已冻结，无法投注。请联系客服处理。 |
| `sheetSessionLimit` | `failSessionLimit` (:122) | Ulijiwekea kikomo cha dakika {limitMin} kwa kipindi kimoja, na kipindi hiki kimefikia kikomo hicho. Uwekaji dau umezimwa hadi upumzike — rudi baadaye uanze kipindi kipya. | You set a {limitMin}-minute limit for one session, and this session has reached it. Betting is off until you take a break — come back later to start a new session. | 您为单次时长设定了 {limitMin} 分钟上限，本次已达到。投注已关闭，请先休息——稍后回来开始新的时段。 |
| `sheetRateLimited` | `failRateLimited` (:123) | Umejaribu haraka mno. Subiri sekunde {sec} kisha jaribu tena. | You tried too quickly. Wait {sec}s and try again. | 操作过快。请等待 {sec} 秒后重试。 |
| `sheetDepositLimit` | `errDepositLimit`, the C11 sentence (:128; s4-5-low-limit) | Kuweka {amount} kungepita kikomo cha kuweka pesa ulichojiwekea. Unaweza kukagua vikomo vyako kwenye Uchezaji salama. | Depositing {amount} would go over the deposit limit you set. You can review your limits under Responsible gambling. | 充值 {amount} 将超过您设定的充值上限。您可在“负责任博彩”中查看限额。 |
| `sheetSofRequired` | `errSofRequired`, the C11 sentence (:128; s4-5-low-sof) | Ili uweke pesa, tamko lako la chanzo cha fedha linahitaji kukubaliwa na timu yetu kwanza. Jaza tamko kwenye wasifu wako; utaweza kuweka pesa likishakubaliwa. | To deposit, your source-of-funds declaration must first be accepted by our team. Fill it in on your profile; you can deposit once it is accepted. | 充值前，您的资金来源声明需先经我们团队接受。请在个人资料中填写声明；接受后即可充值。 |
| `sheetBelowMin` | the first sentence of `failStakeBelowMin` (§0g :2545) | Dau la chini kabisa ni {min}. | The minimum bet is {min}. | 最低投注为 {min}。 |
| `sheetAboveMax` | the first sentence of `failStakeAboveMax` | Kiwango cha juu kwa dau moja ni {max}. | The maximum for a single bet is {max}. | 单笔投注上限为 {max}。 |

### S8 drafts (review 7)

| Key | sw | en | zh | Source |
|---|---|---|---|---|
| `sheetLossBlock` | Umefikia kikomo cha hasara cha siku ulichojiwekea. Kinahesabu saa 24 zilizopita — unaweza kukiangalia kwenye Weka mipaka. | You've reached the daily loss limit you set. It counts the last 24 hours — you can review it under Set limits. | 您已达到自己设定的每日亏损上限。该上限按过去 24 小时计算——可在“设置限额”中查看。 | replaces the canvas's midnight reset (Correction 14; Open point 22) |
| `sheetRailsPaused` | Kuweka pesa hakupatikani kwa sasa. Njia zote za malipo zimesimama kwa muda — jaribu tena baadaye. | Deposits are unavailable right now. Every payment method is paused for a while — try again later. | 目前无法充值。所有支付方式暂停中——请稍后再试。 | s4-5-low-paused |
| `sheetDepositMax` | Kiwango cha juu cha kuweka pesa mara moja ni {max}. | The most you can deposit at once is {max}. | 单笔充值上限为 {max}。 | none drawn (the `deposit_max` branch) |
| `sheetPlacing` | Inaweka dau… | Placing your bet… | 正在投注… | s4-4-sheet-placing |
| `estimateUpdatedLive` | Makadirio yamesasishwa: {amount}, ≈{mult}× dau lako | Estimate updated: {amount}, ≈{mult}× your bet | 预估已更新：{amount}，≈{mult}× 您的投注 | s4-4-sheet-updated (the live region) |
| `estimateNoteCompact` | Makadirio · kamisheni ya {pct}% imeshatolewa. | Estimate · our {pct}% commission is already deducted. | 预估 · 已扣除 {pct}% 佣金。 | s4-4-sheet-keyboard-360 |
| `multOnly` | ≈{mult}× | ≈{mult}× | ≈{mult}× | pick-3 and the keyboard frame (IDENTICAL_OK: a figure, no words) |
| `lowBetInsteadEstimate` | Ukishinda ≈ {amount} · ≈{mult}× | If you win ≈ {amount} · ≈{mult}× | 若赢 ≈ {amount} · ≈{mult}× | pick-3 (the panel's A1, VODACOM-PLAN.md:2622-2623) |
| `lowLossTitle` | Kikomo cha hasara | Loss limit | 亏损上限 | s4-4-sheet-loss-room |
| `ticketsHere` | Tiketi zako | Your tickets | 您的注单 | s4-10-market (the holder block) |

`sheetHedgeBody` and `sheetHedgeBothBody` say "swali hili" where the corrected classic sentences say "soko hili", as
`hedgeAddBody`'s correction does (SJ-19: "Maswali" replaces "Masoko"); review 7 confirms it.

### Reused, never copied

- `error.failMaintenance`, `failCoolingOff`, `failSelfExcluded`, `failSystemError`, `failStakeNotWhole`,
  `failWalletMissing`, `failIdempotencyKeyConflict`, `failMarketNotLive` (the registry's own rows).
- `market.udErrSuspendedTitle` and `udErrRgLimitTitle` (the block titles, sw :4019, :4021), `udRcKeepPlaying`,
  `crowdedWarning`, `noBetsYet`, `oneSideOnly`, `oneSidedNote`.
- `common.betPlacedEyebrow`, `goodLuck`, `ticket`, `gotIt` ("Sawa"), `temporarilyUnavailable`, `close`;
  `dialog.placing`; `depositPendingBody`.
- `rg.setLimits`, `rg.exclusionActive`; "Wasiliana na msaada" (`frozenCta`, S4-COPY-AUDIT.md:56).
- `journey.estimateNote`, `ticketPayout`, `ticketPayoutAtResult`, `tabTickets`; `sideWord` for every side.

### Not added

- `journey.pendingBet`: S9's.
- The approved "Bado utapungukiwa na {gap} kwa dau lako." (S4-COPY-AUDIT.md:273): S9's deposit screen and return
  (§3.5 :3617, :3663), where review 3 adds the "na" §3.5's draft lacks.
- No helpline key (Correction 15).

---

## Risks

1. **A wrong figure on a money screen.** Every figure comes from `estimateFor` or `shortfallPlan` (WP2); the frame's
   rendered figures are checked against them in process (test:bet-sheet §7), and the tiles are read against the engine.
2. **A double bet.** One key per intent, reused only on a retry; the drive's aborted and dropped requests (WP11 step 5).
3. **A skipped refusal.** The plan's blocks at open (Open point 8), the matrix, and its census of the source's literals:
   a new reason on the bet path without a row fails test:bet-sheet §2.
4. **A read that writes.** `checkSessionTimeLimit` touches the play clock (responsible-gambling.ts:516-522), so the sheet
   reads a write-free twin (WP3). `getRgSettings` creates a default row when there is none (the note at
   responsible-gambling.ts:580-585 says why it stays outside the bet's transaction); that is every RG read's behaviour.
5. **Classic regressions on the question page.** Same-slot ternaries without re-indenting; parity v4's QUESTION phase;
   qa:served-skeleton; test:red-anchors after WP8 (its anchors on this page must resolve exactly once).
6. **AppShell is pinned by many gates** (test:journey-shell §12, test:simple-journey-flag 10.shell.*, test:stacking's
   ROOT_MOUNTS). Re-pin them in the open, each with its plant, never loosened.
7. **History.** Native `pushState` and Next's router; Back while placing; a deep link with no card on the page. V20's
   Back and reload cells are the proof.
8. **Deploy skew and render errors in the root layout.** The host lives outside every route's error boundary, so it
   never rethrows: only `UnrecognizedActionError` reloads (once per build, RouteError's rule); any other throw is
   `system_error` with the same key, so an unknown outcome is never retried as a new bet; a render error stays inside
   the host's own boundary instead of reaching global-error's critical screen.
9. **The phone keyboard.** `visualViewport` differs by engine; WebKit's V20 keyboard cell runs too.
10. **Load.** The 10 s public refetch per open sheet against `sheet.ip`'s 120 tokens and 60 a minute per address
    (rate-limit.ts:150), with many phones behind one carrier address. A refused read keeps the last figures; S15
    measures it.
11. **SSE load.** House bots bet often, and every bet emits (market-service.ts:1849). The card patch coalesces to one
    refresh in 10 s, for cards on screen only.
12. **Payload.** `data-sheet` rides on every open journey card (journey readers only); §0k records the bytes per card.
13. **The marker is storage.** Privacy §7 lands in the same commit as the first write (§3.10 :3800-3801), or the commit
    is not shipped.
14. **Approved words that are no longer true** (Correction 14). Review 7 and Points for Ali carry them; nothing ships a
    sentence the code contradicts.
15. **Dictionary changes** turn test:house-bot-disclosure 5.1 red by construction (S6-PLAN.md:124). Record it; do not
    "fix" it.
16. **Legacy bonus balances.** Spendable includes the bonus (the bet path's figure, market-service.ts:1517-1520); the
    header shows cash. The sheet's balance row shows spendable, the dial's figure ([id]/page.tsx:463-471).
17. **A pass that expires mid-visit** (journey-preview.ts:244-246): the host unmounts on the next refresh and an open
    sheet closes; a bet placed just before stands and shows in Tiketi zangu.
18. **Parallel work on the same files.** S8 starts after S7 closes; WP0 re-reads every number.
19. **The laptop.** One heavy job at a time, through the lock; one dev server at a time; the red harnesses alone and
    detached; never `red:all` against a dev server.
20. **Tailwind scans comments; editors and heredocs eat backslashes** (S7-PLAN Risk 16). New files' comments carry no
    class-shaped strings; test:source-bytes catches the rest.
21. **Harm markers.** Small top-ups from the low-balance prompt feed RAPID_DEPOSIT_ESCALATION and CHASING_LOSSES (§8,
    VODACOM-PLAN.md:4154-4155; the "watched after launch" line, COMPLIANCE-DECISIONS.md:1338-1339). S8 only links to
    today's deposit page, and the markers read every deposit as they do today; S13's panel watches them beside the
    "short → deposit" measure.
22. **A host whose code never arrives.** `nothingIfLost` leaves it out (shell-lazy.tsx:57-79), so a tap falls through to
    its link: the question page at `?side=`, where nothing opens the sheet until a reload fetches the chunk. No money
    moves, and the page stays up — the fallback every S6 part has.

## Open points → §0h

Each is a call taken under Ali's delegation, filed as a numbered §0h point by WP0, with its overrule.

1. **S8 starts only after S7 has closed:** merged, live, its close record in §0j, parity v3's last compare recorded.
   Overrule: start WP0–WP2 (the records and the pure core) before S7 closes, and nothing that edits a file S7 still edits.
2. **S8 is ✅ on local drives through a staff pass, plus production proving "nothing changed for players".** "A staff
   real bet works on production" moves to S14 (§0h point 4). Overrule: Ali turns his preview on at S8's close and places
   one real TZS 1,000 bet on production.
3. **The host is a lazy shell part,** mounted by AppShell for a journey request with a session, and it hears taps through
   one window-capture listener, never an import from the card (the card stays a server component). A classic request
   gains one `false` RSC slot (S6 WP7's precedent). Overrule: mount it inside the journey tabs' arm (no classic slot),
   re-pinning journey-shell §12's tab checks.
4. **The card hands the sheet its seed as a `data-sheet` attribute** (the public half `sheetSeedFor` builds on the
   server), so the sheet draws on the tap frame. Overrule: open on a skeleton and wait for `/sheet` (a network wait,
   against §3.3's 150 ms).
5. **The sheet opens with focus on its heading** (§3.3 :3510), not its CTA: it is the stake surface, not a confirm, and
   Enter on a heading presses nothing. Its way out is the ✕. test:enter-where-pressed names it beside the three money
   dialogs. Overrule: focus the CTA, as the bet confirm does.
6. **No form in the sheet.** Enter in the stake box does nothing by construction (no implicit submission; no key
   handler, which 2.6 forbids in a dialog file anyway). The CTA is `type="button"`. Overrule: a form guarded the
   ConfirmDialog `submitsForm` way.
7. **S8 changes no bet-path refusal.** The five reasonless refusals are classified by their codes and a re-read; the
   classic dial's words for them stay as they are. Overrule: teach `buyPosition` to emit `selection_closed` and
   `market_not_live` at those sites, a live change for every player in its own commit.
8. **The plan's blocks show at open, not only after a refusal:** a break, the session limit, maintenance, a held wallet
   or the loss limit is said before the player taps. Overrule: show them only after the server refuses.
9. **The viewer's facts ride in `?me=1`,** read on open, on a balance event, on focus and on entering the low frame —
   not every 10 s (the public half refreshes every 10 s). Overrule: read them every 10 s.
10. **A pending deposit is read by a new narrow DAL read** in both stores. Overrule: filter `listForUser`, which reads
    every row the player has.
11. **"Weka pesa TZS {D}" opens today's deposit page** (`/wallet/deposit?amount=D&from=low-balance&bet=…`); S9 builds
    the journey deposit and the way back. The marker is written at that tap. Overrule: leave `bet` off until S9.
12. **"Fuatilia malipo" opens the pending deposit's receipt** (`/wallet/receipt/<txnId>`) until S9's waiting page.
    Overrule: hide the link until S9.
13. **The address and the marker now.** Opening pushes `bet=<id>.<side>`; a tap writes the stake and the marker; Privacy
    §7 names `kp-pending-bet` in that commit, a change every visitor can read. Overrule: no stake in the address and no
    marker until S9 (a reload then reopens at the minimum).
14. **On a deploy skew the host reloads the page itself,** once per build, under RouteError's own key and rule, and
    never rethrows: it sits in the root layout, where a thrown error reaches global-error's critical screen, which does
    not reload. RouteError is not changed; test:deploy-skew holds the two rules equal. Overrule: lift the rule into one
    module both import (RouteError's chunk changes on every page, and test:deploy-skew §2 is re-pointed).
15. **No `html[data-bet-sheet]`** (Correction 5): the Modal's own dialog role already stands the reality check and the
    channels panel down; the consent prompt stays ungated, under the sheet's scrim. Overrule: build the attribute and
    teach the consent prompt to wait.
16. **Pull-to-refresh skips a touch inside the sheet** through an attribute only the sheet draws, so no classic
    behaviour changes. Overrule: skip inside every open dialog, for every player, as a live fix in its own commit.
17. **The keyboard lift is the sheet's own,** not the kit Modal's. Overrule: build it into Modal for every sheet.
18. **No drag-to-dismiss** (S7's How-to sheet's call). Overrule: build Modal's `dragToDismiss`.
19. **`grouped` and `attention` are kit `Input` props,** inert unless set. Overrule: a journey-only stake field.
20. **The navy disabled gold is scoped to the sheet.** Overrule: every gold button, as a live visual change with parity's
    named differences.
21. **The bonus line is the market page's own B2 rule** (`bonus_wagering_one_side`), and S3's `bonusWarning` boolean
    leaves the route. Overrule: keep the boolean and add a "bonus money cannot be sold" line too.
22. **The loss block says the limit counts the last 24 hours,** not the approved "kesho saa 00:00": the gate is rolling
    (Correction 14). Overrule: the approved words, which state a reset the gate does not make.
23. **The session-limit line names no end time;** the server sends none. Overrule: the server adds `detail.resumeAt`, a
    service change for every player.
24. **The pending frame uses the live `depositPendingBody`** (the receipt stays in the app), not the canvas's emailed
    receipt. Overrule: the canvas words, untrue for an unconfirmed address.
25. **Over the cap the sheet prints the TZS figure and "≈ zaidi ya {cap}× dau lako"** (s4-4-sheet-over-cap); only the
    card has no number. Overrule: no figure in the sheet either.
26. **The question page's two big buttons come after the holder's tickets,** as the board draws them. Overrule: put them
    in the bet panel's slot, first on a phone, as today's dial is.
27. **The question page's loading picture is chosen on the server** in both loading files (S6's §0h point 21 pattern;
    A19 item 4's guard). Overrule: keep today's ghosts, and accept a jump when the journey page lands.
28. **The holder block takes S6's journey Sell look on the question page** (the board). Overrule: the classic look until
    S12.
29. **The break shows on the home and on every journey card surface** (the "Mapumziko hadi" row), with no helpline.
    Overrule: the home only.
30. **The SSE card patch is one `50pick:refresh` in 10 s at most, for cards on screen, held while a sheet is open.**
    Overrule: a per-card `/sheet` read and a client-drawn figure (client code in the card).
31. **`Position.origin` moves to S9,** with the deposit return, the only origin a measure would read from the row.
    Overrule: add the column in S8.
32. **V20 is built as `qa:bet-sheet`,** not revived inside qa:landing-ten. Overrule: add V20 to qa:landing-ten.
33. **SJ-22's check, done:** neither test:rg-doors (the sign-in doors and the session limit, rg-doors.test.mts:1-18) nor
    the RG policy's §4 (responsible-gambling/page.tsx:102-108) asks for a limits link under the CTA, so none is added.
    "Weka mipaka" appears where the canvas draws it: the loss room and the loss and cooling-off blocks. Overrule: a
    standing link under every CTA.
34. **The receipt's "Tiketi zangu" opens the ticket itself** (its permalink), and the receipt closes at 5 s. Overrule:
    `/positions`.
35. **A refusal the sheet cannot produce, or any unknown shape, is treated as `system_error`** (same key, "check your
    wallet"). Overrule: a generic line and a fresh key.
36. **"Every rail paused" counts the four mobile-money rows;** Card is the deposit screen's link (S9). Overrule: count
    Card too.
37. **The sheet speaks the review's corrected words now,** through journey copies; the classic keys keep theirs until
    S12. Overrule: the sheet reads the classic keys, with their known errors, until S12.

## Points for Ali

1. [Point 2] S8 is finished and proven on a local copy of the site through a staff pass, and production is checked only
   for "nothing changed for players". Your one real bet on production waits for S14, as your rule of 2026-10-02 says
   (nothing is turned on until the whole plan is done). Overrule: turn your preview on at S8's close and place one real
   TZS 1,000 bet.
2. [Point 1] S8 starts after S7 is finished and live, because both change the same files. Overrule: let S8 start its
   paperwork and its rule modules earlier.
3. [Point 8] The sheet tells a player at once when they cannot bet — a break, their own limit, maintenance, a held
   wallet — before they tap, instead of after a refused tap. Overrule: only after the refused tap.
4. [Point 13] The bet a player picked is remembered in that browser tab for up to 24 hours, so a reload or a return from
   paying brings it back. The privacy notice names this the day it ships, which every visitor can read. Overrule: no
   memory until S9.
5. [Points 11, 12] Until S9 builds the new deposit screen, "Weka pesa TZS 3,000" opens today's deposit page with the
   amount filled in, and "Fuatilia malipo" opens that payment's receipt. Overrule: hide them until S9.
6. [Point 22] The approved screen for a reached loss limit says it "starts again tomorrow at 00:00". The limit really
   counts the last 24 hours, so the sheet says that instead. Overrule: keep the approved words.
7. [Point 23] The session-limit message gives no clock time, because the server does not know one. Overrule: the server
   learns to send one (a change for every player).
8. [Point 24] A payment that is still waiting says its receipt stays in the app, not "by email": since 2026-10-07 money
   email goes only to a confirmed address. Overrule: the drawn email sentence.
9. [Point 25] On a very lopsided question the sheet shows the shilling estimate and "over 100× your bet"; only the card
   hides the number. Overrule: no number in the sheet either.
10. [Points 26, 28] On a question's own page, a journey player sees their tickets first, in the new ticket look, and the
    two big NDIO / HAPANA buttons under them, as the design board draws it. Overrule: the buttons first, where today's
    dial is; or today's ticket look.
11. [Point 29] A player on a break sees "on a break until …" at the top of the home, and each question card shows the
    break date instead of NDIO / HAPANA. Overrule: the home's message only.
12. [Point 5] With a keyboard, the sheet starts on the question's heading, not on the bet button, so no stray Enter can
    bet. Overrule: start on the bet button.
13. [Points 15, 16] Other pop-ups wait for, or sit under, the open sheet as they do for any dialog today, and a
    pull-to-refresh gesture that starts inside the sheet is ignored. Nothing changes for anybody outside the journey.
    Overrule: a page-wide switch for both, for every player.
14. [Point 21] The bonus warning shows exactly when today's question page shows it. Overrule: also a second, general
    bonus line.
15. [Point 31] The "where did this bet come from" column waits for S9, where the deposit return needs it. Overrule: add
    it now.
16. [Point 37] The sheet uses the corrected Swahili the review approved (for example "Dau lako HALIJAWEKWA na hakuna pesa
    iliyokatwa"), while today's screens keep their words until S12. Overrule: the sheet keeps today's words until S12.
