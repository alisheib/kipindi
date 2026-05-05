# Design Request — 50pick (50pick.com)

**To:** Claude Designer
**From:** Engineering (handoff via Ali, operator)
**Status:** Open. Take the time you need. World-class only — do not compress.
**Output target:** `polymarket-wf/` directory at the repo root, mirroring the existing `mapigo/admin-wf/` pattern. Engineer-ready JSX specs + a single design canvas.

---

## 1 · Product

**50pick** is a Tanzania Gaming Board–licensed binary prediction market.

- **Mechanic**: pari-mutuel pool. Users buy YES or NO on a real-world question. When the market resolves, winners split the losers' stake. The operator keeps a **9% margin from the losing pool** (not from winners' stakes).
- **Markets**: operator-curated. Compliance officer creates a market with a written resolution criterion + an official source URL + a resolutionAt timestamp. At resolutionAt, a *different* officer posts the outcome (two-officer rule). 24-hour public objection window before payout finalises.
- **Examples of markets we will list**: "Will the TZS strengthen vs USD by month-end?", "Will Simba SC win the league?", "Will the rains begin before April 15?", "Will the BoT base rate change at the next meeting?", "Will Bongo Star Search end on schedule?", "Will Magufuli Bridge open by Q3?", "Will Tanzania pass 50M population in this census?". Politics + macro + sports + weather + culture.
- **Payments**: M-Pesa native (also Tigo Pesa, Airtel Money, HaloPesa, Mixx by Yas, card). Withdrawals require KYC + 6-digit OTP + 10% withholding-tax notice (TRA-aligned).
- **Locale**: English + Kiswahili + French. Dark mode default; light mode equally polished.
- **Domain**: 50pick.com.
- **Tagline**: *"Tabiri. Shinda."* / *"Predict. Win."* (English secondary.)
- **Voice**: factual, regulator-respected, calm-confident. Polymarket-level restraint with African-modern soul. **Never** "guaranteed", "easy money", "risk-free", "double your money", "you can't lose", or any hyperbolic promo. Always replace with: "share of the pool", "stake", "predict", "if you're right".

---

## 2 · Brand

### Colours (OKLCH-defined; provide both CSS custom-properties and a `tokens.json`)

Build a full 50–950 ramp for each. These are the seed values; you set the curve.

| Token | Seed (dark BG) | Notes |
|---|---|---|
| `brand-teal` | `oklch(45% 0.10 215)` | Primary brand, distinct from M-Pesa green |
| `yes-emerald` | `oklch(70% 0.18 150)` | YES button, position-up, gain |
| `no-rose` | `oklch(65% 0.20 25)` | NO button, position-down, loss |
| `win-gold` | `oklch(80% 0.15 80)` | Resolved-winner state, leaderboard tier, payout celebration |
| `neutral-slate` | `oklch(96% 0.01 240)` (light) / `oklch(14% 0.01 240)` (dark) | Background |
| `danger-red` | `oklch(60% 0.22 25)` | Errors, AML alerts |
| `info-blue` | `oklch(60% 0.15 240)` | Info banners, RG nudges |
| `warning-amber` | `oklch(75% 0.18 80)` | Cautions |

**M-Pesa green is OFF-LIMITS for brand chrome** — reserve it strictly for the M-Pesa payment CTA in deposit/withdraw flows so users never confuse 50pick with M-Pesa.

YES is always emerald-green and on the LEFT. NO is always rose-red and on the RIGHT. Never reverse this anywhere — it is the most safety-critical UI invariant on the platform.

### Typography

Pick from Google Fonts (we self-host). Provide:
- **Display**: bold, geometric, slightly humanist, distinguishable lowercase 1/l/i. Suggestion seed: Sora / Manrope / Plus Jakarta Sans. Pick one and justify.
- **Body**: highly readable at 14px, Latin + Swahili diacritics + accented French. Suggestion seed: Inter / IBM Plex Sans.
- **Mono**: tabular numbers for amounts and probabilities. Suggestion seed: JetBrains Mono / IBM Plex Mono.

Type scale (display-1 through micro), weight assignments per role, tracking + leading per scale. Output as `typography.css` token block.

### Logo

