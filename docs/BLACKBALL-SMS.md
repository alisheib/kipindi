# Blackball SMS Gateway — integration digest

Account: **OCEAN ENTERTAINMENT LTD** (`ali.sheib@50pick.tz`) · portal `https://blackballgw.co.tz`
Endpoints: `POST /api/sms/send` · `POST /api/account/balance` (Swagger: `bulk-api-rest-controller`)
Wired: 2026-09-16. Code: `src/lib/server/sms-blackball.ts` (transport), `src/lib/server/sms.ts`
(facade), `src/app/api/webhooks/blackball/route.ts` (delivery receipts).

## Status — 2026-09-23 · ✅ **DONE — the integration is CLOSED**

> **Ali, 2026-09-23: *"it's fine till here, I think we are good, push this as done; we will later implement
> a campaign for SMS sending."*** The rail is complete and proven end to end (§4.8): the platform sends,
> the handset receives, the receipt comes back by itself and settles the real row. Nothing here is left
> half-built, and no further work is planned in this file.
>
> ▶ **Bulk/marketing sending is a SEPARATE programme, in build:**
> [`MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`](MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md) — the contacts
> book and the campaign engine. Where it stands lives only in its §0 and §1, so no count is restated
> here. No Gaming Board approval is needed (Ali, 2026-09-26 — the Board says marketing SMS is not part of
> its approval); what gates a marketing send is the consent, suppression, opt-out, responsible-gambling and
> age check Phase A built, asked per recipient before anything goes out.
>
> **Left with the vendor, none of it blocking:** the three whitelisted sender-ID strings with TCRA
> confirmation, the interval between their 5 retries, and the `CODE` values that accompany failure
> tokens (only `DELIVRD` has ever arrived); since 2026-09-26 also where they store message data (the
> Privacy notice says "in Tanzania") and whether the account has an inbound number (§8). **Owner item:** the webhook secret travelled through chat and
> WhatsApp while this was being fixed — rotate it when convenient (new value in Railway, new URL to them,
> one test send to confirm).


| | |
|---|---|
| Code | ✅ live on `main` |
| Railway | ✅ **`SMS_PROVIDER=blackball`**, `BLACKBALL_CLIENT_ID`, `BLACKBALL_CLIENT_SECRET`, `BLACKBALL_WEBHOOK_SECRET`, `SMS_SENDER_ID=50pick` — verified: `/api/health` → `provider: blackball, configured: true, webhookSecretSet: true`; boot log prints no `[sms]` warning |
| Cloudflare | ✅ Configuration Rule: Browser Integrity Check **off for `/api/webhooks/*` only** (§4) — verified |
| API configuration | ✅ `50pick-production` saved in the portal, status callback registered |
| Sender ID | ✅ `50pick` |
| Live sends | ✅ **one from PRODUCTION itself, 2026-09-23 — the end-to-end proof (§4.8)** · ✅ step 1 DELIVRD / Success in 2 s (received on the handset); ✅ step 2 batch of two accepted in one request, TZS 12; ✅ step 3 (2026-09-17 09:30 UTC) one good + one unroutable msisdn **accepted whole** ("Successfully submitted 2 message(s)"), TZS 6 charged; ✅ step 4 five times (2026-09-21 08:58 and 13:58, 2026-09-22 06:55, 08:28 and 09:12 UTC) — **10 of 10** drive sends used; the ceiling went 6 → 7 → 8 → 9 → 10 on Ali's instructions to validate the vendor's successive claims (`TOTAL_SEND_CEILING` in `scripts/live/blackball-drive.mts`). ⭐ Ali confirms the handset RECEIVES every one of them |
| Delivery callback | ✅ **WORKING, PROVEN END TO END 2026-09-23** — a production-issued OTP was DELIVERED and its receipt settled the real row in **11 seconds** (`applied: 1`), after the vendor's first automatic batch at 03:46 (§4.7, §4.8) |
| Phone-code login | ⏸ `OTP_ENABLED` unset — deliberately (§7, step 6) |
| Balance | ⛔ Not recorded here — every delivered SMS costs TZS 6 (§5), so any figure in this file is wrong after the next send. Read it live on **Admin → System → the "SMS credit" tile**, which asks Blackball on each visit (free, sends nothing, reused for a minute): the headline is the credit in TZS; "—" with *"Couldn't read the balance — …"* means the read failed (the sentence under the figure says why), and "—" with *"Last read … · was TZS … · couldn't refresh — …"* means the last figure is too old to trust — never that the account is empty (§5). Or use the portal, or `POST /api/account/balance` (§1.4). *(This cell said "TZS 196"; removed 2026-09-25.)* |

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
(`refreshSmsBalance`, the one read) whenever a send meets a missing or stale reading, before it refuses
on a below-floor reading older than a minute, and on every Admin → System render and `/api/health` call.
Recording a refusal's `0.0` would store TZS 0, trip the cost floor, and hold every campaign — held before
any request, so nothing could ever refresh it. That latch existed and is guarded by `test:sms-cost-guard` §2.
⭐ Because the endpoint is free and authenticated, it is the platform's one live **credential check**, so
a failed read says which failure it was (2026-09-26, narrowed 2026-09-27): `refused` — the vendor turned our
CREDENTIALS down, which is only a `status: false` reply with HTTP 400, 401 or 403 (the measured
bad-credentials reply above is a 400); `unreachable` — no answer, our timeout, a rate limit (429) or the
vendor's own 5xx; `unexpected` — any other reply (a moved endpoint's 404 page, a 200 whose balance cannot be
read), which says nothing about the keys; `not-configured` — the keys are not set on this box. Wrong keys and
an outage no longer look the same, and a reply we cannot read is no longer called wrong keys.
⛔ **A late reading never overwrites a newer one** (2026-09-27). Every reading is stamped with when it was
ASKED, not when it landed, and a reading that lands after a newer one is dropped — otherwise a slow balance
read could undo a send reply recorded meanwhile, re-arm the alarm or hide a top-up.

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

