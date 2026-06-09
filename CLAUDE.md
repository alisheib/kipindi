# 50pick / Kipindi — Claude Onboarding

> Read this first. It tells you what's true about the codebase right now,
> and where to look before editing anything.

## What this is

**50pick** (working name **Kipindi**) — Tanzania-licensed pari-mutuel
prediction-markets platform. Players pick YES or NO on a proposition
(sports, weather, macro, crypto, culture); winners share the losing
pool minus an operator margin (default 9%). Mobile-first, bilingual
EN + SW (FR also wired), regulator-ready.

- **Repo:** `C:\kipindi`
- **GitHub:** `https://github.com/alisheib/kipindi.git` (private)
- **Live demo:** `https://kipindi-production.up.railway.app`
- **Operator:** Ali, Dar es Salaam (non-technical — lead on architecture
  and design decisions, ask in plain English).

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Turbopack
- Tailwind CSS 3, design tokens in `src/app/globals.css` + `tailwind.config.ts`
- next-themes for light/dark
- Prisma 6.5 (downgraded from 7 — Prisma 7 broke `url = env("DATABASE_URL")` inline)
  with managed Postgres on Railway. Single source of truth: when `DATABASE_URL`
  is set we read/write a single `StoreSnapshot` row in Postgres; otherwise we
  fall back to disk snapshots in `STORE_BACKUP_DIR` (see "Persistence" below).
- Playwright for E2E (driven directly via the SDK, not @playwright/test)

## Source of truth

| Topic | File |
|---|---|
| Design kit (palette, banners, screens, tokens) | [`50Pick/design_handoff_prediction_market_kit/kit/`](50Pick/design_handoff_prediction_market_kit/kit/) — **read before any color / composition / hero change** |
| Prisma data model | [`prisma/schema.prisma`](prisma/schema.prisma) |
| In-memory store (Prisma-shaped) | [`src/lib/server/store.ts`](src/lib/server/store.ts) |
| Auth service | [`src/lib/server/auth-service.ts`](src/lib/server/auth-service.ts) |
| Market service / pool engine | [`src/lib/server/market-service.ts`](src/lib/server/market-service.ts) |
| Crypto (scrypt, HMAC, OTP) | [`src/lib/server/crypto.ts`](src/lib/server/crypto.ts) |
| Railway deploy notes + env vars | [`RAILWAY.md`](RAILWAY.md) |
| Postgres swap walkthrough | [`RAILWAY_DB_README.md`](RAILWAY_DB_README.md) |
| Flow architecture (every redirect + gate) | [`docs/FLOWS.md`](docs/FLOWS.md) |

## Auth — current state (June 2026 hardened)

**Phone + password** (interim). OTP code paths preserved — switch back
once SMS provider (Selcom/Beem) is signed.

### Registration flow
```
Form → Zod (phone, DOB 18+, terms) → password rules (min 8, common
blacklist) → rate limit (per-phone + per-IP) → withLock(register:{phone})
→ duplicate check → scrypt hash → create user + wallet → affiliate bind
→ createSession → redirect
```

### Login flow
```
Form → Zod phone → rate limit (per-phone + per-IP) → find user
→ check status (self-excluded/suspended/closed) → check lockout (5
fails → 30 min) → withLock(login:{userId}) → re-read fresh counter
→ verify password → on fail: increment + maybe lock → on success:
clear counter → admin bootstrap check → createSession → redirect
```

### Session system
- **Single active session per account.** New login on any device
  instantly revokes all prior sessions. The revoked device sees
  "Signed out — your account was signed in on another device."
- Server-side registry (`userId → activeSessionId`) in globalThis.
  Self-heals after Railway restart (first device to request claims slot).
- HMAC-SHA-256 signed HttpOnly cookie, SameSite=Lax, Secure in prod.
- 7-day absolute expiry + 24h idle timeout + 5-min refresh throttle.
- Every session event audited (create, expire, idle, revoke, destroy).

