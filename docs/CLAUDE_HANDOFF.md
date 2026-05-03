# Claude Code — Handoff for the next session

**Read this first.** It tells you exactly where the project is, how to run it, and what *not* to do.

---

## TL;DR

Kipindi is a Tanzania-licensed pool-based time-window football betting platform with a signature live in-play game called Mapigo. We're past Sprint 17: foundation + auth + KYC + wallet + bet placement + Mapigo + security + concurrency lock + responsible gambling + legal pages + full admin/compliance dashboard (17 routes with real charts) + reality-check banner + cash-out + production deploy on Railway + admin login + TOTP gate + audit-ring durability + CSV reports + match-feed adapter wired into /live + rate-limit observability + 35+ adversarial/deep-security vectors covered (zero bugs found). All persistence is in-memory; Postgres swap is mechanical (one import per service). Every regulatory control is mapped in `docs/REGULATOR_AND_TEST_LAB_PACKET.md` (read this first if a regulator/test-lab question comes up).

**Live demo:** https://kipindi-production.up.railway.app — manager-facing, dark theme locked, demo session via "Try demo · TZS 100,000" landing CTA.

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

- **No real password authentication.** OTP-only matches the TZ market and avoids password-reset complexity early.
- **No real-time WebSockets.** The waveform / pool counters / live ticker are deterministic per render.
- **No two-factor auth beyond OTP.** Scheduled.
- **No CSP nonces in production.** Currently `'unsafe-inline'` and `'unsafe-eval'`; tighten with per-request nonces in polish.
- **Document upload backend.** Storage-key stub only; real S3 + virus scan + blur detection planned.
- **Admin dashboard is skeletal.** `/admin` overview + audit log + AML queue work; players + self-exclusions roster are placeholders pending Postgres iteration.
- **Light + system themes disabled.** Theme is force-locked to dark via `forcedTheme="dark"` in `theme-provider.tsx`. Light theme has known contrast bugs; toggle buttons render but are disabled. Re-enable after a polish pass.

## What's done in Sprint 17 (this session)

**Banners + popups + integrations + observability + deep security.** No new product surface — depth pass on what already exists.

### Integrations wired
- **Match-feed adapter wired into `/live`** — `src/app/live/page.tsx` now calls `getActiveAdapter().listToday()` instead of importing the static mock. Production swap: set `SPORTS_API_PROVIDER=api-football` and the matches arrive from the live feed. The `trace()` wrapper records latency on each call so `/admin/system` will show real adapter health once api-football is signed.

### Observability on /admin/system
- **Live rate-limit bucket table** — `rateLimitSnapshot()` (new export from `src/lib/server/rate-limit.ts`) returns the current `(action, key, tokens, capacity)` for every active bucket. Rendered as a sortable table on `/admin/system` with danger styling when tokens hit zero. Operator can see right now who is being rate-limited and why.
- **Provider name surfaced** — match-feed and SMS KPI deltas on `/admin/system` now display the active provider name (`mock-fixtures` / `api-football` / `console` / `selcom` / etc.), so the operator can see at a glance which adapter is in use.

### New automated tests
- `scripts/banners-popups-test.mjs` — **21 vectors** covering every overlay/banner/popup/dialog: demo banner on/off, confidential band on/off, notifications dialog open + Esc-close, betslip success card, toast, Mapigo win celebration, reality-check fire + dismiss (force-fired via sessionStorage), cross-page win toast (queued via sessionStorage), theme toggle cycle, language dropdown FR pick, empty states. **21/21 in isolation.**
- `scripts/security-deep-test.mjs` — **14 vectors** of deeper attacks: SQL-shaped msisdn, stored XSS in SOF declared-occupation, method tampering (GET/PUT/DELETE on POST routes), cookie injection, header smuggling, 64KB payload bomb, path traversal `/etc/passwd`, HTTP downgrade attempt, TOTP without provisioning, self-exclusion bypass. **14/14 — server stays up + zero data leaks** on every probe.

### Test isolation note
The full regression suite running back-to-back against the same in-memory store causes ~10 wallet-state assertions to fail (the demo wallet drains across suites). Each suite passes 100% in isolation. This is a test-fixture issue, not a system bug — production will have Postgres + per-test reset.

### Tests passing (this session)
- Banners/popups: **21/21** (isolated)
- Deep security: **14/14**
- Sprint 15 admin: **19/19**
- A11y: **22/22**
- Multi-viewport: **99/99** (zero overflow)
- Adversarial stress: **21/21** (isolated)
- Admin data integrity: **12/12** (isolated)

---

## What's done in Sprint 15 (previous overnight session)