**Observed:** `DELIVRD` / `Success` — first in the portal's Out SMS, and since 2026-09-23 **in real
callbacks** (§4.7), which also settles that their example's `DELIVERD` spelling was a typo in the email
and not what the gateway sends.

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
real callback ever carries `DELIVERD` the evidence lands and the fix is one line. ✅ Both contradictions
were settled by the rail itself on 2026-09-23 (§4.7): real callbacks spell the token `DELIVRD` and echo
OUR `sms_…` reference.

The portal's Out SMS **CSV export** for that message (supplied by Ali, 2026-09-16):

```csv
"CODE","COUNT","CREATED","DELIVERED","MESSAGE","MSISDN","SENDER","STATUS","STATUSDESCRIPTION"
"0","1","2026-09-16 16:29:23","2026-09-16 16:29:25","50pick: test message from Ali (1). …","255772619619","50pick","DELIVRD","Success"
```

- `CODE` `0` alongside `DELIVRD` — the SMPP convention where 0 is "no error". Failure rows should
  carry a non-zero code; ask for the code list with the status list (§8).
- `COUNT` `1` is the **segment count** — the billed unit (TZS 6 × COUNT).
- ⚠️ **Neither the export nor the Out SMS screen shows our `reference`** (the screen's "Ref" column
  holds the API client id) — so the CALLBACK is the only place our reference comes back, and since
  2026-09-23 it does (§4.7). An unrecognised token returns `null`: the row keeps its
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

## 4 · The delivery callback — eleven days of silence, then ✅ proven on a real row (§4.7, §4.8)

> ⚠️ **Struck 2026-09-25 (marketing S6): this heading read "🔴 The delivery callback has never reached
> production".** That stopped being true on 2026-09-23 (§4.7, §4.8). §4.1–§4.6 are kept as the RECORD of
> how the fault was found; read them as history, not as the current state.

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

So the callback is not being attempted against our URL at all. *(The questions this pointed to were
answered by §4.6–§4.7 and have left §8.)*

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

### 4.6 🟢 2026-09-22 — the channel is PROVEN, and the fault is now one narrow thing

Asked to stop guessing and run the decisive free test, the vendor did:

| Their test | Result | What it proves |
|---|---|---|
| `curl GET` the callback URL, 10:09:40 UTC | `HTTP/2 200 {"status":"Ok"}`, `x-railway-request-id` present, `cf-ray … -NBO` | their server reaches the app through Cloudflare's Nairobi edge; ⛔ nothing of ours blocks them |
| `curl POST` with a token, 12:29:44 UTC | `HTTP/2 401 {"ok":false,"error":"unauthorized"}` | the POST **reached us**, and we recorded it: `webhook.blackball.rejected` at 12:29:44.034Z. Their token string is wrong — nothing else is |
| our own POST, same URL, one minute later | `200 {"status":"Ok"}` via `?token=` **and** via `x-blackball-token` | the secret in Railway is correct and both auth paths work |

