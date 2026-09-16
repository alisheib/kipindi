# Blackball SMS Gateway — integration digest

Account: **OCEAN ENTERTAINMENT LTD** (`ali.sheib@50pick.tz`) · portal `https://blackballgw.co.tz`
Endpoint: `POST https://blackballgw.co.tz/api/sms/send`
Wired: 2026-09-16. Code: `src/lib/server/sms-blackball.ts` (transport), `src/lib/server/sms.ts`
(facade), `src/app/api/webhooks/blackball/route.ts` (delivery receipts).

---

## 1 · What the vendor document does not tell you

Everything below was **measured against the live endpoint** on 2026-09-16 using deliberately
invalid credentials — no message was sent and nothing was billed. Each of the four would have
been a defect if the PDF had been trusted.

### 1.1 🔴 Every failure is HTTP 400 — including authentication

```
POST /api/sms/send   {"auth":{"clientId":"fake","clientSecret":"fake"}, ...}
→ HTTP 400  {"status":false,"message":"Invalid credentials","data":null,"balance":0.0}
```

A schema complaint returns 400 too. **`res.ok` is therefore not the verdict — the `status`
boolean in the body is.** The house reflex `if (!res.ok) throw` would collapse "your sender ID
is one character too long" and "your secret is wrong" into one opaque transport error and
discard the only string that names the cause. A `200` carrying `status:false` fails on the same
line.

### 1.2 🔴 `source` may only be 12 characters

```
"source":"ABCDEFGHIJKLMNOP"
→ {"status":false,"message":"Validation errors","data":[{"source":" may only be 12 characters long"}]}
```

Undocumented, and enforced **before** authentication — so an over-long sender ID fails every
send with a complaint about a *field*, not about the sender ID being wrong or unregistered.
`senderIdProblem()` catches it at boot instead. `50PICK` is 6 and fits.

### 1.3 🔴 `data` is an array on a schema error, `null` on an auth error

The PDF types it "Object". It arrives as an **array of single-key objects**:

```json
{"status":false,"message":"Validation errors",
 "data":[{"source":" may only be 12 characters long"},
         {"reference":" must be at least 20 characters long"}],
 "balance":0.0}
```

`readFieldErrors` accepts array, object and null. A parser that indexed it as an object would
throw on the commonest failure this gateway produces.

### 1.4 ⭐ Every reply carries an undocumented `balance`

A TZS number, present on success **and on failure**. That is free credit telemetry on every
send with no extra call — and reading it only on success would go blind exactly as the float
runs out. It drives the cost floor in `sms.ts`.

### 1.5 Other measured facts

| Fact | Evidence |
|---|---|
| `reference` is **optional** to them, but ≥ 20 chars when present | omitting it is not reported missing; `"short"` → *"must be at least 20 characters long"* |
| `text` has a 1-character floor | `""` → *"must be at least 1 characters long"* |
| Validation runs **before** authentication | schema errors return with fake credentials; auth errors only once the schema passes |
| **msisdn is not validated at all** | the literal string `notaphone` passes their schema |
| Max 50 messages per request | documented; not observably enforced pre-auth, so we enforce it |

⛔ Because msisdn is unvalidated, normalising is entirely ours: `toMsisdn255()` in
`src/lib/phone-normalize.ts` produces the bare `255XXXXXXXXX` the gateway wants.

---

## 2 · Request and response

```jsonc
POST /api/sms/send        Content-Type: application/json
{
  "auth": { "clientId": "…", "clientSecret": "…" },     // in the BODY, not a header
  "messages": [                                          // max 50
    { "text": "…", "msisdn": "255772619619", "source": "50PICK", "reference": "sms_<24 hex>" }
  ]
}
```

```jsonc
{ "status": true|false, "message": "…", "data": object|array|null, "balance": 250.0 }
```

⚠️ **One envelope covers the whole batch.** There is a single `status`/`message` pair for up to
50 messages, so the transport can only report a batch-level verdict. Per-message truth arrives
later on the delivery receipt, keyed by `reference` — which is the whole reason every send is
persisted with one. Do not invent per-message outcomes; there is no per-message data to read.

**The success body shape is still unconfirmed** — we have only error envelopes. Question 5 below.

---

## 3 · Delivery receipts (DLR)

They POST to the URL registered in the portal (Configurations → API Configurations → *Status
callback*):

```jsonc
{ "statuses": [ { "status": "…", "reference": "…", "description": "…", "msisdn": "…" } ] }
```

and expect **exactly** `{"status":"Ok"}` back — ⛔ not this codebase's usual `{ok:true}`.

Our URL: `https://www.50pick.tz/api/webhooks/blackball?token=<BLACKBALL_WEBHOOK_SECRET>`
(the token may also be sent as an `X-Blackball-Token` header).

### The status vocabulary is NOT published

`mapDlrStatus()` seeds its arms from the common SMPP vocabulary, and that is a **starting point,
not a specification**. An unrecognised token returns `null`: the row keeps its status, the raw
token is stored on `SmsMessage.dlrStatus`, and `sms.dlr.unmapped_status` is audited. That is how
the real vocabulary gets learned from production instead of invented here.

⛔ **There is no default-to-DELIVERED arm and there must never be one.** Reporting delivery we
have no evidence for, on the rail that carries login codes, is the failure this whole design is
written against.

### Four layers against forgery

1. the shared secret, compared in constant time, failing closed once the provider is live
2. the reference must **exist** — 24 hex characters, not guessable
3. the msisdn must **match** the one we sent to
4. the state machine is **monotonic** — a settled row is never rewritten

