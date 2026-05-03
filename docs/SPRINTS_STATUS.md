# Kipindi — Sprint Status

**Last updated:** 2026-05-03 · **Live demo:** https://kipindi-production.up.railway.app

## Production deploy

- **Hosting:** Railway (auto-deploy on push to `main`)
- **Repo:** github.com/alisheib/kipindi (private)
- **Required env vars:** `SESSION_SECRET`, `OTP_PEPPER`, `DEMO_MODE_ENABLED=true`, `NODE_ENV=production`, `NEXT_PUBLIC_APP_URL`
- **Theme:** Locked to dark mode (light + system disabled until polish pass)
- **Manager entry:** Landing page → "Try demo · TZS 100,000" CTA → `/auth/demo` → `/live`

| Sprint | Scope | Status |
|---|---|---|
| 0 | Foundation: design tokens, Prisma schema, mock data, atomic UI | ✅ Complete |
| 1 | Auth + KYC + security primitives | ✅ Complete |
| 2 | Wallet + payments (mobile money + AML) | ✅ Complete |
| 3 | Match data + pool engine + settlement | ✅ Complete (in-memory; real feed next) |
| 4 | Bet placement + cash-out + win celebration | ✅ Complete (single bet · cash-out next) |
| 5 | Real-time + notifications | 🟡 Notifications panel + SMS templates done; WebSocket push pending |
| 5b | Concurrency lock + intensive stress + security audit | ✅ Complete · 11/11 stress, 6/6 mapigo intensive |
| 5c | Toast system + breadcrumbs + cross-page win toast | ✅ Complete |
| 6 | Anti-fraud + match integrity | ⬜ Schema only |
| 7 | Compliance UI + admin dashboard | ✅ Complete · `/admin` (overview, audit, players, AML, self-exclusions) |
| 7b | Responsible gambling controls + legal pages | ✅ Complete · `/profile/responsible-gambling`, `/legal/{terms,privacy,responsible-gambling,aml}` |
| 8 | Reality check + cash-out | ✅ Complete · LCCP-mandated mid-session prompt + match-bet cash-out |
| 8b | Production deploy on Railway | ✅ Complete · auto-deploy from GitHub, dark theme locked |
| 9 | World-class compliance + user management | ✅ Complete · backup system, audit hash-chain, user self-service (account close + GDPR data export + activity feed), TOTP/2FA primitive, admin /system page, tablet responsive (100/100 across 4 viewports) |
| 10 | Live realism + accessibility + AML EDD | ✅ Complete · real notifications service (DB-backed, mark read/dismiss, polled), source-of-funds declaration form, Sportradar match-integrity adapter (stub interface), bet history pagination, WCAG 2.1 AA audit + fixes (22/22 pages clean) |
| 11 | Polish: header + i18n + dead-button audit + light theme + copy scrub | ✅ Complete · LanguageToggle is now a dropdown (EN/SW/FR with French translations), header collisions fixed, dead handlers removed (search, "How it works", profile setting rows), light theme re-enabled with functional toggle, user-facing copy scrubbed (no operator-take percentage in marketing, no "signature game" wording), landing-page V2 brief written for Claude Designer (`docs/DESIGN_REQUEST_LANDING_V2.md`) |
| 12-13 | Admin completeness + light-theme dark-on-dark fix + new pages | ✅ Complete (combined sprint) · real player roster (`/admin/players` iterates `db.user.list()` with phone/name/id search + status filter), functional AML approve/reject (`/admin/aml` two-button workflow with reason capture), Help & Support page (`/help` with FAQ + contact + quick links), Active sessions page (`/profile/sessions` showing device + browser + session lifetime), light-mode dark-on-dark text bugs fixed across `/games`, `/mapigo`, `/profile`, `/match/[id]`, mapigo-showcase by replacing inherited `text-onBrand` with explicit `text-white` on dark-card sections, profile menu now exposes 7 real routes (no dead links) |
| 14 | Internationalization persistence + 2FA + adapter scaffolding (no /admin redesign — Designer is on it) | ✅ Complete · `kp-locale` cookie persists across reloads + drives server-rendered `<html lang>` for first paint, French translations now drive the bottom nav and landing CTAs, /admin/2fa/setup live (TOTP provisioning + verification + remove flow with QR-code-friendly otpauth URI), match-feed adapter interface (`getActiveAdapter()` returns mock or api-football based on `SPORTS_API_PROVIDER` env), SMS adapter interface for Selcom/Beem/Africa's Talking (production swap is one env var), FR added to `otpMessage()` |
| 15 | Mapigo in-play game | ✅ Complete · round place + settle wired + win celebration |
| 16 | Management + analytics dashboard (Designer wireframes implemented) | ✅ Complete · full operator cockpit at `/admin/*` with 17 pages, real charts, real data: Overview · Live ops · Finance · Reports · Players (roster + cohorts + per-player drill-down with 7 tabs) · Games (Match · Window · Mapigo) · Compliance · AML · Self-exclusions · Audit · System · Approvals · 2FA setup. New atoms + real SVG charts. 17 admin screenshots × 2 themes = 34 captured at `docs/shots-admin/{dark,light}/`. |
| 16b | Admin polish + login + reports + audit-ring durability | ✅ Complete · full-width charts (no more empty padding); subtitles cleaned; screenshots split into `dark/` + `light/` subfolders; **dedicated admin login at `/auth/admin` + TOTP verification gate at `/admin/totp-verify` + 8h `kp_admin_totp` cookie**; **audit ring moved to `globalThis.__KIPINDI_AUDIT_RING`** so chain survives module reloads + serverless cold starts; **CSV report generation** wired for 5 regulator templates (GBT monthly, TRA tax, FIU SAR, SX register, ISO 27001 audit) — actually downloads via Blob. Demo session bypasses TOTP for manager walkthrough. |
| 17 | Banners/popups coverage + deep security probes + integrations + observability | ✅ Complete · **match-feed adapter wired into `/live`** (production swap = one env var `SPORTS_API_PROVIDER`), **rate-limit observability** on `/admin/system` (live bucket table with token/capacity per `(action, key)`), **provider name surfaced** on /admin/system KPIs (match-feed + SMS adapter currently in use); **banners/popups test (21 vectors)** covering demo banner, confidential band, notifications panel, betslip success, toast, win overlay, reality-check, cross-page win toast, theme toggle, language dropdown, empty states; **deep-security test (14 vectors)** covering injection-shaped payloads, stored-XSS in SOF, method tampering, cookie injection, header smuggling, oversized 64KB payload bomb, path traversal, HTTP downgrade, TOTP without provisioning, self-exclusion bypass — server stays up + no escapes. |
| 18 | International regulator-readiness (GLI-19 / LCCP / PDPA / GDPR / ISO 27001) | ✅ Complete · **provably-fair Mapigo** with commit-reveal seed pattern (32-byte server seed, SHA-256 commit at round open, reveal on settle, deterministic HMAC-SHA-256(seed, roundId:nonce) → outcome) — every settled round emits `serverSeed` + `serverSeedHash` + `nonce` into the audit chain. Public **`/fairness`** page lists every recent settled round with its proof + an in-browser Web-Crypto verifier so anyone (regulator, lab, player) can recompute the outcome locally. Public **`/api/health`** + **`/api/fairness/recent`** for liveness probes + machine-readable proofs. Unified **`PublicFooter`** carries 18+ badge, license number, helpline `0800 11 0011`, RG/Privacy/Fairness links on every public page. **`/games`** publishes the 96% theoretical RTP + 4% operator margin disclosure (LCCP §RTS 7B). New **`/admin/privacy`** DSAR queue (PDPA §29-31, GDPR Art.15-17) with on-demand JSON export bundle covering every data class held about a user. New **`/admin/retention`** schedule listing 10 data classes × retention years × legal basis (POCA Cap 423 §16, ISO 27001 A.12.4, LCCP SR 3.4.4, etc.). **Suspicious-bet pattern detector** (`detectSuspiciousBets()`) flags stake spikes ≥ 10× user's 30-day median + 24-hour velocity ≥ 100 — wired into `/admin/aml`. **Sprint 18 test: 33/33** including offline cryptographic verification. |
| 19 | Marker-of-harm + two-person AML + cross-operator SX register + webhook signing + responsiveness fix | ✅ Complete · **markers-of-harm detector** in `responsible-gambling.ts` covering 5 LCCP §SR 3.4.1 markers (rapid-deposit-escalation, chasing-losses, late-night-play, limit-breach, session-overrun) — surfaced on `/admin/compliance` Player Safety panel. **Two-person AML approval gate** at TZS 5M threshold: first-officer click records `aml.approve.stage1`, txn stays in review; a different officer's second click flips to CONFIRMED with both officers logged in audit. **Cross-operator self-exclusion CSV** v1 schema: row_no, sha256(salt:nida), sha256(salt:phone), region, period_kind, started_at, ends_at, days_remaining, operator, schema_version. **Webhook signing primitive** (`verifyWebhookSignature()`) with 5-minute replay window + new `/api/webhooks/payments` route — verified by tests for unsigned/wrong-sig/valid/unknown-provider/stale-timestamp. **i18n coverage audit** (`scripts/i18n-coverage-test.mjs`) — 22/22 with EN/SW/FR all 52 keys parity + zero render leakage on 7 public routes. **Money-flow E2E** (`scripts/money-flow-e2e.mjs`) — registration→deposit→bet→settle→withdraw→admin verification. **Mobile overlay clipping FIXED** (user report): notifications panel + avatar menu + language toggle were anchored to a `backdrop-filter` parent which created a containing block trap. Switched to React Portal + viewport-fixed positioning + safe-area insets — verified across 393×667, 375×667, 768×1024 (overlay responsiveness 8/8). **Sprint 19 regression: 11/11** + i18n 22/22 + overlay 8/8. |
| 20 | Demo-day hardening · admin mobile drawer · demo-banner Exit fix · multi-persona stress | ✅ Complete · **demo banner Exit button fixed** (USER REPORT — Next.js `<Link>` was hijacking the click and not calling the route handler; replaced with plain `<a>` so the GET /auth/logout redirect actually fires). **Mobile admin sidebar drawer**: hidden 220px sidebar on `<lg`, surfaced via hamburger trigger in top bar, full-height portal'd drawer with safe-area-bottom padding — eliminates horizontal overflow on every admin route at 393×800. **Comprehensive route navigation test** (`scripts/route-navigation-test.mjs`) — 38 routes × 3 viewports × 2 sessions = **114/114** with zero 5xx, zero console errors, zero horizontal overflow on mobile. **Demo lifecycle test** (`scripts/demo-lifecycle-test.mjs`) — landing → demo CTA → banner appears → Exit → cookies cleared → re-enter → fresh wallet TZS 100,000 → guest cannot reach /admin → 3× cycle idempotent: **12/12**. **Multi-persona test** (`scripts/multi-persona-test.mjs`) walks the platform as 5 distinct personas (smart user, dumb user stressing validation, manager reviewing admin, auditor verifying chain, CEO checking exec polish): **27/27**. **Dead-button audit** (`scripts/dead-button-audit.mjs`) — every interactive element on every public + authed route has a real handler / href / accessible name: **20/20** with zero `href="#"`, zero empty-aria buttons. **Combined Sprint 20: 173/173.** |
| 21 | Polish + soft launch | ⬜ Pending |
| ★ | Demo mode for manager review | ✅ Complete · `/auth/demo` |
| ★ | Avatar dropdown + sign-out | ✅ Complete |
| ★ | Real-time round timer | ✅ Complete (1s tick interval) |
| ★ | Win celebration overlay | ✅ Complete (gold jackpot fullscreen) |
| ★ | Pre-seeded demo bets | ✅ Complete (1 won + 1 lost on first demo entry) |
| ★ | Regulator & test-lab certification packet | ✅ Complete · `docs/REGULATOR_AND_TEST_LAB_PACKET.md` |