⭐ **So three of the four unknowns are closed**: the network, the URL, and our authentication. ⛔ **The
fourth is untouched: the gateway has never once fired a receipt by itself.** Ten test messages, every one
delivered to the handset, not one automatic callback.

⛔ **THE ACCEPTANCE TEST, so "working" cannot be declared from a curl.** A receipt counts only when it
arrives with NOBODY TYPING ANYTHING: a real send, then within minutes a row carrying **our** `sms_…`
reference and a status token, settling that `SmsMessage`. A hand-run POST proves the channel; it says
nothing about the trigger. ⚠️ It also still has to answer the reference question (§3): their example
carried a 23-character id of their own, which would match no message we ever sent.

⚠️ **AND AN INSTRUMENT LIMIT FOUND WHILE CHECKING THEIR CURL.** `railway logs --http` is a TAIL, not a
history: measured today, 5,000 lines covered **fifteen minutes** (12:01 → 12:16), and `--json` returned
zero rows while the plain form returned thousands. ⛔ So the edge log can only be trusted LIVE, during a
watch — never to prove that something did not arrive two hours ago. The durable instrument is the audit
chain: every POST carrying a receipt line writes `sms.dlr.received`, and every refused one writes
`webhook.blackball.rejected` — which is exactly how their 12:29:44 attempt was caught. (Only an authorised
EMPTY callback, and a repeat of a malformed one inside its dedupe window, write nothing — corrected
2026-09-25, this said "every POST … writes a row".)

### 4.7 ✅ 2026-09-23 — it fired, by itself, and the reference echoes

After the token was corrected (their POST answered `200 {"status":"Ok"}` at 2026-09-22 13:21:40 UTC,
recorded here as `sms.dlr.unknown_reference` for `sms_1e96dca904c66bc4154acfbb`), the gateway began
sending on its own. At **03:46:48 UTC** a single callback arrived carrying **three** status lines:

```
03:46:48.284Z  sms.dlr.unknown_reference  sms_7166e21d7213fee54a288e17  DELIVRD / Success
03:46:48.310Z  sms.dlr.unknown_reference  sms_cf102b4e4b31c69c7c7ac433  DELIVRD / Success
03:46:48.351Z  sms.dlr.unknown_reference  sms_1e96dca904c66bc4154acfbb  DELIVRD / Success
03:46:48.375Z  sms.dlr.received           {"lines":3, …, "unknownRef":3}
```

Nobody typed that, at 06:46 EAT, and it was the queued backlog of three earlier drive sends. It settles
three open questions at once:

1. ⭐ **The callback fires automatically** — the one thing eleven test messages had never produced.
2. ⭐ **It echoes OUR reference**, not an internal id. §3's warning about their 23-character example
   was right to be raised and is now answered: matching works.
3. ⭐ **The documented batch shape is real** — `{statuses:[…]}` with several lines in one POST, handled
   line by line exactly as the receiver was built to.

⚠️ **`applied: 0` is CORRECT here and must not be read as a failure.** The drive sends from a local
process and deliberately writes no production `SmsMessage` row (§ *Where the receipts go*), so every
reference is legitimately unknown to production and the receiver acks and audits it. At that point
the last link — a receipt moving a real production row to DELIVERED — was still unproven; it was proven
the same morning, below (§4.8).

### 4.8 ✅ 2026-09-23 — THE LAST LINK, PROVEN ON A REAL ROW

Everything before this proved the rail with messages sent from a laptop, which write no production row —
so every receipt landed as `unknownRef` with `applied: 0`. The one case never tested was the one the
product depends on: **a receipt settling a row production itself created.**

Production has exactly two senders and both were shut: invite campaigns refuse while the bonus is
withdrawn, and phone-code login is dormant behind `OTP_ENABLED`. ⭐ But that flag gates only the PAGE
(`src/app/auth/otp/page.tsx` — the single `redirect()` in the file); `requestLoginOtp` is not gated. So:
`OTP_ENABLED=1` for four minutes, the live page driven in a real browser (`HeadlessChrome` in the UA),
its **TUMA MSIMBO TENA** control pressed once — a genuine product path, not a script calling a library —
and the flag returned to `0` immediately after.

```
07:14:42.373Z  SmsMessage sms_de5d6f36fb0cf8a906542117  purpose=OTP   <- production wrote the row
07:14:43.770Z  sms.accepted   HTTP 200 - status=true - balance=196    <- the gateway took it
07:14:53.760Z  sms.dlr.received  {"lines":1,"applied":1,"unknownRef":0,"mismatch":0}
               row -> status=DELIVERED   dlr=DELIVRD / Success
```

