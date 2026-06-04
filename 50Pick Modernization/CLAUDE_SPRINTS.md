# 50pick — UI v2 "Dark Glass" — Claude Sprint Plan

> **Read this first in every modernization session.** It is the running plan +
> progress log for porting the Dark-Glass design (this folder) onto the live app.
> Each sprint is a self-contained, build-verified unit. Update the **Progress log**
> at the bottom when you finish work, and flip the sprint's status.

## Ground rules (never violate)

1. **UI only.** No change to logic, routes, server actions, copy, data, or the
   palette/hues. If a change would alter behavior, stop and ask.
2. **Brand invariants** (from `DEVELOPER_REFERENCE.md`): YES=green/left, NO=rose/right;
   gold is *earned only* (resolved / payout button / dial needle); blue=chrome/focus/
   card-hover; mono tabular numbers; no casino imagery; +30% string tolerance; 44px hit targets.
3. **Keep the F1 wallpaper hero.** Do NOT swap to HeroConstellation. Modernize hero
   *chrome* only.
4. **Enhance, don't rebuild.** `src/app/globals.css` already has the class hooks
   (`.btn*`, `.chip*`, `.pbar*`, `.toast`, `.mcard*`, `.num-roll`, `.value-roll`,
   `.reveal-up`, `.dialog-anim`, `.sheet-anim`, motion easings `--ease-*`, `--dur-*`).
   Most modernization happens by enriching these, which cascades app-wide.
5. **Verify every sprint** with `npm run build` (must exit 0). `next.config` has
   `typescript.ignoreBuildErrors:true`; the tsc baseline is pre-existing.
6. **Commit each finished sprint** to `main` with message `UI v2 Sprint NN: <title>`.
   Then tell Ali he can `git push` — **never push yourself** (Railway auto-deploys main).
7. **No per-sprint screenshots** unless Ali asks.
8. Spec sources, in priority order: `DEVELOPER_REFERENCE.md` → `THEME_AND_COMPONENTS.md`
   → `kit50.css`/`tokens.css` → the `ds-*.jsx` design references → `uploads/UI_MODERNIZATION_BRIEF.md`.

## Reference map

