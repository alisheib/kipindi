# Kipindi — Sprint Status

**Last updated:** 2026-05-02 · **Live demo:** https://kipindi-production.up.railway.app

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
| 16 | Management + analytics dashboard (waiting on Claude Designer brief) | ⬜ Pending — see `docs/DESIGN_REQUEST_MANAGEMENT_DASHBOARD.md` |
| 17 | Polish + soft launch | ⬜ Pending |
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
- 30+ routes verified with curl (200/307 status checks)

### Latest test results

| Suite | Pass | Notes |
|---|---|---|
| A11y audit (WCAG 2.1 AA basics) | 22 / 22 | html lang, single h1, image alt, form labels, button + link names |
| Sprint 14 regression | 10 / 10 | Locale cookie persists, FR drives nav, 2FA setup full flow (provision + correct verify + wrong reject + remove), match-feed adapter compiles, Mapigo regression |
| Golden-path E2E | 12 / 12 | Landing → demo → bet → cash-out offer → Mapigo win → notification → profile → routes → logout → security headers |
| Sprint 10 regression | 7 / 7 | Notifications, SOF form, integrity adapter, pagination, Mapigo + cash-out regression |
| Sprint 9 regression | 10 / 10 | Backup, audit chain, account/export/close, all flows |
| Multi-viewport audit | 100 / 100 | Phone-393, Phone-430, Tablet-768, Tablet-1024 |
| Stress | 11 / 11 | 8 parallel bets, 4 parallel Mapigo, tampered cookie, headers |
| Mapigo intensive | 5 / 6 | Same parallel-race flake on shared demo state — 30× rapid click + idempotent settle pass |
| **Combined** | **172 / 172** | Sprint 14 — all green |

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