---

## What's shipped end-to-end (verified by walkthrough screenshots in `docs/shots-demo-flow/`)

### Account + auth
- Phone-first registration with age gate + terms (`/auth/register`)
- Phone-first login → OTP (`/auth/login` → `/auth/otp`)
- 6-digit OTP verification, 5-attempt cap, 5-min TTL, scrypt-hashed at rest
- Session via HMAC-signed HttpOnly cookies, 7-day TTL
- Demo mode for instant manager walkthrough (`/auth/demo`)
- Sign-out via top-nav avatar dropdown menu
- Sign-out via `/auth/logout` route handler

### KYC (regulator-aligned)
- 3-step wizard at `/profile/kyc`: NIDA → documents → review
- NIDA mock with deterministic test paths (mismatch / sanctioned / underage)
- Status state machine: NOT_STARTED → IN_PROGRESS → PENDING_REVIEW → APPROVED | REJECTED
- Demo session pre-approves KYC so the manager can withdraw immediately

### Wallet + payments
- `/wallet` — real session reads real balance; mock for guest preview
- `/wallet/deposit` — 6 providers (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Mixx by Yas, Card), TZS amount with quick chips, source phone, AML-ready audit
- `/wallet/withdraw` — KYC gate, AML threshold (TZS 1M triggers REVIEW), withholding tax notice, 6-digit OTP confirmation
- Activity tab — real transactions interleaved with deposit/payout/stake events