**Full operator-management dashboard.** Built against Claude Designer&apos;s wireframes in `mapigo/admin-wf/*`. The shell, atoms, analytics layer, and 17 routes ship in one go.

### New components
- `src/components/admin/admin-shell.tsx` — `ConfidentialBand`, `AdminSidebar` (6-group nav with auto-badges from AML pending + SOF pending), `AdminTopBar` (breadcrumbs + officer chip + role badge), `AdminPageHead` (title + SW pair + period picker + actions slot), `AdminKpi`, `AdminCard`, `AdminBlock`, `AdminFunnel`, `AdminStackedBar`, `StatusPill`, `FeedRow`.
- `src/components/admin/admin-charts.tsx` — pure-SVG `AdminAreaChart` (line+area with grid + end-dot + x-labels), `AdminStackedBars` (multi-series stacked bar), `AdminFunnelChart` (proportional horizontal bars with conversion %).
- `src/lib/server/analytics.ts` — `grossGamingRevenue`, `netGamingRevenue`, `depositsTotal`, `withdrawalsTotal`, `providerSummary`, `activePlayers`, `walletLiabilityTotal`, `kycFunnel`, `rgRosterCounts`, `userStatusCounts`, `topNgrContributors`, `operatorMarginPct`, `amlThresholdBreaches`, `moneyFlowSeries`, `marginSeries`, `providerStackedSeries`, `listProvidersInPeriod`. Each function maps 1:1 to a single Postgres query for the production swap.

### New routes (17 admin pages)
- `/admin` — Overview cockpit: 4 KPIs, money-flow area chart, live activity feed, KYC funnel, provider mix, self-exclusion + integrity tiles
- `/admin/live` — Live ops: live-match table, money-flow chart, bet feed, wallet feed
- `/admin/finance` — 8 KPIs, net-flow chart, margin chart, provider stacked-bar, top-10 concentration, provider summary table, CSV/PDF export buttons
- `/admin/reports` — 8 regulator templates (GBT / TRA / FIU / ISO / KYC re-verify / SX register / RG engagement / match-integrity), generation log
- `/admin/players` — restyled to new shell, links each row to per-player drill-down
- `/admin/players/[id]` — full per-player drill-down with risk score, 4 quick KPIs, 7 tabs (Activity / Bets / Transactions / KYC / Limits / Self-exclusion / Audit), sticky privileged-actions bar with two-person approval queue
- `/admin/players/cohorts` — by status / region / age band, registrations-over-time bar chart
- `/admin/games/match` — match-betting analytics with per-match table + live snapshot
- `/admin/games/window` — per-window pool analytics with stacked-bar status mix
- `/admin/games/mapigo` — call distribution vs outcome distribution + recent rounds
- `/admin/compliance` — chain integrity + backup status + KYC funnel + AML mini-queue + RG row + integrity table + reports list
- `/admin/aml` — restyled, two-button approve/reject (already wired Sprint 12-13)
- `/admin/self-exclusions` — real roster from `db.user.list()` × `db.responsible.get()`, sorted by next expiry
- `/admin/audit` — restyled to new shell, category chips
- `/admin/system` — 4 health KPIs (chain / users / match-feed / SMS) + backup-now + verify-chain
- `/admin/approvals` — two-person approval queue (AML pending + SOF pending), recent approval activity
- `/admin/2fa/setup` — restyled

### Demo session is admin-equivalent
The admin layout gates on `session.demoMode || ADMIN_ROLES.has(u.role)`. The manager&apos;s demo session sees the full dashboard for the walkthrough — no separate login needed.

### Screenshots
17 admin pages × 2 themes (dark + light) = **34 PNGs** at `docs/shots-admin/`. Captured at 1440×900.

### Tests passing
- A11y: 22/22
- Multi-viewport: 99/99 (admin pages excluded from phone audits — desktop-first per design brief)
- Stress: 11/11
- Sprint 9 / 10 / 14 regression: 27/27
- Sprint 15 admin test: 19/19
- Golden-path E2E: 12/12
- **Combined: 190/190**

## What's done in Sprint 14

