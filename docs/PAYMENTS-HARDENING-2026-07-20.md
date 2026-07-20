# Payments hardening — 2026-07-20

> The day the mobile-money rail went from "never worked" to "credits in ~15 seconds",
> and four money-safety defects were found and closed. Written for whoever picks this up
> next; the commit messages carry the detail, this is the map.

## What was broken, and what fixed it

### 1 · Every mobile-money deposit failed (`4256d02`)

`create-order-minimal` requires `no_of_items`. The mobile path never sent it; the card path
always did — which is why cards were unaffected and nobody noticed. `docs/SELCOM-API-DIGEST.md`
elides the field behind a trailing `...`, so reading the digest would not have shown the
difference.

```
HTTP 412 · resultcode=412 · result=FAIL
message=Parameter no_of_items is invalid or missing
```

All four failed attempts were the SAFE branch — the rejection happens before the USSD push,
so no handset was prompted and nobody was charged.

⚠️ **The stub gateway was more permissive than the real one** and accepted the exact body
Selcom rejected. A stub that is laxer than what it stands in for is worse than no stub. It now
enforces the same mandatory-field check and returns the real 412 envelope, and
`selcom-adapter.test.mts` asserts the BODY we send (not just the returned verdict), including
field order — key order IS the Signed-Fields order.

### 2 · A failed deposit said nothing (`0abdef6`)

`selcomDeposit` discarded every diagnostic: `catch { return PROVIDER_DOWN }` threw away the
transport error and the rejection branch dropped Selcom's own `resultcode`/`message`.
`selcomFetch` had captured all of it — it was simply never read. A real deposit failed on a
licensed platform and the reason was unrecoverable once the container logs rotated.

Every failure branch now records a log-safe `detail` (HTTP status, resultcode, result, message)
into **both** the log and the `deposit.failed` audit payload — the audit row is what survives
log rotation. **This is what found defect #1**, within minutes of shipping.

### 3 · A paid deposit waited 30 minutes (`81aae32`, `98e4ac8`, `0677350`)

Selcom's callback never arrives — zero webhook audit entries, ever. The only other authority
(the signed order-status re-query) lived exclusively in the 30-minute stale sweep, so a player
already debited waited 30–35 minutes and would very reasonably pay again.

`creditConfirmedDeposits()` now runs on its **own 15s timer**, separate from the 60s lifecycle
tick, over deposits aged 8s–10min.

⚠️ **The lane can ONLY confirm.** It never fails, reverses or terminalises. That asymmetry is
the entire safety argument: polling four times a minute cannot turn a slow-but-valid deposit
into a failed one. All terminal decisions stay in the patient 30-minute path.

Two self-inflicted defects, both caught in production within minutes:
- It ran from the lifecycle pass **and** its own timer — the overlap guard only covers the
  timer, so they collided every 60s. **No money was harmed**: the exactly-once settler gave the
  loser `already-confirmed`. Verified against the live ledger. Now driven by one timer only.
- `handled` is also true for `already-confirmed`, so no-ops were counted as credits — a
  duplicate poll looked like a duplicate PAYMENT in the audit log. Counts a fresh settle only.

## The four money-safety defects (`ab72f77`, `6825a32`, `1ec60ca`)

Found by an adversarial audit of the whole flow. **The deposit credit path was audited in the
same pass and is sound** — all five credit routes funnel through `settleDepositConfirmed`,
status-gated inside an advisory-lock transaction with credit + status + ledger in one write.
The audit's words: *"double-credit is impossible, do not touch it."*

| | Defect | State |
|---|---|---|
| **L1** 🔴 | Approving a withdrawal in `/admin/aml` released the hold, marked CONFIRMED, posted a ledger group crediting `EXTERNAL` and emailed "on its way" — **with zero gateway calls**. Worst on payouts ≥1M, which returned a **fabricated** providerRef *before* the adapter and therefore before the float-PIN guard and the LIVE-mode mock refusal. | Approval blocked; fabricated ref removed |
| **L2** 🟠 | A deposit landing after self-exclusion was marked REVERSED *before* the ledger write — no entry either side. Cash sat in the provider float, the platform kept it, and **the trial balance still reconciled clean precisely because nothing was posted**. | Booked to `HOUSE:RG_SUSPENSE`, held as `AML_REVIEW` with `rg_refund_due_*` |
| **L3** 🟠 | Reconcile blind-reversed in-flight withdrawals on `UNSUPPORTED` — which means "we could not ask", not "nothing happened", and is reachable from one dropped env var. | Never auto-reverses, in any mode |
| **L4** 🟠 | Approving a **deposit** was equally unsafe — the action has no wallet-credit path, so it would mark the deposit settled without paying the player. Latent until L2's fix made deposits reachable there. | Approval blocked for both types |