**Eleven seconds, end to end**, on the first message production has ever sent. `applied: 1` with
`unknownRef: 0` and `mismatch: 0` is exactly the discriminator that was missing: the receipt carried OUR
reference, passed the msisdn cross-check, and moved a real row. ⭐ Every link is now proven: compose →
gateway → handset → receipt → row settled.

⚠️ **What this does NOT prove, and must not be read into it.** The `InviteEntry` fan-out arm; the
`SmsCampaignRecipient` arm (unbuilt — `MARKETING-CAMPAIGN-AND-CONTACTS-SETUP.md`); any token other than
`DELIVRD` (no `UNDELIV`/`REJECTD`/`EXPIRED` has ever arrived); and behaviour at campaign volume. ⛔ The
flag is back to `0` and phone-code login stays deliberately off (§7 step 6) — the four-minute window
existed only to create one real row. ⚠️ `curl` is not a reliable check on that page: it reported `200`
while a browser was being redirected to `/auth/login`, because the redirect is streamed. Check it with a
browser, not a status code.

⚠️ **Two facts about the instruments, still true, so an empty result is never over-read.** Railway keeps
HTTP logs only for the CURRENT deployment, so an empty log after a restart proves nothing about earlier
hours — the DB audit rows are the durable evidence. And a callback that reaches us with a wrong token
still WRITES a row (`webhook.blackball.rejected`), so "nothing at all" means the request was not made,
not that it was refused.

*(Removed 2026-09-25, marketing S6: two paragraphs written before the fix that sat under this proof as
if the callback still never fired — a "check Cloudflare Security → Events / Bots before any paid send"
action, and "the remaining fault is entirely inside their platform". Both were overtaken by §4.6–§4.8.)*

---

## 5 · Economics

- **TZS 6 per delivered SMS** (GSM7, one segment, Tigo Tz — portal Out SMS "Price" for the first send).
- The account opened with TZS 250 → **about 40 messages**. Production login traffic needs a top-up.
- UCS2 and long messages bill per segment (unconfirmed with the vendor — §8).
- ⚠️ **Billing is per DELIVERED message, not per accepted one** — the evidence is live step 3 (Status, above): one
  good number and one unroutable number were *"accepted whole"* and only TZS 6 was charged. One observation, so it is
  treated as the likelier model rather than a contract.

**The campaign estimate measures the price instead of hard-coding it (marketing U39, 2026-10-01).** A reply's
`balance` is pre-charge (§1.4), so the DIFFERENCE between two consecutive replies is the earlier chunk's charge —
when every message of that chunk was DELIVERED and nothing else was sent or delivered in between.
`measureSegmentCost` (`src/lib/marketing/segment-cost.ts`) walks exactly those pairs over the last 500 rows and 30
days, counts only bodies of ≤ 70 characters (one segment in either coding — `SmsMessage` stores no segment count),
voids top-ups and late charges, and takes the MEDIAN of at least 3 clean pairs. Fewer than that: the configured
`SMS_PRICE_PER_SEGMENT_TZS` (§6), captioned *"configured, not yet measured"*; neither: *"not yet measured"*, never
TZS 0. Every figure says "estimated". The portal stays the authority the walk is checked against (U52's capped
drive).

The cost floor holds `INVITE`/`OPS` traffic below `SMS_BALANCE_FLOOR_TZS` so the float is kept for
login codes. ⛔ **OTP is exempt, and never waits on a balance read**: refusing a login code to save
a few shillings is a self-inflicted outage. A reading is trusted only from an accepted reply or the
balance endpoint, expires after `SMS_BALANCE_TTL_MS`, and **unknown is never treated as low**. The
low-balance alarm is edge-triggered: at or below `SMS_BALANCE_ALERT_TZS` it writes one `sms.balance_low`
audit row AND, since 2026-09-26, reaches the officers — a bell notification linking to Admin → System and an
email (⛔ never an SMS: the rail that is running out is not the channel to warn on) — once per downward
crossing. Since 2026-09-27 a downward crossing of `SMS_BALANCE_FLOOR_TZS` is a crossing too, with its own
alarm (the *"paused … top up now"* copy), once per crossing: the usual drain 160 → 140 → 40 alarms twice, at
the alert line and at the floor, and a single jump over both lines is one alarm, with the floor's copy. The
`sms.balance_low` payload carries `level: "floor" | "alert"`, the line the reading is under.

