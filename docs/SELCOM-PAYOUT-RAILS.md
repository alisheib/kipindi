# Payout rails and the fallback ladder

> One page on how money leaves 50pick, why there is more than one way out, and the single
> rule that stops a fallback from becoming a double payment.
> Written 2026-07-30, after the incident in [`SELCOM-PAYOUT-INCIDENT-2026-07-30.md`](SELCOM-PAYOUT-INCIDENT-2026-07-30.md).

## Why this exists

On 29 July 2026 every withdrawal failed. Six attempts, three different Selcom errors, TZS 15,000 of a
player's money frozen — and for several hours no way to tell whether the cause was a national-switch
outage, a malformed request, or a product that had never been switched on. Those have completely
different fixes and they looked identical from the outside.

Two things came out of it:

1. **A platform with one payout rail has no payout capability.** That rail is a third-party product
   that can be unprovisioned, dried out, or knocked offline, and when it is, players cannot be paid.
2. **Provisioning is a fact to be measured, not inherited from an email.** A written assurance that
   an endpoint was enabled turned out to be wrong, and we built on it for two days.

## The rails

Defined once as a table — `PAYOUT_RAILS` in [`src/lib/server/selcom.ts`](../src/lib/server/selcom.ts).
Each entry carries its process endpoint, its **own** status-query endpoint, its utility code, and a
body builder whose **key insertion order is the `Signed-Fields` order** (reordering after signing is
a 401).

| Rail | Where the money lands | Rides TIPS? | In the auto-ladder? |
|---|---|---|---|
| `WALLET_CASHIN` | The player's mobile-money account | yes | ✅ first |
| `SELCOM_PESA` | A Selcom Pesa wallet on the same number | no — Selcom-internal | ✅ second |
| `HUDUMA_AGENT` | **Cash** at any Selcom agent, via `*150*50#` | no — Selcom-internal | ❌ manual only |

Qwiksend (bank transfer) is documented in the API digest but not integrated: we capture no bank
details, and a bank transfer very likely rides TIPS anyway.

**Why Huduma is not automatic.** It does not send money to a phone. It parks cash at an agent the
player has to travel to and collect in person. Silently converting "money in my M-Pesa" into "go find
an agent" is not a fallback, it is a different product — and a player waiting for an SMS that will
never arrive is worse off than one who simply gets their balance back and retries. It is fully
implemented, probe-checked and operator-dispatchable; it just never happens behind the player's back.
Adding it to `PAYOUT_LADDER` without a consent step would be a mistake.

## 🔴 The rule

`runPayoutLadder` in [`src/lib/server/payments.ts`](../src/lib/server/payments.ts):

| Rail outcome | Ladder | Why |
|---|---|---|
| **ACCEPTED** (incl. `999`/`111`/`927`) | **STOP**, keep the hold | It may be in flight |
| **AMBIGUOUS** — timeout, network error, any non-401/403 HTTP error | **STOP**, keep the hold | **We do not know if Selcom took it. Advancing here pays the player twice.** |
| **FAILED** — 401/403, or 2xx with a hard-fail resultcode (`4035`, `010`) | **ADVANCE** | Refused at the door; nothing can be in flight |
| probe says NOT_ENABLED | **SKIP**, no request | Don't burn a round-trip on a known `4035` |
| every rung exhausted | `PROVIDER_DOWN` → clean reversal | Money back, honest message, no eternal spinner |

"Refused at the door" is the *only* state in which advancing is safe, and that is the whole design.
`AMBIGUOUS` stopping the ladder is asserted in `scripts/payout-rails.test.mts` for every rail.

Each attempt gets its **own `transid`** — Selcom treats it as the idempotency key, so reusing one
across two endpoints muddles the single identifier we use to ask "did this pay?".

## The other half: asking the right endpoint

Every rail's status endpoint only knows its own transids. Ask `/walletcashin/query` about a payout
sent through `/selcompesa/cashin` and you get an envelope for a transaction it has never heard of;
any resultcode outside `000/111/927/999` resolves to **FAILED**; and `reconcileStalePayments` treats
FAILED as "definitively did not happen" and refunds the player. **The money is already gone.** A
double payment caused by nothing but a hardcoded URL.

