# 50pick — Platform-wide UI-Consistency Audit (living tracker)

> **Status:** 🔄 IN PROGRESS — Phase 0 (Foundation & detection) landing.
> **Goal:** every interactive surface — form inputs, popups, fields, buttons, filters,
> nav bars, clickable rows, scrollers, drawers, deposit/admin action buttons, dense tables —
> is consistent, aesthetic and user-friendly, driven by ONE kit / ONE token set.
> Plan of record: `C:\Users\asheib\.claude\plans\ye-shti-spllna-iwan-reactive-moore.md`.
>
> **Update this file at the end of EVERY phase/commit** with the current detector numbers
> and the checkboxes below. When every box is checked and both counters are 0, we are done.

---

## Live scoreboard (update each commit)

| Metric | Baseline (Phase 0) | Now | Target |
|---|---|---|---|
| `test:ui-consistency` findings | **95** across 61 (rule,file) pairs | 95 | **0** |
| `test:responsive` tap-target warnings | ~512 | ~512 | **0** (minus documented dense-admin exception) |
| Last commit | Phase 0 (merged onto `7d58354`) | — | — |
| Railway deploy | pending | — | SUCCESS + live-verified |

> **Note (2026-07-28):** Phase 0 rebased onto a parallel session's design-system/search
> work (`7d58354`). That session already: deleted the dead `PeriodPicker` (my Phase-2
> `?range=` unification is now moot), **fixed the `.admin-table` typo** (rule 6 → 0), and
> unified search across 12 surfaces (shrinks my Phase-2 SearchInput/filter-dedup scope).
> Baseline re-generated against the merged tree: 100 → **95**. Re-check Phase 1/2 scope
> against this before starting each.

### `test:ui-consistency` — findings by rule (Phase 0 baseline)
| # | Rule | Sev | Count | Remediation phase |
|---|---|---|---|---|
| 1 | `native-select` (use kit `Select`) | E | 4 | Phase 2 |
| 2 | `native-datetime` (use `DateSelect`/`TimeSelect`) | E | 2 | Phase 2 |
| 3 | `native-checkbox` (use kit `Checkbox`) | E | 2 | Phase 2 |
| 4 | `hardcoded-pill-active` (use `var(--pill-active)`) | E | 4 | Phase 2 |
| 5 | `adhoc-portal` (use kit `Modal`) | W | 6 | Phase 1 (money) / Phase 3 |
| 6 | `undefined-admin-table-class` (`.admin-table` typo) | E | ✅ 0 | done (parallel session) |
| 7 | `raw-button-btn-class` (use kit `<Button>`) | W | 57 | Phase 3 |
| 8 | `btn-inline-height-override` (`h-8` etc. on `.btn`) | W | 11 | Phase 2/3 |
| 9 | `table-not-admin-tbl` (adopt `.admin-tbl`/AdminTable) | W | 9 | Phase 2 |

---

## The detectors (how we measure)

- **Static kit-adoption linter** — `scripts/ui-consistency.test.mts` (`npm run test:ui-consistency`),
  auto-discovered by `test:all`. Baseline in `scripts/ui-consistency-baseline.json`; the suite
  FAILS on any NEW/increased drift beyond the baseline, so remediation ratchets down.
  - Rebaseline after a fix: `npm run test:ui-consistency -- --update-baseline`
  - Tally only (no fail): `npm run test:ui-consistency -- --report`
- **Rendered sweep** — `scripts/responsive-audit.mjs` (`npm run test:responsive`) now measures tap
  size for EVERY interactive family (buttons, links, inputs, selects, textareas, switches,
  options, tabs), not just buttons/links. Soft-warning; threshold rises to the 40px floor in Phase 3.
- **Control-height tokens** — `--tap-min` + `--h-control-xs/sm/md/lg/xl` + `--h-input` in
  `globals.css`; `token-collision.test.mts` now enforces that `.btn-*` heights reference them.
- Supporting: `test:tokens`, `test:contrast`, `test:integrity`, `scripts/axe-audit.mjs`,
  `scripts/dead-button-audit.mjs`.

---

## Phase checklist

### Phase 0 · Foundation & detection — 🔄 landing
- [x] Control-height tokens added to `globals.css` (current pixel values → pixel-stable)
- [x] `.btn-*` + `.input` wired to the tokens (no visible change)
- [x] `token-collision.test.mts` rule: button heights must reference `--h-control-*`
- [x] `scripts/ui-consistency.test.mts` + baseline + `test:ui-consistency` in `package.json`
- [x] `responsive-audit.mjs` widened to every control family
- [x] This tracker created
- [x] Gate green (tsc + static linters + build); rebased onto parallel work; committed + pushed; deploy verified