A fully-authenticated forger can therefore do exactly one thing: mark an invite delivered that
was not. No money moves, no session is created, and an OTP receipt is explicitly inert.

⚠️ **The DLR secret deviates from the Postmark template on purpose.** Postmark's receiver opens
when its secret is unset and `NODE_ENV !== "production"`. Here that convenience closes the
moment `SMS_PROVIDER=blackball`, because then real references exist and a QA box is a door.

---

## 4 · Configuration

| Variable | Notes |
|---|---|
| `SMS_PROVIDER` | `console` or `blackball`. ⛔ Anything else is a FAILED choice, not a fallback — nothing sends and nothing is marked sent |
| `SMS_SENDER_ID` | ⛔ max 12 characters |
| `BLACKBALL_CLIENT_ID` / `BLACKBALL_CLIENT_SECRET` | portal → Configurations → API Configurations |
| `BLACKBALL_API_URL` | defaults to the live endpoint |
| `BLACKBALL_TIMEOUT_MS` | default 8000 |
| `BLACKBALL_WEBHOOK_SECRET` | ≥ 16 chars. A placeholder is functionally ABSENT — every callback 401s |
| `SMS_BALANCE_FLOOR_TZS` / `SMS_BALANCE_ALERT_TZS` | default 50 / 150 |
| `INVITE_SMS_MAX_PER_SEND` | default 500 |
| `OTP_ENABLED` | `1` turns phone-code login on |

Boot warns in production (fail-open, never a throw) on: an unrecognised provider, a selected
Blackball with no credentials, a sender ID over the cap, an unusable DLR secret, and — loudest —
`OTP_ENABLED=1` while SMS cannot deliver.

---

## 5 · Economics

The account opened with **TZS 250**. The per-message price is not yet measured — step 1 of the
live drive derives it from the `balance` delta.

The cost floor holds back `INVITE`/`OPS` traffic below `SMS_BALANCE_FLOOR_TZS` so the remaining
float is kept for login codes. ⛔ **OTP is exempt from the floor**: once OTP is a login path,
refusing a login code to conserve TZS 40 is a self-inflicted outage, which is the opposite of
what the floor is for. The low-balance alarm is **edge-triggered** — one audit row per downward
crossing, re-armed on recovery — because a level check writes a row per send exactly when the
compliance log most needs reading.

---

## 6 · Go-live order

Each step is independently reversible, and none of the later ones is safe without the earlier.

1. **Code lands with `SMS_PROVIDER=console`.** Nothing changes for players.
2. **Set the credentials and the DLR secret in Railway; register the callback URL in the portal.**
   Still nothing sends, so a wrong secret costs a 401 in a log.
3. **Flip `SMS_PROVIDER=blackball`.** OTP is still off, so the blast radius is invite campaigns —
   which `bonusIsLiveFor()` already holds shut.
4. **Run the live drive** (`scripts/live/blackball-drive.mjs`, ≤ 6 chargeable sends).
   ⭐ Record the **observed DLR status tokens** and extend `mapDlrStatus()` from that evidence.
5. **Only after a real send AND a real receipt have both been observed:** `OTP_ENABLED=1`.

### Preconditions for step 5 — measured, none assumed

- `/api/health` reports `sms.configured: true` and a `balanceTzs` above the alert threshold.
  ⛔ **Top up first** — TZS 250 is roughly ten messages, and a login path on a ten-message float
  is an outage with a countdown on it.
- At least one real delivery receipt has arrived and mapped. That is the only proof the secret
  and the URL registration are both right, and it cannot be simulated.
- The production boot log prints no `[sms]` warning.
- Password sign-in is still reachable from `/auth/login`.

### Rollback, cheapest first

| | Action | Effect |
|---|---|---|
| R1 | unset `OTP_ENABLED` | `/auth/otp` goes dormant; password carries every login |
| R2 | `SMS_PROVIDER=console` | SMS stops; invites return to QUEUED honestly; OTP refuses with `SMS_UNDELIVERABLE` |
| R3 | revert the code | Safe in any order — the migration is expand-only, so `SmsMessage` rows are orphaned, never read. ⛔ **Never drop the table on a rollback**: receipts for messages already sent are still arriving |

---

## 7 · Still open with the vendor

1. The exact `status` and `description` value set the callback can send. *(Until answered,
   unknown tokens are recorded raw and audited — never guessed.)*
2. Egress IP addresses, for an allowlist.
3. The approved sender ID for OCEAN ENTERTAINMENT LTD, and its TCRA registration.
4. Whether the callback retries on a non-200, and how many times.
5. An example of a **successful** response body — in particular whether `data` carries
   per-message identifiers.
6. Whether `reference` must be globally unique on the account forever, and what a duplicate does.
7. Any rate limit on `/api/sms/send`.
8. Billing for multi-part messages and non-GSM characters.

---

## 8 · Guards

| Suite | Covers |
|---|---|
| `test:blackball` / `red:blackball` | the transport: the HTTP-400 trap, all three `data` shapes, the sender cap, the reference floor, batching, timeouts |
| `test:sms-dlr` / `red:sms-dlr` | the receiver: auth, the exact reply body, unknown references, the msisdn cross-check, monotonicity, the no-guess rule |
| `test:otp-delivery` / `red:otp-delivery` | the login path: refusal before minting, await, consume-on-failure, the rate refund, locale, the wire-form msisdn |
| `test:dal-parity` §6 | both DAL backends map every `SmsMessage` field and enforce the same monotonic receipt rule |
| `test:invites` | a configured provider sends three invites in ONE request; a typo'd provider refuses honestly |
| `test:pii-logs` §4 | the message body never reaches a production log |