**Who is alarmed (2026-09-27).** The officers who can OPEN the page the alarm links to, read from the live
grants (`rolesThatCanOpen` in `notification-service.ts`): the Owner always, plus any other staff role while
it holds a view grant on that page's domain (`ops` for Admin → System). The default grants give no other
role `ops`, so by default the SMS-credit alarm reaches the Owner only — and so do the Sentinel-down alarm
(also Admin → System) and the AI-spend alarm (Admin → AI usage), which use the same rule. ⛔ COMPLIANCE no
longer receives these three by default: it was being told to act and sent to a page that refused it. If the
grants cannot be read, the Owner alone.

**A restart does not swallow it, and does not repeat it.** The reading lives in the process, so the first
reading after every deploy has nothing to compare with. A first reading at or below the alert line alarms
at most once per low episode a day: a low episode opens with `sms.balance_low` and closes with a durable
`sms.balance_recovered` SYSTEM row, written when the balance climbs back over the alert line — or by the
first reading after a restart that finds an open episode already recovered. A restart that finds the
balance low stays silent only if the newest of those two rows is an `sms.balance_low` under 24 h old, and
even then it alarms if that row was taken above the floor and the balance is now below it (invites have
paused since). A duplicate beats silence: if the rows cannot be read, it alarms. The check reads only the
newest SYSTEM `sms.balance_low` / `sms.balance_recovered` row (limit 1), turns it into one alarm-or-close
decision and hands no row on, so `sms.ts` is registered as an audit reader outside the console —
`AUDIT_READERS_OUTSIDE_CONSOLE`, and `folded` in `AUDIT_ROW_PAYLOAD` (`test:house-bot-reports` 0.260.1,
2026-09-27).
*(Until 2026-09-26 the alarm was the audit row alone, which nothing read, under a code comment saying officers
were alarmed. Until 2026-09-27 it reached every ADMIN and COMPLIANCE officer, never fired at the floor, and a
restart stayed silent for ANY `sms.balance_low` under a day old — so a second low spell after a top-up, found
by a restart, was never announced.)*

**Where the operator reads it — Admin → System, the "SMS credit" tile** (2026-09-26; Swahili gloss
"Salio"). Each render asks the balance endpoint through `refreshSmsBalance` (free, authenticated, sends
nothing) and waits at most ~2.5 s — a slower read carries on and records itself when it lands; a reading
under a minute old is reused, concurrent visits share one request, and a failed read is not retried for
`SMS_BALANCE_RETRY_MS` (its reason is kept for that window too). The tile's value is the credit
(`TZS 185`), or "—" when there is no figure it can stand behind. `smsCreditTile`
(`src/app/admin/system/sms-credit-tile.ts`) fills four slots under it, one job each (final visual review,
2026-09-27):

1. **`provenance`** — `AdminKpi`'s optional `provenance` prop: its own line, `text-body-sm` (13px) in neutral
   `text-text-secondary`, the first prose line under the value (after the one-word italic Swahili gloss). It
   holds the exact figure behind a compacted headline (*TZS 1,234,567*) and, for a figure this render could
   not confirm, when it was read and why it was not refreshed: *Last read 14:02 EAT · couldn't refresh —
   \<why\>*, or *Last read 14:02 EAT · still waiting for Blackball* while a read runs. On a dead rail (whose
   note already says why) it is just *Last read 14:02 EAT*, plus *· was TZS 185* under a dash. Absent when
   the figure is current and under TZS 1,000,000.
2. **`note`** — the state and the action only, as a **sentence**: `AdminKpi`'s optional `note`, drawn as
   prose at `text-body-sm` in the state's ink. It never says *last read*.
3. **`vars`** — the Railway variables a fix names, drawn by `AdminKpi`'s optional `noteCode` prop:
   `BLACKBALL_CLIENT_ID` and `BLACKBALL_CLIENT_SECRET`, one per `font-mono text-body-sm` line, breaking only
   after an underscore (`<wbr>`, ⛔ never U+200B — a copied name would carry it into the Railway search).
4. **The chip** — one plain fact: *0 sent since server start*, or *1,234 sent, 1 failed since server start*
   (the counters live on `globalThis`, so any restart zeroes them — hence "server start", never "deploy").
   No provider, no delivery rate and no inner separator; the only dot is `AdminKpi`'s own leading *·*.

No pulse and no arrow: the words and the colour carry it. The tile is built from the balance read, the
process's send counters and `smsRailProblem()` in `sms.ts` — why no SMS can leave this box, or null;
`smsConfigured()` is exactly `smsRailProblem() === null`, so the two cannot disagree.

