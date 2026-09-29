# INHERIT-MANIFEST — the sponsor agency's "Simplified Journey", file by file

**Filed:** 2026-09-29 · **Folder:** `docs/design-system/v5-2026-09-29-simplified-journey/` (this folder).

**What arrived.** On 2026-09-28 the agency that will sponsor and market 50pick sent a 9-slide deck,
`50pick_Simplified_Journey.pptx` (author "fred muragwa", built with PptxGenJS, created 2026-09-28 14:15 UTC). Ali
saved it to his Downloads folder.

**How it is filed.** It is filed here **raw and byte-identical**, per `DESIGN_AUTHORITY.md` §0b ("a new dated delivery
gets its own versioned folder … raw and untouched, plus an acceptance record"). This file is that acceptance record.
The five phone frames were extracted unchanged from the deck's media (`ppt/media/image1…5.png`, 1254×2652) and named
by screen.

**Progress is not tracked here.** The tracker is [`docs/VODACOM-PLAN.md`](../../VODACOM-PLAN.md): §0 is RESUME AT
and §1 is the board. This file is frozen once written, except to add a ruling.

---

## 1 · The verdicts

| File | Verdict | Why |
|---|---|---|
| `50pick_Simplified_Journey.pptx` | **Kept raw, as the agency's source** | The deck is the contract for WHAT happens: 5 screens, a Today→After table, 4 questions and 5 success measures. |
| `frames/1-home.png` (deck `image2.png`) | **Kept: functional template** | It defines the home order, content and copy. Its colours, typeface and wordmark are not adopted (R5). |
| `frames/2-bet-sheet.png` (`image1.png`) | **Kept: functional template** | It defines the bet sheet's elements, order and copy. |
| `frames/3-balance-too-low.png` (`image3.png`) | **Kept: functional template** | It defines the low-balance state: the compact estimate row, the warning, the two options and the disabled CTA. |
| `frames/4-deposit.png` (`image4.png`) | **Kept: functional template** | It defines the journey deposit screen: the pending-bet strip, the prefilled amount, the wallet rows, the PIN note and the pay button. |
| `frames/5-how-to-play.png` (`image5.png`) | **Kept: functional template** | It defines the How to Play sheet: 3 steps, the MFANO example, the CTA, and the limits and helpline links. |
| [`AGENCY-REPLY.md`](AGENCY-REPLY.md) | **Ours** | The draft reply for Ali to send. It answers the agency's 4 questions. |

The frames are evidence and are not regenerable, so they are committed like v4's `before/*.png`. Comparison
screenshots made during the build stay untracked under `.qa-shots/` (§0b).

## 2 · Ali's rulings (2026-09-28/29, in session)

| # | Question | Ruling |
|---|---|---|
| R1 | How closely do we follow the deck? (Ali, 2026-09-29: *"no matter what we need to cut off we need perfection and alignment with what they requested … we have a full license from GBT so we can do anything but we should match what they want for sponsorship"*) | **The functionality is identical to the deck**: flow, element order, states and copy. Where the deck and one of our older FLOW or CONTENT rulings disagree, the deck wins, and the older ruling is marked superseded where it lives. |
| R2 | New players must confirm their email before a first deposit. How, inside the agency's flow? (asked as a numbered choice; the recommended option was chosen) | **Keep the control, as an inline 6-digit email code on the deposit screen.** The player never leaves the flow, and the pending bet stays in view. The emailed link keeps working. |
| R3 | The deck lists M-Pesa, Airtel Money and HaloPesa. We also take Mixx by Yas and Card. (numbered choice, recommended option) | **Mixx by Yas is the 4th wallet row.** Card stays available through a "Lipa kwa kadi" link. |
| R4 | How does the new journey reach players? (numbered choice, recommended option) | **Build hidden behind a staff preview, and launch at once** when every screen is verified. |
| R5 | Is the deck's look adopted? (Ali, 2026-09-29: *"regarding typefaces and everything they should all be implemented using 50pick design … those are templates for what should happen but using 50pick design system, fonts and everything, even colors"*; then *"they care about functionality being identical but all our design system intact and consistent"*) | **No. The look is 50pick's own design system, unchanged:** fonts Sora / Inter / JetBrains Mono, the `globals.css` tokens (YES green, NO red, royal primary, gold per §M3), the kit components and the brand mark. The deck's frames are templates for WHAT happens. The deck's coral NO, mint YES, gold primary buttons, white selected chip, gold active tab, navy palette, typeface and two-tone wordmark are **not** adopted. |
| R6 | What happens to what the journey cuts? (Ali, 2026-09-29: *"remove what is to be removed to match them even if we worked hard on it. keep in code maybe we use later but remove from usage, or add what's needed perfectly"*) | **Remove from USE, never delete.** Everything cut is unmounted and shelved in place, at the same path. It still compiles, its unit tests stay wired, and it is recorded in [`docs/SHELVED.md`](../../SHELVED.md) with how to re-mount it. Anything the journey needs that 50pick lacks is added in full. |

## 3 · Decisions taken under Ali's delegation (the build decides; each reverses or narrows an older ruling where stated)

Ali has standing delegation for technical calls (*"all other decisions take them"*). The approved plan records these
in full in `docs/VODACOM-PLAN.md` §5 onward, section 0.

| # | Decision | Supersedes / narrows |
|---|---|---|
| SJ-1 | **Card figure** = the zero-stake pool multiple, 1 + (1 − loser-share)·opposite/own, rounded half-up to tenths with integer arithmetic. It is shown as "Shinda ≈{mult}× dau": the deck's card reads ≈2.8× while its sheet at TZS 1,000 reads ≈2.7×. An empty own side shows the state words `beFirst` / `oneSideOnly`, never a figure. Above `ESTIMATE_DISPLAY_CAP` (100) it shows "Shinda zaidi ya {cap}× dau". | v4 R3 (no estimate on cards); L11 / law 40 for cards; DESIGN_AUTHORITY §C3 for cards (scoped) |
| SJ-2 | **Sheet figure** = `payoutFor()` at the entered stake, which equals the server's `potentialPayout`. The "≈N.N×" is derived from that whole-TZS figure, half-up. This is a scoped exception to the floor rule; Up & Down keeps floor. | the floor rule, on journey surfaces only |
| SJ-3 | **`{pct}`** = the market's frozen loser-share total (platform + operator), never `commissionRate`. Legacy capped-commission markets show no figure and use the `describeFeeModel` caption. | — |
| SJ-4 | "≈" marks every estimate. **The Makadirio sentence appears only where the deck draws it**: the sheet's estimate box and the How-to MFANO box. The post-bet receipt and Tiketi zangu keep §C3: no per-position payout before resolution. | §C3, scoped to the cards + the pre-bet sheet |
| SJ-5 | The fixed 1.5× "possible winnings" is retired on loser-share polls. | COMPLIANCE-DECISIONS 2026-07-23 (Policy D3 override) |
| SJ-6 | **Home `/` = the question list.** LIVE markets whose selection is still open, soonest-closing first with ties by pool, 12 per page, then "Onyesha zaidi". No sort control and no search box; `?q` still filters. | 2026-09-12 pool-first order and 2026-09-06 "CLOSED rows stay", **for `/` only** |
| SJ-7 | **Chips:** "Zote" first, then only categories with ≥1 open market, in the deck's order Michezo · Hali ya hewa · Uchumi and then the rest. The parameter is `?cat=`. | v4 R15/R16 (tiles instead of chips) |
| SJ-8 | **Card meta row:** `category · competition` on the left. Competition is a new optional field, e.g. "Ligi Kuu" / "EPL". The close label is on the right: "Inafungwa leo" on the same EAT day, otherwise "Siku {n}" in EAT calendar days. The market page and Tiketi zangu keep an absolute date beside every timer (Gaming Board item #6). | v4 R8's "Litafungwa {date}", on cards only |
| SJ-9 | **Card taps:** the card body goes to `/markets/[id]`. NDIO/HAPANA open the bet sheet in place and never navigate. | CLAUDE.md "Betting flow invariant" (card half), at the flip |
| SJ-10 | **Bet sheet:** the side is locked. Chips read 1,000 / 2,000 / 5,000 / 10,000 in full, set the stake, and are filtered to the market's bounds only. The CTA "Weka dau · TZS X" IS the confirm step; BetConfirmModal and its 10 s quote hold are shelved. Enter never submits. Success shows an in-sheet receipt and does not navigate. | CLAUDE.md "UX commitments" (bet → BetConfirmModal), at the flip |
| SJ-11 | "Weka dau la TZS {balance} badala yake" places that bet directly: the button names the amount, the chip names the side. | — |
| SJ-12 | **Deposit ink:** the low-balance "Weka pesa TZS X" is a deposit ENTRY in `gilt-metal`, the header pill's family. "Lipa TZS X" is a deposit COMMIT in `btn-primary` (brand), per §M3a D1. One-tap Lipa, with no DepositConfirm, applies on the journey screen only. | Final Audit v8 M9, for the journey deposit screen only |
| SJ-13 | **Deposit number:** journey mode seeds it from the latest CONFIRMED mobile-money deposit, otherwise the registered number. "Tumia namba nyingine" stays. | the E-210/E-215 default (2026-08-25, `docs/LIVE-QA-CAMPAIGN.md`), for journey mode |
| SJ-13b | **Deposit wallet:** the last-used wallet is preselected. With no history, none is, and Lipa stays disabled until one is chosen. The phone prefix never picks the wallet. | — |
| SJ-14 | **Phone field:** the kit `PhoneInput` (accepts 07…, 7…, 255…, +255…, typed or pasted) replaces the `maxLength=9` bare input, which today cuts "0712…". | — (a bug fix; ships early) |
| SJ-15 | **Phone header:** `FiftyMark` (the lockup cannot fit at 360), the 18+ badge, a new captioned balance ("Salio" over "TZS 2,000"; TZS at every width; no eye or caret in the capsule), and the gilt "+ Weka pesa" pill. Tapping the capsule opens WalletSheet, which holds the hide-balance eye and "Toa pesa". | v4 R1 / L4 / L20; UPDATE-2026-09-28 §1 (no header Deposit below 1024) |
| SJ-16 | **Four tabs:** Maswali (`/`) · Juu/Chini · Tiketi zangu (`/positions`) · Akaunti (`/account`, new, public), in 50pick's glyph + label + `--pill-active` style. Guests tapping Tiketi zangu get a small sign-in sheet. | v4 WP1b (5 slots + centre coin), V26 |
| SJ-17 | **Akaunti hub (`/account`)** holds every door the avatar menu and "More" give today, with the same gates (invite, proposals, chat, agent, staff console as a plain `<a href="/admin">`), plus the unread badge. | — |
| SJ-18 | **Focused deposit chrome:** the journey deposit screen, its code step and the waiting page show no header, tabs, footer or ticker. They show "‹" + "Weka pesa" and a minimal 18+ and helpline line. | — |
| SJ-19 | **Words:** "Weka pesa" is the deposit ACTION ("Amana" stays the noun). "Tiketi" replaces "Nafasi" on player surfaces, and support tickets become "Ombi la msaada". "NDIO" is the one spelling. "Maswali" replaces "Masoko" as the destination name. | — |
| SJ-20 | **Tagline:** the deck's "Pick. See what you win. Play." (sw and zh drafted) replaces the retired "Tabiri matukio. Si bahati." on ~12 surfaces at the flip. | v4 R7 (slogan retirement, now with a named replacement) |
| SJ-21 | **Copy source:** sw is deck-verbatim and binding for SJ keys. en follows the deck's own English where given. zh and all undrawn states are drafted (R8 of v4). How-to step numerals read "1/2/3". The How-to example figures come from `HOW_TO_EXAMPLE`, which must render TZS 1,000 → ≈2.7× → TZS 2,700. | — |
| SJ-22 | **Rule-required additions to the frames**, each recorded as a deviation: the holder / hedge line, the bonus-wager warning, the thin-upside notice, the capped-market caption, and PayoutStatusNotice on deposit. A "Weka mipaka" link after the sheet CTA is added only if `test:rg-doors` / RG policy requires it. | — |
| SJ-23 | **Preview:** every staff role, SUPPORT included, sees the journey before the flip. The agency gets a signed, revocable 7-day visitor-preview link. | — |
| SJ-24 | **The "first licensed" claim leaves `/`** with the hero. No journey surface or metadata claims "first" (v4 V22's negative half stays). The licence line stays in the footer, 18+ goes in the header, and the helpline is in How to Play and the footer. | v4 R9 (the claim on the home hero); COMPLIANCE 2026-09-27 hero entry, placement only |

## 4 · Where our laws beat the delivery

The repo's laws win every conflict on LOOK (R5). On FUNCTION the deck wins (R1), except where a money, RG or honesty
rule requires an addition (SJ-22).

| # | The deck shows | The law | Applied |
|---|---|---|---|
| L1 | Coral/orange HAPANA, mint NDIO, dark text on both | DESIGN_AUTHORITY §B1/§B2: the YES/NO inks are never re-hued | `.btn-yes` / `.btn-no` in 50pick ink (R5) |
| L2 | Gold for every primary action (Weka dau, Nimeelewa, Lipa, the active tab, step circles) | §M3/§M3a: gold means money; a deposit commit is brand | Bet commit `btn-gold` (§M3a allows it). Lipa and "Nimeelewa, anza" use `btn-primary`. The tab uses `--pill-active`. Steps get a new badge; S4 rules its ink within `test:gold-is-money`. |
| L3 | Two-tone "50**pick**" wordmark | §B1 / brand kit: the mark is never re-tinted | `FiftyMark` / `FiftyLockup` unchanged |
| L4 | Near-white selected chip | Kit `FilterPill` selected style | `FilterPill` as is |
| L5 | The deck's navy palette and typeface | `globals.css` tokens; Sora / Inter / JetBrains Mono | 50pick tokens and fonts |
| L6 | The warning card and the coral stake border use a NO-like ink | §B2a: YES/NO inks only for sides; F3 severity | `Callout tone="neutral"` and a new `Input` `attention` state |
| L7 | Phone placeholder "07XX XXX XXX" in a bare field | `test:msisdn-prefill`, `tz-msisdn` rules | The kit `PhoneInput`: accepts the local form, stored as E.164 |
| L8 | No holder / hedge line, bonus warning or thin-upside notice in the sheet | RULES §2.4/§2.5; the thin-upside disclosure | Added only when they apply (SJ-22) |
| L9 | "13%" typed into the copy | `test:rate-copy`: rates are `{pct}` from the market | `{pct}` from the frozen fee snapshot (SJ-3) |
| L10 | "Msaada 0800 11 0011" | `HELPLINE()` / `HELPLINE_TEL()` from `support-config.ts`, never a literal | A `tel:` link built from `HELPLINE_TEL()` |

## 5 · Open questions for the agency (non-blocking; the build proceeds meanwhile)

| # | Question | What the build does meanwhile |
|---|---|---|
| Q1 | Source files (Figma or similar)? | Builds from the PNG frames |
| Q2 | Their expectation for desktop | Designs desktop in S4 in 50pick's system |
| Q3 | Does the campaign need en/zh screens? | Builds all three languages, as the platform always does |
| Q4 | Any "presented by" / sponsor placement? | None until they answer |
