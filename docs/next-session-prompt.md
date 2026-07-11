# 50pick / Kipindi — next-session opening prompt

> Paste this as the first message of the next session. It is the **single
> canonical handoff**. Read `docs/SESSION_STATUS.md` first (current state +
> gotchas), then `CLAUDE.md` (architecture). Last updated 2026-07-11 · HEAD
> after this session ≈ the docs commit on `main`.

---

## 0 · First 5 minutes (do this before any task)
1. `cd C:\kipindi-main` · `git status` (should be clean) · `git pull origin main`.
2. **`npx prisma generate`** (a pull often leaves the client stale → phantom tsc
   errors like "field does not exist"; regenerating fixes it — not a code bug).
3. `npx tsc --noEmit` → must be clean. `npm run test:all` → must be **45/45**.
4. Read `docs/SESSION_STATUS.md`. If starting UI work, skim `docs/ui-rollout-tracker.md`
   (newest batch-log entry at the top of its "Batch log" section).

## 1 · Where we stand (2026-07-11)
Feature-complete, hardening for launch. Live on Railway (`kipindi-production.up.railway.app`;
`www.50pick.tz` registered, not cut over). Green gates: tsc · build · `test:all` 45/45 ·
i18n parity **1220³** · `ui-regression` 158/158 (fresh) · `admin-grids-smoke` 125/125 ·
`qa:live` gauntlet. Admin console fully built (ADM1–4). Recent sessions: perfection-plan
Phase B/D + §9.1/§9.3, a discovery-audit sprint (never-fabricate/correctness/gold-discipline
fixes), compact `DateSelect`, and the **lockable bet dial** (greyed-when-locked, button-only unlock).

## 2 · Paths — where things live (so nothing gets mixed)
**Repo root:** `C:\kipindi-main` (branch `main`; push = deploy). GitHub `alisheib/kipindi`.

| What | Path |
|---|---|
| App routes (player + public) | `src/app/**` (e.g. `src/app/markets`, `wallet`, `positions`, `leaderboard`, `profile`, `auth`) |
| Admin console | `src/app/admin/**` |
| Server actions | `src/app/**/actions.ts` (co-located with the route) |
| Production API routes | `src/app/api/**` (real: webhooks, og; the rest) |
| **Dev-test endpoints (404 in prod)** | `src/app/api/dev-test/**` (`seed-admin`, `seed-markets`, `seed-wallet`, `stress-*`, `reset-rate-limits`, `auth/demo`) |
| Server/business logic + DAL | `src/lib/server/**` (`market-service`, `wallet-service`, `payments.ts` ⚠mock, `prisma-dal.ts`, `roles.ts`, `report-*`, `kyc-*`, `bonus-*`) |
| Design-system kit (atoms) | `src/components/ui/**` (`modal`, `tabs`, `input`, `date-select`, `select`, `button`, `chip`, `empty-state`, `glyphs`, `pagination`) |
| Brand/motion vocabulary | `src/components/brand.tsx` |
| Feature components | `src/components/{markets,wallet,positions,proposals,rg,profile,admin,layout,onboarding}/**` |
| The bet dial | `src/components/markets/conviction-dial.tsx` (large; drag + 3 stake inputs + lock) |
| i18n dictionary (en/sw/zh) | `src/lib/i18n-dict.ts` — **never hardcode user-facing strings; keep parity** (`npm run test:i18n`) |
| Design tokens / CSS | `src/app/globals.css`, `src/app/state-tokens.css`, `src/styles/**` |
| Prisma schema | `prisma/schema.prisma` (prod Postgres; dev = in-memory store `src/lib/server/store.ts`) |
| Tests (unit/integration, in `test:all`) | `scripts/*.test.mts` (44 `test:*` suites; run via `npm run test:*`) |
| E2E / verification (Playwright, NOT in the gate) | `scripts/*-e2e.mjs`, `scripts/ui-regression.mjs`, `scripts/dial-lock-verify.mjs`, `scripts/pre-deploy-live-check.mjs` (=`qa:live`) |
| Docs (this handoff + plans + audits) | `docs/**` |
| Design source archives (reference only) | `Final UI enhancement Kit/`, `50PICK/**` |
| Screenshots (gitignored scratch) | `.50pick-shots/` |

**Do not mix:** dev-test endpoints & seeds are `src/app/api/dev-test/**` and are
404 in prod — never rely on them for prod behavior. Design *source* lives under
`50PICK/` & `Final UI enhancement Kit/`; the *shipped* code is under `src/`.
The canonical planning docs are `SESSION_STATUS.md` (state) + this file (handoff)
+ `ui-rollout-tracker.md` (log) — ignore the two superseded next-session docs.

