# 50pick — Path to Perfect · 0-Issue Launch Plan

> **Purpose.** A single, role-driven master plan to take 50pick from "feature-complete
> and passing its gates" to **demonstrably perfect — 0 issues** across correctness,
> money-safety, compliance, UX, accessibility, visual polish, i18n and performance.
> Every item is concrete, testable, and has an acceptance bar. Work top-to-bottom;
> nothing ships past a phase until its **exit gate** is green and **all 9 roles accept**.
>
> Companion sources of truth: `docs/ui-rollout-tracker.md` (UI kit), `CLAUDE.md`
> (architecture), the `ui-kit-rollout` / `dev-roles-standard` / `five-lens-mindset`
> memories. This plan supersedes ad-hoc QA — it *is* the QA.

---

## 0 · What "Perfect · 0 issues" means (the bar)

A screen/flow/feature is **DONE** only when ALL are true:

1. **Correct** — does exactly what it claims; verified end-to-end against real state (not just tests).
2. **Money-safe** — no path can mint, lose, double-pay or strand money; every mutation is audited; invariants hold under concurrency.
3. **Compliant** — POCA/GBT/TRA/FATF/PDPA obligations met; never fabricates data, signatures, or state; RG-safe.
4. **Consistent** — uses the kit; no divergence; gold-discipline held (player: earned-money/money-in only · admin: resolved-seal only).
5. **Responsive** — pixel-clean at **360 → 768 → 1280 → 1920**, mobile-first; 0 horizontal overflow; touch targets ≥ 40px.
6. **Accessible** — WCAG 2.1 AA: keyboard-operable, focus-visible, labelled, contrast ≥ 4.5:1, reduced-motion honoured, screen-reader coherent.
7. **Trilingual** — EN + SW + ZH render with no truncation, no clipping, no untranslated keys (parity 1217³, admin EN+SW).
8. **Fast** — usable on a low-end Android over 2G; no console errors/warnings; no layout shift; no wasteful fetches.
9. **Verified visually** — a human-read screenshot exists for every state × width × locale that matters.

**The 9-role acceptance gate** (from `dev-roles-standard`) — each item is signed off by every lens:

| # | Role | "Perfect" for this role |
|---|---|---|
| 1 | **Software architect** | one source of truth; no dead/divergent code; dev↔prod parity; clean boundaries; graceful failure everywhere |
| 2 | **Integration engineer** | every flow works end-to-end; i18n complete; money conserved; no broken route/link/webhook |
| 3 | **Routing / navigation** | every route reachable; destination-vs-leaf discipline; deep-links + back + 404/error boundaries correct |
| 4 | **Software engineer** | tests cover money/security/concurrency/e2e/edge; strict types; no `any` leak into money/compliance; lint clean |
| 5 | **UI/UX engineer** | every page × state × width × locale is pixel-clean, a11y-correct, motion-correct |
| 6 | **Graphic designer** | spacing/type/colour/iconography consistent; gold-discipline; brand-exact; ⊘ assets in place |
| 7 | **Art evaluator** | reads premium + trustworthy; illustrations/empty-states/celebrations delight, never cheapen |
| 8 | **QA** | full matrix executed; adversarial bug-hunt done; regression locked; 0 open defects |
| 9 | **Player + shop-owner** | clear, fast, trustworthy, RG-safe, understandable in 3 languages; compliant + launch-ready for the operator |

---

## 1 · Current baseline (real inventory, measured)

| Surface | Count |
|---|---|
| Player/public pages | 34 |
| Admin pages | 36 |
| Production API routes | 8 |
| Dev-test endpoints (404 in prod) | 32 |
| `test:*` suites | 41 |
| e2e / verification `.mjs` scripts | 109 |
| i18n keys (EN=SW=ZH) | 1217³ |
| Modal/overlay/popup surfaces | ~21 |
| Code-health: TODO/FIXME · `any` · eslint-disable · ts-ignore | 8 · 47 · 92 · 1 |

