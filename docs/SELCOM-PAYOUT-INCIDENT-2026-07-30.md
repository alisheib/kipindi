# Selcom Wallet Cash-In (payout) failures — 50pick / vendor SW00212780

**Raised:** 30 July 2026, 00:30 EAT
**Merchant:** 50pick (Kipindi Ltd) — https://www.50pick.tz
**Selcom vendor ID:** `SW00212780`
**Environment:** PRODUCTION — `https://apigw.selcommobile.com/v1`
**Affected product:** Wallet Cash-In / disbursement (`/walletcashin/process`)
**NOT affected:** Checkout / collections — deposits are working normally and confirming.

---

> # ✅ CLOSED — 2026-07-31. Selcom fixed TIPS. Payouts work.
>
> **This whole document is now history.** Live state lives in
> [`SELCOM-PAYOUT-RAILS.md` § Current state — 2026-07-31](SELCOM-PAYOUT-RAILS.md).
>
> Selcom confirmed a TIPS outage on 30 July and asked us to retry. Two payouts then succeeded
> end to end — `wdr_95e5cddab0fbfcb3fdbf` and `wdr_009c1a7c3662aaabcf47`, TZS 1,970 each,
> `resultcode 000 "Selcom Qwikpay"`, both fast-settled with the player emailed. The cause was
> theirs throughout; **nothing in our code was ever wrong about routing.**
>
> **Two items from this incident are still open:** `wdr_11d8552cb75b420d4bc3` and
> `wdr_9d9e565e61ce8ec1c0d4` remain `999` after 42+ hours (§2, failure mode 2), holding TZS
> 15,000 of a customer's money and — because they are older than `UNAVAILABLE_AFTER_HOURS` —
> keeping the withdraw form shut for every other player. Only Selcom can close them.
>
> ⚠️ **A correction worth keeping.** On the morning of 07-31 this investigation's control test
> (a status query for a transid that has never existed, still answering `999` rather than
> "not found") was read as proof TIPS was still down. It was not proof — `999` on an unknown
> transid appears to be Selcom's normal answer. The *real* evidence was always the two genuine
> payouts stuck at `999`. **Lead with those; the control test is support at best.**
>
> 🔴 **One bug WAS ours, and only a working rail could reveal it:** `resultcode 013`, the
> gateway's TZS 1,000 floor on the NET. See `SELCOM-PAYOUT-RAILS.md` and `SELCOM-API-DIGEST.md`.