| Need | File |
|---|---|
| Tokens (snapped 1:1 to production palette) | `kit50.css`, `tokens.css` |
| Component contracts + invariants | `DEVELOPER_REFERENCE.md` |
| How each component is built (plain language) | `THEME_AND_COMPONENTS.md` |
| Design references (Babel-in-browser — port, don't ship) | `ds-*.jsx`, `kit50.jsx`, `features.jsx` |
| Admin console handoff | `admin-handoff/`, `ds-admin.jsx` |
| The classic UI being replaced (rollback reference) | `../50Pick ui v1/` |

---

## Sprints

### Sprint 1 — Foundation (global atoms in `globals.css`) — ✅ DONE (2026-06-04)
Cascading stylesheet-level modernization (affects whole app at once).
- **Buttons** (`.btn*`): hover lift `translateY(-1px)`, tactile press `scale(0.97)`,
  per-variant same-hue glow via drop-shadow (primary/yes/no/gold/claret).
- **Toasts** (`.toast`): frosted-glass backdrop `blur(14px)` + 1px top light-edge + r-lg.
- **Probability bar** (`.pbar-yes/no`): inset glass sheen on fills.
- **Inputs** (`.input`): hover border feedback.
- **Market card** (`.mcard:hover`): deeper lift `-3px` + blue frame (`--teal-400`) + `--glow-blue`.
- Acceptance: `npm run build` exit 0. ✓

### Sprint 2 — Core atom components — ✅ DONE (2026-06-04)
Audited `src/components/ui/*`. Finding: the atom layer is already class/token-driven,
so Sprint-1's `globals.css` work modernized most of it automatically.
- `button.tsx` — pure `.btn`/`.btn-*` classes → fully covered by Sprint 1, no edit.
- `chip.tsx` — token-driven inline styles → palette flows through, no edit.
- `toggle.tsx` — thumb already slides on `--ease-stage`, kit-faithful, no edit.
- `tabs.tsx` — gold active-underline + clean transitions already present, no edit.
- **`card.tsx` — EDITED:** interactive hover upgraded to the modern card spec
  (`-translate-y-1` + `border-teal-400` + `shadow-[var(--shadow-4),var(--glow-blue)]`),
  consistent with `.mcard`.
- Remaining atoms (`input`, `avatar`, `spinner`, `skeleton`, `tooltip`, `empty-state`,
  `password/phone-input`, `submit-button`, `countdown-pill`, `info-hint`, `glyphs`) are
  CSS/token-driven and inherit Sprint-1 styling; revisit only if a specific screen needs it.
- Deferred niceties (optional, low priority): chip micro-entrance, tabs *sliding*
  indicator (needs position measurement), toggle spring bezier (no production token yet).
- Acceptance: `npm run build` exit 0.

### Sprint 3 — Modals, sheets & overlays — ✅ DONE (2026-06-04)
Finding: the modal family was already strong (portaled, spring entrance via
`--ease-arrive`/`orm-pop`, RAF-driven auto-close strips). Modernization = consistent
**deeper frosted scrim + glass top-edge + stronger border** across the family.
- `operation-result-modal.tsx` — scrim `blur-sm`→`blur-md`, `bg-black/55`→`/60`; card
  `border-strong` + `inset 0 1px 0 rgba(255,255,255,.06)` glass edge.
- `bet-confirm-modal.tsx` — same scrim + glass-edge treatment.
- `sell-confirm-modal.tsx` — same.
- `ui/confirm-dialog.tsx` — scrim `blur-sm`→`blur-md`; card border-strong + glass edge.
- `rg/reality-check.tsx` — scrim blur `6px`→`12px`.
- `onboarding/first-visit-primer.tsx` — already `blur-md` + strong shadow, no edit.
- `rg/self-exclude-confirm.tsx` — inline (not a portal scrim), no edit.
- Rolling counters on amounts deferred to Sprint 6 (WinCelebration owns the payout roll;
  generic result rows stay static — final values, not live).
- Acceptance: `npm run build` exit 0.

### Sprint 4 — Market surfaces — ☐ TODO
The signature screens. Files: `markets/market-card.tsx`, `markets/conviction-dial.tsx`
(refine: gold round handle, value bubble on drag, snap haptic, scale+ring on active),
`markets/probability-bar.tsx` (**add the glowing gold boundary needle** that ties to the
dial), `markets/position-card.tsx`, `markets/sell-button.tsx`, `markets/countdown.tsx`,
`markets/house-lean-warning.tsx`, `markets/price-chart.tsx`, `markets/probability-chart.tsx`,
`markets/market-stats.tsx`, `markets/stepped-progress.tsx`, `markets/circular-progress.tsx`,
`markets/comments-thread.tsx`, `markets/share-button.tsx`. Progress bars get the traveling
light-sweep + leading-edge node.

### Sprint 5 — Navigation & chrome — ☐ TODO
Files: `layout/top-app-bar.tsx`, `layout/bottom-nav.tsx`, `layout/live-ticker.tsx`,
`layout/avatar-menu.tsx`, `layout/wallet-balance-pill.tsx`, `layout/page-ribbon.tsx`,
`layout/public-footer.tsx`, `layout/app-shell.tsx`, `ui/language-toggle.tsx`.
**New:** balance-privacy eye toggle (`Cash`/`CashEye` pattern) on the nav balance pill,
wallet, and position cards. Sticky nav with blur.

### Sprint 6 — Celebrations & motion system — ☐ TODO
Files: `markets/win-celebration.tsx`, `badges/AchievementToast.tsx`, `badges/Badge.tsx`,
`brand/*` rolling number. Calm gilt ray + rolling counter (NO confetti/chips). Wire
route-enter transitions + staggered card reveals (`.stagger-grid`/`.reveal-up`) on grids.

### Sprint 7 — Admin console — ☐ TODO
Files: `components/admin/*` (`admin-shell.tsx`, `admin-charts.tsx`, `admin-mobile-nav.tsx`,
`period-picker.tsx`) + the `app/admin/**` page chrome. Spec: `admin-handoff/`, `ds-admin.jsx`.
Glass KPI cards, refined tables, charts with soft bloom.

### Sprint 8 — Secondary-page sweep — ☐ TODO
Apply the system to every remaining page with judgment (no individual mocks):
wallet deposit/withdraw, profile + kyc + source-of-funds + sessions + account + invite,
legal/*, proposals (board/detail/new), help, leaderboard, fairness, chat surface,
auth pages, landing hero **chrome** (keep F1 bg).

### Sprint 9 — QA & performance — ☐ TODO
Wire `data-motion` throttle (`full|reduced|minimal`) for mid-tier Android; verify
`prefers-reduced-motion`; responsive/viewport audit (393/768/1024/1280/1440) via existing
`scripts/`; WCAG AA + focus-visible pass; final `npm run build`. Optionally run the
classic Playwright suites to prove zero functional drift.

---

## Progress log

- **2026-06-04 — Sprint 1 DONE.** Foundation atoms modernized in `src/app/globals.css`
  (buttons, toasts, probability bars, inputs, market-card hover). Build exit 0.
  Dependencies installed (`npm install`, ZIP had none). v1 archive created at
  `../50Pick ui v1/`. Committed as `UI v2 Sprint 1` (`e71f3d4`).
- **2026-06-04 — Sprint 2 DONE.** Audited the `ui/` atom layer — already class/token
  driven, so Sprint 1 covered most. Only `card.tsx` interactive hover edited (modern
  lift + blue frame + soft glow). Build exit 0. Committed as `UI v2 Sprint 2` (`f2c4182`).
- **2026-06-04 — Sprint 3 DONE.** Modal/overlay family already strong; applied consistent
  deeper frosted scrim (`blur-md`/12px) + glass top-edge + border-strong to
  operation-result, bet-confirm, sell-confirm, confirm-dialog, reality-check.
  first-visit-primer already modern; self-exclude-confirm is inline. Build exit 0.
  Committed as `UI v2 Sprint 3`.
