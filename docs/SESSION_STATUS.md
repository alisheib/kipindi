# 50pick / Kipindi — Session status & handover

**Updated:** 2026-07-11 (Phase E audit) · **Branch:** `main` · **HEAD:** see `git log -1`
**Live:** https://kipindi-production.up.railway.app (Railway auto-deploys on push to `main`; custom domain `www.50pick.tz` registered but **not cut over** — DNS pending).

> This is the **read-first** doc. It's a current-state snapshot + the launch
> blockers + the gotchas that have bitten us. Deep history lives in git and in
> `docs/ui-rollout-tracker.md` (batch-log). Architecture bible = `CLAUDE.md`.
> To start the next work session, open **`docs/next-session-prompt.md`**.

---

## 1 · What this is
A **licensed real-money** pool-based prediction-market platform for Tanzania
(Gaming Board of Tanzania). Players stake TZS on YES/NO market questions settled
by official sources; the house takes a fee; winners share the pool. Trilingual
(EN/SW/ZH). Next.js 16 · React 19 · TypeScript · Prisma · Postgres (prod) /
in-memory store (dev). Prod flag `USE_PRISMA_DAL=true` on Railway.

## 2 · Current state (feature-complete, hardening for launch)
The platform is **feature-complete and passing its gates**. Recently landed:

- **Phase E — security/compliance/money-safety audit (2026-07-11)** — 6 findings
  fixed & shipped incl. a 🔴CRITICAL money race (`cashOutPosition` now holds the
  `market:` lock), THEN money-H1 (withdrawal idempotency), money-M2 (affiliate
  reward lock+sourceRef) — each with a red-without-fix concurrency test (case E,
  F) — and compliance-H2 (GBT pack reports its calendar month, not rolling 28d).
  **Every actionable Phase E finding is now fixed.** Still open ONLY because they
  need Ali/credentials/policy: payments MOCK (P0), withdrawal-tax-on-principal ⚠.
  Full record: **`docs/PHASE_E_AUDIT_2026-07-11.md`**.
- **Sentinel run progress-loader (2026-07-11, Ali)** — admin "Run now" shows a
  theme-kit loader (spinner + phased progress bar → burst-result card).
- **Phase C visual matrix (2026-07-11)** — `scripts/visual-matrix.mjs`. Player:
  9 routes × en/sw/zh × 4 widths = **108 cells 324/324 auto** + 7 read. Admin
  (`SURFACE=admin`): 11 routes × EN/SW × 360/1280 = **44 cells 132/132 auto** + 4
  read. **Zero defects both surfaces.** Next Phase C slice: below-fold full-page
  reads + per-state seeding (loading/error/edge).

- **Admin console fully built** — ADM1 regulator-pack maker-checker signing chain,
  ADM2 two-officer resolution ceremony, ADM3 KYC/AML workstation, ADM4 payments
  ops (per-MNO health + kill-switches + reconciliation + retry). GGR reconciled to
  Stakes−Payouts everywhere. Full admin gold-discipline sweep (gold = resolved seal only).
- **Perfection-plan pass (2026-07-10)** — Phase B test net (`npm run test:all`:
  money-invariants + concurrency), §9.1 primitives (one `<Modal>`/`<ConfirmModal>`,
  one money-format rule, `appUrl()`), §9.3 admin controls (platform maintenance mode,
  broadcast banner), Phase D a11y (axe 0 serious/critical across 22 routes).
- **This session (2026-07-11)** — discovery-audit sprint + two Ali requests:
  - never-fabricate: removed the leaderboard's synthesized "consensus" chart +
    prod-gated the synthetic sample board (real empty state in prod).
  - correctness: 4 admin handlers no longer report false success on failed writes.
  - gold-discipline: wallet tabs → kit `Tabs` (killed a gold underline).
  - home hero YES/NO → tokens.
  - compact `DateSelect` variant → adopted on `/admin/ai-usage` (last raw date inputs gone).
  - **lockable bet dial** — the drag defaults LOCKED and the dial renders
    **greyed/inactive**; **only the royal "Unlock" button** activates it (tapping
    the dial never unlocks — it just pulses the button). Exact-type inputs stay
    live at all times, so exact stakes can't be knocked by a stray touch. Verified
    `scripts/dial-lock-verify.mjs` 24/24 (YES+NO).

**Green gates (do not regress):** `tsc` · `next build` · `npm run test:all`
**45/45** (money/security/concurrency/i18n) · i18n parity **1220³** (en=sw=zh) ·
`scripts/ui-regression.mjs` 360/768/1280/1920 · `admin-grids-smoke` 125/125 ·
pre-deploy gauntlet `npm run qa:live`.

> **Note — rare `/markets` hydration warning (investigated 2026-07-11):** one
> ui-regression run showed a transient hydration mismatch on `/markets` (6–9 flaky
> "fails"). Investigated hard: **not reproducible** in 26 isolated loads (warm,
> cold-compile, authed) nor in two consecutive fresh-server runs (both **158/158**).
> The board is a server component, so its `Date.now()` bakes into the HTML and
> cannot cause a hydration mismatch — the earlier "seed `now`" hypothesis was
> wrong. Conclusion: a **rare dev-only timing artifact under load**, not a prod
> bug — do NOT speculatively patch the money-adjacent board. Always run the gate
> on a genuinely FRESH server (per the ui-regression gotcha). **If it recurs,
> capture the FULL React hydration diff (the specific element/attribute) first**,
> then fix that element — don't guess.

