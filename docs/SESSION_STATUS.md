# 50pick — Session status & handover (2026-06-14)

Latest commit on `main`: see `git log -1`. Live at https://kipindi-production.up.railway.app
(custom domain `www.50pick.tz` is registered on Railway but **not in use yet** — DNS/cutover pending).

---

## ✅ Data layer — Postgres is the source of truth

All **entity data** runs on Prisma/Postgres in production. Each DAL uses the hardened gate
`const usePrisma = hasDatabase() && process.env.USE_PRISMA_DAL !== "false"` (Prisma whenever a
`DATABASE_URL` exists — no flag footgun). `store.ts` also **hard-locks production**: if
`NODE_ENV=production` and no `DATABASE_URL`, the app **throws at startup** rather than serve from
memory.

DB-backed (verified against the real prod DB this session):
- **store.ts** (`db`): user, kyc, otp, wallet, txn, responsible, bet, notification, sourceOfFunds,
  affiliate, referralReward, proposal, proposalVote. (14 users, 11 KYC, 150 txns, 6 affiliates live.)
- **market-dal.ts**: markets (`PredictionMarket`) + positions. (89 markets, 43 positions live.)
- **comments-store.ts**, **market-candidate.ts** (7 candidates), **house-pool.ts** ledger.

In-memory **fake** retained ONLY for unit tests / local dev with no `DATABASE_URL` (the test
suites use fixed-id records + a wipe-on-run store, so they can't share a persistent DB). It can
never serve production traffic (guard above).

### ✅ Audit → Postgres — DONE (this session)
- `audit()` now persists every entry to the `AuditLog` table (async, fire-and-forget, one retry,
  `entryHash @unique` for idempotency). The in-memory ring is a **write-through cache**; on boot it
  rehydrates from `AuditLog` in chain order by walking the `prevHash` links → the HMAC chain
  **continues across restarts/deploys** instead of being lost. Writes funnel through a serialized
  queue so the chain head can't fork under concurrent callers. Added `prevHash`/`entryHash` columns
  (migration `20260614190000_audit_chain_persist`) and **dropped the `actorId`→User FK** (an
  append-only log must never fail to write or cascade-delete when the actor is missing/erased).
  `verifyChain` now anchors to the window's first `prevHash` (fixes a latent false-BROKEN past 10k
  entries). Reads stay synchronous over the ring. New `test:audit` (15 assertions) in `predeploy`.

### ⚠️ STILL in-memory (NOT yet on the DB) — next-session work
- **Configs** (`affiliate-config.ts`, `market-config.ts`, `ai-poll-config.ts`): held on
  `globalThis` → **admin-saved settings reset to defaults on every deploy.** Persist to DB.
- **AI-poll generated content** (`ai-poll-generation.ts`): in-memory Map.
- **house-pool balance / seeds** (the ledger IS on DB; the running balance + per-market seeds are
  ephemeral state).
- `auth-service` `pendingRegistration` (transient OTP intent — fine to stay in-memory).

---

## Prod environment (Railway — project "50pick", service online)
- `USE_PRISMA_DAL=true`, `DATABASE_URL` set (internal). Public proxy URL is on the Postgres service
  (DATABASE_PUBLIC_URL via `turntable.proxy.rlwy.net`).
- `SESSION_SECRET` + `OTP_PEPPER` — **rotated to strong random values this session** (were the
  literal placeholder `PASTE_YOUR_GENERATED_VALUE_HERE` → forgeable sessions; now fixed).
