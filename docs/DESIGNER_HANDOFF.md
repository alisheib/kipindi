# Designer Handoff — Full UI/UX Refresh

> Everything a designer needs to refurbish 50pick from the smallest icon
> to the full page compositions.

## Quick start

1. Read `50PICK/design_handoff_prediction_market_kit/README.md` — the hard rules
2. Read `design_handoff_ui_kit/tokens/TOKENS.md` — color/type/spacing cheat sheet
3. Open `50PICK/design_handoff_prediction_market_kit/Design Kit.html` in a browser — the visual reference
4. Read this document for the full component inventory

## Hard rules (do NOT change)

| Rule | Why |
|---|---|
| OKLCH color space only | Perceptually uniform, accessibility-consistent |
| YES = emerald (hue 152), NO = rose (hue 22) | Semantic, untouchable, used in every market |
| Gold = soloist accent only (hue ~80) | Not for large fills — focal actions, resolved, wins |
| Aqua <= 8% surface coverage | Finishing pass only — glow, sparkline, focus ring |
| Dark mode default | Tanzania market — OLED screens, outdoor readability |
| Sora (display), Inter (body), JetBrains Mono (numbers) | Locked — loaded via Google Fonts CDN |
| +30% string-length tolerance | EN/SW/FR bilingual — every label must fit 30% longer text |

## Color token map

### Primary ramps (11 shades each: 50–950)
- `--royal-*` / `--teal-*` (hue 268) — brand canvas, chrome, surfaces
- `--yes-*` (hue 152) — YES side, wins, positive outcomes
- `--no-*` (hue 22) — NO side, losses, negative outcomes
- `--gold-*` (hue ~78-82) — resolved, accent, CTAs, champagne

### Secondary
- `--claret-*` (hue 15) — heritage, editorial, sovereign tier
- `--aqua-*` (hue ~195) — finishing pass, sparkline, focus ring
- `--slate-*` (hue 240) — neutral surfaces

### Semantic surface tokens
- `--bg-base`, `--bg-elevated`, `--bg-overlay`, `--bg-sunken`
- `--text`, `--text-muted`, `--text-subtle`, `--text-tertiary`
- `--border`, `--border-strong`, `--border-focus`
- `--success`, `--warning`, `--danger`, `--info` (each with -bg, -border, -fg)

All values are in `design_handoff_ui_kit/tokens/globals.css` (1,678 lines).

## Typography

| Role | Font | Weights | Sizes | Usage |
|---|---|---|---|---|
| Display | Sora | 600, 700 | 28–68px | H1–H3, hero headline |
| Body | Inter | 400, 500, 600 | 13–18px | Prose, labels, descriptions |
| Mono | JetBrains Mono | 400, 500, 600 | 9–16px | Amounts, times, stats, tabular data |

## Component inventory (82 components)

### Atoms (`src/components/ui/`) — 18 components
| Component | File | Description |
|---|---|---|
| Button | `button.tsx` | Variants: gold, yes, no, ghost, danger, claret, aqua-ghost |
| Chip | `chip.tsx` | Status pills: live, resolved, pending, objection, yes, no, active, paused |
| Avatar | `avatar.tsx` + `identity-avatar.tsx` | Generative heraldic crest (4 directions) + photo fallback + tier ring |
| Toast | `toast.tsx` | Stacked notifications: default, success, warning, danger, gold |
| Glyphs | `glyphs.tsx` | 40+ custom line icons (category, action, nav, status, decorative) |
| PhoneInput | `phone-input.tsx` | E.164 Tanzania phone field |
| Skeleton | `skeleton.tsx` | Shimmer placeholder + MarketCardSkeleton |
| Spinner | `spinner.tsx` | CSS spinner |
| SubmitButton | `submit-button.tsx` | Form submit with pending state |
| LanguageToggle | `language-toggle.tsx` | EN/SW/FR selector |
| EmptyState | `empty-state.tsx` | Configurable empty state |
| PageLoader | `page-loader.tsx` | Route-level loading with bilingual label |

### Brand (`src/components/brand.tsx`) — 12 primitives
FiftyMark, FiftyWordmark, FiftyLockup, GiltCorner, TippingBar,
ConfidenceDial, SignalPip, PulseRing, BrandSpinner, SectionLoader,
BrandLoader, BrandTopo (topographic background)

### Layout (`src/components/layout/`) — 8 components
TopAppBar, BottomNav, AppShell, AvatarMenu, WalletBalancePill,
NotificationsPanel, PublicFooter, LiveTicker

### Markets (`src/components/markets/`) — 15 components
MarketCard, ConvictionDial, ProbabilityChart, Sparkline, TippingBar,
BetConfirmModal, SellConfirmModal, OperationResultModal, CommentsThread,
NotifyPoller, WinCelebration, CircularProgress, SellButton, PoolMeter

