# 50pick UI v2 — Dark Glass Kit Rebuild

> **Last updated:** 2026-06-05
> **Status:** Phase 3 + 3b + 3c complete. 50 sprints on `main`, all pushed.
> **Pre-release validation:** Zero crash bugs. Zero undefined references. Build clean.

## What happened

### Phase 3 (Sprints 19-38) — Token + Surface Rebuild

Applied the new design kit (`ds-*.jsx` + `kit50.css` + `features.jsx`) to every
component in the app. This was a token-level pass: colors, gradients, shadows,
borders, radii, font sizes, and focus rings were updated to match the kit specs
exactly.

**Key changes:**
- TopNav, BottomNav, LiveTicker rebuilt to ds-brand-nav.jsx spec
- MarketCard: bg-elevated, r-md, 15px title, 28px mono YES%, kit hover glow
- Buttons: solid fills (was gradients), r-sm, kit inset highlights + glow
- Inputs: bg-inset, 44px height, rounded-lg (12px), brand-500 focus ring
- Chips: fully rebuilt (height-based, 700 weight, 0.06em tracking, uppercase)
- Modals: rounded-xl, oklch shadows (6 components)
- Toasts: 320px, bg-elevated2, 28px icon circle
- Wallet balance: 38px mono (was 40/48 display), clean gradient
- All pages: rounded-xl (was rounded-2xl), border (was border-strong)

### Phase 3b — Deep Component Rebuild

Went beyond tokens into actual component rewrites:

- **Kit icon set:** 75+ custom SVG glyphs ported from kit50.jsx into
  `src/components/ui/glyphs.tsx`. All player-facing components and pages
  converted from lucide-react to kit icons (1.85px stroke, consistent style).
- **Toggle/Switch:** rebuilt to kit spec (accent-500 on, bg-inset off, no border)
- **Checkbox:** new kit component (19x19, accent-500 fill, dark check icon)
- **Reality check modal:** rebuilt to kit WarnModal pattern (gold rail, icon box, 15.5px title)
- **LiveTicker:** horizontal marquee with YES green / NO red colored labels
- **Focus rings:** brand-500 globally (zero aqua-300 remaining in entire codebase)
- **Form polish:** hidden native number spinners, styled date/time inputs, textarea
- **BottomNav bug fix:** inline `display:grid` was overriding Tailwind `xl:hidden`
- **Notification badge:** repositioned close to bell icon (top:4 right:4)

### Phase 3c (Sprints 39-50) — Full Consistency + Bug Fix Pass

Comprehensive audit of every player-facing page + component against the kit
specs. Fixed every mismatch found, purged stale icon imports, fixed crashes.

**Crash fixes:**
- `info-hint.tsx` used bare `Info` (never imported) — crashed ConvictionDial on every market (**HOTFIX**)
- `operation-result-modal.tsx` used bare `Check`/`X`/`AlertTriangle`/`Info` — crashed bet result flow
- Both replaced with `I.*` from `glyphs.tsx`

**Lucide-react purge (14 player-facing pages):**
Zero lucide-react imports remain on: homepage, markets list, market detail,
wallet, positions, leaderboard, live, fairness, help, proposals, 404, error,
deposit, withdraw. Only profile sub-pages and admin still use lucide (for
icons without kit equivalents: Mail, Calendar, MonitorSmartphone, etc.).

**Color token cleanup:**
- All `text-aqua-200` / `text-aqua-100` → `text-accent-400` / `text-accent-300`
  (10 occurrences across auth + profile + legal pages)
- All focus rings now brand-500: ConvictionDial (was teal-300), AvatarMenu (was gold-500)
- Win celebration: aqua-300 gradient → gold-300, net P&L text-aqua-200 → text-gold-300

**Typography scale alignment:**
- All auth page titles: 26px → 28px (login, register, forgot-password, OTP)
- All profile page titles: 24/26px → 26/28px (KYC, sessions, account, source-of-funds, responsible-gambling)

**Component spec fixes:**
- MarketCard YES/NO buttons: height 38→44px, font 13.5→15px, tracking 0.04→0.06em
- MarketCard price: opacity 0.85→0.92, font 13→14px
- MarketCard watermark: 96px top-right → 140px bottom-right bleed + glow on hover
- Win celebration: heading 34→23px, payout 40→36px, circle 48→56px
- Confirm dialog: max-w 440→360px
- Toast icons: 16→18px in 28px container
- Position card stats: label 10→9px/text-faint, value 13→13.5px/font-bold
- Wallet SubStat: label 9→9.5px/text-faint, value 13→14px
- Wallet TxnRow icon: 32→34px
- Withdraw inputs: h-12→h-11 (44px standard)
- Operation result modal: rounded-t-2xl→rounded-t-xl on progress strip

