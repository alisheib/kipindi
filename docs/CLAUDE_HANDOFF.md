# Claude Code — Handoff for the next session

**Read this first.** It tells you exactly where the project is, how to run it, and what *not* to do.

---

## TL;DR

Kipindi is a Tanzania-licensed pool-based time-window football betting platform with a signature live in-play game called Mapigo. We're past Sprint 7b: foundation + auth + KYC + wallet + bet placement + Mapigo + security + concurrency lock + responsible gambling + legal pages + admin/compliance dashboard all built and live on `http://localhost:3000`. All persistence is in-memory; Postgres swap is mechanical (one import per service). Every regulatory control is mapped in `docs/REGULATOR_AND_TEST_LAB_PACKET.md` (read this first if a regulator/test-lab question comes up).

The user (Ali) is the operator, non-technical, in Dar es Salaam, working with a successful TZ government-side manager who reviews builds. He cares deeply about typography, brand consistency, and regulator-readability. Don't slip on those.

---

## How to start a session

```bash
npm run dev   # http://localhost:3000
```

If `npm run dev` fails to find `next`, the `.bin` shims didn't generate. Run via node directly:

```bash
node node_modules/next/dist/bin/next dev -p 3000
```

If the SWC binary is locked (Windows + Defender), the WASM fallback `@next/swc-wasm-nodejs` is already in `package.json` — Next will use it automatically.

---

## Architecture invariants — DO NOT BREAK

1. **Server / client boundary is sacred.** Server Components render most pages. Client Components are marked `"use client"`. Never pass functions from a Server Component to a Client Component (e.g. `format={someFn}` is forbidden — use string preset enums instead, see `CountUp`).
2. **Tokens come from the design system, not invention.** Every color, size, radius, motion easing, shadow is defined in `tailwind.config.ts` + `globals.css`. Don't add ad-hoc colors. The brand rule is: positive = gold, active = royal, neutral = grey, danger = muted dark-red, live = gold pulsing dot. No green/red Bootstrap leakage.
3. **Typography uses Sora display / Inter body / JetBrains mono only.** Loaded via `next/font/google` in `layout.tsx`. Don't add other fonts.
4. **Security headers come from middleware**, not from inside pages. Don't add `<meta>` headers that overlap.
5. **Service layer never imports React.** Files in `src/lib/server/*` are server-only. Pages call them via Server Actions. Don't import them from Client Components.
6. **Every state change is audited.** If you mutate a wallet, KYC, session, or bet, call `audit({ ... })` from `src/lib/server/audit.ts`. Regulators look at this.
7. **All copy ships EN + SW.** "Pool grew · Bwawa limeongezeka". Loss is *never* "you lost" — it's "the pool grew" (sensitive copy rule, see `DESIGN_SYSTEM.md §2.17`).

---

## Where things live (code map)

See [`README.md`](../README.md) "Project layout" section. Highlights:

- `src/app/` — Next.js App Router pages
- `src/lib/server/` — server-only services (auth, KYC, wallet, payments, audit, rate-limit, session, crypto, store, sms, nida, demo-mode, validators)
- `src/components/{ui,layout,charts,betting,landing,mapigo}/` — UI atoms grouped by domain
- `src/middleware.ts` — security headers
- `prisma/schema.prisma` — production data model (in-memory `store.ts` matches its interface 1:1)
- `docs/` — source-of-truth design + security + sprint docs

---

## What's mocked vs production-ready

| Mock | Production swap |
|---|---|
| `src/lib/server/store.ts` (in-memory `Map`) | Replace each `db.*.method()` with PrismaClient call |
| `src/lib/server/sms.ts` (console writer) | Selcom or Beem HTTP adapter |
| `src/lib/server/nida.ts` (deterministic mock) | NIDA mTLS endpoint per signed agreement |
| `src/lib/server/payments.ts` (instant approve) | Selcom or Azampay aggregator (BoT-licensed) |
| `src/lib/server/audit.ts` (in-memory ring) | Postgres `AuditLog` (schema defined) — schema is a 1:1 match |
| `src/lib/server/rate-limit.ts` (in-process) | Redis cluster — interface unchanged |

The point is: each is a **single-file change**. The calling code never changes.

---

## Demo mode

`/auth/login` shows a "Reviewer access · dev only" card with an **Enter demo** button. Hitting it (or hitting `/auth/demo` directly):

1. Creates `Demo Manager` user with phone `+255700000000` if missing
2. Sets KYC `APPROVED` with mock NIDA + 3 documents
3. Resets wallet to TZS 100,000 / 0 hold / 0 pending
4. Issues a session cookie with `demoMode: true` flag
5. Audits as `SECURITY · demo.entered`
6. Redirects to `/`

