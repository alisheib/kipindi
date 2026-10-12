# S8 — the bet sheet and low balance (flagged): build plan (drafted 2026-10-12)

> The working plan for VODACOM-PLAN S8, "Bet sheet + low balance (flagged): §3.3 and §3.4" (`docs/VODACOM-PLAN.md`
> :3952-3954; the board row :2914). Drafted read-only on 2026-10-12 by one planner, who read every file cited below;
> no suite, server or browser was run. Status lives in `docs/VODACOM-PLAN.md` §0 (a new §0k, opened by WP0); this file
> is the how. Its Open points are decisions taken under Ali's delegation, each with the overrule he may choose; WP0
> files them as numbered §0h points after S7's last.
>
> **Base.** Line numbers are at `2322cf09` (branch `vodacom-s7-land3`: S7 WP1–WP4, eight commits on origin/main
> `fdd662a9`). Two later S7 packages are read from their branches and cited with the branch named: WP5 (the journey card)
> at `origin/vodacom-s7-wp5` `8233347b`, and WP6 (the shared lost-chunk guard and the How-to sheet) at
> `origin/vodacom-s7-wp6` `a33a9ced` (a rebase orphaned `ba6faebb`, where this draft first read it; the cited lines are
> identical). S7 WP7–WP12 had no commit when this was drafted (A1 names the branches since). S7 still edits
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
   - §0 :17; §0j :495-618; §0i :620; §0h :1763 (its last point is 67, :2417; `origin/vodacom-s7-docs` `bb837fcb` runs
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
     `<Link>`s to `/markets/<id>?side=…` (journey-card.tsx:218-228 on `origin/vodacom-s7-wp5`).
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
13. **`checkSessionTimeLimit` is not a read.** It writes the play clock on every call, at most once a minute
    (responsible-gambling.ts:516-520). `shortfall.ts`'s premise, "every input is a fact the server already reads"
    (:14-16), holds for the sheet only through a write-free twin (WP3). Calling the gate from a sheet read every few
    seconds would keep a sitting alive with no bet attempt.
14. **Three approved canvas sentences are no longer true; S8 does not build them as drawn:**
    - The loss block's "Kitaanza upya kesho saa 00:00" (s4-4-block-loss.dc.html:26; the S12 correction,
      S4-COPY-AUDIT.md:124) states a midnight reset. The gate is a rolling 24 hours (responsible-gambling.ts:586-588).
      The live refusal already tells the truth: Ali's ruling of 2026-10-12 fixed it live in its own commit, `e5b5c9da`
      ("Kinahesabu saa 24 zilizopita"; §0h point 77), and the sheet reuses it (A5). Open point 22.
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
| 16 | :1374-1377; markets/actions.ts:98-100 | `INVALID` · `idempotency_key_conflict` | warning, toast | unreachable: a fresh UUID per intent, never an `hb:` key (house-bot/constants.ts:72). If it arrives: inline `error.failIdempotencyKeyConflict` | new key (the old one belongs to another bet) |
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
⚠️ 2026-10-12 (owner ruling — `docs/COMPLIANCE-DECISIONS.md` § "2026-10-12 · The minimum stake is TZS 500 again; the minimum deposit stays TZS 1,000 (owner)"):
`PLATFORM_MIN_STAKE` is **500** now, and production's stored 1,000 is lowered by the market config v4 / Up & Down v5
reconcile, so the sheet's `min` is 500; `DEPOSIT_MIN_TZS` stays 1,000. The line numbers above are the 2026-10-12
morning's and have moved.

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
| `short`, deposit only, `belowDepositMin` | low, no eyebrow | s4-5-low-min500 | the deposit row and `lowMinNote` with the minimum and `leftAfter` |
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
   - The §0h points: this plan's Open points, numbered after S7's last (76 on `origin/vodacom-s7-docs` `bb837fcb`;
     re-read; A1).

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
  - `sessionStandingOf(row, playStartedAt, nowMs)`: pure, the arithmetic of `checkSessionTimeLimit` (:498-523), which
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
     at :518-520 is the gate's alone);
   - `account`: the user's status and the cooling-off end (the bet path's own test, market-service.ts:1281-1284);
   - `wallet`: status, balance and bonus (`db.wallet.findByUserId`, as journey-sheet.ts:121-124 reads it);
   - `loss`: `dailyLossLimit` from `getRgSettings` (:64) and `lossToday` from `getLimitUsage` (:617-629), the very sums
     `checkLossLimit` computes (:579-597);
   - `pendingDeposit`: `db.txn.newestProcessingDeposit(userId)` → `{ amount, txnId }` or null;
   - `deposit.limits` and `deposit.usage`: the three windows from `getRgSettings` and `getLimitUsage`, counting
     PROCESSING deposits as the gate does (:608-616);
   - `deposit.sof`: `{ accepted, singleTxn: SOF_SINGLE_TXN_TZS, rolling30d: SOF_ROLLING_30D_TZS }` (wallet-service.ts:63-64;
     the declaration's status read as the gate reads it, :215-216);
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
- docs/design-system/v5-2026-09-29-simplified-journey/S4-COPY-AUDIT.md: "S8 drafts", and S8's own "Swahili review" (8,
  since `e5b5c9da` took 7; A20), signed. Nothing for the loss-limit sentence: `e5b5c9da` fixed it live and withdrew its
  S12 line (A5).
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
- scripts/numeric-input.test.mts (grouped cases); scripts/contrast-audit.mts (two pairs) and red:contrast's plants.

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
     would reach global-error's critical screen (shell-lazy.tsx:28-31 records the same hazard), which does not reload;
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
| `sheetDepositLimit` | `errDepositLimit`, the C11 sentence (:128; s4-5-low-limit) | Kuweka {amount} kungepita kikomo cha kuweka pesa ulichojiwekea. Unaweza kukagua vikomo vyako kwenye ukurasa wa Vikomo (A20 item 7, corrected). | Depositing {amount} would go over the deposit limit you set. You can review your limits under Responsible gambling. | 充值 {amount} 将超过您设定的充值上限。您可在“负责任博彩”中查看限额。 |
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
4. **A read that writes.** `checkSessionTimeLimit` touches the play clock (responsible-gambling.ts:518-520), so the sheet
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
    the RG policy's §4 (src/app/legal/responsible-gambling/page.tsx:102-108) asks for a limits link under the CTA, so
    none is added. "Weka mipaka" appears where the canvas draws it: the loss room and the loss and cooling-off blocks.
    Overrule: a standing link under every CTA.
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

---

## ⭐ Amendments (the coordinator, 2026-10-12) — these override everything above

Filed 2026-10-12 from the draft of the same day (262dc9f8; above, changed in place only where A1 and A5 say) after two
independent critiques of it — the money lens (16 findings: 3 blockers, 8 should-fix, 5 notes) and the plan lens (16
findings: 1 blocker, 12 should-fix, 3 notes) — and Ali's ruling of 2026-10-12 on the live loss-limit sentence. Every
claim was re-read at 2322cf09, and where the base has moved since, at origin/main `e5b5c9da`. Every blocker and should-fix
is taken. Where the re-read showed a claim wrong, the amendment carries the corrected version and its *From:* says why;
"Critique findings not taken as proposed" lists each such part. Findings the two critics share are merged: money 2 and
plan 1 (A3), money 6 and plan 6 (A8), money 8 and plan 12 (A5), money 11 with plans 9 and 12 (A12), and money 5 with plan
15's skew line (A7). Where an amendment and the body disagree, the amendment wins. The calls taken under Ali's delegation
are at the end ("Open points, added and changed"; "Points for Ali, amended").

**What changes, in one paragraph.** A bet whose answer was lost now stays one bet until the server says what happened:
the sheet keeps its key, reads whether that key placed a position, and never claims nothing was charged (A2). After a bet
nothing reopens it, the sheet opens from the address only where picks are drawn, and the key rides in the marker through
a reload (A3). A block shown before the tap records what a refused tap records, so the session limit and the Board's RG
report lose nothing (A4). The loss block reuses the live sentence Ali had corrected today (A5). Then the corrections: a
redirect rejects the call (A6), placing has a watchdog (A7), re-reads are fresh and decide (A8), the sheet computes no
balance (A9), an old pending deposit is described by its age (A10), the Prisma reads run before production (A11), focus
and announcements (A12), the ✕ (A13), the height cap (A14), WP5's proof (A15), the gate lists (A16), the packages (A17),
the canvas as drawn (A18), the question page from 1024 (A19), the words (A20), the tap frame on a production build (A21),
notes (A22) and the classic dial's two gaps (A23).

### A1 · Base and citations: the S7 branches re-read, the base's later commits, and the citations corrected in place

*Overrides:* the header's Base paragraph; Correction 1 (the §0h count), Correction 4 (the picks' lines) and Correction 13;
the low-balance table's `belowDepositMin` row; matrix row 16; WP0 step 4 (the §0h numbering); WP3 Files and step 1; WP5
Files; WP7 step 7; Risk 4; Open point 33.

1. **Corrected in place in this commit** (the plan critique's finding 14), each re-read at 2322cf09:
   - WP5 Files: `scripts/numeric.test.mts` does not exist; `test:numeric` runs `scripts/numeric-input.test.mts`
     (package.json `test:numeric`).
   - The `belowDepositMin` row cites s4-5-low-min500 only. s4-5-low-zero's shortfall is TZS 1,000 (a balance of 0 at a
     stake of 1,000), so it is not below the minimum and draws no minimum note; it stays on the next row.
   - WP3 step 1: the gate reads the declaration's status at wallet-service.ts:215-216 (`db.sourceOfFunds.get`,
     `reviewStatus !== "ACCEPTED"`); :210-213 is the trigger's arithmetic.
   - Open point 33: the RG policy is `src/app/legal/responsible-gambling/page.tsx:102-108` (§4). The other page of that
     name is the player's limits form.
   - Ranges: `checkSessionTimeLimit` is responsible-gambling.ts:498-523, its write :518-520 under the note at :516-517
     (Correction 13, which now says "at most once a minute", WP3 and Risk 4); `getLimitUsage` is :617-629;
     `HOUSE_INTENT_KEY_PREFIX` is house-bot/constants.ts:72; shell-lazy.tsx's lost-chunk note is :28-31.
   - The Base paragraph, Correction 1 and Correction 4: `origin/vodacom-s7-wp5`'s tip is `8233347b`, where the picks are
     journey-card.tsx:218-228; `origin/vodacom-s7-wp6`'s tip is `a33a9ced` (a rebase orphaned `ba6faebb`, and the lines
     cited are identical); `origin/vodacom-s7-docs`'s tip is `bb837fcb`.
