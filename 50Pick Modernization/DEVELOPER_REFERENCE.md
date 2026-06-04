# 50pick — Design System · Developer Reference

> One-time reference for replacing the old kit. Dark is default. Palette, components,
> conviction dial, copy and YES/NO semantics are **preserved identically**; the refresh
> lives only in surface detail, button consistency, motion and micro-interactions.

Open **`Design System.html`** to see every specimen on one canvas. Source lives in the
files listed under *File map*. Tokens are the source of truth — recreate them 1:1.

---

## Hard invariants (never violate)
1. **YES = green, LEFT. NO = rose-red, RIGHT.** Every binary control, bar, button pair.
2. **Gold is sacred** — resolved-winner moments + the confirm-payout button only. Never a generic accent.
3. **Brand blue = chrome** (canvas, primary CTA, links, focus, active, "Soon" chip, card-hover frame).
4. **Green chrome accent** = live label, "VIEW ALL", section links.
5. **Mono numbers** — JetBrains Mono, tabular, for every amount / %, / time / stat.
6. **Pool-share copy** — "stake", "share of the pool", "if you're right". Never "guaranteed / risk-free / easy money".
7. **No casino imagery** — no confetti, chips, dice, slot reels.
8. **+30% string tolerance** (Swahili/French run longer). 44px min hit target. WCAG AA.

---

## Tokens (`kit50.css`) — source of truth

### Color (OKLCH)
| Token | Value | Role |
|---|---|---|
| `--bg` | `oklch(16.5% 0.092 264)` | vivid royal-navy canvas |
| `--bg-elevated` | `oklch(20% 0.090 264)` | cards |
| `--bg-elevated2` | `oklch(23.5% 0.092 264)` | raised |
| `--bg-inset` | `oklch(13% 0.080 264)` | tracks, inputs |
| `--panel` | `oklch(18.5% 0.090 264)` | nav, bands |
| `--border` | `oklch(39% 0.095 264)` | hairline (blue) |
| `--border-strong` | `oklch(50% 0.105 264)` | emphasis |
| `--brand-{600..300}` | hue 262 | blue chrome / focus / soon / hover frame |
| `--accent-{600..400}` | hue 195 | aqua chrome (VIEW ALL, links, live label) |
| `--yes-{700..300}` | hue 150 | YES, gains |
| `--no-{700..300}` | hue 25 | NO, losses |
| `--gold-{600..300}` | hue 84 | resolved + payout + needle only |
| `--live-400` | `oklch(64% 0.20 25)` | live label + pulse dot (red) |
| `--text / -muted / -subtle / -faint` | hue 264 | text ramp |

### Type
Sora 600/700 (display) · Inter 400–700 (body, Latin+Swahili+French) · JetBrains Mono 400–600 (numbers, `tabular-nums`).
Scale (px): display-1 44 · h1 34 · h2 26 · h3 20 · h4 17 · body 15 · small 13 · micro 11.

### Spacing  `--sp-*`: 4 8 12 16 20 24 32 40 48 64
### Radius  `--r-xs 4 · sm 6 · md 10 · lg 14 · xl 20 · pill 999` (buttons use 8)

### Motion
| Easing | Curve | Duration | Use |
|---|---|---|---|
| `--ease-micro` | cubic-bezier(.2,.8,.2,1) | 100ms | hover, press, focus |
| `--ease-stage` | cubic-bezier(.4,0,.2,1) | 240ms | sheets, modals, bar reveal |
| `--ease-celebrate` | cubic-bezier(.2,.8,.2,1) | 600ms | resolve, payout reveal |

Loops: `live-pulse` 1.5s · `goldShimmer` 1.6s (resolved bar) · `shimmer` 1.4s (skeleton) ·
`spin` .7s (spinner) · `dotBounce` 1.1s · `barSlide` 1.2s. All collapse to instant under
`prefers-reduced-motion: reduce`.

---

## Haptics (mobile)
| Pattern | Vibration | Trigger |
|---|---|---|
| Light | `10` | side select · quick-chip · toggle · tab |
| Medium | `20` | confirm pressed · sheet open |
| Success | `[10,40,10]` | prediction placed · payout received |
| Warning | `[30,30]` | reality-check · objection window < 1h |

`navigator.vibrate(pattern)` — guard with a feature check; never block UI on it.

---

## Components & states

### Button (one flat-solid family) — `kit50.jsx → Btn`, `SideButton`
- Radius 8. Sizes: sm 30 · md 38/44 · lg 46/50 · xl 56. **≥44px on mobile.**
- Filled (`yes` green / `no` rose / `gold`): solid fill, inset 1px top highlight.
  - hover → `brightness(1.07)` + `translateY(-1px)` + soft same-hue glow
  - press → `translateY(1px)` + `brightness(0.93)` + inset shadow
- Chrome (`primary` green tint / `ghost` / `outline`): same radius + motion.
- States: rest · hover · press · `disabled` (opacity .45) · `loading` (spinner replaces leading icon).
- **SideButton** = bold side label + inline mono price (no chip). Faithful to live platform.

### Conviction dial (the "dial") — `ds-charts.jsx`
- `ConvictionSlider` — draggable; gold round handle on a green fill, dark track. Mouse + touch. Clamped 1–99.
- `ConvictionDial` — 270° radial gauge; green arc + gold needle + mono value (shows `64%` and price `0.64`).

