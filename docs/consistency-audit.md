# Platform Consistency Audit (2026-07-04)

Four parallel scans (filters/sorting · cards · theme/tokens · page-chrome) across all
player-facing pages. Goal: one coherent hand across the whole platform.

**Root cause of most drift:** shared primitives exist but aren't used — every filter bar,
stat tile, page header, and "view all" link is hand-rolled inline, so each drifts.
The fix is to extract a few shared atoms and adopt them everywhere.

Legend: 🟢 safe class/token swap · 🟡 shared-atom extraction · ⚪ intentional/document-only.

## ROUND 3 — final consult (buttons/banners/colors) + pagination 2026-07-05
**SHIPPED (safe, high-value):**
- **X1 (LOAD-BEARING BUG FIX):** `brand` was missing from `tailwind.config.ts`, so every
  `text-brand-300`/`border-brand-500`/`bg-brand-500` utility in ~30 files rendered DEAD
  (links/active-pills/pagination fell back to inherited color). Added the `brand` color map
  + `--brand-200`. Now auth links, filter-pill borders, pagination all render royal-blue.
  Verified: auth "Create one" link + markets active-pill border now blue. This was the root
  cause of much of the "subtly off" feeling.
- **Pagination:** leaderboard now paginates (50 rows) via the shared `<Pagination>` with
  global rank — consistent with markets/results/positions/proposals.

**BACKLOG (documented; needs verified batches):**
- Colors: X3 link token split (teal-300 vs brand-300 → pick brand-300); X4 active-pill fill
  as one `--pill-active` token; X6 gold-hue drift → `--gilt`/`--gold-*`; X7 repeated hero
  gradient → `--hero-panel-grad`; X8 `#fff`→`--pearl-50`; X5 tabs.tsx teal pill → brand.
- Buttons: B1 sell-confirm btn-primary vs bet-confirm btn-gold (decide "confirm=gold" vs
  "exit=royal"); B2 side buttons pill/size drift (card md vs side-picker lg-pill); B3 two
  ad-hoc Sign-Out buttons; B4 pill-radius via inline style in ~12 spots → one `.btn-pill`;
  B6 filter rows → shared pill atom; B7 wallet pager → shared `<Pagination>`; B8 icon gaps.
- Banners: B1 form-hero glow hue/corner drift (gold/rose/blue) → one `<PageHero glowHue>`;
  B2 deposit glow alpha 0.20→0.18; B3 watermark size 180 vs 220; B4/B5 duplicated royal
  gradients + two "propose & get paid" promos → shared component/token; B6 promo padding.
- Pagination: /live (deliberate pulse overview — decide) + fairness recent-30.
- Prior backlog still open: PageHeader (H1/eyebrow/section), padding/space tiers, forms
  (FieldLegend/Textarea/deposit-on-Input), remaining Chip sites.

## ROUND 2 — deep scan (forms/buttons · modals/tables · type/spacing/icons) 2026-07-04
Ali's instinct confirmed: more inconsistencies exist. ROOT CAUSE (recurring): pages hand-roll
instead of using the shared atoms (Chip, Field, BackLink, PageHeader) and hardcode sizes.

**SHIPPED this round (safe):**
- **BackLink sweep** — 9 player pages (profile/account,sessions,kyc,source-of-funds,
  responsible-gambling,invite; wallet/deposit,withdraw; proposals/new) now use `<BackLink>`
  (was hand-rolled `<Link>` with a bigger s=14 chevron). Fixes X2 for those pages. (Still raw:
  proposals/[id]:97 + auth/otp:106 use a bare `←` — fold in later.)
- F7 proposals textarea used `admin-focus` on a player form → `brand-focus`.
- M3 notifications scrim `bg-black/45` → `/60` (matches all other modals).
- M4 first-visit-primer `border-border` → `border-border-strong` (matches modal family).

**BACKLOG — atom-adoption refactor (do in verified batches; this is the real "full consistency"):**
Forms/buttons: F1 deposit-amount rebuild on Input atom (mirror of withdraw); F2 field-label
eyebrow color/tracking split (text-subtle vs text-muted, 0.14 vs 0.16 — extract FieldLegend);
F3 auth pages hand-roll label vs Field atom; F4 OTP bespoke input; F5 inline pill-radius override
on reset/kyc CTAs; F8 close-account raw h-10 input (<44px); F9 wallet phone bare Input vs PhoneInput;
+ add a Textarea atom.
Modals/tables: M1 leaderboard + profile/account tables override `.admin-tbl` thead inline;
M2 list-frame recipe drift; M5 modal enter timing/curve (sell-confirm raw cubic-bezier, confirm-dialog
200ms); M6 inner-card radius md vs lg; M7 modal max-width ladder (5 values → 2 tokens).
Type/spacing/icons: X1 page-H1 size (5 sizes → one 28px); X4 page-eyebrow 10 vs 11px (header-only,
not field labels); X3 container space-y (6/5/4/3.5/3 → two tiers); X5 status pills hand-rolled vs
`<Chip>` atom (adopt Chip everywhere); X6 section-heading size (20 vs 15 vs 16); X7 icon sizes;
X8 card padding tiers (→ p-5/p-4/p-3). Plus entrance reconciliation (M1 motion) + FilterPill/StatTile/
PageHeader extraction from Tier 2.

