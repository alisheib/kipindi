# Blackball SMS Gateway — integration digest

Account: **OCEAN ENTERTAINMENT LTD** (`ali.sheib@50pick.tz`) · portal `https://blackballgw.co.tz`
Endpoints: `POST /api/sms/send` · `POST /api/account/balance` (Swagger: `bulk-api-rest-controller`)
Wired: 2026-09-16. Code: `src/lib/server/sms-blackball.ts` (transport), `src/lib/server/sms.ts`
(facade), `src/app/api/webhooks/blackball/route.ts` (delivery receipts).

## Status — 2026-09-22

| | |
|---|---|
| Code | ✅ live on `main` |
| Railway | ✅ **`SMS_PROVIDER=blackball`**, `BLACKBALL_CLIENT_ID`, `BLACKBALL_CLIENT_SECRET`, `BLACKBALL_WEBHOOK_SECRET`, `SMS_SENDER_ID=50pick` — verified: `/api/health` → `provider: blackball, configured: true, webhookSecretSet: true`; boot log prints no `[sms]` warning |
| Cloudflare | ✅ Configuration Rule: Browser Integrity Check **off for `/api/webhooks/*` only** (§4) — verified |
| API configuration | ✅ `50pick-production` saved in the portal, status callback registered |
| Sender ID | ✅ `50pick` |
| Live sends | ✅ step 1 DELIVRD / Success in 2 s (received on the handset); ✅ step 2 batch of two accepted in one request, TZS 12; ✅ step 3 (2026-09-17 09:30 UTC) one good + one unroutable msisdn **accepted whole** ("Successfully submitted 2 message(s)"), TZS 6 charged; ✅ step 4 four times (2026-09-21 08:58 and 13:58, 2026-09-22 06:55 and 08:28 UTC) — **9 of 9** sends used; the ceiling went 6 → 7 → 8 on Ali's instructions to validate the vendor's successive claims. ⭐ Ali confirms the handset RECEIVES every one of them |
| Delivery callback | 🔴 **still not received** — re-tested 2026-09-17, twice on 2026-09-21 **after the vendor said our URLs were whitelisted**, and again 2026-09-22 **after they said they had changed the callback**: still not one POST (§4.3–§4.5) |
| Phone-code login | ⏸ `OTP_ENABLED` unset — deliberately (§7, step 6) |
| Balance | TZS 196 |

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

**Observed:** `DELIVRD` / `Success` (first live send, portal Out SMS).

**The vendor's official list** (their developer, by email, 2026-09-17) — every token already maps, checked
by running each through the real `mapDlrStatus()`:

| Token | Their meaning | `mapDlrStatus()` |
|---|---|---|
| `DELIVRD` | SMS delivered | `DELIVERED` |
| `UNDELIV` | failed to deliver after several attempts | `FAILED` |
| `REJECTD` | could not be delivered (number format not recognised, not enough balance) | `FAILED` |
| `SENT` | received by the network, waiting to deliver | `null` — the row stays `ACCEPTED` (correct: not yet a verdict) |
| `EXPIRED` | failed to deliver after several attempts | `FAILED` |
| `FAILED` | the network failed to deliver (e.g. sender ID not whitelisted) | `FAILED` |

⚠️ **Their own example payload contradicts the list twice.** It spells the status `DELIVERD` (which maps to
`null`, so a delivered message would stay "handed over"), and its `reference` is
`6aabaaa7c5aea109abee145` — 23 hex characters, a shape we never send (ours are `sms_` + 24 hex). Neither
is coded around: an unrecognised token is stored raw and audited as `sms.dlr.unmapped_status`, so if a
real callback carries `DELIVERD` the evidence lands and the fix is one line — but the spelling and the
reference echo are asked back (§8) rather than guessed.

The portal's Out SMS **CSV export** for that message (supplied by Ali, 2026-09-16):

```csv
"CODE","COUNT","CREATED","DELIVERED","MESSAGE","MSISDN","SENDER","STATUS","STATUSDESCRIPTION"
"0","1","2026-09-16 16:29:23","2026-09-16 16:29:25","50pick: test message from Ali (1). …","255772619619","50pick","DELIVRD","Success"
```

- `CODE` `0` alongside `DELIVRD` — the SMPP convention where 0 is "no error". Failure rows should
  carry a non-zero code; ask for the code list with the status list (§8).
- `COUNT` `1` is the **segment count** — the billed unit (TZS 6 × COUNT).
- ⚠️ **Neither the export nor the Out SMS screen shows our `reference`** (the screen's "Ref" column
  holds the API client id). So it is still unproven that the callback's `reference` echoes the one we
  sent. The first genuine receipt settles it: `sms-receipts.cjs` prints the reference it carried, and
  the `sms_95f851757b62d3a8ea5a5865` of the first send is the value to look for. An unrecognised token returns `null`: the row keeps its
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