**Layout fixes:**
- TopNav z-index: z-40→z-30 (kit spec)
- AppShell bottom padding: 56→64px (matches BottomNav height)
- Admin sidebar: highlight now updates on navigation (converted to usePathname() client component)
- Proposals page: Create button right-aligned in header, reward banner compacted

**Resolver queue:** YES/NO/Void buttons converted from raw styles to `.btn .btn-yes/.btn-no/.btn-ghost .btn-md`

### New CSS tokens added to globals.css
```
--panel, --bg-inset, --bg-elevated2, --live-400, --text-faint,
--brand-600, --brand-500, --brand-400, --brand-300, --brand-soft
```

## Pre-release validation (Sprint 50)

| Check | Result |
|-------|--------|
| `npm run build` | Clean — zero errors, zero warnings |
| Undefined JSX references | **Zero** across all src/ |
| `text-aqua-200` / `text-aqua-100` in player pages | **Zero** |
| `ring-teal` / `ring-aqua` focus rings | **Zero** |
| `rounded-2xl` (should be rounded-xl) | **Zero** |
| Bare `Info` / `Check` / `X` / `AlertTriangle` | **Zero** |
| All loading states use BrandSpinner | **Yes** (49 loading.tsx files) |
| All modals portal to body | **Yes** |
| All progress bars RAF-driven (no CSS race) | **Yes** |
| Chat widget wired + styled | **Yes** (ChatRoot in layout.tsx) |

## What's still remaining (next levels)

### Priority 1 — Polish

| Item | Kit reference | Notes |
|------|--------------|-------|
| TippingBar colors → kit ConvictionBar | kit50.jsx | Container bg too bright, fills use glow vs kit inset highlight, needle flat vs gradient. Functional but cosmetically divergent. |
| Homepage TrustItem icon box 40→54px | features.jsx "how it works" | Kit spec is 54×54 with r-md |
| Leaderboard podium section | ds-leaderboard.jsx | Kit has 3-col podium hero with 1st place radial gradient, 60px avatar. App uses table-only. |
| Wallet balance CashEye toggle | ds-wallet.jsx | Kit shows CashEye next to balance for privacy masking |
| Market grid stagger animation | kit50.css `.stagger-grid` | Kit has cardRise animation with nth-child delays |

### Priority 2 — Admin cleanup

| Item | Notes |
|------|-------|
| Dead lucide imports in ~44 admin files | Not crashes — just unused imports. ~85 instances. |
| Admin table row hover styling | ds-admin.jsx spec: `oklch(40% 0.07 264 / 0.35)` hover bg |
| Admin chart bloom | ds-admin.jsx: area chart gradient + bloom |

### Priority 3 — Future features

| Item | Notes |
|------|-------|
| Live Claude chatbot (replace stub) | `send-message.ts` has stub mode + live mode branch. Need `ANTHROPIC_API_KEY` + `npm install @anthropic-ai/sdk` |
| Hero slideshow activation | Component built, 20 stock images sourced. Waiting for professional media. |
| SMS provider (Selcom/Beem) | Enables real OTP delivery → password auth → OTP auth switch |
| Mobile-money aggregator | Deposit/withdraw flows wired against INTERNAL stub |

## Kit reference files

| File | What it defines |
|------|-----------------|
| `kit50.css` | ALL tokens (colors, shadows, radii, motion, type scale) |
| `kit50.jsx` | Icon set, Chip, ConvictionBar, Cash/CashEye, SideButton, Btn |
| `ds-brand-nav.jsx` | TopNav, BottomNav, LiveTicker, Tabs, Segmented, Logo |
| `ds-forms.jsx` | Input, OtpBoxes, Select, Switch, Checkbox, Radio, Stepper |
| `ds-atoms2.jsx` | Loaders, Avatar+TierBadge, ProgressBar, Tooltip, Skeleton |
| `ds-overlays.jsx` | Modals, NotificationPanel, Toast, AvatarStack, StateCard |
| `ds-wallet.jsx` | Wallet balance card, transaction rows, deposit/withdraw |
| `ds-admin.jsx` | Admin shell, sidebar, KPI cards, tables, charts |
| `features.jsx` | MarketCard, BuyTray, PositionCard, ButtonShowcase, WinLoss |
| `ds-flagship.jsx` | Market detail page (enhanced chart, order book) |
| `ds-leaderboard.jsx` | Leaderboard (podium, rows, sparklines, tier badges) |

## Rules

1. Read the kit file FIRST before touching any app code
2. Apply new DESIGN (colors, gradients, shadows, glow, borders) from kit
3. `npm run build` must exit 0 after every change
4. **Always commit AND push** — `git add`, `git commit`, `git push`
5. UI only — no logic, routes, server actions, or data changes
6. No `git init` — repo has full history
7. No screenshots unless explicitly asked
