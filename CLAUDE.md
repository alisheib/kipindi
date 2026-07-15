# 50pick — Claude Onboarding

<!-- Note: the git repo/dir is legacy-named `kipindi-main` and prod env may still
     carry `kipindi-*` deploy hosts / SMS sender — those are infra, not brand.
     The product is "50pick" everywhere user-facing. -->


> Read this first. It tells you what's true about the codebase right now,
> and where to look before editing anything.

## What this is

**50pick** — Tanzania-licensed pari-mutuel
prediction-markets platform. Players pick YES or NO on a proposition
(sports, weather, macro, crypto, culture); winners share the pool minus
our commission. Mobile-first, trilingual EN + SW + ZH, regulator-ready.

**THE FEE RULE (2026-07-14, Ali's signed-off decision — do not change):**
> Our commission is **10% of the pool, but never more than a third of the
> smaller side.**

```
fee = min(commissionRate * pool, feeCeilingRate * min(yesPool, noPool))
```

The smaller side **is the prize** — all the money the winners can win. Capping the
fee below it makes **"a winning bet is never paid less than it staked"** true
arithmetically, for *any* rate an admin can set. Before this, a flat 9%-of-pool fee
on a lopsided poll grew **bigger than the entire prize** and was paid out of the
winners' own stakes: a real poll (YES 300,000 / NO 10,500) paid a man who staked
100,000 on the **winning** side just **93,150**. He now gets **102,333**.

Write it as `min(commission, ceiling)` — **never as a threshold `if`**. The two
rules cross over seamlessly at 70/30; a threshold would be a step function, and a
step function is gameable.

- Single source of truth: **`src/lib/payout.ts`** (isomorphic — client *and* server).
- **Rates stick to the poll.** Every market freezes its rates at creation
  (`PredictionMarket.feeSnapshot`). Settlement, cash-out and every preview read the
  snapshot, **never live config** — so retuning a rate cannot reprice a bet already
  placed. Use `ratesFor(market)`, not `getEffectiveConfig()`, in any money path.
- The `negative` lean level is **deleted** — a winner cannot be paid below stake, so
  never write copy that says they might be.
- Proof: `npm run test:fee-model` (77 assertions), `npm run test:withdrawal`.

- **Repo:** `C:\kipindi`
- **GitHub:** `https://github.com/alisheib/kipindi.git` (private)
- **Live demo:** `https://kipindi-production.up.railway.app`
- **Operator:** Ali, Dar es Salaam (non-technical — lead on architecture
  and design decisions, ask in plain English).

## Stack

- Next.js 16 App Router · React 19 · TypeScript · Turbopack
- Tailwind CSS 3, design tokens in `src/app/globals.css` + `tailwind.config.ts`
- next-themes for light/dark
- Prisma 6.5 with managed Postgres on Railway. All entities have dedicated
  Prisma tables (`USE_PRISMA_DAL=true`). See `docs/DATA-LAYER.md` for the
  full architecture guide.
- Playwright for E2E (driven directly via the SDK, not @playwright/test)

## Source of truth

| Topic | File |
|---|---|
| Design authority (palette, tokens, invariants) | [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) — **read before any color / composition / hero change.** Implementation is [`src/app/globals.css`](src/app/globals.css) (authoritative); palette rationale is [`docs/design-master-brief.md`](docs/design-master-brief.md). ⚠️ `50PICK/design_handoff_prediction_market_kit/kit/` is a **SUPERSEDED snapshot** (teal 215, dead light theme) — historical only, do **NOT** build from it. |
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

All entities are stored in PostgreSQL via Prisma (`USE_PRISMA_DAL=true`).
Each entity has a dedicated table — no more JSON blob snapshots.
See `docs/DATA-LAYER.md` for the full architecture and how to add entities.

All wallet mutations are protected by `withLock("wallet:{userId}")` —
`deposit`, `withdraw`, `creditInternal`, `buyPosition`, `cashOut`,
`resolveMarket`, and AML reject refund. Zero unprotected balance
read-modify-write sequences remain.

**Lock implementation** (`src/lib/server/locks.ts`):
- **Production** (DATABASE_URL set): Postgres `pg_advisory_xact_lock(namespace, hash)`
  inside a `$transaction` — safe across multiple Railway instances. 30s timeout.
- **Dev** (no DATABASE_URL): in-memory Promise-chain mutex (single-process only).
- 31 call sites across 11 files, all using the same `withLock(key, fn)` API.
- Lock ordering: wallet before market (prevents deadlocks).

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
| `DATABASE_URL` | Railway Postgres connection string |
| `USE_PRISMA_DAL` | `true` for production |
| `SESSION_SECRET` | ≥ 32 chars; HMAC for session cookies |
| `OTP_PEPPER` | ≥ 16 chars; global pepper for OTP hashing |
| `ADMIN_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-promote on first register |
| `SMS_PROVIDER` | `console` (current) / `selcom` / `beem` / `africas-talking` |
| `SMS_SENDER_ID` | TCRA-licensed sender ID once SMS goes live |
| `NODE_ENV` | `production` on Railway |
| `NEXT_PUBLIC_APP_URL` | `https://kipindi-production.up.railway.app` |
| `TESTER_BOOTSTRAP_PHONES` | comma-separated E.164 list — auto-fund 100K TZS on register |
| `ADMIN_TEST_DEPOSITS` | `true` to enable uncapped admin deposits; unset = enabled in dev only |
| `ANTHROPIC_API_KEY` | Anthropic API key — powers chatbot + poll generation. Omit = stub mode |
| `POSTMARK_API_KEY` | Postmark Server API Token — transactional email. Omit = console stub |
| `PHONE_EMAIL_MAP` | Pre-KYC phone→email mapping: `+255NNN:a@b.com,+255MMM:c@d.com` |

## Email — Postmark transactional (June 2026)

`src/lib/server/email.ts` — Postmark-backed email service with console
fallback when `POSTMARK_API_KEY` is unset (same pattern as SMS).

- **Domain**: `50pick.tz` — DKIM + Return-Path verified on Postmark
- **From**: `noreply@50pick.tz` — all automated emails
- **Reply-To**: `support@50pick.tz` (falls through to `ali@50pick.tz`)
- **Sender Signatures**: `noreply@`, `support@`, `compliance@` — all `@50pick.tz`

### Emails sent automatically

| Email | Trigger | Tag |
|---|---|---|
| Welcome | Registration | `welcome` |
| Login notification | Password login | `login` |
| Deposit confirmed | Deposit succeeds | `deposit` |
| Withdrawal sent | Withdrawal completes | `withdrawal` |
| Withdrawal under review | AML hold | `withdrawal-review` |
| Bet placed | Position opened | `bet-placed` |
| Win notification | Market resolves in favour | `win` |
| Loss notification | Market resolves against | `loss` |
| Cash-out receipt | Position sold | `cashout` |

Additional templates (password reset, KYC, self-exclusion, cool-off,
AML reject, referral reward, session revoked) are built but wired on
demand as those features go live.

### Pre-KYC email binding

`PHONE_EMAIL_MAP` maps test phones to emails until KYC collects email
directly. Format: `+255777777777:ali@example.com,+255777777775:bob@example.com`.
The mapping runs at both registration and login, writing to `user.email`.

## Activating Claude AI features (chatbot + poll generation)

Both features share one API key from **console.anthropic.com** (pay-per-token,
separate from any claude.ai subscription).

### Setup steps

1. Go to **console.anthropic.com** → sign up or log in
2. **Billing** → add payment method → buy credits ($20–$100)
3. **Settings → API Keys → Create Key** → name it `kipindi-production`
4. Copy the key (starts with `sk-ant-api03-...`) — shown only once
5. **Railway** → kipindi service → **Variables** → add `ANTHROPIC_API_KEY` = the key
6. Railway auto-redeploys — both features go live

### What activates

| Feature | Model | Cost/call | Code path |
|---------|-------|-----------|-----------|
| **Chatbot** (AI Help widget) | `claude-haiku-4-5` | ~$0.001 | `src/app/_actions/chat.ts` — checks key, calls API, falls back to stub |
| **Poll generation** (4-layer pipeline) | `claude-sonnet-4-6` | ~$0.01–0.05 | `src/lib/server/ai-provider.ts` — swap `MockClaudeProvider` → `ClaudeProvider` |

The chatbot activates **instantly** when the key is set (no code change needed).
The poll pipeline currently uses `MockClaudeProvider` — uncomment the factory at
`ai-provider.ts:457-462` to switch to real Claude once the key is live.

### Cost estimate

At typical usage (500 chat messages/day + 50 poll generations/day):
~$2–5/day. Credits expire 1 year after purchase.

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
  [`docs/DESIGN_AUTHORITY.md`](docs/DESIGN_AUTHORITY.md) first, then
  [`src/app/globals.css`](src/app/globals.css)** (the authoritative
  implementation). Historical note: the `--hero-grad-warm` token was once
  misnamed but is now correctly a deep royal radial (`globals.css`). Lesson
  retained: **trust the tokens, not the name** — and never the superseded teal
  kit, which would revert the brand to teal 215 and resurrect the killed light
  theme (audit C9).
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
  activating.
- **Full Prisma entity migration** — COMPLETE. All entities migrated to
  per-row Prisma tables. `USE_PRISMA_DAL=true` on production. See
  `docs/DATA-LAYER.md`.

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
- **NavProgress** — gold 3px progress bar at top of viewport during route
  transitions. Fires on every `<Link>` click + `50pick:navigating` custom
  event for programmatic `router.push`. z-[2000], pointer-events-none.
- **`useDeferredToast(pending)`** — toasts fire on the falling edge of
  `useTransition` pending (when `router.refresh()` commits), not on
  arbitrary setTimeout. Error toasts use `toast()` (immediate). Success
  toasts use `deferToast()` (after transition settles). Zero setTimeout
  in the codebase.
- **Loading states** — 50 loading.tsx files cover every async route. All
  forms use `SubmitButton` (spinner + pending label via `useFormStatus`).
  All admin action buttons wire `loading={pending}` from `useTransition`.

## Dark Glass Kit Rebuild (Phase 3 + 3b) — June 2026

The entire UI was rebuilt from the original design kit (Phase 3 + 3b complete).
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

Modernization is complete — all tokens, components, and focus rings updated.

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
- **Distributed locks**: `withLock()` uses Postgres advisory locks in production
  (`pg_advisory_xact_lock`) — safe across multiple instances. In-memory fallback
  for dev without DATABASE_URL.
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

## QA — pre-deploy live checks (run before pushing UI changes)

A strict Playwright gauntlet guards releases: `scripts/pre-deploy-live-check.mjs`.

- `npm run qa:live` — runs against a LOCAL in-memory dev server (default
  `http://localhost:3009`). Boot it first (in-memory, zero prod risk):
  `SESSION_SECRET=<32+ chars> OTP_PEPPER=<16+ chars> npx next dev -p 3009`
  (no `DATABASE_URL` → memory store). `/auth/demo` mints a 100k authed session
  locally (404 in prod) so the authed section can drive History/wallet/invite
  and the **locked betting dial**.
- `BASE=https://kipindi-production.up.railway.app npm run qa:live` — read-only
  subset against prod (auto-skips the local-only authed section). Run on a WARM
  server — the gauntlet warms up, but a just-restarted instance can still race.
- `npm run predeploy` — typecheck + `test:date` + build + `qa:live`.
- `npm run test:date` — pure keystroke unit tests for the segmented date field
  (`scripts/date-mask.test.mts`; logic lives in `src/components/ui/date-mask.ts`).

Fails on ANY: console/page/5xx error, real Next error overlay, broken internal
link, mobile horizontal overflow, clipped date segment, or mis-handled date.

## Betting flow invariant — the dial is ALWAYS side-locked

The conviction dial must never be enterable in the unlocked both-ways state:

- Market cards: **LIVE cards are not clickable**; only the YES/NO buttons enter,
  each navigating to `/markets/<id>?side=YES|NO`. (Non-live cards stay viewable.)
- The detail page passes `?side` → `ConvictionDial lockedSide=...`. The in-dial
  YES/NO pills are **display-only** ("Your pick") — no switching inside; the
  choice is final from the card. The knob is confined to the backed half.
- Logged-in user on the detail page **without** a side → show the "Pick your
  side" gate, never the bidirectional dial.

## Brand Kit v2 "Needle" (June 2026)

Logo redesigned by Claude Design. The gilt NEEDLE crossing the rim is now the
signature element — same object as the TippingBar needle + conviction dial.

- `FiftyMark` accepts `variant="color|white|dark"`, auto-simplifies at < 24px
- `FiftyTile` — rounded-square royal tile for app icons / on-photo plates
- `FiftyWordmark` — gilt underline retired; `.tz` suffix via `tz` prop
- `FiftyLockup` — `layout="horizontal|stacked"`, variant pass-through
- Full favicon set: `/favicon.svg`, `/favicon.ico`, `/icons/` (16/32/180/192/512/maskable)
- OG images: `/og/og-1200x630.png`, `/og/twitter-1200x600.png`
- Master SVGs: `/brand/mark-{color,white,dark,simplified}.svg`
- Hard rules: full mark ≥ 24px, simplified < 24px, never mirror/re-tint/stretch

## Tax model — TAXES ARE ONLY EVER ON OUR COMMISSION (July 2026)

**A player is never taxed. Not on a payout, not on a withdrawal, not ever.** Taxes
come out of the fee *we* earned:
- `traTaxOnCommissionRate` (default 10%) — 10% of **our fee** → TRA
- `gbtLevyOnCommissionRate` (default 5%) — 5% of **our fee** → GBT
- Both admin-editable at `/admin/config` — no redeploy needed

Example: pool 100,000, balanced → fee 10,000 → TRA 1,000 + GBT 500 → we keep 8,500.
**The player's payout is untouched by any of it.**

**⚠️ THE 15% WITHHOLDING TAX IS DELETED (2026-07-14).** `computeWithdrawalTax()`
withheld 15% of **every** withdrawal — including money a player had deposited and
never bet. Deposit 100,000, place no bets, withdraw → he received **85,000**. The
code comment called itself *"naïve"*. It is gone.

**What a player is charged, in full:**
| | |
|---|---|
| The pool commission | indirectly, through the payout — capped, see above |
| `withdrawalFeeRate` (1%) | on withdrawal. `withdrawalGatewayShareRate` (0.5%) of it is the gateway's |
| `cashOutFeeRate` (10%) | only if he exits early, after the free window. Goes to the HOUSE |

Nothing else. If you find yourself adding a deduction to a player's money, stop.

**✅ RESOLVED 2026-07-15 — tax on what we KEEP.** The ledger and the statutory report
now levy TRA/GBT on the same base: our actual commission. GGR is computed net of
refunds (`stakes − payouts − refunds`) so a voided/one-sided poll — where we keep
nothing — is taxed on nothing. Report == ledger, verified end-to-end. Rates live in
admin config. See `docs/F6-LIQUIDITY-DESIGN.md` §6.1 and the decision doc.

## Gold budget (June 2026 design authority)

Gold is reserved for **earned money moments only** (kit invariant #2):
- Place CTA → side-coloured (`btn-yes`/`btn-no`), not gold
- Confirm CTA → `btn-gold` (the actual money commit)
- OperationResultModal strip + button → `stripTone` prop:
  `"gold"` = sell/settlement, `"yes"|"no"` = bet placed, `"brand"` = admin (default)
- BetConfirmModal quote-hold strip → brand-blue, not gold
- Hot chip → `chip-hot-rose` (rose/flame), not `chip-objection` (gold)
- Lean warning → qualitative text, no payout figure (D3 compliance)

## Git workflow — ALWAYS commit AND push

```
git add <files>
git commit -m "Sprint NN: short title"
git push
```

**Never leave commits unpushed.** Railway auto-redeploys on push.
Ali checks the live site, not local — unpushed work is invisible to him.

## Where progress is tracked (canonical)

The platform is **feature-complete and hardening for launch**. Progress and
handoff live in a small set of living docs — read these, in order:

1. **`docs/SESSION_STATUS.md`** — read-first current state, launch blockers, gotchas.
2. **`docs/next-session-prompt.md`** — the canonical next-session handoff (paths map + open work).
3. **`docs/perfection-plan.md`** — the 0-issue launch plan (phases A–G; the master QA plan).
4. **`docs/ui-rollout-tracker.md`** — per-batch work log (newest at the top of the Batch log).

Session protocol: `git pull` → `npx prisma generate` → `tsc` + `npm run test:all`
(45/45) → read SESSION_STATUS → work one item → test + live-drive → **commit AND
push** (Railway auto-deploys; Ali reviews live). Update the living docs before you end.

Point-in-time audits (kept for record): `docs/PHASE_E_AUDIT_*`, `ADMIN_VIEW_AUDIT_*`,
`PLAYER_VIEW_AUDIT_*`, `ARCHITECTURE_AUDIT_*`, `consistency-audit.md`, `kit-gap-audit.md`,
`navigation-ia-review.md`. Design source of truth for finalization:
`docs/design-master-brief.md`, `docs/visual-assets-brief.md`, `docs/glyph-reference-for-design.md`.