- **Locale persistence done right** — `kp-locale` cookie set by the language dropdown, read in `layout.tsx` server component to drive `<html lang>` on first paint. No more flash-of-EN-then-flip. localStorage kept as a fallback for back-nav speed.
- **French now actually drives the UI** — bottom nav reads `t.nav.*`, landing CTAs read `t.common.tryDemo` and `t.common.browseMatches`, OTP messages have FR variant. Dict expanded: `tryDemo`, `browseMatches`, `signIn`, `signOut`, `cashOut`, `help`, `language`.
- **2FA admin login flow** — `/admin/2fa/setup` provisions a TOTP secret, renders the otpauth URI for QR scanning, verifies the 6-digit code, supports remove + re-provision. RFC 6238 backed by `lib/server/totp.ts`.
- **Match-feed adapter scaffolding** — `lib/server/match-feed.ts` introduces `MatchFeedAdapter` interface. `getActiveAdapter()` returns mock or api-football based on `SPORTS_API_PROVIDER` env. Production swap is one env var + filling the api-football TODO. `trace()` wrapper records latency + errors for the eventual `/admin/system` health panel.
- **SMS adapter rewrite** — `lib/server/sms.ts` now ships Selcom, Beem, and Africa's Talking adapter stubs. Picks active provider via `SMS_PROVIDER` env. `smsHealthSnapshot()` returns sent/failed/successRate for system health. FR added to `otpMessage()`.

## What's done in Sprint 12+13 (combined)

- **Admin player roster is now real** — `/admin/players` iterates `db.user.list()` (added in this sprint), supports search by phone / display name / user-id, filters by status, links each row to `/admin/audit?actorId=…` for drill-down. Joins wallet balance per row.
- **Functional AML approve / reject** — `/admin/aml` action buttons no longer disabled. Approve flips a transaction to CONFIRMED + audited; Reject reverses funds back to wallet (for withdrawals) + flips to FAILED + requires a written reason ≥ 5 chars + audited. Two-person approval is documented as the production hook; this build records single-officer with a `twoPersonApproval: "single-officer-build"` flag in the audit payload so the swap is one diff.
- **Help & Support page** — `/help` with 8-question FAQ (bilingual EN+SW), three contact cards (phone, email, in-app chat placeholder), quick-link cards to RG / wallet / bets.
- **Active sessions page** — `/profile/sessions` reads the current session cookie, parses user-agent for device + browser, shows session lifetime + IP + role + KYC status. Sign-out from this device + production-multi-device note.
- **Light-mode dark-on-dark text bug fixed** — replaced inherited `text-onBrand` with explicit `text-white` (or `text-white/N` for opacity) on every dark-card panel: `/games` hero, `/mapigo` page wrapper, `/profile` user banner, `/match/[id]` hero, `mapigo-showcase` landing component. Root cause: in light mode, parents with `text-onBrand` failed to cascade the white color reliably to descendants — explicit `text-white` resolves both themes identically.
- **Profile menu cleanup** — added Active sessions + Help & Support; the page now lists 7 real routes (My account, RG, Verify ID, Source of funds, Active sessions, Help, Sign out). Zero dead `href="#"` links.
- **Removed remaining "Signature game" wording** from /games hero + mapigo-showcase landing.
- **Golden-path E2E test** at `scripts/golden-path-test.mjs` — 12 checks covering the entire manager flow on a phone-sized viewport: landing CTA, demo session, wallet, place bet, cash-out offer visible, Mapigo win, notification delivered, profile rows, every major route returns 200, logout, gated-route block, production headers.

## What's done in Sprint 11

- **LanguageToggle is now a dropdown** at every viewport (EN / Kiswahili / Français). Globe icon + current locale + chevron; opens a 3-row menu. The previous 2-button or 3-button pill implementations were unmaintainable — single dropdown scales cleanly when more locales arrive.
- **French (fr) added to i18n** — full `common`, `nav`, `mapigo` translations in `src/lib/i18n.tsx`. `setLocale("fr")` works end-to-end; the document root's `lang` attribute updates to "fr" so screen readers + Lighthouse pick up the change.
- **Header collisions fixed at desktop** — nav items shrunk from `text-caption tracking-[0.14em] px-2.5` to `text-micro tracking-[0.10em] px-2`. Theme toggle simplified to a single icon button that cycles light → system → dark. Dead Search button removed.
- **Light theme re-enabled** — `forcedTheme="dark"` removed from `theme-provider.tsx`. The theme toggle is functional again. **Light theme has known cosmetic issues that are queued for a polish pass — not blocking, but the dark theme is the canonical brand at this moment.**
- **Dead-button audit** — removed dead `href="#"` rows from /profile (Notifications, Active sessions, Help, Language). Wrapped /profile "Continue verification" button in a `<Link>`. Removed dead "How it works" buttons from /mapigo and /games headers. Profile now lists only routes that actually exist (account, RG, KYC, source-of-funds, sign-out).
- **Copy scrub** — removed all references to the operator's specific take percentage from user-facing UI (the regulator-required disclosure stays in `/legal/terms` but is now phrased as "the operator's published payout structure is filed with the GBT and available on request"). Removed "signature game" wording from the landing — Mapigo is now described as "in-play" or just "Mapigo".
- **Landing-page V2 design brief** at `docs/DESIGN_REQUEST_LANDING_V2.md` — ready for Claude Designer. Locks the brand baseline, lists the seven required sections, names benchmarks (Stripe / Apple Sports / Pinnacle) and anti-patterns to avoid (SportPesa-style noise).

