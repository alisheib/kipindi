# Handoff — Prediction-market design kit (concept)

## Overview

This bundle is a **concept design system** for a binary, pari-mutuel prediction-market product. It contains the foundations (color, type, motion, spacing), atoms (buttons, chips, inputs, probability bars, etc.), market objects (MarketCard, BuyTray, PositionCard, ResolutionPanel, LeaderboardRow), pattern flows (AppShell, Betslip sheet, KYC wizard, RealityCheck, Win celebration), admin queue rows, and a landing-page wireframe drawing.

It is **not a finished product** — there is no assembled app, no domain branding, no payment-rail integration, no operator/license chrome, and no copy that would belong only to a specific licensed entity. The watermark on the canvas reflects this.

## About the design files

The HTML/JSX files in this bundle are **design references**, not production code. They render in a single `Design Kit.html` page that uses Babel-in-the-browser and unpkg CDNs for fast iteration — they are explicitly *not* meant to be deployed as-is.

Your job is to **recreate these designs in the target codebase's existing environment** (React + Tailwind, Next.js, Vue, SwiftUI, native — whatever the host project uses). If there is no host yet, pick the framework that fits the eventual target (a mobile-first web app would suggest Next.js + Tailwind + a component lib like Radix or shadcn).

## Fidelity

**High-fidelity** for foundations, atoms, and the core market objects. Exact OKLCH color values, type scale, spacing scale, radius tokens, and motion easings are all specified in `kit/tokens.css` — recreate them as the source of truth.

**Wireframe-fidelity** for the landing page (it is an SVG block drawing with annotations) and the AppShell mobile sketch. Use these as layout guides; apply the hi-fi tokens for styling.

## Hard invariants — never violate

These are the rules the design depends on for safety and trust:

1. **YES is emerald-green and on the LEFT. NO is rose-red and on the RIGHT.** Globally, in every binary control, probability bar, button pair, segmented toggle. Never reverse.
2. **Probability bars** render YES on the left, NO on the right, regardless of which side is leading.
3. **Mono digits** (JetBrains Mono, tabular figures) for every amount, percentage, time-remaining, and stat. Body type for prose.
4. **Pool-share framing** in copy. Use "share of the pool", "stake", "predict", "if you're right". Never use "guaranteed", "easy money", "risk-free", "double your money", "you can't lose", or any hyperbolic promo.
5. **Brand teal** is for chrome only. **Gold** is reserved for resolved-winner moments and the confirm-payout button. Do not use mobile-money green for brand chrome — it should remain reserved for whatever payment CTA the host product wires up later.
6. **Dark mode is the default.** Light mode must reach equal contrast and hierarchy.
7. **WCAG 2.1 AA** for all text and interactive states.
8. **+30% string-length tolerance** in every text container. Swahili and French translations run longer than English.

## Suggested chrome palettes

Six combinations live in `kit/palette.jsx`. YES emerald, NO rose, and gold-for-resolved stay constant across all of them — only the chrome (page background + brand accent) changes.

| Variant | Background | Accent | When to use |
|---|---|---|---|
| **A · Teal on slate** | `oklch(14% 0.01 240)` | `oklch(45% 0.10 215)` | Kit default. Calm, regulator-friendly. Reads distinct from any payments green. |
| **B · Indigo deep** | `oklch(15% 0.04 270)` | `oklch(60% 0.16 270)` | Editorial, leans Polymarket/Kalshi. Pair with warm gold. |
| **C · Forest** | `oklch(18% 0.04 165)` | `oklch(58% 0.13 165)` | Earnest, organic. **Caution** — keep distinct from any mobile-money green CTA. |
| **D · Charcoal + amber** | `oklch(13% 0 0)` | `oklch(70% 0.16 65)` | Most flexible. Neutral chrome, gold/amber accent. Best if no strong brand opinion yet. |
| **E · Plum night** | `oklch(16% 0.05 320)` | `oklch(65% 0.18 320)` | Distinctive, harder to balance. Use sparingly. |
| **F · Light cream** | `oklch(97% 0.012 80)` | `oklch(38% 0.09 215)` | Print-friendly. Documents, statements, regulator letters. |