2. **Since 2322cf09, origin/main has moved to `e5b5c9da`** (re-read 2026-10-12). It holds 2322cf09, then:
   - `dcf305d5` and `5ce27db7`: S7 WP1-WP4 live (2026-10-12 13:59 EAT) and read back, with §0h points 68-76;
   - `ceb54620` (S7's progress record), `c23d0756` (qa:served-skeleton's calibration 4) and `1da5e091`
     (red:simple-journey-flag's anchor);
   - `e5b5c9da`: Ali's loss-limit ruling, live (A5) — `error.failLossLimitDaily` corrected in en, sw and zh, three lines
     changed in place; S4-COPY-AUDIT.md's S12 line for that key withdrawn and "Swahili review" 7 signed; §0h point 77.

   S7's later branches exist too: `origin/vodacom-s7-land4` `25b0650c`, `-land5` `f8fcff7d`, `-land6` `112eb9f3`,
   `-wp7` `fb319259`, `-wp8` `51aa7337` and `-wp10` `4d55f9c7`. None is read here: WP0 re-reads every number at S8's
   real base, as planned.
3. **A number read at 2322cf09 converts to origin/main `e5b5c9da` as follows:**
   - VODACOM-PLAN.md: unchanged to :363; :364-367 rewritten as :364-366; −1 from :368 to :538; §0j :539-585 rewritten as
     :538-686; +101 from :586 to :612; +102 from :613 to :2426; +170 from :2427. So §0h :1763 → :1865, §0g :2429 →
     :2599, the §1 S8 row :2914 → :3084, §3.3 :3505 → :3675, §3.4 :3572 → :3742, §5 S8 :3952 → :4122 and S14 :3983 →
     :4153.
   - S4-COPY-AUDIT.md: :124 rewritten as :124-129; +5 from :125 to :256; :257 rewritten as :262-264; +7 from :258 (the
     approved canvas words, :260-273, are :267-280); review 7 is :323-330.
   - i18n-dict.ts and every src/ file this plan cites: no line has moved.
4. **§0h runs to 77 on main**; point 77 is Ali's ruling. WP0 numbers this plan's points after the last one at S8's base.
   "76 on origin/vodacom-s7-docs" (Correction 1; WP0 step 4) is now history.
5. **"Swahili review" 7 is `e5b5c9da`'s.** S8's own review is the next at its base, 8 today, and every "review 7" in this
   plan reads "review 8" (A20).

*From:* Plan critique 14 (four wrong citations, five loose ranges, the stale SHAs), each re-read. The base's movement and
the review and §0h numbering are the re-read's own (`git log 2322cf09..origin/main`; `git diff -U0`).

### A2 · A lost answer stays one bet until the server says what happened

*Overrides:* "Exactly once" items 2, 3 and 7; the refusal matrix's Retry column, its rows 1, 2, 6 and 23, and every row
in doubt; WP2 step 1 (`sheetFrame`, `nextKey`, `requestFor`) and its §3 gate; WP3 (the route's `?me=1`, journey-sheet.ts);
WP7 steps 5 and 6 (now WP7b, A17); WP11 step 5 (now WP11a); Open point 35; Risk 2.

The hazard, re-read at 2322cf09. Every gate before the wallet lock runs before the key lookup (market-service.ts:1363,
:1366-1395): admission's BUSY (:1078-1084), the rate limit (:1155), maintenance (:1167-1168), a break (:1185-1196), the
session limit (:1212-1229), the account (:1236, :1281-1316), the market (:1327-1331), the bounds (:1334-1349) and the
side (:1350). So a same-key retry of a bet that had already landed could be refused by any of them. The matrix then ended
the intent, and the next tap minted a new key: a second bet. Rows 1 and 6 also told the player nothing had been taken
(`journey.sheetBusy`; `error.failMaintenance`, "Nothing has been charged", en :2515, sw :5057). The bet's own
`wallet:balance` (:1856) could turn the retry frame into a low frame over a bet that went through. And a replay answers by
key alone, with no side or stake (:1045-1054, :1384-1393), so an edited stake sent under the old key would print a bet
that does not exist.

1. **In doubt.** After matrix row 2 or row 23, or the placing watchdog (A7), the intent is *in doubt*. The `inDoubt` frame
   overrides every derived frame: neither the facts nor `wallet-balance` move it. The field, the chips and the side stay
   locked to the frozen quote. Its only controls are "Jaribu tena · {amount}" (`journey.retryCta`, A20: the same key and
   the same quote) and the ✕. Its line is `error.failSystemError` ("check your wallet before retrying").
2. **The host settles the doubt itself.** `?me=1&key=<uuid>` adds `keyPosition` to `me`:
   `positionStore.findByIdempotencyKey(key)` (market-dal.ts:609), answered as `{ positionId }` only when the row's
   `userId` is the session's and its `houseBotId` is null, else null; a key that is not a UUID is null without a lookup.
   - It is read at once, then every 5 s for a minute and every 30 s after, while in doubt and the document is visible,
     and on `wallet-balance` and on focus, with the sheet open or closed.
   - A position is that bet's receipt (row 24's view; A3 item 3). Found while the sheet is closed, it clears the doubt and
     the marker and dispatches `50pick:refresh`, and the sheet's holder line names the bet at the next open.
   - So the bet's own `wallet:balance` turns a lost answer into its receipt, with no retry. `Position.idempotencyKey` is
     unique (schema.prisma:1897), so one key is one position even under a race.
3. **What ends the doubt:**
   - `ok` (new or replayed), or a position from the key read;
   - a refusal from inside the wallet lock, after the lookup: `idempotency_key_conflict` (:1374-1377), `wallet_frozen` or
     `wallet_missing` (:1405-1411), `loss_limit_daily` (:1488-1491), `balance_insufficient` (:1521-1530, or the abort at
     :1833-1837), `selection_closed` (:1753-1762);
   - or `keyPosition: null`, read at least `DOUBT_SETTLE_MS` after the last same-key attempt settled on this page (its
     promise resolved or rejected), or after this page loaded when the doubt came through a reload (A3 item 5).

   `DOUBT_SETTLE_MS` is 10 minutes. The server bounds a bet it has received only through its timeouts. Admission waits
   15 s by default and at most 60 s (admission.ts:78; nothing in src/ but a dev-test route sets it). Then a bet may make
   four attempts (retry.ts:54; P2024 and P2028, a pool or a transaction out of time, are retried, :48), and each attempt
   is its reads before the lock, each allowed Prisma's 10 s pool timeout (prisma.ts:60-77), then the lock's transaction,
   10 s for a connection and 30 s to run (locks.ts:195-196). With every wait at its ceiling on every attempt, that is
   about nine minutes; in practice the key read or a same-key retry ends a doubt in seconds. The clock starts at the
   settle, not the send: Next sends no second action while one is pending (app-router-instance.js:134-162), and a
   request still on its way has not reached the server. test:bet-sheet §3 recomputes that ceiling from those constants
   and the awaited reads `buyPositionInner` makes before `withLock`, and is red if `DOUBT_SETTLE_MS` falls below it.

   Anything else leaves the doubt in place: admission's BUSY or any gate at :1151-1350, a throw, a redirect, a skew. The
   key is kept, the key read goes on, and no sentence says nothing was placed or charged (never `sheetBusy`, never
   `failMaintenance`). The line is `error.failSystemError`, beside the refusal's own line where that line makes no money
   claim (rows 5 and 7-15). When the doubt ends without a bet, the intent ends as its last answer says, and the marker is
   rewritten without its key (A3 item 4).
4. **Closing does not forget it.** Closing while in doubt (the ✕, or a page move, A3 item 2) keeps the intent in the host
   and in the marker (A3). Reopening that market and side shows the in-doubt frame until item 2 or 3 settles it. Another
   market, or the other side, is another bet with its own key.
5. **"Exactly once" item 3 reads:** "A retry reuses the key after `system_busy` and `system_error` (rows 1-2). In doubt,
   only that key is ever sent for the intent until the server has said what happened (A2). An intent that was never in
   doubt ends at any other refusal, and the next tap mints a new key." Open point 35's decision stands: an unknown shape
   is `system_error`, so it is now in doubt.
6. **The matrix's "If in doubt" column:**
   - rows 1, 5-15 and 23: stay in doubt, key kept, the row's own line only where it makes no money claim (row 1's
     `sheetBusy` and row 6's `failMaintenance` are never shown in doubt);
   - row 2: in doubt. Row 3: the skew rule, the marker keeping its key (A7). Row 4: A6, the marker kept with its key;
   - rows 16-22: the doubt ends, then the row as written. Rows 24-25: the receipt.
7. **Proofs.**
   - test:bet-sheet §3 gains the in-doubt table. Plants: a pre-replay refusal that mints a new key; `sheetBusy` or
     `failMaintenance` shown in doubt; a derived frame replacing `inDoubt`; an edited stake sent under the old key; the
     settle window counted from the send; `DOUBT_SETTLE_MS` below the pinned ceiling.
   - test:journey-sheet §8: `keyPosition`. Plants: another user's key answered; a house bot's key answered; a malformed
     key looked up.
   - WP11a step 5 gains two cells. (a) The answer dropped with the balance just above the stake: the receipt arrives from
     the key read, no low frame, one position. (b) The answer dropped and the key reads held (`route`), then maintenance
     on, then a retry: the line is `failSystemError`, never "nothing has been charged", and the key is kept; then
     maintenance off and a retry: `replayed`, one position and one BET_PLACED row.
8. **Classic.** The classic dial has the same gap. S8 does not change it (A23).

*From:* Money critique 1 (A-M1), taken, with its window corrected: "`keyPosition: null` read at least 30 s after the last
attempt was sent (admission waits at most 15 s)" holds only for admission's default. The re-read found the clamp (60 s),
four attempts each with its own pool and transaction timeouts, and Next's one-action-at-a-time queue, so the window is
10 minutes and runs from the settle. In its cell (b) the key reads are held, or the key read would settle the doubt before the second retry
and the cell would never reach it.

### A3 · After a bet nothing reopens it: the address across pages, after a receipt and through a reload

*Overrides:* WP7 steps 3, 4 and 11 (now WP7a and WP7b, A17); pending-bet.ts (in WP7b); the text Privacy §7 gains (WP7b;
Open point 13); WP11 steps 2 and 5 (now WP11a); test:bet-sheet §10; Risk 7; Open points 11 and 13.

The hazard, re-read at 2322cf09:
- `pendingBetFrom` accepts `?bet=` on any path (pending-bet.ts:66-76).
- The host mounts in the root layout, which a soft navigation does not re-run (journey-preview.ts:243-246), and the
  deposit page reads no `bet` (wallet/deposit/page.tsx:62-80).
- Nothing closed the sheet when one of its own links navigated, while the Sell result host closes on a page move
  (app-shell.tsx:584-585).
- Nothing removed the stake from the address, or the marker, after a success. The key lived only in the host's memory:
  the marker has no key field (pending-bet.ts:86-94), and it matches for 24 hours (:150-154).

So a reload during the receipt, Back from "Tiketi zangu", Forward after "Endelea kucheza", "Weka pesa" itself, and a
reload or a Back-out while placing could each reopen a placed bet as unplaced, or re-key a bet still in flight.

1. **Where the address opens the sheet.** On mount and on popstate, only on the pages that draw journey picks: `/`, a
   question page (`/markets/<id>`), `/live` and `/watchlist`, as one exported `SHEET_PAGES` list in sheet-state.ts. Never
   on `/wallet/*`, `/profile/*`, `/positions/*`, `/help` or `/auth/*`, whatever the address says.
2. **A page move closes it.** Any pathname change closes the sheet, as the Sell result host closes. While nothing is
   placed, the entry keeps `bet`, so Back from the deposit page returns to the sheet at its stake. An intent that is
   placing or in doubt stays in the host and in the marker (A2 item 4).
3. **After a receipt** (from the answer, a replay or the key read), before the receipt draws, the host replaces the current
   entry's address with the address without `bet` (`replaceState`) and removes `kp-pending-bet`. A sheet opened from
   `?side=` strips `side` on close and on a receipt.
4. **The marker carries the key.** A commit tap (the CTA or "bet instead") writes `{ bet, at, k }` before the request, `k`
   being the intent's UUID. The deposit row's tap writes `{ bet, at }`, because it sends no bet. `readMarker` keeps a
   well-formed `k` and drops anything else. When an intent ends without a bet, the marker is rewritten without `k`.
5. **A keyed reopen.** A sheet reopened from the address, whose marker names the same id, side and stake and carries `k`,
   reads `keyPosition` first (A2 item 2). A position is that bet's receipt (item 3). None is the in-doubt frame, locked to
   that stake, its retry reusing `k`, until a null is read `DOUBT_SETTLE_MS` after this page loaded: the old page's
   request either died with it or had already reached the server.
6. **Privacy §7** also names "a random request id for the bet, so a bet interrupted by a reload is never placed twice", in
   en, sw and zh, in WP7b's commit with the marker.
7. **Proofs.**
   - test:bet-sheet §10 plants: `bet=` on `/wallet/deposit` opens a sheet; a pathname change leaves the sheet open; a
     receipt leaves `bet` in the address or the marker in storage; the stake left in the current address; a keyed reopen
     that mints a new key; `side` kept after a close.
   - WP11a step 5 gains these cells, each counted on the player's positions: follow "Weka pesa" (the deposit form is
     usable and no dialog is open); "Tiketi zangu", then Back (no sheet); a reload during the receipt (no sheet);
     "Endelea kucheza", then Forward (no sheet); the request held, the page reloaded, the request released (one
     position, and the reopened sheet shows its receipt); a page loaded with `?bet=`, Back while placing, then Forward
     (one position).