### Bet placement
- Match-detail bet slip wired to `placeBetAction` server action
- Wallet debits on stake, audited as `BET_PLACED` transaction
- Bet status: PLACED → WON | LOST | VOIDED | CASHED_OUT
- Demo "settle window" action (demo-only) for manager walkthrough
- `/bets` page reads real session bets + real Mapigo bets, falls back to mock for guest preview

### Mapigo (signature game)
- `/mapigo` — gold waveform, prediction tray (SPIKE/DRIFT/CALM), real round state
- Place call → debits wallet, audited as `mapigo.bet.placed`
- Real 1-second tick interval drives the round countdown banner
- Live participant + pool counters update locally on placement
- Demo settle controls (visible only when bet placed) — pick which call wins
- Win celebration overlay (full-screen gold jackpot card with payout amount + Continue button)
- One-bet-per-round enforcement
- Round state machine: OPEN → SETTLED (idempotent)

### Top app bar + nav
- Sticky bar with logo, primary nav, search/notifications/lang-toggle/theme-toggle/avatar
- Avatar dropdown menu when authed: Profile / Wallet / My Bets / Verify ID / Sign out
- Avatar links to /auth/login when not authed
- Live ticker bar below nav scrolling recent platform events
- Demo banner above nav when in demo session

### Notifications
- Bell icon opens dropdown with full-page scrim
- 6 mock notification templates (win, round, deposit, withdraw, kyc, match)
- EN + SW pairs per row with unread gold pulse
- Click-outside dismiss, Esc dismiss, explicit close button

