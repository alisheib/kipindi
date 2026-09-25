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
| **How a player is told about identity** | ⭐ **QUIETLY** (owner instruction, 2026-09-13). Exactly two prompts: `/wallet/withdraw` shows the identity panel instead of the form (*Before you withdraw · Verify your identity*), and **one** small dismissible notice appears on the wallet after the account's first confirmed deposit (*Verify your identity anytime before your first withdrawal*), remembered for that player in that browser once closed (a per-player cookie since 2026-09-14, so a shared phone does not hide it from the next player), never shown once documents are sent. Beyond that only where a player goes to look (`/profile/kyc`, the status pill on `/profile`, legal pages, help) and notices that answer an event (submitted · more information · approved · refused · a decision on a refused balance). ⛔ No bar on every page, no identity sentence on deposit, win or cash-out receipts, no reminder, no email after a blocked withdrawal | `src/components/kyc/kyc-gate-panel.tsx` · `src/components/wallet/kyc-first-deposit-notice.tsx` |
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
| Withdraw up to TZS 5,000,000 | Sent to the gateway **at once — no officer review** since 2026-09-13 (owner ruling, `COMPLIANCE-DECISIONS.md` 2026-09-13 third; `WITHDRAWAL_AML_HOLD = false`). Above TZS 5,000,000 is refused by the per-withdrawal cap. ⚠️ Until that ruling a withdrawal of TZS 1,000,000 or more was held for a two-officer AML review; `/admin/aml` still releases or rejects any row held before it, and deposits owed back to excluded players | `src/lib/server/payments.ts` (`dispatchWithdrawal`, `WITHDRAWAL_AML_HOLD`) · `src/lib/server/validators.ts` (`WITHDRAW_MAX_TZS`) |
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
| Market settlement | Single admin by default; two officers when enabled (stage-1 + stage-2 must then be different `actorId`s) | `src/lib/server/resolution-policy.ts` · `src/lib/server/market-service.ts` (stage1At / stage2By / stage2At fields) |
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

---

## 9. House liquidity gates

🟢 **Live on production.** `placeHouseBet` and these gates are on `main`; the engine's `src/lib/server/house-bot/fire.ts` is its only caller, and the owner first switched the desk on on 2026-09-21. The design authority is [`HOUSE-BOTS.md`](HOUSE-BOTS.md); this table is PLAN §3 as amended by N1 §3, N2 §3 and A7, A9, A12 and A15 (`plans/house-bots/04-amendments.md`). ⚠️ It was written at build commit 2 (2026-09-14) and has not been re-derived since: where it and `market-service.ts`'s `// SEAM:` sites disagree, the code wins.

A house bet goes through the same service as a player's bet (`buyPositionInner`) with a `house` bet context, and these checks run in this order. The first failing check returns. Lock order is `wallet:<botUser>` → `market:<id>` → `house:control`, and a house bet sets `lock_timeout` 2 s before the market and control locks. Every kind-specific check reads the claimed intent row by id, never a call argument.