### Probability / conviction bar — `kit50.jsx → ConvictionBar` (single source of truth)
**One component, two names.** `ProbabilityBar` is now an alias of `ConvictionBar` — both resolve to the same function, so existing call-sites keep working. Always reads YES + NO: emerald YES fill from the left, rose NO fill on the right, **gold needle at the boundary**.
- Props: `yes` (0–100) · `h` (exact px height) **or** `size` `micro`(12)/`large`(24) · `variant` `split`(default)/`segmented`/`minimal`/`resolved` · `resolved` (bool → gold shimmer) · `needle` (bool, default true) · `reveal`/`animate` (entrance).
- `large` shows inline `YES 64` / `36 NO` labels. `minimal` is the only needle-less, single-fill variant (dense lists).
- Built-in `role="progressbar"`, `aria-valuenow`, `aria-label="YES x% · NO y%"`.

### Balance privacy — `kit50.jsx → Cash` / `CashEye` (global toggle)
One eye masks **every** personal balance at once (banking-app pattern). State lives on `window.__cashHidden` + a `cash-privacy` event so independent React roots on the canvas stay in sync.
- `<Cash style={…}>TZS 84,200</Cash>` — renders the amount, or masks the numeric part to `TZS •••••` when hidden (sign + currency prefix preserved so layout rhythm holds).
- `<CashEye />` — boxed 28px toggle; `<CashEye bare size={14} />` — borderless inline variant for tight spots (e.g. the nav balance pill).
- `useCashHidden()` hook + `setCashHidden(bool)` for programmatic control.
- Applied to: TopNav balance pill, Wallet (balance / in-play / lifetime / transactions), Position cards (stake / value / P&L). Market pool sizes, buy-tray stake and payout lines are intentionally **not** masked — they're flow figures, not the user's balance.

### Loaders — `ds-atoms2.jsx`
`Spinner` · `DotsLoader` · `BarLoader` · `RingProgress` · `Skeleton` / `SkeletonCard`.

### Others
`Switch` · `Checkbox` · `Radio` · `Select` · `Stepper` · `textarea` (`ds-forms.jsx`) · `Chip` (live/hot/soon/resolved/yes/no/cat) · `Input` / `OtpBoxes` · `Avatar` + `TierBadge` (bronze/silver/gold/diamond) · `ProgressBar` (tones) / `SteppedProgress` · `Tooltip` · `Toast` (success/gold/info) · `MarketCard` · `BuyTray` · `PositionCard` · `LeaderboardRow` · `ResolutionPanel` · `WinCelebration` / Loss · nav (`TopNav` 56 / `BottomNav` 64 / `LiveTicker` 32 / `Tabs` / `Segmented`).

### Betting dial (MAIN FEATURE) — `ds-betting.jsx`
Kept, refined. Drag the conviction needle to set your side + price; **stake stays, payout updates live**.
Adjustments vs. old: gold round handle, value bubble on drag, snap haptic (`navigator.vibrate(4)`),
grab cursor, 24px touch target, scale-up + ring on active. YES left/green, NO right/rose, gold needle.
- `BetDial` — full in-context panel (title → dial → YES/NO % → stake → live payout → YES/NO).
- `BetDialRound` — draggable radial gauge for tight layouts.
- `ConvictionBar` — read-only fill + needle (in cards).

### Text & legal clauses — `ds-forms.jsx → TextClauses`
Standing RG/resolution clauses (pool-share, outcome risk, two-officer, objection window, 18+) in EN + Swahili. Never promissory.

### Scroller — `.ds-scroll` (kit50.css)
8px thumb, `--border-strong` → `--brand-500` on hover; track `--bg-inset`. Momentum on touch.

### Card hover (locked: blue)
`translateY(-3px)` + `--brand-500` border + soft blue glow, 200ms `--ease-stage`. Gold reserved for win/payout.

---

## File map
```
kit50.css          tokens + keyframes (source of truth)
kit50.jsx          Icon set (+ play, eye/eyeOff, chevrons, warning…), Chip, ConvictionBar (= ProbabilityBar), Cash/CashEye, SideButton/SidePair, Btn, RollNum, MovePill, LiveDot, TIERC/TIER_GLYPH
ds-brand-nav.jsx   Logo, Wordmark, TopNav, BottomNav, LiveTicker, Tabs, Segmented
ds-charts.jsx      ProbabilityChart, Sparkline, PoolDepth, ConvictionSlider, ConvictionDial
ds-atoms2.jsx      loaders, Input/OtpBoxes, Avatar(+tier glyph)/TierBadge, ProgressBar/Stepped, Tooltip, ProbabilityBar (alias → kit50 ConvictionBar), Skeleton
ds-foundations.jsx foundation specimens + Patterns (betslip, KYC, reality check, empty)
ds-showcase.jsx    Loaders/Atoms/Charts/Nav specimen boards
ds-forms.jsx       Switch/Checkbox/Radio/Select/Stepper, FormsBoard, TextClauses, Scroller
ds-betting.jsx     BetDial (main feature), BetDialRound, BettingDialBoard
features.jsx       MarketCard, PickASide, ButtonShowcase, BuyTray, PositionsLeaderboard, ResolutionPanel, WinLoss, HoverCompare
Design System.html assembles all sections on the canvas
```

These JSX files are **design references** (Babel-in-browser). Re-implement in the host stack
(React+Tailwind / Next, etc.) using the tokens above as the contract — don't ship Babel-in-browser.