### OTP verification (for future SMS)
- Checks ALL active OTPs for a phone+purpose, not just the newest.
  Fixes SMS delivery-order mismatch (user receives OTP #1 after #2).
- On match: consumes ALL active OTPs for that phone+purpose.
- On no match: increments attempt counter on most recent OTP only.

### Race condition protection
- `withLock("register:{phone}")` — prevents duplicate user creation
- `withLock("login:{userId}")` — serialises password check + counter update
- Rate limit per-phone + per-IP on both login and register

### Chat history
Chat (`sessionStorage`) is cleared on logout/session-revoke so the next
user on the same browser starts fresh.

### Admin bootstrap
Set `ADMIN_BOOTSTRAP_PHONES=+255712345678,...` in Railway env.
Auto-promotes on both register AND login (idempotent, never demotes).

### Roles
`PLAYER | AGENT | MODERATOR | ADMIN | COMPLIANCE | SUPPORT`. Non-player
redirects to `/admin` after login.

## SMS — currently dummy

`src/lib/server/sms.ts` defaults to the `console` provider — OTP codes
print to stdout, never leave the server. Selcom / Beem / Africa's Talking
adapters are stubs. Until you sign Selcom or Beem, **OTP cannot be
delivered to a real phone** — that's the only reason auth is on
password right now.

## Persistence

In-memory `Map`s in `store.ts`, snapshot to Postgres every 500 ms
(`src/lib/server/backup.ts`). **Wallet and transaction mutations use
`tapCritical()` for immediate flush** — near-zero data loss window for
financial operations. Non-financial mutations use debounced `tap()`.

All wallet mutations are protected by `withLock("wallet:{userId}")` —
`deposit`, `withdraw`, `creditInternal`, `buyPosition`, `cashOut`,
`resolveMarket`, and AML reject refund. Zero unprotected balance
read-modify-write sequences remain.

Full Prisma entity migration (converting 358 `db.*` calls across 73
files to async per-row Prisma queries) is the next architectural step.
The current snapshot approach is production-safe for a single Railway
instance but needs advisory locks for multi-instance scaling.

## Deploy workflow

```
cd C:\kipindi
# Make your change
git add <files>
git commit -m "Sprint NN: short title — one-line summary"
git push                  # Railway auto-redeploys in 2–3 min
```

Required Railway env vars (set in service → Variables):

| Var | Purpose |
|---|---|
| `SESSION_SECRET` | ≥ 32 chars; HMAC for session cookies + snapshot signature |
| `OTP_PEPPER` | ≥ 16 chars; global pepper for OTP hashing |
| `ADMIN_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-promote on first register |
| `STORE_BACKUP_DIR` | path on a Railway volume so snapshots survive redeploys (recommended) |
| `SMS_PROVIDER` | `console` (current) / `selcom` / `beem` / `africas-talking` |
| `SMS_SENDER_ID` | TCRA-licensed sender ID once SMS goes live |
| `NODE_ENV` | `production` on Railway |
| `NEXT_PUBLIC_APP_URL` | `https://kipindi-production.up.railway.app` |
| `TESTER_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-fund 100K TZS on register |
| `ADMIN_TEST_DEPOSITS` | `true` to enable uncapped admin deposits; unset = enabled in dev only |
| `ANTHROPIC_API_KEY` | Anthropic API key for live chatbot (Claude Haiku 4.5). Omit = stub mode |

## Test scripts

Run with `node scripts/<name>.mjs`. They use the dev server on `:3000` and
hit dev-only helpers under `/api/dev-test/*` (returns 404 in production).

| Script | What it covers |
|---|---|
| `multi-player-resolution-e2e.mjs` | **Authoritative settlement test.** 4 players + 2 officers, mixed YES/NO bets, two-officer settlement, wallet deltas, win/loss notifications, audit chain, money conservation. 26/26. |
| `candidate-pipeline-e2e.mjs` | AI market-candidate state machine — seed L1–L4 fixtures, officer queue, approve/reject/publish, audit. 22/22. |
| `flow-architecture-e2e.mjs` | Every redirect + gate — auth gates, KYC gate, /not-found, SOF threshold gate, locale preservation. 16/16. |
| `notifications-redirect-test.mjs` | Bet-placed receipt + win/loss receipt + click-through to market / positions. 13/13. |
| `visibility-states-test.mjs` | Top-bar / nav / CTAs per actor (public · player · admin). 44/44. |
| `responsive-overflow-test.mjs` | 393/768/1024/1280/1440 across all public + auth routes. 70/70. |
| `demo-auto-resolve-test.mjs` | Auto-resolved demo markets settle correctly + emit notifications. 31/31. |
| `i18n-toggle-e2e.mjs` | EN/SW/FR cookie + localStorage + `<html lang>` round trip + persistence. 13/13. |
| `report-renderers-smoke.mjs` | Renders every catalogue entry (5 reports × PDF + XLSX) and checks magic bytes. 11/11. |
| `break-it-player.mjs` | 23 manipulator scenarios — auth bypass, cookie tampering, stake validation, race, KYC, XSS, privilege escalation. |
| `break-it-admin.mjs` | 10 admin-portal QA scenarios — anon + player gating, TOTP cookie spoofing, forged Server Actions, CSV gating. |
| `multi-viewport-audit.mjs` | 99 routes × 4 viewports for layout overflow. |
| `overlay-responsiveness-test.mjs` | Notifications / language menu / avatar / reality-check inside viewport. |
| `screenshot.mjs` | Capture all routes (light/dark, public/authed). |
| `capture-manual-screenshots.mjs` | 19 screenshots (10 player + 9 admin) for the user manuals. |
| `generate-pdfs.mjs` | Render the 4 production PDFs (operator brief, technical brief, player manual, admin manual). |
| `rasterize-pdfs-for-audit.mjs` | Per-page PNGs of every PDF for visual audit before delivery. |
| `auth-stress.js` | 100+ concurrent auth requests — duplicate registration race, login counter corruption, brute-force lockout, malformed input flood. |

### Dev-test helpers

| Endpoint | Purpose |
|---|---|
| `POST /api/dev-test/promote-admin` `{ phone }` | Mark a registered phone as ADMIN |
| `POST /api/dev-test/seed-wallet` `{ phone, amount }` | Credit a wallet for test scenarios |
| `POST /api/dev-test/seed-candidates` | Seed the AI market-candidate pipeline with 6 fixtures across every terminal state (4 PENDING_REVIEW, 1 L2-rejected politics, 1 L4-rejected low-confidence) |
| `POST /api/dev-test/fast-forward-market` `{ marketId }` | Pull a market's resolution to +1h so it appears in the resolver queue |
| `POST /api/dev-test/reset-rate-limits` | Wipe per-IP / per-phone token buckets |
| `GET  /api/dev-test/last-otp?phone=...` | Last OTP code for a phone (when SMS is on `console`) |

## Design rules

- **Hue 268 = royal indigo** — the brand canvas. Any "teal-*" token in
  CSS/Tailwind is a backward-compat alias for royal indigo, not actual teal.
- **Gold (~hue 80)** is the primary accent — primary CTAs are `btn btn-gold`.
- **Claret (~hue 22)** is heritage / danger.
- **YES = green / NO = red** — only inside actual betting actions
  (`btn btn-yes` / `btn btn-no`). Never a green/red navigation CTA — those
  are gold.
- **Headings** = `font-display` (Sora). **Body** = default (Inter via `--font-sans`).
  **Numbers / labels / mono** = `font-mono` (JetBrains Mono).
- **No emojis in UI copy** unless explicitly requested.

## Working with Ali

- Lead on architecture and design decisions; he is non-technical.
- He doesn't want screenshots dumped after every sprint — only on request.
- For any color, gradient, hero composition, or banner change: **read
  `50Pick/design_handoff_prediction_market_kit/kit/` first.** This was a
  hard-learned lesson — the `--hero-grad-warm` token was named "warm" but
  the kit's actual hero is a deep royal radial; trust the kit, not the name.
- The Tanzania licensing path (Gaming Board of Tanzania) and the Selcom
  payment + SMS aggregator are real prerequisites. Don't ship paid flows
  before both are signed.

## Open hard blockers before public launch

1. **SMS contract** (no OTP delivery in production right now — currently
   on `console` provider so OTP codes print to stdout).
2. **GBT pre-application meeting** (regulator confirmation that the
   pari-mutuel pool model classifies as betting under their license).
3. **Mobile-money aggregator agreement** — deposit / withdrawal flows
   are wired against a stub `INTERNAL` provider; need a licensed
   Tanzanian aggregator (Selcom / Pesapal / etc.) before paid traffic.
4. **Match-integrity feed** — currently no Sportradar (or equivalent)
   live feed; football market resolution is manual via the admin UI.

Already shipped (was on this list before):

- ✅ **Postgres persistence** — single-row StoreSnapshot pattern wired
  via `DATABASE_URL`. Disk fallback when no DB is configured.
- ✅ **TOTP for admins** — code at `/admin/2fa/setup`, enforced on every
  privileged action.
- ✅ **Two-officer settlement defense-in-depth** — `requireAdminOrThrow`
  in `src/app/markets/actions.ts` runs inside every privileged Server
  Action, not just the layout.

## Postponed features

- **Hero slideshow / video background** — full-bleed Ken Burns image slideshow
  for the landing page. Component built at `src/components/landing/hero-slideshow.tsx`,
  20 WebP images in `public/hero/slides/`. Waiting for professional album before
  activating. See [`docs/hero-slideshow-dev/`](docs/hero-slideshow-dev/) for
  wiring instructions.
- **Full Prisma entity migration** — converting in-memory `db.*` calls to async
  Prisma per-row queries. Schema ready, snapshot durability already hardened.
  Multi-session project (358 calls across 73 files).

## UX commitments (kit-faithful)

- **Every consequential mutation goes through the unified `OperationResultModal`**
  ([src/components/markets/operation-result-modal.tsx](src/components/markets/operation-result-modal.tsx)) —
  large ✓ / ✗ crest, eyebrow + headline + bilingual subtitle, optional
  detail rows, primary + ghost CTAs. Success auto-dismisses at 5 s;
  failures stay until dismissed (LCCP informed-consent pattern).
- **Confirmations**: bet → `BetConfirmModal`, sell → `SellConfirmModal`.
  **Never use the native browser `confirm()`** — always portal a kit-
  styled modal. The toast at the corner is a *secondary* signal only.
- **Bootstrap admin** registers / logs in → redirected to `/admin`,
  not `/profile/kyc`. Player → `/profile/kyc?welcome=new` which now
  shows a prominent "Skip for now · Browse markets" CTA.
- **Profile page** displays a yellow `ADMIN` (or `COMPLIANCE` /
  `MODERATOR`) pill so the operator can see at a glance that
  `ADMIN_BOOTSTRAP_PHONES` wired up.
- **Conviction dial** — `NEUTRAL_BAND = 0.005` (threshold ~1.005×). Any
  intentional movement shows full feedback (payout section, side label,
  active button). `effectiveSide` overrides geometric neutral when user
  has typed a value. Pre-click "Insufficient balance" warning when
  `stake > balance`.
- **Viewport consistency** — 3-tier max-width system:
  `1280px` (grid pages) / `1080px` (content pages) / `640px` (forms).
- **Positions page** — All/Open/Settled tab filter via URL params.
- **Account activity** — category filter chips (dynamic from actual data).
- **Bottom nav** — `aria-label` on every link.
- **Bet confirm modal** — `safe-area-inset-bottom` padding for notched phones.

## Dark Glass Kit Rebuild (Phase 3 + 3b) — June 2026

The entire UI was rebuilt from the design kit in `50Pick Modernization/`.
34 commits on `main` covering:

- **All tokens** updated: `--panel`, `--bg-inset`, `--bg-elevated2`, `--brand-*`,
  `--live-400`, `--text-faint` added to globals.css
- **All components** use kit icons from `src/components/ui/glyphs.tsx` (75+ SVGs
  at 1.85px stroke). Lucide-react removed from all player-facing files.
- **All focus rings** brand-500 (zero aqua-300 remaining)
- **All border radii** rounded-xl / 16px (zero rounded-2xl remaining)
- **Buttons** solid fills, r-sm, kit inset highlights + glow
- **Chips** rebuilt: height-based, 700 weight, 0.06em tracking, uppercase
- **Inputs** bg-inset, 44px, rounded-lg (12px), brand-500 focus
- **Modals** rounded-xl, oklch shadows
- **Toggle/Switch** accent-500/bg-inset, **Checkbox** 19x19 accent-500
- **Form polish**: no native spinners, textarea
- **DateSelect** (`src/components/ui/date-select.tsx`) — segmented DD/MM/YYYY
  input + calendar popup with year grid. Replaces native `<input type="date">`
  everywhere. 926 unit tests pass.
- **Select** (`src/components/ui/select.tsx`) — dark glass dropdown replaces
  every native `<select>`. Keyboard nav, portaled, form-submission compatible.
- **useModalLock** (`src/lib/use-modal-lock.ts`) — body scroll lock + viewport
  zoom reset for all portaled modals (Android pinch-zoom fix).

**Read [`50Pick Modernization/MODERNIZATION_PLAN.md`](50Pick%20Modernization/MODERNIZATION_PLAN.md)
for the full status and remaining items.**

## Security hardening (June 2026 sprint)

- **CSP**: `unsafe-eval` removed from script-src. `unsafe-inline` kept
  (required by Next.js hydration).
- **Secrets**: production throws FATAL if `SESSION_SECRET` or `OTP_PEPPER`
  missing. Dev-only fallbacks unreachable in production.
- **Dev-test endpoints**: hard-blocked at the edge (proxy.ts) in production,
  on top of per-route `NODE_ENV` check. 25 endpoints, double-gated.
- **Async scrypt**: all password/OTP hashing uses `scryptAsync` (promisified).
  Event loop never blocked by crypto operations.
- **Webhook secrets**: no hardcoded fallback in production. Empty string →
  `verifyWebhookSignature` returns `missing-secret`.
- **AML race conditions**: `approveAmlAction` wrapped in `withLock("aml-txn:{id}")`.
  `rejectAmlAction` wallet refund wrapped in `withLock("wallet:{userId}")`.
- **Database constraints**: `@@unique([provider, providerRef])` on Transaction.
  CHECK constraint comments for wallet balance >= 0 (apply after migration).
- **Single active session**: server-side registry prevents concurrent logins.
  New login revokes all prior sessions; revoked device sees explanation.
- **Auth race conditions**: `withLock("register:{phone}")` prevents duplicate
  users; `withLock("login:{userId}")` serialises failed-count updates.
- **Payout floor**: `Math.max(0, ...)` prevents negative payout on settlement.
- **Market-level lock**: `withLock("market:{id}")` on `resolveMarket` prevents
  concurrent settlement of the same market.
- **Negative amount guard**: deposit/withdraw actions reject `amount <= 0`.
- **Admin test deposits**: gated by `ADMIN_TEST_DEPOSITS === "true"` (whitelist)
  in production; defaults to enabled in dev/staging when unset.
- **Loss notifications**: direct language ("Bet lost · TZS X") — no euphemistic
  framing that could delay awareness of losses (LCCP harm-prevention).

## Chatbot (AI Help Companion)

- **Stub mode** (default): keyword-matching in `src/lib/chat/send-message.ts`.
  Covers deposits, dial, payouts, KYC, referrals, proposals.
- **Live mode**: set `ANTHROPIC_API_KEY` in Railway env. Server action
  `src/app/_actions/chat.ts` calls Claude Haiku 4.5 with a 50pick-specific
  system prompt. Falls back to stub on API error.
- **Icon**: gilt chat bubble (FAB) + FiftyMark brand coin (panel/avatars).
- **Chat history**: cleared on logout/session-revoke. Stored in sessionStorage.
- **At-risk language**: always routes to the RG redirect card, never free-text.
- **Betting advice**: refuses to recommend YES or NO on any market.

## Accessibility (June 2026 sprint)

- Skip-to-content link (`app-shell.tsx` → `#main-content`)
- All focus rings: brand-500 (zero gold/teal/aqua remaining)
- iOS Safari auto-zoom prevented: 16px minimum on all inputs (`globals.css`)
- PWA manifest (`public/manifest.json`) + apple-web-app metadata
- OG + Twitter card metadata on all pages via root layout

## Git workflow — ALWAYS commit AND push

```
git add <files>
git commit -m "Sprint NN: short title"
git push
```

**Never leave commits unpushed.** Railway auto-redeploys on push.
Ali checks the live site, not local — unpushed work is invisible to him.

## Memory

`C:\Users\Ali\.claude\projects\C--Users-Ali\memory\MEMORY.md` indexes
project + feedback + reference memories that future Claude sessions
will pick up. Notable for this repo:

- `project_betting_platform.md` — high-level project state.
- `feedback_kipindi_kit_first.md` — the lesson above about consulting
  the kit before color changes.
- `feedback_50pick_screenshots.md` — don't dump per-sprint screenshots
  by default.