**Already green** (do not regress): `tsc`, i18n 1217³, the money suite (markets/ledger/wallet/cashout/officer-conflict/emergency/solo-resolution/killswitch/kyc/payments/selection-closed/proposals), `admin-grids-smoke` 125/125, `ui-regression` 236/236.

**Known ⊘ blockers (asset pipeline — Ali):** `hero-bg.webp` (TZ-appropriate), propose/bonus/invite banners, category `*.webp`, navy-weave texture, `win-seal.png`, the 4 official MNO logos, the regulator seal. All are drop-in-ready in code.

---

## 2 · Phased execution plan

Each phase has **Scope · Method · Tooling · Exit gate**. Ship phase-by-phase; log results in §Batch-log of the UI tracker.

### Phase A — Baseline audit & inventory freeze *(1 pass, no code changes)*
- **Scope:** enumerate every route, component, flow, popup, state and asset into the master matrices (§3). Confirm this plan matches reality.
- **Method:** `Explore`/grep sweep → fill the matrices → mark each cell's current status.
- **Exit gate:** every route/flow/popup/state is a row with a known status; no "unknown" cells.

### Phase B — Automated test hardening *(the safety net first)*
- **Scope:** raise the test net to the "0-issue" bar so later visual/enhancement work can't silently regress money or logic.
- **Concrete work:**
  - **Money invariants** — for every money path (deposit, bet, cashout, resolve YES/NO/VOID, one-sided refund, withdrawal, bonus grant/convert, referral, tax) assert *conservation* (in = out + house) + no-negative-balance + idempotency + audit-entry-exists. (Extends `solo-resolution`/`killswitch` pattern.)
  - **Concurrency** — extend the stress probes: simultaneous bet+cashout, double-submit, two-officer race, webhook replay, kill-switch flip mid-flight.
  - **Security/authz** — every server action + API route: role-gate, TOTP-gate, rate-limit, ownership check, input validation (zod), and a *negative* test (wrong role → blocked + audited).
  - **Edge cases** — empty pools, one-sided markets, min/max stake, expired quote, selection-closed, self-exclusion lockout, KYC-gated withdrawal, dust amounts, huge amounts.
  - **i18n integrity** — parity + no-untranslated + no-key-collisions + SW/ZH length stress on the tightest components.
  - **A11y automated** — extend `a11y-audit.mjs` to every route: axe-core pass (0 serious/critical), focus-order, landmark, alt-text.
- **Tooling:** `tsx scripts/*.test.mts` + Playwright + axe-core.
- **Exit gate:** a named, committed test for every item above; all green; a single `npm run test:all` runs the money+security+i18n+a11y suites in one command with a pass/fail summary.

### Phase C — Visual-confirmation matrix *(the core of "perfect")*
- **Scope:** a human-read screenshot for **every meaningful (route × state × width × locale)** cell. This is the exhaustive visual sweep.
- **Dimensions:**
  - **State:** empty · loading/skeleton · error/boundary · populated · edge (long text, big numbers, RTL-ish SW/ZH) · the feature's special states (live/closing/resolved/void, KYC steps, pack chain, MNO paused, retry queue non-empty…).
  - **Width:** 360 (mobile-first, always first) · 768 · 1280 · 1920.
  - **Locale:** EN · SW · ZH (admin: EN + SW).
  - **Theme:** dark (canonical) + a light-mode spot-check where supported.
- **Method:** extend `ui-regression.mjs` into a **matrix runner** that seeds each state (via the committed dev-test endpoints), captures the grid, and flags: h-overflow, clipped-not-scrolled overflow, console errors, contrast, and **must be READ** (a diff/AI pass on each shot — the automated no-overflow check is necessary but not sufficient; the clipped-grid class of bug only shows in the image).
- **Popups (Ali-flagged, keep as a first-class row):** re-run the popup harness for all ~21 overlays at 360/1280 each cycle.
- **Exit gate:** every matrix cell has a read screenshot with a ✓; every ✗ has a fix or a documented ⊘ (asset-only).

