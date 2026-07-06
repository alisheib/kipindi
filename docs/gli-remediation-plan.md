# 50pick (Kipindi) — GLI Certification Remediation Plan (authoritative spec)

> **Canonical spec of record.** Ticket-level acceptance criteria for GLI remediation.
> Live status lives in [`gli-remediation-tracker.md`](gli-remediation-tracker.md) — this file is
> the "what & why & acceptance criteria"; the tracker is the "done / not done."
> Standards: GLI-33 v1.1 (Event Wagering) + GLI-19 v3.0 (Interactive Gaming) + GLI-27 (network
> security). GLI-13 N/A. RNG N/A for outcomes (human two-officer resolution); CSPRNG still applies
> to security tokens. **Do not spend engineering time on Appendix D (contract-blocked).**

Context: Tanzania-licensed (GBT, license in progress) pari-mutuel prediction market. Players stake
YES/NO into a shared pool per market; after a combined 9% operator margin (tax + commission from the
operator's cut, not the player pool), the net losing pool pays winners pro-rata. Outcomes are
real-world events resolved by a two-officer admin workflow against public sources. No RNG outcome.

---

## A. BUILD-NOW SPRINT PLAN

Severity: **Blocker** = fails cert outright · **High** = near-certain finding · **Medium** = likely finding.

### Sprint 1 — Certification blockers (no external dependencies)

#### 1.1 Geo-fencing to Tanzania — Blocker
- MaxMind GeoLite2/GeoIP2 country lookup run **inside the server actions / API routes for bet
  placement, deposit, withdrawal** — not only edge middleware. `proxy.ts` may short-circuit page
  access; authoritative check is server-side at the money action.
- Block datacenter/VPN/hosting ASNs (GeoLite2-ASN or ASN blocklist) for money actions.
- Persist geo verdict (country, ASN, IP hash, decision) on every wager/deposit/withdrawal; AuditLog
  entry (new AuditCategory `GEO`) for every **rejected** attempt.
- Country allowlist in `SystemConfig` (default `["TZ"]`), editable at `/admin/config`, no redeploy.
- Rejection UX: localized (EN/SW/FR) "not available in your region"; API stable error code, no detail.
- Tests: TZ→allowed; foreign→bet/deposit/withdraw rejected + audit; datacenter ASN→rejected;
  allowlist edit effective without redeploy.

#### 1.2 Change management & build integrity — Blocker
- Disable Railway auto-deploy from `main` for prod. Prod deploys **only from tagged releases**
  (GitHub Release `vX.Y.Z` → manual promote). `main` auto-deploys to **staging**.
- `/api/version` (public, no PII) → `{version, gitSha, buildHash, builtAt}` injected at build time;
  also on an admin screen.
- Required PR review on `main`; `CHANGELOG.md`; `RELEASE_CHECKLIST.md`. Prod migrations via reviewed
  `prisma migrate` only; forbid `db push` against prod (CI guard).
- Tests: `/api/version` matches deployed tag; CI blocks untagged prod deploys.

#### 1.3 Market close & late-bet enforcement — High (Blocker-adjacent)
- Enforce `closesAt` (`selectionClosedAt ?? resolutionAt`) **inside the bet-placement transaction**
  vs the DB/server clock, under `withLock("market:{id}")`. Never trust client time.
- Event-tied markets auto-close at event start (job + on-read). Admin instant-suspend (audited).
- Every rejected late-bet → AuditLog. Remove/disable demo auto-resolve from the prod build.
- Tests: bet at `closesAt−1s` accepted; at/after rejected atomically (no debit, no Position);
  suspend mid-flight rejects in-progress placements.

#### 1.4 Cancellation / void policy — High (GLI-33 §2.3.5)
- Publish the void policy (event postponed beyond deadline; source unavailable/ambiguous; created in
  error) in T&Cs **and** each market's rule card, EN/SW/FR.
- `voidMarket(marketId)` admin action (two-officer, like settlement): full stake refund to both
  sides, balanced ledger journals, notifications, status `VOIDED`, and a void entry on public
  `/fairness`.
- Tests: void a two-sided market → every stake refunded to the shilling, ledger balances,
  notifications queued, /fairness shows the void with officers + reason.

### Sprint 2 — Money truth: ledger flip + settlement durability

#### 2.1 Flip LedgerEntry to source of truth — Blocker-class
- Hourly reconciliation: per-user `Wallet.balance` vs Σ(LedgerEntry) + a global invariant. Any diff →
  alert + AuditLog.
- After 7 clean days: flip balance **reads** to the ledger; keep legacy writes as shadow one release;
  then remove legacy authority.
- Chart of accounts: player wallets, per-market pool, operator commission, TRA tax accrual, GBT levy
  accrual, withholding-tax accrual, **breakage/rounding remainder**. Every settlement emits one
  balanced journal; rounding remainders explicitly booked, never dropped.
- Regulator reports derive from the ledger after the flip.
- Tests: property test — for any market lifecycle Σdebits=Σcredits; winners' credits match pro-rata
  exactly; commission splits match configured rates.

#### 2.2 Durable settlement via pg-boss outbox — High
- Add pg-boss (Postgres-backed, no new infra). Settlement = resumable job: per-Position settlement
  record with `@@unique([positionId])` (idempotent credit), then enqueue notification jobs.
- All financial/RG emails + notifications move from inline best-effort to outbox jobs with retry +
  dead-letter visibility in admin.
- Kill-test: `kill -9` mid-settlement of a 500-position market → restart → every winner paid exactly
  once, no duplicates, no misses.

#### 2.3 Incomplete-bet recovery — High
- E2E idempotency: same key across a timeout+retry → exactly one Position, one debit. **(Already
  implemented — keep the regression test.)**
- Surface "last transaction status" on reconnect so a player is never in doubt after a dropped
  connection. Playwright test that aborts mid-request.

### Sprint 3 — Disclosure, RG hardening, audit durability

#### 3.1 Pre-stake disclosure & wager record — High (GLI-33 §2.3.4)
- Bet slip before confirm: current pool totals per side, indicative dividend at current pools, the 9%
  margin, and the rule card (proposition wording, source URL, resolution deadline, void conditions,
  close time). Explicit confirmation step (already present).
- Wager receipt: unique ID, timestamp **to the second** (UTC stored, EAT displayed), market, side,
  stake, payout basis (pari-mutuel pro-rata after 9% margin).
- Balance always visible; wager > balance impossible server-side (verify existing guard).
- **NOTE (conflict):** current code deliberately suppresses the indicative payout figure
  pre-resolution ("license review 2026-05"). Resolve with Ali/GBT before implementing 3.1's dividend.

#### 3.2 Information-to-player — Medium
- Language-parity audit of T&Cs, market rules, RG pages across EN/SW/FR.
- Complaints/dispute page with GBT escalation contact.
- RG footer (help-line, self-exclusion link, GBT messaging) on **every** screen incl. 404/500 and in
  every email. License number + "Licensed by the Gaming Board of Tanzania" in footer (placeholder).
- Withholding tax disclosed before withdrawal; exact computation on the withdrawal receipt.

#### 3.3 Responsible-gambling hardening — Medium/High
- **Marketing suppression hard-gate**: one guard consulted by every Postmark send, bonus grant, and
  invite/campaign path — self-excluded or cooling-off users get zero marketing and zero bonus offers
  (transactional safety emails still allowed).
- Deposit-arrives-while-excluded auto-refund: implement now against the stub INTERNAL provider (real
  webhook plugs in later, D1).
- **Permanent self-exclusion** as a true irreversible flag (not a 100yr timer); no self-service
  reactivation for any exclusion.
- **Enforce loss-limit at bet time and session-time-limit server-side** (both currently collected but
  not enforced). Verify all RG gates enforced server-side in the actions; add tests proving direct-API
  attempts fail.

#### 3.4 Audit-chain durability & time — Medium/High
- Scheduled audit-chain verification (chain walk) with alerting on any break.
- Daily signed chain-head digest exported **off-host** (S3/R2 object-lock/WORM).
- NTP drift monitor: DB now() vs NTP reference; alert past threshold (~2s). UTC storage; EAT display.
- Written log-retention policy: financial/audit ≥ 5y; export path documented; logs shipped off-host.

#### 3.5 Match-integrity compensating control — Medium
- Volume-anomaly rule on `MatchIntegrityCheck`: unusually one-sided stake volume near close →
  auto-suspend + flag. Documented compensating control for the deferred Sportradar feed (D4).

### Sprint 4 — Security, KYC storage, incident handling, evidence pack

#### 4.1 KYC document storage — High (no external identity provider needed)
- Replace the storage-key stub: uploads → S3/R2 with server-side + app-layer encryption; access via
  short-lived signed URLs only. Every admin view/download writes an AuditLog access entry. Retention
  schedule per record; deletion admin-only + audited.

#### 4.2 Interim NIN policy — implement per **Section B** below.

#### 4.3 Sanctions/PEP screening — Medium
- Nightly batch vs UN consolidated sanctions list (public) → AntiFraudFlag + review status. PEP later.

#### 4.4 Security hardening — Medium (pen-test prep)
- Rotate session ID on login **and** privilege elevation; reject tampered cookies with an audit event
  (tests: byte-flip, expiry edit, user-ID swap → 401, no leak).
- HMAC key versioning (kid in cookie) so `SESSION_SECRET` rotates without mass logout; documented.
- App-layer encryption for NIN + high-sensitivity PII columns.
- Consider IP-allowlisted/separate hostname for `/admin`.
- CSPRNG audit: every token uses crypto/WebCrypto, never `Math.random` — grep + fix + note in the
  RNG-N/A memo.
- Dependency patch pass; enable Renovate.

#### 4.5 Incident handling & ops evidence — Medium/Blocker
- Prod error hygiene: generic pages/envelopes with correlation ID only; no stack/PII in any 4xx/5xx.
- Written incident-response plan incl. GBT notification thresholds. Formal DR runbook.
- Alerting (Sentry) for: settlement job failure, audit-chain break, reconciliation diff, mass auth
  failures, NTP drift, ProviderHealth degradation.
- PITR restore drill (restore yesterday's DB to a scratch instance; document RTO). Verify backup
  encryption. `audit_writer` INSERT-only Postgres role. Redis-backed rate limiter.
- Documents: MICS, RNG-N/A memo (CSPRNG audit attached), system description package.
- Book external penetration test (book now; run after Sprints 1–3).

---

## B. INTERIM NIN (NIDA NUMBER) POLICY — replaces the always-pass mock

The Tanzanian NIN encodes DOB (`YYYYMMDD-XXXXX-XXXXX-XX`, 20 digits), so format-level validation
gives real age enforcement + duplicate blocking **without any NIDA call**. Certified interim control;
authoritative verification remains deferred (D3).

Rules (Zod + server-side at KYC submission):
1. **Normalize**: strip dashes/spaces → exactly 20 digits; store canonical form in a dedicated
   normalized column so formatting tricks can't dodge uniqueness.
2. **Structural validity**: first 8 digits parse as a real calendar date; year in [1900, today−18y].
3. **Age**: DOB from the NIN ≥ 18 before today. Under-18 → hard reject + AntiFraudFlag.
4. **Cross-check**: extracted DOB == DOB declared at registration; mismatch → reject + AntiFraudFlag.
5. **Uniqueness**: DB `@@unique` on the normalized NIN column (race-safe). Duplicate → hard block,
   neutral message, AntiFraudFlag on **both** accounts, AuditLog entry.
6. **Immutability**: once approved, NIN not self-service editable; admin/support only, audited.
7. **Verification level**: add `verificationLevel: FORMAT | AUTHORITATIVE` (or
   `KycStatus.VERIFIED_FORMAT_ONLY`). Admin KYC queue labels format-only records. When real NIDA
   arrives, batch re-verify all `FORMAT` records without re-collecting data.
8. **Scope note (keep in compliance doc)**: prevents duplicates, under-18s, garbage — does NOT prove
   the NIN belongs to the submitter; authoritative verification (D3) still required for full sign-off.

Implementation: `parseNin()` util (normalize → validate date → extract DOB), Prisma migration
(normalized column + unique index + verificationLevel), wire into KYC submission action, flag paths,
admin-queue label. Playwright: malformed, impossible date, under-18, DOB mismatch, duplicate across
two accounts, format-insensitive duplicate (dashed vs undashed).

---

## C. PRE-AUDIT SELF-TEST CHECKLIST (runnable now, no stubs needed)

**Account & session** — 1) Register DOB<18 → blocked; edited-payload replay → blocked server-side.
2) Login device B → device A revoked next request; audit events. 3) Tampered cookie (byte-flip /
expiry / swapped user-ID) → 401, generic error, audit event. 4) Idle 24h / age 7d → re-auth.
5) `/admin` as PLAYER → denied; admin action without TOTP → denied.

