# The `010` investigation — ✅ CLOSED 2026-07-30

Opened 2026-07-30 after the disbursement float was funded and a payout **still failed**.
**Resolved the same day.** Kept as the reasoning trail — how the wrong answer was reached, and
what disproved it — because the wrong answer was confident and cost a nearly-sent email.

> ## ✅ THE ANSWER — read this, then skip to the reasoning only if you need it
>
> **The float was NOT the problem, and neither was the utilitycode.** `scripts/selcom-code-matrix.mjs`
> (money-free — signed GETs to `/walletcashin/namelookup`) settled it:
>
> - `namelookup(VMCASHIN, 255757619808)` → `000 SUCCESS`, correct registered name
> - `process(VMCASHIN, 255757619808)` → `010 "Invalid mobile number or operator not supported"`
>
> `VMCASHIN` and `CASHIN` both resolve; `AMCASHIN`/`TPCASHIN`/`EZCASHIN` all refuse — so operator
> validation works and our codes are right. **Selcom's gateway contradicts itself.**
>
> **Likely root cause: their upstream (TIPS) is down.** Every status query returns
> `999 "No reponse from upstream system"`, *including for a transid that does not exist*. Name
> lookup stays inside Selcom so it works; process needs the upstream so it fails. One theory,
> three symptoms: the `010`, the `999`, and the two payouts frozen since 2026-07-29.
>
> **The ask that unblocks paying customers:** enable `SELCOM_PESA` + `HUDUMA_AGENT` — Selcom-internal,
> they bypass the broken upstream, and the ladder already tries them.
>
> ⛔ **Do not switch to `CASHIN`.** It resolves identically, which proves nothing: both codes reach
> the same working lookup and neither reaches the broken upstream. Changing the map would be
> changing a variable that isn't the fault.
>
> **Live state lives in [`SELCOM-PAYOUT-RAILS.md`](SELCOM-PAYOUT-RAILS.md) § Current state**, not here.

---

## The lesson worth keeping

Two confident, wrong diagnoses in one day, each from real evidence:

1. **"`010` is a mislabelled empty float"** — from two identical requests answering `010` then
   `990`. Plausible, and it survived until the float was funded and `010` came back.
2. **"So the utilitycode must be wrong"** — the obvious next inference, and also wrong.

What broke the loop was **a money-free probe of a different endpoint**. The failing call couldn't
tell us anything new, but an adjacent one could — and `namelookup` answered in seconds without
spending a shilling or holding a player's money. When a live call keeps failing the same way,
stop re-running it and find a cheap question that separates the hypotheses.

---

## 🔴 The correction

This morning I concluded — and the email drafted for Selcom asserts — that
**`010 "Invalid mobile number or operator not supported"` was Selcom mislabelling an empty
float.** The evidence was two byte-identical requests three minutes apart returning `010`
(10:45:28) and then `990 "Insufficient account balance"` (10:48:09), with the float provably
empty at both moments.

**That inference is now in doubt.** After the float was funded, Jay's next attempt returned
`010` again:

```
[selcom] /walletcashin/process REJECTED (wdr_4b7ee5dd2616b62d6c38)
  HTTP 200 · resultcode=010 · result=FAIL
  message=Invalid mobile number or operator not supported
  rail=WALLET_CASHIN utilitycode=VMCASHIN payee=25575***08 amount=4925
  vendor=SW00212780 pin=set
```

If `010` were merely a dressed-up empty-float error, funding the float should have changed
it. It did not. **Do not send the `010`-is-really-`990` claim to Selcom as settled fact until
the float balance is read.** If it goes out as-is and turns out to be wrong, it costs
credibility on the one ticket where we need them to act.

---

## The two worlds, and the one fact that separates them

**World A — the money did not reach the disbursement float.** Collections and the
disbursement float are separate balances at Selcom (this is established and unchanged). A
deposit that landed on the collections side, or in a different wallet, leaves the float at
zero. Then `010` and `990` are both empty-float symptoms reported inconsistently, and the
original inference stands.

**World B — the float is funded and `010` is a real, separate routing failure.** Under this
reading `010` was *always* the primary error, and the single `990` at 10:48 was the float
check happening to fire first on that one attempt. `VMCASHIN` to `255757619808` genuinely
does not route for this vendor, and the empty float was a second, independent blocker that
masked it.