*From:* Money critique 2 (A-M2) and plan critique 1 (A-1): one hazard, merged, both taken whole. A-M2 item 2's "at least
30 s after `at`" becomes A2's settle window, counted from the page's load (A2's *From:*).

### A4 · A block shown before the tap records what a refused tap records

*Overrides:* Correction 13; WP3's Goal, Files (route.ts, journey-sheet.ts), step 1 (`session`), step 5 and Gates
(journey-sheet §6, rg-doors); Risk 4; Open point 8; Points for Ali 3.

The hazard, re-read at 2322cf09:
- The per-player sitting that stops a sign-out from restarting the session limit (E-408, responsible-gambling.ts:507-511)
  is kept alive only by the gate's write at each bet attempt, "a refused one included, or the refusal itself would end
  the sitting" (:516-520).
- With the block shown at open and the CTA disabled, no attempt reaches the gate, and the read never writes. A player past
  their limit who keeps opening the sheet, then signs out and in, is free 30 minutes after their last real attempt
  (`PLAY_SESSION_GAP_MIN`, play-session.ts:36). Today they stay blocked until 30 minutes after they stop trying.
- `rg.session_limit.enforced` is written only by a refused attempt (market-service.ts:1214-1221). It is one of the six
  actions the Board-facing RG engagement report reads (reports/catalogue.ts:1037-1044, :1091), so from the flip,
  enforcement would all but vanish from that report.

1. **The open's own read.** The host sends `open=1` on the one `?me=1` read each open makes, never on a refresh, a focus,
   a balance event or the key read. Every other read stays write-free.
2. **The session limit.** When the open's read finds the viewer past the limit (`readSessionStanding`), it runs
   `checkSessionTimeLimit` itself (responsible-gambling.ts:498-523, whose write at :518-520 holds the sitting) and writes
   `rg.session_limit.enforced` with the bet path's payload plus `at: "sheet"` (market-service.ts:1214-1221). Within the
   limit it writes nothing.
3. **Other blocks.**
   - An account block shown at open writes `bet.account_blocked` (the payload of :1285-1292, plus `at: "sheet"`).
   - A loss block (headroom below the minimum) writes `bet.loss_limit_blocked` with `{ stake, reason, at: "sheet" }`, the
     stake being the market's minimum and the reason the one `checkLossLimit` gives for it (:1490).
   - A break, maintenance and a held wallet write nothing, because the bet path writes no row for them (:1167-1168,
     :1185-1196, :1405-1411).
   - No action name is new, so the RG census (test:house-bot-reports §0: `RG_AUDIT_ACTIONS` both ways) is unchanged.
     catalogue.ts's "Writers, measured" note (:1033-1035) gains the sheet route.
4. **The route says so.** route.ts's header ("⛔ GET only: nothing here writes", :11) becomes: the open's read of a blocked
   viewer writes what a refused tap writes, and nothing else writes.
5. **The words around it.** WP3's Goal reads "without the play-clock write, except the open's read of a blocked viewer
   (A4)". `getRgSettings` creates a missing row and applies a deferred limit change that has come due
   (responsible-gambling.ts:64-94 and its `effectivize`), as every RG read does (money note 13b). Correction 13 and Risk
   4 read accordingly.
6. **Proofs.**
   - test:rg-doors gains the sign-out case through the sheet: past a 30-minute limit, the player opens the sheet
     (blocked), signs out and in, keeps opening it, and is still blocked 31 minutes after the last bet. The plant (the
     open read's gate call removed) frees them, and red:rg-doors carries it.
   - test:journey-sheet §6 plants: an enforced open read with no audit row; a write within the limit; a write on a read
     without `open=1`.
   - db:probe-sheet-facts checks the same on Postgres (A11).
   - §0k records that the RG report counts a sheet's enforcement.
7. Open point 8 stands with this record (amended below). Its overrule, showing blocks only after the server refuses, would
   also close the hazard.

*From:* Money critique 3 (A-M3), taken, with two precisions from the re-read. A break has no bet-path row to write
(market-service.ts:1185-1196 audits nothing), so "or a break" writes nothing. And "at most once per sheet open" needs the
server to know which read is the open's, hence `open=1`.

### A5 · The loss limit's words: the live refusal Ali ruled on, and the loss room without a calendar day

*Overrides:* Correction 14's first bullet (changed in place); WP4 Files (changed in place) and Done-when; matrix row 19 and
the branch table's loss rows (their sentence); "New dictionary keys" (`sheetLossBlock` in "S8 drafts", `lowLossRoom`,
"Reused, never copied"); Risk 14; Open point 22; Points for Ali 6. It overtakes the plan critique's A-12 (its "fix it
live now, or with S12" point).

1. **Ali's ruling, recorded (2026-10-12, asked by question: "fix it now").** The live classic refusal
   `error.failLossLimitDaily` said "It resets tomorrow" / "Kitaanza upya kesho" / "明天重置" (en :2509, sw :5053, zh :7458
   at 2322cf09). That was untrue at any hour for a rolling-24-hour gate (responsible-gambling.ts:586-588). It was fixed
   live in its own commit, `e5b5c9da` on origin/main (2026-10-12 15:26 EAT), not with S12:
   - en "You've reached the daily loss limit you set. It counts the last 24 hours — you can review it under Responsible
     gambling.";
   - sw "Umefikia kikomo cha hasara cha siku ulichojiwekea. Kinahesabu saa 24 zilizopita — unaweza kukiangalia kwenye
     Uchezaji salama.";
   - zh "您已达到自己设定的每日亏损上限。该上限按过去 24 小时计算——可在“负责任博彩”中查看。".

   The same commit withdrew S4-COPY-AUDIT.md's S12 line for the key (:124-129 on main), signed the sentence as "Swahili
   review" 7, and filed §0h point 77. S8 plans none of this: it is done.
