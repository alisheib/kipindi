# Blackball SMS Gateway — integration digest

Account: **OCEAN ENTERTAINMENT LTD** (`ali.sheib@50pick.tz`) · portal `https://blackballgw.co.tz`
Endpoints: `POST /api/sms/send` · `POST /api/account/balance` (Swagger: `bulk-api-rest-controller`)
Wired: 2026-09-16. Code: `src/lib/server/sms-blackball.ts` (transport), `src/lib/server/sms.ts`
(facade), `src/app/api/webhooks/blackball/route.ts` (delivery receipts).

## Status — 2026-09-16

| | |
|---|---|
| Code | ✅ live on `main`, dark: production runs `SMS_PROVIDER=console`, `OTP_ENABLED` unset |
| API configuration | ✅ `50pick-production` saved in the portal, status callback registered, `BLACKBALL_WEBHOOK_SECRET` set in Railway |
| Sender ID | ✅ `50pick` (the portal's Send SMS list, exactly as shown) |
| First live send | ✅ ACCEPTED → **DELIVRD / Success in 2 seconds**, Tigo Tz, **TZS 6** |
| Delivery callback | 🔴 **not received** — see §4, most likely Cloudflare error 1010 |
| Balance | TZS 244 after the first send |

---

## 1 · What the vendor document does not tell you

Measured against the live gateway on 2026-09-16 — the probes used deliberately invalid
credentials, so nothing was sent or billed, except the one real send in §5.

### 1.1 🔴 Every failure is HTTP 400 — including authentication

```
POST /api/sms/send   {"auth":{"clientId":"fake","clientSecret":"fake"}, ...}
→ HTTP 400  {"status":false,"message":"Invalid credentials","data":null,"balance":0.0}
```

A schema complaint returns 400 too. **`res.ok` is not the verdict — the `status` boolean is.**
`if (!res.ok) throw` would collapse "your sender ID is one character too long" and "your secret
is wrong" into one opaque transport error.

### 1.2 🔴 `source` may only be 12 characters

```
"source":"ABCDEFGHIJKLMNOP" → "data":[{"source":" may only be 12 characters long"}]
```

Enforced **before** authentication, so an over-long sender ID fails every send with a complaint
about a *field*. `senderIdProblem()` catches it at boot. `50pick` is 6.

### 1.3 🔴 `data` is an array on a schema error, `null` on an auth error, `null` on success

The PDF types it "Object". A schema error sends an **array of single-key objects**; an auth error
and a success both send `null`. `readFieldErrors` accepts array, object and null.

### 1.4 ⚠️ The `balance` on a reply is only half-true

- On a **refusal** it is `0.0` — validation and authentication happen before the account is
  known. It is **not** the account's balance.
- On an **accepted** send it is **pre-charge**: the first send was answered with `250.0`; the TZS 6
  landed afterwards.
- `POST /api/account/balance` (auth only, free, sends nothing) returns the **true** figure:
  `{"status":true,"message":"Account balance","data":{"name":…,"currency":"TZS",…},"balance":244.0}`.

So `sms.ts` records balances from **accepted** replies only, and reads the balance endpoint
whenever a campaign meets a missing or stale reading. Recording a refusal's `0.0` would store
TZS 0, trip the cost floor, and hold every campaign — held before any request, so nothing could
ever refresh it. That latch existed and is guarded by `test:sms-cost-guard` §2.

### 1.5 `coding` — `GSM7` or `UCS2`

Not in the PDF; in the Swagger `Msg` schema, and the values read off the gateway:
`coding:"NOPE"` → *"does not have a value in the enumeration [GSM7, UCS2]"*. The portal labels GSM
the default, and **GSM-7 cannot carry Chinese** — a `ZH` login code would arrive as unreadable
glyphs. `smsCodingFor()` chooses per message from the text: GSM7 when every character is in the
GSM 03.38 set (extension table included), UCS2 otherwise (Chinese, em-dashes, curly quotes, emoji).
UCS2 holds 70 characters per segment instead of 160.

### 1.6 Other measured facts

| Fact | Evidence |
|---|---|
| `reference` is optional to them, but ≥ 20 chars when present | `"short"` → *"must be at least 20 characters long"* |
| `text` has a 1-character floor | `""` → *"must be at least 1 characters long"* |
| Validation runs **before** authentication | schema errors come back with fake credentials |
| **msisdn is not validated** | the string `notaphone` passes their schema — `toMsisdn255()` normalises |
| A success carries **no per-message id** | `{"status":true,"message":"Successfully submitted 1 message(s) to broker.","data":null,"balance":250.0}` |
| The balance endpoint words its auth error differently | `"Invalid credentials used"` |

---

## 2 · Request and response

```jsonc
POST /api/sms/send        Content-Type: application/json
{
  "auth": { "clientId": "…", "clientSecret": "…" },     // in the BODY, not a header
  "messages": [                                          // max 50
    { "text": "…", "msisdn": "255772619619", "source": "50pick",
      "reference": "sms_<24 hex>", "coding": "GSM7" }
  ]
}
→ { "status": true, "message": "Successfully submitted 1 message(s) to broker.", "data": null, "balance": 250.0 }
```

⚠️ **One envelope covers the whole batch**, and a success names no message. Per-message truth
arrives on the delivery receipt, keyed by **our** `reference` — the only join key there is.

---

## 3 · Delivery receipts (DLR)

They POST to the portal's *Status callback*:

```jsonc
{ "statuses": [ { "status": "…", "reference": "…", "description": "…", "msisdn": "…" } ] }
```

and expect **exactly** `{"status":"Ok"}` back — ⛔ not this codebase's usual `{ok:true}`.

Our URL: `https://www.50pick.tz/api/webhooks/blackball?token=<BLACKBALL_WEBHOOK_SECRET>`
(or the token as an `X-Blackball-Token` header). Pre-flighted on production: no token → 401,
wrong token → 401, the portal URL → `200 {"status":"Ok"}`.

### The status vocabulary

**Observed:** `DELIVRD` / `Success` (first live send, portal Out SMS). Every other arm of
`mapDlrStatus()` is still the SMPP seed. An unrecognised token returns `null`: the row keeps its
status, the raw token is stored on `SmsMessage.dlrStatus`, and `sms.dlr.unmapped_status` is audited.
⛔ **There is no default-to-DELIVERED arm and there must never be one.**

### Four layers against forgery

1. the shared secret, constant-time, failing closed once the provider is live
2. the reference must **exist** — 24 hex characters
3. the msisdn must **match** the one we sent to
4. the state machine is **monotonic** — a settled row is never rewritten

The worst a fully-authenticated forger can do is mark an invite delivered that was not. An OTP
receipt is explicitly inert, and an empty callback writes nothing to the audit chain.

---

## 4 · 🔴 Cloudflare blocks Java 8 callers — the likely reason no receipt arrived

Measured 2026-09-16 against `www.50pick.tz`: any request whose User-Agent is **`Java/1.8…`,
`Java/1.7…` or `Java/1.6…`** is answered by Cloudflare with **`403`, error code `1010`** ("banned
based on browser signature"). Java 11/17/21, Apache HttpClient, okhttp, curl and Python pass. The
block is **zone-wide** — `/api/webhooks/payments` and `/api/webhooks/postmark` are refused the same
way — and the request never reaches the app, so production logs **nothing**.

Blackball's portal is a Java/Spring application; the first message was DELIVRD at 16:29:25 EAT and
no callback, rejected or otherwise, reached production. ⚠️ **Not yet proven**: it needs either a
blocked event in Cloudflare → Security → Events for `/api/webhooks/blackball`, or Blackball
confirming their callback got a 403.

**The fix (Cloudflare, owner-approved):** Rules → Configuration Rules → *If* URI Path starts with
`/api/webhooks/` → *Then* Browser Integrity Check **Off**. The rest of the site keeps it; the webhooks
keep their own secrets and signatures. Verify with:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST -A "Java/1.8.0_292" \
  -H "Content-Type: application/json" -d '{"statuses":[]}' \
  "https://www.50pick.tz/api/webhooks/blackball?token=<secret>"      # must be 200, not 403
```

---

## 5 · Economics

- **TZS 6 per delivered SMS** (GSM7, one segment, Tigo Tz — portal Out SMS "Price" for the first send).
- The account opened with TZS 250 → **about 40 messages**. Production login traffic needs a top-up.
- UCS2 and long messages bill per segment (unconfirmed with the vendor — §8).

The cost floor holds `INVITE`/`OPS` traffic below `SMS_BALANCE_FLOOR_TZS` so the float is kept for
login codes. ⛔ **OTP is exempt, and never waits on a balance read**: refusing a login code to save
a few shillings is a self-inflicted outage. A reading is trusted only from an accepted reply or the
balance endpoint, expires after `SMS_BALANCE_TTL_MS`, and **unknown is never treated as low**. The
low-balance alarm is edge-triggered — one audit row per downward crossing.

---

## 6 · Configuration

| Variable | Notes |
|---|---|
| `SMS_PROVIDER` | `console` or `blackball`. ⛔ Anything else is a FAILED choice — nothing sends, nothing is marked sent |
| `SMS_SENDER_ID` | `50pick` · ⛔ max 12 characters |
| `BLACKBALL_CLIENT_ID` / `BLACKBALL_CLIENT_SECRET` | portal → Configurations → API Configurations |
| `BLACKBALL_API_URL` | defaults to the live send endpoint; the balance endpoint is derived from its host |
| `BLACKBALL_TIMEOUT_MS` | default 8000 |
| `BLACKBALL_WEBHOOK_SECRET` | ≥ 16 chars, set in Railway. A placeholder is functionally ABSENT |
| `SMS_BALANCE_FLOOR_TZS` / `SMS_BALANCE_ALERT_TZS` | default 50 / 150 (≈ 8 / 25 messages) |
| `SMS_BALANCE_TTL_MS` | default 900000 (15 minutes) |
| `INVITE_SMS_MAX_PER_SEND` | default 500 |
| `OTP_ENABLED` | `1` turns phone-code login on |

Boot warns in production (fail-open) on: an unrecognised provider, a selected Blackball with no
credentials, a sender ID over the cap, an unusable DLR secret, and — loudest — `OTP_ENABLED=1`
while SMS cannot deliver.

---

## 7 · Go-live order

Each step is independently reversible, and none of the later ones is safe without the earlier.

1. ✅ **Code lands with `SMS_PROVIDER=console`.** Nothing changes for players.
2. ✅ **DLR secret in Railway; API configuration and callback URL saved in the portal.**
3. ✅ **Live drive step 1** — `npm run live:blackball -- --step 1 --confirm`. Delivered.
4. ⬜ **Cloudflare: turn Browser Integrity Check off for `/api/webhooks/*`** (§4), then confirm a
   real receipt lands: `node scripts/live/ops/sms-receipts.cjs <reference>`.
5. ⬜ **Railway: `BLACKBALL_CLIENT_ID`, `BLACKBALL_CLIENT_SECRET`, `SMS_SENDER_ID=50pick`, then
   `SMS_PROVIDER=blackball`.** OTP still off, so the blast radius is invite campaigns — which
   `bonusIsLiveFor()` already holds shut.
6. ⬜ **Only after a real receipt has been observed, and after a top-up:** `OTP_ENABLED=1`.

### Preconditions for step 6 — measured, none assumed

- `/api/health` → `sms.configured: true`, `webhookSecretSet: true`, and a `balanceTzs` comfortably
  above the alert line.
- At least one real delivery receipt has **arrived at production** and mapped. It is the only proof
  that Cloudflare, the token and the URL registration are all right, and it cannot be simulated.
- The production boot log prints no `[sms]` warning.
- Password sign-in is still reachable from `/auth/login`.

### Rollback, cheapest first

| | Action | Effect |
|---|---|---|
| R1 | unset `OTP_ENABLED` | `/auth/otp` goes dormant; password carries every login |
| R2 | `SMS_PROVIDER=console` | SMS stops; invites return to QUEUED honestly; OTP refuses with `SMS_UNDELIVERABLE` |
| R3 | revert the code | Safe in any order — the migration is expand-only. ⛔ **Never drop `SmsMessage` on a rollback**: receipts for messages already sent are still arriving |

---

## 8 · Still open with the vendor

1. Did the status callback for the first message get **HTTP 403**? Which **User-Agent / Java
   version** does it send? *(§4)*
2. Can they **resend** that callback once our side is fixed, and do callbacks **retry** on a non-200?
3. **Egress IP addresses**, for an allowlist.
4. The full **status and description** value set — especially the failure tokens.
5. Billing per **segment** for UCS2 (70 chars) and long GSM7 messages.
6. Must `reference` be **unique forever** on the account; what does a duplicate do?
7. Any **rate limit** on `/api/sms/send`.
8. Confirmation that sender ID `50pick` is **TCRA-registered**, and whether it is case-sensitive.

Answered already: sender ID, price, success body, `coding` values, balance endpoint.

---

## 9 · Tools and guards

| | |
|---|---|
| `npm run live:blackball` | the live drive — one hard-coded number, a 6-send ledger, balance read before and after, raw reply captured |
| `node scripts/live/ops/sms-receipts.cjs [ref]` | read-only: SMS and receipt audit rows on production, cross-checked against `/api/health` |
| `test:blackball` / `red:blackball` | the transport: HTTP-400 trap, `data` shapes, sender cap, reference floor, batching, timeouts, `coding`, balance endpoint |
| `test:sms-dlr` / `red:sms-dlr` | the receiver: auth, exact reply body, unknown references, msisdn cross-check, monotonicity, no-guess rule, the observed DELIVRD receipt, no empty-callback audit |
| `test:otp-delivery` / `red:otp-delivery` | the login path: refusal before minting, await, consume-on-failure, rate refund, locale, wire-form msisdn, UNKNOWN on a lost reply |
| `test:sms-cost-guard` / `red:sms-cost-guard` | the floor: OTP exemption, the refusal-balance latch, staleness, balance-endpoint refresh, edge-triggered alarm |
| `test:dal-parity` §6 | both DAL backends map every `SmsMessage` field and enforce the same monotonic receipt rule |
| `test:invites` | a configured provider sends three invites in ONE request; a typo'd provider refuses honestly |
| `test:pii-logs` §4 | the message body never reaches a production log |