⛔ **"Healthy" is said only when SMS can actually go out** (2026-09-27): the balance read needs only the keys,
so a box with no sender ID answered a balance and was captioned "Healthy" while every send was refused.

| State | Value | Provenance (its own line) | The sentence (`note`) | Colour |
|---|---|---|---|---|
| healthy | `TZS 185` | — | *Healthy · alert at TZS 150* — only when the figure is confirmed, the rail can send, the balance is above the alert line and sends are not failing | normal |
| sends failing (a failure since server start and under 90 % delivered) | the figure | — (or *Last read …* when unconfirmed) | *Sends failing — 3 of 12 failed since server start · check Blackball*; when nothing was accepted, *… · none accepted, login codes included · check Blackball* | warning; danger when none was accepted |
| no SMS can send | the figure, or "—" | *Last read 14:02 EAT* when the figure was not confirmed | *\<why\> · no SMS can send, login codes included · \<fix\>*: *Sender ID missing or too long … check SMS_SENDER_ID on Railway* · *Blackball keys not set … set both keys on Railway* · *SMS provider not recognised … set SMS_PROVIDER to blackball on Railway* · *The console stub is selected and sends nothing … set SMS_PROVIDER to blackball on Railway* (production only) · *Blackball refused our keys … check both keys on Railway* (a `refused` read). The two key fixes add `BLACKBALL_CLIENT_ID` and `BLACKBALL_CLIENT_SECRET` under the sentence (`vars`) | danger |
| at or below the alert line | `TZS 120` | — | *Low — top up Blackball soon · invites pause below TZS 50* | warning |
| below the floor | `TZS 30` | — | *Below the TZS 50 floor — invites paused, login codes still send · top up Blackball now* | danger |
| no reading, the read failed | "—" | — | *Couldn't read the balance — no answer from Blackball* (`unreachable`) or *Couldn't read the balance — Blackball sent a reply we couldn't read* (`unexpected`); ⛔ it makes no claim about the amount (the old *· not zero* is gone) | warning |
| no reading yet, the read still running | "—" | — | *Checking with Blackball… · reload in a few seconds* (the 2.5 s budget ran out; the read carries on and records itself) | normal |
| no balance endpoint (the dev console) | "—" | — | *No balance read on Console (dev)* | normal |
| a figure older than `SMS_BALANCE_TTL_MS` (the floor treats it as unknown) | "—" | *Last read 14:02 EAT · couldn't refresh — \<why\>*, or *· still waiting for Blackball* while a read runs; on a dead rail *Last read 14:02 EAT · was TZS 185* | *Was TZS 185* · *Was TZS 120, low · top up soon* · *Was TZS 30, below floor · invites are sending again · top up now* (the *sending again* clause is left out while a read is still running); a dead rail's sentence instead. ⛔ Never *paused*: the floor is not refusing on an unknown figure | ⚠️ **danger below the floor** (since 2026-09-27: invites are sending again on the credit login codes need) or on a dead rail; warning when low; otherwise warning, or normal while a read is still running |
| a figure inside the TTL that this render could not confirm | the figure | *Last read 14:02 EAT · couldn't refresh — \<why\>*, or *· still waiting for Blackball* | the Low / Below-floor / Sends-failing words when they apply; otherwise none — ⛔ never *Healthy*, the provenance line alone carries the state | per level |
| TZS 1,000,000 or more | *TZS 1.2M* (compacted, so it never clips in a 2-up tile at 360) | *TZS 1,234,567* — the exact figure, then *· last read …* when unconfirmed | as the level says | per level |

Several states join into one sentence (*Low — … · Sends failing — …*); when and how the figure was read is
never part of it — that is the provenance line. The reason a read failed survives a first reading: a figure
the tile still holds says why it could not be refreshed. A credit of TZS 1,000,000 or more is compacted in
the headline (*TZS 1.2M*, so it never clips in a 2-up tile at 360) and the exact figure is the provenance
line under it (*TZS 1,234,567*), no longer the start of the chip. (Until the final visual review of
2026-09-27 the chip read "Blackball · idle since restart" / "Blackball · 98.0% ok · 49 sent, 1 failed since
restart", an unconfirmed figure added "· last read 14:02 EAT" to the end of the sentence, the key fixes said
"BLACKBALL_CLIENT_ID / SECRET" — no variable is called SECRET — and a stale figure below the floor was
warning, "never danger". That last rule is superseded: an expired reading is unknown, so invites are
sending again on the credit login codes need.)