The session cookie carries `demoMode: true`. The `<DemoBanner>` component (in `app-shell.tsx`) reads this and shows a gold strip at the top of every page. "Exit" calls `/auth/logout` which clears the cookie.

**Disable in production** by setting `DEMO_MODE_ENABLED=false` (or simply leaving it unset when `NODE_ENV=production`).

---

## Routes — full inventory

**Public** (no session required):
- `/` Landing — Kinetic Stadium variation 2 (3-col hero, statement band, Mapigo showcase, stats panel, fixtures)
- `/live` All matches
- `/match/[id]` Match detail with bet slip + live bets feed
- `/bets` My bets (mock data when guest)
- `/wallet` Wallet (mock data when guest, real when authed)
- `/profile` Profile (mock data when guest, real when authed)
- `/leaderboard` Leaderboard
- `/games` Mapigo hero tile + how-it-works
- `/mapigo` Signature game canvas
- `/auth/login` Phone-first login + demo card
- `/auth/register` Account creation with age gate + terms
- `/auth/otp` 6-digit verification

**Session-gated** (307 redirect to `/auth/login` when no session):
- `/profile/kyc` 3-step KYC wizard
- `/profile/responsible-gambling` Deposit limits, time limits, cooling-off, self-exclusion
- `/wallet/deposit` Provider selection + amount + confirmation
- `/wallet/withdraw` Amount + KYC gate + AML threshold + tax notice + OTP
- `/admin` Compliance overview (KPIs + latest audit)
- `/admin/audit` Full audit log with filters
- `/admin/aml` AML / EDD review queue
- `/admin/players` Player roster (placeholder)
- `/admin/self-exclusions` Self-exclusion roster

**Public legal pages** (no session required):
- `/legal/terms` `/legal/privacy` `/legal/responsible-gambling` `/legal/aml`

**Route handlers**:
- `/auth/demo` Enter demo session (POST or GET)
- `/auth/demo-mapigo-reset` Test-only: settles all OPEN Mapigo rounds (gated by `isDemoModeAllowed`)
- `/auth/logout` Clear session (POST or GET)

---

## What I didn't do (intentional)

- **No real password authentication.** OTP-only matches the TZ market and avoids password-reset complexity early. Add it in Sprint 6 when admin accounts exist.
- **No real-time WebSockets.** The waveform / pool counters / live ticker are deterministic per render. Real-time push lands in Sprint 5.
- **No two-factor auth beyond OTP.** Scheduled Sprint 6.
- **No CSP nonces in production.** Currently `'unsafe-inline'` and `'unsafe-eval'` for Next dev; tighten with per-request nonces in Sprint 9 polish.
- **Document upload backend.** Storage-key stub only; real S3 + virus scan + blur detection in Sprint 2 production push.
- **Admin dashboard is skeletal.** `/admin` overview + audit log work; players + self-exclusions roster are placeholders pending Postgres iteration.
- **Reality-check banner.** RG settings store the interval; the surfacing UI is queued for Sprint 6.

---

## Hard truths to share with Ali if relevant

- The pool-based payout model **may need formal classification** by GBT before live launch. Lawyer-first.
- **Match-fixing risk** is real on 60-second Mapigo windows. Sportradar Integrity Services partnership is non-negotiable.
- The **15% withholding tax + 25% gaming GGR tax** double-hit makes margin tight; the schema's default 15% house take is already pushing the lower bound.
- **Customer trust beats features.** SportPesa, Betway, M-Bet have brand. We win on UX + Mapigo + transparency, not on more markets.

---

## Things to do *before* Sprint 3

1. Provision Postgres (Docker compose ships in `docker-compose.yml` — TODO if missing)
2. Swap `store.ts` → PrismaClient (one-shot per service file)
3. Wire `audit.ts` to persist to `AuditLog` table
4. Stand up real SMS provider in `sms.ts` (Selcom is preferred — both messaging + payments)

These four steps would close ~80% of the "production-ready" gap on what's already built.

---

## Style + voice for next session

- Match Ali's tone — direct, confident, premium-product-minded.
- He pushes back when something looks "rookie." Listen and fix; don't defend.
- "Test everything" means actually test — curl every route, take screenshots, check both light + dark + mobile + tablet.
- Don't add new dependencies casually. The user's other projects use Next + Prisma + Tailwind; stay aligned.
- Use the design system tokens. Inventing new colors is a frequent regression.

---

## When in doubt

- Check `docs/DESIGN_SYSTEM.md` first
- Check `docs/SECURITY.md` for any control claim
- Check the existing component first before building a new one (very likely it exists)
- Run `for p in /live /wallet /mapigo /auth/login ; do curl -s -o /dev/null -w "%{http_code} $p\n" "http://localhost:3000$p" ; done` before committing anything
