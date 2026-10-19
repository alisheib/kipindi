# U43 · the design panel's synthesis (2026-10-19) — RECORD, made BEFORE Ali's four rulings

> 📑 **RECORD, NOT RULE.** The law is `docs/DESIGN_AUTHORITY.md`. This is the read-only design panel's merged proposal (three
> independent redesigns, three lens judges, one synthesis; workflow `wf_294740ea-fb4`), rendered from its JSON.
> ⛔ **Ali's rulings of 2026-10-19 override it where they differ** (COMPLIANCE-DECISIONS § "2026-10-19 · Up & Down and the
> market cards (MOBILE-VISUAL U43)"): (1) a LIVE LINE INSIDE THE ROUND CARD, the big chart one tap away and fixed so it
> never shows a different price from the card — the synthesis below says no chart on cards; (2) the slim card — as here;
> (3) TWO SHORT ROWS of chips on the phone (assets; durations), the sheet only when they stop fitting — the synthesis says
> one rail; (4) no odds on any card choice — live since release A. Its owner questions are answered by those rulings.

## answers

- **charts**: On phones, no. A chart needs about 410px and would push Up and Down off the first screen. On a 5-minute round the board's own price only changes when a round starts or ends, so a chart there would mostly show the past. Keep the 12 result squares (who won the last rounds) under the cards, plus one 'Chati ya bei' button that opens the chart right there, in exactly the form you froze on 4 Sep (15M to 7D, Curve or Candles, candles first). On computers, yes: put it beside the round you can bet on, where it costs the bet nothing and fills today's empty third column. I recommend starting it on the 6-hour view so it has no effect on the house desk (Question 2). What it is for: one job, 'which way has the price been moving?', drawn from real minute bars and never invented. It is not a per-round chart (you removed that on 4 Sep), and no chart goes on the cards, because your own July sketch put pool and players where a chart would sit. Market cards: no big chart. Keep the small 7-day line where real data exists (your D49) but make it readable: drawn on real time, labelled 'siku 7', with a minimum scale so a one-point wiggle doesn't look like a crash.
- **filter**: The filter field scores 5/10. It is honest and accessible, but it is the wrong control here. It hides the board's main choice (which game) behind a tap and a sheet, players told you they don't notice it, and it sits under a price strip that repeats it. Replace it with one row that is always visible under the title: BITCOIN [dakika 5] [dakika 10] [dakika 15] · DHAHABU [dakika 15] … One tap switches games. The row scrolls sideways and opens on the current game, the chosen one is outlined, and it is the same 44px height. Computers get the same single row instead of two. The [Raundi | Chati] toggle scores 4/10: a big capsule switching between the weakest view and the best one, and it shifts the page after loading. It goes too. The result squares always show under the cards, with one 'Chati ya bei' button.
- **cardSize**: No. Today the card is 468–660px tall and changes height while the round runs, so everything under it jumps. Its Up/Down sit around y=850–950 on a 360×740 phone, a full scroll down. The proposed card is about 381px for a signed-in player, 329px for a visitor and about 320px once settled. It keeps the same height from open to locked, so nothing moves at the lock. On that phone Up/Down sit at y≈534–582 signed in (482–530 for a visitor, 565–613 while holding a stake), on the first screen and clear of the chat bubble. The size is right because every row left on the card is one of your four must-shows (pool, players, amount, timer), the price to beat, the two buttons, or the source line.
- **detailsNeeded**: No. Remove:
  - four of the five copies of the price (the footer 'Open', the heading, the two coloured boxes)
  - the 'LIVE · BTC' line
  - the '5 MIN' chip (the round's time window says it)
  - the box around the timer
  - 'CONFIRMED PRICE … 0.00% · Exactly at the opening price' while nothing has moved
  - the fake 'AWAITING RESULT' button
  - the 'STAKE' label
  - the repeated 'Bets closed' chips
  
  Keep: the asset, the timer, the pool, the players, the money split, the amount, Up/Down (word and arrow only, per your 14 Oct ruling), the empty-side warning, the after-lock 'If it closes Up · TZS …' rows, and the source line.
  
  Add:
  - the round's time (14:30–14:35), so two cards can be told apart
  - your own result on a finished round ('Umeshinda · TZS 1,850')
  - what happens next: 'Raundi ijayo itafunguliwa matokeo haya yakitoka', 'market closed until 01:00', or 'no round scheduled'
  - the minimum stake, for visitors
- **overall**: Today, averaged over the eight lenses: the board 5/10, the round card 5/10, the market card 6/10 (cell by cell in the table). The board spends the first screen on chrome that repeats itself. The card is tall, states the price five times and looks frozen during betting. The market card is the best-made piece, but it shows a minority share in big green and clutters its top.
  
  With this proposal and the recommended answers, all three reach about 9/10 on every lens. The exception is the player lens on the round card at 8.5: a 5-minute round still shows no moving price unless you choose otherwise in Question 1.
  
  The last half point needs:
  - your four answers
  - a native Swahili read of the new words
  - a responsible-gambling check on putting the bet on the first screen
  - a live check at 320, 360 and 1280px in sw, en and zh

## scorecardToday

- **visual**
  - surface: page
  - lens: visual
  - score: 5
  - good: One dark-royal ground, one PageHeader, kit FilterPills that outline only the chosen pill, a board that never gets wider than 1280px, 44px tap floors.
  - off: Four boxed blocks before the first card: price tape, 48px filter field, a [Raundi | Chati] capsule that paints 48px, the cube strip. From 640px there are two rails with two type treatments (13px vs 11.5px mono). The 360px loading ghosts become 468–660px cards, the ghost pills are 8px rectangles, and at 1280 the third column is usually empty. Designers gave 5.5–6; the visual judge's 5 stands because he measured the capsule and the ghosts.
- **uiux**
  - surface: page
  - lens: uiux
  - score: 4.5
  - good: Filter state lives in the URL (replace + scroll:false). The board dims instead of blanking. 20s poll. An explicit ?asset= wins. 44px controls. Rules door in the header.
  - off: At 360×740 the first card starts at y≈485 and Up/Down sit around y≈850–950, below the first screen for everyone. The game choice hides in a sheet players say they don't notice: 3–4 taps, plus an asset-then-length race with a 6s ceiling. A remembered 'Chati' choice flips ~170px above the cards. For about half of every 5-minute cycle nothing is bettable, and the top of the page never says when betting reopens.
- **motion**
  - surface: page
  - lens: motion
  - score: 5.5
  - good: Filter switch dims on --t-base/--m-glide. Phase captions use the kit m-tick. Only the digit leaf re-renders each second.
  - off: ~170px hydration flip of the chart strip. Ghost-to-card jump. On desktop the chart pane draws at 300px, then grows to 380 after an effect. Rails use the legacy --dur-micro tokens. On the auto 'reduced' tier the live dot breathes faster (1.6s) than at full motion (2.6s), while the last-30-second cue is switched off.
- **palette**
  - surface: page
  - lens: palette
  - score: 5.5
  - good: No gold anywhere on the board. Side inks only on the cubes and the cards' sides. Links are blue.
  - off: Broadcast red appears four times in the first 500px (ticker, MUBASHARA eyebrow, tape dot and word, card dot), each beside a price that cannot move. The same red dot doubles as the 'placing' bullet, so red means live, in-flight and decoration all at once.
- **clarity**
  - surface: page
  - lens: clarity
  - score: 4.5
  - good: Honest em-dashes, a server-true 'Confirmed price', complete sw/en/zh copy, a one-line Swahili tagline.
  - off: The same 8-digit price appears up to five times. 'Bitcoin · 5 dakika' is the tape, the filter value and the card title. Two cards share one title and neither shows its time window. 'Mechi' and 'Raundi' name the same thing. It prints '5 dakika' where Swahili (and the stored titles) say 'dakika 5'. 'Raundi | Chati' and 'za zamani → mpya' explain little.
- **player**
  - surface: page
  - lens: player
  - score: 4.5
  - good: Once found, a bet is one tap, confirmed by a receipt, toast, haptic and pulse. The lock and refund sentences earn trust.
  - off: The 3-second test fails. Where to tap is off-screen. 'Which way?' reads '0.00% · Sawa kabisa na bei ya ufunguzi' under three LIVE labels. 'How long?' is mid-card. A visitor never sees the minimum stake.
- **appeal**
  - surface: page
  - lens: appeal
  - score: 5
  - good: Premium dark royal, crisp mono figures, the cube strip as a heartbeat.
  - off: Reads like an operations console: chrome before the game, LIVE everywhere while nothing moves, boxes inside boxes, a dead desktop column.
- **logic**
  - surface: page
  - lens: logic
  - score: 6
  - good: One current round per chain, locked rounds kept, phase from server instants, real data or an em-dash, E-67 gating on 'are there rounds' rather than chain state.
  - off: getBoard returns chainPaused and the page never reads it, so a stopped chain says 'being prepared'. The tape stamps LIVE on reads of any age. Every card is handed the asset's newest quote time, so a settled close is dated by a later read. Nothing on the board knows gold's market sessions.
- **visual**
  - surface: updownCard
  - lens: visual
  - score: 4.5
  - good: Kit-only parts, tabular mono figures, the 16px shell shared with the market card, a confident 28px clock.
  - off: Eleven type sizes (28/15.5/14.5/14/13/12.5/11.5/11/10.5/10/9.5) against a written limit of three bands. The pod and every state box are 16px boxes inside a 16px card. Two tinted tiles. Rhythm 12/28/28/24/22px. Compact padding is 8 top vs 16 bottom. 468–660px tall.
- **uiux**
  - surface: updownCard
  - lens: uiux
  - score: 5
  - good: 44px stake chips, 48px side buttons, a no-navigation zone over the controls, a 300ms rollover tap guard, a spinner per side, a receipt modal.
  - off: The buttons sit at the end of a card a screen and a half tall. 'STAKE' + four presets + Custom wraps to two 44px rows at 360. A fake disabled AWAITING RESULT button. The state is said three times (chip, caption, sentence). A 10.5px 'NENDA' button points at the card directly above. The card shrinks at the lock and shoves the cards below.
- **motion**
  - surface: updownCard
  - lens: motion
  - score: 5.5
  - good: Only the digit leaf re-renders, m-tick marks phase changes, and the side flash uses the independent scale property.
  - off: Reduced-motion players get no last-30-second cue at all, and that is the auto tier most low-end phones run. A stale comment still claims the digits turn rose. 'Result in' captions two clocks, so the digits jump from 0:00 to ~1:31. The place pulse animates box-shadow (§8b allows only transform and opacity). The card changes height at the lock.
- **palette**
  - surface: updownCard
  - lens: palette
  - score: 5.5
  - good: The figure's ink follows the settlement targets (valueTone). The countdown never takes betting ink. The place pulse is success green, not Up green.
  - off: Two tinted tiles spend green and rose on a restatement. The result and handover clocks wear --brand-300, the link ink, directly above a blue NENDA button: two blues, only one tappable. Split labels are 9.5px. A breathing red dot sits beside a static price.
- **clarity**
  - surface: updownCard
  - lens: clarity
  - score: 4
  - good: The lock sentence, the empty-side refund promise, the 'Confirmed price' name, a source line with seconds.
  - off: For the whole betting window of every 5-minute round it reads 'Bei iliyothibitishwa … 0.00% · Sawa kabisa na bei ya ufunguzi'. The price appears five times. 'Jumla/VOL', the raw 'BTC', and a players count with no word. The split is announced as 'Uwezekano wa Juu' (a probability), though it is a share of the money. One caption covers two clocks. 'TZS 500 · Mubashara' shows while a bet is placing. zh uses 已下注 for two meanings. 'Weka kiasi kucheza' is missing 'ili'.
- **player**
  - surface: updownCard
  - lens: player
  - score: 4.5
  - good: Fast one-tap betting. After the lock a holder sees both outcomes in shillings.
  - off: Two rounds can't be told apart. You can't see whether you are winning. A finished card never says what happened to your money, though myResult already reaches the page. Low-end phones get no last-30-second cue. Visitors never see an amount.
- **appeal**
  - surface: updownCard
  - lens: appeal
  - score: 4.5
  - good: The digits and the tipping rail give the card a spine.
  - off: Busy, tall and boxy, mono caps everywhere, a dead button, and it looks frozen exactly when it should feel alive.
- **logic**
  - surface: updownCard
  - lens: logic
  - score: 6
  - good: Every figure is server truth. The lock instant is the money path's own. Payouts come from the settlement function. One refund-reason rule. '—:—', never a dead 0:00.
  - off: During 5-minute betting the 'confirmed price' is the open itself. Two clocks share one caption. The 'If it closes' rows vanish at confirming, because the server computes them only while locked. A settled card is dated by another read. ₿ is drawn for every crypto. The signed-out card shows no amount, one of the owner's four must-shows. Designers gave 5–7; the logic judge's 6 holds: strong server truth, a dozen verified surface defects.
- **visual**
  - surface: marketCard
  - lens: visual
  - score: 6.5
  - good: The best-made card in the product: the tipping rail with its gilt needle, a balanced 15px title with a 2-line reserve, equal heights, a quiet watermark, an engineered footer reach.
  - off: Eight sizes (9.5/10/11/11.5/13/15/22/28). A 10px category beside 9.5px chips. ▲/▼ text characters stand in for icons. '@ %' and Details are 11.5px. The 6% aqua spark band reads as an empty box (~1.06:1). The /markets skeleton is 8px against the card's 16px.
- **uiux**
  - surface: marketCard
  - lens: uiux
  - score: 6.5
  - good: A real stretched link, 44px YES/NO and info buttons, share and Details with a 40px reach.
  - off: The pool figure has no visible word. The time left sits far from the status. Settled cards end in a dead disabled pill. A new card says 'empty' three ways. HOT hides SOON. The Watching empty state says to tap a star the cards don't have.
- **motion**
  - surface: marketCard
  - lens: motion
  - score: 6.5
  - good: The spark draws in once, the move triangle nudges only when its direction changes, and the hover lift uses translate.
  - off: Two press scales (0.96 and 0.955) against the one 0.97 token. The spark draw-in runs on legacy tokens. Twenty breathing red dots on a poll board, faster on the low-end tier.
- **palette**
  - surface: marketCard
  - lens: palette
  - score: 5.5
  - good: A neutral 24h move, HOT in rose rather than gold, result words in their side's ink.
  - off: YES% is always green, so a 37% minority is the biggest green on the card. LIVE (broadcast red) beside HOT (rose) makes two reds. SOON and CLOSED share the royal 'pending' paint.
- **clarity**
  - surface: marketCard
  - lens: clarity
  - score: 5.5
  - good: An honest em-dash for empty and one-sided pools; a conditional refund note at the reading floor.
  - off: The YES share is stated up to five ways. A void says Batili, Batili and Imefungwa. 'Resolved' is said three times, with two Swahili words (Imekamilika/Imetatuliwa). 'Karibu' (SOON) reads as 'Welcome' beside 'Karibu sare'. The sort says 'Closest call' and the odds pill 'Close call', and the zh sort repeats 'Contested'. The spark has no label.
- **player**
  - surface: marketCard
  - lens: player
  - score: 6
  - good: Question, YES% and two priced buttons in one glance.
  - off: The green misleads when YES is the minority. A market about to close looks merely HOT. Pool and predictors read as decoration. The spark looks broken.
- **appeal**
  - surface: marketCard
  - lens: appeal
  - score: 7
  - good: Looks like a product; the rail and needle are a recognised signature.
  - off: The top row crowds the question with a status chip, a signal chip, a glyph and a word. The faint spark looks unfinished.
- **logic**
  - surface: marketCard
  - lens: logic
  - score: 6.5
  - good: A price only when both pools hold money (priceState), the outcome read rather than inferred, signals gated on live, D29's empty and void gates.
  - off: HOT is tested before SOON. A void's pill says 'Closed'. The meta row restates the outcome. The spark is compressed by index over bet-driven snapshots, so it implies a time axis it doesn't have. The Watching copy describes a control that doesn't exist.

## boardSpec

PHONE (360×740, Swahili, signed in, an open two-sided round; the house page padding stays):

1. Shell: top bar 0–56, live ticker 56–88. Unchanged, platform-wide.

2. Title row 120–161: h1 'Juu na Chini' (28px) with the rules and history glyph pills (41px).
   - The MUBASHARA eyebrow goes. The ticker right above already says it, and 'live' now belongs only to a round you can bet on.

3. Tagline 165–185: one line in sw and zh. English is shortened to 'Will the price close higher or lower?'.

4. The price tape is removed at every width. It repeated the rail and the cards, and put LIVE beside a number that cannot move.

5. Game rail 205–249: one 44px row of FilterPills grouped by asset with the kit FilterGroupKey — BITCOIN [dakika 5] [dakika 10] [dakika 15] · DHAHABU [dakika 15] …
   - Scrolls sideways; StripAutoScroll opens it on the chosen pill; outline on the chosen pill only.
   - Each pill links asset and length together (replace + scroll:false), so the asset-then-length race (E-290) and its 6s ceiling disappear.
   - No counts. Live dots come later, only from a cached cross-chain read, never guessed. Not sticky.
   - Replaces the 48px FilterSheet field on phones and the two stacked rails from 640px. §K6c: the lens never goes behind a click.

6. Round cards from 269: up to three cards of the chosen game (current, just closed, last settled).
   - One column below 652px; 12px apart (16px from 640px).
   - All on the same raised material. The bettable card stands out by content only: the one live dot, the stake row, the two coloured buttons.
   - Current card, open, signed in, ≈381px: Up/Down at 534–582. Signed out: 482–530. Holding a stake: 565–613. All on the first screen, clear of the chat bubble (616–660, x 300–344) and the tab bar (676).
   - With no bettable round, the locked card comes first: 'Raundi inaisha baada ya 0:36', why bets closed, and what comes next. That is one of 'Raundi ijayo itafunguliwa matokeo haya yakitoka.', 'Soko limefungwa sasa — raundi ijayo itafunguliwa saa 01:00 EAT.' or 'Hakuna raundi nyingine iliyopangwa hapa kwa sasa.', all inside 480–545.

7. Under the cards, after a 20px gap:
   - 'RAUNDI ZA MWISHO' (10px page eyebrow) with 'za zamani → mpya'.
   - The 12 result squares (18px).
   - One 44px 'Chati ya bei' button. It opens the chart inline in the frozen 4 Sep form: range rail 15M·30M·1H·6H·12H·24H·7D, Curve | Candles with candles first, 300px pane, dashed 'Confirmed price' line, receipt footer, no vendor credit.
   - The chart's 300px is reserved before it loads, and the open/closed choice is remembered per device. It lives below the cards, so it can never move the bet.
   - The [Raundi | Chati] switch above the cards goes.

8. Bottom: 32px + --rail-h clearance, unchanged.

COMPUTERS ≥1024 (recommended answer to Question 2):
- Header: h1 'Up & Down', the tagline, and the labelled rules and history pills on the right. No eyebrow, no tape.
- The same game rail, in one row (BITCOIN 3 min · 5 min · 10 min · 15 min | GOLD 15 min …).
- Grid [minmax(0,1fr) | 392px], gap 20:
  - Right column: the current round card (open or locked), sticky at header + 16px, top-aligned and never stretched, ≈409px at Comfortable density. Up/Down at y≈554–602 on 1280×800.
  - Left column: the price chart, open by default in its frozen form (380px pane). Its placeholder height is set in CSS per breakpoint, so nothing jumps. It starts on the 6-hour view, and a player's own chosen range is remembered. Under it come the last-rounds strip, then the just-closed and settled cards side by side.
  - No empty third column.
- Other answers to Question 2:
  - B: the same layout, starting on 1H.
  - C: game rail, a three-column card grid, then the strip and a 'Price chart' button; the chart opens full width at 380px.
  - D: computers stay exactly as today.

640–1023: a two-column card grid, [current | just closed] then [settled], followed by the strip and the chart button. The chart is always opt-in below 1024, with a 300px pane.

LOADING: one ghost per slot at the card's real height, built from the same row tokens. The rail ghost uses the pill radius. No tape ghost. The shimmer stops under reduced motion.

EMPTY BOARD:
- Running chain: 'Raundi ijayo ya dakika 5 itafunguliwa hapa bei yake ya ufunguzi ikithibitishwa — huhitaji kupakia upya.'
- Stopped chain (chainPaused, now actually read): 'Hakuna raundi nyingine iliyopangwa hapa kwa sasa.'
- Gold outside its trading hours: the market-closed line with its reopening time.

UNCHANGED: the 20s poll, URL state, the transition dim, the result announcer, the journey arm.

## cardSpec

- **0 · Stretched link to the round page (.mcardp-open)** — keep
  - detail: Still a real anchor: the whole card opens /updown/[roundId]. The action slot stays raised above it (z-index 3). The link's and the article's aria-label become roundName plus the window: 'Bitcoin Juu na Chini · dakika 5 · 14:30–14:35'.
- **Card shell (.mcardp), data-phase, hover lift** — restyle
  - detail: A .ud-card modifier. Padding is 12px on all four sides on Compact phones and 16px from 640px (today 8 top / 16 bottom). One gap between blocks (12 / 16) and 8px inside a block, replacing the 12/28/28/24/22 margins. One raised material (rung 1) in every state, so no plain boxes (§8a.2, §M2). data-phase and the hover lift are unchanged.
- **Rollover tap guard (300ms)** — restyle
  - detail: 340ms (= --t-move), so it ends together with the new card's .m-in-lift arrival. Same scope: a freshly mounted bettable card only.
- **1 · AssetMark 40px (₿ for every crypto)** — restyle
  - detail: A 32px plate at the start of the identity row. ₿ for BTC only. Other crypto show their ticker letters (ETH) until the PHOSPHOR lane supplies currency marks. Metals keep Au/Ag.
- **1 · h3 '{Asset} Up & Down' at 14.5px** — restyle
  - detail: The asset name only ('Bitcoin', 'Dhahabu'), Sora 600 at 15px, on one line. Set through a .ud-title rule in globals.css, because the --type-body rung cannot be reached from a .tsx (§T7). The game's name lives in the page h1 and the aria-label.
- **1 · Inline duration chip '5 MIN'** — remove
  - detail: The window (14:30–14:35) and the chosen rail pill already say it. The aria-label keeps 'dakika 5'. Removing it also stops the Swahili title from wrapping.
- **1 · Status line 'LIVE · BTC' with a pulsing dot** — remove
  - detail: The raw ticker goes; the mark and the name already say it. The state moves into the clock caption. The one breathing live dot sits before the open caption, and only on the bettable card.
- **NEW · Round window** — new
  - detail: '14:30–14:35' at the right end of the identity row, in 13px tabular mono, --text-subtle. EAT times come from opensAt/closesAt through the cached, finite-guarded EAT formatter. It tells the current, just-closed and settled cards apart.
- **3 · Countdown pod (16px inset box)** — move
  - detail: The box goes, and caption plus digits become the clock row. The caption sits on the left (Inter 13px, --text-subtle, sentence case, the landing band's style) and the 28px mono digits on the right. 'Dau linafungwa baada ya' stays word for word: the band's research found that a bare 'Dau linafungwa' over 01:52 reads as a time of day in Swahili time. On its own row the caption fits at 320 in all three languages.
- **3 · Caption ladder (one caption per clock)** — restyle
  - detail: Open: udBetsCloseIn. Last 30s: 'Sekunde za mwisho' (new). Locked: udClosesIn → 'Raundi inaisha baada ya', counting to the close. Past the close: udResultIn 'Matokeo baada ya', counting to the measured result, or udAwaitingResult 'Inasubiri matokeo' over —:—. Settled: 'Matokeo' plus the result word. Every change takes .m-tick and is announced once through a polite live region on the caption, never on the digits.
- **3 · 28px digits (CardCountdownDigits)** — keep
  - detail: 28px mono 700 tabular (title-lg), still the card's one loud element. --text while counting, --text-subtle for —:—, never --brand-300 (the link ink). Only the leaf re-renders each second.
- **3 · Last-30-second opacity pulse (ud-count-pulse, 1s)** — restyle
  - detail: Retired. The words 'Sekunde za mwisho' are the cue in every motion tier. At full motion the digits add the kit .m-urgent breathe, which gets its reduced-tier entry. The stale comment saying the digits turn rose is deleted.
- **2 · 'CONFIRMED PRICE' row (label, 15.5px figure in valueTone, 11px move %)** — restyle
  - detail: Becomes the 'now' line.
    - No confirmed price newer than the open (every 5-minute round while betting): 'Bado hakuna bei mpya tangu ufunguzi saa 14:30' (udMatchNoNewPrice, the band's kick-off words) in --text-subtle, with no figure.
    - A confirmed price inside the round window that is newer than the open: 'Bei iliyothibitishwa' + '▲ $82,801.10 +$47.07'. The figure is 15px mono (.ud-figure) in the targets' ink (valueTone, unchanged).
    - Settled: 'Kufunga' + the close in the targets' ink.
    The time of that price is the source line's stamp.
- **2 · Move % (11px, +0.01%)** — restyle
  - detail: Replaced by the dollar distance from the open: 11px mono in the figure's ink, U+2212 for minus. This is the landing band's measure; a 5-minute move of 0.06% reads as nothing.
- **2 · Level sentence ('Exactly at the opening price' / 'Only $0.20 from the open — not enough to decide')** — keep
  - detail: udLevelBy appears only when a newer price sits strictly between the targets, as a second line under the figure. 'Exactly at the opening price' is no longer printed for the opening price itself.
- **2 · Awaiting read (em-dash + 'Inasubiri bei')** — keep
  - detail: When there is no open price it moves to the price-to-beat row: 'Juu au chini ya — Inasubiri bei'. The 'now' line is then left out.
- **6 · Heading 'HIGHER OR LOWER THAN $X ± $0.02'** — merge
  - detail: The price to beat, stated once: 'Juu au chini ya' (13px, --text-subtle) + '$82,754.03' (15px mono, --text) + '±$0.02' (11px mono, --text-faint). The ± figure's accessible description is the band's udMatchRefund sentence. Settled: 'Ufunguzi $82,745.45'.
- **6 · Two tinted target tiles 'UP ≥ …' / 'DOWN ≤ …'** — remove
  - detail: Decided by Question 4. The exact targets stay on the round page (PriceHero prints UP ≥ / DOWN ≤) and still drive every ink; the card keeps the ± band. Saves about 70px and two coloured washes.
- **4 · Stats 'VOL TZS 0'** — restyle
  - detail: 'Bwawa TZS 190,500' at 13px: the word in Inter --text-subtle, the figure as .amount in --text. This is the platform's one word for the pool, and it also replaces 'Jumla' on the round page.
- **4 · Users glyph + bare count** — restyle
  - detail: '· wachezaji 12' / '12 players' / '12 位玩家', from a new udPlayersN with a singular form. The glyph goes.
- **5 · Split labels 'Up 62% / 38% Down' at 9.5px** — restyle
  - detail: 11px mono 600 in --yes-300 / --no-300, left and right above the bar, lined up with the Up and Down buttons. 'Upande mmoja tu' when one-sided; nothing when empty.
- **5 · TippingBar 7px (dashed rail when empty or one-sided)** — keep
  - detail: Same kit bar and gilt needle. Announced as an image, 'Juu 62%, Chini 38%' (barReading), instead of 'Uwezekano wa Juu 62%', because it is a share of the money. When a poll changes the split, the needle travels to it on --m-pivot.
- **7 · You're-in chips** — keep
  - detail: 'UKO NDANI' (11px caps, .eyebrow) with side chips (kit md, 11px) above the stake pills. The zh label becomes 已参与, so it no longer matches 'Bet placed'.
- **7 · 'STAKE' key** — remove
  - detail: The radiogroup keeps 'Dau lako' as its accessible name and the helper line states the amount. Dropping the key lets the pills fit on one row.
- **7 · Four preset chips (8px radius, 44px) + '+ Custom'** — restyle
  - detail: One row: 500 · 1K · 2.5K · 5K · + Maalum (quickStakes from the 500 floor). Pill radius (§S2 quick-stake), 44px tall, 11px mono. The chosen pill takes --pill-active plus a 1px --brand-400 outline, the FilterPill 'selected' look. Colour transitions run on --t-quick/--m-glide. Below 360px the Custom pill shows only its plus glyph, with aria-label 'Kiasi maalum cha dau'.
- **7 · Custom amount input (40px) + 10px range hint** — restyle
  - detail: Kit Input at 44px (--h-input, --r-md). The range hint and the refusal go to 13px; the refusal uses danger ink, never rose.
- **7 · Up / Down buttons (btn-lg 48px, word + arrow)** — keep
  - detail: Same pair, 12px apart, side word and arrow only (§C3). Arrows come from the PHOSPHOR W4 lane. One shared component draws both the signed-in and the signed-out pair, ending the E-196 duplicate.
- **7 · Helper line ('Tap Up or Down to bet · TZS 500' / 'TZS 500 · Live')** — restyle
  - detail: - Signed in: 'Bonyeza Juu au Chini kuweka dau · TZS 500'.
    - Placing: 'Inaweka… · TZS 500' with no red dot (the button's spinner shows it); after 2.5s, 'Bado inaweka…'.
    - Balance too low: info glyph + blue 'Weka pesa'.
    - Lock passed: unchanged.
    - Signed out: 'Ingia ili kuweka dau · kuanzia TZS 500'.
- **7 · Empty-side note ('Nobody has backed Down yet …')** — keep
  - detail: 13px --text-faint with the info glyph, under the helper line, only when a pool side is empty, for signed-in and signed-out players alike (CD 2026-10-14 item 5).
- **7 · Signed-out Up/Down (navigate to the round page)** — keep
  - detail: Same buttons, still handing ?side= to the round page's sign-in gate; the helper now also shows the minimum stake.
- **7 · BetBreakNotice / journey arm (LazyJudTwoWay)** — keep
  - detail: Same slot, same single ternary (journey-updown §6.3).
- **7 · Locked box (pending chip 'BETS CLOSED', lock sentence, both-sides line, if-closes rows)** — restyle
  - detail: No box and no chip; the clock row already says the round is ending. The block shows the shortened lock sentence, then for a holder 'Ikiwa itafunga Juu · TZS 1,850' / 'Ikiwa itafunga Chini · TZS 0' (with 'Una pande zote mbili' first for a two-sided holder), then the next-round line. The rows stay through confirming (a server change).
- **7 · Confirming box (chip + body)** — restyle
  - detail: No chip and no box: udConfirmingBody, the holder rows and the next-round line, in calm ink.
- **7 · Refund box (chip + refund reason)** — keep
  - detail: The chip and the refundReasonFor copy stay word for word (UPDOWN-FINAL-DESIGN protects them); only the box goes. A viewer who was not in the round sees the round's neutral void note.
- **7 · Resolved strip ('UP WINS' + '$open → $close')** — move
  - detail: The result word moves to the clock row: 'Matokeo' + '▲ Juu imeshinda' (15px, Up ink). The open price moves to the price-to-beat row ('Ufunguzi'), and the close to the 'now' line ('Kufunga', in the targets' ink, with the dollar move).
- **7 · Fake disabled 'AWAITING RESULT' button** — remove
  - detail: Until the next poll arrives, the card works out from the round's times that it has closed and draws the confirming state.
- **NEW · Your result (settled)** — new
  - detail: - Won: 'Matokeo yako: Umeshinda · TZS 1,850', amount in gilt (money earned, §M3).
    - Lost: 'Umeshindwa · TZS 1,000', a neutral receipt.
    - Refunded: 'Imerudishwa · TZS 1,000'.
    - Both sides: 'Umeweka pande zote mbili · Kilicholipwa TZS 950'. This needs the server's per-side result, so it is withheld for hedgers until then.
    Existing keys; static.
- **NEW · Next-round line (locked and confirming)** — new
  - detail: Computed on the server.
    - Chain running and the market open at the close: 'Raundi ijayo itafunguliwa matokeo haya yakitoka.'
    - Chain running but the market closed at the close: 'Soko limefungwa sasa — raundi ijayo itafunguliwa saa 01:00 EAT.'
    - Chain stopped: 'Hakuna raundi nyingine iliyopangwa hapa kwa sasa.'
- **8 · Handover line + 'GO TO IT' ghost button** — restyle
  - detail: After the 2.5s hold, one sentence in round words, with inline mono digits when counting. The link, blue text 'Nenda raundi ijayo ›' on a 44px row (kit Link), appears only when the next round exists and is not already on this board.
- **9 · Footer: source kind · 'quoted HH:MM:SS EAT' + 'Open $X'** — restyle
  - detail: Source kind without 'Live', then 'imenukuliwa 14:30:00 EAT'. The stamp belongs to the price the card actually shows (open, newer price or close), via new per-read fields. 'Open $X' leaves, because the price-to-beat row states it. DotSeq, 13px --text-faint, seconds kept; the line is never dropped.
- **Place pulse (box-shadow ring) + side flash** — restyle
  - detail: The ring becomes an opacity-only ::after inset ring (--t-base / --m-settle), because §8b allows only transform and opacity. The side flash (scale 1.035) stays. Both are off under reduced motion.
- **Receipt and blocked modals, aria-live line, toast, haptic** — keep
  - detail: All five confirmation channels unchanged (§F).
- **Loading ghost card (fixed 360px)** — restyle
  - detail: One ghost per slot, built from the card's own row tokens at its real height (open, locked, settled), including the stake row when the request carries a session. The rail ghost uses the pill radius. No tape ghost.

## statesSpec

- **Open · signed out**
  - rendering: - Identity row: ₿ Bitcoin · 14:30–14:35.
    - Clock row: ● Dau linafungwa baada ya, then 02:31 (28px).
    - 'Juu au chini ya $82,754.03 ±$0.02'.
    - 'Bado hakuna bei mpya tangu ufunguzi saa 14:30'.
    - 'Bwawa TZS 190,500 · wachezaji 12'.
    - Split: Juu 62% ▬ 38% Chini.
    - [Juu] [Chini] at 48px, going to the round page with ?side=.
    - Helper: 'Ingia ili kuweka dau · kuanzia TZS 500'.
    - The empty-side note, only if a side is empty.
    - Source line.
    About 329px.
- **Open · signed in, no stake yet**
  - rendering: As signed out, plus one row of stake pills (500 · 1K · 2.5K · 5K · + Maalum, 44px, pill radius) above the buttons. The helper reads 'Bonyeza Juu au Chini kuweka dau · TZS 500'. A tap places the bet, answered by the receipt modal, toast, haptic, aria-live line and the place ring. About 381px; the action slot keeps this height through the lock.
- **Open · holding a stake**
  - rendering: 'UKO NDANI' with side chips (Juu TZS 1,000 / Chini TZS 500) above the stake pills. Repeat taps are repeat bets. No payout figure before the lock (§C3).
- **Open · custom amount**
  - rendering: '+ Maalum' opens a 44px TZS input (kit Input md) with the range hint 'TZS 500 – TZS 1,000,000' at 13px. Out of range: 'Nje ya kiwango kinachoruhusiwa · …' in danger ink, never rose. The buttons stay disabled until the amount is valid.
- **Open · placing / slow / balance too low / lock passed**
  - rendering: The tapped button shows the kit Spinner and the helper reads 'Inaweka… · TZS 500' with no red dot; after 2.5s it reads 'Bado inaweka — …'. Balance too low: info glyph + 'Salio halitoshi…' + a blue 'Weka pesa' link, with the buttons disabled. Lock passed on the server clock: udErrSelectionClosed.
- **Open · last 30 seconds**
  - rendering: The caption becomes 'Sekunde za mwisho' in every motion setting and a polite live region announces it once. The digits keep --text. Full motion adds the kit .m-urgent breathe on the digits; reduced, minimal and OS-reduce show the words only.
- **Open · no confirmed price newer than the open yet (every 5-minute round while betting)**
  - rendering: The 'now' line reads 'Bado hakuna bei mpya tangu ufunguzi saa 14:30' in --text-subtle, the band's own words. No figure, no 0.00%, nothing labelled live beside it.
- **Open · a confirmed price newer than the open exists (10/15-minute rounds)**
  - rendering: The 'now' line reads 'Bei iliyothibitishwa' + '▲ $82,801.10 +$47.07' in the targets' ink (valueTone). Strictly between the targets the figure is muted, with a second line 'Tofauti na ufunguzi $0.20 tu — haitoshi kuamua'. The source line stamps that price's time.
- **Open · empty or one-sided pool**
  - rendering: The split shows the dashed rail, named 'Hakuna dau bado' or 'Upande mmoja tu'. Never a 50/50. The empty-side note sits under the helper line.
- **Open · on a break or self-excluded / journey reader**
  - rendering: BetBreakNotice or LazyJudTwoWay stands in the stake-and-buttons slot; everything else is unchanged.
- **Open · no open price (legacy)**
  - rendering: 'Juu au chini ya — Inasubiri bei' with no ± band; the 'now' line is left out. Betting is allowed exactly when the server says so.
- **Locked · not holding**
  - rendering: The live dot goes. The clock row reads 'Raundi inaisha baada ya 0:36', counting to the close. The price rows stay as they were, with the split and stats frozen. The action slot, at the same reserved height, reads 'Dau lilifungwa saa 14:34:00 EAT ili mtu asiweke dau kwenye matokeo anayoyaona tayari.' followed by the next-round line.
- **Locked · holding one or both sides**
  - rendering: Adds 'Ikiwa itafunga Juu · TZS 1,850' / 'Ikiwa itafunga Chini · TZS 0', amounts in side ink. A two-sided holder sees 'Una pande zote mbili' first and may see the card grow by about 18px.
- **Locked or confirming · what comes next**
  - rendering: - Chain running and the market open at the close: 'Raundi ijayo itafunguliwa matokeo haya yakitoka.'
    - Chain running but the market closed at the close (gold's daily break, weekends): 'Soko limefungwa sasa — raundi ijayo itafunguliwa saa 01:00 EAT.', worked out on the server from the same market calendar the chain uses.
    - Chain stopped: 'Hakuna raundi nyingine iliyopangwa hapa kwa sasa.'
- **Past the close, before the next poll**
  - rendering: Drawn as confirming, worked out from the round's times. No fake AWAITING RESULT button.
- **Confirming**
  - rendering: The clock row reads 'Matokeo baada ya 1:31', counting to the measured median result time (.m-tick at the close). Once the estimate is spent, or if it was never measured, it reads 'Inasubiri matokeo —:—'. The body shows udConfirmingBody and the next-round line. The holder rows stay, since the pool is frozen. No chip, no box, no red.
- **Settled · first 2.5 seconds (hold)**
  - rendering: The clock row swaps (m-tick) to 'Matokeo' + '▲ Juu imeshinda' (15px, side ink). The price rows read 'Ufunguzi $82,745.45' and 'Kufunga ▲ $82,754.03 +$8.58' in the targets' ink. The split shows the final pool, and the source line is stamped with the closing price's time. The result popup is untouched.
- **Settled · the viewer played**
  - rendering: - Won: 'Matokeo yako: Umeshinda · TZS 1,850', amount in gilt.
    - Lost: 'Umeshindwa · TZS 1,000', neutral.
    - Refunded: 'Imerudishwa · TZS 1,000', neutral.
    - Both sides: 'Umeweka pande zote mbili · Kilicholipwa TZS 950', shown only after the server's per-side fix.
    Static: no count-up, no seal.
- **Settled · refunded or void**
  - rendering: The clock row reads 'Matokeo · Batili' (muted) or names the winning side. The refund chip and the refundReasonFor copy stay word for word. A viewer who was not in the round sees only the round's neutral void note.
- **Settled · after the hold (handover)**
  - rendering: One sentence:
    - Next round is the card above: 'Raundi inayofuata tayari imeanza.', with no link.
    - Counting: 'Raundi ijayo baada ya 0:47', digits in inline mono.
    - Soon: udNextMatchSoonBody.
    - Market closed: the market-closed line.
    - Chain stopped: udNextMatchNoneBody.
    The blue 'Nenda raundi ijayo ›' link appears only when the next round exists and is not on this board.
- **Legacy round with no targets**
  - rendering: The price to beat shows no ± band, and the figure is coloured against the open (the PriceHero fallback).
- **Board · loading**
  - rendering: One ghost per slot, with the card's rows at their real height. The rail ghost uses the pill radius. No tape ghost. The shimmer stops under reduced motion.
- **Board · no round for this game**
  - rendering: Running chain: the next-round EmptyState body. Stopped chain: 'Hakuna raundi nyingine iliyopangwa hapa kwa sasa.' Market closed: the market-closed line with its reopening time.
- **Board · rollover**
  - rendering: The new open card arrives once with .m-in-lift (--t-move/--m-settle) and the other cards reflow instantly. The 340ms tap guard covers the arrival. Open and locked cards are the same height, so a player scrolled further down does not jump; scroll anchoring stays on.

## marketCardSpec

- ****
  - change: On live grid cards the LIVE chip becomes a static 6px broadcast-red dot before the time left, carrying sr-only 'Mubashara'. The time left moves to the top right on every live card, into the featured card's own .mcardp-closes slot. A status chip appears only when the card is not live: Imefungwa (royal), Imetatuliwa or Batili. The landing's featured card is unchanged.
  - why: Twenty breathing LIVE chips on a poll board said nothing the time left doesn't already say. Dropping them ends the LIVE + HOT double red and frees the meta row for the pool's word.
- ****
  - change: At most one signal chip, in priority order NEW > SOON > HOT > TIPPING (today HOT is tested before SOON).
  - why: The single chip should carry the fact a player can act on, and that is time.
- ****
  - change: SOON reads 'Closing soon' / 'Inafungwa' / '即将截止' and keeps its royal 'pending' paint, plus the W4 clock glyph when that lane ships. CLOSED stays royal.
  - why: 'Karibu' first reads as 'Welcome' and collides with 'Karibu sare'. Repainting CLOSED neutral or SOON amber would break §B11 (Ali's D4: CLOSED is royal everywhere; amber means someone must act). SOON and CLOSED never share a card, because SOON appears only on live cards, and the glyph tells them apart.
- ****
  - change: Chips move from the kit's xs size (9.5px) to its md size (11px, same 23px box). The category word goes from 10 to 11px and the YES caption from 9.5 to 11px.
  - why: With one chip per row there is room, and every label on the card lands inside §8a.3's 11–13px band.
- ****
  - change: The 28px YES% figure turns pearl (--text); the 'NDIO' caption above it keeps the YES ink.
  - why: A 37% minority in big green reads as 'likely'. The caption names the side and the bar shows who leads.
- ****
  - change: The YES/NO buttons keep '@ 37%' / '@ 63%', the only place the NO share is printed. The suffix moves to the label's 13px, in mono and full ink.
  - why: Money shares were ruled as kept (Ali, 2026-10-14, item 1). One size inside the button, and no opacity on a money figure.
- ****
  - change: The 24h move keeps its neutral ink and nudges only when its direction changes. Its ▲/▼ characters become glyphs when the PHOSPHOR W7 lane ships.
  - why: No text characters used as icons; the glyph keys belong to that lane.
- ****
  - change: MicroSpark, shown only where at least 4 real points exist (D49):
    - equal time slices (16 over 7 days), each carrying the last real split forward
    - a y-range of at least 10 points
    - an 11px 'siku 7 / 7d / 7天' label at its left end
    - area fill raised from 6% to 10%, keeping the 1.5px aqua line, plus an aqua end dot
    - draw-in on --t-stage/--m-glide
  - why: Snapshots are written only when someone bets, so carrying a value forward is true and compressing by index is not. Today a 1-point wiggle fills the band, and the band reads as empty (~1.06:1).
- ****
  - change: A new card says it is empty once: an em-dash price with no caption, the dashed rail (accessible name 'Hakuna dau bado'), one brand-blue invitation 'Kuwa wa kwanza kutabiri', plus the NEW chip. The separate 'Hakuna dau bado' caption and the meta row's 'Hakuna bwawa bado' go.
  - why: The same fact was being said three or four ways.
- ****
  - change: Meta row: 'Bwawa TZS 190,500' with its word on every grid card (13px, as on the featured card), then comments, then the 44px (i).
  - why: A figure needs its noun, and moving the time left to the top gives the 320px row room for it.
- ****
  - change: Closed, resolved and void cards: the dead disabled pill becomes a quiet 13px fact line from existing keys:
    - resolved: 'Bwawa la mwisho TZS 1,204,000'
    - void: 'Madau yote yalirejeshwa kikamilifu — hakuna ada iliyokatwa.'
    - closed: 'Inasubiri matokeo'
    The price slot states the verdict, and the meta row shows the settle date instead of restating the outcome.
  - why: Ends 'resolved' said three times and 'Imefungwa' on a void, with no new keys and equal card heights.
- ****
  - change: Swahili 'resolved' becomes one word: statusResolved changes from 'Imekamilika' to 'Imetatuliwa', the word outcomes and tables already use.
  - why: One word per concept.
- ****
  - change: The traders row keeps its real crests and reads 'watabiri 65' in Swahili (noun first, like 'dakika 5' and 'wachezaji 12'). en and zh unchanged.
  - why: One counting order across both card families.
- ****
  - change: Details goes to 11px (from 11.5) so the 17px footer row and its 40px reach are untouched. The YES/NO press and press-pop use var(--m-press) 0.97 (were 0.96 and 0.955).
  - why: MOBILE-VISUAL §6 protects the footer, and motion.css allows one press scale.
- ****
  - change: The /markets skeleton takes --r-lg 16 (was 8px), and MARKET_CARD_H is re-derived for the new rows.
  - why: A skeleton should have the card's own shape; §6 allows skeleton heights to change.
- ****
  - change: /live's PulseCard keeps its own dense identity (C1e) but prints '@ %' at full ink, removing the 75% opacity.
  - why: Contrast on a money figure; PV-10 measured the faded suffix at about 3.5:1.
- ****
  - change: Kept as they are:
    - the 15px title and its 2-line reserve
    - the tipping rail and gilt needle
    - the 44px YES/NO and 44px info buttons
    - the share + Details footer and its reach
    - the watermark at rest
    - the one-sided refund note
  - why: These are MOBILE-VISUAL §6's must-nots and the signature the critics praised.

## motionSpec

- Countdown digits never animate per second: they are tabular and only the digit leaf re-renders. Caption changes use the kit .m-tick keyed on the phase (--t-base 220 / --m-glide). A polite live region announces each phase change, and 'Sekunde za mwisho', once; it never reads the digits.
- Last 30 seconds: the words are the cue in every tier, and full motion adds the kit .m-urgent (m-breathe 1000ms) on the digits. ud-count-pulse (1s, off the ladder, with a stale 'turns rose' comment) is retired, and .m-urgent gets its [data-motion=reduced] entry.
- The locked clock and the result clock have their own captions, joined by one .m-tick at the close. The 0:00 → 1:31 change becomes a labelled phase change rather than a silent jump, and the close stays a hard countdown, never a median estimate.
- The lock moment: at t=0 the live dot leaves (no fade), the caption ticks, and the action slot's new content arrives with .m-in inside its reserved height, so nothing shifts. Frame review at t=0/50/100% at 360, CPU 4× (§8b).
- Rollover: the new current card arrives once with .m-in-lift, and the other cards move instantly (no layout animation). The tap guard goes from 300 to 340ms (= --t-move).
- Bet placed: the place ring becomes an opacity-only ::after inset ring (--t-base/--m-settle), because §8b allows only transform and opacity. ud-side-flash (scale 1.035) stays. Both are off under reduced motion.
- Pool changes that arrive with the 20s poll: the TippingBar fill and its gilt needle travel to the new split (the needle on --m-pivot, its licensed curve, over --t-move), and a changed pool or players figure takes one .m-tick. Instant under reduced motion. This is the board's honest liveness: it moves only when real money moves.
- Stake pills: the colour transition moves from Tailwind's 150ms transition-colors to a globals.css rule on --t-quick/--m-glide.
- Live dot: it breathes (the kit's 2600ms) only before the bettable card's caption. [data-motion=reduced] .live-dot goes from 1.6s to 2600ms; today it runs faster when motion is reduced. Poll market cards get a static dot.
- Settle: the clock row swaps to the result word with .m-tick. No seal, confetti or count-up on the card (§C5, §M7); the result popup keeps the moment.
- Game rail: selection is instant and no pill changes width. The board dims to --state-disabled-opacity on --t-base/--m-glide while the next board streams in, as today.
- Chart: it opens on tap on phones, or by default on computers per Question 2. Its placeholder height is set in CSS (300px; 380px from 1024), so neither the effect nor the loading code moves anything. The terminal fades in with .m-in and its height never animates. Kinetic scroll stays off under reduced motion (F31). The .pchart-range rails move from --dur-micro/--ease-micro to --t-quick/--m-glide.
- Loading: ghosts at the real heights; the shimmer is already in the reduced-motion list.
- Market card: the YES/NO buttons and press-pop use var(--m-press) 0.97 (were 0.96/0.955). The spark draws in once on mount on --t-stage/--m-glide (was the legacy --dur-arrive/--ease-glide) and is static under reduced motion. The move glyph nudges only on a direction change, and the hover lift is unchanged.
- No new infinite loop anywhere. Every new rule carries its three reduced-motion branches (test:reduce-motion rule 2.1).

## paletteSpec

- Green and rose appear only on the bet's two sides: the Up/Down buttons, the split labels and bar, the you're-in chips, the figure inked by the targets (valueTone), the result word, the if-closes amounts and the result squares. The two tinted target boxes go.
- On the page, broadcast red is one breathing dot before the bettable card's caption; the shell ticker above is untouched. The page eyebrow, the tape's dot and word, the card's status line and the red 'placing' bullet all go. Poll market cards get a static dot instead of a LIVE chip.
- Clock digits are --text while counting and --text-subtle for —:—. The result and handover clocks leave --brand-300, which is the link ink (§B4c).
- Blue (--brand-300) is only for links and selection: 'Weka pesa', 'Nenda raundi ijayo ›', 'Maelezo ›', and the selected pill (--pill-active plus a 1px --brand-400 outline). The stake pills now use the same 'selected' look as the filter pills.
- Gold appears only on the settled card's own winnings amount (§M3) and the tipping bar's existing gilt needle.
- Neutral inks each have one job: --text for figures, --text-muted for secondary figures and sentences, --text-subtle for labels and captions, --text-faint for stamps, the helper line and the source line (at 13px only, §T4).
- Every round card uses the same raised material (rung 1, §M2, §8a.2). Hierarchy comes from content: only the bettable card carries the live dot, the stake row and the two coloured buttons.
- Market card:
  - The YES% figure turns pearl (--text); the 'NDIO' caption keeps the YES ink.
  - HOT stays rose and becomes the only rose chip.
  - SOON stays royal ('pending', with the W4 clock glyph when available) and moves ahead of HOT.
  - CLOSED stays royal (§B11 D4).
  - NEW and TIPPING keep their royal steps.
- Micro charts are aqua only: a 1.5px --aqua-400 spark line, area raised from 6% to 10%, an aqua end dot. No side colours on a card.
- No amber on these surfaces: §B11 keeps amber for 'someone must act'. No new tokens or hues. The new contrast pairs are proven in test:contrast: 11px --yes-300/--no-300 on --wash-raised, 13px --text-faint on --wash-raised, the pearl 28px figure on the market wash, and the 10% spark area.

## systemFixes

- Spacing half-step trap: no Tailwind 2.5/3.5 utilities in updown-card.tsx, updown-stake-controls.tsx or updown/page.tsx. The card's rhythm is written as .ud-card rules on --sp-* tokens. test:spacing-scale's ceiling (405) drops by the uses retired. No new guard, because that ratchet already counts these keys.
- Type collisions:
  - The card's 15px (title and figures) goes through globals.css .ud-title/.ud-figure, a cross-ladder reach to --type-body (§T7), never text-[15px].
  - Its 11px is text-caption, not text-micro (which is 10px).
  - 14.5, 15.5, 14, 12.5, 11.5, 10.5, 10 and 9.5px leave the card.
  - The market card's category, caption and chips (kit Chip md) go to 11px, its '@ %' suffix to 13px and Details to 11px.
- One set of rhythm tokens: --ud-pad (12 on Compact phones, 16 otherwise), --ud-gap (12/16) and 8/4 inside a block. These retire --ud-gap-lg/md/sm, --ud-act-pt and the .ud-* margins (12/28/28/24/22), and are declared with Compact rungs on html (density-contract). The .ud-card padding replaces the 8/16/16 it inherited from .mcardp, so the market card's padding (protected by §6) is untouched.
- Ghost heights: the card ghosts are built from the same row tokens, per slot (open signed in or out, locked, settled). The 360px literal and the tape ghost go, the rail ghost uses the pill radius, and the /markets skeleton radius goes from 8px to --r-lg.
- The chart placeholder height moves into CSS per breakpoint (300px; 380px from 1024) instead of being set by a JS effect, so nothing shifts on load.
- Duplicated recipes:
  - One SideButtons component for the signed-in and signed-out pair (ends E-196).
  - The state boxes' inline styles and the grid's inline gridTemplateColumns become .ud-grid / .ud-* classes; the board grid takes the market grid's gap (16, 12 on Compact).
  - The stake chips' inline chipStyle becomes .ud-chip[aria-checked=true].
- Naming, one word per concept:
  - round (raundi/回合) replaces match/mechi/下一场/轮
  - pool (Bwawa/奖池) replaces Vol/Jumla/总额 on the card and the round page
  - one udMinN template ('dakika {n}') feeds the rail, the aria-labels, the round page chip and roundName; JourneyCard then says the board's 'Juu na Chini · dakika 15'
  - zh 已参与 (You're in) is kept apart from 已下注 (Bet placed)
- Per-read time stamps: BoardRound gains openQuotedAt, readQuotedAt and closeQuotedAt from the stored observations, as getRoundDetail already does. page.tsx stops handing activeAsset.sourceQuotedAt to every card.
- Server: myPayoutIfUp/myPayoutIfDown are computed for 'confirming' as well as 'locked', since the pool is frozen in both. The card gates them on !bettable && !settled.
- Server, hedged results: myStakesByMarket currently takes the status from the first settled row and the side from the last. It should keep a result per side, and BoardRound.myResult gains bothSides plus the realised payout. Until that ships, the your-result line is withheld for two-sided holders.
- Server, next-round awareness: BoardRound.successor gains opensWithResult and nextOpenAtMs. nextOpenAtMs is the first chain boundary at or after closesAt that falls in an open market session (marketSessionAt + deadHoursFor), filled only when the chain is RUNNING. Both are computed for the in-play and settled rounds, from the same calendar advanceChain uses. The empty board finally reads chainPaused.
- Motion debts: ud-count-pulse is retired for the kit .m-urgent; [data-motion=reduced] .live-dot goes from 1.6s to 2600ms; .pchart-range and the market spark leave their legacy tokens; the press scales 0.96/0.955 become var(--m-press).
- AssetMark: ₿ is drawn only for BTC (ASSET_MARKS keyed by ticker). Other assets show their ticker letters until the PHOSPHOR W5 lane supplies currency marks.
- The place pulse moves to an opacity-only ::after ring (§8b). This also stops any grid entrance animation from swallowing it.
- Market spark data: market-history's compress() by index becomes equal time slices that carry the last value forward, and MicroSpark gets a 10-point y-range floor. seriesToXY auto-scales min..max today.
- Live dot variant: market cards use the kit Dot with pulse={false} (static). Breathing is kept for real-time surfaces.
- The red .live-dot leaves the stake helper's 'placing' line; the button's spinner shows the bet is placing.
- test:design-frozen: raw values only through tokens, so the new rules add no hex or px literal outside the token files.

## copyChanges

- ****
  - where: Card stats: pool (udVolume → udPool), and the round page's caption under the pool figure
  - current: Vol / Jumla / 总额
  - en: Pool
  - sw: Bwawa
  - zh: 奖池
- ****
  - where: Card stats: players (new udPlayersN + udPlayersOne)
  - current: users glyph + a bare number
  - en: {n} players · 1 player
  - sw: wachezaji {n} · mchezaji 1
  - zh: {n} 位玩家
- ****
  - where: Round length everywhere (new template udMinN: rail pills, aria-labels, round page chip, roundName → JourneyCard)
  - current: '{d} {udMin}' → '5 min' / '5 dakika' / '5 分钟'
  - en: {n} min
  - sw: dakika {n}
  - zh: {n} 分钟
- ****
  - where: Clock caption: last 30 seconds (new udLastSeconds)
  - current: no word (opacity pulse only, switched off when motion is reduced)
  - en: Last seconds
  - sw: Sekunde za mwisho
  - zh: 最后几秒
- ****
  - where: Clock caption: locked, counting to the close (udClosesIn value edit; card and round page)
  - current: Result in / Matokeo baada ya / 距开奖 (the same words as the result clock)
  - en: Round ends in
  - sw: Raundi inaisha baada ya
  - zh: 距本回合结束
- ****
  - where: Card 'now' line before any newer confirmed price (reuses the band's udMatchNoNewPrice)
  - current: Confirmed price $82,754.03 0.00% · Exactly at the opening price
  - en: No new price since the open at {time}
  - sw: Bado hakuna bei mpya tangu ufunguzi saa {time}
  - zh: 自 {time} 开盘以来暂无新价格
- ****
  - where: Price-to-beat label (udWinTarget, same key, now a sentence-case label)
  - current: HIGHER OR LOWER THAN (caps, over two tinted boxes)
  - en: Higher or lower than
  - sw: Juu au chini ya
  - zh: 高于或低于
- ****
  - where: Helper line while a bet is placing
  - current: TZS 500 · Live / TZS 500 · Mubashara / TZS 500 · 实时
  - en: Placing… · TZS 500
  - sw: Inaweka… · TZS 500
  - zh: 下注中… · TZS 500
- ****
  - where: Signed-out helper (udSignInToBet + new udFromAmount)
  - current: nothing (visitors never see an amount)
  - en: Sign in to bet · from TZS 500
  - sw: Ingia ili kuweka dau · kuanzia TZS 500
  - zh: 登录后下注 · 最低 TZS 500
- ****
  - where: Stake prompt (udEnterStake, sw only)
  - current: Weka kiasi kucheza
  - en: Enter a stake to bet (unchanged)
  - sw: Weka kiasi ili kucheza
  - zh: 输入投注额 (unchanged)
- ****
  - where: You're in (udYoureIn, zh only)
  - current: 已下注 (the same string as 'Bet placed')
  - en: You're in (unchanged)
  - sw: Uko ndani (unchanged)
  - zh: 已参与
- ****
  - where: Lock sentence (udLockedWhy): shorter, same fairness reason, two lines at 360
  - current: Bets closed at {time} — the result is locked so nobody can bet on an outcome they can already see. / Dau lilifungwa saa {time} — matokeo yamefungwa ili mtu asiweke dau kwenye jibu analoliona tayari.
  - en: Bets closed at {time} so nobody can bet on a result they can already see.
  - sw: Dau lilifungwa saa {time} ili mtu asiweke dau kwenye matokeo anayoyaona tayari.
  - zh: 已于 {time} 停止下注，避免有人对已看得见的结果下注。
- ****
  - where: What comes next: chain running, market open at the close (new udNextOpensWithResult)
  - current: nothing until the round settles
  - en: The next round opens when this result is in.
  - sw: Raundi ijayo itafunguliwa matokeo haya yakitoka.
  - zh: 本回合结果揭晓后，下一回合随即开启。
- ****
  - where: What comes next: market closed at the close (new udMarketClosedNext)
  - current: nothing, or 'Next match soon' while gold is shut
  - en: The market is closed now — the next round opens at {time} EAT.
  - sw: Soko limefungwa sasa — raundi ijayo itafunguliwa saa {time} EAT.
  - zh: 市场目前休市——下一回合将于 {time} EAT 开启。
- ****
  - where: Handover captions and line (udNextMatch* values)
  - current: Next match in / live / soon · No next match · The next match is already under way. / Mechi ijayo … / 下一场…
  - en: Next round in · Next round live · Next round soon · No next round · The next round is already under way.
  - sw: Raundi ijayo baada ya · Raundi ijayo inaendelea · Raundi ijayo hivi karibuni · Hakuna raundi ijayo · Raundi inayofuata tayari imeanza.
  - zh: 下一回合还有 · 下一回合进行中 · 下一回合即将开始 · 暂无下一回合 · 下一回合已经开始。
- ****
  - where: Handover link (udNextMatchGo), shown only when the next round is not on the board
  - current: GO TO IT / NENDA / 前往 (10.5px caps ghost button)
  - en: Go to the next round ›
  - sw: Nenda raundi ijayo ›
  - zh: 前往下一回合 ›
- ****
  - where: Settled card: your result (reuses udYourResult, udPosWon/Lost/Refunded, udBothSides, udPaidOut)
  - current: nothing on the card
  - en: Your result: Won · TZS 1,850 / Lost · TZS 1,000 / Refunded · TZS 1,000 / You backed both sides · Paid out TZS 950
  - sw: Matokeo yako: Umeshinda · TZS 1,850 / Umeshindwa · TZS 1,000 / Imerudishwa · TZS 1,000 / Umeweka pande zote mbili · Kilicholipwa TZS 950
  - zh: 您的结果：已赢 · TZS 1,850 / 已输 · TZS 1,000 / 已退还 · TZS 1,000 / 您同时押了涨和跌 · 已支付 TZS 950
- ****
  - where: Settled outcome word (udUpWins/udDownWins, en only: past tense)
  - current: Up wins / Down wins
  - en: Up won / Down won
  - sw: Juu imeshinda / Chini imeshinda (unchanged)
  - zh: 涨方获胜 / 跌方获胜 (unchanged)
- ****
  - where: Source labels (udSource*); the time stamp already shows how recent the price is
  - current: Live crypto market … / Soko la sarafu-fiche la moja kwa moja … / 加密货币实时行情 …
  - en: Crypto market · Stock market · Metals market · Currency market · Market data
  - sw: Soko la sarafu-fiche · Soko la hisa · Soko la madini · Soko la fedha za kigeni · Data ya soko
  - zh: 加密货币行情 · 股票市场行情 · 贵金属行情 · 外汇市场行情 · 市场行情
- ****
  - where: Split bar's accessible name (probBarAria → barReading, drawn as an image)
  - current: Up probability 62% / Uwezekano wa Juu 62% / 「涨」概率 62%
  - en: 62% Up, 38% Down
  - sw: Juu 62%, Chini 38%
  - zh: 「涨」62%，「跌」38%
- ****
  - where: Board page eyebrow (udStreaming on PageHeader)
  - current: LIVE / MUBASHARA / 实时
  - en: (removed)
  - sw: (imeondolewa)
  - zh: （移除）
- ****
  - where: Board tagline (udTagline, en only; it wrapped to two lines at 360)
  - current: Will the price be higher or lower when the clock runs out?
  - en: Will the price close higher or lower?
  - sw: Je, bei itakuwa juu au chini muda ukiisha? (unchanged)
  - zh: 倒计时结束时，价格会更高还是更低？(unchanged)
- ****
  - where: Chart opener (replaces the Rounds | Chart switch)
  - current: Rounds | Chart · Raundi | Chati · 轮次 | 走势图
  - en: Price chart
  - sw: Chati ya bei
  - zh: 价格走势图
- ****
  - where: Empty board, chain running (udNextRoundSoonBody)
  - current: The next {n}-minute round is being prepared. Stay close — it opens here.
  - en: The next {n}-minute round opens here once its opening price is confirmed — no need to reload.
  - sw: Raundi ijayo ya dakika {n} itafunguliwa hapa bei yake ya ufunguzi ikithibitishwa — huhitaji kupakia upya.
  - zh: 下一个 {n} 分钟回合将在开盘价确认后于此开启，无需刷新。
- ****
  - where: zh round word (udRoundSettled, udLastRounds, udViewCubes, handover keys)
  - current: 本轮已结算 · 最近几轮 · 轮次 · 下一场
  - en: (unchanged)
  - sw: (unchanged)
  - zh: 本回合已结算 · 最近回合 · 回合 · 下一回合
- ****
  - where: JourneyCard round name (/live, home, watchlist, results) via roundName
  - current: Bitcoin Up or Down · 15 min / Bitcoin Juu au Chini · dakika 15
  - en: Bitcoin Up & Down · 15 min
  - sw: Bitcoin Juu na Chini · dakika 15
  - zh: 比特币 涨跌 · 15 分钟
- ****
  - where: Market SOON chip (common.soon, used only by the market card)
  - current: Soon / Karibu / 即将
  - en: Closing soon
  - sw: Inafungwa
  - zh: 即将截止
- ****
  - where: Market resolved status (statusResolved, sw only)
  - current: Imekamilika on the chip, Imetatuliwa on outcomes and tables
  - en: Resolved (unchanged)
  - sw: Imetatuliwa
  - zh: 已结算 (unchanged)
- ****
  - where: Market card meta row: pool
  - current: TZS 190,500 (the word only for screen readers)
  - en: Pool TZS 190,500
  - sw: Bwawa TZS 190,500
  - zh: 奖池 TZS 190,500
- ****
  - where: Market settled action row (existing resFinalPool / resVoidRefund / waitingForResults)
  - current: dead pill 'Imekamilika NDIO' / 'Imefungwa' on a void
  - en: Final pool TZS 1,204,000 · All stakes were refunded in full — no fee taken. · Waiting for results
  - sw: Bwawa la mwisho TZS 1,204,000 · Madau yote yalirejeshwa kikamilifu — hakuna ada iliyokatwa. · Inasubiri matokeo
  - zh: 最终奖池 TZS 1,204,000 · 所有投注已全额退还——未收取任何费用。 · 等待结果
- ****
  - where: Market traders row (predictors count order, sw only)
  - current: 65 watabiri
  - en: 65 predictors (unchanged)
  - sw: watabiri 65
  - zh: 65 位预测者 (unchanged)
- ****
  - where: /markets sort label (sortClose) matched to the odds pill (oddsCall)
  - current: Closest call / Karibu na sare / 势均力敌 (zh also means 'Contested')
  - en: Close call
  - sw: Karibu sare
  - zh: 接近五五
- ****
  - where: /markets Watching empty state (watchingEmptyBody)
  - current: Tap the star on a market to follow it. Everything you watch collects here.
  - en: Open a market and tap its star to follow it. Everything you watch collects here.
  - sw: Fungua soko kisha gusa nyota yake ili kulifuatilia. Kila unachofuatilia kitakusanyika hapa.
  - zh: 打开一个市场，点击其星标即可关注。关注的市场都会汇集在这里。
- ****
  - where: Market spark label (new)
  - current: no label
  - en: 7d
  - sw: siku 7
  - zh: 7天

## ownerQuestions

- **While a round is open, what should the card say about where the price is right now? Today it repeats the opening price with '0.00% · Exactly at the opening price' under LIVE, which reads as a frozen market.**
  - question: While a round is open, what should the card say about where the price is right now? Today it repeats the opening price with '0.00% · Exactly at the opening price' under LIVE, which reads as a frozen market.
  - header: Live price
  - options: [
      {
        "label": "Confirmed prices only, said plainly (Recommended)",
        "description": "The card shows the opening price as the price to beat, then says 'Bado hakuna bei mpya tangu ufunguzi saa 14:30' until a newer confirmed price exists. Those are the landing band's own words, which you approved on 27 Sep. On longer rounds a newer confirmed price appears with its colour and its move in dollars. No new cost and no effect on the house desk. On 5-minute rounds players will not see a moving price on the card; the chart shows the trend.",
        "preview": "+------------------------------------------+\n| (B) Bitcoin               14:30 - 14:35  |\n| * Dau linafungwa baada ya         02:31  |\n| Juu au chini ya     $82,754.03 +-$0.02   |\n| Bado hakuna bei mpya tangu ufunguzi      |\n| saa 14:30                                |\n|   ...later, once a newer price exists:   |\n| Bei iliyothibitishwa ^ $82,801.10 +$47   |\n+------------------------------------------+"
      },
      {
        "label": "Add a dated market price",
        "description": "The card's 'now' line becomes 'Bei ya soko 14:33 · $82,801.10', taken from the 1-minute market feed and refreshed every 30 seconds. It is in plain ink because it is not the price that decides the round: on gold the last minute's price can differ from the deciding one by more than the $0.40 band. Keeping that feed warm costs up to about 5,800 TwelveData credits a day for Bitcoin and Gold. It also gives the house desk fresh prices, which in effect starts the 'desk's own price' you put on hold on 14 Oct. Needs a responsible-gambling check.",
        "preview": "+------------------------------------------+\n| Juu au chini ya     $82,754.03 +-$0.02   |\n| Bei ya soko 14:33         $82,801.10     |\n|   plain ink: not the price that decides  |\n|   refreshes every 30 s from the minute   |\n|   feed (credits + house-desk effect)     |\n+------------------------------------------+"
      },
      {
        "label": "A small live price chart on every card",
        "description": "A 64px price line on each card, drawn against the opening price. This reverses your 4 Sep 'no need for round chart' and goes against your 27 Sep note that people don't like these graphs. Same cost and house-desk effect as the previous option. Each card grows about 100px, so a signed-in player's buttons drop below the first screen.",
        "preview": "+------------------------------------------+\n| Juu au chini ya     $82,754.03 +-$0.02   |\n|          _/^-._     o   :                |\n|   _/-._.-'     '-._/    :                |\n| - - - - - - - - - - - - + - - (open)     |\n|                       lock               |\n| Bei ya soko 14:33  $82,801.10 +$47.07    |\n|   every card about 100px taller          |\n+------------------------------------------+"
      }
    ]
  - recommended: Confirmed prices only, said plainly (Recommended)
- **On computers, should the price chart open by default beside the open round? On phones it stays one tap away, under the cards, whichever option you pick.**
  - question: On computers, should the price chart open by default beside the open round? On phones it stays one tap away, under the cards, whichever option you pick.
  - header: Chart on PC
  - options: [
      {
        "label": "Yes, beside the round, 6-hour view (Recommended)",
        "description": "The chart opens next to the round you can bet on and fills today's empty third column; earlier rounds sit under it. It starts on 6H (5-minute candles: today's trend, with the last hour at the right edge), and a player who taps 1H keeps 1H. No effect on the house desk. Up to about 2,900 TwelveData credits a day per asset per server while computers are watching. Computers get the new design too, so the phone plan's 'no change on desktop' rule ends for these three surfaces.",
        "preview": "+------------------------------------------+\n| Up & Down                 [Rules][Yours] |\n| BITCOIN (5 min) 10 min 15 min | GOLD ..  |\n| +----------------------+ +-------------+ |\n| | PRICE CHART  6H [C|K]| | (B) Bitcoin | |\n| |       |   |    ||    | | * Dau ...   | |\n| |   ||  ||||| |  ||  - | |       02:31 | |\n| |  ||||     || ||   || | | Bwawa . 12  | |\n| |  Confirmed price - - | | [Juu][Chini]| |\n| +----------------------+ +-------------+ |\n| Last rounds [^][v][^][^][v][^]  sticky^  |\n| +----------+ +----------+                |\n| | 14:25 .. | | 14:20 .. |  earlier       |\n| +----------+ +----------+  rounds        |\n| A: opens on 6H   B: opens on 1H          |\n+------------------------------------------+"
      },
      {
        "label": "Yes, beside the round, 1-hour view",
        "description": "The same layout, starting on 1H (1-minute candles), the best view for 5-minute rounds. Side effect: whenever a computer has the board open, the house desk also gets a fresh price from it and bets on more rounds. In effect this starts part of the 'desk's own price' you put on hold on 14 Oct. Same credit limit as the first option.",
        "preview": "+------------------------------------------+\n| Same layout as the first option, but     |\n| the chart starts on 1H (1-minute         |\n| candles). While any computer has the     |\n| board open, the house desk can price     |\n| from the same minute bars.               |\n+------------------------------------------+"
      },
      {
        "label": "No, one click away on computers too",
        "description": "Computers get the new cards in a three-column grid, with the result squares and a 'Price chart' button under them, exactly like phones. Lowest cost.",
        "preview": "+------------------------------------------+\n| Up & Down                [Rules][Yours]  |\n| BITCOIN (5 min) 10 min 15 min  GOLD ..   |\n| +----------+ +----------+ +----------+   |\n| | current  | | just     | | last     |   |\n| | round    | | closed   | | settled  |   |\n| | [Up][Dn] | |          | |          |   |\n| +----------+ +----------+ +----------+   |\n| Last rounds  [^][v][^][^][v] ...         |\n| [ Price chart  v ]   (opens on click)    |\n+------------------------------------------+"
      },
      {
        "label": "Change phones only",
        "description": "Computers keep today's board and cards pixel for pixel, as the phone plan requires. The redesign reaches phones only, so computers keep the price strip, two filter rows, the cubes/chart switch and the old cards.",
        "preview": "+------------------------------------------+\n| Computers: today's board, pixel for      |\n| pixel (price strip, two filter rows,     |\n| cubes/chart switch, today's cards).      |\n| Phones: the new design.                  |\n+------------------------------------------+"
      }
    ]
  - recommended: Yes, beside the round, 6-hour view (Recommended)
- **How should players choose the game (asset and round length) on phones? Players told you they don't notice today's filter.**
  - question: How should players choose the game (asset and round length) on phones? Players told you they don't notice today's filter.
  - header: Game picker
  - options: [
      {
        "label": "One visible row of game buttons (Recommended)",
        "description": "Under the title: BITCOIN [dakika 5] [dakika 10] [dakika 15] · DHAHABU [dakika 15] … One tap switches games. The row scrolls sideways and opens on the current game, and the chosen one is outlined. It is the same 44px height as today's field, and the separate price strip goes. Computers get the same single row.",
        "preview": "+------------------------------------------+\n| Juu na Chini                  [=]  [#>]  |\n| Je, bei itakuwa juu au chini muda...     |\n| BITCOIN (dakika 5) dakika 10 dakika 1>   |\n| +--------------------------------------+ |\n| | (B) Bitcoin            14:30 - 14:35 | |\n| | * Dau linafungwa baada ya      02:31 | |\n| +--------------------------------------+ |\n|   one tap switches; scrolls sideways;    |\n|   the chosen game is outlined            |\n+------------------------------------------+"
      },
      {
        "label": "Keep today's 'Filters' field",
        "description": "A full-width 'VICHUJIO · Bitcoin · dakika 5 ▾' field that opens a sheet with ASSET, DURATION and a Done button (the design since 5 Sep). Choosing a game takes 3–4 taps.",
        "preview": "+------------------------------------------+\n| Juu na Chini                  [=]  [#>]  |\n| Je, bei itakuwa juu au chini muda...     |\n| +--------------------------------------+ |\n| | [=] VICHUJIO    Bitcoin . dakika 5 v | |\n| +--------------------------------------+ |\n|   tap -> sheet: ASSET / DURATION / Done  |\n+------------------------------------------+"
      },
      {
        "label": "Two rows: assets, then lengths",
        "description": "Bitcoin and Dhahabu on one row, the chosen asset's round lengths on a second. Clear when there are many assets, but 48px taller, so the Up/Down buttons slide down by the same amount.",
        "preview": "+------------------------------------------+\n| Juu na Chini                  [=]  [#>]  |\n| Je, bei itakuwa juu au chini muda...     |\n| (Bitcoin)  Dhahabu                       |\n| (dakika 5)  dakika 10  dakika 15         |\n|   +48px: the bet moves down a row        |\n+------------------------------------------+"
      }
    ]
  - recommended: One visible row of game buttons (Recommended)
- **The two coloured boxes 'JUU ≥ $82,754.05' and 'CHINI ≤ $82,754.01' only restate the opening price plus or minus two cents (forty cents on gold). Should they stay on the card?**
  - question: The two coloured boxes 'JUU ≥ $82,754.05' and 'CHINI ≤ $82,754.01' only restate the opening price plus or minus two cents (forty cents on gold). Should they stay on the card?
  - header: Target boxes
  - options: [
      {
        "label": "Remove them, keep '± $0.02' (Recommended)",
        "description": "The card says 'Juu au chini ya $82,754.03 ± $0.02' once. The exact UP ≥ / DOWN ≤ prices stay on the round page, one tap away, and in the rules. Saves about 70px and two coloured boxes, and the price stops appearing five times.",
        "preview": "+------------------------------------------+\n| Juu au chini ya     $82,754.03 +-$0.02   |\n| Bado hakuna bei mpya tangu ufunguzi      |\n| saa 14:30                                |\n| Bwawa TZS 190,500 . wachezaji 12         |\n|   exact UP >= / DOWN <= prices: on the   |\n|   round page, one tap away               |\n+------------------------------------------+"
      },
      {
        "label": "One quiet line with the exact prices",
        "description": "'Juu ≥ $82,754.05 · Chini ≤ $82,754.01' in small text under the price to beat, instead of two boxes. Keeps the exact prices on the card for gold, where ±$0.40 matters. Costs one line (18px).",
        "preview": "+------------------------------------------+\n| Juu au chini ya     $82,754.03 +-$0.02   |\n| Juu >= $82,754.05 . Chini <= $82,754.01  |\n| Bado hakuna bei mpya tangu ufunguzi      |\n| saa 14:30                                |\n|   one quiet line instead of two boxes    |\n+------------------------------------------+"
      },
      {
        "label": "Keep the two boxes",
        "description": "As today: about 70px and two coloured washes.",
        "preview": "+------------------------------------------+\n| JUU AU CHINI YA $82,754.03     +-$0.02   |\n| +-----------------+ +-----------------+  |\n| | ^ JUU           | |         CHINI v |  |\n| | >= $82,754.05   | |  <= $82,754.01  |  |\n| +-----------------+ +-----------------+  |\n|   as today (about 70px)                  |\n+------------------------------------------+"
      }
    ]
  - recommended: Remove them, keep '± $0.02' (Recommended)

## rulingsToReverse

- **MOBILE-VISUAL-PLAN §6, last row: 'Desktop ≥ 640 — every card and board pixel must not change (zero-diff control)'.**
  - ruling: MOBILE-VISUAL-PLAN §6, last row: 'Desktop ≥ 640 — every card and board pixel must not change (zero-diff control)'.
  - proposal: Retire the zero-diff control for the /updown board, the Up & Down card and the market card, so they share one anatomy, rhythm and wording at every width. The market card's must-nots stay: title size and 2-line reserve, 44px YES/NO, 44px info button, footer gaps and reach. Decided by Question 2: options A, B or C retire it; D keeps computers exactly as today. Phone-side changes still go through the plan's own §8a.6 contact-sheet sign-off.
- **UPDOWN-SPEC §8 ('live price + move') and R5(c) / DA §B12.2 (Ali, 2026-09-27: the card's figure under 'Confirmed price', coloured by the targets).**
  - ruling: UPDOWN-SPEC §8 ('live price + move') and R5(c) / DA §B12.2 (Ali, 2026-09-27: the card's figure under 'Confirmed price', coloured by the targets).
  - proposal: Completed in the band's own words rather than reversed. While no confirmed price newer than the open exists (every 5-minute round while betting), the card says 'Bado hakuna bei mpya tangu ufunguzi saa 14:30' (the band's kick-off state) instead of printing the opening price again with 0.00%. The 'Confirmed price' figure, the targets' ink and the move return whenever a newer confirmed price exists, and 'Kufunga' once settled. Decided by Question 1: option A as described; option B adds a market-price line; option C would reverse 'no round chart' (2026-09-04).
- **DA §B12.6 (Ali, 2026-09-04): the terminal's form is frozen, and today it opens on 1H.**
  - ruling: DA §B12.6 (Ali, 2026-09-04): the terminal's form is frozen, and today it opens on 1H.
  - proposal: The form is unchanged. Only its position changes (below the cards on phones, beside the open card on computers), and, with Question 2 option A, its first range on computers (6H instead of 1H; a player's own choice is still remembered). Decided by Question 2.
- **UD-13b / UD-13c (session decisions, 2026-08-25 and 2026-09-05, built on Ali's relayed complaint that players don't notice there is a filter): the phone filter lives in a FilterSheet field.**
  - ruling: UD-13b / UD-13c (session decisions, 2026-08-25 and 2026-09-05, built on Ali's relayed complaint that players don't notice there is a filter): the phone filter lives in a FilterSheet field.
  - proposal: One always-visible rail of game pills grouped by asset (FilterGroupKey + FilterPill) at every width, which §K6c already asks for ('the lens never goes behind a click'). Not an owner ruling, but decided by Question 3 because it answers his complaint.
- **F1 (2026-09-27) and stage-9b session decisions: the two tinted target tiles were examined and kept.**
  - ruling: F1 (2026-09-27) and stage-9b session decisions: the two tinted target tiles were examined and kept.
  - proposal: Remove them, keep '±$0.02' in the price-to-beat row, and leave the exact UP ≥ / DOWN ≤ on the round page. Decided by Question 4.
- **CHART-SPRINT B (session choice, 2026-09-04): a cubes-or-chart switch above the cards, cubes by default.**
  - ruling: CHART-SPRINT B (session choice, 2026-09-04): a cubes-or-chart switch above the cards, cubes by default.
  - proposal: Cubes always visible under the cards, with one 'Chati ya bei' button; computers per Question 2. A session choice, listed so the change is not silent, and decided together with Question 2.
- **E-166 (session design): the boxed countdown pod also carries the handover captions and —:—.**
  - ruling: E-166 (session design): the boxed countdown pod also carries the handover captions and —:—.
  - proposal: The clock becomes an unboxed row, settled cards show the result word there, and the handover becomes one sentence after the 2.5s hold. A session design with no owner ruling behind it. Ali's 2026-08-19 ask that the next round 'takes the screen' is kept by the new card arriving at the top.
- **Round 6 review C16 (session): market-card chips at the xs size (9.5px) in a two-chip row.**
  - ruling: Round 6 review C16 (session): market-card chips at the xs size (9.5px) in a two-chip row.
  - proposal: With one chip per row, chips take the kit's md size (11px, same 23px box), so the card sits inside §8a.3's 11–13px label band. A session decision, listed for transparency.

## guardChurn

- scripts/journey-updown.test.mts §6.1: re-pin KP_JUD_BASE (c14cb403…) in the open for src/components/updown/updown-card.tsx, src/app/updown/page.tsx and src/app/updown/[roundId]/page.tsx. round-stake-panel.tsx and round-action-panel.tsx are untouched. §6.3's journey-arm slot (one ternary) is kept verbatim.
- test:updown-match §11b: the card learns the kick-off state (udMatchNoNewPrice instead of the figure when no price is newer than the open), the dollar move, the per-read stamp, the removed heading and the removed footer 'Open'. The valueTone / READ_TONE_TOKEN lines stay verbatim (§11b.7); §11b.9 (the terminal's live line) is unchanged.
- test:updown-pricing §3/§5/§6/§8 + red:updown-pricing + qa:card360: side word only and the empty-side gate are unchanged; anchors move with the markup; the signed-out helper gains the minimum stake.
- test:updown-filter-sheet §2 + red-updown-filter-sheet: retired for /updown along with the sheet if Question 3 is answered A (FilterSheet stays on /markets). test:filter-language + red: the new single rail (FilterPill + FilterGroupKey, data-filter-rail, StripAutoScroll).
- test:updown-handover + updown-handover-red: captions and body renamed from match to round, the pod box gone, the handover is one sentence, and the link appears only when the next round is not on the board. The handoverClock rules and the red harness's nowMs anchor are kept.
- test:updown-result-clock, test:updown-window §7, test:updown-lock-window, test:updown-clock-guard: roundPhase and formatClock are untouched. The locked caption moves from udResultIn to udClosesIn on the card and the round page, and the closing gap renders as confirming (no fake button).
- test:updown-hedge-quote + red: the UD-20 rows now also show through confirming (the server computes them for 'confirming').
- test:updown-source-line: the DotSeq shape is kept, the 'Open $X' half is removed, and the stamp is the read shown. test:updown-source-class + red: E-53 labels drop 'Live' (the kind of market, never the vendor).
- test:type-scale §3/§4/§6/§7 + design-gate/eyebrow-roles: seven off-ladder card sizes and three market sizes leave; 15px moves into globals .ud-title/.ud-figure (a cross-ladder reach); the tracking ratchet drops.
- test:spacing-scale: CEILING (405) lowered by the half-step uses that the card, page and stake controls retire. No new guard; the proposed test:spacing-halfstep would duplicate this one.
- test:density-contract: --ud-gap-lg/md/sm and --ud-act-pt collapse into --ud-pad / --ud-gap, with Compact rungs on html.
- test:betting-ink (§5 + countdown sites): countdown digits leave --brand-300, the market YES% figure leaves --yes-400, and the 24h move stays neutral.
- test:gold-is-money: one new gold site, the settled card's own winnings amount.
- test:contrast (contrast-audit) + anchors/contrast-callsite: new pairs (11px split labels, 13px faint source line, pearl YES%, spark area).
- test:motion-ladder + red; test:reduce-motion + reduce-motion-red: ud-count-pulse retired for .m-urgent (with its [data-motion=reduced] entry); .live-dot reduced cadence goes from 1.6s to 2600ms; the ::after place ring; the .m-in-lift arrival; stake-pill transition on tokens; .pchart-range and the spark draw-in off legacy tokens.
- test:tap-target (+ red-tap-floor, red-tap-rung): 44px rail pills, 44px stake pills and custom input, the 44px handover link row.
- test:one-sided + anchors/one-sided + anchors/split-bar: split labels go from 9.5 to 11px; barReading is drawn as an image; rails and names unchanged.
- anchors/chip-one-home: the duration chip and the pending chips leave the card.
- test:label-lexicon + test:i18n (parity, untranslated values): about 20 new or changed keys in en/sw/zh. New: udMinN, udPlayersN/One, udLastSeconds, udFromAmount, udNextOpensWithResult, udMarketClosedNext. Value edits: udClosesIn, udNextMatch*, udLockedWhy, udSource*, udTagline (en), udYoureIn (zh), udEnterStake (sw), common.soon, statusResolved (sw), sortClose, watchingEmptyBody, and the zh 回合 keys.
- test:visual-pass-r4d (§3), r4i, r5a (tape LIVE clause), r5d (/updown skeleton), r5g (eyebrow proof), r5i, r5j, r6a, r6b, r6c, r7a (udStreaming census row; udClosesIn), r7b (page-eyebrow census), r7c (track-end census), r8a (handover link ink), r8b (eyebrow inks), r9a, r10 (glyph-edge census): each pins strings or classes on the card or the board.
- test:updown-quickbet + test:updown-stake-rail + test:updown-bet-feedback: the stake label hidden, pill radius and selection look, the placing line without the red dot.
- test:updown-void-copy + red, test:updown-result-announce: must stay green untouched (the refund copy and the result moment are protected).
- test:ui-consistency (+ baseline regenerated): the handover link becomes a kit Link and the inline styles leave.
- test:chart-one-home + red: BoardViz and terminal placement change; the library's home does not. test:updown-chart (PriceHero) untouched. The terminal's default range changes only on computers, and only with Question 2 option A.
- test:card-share + qa:card-geometry + MARKET_CARD_H / --mcard-base-closed: the closed market card's pill becomes a fact line and both /markets skeletons are re-derived; the footer literals are untouched.
- test:outcome-display (D29): the market settled row and the settle-date meta change; the verdict stays in the price slot. test:featured-card unaffected.
- test:glyph-source / test:glyph-motion: no new glyph keys here; the PHOSPHOR W4 lane (side arrows, status glyphs) and W7 lane (text-character icons) own them.
- test:stacking-contract: the desktop sticky card (Question 2 A/B) against the chat bubble's zIndex-60 lines.
- test:design-frozen: raw values only through tokens.
- Live drivers and QA: qa:asset-board, qa:fit, qa:bar-geometry, live-updown-card-widths, live-updown-handover-widths, live-updown-filters, live-updown-chrome (tape gone). Re-measure at 320/360/412/1280 in sw/en/zh.
- test:refresh-cadence: untouched (no extra refresh is added).
- House-bot suites: untouched by the recommended answers. Question 1 B or Question 2 B change desk behaviour without changing desk code, which the house-bots owner must sign off.

## risks

- The guard churn is large: about 40 suites plus the journey-updown §6.1 re-pin. Land it as one lane after the PHOSPHOR W4 side-glyph swap, re-pin in the open, and prove each red control still bites.
- Question 1 B/C and Question 2 B keep the 1-minute vendor cache warm.
  - The house desk then prices more rounds from it: fresher prices, more two-sided pools, more house exposure. In effect this starts the 'desk's own price' Ali put on hold on 14 Oct.
  - Credits rise to about 2,880 a day per asset, per chart range, per server process. Bounded, but multiplied by the number of containers.
  - The landing band's 15M poll already warms that cache today.
  - The recommended answers (Questions 1 and 2, option A) have no desk effect.
- 'Dau linafungwa baada ya' must stay word for word: the band's research (C3) found that a bare 'Dau linafungwa' over 01:52 reads as a time of day in Swahili time. So the clock needs its own row. A single identity-plus-clock header row, as two of the designs drew it, does not fit 304px in Swahili.
- On 5-minute rounds the card shows no moving price, only honest kick-off words. Some players will miss a moving number; Question 1 B is the owner's lever.
- Removing the target boxes (Question 4) puts the exact UP ≥ / DOWN ≤ prices one tap away and leaves '±$0.02' without a sentence explaining it on the open card. Gold's ±$0.40 matters more. Check comprehension with real players and a live gold round; the band's rule sentence (+36px) is the fallback.
- The market-closed line uses the same calendar advanceChain uses, so it states what the platform will do. That calendar does not model holidays: on Good Friday a round will open and most likely void through the staleness rule, and the line will have announced it.
- Shell notices push a signed-in player's buttons under the chat bubble and tab bar; the add-email bar alone is ≈110–130px at 360. A shell rule (the bubble yields over a bettable action block) is outside this lane.
- Putting the bet buttons on the first screen makes betting more prominent. It needs a responsible-gambling review before release: break notice, no multiplier, the countdown as the only urgency, neutral losses, no count-up.
- Removing the LIVE chip from live market cards changes /markets, home, /watchlist and similar-markets at once. It needs Ali's before/after contact sheet (§8a.6), Swahili first.
- The your-result line for two-sided holders depends on the server fix to myStakesByMarket, which today takes the status from the first row and the side from the last. Until that ships, the line is withheld for hedgers.
- The server additions (per-read stamps, payout rows through confirming, next-round timing) only add read-only fields to the board payload, but they sit in updown-board.ts beside money logic. Review them with the money lane.
- Desktop sticky card: check it against the shell's stacking order, the notice bar and the chat bubble at 1024–1280.
- The new Swahili and Chinese strings need a native read: 'Sekunde za mwisho', 'Raundi inaisha baada ya', 'Inafungwa', 'Soko limefungwa sasa…', 'Raundi ijayo itafunguliwa matokeo haya yakitoka', 'wachezaji {n}', 'watabiri {n}', '已参与', '最后几秒'.
- The rail keeps every chain, including stopped ones (E-67). With more assets it scrolls further, and a stopped chain's board shows an honest empty state. Live dots wait for a cached read across all chains.
- Dropping 'Live' from the source labels also changes the terminal's receipt footer, which uses the same keys. The E-53 grammar (the kind of market, never the vendor) still holds.
- Text-character icons (▲ ▼ →) on the market card and in the 'oldest → newest' strip wait for the PHOSPHOR W7 lane. Do not add new ones in the meantime.
- Android text at 130%: the rows have room at 360 but will wrap at 320. Verify the wrap order: the digits drop under the caption and never clip.
- The first-timer 'how to play' entry on phones is still the glyph-only rules pill. This proposal does not solve that.

## predictedScores

- **visual**
  - surface: page
  - lens: visual
  - score: 9
- **uiux**
  - surface: page
  - lens: uiux
  - score: 9
- **motion**
  - surface: page
  - lens: motion
  - score: 9
- **palette**
  - surface: page
  - lens: palette
  - score: 9.5
- **clarity**
  - surface: page
  - lens: clarity
  - score: 9
- **player**
  - surface: page
  - lens: player
  - score: 8.5
- **appeal**
  - surface: page
  - lens: appeal
  - score: 9
- **logic**
  - surface: page
  - lens: logic
  - score: 9.5
- **visual**
  - surface: updownCard
  - lens: visual
  - score: 9
- **uiux**
  - surface: updownCard
  - lens: uiux
  - score: 9
- **motion**
  - surface: updownCard
  - lens: motion
  - score: 9
- **palette**
  - surface: updownCard
  - lens: palette
  - score: 9.5
- **clarity**
  - surface: updownCard
  - lens: clarity
  - score: 9
- **player**
  - surface: updownCard
  - lens: player
  - score: 8.5
- **appeal**
  - surface: updownCard
  - lens: appeal
  - score: 9
- **logic**
  - surface: updownCard
  - lens: logic
  - score: 9.5
- **visual**
  - surface: marketCard
  - lens: visual
  - score: 9
- **uiux**
  - surface: marketCard
  - lens: uiux
  - score: 9
- **motion**
  - surface: marketCard
  - lens: motion
  - score: 9.5
- **palette**
  - surface: marketCard
  - lens: palette
  - score: 9
- **clarity**
  - surface: marketCard
  - lens: clarity
  - score: 9
- **player**
  - surface: marketCard
  - lens: player
  - score: 9
- **appeal**
  - surface: marketCard
  - lens: appeal
  - score: 9
- **logic**
  - surface: marketCard
  - lens: logic
  - score: 9.5

## asciiPhoneAfter

```
+----------------------------------------------------+
| (50)50pick               SW  [Ingia] [Jisajili]    |
|----------------------------------------------------|
| * MUBASHARA   TZS 5K imekamilika HAPANA kwenye..   |
| Juu na Chini                         [=]   [#>]    |
| Je, bei itakuwa juu au chini muda ukiisha?         |
| BITCOIN (dakika 5)  dakika 10  dakika 15  DHAH>    |
| +------------------------------------------------+ |
| | (B) Bitcoin                     14:30 - 14:35  | |
| | * Dau linafungwa baada ya               02:31  | |
| | Juu au chini ya          $82,754.03   +-$0.02  | |
| | Bado hakuna bei mpya tangu ufunguzi saa 14:30  | |
| | Bwawa TZS 190,500 . wachezaji 12               | |
| | Juu 62%                             38% Chini  | |
| | ===========================|================== | |
| | (500)  (1K)  (2.5K)  (5K)  (+ Maalum)          | |
| | [       ^ Juu       ]  [      v Chini      ]   | |
| | Bonyeza Juu au Chini kuweka dau . TZS 500      | |
| | Soko la sarafu-fiche . imenukuliwa 14:30:00    | |
| +------------------------------------------------+ |
|====================================================|
| Masoko   Juu/Chini   Mubashara   Matokeo   Zaidi   |
+----------------------------------------------------+
y in CSS px at 360x740, Swahili, signed in:
0-56 top bar | 56-88 ticker | 120-161 title + pills
165-185 tagline | 205-249 game rail (44px)
269 card top | 281-313 asset + window | 321-349 clock
361-381 price to beat | 385-403 'now' line
415-433 pool + players | 445-470 split + bar
482-526 stake pills | 534-582 Up / Down buttons
590-608 helper | 620-650 source line (may wrap)
676-740 tab bar | chat bubble 616-660 at x 300-344
Signed out: Up/Down 482-530. Holding a stake: 565-613.
No bettable round: the locked card leads, with
'Raundi inaisha baada ya 0:36' and the next-round line.
```

## asciiCardBeforeAfter

```
TODAY - open round, signed in, sw, 360 (about 560px)
+------------------------------------------------+
| (B)  Bitcoin Juu na Chini [5 DAKIKA]           |
|      * MUBASHARA . BTC                         |
| BEI ILIYOTHIBITISHWA      $82,754.03  0.00%    |
| Sawa kabisa na bei ya ufunguzi                 |
| +--------------------------------------------+ |
| | DAU LINAFUNGWA BAADA YA                    | |
| | 02:31                                      | |
| +--------------------------------------------+ |
| JUMLA TZS 190,500                      oo 12   |
| Juu 62%                           38% Chini    |
| =========================|==================   |
| JUU AU CHINI YA $82,754.03           +-$0.02   |
| +------------------+  +------------------+     |
| | ^ JUU            |  |          CHINI v |     |
| | >= $82,754.05    |  |    <= $82,754.01 |     |
| +------------------+  +------------------+     |
| DAU LAKO  [500] [1K] [2.5K] [5K]               |
| [+ Maalum]                                     |
| [       ^ Juu       ]  [      v Chini      ]   |
| Bonyeza Juu au Chini kuweka dau . TZS 500      |
| ---------------------------------------------- |
| Soko la sarafu-fiche la moja kwa moja .        |
| imenukuliwa 14:30:00 EAT                       |
| Ufunguzi $82,754.03                            |
+------------------------------------------------+

PROPOSED - same round, same viewer (about 381px)
+------------------------------------------------+
| (B) Bitcoin                     14:30 - 14:35  |
| * Dau linafungwa baada ya               02:31  |
| Juu au chini ya          $82,754.03   +-$0.02  |
| Bado hakuna bei mpya tangu ufunguzi saa 14:30  |
| Bwawa TZS 190,500 . wachezaji 12               |
| Juu 62%                             38% Chini  |
| ===========================|================== |
| (500)  (1K)  (2.5K)  (5K)  (+ Maalum)          |
| [       ^ Juu       ]  [      v Chini      ]   |
| Bonyeza Juu au Chini kuweka dau . TZS 500      |
| ---------------------------------------------- |
| Soko la sarafu-fiche . imenukuliwa             |
| 14:30:00 EAT                                   |
+------------------------------------------------+

PROPOSED - the same card once settled, viewer won (about 320px)
+------------------------------------------------+
| (B) Bitcoin                     14:25 - 14:30  |
| Matokeo                      ^ Juu imeshinda   |
| Ufunguzi                          $82,745.45   |
| Kufunga                 ^ $82,754.03  +$8.58   |
| Bwawa TZS 190,500 . wachezaji 12               |
| Juu 62%                             38% Chini  |
| ===========================|================== |
| Matokeo yako: Umeshinda . TZS 1,850            |
| Raundi inayofuata tayari imeanza.              |
| ---------------------------------------------- |
| Soko la sarafu-fiche . imenukuliwa             |
| 14:30:00 EAT                                   |
+------------------------------------------------+
Locked = the open card's height: the action slot shows
'Dau lilifungwa saa 14:34:00 EAT ili mtu asiweke dau ...',
the holder's 'Ikiwa itafunga Juu/Chini . TZS ...' rows,
and 'Raundi ijayo itafunguliwa matokeo haya yakitoka.'
```

## asciiMarketCardAfter

```
LIVE (sw, 360): one chip, time top-right, pearl 37%
+------------------------------------------------+
| [MOTO]  (o) MICHEZO         * siku 21 zimebaki |
|                                                |
| Je, Taifa Stars itashinda dhidi ya        NDIO |
| Uganda tarehe 12 Okt?                      37% |
|                                  v 3 . saa 24  |
| =================|============================ |
| siku 7 ~~~--~~~~-~~~~~~--~~~~-~~~~~~~~~~~~~~o  |
| (a)(b)(c)  watabiri 65                         |
| [     NDIO @ 37%     ]  [   HAPANA @ 63%    ]  |
| Bwawa TZS 190,500 . [c] 12                 (i) |
|                              [<]   Maelezo >   |
+------------------------------------------------+
'NDIO' caption in YES ink; 37% in pearl; needle gilt;
static red dot (sr-only 'Mubashara'); spark aqua, on
real time, with a 10-point minimum scale.

SETTLED: verdict in the slot, one fact line, settle date
+------------------------------------------------+
| [IMETATULIWA]  (o) MICHEZO                     |
|                                                |
| Je, Yanga itafika robo fainali ya      MATOKEO |
| CAF msimu huu?                            NDIO |
| ==============================|=============== |
| (a)(b)(c)  watabiri 112                        |
|        Bwawa la mwisho TZS 1,204,000           |
| 12 Okt 2026 . [c] 9                            |
|                              [<]   Maelezo >   |
+------------------------------------------------+

NEW: empty said once
+------------------------------------------------+
| [MPYA]  (o) SIASA           * siku 30 zimebaki |
|                                                |
| Je, bunge litapitisha muswada wa X           - |
| kabla ya Desemba?                              |
| - - - - - - - - - - - - - - - - - - - - - - -  |
|           Kuwa wa kwanza kutabiri              |
| [        NDIO        ]  [       HAPANA      ]  |
|                                            (i) |
|                              [<]   Maelezo >   |
+------------------------------------------------+
```

## verifyOnTiles

- 360×740 in sw, en and zh, for a visitor, a signed-in player, and a player holding one side and both sides. Measure the open card's Up/Down y-range (target ≈482–530 / 534–582 / ≈565–613) and check both buttons clear the chat bubble (y 616–660, x 300–344) and the tab bar (676). Repeat with the add-email notice and a maintenance banner on.
- 320×640 in sw. Nothing may be clipped (M4a):
  - identity row
  - clock row: 'Dau linafungwa baada ya' plus the 28px digits on one line
  - stake row: 500 · 1K · 2.5K · 5K · + Maalum, and the plus-only fallback below 360
  - where the ± on the price-to-beat row wraps
  - where the 'now' line wraps
  - the source line
- Card height for each phase and viewer: open equals locked (reserved action slot), and nothing below moves at the lock. Frame review at t=0/50/100% of the lock moment at 360, CPU 4× (§8b).
- Contrast on the real surfaces:
  - 11px --yes-300/--no-300 split labels on --wash-raised
  - the 13px --text-faint source line
  - the pearl 28px YES% on the market wash
  - the 10% aqua spark area and its 11px label
- Game rail at 360: the fourth chain's pill is scrolled into view on load. Every pill is 44px, nothing wraps, the FilterGroupKey keys are readable, and only the chosen pill is outlined. At 1280 it is one row.
- Desktop at 1280×800 and 1024×768 (if Question 2 is A or B):
  - the chart panel's height against the sticky card's (≈470 vs ≈409)
  - no 300→380 placeholder jump on load
  - the sticky card under the notice bar and beside the chat bubble
- Market card at 320/360/1280 in sw/en/zh:
  - the top row (one md chip + category + dot + time left) wraps as one piece
  - the meta row 'Bwawa TZS 1,190,500 · comments · (i)' stays on one line
  - closed and settled heights and both /markets skeletons are re-derived (MARKET_CARD_H)
- MicroSpark after the change, on one busy and one quiet real market: the line reads as data, a flat market looks flat, and the 'siku 7' label fits.
- Android text at 130% on a 360 phone: the header rows, stake row, helper line and source line wrap without clipping.
- A live gold round: ±$0.40 on the price-to-beat row, how often a price between the targets appears (the 'now' line's second line), and whether first-timers understand '±'.
- A settled card for a two-sided holder (after the server fix) and for a refunded one-sided holder: the your-result words and amounts match /updown/history.
- Gold at its daily break (21:00 UTC) and at Friday close: the market-closed line shows the right reopening time in EAT.
- All three reduced-motion gates (OS setting, in-app switch, auto-reduced low-end tier): 'Sekunde za mwisho' appears; the live dot breathes at 2600ms; no pulse and no ring; the board still reads correctly.
- Loading: the ghost-to-card swap moves no slot by more than 4px, for signed-in players and visitors.
- A round rolls over while the player is scrolled to card 2: no scroll jump (open and locked cards are the same height, and scroll anchoring is on).
- Screen reader (TalkBack):
  - the article names the round with its time window
  - the caption's phase changes are announced once
  - the digits are not read every second
  - the split reads 'Juu 62%, Chini 38%'
