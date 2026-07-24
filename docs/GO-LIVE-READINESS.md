# 50pick — Go-Live Readiness & Payment-Gateway Integration

> **STATUS: authoritative pre-launch reference.** Consolidates what must be true
> before real money flows, and exactly what to wire to integrate the payment
> aggregator. Companion to `docs/FINAL-AUDIT-REMEDIATION.md` (the audit tracker)
> and `docs/perfection-plan.md` (the 0-issue plan). Last updated 2026-07-24
> (§1/§2/§4 re-cut for timer-driven per-market settlement).

---

## 0 · Where the audit stands

**All 11 Criticals, all Highs, all Mediums are closed** (see the audit tracker).
**The Session-E §9 enhancement batch is merged + live (023dfbf, 2026-07-16):**
unified maker-checker, config factory (affiliate), money-format hygiene + guard, 6
popups → `<Modal>`, tap targets ≥44px, /live + /results carousels. The remaining
code items are optional admin features (A6/A7/A13–A16) + polish, none blocking launch:
- **L6** (44px tap targets) — **DONE for the named set** (money controls, top-bar
  Wallet/Deposit pill, dial Lock/Unlock, language switcher, admin tabs/sort/period).
  Remaining <44px: logo Home link, desktop nav links, /proposals buttons — a future
  sweep; AA/2.5.8 already met.
- **M2** largest-remainder payout — **DONE** (Σ payouts == floor(netPool) exactly).
- **bet-STAKE single-`$transaction`** — **DONE (merged @595901e, 2026-07-17).** The
  last C3 exception is closed; ALL money paths (settle/deposit/withdraw/refund AND
  bet placement) now commit atomically. Verified e2e:money 57/57 + e2e:fault 34/34
  (row-level rollback) + s10 double-spend PASS.
- **C5** webhook nonce table — closed as won't-build (idempotency already prevents
  double-credit; a nonce would reject providers' legitimate retries).

---

## 1 · Pre-launch OPS checklist (Ali — not code)

These are environment / infra actions, each verified against the code:

- [ ] **Turn OFF the test float.** Unset `TEST_FUNDING` (or set ≠ `"true"`). Today
  `scripts/seed-test-float.mjs` runs from the `start` command and tops every
  wallet to TZS 1,000,000 **with no ledger entry** — pure test money. It MUST be
  off for real money. (This is why the nightly trial balance currently reports
  drift — see §3.)
- [ ] **Format / rebaseline the DB at go-live.** Start real money from a clean
  genesis so the ledger, the audit chain, and every wallet reconcile from zero.
  This clears: the test float, the pre-C6 audit rows (hashed pre-canonical), and
  any historical ledger gaps. After this, ANY trial-balance drift = a real defect.
- [~] **Set the payment webhook secrets** (see §2): `SELCOM_WEBHOOK_SECRET` is SET
  in prod (2026-07-16 boot no longer warns on it); `AZAMPAY_WEBHOOK_SECRET`,
  `MIXX_WEBHOOK_SECRET` still to set as each provider is enabled (exact names). Boot
  warns per missing secret in production; a provider whose secret is missing rejects
  EVERY callback (401) → deposits never credit.
- [x] **Repoint DNS** `50pick.tz` + `www.50pick.tz` → Railway. **DONE** (Netpoa→Cloudflare
  cutover 2026-07-17; re-verified 2026-07-20 — both hosts serve the real app,
  `server: railway-hikari`). Verify-after-deploy now uses `https://50pick.tz`.
- [ ] **Clear the `test.overrides.allowConflictedResolution` flag** via the admin
  UI (runtime already forces POCA §16 off in prod; clear it so intent is clean).
- [ ] **Sentry** (optional but recommended): set `SENTRY_DSN` + `npm i @sentry/node`
  → the H6 monitoring seam activates automatically (`src/lib/server/monitoring.ts`).
- [ ] **KYC object storage** (H8): wire **Cloudflare R2** so KYC images move out of
  Postgres (today `KycDocument.storageKey` holds an inline base64 data URL).
- [ ] **Settlement timers**: nothing to flip — settlement is per-market and
  timer-driven (see §4), there is no global on/off. On `/admin/system` → Settlement
  confirm **"Timers armed"** is non-zero with a sensible *next fire*, and
  **"Ready to settle"** reads **0** (anything sitting there is an unpaid market).