### Phase D — Accessibility · motion · performance
- **A11y:** keyboard walkthrough of every interactive flow; focus-trap in modals; skip-links; aria on the dial/carousel/charts; contrast audit; screen-reader read-through of bet + KYC + resolve.
- **Motion:** every animation has a `prefers-reduced-motion` path that preserves meaning (dial, carousel `contest-fade`, reward-burst, pulse, count-ups, skeletons, nav-progress).
- **Performance:** Lighthouse mobile pass (target ≥ 90 perf/a11y/best-practices/SEO on the top 6 pages); bundle-size check; no N+1 fetches (the `getCardChart`/full-txn-scan class); image `loading=lazy` + sized; 2G/CPU-throttled smoke.
- **Exit gate:** axe 0 serious; reduced-motion verified on every animation; Lighthouse targets met; no console warnings.

### Phase E — Security · compliance · money-safety audit
- **Security:** run `security-review` on the diff of the last N commits; authz matrix (role × action); session/TOTP/rate-limit/CSRF/headers; secrets-in-env (no guessable salts — the `SX_REGISTER_SALT`/`AUDIT_CHAIN_SECRET` guards); PII masking (phone/NIDA) everywhere it renders.
- **Compliance:** GGR/NGR/Hold definitions single-sourced (done — D1); audit-chain verify end-to-end; two-officer flows (resolve, report-pack, high-risk KYC) enforce distinct officers; RG (limits, self-exclusion, reality-check, cool-off) enforced on every money path; regulator reports reconcile to the live store; never-fabricate audit (no fake officers/windows/numbers).
- **Money-safety:** re-drive every settlement flow end-to-end and reconcile the ledger; the payments reconciliation drift must be TZS 0; the solo-resolution + kill-switch overrides default OFF in prod.
- **Exit gate:** security-review 0 high/critical unresolved; compliance checklist signed; money reconciles to 0 drift.

### Phase F — Enhancement backlog *(delight + consistency + assets)*
- Execute the prioritized backlog (§5) — UX delighters, consistency fixes, and wiring the ⊘ assets the moment Ali delivers them.
- **Exit gate:** each enhancement passes the same 9-role gate; no enhancement regresses a gate.

### Phase G — Cross-role sign-off & regression lock
- Walk the 9-role gate over the whole platform one final time (a fresh operator + a fresh player, EN/SW/ZH, on a throttled phone).
- Lock: `test:all` + `ui-regression` matrix + `admin-grids-smoke` all green on a fresh, unseeded server; tree clean; pushed.
- **Exit gate:** 0 open defects; every role accepts; launch checklist (§7) fully ticked.

---

## 3 · Master matrices (fill in Phase A, maintain thereafter)

### 3.1 Route × state × verification
| Route | Kind | States to confirm | 360 | 768 | 1280 | 1920 | EN | SW | ZH | a11y | notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `/` home | landing | populated · (band hidden when 0) | | | | | | | | | ⊘ hero image |
| `/markets` | board | empty · Today-filter · full grid · search-no-match | | | | | | | | | card standard |
| `/markets/[id]` | detail | open · closing · waiting · settling · resolved · void | | | | | | | | | dial + bet-confirm |
| `/live` | pulse | empty · wall · featured carousel (1/N) | | | | | | | | | new arrows |
| `/results` | grid | empty · donut · featured · paged | | | | | | | | | |
| `/positions` `/positions/performance` | list | empty · open · settled · streak/crest | | | | | | | | | |
| `/wallet` `/deposit` `/withdraw` | money | tabs · limits · KYC-lock · MNO paused | | | | | | | | | money path |
| `/leaderboard` | rank | empty · podium · table | | | | | | | | | |
| `/proposals*` | propose | empty · list · detail · new · approved-burst | | | | | | | | | |
| `/profile*` (kyc/sessions/sof/rg/invite/account) | account | each sub-state | | | | | | | | | KYC rail |
| `/fairness` `/help` `/legal/*` `/offline` `/not-found` | info | render + i18n | | | | | | | | | |
| `/auth/*` (6) | auth | idle · error · loading | | | | | | | | | rail |
| **Admin** overview/live/finance/reports/payments | ops | empty · populated | | | | (EN+SW) | | | maker-checker |
| Admin resolver-queue + `/resolver/[id]` | resolve | stage1 · stage2 · sealed · solo-override | | | | | | | | ceremony |
| Admin `/kyc/[id]` | KYC | pending · high-risk · decided | | | | | | | | workstation |
| Admin players/cohorts/compliance/aml/sx/audit/system/… | grids | empty · populated | | | | | | | | grids-smoke |

