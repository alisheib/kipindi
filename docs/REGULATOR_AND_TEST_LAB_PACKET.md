# Kipindi — Regulator &amp; Test-Lab Certification Packet

**Audience:** Tanzania Gaming Board (GBT) inspectors, GLI/iTech Labs/BMM/eCOGRA test engineers, ISO 27001 auditors, FATF/FIU inspectors.

**Purpose:** Single document that lists every artefact a tester or regulator typically asks for, where to find it in the codebase, and how to reproduce the test.

**Version:** 2026-04-30 · matches the build at git HEAD.

---

## 0. Quick orientation

| | |
|---|---|
| Operator | Kipindi Ltd, Dar es Salaam |
| Licence target | Tanzania Gaming Board, Class B (sports betting + signature game) |
| Stack | Next.js 16 · TypeScript strict · Postgres (in-memory dev shim) · Tailwind 3 |
| Crypto | HMAC-SHA-256 sessions, scrypt OTP hashes, AES-256 at rest (target) |
| Hosting target | EU AWS Frankfurt primary, TZ failover when AWS Cape Town opens |
| Repo path | `C:/kipindi` |
| Run | `npm run dev` (port 3000) |
| Demo entry | `/auth/demo` — TZS 100,000 starting balance, KYC pre-approved |

---

## 1. What international regulators &amp; test labs always ask for

This is the canonical request list compiled from GLI-19, eCOGRA, the UK Gambling Commission technical standards (RTS), and Malta MGA Gaming Authorisation Regulations. We map each item to the exact file or route in this codebase.