- [ ] Blocked/external: H2 Redis rate-limiter, TRA tax-base ruling, trademarked
  MNO logos, third-party pentest, DR-restore rehearsal.

---

## 2 · Payment-gateway integration map

**Bottom line:** the entire money *plumbing* is built and production-grade — inbound
webhook with HMAC verification, idempotency, the deposit/withdraw settlement state
machine, amount-tamper defense, RG/AML gates, per-MNO kill-switches, provider-health
analytics, PSP reconcile + retry queue, the double-entry ledger, and the full audit
trail. **The only stub is the OUTBOUND HTTP call to the aggregator** — one file,
two functions. Today deposits/withdrawals are simulated with `setTimeout`.

### Already built (do NOT rebuild)
- **Inbound webhook** `src/app/api/webhooks/payments/route.ts` — HMAC-SHA-256 over
  `${timestamp}.${body}`, mandatory timestamp + 5-min replay window, timing-safe
  compare, per-provider secret, **fails closed** in prod (`crypto.ts`
  `verifyWebhookSignature`).
- **Settlement state machine** `wallet-service.ts` `settlePaymentWebhook` →
  `settleDepositConfirmed` / `settleDepositFailed` / `settleWithdrawalConfirmed` /
  `settleWithdrawalFailed`: exactly-once (status-gated + per-wallet advisory lock +
  `@@unique([provider, providerRef])`), **atomic wallet+txn+ledger** (C3),
  amount-tamper defense (M4), RG self-exclusion re-check on late deposits, AML ≥1M
  hold.
- **Ops:** per-MNO kill-switches + provider health + PSP reconcile + retry queue
  (`payment-ops.ts`, `/admin/payments`); stale-payment sweep
  (`reconcileStalePayments`, 30-min); boot-time secret warnings (`boot-checks.ts`).
- **Async flow** already exercised end-to-end (`PAYMENTS_DEMO_ASYNC=true` +
  `scripts/payment-webhook.test.mts`, `webhook-security.test.mts`).

### To wire (stub → real aggregator: Selcom / AzamPay / Mixx)
1. **Outbound calls** — implement the real REST calls inside `dispatchDeposit`
   (`src/lib/server/payments.ts` ~L25–51, "initiate collection / USSD push") and
   `dispatchWithdrawal` (~L53–75, "disbursement / payout"). Return `PENDING` + the
   provider's real id as `providerRef`; everything downstream already expects async.
   *Recommended:* refactor `payments.ts` into the env-switched **adapter pattern**
   already used by `src/lib/server/sms.ts` (interface + per-aggregator adapter
   selected by `PAYMENT_AGGREGATOR`).
2. **Credentials** — wire the declared-but-unused slots `PAYMENT_AGGREGATOR`,
   `PAYMENT_API_KEY`, `PAYMENT_API_SECRET` (`.env.example` L20–22; grep-confirmed
   read nowhere yet) + any base-URL var.
3. **Webhook secrets + callback URL** — set `SELCOM_WEBHOOK_SECRET`,
   `AZAMPAY_WEBHOOK_SECRET`, `MIXX_WEBHOOK_SECRET` in Railway; register
   `POST /api/webhooks/payments` with each aggregator. Confirm each provider's
   header names (`X-Provider`/`X-Signature`/`X-Timestamp`) and MAC construction
   match — if not, adapt the header parsing / `${timestamp}.${body}` layout /
   `normalizeStatus()` per provider (`route.ts` L25–56).
4. **Mapping** — player-facing MNO enum (`MPESA`, `AIRTEL_MONEY`, `HALO_PESA`,
   `MIXX`, …) → chosen aggregator + the aggregator's `X-Provider` value; and the
   aggregator's status vocabulary → `normalizeStatus`.
5. **Outbound reversal** — add the real refund/reversal call at the RG-lockout
   auto-reverse point (`wallet-service.ts` ~L250) once real money can move.
6. **Payout posture — nothing to flip** (see §4). Settlement is per-market
   timer-driven; the `AUTO_SETTLE` switch no longer exists. Once the rail is live +
   reconciled, just verify on `/admin/system` → Settlement that timers are armed and
   "Ready to settle" is 0; `/admin/settlement` stays the human fallback.

### Enum & selection
`PaymentProvider` (schema L101–111): `MPESA, TIGO_PESA, AIRTEL_MONEY, HALO_PESA,
MIXX, TTCL_PESA, CARD, BANK_TRANSFER, INTERNAL`. Selection is **client-driven**
(user picks an MNO tile → Zod-validated string). `INTERNAL` = non-gateway credits
(affiliate/proposal prizes), never touches the gateway.