*(≈70 rows total — Phase A expands this fully.)*

### 3.2 Popup × width (Ali-flagged — re-verify every cycle)
bet-confirm · sell/cash-out · operation-result (success/error) · win-celebration · confirm-dialog · reality-check · first-visit-primer · notifications-panel · avatar-menu · nav-more · share-sheet · chat-panel · admin: settle-confirm(typed-SEAL) · kill-switch(typed-PAUSE) · emergency-void · suspend · reset-password · poll-actions · action-overlay · date/select popovers. **Status: PASS at 360/1280 (last sweep).**

### 3.3 Flow × end-to-end (drive, don't assume)
register→KYC→deposit→bet→(cashout|resolve)→payout→withdraw · referral · proposal→approve→publish→resolve · bonus grant→wager→convert · two-officer resolve (+ solo override) · report-pack maker-checker · KYC maker-checker · MNO kill-switch → blocked deposit → resume · reconciliation drift=0.

---

## 4 · Test coverage target (Phase B)

| Class | Bar |
|---|---|
| Money invariants | every path: conservation + no-negative + idempotent + audited (unit `.test.mts`) |
| Concurrency | every shared-state path has a race test |
| Security/authz | every action/route: positive + negative (wrong-role blocked+audited) |
| i18n | parity + no-untranslated + length-stress |
| a11y | axe 0 serious on every route |
| Regression | one `npm run test:all` green on a fresh store |

---

## 5 · Enhancement backlog (prioritized — Phase F)

**P1 (polish that raises perceived quality):**
- `/live` carousel: optional slow auto-advance (pause on hover/focus, reduced-motion off) + swipe on touch.
- Apply the same arrow/swipe treatment to `/results` "notable result".
- Empty-state copy pass (every empty is warm, on-brand, actionable in 3 languages).
- Micro-interactions audit: consistent hover/active/focus/loading across every button & card.

**P2 (consistency & correctness):**
- Reduce `any`/`eslint-disable` in money/compliance modules to 0 (47/92 today — triage, keep only justified).
- Finance tax model: reconcile the finance-page 5% estimate to the config-driven TRA/GBT rates used in `daily-ops` (single source).
- Wallet payout-sum + stats-band full-txn scans → materialise/cache before high traffic.
- ConfirmDialog `Tone` still includes `gold` — audit remaining callers; retire if unused.

**P3 (⊘ assets — wire on delivery, Ali):**
- hero-bg.webp · MNO logos (`PaymentLogo.MNO_LOGOS` 1-liner) · regulator seal (deposit trust-strip + reports) · banners · category art · texture · win-seal.png.

---

## 6 · Risk register / known gotchas (carry forward)

- **Dev store is SYNC** — `db.user.*`, `db.kyc.*`, `db.sourceOfFunds.get` return values, not Promises, in-memory; tsc sees the async Prisma types. Wrap `await Promise.resolve(db.x()).catch(...)` or tests/pages crash at runtime only.
- **ui-regression false-fails on a seeded store** — a seeded store fires `navigator.vibrate` → dozens of false console-error fails. Always run the ui-regression gate (236/236) on a **fresh, unseeded** server (kill node → one clean PID).
- **Clipped-not-scrolled overflow passes the auto-check** — always READ the screenshot; fix admin grids with `grid-cols-[minmax(0,1fr)_…]`.
- **First cold-compile of a new page ~30s (Turbopack)** — bump Playwright `goto` timeout to 40s.
- **Windows dev-server orphans the node child** — `taskkill //F //IM node.exe`; confirm a single PID on :3000 before ui-regression.
- **Testing overrides default OFF in prod** — solo-resolution + payment kill-switches.

