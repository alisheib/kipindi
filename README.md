# Kipindi

**Bet the moment.** Licensed pool-based time-window sports betting platform. Tanzania first.

Players pick a **time window** of a live football match (`0–15`, `15–30`, `30–45`, `45–60`, `FT`) and a simple outcome (Win / Draw / Lose). Stakes pool together; winners share the pool by stake share. The signature game **Mapigo** layers a 60-second "intensity pulse" prediction on top of the live match feed.

Bilingual EN + SW from day one. Mobile-first. Calm, premium, regulator-ready.

---

## What's currently built

**Sprint 0 + 1 + Mapigo + Demo Mode complete.** Server live on `http://localhost:3000`.

| Area | Status | Notes |
|---|---|---|
| Design system | ✅ Locked | Sora + Inter + JetBrains Mono · royal + gold · Light + Dark · brand patterns (Mwangaza, Sokoni, Mfumo) |
| Public pages | ✅ Built | `/` (Kinetic Stadium landing), `/live`, `/match/[id]`, `/leaderboard`, `/games`, `/mapigo` |
| Auth flow | ✅ Built | `/auth/login`, `/auth/register`, `/auth/otp`, `/auth/logout` — phone+OTP, no passwords |
| KYC flow | ✅ Built | `/profile/kyc` — NIDA → docs → review (mock NIDA API) |
| Wallet flow | ✅ Built | `/wallet`, `/wallet/deposit`, `/wallet/withdraw` — 6 mobile-money providers + bank, AML threshold, withholding tax notice |
| Mapigo signature game | ✅ Built UI | `/mapigo` — gold waveform, prediction tray, recent rounds, mini leaderboard |
| Demo mode | ✅ Built | Dev-only sandbox with TZS 100,000 fake balance and pre-approved KYC, gated by `DEMO_MODE_ENABLED` env var |
| Security middleware | ✅ Live | CSP, HSTS (prod), X-Frame DENY, X-Content nosniff, Permissions-Policy, COOP, Referrer-Policy |
| Audit log | ✅ In-memory | Every state change recorded; production swaps to Postgres `AuditLog` (schema defined) |
| Rate limiting | ✅ In-memory | Token-bucket per (key, action); 8 rules covering OTP / login / KYC / wallet / bet |
| Notifications panel | ✅ Built UI | Bell in top-nav opens a solid-bg dropdown with EN+SW copy per row, scrim, click-outside dismiss |
| Language toggle | ✅ Wired | `EN | SW` in top-nav drives `useT()` for nav labels; persists to localStorage |
| Live ticker | ✅ Built | Scrolling marquee under nav showing recent platform events |

