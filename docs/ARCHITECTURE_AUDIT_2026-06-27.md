# Platform Architecture Audit — 2026-06-27

A full-platform follow-up across 7 lanes (design-system, navigation/mobile, money,
notifications, AI, compliance/auth, code-health). Overall the platform is mature
and well-disciplined; findings cluster in newer subsystems, mock↔real seams, and
hand-rolled UI. This doc records what was **fixed**, what is **deferred by
decision**, and the **launch-blocker checklist**.

## ✅ Fixed (shipped this session)

**Batch A — safety/correctness**
- `TEST_FUNDING` and `ADMIN_TEST_DEPOSITS` can no longer activate in production
  even if the env var leaks (hard-gated on `NODE_ENV !== "production"`; deposit
  page UI matches).
- DAL drift fixed: `store.kyc.findByUserId` returns the **newest** submission and
  `store.otp.findActive` selects **most-recent-first**, matching the Prisma DAL
  (no more "green tests, different prod" on KYC resubmission / OTP selection).
- `forgot-password` phone normalization uses the canonical `tzPhone` parser.
- `notify()` is self-protecting (a DB hiccup can't reject into money/auth callers).
- `AUDIT_CHAIN_SECRET` is required in prod and must differ from `SESSION_SECRET`.

**Batch B — AI cost guards + loader consistency**
- Chatbot: 15s request timeout; durable 10/day cap (survives deploys / instances).
- Admin route loader label is bilingual.

**Batch C — dual-channel money notifications** (owner decision: email + in-app for
all money events)
- Bonus **credited** (covers deposit cashback, invites, admin grants) and bonus
  **unlocked-to-cash** now email the player (new `bonusCreditedHtml` /
  `bonusFulfilledHtml`), on both the `recordWagering` and bet-placement paths.
- Source-of-Funds decision now emails the player (`sofDecisionHtml`), matching KYC.
- `cashback.failed` and `bonus.wagering_error` are now audited (no more silent loss
  of an owed cashback / a stalled turnover accrual).

## ⏸️ Deferred by owner decision
- **Withdrawal AML threshold + Source-of-Funds gate** — currently the AML hold is
  decided in the mock payment provider; SoF is enforced on deposits only. To do
  **with the real payment-provider integration**: move the `≥ threshold →
  AML_REVIEW` decision into `withdraw()` (provider-independent) and add the SoF
  gate to large withdrawals. (Owner: defer to launch checklist.)
- **AI credit cap stays alert-only** (does not hard-stop calls). By decision.

## 📋 Launch-blocker checklist (needs real vendors / infra — not code)
1. **NIDA** — `nida.ts` is a deterministic mock. Wire the real NIDA mTLS endpoint
   + a real sanctions/PEP screen before real-money launch.
2. **KYC documents** — stored base64 in the DB with prefix-only validation. Add
   magic-byte validation (JPEG/PNG/WEBP) and move binaries to object storage with
   signed URLs.
3. **Withdrawal AML/SoF gates** — see Deferred above (do with real payment rails).
4. **Multi-instance correctness** — `locks.ts` and `rate-limit.ts` are
   in-process. Swap to Postgres advisory locks / Redis (and Redlock) before
   horizontal scaling, or the serialization + brute-force ceilings weaken.
5. **Env on Railway** — confirm `NODE_ENV=production`, `TEST_FUNDING`/
   `ADMIN_TEST_DEPOSITS` unset/false, and a distinct `AUDIT_CHAIN_SECRET`.
6. **Withholding tax** — `computeWithdrawalTax` treats the whole withdrawal as
   taxable winnings; wire to the bet ledger for accuracy/fairness.

## 🔭 Follow-up consistency items (medium; safe but need careful per-file work)
- **Money credits not in the HMAC audit chain** — bet payouts (`resolveMarket`
  loop) and `creditInternal` write a Transaction row but no `audit()` entry. Add
  per-credit (or per-resolution summary) audit entries.
- **Payouts under market lock, not wallet lock** — `balanceAfter` ledger drift is
  possible under concurrency (no money loss; double-settle is guarded). Migrate
  per-position payouts to run under `wallet:<userId>` *after* the market lock
  (the bonus-refund path already does this).
- **Referral commission/bonus emails** — referral *prizes* email but commissions
  /bonuses are in-app only. Generalize `referralRewardHtml` for all three types.
- **Affiliate `creditBonus` sourceRef** — add `referral:<type>:<recruitId>` for
  defense-in-depth idempotency (soft-guarded today).
- **`MODERATOR` money authority** — currently in `ADMIN_ROLES` for AML release;
  split so finance/AML actions gate on `ADMIN`/`COMPLIANCE` only.
- **AML two-person check** reads the in-memory audit ring — query the durable
  `AuditLog` instead.
- **DAL: `bet.create`** throws in Prisma (missing window) but accepts in-memory;
  also `updatedAt` not bumped in several in-memory mutations. Align store.ts.
- **UI atoms** — withdraw/deposit money inputs use raw `<input>`; `kyc` +
  `source-of-funds` have duplicate local `Field()`; OTP inputs at 3 heights;
  `proposals` `StatusBadge` parallel to `<Chip>`. Consolidate onto the kit.
- **TZS formatting** — 3 implementations (`utils.formatTzs`, `email.fmtTzs`,
  inline). Consolidate.
- **`webhook.payment.settled` audit** skipped if settle throws (wrap to always
  audit the attempt).

## ✅ Verified-good (audit flags that were over-stated — left as-is)
- Market **resolve** + **emergency-void** controls already disable + show progress
  and are server-lock + idempotent — no real double-submit risk.
- `PageLoader` is **not** dead — it's the shared loader for ~11 player routes.
- Loader/empty-state/error-boundary **coverage** is comprehensive across all
  routes; the only inconsistency was style, now addressed where it mattered.
- Boot-safety (no AI/email/SMS on boot), webhook HMAC+replay+idempotency, audit
  chain, session/auth crypto, OTP brute-force defense, and the bonus
  money-invariants are all solid.

> Tests added this session: `deposit-cashback`, `email-stress` (predeploy),
> `marketing-invite-stress` (`qa:cards`). Full unit gauntlet, build, and
> typecheck green throughout.
