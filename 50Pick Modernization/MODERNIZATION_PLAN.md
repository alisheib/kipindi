# 50pick UI v2 — Dark Glass Kit Rebuild Plan (Phase 3)

> **Updated:** 2026-06-05. This is the ONLY active plan document.
> **Goal:** Pass designer evaluation. Every component rebuilt from kit specs.

## Git workflow
- Repo already initialized, remote `origin` → `https://github.com/alisheib/kipindi.git`
- Branch: `main`. Just `git push` after each sprint.
- **DO NOT run `git init`** — repo already has history.
- **DO NOT force push** — normal `git push` only.

## What's done (Sprints 1–18, all pushed)

Foundation layer complete: glass-panel utility, gradient YES/NO/Gold buttons,
frosted modals/dropdowns/toasts, route transitions, stagger animations,
data-motion throttle, dead CSS cleanup, admin shell precision, atom precision
(input/toggle/empty-state/chip/tabs), flat panel sweep, ticker font sizes,
market filter rail blue active states, deeper card gradients, thicker pbar fills.

**What's NOT done — the reason this plan exists:**

The app still looks like the OLD 50pick with CSS tweaks on top. The new kit
(`ds-*.jsx` + `kit50.css` + `features.jsx`) defines a COMPLETELY different
visual language. We need to go component by component, read the kit spec,
and REWRITE the app component to match exactly. Not tweak — rewrite.

---

## Kit reference files (read before each sprint)

| File | What it defines |
|------|-----------------|
| `kit50.css` | ALL tokens (colors, shadows, radii, motion, type scale) — source of truth |
| `kit50.jsx` | Icon set, Chip, ConvictionBar, Cash/CashEye, SideButton, Btn, RollNum |
| `ds-brand-nav.jsx` | TopNav, BottomNav, LiveTicker, Tabs, Segmented, Logo |
| `ds-forms.jsx` | Input, OtpBoxes, Select, Switch, Checkbox, Radio, Stepper, Scroller |
| `ds-atoms2.jsx` | Loaders, Avatar+TierBadge, ProgressBar, Tooltip, Skeleton |
| `ds-betting.jsx` | BetDial, BetDialRound, ConvictionSlider — the signature dial |
| `ds-charts.jsx` | ProbabilityChart, Sparkline, PoolDepth, ConvictionDial gauge |
| `ds-overlays.jsx` | Modals, NotificationPanel, Toast, AvatarStack, StateCard |
| `ds-wallet.jsx` | Wallet balance card, transaction rows, deposit/withdraw |
| `ds-admin.jsx` | Admin shell, sidebar, KPI cards, tables, charts |
| `features.jsx` | MarketCard, BuyTray, PositionCard, ButtonShowcase, WinLoss |
| `ds-flagship.jsx` | Market detail page (enhanced chart, order book) |
| `ds-leaderboard.jsx` | Leaderboard (podium, rows, sparklines, tier badges) |
| `ds-positions.jsx` | Positions page (portfolio rows, P&L, status) |
| `ds-hero.jsx` | Landing hero (constellation, particles, rolling counter) |
| `ds-illustrations.jsx` | Empty states, how-it-works line art |

---

## Phase 3 Sprints — Component-by-Component Kit Rebuild

### Sprint 19 — TopNav (REBUILD from ds-brand-nav.jsx)
Read `ds-brand-nav.jsx TopNav`. Rewrite `src/components/layout/top-app-bar.tsx`:
- Exact height, padding, gap, background color-mix, backdrop blur+saturate
- Logo size and spacing
- Nav links: exact font-size, weight, active pill background, padding, radius
- **Language toggle: if kit shows INLINE (not dropdown), convert to inline**
- Wallet balance pill: exact border, bg, font, gold icon
- Notification bell: exact size, badge position
- Avatar trigger: exact size, ring
- Mobile breakpoint: what hides/shows

### Sprint 20 — BottomNav (REBUILD from ds-brand-nav.jsx)
Read `ds-brand-nav.jsx BottomNav`. Rewrite `src/components/layout/bottom-nav.tsx`:
- Exact height (64px), grid layout, background, border
- Active/inactive colors (accent-400 vs text-subtle)
- Icon size (21px), label size (10px), gap (4px)
- Active font-weight (600) vs inactive (500)
- Safe-area padding

### Sprint 21 — LiveTicker (REBUILD from ds-brand-nav.jsx)
Read `ds-brand-nav.jsx LiveTicker`. Rewrite `src/components/layout/live-ticker.tsx`:
- Exact height (32px), background, border, overflow
- Label styling: font, size, color, letter-spacing
- Ticker animation: exact keyframe (tickerUp 2.8s)
- Item font sizes, colors, gaps