**Jurisdiction & identity** — 6) Foreign IP / VPN → bet, deposit, withdraw all rejected + localized
reason + audit (page load may vary; money actions must fail). 7) Datacenter ASN → money actions
rejected. 8) Second account same NIN (any formatting) → blocked, both flagged. 9) NIN under-18 DOB or
DOB≠registration → rejected + flagged.

**Responsible gambling** — 10) Self-exclude → bet via direct API rejected; login shows notice; deposit
(stub) auto-refunded; zero marketing during exclusion. 11) Cooling-off → same, time-boxed. 12) Daily
deposit limit reached → next deposit rejected before provider call; loss limit → bets rejected.
13) Limit increase pending 24h server-side (early apply fails); decrease immediate. 14) Reality check
fires at interval, shows elapsed time + net position, requires acknowledgment. 15) RG/help-line links
on every screen incl. 404/500 and emails, all three languages.

**Wagering & pools** — 16) Bet slip shows pools per side, indicative dividend, 9% margin, rule card
(source, deadline, void terms, close time) before confirm. 17) Wager > balance rejected; balance
debited exactly on acceptance; receipt has unique ID + second-precision timestamp. 18) Kill connection
mid-bet, retry same key → exactly one Position/one debit; reconnect shows definitive status. 19) Bet
at/after `closesAt` → rejected atomically + audit; suspended market rejects in-flight. 20) Voided
market → both sides fully refunded, ledger balanced, notifications, /fairness shows void. 21)
Settlement math: payouts sum to losing pool − 9%; commission splits TRA/GBT at configured rates; every
winner matches pro-rata to the shilling; rounding remainder booked to breakage. 22) Officer holding a
position attempts stage-2 → hard-blocked; same officer both stages → blocked. 23) Verify three
resolved markets on /fairness against public sources. 24) Withdrawal pre-KYC → gated; post-KYC
(format-level) → allowed per GBT model; withholding tax computed + displayed. 25) Deposit at TZS 1M
single / 5M rolling → SOF workflow; ≥5M AML approval requires two distinct officers.

