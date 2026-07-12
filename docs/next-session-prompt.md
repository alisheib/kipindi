# 50pick / Kipindi — next-session opening prompt

> Paste this as the first message of the next session. It is the **single
> canonical handoff**. Read `docs/SESSION_STATUS.md` first (current state +
> gotchas), then `CLAUDE.md` (architecture). Last updated **2026-07-12** · HEAD
> ≈ the docs commit on `main` after the finalization sprint.

---

## 0 · First 5 minutes (do this before any task)
1. `cd C:\kipindi-main` · `git status` (clean) · `git pull --rebase origin main` (parallel sessions may have pushed).
2. **`npx prisma generate`** (a pull often leaves the client stale → phantom tsc
   errors like "field does not exist"; regenerating fixes it — not a code bug).
3. `npx tsc --noEmit` → clean · `npm run test:all` → **45/45**.
4. Read `docs/SESSION_STATUS.md`, then **`docs/responsiveness-audit.md`** (this
   sprint's spec) + the top of `docs/ui-rollout-tracker.md` (batch log).

## 1 · Where we stand (2026-07-12)
Feature-complete, launch-hardening. Live on Railway (`kipindi-production.up.railway.app`;
`www.50pick.tz` registered, not cut over). **All engineering finalization tracks are
DONE** (see §4). Green gates: tsc · `next build` · `test:all` **45/45** · i18n parity ·
`ui-regression` (now **320/360/740-landscape/768/1280/1920**, fresh) · `admin-grids-smoke`
**125/125** · **`test:responsive`** (new — exhaustive responsiveness gate) · `qa:live`.
`npm run perf:smoke` = the Phase-D perf baseline harness.

**✅ RESPONSIVENESS SPRINT (Lanes A–G) — COMPLETE + shipped (2026-07-12).** Every
surface × 9 breakpoints (320→1920 + landscape) × EN/SW/ZH + every overlay is
pixel-clean: **0 h-overflow, 0 clipped-not-scrolled, account menu reachable at
320, overlays fit landscape.** Built `scripts/responsive-audit.mjs` +
`npm run test:responsive`. It caught a class of bugs `overflow-x:clip` had hidden
(clipped account menu at 320, all `/auth/*` forms clipped off 320, admin filter/
report overflow, SW/ZH top-bar overflow) — all fixed. Results: player EN 1000/0,
player SW+ZH 2016/0, admin EN 972/0, overlays 15/15. Commits `e5d22dc · bd7d539 ·
9cd1739 · f2c4b05 · d77a85f`. Full record: `docs/responsiveness-audit.md` (§8
ticked) + `SESSION_STATUS.md` + `ui-rollout-tracker.md`. **Only follow-up:**
axe-core isn't installed in this local node_modules — re-run `WIDTHS=320,360 node
scripts/axe-audit.mjs` once deps are complete (changes were layout-only, so no new
a11y risk expected).

**NEXT SESSION:** the responsiveness mission is done — pick the next feature-backlog
item (the parallel session shipped F1 settlement-proof; F2 = 2FA + activity is
next per the backlog) OR address a launch-blocker in §4. There is no standing
autonomous responsiveness run anymore.

**This sprint's mission → FULL-PLATFORM RESPONSIVENESS AUDIT.** Every surface, at
every breakpoint, in every state and language, pixel-clean and fully usable —
pages, **popups, modals, dialogs, toasts, notifications, dropdowns, reports,
tables, forms, buttons, the bet dial — everything**; player AND operator. The
complete spec (breakpoints, surface inventory, overlay list, pass-criteria,
tooling, lane plan) lives in **`docs/responsiveness-audit.md`**. Drive it ONE
lane per verified batch (Lanes A→G), screenshot + READ every cell, fix on sight,
six-role sign-off (§4.5), commit + push.

## 2 · Paths — where things live (so nothing gets mixed)
**Repo root:** `C:\kipindi-main` (branch `main`; push = deploy). GitHub `alisheib/kipindi`.

| What | Path |
|---|---|
| App routes (player + public) | `src/app/**` (`markets`, `wallet`, `positions`, `leaderboard`, `profile`, `proposals`, `results`, `live`, `auth`, `fairness`, `help`, `legal`) |
| Admin console | `src/app/admin/**` (25 routes) |
| Server actions | `src/app/**/actions.ts` (co-located) |
| Production API routes | `src/app/api/**` (webhooks, og) |
| **Dev-test endpoints (404 in prod)** | `src/app/api/dev-test/**` (`seed-admin`, `seed-markets`, `seed-kyc`, `stress-money`, `resolve-seed-markets`, `auth/demo`…) |
| Server/business logic + DAL | `src/lib/server/**` (`market-service`, `wallet-service`, `payments.ts` ⚠mock, `prisma-dal.ts` + `store.ts` in-memory twin, `roles.ts`, `report-*`, `kyc-*`, `bonus-*`, **`platform-stats.ts`**, **`actor-label.ts`**, **`define-config.ts`**) |
| Admin status vocabulary (single source) | **`src/lib/admin-status-lexicon.ts`** (CEREMONY·SELECTION·LIFECYCLE·REVIEW + `bi()`) |
| Score→tone | **`src/lib/score-band.ts`** + **`src/components/admin/score-badge.tsx`** |
| Admin status badges | **`src/components/admin/status-badge.tsx`** (`MarketStatusBadge`, `KycStatusBadge`, `DsarStatusBadge`) |
| Money/number/date format | `src/lib/utils.ts` (`formatTzs`, `formatNumber`, `formatDate*`) |
| Design-system kit (atoms) | `src/components/ui/**` (`modal`, `tabs`, `input`, `date-select`, `time-select`, `select`, `button`, `chip`, `empty-state`, `glyphs`, `pagination`) |
| App shell / global chrome | `src/components/layout/**` (`app-shell`, `top-app-bar`, `bottom-nav`, `live-ticker`, `nav-more`, `avatar-menu`) |
| The bet dial | `src/components/markets/conviction-dial.tsx` (drag + 3 stake inputs + lock) |
| i18n dictionary (en/sw/zh) | `src/lib/i18n-dict.ts` — **never hardcode user-facing strings; keep parity** (`npm run test:i18n`) |
| Design tokens / CSS | `src/app/globals.css`, `src/app/state-tokens.css`, `src/styles/**` |
| Prisma schema | `prisma/schema.prisma` (prod Postgres; dev = in-memory `src/lib/server/store.ts`) |
| Tests (in `test:all`) | `scripts/*.test.mts` (45 `test:*` suites) |
| Responsive / E2E / perf harnesses (NOT in `test:all`) | `scripts/ui-regression.mjs`, `admin-grids-smoke.mjs`, `visual-matrix.mjs`, `responsive-overflow-test.mjs`, `overlay-responsiveness-test.mjs`, `chat-responsiveness-e2e.mjs`, `axe-audit.mjs`, `perf-smoke.mjs`, `*-e2e.mjs`, `pre-deploy-live-check.mjs` (=`qa:live`) · **build `responsive-audit.mjs` this sprint** |
| Docs | `docs/**` — handoff = this file; state = `SESSION_STATUS.md`; log = `ui-rollout-tracker.md`; **sprint spec = `responsiveness-audit.md`** |
| Screenshots (gitignored) | `.50pick-shots/` |

**Do not mix:** dev-test endpoints (`src/app/api/dev-test/**`) are 404 in prod —
never rely on them for prod behavior. Design *source* lives under `50PICK/` &
`Final UI enhancement Kit/`; *shipped* code is under `src/`.

## 3 · Cleanup status
- Working tree **clean**; in sync with `origin/main`. No stray temp scripts
  (delete verify scripts after use; screenshots go to gitignored `.50pick-shots/`).
- **Fresh-server gotcha:** `ui-regression` / responsive drivers need a genuinely
  fresh server — a dirty/seeded store from a prior live-drive causes false fails.
  Reset: `Stop-Process` the :3000 listener → `rm -rf .next/dev` → reboot → seed.
  A Turbopack `_Fragment`/segfault mid-run is a stale-cache artifact (Next-internal,
  not our code) — same reset fixes it. **Only one `next dev` per repo dir.**
- **Stop the dev server when done.**

## 4 · Open work

**✅ DONE — engineering finalization (2026-07-12, all shipped + live):**
- **Track 2 · consistency deep-pass (complete):** admin **status-lexicon** Families
  1–4 (`admin-status-lexicon.ts`; fixed the "Afisa wa pili" + "Selection Close"
  case drifts) · money → `formatTzs` (client **and** server, 77 sites, byte-proven)
  · `band()`+`<ScoreBadge>` · `officerLabel()/playerLabel()` · Chip variant set
  documented + de-duped · `defineConfig()` factory (bonus+proposals migrated).
- **Track 4 · materialize aggregates:** landing payout-sum → DB `sumConfirmedByTypes`
  + 60s cache; per-MNO health/reconcile → windowed `listSince` (byte-identical).
- **Track 1 · Phase C tail** (loading/error/empty + light-scheme resilience — verified) ·
  **Phase D perf** (baseline + `perf:smoke`; 2G background-shell lazy-split) ·
  **Phase G** (regression-lock all-green + 6-role EN/SW/ZH walk).
- Admin **"Back to app"** now lands on `/` (the hub), not the raw board.

**✅ DONE — full responsiveness audit (2026-07-12, Lanes A–G shipped + live):**
built `scripts/responsive-audit.mjs` + `test:responsive`; fixed the clip-class
bugs `overflow-x:clip` had hidden (320 account-menu clip via an 80px bell +
pill; all `/auth/*` + `/auth/admin` forms clipped off 320 via `grid
place-items-center`; wallet/proposals headers; invite/admin filter & report rows;
SW/ZH top-bar overflow; landscape notifications panel). Verified player EN 1000/0,
SW+ZH 2016/0, admin EN 972/0, overlays 15/15; ui-regression extended to
320+landscape. See `docs/responsiveness-audit.md`.

**BLOCKED on Ali (external — cannot finish without input):**
1. 🔴 **Real payment integration** — mock `src/lib/server/payments.ts` → BoT
   aggregator (Selcom/Azampay) behind `/api/webhooks/payments`. Needs credentials.
   *The single biggest go-live blocker.*
2. **MNO logos (4)** — official M-Pesa / Airtel Money / HaloPesa / Mixx-by-Yas
   marks → drop in `public/pay/` (`mpesa`,`airtel`,`halopesa`,`mixx`), then wire the
   4 paths in `src/components/wallet/payment-logo.tsx` (currently hued-initials
   placeholders). *This is the ONLY remaining art dependency — all icons are
   in-house SVG glyphs; hero/OG/favicons already real.* Regulator seal comes with
   the GBT license (never fabricated).
3. Real `SMS_SENDER_ID` (telco-registered) + license no. / TIN + `NEXT_PUBLIC_*`
   env in Railway — **never fabricate**.
4. **GLI certification** — `docs/gli-remediation-{plan,tracker}.md`.

**🔴 COMPLIANCE — before real money:** flip the **solo-resolution** toggle OFF
(`test-overrides.ts`; unlocked for a consultant, discipline-enforced now — POCA §16).

## 4.5 · SIX-ROLE SIGN-OFF GATE (Ali — mandatory) 🔒
**No change "passes" — no `git push`, no marking a lane/batch done — until it has
been reviewed and EXPLICITLY approved through ALL SIX expert lenses.** State it in
the commit body / batch-log (`6-role: ✓`). Never pass a change in dev without it.

1. **Graphic designer** — spacing, type scale, colour, iconography, hierarchy,
   brand-exactness; gold-discipline (player = earned-money/money-in; admin =
   resolved-seal only); deliberate alignment + rhythm.
2. **UI/UX engineer** — every page × state × width (**320→1920 + landscape**) ×
   locale (EN/SW/ZH) is pixel-clean: 0 h-overflow, no clipped-not-scrolled, touch
   targets ≥40px; overlays fit the viewport; a11y (focus-visible, labels,
   contrast ≥4.5:1, keyboard, SR); `prefers-reduced-motion` path.
3. **Professional art evaluator** — reads *premium + trustworthy*; empty/loading/
   celebration states delight and never cheapen a real-money product.
4. **Quality assurance** — exercised end-to-end (drive it, not just tsc); tests
   cover it; adversarial regression; all gates green on a FRESH server; 0 defects.
5. **Compliance engineer** — never-fabricate (only live data); RG on every money
   path; PII masked; audit-on-every-mutation; POCA/GBT/TRA/PDPA held.
6. **Theme-consistency engineer** — kit + tokens only (no one-off UI); ONE
   primitive per concern; status wording from the lexicon; consistent
   hover/active/focus/loading; variants match the documented set; no drift.

## 5 · Workflow & standing rules (Ali)
- **Commit AND push** every change (Railway auto-deploys). Full Railway CLI access.
- **Pull/fetch + rebase before push** (parallel sessions).
- Per surface/lane: read → change → `tsc` + relevant `test:*` → **live-drive with
  Playwright at 320 first, screenshot to `.50pick-shots/`, READ the shot** → the
  §4.5 six-role sign-off → commit + push → confirm the Railway deploy is green.
  Run `ui-regression`/responsive drivers on a FRESH server.
- **Never fabricate** legal/business/audit data or history — flag placeholders.
- **Production shows only live data**; UI hides/empties when aggregates are empty.
- **Gold-discipline:** player = earned-money/money-in only; admin = resolved seal only.
- Reuse the kit; no one-off UI. Motion must be genuinely polished or not shipped.
- **Byte-identical discipline:** when a change should be visually invariant, prove
  it (byte/pixel) rather than assert it.

## 6 · Living doc — UPDATE BEFORE YOU END THE SESSION
Keep this file true — it's the single continuation point.
1. Update **§1 (where we stand)** with what landed and the current mission.
2. Update **§2 PATHS** if any route/component/service/doc was added/moved/renamed.
3. Update **§4** — move finished items to DONE, add new findings (ranked).
4. Tick the **`responsiveness-audit.md` §8 checklist**, mirror state into
   `SESSION_STATUS.md`, append a batch-log entry to `ui-rollout-tracker.md`.
5. Confirm a clean tree (`git status`), stop the dev server, then hand Ali the
   refreshed copy-paste version of this prompt.