**Rules regardless of palette:**
- YES is always emerald-green, on the LEFT.
- NO is always rose-red, on the RIGHT.
- Gold for resolved-winner moments and the confirm-payout button.
- Mono font for all numbers.
- Keep at least 30° hue distance between brand accent and any payment-rail CTA color.

## Files

```
Design Kit.html                # Renders the full canvas — open this to view everything
kit/
  tokens.css                   # All design tokens (colors, type, motion, spacing, radius)
  design-canvas.jsx            # Pan/zoom canvas component (presentation infra; you don't ship this)
  atoms.jsx                    # Button, Chip, ProbabilityBar (4 variants), ProgressBar,
                               #   SteppedProgress, CircularProgress, Input, Avatar,
                               #   TierBadge, Skeleton, Toast, Tooltip, LiveDot, Icon set
  markets.jsx                  # MarketCard, BuyTray, PositionCard, ResolutionPanel,
                               #   LeaderboardRow, EmptyState, line-art empty illustrations
  extras.jsx                   # AppShell sketch, BetslipBottomSheet, KycWizard step,
                               #   RealityCheckModal, WinCelebration, AdminMarkets row,
                               #   AdminResolverQueue row, LandingWireframe, Spacing/Radius
  palette.jsx                  # 6 suggested chrome palettes — pick one for your host
  specimens.jsx                # The composition of all the above onto the canvas
```

## Design tokens

Source of truth is `kit/tokens.css`. Summary:

### Color (OKLCH, full 50–950 ramps for each)

| Token family | Role | Seed |
|---|---|---|
| `--teal-*` | Brand chrome | `oklch(45% 0.10 215)` at 500 |
| `--yes-*` | YES side, position-up, gain | `oklch(70% 0.18 150)` at 500 |
| `--no-*` | NO side, position-down, loss | `oklch(65% 0.20 25)` at 500 |
| `--gold-*` | Resolved-winner, leaderboard, payout | `oklch(80% 0.15 80)` at 500 |
| `--slate-*` | Neutral surfaces and text | dark `oklch(14% 0.01 240)` / light `oklch(96% 0.01 240)` |
| `--danger-500` | Errors, AML alerts | `oklch(60% 0.22 25)` |
| `--info-500` | Info banners, RG nudges | `oklch(60% 0.15 240)` |
| `--warning-500` | Cautions, objection windows | `oklch(75% 0.18 80)` |

Surface tokens (`--bg`, `--bg-elevated`, `--bg-overlay`, `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-subtle`) are remapped automatically by `[data-theme="light"]`. Use surface tokens in components, never raw ramp values, except for the safety-critical YES/NO/gold accents.

### Type

- **Display** — `Sora` (700/600 weights). Geometric, distinguishable lowercase 1/l/i. Used for hero, h1–h3, market titles.
- **Body** — `Inter` (400/500/600/700). Latin + Swahili diacritics + accented French.
- **Mono** — `JetBrains Mono` (400/500/600), `font-variant-numeric: tabular-nums`. Every number on the page.

Scale: `--type-display-1: 56` · `display-2: 44` · `h1: 34` · `h2: 26` · `h3: 20` · `h4: 17` · `body: 15` · `small: 13` · `micro: 11`. All px.

### Spacing

`--sp-1: 4` · `sp-2: 8` · `sp-3: 12` · `sp-4: 16` · `sp-5: 20` · `sp-6: 24` · `sp-8: 32` · `sp-10: 40` · `sp-12: 48` · `sp-16: 64`. All px.

### Radius

`--r-xs: 4` · `r-sm: 6` · `r-md: 10` · `r-lg: 14` · `r-xl: 20` · `r-pill: 999`.

### Motion

- `--ease-micro` — 100ms cubic-bezier(0.2, 0.8, 0.2, 1). Hover, press, focus rings.
- `--ease-stage` — 240ms cubic-bezier(0.4, 0, 0.2, 1). Sheets, modals, toasts, bar fills.
- `--ease-celebrate` — 600ms cubic-bezier(0.2, 0.8, 0.2, 1). Resolve, payout reveal.
- `live-pulse` — 1.5s loop, opacity 0.5–1.0. Live-volume markets only.
- `gold-shimmer` — 1.6s loop, gradient sweep over resolved ProbabilityBar.

## Components — implementation notes