**System** — 26) Forced 500 → generic error + correlation ID, no stack/PII; CSP/HSTS present.
27) `/api/version` matches the tagged release; raw push to `main` cannot reach prod. 28) Tamper one
AuditLog row in staging → scheduled chain verification alarms within the job interval. 29) NTP drift
job within tolerance; timestamps UTC. 30) PITR drill: restore yesterday's DB within documented RTO.
31) kill -9 settlement worker mid-market → resume → exactly-once payouts. 32) Hourly reconciliation
shows zero diffs, ledger vs legacy balances.

**Deferred (do not attempt now):** OTP to a real phone, live deposit/withdraw rails, forged/replayed
provider webhook signatures, withdrawal-to-different-number closed loop, authoritative NIDA match.

---

## D. APPENDIX — DEFERRED, BLOCKED ON THIRD-PARTY CONTRACTS (no engineering now)

Commercial action only; keep interfaces clean so each plugs in without reopening certified paths.

- **D1. Payment aggregator (Selcom/Azampay/Pesapal)** — Blocker for real-money cert. On signing: live
  rails; provider HMAC + replay window on `/api/webhooks/payments`; idempotent on `providerRef`
  (constraint exists); daily provider-statement vs ledger reconciliation; segregated player-funds
  account + daily player-liability report.
