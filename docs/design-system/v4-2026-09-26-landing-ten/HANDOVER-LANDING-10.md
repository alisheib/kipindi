# Handover: 50pick landing page to 10/10 (mobile first)

Paste everything below the line into a Claude Code session opened on `alisheib/kipindi` (main). Attach `50pick Home Concept v4.dc.html` and `50pick Review Board.dc.html` as the visual reference.

---

## 0. Your job
Rebuild `/` so that eight reviewers score it 10/10 and the landing gate is clean.

- **Visual target:** `50pick Home Concept v4.dc.html`. **Reviewer checklists:** `50pick Review Board.dc.html` §3e. **Where every component goes:** §3f. **Wallet scenario:** §4a–4d.
- The concept is a picture, not code. Build it with the tokens and classes in `src/app/globals.css` and the existing components.
- Do not change fee, settlement or wallet-ledger code.
- **Mobile first.** Design and verify at 360px first, then 768, then 1280. A change that is only checked on desktop is not done.

## 1. Read first, in this order
1. `CLAUDE.md`
2. `docs/LANDING-TEN.md` (the gate and the rules the gate itself follows)
3. `docs/design-brief/handover-2026-08/LAWS.md` (law 7, the unrealised-honesty law, law 42)
4. `docs/DESIGN_AUTHORITY.md` §B6, §B11, §C5
5. `docs/RULES.md` (fee: 13% of the losing side)
6. `src/app/page.tsx`, `src/components/home/*`, `src/lib/markets/hero.ts`, `src/lib/markets/landing.ts`, `src/components/markets/market-card.tsx`, `bet-confirm-modal.tsx`, `side-picker.tsx`, `countdown.tsx`

## 2. Laws: a PR that breaks any of these is rejected
1. **No promised returns.** No "win TZS X" on an open market. An estimated multiplier appears only when the market has `showEstimate` set, marked "est." and followed by the qualifier line.
2. **The only urgency is a real countdown.** No "last chance" copy, no count-up tickers, no flashing, no confetti.
3. **Loops only when they carry state**, and only as an opacity fade. Only two exist: the live dot and Up & Down's final-30-second pulse.
4. **Gold only on money:** pools, paid out, balance, Deposit.
5. **Never show a price nobody produced.** No 50% fallback; one-sided markets get a labelled state.
6. **No activity feed or ticker on `/`.** The owner removed it.
7. **Tap targets at least 40px** (`--tap-min`).
8. **Every string exists in en, sw and zh.** sw is the default locale. The brand headline stays in English, with the reader's language on a line below it (`heroHeadlineSub`).

## 3. Layout spec by width
Breakpoints: **phone < 640**, **tablet 640–1023**, **desktop ≥ 1024**. The header collapses below 1100.

| Section | Phone (360) | Tablet (768) | Desktop (1280) |
|---|---|---|---|
| Header | logo · Join (or balance chip + Deposit) · Menu | same, with the full "Create account" label | logo · nav · EN/SW/中文 · Sign in · Create account (or balance chip + Deposit + avatar) |
| Menu | full-width drop panel: nav, Sign in, Set limits, language; rows at least 44px tall | same | not used |
| Hero | eyebrow → headline (40px) → sw/zh sub-line → lede → **featured card** → CTAs (full width) → trust lines | same order, CTAs side by side | two columns: left eyebrow/headline/lede/CTAs/trust; right featured card |
| Proof rail | three ledger rows (label left, figure right) | three columns | three columns, 44px figures |
| Conviction bar | full width, with a text reading below | max 760px | max 760px |
| Board (one list) | eyebrow, h2, toggle, topic-chip row, rows: title → meta → full-width bar row → full-width YES@/NO@ | same, title and bar side by side | toggle on the right of the h2; one line per row |
| How it works | stacked | stacked or two columns | three columns, titles on one line |
| Up & Down | stacked, UP/DOWN buttons full width | stacked | copy · chart and ring |
| Results | stacked row | one row | one row |
| Pick slip | **bottom sheet** | bottom sheet | inline in the card or row |
| Wallet | **bottom sheet** | bottom sheet | panel under the balance chip |

