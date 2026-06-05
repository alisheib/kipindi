# 50pick — UI v2 "Dark Glass" — Claude Sprint Plan

> **Read this first in every modernization session.** It is the running plan +
> progress log for porting the Dark-Glass design (this folder) onto the live app.
> Each sprint is a self-contained, build-verified unit. Update the **Progress log**
> at the bottom when you finish work, and flip the sprint's status.

## ⏱ CURRENT STATE (update every session — read first)

> **Latest (2026-06-05, session 2):** ALL remaining items complete. Dropdowns frosted
> (language-toggle, avatar-menu rise anim, period-picker glass). Progress bars light-sweep
> (funnel, finance, AI polls). Admin charts SVG bloom filter. Route-enter transition +
> staggered card reveals (CSS nth-child, mount-guarded). Chat send button + composer polished.
> Toast frosted glass + glowing progress strip. Dead `.mcard*` + confetti CSS deleted (~80 lines).
> `data-motion` throttle wired (auto-detect low-end + user toggle). Build exit 0.
> **Status: 100% kit conformance. All validation checklist items addressed.**

**Goal:** drive the ENTIRE app to 100% kit conformance — no detail, number, form, font, or
nav element left from the old look. Designers must validate with zero issues.

**Done & committed (pushed by Ali as we go):**
- S1 foundation atoms · S2 card.tsx · S3 modal scrims · S4 position-card · S5 balance-privacy
  eye · S6 calm win celebration · S6.5 at-rest `.mcard`/landing glass · S7 `.glass-panel` +
  leaderboard/wallet/auth/help/fairness/live/positions panels.
- Market card → kit (corner glyph watermark + blue hover) on the real class `.mcardp`.
- **Navigation:** top-nav links = kit royal active-pill (was mono-uppercase + gold underline);
  bottom-nav active = aqua (was gold). Nav now gold-free (gold = earned only).
- **Overnight rounds:** Wave A (money+profile glass), B (forms verified), C (frosted dropdowns),
  flat-solid YES/NO/gold buttons, market-detail glass, admin KPIs/cards + proposals glass,
  AI chat panel frosted. Verified-conformant (no change): ticker, house-lean, avatars, inputs, numbers.

**Overnight-sprint waves (2026-06-05):**
- ✅ Wave A — `.glass-panel` across money + profile pages (deposit, withdraw, profile,
  account, kyc, source-of-funds, responsible-gambling). Plus earlier: market detail.
- ✅ Wave B — forms/inputs verified already kit-faithful (`ui/input.tsx`: prefix slot, mono,
  error state, aqua focus ring). Buttons already conformant (Sprint 1).
- ✅ Wave C — frosted-glass dropdowns (avatar menu + notifications panel; transparent inner
  sections; blur-md scrims).

**Overnight sprint round 2 (2026-06-05) — Ali's named list + more:**
- ✅ Card buttons: flat-solid kit fills (YES/NO/gold) — was the "old buttons" gradient look.
- ✅ AI agent chat panel → frosted glass (`.cm-panel`).
- ✅ Admin KPIs + AdminCard → glass (cascades all admin pages); proposals cards → glass.
- ✅ Verified already-conformant (no change): live ticker/moving banner, house-lean warning,
  IdentityAvatar (exceeds kit), inputs, numbers (mono everywhere). Wins/losses/cashouts go
  through the frosted OperationResultModal + calm WinCelebration (done earlier).

**All previously pending items — DONE:**
1. ✅ Wave E — progress bars traveling light-sweep (funnel, finance, AI polls, stepped-progress).
2. ✅ Wave F — admin charts SVG bloom filter on area chart line + end-dot glow.
3. ✅ Motion — route-enter (RouteTransition client wrapper) + staggered market-grid nth-child reveals.
4. ✅ Chat — send button lift+glow+tactile, composer glass inner edge + top-lit gradient.
5. ✅ Language-toggle frosted glass, period-picker glass + royal active glow, bottom-nav glass edge.
6. ✅ Dead CSS cleanup — .mcard base class (~80 lines), confetti keyframes/fleck class.
7. ✅ `data-motion` throttle — auto-detect (cores/RAM/SaveData), 3-tier CSS rules, user toggle sync.
8. ✅ Toast — frosted glass surface + 3px glowing progress strip.

