# Handover: 50pick landing page to 10/10 (mobile first)

Paste everything below the line into a Claude Code session opened on `alisheib/kipindi` (main). Attach `50pick Home Concept v3.dc.html` and `50pick Review Board.dc.html` as the visual reference.

---

## 0. Your job
Rebuild `/` so that eight reviewers score it 10/10 and the landing gate is clean.

- **Visual target:** `50pick Home Concept v3.dc.html`. **Reviewer checklists:** `50pick Review Board.dc.html` §3e. **Where every component goes:** §3f. **Wallet scenario:** §4a–4d.
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
| Question board | title → meta → full-width bar row → full-width YES@/NO@ pair | title and bar side by side, buttons wrap | one line: title · bar and time · buttons |
| How it works | stacked | stacked or two columns | three columns, titles on one line |
| Pick a side grid | **horizontal snap rail, 86% card width, peek of the next card** | two columns | three columns |
| Topics | two columns, 3 rows | two columns | three columns, 2 rows |
| Up & Down | stacked, UP/DOWN buttons full width | stacked | copy · chart and ring |
| Results | stacked row | one row | one row |
| Pick slip | **bottom sheet** | bottom sheet | inline in the card or row |
| Wallet | **bottom sheet** | bottom sheet | panel under the balance chip |

**First-screen budget at 360 × 740:** the featured card's price and YES/NO buttons must finish by 740px. Measure it in the gate (new check V15 below).

## 4. Work packages (one PR each, in this order)

**WP1: Header and menu** (`app-shell.tsx` and header components; global chrome, so coordinate with whoever owns it)
- Below 1100px: logo, primary action and Menu. "Join" / "Jiunge" / "注册" below 640px; "Create account" above.
- The menu is a disclosure panel (`aria-expanded`). It closes on Esc, on route change and when the window grows past 1100.
- The language switch is a segmented control with `aria-pressed`, 40px targets (44px in the menu).
- Signed in, see WP14.

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

**WP9: Pick-a-side grid**
- Phone: `grid-auto-flow: column; grid-auto-columns: 86%; overflow-x: auto; scroll-snap-type: x mandatory`. Each card has `scroll-snap-align: start`, and the page itself never scrolls sideways.
- Every card has the same slots (eyebrow, title that grows, price row, bar, note slot, buttons, footer) so rows are even (V6).

**WP10: Topics** (`topic-tiles.tsx`)
- "All topics" becomes the section link.
- Six tiles: two columns on phone, three on desktop, no orphans. Ordered by live count, with Other last.

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

**WP16: i18n**
- Every new key in en, sw and zh. The concept file's dictionary is a draft: **a native Swahili speaker must sign off every sw string**, and a native reader the zh ones.
- Time formats follow `timeLeftLabel` keys; no hand-built strings.

**WP17: Accessibility**
- Headings in order, h1 → h2 → h3.
- Buttons are `<button>` elements; links are links; no interactive element inside another.
- A visible 2px focus ring on every control.
- Dialog semantics on both sheets; `role="timer"` on the round countdown; bars have text equivalents.

## 5. New gate checks (add to `scripts/qa/landing-ten.mjs`; each with a RED control that reports PROVED)
- **V15 First screen:** at 360 × 740, the featured card's price and YES/NO buttons finish by 740px.
- **V16 No promised winnings:** fail on "win TZS", "utashinda", "赢得 TZS" or a stake × multiplier string on an open market.
- **V17 No degenerate price:** no rendered price reads 0% or 100%.
- **V18 Board completeness:** every board row and card shows its price (or the labelled state), time left, pool and source.
- **V19 Money parity:** when signed in with a balance, Withdraw is reachable in the same number of taps as Deposit from the Wallet, and is the same size.
- **V20 Sheets:** the slip and wallet sheets trap focus, close on Esc, and respect the safe area (measured with a 34px inset).
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
7. The half-hidden dial at the right edge of every screen: an intended peek or a defect?

## 9. Done means
- Every WP is merged.
- V1–V21 are clean (except the decisions Ali leaves open).
- `test:all` and typecheck are green.
- The device and locale tests pass.
- Native Swahili sign-off is recorded.
- The eight-panel re-score is 10/10 across the board, recorded in LANDING-TEN.md.
- `design-brief/00-NEXT-SESSION-PROMPT.md` is left empty.
