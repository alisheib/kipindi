# 50pick — Design System Handoff (universal)

This package is **self-contained**. A developer can rebuild every screen of 50pick from
what's in here — no external Figma, no missing assets, no extra downloads.

> **Two synced handoffs:** this is the **player** package. The **admin console** ships in
> `admin-handoff/` and shares the exact same `kit50.css` tokens + shared atoms — keep them in sync.
> Chrome action color = **royal blue** (primary CTA), **aqua** for links/VIEW ALL, **red** live dot,
> green reserved for YES only — matched 1:1 to `globals.css` (option A).

## Start here
1. **`50pick Design System — handoff.html`** — open in any browser, fully offline. The complete,
   interactive specimen canvas (10 sections). Pan/zoom; click any artboard's ⤢ to focus.
2. **`DEVELOPER_REFERENCE.md`** — the contract: tokens, motion, haptics, component specs, file map.
3. **`source/`** — the editable React/JSX + CSS the canvas is built from. Re-implement these in your
   host stack (React+Tailwind / Next / Vue / native) using `kit50.css` tokens as the source of truth.

## What's inside (34 artboards)
Hero Constellation (landing) · Flagship Market Detail (order-book depth + trade tape + interactive
chart) · Foundations · Brand & Navigation (logo, news banner, top/bottom nav, AI assistant) ·
Atoms · Loaders · Charts · **The conviction dial** (production component) · Forms & controls ·
Text & legal clauses · Components · Card hover · Resolution moments & toasts · Notifications/popups/avatars ·
States (empty/loading/error/offline) · Responsible-play & warnings · Achievements & score ·
Leaderboard · Wallet · Positions · **Mobile (393px)** · **Auth** (login/register/OTP/forgot) ·
**Comments & trade actions** (sell + result).

## Colors — locked to production
Every ramp is snapped 1:1 to your `globals.css`: canvas `oklch(15% 0.130 268)`, YES hue 152,
**NO hue 22**, **gold hue 78–80**, radius `4/8/12/16/24`. Green chrome accent (hue 166) is the one
confirmed new role (VIEW ALL / live / links), kept distinct from YES.

## Non-negotiables
- YES = green / LEFT · NO = rose / RIGHT · gold = resolved + payout + needle + earned moments only.
- Mono numbers everywhere. Pool-share copy. No casino imagery. No emoji. 18+/RG first-class.
- **Glow is earned, not ambient** — glow only on hover/drag/win/resolution/unlock; surfaces & bars are solid.
- `--motion-level: full | reduced | minimal` (via `data-motion` on `<html>`) throttles ambient motion on mid-tier Android.
- Palette is **identical** to the live platform — see `kit50.css`.

## source/ file map
```
kit50.css          tokens + keyframes (SOURCE OF TRUTH)
ds-flagship.jsx    MarketDetailPro (assembled screen), FlagChart (interactive hover), OrderBook, TradeTape
ds-overlays.jsx    NotificationPanel, Toast, ConfirmDialog, AvatarRich, AvatarStack, StatesBoard (empty/loading/error/offline), WarningsBoard (responsible-play / limits / cooling-off)
real-dial-linear.jsx  ConvictionSlider — PRODUCTION conviction dial (linear). User's component, unchanged mechanic.
real-dial-round.jsx   ConvictionSliderRound — PRODUCTION conviction dial (squircle, final) + useRollingNumber.
real-dial-board.jsx   RealDialBoard — frames the real dial on the canvas (do not re-implement; ship these two files).
ds-badges.jsx      Badge, BadgeShelf, AchievementToast, CountdownPill — achievements (ported from your badges/*). Icon set in kit50.jsx now matches your glyphs.tsx heraldic family.
kit50.jsx          icons, chips, conviction bar, SideButton, Btn, RollNum, MovePill, LiveDot
ds-brand-nav.jsx   DialMark logo, lockups, app icon, TopNav, BottomNav, LiveTicker, Tabs, Segmented
ds-news-ai.jsx     NewsBanner (marquee), AiBubble, AiChat
ds-charts.jsx      ProbabilityChart, Sparkline, PoolDepth, ConvictionSlider, ConvictionDial
ds-betting.jsx     BetDial (main feature), BetDialRound
ds-atoms2.jsx      loaders, Input/OtpBoxes, Avatar/TierBadge, ProgressBar/Stepped, Tooltip, ProbabilityBar
ds-forms.jsx       Switch/Checkbox/Radio/Select/Stepper, FormsBoard, TextClauses, Scroller
ds-foundations.jsx foundation specimens + Patterns
ds-showcase.jsx    Loaders/Atoms/Charts/Nav specimen boards
ds-hero.jsx        ConfidenceDial (read-only), HeroConstellation (landing)
ds-leaderboard.jsx LeaderboardBoard (podium + ranked rows)
ds-wallet.jsx      WalletBoard (balance + mobile-money rails + transactions)
ds-positions.jsx   PositionsBoard (portfolio summary + position cards)
ds-mobile.jsx      Phone frame + mobile market detail / betslip sheet / 1-col grid
ds-auth.jsx        Login / Register / OTP / Forgot (393px, +255 phone field)
ds-trade.jsx       CommentsThread, SellConfirm, OperationResult
features.jsx       MarketCard, BuyTray, PositionsLeaderboard, ResolutionPanel, WinLoss, HoverCompare
design-canvas.jsx  presentation infra only (do NOT ship)
Design System.html entry point that assembles the canvas
```
The JSX uses Babel-in-browser for preview only — precompile / port for production.
Fonts: Sora, Inter, JetBrains Mono (Google Fonts; self-host with `font-display: swap`).
