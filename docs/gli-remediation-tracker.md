# GLI Remediation Tracker — 50pick (Kipindi)

> **Live status** for GLI-certification work — the "done / not done" companion to the authoritative
> spec in [`gli-remediation-plan.md`](gli-remediation-plan.md). Reconciles that plan with a fresh
> **line-level code audit** (2026-07-06) that superseded the earlier 2026-07-03 analysis (now
> deleted — it marked several items "PASS" that the code disproves; the code wins).
>
> Standards: **GLI-33 v1.1** (Event Wagering) + **GLI-19 v3.0** (Interactive Gaming) +
> **GLI-27** (network security). RNG N/A for outcomes (human two-officer event resolution);
> CSPRNG rules still apply to security tokens.
>
> **Status legend:** `[ ]` MISSING · `[~]` PARTIAL (works but has a real gap) · `[x]` DONE.
> Update this file after every ticket (status + commit hash). It travels via git.

---

## Reality check vs the 2026-07-03 doc

The old gap analysis marked these **PASS** — the code audit says otherwise:

- **Marketing/bonus suppression** is NOT tied to self-exclusion. `email-suppression.ts` is a
  Postmark bounce/complaint list only; `bonus-service.grantBonus` and `invite-service` send with
  no RG check. A self-excluded user still gets bonuses + marketing. → **MISSING** (3.3).
- **Loss-limit** and **session-time-limit** are stored/displayed but **never enforced** at bet
  time. → **MISSING** (3.3).
- **Deposit-while-excluded auto-refund** does not exist; async deposit confirm doesn't re-check
  lockout. → **MISSING** (3.4).
- **"Permanent" self-exclusion** is a 100-year timer, not a true irreversible flag. → PARTIAL.
- **`global-error.tsx`** (replaces root layout) has no RG helpline/self-exclusion footer. → gap.

Everything the old doc lists under Fairness, Audit chain, Two-officer settlement, Idempotency,
Session revocation, RBAC, HSTS/headers is confirmed accurate.

---

## SPRINT 1 — Certification blockers (build-now, no external contract)

| ID | Item | Sev | Status | Evidence / what's left |
|----|------|-----|--------|------------------------|
| 1.1 | **Geo-fence to Tanzania** at bet/deposit/withdraw money actions + audit rejects; allowlist in SystemConfig; block datacenter/VPN ASNs | Blocker | `[ ]` | No geo logic anywhere (`proxy.ts` auth-only). **Needs data-source decision (MaxMind GeoLite2 vs API).** |
| 1.2a | **`/api/version`** returning `{version,gitSha,buildHash,builtAt}` injected at build | Blocker | `[ ]` | No endpoint; `next.config.ts` injects nothing. Pure code — do now. |
| 1.2b | **Disable Railway auto-deploy from `main`**; prod from tagged releases; `main`→staging; GitHub Actions CI runs `predeploy` | Blocker | `[ ]` | Needs Railway dashboard + CI. **Changes push-to-main workflow — needs decision.** Also old-doc B4. |
| 1.3 | **Late-bet race hardening** — re-check `isSelectionClosed(fresh)` + status LIVE + `resolutionAt` INSIDE `withLock(market:{id})` before applying the pool `+=`; unwind (refund + drop position) if closed | High | `[~]` | Pre-lock check exists (`market-service.ts:289-290`) but is NOT re-validated inside the market lock (`:360`); microsecond/concurrent-close race can still commit. |
| 1.4a | **Void on `/fairness`** — VOIDED markets (reason + officers) shown on public page | High | `[~]` | `fairness/page.tsx:28` lists RESOLVED only; voids invisible. |
| 1.4b | **Emergency-void = two-officer** (currently single-officer by design) OR document as a logged break-glass control acceptable to GBT | Med | `[~]` | `resolveMarket("VOID")` is two-officer ✓; `emergencyVoidMarket` stamps one id into both stages. **Needs decision.** |
| 1.4c | Publish concrete void policy (postponed/ambiguous/created-in-error → full refund) in T&Cs + market rule card, EN/SW/FR | Med | `[~]` | Terms S6 is generic; make it specific + trilingual. |
| 1.5 | Disable demo auto-resolve path in the certified (prod) build | High | `[ ]` | Confirm `NODE_ENV`/config gate so it cannot exist in prod build. |