So the rail is persisted on `Transaction.payoutRail` at dispatch and threaded through every
re-query: the fast payout lane, the stale reconcile sweep, the payment webhook, and the officer's
"reverse stuck payout" check. `railOf(null)` resolves to `WALLET_CASHIN` — true for every row written
before rails existed, which is why no backfill was needed on the live money table.

`scripts/payout-rails.test.mts` §3 is the regression: verify a `SELCOM_PESA` payout, assert the call
went to `/selcompesa/query` and **never** to `/walletcashin/query`.

## The probe

`scripts/selcom-probe.mjs`, and the same logic in-app via `selcomProbeRails`, surfaced on
`/admin/payments` on every load.

It asks each rail's status endpoint about a transid that does not exist. **It moves no money.**
`401/403` ⇒ NOT_ENABLED. Any other answer — including "not found" — ⇒ ENABLED, because the endpoint
engaged with us on its merits, which is all "enabled" needs to mean. A network error ⇒ **UNKNOWN,
never NOT_ENABLED**: one bad minute must not permanently disable a working rail, so the ladder tries
UNKNOWN rails anyway. One wasted request is cheaper than a payout that never goes out.

```
railway ssh node scripts/selcom-probe.mjs
```

Run it from inside the container — the credentials are pinned to three egress IPs, so a call from a
laptop fails regardless of signature. It also re-queries the two payouts still frozen from the
incident, and reads the float balance.

## The wire capture — what we send and what we receive

Selcom's support asked for "the request and the response, with headers." We could not produce one,
and the reason is worth stating plainly: **no version of this code ever kept them.** `selcomFetch`
read `res.status` and `res.json()` and never touched `res.headers`; request headers were recomputed
per call and discarded; and the `Digest` cannot be rebuilt afterwards because it signs a `Timestamp`
we never stored. `describeSelcom()` captured the *envelope* — HTTP status, resultcode, result,
message — which is the right thing to persist on a money row. It is not what a gateway engineer
needs to trace a call on their own side.

Two tools now, for two different jobs.

**1 · In the live payout path** — `SELCOM_WIRE_LOG`, off by default:

| Value | Captures |
|---|---|
| unset / `0` / `off` | nothing (**default**) |
| `payouts` | the payout rails + float read — what a withdrawal test wants |
| `all` | every Selcom call, deposits included |

Set it in Railway **before** the test payout, then unset it. It logs the request line, every request
header, the body, the exact signing string, then `HTTP <status>`, **every response header**, and the
raw body text. Response headers are the genuinely new half: Selcom's trace/correlation ids live
there and their support can look those up directly.

⛔ It is off by default because it prints `Authorization` (base64 of the API key), and a log is
forever. **The float PIN is always redacted, on every setting, with no unmask flag** — Railway's log
retention is not somewhere a PIN can be taken back out of.

⚠️ `selcomFetch` now reads the body as **text and then parses**, rather than `res.json()`. That is
behaviour-identical (`res.json()` is text+parse) but it keeps the raw body — and an empty `403` or an
HTML error page is exactly the case where the raw body *is* the evidence. The return contract is
unchanged and asserted so: capture is observation, and must never move a verdict.

**2 · Standalone, on demand** — `scripts/selcom-capture.mjs`:

```
railway ssh node scripts/selcom-capture.mjs > capture.txt
```

Default run **moves no money**: signed status queries for the two frozen payouts, a control query,
and the float read. The real `walletcashin/process` sits behind `--process
--i-understand-this-may-pay-real-money`, because there is no test mode on that endpoint — if the
float has been funded since the incident, that call pays out. `--unmask-pin` prints the PIN so Selcom
can re-verify a Digest that signs it; that is an operator decision, and the output goes to a file you
control rather than to log retention.

**Is our request even correct?** Verified line by line before asking Selcom to look: the signer
reproduces Selcom's own documented golden vector byte-for-byte (`test:selcom`), `utilityref` is the
payee MSISDN normalised to `255XXXXXXXXX` (their commonest trap — it is *not* `msisdn`, the optional
sender), body key order equals `Signed-Fields` order, and `amount` is whole TZS. The `010` is not
ours.

## The trail