> ## 🔴 Superseded — cause confirmed 2026-07-30 10:48 EAT. THE FLOAT IS EMPTY.
>
> **History. Everything below it is the earlier investigation, kept for the record.**
>
> A live payout test (Jay, two attempts) got Selcom to say it in plain words:
>
> ```
> resultcode=990  result=FAIL
> message=Insufficient account balance to complete transaction
> transid=wdr_60674226420a68947cda   selcom-ref=1820851829   30 Jul 10:48:09 EAT
> ```
>
> **And it proved the `010` was a red herring.** Two BYTE-IDENTICAL requests, three minutes
> apart — same payee, amount, utilitycode, vendor — returned two different errors:
>
> | Time (EAT) | transid | Selcom ref | Answer |
> |---|---|---|---|
> | 10:45:28 | `wdr_80276dbc89e3b7fca535` | `S20656625527` | `010` "Invalid mobile number or operator not supported" |
> | 10:48:09 | `wdr_60674226420a68947cda` | `1820851829` | `990` "Insufficient account balance" |
>
> The first failed without debiting anything, so the float was equally empty at 10:45. The
> number is a valid Vodacom M-Pesa line and `VMCASHIN` is the right code. **Selcom reports a
> dry float as a bad phone number.** That single misleading string is what sent 2026-07-29
> chasing utility codes and MNO routing. Raised with Selcom; see §4.
>
> ### Deposits do not fund payouts — the point that was never written down
>
> Collections (money IN) and the disbursement float (money OUT) are **separate balances at
> Selcom**, which is why the credentials were issued for "Collections (Customer to Business)"
> and Wallet Cashin had to be provisioned separately. Player deposits accumulate on the
> collections side and settle on Selcom's cycle; **they do not flow into the payout float.**
> The float is prepaid and must be topped up. Nobody had asked how — the question was raised
> on 2026-07-27 in `SELCOM-DISBURSEMENT-ACTIVATION.md` §Phase 0 and never answered.
>
> ### What the test proved about our own code — all of it held
>
> ```
> payout ladder exhausted (wdr_80276…) — WALLET_CASHIN:FAILED → SELCOM_PESA:FAILED
> payout ladder exhausted (wdr_6067…)  — WALLET_CASHIN:FAILED → SELCOM_PESA:SKIPPED
> [email] "Withdrawal returned · TZS 5,000" → the player, twice
> ```
>
> · `010` and `990` both read as DEFINITIVE → the ladder advanced. Correct: refused at the
>   door, nothing in flight.
> · Attempt 1 tried Selcom Pesa and got `4035`; attempt 2 **SKIPPED** it — the probe cache had
>   learned it in between. The designed behaviour, observed live for the first time.
> · Ladder exhausted → clean reversal → **the player's money came back, both times**, with an
>   honest "Withdrawal returned" email. The same situation froze TZS 15,000 the day before
>   with no way to release it.
>
> ### Still open
>
> 1. 🔴 **Fund the float.** Nothing pays out until this is done. Blocked on Selcom answering
>    how to top it up (bank transfer? sweep from collections?).
> 2. The two payouts from 2026-07-29 are **still `999`** — 17+ hours. Only Selcom can close
>    them. Deliberately NOT reversed: `999` is not terminal and reversing could double-pay.
> 3. `SELCOM_PESA` and `HUDUMA_AGENT` still `4035`.
> 4. Withdrawals stay CLOSED to players. Not one payout has ever succeeded on this platform.
>
> Evidence: full request+response with headers, captured via `SELCOM_WIRE_LOG=payouts`
> (see [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § The wire capture). The capture
> file itself is deliberately **not committed** — it contains the `Authorization` header.

> ## Resolution status — updated 2026-07-30 00:30 EAT, after probing the live gateway
>
> The evidence pack below was written for Selcom and is unchanged. What we learned afterwards:
>
> 1. ~~🔴 **The disbursement float reads `TZS 0.00`.**~~ ⛔ **SUPERSEDED same day.** It did read zero
>    at 00:30, and that was genuinely a second blocker — but it was **not** the cause of the `010`.
>    The float was funded to **TZS 100,000** later on 2026-07-30 and `process` returned `010` again.
>    See [`SELCOM-010-INVESTIGATION.md`](SELCOM-010-INVESTIGATION.md) for the resolution and
>    [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state for live state.
> 2. **Wallet Cashin is now ENABLED** — Selcom switched it on during the evening of 2026-07-29; it no
>    longer returns `4035`. **Selcom Pesa and Huduma Agent Cashout are still `4035`**, and those are
>    the two rails that do not depend on TIPS, so they are the ones worth asking for.
> 3. **The TIPS story partly holds.** Every status query — the two frozen payouts, and a probe transid
>    that does not exist — returns `999 "No reponse from upstream system"`. A healthy gateway would
>    say "not found". Their upstream really is not answering. It still does not explain the `010`,
>    which their own error table defines as *"Invalid account or payment reference"*.
>
> Re-run the check any time: `railway ssh node scripts/selcom-probe.mjs`. What changed in the code as
> a result is in [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md).

## Summary

Every payout we attempt is rejected by Selcom. Between 17:04 and 23:52 EAT on 29 July 2026 we
made **6 payout attempts to the same M-Pesa number**, and received **three different failure
modes**, none of which we can act on from our side:

| # | Failure | Attempts |
|---|---------|----------|
| 1 | `HTTP 403` · `resultcode=403` · **"API endpoint not enabled for the vendor (4035)"** | 2 |
| 2 | `HTTP 200` · `resultcode=999` · **"No reponse from upstream system"** — never resolves | 2 (still open) |
| 3 | `HTTP 200` · `resultcode=010` · **"Invalid mobile number or operator not supported"** | 2 |

**Two payouts totalling TZS 15,000 are still unresolved** (failure mode 2). Selcom has been
answering `999 / "No reponse from upstream system"` to our `walletcashin/query` for those two
transactions for over 6 hours. We do not know whether the customer was paid or whether our
float was debited.

---

## 1. The request we send

Identical shape for every attempt, per the Wallet Cash-In spec:

```
POST https://apigw.selcommobile.com/v1/walletcashin/process

Authorization:  SELCOM <base64(API key)>
Digest-Method:  HS256
Digest:         <base64(HMAC-SHA256(signing_string, API secret))>
Timestamp:      <ISO-8601, +03:00>
Signed-Fields:  transid,utilitycode,utilityref,amount,vendor,pin
Content-Type:   application/json

{
  "transid":     "wdr_836b544a815ec2d5da70",
  "utilitycode": "VMCASHIN",
  "utilityref":  "255757619808",
  "amount":      4925,
  "vendor":      "SW00212780",
  "pin":         "<float PIN — set>"
}
```

The signature is accepted (we get business-level result codes, not `401`), and the same
credentials successfully serve our collections, so authentication is not in question.

---

## 2. Transaction log — all 6 attempts

Payee for every attempt: **+255 757 619 808** (Vodacom M-Pesa).
`amount` is the net payout after our TZS 75 / 150 withdrawal fee.

### Failure mode 1 — 403 / 4035 "API endpoint not enabled for the vendor"

| Selcom `transid` | Our reference | Time (EAT) | Amount sent |
|---|---|---|---|
| `wdr_0750e0685c3bf888a15e` | `txn_5113a6417de307dc0d742d0c` | 29 Jul 18:55:23 | 4,925 |
| `wdr_36473a1a5f53e45611fa` | `txn_89193a7fad9b6fd25803a0cf` | 29 Jul 19:00:24 | 4,925 |

Response (both):
```
HTTP 403 · resultcode=403 · result=FAIL
message=API endpoint not enabled for the vendor (4035)
```

### Failure mode 2 — 999 "No reponse from upstream system" — STILL OPEN

| Selcom `transid` | Our reference | Sent (EAT) | Amount sent | Gross held |
|---|---|---|---|---|
| `wdr_11d8552cb75b420d4bc3` | `txn_8ad70b448950261a60fc860a` | 29 Jul 17:04:43 | 9,850 | 10,000 |
| `wdr_9d9e565e61ce8ec1c0d4` | `txn_5bacbcbbd98530d7edbea53c` | 29 Jul 17:52:08 | 4,925 | 5,000 |

We re-query these every 5 minutes with `GET /v1/walletcashin/query?transid=…`. As of
23:47:48 EAT — nearly 7 hours after submission — Selcom still answers:
```
HTTP 200 · resultcode=999 · result=AMBIGUOUS
message=No reponse from upstream system
```
Because `999` is not terminal, we correctly hold the customer's money rather than reverse a
payout that might still be in flight. **These two cannot be closed without Selcom telling us
the final state.**

### Failure mode 3 — 010 "Invalid mobile number or operator not supported"

| Selcom `transid` | Our reference | Time (EAT) | Amount sent |
|---|---|---|---|
| `wdr_836b544a815ec2d5da70` | `txn_174837ed97b9799f7e68306e` | 29 Jul 23:51:29 | 4,925 |
| `wdr_3d0a53e9b128e20d0e31` | `txn_42b951e9a912a39ca1f77dde` | 29 Jul 23:51:47 | 4,925 |

Response (both):
```
HTTP 200 · resultcode=010 · result=FAIL
message=Invalid mobile number or operator not supported
```

**This response appears to be incorrect.** `+255757619808` is a valid, active Vodacom M-Pesa
number (the `0757` prefix is Vodacom), and `VMCASHIN` is the Vodacom Wallet Cash-In utility
code. The same number receives M-Pesa normally outside our platform.

---

## 3. What changed between the failures

The `4035` errors stopped after 19:00 EAT, which suggests the Wallet Cash-In endpoint was
enabled for our vendor at some point during the evening. The calls at 23:51 EAT then reached
the business layer and returned `010` instead. So the endpoint is now reachable, but the
**product still does not complete a payout.**

---

## 4. What we need from Selcom

1. **`wdr_11d8552cb75b420d4bc3` and `wdr_9d9e565e61ce8ec1c0d4`** — what is the FINAL status?
   Was the customer paid? Was our float debited? These have been `999` for 7 hours and we are
   holding TZS 15,000 of a customer's money pending your answer. **This is the urgent item.**

2. **`resultcode=010` on `VMCASHIN` to `255757619808`** — please confirm whether `VMCASHIN` is
   actually provisioned for vendor `SW00212780`, or whether we should be sending the universal
   `CASHIN` code and letting your MNP lookup route it. Our reading is that the number and the
   utility code are both correct, so this rejection looks like a provisioning issue rather than
   a bad request.

3. **Confirm Wallet Cash-In is fully enabled** for `SW00212780` on production — the `4035`
   error earlier this evening says it was not, and we would like written confirmation of the
   current state.

4. **Float account** — please confirm our disbursement float is funded and which account the
   payouts draw from, so we can rule that out.

---

## 5. Contact

Ali Sheib — ali.sheib@50pick.tz — 50pick (Kipindi Ltd), Dar es Salaam.
Test account used for these attempts: jaykaba.mbet@gmail.com / +255 757 619 808.

*All timestamps EAT (UTC+3). Evidence source: 50pick production application logs and payment
ledger, 29–30 July 2026.*