**First-screen budget at 360 × 740, in sw, en and zh, signed out and signed in:** the featured card's YES/NO buttons must end above the rail's top edge (about y 668 in a 740px-tall viewport). In the centre fifth, they must also end above the coin's top (rail top − 14px, about y 654).
Phone rules that make this fit:
- No eyebrow. Headline 36px. The headSub (sw/zh) is 16px with line-height 1.25 and a 4px gap under the h1.
- Lede 16px with line-height 1.45. Hero top padding 12–18px.
- Featured card: padding 14, inner gap 10, question 19px. The predictors · pool row and the Share/Details footer come after the buttons (CSS `order`).
- **Signed in:** "Your picks" collapses to one tappable line to /positions: "3 open · 1 awaiting result · TZS 5,350 paid this week →". At zero balance, add one short line pointing to the Deposit coin. The in-hero wallet box and its Deposit/Withdraw pair appear only at 640px and wider. On phones, the coin and the balance chip → Wallet sheet already carry them, so Withdraw is still two taps away.
- Measure it in V15.

## 4. Work packages (one PR each, in this order)

**WP1: Header and menu** (`app-shell.tsx` and header components; global chrome, so coordinate with whoever owns it)
- Below 1100px: logo, primary action and Menu. "Join" / "Jiunge" / "注册" below 640px; "Create account" above.
- The menu is a disclosure panel (`aria-expanded`). It closes on Esc, on route change and when the window grows past 1100.
- The language switch is a segmented control with `aria-pressed`, 40px targets (44px in the menu).
- Signed in, see WP14.

**WP1b: Bottom rail with a centre Deposit** (modify `src/components/layout/bottom-nav.tsx`; **do not create a new component**)
- **Keep everything the rail already does:** `lg:hidden fixed inset-x-0 bottom-0 z-40 kp-rail`, `data-needle-keepout`, the five `minmax(0,1fr)` tracks, `kp-rail__item` / `__pip` / `__label` / `__dot`, `isActive` (Markets is current on `/`), and `NavMore` with `variant="rail"`.
- **New five slots:** Markets (`I.markets`, `t.common.markets`) · Up & Down (`I.trendingUp`, **`t.nav.updown`**, the short label; keep the gilt `kp-rail__dot`) · **[centre Deposit]** · Live (`I.bolt`, `t.nav.live`) · More (`NavMore`).
- **Results moves into More; it doesn't disappear.** The file records "Results unreachable on a phone" as a past structural defect.
  - Player's More: Results · Positions · Wallet · Leaderboard · Invite friends (if `inviteVisible`) · Propose (if enabled).
  - Guest's More: Results · Leaderboard · Fairness · Propose (if enabled).
  - Add `/results` to `moreItems` in both branches so `moreActive` marks More on `/results`.