`providerStatus` holds one line and is overwritten by every status re-query, so by the time anyone
looks at a stuck payout the dispatch story is gone — exactly what happened on 2026-07-29. Every rung
of the ladder therefore writes its own audit row (`withdraw.rail_attempt`: rail, transid, outcome,
detail). "We paid you on Selcom Pesa because mobile money was refused" is a sentence the platform has
to be able to evidence months later, to the player and to a regulator.

Player-facing, `withdrawRefRows()` in `email.ts` now prints the 50pick reference, the gateway
reference and — when it is not the obvious one — the rail. The "Withdrawal returned" mail, which goes
out on *every* failed payout, previously carried no identifier at all.

## Tests

- `npm run test:payout-rails` — the rail table, `railOf` defaults, **the double-pay regression**, the
  verdict taxonomy on all three rails, the ladder's shape, and the probe's verdicts.
- `npm run test:payout-observability` — nothing is logged that shouldn't be (never the PIN, payee
  always masked), everything is captured that should be, and `selcomVerifyPayout` uses the rail's own
  endpoint rather than a hardcoded one. §6 guards the wire capture: that `res.headers` is actually
  read (the exact regression that left us unable to answer Selcom), that the raw body survives, that
  the signing timestamp is kept so a Digest stays verifiable, that the PIN is redacted with no unmask
  path, that capture is off by default — and that `selcomFetch`'s return contract is untouched.
- `npm run test:payments`, `test:fast-payout`, `test:selcom` — the pre-existing money-safety suites,
  unchanged in intent.

## ✅ Current state — 2026-08-10: ONE RAIL RUNS, AND THAT NEEDS NO CODE CHANGE

**This section supersedes every state block below it.** Measured from production 2026-08-10,
after the last frozen payout was returned and the withdrawal gate reopened.

**The question this answers, because it will be asked again:** *"only one rail works — remove
the redundancy and keep the one that worked."* ⛔ **There is nothing to remove. Exactly one rail
already runs, and it is the ladder doing its job, not a gap in it.**

| Rail | Probe says | What actually happens on a payout |
|---|---|---|
| `WALLET_CASHIN` | ENABLED | **attempted** — the only rail a request is sent to |
| `SELCOM_PESA` | `NOT_ENABLED` (`HTTP 403 · 4035`) | **skipped without a request** — [`payments.ts:400-403`](../src/lib/server/payments.ts) |
| `HUDUMA_AGENT` | `NOT_ENABLED` (`HTTP 403 · 4035`) | **never automatic, by design** — it is not in `PAYOUT_LADDER` at all |

So the runtime behaviour is already *"keep the one that worked"*. Deleting `SELCOM_PESA` from
`PAYOUT_LADDER` would change **no** behaviour today; its only effect would be that the day Selcom
provisions the endpoint, the fallback would need a **code change and a deploy** to come back
instead of resuming on the next probe. ⭐ **Ali's call, 2026-08-10: leave the code, document it.**

⚠️ **`UNKNOWN` is not `NOT_ENABLED`, and the difference is deliberate.** A probe timeout does NOT
disable a rail — one wasted request is cheaper than a payout that never goes out. Only a rail
Selcom has *definitively refused* is skipped.

🔴 **THE ACTUAL CONSTRAINT ON PAYOUTS TODAY IS NOT THE RAILS — IT IS THE FLOAT.** The console
reads **TZS 88,645** available and flags it *"Low float — payouts fail when it runs dry."* A rail
that is provisioned and healthy still fails on an empty float, and it fails in a way that looks
like a rail problem. **Check the float first.**

⚠️ **And the rail has not been exercised since the gate reopened.** Measured 2026-08-10 08:38Z:
**0 withdrawals and 0 cash-outs** since 08:10Z. What *did* work in the preceding 24h was **22
`BET_PAYOUT` settlements totalling TZS 193,782** — but that is an internal wallet credit, not
money leaving to Selcom. ⛔ **Do not read settlement payouts as evidence that the payout rail
works.** They are different halves of the system, and only one of them has been proven today.

## ✅ Current state — 2026-08-02: PAYOUTS WORK, and the three stuck rows CAN be closed by us

**This section supersedes every other state block in `docs/SELCOM-*`, including the 07-31 one
directly below it.** Measured from production the same day, not inherited.