- **D2. SMS provider (Beem/AT/Twilio)** — High. On signing: re-enable OTP at registration + on
  withdrawal-destination change; closed-loop withdrawals (payout only to verified registered number;
  change = OTP + 24h hold + KYC recheck); strip console SMS from prod; keep password as second factor.
- **D3. Authoritative NIDA (mTLS) or interim IDV vendor** — Blocker for full identity sign-off. Verify
  NIN vs NIDA; enforce NIDA-DOB≥18; mismatch flags; batch re-verify all `FORMAT` users. Section B is
  the fallback until then.
- **D4. Sportradar / match-integrity feed** — Medium. Compensating controls certified now
  (officer-conflict block, /fairness attestation, volume-anomaly auto-suspend 3.5). Stub stays labelled.
- **D5. Live AI market generation** — Low. Certify with mock flag off + mandatory logged human-approval
  gate; submit live Claude path as a later change-management item.

**Raise at the GBT pre-application meeting (get in writing for GLI):** sufficiency of IP-level
geolocation; hosting/data-residency vs Railway; written confirmation of bet-pre-KYC / cash-out-gated
model; prescribed report formats + any direct-access requirement; existence of a national
self-exclusion register.

---

## Standards reference

- **GLI-33 v1.1 — Event Wagering Systems**: primary; wager records (§2.3.4), cancellations per
  published policy (§2.3.5), balance/debit rules, pari-mutuel pool handling, operator MICS.
- **GLI-19 v3.0 — Interactive Gaming Systems**: registration, age/identity, player-funds, sessions,
  geolocation, RG tools, information-to-player.
- **GLI-27 — Network Security Best Practices**: encryption, key management, patching, logging, testing.
- **GLI-13**: N/A (casino/VLT monitoring) — intent met via Sprint 4.5 alerting/monitoring.
- **RNG**: N/A for outcomes; CSPRNG applies to all security tokens (Sprint 4.4 + memo).
- Verify exact clause numbers against the free PDFs at gaminglabs.com before quoting to GBT/GLI.