---

## 7 · Definition of Done · launch checklist

- [ ] `tsc --noEmit` clean · `next build` clean · lint clean
- [ ] `npm run test:all` green (money · security · concurrency · i18n · a11y) on a fresh store
- [ ] `ui-regression` matrix: every (route × state × width × locale) cell read + ✓
- [ ] popup sweep ✓ at 360/1280
- [ ] `admin-grids-smoke` 125/125
- [ ] every end-to-end flow driven on a fresh player + fresh operator, EN/SW/ZH
- [ ] axe 0 serious · reduced-motion on every animation · Lighthouse ≥ 90 (top-6)
- [ ] `security-review` 0 high/critical unresolved · PII masked everywhere
- [ ] money reconciles to TZS 0 drift · audit chain verifies end-to-end
- [ ] gold-discipline held (player + admin) · trilingual parity 1217³
- [ ] ⊘ assets wired (or explicitly deferred to Ali with a labelled slot)
- [ ] all 9 roles sign off · 0 open defects · tree clean · pushed to `main`

---

## 8 · Execution order (recommended)

1. **Phase A** (½ day) — freeze the inventory.
2. **Phase B** (test net) — hardens before we touch pixels.
3. **Phase C** (visual matrix) — the big sweep; fix as we read.
4. **Phase D + E** (a11y/perf + security/compliance) — in parallel where possible.
5. **Phase F** (enhancements + assets).
6. **Phase G** (final 9-role sign-off + lock).

Each phase ends with a committed batch-log entry (date · scope · gate result). **Nothing is "perfect" until a human has read the screenshot and every role has said yes.**

---

## 9 · Consistency & missing-controls audit (evidenced)

*The architect + QA lens over the current tree. Every finding has grep evidence.*

### 9.1 Same thing done differently in multiple places (unify → one primitive)
| Divergence | Evidence | Fix (single source) |
|---|---|---|
| **Modals/confirms** roll their own scrim + focus-lock + Esc | 16 files `createPortal`, only 9 use `useModalLock`; SettleConfirm (resolver), ConfirmDialog, typed-SEAL (ceremony), typed-PAUSE (kill-switch), KYC-reject sheet, cancel-refund, sell/bet — each bespoke | one `<Modal>` primitive (portal + lock + Esc + scrim + focus-trap) + one `<ConfirmModal tier="medium|hard" typedWord?>` — all confirms flow through it |
| **Two-officer / maker-checker** re-implemented per feature | resolve ceremony, `pack-actions`, `kyc-actions`, aml — each rolls audit-derived recommend→approve + self-block | one `twoOfficerGate({ subjectId, action, requireDistinctFrom })` server helper + one `<AttestationRail>` UI (already 3 near-identical rails) |
| **Money formatting** | `formatTzs`/`formatTzsCompact` in 28 files, but **127** raw `toLocaleString` on money in components | route all money through `formatTzs*`; ban raw `toLocaleString` on TZS via lint |
| **Period vocabularies** (4) | `analytics.Period` (today/7d/28d/qtd) vs `report-money.ReportPeriod` (today/7d/30d/mtd) vs reports PeriodPicker segments vs ad-hoc windows | one `Period` type + one `periodBounds()` (report-money already the seed); delete the analytics vocab |
| **Persisted admin config** pattern copy-pasted | ~9 modules repeat globalThis-cache + `ensureHydrated` + load/save (`market-config`, `affiliate-config`, `ai-ops-config`, `bonus-config`, `proposals-config`, `platform-config`, `payment-ops`, `test-overrides`, `ai-poll-config`) | one `defineConfig(key, defaults, validate?)` factory → get/set/hydrate for free |
| **Name resolution** | 41 occurrences of `displayName?.trim() || id` / `displayLabel(` / `officerName` / `nameOf` with different fallbacks | one `officerLabel(id)` / `playerLabel(id)` (handles system ids, masking, fallback) |
| **Risk/quality/confidence band → colour** | 12 near-identical good/med/bad threshold→colour maps (KYC risk ≥70, poll quality ≥80/≥50, confidence, health) | one `band(value, {good,warn})` → token; one `<ScoreBadge>` |
| **Sync-store `.catch` guard** | repeated `Promise.resolve(db.x()).catch` scattered (and the crashes when forgotten — hit twice this session) | make the in-memory `db.*` return Promises (true dev↔prod parity) so `await db.x()` is always safe |