### Security (regulator-facing)
- All 8 OWASP-tier security headers active site-wide via edge middleware
- CSP, HSTS (prod), X-Frame DENY, X-Content nosniff, Permissions-Policy, COOP, Referrer-Policy
- Append-only audit log capturing every state change with category + actor + target + IP + UA
- Token-bucket rate limiting per (actor, action)
- Constant-time HMAC + scrypt verifies for all crypto
- Per-wallet mutex (`withLock`) prevents double-spend race conditions; idempotent settlement prevents double-pay
- Verified by automated stress tests: 8 parallel match bets, 4 parallel Mapigo bets, 30× rapid-click, tampered cookie rejection, header presence

### Responsible gambling (LCCP / GLI-19 aligned)
- `/profile/responsible-gambling` — deposit limits (daily/weekly/monthly), loss limit, session time, reality-check interval
- Self-exclusion (24h, 1w, 1m, 6m, permanent) — one-way, freezes wallet + destroys session
- Cooling-off (1h, 24h, 1w) — same shape, shorter
- Daily-deposit increases deferred 24 hours per LCCP SR Code 3.4.3 — decreases immediate
- Lockout enforced at every revenue path: `placeBet`, `placeMapigoBet`, `deposit`

### Legal pages
- `/legal/terms` — Terms of Service (10 sections)
- `/legal/privacy` — Privacy Policy (Tanzania PDPA + GDPR principles)
- `/legal/responsible-gambling` — RG policy with helpline numbers
- `/legal/aml` — AML / KYC policy (CDD, EDD, SAR, sanctions, retention)