2. **The sheet reuses it.** The loss block (matrix row 19; the branch table's "headroom below the minimum" row) says
   `error.failLossLimitDaily` as `e5b5c9da` wrote it, under `market.udErrRgLimitTitle`. `journey.sheetLossBlock` leaves
   "S8 drafts", and `error.failLossLimitDaily` joins "Reused, never copied": one sentence, classic and journey alike.
   `e5b5c9da`'s records say S8's `sheetLossBlock` "will use" the clause; WP4 annotates S4-COPY-AUDIT.md's review 7 and
   §0h point 77 to say the sheet reads the key itself.
3. **Correction 14's first bullet** (changed in place) says the canvas's "Kitaanza upya kesho saa 00:00"
   (s4-4-block-loss.dc.html:26) states a reset the gate never makes, that the live refusal already tells the truth since
   `e5b5c9da`, and that the sheet reuses it.
4. **WP4** (changed in place) no longer withdraws "saa 00:00" from S4-COPY-AUDIT.md: `e5b5c9da` did. WP0's precondition
   (step 1) adds that `e5b5c9da` is on main (it is), and §0k names it.
5. **The loss room names no calendar day either.** `lowLossRoom`'s approved "…hadi {amount} leo" / "…today"
   (S4-COPY-AUDIT.md:269 at the base) states a day for the same rolling window (shortfall.ts:84-89). For review 8:
   - sw "Kikomo chako cha hasara kinaruhusu dau la hadi {amount} kwa sasa.";
   - en "Your loss limit allows a bet of up to {amount} right now.";
   - zh "您的亏损上限目前最多允许投注 {amount}。".

   Correction 14 names both sentences.
6. Open point 22 is rewritten, Points for Ali 6 is withdrawn, and new Open point 41 records the ruling (below). Risk 14
   names `e5b5c9da`.

*From:* Ali's ruling of 2026-10-12 as the coordinator recorded it, read back from `e5b5c9da`; money critique 8 (A-M8) and
the loss-room half of plan critique 12 (A-12), taken. Plan A-12's "WP4 replaces the whole :124 correction" and its "fix
it live now, or with S12" Point for Ali are overtaken by the ruling. The sheet reuses the live key rather than keep a
journey copy that would differ only in the page's name (A20 settles the name).

### A6 · A redirect rejects the call: a session lost mid-bet (matrix row 4)

*Overrides:* matrix row 4; WP2 step 2 (`refusalOutcome`'s order); the request's catch (WP7b); VODACOM-PLAN §3.3 :3537
(annotated by WP0); test:bet-sheet §10; WP11a.

Re-read: in Next 16.2.4 a Server Action that redirects rejects its promise with a handled `NEXT_REDIRECT` error and
navigates by itself (server-action-reducer.js:215-238; `createRedirectErrorForAction`, :308-312). It never resolves to
nothing. As written, a signed-out or revoked tap fell into row 2's catch: "check your wallet" and "Jaribu tena", for a
bet the server never ran, while the sign-in page loads.

1. Row 4 reads: "markets/actions.ts:87 · the call rejects with a `NEXT_REDIRECT` error."
2. The host's catch tests for it first: the error's `digest` starts with `NEXT_REDIRECT` (the repo's own test,
   contacts-import-dialog.tsx:159-161). It then:
   - shows nothing, and is never row 2;
   - keeps the marker, without its key unless the intent was already in doubt, because the redirect (markets/actions.ts:87)
     comes before `buyPosition` runs;
   - does not rethrow: the host sits outside every route boundary (Correction 26), and the reducer, under the app
     router's own RedirectBoundary (app-router.js:379), has already navigated.
3. After sign-in, the address (sign-in-path.ts:9-14 keeps the query) and the marker reopen the sheet at the stake, never
   placed. A keyed marker reads `keyPosition` first (A3 item 5).
4. WP0 annotates VODACOM-PLAN §3.3's "An auth-loss redirect (`r == null`) is treated as navigation, not failure" (:3537
   at the base): in Next 16 the call rejects.
5. Proofs: test:bet-sheet §10 plants the wrong order (the redirect test after the `system_error` mapping). WP11a: end the
   session in a second context, then tap (no wallet line), sign in (the sheet at the stake), one tap (one position).
6. The classic dial and the quick bet appear to show this rejection as a failure. WP0 measures it on a dev server (A23).

*From:* Money critique 4 (A-M4), taken. Item 2's marker without its key is the re-read's own: a redirect proves the
server ran nothing, and a keyed marker would lock the reopened sheet in doubt for no reason.

### A7 · Placing has a watchdog; deploy skew once the reload is spent

*Overrides:* "Exactly once" items 2 and 6; matrix row 3; WP7 step 7 (now WP7b); Risk 8; Open point 14; WP11a.

Re-read: the action's fetch has no timeout (server-action-reducer.js:70-74). While placing, the plan refused the scrim,
Escape, the ✕ and Back ("Exactly once" item 2), so on a stalled line the only exit was a reload (A3's hazard). Next
queues a second action behind a pending one (app-router-instance.js:134-162), so a retry pressed during a hang only
queues. And RouteError reloads once per build, and not at all without a build id (route-error.tsx:131-134), which the
plan left undefined.

1. **At 1.5 s** (the classic confirm's `BUSY_HINT_MS`, bet-confirm-modal.tsx:41-44, :153) the placing frame adds a wait
   line, `journey.sheetPlacingSlow`, for review 8: sw "Bado tunaweka dau lako — inachukua muda kidogo."; en "Still
   placing your bet — this is taking a moment."; zh "仍在为您投注——需要一点时间。". It is not the classic
   `dialog.busyHolding`, whose "Your stake hasn't moved" (en :2642, sw :5146) nobody knows while a request is out.
2. **At 20 s** (admission's default wait, 15 s, plus the bet's usual time) the intent goes in doubt (A2). The ✕ returns,
   the key read starts, and "Jaribu tena" stays disabled until the first request settles, because Next would only queue
   it behind the first.
3. **Deploy skew.** `UnrecognizedActionError` proves the server ran nothing: Next raises it only on its not-found header
   (server-action-reducer.js:76-83).
   - Not in doubt: the marker is rewritten without its key, then the host reloads once per build under RouteError's
     rule, unchanged. When that reload is already spent for this build, or the build has no id, the intent ends with
     `common.temporarilyUnavailable` ("Haipatikani kwa sasa"), never "check your wallet".
   - In doubt: the doubt holds and the marker keeps its key; a reload (or none) changes nothing about it (A2 item 3).
4. WP11a: the request held for 60 s → in doubt at 20 s → the ✕ closes → the held request lands → reopening shows its
   receipt; one position.

*From:* Money critique 5 (A-M5), taken, with two corrections: the wait line's words (the classic line makes a money claim
that nobody can check mid-request), and "admission's 15 s ceiling" is admission's default (A2). Plan critique 15's skew
line ("say the sheet then shows row 2's line") is not taken: row 2's line tells the player to check their wallet for a
request the server never ran.

### A8 · Re-reads are fresh and decide; the refusals settle in one pure step

*Overrides:* matrix rows 10, 12, 15, 19, 20 and 21 (their re-reads); WP2 step 2 and test:bet-sheet §2's goldens; WP7
step 5's failed read (now WP7a); Risk 10; WP11a.

Re-read at 2322cf09:
- Rows 10 and 12 share one input. "Account not found." (market-service.ts:1236) and "Market not found." (:1328) are both
  `{ code: "NOT_FOUND" }` with no reason, which `reasonForCode` maps to `not_found` (failure-reasons.ts:501, :540-543). So
  a pure `result → outcome` cannot tell them apart, and rows 12, 15 and 19-21 decide only after a re-read.
- The public URL is shared-cacheable (`public, s-maxage=5, stale-while-revalidate=5`, route.ts:24), so a re-read of it can
  say `bettable: true` for up to 10 s. `sheet.ip` (rate-limit.ts:150) meters `?me=1` too (route.ts:28-31).
- A 404 also means a voided, resolved or closed question: `sheetPublic` answers null for any market that is not LIVE
  (journey-sheet.ts:95-97), where "Sasa tunasubiri matokeo" may be untrue.

1. Every re-read the matrix asks for is a `?me=1` read (private, no-store; route.ts:25, :39-40).
2. WP2 adds a pure `settleRefusal(outcome, reread)` after `refusalOutcome`. §2's goldens become (result, re-read) →
   frame, with a plant that swaps rows 10 and 12.
   - `NOT_FOUND` or `INVALID` with no reason (rows 10 and 12), and row 15's `market_not_live`: a fresh 404 or
     `bettable: false` → the closed frame, whose body is `journey.sheetNotTaking` (A20) instead of `sheetClosedBody`
     while the seed's `closesAt` has not passed. A fresh `bettable: true` → `NOT_FOUND` is row 10's block, and the other
     two are the inline `journey.sheetNotTaking`, ending the intent. A failed read → the inline `journey.sheetNotTaking`,
     ending the intent.
   - `loss_limit_daily` (row 19): headroom at least the minimum → the loss room; less, or a failed read → the loss block,
     never the loss room.
   - `balance_insufficient` (rows 20-21): the plan from the re-read. A failed read → the low frame with `lowTitle` alone
     and no option, until a read lands (on focus, on `wallet-balance`, every 10 s); never "enough".
   - In doubt, none of these ends the doubt unless A2 item 3 says so.
3. Risk 10 names `?me=1` under `sheet.ip`; WP11a drives one 429 on a re-read.

*From:* Money critique 6 (A-M6) and plan critique 6 (A-6), merged and taken. "A voided question" is widened to every
market that is not LIVE, as `sheetPublic` reads it; the not-live line is A20's journey copy.

### A9 · The sheet computes no balance: the read is the figure, loading is not "unavailable", a hidden balance stays hidden

*Overrides:* WP7 steps 5 and 6 ("spendable = it + `bonusBalance`"; `spentSinceTruth`); the branch table's `unknown` row;
WP6 step 2.8 (the balance row) and step 4 (the low frame's figures); VODACOM-PLAN §3.3 :3551 (annotated by WP0).

Re-read: the `wallet:balance` event carries cash only (event-bus.ts:36), so adding a remembered bonus overstates spendable
after any bonus spend. The bet's own event is emitted before the action returns (market-service.ts:1856, :1997), so a
deduction on top of an event-fed figure subtracts the stake twice, and then offers a deposit to a player who can afford
the bet.

1. Strike "spendable = it + `bonusBalance`" and `spentSinceTruth`. `wallet-balance` only triggers a `?me=1` read.
2. After a success the host reads `?me=1` at once. The answer's `balance` is the cash left after the debit (:1620,
   :1825), not spendable, so the sheet shows no figure from it. Until the read lands, a new sheet's balance row is
   loading.
3. **Loading is not unavailable.** Until the first `?me=1` answers, the balance row shows its label with the kit's
   loading placeholder and no words, and the CTA is as in `unknown`. `unknown` (s4-4-sheet-unknown-balance's "—" with
   `common.temporarilyUnavailable`) starts only after a failed read. `sheetPlan` takes facts that are loading, failed or
   read.
4. **A hidden balance stays hidden.** With the hide-balance preference on (cash.tsx), `lowBody`'s `{have}` and
   `lowMinNote`'s `{left}` render through `<Cash>`. `{short}` and the deposit amount stay visible.
5. WP0 annotates §3.3 :3551 ("the optimistic deduction until server truth"): superseded by the read (S8-PLAN A9).
6. Proofs: test:bet-sheet §10 plants an event-fed spendable; a deduction applied after a later read; "unavailable" drawn
   before the first read; `{have}` printed outside `<Cash>`.

*From:* Money critiques 7, 14 and 15 (A-M7, A-M14, A-M15), taken. A-M7's "the host takes the answer's `balance`" is not:
that figure is cash only.

### A10 · An old pending deposit is described by its age

*Overrides:* the branch table's `pending` row; WP2 step 3 (shortfall.ts) and test:bet-sheet §4; WP3 step 3
(`newestProcessingDeposit`); WP6 step 5 (the pending frame); Open point 24; WP11 step 6 (now WP11a); new Open point 42.

Re-read: in live money mode a deposit can stay PROCESSING indefinitely. It does so with no provider reference
(wallet-service.ts:1326-1328), when the provider cannot be asked (:1356-1358), while the provider still says pending
(:1364), or when a credit is refused for a mismatch (:1335-1347). `shortfallPlan` returns `pending` (shortfall.ts:191-192)
before "bet instead" is computed (:195-196). So a deposit stuck for hours made every short stake say "Approve the prompt
on your phone" (`common.depositPendingBody`, en :296, sw :3390), disabled the bet, and offered nothing.

1. `newestProcessingDeposit` returns `{ amount, txnId, createdAt }`. The `pending` plan carries `createdAt`, and the
   bet-instead option computed exactly as the `short` branch computes it (shortfall.ts:195-196), so no figure is
   computed in a component (test:shortfall §5, with plants).
2. **The body follows the deposit's age** on the sheet's server-offset clock (`closedAt`'s), as the canvas grades the
   same wait (s4-6-wait-long; s4-6-wait-over30):
   - under 10 minutes: `common.depositPendingBody`, the live sentence;
   - 10 to 30 minutes: `journey.lowPendingWaitBody`, sw "Inaweza kuchukua hadi dakika 30 — usianzishe malipo mengine."
     (s4-6-wait-long's line, without its emailed receipt, Open point 24); en "It can take up to 30 minutes — don't start
     another payment."; zh "最长可能需要 30 分钟——请勿发起另一笔付款。";
   - from 30 minutes: the approved "Malipo bado hayajathibitishwa" as the title (`journey.lowPendingLateTitle`) and its
     sentence as the body (`journey.lowPendingLateBody`: "Imepita dakika 30. Usianzishe malipo mengine — pesa
     zikikatwa, zitaingia kwenye salio lako zikithibitishwa."; S4-COPY-AUDIT.md:268 at the base; s4-6-wait-over30). en
     "Payment not confirmed yet" / "It's been 30 minutes. Don't start another payment — if money was taken, it will reach
     your balance once confirmed."; zh "付款尚未确认" / "已超过 30 分钟。请勿发起另一笔付款——如已扣款，确认后将计入您的余额。".

   Review 8 signs all three.
3. **From 30 minutes, "bet instead" shows beside the notice**, and the deposit offer stays withheld (Open point 42).
4. Proofs: test:bet-sheet §4 crosses 10 and 30 minutes on a skewed phone clock. WP11a step 6 drives the fresh band
   through the mock async rail (payments.ts:296-312) and lists the 10- and 30-minute bands NOT DRIVEN, each with its
   in-process proof: no door ages a deposit, and S8 adds no dev-test route.

*From:* Money critique 9 (A-M9), taken, with its bands corrected. "Malipo bado hayajathibitishwa" and its sentence say
"Imepita dakika 30", which is untrue before 30 minutes, and the canvas draws them only past 30 (s4-6-wait-over30). The
10-30 band is s4-6-wait-long's.

### A11 · The Prisma reads run before production

*Overrides:* WP3 step 3 ("`test:dal-parity` holds the twins equal": that suite compares source text and never runs a
query, dal-parity.test.mts:1-3) and WP3 Gates; WP12 step 1; §0k.

1. WP3 adds `db:probe-sheet-facts`: scripts/live/sheet-facts-pg-probe.mts, run by `pg-probe-run.mts` on a scratch
   Postgres, the `db:probe-*` pattern (package.json:162-171), under the heavy-job lock. It checks:
   - `newestProcessingDeposit` returns only the user's own newest PROCESSING deposit, with `createdAt`. Plants: a
     PROCESSING withdrawal, a CONFIRMED deposit, another user's deposit, an older deposit;
   - `keyPosition` (A2): the user's own key answers its position; another user's key and a house bot's answer null;
   - the viewer's read within the session limit changes neither `playStartedAt` nor `playLastSeenAt`; past it, the open's
     read (A4) writes what the gate writes and exactly one `rg.session_limit.enforced` row.
2. It runs in WP3's gates and again in WP12's battery; §0k records both runs.

*From:* Money critique 10 (A-M10), taken, and extended to the two reads A2 and A4 add.

### A12 · Focus and announcements: the exception written where the rule lives, every frame re-armed, each message spoken once, the receipt held while read, forced colours

*Overrides:* WP6 step 1 (first focus), step 6 (the receipt's close), step 7 (the live region) and Gates; Correction 10;
Open point 5; WP11b (the tiles); the CLAUDE.md half of the plan critique's A-12.

1. **The exception is written where the rule is.** WP6's commit annotates CLAUDE.md's keyboard rule ("Money dialogs open
   with focus on their primary", :932): "…except the journey's bet sheet: a stake surface whose primary is the commit
   opens on its heading (VODACOM-PLAN §3.3 :3510; S8-PLAN Open point 5), and its CTA's click is the act."
   test:enter-where-pressed adds 2.2s as its own check, with a red plant (`initialFocus` moved to the CTA). 2.2's three
   pins (:950-954) are untouched.
2. **Every frame re-arms focus.** The dialog's `labelledBy` is the frame's own `<h2>`, as each board draws it: the
   question in the edit, low, loss-room and pending frames; the block's or the closed frame's title, with the question
   as a line above it (s4-4-block-*; s4-4-sheet-closed); the receipt's title (s4-4-sheet-receipt). Every frame change
   re-arms focus onto that h2 through Modal's `refocusKey` (modal.tsx:274-281, :383-391), so the 400 ms beat swallows a
   quick second Enter and a screen reader hears the new frame. test:bet-sheet §8 pins it (plant: a frame change with no
   re-arm).
3. **Each message is spoken once.**
   - The closed frame and every block speak through their message's own `role="alert"`, as the boards draw them, and
     that message is the dialog's `describedBy` (modal.tsx:219-221: "the bet refusal names its reason here").
   - The inline refusal line is its own `role="status"` (s4-4-inline-refusals).
   - The one polite region (§3.3 :3563) speaks the low, loss-room and pending frames, the estimate update and the
     receipt, and repeats neither of the others.
4. **The receipt holds while it is read.** Its 5 s close follows the classic receipt's rule
   (operation-result-modal.tsx:228-320): a `:focus-visible` focus or real pointer movement inside the panel pauses it,
   banking the time left, and leaving resumes it. It never pauses on a plain focus (item 2 focuses the receipt's h2 by
   script, so it would never close) or on `pointerenter` (which fires under a resting cursor). The sheet does not
   import the classic receipt, whose source test:sell-grace-truth (:1822) and test:visual-pass-r4i (:622) pin.
   test:bet-sheet §8 holds the sheet to the same rule, with two plants: a plain `focusin` pause, and a `pointerenter`
   pause. This replaces WP6 step 6's "unless it is being read (CLAUDE.md:694)".
5. **Forced colours.** The chosen chip's ring is an `outline`, never a box-shadow alone: forced colours strip box-shadow
   and keep outline (globals.css:2071-2078, E-129). `attention` adds a 2px border width, not colour alone. WP11b tiles
   the low frame, the chips and the big buttons under `forced-colors: active`.

*From:* Money critique 11 (A-M11) and plan critique 9 (A-9), with the CLAUDE.md half of plan critique 12 (A-12), merged.
Two parts are corrected. A-9's "the live region also speaks the closed frame" would speak it twice, since the boards draw
it as an alert. A-9's "pauses while focus or the pointer is in the panel" is the hold the classic receipt rejected, for
the two reasons item 4 gives.

### A13 · The ✕: the kit's CloseX in the chip row, with a ref, and ruled

*Overrides:* WP6 step 1 (`safeFocus={closeRef}`; "the ✕ withheld (modal.tsx:225-237)"), step 2.1 ("the kit ✕") and
Gates; WP5 Files; "What does change for a classic visitor" (a); new Open point 38.

Re-read at 2322cf09:
- Modal's own ✕ is pinned to the panel's corner, and `CloseX` takes no ref (modal.tsx:195).
- The money confirms pass `showClose={false}`, draw `<CloseX withheld={pending}>` in their header row, and give
  `safeFocus` a real `<button ref>` (bet-confirm-modal.tsx:230-232, :300, :435), which test:enter-where-pressed 5.10 reads
  (:1085-1090).
- test:visual-pass-r6c 10.1 fails any `<Modal>` host it has not ruled (visual-pass-r6c.test.mts:503-543), as S7 found
  (a33a9ced :511).
- The canvas draws the ✕ beside the chip, not the title (pick-2; s4-4-sheet-desktop): neither place F20 allows
  (modal.tsx:177-185).

1. The sheet passes `showClose={false}` and draws `<CloseX ref={closeRef} withheld={placing}>` in its chip row;
   `safeFocus={closeRef}`.
2. WP5 adds an optional `ref` prop to `CloseX` (React 19 passes `ref` to a function component as a prop). No call site
   passes one today, so nothing changes. modal.tsx's chunk changes with its output unchanged, recorded in §0k's served
   bytes.
3. test:visual-pass-r6c's RULED list (:507-512) gains bet-sheet.tsx as "header-row", and modal.tsx's F20 note records a
   third place: "a sheet whose header row is its chosen side" (the canvas). test:enter-where-pressed 5.10 gains the
   sheet's line (its way out is the ✕). WP6's gates name test:visual-pass-r6c.
4. Open point 38 (new).

*From:* Plan critique 2 (A-2), taken whole.

### A14 · A tall frame never runs off a phone: the panel is capped and its middle scrolls

*Overrides:* WP6 step 1 (`panelClassName`) and step 3 (the keyboard); WP11 step 2 (V20; now WP11a).

Re-read: below lg the Modal's wrapper is `flex items-end overflow-y-auto` (modal.tsx:529-531), so content above a docked
panel taller than the screen can never be scrolled back to, and `.kp-wsheet` has no max-height (globals.css:6626). S7
met exactly this and capped `.kp-howto` at `calc(100dvh - var(--sp-12))` with one scroll region (how-to-play-sheet.tsx:20-26
and globals.css:7597 at a33a9ced). The hedge board is 390×769, and the low frames are about 600px tall at 390.

1. WP6 step 3a: the panel is capped at `calc(100dvh - var(--sp-12))`. With the keyboard up, the cap is the visual
   viewport's height, set by the listener that lifts the panel (step 3). One region between the chip row and the CTA
   scrolls (`data-edges`, registered in test:visual-pass-r5h as S7's sheet was). The chip row with its ✕, and the CTA,
   never scroll.
2. WP11a step 2: at 320×640 and 360×640, in every frame, with the keyboard up and down, the ✕ and the CTA are on screen.

*From:* Plan critique 3 (A-3), taken whole.

### A15 · WP5's inertness is proven in process, not by parity

*Overrides:* WP5 step 2, Gates and Done-when; the Summary's (b) proof.

Re-read: parity captures `/`, `/markets`, `/positions`, `/wallet`, `/profile`, `/account` and the 404
(qa-classic-shell-parity.mjs:454), and page bodies only for `/positions` (:459) and the BOOK (:483); WP1 adds the question
page. No deposit, withdraw or limits form is captured, so "parity v4 `--compare` (the classic Inputs on the deposit and
withdraw pages are in its cells)" proved nothing.

1. test:numeric gains a census of every `<Input` call site in src/, and renders each configuration the classic pages use
   through `renderToStaticMarkup` before and after WP5: the markup must be byte-equal. Plants: a stray `aria-invalid`
   when `attention` is unset; the grouped path reached without the prop.
2. Parity v4 leaves WP5's gates. Its Done-when reads "both props are proven inert when unset, by render equality, and
   right when set", and the Summary's (b) proof reads "test:numeric's census and render equality, with plants".
3. `attention` sets only the border and the caller's `aria-describedby` (A18), so WP5 step 2's `aria-invalid="false"` is
   struck.
4. Overrule: a FORMS phase in parity v4 (WP1), capturing the deposit, withdraw and limits forms.

*From:* Plan critique 4 (A-4), taken; its file-name half is A1's correction in place.

### A16 · The gates name the censuses a new part trips, and one red list runs at the start and at the end

*Overrides:* WP0 step 2 and WP12 step 1 (the red lists); the Gates of WP2, WP6, WP7 and WP8.

Re-read at 2322cf09:
- test:journey-funnel 8.census reads a fixed list of three callers (journey-funnel.test.mts:42) and pins
  `calls.length === 3` and `betFields.length === 2` (:223-225). The sheet's `funnelBetFields(fd, "sheet")` and its
  `sendFunnel` calls would go unread.
- r6c §10 rules every Modal host (A13); r5i §1 counts the betting pair per file (visual-pass-r5i.test.mts:19, :115, :136);
  r8b §1 holds every `.eyebrow` to one ink or a registered exception; r9a counts end chevrons; r5h registers scroll
  regions. S7's WP6 had to edit r5h, r6c and r9a (a33a9ced).
- WP0 step 2 ran red:failure-reasons but not journey-tickets or sell-grace-truth, and WP12 step 1 ran the reverse.

1. WP2 and WP7b name test:journey-funnel and red:journey-funnel. CALLERS gains sheet-state.ts and bet-sheet-host.tsx, and
   the counts are re-pinned in the open. `requestFor` writes `funnelBetFields(fd, "sheet")` literally, and the host makes
   one literal `sendFunnel("sheet_open", "<origin>")` call per origin (the census's literal-origin rule), never a
   computed one.
2. WP6 names test:visual-pass-r6c (A13), r8b (the receipt's "Dau lipo" eyebrow, a status green on s4-4-sheet-receipt), r9a
   (the deposit row's "›"), r5h (A14's scroll region) and r5i (the chip's sides). WP8 names r5i (journey-bet-buttons.tsx's
   `btn-yes` and `btn-no`). Every registry entry is added in the open, with its ruling.
3. WP0 and WP12 run one list, kept in §0k:
   - in process (`--prove-red`): bet-sheet (from WP2 on), journey-sheet, shortfall, pending-bet, journey-estimate,
     deposit-ceiling, enter-where-pressed, implicit-submit, journey-shell, journey-home, journey-tickets,
     sell-grace-truth, simple-journey-flag, journey-funnel, markets-redirect;
   - harnesses that write source or copy it, each alone after committing, then `git diff --exit-code`: failure-reasons,
     rg-doors (A4 changes its suite), dal-parity, contrast.

*From:* Plan critique 5 (A-5), taken. The re-read sorts its list by how each twin runs (`red:failure-reasons` and
`red:rg-doors` write into real source, failure-reasons-red.mjs:53 and red-rg-doors.mjs:81; `red:dal-parity` and
`red:contrast` copy to a scratch tree) and adds rg-doors.

### A17 · Packages: WP9 after WP7, WP7 and WP11 split, WP1's masks named first

*Overrides:* the Summary's "Order"; WP7's and WP11's headings, Goals and Steps (split); WP8's, WP9's and WP10's
dependencies; WP1 step 6.

Re-read:
- WP9 step 3 removes WP7's `data-sheet` and `data-bet-side` from a card on a break, and both packages edit
  journey-card.tsx, journey-home.tsx and the open-card pages, yet WP9 depended on WP4 alone.
- WP7 (M) bundled the money host, history, skew, an error boundary, the funnel, pull-to-refresh and Privacy §7 across
  seven test files, and WP11's tiles came to about 35 frames × 4 widths × 3 languages.
- The question page has live `[role=timer]` countdowns ([id]/page.tsx:978, :988), the Sell countdown, the chart's time
  axis and "Imefunguliwa {date}" (:1072), where S7's parity needed calibrations (52715180; c23d0756).

1. **WP7a — the host, opening and closing (M; depends on WP6):** the mount, the taps, open and close, the address without
   a stake, A3 items 1-2, the refreshes (A9), the opens' funnel counts, pull-to-refresh.
2. **WP7b — placing (L; depends on WP7a and WP3):** placing; in doubt and the key read (A2); the watchdog (A7); A6's
   catch; the stake in the address and the keyed marker (A3 items 3-6), with Privacy §7 in the same commit; deploy skew;
   the host's error boundary; the bet's funnel fields.
3. **Dependencies.** WP8 depends on WP7b and WP1 (and S7 WP10); WP9 on WP7a and WP4 (and S7 WP7, WP10); WP10 on WP7a.
4. **WP11a — the drives (L; depends on WP8, WP9 and WP10):** V20, the matrix, exactly once with every cell A2, A3, A6, A7
   and A8 add, the doors, and the tap frame (A21).
   **WP11b — the tiles (M; depends on WP11a):** every frame of the two tables, the receipt, placing, the keyboard frame,
   the question page and its buttons, and the home on a break — in sw at 320×640, 360×640, 390×844 and 1280, and in en
   and zh at 360×640 and 1280 — plus A12's forced-colours set and A19's 1280 question page. Each tile is read.
5. **WP1 step 6** names its masks before the first null pair: the `[role=timer]` texts, the Sell countdown, the chart's
   time axis and the server-rendered times on the question page. Anything else a null pair finds noisy is named and
   measured, never masked in bulk.
6. **Order (15 packages):** WP0, WP1, WP2, WP3, WP4, WP5, WP6, WP7a, WP7b, WP8, WP9, WP10, WP11a, WP11b, WP12.

*From:* Plan critique 7 (A-7), taken. WP7b also depends on WP3, whose route serves A2's key read and A4's open read.

### A18 · The canvas, as drawn: the holder note, the bounds line, `aria-invalid`, the stake box and the CTA

*Overrides:* WP6 steps 2.3, 2.4, 2.5 and 4; WP5 step 2 and Files (the Input `xl` size); WP0's annotations (§3.3 :3524);
new Open point 40.

Re-read at 2322cf09:
- The market page's hedge box is the amber warning ([id]/page.tsx:738, the `warning-*` tokens). The holder and hedge
  boards draw a hue-268 note with `role="note"` (s4-4-sheet-holder; s4-4-sheet-hedge :24). Amber in a new file would also
  trip test:visual-pass-r8a §3's warning census.
- The bounds line is neutral ink with an info glyph and `role="status"` (s4-4-sheet-below-min :28-30), as §0g :2545 says
  ("in the neutral family"); §3.3 :3524 says "the F3 warning severity".
- Every low, loss-room, pending and below-minimum board marks the stake `aria-invalid="true"` (pick-3 :52; s4-5-low-zero;
  s4-5-low-pending; s4-4-sheet-loss-room; s4-4-sheet-below-min; s4-5-low-min500).
- The boards draw a 60px stake box with a 26px figure and a 54px CTA (pick-2 :50, :52, :76). `Input size="lg"` is 48px
  with a 16px figure (input.tsx:488, :494). Field heights read the control ladder, 32/40/44/48/56, since DG-A-04 (Ali's
  ruling of 2026-08-29, input.tsx:479-485), and the type scale has no 26px rung (globals.css:229-244).

1. The holder and hedge lines use `Callout tone="info"` with `role="note"`, never the market page's amber box.
2. The bounds line is neutral, with the info glyph and `role="status"`, and it describes the stake
   (`aria-describedby`). WP0 annotates §3.3 :3524 with §0g :2545's family.
3. `attention` sets only the border and the caller's `aria-describedby`. The sheet sets `aria-invalid="true"` itself in
   the low, loss-room, pending and below-minimum frames.
4. The stake box is an additive Input `xl` that reads `--h-control-xl` (56px, the ladder's top rung), its figure on
   `--type-h2` (24px). The CTA is `Button size="xl"` (56px, globals.css:333). The canvas's 60px box, 26px figure and 54px
   button are 4px, 2px and 2px off the ladder and the scale. The nearest rungs are taken, and the drifts are recorded for
   Ali (Open point 40).

*From:* Plan critique 8 (A-8), taken, with its size corrected: the "additive Input `xl` size (60px)" would be a field
height on no rung, which DG-A-04 retired, so the box takes the ladder's 56px and the drift is recorded.

### A19 · The question page from 1024: the buttons stand in the aside

*Overrides:* WP8 steps 2 and 4, and Gates; WP11b; new Open point 39.

Re-read: from lg the page is a `1fr 360px` grid whose bet aside sticks on the right ([id]/page.tsx:690, :713-714). WP8
left a journey reader's aside holding only the D40 heading (and, on a one-sided question, its callout): an empty 360px
column, and an `<aside aria-labelledby>` named for placing a stake with no stake control in it. No desktop market board
exists (s4-10-market is 390×1340).

1. From lg the two big buttons stand in the aside, under the D40 heading and the one-sided callout. Below lg they stand
   after the holder block (WP8 step 4). They are two copies, a `hidden lg:grid` one in the aside and a `lg:hidden` one
   after the holder block, so only one is ever in the accessibility tree. Each sits inside its own `data-sheet` element,
   under its own copy of the D40 heading.
2. Below lg, in that arm only, the aside's wrapper takes `hidden lg:block` (a same-slot ternary on its class, today's class
   in every other arm), so no width has an empty landmark. The break and guest arms are untouched (WP8 step 2).
3. Gates: test:journey-home §10 pins one copy per width (plants: both copies shown at one width; the aside shown below lg
   in the journey arm); parity v4's QUESTION phase proves the classic wrapper unchanged; WP11b tiles the page at 1280.
4. Open point 39 (new).

*From:* Plan critique 10 (A-10), taken. Of its two layouts, the aside is the decision, because it is the column a desktop
reader looks to for the bet; the single column is the overrule.

### A20 · The words: the retry label, the bonus line, "swali hili" where the sheet reused "soko hili", the slow-placing and pending lines, the "Dau" label, one name for the limits page, the "≈", and review 8

*Overrides:* "New dictionary keys" (all four tables, "Reused, never copied" and "Not added"); WP4 Steps and Done-when;
matrix rows 1, 2, 12 and 15; WP6 steps 2.3 and 6.

1. `journey.retryCta`: "Jaribu tena · {amount}" / "Try again · {amount}" / "重试 · {amount}", `sheetFrame`'s third label
   (rows 1-2; A2's in-doubt frame). Only a bare "Jaribu tena" exists today (`common.retryNow`, sw :3447;
   `error.tryAgain`, sw :5030).
2. `journey.sheetBonusWager`, with "swali hili" and `{remaining}`, for review 8. It is the sheet's SJ-22 bonus line, which
   the market page draws as `error.failBonusWageringOneSide` ([id]/page.tsx:506-511), whose sw says "soko hili" (sw
   :5078) right under the sheet's "swali hili".
3. `journey.sheetNotTaking`: "Swali hili halipokei dau kwa sasa." / "This question isn't taking bets right now." /
   "此问题目前不接受投注。". It replaces `error.failMarketNotLive` wherever the sheet shows it (row 15 and A8's re-reads), whose
   sw is "Soko hili halipokei dau kwa sasa." (sw :5051), under the same SJ-19 rule as `sheetHedgeBody`'s "swali hili".
   The other reused `error.*` lines say no "soko" (re-read).
4. A7's `journey.sheetPlacingSlow`, and A10's `journey.lowPendingWaitBody`, `lowPendingLateTitle` and
   `lowPendingLateBody`, join "S8 drafts". A5 removes `sheetLossBlock` from it and rewrites `lowLossRoom`.
5. The receipt's "Dau" label is `common.stake` (sw :3154).
6. "Reused, never copied" names every namespace in full: `kycGate.frozenCta` (:4989, "Wasiliana na msaada";
   `error.contactSupport`, :5044, says the same and is not used), `common.depositPendingBody` (:3390), `common.stake`, and
   A5's `error.failLossLimitDaily`.
7. **One name for the limits page.** The sentences name the page by its title, "Uchezaji salama", as
   `error.failLossLimitDaily` (since `e5b5c9da`) and the approved `sheetDepositLimit` do. The button keeps its action,
   "Weka mipaka" (`rg.setLimits`). Review 8 confirms.
   ⚠️ **Corrected in place 2026-10-13 (S8 WP4's independent review; review 8 signed with it):** no Swahili page or label
   is named "Uchezaji salama" — the limits page's sw title is "Vikomo" (`profile.responsibleGambling`, its h1). So
   `sheetDepositLimit` says "…kwenye ukurasa wa Vikomo"; the live `error.failLossLimitDaily` and `error.errDepositLimit`
   keep their words until S12 (filed in S4-COPY-AUDIT), and the sheet's loss block reads the live key as it stands.
8. `estimateUpdatedLive` keeps the board's "≈ ": sw "Makadirio yamesasishwa: ≈ {amount}, ≈{mult}× dau lako"; en
   "Estimate updated: ≈ {amount}, ≈{mult}× your bet"; zh "预估已更新：≈ {amount}，≈{mult}× 您的投注"
   (s4-4-sheet-updated).
9. S8's Swahili review is number 8 (A1 item 5): every "review 7" above reads "review 8".

*From:* Plan critique 11 (A-11), taken. Its "Review 7 settles one name for the limits page" is decided now, by the live
sentence `e5b5c9da` shipped. Items 3 and 4 are the re-read's own: `failMarketNotLive` is the one reused `error.*` line
that says "soko", and the slow-placing and pending lines are A7's and A10's.

### A21 · The tap-frame budget is measured on a production build

*Overrides:* WP11 step 3 (now WP11a) and step 1's "one server" for that cell.

1. WP11a's tap-frame cell runs against a local production build (`next build`, then `next start` on the in-memory store,
   under the lock), its sha recorded in §0k. A dev-server reading is RECORDED, never PASS.

*From:* Plan critique 13 (A-13), taken whole.

### A22 · Notes taken

*Overrides:* as each item names.

1. **The low frame with no price** (money note 12). The compact row and `lowBetInsteadEstimate` print a figure only when
   `estimateFor` gives one. Over the cap they print `estimatePillOver`; for one-sided, empty-pool or hidden estimates,
   their state's own words, or nothing (estimate.ts:132-149). The branch table gains "`short`, deposit and bet instead,
   `belowDepositMin`": reachable, since a stake of 1,500 on a balance of 1,200 gives a deposit of 1,000 (`leftAfter`
   700) or a bet of 1,200 instead (shortfall.ts:195-196, :200-210). It is drawn with the eyebrow, the deposit row with
   `lowMinNote`, then bet instead.
2. **The census reads everything** (money note 13a). test:bet-sheet §2 also reads `buyPosition` itself, where the BUSY
   literal lives (market-service.ts:1078-1084), and every literal inside a ternary `reason` (:1346, :1410).
3. **S14's line names what it proves** (money note 16). WP0's docs commit adds to S14's production journey
   (VODACOM-PLAN.md:3992 at the base), through the sheet: one position and one BET_PLACED row whose id is the receipt's
   ticket; one refusal shown inside the sheet; the deposit link carrying the amount and `from=low-balance`; `?me=1`
   answering on the production database.
4. **WP10's cost** (plan note 15). Its patch is a full `router.refresh()` (refresh-poller.tsx:56-59), at most once in
   10 s; §0k records its RSC cost per page.
5. **`data-sheet`'s bytes** (plan note 15) are paid twice, in HTML and in RSC. WP7a sets a per-card byte budget,
   recorded in §0k (Risk 12).
6. **WP1's raw trace** (plan note 15) matches `\bdata-sheet(?![\w-])`, because the classic filter sheet sets
   `data-sheet-open` (filter-sheet.tsx:253; globals.css:4106).
7. **`bonusWarning`** (plan note 15). WP3 re-pins journey-sheet.test.mts:128 in the open when the boolean leaves the route
   (Open point 21).
8. **route-ghost's import** (plan note 15). WP8 points route-ghost.tsx:82's import of `[id]/loading` at
   `MarketDetailGhost` (market-detail-ghost.tsx), because `[id]/loading.tsx` becomes a server file.
9. **`aria-haspopup="dialog"`** (plan note 15) on the picks and the big buttons, exactly where the host is mounted (a
   journey request with a session). A guest's pick navigates, and carries none.

*From:* Money notes 12, 13 and 16 (A-M12, A-M13, A-M16) and plan note 15, taken. Money note 13b is in A4 item 5, and
notes 14 and 15 are in A9.

### A23 · The classic dial's two gaps are filed, not changed

*Overrides:* §0k's filings; new Open point 43; Points for Ali.

1. **A lost answer** (money 1's last bullet). The classic dial reuses its key only on Retry (conviction-dial.tsx:898),
   and a terminal refusal wipes the dial (:1049-1055), so the next confirm mints a new key (:838). A same-key retry
   refused before the replay (where maintenance says "Nothing has been charged") can therefore become a second bet.
2. **A session lost mid-bet** (money 4). The dial's catch (:1006-1010) runs before its `r == null` test (:1027), and the
   quick bet's (use-quick-bet.ts:433-438) before its own (:349), so both appear to show the redirect as a failed bet.
   WP0 measures it on a dev server first.
3. S8 changes neither. §0k files both for S12, with WP0's measurement (Open point 43). Ali may have them fixed live now,
   each in its own commit, as he ruled for the loss-limit sentence.

*From:* Money critiques 1 and 4 (their classic halves), taken as filed. The live-now overrule follows Ali's ruling of
2026-10-12.

### A24 · The base moved: S7 closed, the TZS 500 minimum, the two classic gaps fixed live, and Ali's answers (2026-10-13)

*Overrides:* A1's base and every number read at it; WP2 (the chips, the preset, the goldens); the low-balance table and
A1's `belowDepositMin` correction; WP6 and WP11 (the frames, the drive premises, the chip row); WP7 (Onyesha zaidi, the
address); WP10 (the observer); the WP7 and WP9 gates; WP7 and WP8 (the Up & Down row); A6 items 2, 4 and 6; A23; WP11a
step 5 cell (b); Open point 43; and the Points for Ali, item by item below.

Re-read for S8 WP0 step 3, in two parts. (1) Helper A, on its own VM, read-only, 2026-10-12: 729 citations at origin/main
`6da7f936` — 459 unchanged, 256 moved, 14 changed, 0 gone (`origin/vodacom-visual-tools`
`tools/s7-cloud-2026-10-12/results/s8-citations-6da7f936-summary.md`). (2) The coordinator, 2026-10-13: the nine cited
files that S7's close and the live fixes L3 and L2 changed since `6da7f936` (CLAUDE.md, COMPLIANCE-DECISIONS,
LANDING-TEN, VODACOM-PLAN, package.json, conviction-dial.tsx, sell-button.tsx, use-quick-bet.ts, market-service.ts),
each explicit `file:line` citation mapped from the plan's base to S8's base `9c167bef` through `git diff -U0`: 49 — 6
unchanged, 40 moved, 3 changed, 0 gone. The three changed are exactly the live fixes' edit sites: `buyPosition`'s
admission body (market-service.ts:1068-1088, now :1068-1106, L2), the dial's catch (conviction-dial.tsx:1006-1010, now
:1007-1020, L3) and the quick bet's (use-quick-bet.ts:433-438, now :431-443, L3). The moves: market-service.ts +62/+63
below L2's lines (the refusal matrix's cites: `"Account not found."` :1236 → :1298, the locked pre-check :1521-1530 →
:1584-1593, admission's BUSY :1078-1084 → :1096-1102, the session limit's fields :1222-1228 → :1284-1290, the SSE emit
:1849 → :1912 and the rest likewise), conviction-dial.tsx +1 (:232-249 → :233-250, :838 → :839, :898 → :899),
use-quick-bet.ts +1, package.json +4. Every bare `:N` number in this file is read at the base where it is used, by its
text (S7-PLAN A24's method). The changes that alter what a package does:

1. **The base.** S7 closed and went live at `a590790c` (§0j); L3 (`c604343b`) and L2 (`9c167bef`) went live after it, each
   its own release (§0h points 80 and 81). S8 branches from origin/main at `9c167bef`, and every number in this file is
   read there. A1 item 3's conversion table held for `e5b5c9da` only and is retired.
2. **The minimum stake is TZS 500** (`de44e087`, the owner's ruling of 2026-10-12; `PLATFORM_MIN_STAKE`, payout.ts:173),
   and Ali answered "start at 500" on 2026-10-12. The sheet's chips are `quickStakes(500, max)` = 500 · 1,000 · 2,500 ·
   5,000 and the preset at open is 500; the goldens are cut at 500; the minimum is read per market, since a market's
   override or an unreconciled stored value may still say 1,000. The deposit minimum stays TZS 1,000.
3. **Low balance at the 500 preset.** A zero balance is short by 500, below the 1,000 deposit minimum, so it falls under
   `belowDepositMin`. The rows-to-boards mapping (s4-5-low-zero against s4-5-low-min500), the frames and the drive
   premises are re-cut on that, and the loss room's threshold is 500.
4. **The chip row** differs from the deck's 1,000-based ladder: it is re-measured at 320 and 360, with a §0h point.
5. **WP7 and "Onyesha zaidi"** (`show-more.tsx`, §0h point 78). The home and journey `/live` page by a soft navigation to
   `?page=N`. The `?bet=` push and the address-without-bet replace keep `cat`, `q`, `page` and `from`, and the cards
   "Onyesha zaidi" draws are intercepted too (a drive cell).
6. **WP10's IntersectionObserver** picks up the cards that arrive after a soft navigation.
7. **The WP7 and WP9 gates** name `test:journey-home` §9 (S7's pins of the journey card on `/live`, `/watchlist` and the
   similar rail) beside §3, §4 and §7.
8. **The Up & Down row** on journey `/live` links to `/updown/<roundId>` while its picks point at `/markets/<id>?side=`:
   WP7's "leaves the click alone" and WP8's Up & Down translation cover it.
9. **The two classic gaps are fixed live, for every player** (Ali's answer to point 22: "fix now"; A23 item 3's overrule
   taken):
   - **L3** (§0h point 80): in Next 16 an action's redirect REJECTS the call, and the dial, the sell button and the quick
     bet each showed it as a failure (measured: "Could not place", "Couldn't cash out"/"CASH-OUT FAILED", "Bet not
     placed"). Each catch now asks `isActionRedirect` (`src/lib/action-redirect.ts`) first. So A6 item 6's measurement
     is done; A6 item 4's annotation of §3.3 is done; and the sheet's host uses `isActionRedirect`, not a digest test of
     its own (A6 item 2).
   - **L2** (§0h point 81): `buyPosition` answers any refusal of a keyed request made before the in-lock replay (but
     BUSY) with the bet that key already placed for that player — the same question, side and stake, never a house
     stake's (`landedKeyAnswer`). WP11a step 5 cell (b) — the answer dropped, the key reads held, maintenance on, a
     retry, `failSystemError` — no longer happens for a key that landed: the retry is answered with the receipt. The
     cell is re-cut: hold the FIRST request in flight (its key not committed) while maintenance comes on, then retry →
     the refusal arrives with the doubt open → `failSystemError`, the key kept; release the first → `replayed`, one
     position, one BET_PLACED row. And a new cell: a landed key retried under maintenance → the receipt, no doubt frame.
     The sheet's doubt state (A2, A3, A7) stands for the key still in flight, which L2 cannot see. The receipt's
     `replayed: true` is the sheet's to read like any success (one ticket, never a second).
   - Open point 43 is closed by both.
10. **Ali's answers to the Points for Ali, amended (2026-10-12):** 17 (Tiketi zangu opens that ticket), 18 (the ✕ beside
    the chosen side), 19 (the two big buttons in the right-hand column from 1024), 20 (our nearest standard sizes) and 21
    ("bet what you have" after 30 minutes) — each as written, no overrule; 22 — the overrule, done as L3 and L2 (item 9);
    and the start amount, asked on its own: 500 (item 2).
11. **The journey hydration note, carried from S7** (VODACOM-PLAN §0j, WP11's bullet). A hydration attribute mismatch was
    seen twice on staff-pass pages only (`/` after Tafuta's landing, sw 360 signed in; journey `/results`, en 360) and
    never brought back (fifteen more tries). `qa:journey-home` keeps the whole console text beside its tiles. S8's drives
    (WP11a, WP11b) keep the console text the same way, and a sighting names the attribute and its element before S8
    closes: a mismatch on a page S8 mounts on is S8's to fix.

*From:* S8 WP0 steps 1 and 3; Ali's answers of 2026-10-12; S7's close record.

### Open points, added and changed (→ §0h)

WP0 files these with the rest, numbered after the last §0h point at S8's base (77 on origin/main `e5b5c9da`). Each is a
call taken under Ali's delegation, with its overrule, except 41, which is Ali's own ruling.

- **5 (stands).** The sheet opens on its heading. The exception is written into CLAUDE.md's keyboard rule in WP6's commit
  and held by 2.2s (A12). Overrule unchanged.
- **8 (amended).** The plan's blocks show at open, and the open's read records what a refused tap records: the session
  limit's sitting and its `rg.session_limit.enforced` row, and the account and loss rows (A4). Overrule: show them only
  after the server refuses.
- **11 (stands, with A3).** The deposit page never opens the sheet; Back from it does.
- **13 (amended).** The marker also carries the intent's random request id, and Privacy §7 names it (A3). Overrule: no
  stake in the address until S9, so a reload reopens at the minimum; the marker still carries the key, so a bet in flight
  through a reload is still settled by it. (The old overrule, no marker at all, would lose a bet in flight at a reload,
  A3.)
- **14 (amended).** On a deploy skew the host reloads once per build. When that is spent, or the build has no id, the line
  is `common.temporarilyUnavailable`; in doubt, the doubt holds (A7). Overrule unchanged.
- **22 (rewritten).** The loss block reuses the live refusal as Ali's ruling of 2026-10-12 corrected it (`e5b5c9da`: "It
  counts the last 24 hours"), and the loss room says "kwa sasa", not "leo" (A5). The block's half is Ali's ruling and has
  no overrule. Overrule for the loss room only: the approved "…leo".
- **24 (amended).** The pending frame's body follows the deposit's age: the live `depositPendingBody` under 10 minutes,
  "Inaweza kuchukua hadi dakika 30" to 30 minutes, and the approved "Malipo bado hayajathibitishwa" after (A10). None
  promises an emailed receipt. Overrule: the live sentence at every age.
- **34 (stands; listed for Ali).** "Tiketi zangu" opens the ticket itself. That departs from §3.3 :3567 ("opens
  tickets"), so Ali sees it.
- **35 (amended).** An unknown shape is `system_error`, and so in doubt (A2). The old overrule (a generic line and a fresh
  key) is withdrawn: a fresh key after an unknown answer can place a second bet.
- **38 (new): where the ✕ stands.** In the chip row, beside the chosen side, as the canvas draws it: the kit's `CloseX`
  with a ref, ruled in r6c as a header row, with F20's third place recorded (A13). Overrule: a title row with the ✕
  beside the title, one of F20's two places, the chip moving under it.
- **39 (new): the question page from 1024.** The two big buttons stand in the aside from lg and after the holder block
  below it, one copy in the accessibility tree at a time (A19). Overrule: one column for journey readers at every width.
- **40 (new): the stake box and the CTA against the canvas.** A 56px box with its figure on the 24px rung, and the 56px
  `xl` button: the nearest rungs to the canvas's 60px, 26px and 54px, each drift recorded (A18). Overrule: the canvas's
  exact sizes, as new rungs on the control ladder and the type scale (a change to DG-A-04's ladder).
- **41 (new): the live loss-limit sentence. Decided by Ali, 2026-10-12** (asked by question: "fix it now"). It was
  corrected live in its own commit, `e5b5c9da`, not with S12 (§0h point 77), and the sheet reuses it (A5). No overrule.
- **42 (new): a deposit pending for 30 minutes.** "Bet what you have instead" shows beside the pending notice, and the
  deposit offer stays withheld (A10). Overrule: no "bet instead" while any deposit is pending, at any age.
- **43 (new): the classic dial's two gaps.** Filed for S12 with WP0's measurement; S8 changes neither (A23). Overrule:
  each is fixed live now, in its own commit, for every player.

### Points for Ali, amended

The list above ("Points for Ali") stands with these changes, in plain words.

- **3 [Point 8], amended.** The sheet tells a player at once when they cannot bet, before they tap. When it does, it now
  records that exactly as a refused bet is recorded today. So a player past their own time limit stays held even if they
  sign out and back in, and the Board's responsible-gambling report keeps counting it. Overrule: only after the refused
  tap.
- **6 [Point 22], withdrawn: you decided it on 2026-10-12.** Today's loss-limit message was corrected live ("It counts
  the last 24 hours"), and the sheet shows that same sentence. (The sheet's "your limit allows up to … today" also loses
  "today": it says "right now", for the review to sign.)
- **17 [Point 34], new.** After a bet, "Tiketi zangu" opens that ticket itself, not the list of tickets the written plan
  names. Overrule: the list.
- **18 [Point 38], new.** The sheet's close button sits beside the chosen side, as the design draws it: a third place for
  a close button, beyond the two our visual review allowed. Overrule: beside the question's title.
- **19 [Point 39], new.** On a computer screen the question page shows the two big NDIO / HAPANA buttons in the
  right-hand column, where today's bet panel stands; no design board draws this width. Overrule: one single column.
- **20 [Point 40], new.** The amount box and the bet button are slightly off the design (the box 56px instead of 60, the
  figure 24px instead of 26, the button 56px instead of 54), because those are our nearest standard sizes. Overrule: add
  the design's exact sizes as new standards.
- **21 [Point 42], new.** If a player's deposit has been waiting more than 30 minutes, the sheet offers "bet what you
  have instead" beside the waiting notice. Overrule: never while a deposit waits.
- **22 [Point 43], new.** The review found two problems in today's bet screen, for every player. If a bet's answer is lost
  and the retry is refused (for example during maintenance), the screen says nothing was charged, and a later tap can
  place a second bet. And a player signed out in the middle of a bet is shown a failure. The plan files both for S12.
  Overrule: fix them now, each on its own, as you did for the loss-limit message.

### Critique findings not taken as proposed

- No finding is rejected outright. All 32 are taken (A1-A23). Each part below was corrected by the re-read at 2322cf09,
  with its reason.
- Money 1, A-M1 item 3, and money 2, A-M2 item 2: the window "30 s after the last attempt was sent". Admission's wait is
  15 s by default but up to 60 s (admission.ts:78). After admission a bet may make four attempts (retry.ts:54; P2024 and
  P2028 are retried, :48), each made of its pre-lock reads, each allowed a 10 s pool wait (prisma.ts:60-77), and the
  lock's transaction, 10 s for a connection and 30 s to run (locks.ts:195-196). And Next sends no second action while one
  is pending (app-router-instance.js:134-162). So the window is 10 minutes, pinned against those constants, and it runs
  from the attempt's settle, or from the page's load after a reload (A2; A3).
- Money 1, A-M1 item 5, cell (b): the key reads are held in that cell, or the key read settles the doubt before the
  second retry and the cell never sees it (A2).
- Money 3, A-M3 item 2: "or a break" writes nothing, because the bet path writes no row for a break
  (market-service.ts:1185-1196). And "once per sheet open" is the open's own read, `open=1` (A4).
- Money 4, A-M4: the marker keeps the bet but drops its key on a redirect, unless the intent was already in doubt: the
  redirect proves the server ran nothing (A6). A7 does the same on a skew.
- Money 5, A-M5: the wait line is a new journey line, not the classic `dialog.busyHolding`, whose "Your stake hasn't
  moved" nobody knows mid-request. And the 20 s is admission's default plus the bet, not a ceiling (A7).
- Money 7, A-M7: "the host takes the answer's `balance`". That figure is the cash left after the debit
  (market-service.ts:1620, :1825), not spendable, so the sheet shows only the `?me=1` read (A9).
- Money 9, A-M9: the approved "Malipo bado hayajathibitishwa" sentence says "Imepita dakika 30", and the canvas draws it
  only past 30 minutes (s4-6-wait-over30). From 10 minutes it would be untrue, so there are three bands (A10).
- Money 6 and plan 6: "a voided question" is widened to every market that is not LIVE, as `sheetPublic` reads it
  (journey-sheet.ts:95-97) (A8).
- Plan 8, A-8: "an additive Input `xl` size (60px)" would be a field height on no rung. DG-A-04 (Ali's ruling of
  2026-08-29, input.tsx:479-485) put every field height on the 32/40/44/48/56 ladder, so the box is 56px, and the canvas
  drift is recorded for Ali (A18; Open point 40).
- Plan 9, A-9: "the live region also speaks the closed frame" would speak it twice, since the boards draw it (and every
  block) as `role="alert"`. And "the 5 s close pauses while focus or the pointer is in the panel" is the hold the classic
  receipt rejected (operation-result-modal.tsx:228-320): a plain focus pause never closes after a scripted focus, and
  `pointerenter` fires under a resting cursor (A12).
- Plan 11, A-11: "Review 7 settles one name for the limits page" is decided now, by the sentence `e5b5c9da` shipped:
  sentences say "Uchezaji salama", and the button says "Weka mipaka". S8's review is number 8, because `e5b5c9da` signed
  review 7 (A20).
- Plan 12, A-12: "WP0 files a §0h point plus a Point for Ali: fix it live now, or with S12" and "WP4 replaces the whole
  :124 correction" are overtaken by Ali's ruling and `e5b5c9da` (A5). The sheet reuses the live key instead of a journey
  copy that would differ only in the page's name.
- Plan 15, the skew line ("say the sheet then shows row 2's line"): not taken. `UnrecognizedActionError` proves the
  server ran nothing (server-action-reducer.js:76-83), so the line is money 5's `common.temporarilyUnavailable` (A7).
- Plan 5, A-5: its red list is sorted by how each twin runs (`red:failure-reasons` and `red:rg-doors` write into real
  source; `red:dal-parity` and `red:contrast` copy to a scratch tree; each runs alone after committing) and gains
  rg-doors. red:bet-sheet runs from WP2 on, when it exists (A16).
- Plan 16: Open point 41 is no longer for Ali to decide; he ruled on 2026-10-12 (A5).
- Found by the re-read beyond both critiques: `error.failMarketNotLive` says "soko hili", and the sheet now says "swali
  hili" (A20 item 3); the S7 base moved, and S8's review and §0h numbers moved with it (A1); Open point 13's old overrule
  would lose a bet in flight at a reload, and Open point 35's would place a second one, so both are replaced or
  withdrawn (above).