## 3 · How to run / test / deploy (essentials — full detail in CLAUDE.md)
- **Local dev (in-memory, no prod risk):**
  `SESSION_SECRET=<32+> OTP_PEPPER=<16+> NODE_ENV=development DISABLE_ADMIN_TOTP=true npx next dev -p 3000`
  → `GET /auth/demo` = 100k authed player session (404 in prod). Admin:
  `POST /api/dev-test/seed-admin {"phone":"+255700000000"}`.
- **Only ONE `next dev` per repo dir** (Next enforces it). Seed markets:
  `POST /api/dev-test/seed-markets`. Other seeds: `stress-money`, `proposals-seed`,
  `seed-candidates`, `seed-ai-polls`, `seed-kyc`.
- **Gate before deploy:** `npx tsc --noEmit` · `npm run test:all` · then
  `BASE=http://localhost:<port> node scripts/ui-regression.mjs` (needs a FRESH
  server — see gotchas) · `npm run qa:live` (pre-deploy gauntlet).
- **Deploy:** `git push origin main` → Railway auto-deploys (~3–6 min; `start`
  runs `prisma migrate deploy` first). Verify with `railway deployment list` /
  `railway logs`. **Push norm for this repo: commit AND push** (per CLAUDE.md).

## 4 · Launch blockers & open items
1. **🔴 P0 — payment provider is a MOCK.** `src/lib/server/payments.ts`
   (`dispatchDeposit` always CONFIRMED, `dispatchWithdrawal` always succeeds) has
   NO real BoT-licensed aggregator (Selcom/Azampay) behind the webhook path. In
   prod this moves no real money. **Postponed by Ali**, but it is the single
   biggest go-live blocker — needs the real integration + credentials.
2. **⊘ Bitmap assets (Ali's pipeline):** `hero-bg.webp`, propose/bonus/invite
   banners, category `*.webp`, navy-weave texture, `win-seal.png`, the 4 official
   MNO logos, the regulator seal. All are drop-in-ready code slots.
3. **Legal/business values are placeholders — never fabricate:** license no.
   (`TZ-GBT-2026-XXXX (pending)`, footer reads `NEXT_PUBLIC_LICENSE_REF`), TIN,
   SMS sender ID (`"KIPINDI"`, env `SMS_SENDER_ID` — telco-registered, confirm
   before flipping), reports "50pick Africa" vs "50pick". Set in Railway at launch.
4. **GLI certification** — see `docs/gli-remediation-plan.md` / `gli-remediation-tracker.md`.
5. **Stale dev-tool e2e scripts** — `scripts/dial-*-stress-e2e.mjs` + broader
   `betting-*/qa-killer/sprint*` scripts self-register and `page.fill` a DOB field
   that is now a `DateSelect` (hidden), so they die at registration. NOT in any
   gate (the gate is `qa:live`). Reviving = DateSelect-DOB entry + arm-the-dial;
   deferred maintenance.

## 5 · Risk register / gotchas (carry forward — these have bitten us)
- **After `git pull`, run `npx prisma generate`** before trusting `tsc`. Schema
  changes arrive via pull but the client isn't regenerated → false "field does not
  exist" errors (hit 2026-07-11 with `selectionCloseDate`). Not a code bug.
- **Prod-only bugs the dev in-memory store hides:** the dev store is a sync
  Promise-chain mutex; real Postgres behaves differently. The 2026-07-02/03 login
  outage was a `pg_advisory_xact_lock` bug invisible in dev — (1) Prisma binds JS
  numbers as **bigint**, PG needs `::int` casts (SQLSTATE 42883); (2) `void`-returning
  PG funcs need **`$executeRaw`**, not `$queryRaw`. **For digest-only prod 500s,
  read `railway logs` first** — it shows the real stack.
- **`ui-regression.mjs` needs a genuinely FRESH server** (158/158). A dirty store
  from prior live-drives fails its `/auth/demo` setup; a stress-seeded store throws
  dozens of false `navigator.vibrate` console-error fails. Reset: `Stop-Process`
  the port's listener → `rm -rf .next/dev` → reboot. **Never** `taskkill //IM
  node.exe` (kills parallel sessions; it's blocked).
- **Dev store is SYNC** — some `db.*` return values not Promises; wrap
  `await Promise.resolve(db.x()).catch(...)` where async parity matters.
- **First cold-compile of a new page ~30s (Turbopack)** — bump Playwright `goto`
  timeouts to 40s.
- **Testing overrides default OFF in prod** — solo-resolution + payment kill-switches.

## 6 · Standing directives (Ali)
- **Never fabricate** legal/business/audit data or history — flag placeholders.
- **Production shows ONLY live data**; UI hides/empties when aggregates are empty.
- **Commit AND push** always (this repo). Full Railway CLI access granted here.
- **Gold-discipline:** player = earned-money / money-in only; admin = resolved seal only.
- **Visual-test every UI change** (screenshot + read) at 360 first, then up.
- **Motion must be genuinely polished** or not shipped.

## 7 · Key docs map
- `CLAUDE.md` — architecture bible (routes, DAL, roles, invariants).
- `docs/next-session-prompt.md` — **the handoff prompt for the next session.**
- `docs/ui-rollout-tracker.md` — per-batch work log (newest at top of Batch log).
- `docs/perfection-plan.md` — the 0-issue launch plan (phases A–G).
- `docs/gli-remediation-{plan,tracker}.md` — certification gaps.
- Audits: `ADMIN_VIEW_AUDIT_*`, `PLAYER_VIEW_AUDIT_*`, `ARCHITECTURE_AUDIT_*`.
- `docs/PHASE_E_AUDIT_2026-07-11.md` — the security/compliance/money-safety audit
  (6 fixed findings + the ranked flagged list for the next session).