| Checked 2026-08-02 17:05 EAT | Value |
|---|---|
| Withdrawals CONFIRMED, lifetime | **4** — all on `WALLET_CASHIN`, all 2026-07-31 (08:04, 08:06, 13:55, 13:57) |
| Disbursement float | **TZS 90,653** — ⚠️ the "float is TZS 0" note that circulated is **stale**, and so is "TZS 100,000" |
| `WALLET_CASHIN` / TIPS | ✅ **healthy** — it is the rail all four successes went out on |
| Stuck in `PROCESSING` | **3**, all on Jay's account (`+255757619808`): 10,000 (99h), 5,000 (98h), 2,000 (57h) |
| Player-facing status | **`unavailable`** — derived, not declared. `SystemConfig` has no `payouts.availability` row at all, so the officer flag is clean `operational` and the queue alone is shutting the door |

### ⭐ The three stuck payouts never paid, and the float is the witness that proves it

The 07-31 note below says *"Only Selcom can close them"* and reasons that reversing an `AMBIGUOUS`
payout could double-pay. The instinct is right and the ladder rule stays. **But there is a second,
independent source of truth this platform never consulted: the disbursement float is prepaid, so a
payout that never debited it never paid.** Run the arithmetic:

- The float was verified at a full **TZS 100,000 on both 30 and 31 July** — *after* the 10,000 and
  5,000 were attempted on 29 July. Either the float was dry when they were attempted (it was) or it
  was full afterwards (it was). **Both branches mean the same thing: they did not pay.**
- Since then the float has fallen by **9,347**. The four confirmed payouts are 4 × 1,970 net =
  7,880, plus Selcom's per-disbursement fee. A *fifth* payout would need ≥ 9,850 net on its own.
  **It is not there.**
- The 2,000 from 07-31 08:07 has **no `providerRef` and no `withdraw.pending` audit row** — only
  `withdraw.initiated`. Selcom never accepted a dispatch, so there is nothing in flight to collide
  with.

⚠️ **Do not generalise this into "reverse anything that says 999".** The float check is what makes
these three safe, and it works because the float is prepaid and this platform has one payout
source. It is evidence, not a policy change — `runPayoutLadder`'s `AMBIGUOUS → STOP` rule is
untouched and must stay.

⛔ **And `999 AMBIGUOUS` from `/walletcashin/query` carries no information at all.** Re-confirmed
2026-08-02: a probe transid **that has never existed** returns the byte-identical
`999 · AMBIGUOUS · "No reponse from upstream system"`. A response that is the same for a real
payout and a fabricated one cannot be read as "it might be in flight".

**How to close them** — `/admin/payments` → each frozen payout → **Return to player** → a reason of
≥10 chars. `reverseStuckPayoutAction` re-queries the provider first and refuses outright if it
reports `CONFIRMED`, so the control cannot double-pay even if the reasoning above were wrong. When
the third clears, `derivePayoutStatus` drops below both thresholds and **the player-facing banner
clears itself with no deploy.**

### 🔴 One real defect this surfaced — the reconciler floods the audit chain

`txn_5fb63ccd052fe64e1f826aff` (the 2,000 with no `providerRef`) carries **584 audit rows**, all
identical: `payments.reconcile_needs_review · "stale withdrawal has no providerRef — not
auto-reversed"`, one every ~5 minutes since 07-31 08:41 and still going. The sweep re-reports a
condition it can never resolve, into the tamper-evident compliance chain, forever. Not filed as a
blocker — but a single unresolvable row should raise its alarm **once**, not 584 times, and real
compliance events are being buried under it.

---

## ✅ Current state — 2026-07-31: PAYOUTS WORK (superseded by the block above; kept for the detail)

**This section was the single source of truth for payout state until 2026-08-02. Everything else in
`docs/SELCOM-*` — including "Current state — 2026-07-30" immediately below — is history.**

Selcom fixed TIPS overnight and asked us to retry. **Two real payouts succeeded, end to end, for
the first time in this platform's life:**

| `transid` | Net | Selcom | Settled | Player email |
|---|---|---|---|---|
| `wdr_95e5cddab0fbfcb3fdbf` | TZS 1,970 | `000 SUCCESS · "Selcom Qwikpay"` | ✅ `fast-settled 1 of 1` | ✅ "Withdrawal sent" |
| `wdr_009c1a7c3662aaabcf47` | TZS 1,970 | `000 SUCCESS · "Selcom Qwikpay"` | ✅ `fast-settled 1 of 1` | ✅ "Withdrawal sent" |