**Mocked / stubbed for dev (interface stable, swap is one line per service):**
- DB persistence (in-memory `Map` → Prisma+Postgres)
- SMS dispatch (console → Selcom / Beem / Africa's Talking)
- NIDA verify (deterministic mock → real mTLS endpoint)
- Document upload (storage-key stub → S3-compatible bucket)
- Payment dispatch (instant approve → Selcom or Azampay aggregator)

---

## Quick start

```bash
# Node 20+ required
npm install
npm run dev
```

Open `http://localhost:3000`.

### Demo mode (manager / reviewer walkthrough)

A button on `/auth/login` titled **"Enter demo · Ingia mfano"** drops the user into a fully-funded sandbox account:

- User: "Demo Manager", phone `+255700000000`
- Wallet: TZS 100,000 starting balance
- KYC: pre-approved (can withdraw immediately)
- Demo banner persists at top of every page; "Exit" link clears the session

The demo is **automatically disabled in production** when `NODE_ENV=production` and `DEMO_MODE_ENABLED` is unset or `false`. To explicitly disable in dev, set `DEMO_MODE_ENABLED=false`.

---

## Source-of-truth files

| File | Purpose |
|---|---|
| [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) | Complete design system — 44 sections, every component spec, EN+SW copy |
| [`docs/tokens.json`](docs/tokens.json) | Machine-readable design tokens (Tailwind config + CSS vars derive from this) |
| [`docs/LOGO_SPEC.md`](docs/LOGO_SPEC.md) | Logo construction grid + animation rules |
| [`docs/DESIGN_REQUEST.md`](docs/DESIGN_REQUEST.md) | Original design brief sent to Claude Design |
| [`docs/MAPIGO_REQUEST.md`](docs/MAPIGO_REQUEST.md) | Mapigo concept brief (signature mini-game) |
| [`docs/SECURITY.md`](docs/SECURITY.md) | **Regulator-facing** control mapping — every security claim maps to a file + line |
| [`docs/SPRINTS.md`](docs/SPRINTS.md) | Sprint roadmap, regulator-validation gated |
| [`docs/SPRINTS_STATUS.md`](docs/SPRINTS_STATUS.md) | What's built vs mocked vs pending in each sprint |
| [`docs/CLAUDE_HANDOFF.md`](docs/CLAUDE_HANDOFF.md) | Onboarding doc for the next Claude Code session |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Full Prisma data model — 19 entities covering KYC, wallet, betting, integrity, compliance |

---

## Project layout

```
src/
  app/                  Next.js App Router pages + route handlers
    auth/               login · register · otp · logout · demo
    wallet/             wallet · deposit · withdraw
    profile/            profile · kyc
    match/[id]/         match detail with bet slip
    mapigo/             signature game route
    games/              mini-games hub (single Mapigo tile)
  components/
    ui/                 atoms — Button · Card · Chip · Avatar · Skeleton · Pattern · CountUp · Delta · MetricCard · Tabs · LanguageToggle
    layout/             shell — TopAppBar · BottomNav · LiveTicker · NotificationsPanel · DemoBanner · AppShell
    charts/             Sparkline · AreaChart · MiniDonut · StakeDistribution · RadialGauge · HeatmapGrid
    betting/            TeamBadge · MatchCard · MomentumBar · TimeWindowSelector · OddsCard · StakeSlider · PoolDisplay · PoolPulseRing · BetSlip · BetsFeed · WalletCard · TransactionRow · LeaderboardRow · ResultChip · KycStatusBanner · LivePill · WinCelebration
    landing/            Kinetic Stadium pieces — PitchGraphic · HeroStage · WinnersFeed · StatementBand · StatsPanel · MapigoShowcase · FixturesGrid
    mapigo/             game pieces — Waveform · PredictionTray · RoundBanner · MapigoStakeInput · OutcomePill · RoundsFeed · LeaderboardMini · MapigoMark
  lib/
    server/             SERVER-ONLY services
      audit.ts          Append-only event log (8 categories)
      auth-service.ts   Phone+OTP register / login / logout
      crypto.ts         HMAC, scrypt, OTP gen, constant-time compare
      demo-mode.ts      Dev-only sandbox session creator
      kyc-service.ts    NIDA + document + review state machine
      nida.ts           NIDA verify abstraction (mock + production stub)
      payments.ts       Mobile-money / card / bank dispatch (mock + production stub)
      rate-limit.ts     Token-bucket per (key, action)
      session.ts        HMAC-signed HttpOnly cookie sessions
      sms.ts            SMS provider abstraction
      store.ts          In-memory data store (matches Prisma schema 1:1)
      validators.ts     Zod schemas for every server input
      wallet-service.ts Deposit / withdraw / balance management
    i18n.tsx            EN + SW dictionary + provider
    mapigo-data.ts      Waveform math, mock rounds, session stats
    mock-data.ts        Sample matches, transactions, leaderboard
    utils.ts            cn() · formatTzs() · hexToRgba()
  middleware.ts         Edge security headers (CSP, HSTS, X-Frame, etc.)
prisma/schema.prisma    Postgres schema — 19 entities
docs/                   Source-of-truth design + security + sprint docs
docs/shots-dark/        Canonical dark-mode screenshots (current state)
docs/shots-light/       Canonical light-mode screenshots
scripts/screenshot.mjs  Playwright capture script (public + authed demo modes)
```

---

## Useful commands

```bash
# Dev server
npm run dev

# Type-check
npm run typecheck

# Capture all routes — dark + desktop only
node scripts/screenshot.mjs dark

# Capture all routes — desktop + tablet + mobile
node scripts/screenshot.mjs dark --all

# Capture public + demo-session-authed pages
node scripts/screenshot.mjs dark --authed

# Capture light mode
node scripts/screenshot.mjs light --all

# Verify every route returns 200 (or 307 for session-gated)
for p in / /live /bets /wallet /profile /leaderboard /games /mapigo /match/m1 /auth/login /auth/register /auth/otp ; do
  curl -s -o /dev/null -w "%{http_code}  $p\n" "http://localhost:3000$p"
done
```

---

## Status

**Sprint 0** ✅ Foundation, design system, scaffolding, schema, mock data
**Sprint 1** ✅ Auth + KYC + security primitives (audit, rate-limit, session, validators, middleware)
**Sprint 2** ✅ Wallet + payments (deposit/withdraw, AML threshold, mobile-money providers, withholding tax)
**Sprint 3** ⬜ Match data + pool engine + settlement (next)
**Sprint 4** 🟡 Bet placement (UI built; backend stub)
**Sprint 5** 🟡 Real-time + notifications (UI built; SMS templates done)
**Sprint 6** ⬜ Anti-fraud + match integrity
**Sprint 7** ⬜ Compliance UI + admin dashboard
**Sprint 8** ✅ Mapigo (signature game) — UI built
**Sprint 9** ⬜ Polish + soft launch

**Pre-launch blockers** (regulator-aligned):
1. Tanzania gaming lawyer engaged
2. Pre-application meeting with Gaming Board of Tanzania (GBT) — pool model + Mapigo classification in writing
3. Selcom or Azampay aggregator agreement signed
4. NIDA agreement signed
5. Sportradar Integrity Services partnership
6. ISO 27001 Stage 1 audit booked

See [`docs/SPRINTS_STATUS.md`](docs/SPRINTS_STATUS.md) for sprint detail and what's mock vs production-ready.

---

## Contact

Operator: Ali — Dar es Salaam
Regulator: Gaming Board of Tanzania (license number to be added to every page footer)
Helpline: 0800 11 0011 (placeholder until confirmed)