### `Button`
- 6 variants: `primary` (teal), `yes` (emerald), `no` (rose), `ghost`, `danger`, `gold`.
- 4 sizes: `sm 30px` · `md 38px` · `lg 46px` · `xl 56px`.
- States: rest, hover, pressed (translateY 1px), focus-visible (2px teal-300 ring, 2px offset), disabled (opacity 0.45), loading (spinner replaces leading icon).
- Leading + trailing icon slots.
- `gold` is gradient-filled, used only for the confirm-payout CTA — don't use it as a generic button.

### `ProbabilityBar`
- 4 variants:
  - `split` (default) — YES grows from left, NO grows from right, meet at boundary tick.
  - `segmented` — same but with a 4px gap between sides; labels render inside each fill.
  - `minimal` — single-fill leading side only, neutral track. Best for dense lists.
  - `resolved` — adds a 1.6s gold-shimmer overlay sweep.
- Two sizes: `micro 12px` (in cards), `large 24px` (detail hero).
- Animate `width` with `--ease-stage` on initial reveal; in lists, stagger 40ms per row using IntersectionObserver.
- Always include `role="progressbar"`, `aria-valuenow={yesPct}`, and an `aria-label` describing YES probability.

### `ProgressBar` (generic)
- Tones: `teal` (default chrome), `yes`, `no`, `gold`, `warning`, `info`, `danger`.
- Sizes: `sm 4px` · `md 8px` · `lg 12px`.
- Optional inline label + percentage.
- Each tone has a soft outer glow matching its hue.
- Use cases: daily-limit, objection-window countdown, KYC review progress, sync state.

### `SteppedProgress`
- Multi-segment bar for wizard flows. Past steps fill teal-400; current step glows; future steps are bg-overlay.

### `CircularProgress`
- Use for confidence rings on the resolver queue, session-time clocks, and KYC step indicators.
- Tones map to the same palette as `ProgressBar`.

### `MarketCard`
- 360px wide, full-width on mobile with 16px gutter.
- Status chip + category chip top-left; external-source icon top-right.
- Title in display font, EN; Swahili italicised below in `--text-subtle`.
- Micro probability bar with mono percentages below.
- Volume / predictor count / time-remaining row in mono.
- YES (left, emerald) and NO (right, rose) buttons in a `1fr 1fr` grid with 8px gap.
- Hover: `translateY(-2px)` + teal-500 border + soft elevation. Tap-anywhere → market detail (buttons stop propagation).

### `BuyTray`
- 340px panel. Top: YES/NO segmented control inside an inset overlay surface.
- TZS-prefixed mono input. Quick-chip pills below: 1k / 5k / 10k / 25k / 50k / 100k.
- Divider, then "Share of pool" line and "If correct, you receive" line — gold mono on the value.
- Confirm button is `gold xl`, full-width, with the payout amount baked in.
- Disclaimer below: "Pool-share payout. Outcome may differ from current odds."

### `BetslipBottomSheet` (mobile, replaces BuyTray <768px)
- Rounded-top sheet, 12px–22px padding, drag-handle indicator at top.
- Same controls as BuyTray, denser layout.
- Behind the sheet, the page is dimmed + 2px blurred.
- Swipe-down to dismiss; the confirm button copy reads "Hold to confirm" — implement as press-and-hold.

### `PositionCard`
- 340px. Top row: side chip (YES/NO) + status chip (Pending / Resolved · Win / Resolved · Loss / Voided).
- Title row.
- 3-up grid: Stake / Current (or Final) / Max payout — labels in caps-micro, values in mono 13.
- "Sell half · Coming soon" disabled button with dashed border.

### `ResolutionPanel`
- 480px panel.
- Header: title + status chip (objection-window or resolved).
- If unresolved: 24h objection-window progress bar (warning-amber).
- Resolver row: avatar + name + "Compliance Officer · 2-officer rule satisfied" + Source link button.
- Settlement table: YES pool / NO pool / operator margin (9% from losing pool) / distributed total in gold.
- Footer button (only when objection window open): "Flag this resolution for review" — warning-amber outline.

