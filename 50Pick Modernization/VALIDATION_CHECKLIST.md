# 50pick UI v2 — Designer Validation Checklist

> **Purpose:** every single detail specified in the new kit, mapped to where it lives
> in the live codebase, so a designer can validate the implementation against the kit
> item-by-item. Status keys:
> **✅ present** (already in the app, kit-faithful) · **🔄 applied** (added/upgraded during v2) ·
> **⬜ pending** (scheduled in a later sprint) · **➖ n/a** (intentionally not applicable).
>
> Spec sources: `DEVELOPER_REFERENCE.md`, `THEME_AND_COMPONENTS.md`, `kit50.css`,
> `uploads/UI_MODERNIZATION_BRIEF.md`. Code root: `../src/`.

## How to validate
Run the app (`npm run dev`), open each surface, and compare against the kit's
`Design System.html` / `Dark Glass.html`. Tick the box if the implementation matches.

---

## A. Foundations (tokens) — source of truth `src/app/globals.css`

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| A1 | Royal-indigo canvas (hue 268) surfaces: bg / elevated / elevated2 / inset | ✅ | globals.css `:root` `--bg*`, `--teal-*` |
| A2 | YES emerald (152) / NO rose (22) / gold (80) / aqua (195) / brand-blue (262) | ✅ | globals.css ramps |
| A3 | Type scale (display→micro) Sora / Inter / JetBrains Mono | ✅ | globals.css `--type-*`, `--font-*` |
| A4 | Spacing grid (4px base) + radius scale (xs..pill) | ✅ | globals.css `--sp-*`, `--r-*` |
| A5 | Motion easings: micro / stage / celebrate (+ arrive/glide/sink) | ✅ | globals.css `--ease-*`, `--dur-*` |
| A6 | Shadows + same-hue glows (gold/blue/win/jackpot) | ✅ | globals.css `--shadow-*`, `--glow-*` |
| A7 | `prefers-reduced-motion` collapses all loops | ✅ | globals.css media query |
| A8 | `data-motion` throttle (full/reduced/minimal) for mid-tier Android | ⬜ | Sprint 9 |

## B. Buttons — `src/components/ui/button.tsx` + `.btn*` in globals.css

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| B1 | One flat-solid family, radius 8, sizes sm/md/lg/xl (≥44px mobile) | ✅ | `.btn-sm..xl` |
| B2 | Filled variants yes/no/gold + 1px top inset highlight | ✅ | `.btn-yes/no/gold` |
| B3 | Hover → brightness + **lift (−1px)** + **same-hue glow** | 🔄 | Sprint 1 (drop-shadow glow) |
| B4 | Press → **tactile scale-down** | 🔄 | Sprint 1 `scale(.97)` |
| B5 | Chrome variants (primary/ghost/outline/aqua) share motion | ✅ | `.btn-primary/ghost/aqua-ghost` |
| B6 | States: disabled (.45), loading (spinner replaces leading icon) | ✅ | button.tsx |
| B7 | Focus-visible ring | ✅ | `.btn:focus-visible` |

## C. Cards & surfaces

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| C1 | Card = elevated panel + hairline + inset top-highlight + soft shadow | 🔄 | Sprint 6.5 — `.mcard` resting now top-lit gradient + inner light-edge + `--shadow-2` |
| C2 | Hover (locked blue): **lift + brand-blue frame + soft blue glow** | 🔄 | Sprint 1/2/4 (`.mcard`, `card.tsx`, `position-card`) |
| C3 | Market card: **glass-royal panel** (at rest), title-left / %-right, micro bar | 🔄 | Sprint 6.5 — `.mcard` resting glass depth (cascades app-wide) |
| C5 | Landing trust strip + icon tiles = frosted glass at rest | 🔄 | Sprint 6.5 — `app/page.tsx` |
| C6 | Reusable `.glass-panel` for player section panels (at rest) | 🔄 | Sprint 7 — globals.css `.glass-panel`; applied to leaderboard + wallet; more pages tracked |
| C4 | Position card hover lift | 🔄 | Sprint 4 |

## D. Modals, sheets, overlays

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| D1 | Portaled, scrim + raised card, spring entrance | ✅ | `operation-result-modal.tsx` |
| D2 | **Frosted scrim (blur)** behind every modal | 🔄 | Sprint 3 (blur-md / 12px) |
| D3 | Glass top-edge + strong border on modal cards | 🔄 | Sprint 3 |
| D4 | Win modal: animated entrance + gilt ray + rolling counter (NO confetti) | 🔄 | Sprint 6 — `win-celebration.tsx`: **removed 60-piece confetti (was an invariant breach)**; kept gilt ray; payout now `RollingAmount` count-up; scrim blur-md |
| D5 | Loss modal: calm glass dim, gentle fade, no harsh red | ✅ | `operation-result-modal` danger tone |
| D6 | Confirm modals (bet/sell) + auto-close gold strip | ✅ | bet/sell-confirm modals |
| D7 | Reality-check modal: calm, bilingual, KPI grid | ✅ | `rg/reality-check.tsx` (scrim deepened S3) |
| D8 | Bottom sheet (mobile) drag-handle + dim/blur behind | ✅ | `first-visit-primer.tsx` |