**Key files:** `payments.ts` (the stub) · `api/webhooks/payments/route.ts` (inbound)
· `wallet-service.ts` (settlement + dispatch callers) · `crypto.ts` (HMAC) ·
`payment-ops.ts` (kill-switch/health/reconcile) · `boot-checks.ts` (secret warnings)
· `market-scheduler.ts` (per-market settle timers + the 5-min reconciler) +
`lifecycle.ts` + `market-service.ts` (`settleMarket`) · `.env.example` / `RAILWAY.md`.

---

## 3 · Money provability (already built — C3/C6)

- **Double-entry ledger** with a real **wallet↔ledger trial balance** (`ledger.ts`
  `trialBalance()`): per wallet `ledger(PLAYER)==balance+hold`,
  `ledger(PLAYER_BONUS)==bonusBalance==Σ ACTIVE grants`, global `Σ=0`, no
  imbalanced group. A **nightly sweep** (lifecycle ticker) raises a `COMPLIANCE`
  `ledger.trial_balance_drift` alert on any drift; `/admin/finance` surfaces it.
- **Atomic money writes** (`withMoneyTx`): settlement payout, refunds, deposit-
  confirm, withdraw-confirm commit wallet+txn+ledger together — a ledger failure
  rolls back the money move (proven on PG + money-e2e 57/57, drift 0.00).
- **Audit chain** is DB-authoritative & fork-proof (advisory lock +
  `@@unique([prevHash])` + canonical hashing); money/compliance events chained.
- **NOTE:** until the go-live DB format (§1), the nightly trial balance reports
  drift from the test float — expected, not a defect. After the format it must
  read clean; treat any drift then as real.

---

## 4 · Settlement & payout posture

Settlement is **per-market and timer-driven** — there is **no global on/off switch**
to set at go-live. A resolved market is *adjudicated, not paid*: it holds its pool
through the objection window, and its own settle timer (`market-scheduler.ts`, armed
at the market's `objectionsClosedAt`) pays it when that window closes with nothing
disputing it. A ~5-minute reconciler (`reconcileMarketSchedules()`) re-arms any
market whose timer was dropped, so nothing goes unpaid. `/admin/settlement` remains
the **human fallback** — manual "Settle now" plus the objection-frozen view.

Every payout gate is unchanged and re-checked under the market lock inside
`settleMarket()`: the objection window, a standing objection freezing the pool, the
winner-floor, exact conservation, and idempotency (`settledAt`) — so a re-fire, the
reconciler racing a timer, or two instances can never double-pay. Settlement is
money-atomic and resumable (C3).

**How to watch it:** `/admin/system` → Settlement shows live scheduler health —
"Timers armed" (+ next fire), "Awaiting window", "Frozen by objection", and
"Ready to settle", which must read **0**; anything sitting there is overdue (a timer
was dropped). If it persists, check `LIFECYCLE_TICKER` / `MARKET_SCHEDULER` are not
`false`, or settle by hand at `/admin/settlement`.

> *Superseded (history):* this section previously read "automatic payout is **PAUSED**
> (`AUTO_SETTLE` unset) … every payout is a manual officer action", to be re-armed by
> flipping `AUTO_SETTLE=true` after the gateway went live. That posture — and the
> `AUTO_SETTLE` env var, its `autoSettle` toggle on `/admin/payments`, and the global
> `settleDueMarkets()` sweep — were removed by the owner decision of **2026-07-24**
> (recorded in `docs/COMPLIANCE-DECISIONS.md`). Do not go looking for that switch.

---

## 5 · Launch gate (must all be green on a fresh store)

- [ ] `tsc --noEmit` · `next build` · `npm run test:integrity` clean
- [ ] `npm run test:all` green (money · security · concurrency · i18n)
- [ ] On real Postgres: `s10` (double-spend), `s11` (audit fork), `money-e2e`
  (conservation drift 0) — also run by CI (`.github/workflows/ci.yml`)
- [ ] responsive-audit read at 360/768/1280/1920 EN/SW/ZH (run the server with
  `DISABLE_ADMIN_TOTP=true` for real admin coverage — audit F1)
- [ ] Ops checklist §1 complete · payment round-trip tested in staging (§2)
- [ ] Money reconciles to TZS 0 drift after the go-live format · audit chain verifies
