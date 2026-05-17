# Flow architecture — 50pick

Every redirect, gate, and recovery path the platform enforces, with file
anchors. Treat this as the single source of truth when planning new
flows: if a journey isn't listed here, it isn't covered.

Updated 2026-05-17 (Sprint 59.6 — flow-architecture pass).

---

## 1. Authentication & session

| Trigger | Destination | Source |
|---|---|---|
| Unauth visits `/wallet`, `/positions`, `/profile`, `/admin/*` | 307 → `/auth/login?next=<path>` at the edge | `src/proxy.ts:85-89` |
| `/auth/login` form OK | `safeNext` from `?next=` (validated same-origin) OR `/admin` for admin role OR `/` | `src/app/auth/login/actions.ts:38-44` |
| `/auth/login` form fails (wrong creds, rate-limited) | `/auth/login?error=<code>&phone=<phone>&next=<next>` (preserve return-to) | `src/app/auth/login/actions.ts:24-36` |
| Authed user on `/auth/login` or `/auth/register` | **Not currently bounced** — the page renders and the user can manually navigate away. A layout-level bouncer was prototyped but caused a Next.js 16 dev-mode hook-count mismatch that destabilised other tests. Deferred until a production build cycle confirms the redirect-from-server-component path is stable. Impact: minimal — authed users rarely visit these pages, and the underlying auth gate on `/wallet`, `/positions`, `/admin/*` is unaffected. | follow-up |
| Register form OK | `/profile/kyc?welcome=new` (or `/admin` for ADMIN_BOOTSTRAP_PHONES) | `src/app/auth/register/actions.ts:38-41` |
| Session idle for 24h | Dropped, next request unauth → 307 to `/auth/login` | `src/lib/server/session.ts:64-82` |
| Session absolute lifetime 7d | Drop + force re-auth | `src/lib/server/session.ts:25` |

---

## 2. KYC & responsible-gambling gates

| Trigger | Behaviour | Source |
|---|---|---|
| Withdraw without KYC APPROVED | Service returns `{ ok: false, error: "Verify your identity to withdraw." }` + COMPLIANCE audit `withdraw.kyc_blocked` | `src/lib/server/wallet-service.ts:100-104` |
| Bet placement (no KYC required) | Allowed pre-KYC (TZ Gaming Board model). KYC only gates withdrawals. | `src/lib/server/market-service.ts:178-250` |
| Deposit during self-exclusion / cooling-off | Blocked, error names the lockout type + expiry, audit `deposit.lockout_blocked` | `src/lib/server/wallet-service.ts:34-37` |
| Bet during self-exclusion / cooling-off | Same — `isLockedOut()` check before `buyPosition()` | `src/lib/server/market-service.ts:182-183` |
| Auth attempt during self-exclusion | `requestLoginOtp()` returns "Your account is in self-exclusion." | `src/lib/server/auth-service.ts:84-86` |
| Deposit limit (daily/weekly/monthly) exceeded | Blocked, error names the limit, audit `deposit.limit_blocked` | `src/lib/server/wallet-service.ts:40-44` |
| Deposit limit *increase* request | Deferred 24h (LCCP SR 3.4.3); decrease takes effect immediately | `src/lib/server/responsible-gambling.ts:114-127` |
| **Source-of-Funds threshold** (single ≥ TZS 1M or rolling 30d ≥ TZS 5M) | Blocked, error directs to `/profile/source-of-funds`, audit `deposit.sof_gate_blocked` | `src/lib/server/wallet-service.ts:47-95` (added Sprint 59.6) |

---

## 3. Admin role gates

| Trigger | Behaviour | Source |
|---|---|---|
| Non-admin visits `/admin/*` | Layout `currentSession()` + `ADMIN_ROLES` check → redirect to `/auth/admin` | `src/app/admin/layout.tsx:55-59` |
| Admin without TOTP cookie on protected admin route | Redirect to `/admin/totp-verify` (exempt: `/admin/totp-verify`, `/admin/2fa/setup`) | `src/app/admin/layout.tsx:74-79` |
| Server action callable without admin role | Every action calls `requireAdmin()` even though layout gates it. Defence-in-depth: a leaked action ID can't escalate privilege. | `src/app/markets/actions.ts:16-30`, `src/app/admin/aml/actions.ts:13-19`, `src/app/admin/candidates/actions.ts:20-33` |
| Market settlement | Two-officer rule: stage-1 + stage-2 must be different `actorId`s | `src/lib/server/market-service.ts` (stage1At / stage2By / stage2At fields) |
| AML approval ≥ TZS 5M | Two-officer rule: `aml.approve.stage1` + `aml.approved` from distinct officers | `src/app/admin/aml/actions.ts:53-93` |

