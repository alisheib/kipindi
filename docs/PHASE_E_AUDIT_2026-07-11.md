# Perfection-plan Phase E — Security · Compliance · Money-safety audit (2026-07-11)

> Driven this session against `main`. Three parallel deep-audit lanes (authz,
> money-safety, compliance) + direct env/secret/dev-route/reconciliation checks.
> **6 findings fixed + shipped this session; the rest are ranked and flagged
> below with the exact remediation.** This is the Phase E record for
> `docs/perfection-plan.md` §Phase E.

## Method
- **Lane A — authz/role matrix:** every server action (27 `actions.ts`) + every
  prod API route (10) + the gate primitives; positive + negative.
- **Lane B — money-safety:** every money path (deposit/withdraw/bet/cashout/
  resolve/void/refund/bonus/referral/tax) for conservation · no-negative ·
  idempotency · concurrency · audit.
- **Lane C — compliance:** never-fabricate scan · two-officer distinct-officer ·
  audit-chain · RG-on-every-money-path · PII masking · regulator-report honesty.
- **Direct checks:** secret/env prod-locks · all 32 dev-test routes 404 in prod ·
  money reconciliation via the suites (money-invariants 72/72, ledger 69/69,
  concurrency 15→19/19, audit-chain 15/15, officer-conflict 17/17).

## Passed (no action needed)
- **Secrets/env** — SESSION_SECRET / OTP_PEPPER fatal in prod; AUDIT_CHAIN_SECRET
  must be set & distinct; SX_REGISTER_SALT + per-provider webhook secrets refuse
  in prod (fail-closed). Payments webhook = HMAC + timestamp replay window,
  idempotent, sole crediter.
- **Dev-test surface** — all 32 `src/app/api/dev-test/**` routes + `/auth/demo`
  early-return 404 when `NODE_ENV==="production"` (incl. seed-admin, promote-admin).
- **Two-officer** — resolve (distinct stage-2), report-pack (preparedBy≠approver),
  high-risk KYC (recommender≠approver) all enforce server-side.
- **RG** — deposit + bet + bonus + login all gate on self-exclusion/limits.
- **Money conservation/idempotency** — deposit, withdrawal settle, bet, resolve,
  one-sided/VOID refund, bonus grant/convert are conserved, guarded, audited.

---

## FIXED & SHIPPED this session (6)

| ID | Sev | Fix | Commit |
|---|---|---|---|
| **C1** | 🔴 CRITICAL | `cashOutPosition` now nests the `market:<id>` lock inside its wallet lock (wallet→market, the documented order) and re-validates position+market under it. Was holding only `wallet:<userId>` while mutating the pool + settling the position — a **prod-only** double-pay/mint + lost-update race vs `resolveMarket` (dev store hid it via shared object refs; Prisma returns fresh copies + absolute pool writes). Added concurrency case **D**. | `1a547b5` |
| **H1** | 🔴 HIGH | Prod-lock the officer-conflict / solo-resolution override: `getConflictedResolutionAllowed()` returns `false` in prod regardless of the stored flag; the setter refuses to persist ON in prod (audited). Was a two-officer bypass reachable in prod. Mirrors `ADMIN_TEST_DEPOSITS`. | `44f7f57` |
| **GAP-1** | 🟠 MED/HIGH | Proposal approval: added self-approval bar (officer≠proposer, audited) + re-tiered `approveProposalAction`→MONEY_ROLES and `saveProposalsConfigAction`→CONFIG_ROLES (were MARKET_OPS = includes MODERATOR → self-dealing bonus grant). Added self-approval test. | `9ad78f8` |
| **GAP-2** | 🟠 MED | TOTP step-up on `/api/admin/kyc-doc` (raw NIDA/selfie) + `/api/admin/reports/[id]` (regulator financials). Added non-redirecting `checkAdminTotp()` → 403 (redirect would corrupt image/download). | `7d966cd` |
| **M2 (compliance)** | 🟠 MED | Mask phone in the `user.registered` / login audit payloads (were raw E.164 → rendered unmasked in `/admin/audit` + ISO export). Masked at write; actorId still links to the user record. | `951725f` |
| **M1 (compliance)** | 🟠 MED | Regulator report signatures: `Reviewed by` / `Approved by` were pre-printed with role-label "names" (`Compliance Officer` / `AML Lead / MLRO`) reading as real signers. Now blank countersign lines; only `Prepared by` (real generator) stays filled. Verified both renderers. | `acbe69d` |

---

## FLAGGED for the next session (ranked; not fixed)