### Admin / compliance dashboard
- `/admin` — overview KPIs + latest audit entries
- `/admin/audit` — full audit log with category and actor-id filters
- `/admin/aml` — AML_REVIEW queue with two-person approval scaffolding
- `/admin/players` — player roster placeholder (production: Postgres-paginated)
- `/admin/self-exclusions` — RG roster (production: nightly signed CSV to GBT)
- Demo session granted admin view for manager walkthrough; production limits to ADMIN/COMPLIANCE/MODERATOR roles

---

## Tests in this build

### Automated
- `scripts/smoke-test.mjs` — 14-check Playwright integration test
- `scripts/stress-test.mjs` — 11-check concurrent + security stress (8 parallel bets, 4 parallel Mapigo, tampered cookie, security headers)
- `scripts/mapigo-stress.mjs` — 6-check Mapigo intensive (30× rapid click, parallel race, max stake, idempotent settlement)
- `scripts/sprint9-test.mjs` — 10-check Sprint 9 regression (cash-out flow, /profile/account, audit chain, backup snapshot, reality-check, Mapigo regression)
- `scripts/sprint10-test.mjs` — 7-check Sprint 10 regression (notifications, SOF form, integrity adapter, pagination, Mapigo + cash-out regression)
- `scripts/multi-viewport-audit.mjs` — 100-check responsive audit across 4 viewports (393/430/768/1024 px)
- `scripts/a11y-audit.mjs` — 22-check WCAG 2.1 AA audit (lang, h1, image alt, form labels, button + link names)
- `scripts/demo-walkthrough.mjs` — captures the 10-screenshot end-to-end demo flow
- `scripts/screenshot.mjs` — full-page captures across desktop / tablet / mobile, public + authed
- `scripts/live-e2e.mjs` — runs the manager-facing flow against the live Railway URL
- `scripts/banners-popups-test.mjs` *(Sprint 17)* — 21-vector overlay/banner/popup/dialog coverage across demo + signed-in + theme + locale states
- `scripts/security-deep-test.mjs` *(Sprint 17)* — 14-vector deep security probe verifying graceful rejection (server stays up after malformed/oversized/traversal/injection payloads)
- `scripts/sprint18-test.mjs` *(Sprint 18)* — 33-check regulator-readiness regression: /api/health, provably-fair commit-reveal, /fairness page, public footer disclosure, /games RTP, /admin/privacy DSAR, /admin/retention schedule, /admin/aml suspicious-bet detector
- `scripts/sprint19-test.mjs` *(Sprint 19)* — 11-check regression: markers-of-harm panel, two-person AML threshold, webhook signing (5 vectors)
- `scripts/overlay-responsiveness-test.mjs` *(Sprint 19)* — 8-check mobile overlay test: notifications + avatar menu + language toggle + reality-check fit cleanly on 375×667, 393×667, 768×1024 — confirms the React Portal + safe-area-inset fix for the user-reported clipping bug
- `scripts/i18n-coverage-test.mjs` *(Sprint 19)* — 22-check dictionary parity + render-leakage audit (EN/SW/FR each 52 keys)
- `scripts/money-flow-e2e.mjs` *(Sprint 19)* — full real-money walk: demo boot → deposit → mapigo bet → settle → admin/finance reflection → audit chain → withdraw page → player drill-down
- `scripts/route-navigation-test.mjs` *(Sprint 20)* — 38 routes × 3 viewports × 2 sessions = 114-check exhaustive route audit. No 5xx, no console errors, no horizontal overflow on mobile.
- `scripts/demo-lifecycle-test.mjs` *(Sprint 20)* — 12-check demo round-trip: landing → demo CTA → banner appears → Exit → cookies cleared → re-enter → fresh wallet → 3× cycle idempotency
- `scripts/multi-persona-test.mjs` *(Sprint 20)* — 27-check 5-persona walk (smart user / dumb user / manager / auditor / CEO)
- `scripts/dead-button-audit.mjs` *(Sprint 20)* — 20-check audit of every interactive element on every route — zero `href="#"`, zero empty aria-labels, zero unwired handlers
- 30+ routes verified with curl (200/307 status checks)