### `LeaderboardRow`
- 720px row, 6-column grid: rank / predictor / ROI / streak / resolved / follow.
- Rank in mono, gold for top 3, otherwise text-muted.
- Predictor: avatar + handle + tier badge (bronze/silver/gold/diamond).
- ROI: gold when positive, rose when negative, mono.
- Follow disabled — "Follow · soon".

### `KycWizardSheet`
- Multi-step. Step 1 of 4: phone OTP.
- Top progress bar — 4 segments, current is teal-400, rest are bg-overlay.
- 6-digit OTP input as 6 individual 48×56 boxes; filled boxes have teal-400 border.
- "Resend code in 0:42" below.
- Sticky Back / Continue at bottom.

### `RealityCheckModal`
- Pending chip + "You've been on for 30 minutes" headline.
- 2-up KPI grid: Staked / Net (rose if negative).
- Calm CTAs: "Take a break" (ghost) + "Continue session" (primary).
- Never punitive, never alarming. Tone: "a short pause is a good idea".

### `WinCelebration`
- Gold-bordered panel with subtle gold gradient overlay.
- 56×56 gold check icon at top.
- "Resolved · YES" caps label, "You were right" headline, mono `+TZS X` in gold-300, "Imelipwa · Paid to your wallet" sublabel.
- Single Continue button. **No confetti, no slot-reel imagery, no chips/dice.**

### `Toast`
- 4 kinds: success / warning / danger / info. Each has a colored icon disc.
- Mobile: top-anchored, full-width, 16px margin.
- Desktop: top-right, 360px max width, stack vertically with 12px gap.
- Auto-dismiss 4s; pause on hover.

### `Tooltip`
- 12px mono, `--slate-950` bg, white text, top-positioned with arrow.
- Delay 400ms on show; instant on hide.

### `Skeleton`
- 200% width gradient sweeping at 1.4s. Use the market-card-row shape for list loading.

### Empty states
- 360px boxed, dashed border, centered.
- Line-art SVG illustration: brand-teal stroke, gold accent. **No mascots, no full-color cartoons.**
- Title (display 16/600), body (13, EN + SW), optional ghost CTA.
- Error copy template: "Something didn't work. Try again. · Hitilafu imetokea. Jaribu tena." Never blames the user.

## Patterns

### `AppShell` (player-facing)
- Top bar (56px): wordmark · search input (pill) · notifications bell · avatar.
- Live ticker (32px): pulsing red dot + rotating "TZS X just predicted YES on …" copy.
- Main content scrolls.
- Bottom nav (mobile, 64px, 5-up): Markets / Live / Positions / Leaderboard / Profile. Icon + 10px label. Active tab uses `--teal-300`.

