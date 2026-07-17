# Selcom Mobile API — verified integration digest (payments adapter)

> Real-money signing reference for the 50pick Selcom adapter. Compiled 2026-07-17 by
> cross-verifying the official docs (developers.selcommobile.com) against the official
> PHP SDK (`selcompaytechltd/selcom-apigw-client-php`), the official Node SDK
> (`selcom-developers/node-selcom`), the community Laravel package
> (`bryceandy/laravel-selcom`), the WooCommerce plugin (`wallace-stev/selcom-push-wp`),
> the Go client (`Golang-Tanzania/selcompay-client`) and the Ruby gem `selcom`.
> Confidence: **CONFIRMED** (≥2 independent sources) / **SINGLE-SOURCE** / **UNCERTAIN**.
>
> The signature algorithm (the highest-risk piece) was reproduced independently and
> matches the official docs' own `Authorization` header **byte-for-byte** — see the
> golden vector below, which `scripts/selcom-adapter.test.mts` asserts.

## 1. Request signing — CONFIRMED (algorithm independently recomputed)

Every request carries these headers:

| Header | Value |
|---|---|
| `Content-Type` | `application/json` |
| `Authorization` | `SELCOM ` + **base64(API_KEY)** — literal `SELCOM`, one space, base64 of the API **key** (not a hash, not the secret) |
| `Digest-Method` | `HS256` |
| `Digest` | **base64**( HMAC_SHA256( signing_string, **API_SECRET** ) ) — base64 NOT hex |
| `Timestamp` | ISO-8601 `YYYY-MM-DDThh:mm:ss+03:00` (PHP `date('c')` under `Africa/Dar_es_Salaam`), **no milliseconds** |
| `Signed-Fields` | comma-joined body field names, no spaces, in body order |

**Signing string:** `timestamp=<TS>&<field1>=<val1>&<field2>=<val2>&...`
- `timestamp=` is **always first**, even though `timestamp` is NOT itself in `Signed-Fields`.
- Then each body field **in `Signed-Fields` order** (= JSON insertion order).
- Values are **RAW — not url-encoded** (`strval()`), joined by literal `&`, `key=value`.
- The **same** `Timestamp` string goes in the header and the signing string.
- `Signed-Fields` = **all** body keys.

**Golden vector** (SDK sample creds `apiKey=202cb962ac59075b964b07152d234b70`,
`apiSecret=81dc9bdb52d04dc20036dbd8313ed055`) — our signer must reproduce this:
```
Signed-Fields : utilityref,transid,amount
signing string: timestamp=2019-02-26T09:30:46+03:00&utilityref=12345&transid=transid&amount=5000
Digest        : TFHAyQ1k1d601bVfimp+GJsgiBPzMmmV0QJl0bX1c1Q=
Authorization : SELCOM MjAyY2I5NjJhYzU5MDc1Yjk2NGIwNzE1MmQyMzRiNzA=
```
The Authorization token here is byte-identical to the official docs example.

⚠️ Two traps in the official **Node** sample (contradicted by docs + both PHP SDKs — use the PHP form):
`Authorization` as hex (must be **base64**); timestamp via `toISOString()` (must be `date('c')` `+03:00`, no millis).

## 2. Hosts
- Sandbox: `https://apigwtest.selcommobile.com/v1/`
- Production: `https://apigw.selcommobile.com/v1/`  (host string CONFIRMED across community SDKs; verify your exact live host + `vendor` till with Selcom onboarding)

## 3. Collection (money IN) — create order → USSD push
- `POST /v1/checkout/create-order-minimal` — `{ vendor, order_id, buyer_email, buyer_name, buyer_phone, amount, currency, webhook, ... }`. `webhook`/`redirect_url`/`cancel_url` are **base64-encoded**. Signed-Fields = all keys.
- `POST /v1/checkout/wallet-payment` — `{ transid, order_id, msisdn }` → pushes the USSD PIN prompt. Async: sync response `resultcode:"111", result:"PENDING"`; final status by webhook.
- Response envelope: `{ reference, resultcode, result, message, data[] }`. Codes: `000`=SUCCESS · `111`=PENDING · `999`=AMBIGUOUS (must query order-status) · other=FAIL.
- The network is inferred from the buyer `msisdn` — the confirmed flow does NOT pass a collection channel string.

