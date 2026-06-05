# 50pick UI v2 — Dark Glass Kit Rebuild

> **Last updated:** 2026-06-05
> **Status:** Phase 3 + 3b complete. 34 commits on `main`, unpushed.
> **Next step:** `git push`, then continue with remaining items below.

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

### New CSS tokens added to globals.css
```
--panel, --bg-inset, --bg-elevated2, --live-400, --text-faint,
--brand-600, --brand-500, --brand-400, --brand-300, --brand-soft
```

## What's remaining

| Item | Kit reference | Priority |
|------|--------------|----------|
| Admin pages: lucide -> kit glyphs (~40 files) | kit50.jsx icons | Medium |
| Admin table row hover + chart bloom | ds-admin.jsx | Medium |
| Market detail buy tray styling | ds-flagship.jsx | Medium |
| Positions page stat grid | ds-positions.jsx | Low |
| Responsive audit (393/768/1024/1280/1440) | — | Medium |
| Empty states / loaders consistency | ds-overlays.jsx StateCard | Low |

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