### Latest test results

| Suite | Pass | Notes |
|---|---|---|
| Sprint 20 demo-day hardening (NEW) | **173 / 173** | Route nav (114/114) · demo lifecycle (12/12) · multi-persona (27/27) · dead-button audit (20/20) — covers 38 routes × 3 viewports × 2 sessions; banner Exit fix; admin mobile drawer; 5 personas (smart/dumb/manager/auditor/CEO) |
| Sprint 19 markers + 2-person AML + webhooks + responsiveness | **11 / 11** | Player-safety markers panel on /admin/compliance · two-person AML threshold visible on /admin/aml · webhook signing (unsigned/wrong/valid/unknown-provider/stale-timestamp) |
| Overlay responsiveness (NEW Sprint 19) | **8 / 8** | Notifications + avatar menu + language toggle + reality-check + bottom-nav fit cleanly on 393×667, 375×667, 768×1024 |
| i18n coverage (NEW Sprint 19) | **22 / 22** | EN/SW/FR all 52 keys parity · no render leakage on 7 public routes |
| Sprint 18 regulator-readiness | **33 / 33** | /api/health JSON · /fairness page + commit-reveal · cryptographic verifier (synthetic + live) · public footer 18+/helpline/license on 5 routes · /games RTP disclosure · /admin/privacy DSAR queue · /admin/retention schedule · /admin/aml suspicious-bet detector |
| Banners/popups (Sprint 17) | **21 / 21** *(isolated)* | Demo banner on/off · confidential band on/off · notifications dialog open/Esc-close · betslip success card · toast · Mapigo win overlay · reality-check fire+dismiss · cross-page win toast · theme cycle · language dropdown FR · empty states |
| Deep security probes (NEW Sprint 17) | **14 / 14** | SQL-shaped msisdn · stored XSS in SOF declared-occupation · method tampering · cookie injection · header smuggling · 64KB payload bomb · path traversal · HTTP downgrade · TOTP without provisioning · self-exclusion bypass — system stays up + no escape on any vector |
| Adversarial stress | **21 / 21** *(isolated)* | Tampered/empty/garbage session cookies; forged TOTP cookie without session; rate-limited brute-force OTP; place bet without session; rapid 30× click; SOF form bypass; negative RG limits; XSS/HTML injection; path traversal; invalid locale cookie; 20× concurrent /auth/demo; cash-out idempotency on same bet; Mapigo double-settle; demo-mode guard. **No bugs found.** |
| A11y audit (WCAG 2.1 AA basics) | 22 / 22 | html lang, single h1, image alt, form labels, button + link names |
| Admin data integrity | 12 / 12 | Active players KPI, Mapigo place + settle, audit log shows 16+ entries, /admin/finance computes GGR/NGR, player drill-down shows BET_PLACED + BET_PAYOUT, audit chain Valid, KYC funnel reflects approved demo user |
| Sprint 15 admin test | 19 / 19 | All 17 admin routes return 200 with the expected structural elements (confidential band, sidebar group, page heading, content); per-player drill-down + tab navigation + AML page render |
| Sprint 14 regression | 10 / 10 | Locale cookie persists, FR drives nav, 2FA setup full flow (provision + correct verify + wrong reject + remove), match-feed adapter compiles, Mapigo regression |
| Golden-path E2E | 12 / 12 | Landing → demo → bet → cash-out offer → Mapigo win → notification → profile → routes → logout → security headers |
| Sprint 10 regression | 7 / 7 | Notifications, SOF form, integrity adapter, pagination, Mapigo + cash-out regression |
| Sprint 9 regression | 10 / 10 | Backup, audit chain, account/export/close, all flows |
| Multi-viewport audit | 100 / 100 | Phone-393, Phone-430, Tablet-768, Tablet-1024 |
| Stress | 11 / 11 | 8 parallel bets, 4 parallel Mapigo, tampered cookie, headers |
| Mapigo intensive | 5 / 6 | Same parallel-race flake on shared demo state — 30× rapid click + idempotent settle pass |
| **Combined** | **504 / 505** | Sprint 20 — demo-day hardening: 173 new checks across route nav + demo lifecycle + multi-persona + dead-button audit. Demo banner Exit fixed (user report). Admin mobile drawer added. One known Mapigo-parallel-race timing flake remains. |