### Sprint 22 — MarketCard (REBUILD from features.jsx)
Read `features.jsx MarketCard`. Rewrite `src/components/markets/market-card.tsx` + CSS:
- Card: exact padding, border, radius, background gradient, resting shadow
- Hover: exact blue glow shadow string, transform, border-color, transition timing
- Title: exact font-size (15px), weight (600), line-height (1.34)
- YES %: exact font-size (28px), weight (700), color
- Category watermark: exact size, position, opacity, hover behavior
- YES/NO buttons: exact height, font, gradient, inset shadow
- Trader avatars: overlap styling
- Probability bar height in card
- Footer meta: font, spacing

### Sprint 23 — Buttons (REBUILD from kit50.jsx Btn + features.jsx ButtonShowcase)
Read `kit50.jsx Btn` + `features.jsx ButtonShowcase`. Rewrite globals.css `.btn*`:
- Every variant: primary, yes, no, gold, ghost, outline, aqua-ghost, claret
- Exact radius (8px), sizes (sm 30, md 38/44, lg 46/50, xl 56)
- Exact gradient fills, inset highlights, text shadows
- Hover: exact brightness, lift, same-hue glow shadow strings
- Press: exact scale, brightness, inset shadow
- Disabled: exact opacity (.45)
- Loading: spinner replaces leading icon
- Border thickness for each variant

### Sprint 24 — Inputs & Forms (REBUILD from ds-forms.jsx)
Read `ds-forms.jsx`. Rewrite `src/components/ui/input.tsx` + form elements:
- Input: exact height (44px md), radius (12px), background (bg-inset), border
- Focus: exact brand-500 border + oklch shadow
- Prefix slot: exact styling
- Select: chevron, focus ring, panel styling
- Switch/Checkbox/Radio: exact sizes, colors, animations
- Stepper: exact styling
- Textarea: exact styling
- OTP boxes: exact styling

### Sprint 25 — Avatars & Identity (REBUILD from ds-atoms2.jsx)
Read `ds-atoms2.jsx Avatar`. Verify `src/components/ui/identity-avatar.tsx`:
- Gradient generation: exact oklch values
- Blob shapes: exact opacity (0.45, 0.30)
- Text: exact font, shadow
- Tier ring: exact border width, inner shadow
- Tier glyph badge: exact positioning, border
- All 6 sizes: exact px

### Sprint 26 — Modals & Overlays (REBUILD from ds-overlays.jsx)
Read `ds-overlays.jsx`. Verify all modal components:
- Scrim: exact blur, opacity, color
- Card: exact border, radius, shadow, glass edge
- Entrance animation: exact keyframe, timing
- OperationResultModal: crest, eyebrow, headline, detail rows, CTAs
- BetConfirmModal, SellConfirmModal: exact styling
- ConfirmDialog: exact styling
- WinCelebration: gilt ray, rolling counter, NO confetti
- RealityCheck: exact styling

### Sprint 27 — Toasts & Notifications (REBUILD from ds-overlays.jsx)
Read `ds-overlays.jsx Toast + NotificationPanel`. Verify:
- Toast: exact width (320px), background (bg-elevated2), border-strong
- Left rail: 3px colored per variant
- Icon circle: 28px, bg-inset, correct color per kind
- Progress strip: exact styling
- NotificationPanel: exact width (340px), row styling, deep-links
- Empty state in panel

### Sprint 28 — Chips & Pills (REBUILD from kit50.jsx Chip)
Read `kit50.jsx Chip`. Verify `src/components/ui/chip.tsx`:
- Every variant: exact background tint %, color token, border tint %
- Live dot: exact size (6px), pulse animation
- Sizes: exact heights, padding, font-size
- Letter-spacing: exact value (0.06em)

### Sprint 29 — Progress Bars & Dial (REBUILD from kit50.jsx + ds-charts.jsx)
Read `kit50.jsx ConvictionBar` + `ds-charts.jsx`. Verify:
- Probability bar: exact gradient fills, gold needle, height variants
- Resolved shimmer: exact animation
- ConvictionDial: exact arc, needle, mono value display
- Generic progress: exact gradient + glow + traveling light-sweep

### Sprint 30 — Wallet Page (REBUILD from ds-wallet.jsx)
Read `ds-wallet.jsx`. Rewrite `src/app/wallet/wallet-client.tsx`:
- Balance card: exact gradient, border (gold-tinted), inset shadow, outer shadow
- Label: exact gold-300 color, mono 10.5px
- Balance: exact font-size (38px), weight, tracking
- Sub-stats: exact styling
- Buttons: exact deposit (gold lg) + withdraw (ghost lg)
- Transaction rows: exact grid layout, columns, colors
- Status badges per transaction type