A reading from another EAT day carries its date (*25 Sep 14:02 EAT*). The clock is the same on every
Node/ICU build: the Dar es Salaam wall clock is read from `Intl` NUMERIC parts only (`Africa/Dar_es_Salaam`,
`hourCycle: "h23"`, midnight is *00:00*), the month comes from a fixed Jan…Dec list, and the same-day test
compares the year too. *(A newer ICU spelt September "Sept" and turned `test:sms-cost-guard` §9 red on one
machine.)* Amounts, counts (*N sent*, *N failed*, *3 of 12 failed*) and the time never break inside, and a
*·* separator stays with the fact after it, so no line ends on a dot at 360.
⚠️ **How many lines the longest states take at 360 is not recorded here, because it has not been measured
on this tile.** The candidates are a below-floor figure that could not be refreshed, keys refused after a
reading (the sentence plus two mono key-name lines), and a stale below-floor figure; the provenance line and
the key names left the sentence, but they are lines of their own, so the whole tile may not be shorter.
Measure the whole tile from 1280 and 360 captures before quoting a number. *(This paragraph said "about four
lines at 360" of the old caption; earlier captures contradicted it, and the sentence has moved out of the
chip since.)*

`/api/health` refreshes the same reading with a ~1 s budget (a deploy gate waits on that route; a reading
under a minute old is reused) and publishes `sms.balanceTzs`, `balanceAt` (ISO) and `balanceStale` beside
`balanceBelowFloor`, so a figure is never shown without its time — and a stale low figure reads
`balanceBelowFloor: false`, because stale is unknown, never low. `sendBatch` goes through the same function (no
second copy): a missing or stale reading is re-read before the floor decides, and a below-floor reading older
than a minute is re-read before the batch is refused — a top-up is honoured within about a minute, not after
the 15-minute TTL.

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
| `SMS_BALANCE_RETRY_MS` | default 30000 — after a failed balance read, no new read is attempted for this long (a dead endpoint is not hammered by page renders or `/api/health`) |
| *(not variables)* | the read's waits are code constants in `sms.ts`: `SMS_BALANCE_RENDER_BUDGET_MS` 2500 (Admin → System) and `SMS_BALANCE_HEALTH_BUDGET_MS` 1000 (`/api/health`); a reading older than 60 s is re-read before the floor refuses on it; a restart that finds the balance already low alarms at most once per low episode in 24 h (§5) |
| `SMS_PRICE_PER_SEGMENT_TZS` | **optional, unset by default** (owner gate G9 — it puts a money figure in front of officers). A positive number is the campaign estimate's price per segment *until* the walk has ≥ 3 clean delivered pairs (§5), shown as *"configured, not yet measured"*; unset, the cost reads *"not yet measured"* and no TZS total is shown. Read by `src/lib/server/marketing/estimate.ts` only |
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
4. ✅ **Cloudflare: Browser Integrity Check off for `/api/webhooks/*`** (§4.1), and a real receipt has
   landed — 2026-09-23, settling a production row (§4.8).
5. ✅ **Railway: credentials, `SMS_SENDER_ID=50pick`, `SMS_PROVIDER=blackball`.** Safe before step 4:
   measured 2026-09-16, production has **zero** phone invite entries, `bonus` is `WITHDRAWN` with no
   `FEATURE_BONUS` override (so `sendCampaign` refuses before SMS), and `OTP_ENABLED` is unset — both
   send paths are shut, so the switch made the rail *configured* without sending anything.
6. ⏸ **Phone-code login.** Deliberately NOT enabled (decided 2026-09-16), for two reasons:
   - ⛔ **`OTP_ENABLED=1` alone changes nothing for a player.** The login and registration forms are
     wired only to `startLoginAction` / `startRegisterAction` (password); nothing links or redirects
     into `/auth/otp` except the unwired OTP actions themselves. Flipping it would only expose an
     orphan page — an unlinked way to trigger paid sends, for no player benefit.
   - Of the preconditions below, the receipt is met (§4.8); the balance is not — it covers only a few
     dozen messages (read it live on Admin → System's "SMS credit" tile, §5; never trust a figure written
     here). `/api/health` refreshes the same reading with a short budget and shows `balanceAt` beside it.

   **Offering phone-code login is a product change, not a variable:** a "send me a code" option on
   `/auth/login` (and register), inside the frozen design system, in EN + SW + ZH, with the visual
   and live drives that surface requires. Then `OTP_ENABLED=1`.

### Preconditions for step 6 — measured, none assumed

