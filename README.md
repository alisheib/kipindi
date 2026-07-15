# 50pick

**The wisdom of YES & NO.** Tanzania-licensed pari-mutuel prediction-markets platform.

Players pick **YES** or **NO** on a proposition (sports, weather, macro, crypto, culture, tech). Stakes from every player on the same market join one pool. After tax + commission (9% combined), the net pool is paid out only to the correct side, pro-rata to each correct stake's share of the winning pool. The implied probability on the conviction dial is live and updates with every new bet.

Bilingual EN + SW + FR. Mobile-first. Calm, premium, regulator-ready.

---

## Quick start

```bash
# Node 20+ required
npm install
npm run dev
```

Open `http://localhost:3000`.

For documentation written for the next engineer onboarding the codebase, read [`CLAUDE.md`](CLAUDE.md) first — it captures what's true about the codebase right now, where to look, and the conventions to follow.

---

## What's built

All surfaces below are E2E-tested. Total: **9 suites · 246 tests passing**.

| Area | Status | Tests |
|---|---|---|
| Public pages | ✅ | `/`, `/markets`, `/markets/[id]`, `/live`, `/leaderboard`, `/help`, `/legal/*` |
| Auth flow | ✅ | `/auth/login`, `/auth/register`, `/auth/forgot-password`, `/auth/otp`, `/auth/admin`, `/auth/logout` |
| KYC flow | ✅ | `/profile/kyc` — NIDA + document submission (real upload deferred to object-storage sprint) |
| Wallet | ✅ | `/wallet`, `/wallet/deposit`, `/wallet/withdraw` — SOF threshold, AML hold, withholding tax, six mobile-money providers (mock dispatcher) |
| Bet placement + resolution | ✅ 26 | Conviction dial → place → settle → wallet credit/debit (multi-player-resolution-e2e) |
| Notifications inbox | ✅ 13 | Bell dropdown, EN+SW per row, deep-link redirects, mark read / dismiss / mark all |
| AI candidate pipeline | ✅ 22 | `/admin/candidates` — L1 extract → L2 filter → L3 cross-verify → L4 score → human approval → publish (Claude API integration pending) |
| Reports | ✅ 11 | 5 regulator-grade reports × PDF + XLSX (GBT monthly, TRA tax, FIU SAR, SX register, ISO 27001 audit) with attestation block |
| Admin dashboard | ✅ 44 | Overview, live ops, finance, reports, players, markets, candidates, audit, AML, compliance, self-exclusions, privacy, retention, approvals |
| Visibility states | ✅ 44 | Every page's top-bar / nav / CTAs are correct for public / player / admin actors |
| Responsive | ✅ 70 | 393w / 768w / 1024w / 1280w / 1440w across every public + auth route |
| Auto-resolve | ✅ 31 | Demo markets settle on their own; payout math + notification + audit verified |
| i18n EN/SW/FR | ✅ 13 | Cookie + localStorage + `<html lang>` round trip survives reload + navigation |
| Flow architecture | ✅ 16 | Auth gates, KYC gates, RG gates, admin role gates, SOF threshold, /not-found, /error |

**Mocked / stubbed for dev** (interface stable, swap is one line per service):

