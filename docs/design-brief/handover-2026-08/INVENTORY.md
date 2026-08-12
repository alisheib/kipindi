# What exists today — the measured size of the job

Every number here came from reading the code, not from a document. It is here so you can see
the true scope before you start, and so you cannot be surprised at integration.

**Headline: 385 tokens in 38 families, across 23 scales.
59 UI primitives. 178 glyphs. 46 player routes.
85 invariants that must survive.**

> ⚠️ **The single most important thing in this file:** there are **23 scales** where a coherent
> system needs about eight. Two type scales. Two spacing scales. **Three** radius scales, one of
> which is documented as "LEGACY, FROZEN, and it DISAGREES" with the canonical one. **Four**
> parallel motion vocabularies, one entirely orphaned. Four elevation ladders. Eleven colour
> ramps including a deprecated alias ramp and two different ramps at the same hue.
>
> **That is the actual brief.** We are not asking you to restyle a coherent system — we are
> asking you to replace an incoherent one with a coherent one. Collapsing 23 scales into a
> defensible set is worth more to us than any particular palette.

---

## Scales — every one needs a replacement

| # | scale | steps today |
|---|---|---|
| 1 | Type scale — CSS tokens (--type-*) | 12 |
| 2 | Type scale — Tailwind fontSize (the SECOND type scale, with line-height + tracking) | 12 |
| 3 | Spacing — CSS tokens (--sp-*) | 10 |
| 4 | Spacing — Tailwind numeric scale (THE de-facto spacing system; OVERRIDES Tailwind's defaults) | 21 |
| 5 | Radius — CSS tokens (--r-*), the canonical semantic scale | 6 |
| 6 | Radius — Tailwind NUMERIC scale (LEGACY, FROZEN, and it DISAGREES with --r-*) | 8 |
| 7 | Radius — Tailwind SEMANTIC keys (the declared 'canonical path for new design', B9/B10) | 4 |
| 8 | Control heights + tap floor | 7 |
| 9 | Measure / page-width tiers | 8 |
| 10 | Elevation — numeric cast ramp (--shadow-1..5) | 5 |
| 11 | Elevation — named role casts | 6 |
| 12 | Elevation — THE material rungs (M2, the current canonical ladder) | 7 |
| 13 | Elevation — washes, edges, and the lamp | 8 |
| 14 | Motion — duration ladder (--t-*) | 6 |
| 15 | Motion — easing curves (--m-*) | 5 |
| 16 | Motion — material constants | 5 |
| 17 | Motion — chat surface (--cm-*), namespaced on purpose | 5 |
| 18 | Motion — DEPRECATED alias layer (--ease-* / --dur-*) | 13 |
| 19 | Motion — Tailwind's own (a FOURTH, ORPHANED vocabulary) | 9 |
| 20 | Z-index | 3 |
| 21 | Breakpoints (screens) | 6 |
| 22 | Colour-ramp step ladder (the shape every ramp shares) | 6 |
| 23 | Interaction state (the one hover/focus/press/disabled recipe) | 5 |

## Token families

| family | count | purpose |
|---|---|---|
| Colour ramp — royal (canonical primary, hue 268) | 11 | Primary chrome. Sovereign/financial. RAW ramp. Canonical name per audit L5. |
| Colour ramp — teal (DEPRECATED alias of royal) | 11 | Backward-compat only (globals.css:41-52). Every step is `var(--royal-N)`. The name is actively misleading — hue 268 royal, not teal. Marked for remova |
| Colour ramp — yes (emerald, hue 152) | 11 | SEMANTIC. 'YES' side of a market. globals.css:54 marks it 'Semantic, untouchable.' |
| Colour ramp — no (rose, hue 22) | 11 | SEMANTIC. 'NO' side of a market. 'Semantic, untouchable.' (globals.css:67) |
| Colour ramp — gold (champagne, hue 84) | 11 | RAW ramp, but under a SEMANTIC LAW: gold = earned money only (DESIGN_AUTHORITY M3), enforced by `npm run test:gold-is-money`. Chroma re-derived from t |
| Colour ramp — claret (heraldic burgundy, hue 15) | 11 | RAW ramp with a usage rule in comment (globals.css:93-95): editorial weight ONLY — Politics chip, Sovereign tier, regulator/footer crest, archival chr |
| Colour ramp — aqua (patina cyan, hue 195) | 11 | RAW ramp with a coverage rule in comment (globals.css:108-110): finishing pass only — live-ticker glow, sparkline highlight, 'new' pip, focus-ring tin |
| Colour ramp — slate (neutrals on the royal axis, hue 268) — 14 steps, NOT 11 | 14 | RAW neutral ramp. Has two extra half-stops (150, 750) the other ramps do not, so a designer replacing 'the 11-step ramp' silently drops two steps. --s |
| Colour ramp — pearl (globals' ink ramp, hue 268) — 4 steps + 2 aliases | 6 | RAW light-ink ramp. Only 4 real steps; the last two are aliases onto slate. NOTE the name collision: chat-tokens.css defines a DIFFERENT --pearl famil |
| Colour ramp — brand (hue 262) — 5 steps + soft | 6 | RAW. Deliberately a DIFFERENT hue (262) from royal (268). Nav active pill, focus ring, card-hover glow. Note the ramp runs 600->200 only; there is no  |
| Colour ramp — accent (aqua chrome, hue 195) — 4 steps + soft | 5 | RAW. A SECOND aqua ramp at the same hue 195 with near-identical values to --aqua-*. VIEW ALL, section links, active bottom-nav, auth links. |
| Surfaces / backgrounds | 14 | 6 real surface colours + 8 compat aliases. SEMANTIC (roles). |
| Borders | 8 | SEMANTIC. --border-control exists specifically for WCAG 1.4.11 (3:1) where a border is a control's ONLY boundary; --border stays darker for decorative |
| Text / ink | 12 | SEMANTIC. 4 real ink steps + 8 compat aliases. Every step is contrast-gated by `npm run test:contrast` (scripts/contrast-audit.mts parses this file). |
| Semantic role colours (danger / info / warning / success + singles) | 22 | SEMANTIC. Each role is base-500 + fill/border/fg triplet mixed at 18%/36%. |
| Semantic colour aliases (claret / aqua / gold / royal roles) | 21 | SEMANTIC role names layered on the raw ramps. This is the layer a designer re-points first. |
| Bet semantics | 9 | SEMANTIC. Money-outcome vocabulary. All are aliases; ALL NINE have zero var() readers under src (they are reached only through tailwind's `bet-*` colo |
| Gilt / struck gold (the money metal) | 10 | The M3 'struck gilt' material: gradients, not flat colours. --gilt is the single alias every gold surface reads. --gilt-reeding has exactly ONE sancti |
| Elevation — cast shadows | 11 | Two overlapping ladders: a numeric e1-e5 ramp and 6 named-role casts. |
| Elevation — material rungs (--elev-*) | 6 | The M2 ladder: a surface PICKS a rung and never composes a shadow. Exposed as .mat-flat/.mat-raised/.mat-float/.mat-modal/.mat-toast/.mat-inset in mot |
| Elevation — washes + lit edges + light angle | 8 | The M1 'one lamp' layer. The lit stop of all three raised washes is CAPPED at 24% — a derived accessibility ceiling, not a taste choice. |
| Glows | 5 | Ambient coloured halos, all built by color-mix off a ramp step. |
| Typography — scale + font stacks | 17 | 12 size steps + 5 font stacks. Every Latin stack ends in a CJK system fallback so no CJK webfont is downloaded (Tanzanian mobile data). |
| Spacing | 10 | A 4px-based ladder. See `scales` — it is effectively DEAD (5 of 10 steps have zero readers; the other 5 are read only inside globals.css). |
| Radius | 6 | Additive +4 rhythm. See `scales` — it DISAGREES with the Tailwind numeric radius scale by one step and both are frozen. |
| Control heights + tap floor | 7 | One place so the tap floor is enforceable. Guarded: token-collision.test.mts:201-209 asserts every `.btn-(xs\|sm\|md\|lg\|xl)` height is `var(--h-control- |
| Measure / width tiers | 8 | 7 page-width tiers + 1 runtime slot. Consumed only via `<PageContainer tier>` and tailwind `max-w-*`. Values asserted literally by scripts/measure-sys |
| Motion — curves (canonical) | 5 | 'Four. There is no fifth.' (motion.css:24) — the file then defines five. --m-pivot is reserved for the needle and dials ONLY. |
| Motion — durations (canonical ladder) | 6 | Distance sets the tier; money moves it one up. --t-max is settlement/celebration ONLY. |
| Motion — material constants | 5 | The physics of the product: one tilt, one lift, one press, one stagger, one blur. |
| Motion — DEPRECATED aliases (--ease-* / --dur-*) | 13 | ~150 existing rules still consume these. 12 of 13 are var() aliases onto the canonical layer; --dur-stage is a hard 820ms exception for the countdown  |
| Motion — composition slot | 1 | --mat-tint: a rung-independent tint slot, declared 5x (once per .mat-tint-* class) with fallback `0 0 transparent` so an untinted surface pays nothing |
| Interaction state | 4 | The one hover/focus/active/disabled recipe (spec Part D). NOTE: all four have ZERO var() readers under src except --state-disabled-opacity. |
| Chat surface (separate design axis) | 25 | A parallel mini design system for the AI Help Companion: its own indigo canvas, its own pearl emphasis, its own namespaced motion, its own z-stack. It |
| TippingBar (the iconic YES/NO bar) | 16 | A component-scale token family — the single largest non-ramp family. Track, needle, both fills, both glows, shimmer, sweep, empty state, and 5 label c |
| Hero surfaces | 9 | Page-hero gradients + hero ink. 6 of 9 have ZERO readers anywhere. |
| Decorative gradients (--g-*) | 5 | Legacy brand gradients. ALL FIVE have zero var() readers under src; they survive only through the tailwind `bg-g-*` bridge. |
| Misc single-purpose | 2 | One real system constant + one component-local. |

## UI primitives — 59 of them

| component | file | sizes | states | call sites |
|---|---|---|---|---|
| **Button** | `F:\kipindi-main\src\components\ui\button.tsx (+ .btn* in src/app/globals.css:816-989)` | size: xs\|sm\|md\|lg\|xl -> .btn-xs h=var(--h-control-xs)=32px pad 0 12 font 13px · .btn-sm h= | default, hover (translateY(--m-lift) = -2px + per-variant brightness/g | 38 |
| **Input (+ Field wrapper)** | `F:\kipindi-main\src\components\ui\input.tsx` | size: sm\|md\|lg. Source says `sm 36 · md 44 · lg 48` and implements it as Tailwind h-9 / h- | default, hover (border-border -> border-border-strong), focus-within ( | 34 |
| **Select** | `F:\kipindi-main\src\components\ui\select.tsx` | size: xs\|sm\|md -> min-h-8 / min-h-9 / min-h-11 (Tailwind spacing keys 8/9/11 = 48px / 64px | closed/open, hover on option (bg-bg-overlay), keyboard focus (focusIdx | 21 |
| **Chip** | `F:\kipindi-main\src\components\ui\chip.tsx (+ .chip* in globals.css:992-1030)` | size: sm\|md\|lg, and status variants (live/resolved/pending/objection) are one step taller. | selected (ring-1 --brand-400 + ring-offset-1 on bg-elevated), dot (6x6 | 57 |
| **Checkbox** | `F:\kipindi-main\src\components\ui\checkbox.tsx` | Single fixed size, all inline style: box 19x19px, border-radius 5px, border 1.5px, gap 9px | unchecked (border --border-strong, transparent bg), checked (bg + bord | 4 |
| **Toggle / Switch** | `F:\kipindi-main\src\components\ui\toggle.tsx (+ .toggle-switch in globals.css:1345-1346)` | One fixed size, inline style: track 44x26px radius pill; thumb 20x20 at top 3 / left 3, tr | on/off (background + border + thumb transform), hover (lives in global | 13 |
| **Tabs** | `F:\kipindi-main\src\components\ui\tabs.tsx` | No size prop. line: h-10 px-4 text-[13px] font-display semibold (h-10 = 80px in this confi | active/inactive (aria-selected), hover (text-text-muted -> text-text o | 1 |
| **Modal** | `F:\kipindi-main\src\components\ui\modal.tsx` | maxWidth prop in px, default 360 (ConfirmModal default 400; MarketCard HowItWorks passes 3 | open/closed, entering (m-dialog-in / m-sheet-in), scrim hover on close | 31 |
| **ConfirmModal** | `F:\kipindi-main\src\components\ui\modal.tsx:282-391` | maxWidth default 400. Icon badge h-9 w-9 (64x64px) rounded-full with 15% tone fill + 30% t | default, armed/disarmed (hard tier — confirm disabled until the typed  | 18 |
| **ConfirmDialog (trigger wrapper)** | `F:\kipindi-main\src\components\ui\confirm-dialog.tsx` | Inherits ConfirmModal entirely — no own geometry. | closed/open/pending(hold-open)/released. Purely behavioural. | 18 |
| **Toast (+ ToastProvider, useToast, useDeferredToast)** | `F:\kipindi-main\src\components\ui\toast.tsx` | Single size: max-w-[320px], rounded-md (8px), py-3 pl-4 pr-8. Leading icon badge h-7 w-7 ( | entering (translateY(-8px) scale(.95) -> 0/1), resting, exiting (200ms | 70 |
| **Tooltip** | `F:\kipindi-main\src\components\ui\tooltip.tsx (+ .kp-tooltip* in globals.css:1540-1575)` | All geometry is CSS-only (globals.css:1541-1570): padding 6px 10px, border-radius var(--r- | hidden by default; shown on `.kp-tooltip:hover` and `.kp-tooltip:focus | 2 |
| **Avatar + TierBadge** | `F:\kipindi-main\src\components\ui\avatar.tsx` | Avatar size: xs 20 · sm 28 · md 40 (default) · lg 48 · xl 56 · 2xl 80 px. Legacy CSS class | None — no hover, focus, disabled or selected. Purely presentational. B | 13 |
| **IdentityAvatar (generative crest system)** | `F:\kipindi-main\src\components\ui\identity-avatar.tsx` | Free `size` number (used at 20/28/40/48/56/80). Everything drawn in a 0..100 viewBox with  | None. 29 raw oklch() literals in this one file — the single largest co | 1 |
| **Card — MarketCard (THE iconic surface)** | `F:\kipindi-main\src\components\markets\market-card.tsx (454 lines) + .mcardp* in globals.css:2756-2864` | Card: padding 14px 15px 13px, gap 10px, radius var(--r-lg) 16px, height 100%, background v | default; hover (media hover:hover only) = translateY(--m-lift) + borde | 5 |
| **Card — UpDownCard (the Up & Down iconic surface)** | `F:\kipindi-main\src\components\updown\updown-card.tsx (692 lines)` | AssetMark default 40px. Card composes kit atoms only (.chip, .live-dot, .btn-yes/.btn-no,  | open (bettable, quick-bet one-tap), locked (selection closed, exact pa | 2 |
| **SidePicker** | `F:\kipindi-main\src\components\markets\side-picker.tsx` | Panel rounded-xl (16px) border p-5 / lg:p-6. Eyebrow font-mono 10px / 0.16em. Heading font | unpicked / picked. Buttons inherit .btn hover/active/focus/disabled. S | 1 |
| **ConvictionDial (the money control)** | `F:\kipindi-main\src\components\markets\conviction-dial.tsx (1,678 lines — the largest component in the repo)` | Not a token-driven primitive — 19 raw oklch() literals inline, its own geometry. Stake bou | idle, dragging, insufficient-balance pre-flight warning (suppressed wh | 1 |
| **Needle / conviction fidget (vendored physics)** | `F:\kipindi-main\src\components\layout\needle.tsx (626 lines) + needle.css (70 lines) + lib/needle-physics.js` | Fixed markup ported verbatim from the design playground; z-index 25 (below the 100-level m | visible / hidden. Hidden on money surfaces (regex /^\/wallet(\/\|$)/) a | 2 |
| **TippingBar / ProbabilityBar (the signature progress element)** | `F:\kipindi-main\src\components\brand.tsx:198-333, re-exported as ProbabilityBar from markets/probability-bar.tsx` | height is a free prop, injected as the ONE inline custom property --tb-h; every derived me | resting, hover-recast (only when recastOnHover), resolved shimmer, emp | 4 |
| **ConfidenceDial / CircularProgress** | `F:\kipindi-main\src\components\brand.tsx:337-403, re-exported from markets/circular-progress.tsx` | size prop, default 92 in brand.tsx / 56 via CircularProgress. viewBox 0 0 100 100, r=44, t | None — static render from yesPct. No hover/focus/animation. | 1 |
| **SteppedProgress** | `F:\kipindi-main\src\components\markets\stepped-progress.tsx` | flex gap-1.5 (8px), each segment flex-1 h-1 (4px) rounded-pill. Done = var(--royal-400), c | done / current (animated sweep) / upcoming. No hover/focus/disabled. N | 1 |
| **CountdownRing** | `F:\kipindi-main\src\components\positions\countdown-ring.tsx (+ .countdown-ring in globals.css:1680)` | Numeral styled by CSS: font-family var(--font-display), weight 600, line-height 1. | Ticking. Used on both admin and player routes (one of the 25 shared co | 2 |
| **Countdown (4-cell d/h/m/s)** | `F:\kipindi-main\src\components\markets\countdown.tsx` | Label font-mono 10px / 0.12em / --warning-fg, mb-2. Cells: flex gap-2 (12px), each min-w-[ | Ticking only. suppressHydrationWarning on every cell (SSR and hydratio | 1 |
| **CountdownPill / RoundCountdownPod** | `F:\kipindi-main\src\components\ui\countdown-pill.tsx · F:\kipindi-main\src\components\updown\round-countdown.tsx` | Not token-driven; both are bespoke. | Ticking; RoundCountdownPod carries the round phase. | 2 |
| **Skeleton family** | `F:\kipindi-main\src\components\admin\admin-skeletons.tsx` | SkBar default `h-3 w-24` (h-3 = 16px, w-24 = Tailwind default 6rem). SkChip default `h-[26 | Pulsing placeholder only. No variants for dark/light, no shimmer direc | 43 |
| **EmptyState + ErrorState** | `F:\kipindi-main\src\components\ui\empty-state.tsx` | EmptyState: rounded-xl (16px), dashed border-border-strong, px-8 py-8 (32px), max-w-[360px | None interactive. The optional `action` slot carries whatever button t | 31 |
| **Spinner** | `F:\kipindi-main\src\components\ui\spinner.tsx` | size prop, default 14px. viewBox 0 0 24 24, r=9, strokeWidth 3, track strokeOpacity .25, 0 | Spinning only. | 16 |
| **Stat (stat tile / label-value pair)** | `F:\kipindi-main\src\components\ui\stat.tsx` | One size. Label font-mono 9px uppercase tracking-[0.10em] --text-faint. Value font-mono 13 | None. Note: the admin console has its own separate stat tile — AdminKp | 4 |
| **Callout (inline notice)** | `F:\kipindi-main\src\components\ui\callout.tsx` | emphasis: normal \| strong. normal = rounded-md (8px), px-3 py-2.5, border 1px, glyph s=14. | Static. No hover/focus/dismiss. | 12 |
| **NoticeBar / AnnouncementBanner** | `F:\kipindi-main\src\components\ui\notice-bar.tsx` | Bespoke; not on the control-height token scale. | dismissible (4 disabled references), 2 hover refs. | 2 |
| **Table (admin)** | `F:\kipindi-main\src\app\globals.css:3011-3012 (.admin-tbl) + F:\kipindi-main\src\components\admin\admin-sort.tsx (SortTh) + admin-table-empty.tsx` | th 10px/16px, td 12px/16px. No density prop, no size prop, no sticky-header variant. | sorted asc/desc (SortTh), empty (AdminTableEmpty), loading (SkTableCar | 14 |
| **Pagination** | `F:\kipindi-main\src\components\ui\pagination.tsx (re-exported by admin/admin-pagination.tsx)` | btnBase = h-[44px] min-w-[44px] px-2 rounded-md font-mono text-[11px] tracking-[0.10em]. T | active (border-brand-500 / bg-brand-500/15 / text-brand-300 / bold / s | 9 |
| **PriceChart + VolumeSparkline** | `F:\kipindi-main\src\components\markets\price-chart.tsx` | VolumeSparkline defaults width 220 x height 38. Chart chrome lives in globals.css `.pchart | Static SVG plus the CSS range switcher's active/inactive. 11 raw oklch | 1 |
| **ProbabilityChart + Sparkline** | `F:\kipindi-main\src\components\markets\probability-chart.tsx` | Sparkline 72x26. Chart shares the `.pchart*` chrome and `.spark { display:inline-block; li | One `active` reference (range selection). No hover crosshair in the co | 1 |
| **PnlChart** | `F:\kipindi-main\src\components\positions\pnl-chart.tsx` | Bespoke SVG, no size props. Companion PnlSummaryStrip in positions/pnl-summary-strip.tsx;  | None. | 1 |
| **BottomNav** | `F:\kipindi-main\src\components\layout\bottom-nav.tsx` | lg:hidden fixed left-2.5 right-2.5, bottom calc(9px + env(safe-area-inset-bottom)), border | active (colour --accent-400, capsule background oklch(72% .11 195 / .1 | 1 |
| **TopAppBar** | `F:\kipindi-main\src\components\layout\top-app-bar.tsx` | header height 56px, sticky, z-30, background color-mix(in oklab, var(--panel) 92%, transpa | active nav item, hover, focus, guest vs authed, admin (surfaces the co | 1 |
| **LiveTicker** | `F:\kipindi-main\src\components\layout\live-ticker.tsx` | Bespoke. 2 raw oklch() literals. | Scrolling. No hover-pause, no focus, no reduced-motion branch in the c | 1 |
| **PublicFooter** | `F:\kipindi-main\src\components\layout\public-footer.tsx` | Bespoke. | 4 hover states on links. No focus-visible styling of its own. | 1 |
| **WalletBalancePill** | `F:\kipindi-main\src\components\layout\wallet-balance-pill.tsx` | height 44px, padding 0 12px, gap 7, rounded-pill, font-mono tabular-nums bold, fontSize 12 | resting, hover (text-gold-300), flashing (800ms: border -> --gold-300, | 1 |
| **AvatarMenu** | `F:\kipindi-main\src\components\layout\avatar-menu.tsx` | Bespoke. | open/closed, 5 hover states, 1 focus reference, 1 active/current refer | 1 |
| **DateTimeRangeFilter** | `F:\kipindi-main\src\components\ui\datetime-range-filter.tsx` | Chips are HAND-ROLLED buttons, not <Chip>: rounded-pill border px-3 py-1.5 font-mono text- | active chip (border-brand-500 / bg-brand-500/10 / text-brand-300 / bol | 7 |
| **PageContainer** | `F:\kipindi-main\src\components\layout\page-container.tsx` | pad: page (default) = px-3 lg:px-6 py-6 — which with the overridden spacing scale is 16px  | None. Layout only. Replaced ~60 hand-typed width strings that had drif | 2 |
| **FormColumn** | `F:\kipindi-main\src\components\ui\form-column.tsx` | Caps BOTH the column (maxWidth) and the fields inside it. Emits data-field-measure. | None. Layout only. | 3 |
| **PageHeader** | `F:\kipindi-main\src\components\ui\page-header.tsx` | Eyebrow font-mono 11px uppercase tracking-[0.16em] bold, mb-1, gap-2 (was 10px on ~8 pages | None. | 23 |
| **PageHero** | `F:\kipindi-main\src\components\ui\page-hero.tsx` | rounded-xl (16px), border, bg-bg-elevated. contentClassName default `relative z-10 p-5 lg: | None. | 14 |
| **Textarea** | `F:\kipindi-main\src\components\ui\textarea.tsx` | One size: rounded-lg (12px), px-3.5 py-2.5 (14px / 16px — px-3.5 falls through to the Tail | hover (border-border-strong), focus (`brand-focus`). No error state, n | 9 |
| **SubmitButton** | `F:\kipindi-main\src\components\ui\submit-button.tsx` | size: sm \| md \| lg \| xl (no xs). Maps onto the same .btn-* classes, so the same 30/38/46/5 | idle, pending (11 loading/aria-busy references, swaps in Spinner), dis | 12 |
| **SearchBox** | `F:\kipindi-main\src\components\ui\search-box.tsx` | Bespoke; the kit intends it to align flush with the h-8 filter row and the Select `xs`. | No hover/focus/disabled strings in the file — it relies on inherited/g | 7 |
| **OtpInput** | `F:\kipindi-main\src\components\ui\otp-input.tsx` | Bespoke per-cell geometry. | 1 focus reference. No error state, no disabled. | 3 |
| **PhoneInput / PasswordInput / DateSelect / TimeSelect / DurationInput** | `F:\kipindi-main\src\components\ui\{phone-input,password-input,date-select,time-select,duration-input}.tsx` | All echo the Input ladder where they have it. DateSelect is the richest: 8 hover, 3 focus, | DateSelect: hover/focus/disabled/selected. DurationInput: 4 hover, 1 f | 5 |
| **Cash + CashEye (balance privacy)** | `F:\kipindi-main\src\components\ui\cash.tsx` | Inherits the surrounding type. | visible / hidden, 2 hover references on the eye. | 7 |
| **ScrollX** | `F:\kipindi-main\src\components\ui\scroll-x.tsx` | Uses `.kp-thin-scroll` (globals.css:2895: 6x6px scrollbar). | 2 focus references (keyboard scrollability). No fade-edge affordance p | 38 |
| **Glyphs (the icon system)** | `F:\kipindi-main\src\components\ui\glyphs.tsx (344 lines)` | Every glyph takes `s` (size in px). Call sites use s=10,12,13,14,16,18,22 among others — t | None. Stroke-based, inherits currentColor. | 194 |
| **Brand marks** | `F:\kipindi-main\src\components\brand.tsx (498 lines)` | FiftyMark default 64 (min full mark 24px, min simplified 14px, clear space 0.25 x diameter | None interactive. `mark-flip-i` hover motion is applied by the caller  | 52 |
| **Achievement Badge + BadgeShelf** | `F:\kipindi-main\src\components\badges\Badge.tsx (+ .badge* in globals.css:2161-2264)` | size: sm 44x44 · md 64x64 · lg 92x92 px (.badge-sm/-md/-lg). Inner svg is 58% of the coin. | locked (desaturated, border --text-subtle 22%, gold accents forced to  | 1 |
| **StatusBadge family (three separate ones)** | `F:\kipindi-main\src\components\admin\status-badge.tsx · F:\kipindi-main\src\components\proposals\status-badge.tsx · F:\kipindi-main\src\components\ui\proposals-state-badge.tsx` | admin badges: size sm\|md\|lg (default sm). proposals-state-badge / maintenance-badge / comi | Status-driven colour only. Not interactive. | 9 |
| **AdminShell (the admin design system, separate from the kit)** | `F:\kipindi-main\src\components\admin\admin-shell.tsx` | Sidebar is 216px and sits OUTSIDE the PageContainer `console` measure. Other geometry is b | Per-export. Companion ActGate (admin/act-gate.tsx, 26 importers) gates | 93 |

## Player routes — 46

| route | file | measure tier |
|---|---|---|
| `/` | `F:\kipindi-main\src\app\page.tsx` | NO PageContainer. Hand-typed `mx-auto max-w-[1280px] px-3 lg:px-6` at page.tsx:215 = board (1280). Hero above it is full-bleed (no cap); its text block is capped max-w-[640px] at :122. |
| `/markets` | `F:\kipindi-main\src\app\markets\page.tsx` | NO PageContainer. `<main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">` at markets/page.tsx:74 = board (1280). |
| `/markets/[id]` | `F:\kipindi-main\src\app\markets\[id]\page.tsx` | NO PageContainer. max-w-[1080px] = reading. Inner layout uses the CSS class `.mterm` (globals.css:2903) = `minmax(0,1fr) 340px`, collapsing at the off-ladder `@media (max-width: 880px)`. |
| `/live` | `F:\kipindi-main\src\app\live\page.tsx` | NO PageContainer. `mx-auto max-w-[1280px] px-3 lg:px-6 py-6 space-y-5` at live/page.tsx:118 = board (1280). |
| `/results` | `F:\kipindi-main\src\app\results\page.tsx` | NO PageContainer. `<main className="mx-auto max-w-[1280px] px-3 lg:px-6 py-6">` at results/page.tsx:51 = board (1280). |
| `/watchlist` | `F:\kipindi-main\src\app\watchlist\page.tsx` | NO PageContainer. max-w-[1280px] = board. |
| `/updown` | `F:\kipindi-main\src\app\updown\page.tsx` | NO PageContainer. `mx-auto w-full max-w-[1280px] px-4 py-6` at updown/page.tsx:59 and :73 = board (1280) BUT with off-house padding px-4 (flat) instead of px-3 lg:px-6. |
| `/updown/[roundId]` | `F:\kipindi-main\src\app\updown\[roundId]\page.tsx` | The ONLY player page that uses a tier CLASS: `mx-auto w-full max-w-board px-3 lg:px-6 pt-[22px] pb-14` at :199 = board (1280). Still not <PageContainer>; vertical padding is bespoke (pt-[22px] pb-14). |
| `/updown/history` | `F:\kipindi-main\src\app\updown\history\page.tsx` | NO PageContainer. `mx-auto w-full max-w-[1080px] px-4 py-6` at :123 = reading (1080), again with off-house px-4. |
| `/positions` | `F:\kipindi-main\src\app\positions\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/positions/performance` | `F:\kipindi-main\src\app\positions\performance\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/positions/[positionId]` | `F:\kipindi-main\src\app\positions\[positionId]\page.tsx` | N/A — renders NO JSX at all. |
| `/wallet` | `F:\kipindi-main\src\app\wallet\page.tsx` | NO PageContainer, and no width on the page file — it delegates. Width lives in `src/app/wallet/wallet-client.tsx:429`: `<main className="mx-auto max-w-[1080px] px-3 lg:px-6 py-6 space-y-6">` = reading (1080). |
| `/wallet/deposit` | `F:\kipindi-main\src\app\wallet\deposit\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/wallet/withdraw` | `F:\kipindi-main\src\app\wallet\withdraw\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/wallet/deposit/return` | `F:\kipindi-main\src\app\wallet\deposit\return\page.tsx` | NO PageContainer on the page (max-w-[560px] = receipt). ⚠️ Its own loading.tsx DOES use `<PageContainer tier="receipt">` — one of only 2 PageContainer call sites in the whole app. |
| `/wallet/receipt/[id]` | `F:\kipindi-main\src\app\wallet\receipt\[id]\page.tsx` | NO PageContainer on the page (max-w-[560px] = receipt). Its loading.tsx uses `<PageContainer tier="receipt">` — the 2nd of the 2 call sites. |
| `/profile` | `F:\kipindi-main\src\app\profile\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/profile/account` | `F:\kipindi-main\src\app\profile\account\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/profile/activity` | `F:\kipindi-main\src\app\profile\activity\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/profile/responsible-gambling` | `F:\kipindi-main\src\app\profile\responsible-gambling\page.tsx` | NO PageContainer. max-w-[1080px] = reading (inner prose uses max-w-prose). |
| `/profile/kyc` | `F:\kipindi-main\src\app\profile\kyc\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/profile/notifications` | `F:\kipindi-main\src\app\profile\notifications\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/profile/security` | `F:\kipindi-main\src\app\profile\security\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/profile/sessions` | `F:\kipindi-main\src\app\profile\sessions\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/profile/source-of-funds` | `F:\kipindi-main\src\app\profile\source-of-funds\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/profile/invite` | `F:\kipindi-main\src\app\profile\invite\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/proposals` | `F:\kipindi-main\src\app\proposals\page.tsx` | NO PageContainer. max-w-[1080px] = reading (two <main> branches: the unavailable branch at :46 uses py-12, the normal branch at :87 uses py-6). |
| `/proposals/new` | `F:\kipindi-main\src\app\proposals\new\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/proposals/[id]` | `F:\kipindi-main\src\app\proposals\[id]\page.tsx` | NO PageContainer. max-w-[640px] = form. |
| `/leaderboard` | `F:\kipindi-main\src\app\leaderboard\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/fairness` | `F:\kipindi-main\src\app\fairness\page.tsx` | NO PageContainer. `mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 space-y-6` at :81 = reading (1080); note py-6 lg:py-8 rather than the house py-6. |
| `/help` | `F:\kipindi-main\src\app\help\page.tsx` | NO PageContainer. max-w-[1080px] = reading. |
| `/legal/terms` | `F:\kipindi-main\src\app\legal\terms\page.tsx` | NO PageContainer. Width comes from `src/app/legal/layout.tsx:31`: `mx-auto max-w-[1080px] px-3 lg:px-6 py-6 lg:py-8 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 lg:gap-10` = reading (1080), 2-col from lg. |
| `/legal/privacy` | `F:\kipindi-main\src\app\legal\privacy\page.tsx` | NO PageContainer. Inherits legal/layout.tsx = reading (1080), lg:grid-cols-[240px_1fr]. |
| `/legal/aml` | `F:\kipindi-main\src\app\legal\aml\page.tsx` | NO PageContainer. Inherits legal/layout.tsx = reading (1080). |
| `/legal/responsible-gambling` | `F:\kipindi-main\src\app\legal\responsible-gambling\page.tsx` | NO PageContainer. Inherits legal/layout.tsx = reading (1080). |
| `/auth/login` | `F:\kipindi-main\src\app\auth\login\page.tsx` | NO PageContainer. Width from `src/components/auth/auth-shell.tsx:25`: `mx-auto grid min-h-[calc(100vh-44px)] w-full max-w-6xl grid-cols-1 lg:grid-cols-2` — max-w-6xl = 1152px, numerically equal to --w-auth (1152) but written as a Tailwind default, not the tier token. Brand rail max-w-sm (:38), form column max-w-md/448px (:62). auth/layout.tsx adds NO chrome (redirect guard only). |
| `/auth/register` | `F:\kipindi-main\src\app\auth\register\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152) split-pane; form col max-w-md. |
| `/auth/otp` | `F:\kipindi-main\src\app\auth\otp\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152). |
| `/auth/2fa` | `F:\kipindi-main\src\app\auth\2fa\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152). |
| `/auth/forgot-password` | `F:\kipindi-main\src\app\auth\forgot-password\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152). |
| `/auth/reset-password` | `F:\kipindi-main\src\app\auth\reset-password\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152). Two AuthShell branches (invalid-token :67 and valid :109). |
| `/auth/verify-email` | `F:\kipindi-main\src\app\auth\verify-email\page.tsx` | NO PageContainer. AuthShell max-w-6xl (1152). |
| `/auth/admin` | `F:\kipindi-main\src\app\auth\admin\page.tsx` | NO PageContainer and NO AuthShell. `<main className="mx-auto flex min-h-[calc(100vh-44px)] items-center justify-center px-3 py-6">` (:45) with an inner `max-w-md` (448px) card (:47). Off-ladder: it is the only sign-in that is a centred card rather than the split-pane. NOTE: this is the ADMIN login, living outside /admin — it is in the player URL space but not a player surface. |
| `/offline` | `F:\kipindi-main\src\app\offline\page.tsx` | NO PageContainer. `<main className="relative isolate flex min-h-[calc(100vh-44px)] items-center justify-center overflow-hidden px-4 py-10">` (:17) with an inner `max-w-[400px]` column (:19). 400px is OFF the tier scale entirely — no tier is 400. |

Plus **47 admin routes**, which are OUT of scope for the visual redesign but
consume the same primitives — so a button you change changes there too.

## Breakpoints

## THE LADDER THE CODE ACTUALLY BRANCHES AT

Defined once, in `F:\kipindi-main\tailwind.config.ts:256-263` (`theme.extend.screens`). These are min-width, mobile-first:

| key | px | usages in src/**/*.{ts,tsx} | files |
|---|---|---|---|
| `xs` | 360 | 5 raw hits, of which only **2 are real layout branches** — `src/app/markets/[id]/page.tsx:689` and `src/components/rg/reality-check.tsx:131`, both `grid-cols-1 xs:grid-cols-2`. The other 3 are `xs:` object keys in size maps (`src/components/ui/avatar.tsx:13`, `src/components/ui/button.tsx:30`) — false positives, not breakpoints. | 2 |
| `sm` | 640 | 210 | 82 |
| `md` | 768 | 58 | 34 |
| `lg` | 1024 | **431 — the dominant breakpoint of the product** | 148 |
| `xl` | 1280 | 14 raw hits; **12 real** after excluding the avatar/button size maps, and only **5 of those are player-side**: `src/app/page.tsx:119` (hero padding `xl:px-24`), `src/app/updown/[roundId]/page.tsx:279` + its `loading.tsx:37` (`xl:[grid-template-columns:minmax(0,1.55fr)_minmax(300px,1fr)]`), `src/components/layout/top-app-bar.tsx:143,158`, `src/components/layout/avatar-menu.tsx:173`. The rest are `/admin/reports` and `/admin/updown`. | 10 |
| `2xl` | 1536 | 3 — **all three in one file**, `src/components/layout/top-app-bar.tsx:124,129,158` | 1 |

Measured with `grep -rhoE "(^|[^a-zA-Z0-9-])<bp>:" src --include=*.tsx --include=*.ts | wc -l`.

**No max-width Tailwind variants exist.** `grep -rhoE "max-(xs|sm|md|lg|xl|2xl):"` and `grep -rhoE "(min|max)-\[[0-9]+px\]:"` over `src` both returned ZERO. Every branch is min-width, mobile-first.

**No width-based `matchMedia` anywhere.** All 6 `matchMedia` call sites in `src` query `(prefers-reduced-motion: reduce)` only — `src/app/live/featured-contest.tsx:31`, `src/components/layout/needle.tsx:179`, `src/components/layout/wallet-balance-pill.tsx:61`, `src/components/markets/win-celebration.tsx:63`, `src/components/ui/hash-focus.tsx:50`, `src/lib/haptics.ts:104`. Nothing in JS reacts to viewport width.

## CSS-ONLY BREAKPOINTS (not on the Tailwind ladder)

`grep -rhoE "@media[^{]*\((min|max)-width:[^)]*\)" src --include=*.css` — 5 rules total, all in `src/app/globals.css`:
- `@media (max-width: 880px)` **x2** — `globals.css:2904` collapses `.mterm` (the market-detail trading terminal, `minmax(0,1fr) 340px`) to one column, and `:2908` un-sticks `.mterm-rail`. **880px is on no ladder anywhere.** It is the single most structurally significant layout switch on `/markets/[id]` and a designer reading the ladder would never find it.
- `@media screen and (max-width: 768px)` — `globals.css:1424`, forces `font-size: 16px !important` on every text input/textarea/select (iOS zoom-on-focus fix). A type scale that assumes 13-14px inputs is overridden below 768.
- `@media (min-width: 1024px)` — `globals.css:2458`, `.app-topbar` gains `backdrop-filter: blur(12px) saturate(1.15)` and drops to 78% panel opacity. Below 1024 the bar is near-opaque with NO blur (deliberate: Android raster cost). **The header is materially a different material above and below 1024.**
- `@media (min-width: 768px)` — `globals.css:2659`, `.market-grid > .mcardp--featured { grid-column: span 2 }`.

## THE ICONIC SURFACE DOES NOT USE THE LADDER AT ALL

`.market-grid` (`globals.css:2640-2644`) is `grid-template-columns: repeat(auto-fill, minmax(min(300px, 100%), 1fr)); gap: 14px`. The board on `/`, `/markets`, `/results` and `/watchlist` reflows **continuously**, not at named breakpoints. `/updown` does the same thing with an inline style (`updown/page.tsx:181`, `repeat(auto-fill, minmax(300px, 1fr))`). So "how many cards per row at 768" has no answer in the breakpoint ladder — it is 300px + 14px gutters against whatever the measure allows.

## WHAT DESIGN_AUTHORITY MANDATES

`F:\kipindi-main\docs\DESIGN_AUTHORITY.md:570` (law B-6): *"Design at 360 / 768 / 1280 / 1920, and zero horizontal overflow at 360."* Restated at `:683-685`: *"Verify at 360 / 768 / 1280 / 1920, in EN + SW + ZH, and look at the screenshots."*

## WHERE THE TWO DISAGREE — five real gaps

1. **1024 is the product's real desktop switch and the rulebook never names it.** 431 usages / 148 files — 3x the next breakpoint, and more than `sm`+`md`+`xl`+`2xl` combined. The sidebar rails on `/markets` and `/legal/*`, the top-bar desktop nav, the bottom nav's disappearance (`lg:hidden`), the house gutter step (`px-3 lg:px-6`), and the top-bar's backdrop-filter all flip here. A designer verifying at 768 then 1280 **jumps clean over the single most consequential width in the codebase.**
2. **1920 has ZERO branches.** Nothing in Tailwind or CSS keys off anything above 1536, and the widest player measure is `--w-board: 1280px`. Between 1280 and 1920 the only change is more empty gutter. The mandated fourth verification width tests nothing the 1280 shot did not already show — while 1024, which is untested by the mandate, is where everything actually moves.
3. **360 is a verification width with almost no implementation.** `xs:360` exists in the config but has exactly **2** real layout branches product-wide. At 360 a page renders its unprefixed base styles. This is defensible (base = smallest) but means "design at 360" is really "design the base, and check it at 360" — and the base is also what every width under 640 gets.
4. **640 and 1536 are branch points the rulebook never mentions.** `sm:640` has 210 usages across 82 files (the second-busiest breakpoint in the product) and is where the brand mark swaps from `FiftyMark` to `FiftyLockup` in the header (`top-app-bar.tsx:109-110`) and where the wallet balance pill first appears. `2xl:1536` is where the top bar inlines its overflow nav links (`top-app-bar.tsx:124,129`) and simultaneously hides the balance pill. Neither is on the verification list, so both changes ship unlooked-at.
5. **880 is off every ladder.** The market-detail two-column terminal collapses there and nowhere else.

## THE HEADER OVERFLOW BAND, 1024–1279 — CONFIRMED IN CODE

`src/components/layout/top-app-bar.tsx:137-141`, verbatim: *"Language toggle. Hidden at the lg–xl band (1024–1279): there the desktop nav (6 core links + More) turns on and the full cluster + toggle overflowed 1024, pushing the avatar off-screen."*

And `:148-157`, the balance pill's full visibility ladder, verbatim: *"< sm (phones): hidden … sm–lg (tablet portrait): shown … **lg–xl (1024–1279): hidden — the desktop nav turns on at lg and leaves no room; keeping the pill here clipped the avatar off-screen** … xl–2xl (1280–1535): shown … ≥ 2xl (1536): hidden."*

So the band is real, it is documented at the call site, and it is currently survived by **subtracting two controls** (`lg:hidden xl:block` on the language toggle at `:143`; `hidden sm:flex lg:hidden xl:flex 2xl:hidden` on the pill at `:158`), plus a third compensation — the avatar menu grows its own language picker for exactly this band (`src/components/layout/avatar-menu.tsx:173`, `sm:hidden lg:block xl:hidden`). The header currently has **four distinct compositions** (<640 / 640–1023 / 1024–1279 / 1280–1535 / ≥1536 — five, in fact) and the 1024–1279 one is the degraded one. **This is a header that outgrew its 1280 measure, not a spacing bug.** A designer replacing the brand mark, the nav type or the control heights will re-break it unless they are handed this band explicitly.

## Glyphs — 178

FILE: F:\kipindi-main\src\components\ui\glyphs.tsx (39,253 bytes, 345 lines).

COUNT — the rulebook's "178 unique keys" is VERIFIED, but the file contains 180 definitions.
- 180 matches of `^  <key>: (p: GlyphProps)`; 178 unique after dedupe.
- 2 keys are defined TWICE: `percent` (Ibase line 143 · Iplus line 265) and `activity` (Ibase line 112 · Iplus line 298). Line 329 is `export const I = { ...Ibase, ...Iplus }`, so the Iplus geometry wins and the two Ibase bodies are unreachable dead code that still ships in the bundle. The comment at lines 240-242 says this is deliberate ("Spread last so the three redraws (percent, activity) … win"), but it names THREE redraws and only two exist.
- Split: Ibase = 117 defs (lines 26-238), Iplus = 63 defs (lines 243-327).

THREE WRAPPERS, THREE GRIDS (glyphs.tsx lines 13-24):
- `G`   — viewBox "0 0 24 24", strokeWidth 1.9, default size 24. Used by 172 glyphs.
- `GL`  — viewBox "0 0 64 64", strokeWidth 1.9, default size 64. Used by 3 glyphs: emptyMarkets, emptyPositions, emptyLeaderboard.
- `G64` — viewBox "0 0 64 64", strokeWidth 2.2, default size 64. Used by 5 glyphs: emptyProposals, kycRail, fairnessChain, rgSelfCare, adminGeneric.
All three: fill="none", stroke="currentColor", strokeLinecap="round", strokeLinejoin="round", aria-hidden. Colour is NEVER hard-coded — always currentColor.

PROPS / SIZING: `type GlyphProps = { s?: number; size?: number } & Omit<SVGProps<SVGSVGElement>,"ref">`. `s` is the kit prop; `size` is a lucide-compatible alias kept so call sites could be migrated without renaming (line 9-10). Resolution is `s ?? size ?? <wrapper default>`; width and height are always equal.

MEASURED SIZE USAGE — 645 `<I.x>` call sites in src (345 non-admin / 300 under an `\admin\` path). The s= distribution: 9×5, 10×33, 11×57, 12×83, 13×69, 14×129, 15×47, 16×67, 17×6, 18×42, 19×2, 20×10, 22×11, 23×2, 24×1, 26×1, 28×2, 150×1 (wallet-client.tsx:145 `<I.gift s={150}/>`), plus 77 sites with no `s` at all (falling back to 24). So the real working range is 9-18px with a mode of 14px — glyphs are drawn on a 24 grid and rendered mostly at 9-18px, i.e. always downscaled.

STROKE EXCEPTIONS — 6 glyphs override the wrapper stroke on individual elements: calendarRange 1.3 (line 251), sparkleNew 1.4 (290), ussd 1.5 (306), tippingScales 1.6 (292), reconcile 1.6 (309), attest 1.7 (308). 34 elements across the set use `fill="currentColor" stroke="none"` (solid pips/hubs inside otherwise-stroked glyphs). Exactly one dash: clockPending `strokeDasharray="3.4 3"` (line 288).

⛔ MIN-SIZE / AUTO-SWITCH IS NOT A GLYPH BEHAVIOUR. Measured: glyphs.tsx contains no size threshold, no min-size, and no variant switch of any kind. The min-size/auto-switch law belongs to the BRAND MARK — `FiftyMark`, brand.tsx:49: `const simple = simplified ?? size < 24;`. Reproduction law (DESIGN_AUTHORITY.md:200-201, brand.tsx:18-19): full mark min 24px · simplified min 14px · clear space 0.25 × diameter. ⚠️ brand.tsx contradicts itself on the threshold — the header (line 16) says simplified is "REQUIRED ≤ 20px" and the prop doc (line 40) says "Use at or below ~20px", while the code switches at <24. `FiftyFavicon` (brand.tsx:153-155) repeats the `size < 24` test a second time.

CATEGORY MAPPING: `CATEGORY_GLYPH` (lines 334-340) maps 15 category strings onto 11 distinct keys (football, politics, economy, forex, weather, crypto, entertainment, tech, shuffle, markets, landmark); `categoryGlyph()` (341-343) lower-cases and falls back to "markets".

REACHABILITY (measured over 718 .ts/.tsx files, glyphs.tsx excluded): 105 keys have a literal `I.<key>` reference. Union with the 11 CATEGORY_GLYPH targets and the 34 keys named as data-driven `glyph: "x"` / `glyph="x"` string literals = 125 of 178 reachable. 53 keys have NO reference of any of those three shapes: adminGeneric attest calendarRange cashback catCrypto catCulture catForex catMacro catOther catSports catTech catWeather circleStop clockPending compass csvExport database emptyLeaderboard emptyMarkets emptyPositions emptyProposals fairnessChain flame flame2 headset home kycRail listChecks listFilter live lockSide play podium qr questionCircle radio rgSelfCare simCard sliders soon sortAsc sortDesc sparkleNew stepForward timerReset tipping tippingScales trade upload ussd vibrate voidX watch. Caveat: `I[...]` is indexed dynamically in 19 places, so a key could still be reached from a string this scan did not model — treat 53 as an upper bound on dead keys, not a proof.

THE FOUR MOTION PRIMITIVES — classes in F:\kipindi-main\src\app\motion.css:407-414 (§M5), keyframes in F:\kipindi-main\src\app\globals.css:1871-1889.
1. `.g-settle` — ARRIVAL. `animation: glyph-settle var(--t-base) var(--m-settle) both`. Keyframe: from {opacity 0; translateY(2px) rotate(-4deg)} to {opacity 1; transform none} — it settles onto the baseline along the mark's tilt axis. Trigger: mount / data arrival. A glyph never exits alone; exit is its parent's. Staggering: `.seal-cascade > .g-settle` (motion.css:396) delays by `calc(var(--t-stage) + min(var(--i),4) * var(--m-stagger))`, rows past the 4th land together.
2/3. `.g-nudge-up` / `.g-nudge-down` — DIRECTIONAL EMPHASIS. `animation: glyph-nudge-(up|down) var(--t-move) var(--m-settle)`. Keyframes: 0% none → 38% translateY(∓3px) → 100% none. Trigger: a price or state CHANGE only — never on mount, never looping.
4. `.g-ring` — ALERT. `animation: glyph-ring var(--t-max) var(--m-glide); transform-origin: 50% 15%` (top-centre, so a bell swings from its crown). Keyframe is a 5-step decay: 0° → 11° (22%) → -9° (46%) → 5° (68%) → -2° (86%) → 0°. Single-shot; an alert that loops is noise. ⚠️ motion.css:402-406 records that the delivered spec had this on `--m-pivot` and it was corrected to `--m-glide` — `--m-pivot` is reserved for "needle and dials ONLY".
5. `.g-swap` — STATE MORPH (the fifth class, but one primitive). `.g-swap { position: relative; display: inline-grid }` + `.g-swap > * { grid-area: 1/1 }` stacks the pair. `.g-swap-out { animation: glyph-swap-out var(--t-quick) var(--m-leave) both }` → to {opacity 0; scale(0.82)}. `.g-swap-in { animation: glyph-swap-in var(--t-base) var(--m-settle) both }` → from {opacity 0; scale(0.82) rotate(-8deg)} to {opacity 1; transform none}.

THE LAW AROUND THEM (DESIGN_AUTHORITY.md:751-759, glyphs docs at motion.css:399-406): a glyph moves for a reason and all 178 move the SAME way. Triggers are mount, data change, or state change — ⛔ NEVER hover ("icons respond, they do not perform"). In-flight is the kit `Spinner`, not a spinning glyph. A glyph with bespoke keyframes is a violation. Static glyphs stay static — the law governs motion, it does not demand it.

REDUCED MOTION — all five classes are clamped in BOTH gates: `@media (prefers-reduced-motion: reduce)` at motion.css:449-459 and the `html.kp-reduce-motion` mirror at motion.css:460-466, each setting `animation: none !important; opacity: 1; transform: none; filter: none`. The third gate (`data-motion="reduced"`, the ambient-loop throttle in globals.css §6) deliberately does not apply — these are single-shot.

COMPONENT WRAPPER: F:\kipindi-main\src\components\ui\glyph-swap.tsx (`GlyphSwap`) — takes `state`, re-keys on it, and applies `.g-swap-in` ONLY once `state` has actually changed (first render is an arrival, not a morph). It deliberately does NOT keep the outgoing glyph alive for `.g-swap-out`, because holding a ghost would need a timer (banned here) plus an `onAnimationEnd` that never fires under any reduced-motion gate — the stacked pair would then render permanently.

GUARD: `npm run test:glyph-motion` → scripts/glyph-motion.test.mts. It reads every .tsx under src/ plus motion.css and checks (1) no `animate-spin|pulse|ping|bounce` on a kit glyph or its immediate wrapper, (2) no `hover:`/`group-hover:` + `animate-`/`g-*`, (3) all six classes exist with BOTH reduced-motion branches, (4) an adoption floor — each family has ≥1 consumer. It has an explicit anti-vacuity assertion (`files.length > 300`).

⛔ IDENTITY MOTION IS NOT GLYPH MOTION (motion.css §M8, line 416+): `.needle-sweep`, `.needle-settle-loss`, `.mark-flip`, `.seal-mark-flip`, `.seal-arrive/commit/sheen`, `.crest-arrive`, `.crest-ring-reveal`, `.mark-pending` and `@keyframes m-axis-sweep` / `m-axis-reveal` are reserved for the trademark and the crest. Nothing else may borrow that stage.

⚠️ THE DESIGNER-FACING GLYPH DOC IS STALE. docs/design-system/v2-2026-07-27/03-glyphs/README.md:3-5 states "24×24 viewBox … kit icons 1.5px … the 2026-07 additions use 1.85px … 39 glyphs in ./svg/". Measured: that folder really does hold 39 .svg files with stroke-width 1.5 (×31) and 1.85 (×8) — but the SHIPPED kit is 178 keys at 1.9 (and 2.2 on the 64-grid). The glyph doc and its contact-sheet.html therefore describe a corpus 22% the size of the live one, at the wrong stroke weight. Do not hand that folder to the designer as the glyph inventory.

<details><summary>All 178 glyph keys</summary>

`activity` · `adminGeneric` · `alertCircle` · `alertOctagon` · `archive` · `arrowDown` · `arrowDownToLine` · `arrowRight` · `arrowUp` · `arrowUpFromLine` · `attest` · `bank` · `bell` · `bellOff` · `bellRing` · `bolt` · `bot` · `brain` · `calendar` · `calendarClock` · `calendarRange` · `camera` · `cardPay` · `cashback` · `cashOut` · `catCrypto` · `catCulture` · `catForex` · `catMacro` · `catOther` · `catSports` · `catTech` · `catWeather` · `chart` · `check` · `checkCircle` · `chevronDown` · `chevronLeft` · `chevronRight` · `chevronUp` · `circleStop` · `clock` · `clockPending` · `coins` · `comment` · `compass` · `copy` · `crown` · `crypto` · `csvExport` · `database` · `device` · `deviceDesktop` · `devicePhone` · `deviceTablet` · `download` · `dragHandle` · `economy` · `edit` · `emptyLeaderboard` · `emptyMarkets` · `emptyPositions` · `emptyProposals` · `entertainment` · `ext` · `externalLink` · `eye` · `eyeOff` · `fairnessChain` · `fileCheck` · `fileSignature` · `fileSpreadsheet` · `fileText` · `filter` · `flag` · `flame` · `flame2` · `football` · `forex` · `gauge` · `gift` · `globe` · `headset` · `heartPulse` · `home` · `hot` · `hourglassHalf` · `hourglassOff` · `idCard` · `info` · `keyRound` · `kycRail` · `landmark` · `layoutGrid` · `link` · `listChecks` · `listFilter` · `live` · `lock` · `lockSide` · `logIn` · `logOut` · `mail` · `markets` · `megaphone` · `menu` · `messageWhatsapp` · `mobileMoney` · `pause` · `percent` · `phone` · `play` · `plus` · `podium` · `politics` · `portfolio` · `profile` · `qr` · `questionCircle` · `radio` · `receipt` · `reconcile` · `resolved` · `rgSelfCare` · `rotateCcw` · `scrollText` · `sealCheck` · `search` · `server` · `settings` · `share` · `shield` · `shieldAlert` · `shieldcheck` · `shieldOff` · `shieldQuestion` · `shuffle` · `simCard` · `sliders` · `smartphone` · `sofBusiness` · `sofGift` · `sofInvestment` · `sofSalary` · `sofSavings` · `soon` · `sortAsc` · `sortDesc` · `sparkle` · `sparkleNew` · `star` · `stepForward` · `target` · `tech` · `ticket` · `timerReset` · `tipping` · `tippingScales` · `trade` · `trash` · `trendingDown` · `trendingUp` · `trophy` · `unlock` · `upload` · `user` · `users` · `ussd` · `vibrate` · `void` · `voidX` · `wallet` · `warning` · `watch` · `weather` · `wifiOff` · `x` · `xCircle`

</details>

---

*Measured 2026-08-11. Where this file and any other document disagree, this file was produced by
reading the code and the other one was not.*