- `/api/health` → `sms.configured: true`, `webhookSecretSet: true`; and Admin → System's "SMS credit" tile
  shows a credit comfortably above the alert line, read today (no "Last read … couldn't refresh").
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

**Answered by the rail itself, 2026-09-23 (§4.7–§4.8):** the callback is enabled and fires on its own
(the fault was the missing `?token=` on the URL they had saved, §4.5–§4.6) · it echoes OUR `sms_…`
reference · a backlog arrives as ONE batched POST · the status token is spelled `DELIVRD`.
*(Removed 2026-09-25, marketing S6: items 1, 2 and the spelling half of 4 still asked whether the
callback was enabled and claimed "no callback POST ever reached us" two days after one had.)*

**Still open (none of it blocking):**

1. The `CODE` value that accompanies each failure token (only `DELIVRD` / `CODE 0` has ever arrived).
2. Billing per **segment** for UCS2 (70 chars) and long GSM7 messages — the portal's `COUNT` column is
   the segment count, but the vendor has not confirmed the price per segment.
3. Must `reference` be **unique forever** on the account; what does a duplicate do?
4. Any **rate limit** on `/api/sms/send`.
5. The **exact strings of the three whitelisted sender IDs**, confirmation they are **TCRA-registered**, and
   whether they are case-sensitive.
6. The **interval** between the 5 callback retries.
7. **Where Blackball stores and processes message data** (numbers and texts). Privacy v2026-09-26 §4 names
   Blackball as "our SMS gateway in Tanzania"; if they store or process it elsewhere, the notice needs a new
   version (`COMPLIANCE-DECISIONS.md` § "2026-09-26 · Privacy v2026-09-26").
8. Whether the account has an **inbound number** for replies, and its payload — until one exists, a reply of
   STOP / ACHA to any SMS reaches nothing (marketing plan §4a OQ8, U46).

Answered already: sender ID, price, success body, `coding` values, balance endpoint.

---

## 9 · Tools and guards

| | |
|---|---|
| `npm run live:blackball` | the live drive — one hard-coded number, a send ledger capped by `TOTAL_SEND_CEILING` (spent; raising it is Ali's call), balance read before and after, raw reply captured |
| `node scripts/live/ops/sms-receipts.cjs [ref]` | read-only: SMS and receipt audit rows on production, cross-checked against `/api/health` |
| `test:blackball` / `red:blackball` | the transport: HTTP-400 trap, `data` shapes, sender cap, reference floor, batching, timeouts, `coding`, balance endpoint |
| `test:sms-dlr` / `red:sms-dlr` | the receiver: auth, exact reply body, unknown references, msisdn cross-check, monotonicity, no-guess rule, the observed DELIVRD receipt, no empty-callback audit |
| `test:otp-delivery` / `red:otp-delivery` | the login path: refusal before minting, await, consume-on-failure, rate refund, locale, wire-form msisdn, UNKNOWN on a lost reply |
| `test:sms-cost-guard` / `red:sms-cost-guard` | the floor: OTP exemption, the refusal-balance latch, staleness, balance-endpoint refresh, edge-triggered alarm; since 2026-09-26 also the live read (budget, one read in flight, the pause after a failure and why it failed, the low-reading re-check before a refusal), `/api/health`'s refresh, the officers' alarm (bell + email, the restart alarm), and the Admin → System "SMS credit" tile's states; since 2026-09-27 also the floor crossing, the low episode (`sms.balance_recovered`) across a restart, who the alarm reaches (a COMPLIANCE officer gets none by default), the late-reading guard, the `refused` / `unreachable` / `unexpected` verdicts, `smsRailProblem` agreeing with `smsConfigured`, and the tile's no-SMS-can-send, sends-failing and seven-figure states; and since the final visual review
(2026-09-27) the provenance line under the figure, both real key names drawn whole (`<wbr>` after an
underscore only), "Healthy · alert at …", the chip's one fact "since server start", a stale figure below the
floor in danger, and the EAT clock's fixed month list (midnight and all twelve months asserted); the new red
plants in `scripts/anchors/sms-cost-guard.anchors.mjs` cover each rule, the shell's `<wbr>` and the page's
props (re-derive the count from a run). ✅ In `predeploy` since 2026-09-26 (after `test:pii-logs`), and its §8 asserts it stays there |
| `test:dal-parity` §13 | both DAL backends map every `SmsMessage` field and enforce the same monotonic receipt rule |
| `test:invites` | a configured provider sends three invites in ONE request; a typo'd provider refuses honestly |
| `test:pii-logs` §4 | the message body never reaches a production log |