The whole success path — dispatch → `ACCEPTED` → fast-poll confirm → hold release → ledger →
notification → email — had **never once executed** before this. It now has, twice.

### 🔴 Two things are still open, and the first one blocks every player

**1. The two payouts from 2026-07-29 are STILL `999`.** `wdr_11d8552cb75b420d4bc3` (TZS 9,850) and
`wdr_9d9e565e61ce8ec1c0d4` (TZS 4,925). Over 42 hours. ~~Only Selcom can close them~~, and until they
do we hold TZS 15,000 of a customer's money — deliberately **not** reversed, because reversing a
payout that did complete pays twice.

> 🔻 **CORRECTED 2026-08-02 — "only Selcom can close them" was wrong.** The float is prepaid and
> proves they never paid (see the block above), and `/admin/payments` → *Return to player* has been
> able to close them since the control shipped. The caution about double-paying an `AMBIGUOUS`
> payout remains correct in general; it just was not the last word here.

**⚠️ And they shut the door on everyone else.** `derivePayoutStatus` marks payouts `unavailable`
once the oldest in-flight one passes `UNAVAILABLE_AFTER_HOURS = 6`. Those two are 42h old, so the
withdraw form is refused for every player **even though the rail is healthy**. The gate is telling
the truth about the queue and a lie about the rail, and it cannot be overridden by an officer —
`getPayoutStatus` returns `worstOf(declared, derived)`, by design. **Closing those two is what
reopens withdrawals**, not any code change.

**2. `SELCOM_PESA` and `HUDUMA_AGENT` still answer `4035`** — seen again during the 07-31 test
(`SPSCASHIN` → HTTP 403). Less urgent now that Wallet Cash-In works, but a second rail is what
would keep us paying through the next TIPS outage.

### ⏳ A scoped test bypass is LIVE in production — seal it when the two above are closed

`isPayoutTestBypass()` in `payout-status.ts` lets numbers listed in **`PAYOUT_TEST_BYPASS_MSISDN`**
past the shut gate. Currently `255757619808` (Jay, co-owner, testing with Ali). It exists because
the gate is self-locking: we could not test the rail because a payout was stuck.

It deliberately does **not** touch `getPayoutStatus`/`derivePayoutStatus`/`worstOf`, does **not**
suppress the player-facing notice for the tester, and is **off when the variable is unset**. Every
bypassed request logs `[payouts] ⚠️ TEST BYPASS ACTIVE`.

```bash
railway variables --unset "PAYOUT_TEST_BYPASS_MSISDN"   # seals it in seconds, no deploy
```

### 🔴 `resultcode 013` — the gateway floor is on the NET, and it is not in their docs

```
resultcode=013  "Payment amount must be greater than or equal to TZS 1,000."
```

Our minimum was **1,000 gross**; the 1.5% fee took 15; we asked Selcom to send **985**. So the
smallest withdrawal 50pick offered was one it could never deliver — invisible until 07-31, because
no payout had ever reached the business layer.

Fixed by checking the **net**, in `wallet-service.withdraw`, before the hold is placed:
`PROVIDER_MIN_PAYOUT_TZS` + `minWithdrawalForRate(rate)` in `src/lib/payout.ts`. ⚠️ **Derived from
the live `withdrawalFeeRate`, never hardcoded** — the fee is admin-tunable at `/admin/config` (1.5%
in production today, not the 1% default), so a constant minimum would break silently the next time
someone edits it. The withdraw form's `min` is derived from the same helper.

---

## Current state — 2026-07-30, end of day (SUPERSEDED — history only)

### 🔴 The blocker is on Selcom's side. Nothing in our code will fix it.

Everything on our side is ruled out — with evidence, not assumption:

| Checked | Result |
|---|---|
| Disbursement float | ✅ **TZS 100,000** (`resultcode 000 SUCCESS`) |
| Float PIN | ✅ set |
| `WALLET_CASHIN` provisioning | ✅ ENABLED (`QWIKSEND` too, not integrated) |
| Payee number | ✅ **valid** — resolves with the correct registered name |
| `utilitycode` | ✅ **correct** — `VMCASHIN` resolves; wrong operators properly refuse |
| Signature | ✅ accepted on every call |