## 3 · Cleanup status (as of this handoff)
- Working tree is **clean** (`git status` empty). The previously-untracked
  `50PICK/New Designs/` (Positions Portfolio design source) is now archived/committed.
- No stray temp scripts. Screenshots go to gitignored `.50pick-shots/`.
- Dev server: **stop it when done** (`Stop-Process -Id (Get-NetTCPConnection -LocalPort <port> -State Listen).OwningProcess -Force`). Only one `next dev` per repo dir.

## 4 · Open work — the FINALIZATION PLAN (drive to 100%; ranked)

**DONE (2026-07-11→12):** Phase E security/compliance/money-safety — TWO full
audit rounds, **15 findings fixed** (1 CRITICAL cash-out race, 4 HIGH incl.
non-resumable settlement + MODERATOR void escalation, + MED/LOW), each money fix
carrying a red-without-fix regression test · compliance-H2 (GBT pack calendar
month) · Track-3 fast-follows (chat-ticket honesty, fairness officer-id leak,
deposit idempotency, cash-out conservation clamp, affiliate off the bet-lock,
AI-batch rate-limit) · one consistency win (retired the dead confirm `gold` tone)
· **Phase C visual matrix** player 324/324 + admin 132/132 automated + ~18 human-read
(zero defects) · sentinel run progress-loader. Full record: `docs/PHASE_E_AUDIT_2026-07-11.md`.

**REMAINING (our work — no external inputs; ranked):**
1. **Track 2 · consistency deep-pass** (`docs/consistency-audit.md` + perfection-plan §9).
   Each is a shared-code refactor → do ONE per batch with visual re-verification:
   status-label lexicon (EN/SW/ZH — one source for pending/closes/awaiting) ·
   ban raw `toLocaleString` on money (route through `formatTzs`) · `band()`/`<ScoreBadge>` ·
   `officerLabel()/playerLabel()` · collapse overlapping Chip variants · one config factory.
2. **Track 1 · Phase D perf** — Lighthouse ≥90 on the top-6 pages, bundle-size budget, a 2G/CPU-throttled smoke.
3. **Track 1 · Phase C tail** — seed the loading/error/edge states + a light-mode spot-check.
4. **Track 4 · materialize heavy aggregates** — payout-sum, stats bands, per-MNO health (full-scan today).
5. **Track 1 · Phase G** — final 9-role sign-off walk on a fresh player+operator, EN/SW/ZH; regression-lock.

**BLOCKED on Ali (external):**
6. 🔴 Real payment integration — mock `src/lib/server/payments.ts` → BoT aggregator (Selcom/Azampay) behind `/api/webhooks/payments`. Needs credentials.
7. Confirmed `SMS_SENDER_ID` (telco-registered) + real license/TIN + `NEXT_PUBLIC_*` env in Railway — **never fabricate**.
8. **⊘ Bitmap assets** (hero, banners, category art, texture, win-seal, 4 MNO logos, regulator seal) — code slots ready.
9. **GLI certification** — `docs/gli-remediation-{plan,tracker}.md`.

**Fast-follows still open** (in `docs/PHASE_E_AUDIT_2026-07-11.md` §Re-evaluation): none blocking — all HIGH/MED closed; only stylistic/low items remain.

## 5 · Workflow & standing rules (Ali)
- **Commit AND push** every change (Railway auto-deploys). Full Railway CLI access here.
- Per screen/feature: read → change → `tsc` + relevant `test:*` → **live-drive with
  Playwright, screenshot to `.50pick-shots/`, and READ the shot** (360 first) →
  commit + push. Gate on a FRESH server for `ui-regression` (see SESSION_STATUS gotchas).
- **Never fabricate** legal/business/audit data or history — flag placeholders for Ali.
- **Production shows only live data**; UI hides/empties when aggregates are empty.
- **Gold-discipline:** player = earned-money/money-in only; admin = resolved seal only.
- Reuse the kit; don't invent one-off UI. Motion must be genuinely polished or not shipped.

## 6 · Living doc — UPDATE THIS BEFORE YOU END THE SESSION
This file is the single continuation point — keep it true so the next session
knows exactly where to pick up. Before ending a session:
1. Update **§2 (where we stand)** with what landed.
2. Update **§2's PATHS map** if you added/moved/renamed any route, component,
   service, or doc — so paths never drift or get mixed.
3. Update **§4 (open work)** — remove done items, add new findings (ranked).
4. Mirror the state into `docs/SESSION_STATUS.md` and append a batch-log entry to
   `docs/ui-rollout-tracker.md`.
5. Confirm a clean tree (`git status`), stop the dev server, then hand Ali the
   refreshed copy-paste version of this prompt.