### Sprint 31 — Leaderboard (REBUILD from ds-leaderboard.jsx)
Read `ds-leaderboard.jsx`. Verify `src/app/leaderboard/`:
- Podium: exact styling
- Row: exact grid, columns, font sizes
- Tier badges: exact colors
- Sparklines: exact styling
- Glass panel wrapping

### Sprint 32 — Market Detail (REBUILD from ds-flagship.jsx)
Read `ds-flagship.jsx`. Verify `src/app/markets/[id]/page.tsx`:
- Chart area: exact styling
- Buy tray: exact dial + stake + payout layout
- Criterion panel, stats, countdown
- Comments section

### Sprint 33 — Admin Pages (REBUILD from ds-admin.jsx)
Read `ds-admin.jsx`. Verify all `src/app/admin/**`:
- KPI cards: exact styling
- Tables: exact row hover, header, border
- Charts: bloom filter, area fill
- Sidebar navigation: exact link styling

### Sprint 34 — Auth Pages (REBUILD from ds-foundations.jsx patterns)
Read `ds-foundations.jsx` auth patterns. Verify:
- Login/Register: exact card, input, button layout
- OTP: exact box styling
- Forgot password: exact styling

### Sprint 35 — Landing & Hero (chrome only, keep F1 bg)
Verify `src/app/page.tsx`:
- Trust strip: exact glass styling
- Icon tiles: exact glass styling
- "Pick a side now" section: exact heading, grid
- Footer: exact styling

### Sprint 36 — Page Width Consistency + Responsive
- Audit ALL pages for max-width consistency
- 393 / 768 / 1024 / 1280 / 1440 viewport check
- Fix any width mismatches between pages
- Bottom nav safe-area on all mobile views

### Sprint 37 — Animations & Motion
- Route-enter: verify timing matches kit
- Card stagger: verify capped at 8
- data-motion throttle: verify 3 tiers work
- prefers-reduced-motion: verify all animations collapse
- Skeleton shimmer: exact gradient + timing
- Toast entrance: exact animation

### Sprint 38 — Final QA + Build + Designer Handoff
- `npm run build` must exit 0
- Run responsive overflow test script
- Verify all hard invariants (YES=green/left, NO=rose/right, gold=earned, no casino, etc.)
- Update this plan with final status

---

## Phase 3b — Deep Component Rebuild (post-Sprint 38)

Sprints 19-38 applied tokens + surface styling. Phase 3b goes deeper:
actual component rewrites where old patterns persisted.

### Done (Phase 3b)
- [x] `--live-400` token added to globals.css
- [x] Chip.tsx fully rebuilt — height-based, 700 weight, kit oklch tints
- [x] Toggle.tsx rebuilt — accent-500 on, bg-inset off, no border
- [x] Checkbox.tsx created — 19x19, accent-500 fill, dark check icon
- [x] Register page checkboxes swapped to kit Checkbox
- [x] OTP page input — bg-inset, brand-500 focus, r-md
- [x] glass-panel — bg-elevated, border (not border-strong), r-lg
- [x] BottomNav — fixed xl:hidden override (inline display:grid bug)

### Done (Phase 3b continued)
- [x] Platform-wide rounded-xl sweep (0 remaining rounded-2xl)
- [x] Platform-wide brand-500 focus ring sweep (0 remaining aqua refs)
- [x] Page-level cards: border (was border-strong) on all profile/wallet pages
- [x] Position card: brand-500 hover + blue glow (was teal-400)
- [x] Reality check modal: kit WarnModal rebuild (15.5px title, gold rail, icon box)
- [x] KYC page: bg-inset inputs + brand-500 focus + rounded-xl header
- [x] Wallet deposit/withdraw: bg-inset payment rail cards
- [x] Admin pages: brand-500 focus on all inputs/selects/textareas + rounded-xl

### Remaining (Phase 3b)
- [ ] Market detail buy tray fine-tuning (ds-flagship.jsx)
- [ ] Admin KPI card + table row hover styling (ds-admin.jsx)
- [ ] Positions page stat grid styling (ds-positions.jsx)

---

## Rules for every sprint

1. **Read the kit file FIRST** before touching any app code
2. **Keep same sizes** unless kit explicitly specifies different — don't change what works
3. **Apply new DESIGN** (colors, gradients, shadows, glow, borders) from kit
4. `npm run build` must exit 0 after every sprint
5. `git add` specific files, `git commit`, `git push` after each sprint
6. **NO `git init`** — repo already has full history
7. **UI only** — no logic, routes, server actions, or data changes
8. **No screenshots** unless explicitly asked