## 4 · 🔴 The delivery callback has never reached production

### 4.1 Cloudflare was blocking Java 8 callers — fixed

Measured 2026-09-16: `www.50pick.tz` answered any User-Agent `Java/1.8…`, `Java/1.7…` or
`Java/1.6…` with **`403`, error `1010`**, zone-wide (the payment and Postmark webhooks too), before
the request reached the app. The zone's settings identify the source: **Browser Integrity Check on**;
Bot Fight Mode off; no user-agent block rules; no custom rulesets.

**Fixed 2026-09-16** via the Cloudflare API — ruleset `http_config_settings` (id
`80668a8a2a944a51a320e635df2d6459`), rule `c4b128509d2d4633bd70e40155bd01c5`:
`starts_with(http.request.uri.path, "/api/webhooks/")` → `set_config { bic: false }`. Verified:

| User-Agent | webhook, no token | webhook, token | `/api/health` | `/api/webhooks/payments` |
|---|---|---|---|---|
| `Java/1.8.0_292` | **401** (was 403) | **200** | 403 — still protected | **400** (was 403) |
| `curl`, Java 17 | 401 | 200 | 405 | 400 |

### 4.2 …and still no callback

After the fix, drive step 2 sent two more messages (14:30 UTC). **No POST from Blackball reached the
app** — Railway's HTTP log for the deployment shows exactly one request to the callback path:
`GET /api/webhooks/blackball` at 14:42 UTC from **154.74.190.103** (Tanzania), a Firefox browser —
very plausibly Blackball opening the URL while whitelisting it. The POST-only route answered **405**,
which reads as "broken". So the remaining cause is on Blackball's side (callback not enabled or not
yet whitelisted, or failing on their end) — or it was their GET check that failed.

Hardened in response (`route.ts`, guarded by `test:sms-dlr` §11 and `red:sms-dlr`):
- **GET answers `200 {"status":"Ok"}`** and does nothing else, so a reachability check passes.
- A receipt shaped as a **single status object** or a **bare array** is accepted, not silently dropped.
- A **non-JSON or unrecognised body is audited** as `sms.dlr.malformed` (shape only: reason,
  content-type, byte count, key names — never values), so a vendor-side mismatch leaves evidence.

⚠️ **How to look for a callback.** Railway keeps HTTP logs only for the CURRENT deployment — a replaced
deployment returns nothing, which reads like "no traffic". Use both:

```bash
railway logs --http --json --lines 2000 | grep webhooks            # every request that reached the app
node scripts/live/ops/sms-receipts.cjs                            # what the receiver recorded
```

### 4.3 Re-tested 2026-09-17, with the vendor engaged — still nothing

Drive step 3 sent `sms_20c944fc48d687f677f532de` (to the test handset) and `sms_5a569ad82c0fde765135d8d2`
(to the unroutable `25577`) at **09:30:18 UTC**. Then, measured:

- **Our side is open.** `GET /api/webhooks/blackball` answered `200 {"status":"Ok"}` to `Java/1.8.0_292`,
  `Apache-HttpClient/4.5.13 (Java/11)`, `okhttp/4.9.0` and `python-requests/2.31` at 09:32 UTC.
- **The log is recording.** Those four probes appear in Railway's HTTP log for the current deployment —
  so an empty result is not a logging gap.
- **Blackball sent nothing.** No request of any method to the callback path from any other client, and
  no receipt row on production, across 18 polls over the following 6 minutes — although earlier messages
  were delivered in 2 seconds and the vendor says it retries 5 times.

So the callback is not being attempted against our URL at all. The questions in §8 item 1 are the ones
that decide it.

### 4.4 Re-tested 2026-09-21, after "we whitelisted the URL" — still nothing

Drive step 4 sent `sms_4a498529270c75bf43564b77` to the test handset at **08:58:17 UTC** (6 of 6 sends
used; balance TZS 226 → 220). For the next **9 minutes** the edge log carried **no request to the callback
path from any address except this machine**, and production recorded no receipt row. Whitelisting the URL
changed nothing that is observable here.

⛔ **THE TRAP, WALKED INTO AND CAUGHT — A PROBE OF YOUR OWN LOOKS EXACTLY LIKE THE VENDOR'S CALL.** A
`webhook.blackball.rejected {"reason":"bad-secret"}` row landed 94 seconds after the send and read as
"they are calling us at last, with the wrong token" — a complete, plausible story. It was **our own**
`curl -X POST` reachability check: the edge log named `srcIp 178.135.120.103` with
`clientUa Java/1.8.0_292`, this machine, one second after our own `GET`. The watcher had been told to
stop at the first new row, so it stopped on ours and reported success.
⭐ **The rule this earns:** when the instrument and the subject can produce the same row, the check must
carry a DISCRIMINATOR — here `srcIp` — and the watch must exclude the operator's own address before it
is allowed to conclude anything. ⛔ And never probe the endpoint while a callback watch is running.

