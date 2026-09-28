# ACCEPTANCE: tick every box, each with evidence (a screenshot path, gate output or test name)

## A. Placement map (Review Board §3f; gate V21)
| Component | Phone < 640 | Tablet 640–1023 | Desktop ≥ 1024 |
|---|---|---|---|
| Logo | top left; mark only when signed in | top left | top left |
| Navigation | Menu button, top right | Menu button | inline after the logo (Menu below 1100) |
| Language | inside Menu | inside Menu | header |
| Join / Create account | header + full-width button after the featured card | header + after the card | header + hero left column |
| Balance chip → Wallet | header right → bottom sheet | header right → bottom sheet | header right → panel |
| Bottom rail (`bottom-nav.tsx`) | Markets · Up & Down · **centre Deposit** · Live · More | same | none (`lg:hidden`) |
| Deposit | the rail coin (/wallet/deposit), Wallet; no header pill; no hero Deposit below 640 | the rail coin, Wallet, hero; no header pill | header pill (gilt-metal), Wallet, hero |
| Results | inside More (both branches) | same | header nav (unchanged) |
| Positions, Wallet, Leaderboard, Invite, Propose | inside More (player) | same | header / avatar menu |
| Withdraw | Wallet + hero, same size as Deposit; hidden at zero | same | same |
| Featured market | right after the lede, in the first screen | after the lede | hero right column |
| Pick slip | bottom sheet | bottom sheet | inline |
| Proof figures | ledger rows | 3 columns | 3 columns |
| Board (one list) | toggle Closing soon / Biggest pools + topic-chip row + stacked rows | same | one line per row |
| Share | featured card + after every placed pick (WhatsApp) | same | same |
| Set limits / Take a break | pick sheet, Wallet, Menu, footer | same | slip, Wallet, footer |
| Licence · 18+ · helpline | first screen + footer | same | hero + footer |

- [ ] Every row is verified at 360, 768 and 1280 in sw, en and zh

## B. Wallet scenario (Review Board §4a–4d)
- [ ] 4a: phone, signed in with a balance. Header shows the chip and gold Deposit; hero shows the balance with Deposit and Withdraw at equal size
- [ ] 4b: tapping the chip opens the Wallet bottom sheet: balance, withdrawable amount, equal Deposit and Withdraw, Set limits; Esc and backdrop close it
- [ ] 4c: zero balance. No chip, no Withdraw; Deposit in the header plus the empty-balance prompt; "TZS 0" never appears
- [ ] 4d: desktop. The Wallet is a panel under the chip with the same content

## C. Reviewer checklists (all must pass → 10/10)
**1. UI/UX engineer**
- [ ] Order: what it is → a live market → how it works → more markets → proof
- [ ] Every market shows its price (or labelled state), time left, pool and source
- [ ] A confirm step before any money moves
- [ ] Headings run h1 → h2 → h3; no interactive element inside another
- [ ] Visible focus on every control; Esc closes every sheet and panel
- [ ] No clipped or overflowing labels anywhere (V2)

**2. Graphic designer**
- [ ] One colour per meaning (green YES, red NO, gold money, blue action)
- [ ] Only the locked fonts: Sora / Inter / JetBrains Mono, plus the CJK fallback
- [ ] Only locked tokens; the real brand mark
- [ ] Equal card slots; bars align across a row (V6)
- [ ] No decorative gradients or illustrations

**3. Motion & data-viz**
- [ ] Needles move only on real pool changes
- [ ] 24h mark and delta on the featured card
- [ ] Up & Down: dashed open-price line, live line, ring countdown
- [ ] Only two loops, both opacity fades (live dot, final 30s)
- [ ] Reduced motion and Save-Data honoured
- [ ] Every bar and chart has a text description

**4. Player**
- [ ] Pick from the home page: two taps plus confirm
- [ ] Stake chips, the minimum stake and the rule line in the slip
- [ ] After placing: "You're with X% of the money on {side}"
- [ ] Settled rows show the source, date, sign-off and amount paid
- [ ] Deposit and Withdraw are where section A says

**5. First-time visitor**
- [ ] One sentence says what 50pick is, above the fold
- [ ] Licence, 18+ and mobile money on the first screen
- [ ] Three steps, including the fee as a number (13%)
- [ ] EN / SW / 中文, with the sub-line under the brand headline
- [ ] No jargon