### 9.2 Tags / tokens / terminology not consistent
- **Status wording drift** — 22 variants of "pending / awaiting review / needs review / co-sign required / awaiting 2nd / afisa wa pili / awaiting first signature" across admin queues; 15 variants of "selection closes / bets closed / betting closes". → one status-label lexicon (EN+SW) reused everywhere.
- **`ConfirmDialog` `Tone` still includes `gold`** — retire or repoint remaining callers (post the admin gold sweep, gold should be resolved-seal only).
- **KPI `tone`/`gold` prop plumbing** still exists in `admin-shell` though no screen passes it — either remove the dead branch or document it as the sanctioned-seal mechanism.
- **Chip variants** overlap semantically (`brand` vs `active` vs `info` vs `pending` are all royal-ish) — collapse to a documented set.
- **Category labels** — market categories are localized in some places, raw slug in others (e.g. resolver-queue shows `m.category` raw). → always via `CAT_LABEL`.

### 9.3 What admins need MORE control on (missing controls)
*Ranked by operator value / launch-readiness.*
1. **Platform maintenance mode** — a global "pause new bets / read-only" switch (today only per-MNO payment kill-switches exist).
2. **Configurable-not-hardcoded compliance knobs** — KYC maker-checker threshold (70), objection window (24h), KYC SLA (24h), reject reason-codes, void reasons, AML threshold (1M) are all hardcoded; surface them in `/admin/config` (flag-as-configurable was the mandate).
3. **Featured/pinned markets** — admins can't choose what `/live` hero or `/results` "notable" features (it's auto by contestedness); add a pin control (ties to Ali's carousel).
4. **Player-level controls** beyond suspend — adjust an individual's limits, force-reverify KYC, manual balance adjustment with reason (audited), resend comms.
5. **Broadcast / announcement** — no way to push an in-app notice or banner to players (outage, promo, new market).
6. **Report-pack: scheduled reports + the "Scheduled reports" list** (spec §1 has it; not built) — cadence, recipients, pause/delete.
7. **Reconciliation is view-only** — add manual "match / write-off with reason" for an unmatched ref (audited).
8. **Retry queue** — bulk retry/cancel; withdrawal retry (today deposit-only); auto-retry policy config.
9. **Market curation** — edit copy/source/resolution-criterion after publish (with audit); merge/duplicate detection; bulk actions.
10. **Bonus/promo scheduling** — start/end windows, targeting, budget caps (today it's manual grant + master switch).
11. **Officer directory / roles UI** — assign COMPLIANCE/MODERATOR roles, see who-can-do-what (RBAC is in code, no admin surface).
12. **Live ops** uses a **stub `matches` feed** — either wire a real feed or hide it (never show fabricated live matches in prod).

### 9.4 What could be done differently for better results
- **Ship the §9.1 primitives first** — the biggest quality lever: one Modal, one ConfirmModal, one AttestationRail, one config factory, one money-format rule. It removes whole classes of bug + inconsistency at once and makes every future screen faster + uniform.
- **Make the in-memory store async** — kills the recurring `.catch`-on-sync crash class and gives true dev↔prod parity.
- **A status-label lexicon** (EN+SW+ZH) — one file; every "pending/closes/awaiting" string comes from it. Kills terminology drift and half the i18n risk.
- **Materialise heavy aggregates** (payout-sum, stats-band, per-MNO health) before launch — today they full-scan the txn table.
- **Wire the ⊘ asset slots to a config** so Ali can drop images in `/admin` without a deploy.
- **Adopt `next build` + Lighthouse + axe-core in the gate** — the current gate proves "no overflow / no console error" but not perf/a11y budgets.