**Re-run clean the same afternoon, on the vendor's second claim** (*"the URLs you sent us are
whitelisted"*): `sms_a4ef3c7a941cc4c5af0aadd5` at **13:58:24 UTC**, then a 10-minute watch that made no
request of its own and discarded this machine's address. **No audit row, no request from any other
address.** Between the two sends, three hours apart, not one retry arrived either — although the vendor
states the callback retries 5 times.

### 4.5 Re-tested 2026-09-22, after "we changed things" — the fault is now isolated

`sms_7166e21d7213fee54a288e17` at **06:55:36 UTC**; watched for POSTs only, excluding this machine.
**No POST, no receipt row**, and no retry for either of the previous day's two references.

Three facts now bound the problem from both sides, and together they say where it is NOT:

1. ⭐ **The messages arrive.** Ali confirms the handset receives every test SMS. Sending, the approved
   sender ID and the vendor's routing all work; only the receipt is missing.
2. ⭐ **Their side can reach us, by hand.** At 06:43–06:44 UTC — twelve minutes BEFORE the send —
   the edge log recorded `GET` from a Mac Chrome browser and two `HEAD`s from Skype's link-preview
   bot (`52.112.103.x`, `52.123.138.x`), all answered **200**. Someone opened our callback URL and
   pasted it into a chat. So the address is right, the network path works, and nothing of ours refuses
   them. ⚠️ It is also NOT a receipt: a person opening a URL is not the gateway posting to it, and
   this is the third shape of traffic in this file that could be mistaken for the vendor's callback
   (after our own probe, §4.4, and the Tanzanian browser GET of 2026-09-16, §4.2).
3. 🔴 **No POST has ever been made.** A POST with a wrong token would still be recorded
   (`webhook.blackball.rejected`). Silence means the call is not attempted.

🔴 **THE VENDOR'S OWN SCREENSHOT, 2026-09-22 — THE SAVED URL HAS NO TOKEN.** Their NOC wrote, in a Skype
chat Ali forwarded: *"https://www.50pick.tz/ this is whitelisted, so DLR are sent to
https://www.50pick.tz/api/webhooks/blackball"* — the BARE path. Ours ends `?token=…`, and `authorized()`
refuses anything else with 401. So their configuration was wrong independently of whether the callback
fires. ⭐ It also explains the browser and Skype-preview fetches in the edge log (§4.5 item 2): those
were their staff pasting and opening the URL, not receipts. They were given the full tokened URL, plus
the `x-blackball-token` header alternative for a platform that cannot store a query string.

⚠️ **AND IT DOES NOT EXPLAIN THE SILENCE.** A POST to the bare path would be recorded as
`webhook.blackball.rejected` — our own probe proves that arm works. We have none. A fifth send,
`sms_1e96dca904c66bc4154acfbb` at **09:12:39 UTC**, the first AFTER they were given the tokened URL and
said it was fixed: no POST, no row. Five claims, five identical outcomes.

**A fourth send, `sms_cf102b4e4b31c69c7c7ac433` at 08:28:19 UTC**, on their next *"we changed it, retry
now"*: same watch, same result — no POST, no row. Four claimed fixes in two days, four identical
outcomes, and nothing arrived in between either.

⛔ **STOP PAYING TO RE-TEST A CLAIM THAT HAS NOT CHANGED THE EVIDENCE.** Each send is TZS 6 of the float
that belongs to login codes, and a send only tests OUR side of a fault we have already located on theirs.
The next test is worth its money only after the vendor reports something new and specific — a log line
from their attempt, or a receipt they have posted to the URL by hand. That manual POST is the cheap,
decisive discriminator: it separates "cannot reach us" from "never fires", and it costs nothing.

⚠️ **ONE INSTRUMENT IS STILL MISSING, AND IT IS THE LAST PLACE A BLOCK COULD HIDE.** Railway's HTTP log
sits BEHIND Cloudflare, so a request Cloudflare refuses never appears in it — identical, from here, to a
request never made. The BIC configuration rule (§4.1) covers only that one check; **Bot Fight Mode** is a
zone-level toggle that no rule can exempt and it targets exactly this kind of automated POST. ⛔ Before
any further paid send: read Cloudflare **Security → Events** filtered on `/api/webhooks/blackball`, and
check **Security → Bots**. Owner action — Cloudflare zone changes are Ali's to approve.