Deliverables:
1. **Wordmark** — primary lockup. "50pick" rendered in your chosen display font with a custom geometric treatment of the digits.
2. **Standalone mark** — for favicon, app icon, social share. Idea seeds (pick one and execute, do not ship variants): a 50/50 split bar; a coin-flip arc; a dual-tone "5" where the bowl is YES-green and the stem is NO-rose; a target-with-checkmark.
3. **Monochrome variant** — 1-colour for press, statements, regulator letters.
4. **Dark + light variants**.
5. Deliverables: SVG (master), 1024×1024 PNG (transparent), 512×512 PNG (rounded-corner social square), 32×32 favicon.ico.

The logo must NOT use M-Pesa green. It must NOT resemble a casino chip, dice, or roulette wheel — that's a regulator red flag for a prediction-market product.

---

## 3 · Component kit

For every component below, deliver:
- **Default state** (rest)
- **Hover** (desktop)
- **Pressed** / **active**
- **Focus-visible** (keyboard ring)
- **Disabled**
- **Loading** (skeleton or spinner — your call per component)
- **Empty** state copy (EN + SW)
- **Error** state copy (EN + SW)

### 3.1 Atoms
- `ProbabilityBar` — animated, intersection-observer reveal, optional gold-shimmer when market is resolved. Variants: micro (12px tall, in card), large (24px tall, in detail hero). YES% on left, NO% on right.
- `Chip` — neutral / yes / no / live / resolved / pending / objection
- `Button` — primary (brand-teal), yes (emerald), no (rose), ghost, danger. Sizes: sm / md / lg / xl. Loading + leading-icon + trailing-icon variants.
- `Input` — text / number / phone / OTP. Money input must show "TZS" prefix and use mono digits.
- `Avatar` — for predictors. Initials fallback + photo when set.
- `Badge` — license, role, tier (bronze / silver / gold / diamond on leaderboard).
- `Skeleton` — for every list-row shape.
- `Toast` — success / warning / danger / info. Mobile = top-anchored full-width, desktop = top-right.
- `Tooltip` — for probability % on hover.
- `LiveDot` — pulsing dot for live-volume markets.

### 3.2 Market objects (the heart of the product)

#### `MarketCard` (list item)
- Title in EN, with SW italicised underneath
- Source-link icon (top-right)
- Tag chip (Politics / Sports / Macro / Weather / Culture / Other)
- Animated `ProbabilityBar` showing YES%
- "TZS X volume · Y predictors" microcopy
- Time-to-resolution chip
- Two buttons: **YES @ XX%** (emerald, left) and **NO @ XX%** (rose, right)
- Tap-anywhere-not-button → market detail
- Hover (desktop): subtle elevation + 2px border-shimmer in brand-teal
- Mobile: full-width, 16px gutter, 12px gap stack

#### `MarketDetail` hero (full page)
- Large title + SW subtitle
- 24px-tall `ProbabilityBar`
- 4 KPIs: live volume, predictor count, time-to-resolution, your-position-if-any
- A timeseries chart of YES% over time (defer to Sprint 22 — design the empty placeholder)
- Buy tray sidebar (desktop) / bottom sheet (mobile)

#### `BuyTray`
- Toggle YES / NO at top (segmented control)
- Amount input with quick-chips: 1k, 5k, 10k, 25k, 50k, 100k (TZS)
- Live calculator: "If YES wins, you get **TZS X**" (mono, gold tint)
- Share-of-pool readout: "Your stake = X% of the YES pool"
- M-Pesa CTA prominent if wallet balance < amount
- Confirm button is large, gold, with mono-numeric payout preview baked in

#### `PositionCard` (in /positions or in MarketDetail)
- Side label (YES or NO) with coloured pill
- Stake / current value / payout-if-correct
- Sell-half button (defer to v2 — design it but mark it disabled "Coming soon")
- Settlement status: PENDING / RESOLVED-WIN / RESOLVED-LOSS / VOIDED

#### `ResolutionPanel` (on MarketDetail after market closes)
- Countdown until resolutionAt
- After resolve: resolver name + photo + role (e.g. "Compliance Officer · Asha M.")
- Source URL (clickable, opens new tab)
- Outcome chip: YES / NO / VOID
- 24h objection-window progress bar with "Flag for review" button
- Final-payout summary table

#### `LeaderboardRow`
- Rank (mono number, large)
- Avatar + handle + tier badge (bronze/silver/gold/diamond)
- ROI% (gold-tint when positive, rose when negative)
- Markets-resolved count
- Win-streak chip
- "Follow" button (defer to v3 — design but disable)

