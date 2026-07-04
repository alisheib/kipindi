# Platform Consistency Audit (2026-07-04)

Four parallel scans (filters/sorting · cards · theme/tokens · page-chrome) across all
player-facing pages. Goal: one coherent hand across the whole platform.

**Root cause of most drift:** shared primitives exist but aren't used — every filter bar,
stat tile, page header, and "view all" link is hand-rolled inline, so each drifts.
The fix is to extract a few shared atoms and adopt them everywhere.

Legend: 🟢 safe class/token swap · 🟡 shared-atom extraction · ⚪ intentional/document-only.

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