## SPRINT 2 — Money truth: ledger flip + settlement durability

| ID | Item | Sev | Status | Evidence / what's left |
|----|------|-----|--------|------------------------|
| 2.1a | **Wallet-vs-ledger reconciliation job** (per-user `Wallet.balance` vs Σ LedgerEntry) + alert on drift | Blocker-class | `[ ]` | `reconcileLedger()` only checks each group sums to 0 and is **never invoked**. No wallet-vs-ledger compare. |
| 2.1b | **Flip balance READS to the ledger** after 7 clean days; keep legacy as shadow one release | Blocker-class | `[ ]` | All reads still hit `Wallet.balance`. |
| 2.1c | **Breakage/rounding account** — book cross-position rounding residue, never strand in pool | High | `[ ]` | Residue stranded in `POOL:{marketId}` forever; chart-of-accounts has no breakage acct. |
| 2.2 | **Durable settlement via pg-boss outbox** — resumable, exactly-once; per-Position settlement record `@@unique([positionId])`; emails/notifications → outbox jobs | High | `[ ]` | No queue/outbox; fan-out inline best-effort (`resolveMarket`), `.catch(()=>{})`. |
| 2.3a | **Settlement durability** — don't flip market RESOLVED before payout loop; make loop atomic/resumable | High | `[ ]` | Market set RESOLVED at `:1049` before loop; crash mid-loop = unpaid winners, no resume. |
| 2.3b | Incomplete-bet idempotency (same key = one Position/one debit, safe retry) | High | `[x]` | Enforced in `buyPosition` under wallet lock + `Position.idempotencyKey @unique`. |

## SPRINT 3 — Disclosure + RG hardening + audit durability

| ID | Item | Sev | Status | Evidence / what's left |
|----|------|-----|--------|------------------------|
| 3.1a | Bet slip shows **per-side pool totals** before confirm | High | `[ ]` | Detail shows combined volume + implied %, no per-side TZS. |
| 3.1b | Show **9% margin** numerically at point of confirm | High | `[ ]` | Not rendered; **contradicts** terms page claim it is shown. |
| 3.1c | **Indicative dividend/payout** at current pools pre-confirm | High | `[ ]` | **Deliberately suppressed** ("license review 2026-05"). **Needs legal decision — conflicts with Fable.** |
| 3.1d | Wager receipt: **second-precision timestamp** (already has unique ID) | Med | `[~]` | Stored to the second; displayed minute-precision (`utils.ts` formatter). |
| 3.2 | Complaints/dispute page w/ GBT escalation; license no. in footer; withholding tax shown on withdrawal receipt | Med | `[~]` | Footer + helpline present; add dispute page + tax line. |
| 3.3a | **Marketing/bonus suppression hard-gate tied to RG state** — one guard consulted by every marketing email + bonus grant + invite/campaign send | High | `[~]` | **Bonus grants now suppressed** for self-excluded/cooling-off users in `creditBonus` (all incentive sources route through it) + COMPLIANCE audit. Remaining: invite/campaign cold sends + an every-marketing-email choke point. |
| 3.3b | **Enforce loss-limit** at bet time; **enforce session-time-limit** server-side | High | `[~]` | **Loss-limit now enforced** in `buyPosition` via `checkLossLimit` (rolling-24h net real loss = −Σ BET_PLACED/BET_PAYOUT/BET_REFUND/CASHOUT, blocks before any debit, COMPLIANCE audit) + `sumGamblingNetSince` in both DALs + `test:loss-limit` (7/7). Session-time-limit still not enforced. **Policy to confirm w/ Ali: open stakes count as loss.** |
| 3.3c | **Permanent self-exclusion** as a true irreversible flag (not 100yr timer); no self-service reactivation | Med | `[~]` | 100yr timer; block reactivation confirmed absent (good). |
| 3.4 | **Deposit-while-excluded auto-refund** (re-check lockout in async deposit confirm; refund even on stub provider) | High | `[x]` | `settleDepositConfirmed` re-checks `isLockedOut` inside the wallet lock → marks txn `REVERSED`, no credit, COMPLIANCE audit. Real reversal for a live aggregator = D1. |
| 3.5a | **Scheduled audit-chain verification + alerting** (not on-demand only) | High | `[ ]` | `verifyChain*` on-demand only; persisted to PG ✓. |
| 3.5b | **Off-host signed chain-head digest** (S3/R2/WORM) so a DB admin can't silently re-chain | High | `[ ]` | Chain lives only in the same Postgres; env secret. |
| 3.5c | RG footer on **`global-error.tsx`** + confirm on 404/500 + emails | Med | `[x]` | Helpline (0800 11 0011) + Responsible-gaming link + GBT license line added to `global-error.tsx`, EN/SW/ZH. 404/500 already inherit the public footer; emails carry helpline. |
| 3.6 | **NTP/clock-drift monitor** (DB now() vs reference) + alert; UTC store/EAT display confirmed | Med | `[~]` | UTC/EAT ✓; no drift monitor. |
| 3.7 | Match-integrity **volume-anomaly auto-suspend** wired to `MatchIntegrityCheck` (compensating control for deferred Sportradar) | Med | `[ ]` | Stub adapter only. |