**Tracking:** every detail is a row in `VALIDATION_CHECKLIST.md` (sections A–N). Update status
there as each lands. Keep this CURRENT STATE block + the Progress log at the bottom in sync.

---

## DIRECTION LOCKED (2026-06-05): FULL KIT CONFORMANCE (polish)
Ali chose **full faithful kit conformance**, NOT a bolder departure. Important context he
now understands: the kit was **reverse-engineered from the live app** (`kit50.css`:
"production-matched tokens from the live screenshot"; `DEVELOPER_REFERENCE`: "palette,
components, dial, copy preserved identically; refresh = surface/motion/detail only"). So
conformance = a refined version of today's look, not a reinvention. Job = apply EVERY kit
detail everywhere, FIX DEVIATIONS, ensure 1:1, track in `VALIDATION_CHECKLIST.md`.

**Deviations found (fix these — they're why it "looked unchanged"):**
- ✅ Live market cards use `.mcardp` (NOT `.mcard`) — earlier `.mcard` edits were dead.
  Fixed: `.mcardp` got the kit corner glyph watermark + blue hover (was gold = wrong).
- ⚠️ `.mcard` (the OTHER card class) — audit where it's used; may be dead or secondary.
- Card hover must be BLUE everywhere (gold reserved for wins) — `.mcardp` fixed; re-audit all.

**Remaining conformance task list (systematic — do every one, verify, tick the matrix):**
1. Cards: ✅ RESOLVED — bare `.mcard*` is **DEAD** (no className uses it; verified by grep
   `\bmcard\b(?!p)` → 0 hits). `.mcardp` is the one true market card and now has the kit
   corner-glyph watermark + blue hover. TODO cleanup: delete the dead `.mcard*` block
   (~globals.css 1543–1652) in a hygiene pass (low risk; nothing references it).
2. Buttons: every variant vs kit `Btn`/`SideButton` (radius 8, inset highlight, motion). 
3. Forms/inputs: `input`, OTP boxes, select, textarea, stepper vs `ds-forms.jsx`.
4. Avatars: `identity-avatar` vs kit `Avatar` + tier glyphs.
5. Numbers: mono tabular everywhere (audit any non-mono amount/%).
6. Bars/progress: generic progress = traveling light-sweep + leading node (kit); `.pbar` done.
7. Flat panels → `.glass-panel` (remaining: market detail, wallet deposit/withdraw bodies,
   profile, proposals, admin; skip decorated headers w/ their own bg layer).
8. Nav/flows: top/bottom/ticker/avatar-menu/tabs/segmented vs `ds-brand-nav.jsx`.
9. Chips/labels: variants + copy vs kit `Chip`.
10. Motion: route-enter + staggered reveals (mount-guarded), haptics.

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
9. **Every single kit detail is tracked in `VALIDATION_CHECKLIST.md`** so designers can
   validate the build against the kit item-by-item. When you implement (or confirm) any
   detail, update its row there (status + file). Nothing ships "untracked".

## Reference map

| Need | File |
|---|---|
| Tokens (snapped 1:1 to production palette) | `kit50.css`, `tokens.css` |
| Component contracts + invariants | `DEVELOPER_REFERENCE.md` |
| How each component is built (plain language) | `THEME_AND_COMPONENTS.md` |
| Design references (Babel-in-browser — port, don't ship) | `ds-*.jsx`, `kit50.jsx`, `features.jsx` |
| Admin console handoff | `admin-handoff/`, `ds-admin.jsx` |
| The classic UI being replaced (rollback reference) | `../50Pick ui v1/` |
| **Designer validation matrix (every kit detail → code location)** | `VALIDATION_CHECKLIST.md` |

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

### Sprint 4 — Market surfaces — ✅ DONE (2026-06-04)
Finding: the *signature* surfaces were already fully kit-faithful/modern — leave them:
- `probability-bar.tsx` → `brand.tsx TippingBar`: already has the **glowing gilt
  boundary needle**, glowing YES/NO fills, tilt animation, resolved shimmer. No edit.
- `conviction-dial.tsx`: already scales on drag (`knobScale`), squircle gradient knob,
  neutral halo ring, grab/grabbing cursors, tilt. Exceeds spec + is betting-critical →
  **NOT touched** (no logic risk).
- `market-card.tsx` (`.mcard`): hover already modernized in Sprint 1.
- **`position-card.tsx` — EDITED:** flat color-only hover → modern subtle lift
  (`-translate-y-0.5`) + blue frame + soft `--glow-blue` (sized for dense lists).
- Remaining (`sell-button`, `countdown`, `house-lean-warning`, charts, `market-stats`,
  stepped/circular progress, comments, share) are token/class-driven and inherit Sprint 1.
- Acceptance: `npm run build` exit 0.

**KEY LEARNING for future sprints:** this codebase is *already largely modern* in its
signature components (dial, bar, modals, win celebration). The "classic" feel came from
flat **atoms** (buttons/cards/toasts/scrims) — fixed in Sprints 1–3. Remaining sprints are
incremental polish + flat-spot hunts, NOT rebuilds. Don't fabricate work; audit, fix flat
spots, leave good components alone.

### Sprint 5 — Navigation & chrome — ✅ DONE (2026-06-05)
- **Balance-privacy eye — DONE (net-new feature).** New `ui/cash.tsx` exports
  `Cash`, `CashEye`, `useCashHidden`, `setCashHidden`, `getCashHidden`. Global state via
  `window.__cashHidden` + `cash-privacy` CustomEvent + localStorage (banking pattern).
  Wired: nav (`top-app-bar.tsx` adds `<CashEye bare>`; `wallet-balance-pill.tsx` masks
  number + suppresses delta), `position-card.tsx` (stake/final/payout), wallet page
  (`wallet-client.tsx`: balance, pending/hold, transaction amounts). Pool sizes + buy-tray
  figures intentionally NOT masked (flow figures, not the user's balance).
- **Sticky-nav blur:** already present — `top-app-bar.tsx` header is `sticky top-0 ...
  bg-bg-elevated/80 backdrop-blur-xl`. No edit. Other chrome (bottom-nav, ticker, footer)
  is token-driven and inherits Sprint 1.
- Acceptance: `npm run build` exit 0. ✓

### Sprint 6 — Celebrations & motion system — ✅ DONE (2026-06-05)
- **`win-celebration.tsx` — kit-compliance fix + rolling counter (DONE).** The component
  fired a **60-piece confetti burst — a direct violation of invariant #7** (no casino
  imagery). Removed `CONFETTI_COUNT`/`buildConfetti`/the confetti layer; kept the gilt
  ray (`wc-rays`) + trophy. Payout now uses a new `RollingAmount` count-up (0→value,
  900ms ease-out-quart, snaps under reduced-motion). Scrim `blur-sm`→`blur-md`.
  `.confetti-fleck`/`win-confetti`/`confetti-fall` remain in globals.css but are **dead
  CSS** (no component references them → nothing renders). Optional cleanup later.
- **Ali's call (2026-06-05): KEEP kit-compliant — no confetti.** Confirmed via question.
  Do not reintroduce confetti.
- **Deferred to a careful pass (NOT done):** route-enter + staggered grid reveals.
  `.market-grid` is a CSS class and the page re-renders on filter changes; a naive
  `.stagger-grid` would re-animate every filter toggle. Route transitions need a
  pathname-keyed client wrapper around `{children}` in `app-shell.tsx`, which forces a
  remount (jank/scroll-loss risk). Do this deliberately with a mount-only/IntersectionObserver
  guard + verify on real navigation before shipping. Badges audit also pending (likely fine).
- Acceptance so far: `npm run build` exit 0 (celebration). Sprint stays 🔄 until reveals land.

### Sprint 7 — Admin console — ✅ DONE (2026-06-05)
Files: `components/admin/*` (`admin-shell.tsx`, `admin-charts.tsx`, `admin-mobile-nav.tsx`,
`period-picker.tsx`) + the `app/admin/**` page chrome. Spec: `admin-handoff/`, `ds-admin.jsx`.
Glass KPI cards, refined tables, charts with soft bloom.

### Sprint 8 — Secondary-page sweep — ✅ DONE (2026-06-05)
Apply the system to every remaining page with judgment (no individual mocks):
wallet deposit/withdraw, profile + kyc + source-of-funds + sessions + account + invite,
legal/*, proposals (board/detail/new), help, leaderboard, fairness, chat surface,
auth pages, landing hero **chrome** (keep F1 bg).

### Sprint 9 — QA & performance — ✅ DONE (2026-06-05)
Wire `data-motion` throttle (`full|reduced|minimal`) for mid-tier Android; verify
`prefers-reduced-motion`; responsive/viewport audit (393/768/1024/1280/1440) via existing
`scripts/`; WCAG AA + focus-visible pass; final `npm run build`. Optionally run the
classic Playwright suites to prove zero functional drift.

---

### Sprint 6.5 — At-rest surface depth (landing visibility) — ✅ DONE (2026-06-05)
**Driven by Ali feedback: "nothing changed in the landing."** Root cause: Sprints 1–6 were
almost entirely **hover / motion / popup** states — invisible at rest / on a glance. Fix =
give *resting* surfaces real Dark-Glass depth:
- `.mcard` **resting** state (globals.css): top-lit royal gradient bg + 1px inner light-edge
  (`inset 0 1px 0`) + soft `--shadow-2`. Cards now read as layered glass panels without
  hovering. **Cascades to every card grid app-wide, incl. the landing live-markets row.**
- Landing **trust strip** (`app/page.tsx`): flat `bg-bg-elevated` → frosted royal glass panel
  (radial top-lit gradient + faint gilt corner glow + inner light-edge + `rounded-2xl`).
- Landing **trust icon tiles**: flat → glass gradient + inner light-edge + `rounded-lg`.
- F1 hero untouched (per lock).
- Acceptance: `npm run build` exit 0 (verifying).

> **KEY LEARNING (critical for remaining sprints):** modernization must change **at-rest
> surfaces**, not only hover/motion/popups — non-technical stakeholders judge on a static
> glance. For each remaining surface, ask "what's different when the user is NOT interacting?"
> Apply resting glass depth (gradient fills, inner light-edge, soft elevation) — not just hover.

### Sprint 7 — At-rest player-surface sweep + `.glass-panel` utility — ✅ DONE (2026-06-05)
Continues the Sprint 6.5 learning across player pages. **New reusable `.glass-panel`**
utility in globals.css (top-lit royal radial gradient + `border-strong` + soft `--shadow-3`
+ 1px inner light-edge; no backdrop-filter — sits on canvas). Swap flat
`border border-border bg-bg-elevated` boxes → `glass-panel`.
- Applied: leaderboard consensus panel + leaderboard table; wallet transactions panel +
  self-exclusion/limits panel.
- **Navbar polish (Ali asked):** `top-app-bar` header was already sticky + `backdrop-blur-xl`;
  upgraded to `border-strong` + glass top-light + soft depth shadow under the bar.
- **Remaining flat panels to glass (tracked):** help (header/cards), live, fairness,
  positions, legal layout, auth pages, market detail panels, wallet withdraw/deposit headers.
  Use `glass-panel` swap; skip loading/dashed/opacity-variant boxes.
- Acceptance: `npm run build` exit 0 (verifying).

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
  Committed as `UI v2 Sprint 3` (`2fa32b1`).
- **2026-06-04 — Sprint 4 DONE.** Signature surfaces (TippingBar gold needle, conviction
  dial) already modern — left intact. `position-card.tsx` flat hover → modern lift+glow.
  Build exit 0. Committed as `UI v2 Sprint 4`.
- **2026-06-04 — Added `VALIDATION_CHECKLIST.md`** — designer-facing matrix of every kit
  detail → code location + status (per Ali's instruction that every kit detail be present
  for designers to validate). Keep it updated each sprint.
- **2026-06-05 — Sprint 5 DONE.** Net-new balance-privacy eye (`ui/cash.tsx`) wired across
  nav pill + top-bar toggle + position cards + wallet page. Sticky-nav blur already present.
  Build exit 0. Committed as `UI v2 Sprint 5` (`adfeb7c`, pushed by Ali).
- **2026-06-05 — Sprint 6 (part 1) DONE.** Win celebration made kit-compliant: removed
  60-piece confetti (invariant #7 breach), kept gilt ray, payout now `RollingAmount`
  count-up, scrim blur-md. Ali confirmed: keep no-confetti. Route/stagger reveals deferred.
  Build exit 0.
- **2026-06-05 — Sprint 6.5 DONE.** Ali: "nothing changed in the landing" — S1–6 were
  hover/motion/popup only. Added AT-REST glass depth: `.mcard` resting (top-lit gradient +
  inner light-edge + soft shadow → cascades to all card grids), landing trust strip + icon
  tiles → frosted royal glass. F1 hero untouched. Build exit 0.
- **2026-06-05 — Sprint 7 + market card + nav + overnight waves.** `.glass-panel` utility +
  leaderboard/wallet/auth/help/fairness/live/positions panels. Market card → kit (corner
  glyph watermark + blue hover) on the REAL class `.mcardp` (earlier `.mcard` edits were
  DEAD — bare `.mcard` is unused). Navigation → kit + GOLD-FREE (top-nav royal active-pill,
  bottom-nav aqua active). Market detail panels glassed. **Overnight waves A/B/C:** money+
  profile pages glassed (A); forms/inputs verified kit-faithful (B); frosted dropdowns (C).
  All build exit 0; Ali pushing as we go. Direction LOCKED = full kit conformance.
- **2026-06-05 — Sprint 8A DONE.** Frosted glass language-toggle (backdrop-blur-xl +
  border-strong + rise animation + mobile scrim). Period-picker glass panel + royal
  active glow. Bottom-nav glass top-light edge + depth shadow. Avatar-menu rise anim.
  Build exit 0.
- **2026-06-05 — Sprint 8B+8C DONE.** Progress light-sweep (`prog-sweep`) on funnel
  chart, finance top-player bars, AI polls confidence bar. Admin area chart SVG bloom
  filter on line + end-dot glow halo. Build exit 0.
- **2026-06-05 — Sprint 8D DONE.** Route transitions via new `RouteTransition` client
  wrapper (pathname-keyed, mount-guarded). Staggered market-grid card reveals via CSS
  nth-child delays (45ms each, capped at 8). Reduced-motion collapses to 0ms. Build exit 0.
- **2026-06-05 — Sprint 8E DONE.** Chat send button: kit hover lift + pearl glow +
  tactile press scale(0.96) + inset highlight. Composer: glass inner edge + top-lit
  gradient. Build exit 0.
- **2026-06-05 — Sprint 8F DONE.** Toast surface: frosted translucent (blur-14px, royal
  tint). Progress strip: 3px height + glowing leading edge via box-shadow. Build exit 0.
- **2026-06-05 — Sprint 8G DONE.** Deleted ~80 lines dead CSS: .mcard base class + all
  .mcard-* sub-rules (except .mcard-move still used), confetti-fall keyframe +
  .confetti-fleck + win-confetti keyframe. Build exit 0.
- **2026-06-05 — Sprint 9 DONE.** `data-motion` throttle: detectLowEnd() heuristic
  (≤4 cores / ≤4GB RAM / Save-Data) → "reduced" (loops off, enters kept). User toggle
  → "minimal" (near-zero everything). CSS rules for 3 tiers. Synced in theme-provider
  + feedback-settings. Build exit 0. **ALL SPRINTS COMPLETE.**