### 3.3 Layout shells

#### `AppShell` (player-facing)
- Top bar: 50pick wordmark, search, language toggle, theme toggle, notifications bell, avatar menu
- Bottom nav (mobile): Markets / Live / Positions / Leaderboard / Profile
- Live ticker: "TZS X just predicted YES on …" rotating

#### `AdminShell`
- Confidential band at top (existing pattern — keep)
- Left sidebar (desktop) with grouped nav; mobile hamburger drawer (existing — keep)
- Top bar: breadcrumbs + officer chip + role + DEMO/ACTIVE pill + search

#### `LegalShell`
- Static layout for /legal/* pages — keep existing

### 3.4 Modals + sheets
- `BetslipBottomSheet` (mobile) — slides up, swipe-down to dismiss, swipe-up-and-hold to confirm. Replaces `BuyTray` on <768px.
- `RealityCheckModal` — keep existing pattern, restyle.
- `WinCelebration` — gold shimmer (no confetti — too casino), "TZS X paid · Imelipwa" message, Continue button.
- `KycWizardSheet` — multi-step: phone OTP → NIDA → documents → review. Existing flow, restyle.
- `ConfirmDialog` — generic confirm/cancel.
- `LimitNudgeModal` — RG self-care prompt when daily-loss limit at 80%.

### 3.5 Empty / error / loading

For every list, provide all three. Empty-state illustrations: line-art only, no full-colour mascots, brand-teal stroke, gold accent. Subjects: empty market list, empty positions, empty notifications, empty leaderboard, empty audit log.

Error state: "Something didn't work. Try again. · Hitilafu imetokea. Jaribu tena." — never blame the user.

---

## 4 · Iconography

Provide a 50+ icon set, hand-tuned at 16/20/24 px. 1.5px stroke. Categories:

- **Market types**: politics (ballot box), sports (whistle), macro (graph), weather (cloud-sun), crypto (coin-arrow), culture (microphone), tech (chip), other (asterisk)
- **Actions**: predict, sell, share, flag, follow, alert
- **Statuses**: live, resolved, voided, pending, objection
- **Wallet**: deposit, withdraw, history, hold
- **Auth**: lock, key, OTP, fingerprint
- **Compliance**: shield, flag, audit, hammer
- **System**: backup, health, chain, sms, match-feed

Reference quality bar: Lucide / Phosphor.

---

## 5 · Motion system

Define and document:
- `--ease-micro` — 100ms ease-out, for hover/press
- `--ease-stage` — 240ms ease-in-out, for sheet/modal/toast
- `--ease-celebrate` — 600ms cubic-bezier(0.2, 0.8, 0.2, 1), for resolve/win
- `ProbabilityBar` reveal: 800ms, staggered 40ms per market in a list
- `MarketCard` hover-tilt: max 4° transform, 200ms
- `Win-shimmer` overlay: 1.2s gold-gradient sweep
- Live-dot pulse: 1.5s loop, opacity 0.5–1.0
- Settlement countdown: 1s tick, last 10s pulses to amber

Provide an `motion.css` token block.

---

## 6 · Landing page

Hero: large probability bar of a featured market currently live; tagline "Tabiri. Shinda."; CTA "Try demo · TZS 100,000" (existing demo flow).

Sections (in order):
1. **Featured live markets** (3-card carousel, mobile swipeable, desktop static)
2. **How it works** — 3 steps: "Pick a side · Stake TZS · Get paid if you're right" (one-liner each, EN + SW)
3. **Why 50pick** — 3 cards: licensed (GBT badge), provably resolved (link to /fairness), M-Pesa native
4. **Leaderboard preview** — top 5 predictors of the week, with ROI%
5. **Recent resolutions** — 3 cards with outcome + payout total
6. **Footer** — 18+ badge, GBT license number, helpline 0800 11 0011, RG link, Privacy link, Fairness link, Terms, Help

The hero must NOT promise winnings. Frame as "predict events, not chance" — that's our regulator-defensible positioning.

---

## 7 · Admin shell — keep + extend

We already ship 17 admin pages. Restyle the existing pages to use the new design tokens. Two new pages need fresh design:

### `/admin/markets` (Markets curation queue)
- Table: title, category, source URL, proposedAt, proposedBy, status (DRAFT / LIVE / RESOLVED), volume, action
- Bulk actions: publish, retire, edit
- "New market" floating action button → modal with required fields: title EN, title SW, category, source URL, resolutionAt, resolution criterion (markdown editor), tags

### `/admin/resolver-queue`
- Markets approaching resolutionAt within 24h, sorted by closest deadline
- Per row: market title, time-left, suggested outcome (auto-pulled from source if available), confidence, two-officer status (waiting officer 1 / waiting officer 2 / resolved)
- One-click "Confirm outcome" → kicks off two-person flow
- Objection-window panel for resolved-but-not-yet-final markets

Provide visuals for both.

---

## 8 · Frame deliverables

Frames at exactly these viewports (do not improvise):
- 393 × 852 (mobile, common Android)
- 430 × 932 (mobile, iPhone Pro Max)
- 768 × 1024 (tablet portrait)
- 1024 × 1366 (tablet landscape)
- 1280 × 800 (desktop)
- 1440 × 900 (operator desktop)

For each: render the four highest-priority screens — Landing, MarketDetail, Positions, AdminMarkets.

---

## 9 · Constraints (regulator + accessibility + locale)

**Hard constraints — no exceptions:**
- 18+ badge + GBT license number + helpline `0800 11 0011` visible on every public page (footer is fine)
- Dark mode default; light mode polished, **equal hierarchy and contrast**
- WCAG 2.1 AA on every state (4.5:1 body text, 3:1 large text + UI)
- EN + SW + FR copy variants — design must accommodate **+30% string length** (Swahili runs long)
- YES is always emerald-green and on the LEFT. NO is always rose-red and on the RIGHT. Globally. Forever.
- Probability bars always render YES on the left, NO on the right
- M-Pesa green is reserved for the M-Pesa-payment CTA only — brand teal must read distinct
- No "easy money", "guaranteed", "risk-free", "double your money" copy anywhere
- No casino visual cliches (chips, dice, roulette, slot reels)
- All photographs must be release-cleared Tanzania talent — no global stock-photo cliches
- All copy must pass at a Standard Nine-Eight reading level for EN

---

## 10 · Output format

**Where**: extend the existing `mapigo/admin-wf/*` pattern. Drop the new package at:

```
polymarket-wf/
  design-canvas.jsx        # Single big-picture overview canvas
  tokens.json              # All design tokens (colours, type, motion, spacing)
  tokens.css               # CSS custom properties
  motion.css               # Animation primitives
  components/
    ProbabilityBar.jsx
    MarketCard.jsx
    MarketDetail.jsx
    BuyTray.jsx
    BetslipBottomSheet.jsx
    PositionCard.jsx
    ResolutionPanel.jsx
    LeaderboardRow.jsx
    AppShell.jsx
    AdminShell.jsx
    AdminMarkets.jsx
    AdminResolverQueue.jsx
    Landing.jsx
    EmptyStates.jsx
  logo/
    wordmark.svg
    mark.svg
    mark-mono.svg
    favicon.ico
    app-icon-1024.png
  icons/                   # All 50+ icons as SVG
  frames/                  # Per-viewport renders, 6 viewports × 4 screens
```

**Engineer-ready**: each component file is a self-contained React (or React-shaped pseudo-JSX) snippet I can drop into `src/components/markets/*` after running it through our token-rename. Use Tailwind class names where possible, custom properties otherwise.

---

## 11 · Inspiration — quality bar

- **Polymarket** — restraint, dense data, calm typography
- **Robinhood Predictions** — motion polish, mobile-first
- **Kalshi** — data density without overwhelming
- **Linear** — typography hierarchy, density done right
- **Stripe** — form polish, microcopy
- **Frame.io** — admin density, dark mode mastery
- **Patagonia** — earnest brand voice (steal the tone, not the green)
- **Modern East African design** — Kibera Hamlets, NEST, Twiga — research and reference

Match these. Beat them where you can.

---

## 12 · Take your time

The user said: *"Take the time you need. Make it world-changing, office-ready, visually ready."* No compression. We want to dominate the Tanzania prediction-market space — one shot. World-class only.

If something here is unclear or you want to push back on a decision, do it in `polymarket-wf/QUESTIONS.md` at the same level as `design-canvas.jsx`. We'll resolve before engineering picks it up.

When done, leave a one-paragraph summary at the top of `polymarket-wf/design-canvas.jsx` describing what's in the package and any deferred items.

— Engineering