## E. Toasts & notifications

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| E1 | 4 kinds (success/warning/danger/info) + colored icon disc | ✅ | `ui/toast.tsx`, `.toast-*` |
| E2 | **Blur backdrop / glass panel + float-in** | 🔄 | Sprint 1 (`.toast` frosted) |
| E3 | Auto-dismiss 4–5s, pause on hover | ✅ | toast.tsx |
| E4 | Progress ring / strip on auto-dismiss | ⬜ | verify in Sprint 5/6 |
| E5 | Notifications panel (bell dropdown), EN+SW rows, deep-link | ✅ | `layout/notifications-panel.tsx` |

## F. Chips, tags, pills

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| F1 | Pill chips: live/hot/soon/resolved/yes/no/cat variants | ✅ | `ui/chip.tsx`, `.chip-*` |
| F2 | Live dot pulse | ✅ | `.live-dot` |
| F3 | Soft glow + micro-bounce entrance + pulse on state change | ⬜ | Sprint 2 deferred (optional) |

## G. Progress, bars, dial (signature)

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| G1 | Probability bar: YES-left/NO-right split, gradient fills | ✅ | `brand.tsx TippingBar` |
| G2 | **Glowing gold boundary needle** (ties to dial) | ✅ | TippingBar needle (glow 12px) |
| G3 | Bar fill glass sheen | 🔄 | Sprint 1 (`.pbar-yes/no`) |
| G4 | Resolved bar gold shimmer | ✅ | `.pbar-resolved`, TippingBar shimmer |
| G5 | Conviction dial: drag side+stake, gold knob, scale+ring on active, tilt | ✅ | `markets/conviction-dial.tsx` |
| G6 | Generic progress: gradient + glow + **traveling light-sweep** + leading node | ⬜ | Sprint 4 follow-up (`stepped/circular-progress`) |
| G7 | Charts: glowing line, soft bloom, gradient area fill | ✅/⬜ | `price-chart`/`probability-chart` — verify Sprint 4 follow-up |

## H. Numbers & motion

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| H1 | Mono tabular numbers for every amount/%/time/stat | ✅ | `.mono`, `font-mono` everywhere |
| H2 | Rolling counter on change | ✅ | WalletBalancePill tween + win-celebration `RollingAmount`; `.num-roll`/`.value-roll` available for more surfaces |
| H3 | Route-enter transition + staggered card reveals | ✅/⬜ | `.route-enter`/`.reveal-up`/`.stagger-item` exist; verify wiring (Sprint 6) |
| H4 | Skeleton shimmer → content | ✅ | `.skeleton`, `ui/skeleton.tsx` |

## I. Navigation & chrome

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| I1 | Top nav 56px + sticky w/ blur | ✅ | `top-app-bar.tsx` sticky + `backdrop-blur-xl`; Sprint 7 added border-strong + glass top-light + depth shadow |
| I2 | Bottom nav 64px, 5-up, active tint | ✅ | `layout/bottom-nav.tsx` |
| I3 | Live ticker (red pulse) | ✅ | `layout/live-ticker.tsx` |
| I4 | **Balance-privacy eye** (Cash/CashEye) on nav pill, wallet, positions | ✅ | Sprint 5 — `ui/cash.tsx`; wired nav pill + top-bar eye + position-card + wallet (balance/pending/hold/txns). Global toggle (window flag + event + localStorage) |

## J. Haptics & accessibility

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| J1 | Haptics light/medium/success/warning | ✅ | `src/lib/haptics.ts` |
| J2 | Focus-visible 2px ring on all interactive | ✅ | globals.css + components |
| J3 | WCAG AA contrast, 44px hit targets, +30% string tolerance | ✅ | enforced in components |

## K. Admin console

| # | Kit detail | Status | Where / note |
|---|---|---|---|
| K1 | Admin shell, sidebar, confidential band, officer chip | ✅ | `components/admin/admin-shell.tsx` |
| K2 | Glass KPI cards + refined tables + charts bloom | ⬜ | Sprint 7 |

## L. Hard invariants (must never break — verify on every screen)

| # | Invariant | Status |
|---|---|---|
| L1 | YES=green/LEFT, NO=rose/RIGHT everywhere | ✅ |
| L2 | Gold = earned only (resolved / payout button / dial needle) | ✅ |
| L3 | Blue = chrome/focus/links/card-hover | ✅ |
| L4 | No casino imagery (no confetti/chips/dice) | ✅ | Sprint 6 removed the win-celebration confetti — now compliant |
| L5 | Pool-share copy, never "guaranteed/risk-free" | ✅ |
| L6 | Single dark theme (no light mode) | ➖ by design |
| L7 | F1 wallpaper hero preserved (not HeroConstellation) | ✅ |

---

## Open items still to apply (rolled up from above)
- A8 `data-motion` throttle (Sprint 9)
- D4 Win celebration gilt-ray + rolling counter (Sprint 6)
- E4 toast progress ring (verify)
- F3 chip micro-bounce/glow (optional)
- G6 generic progress light-sweep; G7 chart bloom (Sprint 4 follow-up)
- H2/H3 confirm rolling-number + route/stagger wiring per surface (Sprint 6)
- I1 sticky-nav blur; I4 balance-privacy eye (Sprint 5)
- K2 admin glass KPIs/tables/charts (Sprint 7)

_Last updated: 2026-06-04 (through Sprint 4)._