## SPRINT 4 — Security, KYC storage, identity, evidence pack

| ID | Item | Sev | Status | Evidence / what's left |
|----|------|-----|--------|------------------------|
| 4.1 | **KYC docs → object storage** (R2/S3, encrypted, signed URLs, access-logged) | High | `[ ]` | Currently base64 data-URL **inline in DB** (`kyc-service.ts:197`) despite "object storage key" comment. Old-doc H5. Blocked on R2 bucket (cheap, no contract). |
| 4.2 | **Interim NIN format policy** (Section B of Fable brief): normalize 20-digit, parse embedded DOB, age≥18, DOB-match to registration, `@@unique` on normalized NIN, `verificationLevel FORMAT\|AUTHORITATIVE`, admin-queue label | Blocker-class | `[~]` | Mock passes; 20-digit regex; app-level uniqueness (race-prone) but **no DB `@@unique`**; no embedded-DOB parse. Pure code + migration — do now. |
| 4.3 | **Sanctions screening** — nightly batch vs UN consolidated list → AntiFraudFlag | Med | `[ ]` | Only NIDA-mock `.endsWith("0000")`; legal copy claims OFAC/EU/HMT but no real screen. |
| 4.4a | **Audit event on cookie tamper** (bad-HMAC currently returns null silently) | Med | `[~]` | `verifySession`/`proxy` reject but don't audit. |
| 4.4b | **HMAC key versioning** (kid in cookie) for `SESSION_SECRET` rotation without mass logout | Med | `[ ]` | Single secret, no kid. |
| 4.4c | Replace `Math.random` record IDs in `audit.ts:237` + `privacy.ts:58` with `randomId()` | Low | `[ ]` | Non-security IDs; low collision risk; tidy for CSPRNG memo. |
| 4.4d | App-layer encryption for NIN/high-sensitivity PII columns | Med | `[ ]` | Stored plaintext. |
| 4.4e | Session-ID rotation on **privilege elevation** (login rotation already done) | Med | `[~]` | Login rotation ✓; no mid-session step-up rotation. |
| 4.5a | **Sentry + structured logging + alerts** (settlement fail, chain break, recon drift, mass auth fail, NTP drift, ProviderHealth) | Blocker | `[ ]` | None wired (`instrumentation.ts` stdout only). Old-doc B2. |
| 4.5b | **PITR backups verified** + restore drill (RTO evidence) | Blocker | `[ ]` | Ops task on Railway. Old-doc B1. |
| 4.5c | **Formal DR runbook** + incident-response plan w/ GBT notification thresholds | Blocker | `[ ]` | Old-doc B3. Documentation. |
| 4.5d | TOTP replay protection (track last-used counter) | Med | `[~]` | Reusable within 30s window. Old-doc M4. |
| 4.5e | `audit_writer` INSERT-only Postgres role for AuditLog | High | `[ ]` | Same role reads+writes. Old-doc H4. |
| 4.5f | Book external penetration test (long lead — book now) | Med | `[ ]` | Old-doc M1. |
| 4.5g | Redis-backed rate limiter (survives restarts) | High | `[ ]` | In-memory today. Old-doc H1. |