### 🔴 P0 — payments provider is a MOCK (unchanged, known)
`src/lib/server/payments.ts` — `dispatchDeposit` always CONFIRMED, `dispatchWithdrawal`
always succeeds; no BoT-licensed aggregator behind `/api/webhooks/payments`. The
**surrounding logic is sound** (webhook-authoritative, exactly-once, hold/release);
this is the credential+integration blocker. **C1's stranded-hold risk (below H1) becomes real money once this lands.**

### ✅ money-H1 — FIXED (`8b5a95a`, 2026-07-11)
Withdrawal idempotency key was checked pre-lock only → a concurrent same-key
withdrawal debited twice and the 2nd `txn.create` threw on the unique key after
the debit, stranding funds in `hold`. Now re-checked INSIDE the wallet lock
(mirrors buyPosition), returning the existing txn (exactly-once). Concurrency
case E added; verified red without the fix (3 txns, triple-debit).

### ✅ money-M2 — FIXED (`c16a22f`, 2026-07-11)
Affiliate reward payers (payBonus, payPrize, commission) did read-guard→credit→
record without a lock. Now each wraps the guard→credit→record in `withLock` (per
recruit / per referrer / per referrer:recruit) with the guard re-read inside, and
one-time rewards pass a deterministic `sourceRef` to `creditBonus` for cross-instance
dedupe. Concurrency case F added; verified red without the lock (3 prize records;
the sourceRef alone still held the money to 1× — defense in depth).

### 🟠 money-M1 — withdrawal tax charged on the whole amount incl. principal ⚠ POLICY
`payments.ts:88` / `wallet-service.ts:457` — `computeWithdrawalTax(amount, amount)`
= 15% of the **gross** withdrawal (comment concedes "naïve: assume entire amount
is taxable winnings"). Over-collects TRA withholding on the player's own deposited
principal. Conservation intact (tax→HOUSE:TAX), so not a mint/loss, but a
player-fairness + tax-correctness question. **This is a REGULATORY/TAX POLICY
decision — do NOT guess the model. Needs Ali + a TRA/tax view** on whether
withholding applies to net gaming winnings only. Then compute taxable winnings
from the bet ledger, not gross.

### ✅ compliance-H2 — FIXED (`c0d31cc`, 2026-07-11)
The GBT pack reported a rolling "Last 28 days" window under its calendar-month
label. Now `buildGbtMonthly(generatorId, packPeriod)` computes the exact EAT
calendar-month bounds (new `packPeriodBounds` in report-pack) and the analytics
helpers accept explicit `{start,end}` bounds (`Window` union; Period callers
unchanged). pack-actions threads the pack period through. Smoke-verified:
"June 2026 · 2026-06-01 → 2026-06-30 (EAT)".

### 🟡 money-M3 / L1 (reporting-accuracy, not real money)
- **M3** `ledger.ts:182-200` — POOL account balance can drift across settlement
  groups (payout rounded independently from per-bucket fee rounding). Each group
  nets zero so `reconcileLedger` passes, but `houseAccountBalances` is approximate.
  Ledger is secondary (Transaction table authoritative). Fix: derive ledger fee
  buckets from the same rounded numbers the wallet moved; add periodic POOL recon.
- **L1** `payment-ops.ts:131` — `reconcile()` "drift" is a providerRef-presence
  proxy (~always 0 by construction), not a PSP-settlement-file reconciliation.
  Inherent to the mock; replace with the real aggregator's settlement feed.

### 🟢 notes
- `/admin/audit` renders raw `JSON.stringify(payload)`; now safe because prod PII
  is masked at write (M2). If a future writer puts PII in a payload it would leak —
  consider a render-layer PII filter as defense-in-depth (low).
- Two MODERATORs alone can complete a two-officer market resolution (both hold
  MARKET_OPS). By design + audited; worth a regulator note. Money-refunding
  emergency-void is hardcoded ADMIN|COMPLIANCE.
- `verifyChain()` (in-memory, 10k window) anchors to `ring[0].prevHash`, not
  GENESIS; the regulator path uses `verifyChainFull()` from GENESIS. Ensure the
  admin "verify chain" UI uses Full for any compliance assertion.

## Exit-gate status (Phase E)
- ✅ tsc · `test:all` **45/45** (concurrency now 19/19 with case D) on the integrated tree.
- ✅ 6 findings fixed, each committed+pushed, Railway auto-deploying.
- ✅ money-H1 + money-M2 now FIXED (2026-07-11) with red-without-fix concurrency
  tests. Remaining before Phase E fully closes: H2 (GBT pack period), payments
  mock (P0), money-M1 tax policy — all need Ali/credentials or a policy call.
- Security-review of the diff + full authz-matrix negative-test suite = a good
  follow-on to close Phase E formally.