RECOMMENDED next: a dedicated "adopt the atoms" pass — Chip everywhere (X5), one PageHeader
(X1+X4+X6), FieldLegend (F2), Textarea atom (F7), padding/space tiers (X3+X8) — each batch
build+visually verified. This converts the whole backlog at the root instead of one-off whack-a-mole.

## STATUS
- **TIER 1 — DONE (aa8d552), verified desktop+mobile.** All user-visible inconsistencies
  fixed: filter pills unified (proposals de-golded, active-glow removed on results/positions,
  positions mobile scroll), leaderboard gold-budget fixed + width→1080, market card radius
  →16px, position/proposal card hover unified, ResolutionPanel→glass-panel, empty-state &
  bottom-nav radii.
- **TIER 2 — PENDING (next focused pass, per-file verified).** These are shared-atom
  refactors / nuanced normalizations, NOT user-visible bugs — do carefully, not rushed:
  - L2 BackLink sweep — 9 player pages (profile/account,sessions,kyc,source-of-funds,
    responsible-gambling,invite; wallet/deposit,withdraw; proposals/new) each swap the raw
    `<Link>` (glyph s=14) for `<BackLink fallbackHref label>` (glyph s=11, history-aware).
    Labels: profile→t.common.profile, wallet→t.wallet.title, proposals→t.proposals.title.
  - L1 page-header eyebrow → normalize to `text-[11px]` ONLY on true page-header eyebrows
    (help, wallet/deposit, wallet/withdraw, profile/account, profile/sessions, legal header,
    profile hero). DO NOT touch the many `text-[10px]` FIELD/SECTION labels — those are
    correct as-is.
  - F5/L7 extract `<FilterPill>` + `<StatTile>`; L1/L4 extract `<PageHeader>`/`<SectionHeading>`;
    then adopt across pages (prevents future drift — the audit's root cause).
  - T4/T5/T6 token dedup — hero gradient → `--panel-hero`; chip.tsx inline palette → `.chip-*`
    classes; `#fff`→`--pearl-50` (checkbox,toggle,language-toggle,notifications-panel);
    add a `--focus-ring` token. (Maintainability; user-invisible.)

---

## RE-SCAN 2026-07-04 (filters/cards/motion) — results
Filters & cards re-scanned: **Tier 1 held cleanly** (player filter bars uniform hue 262,
no glow, mobile-scroll; card radii/hover/panels consistent). Motion & gestures scanned fresh.

**Motion/cards batch SHIPPED this pass (safe, verified):**
- Cards: market-detail closed box 12→16px; removed redundant `rounded-lg` on 2 glass panels.
- Motion durations unified: `kp-rise` 460→420ms (one card-rise cadence); shimmer 1.5→1.4s (one).
- Hover-lift unified to 3px (Card 6px, proposal card 2px, → 3px like market/position cards).
- Press feedback unified: `active:scale-95` → `active:scale-[0.97]` (bottom-nav, deposit pill, toggle).
- Reduced-motion (mid Android `reduced` tier): added `.notif-badge-pulse` + `.csrf-rest-ring`
  to the loop-silencing allowlist.

**Motion — DEFERRED (needs care / design decision, documented for next pass):**
- **M1 entrance inconsistency** — boards (markets/results/home/live) rise via `.market-grid`
  kp-rise; positions/proposals card lists have NO entrance. Fix requires reconciling the TWO
  entrance systems (`.market-grid > *` kp-rise vs the unused `.stagger-item` reveal-up) into
  one, then applying it — a design decision, not a swap.
- M4 two switch implementations (`.kp-switch` CSS vs React `Toggle`) — consolidate to one.
- M5 ad-hoc easing/`transition-all` → `--ease-*` tokens (broad sweep; scope transitions).
- M7 modals hand-roll 160/200ms (mutually consistent) instead of the `.dialog-anim` tokens.
- M8 progress-fill durations vary (300/500/700ms) — standardize on `--ease-stage`.
- Reduced-motion: inline `pr-pulse`/`aqua-pulse` (brand.tsx) + `lcl-*` (i18n loader) lack a
  class for the `reduced` tier (covered by universal clamps for a11y; mid-tier perf only).
- F1 `tabs.tsx` segmented hue 264 (latent — unused by player filters).

## TIER 1 — Safe, high-visibility swaps (no logic change)
- 🟢 **[F1] Proposals filter pills are gold/rounded-pill** — every other filter is brand-blue
  `h-8 rounded-md font-mono`. Rewrite proposals filter to the baseline. *(proposals/page.tsx:108-113)*
- 🟢 **[F2/T1] Active filter-pill rendered 5 ways** (hue 262/264/268; some glow, some not).
  DECISION: unify to ONE `.filter-pill`/`.pill-active` class — border-`--brand-500` + bg
  `oklch(40% 0.12 262/.35)`, **no glow** (extends the Push-A restraint; border+bg already
  reads as selected). Apply to markets/results/positions/proposals + top-bar + admin nav.
  *(globals.css new class; markets:163/184, results:193/216, positions:122)*
- 🟢 **[T2] Gold-budget violation on leaderboard** — gold on podium rank + positive ROI
  (ROI is a stat, not a payout). Rank → `--brand-300`; positive ROI → `--yes-300`/neutral.
  *(leaderboard/page.tsx:214,225)*
- 🟢 **[C1] Market card radius 12px; everything else 16px** — bump `.mcardp` to `--r-lg`.
  *(globals.css:1794)*
- 🟢 **[C2] Position card hover carries an extra brand glow** the market card no longer does —
  match `.mcardp` restrained hover (lift + ring + drop-shadow, no 30px glow).
  *(position-card.tsx:39)*
- 🟢 **[C3] Proposal card hover is teal**, not brand — swap to the shared brand hover.
  *(proposals/page.tsx:161)*
- 🟢 **[C4] Flat panels vs `glass-panel`** — resolution-panel + several sections use a
  hand-rolled `rounded-xl border bg-bg-elevated` (flat, no shadow/inset) where the rest use
  `glass-panel`. Switch top-level panels to `glass-panel`. *(resolution-panel.tsx:50; markets/[id] 264/381/414; performance 175/208)*
- 🟢 **[C7] Empty-state radius 12px** → `rounded-xl` (16px) to match sibling cards. *(empty-state.tsx:40)*
- 🟢 **[T7] Bottom-nav item `rounded-[18px]`** → `rounded-xl` (16px/`--r-lg`). *(bottom-nav.tsx:63)*
- 🟢 **[L3] Leaderboard `max-w-[1280px]`** but it's a single table → move to `1080` like
  other dashboard/table pages. *(leaderboard/page.tsx:159)*
- 🟢 **[F3] Positions tabs can't horizontally scroll on mobile** — add `-mx-1 px-1 overflow-x-auto`
  to match markets/results. *(positions/page.tsx:105)*

## TIER 2 — Shared-atom extractions (medium effort; each verified separately)
- 🟡 **[F5/L7] Extract `<FilterPill>` and `<StatTile>` atoms** and adopt across all filter
  bars + KPI tiles (5 hand-rolled tile variants today; radius md-vs-xl, mono-vs-display drift).
- 🟡 **[L1] Extract `<PageHeader eyebrow title>`** — normalize eyebrow to `text-[11px]` and
  H1 to `font-display text-[28px] tracking-[-0.02em]` (5 header variants today).
- 🟡 **[L2] Adopt `BackLink` everywhere** — ~9 pages use a raw `<Link>` with a bigger glyph
  and no history awareness. *(wallet/deposit,withdraw; profile/*; proposals/new)*
- 🟡 **[L4/L5] Shared `<SectionHeading>` + one "view all →" link style** (brand-300, mono).
- 🟡 **[C5/C6] Normalize glass-panel padding to two tiers** (`p-5` default / `p-4` dense) +
  extract a `<StatCell>` for grouped KPIs.
- 🟡 **[T4/T5/T6] Token cleanup** — promote the repeated hero gradient to `--panel-hero`;
  make `chip.tsx` use the `.chip-*` classes instead of an inline palette; `#fff`→`--pearl-50`;
  add a `--focus-ring` token and stop re-typing the ring/glow inline.

## TIER 3 — Intentional / document-only (no change)
- ⚪ [F4] Sidebar-rail (1280 board pages) vs top-row (1080 pages) filters — intentional.
- ⚪ [L6] Account activity in-table empty state — legitimate (must live in the table body).
- ⚪ [T3] Decorative YES/NO marketing labels — acceptable as art; swap inline oklch → tokens if touched.
- ⚪ [T8] No emojis anywhere. ✓  Core atoms fully tokenized; fonts/aqua/claret all correctly scoped. ✓
- ⚪ Profile's lighter mono section labels — keep if intentional.

## Already consistent (confirmed)
Pagination (shared component + shell), container padding `px-3 lg:px-6 py-6`, card border/bg
tokens, card title typography, RefreshPoller tiering, form-page hero pattern, i18n coverage,
YES/NO scoping, aqua/claret discipline.
