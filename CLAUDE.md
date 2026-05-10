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
| Postgres swap walkthrough | [`RAILWAY_DATABASE.md`](RAILWAY_DATABASE.md) |

## Auth — current state

**Phone + password** (interim). The OTP code paths in
`auth-service.ts` (`requestLoginOtp`, `requestRegisterOtp`,
`verifyOtpAndAuth`) are preserved verbatim — switch back by routing
`/auth/login` and `/auth/register` to `startLoginOtpAction` /
`startRegisterOtpAction` once SMS goes live.

- `registerWithPassword` and `loginWithPassword` in `auth-service.ts`
  hash with scrypt (16-byte per-user salt).
- `startLoginAction` and `startRegisterAction` in
  `src/app/auth/{login,register}/actions.ts` are the password forms.
- Phone input is digits-only via [`src/components/ui/phone-input.tsx`](src/components/ui/phone-input.tsx).

### Admin bootstrap

Set `ADMIN_BOOTSTRAP_PHONES=+255712345678,+255700000000` in Railway env.
Any phone in that comma-separated list, when registered through the
normal `/auth/register` form, gets `role: ADMIN` + `status: ACTIVE`
immediately. Use this to seed the manager account.

### Roles

`PLAYER | AGENT | MODERATOR | ADMIN | COMPLIANCE | SUPPORT`. Anything
other than `PLAYER` / `AGENT` redirects to `/admin` after login.

## SMS — currently dummy

`src/lib/server/sms.ts` defaults to the `console` provider — OTP codes
print to stdout, never leave the server. Selcom / Beem / Africa's Talking
adapters are stubs. Until you sign Selcom or Beem, **OTP cannot be
delivered to a real phone** — that's the only reason auth is on
password right now.

## Persistence

In-memory `Map`s in `store.ts`, snapshot to disk every 1.5 s
(`src/lib/server/backup.ts`). Snapshots land in
`STORE_BACKUP_DIR` (default `.50pick-backups/` — wiped on Railway
redeploys unless you mount a volume; see [`RAILWAY.md`](RAILWAY.md)).

This will not survive 6M clicks/month. Postgres swap is described in
[`RAILWAY_DATABASE.md`](RAILWAY_DATABASE.md).

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

## Test scripts

Run with `node scripts/<name>.mjs`. They use the dev server on `:3000` and
hit dev-only helpers under `/api/dev-test/*` (returns 404 in production).

| Script | What it covers |
|---|---|
| `multi-player-resolution-e2e.mjs` | **Authoritative settlement test.** 4 player accounts + 2 admin officers, mixed YES/NO bets on one market, two-officer settlement, wallet deltas, win/loss notifications, audit chain, money conservation. |
| `break-it-player.mjs` | 23 manipulator scenarios — auth bypass, cookie tampering, stake validation, race, KYC, XSS, privilege escalation, API surface |
| `break-it-admin.mjs` | 10 admin-portal QA scenarios — anon + player gating across 21 routes, TOTP cookie spoofing, forged Server Actions, CSV gating |
| `multi-viewport-audit.mjs` | 99 routes × 4 viewports for layout overflow |
| `overlay-responsiveness-test.mjs` | Notifications / language menu / avatar / reality-check inside viewport |
| `screenshot.mjs` | Capture all routes (light/dark, public/authed) |
| `capture-manual-screenshots.mjs` | 19 screenshots (10 player + 9 admin) for the user manuals |
| `generate-pdfs.mjs` | Render the 4 production PDFs (operator brief, technical brief, player manual, admin manual) |
| `rasterize-pdfs-for-audit.mjs` | Per-page PNGs of every PDF for visual audit before delivery |

### Dev-test helpers

| Endpoint | Purpose |
|---|---|
| `POST /api/dev-test/promote-admin` `{ phone }` | Mark a registered phone as ADMIN |
| `POST /api/dev-test/seed-wallet` `{ phone, amount }` | Credit a wallet for test scenarios |
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

## Memory

`C:\Users\Ali\.claude\projects\C--Users-Ali\memory\MEMORY.md` indexes
project + feedback + reference memories that future Claude sessions
will pick up. Notable for this repo:

- `project_betting_platform.md` — high-level project state.
- `feedback_kipindi_kit_first.md` — the lesson above about consulting
  the kit before color changes.
- `feedback_50pick_screenshots.md` — don't dump per-sprint screenshots
  by default.