### Admin (`src/components/admin/`) — 3 components
AdminShell (sidebar + topbar + KPI tiles), AdminCharts, PeriodPicker

### Other feature groups
- `proposals/` — StatusBadge, VoteControl, StatusTimeline
- `chat/` — ChatPanel, ChatBubble, ChatInput (6 components)
- `badges/` — AchievementToast, Badge
- `profile/` — AvatarUploader, NameEditor
- `rg/` — RealityCheck, SelfExcludeModal
- `onboarding/` — WelcomePrimer

## Icon system

40+ custom heraldic glyphs in `src/components/ui/glyphs.tsx`:

**Categories:** football, forex, weather, economy, crypto, entertainment, tech
**Actions:** trade, watch, share, comment, bell, search, filter, plus
**Navigation:** home, markets, portfolio, trophy, profile
**Status:** live, tipping, hot, soon, resolved, void
**Trust:** shieldcheck, bolt, wallet
**Decorative:** crown, shield, sparkle, star, flame

All use `currentColor`, 24px viewBox, 1.9px stroke. Lucide React as fallback.

## Page map (58 routes)

### Player-facing (30 routes)
```
/                       Landing (hero + live markets + trust strip)
/markets                Grid with filter sidebar
/markets/[id]           Detail: dial, chart, comments, resolution
/live                   Live-only wall
/leaderboard            Predictor rankings + tier badges
/proposals              Community market proposals
/proposals/new          Submit a proposal
/proposals/[id]         Proposal detail + vote
/positions              User's open + settled positions
/wallet                 Balance + transaction history
/wallet/deposit         Mobile-money deposit form
/wallet/withdraw        Withdrawal with KYC gate
/profile                Account overview + avatar
/profile/kyc            Identity verification
/profile/invite         Affiliate referral program
/profile/sessions       Active sessions
/profile/responsible-gambling   Limits + self-exclusion
/fairness               Provably-fair documentation
/help                   Support + legal links
/legal/*                Terms, privacy, AML, responsible gambling
/auth/*                 Login, register, OTP, forgot-password
```

### Admin (28 routes)
```
/admin                  Dashboard KPIs + 24h flow
/admin/ai-polls         AI poll generation (mock Claude provider)
/admin/candidates       AI market candidate pipeline
/admin/markets          Curation queue + create new
/admin/resolver-queue   Two-officer settlement
/admin/players          Roster + cohort analysis
/admin/finance          Revenue, payouts, chargebacks
/admin/reports          PDF/XLSX generation
/admin/compliance       General compliance
/admin/aml              AML transaction review
/admin/audit            Append-only log browser
/admin/affiliate        Recruitment leaderboard
/admin/moderation       Comment moderation
/admin/self-exclusions  Self-exclusion roster
/admin/sources          Trusted news sources
/admin/config           Market rates + fees
/admin/house-pool       House liquidity management
/admin/system           Feature flags, health, version
```

## Responsive breakpoints

| Token | Width | Targets |
|---|---|---|
| xs | 360px | Small Android |
| sm | 640px | Large phone |
| md | 768px | Tablet portrait |
| lg | 1024px | Tablet landscape / small laptop |
| xl | 1280px | Desktop |
| 2xl | 1536px | Large desktop |

## Motion tokens

| Token | Duration | Easing | Usage |
|---|---|---|---|
| micro | 80ms | standard | Taps, hovers |
| short | 160ms | standard | Chips, toggles |
| medium | 240ms | standard | Cards, panels |
| long | 420ms | decelerate | Modals, drawers |
| celebration | 1200ms | spring | Win moments, confetti |

All animations have `prefers-reduced-motion: reduce` fallbacks.

## Files to share with designer

```
50PICK/design_handoff_prediction_market_kit/   — locked visual reference
design_handoff_ui_kit/                          — live collaboration folder
  tokens/globals.css                            — all 1,678 lines of tokens
  tokens/TOKENS.md                              — human-readable cheat sheet
  kit/                                          — current component primitives
  features/                                     — market card + chart reference
  README.md                                     — kit structure
  REQUEST-next-round.md                         — active design brief
docs/FLOWS.md                                   — every redirect + gate + recovery
docs/screenshots/                               — 19 annotated screenshots
tailwind.config.ts                              — custom tokens config
src/components/ui/glyphs.tsx                    — icon set (copy SVG paths)
src/components/brand.tsx                        — brand primitives (copy)
```

## What the designer delivers back

For each component redesigned:
1. **Figma/Sketch file** with all states (rest, hover, active, disabled, loading, error)
2. **Token updates** — any new colors, spacing, or type changes as CSS variables
3. **Responsive variants** — 393px, 768px, 1024px, 1440px
4. **Dark + light** — both modes
5. **EN + SW labels** — bilingual with +30% string-length test
6. **Motion spec** — entrance, exit, interaction animations with timing

We implement using the existing token system. No hardcoded values.