### Phase 1 · Money-critical correctness — ✅ complete
- [x] `players/[id]/balance-adjust-controls.tsx` → kit `Modal` (focus-trap, lock, Esc) + kit `<Button>`
- [x] `players/[id]/suspend-controls.tsx` → kit `Modal` + kit `<Button>`
- [x] `payments/reconcile-controls.tsx` Match/Write-off → kit `Modal` confirm surface (was inline text-links) + kit `<Button>`
- [x] `players/[id]/force-reverify-controls.tsx` → kit `Modal` confirm surface + kit `<Button>`
- [x] AML approve/reject — **assessed: already compliant** (kit `Button` + reason→Submit + `ActionOverlay` result + the authoritative two-officer server gate). Left as-is; not the no-confirm problem.
- [x] `reports/page.tsx:296` `.admin-table` → `.admin-tbl` (fixes unstyled table) — done by parallel session @7d58354
- [x] Gold-for-confirm exception documented (see Accepted exceptions below)

**Accepted exceptions (documented, allowlisted):**
- **Gold-for-confirm on the money-commit.** `modal.tsx`'s `ConfirmModal` forbids gold as a
  confirm tone (gold-discipline), and that holds for admin/destructive confirms. But the
  PLAYER money-commit — the "place your wager / confirm deposit" button in
  `bet-confirm-modal.tsx` and `round-stake-panel.tsx` — deliberately uses `btn-gold`: gold is
  the earned-money/commit language there, and the commit IS the money moment. This is the ONE
  sanctioned gold CTA; do not "fix" it. (Formalise in `DESIGN_AUTHORITY.md` gold-budget note in Phase 4.)
- **Dense mouse-only admin inline controls** may sit at `--h-control-xs` (32px) below the 40px
  finger floor — e.g. compact table-row triggers. Desktop/mouse context; documented floor exception.

### Phase 2 · Dedup & consolidate onto shared primitives
- [ ] Shared `SearchInput` (`market-search` ≈ `results-search`)
- [ ] Shared `Carousel` (`featured-contest` ≈ `notable-carousel`; 320px arrow-fix lives once)
- [x] Unify the two `?range=` date controls — `PeriodPicker` deleted by parallel session @7640bab (moot)
- [ ] Consolidate ≥5 chip/tab/filter styles onto kit `Chip`/`Tabs` (+ revive or delete `.ticket-*`/`.pool*`/`.pnl-*`)
- [ ] Restore `var(--pill-active)` in `updown/page.tsx`, `round-stake-panel.tsx`, `live/pulse-grid.tsx`
- [ ] Dedup `candidate-filters.tsx` ≈ `poll-filters.tsx`
- [ ] Migrate divergent tables (updown ×3, events, insights) → `.admin-tbl`; introduce `AdminTable` helper
- [ ] Native controls → kit: `<select>`→`Select`, `datetime-local`→`DateSelect`/`TimeSelect`, `checkbox`→`Checkbox`
- [ ] Deposit CTA (`top-app-bar.tsx`) → `btn-gold`

### Phase 3 · Adoption breadth + tap-floor bump
- [ ] Bump control-height tokens (sm→40, md→44, lg→48) + `.mcardp-actions` 36→40 — before/after screenshots for sign-off
- [ ] Raise `responsive-audit.mjs` tap threshold to 40
- [ ] Ad-hoc portals → kit `Modal(sheet)`: `needle-drawer`, `market-card` "How it works", `share-button`
- [ ] Raw `.btn` money confirms → kit `<Button>` (spinner / `aria-busy`)
- [ ] Card unification: UpDownCard inline pool-bar → `TippingBar`; `updown/history` box → `.mcardp` + kit `Stat`

### Phase 4 · Close design-system gaps + docs
- [ ] Specs written for select / date-time / modal / drawer / scroller / filter-bar / nav / notice-bar
- [ ] `OPEN-GAPS.md` #4–#7 closed; `DESIGN_AUTHORITY.md`, `design-system/README.md`, `next-session-prompt.md` synced

---

## Definition of "done" (final state)
1. `test:ui-consistency` baseline = **empty** (every drift remediated or allowlisted with a reason).
2. `test:responsive` tap-target warnings = **0** (minus the documented `--h-control-xs` dense-admin exception).
3. `npx tsc --noEmit && npm run build && npm run test:all` **green twice**; `axe-audit` + `dead-button-audit` clean.
4. Design-system specs written for the 8 undesigned primitives; `OPEN-GAPS.md` #4–#7 closed.
5. Docs synced and this tracker's boxes all checked, with the final commit hash + deploy-verified.

---

## Guardrails
- **MarketCard stays pixel-stable** (iconic surface) — only the 36→40 action height, and only in Phase 3.
- Money flows behaviourally unchanged. One control, one place. Extend the kit; never fork.
- Every push to `main` is a LIVE deploy — verify the Railway deploy after each commit
  (`https://www.50pick.tz/api/health` `uptimeSec` reset; a 200 ≠ your commit is live).