## What's done in Sprint 10

- **Real notifications service** — `src/lib/server/notification-service.ts` + `_actions/notifications.ts` server actions. DB-backed (in-memory shim), bilingual EN+SW, mark-read / dismiss / mark-all. Fires automatically on `bet.won`, `mapigo.bet.won`, `deposit.confirmed`. The notifications panel polls every 30s, falls back to a static demo list when no real notifications exist (so the marketing landing still has visual content).
- **Source-of-funds declaration form** at `/profile/source-of-funds` — AML EDD UI mandated by Tanzania POCA Cap 423 + FATF Recommendation 12. Captures source, occupation, employer, annual income band, free-text "other", with anti-perjury notice. Submission audited as `COMPLIANCE / sof.submitted`. Stored at `db.sourceOfFunds`.
- **Sportradar match-integrity adapter** — `src/lib/server/integrity-service.ts`. Stub returns deterministic suspicion scores; production swap is one fetch call. Auto-escalates `suspicious` / `confirmed` alerts: voids open bets on the match and refunds stakes (with paired transactions + audit).
- **Bet history pagination** — 12-per-page, prev/next controls, "Showing 1–12 of 45" footer.
- **Accessibility (WCAG 2.1 AA basics) — 22/22 pages clean**. Added `<h1>` to /mapigo, /match/[id], /profile (sr-only where the visual is non-textual). Added labels to /profile/responsible-gambling selects. Added `aria-label` to back-arrow links.

## What's done in Sprint 9

- **Backup system** at `src/lib/server/backup.ts` — debounced JSON snapshot of `globalThis.__KIPINDI_STORE` to `.kipindi-backups/` after every mutation (1.5s debounce, 12-snapshot rolling history). HMAC-signed with SESSION_SECRET so a manual edit fails verification on next boot. Auto-restore on first import in `store.ts`.
- **Audit hash-chain** in `src/lib/server/audit.ts` — every entry now has `prevHash` + `entryHash`, forming a Merkle-style chain. `verifyChain()` walks from genesis to head; admin `/admin/system` page exposes a "Verify chain" button.
- **User self-service** at `/profile/account` — own activity feed, GDPR Art 15 data export (download as JSON), GDPR Art 17 account closure with confirm-phrase guard. Backed by `src/lib/server/user-service.ts`.
- **2FA primitive** in `src/lib/server/totp.ts` — RFC 6238 TOTP, otpauth URI for QR-code provisioning, ready to wire into admin login flow when admin accounts exist.
- **Admin system page** at `/admin/system` — Backup-now + Verify-chain buttons; documents production posture (Postgres PITR + nightly chain re-verification).
- **Tablet responsive overhaul** — desktop nav moved from `lg:` (1024) to `xl:` (1280) so tablet portrait + landscape both get the bottom nav. 100/100 pages clean across 4 viewports (393, 430, 768, 1024).

## What's done in Sprint 8

- **Reality-check banner** at `src/components/rg/reality-check.tsx` — fires every 30 min (configurable) for authed users, shows time on platform, links to limits / break / self-exclude. Mounted in `app-shell.tsx` only when a session exists.
- **Cash-out for match bets** — `cashOutBet()` and `previewCashOut()` in `bet-service.ts`. Pricing: stake × payRate × 0.62 with a 60% floor. UI on `/bets` shows offer + button; cash-out fires `bet.cashed_out` audit event. Server action at `src/app/bets/actions.ts`.
- **Mobile responsive overhaul** — top app bar's theme + language toggles collapse to single icon buttons below `lg`; wallet card relayout (TZS balance prominent, action buttons in 2-col grid below); fixed `/dashboard` 404 on landing CTAs; added prominent "Try demo · TZS 100,000" CTA.
- **Pop-in animation overshoot fix** — `kp-pop-in` keyframe no longer overshoots to 1.04 (was making bet-placed card visibly exceed its container).
- **Production deploy** — Railway, GitHub auto-deploy, dark theme locked.
- **Lazy secret resolution** — `crypto.ts` no longer throws at module load in production builds; only at runtime use. Allows `next build` to complete on Railway without env vars set yet.

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