### Notes that matter for whoever re-enables approval

- ⛔ **Do not credit `PLAYER` for RG-suspense money.** `PLAYER` is trial-balanced against the
  wallet; crediting it for money that never entered the wallet creates permanent false drift —
  the opposite of the problem being fixed.
- Status is `AML_REVIEW`, not `REVERSED`: REVERSED reads as "settled, nothing owed" and drops
  out of every operator queue. It must stay in front of a human until the money is returned.
- L3 is deliberately **not** mode-gated like its deposit twin: a withdrawal holding a
  providerRef is never auto-reversed in ANY mode, because gating it leaves a branch shaped
  exactly like the bug waiting for a flag flip.
- Reinstating approval means: **dispatch to the gateway FIRST**, set PROCESSING with a real
  providerRef, keep the hold, and let `settleWithdrawalConfirmed` own the terminal state — it
  already does hold-release + ledger + notification atomically, and only after the provider
  accepts. TypeScript proved the old body unreachable once the guards landed; it was deleted
  rather than left for someone to re-enable without the dispatch it never had.

## Verified live at end of session

```
in-flight / held:          none
unbalanced ledger groups:  none
wallet 1500 · hold 0 · ledger 1500   OK
drifting wallets:          0
RG suspense (money owed):  0
deposits:                  CONFIRMED=2  FAILED=4
```

Both real deposits credited, with processing + confirmed notifications in EN/SW and the
confirmation email carrying both references and the new balance. Email is **Postmark**
(`POSTMARK_API_KEY`), not Resend — a wrong assumption that briefly produced a false "email is
broken" alarm. Read `email.ts` before claiming anything about mail.

## Also fixed the same day

**L6 — a paid deposit could be failed for lacking a reference** (`3359b9a`). The `providerRef`
was written only AFTER dispatch, so a crash or redeploy in that window left a genuinely paid
deposit with no reference — and reconcile read "no reference" as "never pushed" and FAILED it,
emailing the player that the payment was never started. The correlation id is now minted in
`deposit()` and persisted BEFORE dispatch (the post-dispatch write is KEPT and remains
authoritative — mock and AML branches return a different value). Reconcile no longer auto-fails
a no-ref deposit in live mode.

**The audit chain no longer reports BROKEN** (`1f31df7`). It never was tampered with: 5,364
entries, one GENESIS row, zero link breaks. `AUDIT_CHAIN_SECRET` was introduced after entries
had been signed with the `SESSION_SECRET` fallback, so earlier rows stopped recomputing.
Verification now tries every key an entry could legitimately have been signed with, and reports
CHAIN LINKS (the real tamper evidence) separately from hash recomputation.
⛔ Historical hashes are deliberately NOT recomputed under the current key — that would rewrite
the very record whose purpose is to prove nothing was rewritten. Tamper detection is proven
still working: severing a link and altering a field are both still caught (`test:audit` 25).

## Still open — WAITING ON SELCOM

Both blockers are now on Selcom's side. Nothing further to build until they reply.

1. **Callbacks never arrive.** Zero webhook audit entries, ever. Polling covers it, so this
   costs LATENCY (~15s vs seconds), not correctness — but the correct shape is webhook-primary
   with polling as the backstop. Ask them to enable callbacks to
   `https://www.50pick.tz/api/webhooks/payments`, confirm the base64 `webhook` param is
   honoured, that our egress IPs are allow-listed for callbacks too, and which signature scheme
   they use. Clean example to give them: `dep_9a98e90052cdb11eaa7c` (20 Jul, 1,000 TZS, Mixx) —
   paid successfully, no callback.
2. **Withdrawals cannot pay out.** `PAYMENT_VENDOR_PIN` unset; needs Wallet Cashin access, a
   float account and the float PIN. See `docs/SELCOM-DISBURSEMENT-REQUEST.md`.

## Still open — ours, not urgent

- **AML approve/reject writes are not atomic** — `db.*` do not auto-join the lock's transaction;
  only `withMoneyTx` consults `currentLockTx()`. Largely moot while both approvals are blocked.
- **The poll loop is sequential and per-container.** ~30 concurrent in-flight deposits fills the
  15s window; with N containers every container polls every deposit. Fine at current volume.
- **Web push is a silent no-op** — `VAPID_*` unset, so `push-service` logs `[push-stub]` and
  returns success. In-app notifications and email both work, so nothing is missed; players just
  get no push banner.