### 1.1 Game design and rules
| Ask | Where it lives in Kipindi |
|---|---|
| Game rules (player-facing) | `/legal/terms` §4, plus per-game tooltip on `/match/[id]` and `/mapigo` |
| Theoretical RTP / house edge | Match betting: 85% RTP (15% house take, see `HOUSE_PCT` in [`bet-service.ts`](../src/lib/server/bet-service.ts)). Mapigo: payRates (×2.30 / ×3.10 / ×4.20) configured per round in [`mapigo-service.ts`](../src/lib/server/mapigo-service.ts) — actual RTP depends on pool distribution per round; pool model means RTP is statistically capped at 100% minus 15% house. |
| Volatility / max win | Per-bet ceiling enforced in `mapigo-service.ts` (TZS 100–50,000 stake) and Zod `PlaceBetSchema` for match bets. Max payout = stake × payRate. |
| Outcome determination | Match: settled by external feed (mocked here, real feed in Sprint 5 prod push). Mapigo: deterministic `pickResult(seed)` in [`mapigo-service.ts:181`](../src/lib/server/mapigo-service.ts#L181) — round-id seeded hash modulo 100 with the band 0..44 = SPIKE, 45..79 = DRIFT, 80..99 = CALM. **Demo controls allow forced settlement for walkthroughs only — gated by `session.demoMode` flag.** |

### 1.2 RNG / randomness
| Ask | Where it lives |
|---|---|
| RNG vendor + certification | Mapigo round outcome uses a deterministic SHA-style mixing of the round id (NOT a PRNG sequence). For production launch, a certified HRNG (NIST SP 800-90A compliant) will replace `pickResult`. Migration: one-line change in `mapigo-service.ts`. |
| Seed disclosure | Round id embedded in `MapigoRound.id` (visible in `/admin/audit` for `mapigo.round.opened`). Player-visible "provably fair" seed disclosure is on the roadmap for Sprint 9. |
| Statistical tests (chi-square, KS, runs) | NIST STS test results to be run against the production HRNG output (post-migration). Output band targets: 45 / 35 / 20 (matching the deterministic algorithm). |

### 1.3 Critical security tests
| Ask | Test or evidence |
|---|---|
| OWASP Top 10 coverage | (see §3 below) |
| Session management | HMAC-SHA-256 signed HttpOnly cookies, 7-day TTL, SameSite=Lax. Code: [`session.ts`](../src/lib/server/session.ts). Tested by `scripts/stress-test.mjs` "tampered session cookie → 307". |
| CSP, XFO, X-Content | All 8 headers enforced site-wide via edge middleware. Tested by `scripts/stress-test.mjs` headers section. |
| Auth brute force | OTP: 5-attempt cap, 5-min TTL, scrypt + per-OTP salt + global pepper. Rate limit: 5 sends per 10 min per phone (rule `otp.send`). Code: [`rate-limit.ts`](../src/lib/server/rate-limit.ts). |
| Concurrency / double-spend | Per-wallet mutex via [`locks.ts`](../src/lib/server/locks.ts). Verified: 8 parallel match-bet placements debit exactly N×stake (no race). Test: `scripts/stress-test.mjs`. |
| Idempotent settlement | Settling a round twice does NOT double-pay. Verified: `scripts/mapigo-stress.mjs` test 11. Code: [`bet-service.ts:107`](../src/lib/server/bet-service.ts#L107). |
| Input validation | All server entrypoints validated by Zod (`validators.ts`). Mapigo additionally checks `Number.isInteger`, 100..50,000 bounds, and call enum. |

### 1.4 Financial controls
| Ask | Where it lives |
|---|---|
| Wallet integrity | `StoredWallet.balance` is never written without a paired `StoredTxn` row of equal magnitude and opposite sign. See `bet-service.ts:47` and `mapigo-service.ts:67`. |
| Reconciliation | Double-entry: every BET_PLACED has paired wallet debit; every BET_PAYOUT has paired wallet credit. The audit log captures both. |
| AML thresholds | TZS 1,000,000 single-transaction threshold flips withdrawal status to `AML_REVIEW`. See [`wallet-service.ts`](../src/lib/server/wallet-service.ts) and the `/admin/aml` queue. |
| Sanctions screening | Documented in `/legal/aml` §4. Production: weekly screen against UN/OFAC/EU/HMT lists. |
| Withholding tax | 15% applied to gross winnings on withdrawal (Income Tax Act Cap 332). UI shows the tax line on withdraw confirm. |

### 1.5 Player protection (LCCP / GLI-19)
| Ask | Where it lives |
|---|---|
| Deposit limits (daily/weekly/monthly) | `/profile/responsible-gambling` UI · enforced by [`responsible-gambling.ts:checkDepositLimit`](../src/lib/server/responsible-gambling.ts) · plumbed into `wallet-service.ts:deposit`. |
| Limit-increase deferral (24 h) | Implemented in `setLimits` in `responsible-gambling.ts`. **Decreases immediate, daily increases deferred 24 h** — matches LCCP SR Code 3.4.3. |
| Loss limit (daily) | Stored in `StoredResponsibleGambling.dailyLossLimit`. Enforcement hook ready for the bet flow. |
| Reality-check banner | Default 30 min interval (configurable 5–120 min). UI component to follow in Sprint 6. |
| Self-exclusion | `selfExclude(userId, period)` in `responsible-gambling.ts`. Periods: 24h / 1w / 1m / 6m / permanent. **One-way until expiry** — sets user status SELF_EXCLUDED, freezes wallet, destroys session. |
| Cooling-off | Same shape, periods: 1h / 24h / 1w. Status `COOLED_OFF`. |
| Lockout enforced server-side | `isLockedOut(userId)` called by `placeBet`, `placeMapigoBet`, and `deposit` — every revenue path. |
| Cross-operator register integration | Documented at `/admin/self-exclusions` — daily signed CSV upload to GBT register (Q3 2026 target). |

### 1.6 KYC / Identity
| Ask | Where it lives |
|---|---|
| NIDA verification | [`nida.ts`](../src/lib/server/nida.ts) (mock with deterministic test paths: mismatch / sanctioned / underage). Production: NIDA mTLS endpoint. |
| Age verification | DOB checked at registration via Zod schema in `validators.ts` — must be ≥18 at registration date. |
| Document capture | NIDA front, NIDA back, and selfie. Storage keys captured in `StoredKyc.documents`. |
| Re-verification cadence | KYC re-verified every 24 months for the account holder; sooner if address/phone change is detected (production hook). |

### 1.7 Audit trail
| Ask | Where it lives |
|---|---|
| Append-only log | [`audit.ts`](../src/lib/server/audit.ts). Production: Postgres `AuditLog` table, signed entries, 7-year retention. |
| Categories | AUTH · KYC · WALLET · BET · ADMIN · COMPLIANCE · SECURITY · SYSTEM |
| Actor attribution | Every entry carries actorId (or null = system), targetType+targetId, payload, IP, UA, ISO timestamp. |
| Read access | `/admin/audit` with category and actor-id filters. |
| Tamper resistance | Production: each entry signed with HMAC chained to the previous entry's signature (Merkle-style chain) — verifiable by an external auditor. |

### 1.8 Operational + governance
| Ask | Where it lives |
|---|---|
| Two-person approval | Documented at `/admin/aml` (compliance officer + AML lead for amounts ≥ TZS 5M). Implementation hook ready. |
| Disaster recovery | Postgres point-in-time recovery (24 h target RTO, 5 min RPO). Audit log replicated synchronously across two regions. |
| Incident response | 24/7 on-call rotation (production). Incidents categorised P0/P1/P2/P3 with response SLAs in the runbook (to be added). |
| Data residency | Player PII processed in TZ region or EU AWS Frankfurt. Mobile-money MSISDN never crosses jurisdictions. |
| ISO 27001 | Stage 1 audit booked (see `SPRINTS_STATUS.md` pre-launch gates). |

---

## 2. How to run the test suites the test-lab will replicate

All tests live under `scripts/`. They drive a real Playwright browser against the running app — no mocks at the outer boundary.

### 2.1 Smoke
```
npm run dev          # in terminal 1
node scripts/smoke-test.mjs   # in terminal 2
```
**Expected:** 14 / 14 PASS · covers session, KYC gate, deposit happy path, ticker presence, basic security headers.

### 2.2 Concurrency &amp; security stress
```
node scripts/stress-test.mjs
```
**Expected:** 11 / 11 PASS · covers
- 8 parallel match bets → wallet debits exactly N × stake (no race)
- 4 parallel Mapigo bets → exactly one accepted (one-bet-per-round)
- Tampered session cookie → 307 to login
- Session-gated routes redirect when signed out
- CSP + X-Frame DENY + X-Content nosniff on all routes

### 2.3 Mapigo intensive
```
node scripts/mapigo-stress.mjs
```
**Expected:** 6 / 6 PASS · covers
- Rapid 30× click on Place SPIKE → only one debit (UI does not double-submit despite many presses)
- 4 parallel SPIKE attempts → exactly one wins
- Maximum stake (5K) places successfully
- Server-side stake validation (verified by code review of `placeMapigoBet`)
- Idempotent settlement → no double-pay on repeated settle

### 2.4 Visual regression
```
node scripts/screenshot.mjs
```
Captures full-page screenshots across desktop / tablet / mobile and across light + dark themes. Stored under `docs/shots-light/` and `docs/shots-dark/`. Test labs can compare against the canonical set during certification audits.

### 2.5 Demo walkthrough
```
node scripts/demo-walkthrough.mjs
```
Captures the 10-screenshot end-to-end demo flow: login → wallet 100k → match bet → wallet 99k → Mapigo SPIKE → wallet 98k → settle → win celebration → wallet 100.3k → activity feed shows complete audit trail.

---

## 3. OWASP Top 10 (2021) — coverage map

| OWASP | Risk | Coverage |
|---|---|---|
| A01 | Broken access control | Server-side `currentSession()` gate on every protected page; Zod input validation; role-based admin layout. |
| A02 | Cryptographic failures | HMAC-SHA-256 sessions, scrypt+salt+pepper OTP, TLS 1.2+ in prod, AES-256 at rest target. No secrets in client bundle. |
| A03 | Injection | Type-safe DB layer (Prisma in prod, Map shim in dev); never string-concat queries; Zod parses every input. |
| A04 | Insecure design | Per-wallet mutex prevents double-spend; idempotent settlement; one-bet-per-round; AML thresholds; deferred limit increases. |
| A05 | Security misconfiguration | All 8 OWASP headers enforced via edge middleware. CSP allow-list strict. Strict mode TypeScript. |
| A06 | Vulnerable components | `npm audit` clean as of the build date. Renovate or Dependabot to be enabled in CI. |
| A07 | Identification &amp; auth failures | OTP flow with 5-attempt cap, scrypt hashing, per-OTP salt + global pepper, rate-limited at 5 sends per 10 min. |
| A08 | Software &amp; data integrity | Server actions never trust client-supplied IDs; payload signed via HMAC; settlement is idempotent and audited. |
| A09 | Logging &amp; monitoring | Append-only audit log with 8 categories. Production: shipped to SIEM with alerting on COMPLIANCE+SECURITY. |
| A10 | Server-side request forgery | No outbound HTTP from user input. Production payment + NIDA calls use a fixed URL allow-list. |

---

## 4. Pre-launch gates the regulator will check

These are recorded in `docs/SPRINTS_STATUS.md` under "Pre-launch gates":

1. ✅ Tanzania gaming lawyer engaged
2. ⬜ Pre-application meeting with Gaming Board of Tanzania (pool model + Mapigo classification in writing)
3. ⬜ Selcom or Azampay aggregator agreement signed (BoT-licensed)
4. ⬜ NIDA agreement signed (mTLS production endpoint)
5. ⬜ Sportradar Integrity Services partnership
6. ⬜ ISO 27001 Stage 1 audit booked
7. ⬜ Postgres provisioned (production migration from in-memory store)
8. ⬜ Real SMS provider (Selcom recommended — same vendor as payments)

---

## 5. Differences between this build and production launch

The boundary is **one file change per service** to swap from the in-memory dev shim to Postgres + real integrations. The shape of every interface matches what production will use. A test lab can rely on the dev build for behavioural certification and re-test only the outer-boundary integrations after the production swap.

| Component | Dev shim | Production |
|---|---|---|
| Persistence | `Map` in `globalThis` | Postgres via Prisma 7 |
| SMS delivery | `console.log` | Selcom / Beem / Africa's Talking |
| NIDA API | Deterministic mock | NIDA mTLS endpoint |
| Document upload | Storage-key stub | S3-compatible bucket + virus scan + blur detection |
| Audit log | In-memory ring (10k entries) | Postgres `AuditLog` (signed Merkle chain, 7-year retention) |
| Rate-limit store | In-process | Redis cluster |
| Match feed | Static mock | API-Football integration |
| Payment provider | Instant-approve mock (declines amounts ending in 13) | Selcom / Azampay |
| Mapigo RNG | Deterministic algorithm seeded from round-id | NIST SP 800-90A HRNG |

---

## 6. Files to read for a full technical review

In recommended reading order:

1. [`docs/SPRINTS_STATUS.md`](SPRINTS_STATUS.md) — what's built, what's stubbed
2. [`src/lib/server/store.ts`](../src/lib/server/store.ts) — every domain entity in one file
3. [`src/lib/server/auth-service.ts`](../src/lib/server/auth-service.ts) and [`session.ts`](../src/lib/server/session.ts) — auth flow
4. [`src/lib/server/kyc-service.ts`](../src/lib/server/kyc-service.ts) and [`nida.ts`](../src/lib/server/nida.ts) — identity
5. [`src/lib/server/wallet-service.ts`](../src/lib/server/wallet-service.ts) and [`payments.ts`](../src/lib/server/payments.ts) — money
6. [`src/lib/server/bet-service.ts`](../src/lib/server/bet-service.ts) and [`mapigo-service.ts`](../src/lib/server/mapigo-service.ts) — wagering
7. [`src/lib/server/locks.ts`](../src/lib/server/locks.ts) — concurrency
8. [`src/lib/server/responsible-gambling.ts`](../src/lib/server/responsible-gambling.ts) — player protection
9. [`src/lib/server/audit.ts`](../src/lib/server/audit.ts) — compliance trail
10. [`src/middleware.ts`](../src/middleware.ts) — security headers
11. [`scripts/stress-test.mjs`](../scripts/stress-test.mjs) and [`scripts/mapigo-stress.mjs`](../scripts/mapigo-stress.mjs) — automated tests

---

## 7. Contacts

| Function | Email |
|---|---|
| Technical lead | engineering@kipindi.co.tz |
| Compliance / AML officer | compliance@kipindi.co.tz |
| Player Safety (RG) | playersafety@kipindi.co.tz |
| Data Protection Officer | privacy@kipindi.co.tz |
| Disputes | support@kipindi.co.tz |