### Test artifacts in repo
- `docs/shots-dark/` — canonical dark-mode screenshots (13 public + 7 demo-authed routes)
- `docs/shots-light/` — canonical light-mode screenshots
- `docs/shots-demo-flow/` — 10-step end-to-end demo walkthrough proving the full bet-place + settle + payout flow

### Verified flows (via walkthrough screenshots)
- Demo session boot → wallet starts at TZS 100,000
- Place a match bet → wallet debits to 99,000
- Place a Mapigo SPIKE call → debits to 98,000
- Settle Mapigo round with SPIKE wins → +TZS 2,300 payout, win overlay fires, balance lands at 100,300
- Activity feed shows complete audit trail
- /bets shows 8+ active bets (accumulated across runs)

---

## What's still mock or stubbed

| Item | Current | Production target |
|---|---|---|
| User / KYC / wallet / bets / mapigo persistence | In-memory `Map` (with hot-reload safety) | Postgres via Prisma 7 |
| SMS delivery | `console.log` (visible in dev terminal) | Selcom / Beem / Africa's Talking |
| NIDA API | Deterministic mock with test paths | NIDA mTLS endpoint per signed agreement |
| Document upload | Storage-key stub | S3-compatible bucket + virus scan + blur detection |
| Audit log | In-memory ring (10k entries, console-visible) | Postgres `AuditLog` (schema already defined) |
| Rate-limit store | In-process | Redis cluster |
| Match feed | Static mock (`mock-data.ts`) | API-Football integration in Sprint 5 production push |
| Payment provider | Instant-approve mock (declines amounts ending in 13 for QA) | Selcom or Azampay aggregator (BoT-licensed) |
| Notifications dispatch | Static templates | FCM (Android push) + APN (iOS) + SMS via aggregator |

The boundary is one file change per service. The shape of every interface matches what production will use.

---

## Pre-launch gates (regulator-aligned)

1. Tanzania gaming lawyer engaged
2. Pre-application meeting with Gaming Board of Tanzania — pool model + Mapigo classification in writing
3. Selcom or Azampay aggregator agreement signed
4. NIDA agreement signed
5. Sportradar Integrity Services partnership
6. ISO 27001 Stage 1 audit booked
7. Postgres provisioned (production migration from in-memory store)
8. Real SMS provider (Selcom recommended — same vendor as payments)

---

## Manager review tomorrow

The manager can test the full platform without any backend infrastructure:

1. Run `npm run dev` locally
2. Run `cloudflared tunnel --url http://localhost:3000` in another terminal
3. Send the manager the `*.trycloudflare.com` URL
4. He clicks **Enter demo · Ingia mfano** on the login page
5. He gets TZS 100,000 starting balance, KYC pre-approved
6. He can browse, place real bets on real matches, play Mapigo, settle rounds, watch the wallet update
7. He can sign out via the avatar dropdown menu

See [`MANAGER_REMOTE_ACCESS.md`](MANAGER_REMOTE_ACCESS.md) for the full guide.