### `AdminShell`
- Confidential band at top (operator pattern; not designed here — keep host's existing).
- Left sidebar with grouped nav on desktop; hamburger drawer on mobile.
- Top bar: breadcrumbs + officer chip + role + DEMO/ACTIVE pill + search.

### Admin · Markets curation queue
- Sortable, bulk-selectable table. Columns: checkbox / title / category / source URL / proposed-by / status / volume / actions.
- Status chip variants: DRAFT (pending) / LIVE (live, dot) / RESOLVED (resolved gold).
- Source URL is a first-class column — required before publish. Render as `mono` link with external icon.
- Actions: New market (primary, plus icon) / Publish selected / Retire / Edit per row.

### Admin · Resolver queue
- Card list, one per market within 24h of resolution.
- Per card: title / time-left (rose if <1h) / suggested outcome + confidence / two-officer status chip / Confirm-outcome button.

### Landing page (wireframe — see `kit/extras.jsx → LandingWireframeSpecimen`)

Block layout, top to bottom:
1. **Top nav** — wordmark, search, theme toggle, language toggle (EN/SW/FR), notifications, avatar.
2. **Hero** — large two-line headline ("Predict events. Not chance."), secondary line in EN + SW italic, featured-market preview block (title, probability bar, YES/NO labels) on the left, primary CTA "Try the demo" on the right. **Frame as predicting events, not chance — never promise winnings.**
3. **Featured live markets** — 3-card carousel (mobile swipe, desktop static). Reuse `MarketCard`.
4. **How it works** — 3 numbered steps in a row: "Pick a side / Stake TZS / Get paid if you're right" with Swahili italicised below each.
5. **Why us** — 3 cards. **The first card slot is intentionally undefined** — it should be filled by the operator with whatever regulatory/trust badge applies in their jurisdiction once that's established. The other two: provably-resolved (link to fairness page) and mobile-money native.
6. **Leaderboard preview** — top 5 of the week, ROI in gold mono.
7. **Recent resolutions** — 3 small cards with "RESOLVED" gold chip and `+TZS X` payout total.
8. **Footer** — RG / Privacy / Terms / Help nav. **Footer license slot deliberately unfilled** — wired from operator runtime config, not baked in.

## Interactions & behavior

- **Probability-bar reveal** — On mount or scroll-into-view, animate width from 0 to target with `--ease-stage` (240ms). In lists, stagger 40ms per visible row.
- **MarketCard hover** — `translateY(-2px)` + teal-500 border, 200ms.
- **Live-dot pulse** — opacity loop 0.5↔1.0, 1.5s, with a 6px box-shadow expand on the upswing.
- **Win-shimmer** — gold gradient sweep over the resolved bar, 1.6s loop.
- **Settlement countdown** — tick every second; pulse to amber in last 10s.
- **Bottom-sheet "Hold to confirm"** — press-and-hold for 600ms; show a progress fill on the button border; release early cancels.
- **Reality check** — fires at 30-minute session intervals; can be snoozed for the session but not disabled.
- **Toasts** — auto-dismiss 4s, pause on hover, swipe-right to dismiss on mobile.

## State management (target codebase)

Minimum state surface:
- `currentUser` — auth + KYC tier.
- `wallet` — balance in TZS (mono format), pending holds.
- `markets[]` — id, title (en/sw/fr), category, sourceUrl, resolutionAt, yesPool, noPool, predictorCount, status, resolvedOutcome.
- `positions[]` — userId, marketId, side, stake, entryOdds, currentValue, status.
- `leaderboard[]` — rolling-window aggregation; cache for 60s.
- `session` — sessionStartedAt, accumulatedStake, netPL — drives RealityCheck.
- `theme` — dark | light, persisted.
- `locale` — en | sw | fr, persisted.

Data fetching: assume the target uses the host's existing client (React Query, SWR, etc.). Markets and probability data should poll at a sensible interval (5–10s for live markets) with optimistic updates on the user's own stake placement.

## Accessibility

- 4.5:1 contrast for body text, 3:1 for large text and UI elements — verified for both themes.
- 2px focus ring (`--teal-300`), 2px offset, on every interactive element. Never `outline: none` without a replacement.
- All icon-only buttons need `aria-label`.
- Probability bars: include `role="progressbar"` with `aria-valuenow={yesPct}`, `aria-valuemin=0`, `aria-valuemax=100`, `aria-label="YES probability X%"`.
- 44px minimum hit target on mobile.
- All copy must accommodate +30% length growth (Swahili).

## Assets

Fonts: Sora, Inter, JetBrains Mono — all from Google Fonts (the kit references the CDN; in production you should self-host with `font-display: swap`).

Icons: ~30 hand-tuned 1.5px-stroke SVGs in `kit/atoms.jsx → Icon`. Reference quality bar is Lucide / Phosphor. The brief calls for ~50; extend the set in the host codebase as needed using the same stroke style.

No raster imagery is shipped. Photography slots in the eventual product should use release-cleared local talent — no global stock-photo cliches.

## Open / deliberately unfilled

These were left blank in the kit on purpose — they depend on the operating entity, not the design:

- **Wordmark** — the AppShell sketch uses a placeholder `[wordmark]` block. The real product name and lockup belong to the operator.
- **Footer license slot** — pulled from operator runtime config.
- **First "why us" card on the landing page** — to be filled with the operator's regulatory/trust angle.
- **Helpline / regulator number** — same.
- **Payment-rail CTA color** — reserved for the host's chosen rail; brand teal is the default chrome and must read distinct from any payments green.

## Constraints — keep in production

- Never use copy promising winnings, guarantees, risk-free outcomes, or "easy money".
- Never use casino visual cliches — chips, dice, roulette, slot reels, confetti.
- Dark mode default; light mode equally polished.
- 18+ messaging belongs on every public page footer once the operator chrome is wired.
- Reality-check and self-set limits are first-class, not buried.