- **Owner override (record it in the component's header comment):** the rail was "destinations only".
  - The centre slot is a destination, the route `/wallet/deposit`, not an action.
  - It is the same for guests and players, as the file requires: "a destination does not depend on having an account".
  - A guest who taps it gets the normal auth gate with `next=/wallet/deposit`.
  - There is **no** "Join" in the rail; auth stays in the header.
  - Signed in with a balance, the concept opens the Wallet sheet (equal Deposit and Withdraw). With a zero balance, the sheet shows the add-funds prompt and Deposit only. Either option is acceptable if Ali prefers the plain route.
- **The coin: final, about a quarter outside the rail.**
  - A 52px disc. A 3.5px ring as the mark's split: `conic-gradient(from -14deg, #B03A3E 0 50%, #1EA362 50% 100%)`, green on the left and red on the right.
  - A `--gilt` fill, a navy "+" (24px, stroke 2.8), and the mark's gold needle (3×62px at −14°) behind the fill, visible across the ring and just past the rim.
  - It rises **14px above the rail's top edge** (`margin-top:-14px` plus `translateY(-6px)`). The rest sits inside the rail. Its label is on the same baseline as the other labels.
  - **No notch.** A 4px halo in the rail's own colour (`--panel`, as box-shadow 0 0 0 4px) separates it from content, plus a drop shadow of 0 6px 14px rgba(0,0,0,.45).
  - **The whole 56px slot (coin + label) is one button**, named by its visible label (`t.nav.deposit`, 12px, 800, `--gilt`). Pressed: .95.
  - ⛔ **Final size. Don't go beyond 52px or a 14px rise.** A 68px coin raised 42px was tried and rejected: it outweighed YES/NO, pushed deposits too hard for a licensed product, covered the first screen, and needed a notch. A flush 42px coin was also tried; it was too timid for the brand's centre.
- **Needle keep-out:** put `data-needle-keepout` on the **coin element itself**, whose transformed rect includes the rise. The nav's own keep-out stays. V22 checks that the coin's rect sits inside a keep-out rect.
- **Reserve:** unchanged. The existing `pb-[calc(88px+env(safe-area-inset-bottom))]` covers the rail (about 71px) plus the 14px rise. Add no spacer.
- **Header:** see UPDATE-2026-09-28 §1. The gold Deposit pill yields below 1024, and **Results stays in the desktop header nav**.
- The rail hides while the pick sheet, Wallet sheet or keyboard is open. The chat bubble must never cover the coin (part of decision V3).
- Gate V22 at 360/414 × sw/en/zh:
  - the coin is centred ±1px
  - no rail label is ellipsised in en
  - the coin's rect is inside a `[data-needle-keepout]` rect
  - the last content clears the coin
  - `/results` marks More as current

**WP2: Hero order** (`landing-hero.tsx`, `.kp-hero*` in `globals.css`)
- Follow the order in §3. On phone and tablet the CTA block renders **after** the featured card; on desktop it sits in the left column. Use one component with CSS order or a container query, not two copies of the DOM, if the gate's no-JS check (V14) matters.
- New keys: `home.trustLicence`, `home.trustMoney`, `home.trustSource` (×3 locales).
- Eyebrow `text-balance`; headline `clamp(40px, 6.2vw, 88px)`.

**WP3: Featured card** (`market-card.tsx`, `featured` variant only; coordinate with its owner)
- Full question with no ellipsis, then a meta line: competition · date · "Settles on {source}".
- Time left in the top-right corner of the card, in `--text`.
- A 24h ghost mark on the bar from `move24h`, labelled "24h ago" in 12px; no mark when `move24h` is absent. A delta label: "▲5 · 24h ago".
- `role="img"` and an `aria-label` on the bar ("31% YES, 69% NO").

**WP4: Question board rows** (`landing-hero.tsx` `QuestionRow`)
- Split the single `<Link>` into a title link and sibling buttons.
- Add the time left (`timeLeftLabel` on `bettableUntilMs`) and YES @ / NO @ buttons, at least 44px tall.
- Phone layout per §3. The title keeps its 44ch measure.

**WP5: The pick slip**
- **Below 1024:** a bottom sheet. It holds the drag handle, time left, full question, "Your pick: YES", four stake chips (1,000 / 2,000 / 5,000 / 10,000), the Confirm button in the side's colour (54px, full width), then: minimum stake TZS 100 · the rule line · Set limits · Take a break · Cancel.
- Sheet behaviour: `role="dialog"`, `aria-modal`, focus trap, Esc and backdrop close it, `env(safe-area-inset-bottom)` padding.
- **At 1024 and above:** the same content inline in the card or row.
- Build this on the existing `bet-confirm-modal.tsx` / `side-picker.tsx` flow, not a new one. Visitors go to `/auth/register?next=` with the market and side kept.
- On Confirm, a 12ms haptic (`navigator.vibrate(12)`) where supported. Only on the player's own confirm, never on passive updates.
- After placing: "Placed. You're with {share}% of the money on {side}." This is the share of the pool on that side, **not** a payout.

**WP6: One-sided and empty markets** (`hero.ts`, `landing.ts`, `market-card.tsx`)
- If one side is empty, show "— One side only", a dashed rail (`--bar-empty-track`), buttons without a price, and the note "No one has picked {side} yet. If betting closes one-sided, every stake is refunded."
- Apply the hero's degeneracy floor to the grid lens, so contested markets always come first.

**WP7: Estimate line**
- Only when `showEstimate` is set: "est. ×{y} YES · ×{n} NO" plus the qualifier.
- Compute it with the settlement module's own function (13% of the losing side), so the page and the payout can never disagree.
- On cards, reserve a fixed 58px note slot so bars line up whether or not the note shows.

**WP8: Proof rail and conviction**
- Phone: ledger rows. Tablet and up: three columns.
- The conviction bar gets a text reading and an `aria-label`. Keep the live pip on the open-markets figure only.

**WP9: One board replaces the card grid and the topic tiles** (`landing-hero.tsx` QuestionRow, `topic-tiles.tsx`, `page.tsx`)
- **Delete** the "Pick a side now" card grid and the "Browse by topic" tile section from `/`. They repeated the same markets, making three lists of one thing.
- The board section becomes the only list:
  - an eyebrow that follows the toggle
  - h2 "Pick a side"
  - a segmented toggle, **Closing soon | Biggest pools** (`role="tablist"`, 40px tall). Biggest pools is the grid lens from `landing.ts`, with contested markets first.
  - a swipeable row of topic chips: name and live count, ordered by count with Other last; each is a link to its topic page
  - the rows
  - "All N markets →"
- Every row's meta line: `{competition · date} · Settles on {source} · Pool {pool} · {n} predictors`.
- After placing, the row shows "You're with X%…" and "Share on WhatsApp →".
- **One `MarketRow` component, one `ConvictionBar` component** (fill, needle, hub, ghost mark, you mark, one-sided rail). The featured card, rows and the whole-board bar all use `ConvictionBar`; no other markup draws a bar.

**WP11: How it works** (`how-it-works.tsx`)
- Step 2's title becomes "A named source", so all three titles fit on one line.
- Step 3 gives the fee as 13%, read from the same config RULES.md describes.
- Each step title is an `<h3>`.

**WP12: Up & Down band** (`page.tsx` §1e)
- Show the soonest live round: its asset label (admin-configured: gold, silver, etc.), duration (5 / 15 / 30 min), a mini price line with a dashed opening-price line, a countdown ring, and UP / DOWN buttons into `/updown`.
- The countdown text stays in `--text`; `ud-count-pulse` runs only in the final 30 seconds.
- Fix the plural with one/other keys ×3 ("1 rounds live now" is wrong).
- Width: the concept uses the full 1280 column because the band now has content on both sides. **Confirm with Ali first.**

**WP13: Results strip** (`trust-band.tsx`)
- Each settled row shows: outcome pill · question · settled date · who signed it off · source link · amount paid (gold).
- A silent row keeps its grid tracks (see the settled-row regression note in LANDING-TEN).

**WP14: Wallet: where Deposit and Withdraw go (panel ruling, Review Board §3d)**
- **Header, signed in with a balance:** a balance chip (`TZS 12,400 ▾`, `aria-expanded`) next to a gold Deposit button.
- **The chip opens the Wallet:** balance, the amount that can be withdrawn now, **Deposit and Withdraw side by side at the same size**, "Deposits and withdrawals go through mobile money", and Set limits. It is a bottom sheet below 1024 and a small panel under the chip at 1024 and above.
- **Zero balance:** no chip and no Withdraw. Deposit only, plus the hero prompt. Never print "TZS 0" (V11).
- **Signed-in hero:** Your picks (open · awaiting result · paid this week), then the same Deposit/Withdraw pair when there is a balance, and a Set limits link.
- Where bonus money isn't withdrawable, the withdrawable figure comes from the rules in `docs/BONUS-WITHDRAWAL.md`.
- Use the withdrawal fee wording from RULES.md; never hard-code it.

**WP14b: Share** (`share-button.tsx`, `position-share.tsx`)
- Share goes in the featured card footer and every card footer, left of Details.
- After placing a pick: "Share on WhatsApp →" next to the "You're with X%" line. It shares the market and the side, **never a stake or a promised payout** (law 1).
- Each shared link's preview card uses the market's og:image. Spread `ROOT_OPEN_GRAPH`; never write a bare `openGraph` object.
- Keys: `common.share`, `common.shareWhatsApp` (×3).

**WP15: Motion and performance**
- Needle glides of 600–900ms ease-out, only when a real pool changes.
- Per-second updates only inside the one countdown component that needs them, never across the whole page.
- Everything off under `prefers-reduced-motion`. Respect `Save-Data`: no price-line animation.
- LCP under 2.5s on a Moto E-class device over throttled 3G, and no layout shift from late fonts (`font-display: swap` plus size-adjusted fallbacks).

**WP15b: Motion, palette and brand detail.** Implement `SPEC-VALUES.md` §5 (the motion table), §5b (contrast) and §5c (brand) exactly. Also:
- **Every needle carries the mark's hub:** a gold disc with a navy centre (`radial-gradient(#1A2140 0 28%, #E3BC66 31%)`), 11px on the featured and whole-board bars, 9px on rows. Logo, bars, coin and "you" mark are one object.
- **A closed market isn't tappable.** At 0 the YES/NO pair is replaced by a dashed "Betting closed · awaiting result" row, keys ×3.
- **Placing a pick adds a "▲ You" mark** under the featured bar, at the split where you joined. While "▲ You" shows, hide the "24h ago" text label and keep its 2px tick. The delta row above the bar already says "▲5 · 24h ago", and the two labels share one line under the bar, so they collide on phones.
- Gate: V23, a motion audit. Record a Performance trace across a pool update, a sheet open/close and a Up & Down tick at 360. Only transform/opacity animations are allowed. There must be no layout from animation and no re-render outside the countdown subtree each second; timers pause when hidden. The RED control is a width-animated bar, which must be caught.

**WP19: Platform: analytics, empty states, flags** (for the platform manager)
- **Events** go through the existing analytics wrapper. There's no new vendor, and no PII or stake amounts in payloads; the `source` field says where on the page it happened.
  - `landing_view` {locale, signedIn}
  - `pick_open` {marketId, side, source: featured|board}
  - `pick_confirm` {marketId, side}
  - `deposit_tap` {source: rail|header|hero|wallet}
  - `withdraw_tap` {source}
  - `share_tap` {marketId, channel}
  - `board_toggle` {mode}
  - `topic_chip_tap` {topic}
  - `more_open`
  - `updown_tap` {side}
- **Empty states:**
  - **No featured market:** the hero shows the board's first contested row. If none exists, hide the card and keep the CTAs.
  - **No live Up & Down round:** the band shows "Next round {time}". If none is scheduled, hide the band.
  - **No settled results:** hide the strip.
  - **A board mode with no rows:** "No markets here yet" plus a link to all markets.
  - **Stale data:** keep the last values and show "Updated {hh:mm}". Never show zeros.
  - **Loading:** static skeletons at the final heights (featured card, board rows). The rail and header never skeleton. No shimmer loop (law 3); CLS 0.
- **Flags and config:** `showEstimate` per market (existing), proposals and invite visibility (existing), `landing.updownBand` on/off, and the featured-selection rule documented in `hero.ts`. No new env vars without Ali.

**WP20: World-benchmark additions** (Review Board §3j)
- **Search at the top of the board:** a 44px field, "Search {n} markets", with a magnifier icon, `type="search"` and **16px text so iOS Safari doesn't zoom**.
  - It filters every open market by title, in the current locale and in English.
  - No results: 'No markets match "{q}".'
  - On desktop, "/" focuses it.
  - Keys `home.searchMarkets` and `home.searchEmpty` ×3.
- **7-day line on the featured card, at 640px and wider only.** Phones keep the bar, which protects the first-screen budget (V15).
  - Data: the YES share over 7 days from `getCardCharts` (already fetched for the featured card). Draw nothing with fewer than 2 points.
  - A fitted scale (min − 8 to max + 8, clamped 0–100), a 2px `--yes-300` line, 56px tall, no area fill.
  - A 12px mono label "7 DAYS · YES %", and aria text such as "7 days: 34% → 31% YES".
- **Loading:** see WP19.
- Gate V24: search filters the landing set within one frame; the empty state renders; the chart is absent below 640px and present at 640px and wider when there are 2+ points.

**WP16: i18n**
- Every new key in en, sw and zh. The concept file's dictionary is a draft: **a native Swahili speaker must sign off every sw string**, and a native reader the zh ones.
- Time formats follow `timeLeftLabel` keys; no hand-built strings.

**WP17: Accessibility**
- Headings in order, h1 → h2 → h3.
- Buttons are `<button>` elements; links are links; no interactive element inside another.
- A visible 2px focus ring on every control.
- Dialog semantics on both sheets; `role="timer"` on the round countdown; bars have text equivalents.

## 5. New gate checks (add to `scripts/qa/landing-ten.mjs`; each with a RED control that reports PROVED)
- **V15 First screen:** at 360 × 740 in sw, en and zh, for a signed-out visitor, a signed-in player with a balance and one at zero balance, the featured card's YES/NO buttons end above the rail's top edge, and don't intersect the coin's rect.
- **V16 No promised winnings:** fail on "win TZS", "utashinda", "赢得 TZS" or a stake × multiplier string on an open market.
- **V17 No degenerate price:** no rendered price reads 0% or 100%.
- **V18 Board completeness:** every board row and card shows its price (or the labelled state), time left, pool and source.
- **V19 Money parity:** when signed in with a balance, Withdraw is reachable in the same number of taps as Deposit from the Wallet, and is the same size.
- **V20 Sheets:** the slip and wallet sheets trap focus, close on Esc, and respect the safe area (measured with a 34px inset).
- **V22 Tab bar:** see WP1b.
- **V24 Benchmark:** see WP20.
- **V21 Placement:** each component in Review Board §3f is found in its stated place at 360, 768 and 1280. This is measured by bounding box: for example, Deposit sits in the header's right half and the featured card starts within the first 740px on phones.

## 6. Test matrix
- **Automated:** the full LANDING-TEN matrix (61 cells) plus signed-in cells for balance and zero balance, plus both sheets open at 360 and 414.
- **Real devices:** a low-end Android (2 GB RAM, Chrome), an iPhone SE-size Safari, a mid-range Android on 3G throttling, and Android system font size set to 130%.
- **Locales:** sw, en, zh at 360, 768 and 1280, with screenshots reviewed by eye.

## 7. The panel re-score (definition of 10/10)
Run the eight checklists in Review Board §3e against production screenshots and the device tests:
UI/UX engineer · Graphic designer · Motion & data-viz · Player · First-time visitor · Global gambling & prediction-market grader · Mobile prediction-market visual & UX evaluator · Las Vegas pro player & prediction-market marketing specialist.

The marketing specialist's checklist also needs:
- a funnel measurement: visitors → sign-ups → first pick, recorded before and after launch
- a working WhatsApp preview card for every shared market

Every item must pass, and every reviewer must score 10/10. Record the scores in `docs/LANDING-TEN.md`, together with any instrument defects you found and fixed.

## 8. Decisions for Ali (ask; do not decide these in code)
1. Moving the chat bubble clear of prices on phones (V3). The concept assumes it is moved or hidden while a sheet is open.
2. The no-JS render (V14).
3. Up & Down band width (WP12).
4. The LIVE badge (§B11): keep it on every open market, or reserve it for events actually in play.
5. Whether the featured slot may favour local markets.
6. The responsible-gambling line appears above the footer and inside it: are both required?
7. **Centre Deposit (owner override of "the rail is destinations only").** Confirm: the centre is the `/wallet/deposit` route for everyone, guests get the auth gate, no Join in the rail. Also confirm whether signed-in players get the Wallet sheet or the plain route.
(The half-hidden dial at the right edge is the intentional needle fidget, `needle.tsx` / `needle-rest.css`. It is not a defect, and it is no longer an open decision.)

## 9. Done means
- Every WP is merged.
- V1–V21 are clean (except the decisions Ali leaves open).
- `test:all` and typecheck are green.
- The device and locale tests pass.
- Native Swahili sign-off is recorded.
- The eight-panel re-score is 10/10 across the board, recorded in LANDING-TEN.md.
- `design-brief/00-NEXT-SESSION-PROMPT.md` is left empty.