| Step | Where | Check → refusal |
|---|---|---|
| H0 | First, before any lock | An ordered rule, and the intent's status is never part of it. 1. The key must equal `houseIntentKey(intentId)` and there must be no `playStartedAt`, else `house_key_mismatch`. 2. Pre-lookup: the key found with the same user and bot returns the original result with `replayed: true`; found with another user or bot → `house_key_mismatch`; not found → continue. 3. The intent is loaded by id with no status filter: missing, or its `houseBotId`, `botUserId`, `marketId`, `side` or `stakeTzs` differ from the call → `house_key_mismatch`. A non-CLAIMED row proceeds and ends at `markPlaced` (H4). |
| H1 | Pre-lock, fresh reads | A failed read → `house_gate_unreadable`. Master switch off → `house_disabled`. Bot not ACTIVE, or the wrong user → `house_bot_inactive`. The ordinary player gates then run unchanged; a house bet neither advances nor is refused by the holder's session clock (A7). |
| H2 | Inside `wallet:<botUser>`, plain SELECTs on the lock transaction, in the declared order | 1. Consent and responsible gambling: holder status and RG timers → `self_excluded` / `cooling_off` / `account_blocked`; role not PLAYER → `house_account_ineligible`; consent not valid (fingerprint mismatch, or a consent void newer than the last verification) → `house_consent_stale`; a bonus part, or balance below the stake → `house_cash_only`. 2. `house_market_conflict{OWNER_POSITION}` (the holder's own non-house OPEN position here) or `{OPPOSITE_SIDE}` (a house position on the other side). 3. Money caps, `house_cap_reached{STAKE_MIN, STAKE_MAX, PER_MARKET, BALANCE_FLOOR, DAILY_STAKE, DAILY_LOSS_PROJECTED, EXPOSURE}`. 4. For staff-chosen rows (Enter now, or a COUNTER with a target): `{STAFF_CHOSEN_PER_DAY, STAFF_CHOSEN_DAILY_STAKE}` (a NULL cap refuses) and `{TARGET_ONCE}`. 5. Rate caps `{MIN_GAP, PER_HOUR, PER_DAY}`, which can defer, then `{PER_MARKET_COUNT}`, which is terminal and is returned even when a deferrable cap also fails. |
| H3 | Inside `market:<id>`, after the closed re-check and a raw re-read of the market row | `house_product_not_allowed` and `house_round_locked` from the raw row (A12). For staff-chosen rows, `house_info_blackout` (an AI result check recorded, a resolve claim younger than its TTL, or the market reopened). Another bot holds a house position here → `house_market_conflict{OTHER_BOT}`; `house_cap_reached{GLOBAL_PER_MARKET}`. COUNTER: trigger no longer OPEN → `house_trigger_gone`; the trigger account holds the bot's side → `house_market_conflict{TRIGGER_BOTH_SIDES}`. Mode condition, else `house_condition_gone`: the untargeted COUNTER needs bot side + stake ≤ the locked opposite non-house pool (A15, no margin); a targeted COUNTER and FILL measure that pool with `lockedForHouse` (eligible accounts only, exit window closed at least 7 s ago); OPENER needs both pools at 0; Enter now reads its `entryCondition` (OPENER: both raw pools 0; THIN: raw pool of its side + stake ≤ `lockedForHouse` on the other side), and the side is never re-chosen. Enter now also refuses `house_counterparty_concentration` when the counterparty share limit is not set, or one account holds more than that share of the locked opposite money. |
| H4 | Inside `house:control`, innermost, wrapping the money writes | The control row is re-read: `enabled` false → `house_disabled`. `house_cap_reached{GLOBAL_DAILY_STAKE, GLOBAL_LOSS_PROJECTED, GLOBAL_EXPOSURE, GLOBAL_BETS_PER_MINUTE, GLOBAL_BETS_PER_DAY, COUNTERPARTY_COUNT, COUNTERPARTY_TZS}`; staff-chosen rows add `{GLOBAL_STAFF_CHOSEN_PER_DAY, GLOBAL_STAFF_CHOSEN_DAILY_STAKE}` (NULL refuses), and an Enter now THIN stake counts pro rata toward every opposite account holding at least 25% of the locked money. Then the intent is re-read on `clock_timestamp()`: still CLAIMED but past `staleAt` → `house_intent_stale`. Then the first statement of the money transaction is `markPlaced` (PLACED, `positionId`, `finishedAt`, only while CLAIMED with no `positionId`); 0 rows → `house_intent_superseded`, before any money moves. |
| H5–H9 | The existing writes | The `houseBotId` marker is stamped on the Position and on every Transaction of it. Wagering accrual, bet receipts and recruit accrual are skipped. The bet's audit row gains `houseBotId` and `intentId` (never a second row). `predictorCount`, odds and balance events are unchanged (D6). |

The engine's outcome mapper (PLAN §4.6, A10) turns each refusal into an intent result; it is `src/lib/server/house-bot/outcome-map.ts` (the table) and `outcomes.ts` (the writes).