And a payout still returns `010 "Invalid mobile number or operator not supported"`.

### 🎯 Selcom's gateway contradicts itself — this is the ticket

`scripts/selcom-code-matrix.mjs` (money-free) proved it. Same number, same code, minutes apart:

- `namelookup(VMCASHIN, 255757619808)` → `000 SUCCESS` + correct name — transid `nlk_b0ee0e4e4b11179b`
- `process(VMCASHIN, 255757619808)` → `010 FAIL` — transid `wdr_4b7ee5dd2616b62d6c38`

**Likely root cause: their upstream (TIPS) is down.** Every status query returns
`999 "No reponse from upstream system"` — *including for a transid that does not exist*.
`namelookup` stays inside Selcom, so it works; `process` needs the upstream, so it fails. That one
theory explains the `010`, the `999`, and the two payouts frozen since 2026-07-29.

⛔ **Do NOT "fix" a payout outage by editing `mnoToSelcomCashin`.** The codes are proven correct.
The warning is recorded on the function itself.

### ▶ The ask that actually unblocks paying customers

**Enable `SELCOM_PESA` and `HUDUMA_AGENT`** (both `4035`). They are Selcom-internal and do **not**
ride the broken upstream — and the ladder already tries them, so no code change is needed. This
matters more than fixing the `010`.

### ⛔ `railway run` LIES about Selcom. Use `railway ssh`.

Re-verified 2026-07-31 — state unchanged (float TZS 100,000, `SELCOM_PESA`/`HUDUMA_AGENT`
still `4035`, TIPS still `999`, both payouts still stuck). But the *first* attempt used
`railway run`, and it reported:

```
USABLE RAILS: NONE — disbursement is not provisioned for this vendor
```

**That was false.** Selcom whitelists the **production container's** IP. `railway run`
executes on the local machine with production's env vars injected, so every rail returns
`403 … Source IP not whitelisted (4032)` — and the probe folded that into "NOT ENABLED".
Read during an outage, it says *the vendor account is dead*, which would send someone to
Selcom with the wrong emergency.

✅ Fixed: `4032` is now its own `WRONG HOST` verdict, and when **every** rail returns it the
probe prints `VERDICT UNKNOWN`, names the cause, gives the right command, and exits `3`
rather than concluding. Verified both ways — the same `railway run` that lied now refuses,
and the `railway ssh` answer is unchanged.

```
railway ssh "node scripts/selcom-probe.mjs"     # ✅ the only trustworthy invocation
railway run node scripts/selcom-probe.mjs       # ❌ always 4032 — tells you nothing
```

### ⛔ Corrections — claims that were wrong, kept so nobody re-derives them

- ~~"The float is empty and that is the blocker."~~ The float was funded and `010` came back.
- ~~"`010` is Selcom mislabelling a dry float."~~ Disproven the same day. The `990` was simply the
  float check firing first on one attempt; `010` was always the primary error.

Still true and worth keeping: **deposits do not fund payouts** — collections and the disbursement
float are separate balances at Selcom, and the float is prepaid.

### Also open

- Two payouts unresolved at `999` since 2026-07-29 17:04 EAT. **Only Selcom can close them.**
  Deliberately not reversed — `999` is not terminal, and reversing one could double-pay.
- ⛔ Withdrawals stay **closed** to players (per-MNO kill switch on `/admin/payments`).

### ✅ What our side has proven

The ladder, probe cache and reversal path held under real failure **three times** on 2026-07-30:
`WALLET_CASHIN:FAILED → SELCOM_PESA:FAILED/SKIPPED → exhausted → clean reversal`, the player
refunded each time with an honest "Withdrawal returned" mail, and
`ledger trial balance OK — 41 wallets reconcile`. The day before, the identical situation froze
TZS 15,000 with no way to release it.

⚠️ **But the SUCCESS path has never executed.** ACCEPTED → CONFIRMED, hold release, the ledger
credit and the "payout sent" email have never run against a real Selcom success, because there has
never been one. **The first payout after activation is a TEST, not a launch** — watch one small one
end to end before opening withdrawals to anyone.
