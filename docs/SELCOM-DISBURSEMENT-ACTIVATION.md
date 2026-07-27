# Selcom Disbursement (Payouts / Withdrawals) — Activation Runbook

> **Status: Selcom disbursement API GRANTED (2026-07-27).** The request in
> [`SELCOM-DISBURSEMENT-REQUEST.md`](SELCOM-DISBURSEMENT-REQUEST.md) is fulfilled. Per Selcom's
> email (Masanja Paul, 2026-07-27): **`wallet-cashin` (mobile-money payout) AND `qwiksend` (bank
> payout) endpoints are enabled, on the SAME API credentials used for collection.** **Payouts are
> NOT live yet:** they still need the **float PIN** set in Railway, three small code phases, and one
> real end-to-end test. This doc is the single source of truth for turning payouts on. No secret
> values here — creds live in Railway env only, referenced by NAME.

---

## ✅ Status — CODE COMPLETE, DEPLOYED & LIVE (2026-07-27)

All three phases are built, tested (`test:all` **94/94**, `tsc` clean, `build` OK), committed and
**deployed to production**: Phase 1+2 `38aab05`, Phase 3 `e046c51` (Railway deploy `b96f42f0` = SUCCESS,
app restarted onto the new commit). Active provider is already `selcom`, gateway configured, money-mode
TEST. **Nothing in the code blocks a real payout.**

### What is LEFT — the only blockers (both operational, not code)
1. **Float PIN** — `PAYMENT_VENDOR_PIN` is NOT set. Wallet Cashin needs the float-account `pin` (the
   credentials package Selcom sent has Vendor/API-Key/Secret/URL but **no PIN**). Get it from the Selcom
   Portal (register: `https://portal.selcompay.com/register` → enterprise code `61247989` → TIN) or from Selcom.
2. **Float funding** — confirm the disbursement float is funded and how to top it up (payouts draw from it).

Set the PIN in Railway + fund the float → a KYC-approved account can do a real ~1,000 TZS payout end-to-end.

### Simplified reply email to Selcom (reply to Masanja's "disbursements enabled" email)

> Hi Masanja,
>
> Thank you — noted that the same API credentials are used for disbursement. We've integrated Wallet Cashin
> and are ready to test payouts.
>
> One thing: `POST /v1/walletcashin/process` requires a `pin` field (float-account PIN). Do the same
> credentials cover this, or is there a separate float PIN we should use? And please confirm the float
> account is funded / how we top it up.
>
> Thanks!

---

## 1. Why nothing could be paid OUT before (it was never missing code)