## DECISIONS — RESOLVED 2026-07-06 (Ali)

> **Scope signal:** GLI will **log in as users and hands-on test live behaviour/performance** — they
> are NOT reviewing source code or build process this round. So prioritise **user-facing, black-box
> observable** gaps (geo, RG enforcement, late-bet, disclosure, registration/age, error handling).
> De-prioritise code-review/ops items (CI, build-integrity, ledger-flip internals) for this round.

1. **Geo data source** → No Cloudflare; staying on Railway as-is. Use a **self-hosted, offline
   IP→country DB bundled in the app** (`geoip-lite`, MaxMind GeoLite2 data shipped in-package — no
   external service, no account, works on Railway). Country allow-list `["TZ"]` in SystemConfig.
   ASN/VPN datacenter blocking = later enhancement. Drives 1.1.
2. **Payout display** → **Pools + 9% margin at confirm; payout figure stays hidden.** Keeps the
   2026-05 legal suppression. Drives 3.1a/3.1b (do), 3.1c (do NOT show dividend figure).
3. **Deploy/CI (1.2)** → **DEFERRED this round** — GLI won't see code/build. Revisit before formal
   lab submission. 1.2a `/api/version` still cheap-nice-to-have but not prioritised.
4. **Emergency-void (1.4b)** → Ali chose "Other" (unspecified). **Left as-is for now** (admin-only,
   not hit by user-testers); confirm direction later. Keep it fully audited + reason-required.

### Execution order for THIS round (user-facing, black-box)
1. RG enforcement: marketing/bonus suppression tied to RG (3.3a), loss-limit + session-limit
   enforcement (3.3b), deposit-while-excluded auto-refund (3.4), global-error RG footer (3.5c).
2. Late-bet race hardening (1.3).
3. Disclosure: per-side pools + 9% margin at confirm, second-precision receipt (3.1a/b/d).
4. Interim NIN policy + age hardening (4.2).
5. Geo-fencing at money actions via geoip-lite (1.1).
6. Cookie-tamper audit event (4.4a) + prod error hygiene (4.5a partial).
Deferred to a later round: 1.2 (CI/deploy), 2.1/2.2 (ledger flip + outbox), 4.5b/c (PITR/DR), pentest.

## APPENDIX D — Deferred, blocked on third-party contracts (NO engineering now)

Payment aggregator (Selcom/Azampay/Pesapal), SMS/OTP (Beem/AT/Twilio), authoritative NIDA mTLS,
Sportradar feed, live AI market generation. Keep interfaces clean; commercial action only.

---

*Full ticket specs + acceptance criteria: [`gli-remediation-plan.md`](gli-remediation-plan.md)
(Sections A–D). Pre-audit self-test checklist: Section C of that file.*

---

## Session log

- **2026-07-06** — Consolidated GLI docs to two files; line-level code audit; decisions resolved
  (GLI tests live-as-users, no Cloudflare, payout figure stays hidden). Shipped RG-enforcement slice 1
  (commit `0366caf`): bonus suppression for excluded users (3.3a partial), deposit-while-excluded
  auto-reversal (3.4), global-error RG footer (3.5c). Typecheck + bonus/wallet suites + build green.
- **2026-07-06** — RG-enforcement slice 2: daily loss-limit enforcement (3.3b) — `checkLossLimit`
  + `sumGamblingNetSince` in in-memory store & Prisma DAL, gate in `buyPosition`, new
  `test:loss-limit` (7/7). Typecheck + build green.
  Verify still to run (live, self-test §C): item 10 (excluded deposit→reversed; excluded user→no bonus),
  item 12 (loss limit → bets rejected). Next: session-time-limit enforcement, late-bet race (1.3).