- DB persistence — PostgreSQL via Prisma ORM (all entities in dedicated tables)
- SMS dispatch — console provider (production swaps to Twilio / Africa's Talking)
- NIDA verify — deterministic mock (production swaps to real mTLS endpoint)
- Document upload — storage-key stub (production swaps to S3-compatible bucket)
- Payment dispatch — instant approve (production swaps to Selcom or Azampay aggregator)
- AI market generation — pipeline + state machine ready; Claude API call site is stubbed (catalogue + fixtures wired)
- Sportradar match-integrity — stub adapter labeled in `/admin` + `/admin/compliance`

---

## Documentation

| File | Purpose |
|---|---|
| [`CLAUDE.md`](CLAUDE.md) | Onboarding doc — what's true about the codebase, where to look, conventions |
| [`docs/FLOWS.md`](docs/FLOWS.md) | Single source of truth for every redirect / gate / recovery path, with file:line anchors |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Full Prisma data model |
| [`RAILWAY.md`](RAILWAY.md) | Railway deployment + persistent-volume notes |
| [`RAILWAY_DB_README.md`](RAILWAY_DB_README.md) | Step-by-step Postgres provisioning on Railway |
| [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) | **Design authority** — palette, tokens, invariants (B1–B4). Read before any color, gradient, or composition change. Implementation: `src/app/globals.css`. ⚠️ The old `50PICK/design_handoff_prediction_market_kit/` is a superseded teal snapshot — do not build from it. |
| [`docs/50pick-admin-user-manual.pdf`](docs/) | Generated operator manuals (PDF + HTML, regenerable via `scripts/generate-pdfs.mjs`) |

---

## Project layout

```
src/
  app/                  Next.js App Router pages + route handlers
    auth/               login · register · otp · admin · forgot-password · logout
    wallet/             wallet · deposit · withdraw
    profile/            profile · kyc · responsible-gambling · source-of-funds · sessions · account
    markets/            markets index · markets/[id] · server actions
    positions/          player open + settled positions
    admin/              16 admin pages (see Documentation)
    api/                webhooks · dev-test endpoints · admin report streams
    error.tsx           Global error boundary (branded, no PII echo)
    not-found.tsx       Branded 404 with recovery links
  components/
    ui/                 Atoms — Button · Card · Chip · Avatar · LanguageToggle · etc.
    layout/             Shell — TopAppBar · BottomNav · NotificationsPanel
    admin/              AdminShell · AdminPageHead · AdminCard · AdminKpi
    brand/              FiftyMark · FiftyLockup · ConfidenceDial · ProbabilityBar · TippingBar
    markets/            ConvictionDial · MarketStats · ProbabilityBar · NotifyPoller · WinCelebration
    landing/            HeroConstellation · DriftParticles · RollingNumber
    rg/                 RealityCheckHost (session reality-check timer)
  lib/
    server/             SERVER-ONLY services (audit, auth, crypto, KYC, RG, wallet, market, etc.)
    i18n.tsx            EN + SW + FR dictionary + provider
    utils.ts            cn() · formatTzs() · etc.
  proxy.ts              Edge middleware — security headers + auth gate for /wallet, /positions, /profile, /admin
prisma/schema.prisma    Postgres schema
scripts/                Playwright E2E suites + screenshot capture + report renderers smoke + audit + i18n
public/brand/           Logo PNGs (color + white)
```

---

## Useful commands

```bash
# Dev server
npm run dev

# Type-check
npx tsc --noEmit

# Run any E2E suite (server must be running on :3000)
node scripts/multi-player-resolution-e2e.mjs
node scripts/candidate-pipeline-e2e.mjs
node scripts/flow-architecture-e2e.mjs
node scripts/notifications-redirect-test.mjs
node scripts/visibility-states-test.mjs
node scripts/responsive-overflow-test.mjs
node scripts/demo-auto-resolve-test.mjs
node scripts/i18n-toggle-e2e.mjs
node scripts/report-renderers-smoke.mjs

# Capture operator manual screenshots + regenerate PDFs
node scripts/capture-manual-screenshots.mjs
node scripts/generate-pdfs.mjs
```

---

## Pre-launch integration blockers

These are contract-pending — the platform code is ready to receive each adapter via the existing service interface.

1. **Selcom / Azampay** payment aggregator agreement → wires `src/lib/server/payments.ts`
2. **Twilio / Africa's Talking** SMS contract → wires `src/lib/server/sms.ts`
3. **Claude API** for AI market generation → wires the L1–L4 pipeline + cost tracking
4. **NIDA** mTLS endpoint → wires `src/lib/server/nida.ts`
5. **S3-compatible object storage** for KYC documents → wires the upload stub in `/profile/kyc`
6. **Sportradar Integrity Services** match-integrity feed → replaces the stub adapter
7. **GBT pre-application meeting** — pool model classification in writing
8. **ISO 27001 Stage 1 audit** booking

---

## Compliance posture

- HMAC-chained append-only audit log (`src/lib/server/audit.ts`) — every state change is verified at chain-walk time
- Two-officer rule on market settlement (stage-1 + stage-2 by distinct admins)
- Two-officer rule on AML approvals ≥ TZS 5M
- Self-exclusion + cooling-off + deposit-limit gates wired into every code path that bets / deposits / withdraws
- Source-of-Funds threshold gate on deposits ≥ TZS 1M (single) or ≥ TZS 5M (rolling 30d)
- KYC required for withdrawal (TZ Gaming Board model — bets allowed pre-KYC)
- Withholding-tax computation at withdrawal time
- Bilingual EN+SW player-facing copy across every flow

---

## Contact

Operator · Ali — Dar es Salaam
Regulator · Gaming Board of Tanzania (license number to be printed in every page footer on go-live)
Helpline · 0800 11 0011 (placeholder until the live number is confirmed)