## 4. Disbursement (money OUT) — Wallet Cashin
- `POST /v1/walletcashin/process` — `{ transid, utilitycode, utilityref, amount, vendor, pin, msisdn? }`.
  - **`utilityref` = the receiver (payee) MSISDN**, NOT `msisdn`. `msisdn` (optional) = sender.
  - `pin` = the float-account PIN. `vendor` = your Selcom float/till id. Signed-Fields = all keys.
  - Response envelope as §3. `000`=SUCCESS, `111`=PENDING (→ reconcile).
- Bank: `/v1/qwiksend/lookup` then `/v1/qwiksend/process` — **UNCERTAIN** field names; not used for MNO payouts.

## 5. Channel codes
Disbursement `utilitycode` (CONFIRMED unless noted):
`VMCASHIN` M-Pesa · `AMCASHIN` Airtel · `TPCASHIN` Tigo/Mixx by Yas · `EZCASHIN` Zantel ·
`HPCASHIN` HaloPesa (SINGLE-SOURCE) · `TTCASHIN` TTCL/T-Pesa (SINGLE-SOURCE) · `CASHIN` any (auto-route).
Collection channel names (`MPESA-TZ`, `AIRTELMONEY`, …) are a **different, UNCERTAIN** vocabulary and are **not** needed for the confirmed collection flow (network inferred from msisdn).

## 6. Webhook callback + independent verification
- Selcom **signs** the checkout callback (same HMAC scheme). Headers include `Authorization: SELCOM …`, `Digest`, `Digest-Method`, `Timestamp`, `Signed-Fields: transid,order_id,reference,result,resultcode,payment_status`. ⚠️ callback `Timestamp` format documented as `yyyy-dd-mm H:i:s` (SINGLE-SOURCE — verify).
- Body: `{ transid, reference, order_id, result, resulcode /*sic — typo, no "t"*/, payment_status }`. **Authoritative money state = `payment_status`**; `COMPLETED` = paid, `PENDING` = not yet. **FAILED enum value UNCERTAIN.**
- **Independent verification (triple-source CONFIRMED):** `GET /v1/checkout/order-status?order_id=<id>` (signed like any request; Signed-Fields over the query). Response `data[0].payment_status` is authoritative (`COMPLETED`=paid; `transid`/`reference`/`channel` populate when paid).
- **Our design:** treat the callback as a poke and settle deposits from the **signed order-status re-query** (built on the fully-verified outbound signer), not from the callback body — this is robust against the uncertain callback signature/timestamp format. Settlement stays exactly-once + amount-checked in `wallet-service.settlePaymentWebhook`.

## 7. Gotchas
- **Amount = whole TZS integer** (NOT cents). Currency `"TZS"`.
- **Phone = `255XXXXXXXXX`** (12 digits, no `+`, no leading `0`) for `buyer_phone`/`msisdn`/`utilityref`.
- Idempotency key: checkout = `order_id`; cashin = `transid`.
- JSON body order == signing-string order == `Signed-Fields` order — reordering after signing → 401.
- Timestamp MUST be `Africa/Dar_es_Salaam` (+03:00) — skew/wrong offset → 401.

## 8. ⚠️ Confirm with Selcom before flipping the provider to `selcom` in production
1. Exact live host string + your `vendor` till id.
2. `HPCASHIN` / `TTCASHIN` exact strings (single-source).
3. `qwiksend/process` payload field names (only if bank payouts are used).
4. Whether collection needs a channel field + its strings (`MPESA-TZ` …).
5. The **FAILED** `payment_status` enum value(s) for the callback.
6. Standalone `/v1/wallet/pushussd` existence + fields (only if direct C2B is used).
7. Callback ACK requirement, retry count/schedule, and USSD-push expiry.
8. Callback `Timestamp` format (`yyyy-dd-mm H:i:s`) for Digest verification.

Items 1–2 + 5 are the ones that affect the confirmed path; the sandbox round-trip will
also reveal the real callback shape to finalize the parser against reality.
