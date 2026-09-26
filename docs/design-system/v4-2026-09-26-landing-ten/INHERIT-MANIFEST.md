# INHERIT-MANIFEST — the landing v3 delivery, file by file

**Filed:** 2026-09-26 · **Folder:** `docs/design-system/v4-2026-09-26-landing-ten/` (this folder).
The delivery arrived as an untracked folder `New Homepage Redesign/handover/` dropped into the
`C:\kipindi-main` checkout by Ali on 2026-09-26. It is filed here **raw and byte-identical**, per
`DESIGN_AUTHORITY.md` §0b ("an incoming commission … gets its own versioned folder, raw and
untouched, plus an acceptance record"). This file is that acceptance record. The delivery's own
`ACCEPTANCE.md` is the designer's checklist, not this record.

⚠️ The delivery's `README.md` says to put it at `docs/design-brief/landing-10/`. That path is
the delivery's suggestion, not the filing law; §0b wins and the folder is here.

**The build's progress is NOT tracked here.** The tracker is `docs/LANDING-TEN.md` §0 (RESUME AT)
and §1 (status board). This file is frozen once written, except to add a ruling.

---

## 1 · The verdicts

| File | Verdict | Why |
|---|---|---|
| `design/50pick Home Concept v3.dc.html` | **INHERIT as the visual target** | Order, hierarchy, placement and states. It is a picture: its inline styles, simulated data (`sim()` fake bets every 6s), whole-page 1s re-render and hard-coded figures are **never** copied into `src/`. |
| `design/50pick Review Board.dc.html` | **INHERIT as reference** | §3e checklists, §3f placement map, §4a–4d wallet scenario. |
| `design/support.js`, `design/public/brand/mark-color.svg` | Reference only | The concept's runtime and a copy of our own mark. |
| `HANDOVER-LANDING-10.md` | **INHERIT, with the reconciliations in §3** | The work packages WP1–WP17 + WP14b and gate checks V15–V21. |
| `SPEC-VALUES.md` | **INHERIT mapped onto existing tokens** | Where a value has no token it is mapped to the nearest locked one (§3); none is added. |
| `ACCEPTANCE.md` | **INHERIT as the sign-off list** | Ticked in `docs/LANDING-TEN.md` §1, never in this folder. |
| `i18n-draft.json` | **INHERIT as a draft** | Mapped onto `src/lib/i18n-dict.ts` keys. Numbers inside strings (13%, TZS 100, the licence number, the helpline) are **not** inherited — see §3. sw and zh need native review. |
| `KICKOFF-PROMPT.md` | Superseded | The paste-in prompt that is current lives in `docs/LANDING-TEN.md` §0a. |
| `before/01–05.png` | **Kept as the delivery's evidence** | Production at 26 Sep 2026, before the build. Not regenerable once the build ships, so they are cited proof, not a regenerable screenshot (§0b). |

---

## 2 · Ali's rulings, 2026-09-26 (asked in session, answered verbatim as the recommended option)

| # | Question | Ruling |
|---|---|---|
| R1 | Header and wallet | **Wallet sheet.** The balance chip opens a Wallet: a bottom sheet below 1024, a panel under the chip from 1024. It holds the balance, the amount withdrawable, **Deposit and Withdraw side by side at the same size**, Set limits and a link to the full wallet page. **At zero, a gold Deposit takes the chip's place instead of "TZS 0".** The rest of the header stays: language menu, bell, avatar, bottom rail. This amends the 2026-08-25 rule in `scripts/wallet-reach.test.mts`: the capsule is still the one wallet door and the eye still lives inside it; it now opens the Wallet instead of navigating. |
| R2 | Betting from the home page | **Build the pick slip.** Bottom sheet below 1024, inline from 1024. The side stays locked, the stake comes from chips, and Confirm uses the same `buyPositionAction` with every limit, break, KYC and wallet check. After placing: "You're with X% of the money on YES" plus Share on WhatsApp. Visitors go to sign-up with the market and side kept. |
| R3 | Estimate on home cards | **Leave it off.** Today's estimate is a fixed admin rate, the same for both sides; a pool-derived card figure would disagree with it. The note slot holds only the one-sided refund note. WP7 is closed as *not built by ruling*. |
| R4 | The eight small calls (HANDOVER §8 + two found) | **All accepted:** (1) remove the faint dial drawing behind the hero — this reverses PV-01 (`MOBILE-VISUAL-PLAN.md` §7); (2) keep the parked dial at the right edge (the signed-in Needle, intended); (3) the LIVE badge stays as today; (4) the featured market is the most contested one, no local favouring; (5) the 18+ line appears in the hero trust lines and the footer, and the extra copy above the footer (`RgLine`) goes; (6) the Up & Down band is full width; (7) the chat bubble hides while a sheet is open; (8) the page still needs JavaScript (loading skeletons kept; V14 stays open by decision). |

---

## 3 · Where our laws beat the delivery

The delivery's own kickoff says *"The repo's laws win every conflict. Report the conflict; don't
resolve it quietly."* Each row is a conflict, the ruling applied, and where it is enforced.

| # | The delivery says | The law | Applied |
|---|---|---|---|
| L1 | Law 6: no activity feed or ticker on `/` | Ali, 2026-09-26 (`2ab8830e`): the LIVE strip is back on `/`, `/markets`, `/live`, `/results` | The strip stays. `test:ticker-honesty` §11. |
| L2 | Results: "Settled {date} · signed off by {n} officers" | Single-admin resolution is the default (`test:two-admin`); a landing page claiming a two-officer ceremony the product does not perform is a regulatory finding (`i18n-dict.ts` home note; MOBILE-VISUAL-PLAN ruling 15) | Each row prints **its own record**: two distinct officers, one officer, or automatic resolution — derived from the stamps on that market, never a fixed count. |
| L3 | "Minimum stake TZS 100"; "13% commission"; licence `0US00000202602` (digit zero); helpline literal | `RULES.md`: never restate a rate (`test:rate-copy`); `support-config.ts` holds `LICENCE_NUMBER()` = `OUS00000202602` (letter O) and `HELPLINE()` | Minimum stake from `stakeBoundsForMarket`/config; the fee from `describeFeeModel`/the market's rates; licence and helpline from `support-config.ts`. |
| L4 | Header collapses below 1100; Menu button; language inside the menu; segmented EN/SW/中文 with `aria-pressed` | Breakpoints are 640/1024/1280 (`tailwind.config.ts`); the segmented language capsule was replaced because it overflowed (`language-menu.tsx`); the bottom rail is phone navigation | Not built (R1 kept the header). Phone and tablet navigation stays on the bottom rail; the language menu stays. |
| L5 | Radii 22 and 18; hero CTAs radius 999 | Frozen scale 4/8/12/16/24/pill (`globals.css:283`); §S2 bans one-off radii; `design-frozen` bans `rounded-[…]` | 22 → `--r-xl` (24) on sheets and hero/Up & Down cards; 18 → `--r-lg` (16) on market cards; hero CTAs keep the shipped pill. |
| L6 | 12px minimum text; 10px 18+ roundel | §T4 reading floor 12.5px; uppercase mono microlabels may go smaller (§T3) | Sentences at ≥ the 12.5 floor; mono uppercase labels on the existing label ladder; the 18+ roundel is the existing `.kp-rg` badge. |
| L7 | Primary `#4263eb`; raw oklch values; `rgba(...)` backdrop | Hex and raw colour literals fail `design-frozen`; colours live in `globals.css` | `.btn-primary`, the existing modal scrim, and existing tokens. The concept's in-between surfaces (10/11/12% lightness) map to existing `--bg`/`--panel`/`--bg-elevated` rungs. |
| L8 | Gold on the eyebrow "/" glyph and needles | `test:gold-is-money` | Only what the shipped system already sanctions keeps gold; nothing new is made gold except money. |
| L9 | A one-line footer | `PublicFooter` is global and carries the legal, privacy, AML, contact and social doors | The global footer stays. Every ACCEPTANCE footer item (18+, the RG line, helpline, Set limits, licence) is already in it. |
| L10 | Chat bubble moved/hidden under a sheet | `ChatRoot`/`.cm-fab` belong to MOBILE-VISUAL U7; `test:stacking` pins its position | R4(7): a rule hides it while a modal sheet is open; position untouched. |
| L11 | Pick slip beside a market | Betting is side-locked (CLAUDE.md); the confirm step is mandatory; law 40 (§C3): no potential payout per position before resolution | R2: the slip is locked to the tapped side, its Confirm is the confirm step, it shows no payout figure and no estimate (R3). |
| L12 | `sim()` fake bets, whole-page 1s re-render | Law 42 (§C5), WP15 | Never ported. Per-second updates only inside countdown components on `subscribeSecond`. |
| L13 | The concept's default locale is `en` | sw is the default locale | Every check captures sw first. |
| L14 | Concept featured card has no one-sided branch; `Math.round` can print 0%/100% on a lopsided but two-sided market | "A price needs two sides" (MOBILE-VISUAL ruling 13); V11/V17 | The one-sided state applies to the featured card too. A two-sided price is displayed within 1–99: `pricedYesPct` rounds 25,000 vs 100 to 100, which states a certainty two stakers disproved (V17). |
| L15 | Delivery folder `docs/design-brief/landing-10/` | `DESIGN_AUTHORITY.md` §0b | Filed here (see the top of this file). |
| L16 | "No decorative gradients or illustrations" | Claret is the brand's editorial accent (DESIGN_AUTHORITY invariants): the band edges (`--claret-edge`) and the footer's `.claret-rule` are sitewide chrome that `test:gold-is-money` already sanctions | The one decoration that is the landing page's own — the hero's dial drawing — is removed (R4(1)). The claret edges and the footer rule stay; they are not landing decoration. |
| L17 | Cards carry no signal chips; "the only urgency is a real countdown" | The chips are sitewide (`getSignalBadge` in `market-card.tsx`); R4(3) keeps the LIVE badge as today | The chips stay as today. HOT is a pool/predictor threshold, not time pressure. ⚠️ Found while checking: SOON tests an English-only string (`/^\d+m left$/`), so it never fires in sw or zh — a real countdown signal that depends on the reader's language. Fixed in WP3 by testing the milliseconds left, not the label. |
| L18 | Phone order: lede → card → CTAs → trust lines; and "Licence · 18+ · helpline on the first screen" (its own placement map P15, ACCEPTANCE K29) | The two contradict each other: after two full-width CTAs the trust lines start below 740px at 360 | The trust lines come BEFORE the CTAs, in the SOURCE — a CSS `order` was tried and removed because keyboard order then disagreed with the screen (WCAG 1.3.2) — still after the card, ordered licence + 18+ → mobile money → RG line + helpline → named sources. The card still ends inside the first screen (V15) and the header's Sign up keeps the primary action on it. The licence NUMBER stays in the footer (K39 is about the page), as in the delivery's own hero. ⚠️ With the bottom rail, the list's last rows can sit under the rail at 360 in sw; V21 (D5) measures it per locale. |

| L19 | The Wallet says "TZS X can be withdrawn now" and "Deposits and withdrawals go through mobile money" (concept `withdrawable`, `walletNote`) | Withdrawal asks for identity (the 2026-09-13 ruling, `project_kipindi_kyc`) and can be paused by the payout rail, so "now" is not always true; deposits take mobile money OR card (`wallet.mobileMoney`, 2026-09-13) | Neither sentence is ported. The whole balance is the withdrawable amount (the bonus wallet was withdrawn, `BONUS-WITHDRAWAL.md`), so the figure is labelled "Available" — the withdraw page's own word. Each button states its own channel from the keys its page already uses (`wallet.mobileMoney` under Deposit, `wallet.mobileMoneyOnly` under Withdraw). `wallet-sheet.tsx` header. |
| L20 | Phone header, signed in with a balance: the chip AND a gold Deposit (ACCEPTANCE 4a) | R1 keeps the language menu, bell and avatar in the header; the capsule keeps its eye. The phone cluster's budget is 278px (measured 2026-08-25, `top-app-bar.tsx`), and a Deposit beside the capsule does not fit it | With a balance, the header Deposit keeps its existing yield below 640; Deposit and Withdraw are one tap away, side by side, in the Wallet the chip opens (and in the signed-in hero, WP14 part 2). At ZERO the capsule is gone and Deposit shows at every width, labelled. The chip drops the currency word below 640 (the delivery's "12,400 ▾") and keeps it in its aria-label. Measured by the Wallet drive, `scripts/qa/landing-v3/wallet.mjs`; the widths are recorded on the WP14 row of `docs/LANDING-TEN.md` §1. |

---

## 4 · Open questions for Ali (ruling needed; the build does not decide them)

| # | Question | What the build does meanwhile |
|---|---|---|
| Q1 | The trust band's cell reads "Signed off by an officer — a person records the evidence excerpt that justifies the verdict". Markets settled by the automatic resolver (when resolution mode is `auto`) had no person record evidence, and the settled strip beside that cell now says so truthfully ("Automatic"). Keep the cell as it is, or reword it to cover the automatic resolver (e.g. "Signed off by an officer, or by the audited automatic resolver")? | The cell is assessed copy and is left verbatim. The strip and `/fairness` state each market's own sign-off (`lib/markets/signoff.ts`). |