**The distinguishing fact is the disbursement float balance, right now.** Nothing else
separates them, and every next step depends on which world we are in.

```
railway ssh node scripts/selcom-probe.mjs     # money-free; reads the float + every rail
```

`/admin/payments` runs the same probe on every page load if the shell is easier to skip.

---

## Plan — ⛔ SPENT, do not follow

This was the fork before the answer was known. **It resolved to World B** (float funded, `010` is a
real failure), and step 3's "try `CASHIN`" was then ruled out too: `CASHIN` resolves identically to
`VMCASHIN`, so it proves nothing and changing the map would change a variable that is not the fault.
Kept only to show how the question was framed.

**1. Read the float.** Blocking. Everything below forks on it.

**2. If the float is EMPTY (World A)** — the deposit went to the wrong balance. This is a
Selcom treasury question, not a code question: *which account did the deposit land in, and
how do we move it into the disbursement float for `SW00212780`?* The existing email stands.

**3. If the float is FUNDED (World B)** — the problem is the payee routing, and there is a
cheap, well-supported next test: **send the universal `CASHIN` utilitycode instead of
`VMCASHIN`.**

Selcom's own documentation says `CASHIN` auto-routes by MNP lookup on the payee number, and
this repo *already* relies on that behaviour — `mnoToSelcomCashin()` in `selcom.ts` routes
HaloPesa and TTCL through `CASHIN` precisely because their per-MNO codes were single-source
and unverified. The same reasoning applies here the moment `VMCASHIN` is in doubt.

⚠️ `mnoToSelcomCashin()` hardcodes `MPESA → VMCASHIN` with no env override, so this needs a
small code change — not a config toggle. Keep it a **deliberate, reversible experiment**: one
attempt, wire log on, then decide. Do not silently switch the production mapping.

**4. Correct the email** before or immediately after sending, depending on what the float
says. The strongest version of the ticket in World B is not "your `010` is a mislabel" but:
*"on a funded float, `VMCASHIN` to a valid, active Vodacom number returns `010` — is
`VMCASHIN` provisioned for `SW00212780`, or should we be sending universal `CASHIN`?"* That
is question 2 in the original evidence pack, and it turns out to have been the important one.

---

## Concerns

**The `010`/`990` inconsistency is still real and still unexplained**, whichever world we are
in. Two identical requests three minutes apart returned different errors. That remains worth
raising with Selcom on its own merits — just not as a proven diagnosis.

**We are testing against a live gateway with real money and one payee.** Every attempt costs
a real hold-and-reverse cycle on Jay's balance. Change one variable per attempt — utilitycode
*or* rail *or* amount, never two — or the result tells us nothing.

**`SELCOM_PESA` is still `4035`.** The ladder advanced to it and it refused, as designed, so
there is still exactly one live rail and no fallback. Until Selcom enables Selcom Pesa or
Huduma, any Wallet Cashin problem is a total payout outage rather than a degraded one.

**The wire log is currently OFF.** The captures above are the always-on envelope detail,
which is enough to diagnose but not enough to send Selcom. Turn it back on
(`SELCOM_WIRE_LOG=payouts`) *before* the next test attempt, and off again after.

**Two payouts are still frozen at `999` from 2026-07-29**, untouched — the reconcile still
reports `2 still in flight`. Only Selcom can close those. They are not affected by any of the
above and must not be reversed locally.

---

## What is working, and worth stating

Every safety mechanism held again, unprompted, on real failures:

```
payout ladder exhausted (wdr_4b7ee5dd…) — WALLET_CASHIN:FAILED → SELCOM_PESA:FAILED
[email] "Withdrawal returned · TZS 5,000" → the player
[lifecycle] ledger trial balance OK — 41 wallets reconcile, books balanced
```

`010` and `4035` both read as definitive, so the ladder advanced and then exhausted into a
clean reversal. **Jay's money came back, and the books balance.** Three days ago this same
situation froze TZS 15,000 with no way to release it.

⛔ Withdrawals stay closed to players. **No payout has ever completed on this platform.**