---

## 4. Form submission patterns (POST-Redirect-GET)

| Action | Pattern | Source |
|---|---|---|
| Login success | `redirect()` to safeNext / `/admin` / `/` (clean GET) | `src/app/auth/login/actions.ts:38-44` |
| Login failure | `redirect()` back to `/auth/login?error=...` with phone + next preserved | `src/app/auth/login/actions.ts:24-36` |
| Register success | `redirect()` to `/profile/kyc?welcome=new` or `/admin` | `src/app/auth/register/actions.ts:38-41` |
| Deposit / withdraw / bet placement / cash-out | Server action returns `{ ok, error }` — client component renders the result. `revalidatePath()` invalidates `/wallet`, `/positions`, etc. so the next GET reflects the new state. | `src/app/wallet/deposit/actions.ts`, `src/app/wallet/withdraw/actions.ts`, `src/app/markets/actions.ts:32-59` |

Both patterns are acceptable for App Router. The first (PRG) is used where a fresh GET tells a clean story (auth flows). The second (server-action result + revalidatePath) is used where the client form benefits from showing the error inline and the destination is the same page (wallet flows).

---

## 5. Error handling

| Trigger | Behaviour | Source |
|---|---|---|
| Unknown route (e.g. `/banana`) | Branded 404 page with three recovery links (Home / Markets / Help). Does NOT echo the typed URL in user-visible text — only Next.js's internal RSC segment manifest contains the slug. | `src/app/not-found.tsx` (added Sprint 59.6) |
| Server error in a route segment | Branded error page with Try-again button + recovery links. Shows only the `digest` ID, never the raw error message or stack — prevents PII leak. | `src/app/error.tsx` (added Sprint 59.6) |
| Unauthorized API request | 401 from API routes; pages return redirect to `/auth/login` via the proxy (HTTP 307). Pages do not return 401 — Next.js dev mode prefers redirects for UX. | `src/proxy.ts:85-89` |
| Forbidden (logged in but wrong role) | Layout-level `redirect()` to `/auth/admin` (admin paths) or `/` (player paths). | `src/app/admin/layout.tsx:55-59` |

---

## 6. Locale preservation

| Trigger | Behaviour | Source |
|---|---|---|
| Locale switch (header `LanguageToggle`) | Sets `kp-locale` cookie + `localStorage` + `document.documentElement.lang`, then `router.refresh()` so server components re-render | `src/components/ui/language-toggle.tsx`, `src/lib/i18n.tsx` |
| Login redirect | Cookie persists — locale survives the round trip | `src/app/auth/login/actions.ts:38-44` |
| Cross-page nav | Locale cookie is read on every server render in `src/app/layout.tsx` to set `<html lang>` | `src/app/layout.tsx` |

---

## 7. Defence-in-depth layering

For every protected surface, the platform applies **two gates**:

1. **Edge (proxy.ts)**: 307s unauthenticated requests for protected prefixes before the route handler runs. No protected page body ever leaves Next.js to an unauth visitor. Forged cookies pass the cookie-present check but fail step 2.
2. **Page/action layer**: `currentSession()` + role check inside the page/action. Re-redirects if the cookie is missing, expired, idle-timed-out, or fails HMAC verify. Server actions additionally call `requireAdmin()`/`requireAdminOrThrow()` so a leaked action ID can't be invoked by a player.

For RG (responsible-gambling) gates, the check lives in the **service layer** (`isLockedOut()`, `checkDepositLimit()`) so every code path that bets, deposits, or withdraws goes through the same check — there is no way to bypass by hitting a different endpoint.

---

## 8. Known issues + follow-ups

| Issue | Severity | Status |
|---|---|---|
| Authed-user bouncer on `/auth/login` and `/auth/register` not active | Low | Prototyped via layout-level guard but destabilised the test suite in Next.js 16 dev mode (hook-count mismatch). Pre-existing `/auth/admin` bouncer has the same dev-mode behaviour. Revisit after a production-build smoke pass confirms the redirect-from-server-component path is stable. |
| Sportradar match-integrity adapter is a stub | Medium | Labeled "stub adapter" on `/admin` and `/admin/compliance`. Will be wired in the data-feed integration sprint. |
| Document upload on `/profile/kyc` is stubbed | Medium | Object-storage integration sprint. |
| Tax accrual on `/admin/finance` uses a placeholder formula | Low | TRA filing module sprint. |
| Mock payments adapter | High (blocks live) | Selcom / Azampay aggregator contract sprint. |
| Mock SMS provider | High (blocks live) | Twilio / Africa's Talking SMS sprint. |

Every item above is a contract-pending integration — the platform code is ready to receive each adapter via the existing service interface.
