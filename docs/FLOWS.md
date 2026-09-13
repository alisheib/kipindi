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
| Register form OK | The safe `?next=` with `welcome=new` added, else **`/wallet/deposit?welcome=new`** (or `/admin` for ADMIN_BOOTSTRAP_PHONES). ⛔ **Not `/profile/kyc`** — from 2026-09-05 to 2026-09-13 every new player was sent to the ID-upload form, which was the old ladder made literal; the one-time-code path (`login/actions.ts`, `isNew`) follows the same rule | `src/app/auth/register/actions.ts` |
| Session idle for 24h | Dropped, next request unauth → 307 to `/auth/login` | `src/lib/server/session.ts:64-82` |
| Session absolute lifetime 7d | Drop + force re-auth | `src/lib/server/session.ts:25` |

---

## 2. KYC & responsible-gambling gates

| Trigger | Behaviour | Source |
|---|---|---|
| **Deposit without identity verification** | ✅ **NOT GATED** (2026-09-13). Depositing asks no identity question. The doors, in order: RG lockout → **confirmed email** → (lock) caps + Source of Funds. ⭐ RECORDED, not refused: `kycStatus` + `everApproved` ride on the deposit's existing `deposit.initiated` row, from `readIdentityStanding` (never throws; a failed read is stamped `UNREADABLE`) | `wallet-service.deposit()` · `src/lib/server/kyc-gate.ts` |
| **Bet placement without identity verification** | ✅ **NOT GATED** (2026-09-13). One deletion covers polls AND Up & Down (both stake through `buyPosition`). ⭐ RECORDED as two FIELDS on the `market.position.opened` row every bet already writes — ⛔ never a second audit row: the audit chain is one database-global serialised writer | `src/lib/server/market-service.ts` in `buyPositionInner()` |
| **Withdraw without identity verification** | ⛔ **REFUSED** — the only identity gate on any money path. `assertIdentityForPayout(userId)` asks **`approvedEver`**: `approvedAt` is set, or the row is `APPROVED` — *has this account EVER been approved?* — the ONE predicate the withdraw page also asks (`src/lib/kyc-approval.ts`). Audit `withdraw.kyc_blocked`, instruction citing 2026-09-13. 🔴 **Ever, not now, is the money-safety rule**: a player under re-verification HOLDS REAL MONEY earned under an identity we accepted. An officer who must stop money moving freezes the wallet | `src/lib/server/kyc-gate.ts` + `wallet-service.withdraw()` |
| **How a player is told about identity** | ⭐ **QUIETLY** (owner instruction, 2026-09-13). Exactly two prompts: `/wallet/withdraw` shows the identity panel instead of the form (*Before you withdraw · Verify your identity*), and **one** small dismissible notice appears on the wallet after the account's first confirmed deposit (*Verify your identity anytime before your first withdrawal*), remembered per browser once closed, never shown once documents are sent. Beyond that only where a player goes to look (`/profile/kyc`, the status pill on `/profile`, legal pages, help) and notices that answer an event (submitted · more information · approved · refused · a decision on a refused balance). ⛔ No bar on every page, no identity sentence on deposit, win or cash-out receipts, no reminder, no email after a blocked withdrawal | `src/components/kyc/kyc-gate-panel.tsx` · `src/components/wallet/kyc-first-deposit-notice.tsx` |
| Payout to an account under re-verification | ✅ **ALLOWED** (approved once). Still RECORDED: `kycStatus` on `withdraw.initiated` for every payout, plus an awaited COMPLIANCE fact `withdraw.unverified_payer` carrying `txnId` and `everApproved` from the gate that decided | `wallet-service.withdraw()` |
| **A FINAL identity refusal** (`UNDERAGE` · `SANCTIONED` · `DUPLICATE_IDENTITY`) | ⛔ The wallet is **frozen first** (`freezeReasons` ← `IDENTITY_REFUSED`), then the refusal is written, then COMPLIANCE `kyc.refused_final`. The document number stays **reserved** (both partial unique indexes). The player cannot restart (`kyc_refused_final`); an officer can re-open a wrong refusal. What happens to the balance is an officer's recorded decision — return deposits · return balance · hold pending appeal · forfeit — each its own audit action, justification ≥ 20 characters, report at `/admin/kyc/refused`. 🔴 The decision is **deliberately NOT wrapped in a lock** — a nested `withLock` joins the outer transaction and would hold it open across the gateway call. Two officers deciding at once are made safe by the wallet instead: the forfeit is a **compare-and-swap** on the balance the decision was computed on, the return is `withdraw()` with `requireBalanceGte` and a per-decision idempotency key, and a throw from the payout is recorded as `payoutError` so a committed forfeit never lacks its decision row | `kyc-service.reviewKyc()` · `src/lib/server/refused-funds.ts` |
| A recoverable refusal (`BLURRY_DOC` · `EXPIRED_ID` · `DETAILS_MISMATCH` · `OTHER`) | The player may submit again; nothing about the account changes; the document number is freed | `kyc-service.startKyc()` |
| **Wallet freeze** (officer, self-exclusion, final refusal) | Stops deposits, bets and withdrawals alike (`wallet.status !== "ACTIVE"`). ⭐ Recorded BY REASON: every lifter removes only its own, so re-opening a served self-exclusion never lifts an officer's or a refusal's hold. Officer controls on `/admin/players/[id]`, offered on the re-verify dialog, because re-verification itself stops no money | `src/lib/server/wallet-freeze.ts` |
| Bonus credit to an unverified account | ✅ Credited like any other (the `PENDING_KYC` hold and `releaseKycHeldGrants` were deleted 2026-09-13; production held 0 grants). The bonus wallet is withdrawn from the product in any case | `src/lib/server/bonus-service.ts` |
| Cash-out, settlement, refunds | ✅ **NEVER gated.** Money already in a wallet is the player's; a bet already placed always settles | `market-service.ts` |
| Deposit webhook / return leg / reconcile sweep | ✅ **NEVER gated.** They complete a deposit `deposit()` already authorised and the player has already paid the telco | `wallet-service.settleDepositConfirmed()` |

> 🔴 **THIS SECTION HAS BEEN REVERSED THREE TIMES. READ THE DATES BEFORE CHANGING IT.**
> Until **2026-08-20** identity gated withdrawal. On **2026-08-20** that gate was removed on
> the Gaming Board's instruction (comment #1) and replaced by a RECORD. On **2026-09-05** the
> owner ruled that identity precedes deposit, play **and** withdrawal. On **2026-09-13** — with the
> Board's permission, after player complaints about uploading documents and waiting before they
> could play — the owner ruled that identity is required before **withdrawal only**.
> ⛔ **Do not "restore" any earlier behaviour by reading an older document.** The authority is
> [`COMPLIANCE-DECISIONS.md`](COMPLIANCE-DECISIONS.md), which carries all three entries in order.
| Withdraw ≥ TZS 1,000,000 | Held for **two-officer** AML review before any gateway adapter is touched. ⚠️ Unaffected by the row above: it comes from the AML/FIU regime, a different authority, and `payments.ts` contains no identity reference | `src/lib/server/payments.ts:176` (`dispatchWithdrawal`) |
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
| Register success | `redirect()` to the safe `next` with `welcome=new`, else `/wallet/deposit?welcome=new`, or `/admin` (2026-09-13 — was `/profile/kyc?welcome=new`) | `src/app/auth/register/actions.ts` |
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
