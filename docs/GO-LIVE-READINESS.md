# 50pick — Go-Live Readiness & Payment-Gateway Integration

> **STATUS: authoritative pre-launch reference.** Consolidates what must be true
> before real money flows, and exactly what to wire to integrate the payment
> aggregator. Companion to `docs/FINAL-AUDIT-REMEDIATION.md` (the audit tracker)
> and `docs/perfection-plan.md` (the 0-issue plan). Last updated 2026-07-16.

---

## 0 · Where the audit stands

**All 11 Criticals, all Highs, all Mediums are closed** (see the audit tracker).
The remaining code items are optional AAA-polish / hardening, none blocking launch:
- **L6** (44px tap targets) — money controls done (chips, bet-confirm Cancel,
  Change side); top-bar Wallet/Deposit pill, dial Lock/Unlock, language switcher,
  admin tabs remain (AAA upgrade; AA/2.5.8 already met).
- **bet-STAKE single-`$transaction`** — the one C3 atomicity exception (settlement,
  deposit, withdraw, refunds are already atomic; the money is correct + drift is
  detected/alerted, so this is hardening, not a blocker).
- **M2** largest-remainder payout (bounded, tested dust today) · **C5** webhook
  nonce table (idempotency already prevents double-credit).

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
- [ ] **Set the payment webhook secrets** (see §2): `SELCOM_WEBHOOK_SECRET`,
  `AZAMPAY_WEBHOOK_SECRET`, `MIXX_WEBHOOK_SECRET` (exact names). Boot warns per
  missing secret in production; a provider whose secret is missing rejects EVERY
  callback (401) → deposits never credit.
- [ ] **Repoint DNS** `50pick.tz` + `www.50pick.tz` → Railway. They currently
  resolve to an Apache parking page; the app is only reachable at
  `https://kipindi-production.up.railway.app`. Verify-after-deploy uses the
  railway.app host until this is fixed.
- [ ] **Clear the `test.overrides.allowConflictedResolution` flag** via the admin
  UI (runtime already forces POCA §16 off in prod; clear it so intent is clean).
- [ ] **Sentry** (optional but recommended): set `SENTRY_DSN` + `npm i @sentry/node`
  → the H6 monitoring seam activates automatically (`src/lib/server/monitoring.ts`).
- [ ] **KYC object storage** (H8): wire **Cloudflare R2** so KYC images move out of
  Postgres (today `KycDocument.storageKey` holds an inline base64 data URL).
- [ ] **`AUTO_SETTLE`**: leave OFF until the gateway is live and reconciled (see §4).
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
6. **Re-enable auto-payout** — flip `AUTO_SETTLE=true` (see §4) only AFTER the rail
   is live + reconciled.

### Enum & selection
`PaymentProvider` (schema L101–111): `MPESA, TIGO_PESA, AIRTEL_MONEY, HALO_PESA,
MIXX, TTCL_PESA, CARD, BANK_TRANSFER, INTERNAL`. Selection is **client-driven**
(user picks an MNO tile → Zod-validated string). `INTERNAL` = non-gateway credits
(affiliate/proposal prizes), never touches the gateway.

**Key files:** `payments.ts` (the stub) · `api/webhooks/payments/route.ts` (inbound)
· `wallet-service.ts` (settlement + dispatch callers) · `crypto.ts` (HMAC) ·
`payment-ops.ts` (kill-switch/health/reconcile) · `boot-checks.ts` (secret warnings)
· `lifecycle.ts` + `market-service.ts` (AUTO_SETTLE) · `.env.example` / `RAILWAY.md`.

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

Automatic payout is **PAUSED** (`AUTO_SETTLE` unset). A resolved market holds its
pool through the objection window; an officer settles it by hand at
`/admin/settlement`. The sweep, its idempotency and its gate are all built and
tested — flip `AUTO_SETTLE=true` **only once the payout rail (the gateway) is live
and reconciled**, so the platform never moves money on a timer before real
money-out exists. Settlement is money-atomic and resumable (C3).

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