**6. Global gambling & prediction-market grader**
- [ ] No promised returns; the estimate is marked and followed by a qualifier (V16)
- [ ] The only urgency is a real countdown
- [ ] The one-sided refund rule is shown; no 0% / 100% price (V17)
- [ ] The fee is a number; the source is named before the pick
- [ ] Set limits and Take a break are one tap from any stake
- [ ] Withdraw is as easy to find as Deposit (V19)
- [ ] Licence number and helpline are on the page

**7. Mobile prediction-market visual & UX evaluator**
- [ ] At 360 × 740, the first screen shows the pitch and a live market with its price and YES/NO (V15)
- [ ] The slip and Wallet are thumb-reach bottom sheets that respect the safe area (V20)
- [ ] Every tap target is at least 40px
- [ ] The header fits at 360 in every state and locale
- [ ] Snap rail with a peek; topics in two columns
- [ ] No text under 12px; ledger rows for the proof figures

**8. Las Vegas pro player & prediction-market marketing specialist**
- [ ] The price reads as a line ("YES @ 31%"), with "est. ×" where the market allows it
- [ ] Line movement is shown (24h mark and delta)
- [ ] Depth is shown (pool and predictors) on every market
- [ ] Closing time sits next to every price
- [ ] Share on the featured card; "Share on WhatsApp" after every placed pick; the WhatsApp preview card works
- [ ] The predictor count is on every row
- [ ] The visitor → sign-up → first-pick funnel is measured before and after launch

## C2. Specialist panel (Review Board §3g)
**UI/UX engineer**
- [ ] Sheets animate in and out; Esc, backdrop and Cancel use the exit
- [ ] Closed markets show "Betting closed · awaiting result", with no tappable YES/NO

**Creativity engineer**
- [ ] The coin is the 50pick mark as a control
- [ ] The "▲ You" mark shows where the player joined the split

**Visual motion engineer**
- [ ] Every row of the SPEC §5 motion table is implemented
- [ ] The price line slides continuously; the ring drains smoothly
- [ ] Every press gives feedback

**Software motion engineer**
- [ ] V23: transform/opacity only, no per-second page re-render, timers pause when hidden or off-screen
- [ ] The INP, long-task and CLS budgets are met

**Palette engineer**
- [ ] One gold; the contrast table in §5b is re-verified on the real tokens
- [ ] The closed and disabled states use the muted palette

**Software architect**
- [ ] One `MarketRow` and one `ConvictionBar`; no other bar markup exists
- [ ] The rail is `bottom-nav.tsx`, with no second nav component

**Brand engineer**
- [ ] The wordmark matches `lockup-horizontal.svg`
- [ ] The mark's split, orientation, needle and hub are respected in the coin
- [ ] The one verb "pick" is used throughout
- [ ] Every needle carries the mark's hub

## C3. Nine-reviewer panel (Review Board §3i)
- [ ] **UI/UX specialist:** the whole centre slot is tappable, at 56px
- [ ] **Size & dimensions engineer:** only the SPEC §8 values are used (five radii, the type scale, the hit targets)
- [ ] **Gamer:** Confirm gives a 12ms haptic; press feedback on every control; Up & Down is one tap from every page
- [ ] **Platform manager:** WP19 events fire with the right `source`; every empty state renders; flags work
- [ ] **Player, creativity, palette, software motion, branding:** their C2/C checklists are still green

## C4. World benchmark (Review Board §3j)
- [ ] Search on the board (16px text), with its empty state
- [ ] The 7-day line on the featured card at 640px and wider; the bar only on phones
- [ ] Static loading skeletons at the final heights, CLS 0

## C5. Update 2026-09-28
- [ ] V25: one Deposit per screen, in every state (guest, funded, zero, held)
- [ ] A held wallet: the centre slot is Wallet (/wallet), with no "+"
- [ ] Results is in More on phones and stays in the desktop header

## D. Gates and tests
- [ ] `qa:landing-ten`: V1–V21 clean at all 61 cells plus the signed-in and sheet cells (except Ali's open decisions)
- [ ] Every new check (V15–V21) has a RED control reporting PROVED
- [ ] `npm run test:all` + typecheck pass
- [ ] Real devices: low-end Android on 3G, iPhone SE-size Safari, Android at 130% font size
- [ ] Native Swahili sign-off recorded; native zh review recorded
- [ ] The eight-reviewer scores are recorded in `docs/LANDING-TEN.md`
