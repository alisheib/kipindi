# 50pick — Payment Aggregator Integration Runbook

> **Execute this the day the API keys land.** Everything except the two outbound
> adapter bodies is already built + tested. Realistic time to a working staging
> round-trip: **under an hour.** Branch: `feat/payment-adapter` (the adapter
> scaffold is already here — you fill two functions, wire creds, test, merge).
> Companion: `GO-LIVE-READINESS.md` §2. Last updated 2026-07-16.

## What's already done (do NOT rebuild)
- **Adapter seam** — `src/lib/server/payments.ts` is now the env-switched adapter
  pattern (mirrors `sms.ts`). `dispatchDeposit`/`dispatchWithdrawal` (the wrapper)
  own the correlation id, the `*.dispatch` audit, and the **AML ≥ 1M review hold**.
  `pickAdapter()` selects `mock` (default) / `selcom` / `azampay` on
  `PAYMENT_AGGREGATOR`. The real adapters currently `throw NOT_WIRED`.
- **Inbound webhook** — `src/app/api/webhooks/payments/route.ts`: HMAC-SHA-256 over
  `${timestamp}.${body}`, mandatory timestamp + 5-min replay window, timing-safe,
  per-provider secret, **fails closed** in prod.
- **Settlement state machine** — `wallet-service.ts` `settlePaymentWebhook`:
  exactly-once (status-gated + advisory lock + `@@unique([provider, providerRef])`),
  atomic wallet+txn+ledger, amount-tamper defense, RG re-check, AML hold.
- Ops (`/admin/payments`): kill-switches, health, reconcile, retry. Ledger + audit.

## Step 1 — Pick the aggregator + gather creds
- [ ] `PAYMENT_AGGREGATOR` = `selcom` **or** `azampay` (whichever contract is signed).
- [ ] From the aggregator portal, get: **API base URL**, **API key/username**,
      **API secret/password**, the **webhook signing secret**, and the exact
      **collection** (C2B / checkout) + **disbursement** (B2C / payout) API docs.

## Step 2 — Fill the adapter body (`src/lib/server/payments.ts`)
Replace the `throw NOT_WIRED(...)` in the chosen adapter. Both are ASYNC: the
initiate call returns fast; **return `PENDING` + the provider's reference as
`providerRef`** and let the webhook settle. Only return `CONFIRMED` if the API is
genuinely synchronous (unusual for mobile money).

**Shape (identical for both providers):**
```ts
async deposit({ provider, amount, msisdn, userId, correlationId }): Promise<DepositResult> {
  try {
    const token = await getToken();                    // cache per Step 2a
    const res = await fetch(`${BASE}/<collection-endpoint>`, {   // VERIFY endpoint
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        accountNumber: msisdn,                          // VERIFY field names
        amount, currency: "TZS",
        externalId: correlationId,                      // our id → provider echoes it back on the webhook
        provider: mnoToAggregator(provider),            // Step 4 map
      }),
    });
    if (!res.ok) return { ok: false, reason: "PROVIDER_DOWN", correlationId };
    const j = await res.json();
    return { ok: true, status: "PENDING", providerRef: String(j.transactionId /*VERIFY*/), correlationId };
  } catch { return { ok: false, reason: "TIMEOUT", correlationId }; }
}
```
`withdraw()` is the same against the disbursement/payout endpoint, returning a
`WithdrawResult` (`PENDING`). **The wrapper already blocked ≥ 1M**, so withdraw
bodies never see an AML amount.

### 2a — Token cache (both providers use OAuth-ish bearer tokens)
Add a module-level `{ token, exp }` cache; fetch a new token when expired.
- **AzamPay:** `POST {AUTH_BASE}/AppRegistration/GenerateToken` with
  `{ appName, clientId, clientSecret }` → `{ data: { accessToken, expire } }`.
  Checkout base and auth base are **different hosts** — VERIFY both.
- **Selcom:** signed-header scheme (no bearer) — each request carries
  `Authorization: SELCOM <base64(apiKey)>`, `Digest`, `Digest-Method: HS256`,
  `Signed-Fields`, `Timestamp`, where the digest = HMAC-SHA256 of the signed
  fields with the API secret. VERIFY the exact field list + order against the docs.

> All provider-specific values above are marked **VERIFY** — confirm every
> endpoint, field name, and signature detail against the signed aggregator's real
> docs. Do NOT ship a guessed signature.

## Step 3 — Env + webhook secret
- [ ] Railway: set `PAYMENT_AGGREGATOR`, `PAYMENT_API_KEY`, `PAYMENT_API_SECRET`
      (+ any base-URL var you add, e.g. `PAYMENT_API_URL`, `PAYMENT_AUTH_URL`).
- [ ] Set the provider's webhook secret: `SELCOM_WEBHOOK_SECRET` (already set) /
      `AZAMPAY_WEBHOOK_SECRET` / `MIXX_WEBHOOK_SECRET`.
- [ ] Register the callback `POST https://<host>/api/webhooks/payments` in the
      aggregator portal.
- [ ] **Confirm the inbound contract** in `route.ts` matches the provider: header
      names (`X-Provider` / `X-Signature` / `X-Timestamp`), the MAC layout
      (`${timestamp}.${body}`), and `normalizeStatus()` (their status words →
      `CONFIRMED`/`FAILED`). Adapt `route.ts` L25–56 per provider if they differ.

## Step 4 — MNO → aggregator mapping
Player picks an MNO tile → our `PaymentProvider` enum (`MPESA`, `AIRTEL_MONEY`,
`HALO_PESA`, `MIXX`, `TIGO_PESA`, `TTCL_PESA`, `CARD`, …). Add a
`mnoToAggregator(provider)` map to the aggregator's channel value, and map their
callback `provider` back. `INTERNAL` never touches the gateway.

## Step 5 — Test (local first, then staging)
- [ ] `PAYMENTS_DEMO_ASYNC=true npm run test:payments` + `npm run test:webhook-sec`
      still green (async webhook→settle path).
- [ ] Full gate: `npx tsc --noEmit` · `npm run build` · `npm run test:all` ·
      `npm run test:integrity`.
- [ ] On the local disposable PG: `npm run e2e:money` (conservation drift 0.00).
- [ ] **Staging round-trip against the aggregator sandbox:** a real deposit push
      → webhook → wallet credited exactly once; a small withdrawal → payout →
      webhook confirms; a ≥1M withdrawal → AML_REVIEW hold (no disbursement).
- [ ] Reconcile: `/admin/payments` drift = TZS 0.

## Step 6 — Merge + go live
- [ ] Merge `feat/payment-adapter` → `main` (full gate green), deploy, verify
      (200s + logs clean + a staging round-trip).
- [ ] Go-live DB hygiene (see GO-LIVE-READINESS §1): unset `TEST_FUNDING`,
      format/rebaseline the DB, rebaseline pre-C6 audit rows.
- [ ] Only THEN flip `AUTO_SETTLE=true` (auto-payout) — after the payout rail is
      live and reconciled. Add a boot-check using `paymentGatewayConfigured()` so
      production refuses to run real money on the mock adapter.

## Rollback
Unset `PAYMENT_AGGREGATOR` (→ mock) or flip the per-provider kill-switch on
`/admin/payments`. The webhook fails closed; no half-settled state (exactly-once).