So the remaining fault is entirely inside their platform: the delivery callback is not being fired for
our account. What to ask for next is in §8 item 1 — and the cheapest decisive test is to have them post
one receipt to the URL by hand while we watch, which distinguishes "cannot reach us" from "never fires".

⚠️ **Two facts about the instruments, so an empty result is never over-read.** Railway keeps HTTP logs
only for the CURRENT deployment (this one had restarted 15 minutes earlier, so its log was empty of
history and proves nothing about earlier hours); the DB audit rows are the durable evidence and they
cover 48 hours. And a callback that reached us with a wrong token would still WRITE a row
(`webhook.blackball.rejected`) — so "nothing at all" means the request is not being made, not that it is
being refused.

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
| `OTP_ENABLED` | `1` un-hides `/auth/otp`; ⚠️ no login/register UI links to it yet (§7, step 6) |

Boot warns in production (fail-open) on: an unrecognised provider, a selected Blackball with no
credentials, a sender ID over the cap, an unusable DLR secret, and — loudest — `OTP_ENABLED=1`
while SMS cannot deliver.

---

## 7 · Go-live order

Each step is independently reversible, and none of the later ones is safe without the earlier.

1. ✅ **Code lands with `SMS_PROVIDER=console`.** Nothing changes for players.
2. ✅ **DLR secret in Railway; API configuration and callback URL saved in the portal.**
3. ✅ **Live drive step 1** — `npm run live:blackball -- --step 1 --confirm`. Delivered.
4. ◐ **Cloudflare: Browser Integrity Check off for `/api/webhooks/*`** ✅ (§4.1). A real receipt
   landing ⬜ — blocked on Blackball (§4.2, §8 item 1).
5. ✅ **Railway: credentials, `SMS_SENDER_ID=50pick`, `SMS_PROVIDER=blackball`.** Safe before step 4:
   measured 2026-09-16, production has **zero** phone invite entries, `bonus` is `WITHDRAWN` with no
   `FEATURE_BONUS` override (so `sendCampaign` refuses before SMS), and `OTP_ENABLED` is unset — both
   send paths are shut, so the switch made the rail *configured* without sending anything.
6. ⏸ **Phone-code login.** Deliberately NOT enabled (decided 2026-09-16), for two reasons:
   - ⛔ **`OTP_ENABLED=1` alone changes nothing for a player.** The login and registration forms are
     wired only to `startLoginAction` / `startRegisterAction` (password); nothing links or redirects
     into `/auth/otp` except the unwired OTP actions themselves. Flipping it would only expose an
     orphan page — an unlinked way to trigger paid sends, for no player benefit.
   - The preconditions below are not met: no genuine receipt has reached production, and TZS 232 is
     about 38 messages.

   **Offering phone-code login is a product change, not a variable:** a "send me a code" option on
   `/auth/login` (and register), inside the frozen design system, in EN + SW + ZH, with the visual
   and live drives that surface requires. Then `OTP_ENABLED=1`.

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

**Answered by their developer, 2026-09-17:** the status list (§3, with two contradictions in their own
example) · callbacks retry **5 times** on a non-200 · **three** sender IDs are whitelisted on the account
(the strings were not given) · no egress IPs ("you can whitelist URL") — we need none, the callback is
authenticated by its token · the send-success question was answered with a callback example instead; not
needed, the success body was measured (§1.3).

1. 🔴 **Is the status callback enabled for `50pick-production`, and has our URL been whitelisted?**
   Three messages were delivered and no callback POST ever reached us — even after the Cloudflare fix.
   Did their side log an attempt, and what response did it get? Was the 14:42 UTC GET from
   154.74.190.103 their check (it got 405; the URL now answers GET with 200)? Which User-Agent does the
   callback send? *(§4)*
2. Can they **resend** the callbacks for the three messages, and do callbacks **retry** on a non-200?
   Does the callback echo **our `reference`** (the portal's Ref column shows the client id instead)?
3. ~~Egress IP addresses~~ — not needed (answered 2026-09-17).
4. The status list is answered; still open: **`DELIVRD` or `DELIVERD`** in a real callback, and the
   `CODE` value that accompanies each failure token.
5. Billing per **segment** for UCS2 (70 chars) and long GSM7 messages.
6. Must `reference` be **unique forever** on the account; what does a duplicate do?
7. Any **rate limit** on `/api/sms/send`.
8. The **exact strings of the three whitelisted sender IDs**, confirmation they are **TCRA-registered**, and
   whether they are case-sensitive.
9. The **interval** between the 5 callback retries.

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
| `test:dal-parity` §13 | both DAL backends map every `SmsMessage` field and enforce the same monotonic receipt rule |
| `test:invites` | a configured provider sends three invites in ONE request; a typo'd provider refuses honestly |
| `test:pii-logs` §4 | the message body never reaches a production log |