The withdrawal/payout code has always been fully built and tested:
- `selcomWithdraw()` → `POST /walletcashin/process` — [`selcom.ts:429`](../src/lib/server/selcom.ts#L429)
- `selcomVerifyCashin()` → `GET /walletcashin/query` (authoritative signed re-query) — [`selcom.ts:489`](../src/lib/server/selcom.ts#L489)
- the full `withdraw()` money flow — balance→hold, ledger, exactly-once, KYC + AML gates — [`wallet-service.ts:946`](../src/lib/server/wallet-service.ts#L946)
- webhook + reconcile settlement via `settleWithdrawalConfirmed`/`settleWithdrawalFailed`

Three things — **none of them "write the payout code"** — blocked real money from leaving:

1. **No float PIN.** Selcom had only issued Collections ("Customer to Business") creds. Wallet
   Cashin is a *separate product* that debits a **float account** and is authenticated by a
   **float PIN** (`PAYMENT_VENDOR_PIN`), never set. Without it, `selcomAdapter.withdraw` returns
   `PROVIDER_DOWN` at [`payments.ts:293`](../src/lib/server/payments.ts#L293) before any money
   moves. **← This is exactly what Selcom just granted.**
2. **Provider defaults to `mock`.** Even with creds, nobody flipped `/admin/payments` → `selcom`;
   the mock fabricates confirmations and pays nobody.
3. **Payouts ≥ 1,000,000 TZS are hard-blocked.** `approveAmlAction` deliberately refuses
   ([`aml/actions.ts:136`](../src/app/admin/aml/actions.ts#L136)) because the old code marked a
   payout "sent" *without* dispatching to the gateway — destroyed money. So 1M–5M withdrawals
   cannot complete at all today.

> Terminology: "cashout"/"sell" elsewhere in the repo (`sell-button.tsx`, `cashoutEntries`) =
> exiting a bet position early (internal balance only). That is a **different feature**. This
> doc is about **withdrawal / payout** = money OUT to mobile money.

---

## 2. Decisions (locked)

| # | Fork | Decision |
|---|------|----------|
| 1 | Same account + PIN, or separate disbursement creds? | Support **both** via `selcomDisburseEnv()` with optional `PAYMENT_DISBURSE_*` overrides that fall back to the deposit creds. Non-breaking either way. |
| 2 | Per-MNO utilitycode vs universal `CASHIN` | Keep the confirmed codes (`VMCASHIN`/`AMCASHIN`/`TPCASHIN`); route the two **unverified** ones (HaloPesa, TTCL) through universal **`CASHIN`** (Selcom MNP auto-route) until Selcom confirms `HPCASHIN`/`TTCASHIN`. |
| 3 | Payee name confirmation | **Add** `walletcashin/namelookup` → show the registered payee name in the confirm modal before dispatch. |
| 4 | Float balance visibility | **Add** `vendor/balance` read to `/admin/payments`. A dry float = every payout FAILS silently. |
| 5 | AML ≥ 1M payouts | **Implement** approve → dispatch → PROCESSING → settle. Unblocks 1M–5M and removes the destroyed-money risk. |
| 6 | `BANK_TRANSFER` (offered in the withdraw UI, unwired → `PROVIDER_DOWN`) | **Remove** from the withdraw list for launch (mobile-money only). Selcom **enabled Qwiksend** (bank payout) on our account too (email 2026-07-27) — wire it as a fast-follow (`/v1/qwiksend/process` + bank-shortcode list + `qwiksend/lookup` name check + bank/account UI). No longer Selcom-blocked; implementation work only. |

---

## 3. Phase 0 — Configuration (operational, unblocks payouts, ZERO code)

Confirm with Selcom / obtain:
- Wallet Cashin **enabled** on our account (or the separate disbursement account's creds — confirm which).
- The **float account** funded, and its **float PIN**.
- Confirmed utilitycodes per MNO we pay (esp. HaloPesa / TTCL).
- Our **Railway egress IPs allow-listed for disbursement** too: `162.220.232.250`, `152.55.176.240`, `152.55.177.181`.
- Any daily/transaction **disbursement limits** or float-account KYC/AML requirements.

**CONFIRMED by Selcom (email 2026-07-27, Masanja Paul): the SAME API credentials used for collection
are used for disbursement**, with both `wallet-cashin` and `qwiksend` enabled. So no separate creds —
set **only `PAYMENT_VENDOR_PIN`**. (`selcomDisburseEnv()` + the `PAYMENT_DISBURSE_*` fallback rows
below stay in for robustness but will be unused.)

> ### 🔧 Implementation progress (2026-07-27)
> Verified against production env (read-only): all four deposit creds + `SELCOM_WEBHOOK_SECRET` +
> `PAYMENT_WEBHOOK_URL` are set; the **only missing variable is `PAYMENT_VENDOR_PIN`**.
> - **Phase 1 — DONE + tested:** `selcomDisburseEnv()` (same-creds default + `PAYMENT_DISBURSE_*` fallback),
>   HaloPesa/TTCL routed via universal `CASHIN`, adapter + `verifyWithdrawalStatus` wired to it. `.env.example`
>   completed. `test:selcom` 65/0.
> - **Phase 2 — DONE + tested:** AML approve now DISPATCHES (`dispatchApprovedWithdrawal`): AML_REVIEW →
>   PROCESSING → gateway → exactly-once settle; two-officer gate kept; Approve button re-enabled; provider
>   refusal reverts to review (no auto-refund). `test:payments` 47/0. The old "approval destroys money" block is gone.
> - **Phase 3 — DONE:** withdrawal money-grade UX + notifications. Confirm modal shows the destination phone
>   **and the registered payee name** (best-effort `walletcashin/namelookup`, never blocks a payout);
>   `BANK_TRANSFER` removed (mobile-money only); msisdn required consistently client+server; the "payout sent"
>   email is a proper terminal receipt (amount, destination + phone, both references, wallet CTA, ref-note) and
>   AML SLA copy is consistent across surfaces; float-balance readout + low-float warning on `/admin/payments`.
>   Full suite green: `tsc` clean, `build` OK, `test:all` all suites pass.
>
> **Prod state (verified 2026-07-27, read-only):** active provider = `selcom` (via `PAYMENT_AGGREGATOR`),
> gateway configured, money-mode = TEST (`TEST_FUNDING` on). **`PAYMENT_VENDOR_PIN` is NOT set** — the one
> remaining gate. Once the float PIN is set (and the float is funded), a real payout can be tested end-to-end.
>
> ⚠️ **LAST OPEN ITEM — the float PIN.** "Same API credentials" covers API key/secret/vendor. Wallet
> Cashin additionally requires a `pin` field = the **float-account PIN**, plus a **funded float
> account**. Confirm with Selcom: (a) the float PIN value, and (b) that the float is funded/how to top
> it up. **This is the only thing still gating a real payout.** The PIN is a secret → set it straight
> in the Railway dashboard, never in chat or git.

Then set env (Railway `50pick` service, secret — never in git):

| Env var | Purpose |
|---|---|
| `PAYMENT_VENDOR_PIN` | float-account PIN — the one required var if disbursement is on the **same** account |
| `PAYMENT_DISBURSE_VENDOR_ID` | *(only if a separate account)* disbursement vendor/till id |
| `PAYMENT_DISBURSE_PIN` | *(only if a separate account)* its float PIN |
| `PAYMENT_DISBURSE_URL` / `_API_KEY` / `_API_SECRET` | *(only if separate creds)* each falls back to the deposit `PAYMENT_*` var when unset |

Then: flip provider → `selcom` in `/admin/payments` (also turns on real **deposits**) and run the
admin **Test Selcom** button (`selcomPing`, moves no money) from the allow-listed IP.

---

## 4. Phase 1 — Code: separate-cred safety + verified routing (small)

- **`src/lib/server/selcom.ts`** — add `selcomDisburseEnv(): SelcomEnv | null` (reads `PAYMENT_DISBURSE_*`,
  each falling back to the deposit var; single-account setup needs only `PAYMENT_VENDOR_PIN`).
  In `mnoToSelcomCashin` ([`selcom.ts:144`](../src/lib/server/selcom.ts#L144)) return `"CASHIN"` for
  `HALO_PESA` and `TTCL_PESA` until Selcom confirms `HPCASHIN`/`TTCASHIN`.
- **`src/lib/server/payments.ts`** — `selcomAdapter.withdraw` ([`payments.ts:290`](../src/lib/server/payments.ts#L290))
  and `verifyWithdrawalStatus` ([`payments.ts:326`](../src/lib/server/payments.ts#L326)) use
  `selcomDisburseEnv()`. Deposit path untouched.
- Tests/docs: extend `scripts/selcom-adapter.test.mts` for the new mappings + fallback (keep the golden
  signing vector intact); update `.env.example` (currently stale — missing `PAYMENT_VENDOR_ID`,
  `PAYMENT_API_URL`, `PAYMENT_VENDOR_PIN`, and the new `PAYMENT_DISBURSE_*`).

## 5. Phase 2 — Code: AML approve → dispatch (the substantial change)

Rebuild `approveAmlAction` in [`aml/actions.ts`](../src/app/admin/aml/actions.ts) exactly as its own
comment prescribes ([`aml/actions.ts:157`](../src/app/admin/aml/actions.ts#L157)):
1. Keep the two-officer co-sign (`TWO_PERSON_THRESHOLD_TZS`), self-review block, and TOCTOU lock (all present).
2. On final approval: dispatch to the gateway → set txn `PROCESSING` with a **real** `providerRef`, **keep the hold**.
3. Let `settleWithdrawalConfirmed`/`settleWithdrawalFailed` ([`wallet-service.ts:506`](../src/lib/server/wallet-service.ts#L506)) own the terminal state via webhook + reconcile (hold-release + ledger + notification, atomic).
4. A DEPOSIT held in AML → correct action is a **refund**, not approve.

Note: `dispatchWithdrawal` short-circuits to `AML_REVIEW` *before* the adapter
([`payments.ts:143`](../src/lib/server/payments.ts#L143)); the approve path must bypass that branch
(dispatch the already-reviewed payout directly). Reconcile the cap mismatch (schema 5M vs AML hold
1M — with dispatch working, 1M–5M correctly routes through review). Add an AML approve→dispatch→settle
case to `scripts/payment-webhook.test.mts`.

## 6. Phase 3 — Money-safety + ops (recommended, not launch-blocking)

- **Payee name lookup** — `selcom.ts` add `selcomCashinNameLookup()` → `GET /v1/walletcashin/namelookup`;
  show the returned name in the withdraw confirm modal ([`withdraw-confirm.tsx`](../src/app/wallet/withdraw/withdraw-confirm.tsx)).
- **Float balance** — `selcom.ts` add `selcomFloatBalance()` → `POST /v1/vendor/balance`; surface remaining
  float on `/admin/payments` ([`control-plane.tsx`](../src/app/admin/payments/control-plane.tsx)) with a low-float warning.
- **Remove `BANK_TRANSFER`** from the withdraw provider list ([`page.tsx`](../src/app/wallet/withdraw/page.tsx) / provider grid / `WithdrawSchema`).

---

## 7. Verification (end-to-end)

1. `npm run test:selcom` · `test:payments` · `test:payment-control` · `test:withdrawal` · `test:webhook-sec` — all green.
2. `npm run e2e:money` — ledger drift must be `0.00`.
3. Real: one **small** payout (~1,000 TZS) to a controlled MPESA number with provider=`selcom` → confirm it
   lands, txn → CONFIRMED via `walletcashin/query`, hold released, reconciliation drift = TZS 0.
4. One **≥ 1M** withdrawal → AML queue → two-officer approve → confirm it **dispatches** and settles (not the old "marked sent, no money").
5. Confirm the reconcile sweep (`reconcileStalePayments`) resolves a stalled PROCESSING payout via signed re-query and never blind-reverses an AMBIGUOUS one.
6. `/admin/payments`: Test Selcom OK; float balance visible; per-MNO kill-switch pauses withdrawals.

## 8. Critical files
- `src/lib/server/selcom.ts` · `payments.ts` · `wallet-service.ts` · `src/app/admin/aml/actions.ts` ·
  `src/app/api/webhooks/payments/route.ts` · `src/app/wallet/withdraw/*`
- Tests: `scripts/selcom-adapter.test.mts` · `payment-webhook.test.mts` · `payment-control.test.mts`
- Related docs: [`SELCOM-DISBURSEMENT-REQUEST.md`](SELCOM-DISBURSEMENT-REQUEST.md) ·
  [`SELCOM-API-DIGEST.md`](SELCOM-API-DIGEST.md) · [`GO-LIVE-CONTINUATION-PROMPT.md`](GO-LIVE-CONTINUATION-PROMPT.md) ·
  [`LIVE-HOSTING-STATUS.md`](LIVE-HOSTING-STATUS.md)