- `NEXT_PUBLIC_APP_URL=https://kipindi-production.up.railway.app` (the domain actually used).
- `POSTMARK_API_KEY` set. **Postmark CONFIRMED working** (read-only API: DeliveryType "Live", 79
  msgs, KYC-admin emails Status "Sent"). Email delivery is fine. The real gap was that a KYC
  **submitter with no email** gets no player-facing emails (documents-received / approved go to the
  submitter's address). → **Fixed: the email field at the KYC step is now REQUIRED.** Note: the
  admin "New KYC to verify" goes to admin-role accounts / `KYC_NOTIFY_EMAILS`; if it's not seen,
  check the Gmail Spam/Promotions tab.
- 8 Prisma migrations applied, schema "up to date". Migrations run on every deploy (`start` script).

---

## What shipped this session (high level)
- **KYC notifications**: submit → player "documents received" + all-admin emails + **in-app alert
  in the main bell** (the separate admin bell I'd wrongly added was removed); approve/reject/
  request-more-info emails; **email-address verification** (signed token → `/auth/verify-email`);
  **extra-document requests** (admin asks with descriptions, player uploads, admin views).
- **Identity uniqueness**: NIDA (scan all submissions) + phone enforced; **email uniqueness
  TEMPORARILY DISABLED** for testing (clearly commented in `email-verification.ts` → re-enable
  before launch).
- **Admin email deep link** threads `next` through proxy → login → TOTP (open-redirect-guarded).
- **Admin UI**: consistent 36px filter rows everywhere; affiliate + proposals moved onto the shared
  admin shell; reports — the 3 "coming soon" reports (kyc-reverify, rg-engagement, match-integrity)
  are **built for real**; KYC tab goes gold when unapproved; removed stub two-person buttons.
- **Toasts**: swipe-up (iPhone-style) + horizontal dismissal.
- **Reality-check**: session timer now keyed per-user (was leaking across accounts on one device).
- **Markets**: expired markets no longer show a LIVE badge on `/live` + home; **officers get a
  one-time in-app alert when a real market closes awaiting resolution** (`resolutionNotifiedAt`);
  demo markets auto-resolve on expiry; real markets stay manual (two-officer).
- **5 verified bugs fixed**: DSAR export missing `await` (×2 → downloaded empty), AML reject lacked
  the dedup lock (double-refund), nav active-key missed privacy/retention, fake-success report
  buttons.

---

## Test status — all green
- **Unit (tsx, in-memory fake)**: kyc-review 15 · kyc-submit-notify 31 · kyc-flow-stress 59 ·
  kyc-security 12 · market-resolution-notify 13 · date-mask 31.
- **Browser (vs local server)**: gauntlet 133 · admin-smoke 54 (all 27 admin pages) · full-flow 21 ·
  admin-mobile 15. Responsiveness: 13 pages × {360,768,1440} = 39 clean.
- **Validated against the REAL prod Postgres**: full-flow 21, admin-mobile 15, gauntlet 133,
  smoke 54 all PASS on Prisma; read-mapper smoke clean.
- `tsc --noEmit` clean, `next build` clean.

Run locally: `npm run typecheck`, `npm run test:kyc` (review+notify+stress+security), e2e scripts
need a dev server on :3009 (`npx next dev -p 3009`) then `BASE=http://localhost:3009 node scripts/<x>.mjs`.

---

## NEXT SESSION — prioritized
1. ~~**Audit → Prisma**~~ — ✅ DONE this session (see "Audit → Postgres" above). After the next
   deploy, sanity-check `/admin/audit` shows entries surviving a redeploy and chain integrity reads
   "Valid".
2. **Config persistence** — affiliate/market/ai-poll configs survive deploys.
3. **Email delivery** — verify Postmark sender/domain; do one real send to confirm KYC-approved mail
   actually arrives; then **re-enable email uniqueness**.
4. **CI** — wire `predeploy` (typecheck + tests + build + gauntlet) into GitHub Actions; add
   `test:markets`. Right now quality depends on running suites by hand.
5. **Real-money P0s** (pre-launch): real NIDA API (currently mock), KYC docs → object storage +
   signed URLs (currently base64 inline), magic-byte/EXIF image validation, tighten raw-doc viewing
   to COMPLIANCE only.
6. (Optional) delete the in-memory store entirely once unit tests move to a throwaway DB.

**User plan:** the DB will be **formatted and re-run from scratch before going live** — current
prod rows are test data; pollution from testing is expected/fine.

---

## 🐛 Bug-hunt backlog (2026-06-14) — VERIFIED in source, NOT yet fixed

A 5-subsystem audit (wallet/payments, betting/markets, KYC/AML, auth/security, data-layer)
ran this session. **6 fixed + pushed** (2 CRITICAL: AML-approve hold leak, KYC reject enum;
1 HIGH: VOID reserve-fee mint; 2 MEDIUM: open-redirect backslash, maxStake<minStake; see
git log). The following are **confirmed real** but left for a decision / larger work:

**Blocker (feature gap)**
- **Source-of-Funds has no approve/reject path.** SOF is created `PENDING`; the deposit gate
  requires `ACCEPTED` (wallet-service.ts:85); nothing anywhere sets ACCEPTED/REJECTED — the
  approvals page only displays. Any depositor who trips the SOF threshold (≥1M single / ≥5M
  30-day) is **permanently blocked** with no operator remedy. Needs an officer review action + UI.

**Payments (latent behind the mock provider, real before live money)**
- Deposit credits the wallet on provider `status:"PENDING"` (wallet-service.ts ~139) — only the
  mock's always-CONFIRMED hides it. A real async-collection provider → phantom credit.
- Webhook (`api/webhooks/payments/route.ts`) verifies the signature but does **no settlement and
  has no idempotency key** → async confirms never reconcile; add `providerRef` dedup before going live.

**Concurrency / integrity**
- `locks.ts withLock` is an **in-process Map mutex** — a no-op across >1 instance; wallet/pool
  writes are absolute (`balance: newBalance`), not atomic `{ increment }`. Safe only if prod is
  provably single-instance. Recommend Prisma atomic increments + a Postgres advisory lock.
- **NIDA uniqueness** has no DB backstop (only an unlocked `kyc.list().find`) → TOCTOU multi-account
  on one national ID. Add a partial `@unique` (non-rejected) and/or `withLock(nida:…)`.
- **Two-person AML** reads the stage-1 signature from the in-memory ring (`getAuditPage` last 200
  ADMIN) → a stale sig past the window can't complete the release. Now that audit persists to
  Postgres, query `AuditLog` by `targetId`+`action` instead (or a dedicated cosignature table).

**Security / compliance**
- **Admin TOTP is a page-render gate only** — admin server actions and `/api/admin/*` check role
  but not the `kp_admin_totp` cookie, so 2FA doesn't protect privileged mutations (RBAC still does).
  Add a shared `requireAdminWithTotp()` and call it from mutating admin actions/routes.
- **Email-uniqueness disabled** + Postgres `email @unique` still live → duplicate-email write throws
  P2002 as an **unhandled 500** in `updateProfileBasicsAction` (silently swallowed in `submitNidaStep`).
  Resolve together with priority #3 (re-enable uniqueness) — decide: catch P2002 + friendly error, or
  drop the constraint while testing.
- Weekly/monthly deposit-limit **increases take effect immediately** — only the daily limit has the
  24h deferral (responsible-gambling.ts). RG/LCCP gap.
- Doc upload validates **declared MIME only, no magic-byte check** (impact limited by `nosniff`).
  Overlaps the real-money P0 list.

**Correctness / data**
- Deposit-limit & SOF 30-day aggregation is capped at the **last 500 txns** (`findByUser(...,500)`)
  → a high-frequency user can push qualifying deposits past the cutoff and undercount the rolling
  sum, slipping under the gate. Use a time-bounded `SUM` query.
- `kyc.upsert` **drops documents when the patch carries an empty `documents` array**, and resolves a
  user's submission by most-recent while upserting by id — fragile if a user ever has >1 submission.
- Bet read-mapper **fabricates labels** in prod (`matchLabel:"Match a1b2c3"`, blank league) for legacy
  sports bets (prisma-dal.ts ~201); memory store keeps the real snapshots. Display-only, legacy path.
- **Side-lock/single-side invariant is client-only** (dial); server `buyPosition` accepts the opposite
  side, and the market page docs *say hedging is allowed* — spec contradiction, needs a product call.

**Low**
- TOTP setup-verify has no rate limit (login TOTP does); TOTP codes are replayable within their
  window (documented accepted tradeoff).
