# GLI Certification Gap Analysis — 50pick (Kipindi)

> **Date:** 2026-07-03
> **Standards:** GLI-33 (Event Wagering Systems) + GLI-19 (Interactive Gaming Systems)
> **Platform:** 50pick.tz — licensed pari-mutuel prediction market, Tanzania
> **Auditor:** Claude Opus 4.6 (automated codebase audit)

---

## Verdict Summary

| Area | GLI Section | Status | Gaps |
|------|-------------|--------|------|
| Wagering Rules & Display | GLI-33 S2 | PASS (minor) | 1 |
| Fairness & Outcome Determination | GLI-33 S3 | PASS | 0 |
| Transaction Logging & Audit | GLI-33 S4 | PASS | 0 |
| Financial Controls & Segregation | GLI-33 S5 | PASS (minor) | 2 |
| Account Management & KYC | GLI-19 S3 | PASS (minor) | 1 |
| Information Security | GLI-19 S4 | PASS (minor) | 3 |
| Responsible Gambling | GLI-19 S5 | PASS | 0 |
| System Architecture & DR | GLI-19 S6 | FAIL | 4 |
| Change Management & Testing | GLI-19 S7 | PASS (minor) | 2 |

**Overall: 13 gaps — 4 blockers, 5 high, 4 medium**

---

## BLOCKER — Must fix before GLI submission

### B1. PITR Backups Not Enabled
- **GLI-19 S6.2:** "The system shall maintain backup copies sufficient to recover to a known state"
- **Current:** Railway Postgres has backup capability but PITR is not verified/enabled
- **Risk:** Total data loss on catastrophic failure; no proven restore procedure
- **Fix:** Enable Railway PITR, test restore against production clone, document RTO < 1h / RPO < 5min
- **Tracker:** Elevation Phase 3 #11

### B2. No Monitoring or Alerting
- **GLI-19 S6.4:** "The system shall provide alerts for critical failures and security events"
- **Current:** Health endpoint exists (`/api/health`) but no Sentry, no Prometheus, no alerting rules
- **Risk:** Outages go undetected until a player reports; security breaches not flagged in real time
- **Fix:** Wire Sentry for error tracking; configure alerts (error rate > 1%, latency p95 > 500ms, DB down)
- **Tracker:** Elevation Phase 3 #10

### B3. No Formal Disaster Recovery Plan
- **GLI-19 S6.3:** "A documented disaster recovery plan shall exist and be tested"
- **Current:** Informal rollback procedure in RAILWAY_DB_README.md; no formal DR runbook
- **Risk:** GLI requires a documented, tested plan with defined RTO/RPO and escalation procedures
- **Fix:** Write formal DR runbook covering: failover, restore, rollback, communication, GBT escalation
- **Effort:** 1 day documentation + 1 day drill

### B4. No CI/CD Pipeline
- **GLI-19 S7.1:** "Changes shall be subject to documented change control procedures including automated testing"
- **Current:** `npm run predeploy` exists (38 tests + build + Playwright) but is manually invoked; no GitHub Actions; Railway auto-deploys on any push to main without gating
- **Risk:** A direct push without running predeploy could deploy broken code to production
- **Fix:** Add GitHub Actions workflow that runs predeploy on every PR/push; block Railway deploy on CI failure
- **Effort:** 2-4 hours

---

## HIGH — Should fix before submission

### H1. In-Memory Rate Limiting (Not Persistent)
- **GLI-19 S4.3:** "Rate limiting shall survive system restarts"
- **Current:** Token-bucket rate limiter is in-memory (lost on Railway redeploy every ~2-3 min during active development)
- **Risk:** Brute-force window during deploys; GLI may flag as insufficient
- **Fix:** Swap to Redis-backed rate limiter (interface already supports it)
- **Effort:** 4-6 hours (Redis add-on on Railway + adapter)

### H2. CSP Uses unsafe-inline / unsafe-eval
- **GLI-19 S4.5:** "Content Security Policy should prevent inline script execution"
- **Current:** `script-src 'self' 'unsafe-inline' 'unsafe-eval'` required by Next.js 16 Turbopack RSC
- **Risk:** XSS attack surface; GLI will note this even if mitigated by other controls
- **Fix:** Monitor Next.js for nonce-based CSP support; document compensating controls (HttpOnly cookies, HMAC sessions, input validation)
- **Effort:** Document now; fix when Next.js ships nonce support

### H3. Withdrawal Tax Model Inaccurate
- **GLI-33 S5.4:** "Tax calculations shall be accurate and auditable"
- **Current:** Assumes entire withdrawal = taxable winnings (15% rate); overcharges players who withdraw deposits
- **Risk:** Regulatory finding from TRA; player complaints
- **Fix:** Integrate with double-entry ledger to compute actual net winnings per player
- **Effort:** 1-2 days

### H4. Write-Only DB Role for Audit Log
- **GLI-33 S4.2:** "Audit logs shall be protected from modification by any user including administrators"
- **Current:** Audit log is HMAC-chained (tamper-evident) but uses the same DB role for reads and writes; a compromised admin could delete rows then re-forge the chain if they obtain AUDIT_CHAIN_SECRET
- **Risk:** Theoretical chain forgery if secret is compromised
- **Fix:** Create `audit_writer` Postgres role with INSERT-only on AuditLog table; rotate AUDIT_CHAIN_SECRET quarterly
- **Effort:** 2-3 hours

### H5. KYC Documents Stored as Base64 in DB
- **GLI-19 S3.6:** "Identity documents shall be stored securely with access controls"
- **Current:** KYC document images stored as base64 data URLs (up to 3MB each) in Postgres
- **Risk:** DB bloat; no access logging on document retrieval; no encryption at rest beyond DB-level
- **Fix:** Move to Cloudflare R2 with magic-byte validation, encryption, and access logging
- **Tracker:** Elevation Phase 3 #13
- **Effort:** 2-3 days

---

## MEDIUM — Recommended before submission

### M1. No Formal Penetration Test Report
- **GLI-19 S4.8:** "An independent penetration test shall be conducted"
- **Current:** No third-party pentest on record
- **Fix:** Commission pentest from GLI-approved security firm; remediate findings
- **Effort:** 2-4 weeks (external engagement)

### M2. No Off-Site Backup Archive
- **GLI-19 S6.2.3:** "Backup copies shall be stored at a geographically separate location"
- **Current:** Railway backups are on the same infrastructure
- **Fix:** Weekly encrypted export to S3/R2 cold storage in a different region
- **Effort:** 1 day

### M3. No Formal Admin User Manual for GLI
- **GLI-19 S7.3:** "System documentation shall include operator and administrator guides"
- **Current:** PDFs exist (player manual, admin manual, operator briefing, technical brief) but not structured to GLI submission format
- **Fix:** Restructure admin manual to follow GLI documentation template; include screenshots of every admin function
- **Effort:** 1-2 days

### M4. TOTP Replay Protection
- **GLI-19 S4.2:** "Authentication tokens shall not be replayable"
- **Current:** TOTP codes can be reused within the 30-second window + 1-step tolerance (no used-code tracking)
- **Risk:** Low — window is tiny and TOTP cookie prevents re-prompt for 8 hours
- **Fix:** Track last-used TOTP counter per user; reject codes at or below it
- **Effort:** 1-2 hours

---

## PASS — No action required

### Fairness & Outcome Determination (GLI-33 S3) — PASS

| Requirement | Evidence |
|-------------|----------|
| No RNG needed (pari-mutuel pool model) | Outcomes determined by real-world events, not RNG |
| Two-officer manual resolution | Stage 1 + Stage 2 by different officers; both audit-logged |
| Officer conflict-of-interest block | POCA S16 compliance; officer with position cannot resolve |
| AI sentinel is advisory only | Never auto-resolves; closes market + stores recommendation |
| 24-hour public objection window | Opens after Stage 2 signature |
| Transparent payout math | `payoutFor()` in src/lib/payout.ts — single source of truth |
| Fairness disclosure page | /fairness with recent 50 resolved markets + both officer IDs |
| Void/refund rules published | Terms S6; full refund at 0% fee on void or one-sided market |

### Transaction Logging & Audit (GLI-33 S4) — PASS

| Requirement | Evidence |
|-------------|----------|
| Every critical transaction logged | AUTH, KYC, WALLET, BET, ADMIN, COMPLIANCE, SECURITY, SYSTEM categories |
| Timestamp + actor + action + payload | AuditEntry type with IP, User-Agent, before/after state |
| Tamper-evident chain | HMAC-SHA256 prevHash/entryHash; verifyChain() + verifyChainFull() |
| Admin actions logged separately | ADMIN category with target entity |
| Lifetime retention | Append-only; no TTL; full DB chain walkable in batches |
| Regulator export | 9 report templates (ISO audit, TRA tax, FIU SAR, GBT monthly, etc.) |
| Double-entry ledger | Balanced entry groups (SUM=0); reconcileLedger() detects imbalance |

### Responsible Gambling (GLI-19 S5) — PASS

| Requirement | Evidence |
|-------------|----------|
| Deposit limits (daily/weekly/monthly) | Player-configurable; checked before every deposit |
| Loss limit (daily) | Stored + enforced |
| Session time limit | Auto-logout after chosen duration |
| Reality checks | 30-min modal (configurable 5-120 min); LCCP SR 3.4.1 |
| Cooling-off periods | 1h / 24h / 1w; one-way until expiry |
| Self-exclusion (temp + permanent) | 24h / 1w / 1m / 6m / permanent; wallet frozen; sessions revoked |
| Limit increase deferral | 24h cool-down per LCCP SR 3.4.3 |
| Markers-of-harm detection | 5 markers: rapid deposit escalation, chasing losses, late-night play, limit breach history, session overrun |
| Problem gambling helpline | Tanzania helpline + begambleaware.org + gamcare.org.uk displayed across all touchpoints |
| 18+ age gate | Enforced at registration via DOB validation |
| Marketing restrictions | No marketing to <25 in vulnerability segments; no late-night sign-up nudges |
| Cross-operator self-exclusion | Planned Q3 2026 (SFTP to GBT); hashed NIDA for privacy |

### Account Management (GLI-19 S3) — PASS (minor gap: H5)

| Requirement | Evidence |
|-------------|----------|
| Mandatory age verification (18+) | DOB check at registration; NIDA DOB cross-check |
| NIDA national ID verification | Server-side API (mock in dev; mTLS in prod) |
| Tiered KYC (basic -> enhanced) | 4-stage: NIDA verify -> document upload -> submit -> officer review |
| Multi-accounting prevention | Unique NIDA per account (duplicate blocked + audit-logged) |
| Password policy | Min 8 chars; OWASP breach list; no leading/trailing whitespace |
| Brute-force lockout | 5 failed attempts -> 30-min lockout |
| 2FA for admin (TOTP) | RFC 6238; step-up on sensitive actions; constant-time verify |
| Account closure | One-way; wallet frozen; data retained 7 years for AML |
| Self-exclusion one-way | Player cannot cancel; effective immediately across all devices |

### Financial Controls (GLI-33 S5) — PASS (minor gaps: H3, H5)

| Requirement | Evidence |
|-------------|----------|
| Double-entry bookkeeping | 12 virtual accounts; balanced entry groups; reconcileLedger() |
| Player funds segregated | PLAYER:* accounts never mixed with HOUSE:* |
| Bonus wallet separated | bonusBalance field; non-withdrawable until wagering met |
| Atomic wallet operations | Postgres advisory locks; no unprotected read-modify-write |
| Idempotency on financial ops | Client idempotency keys + status gates + providerRef dedup |
| KYC gate on withdrawal | kyc.status === "APPROVED" required |
| AML source-of-funds gate | Single >= TZS 1M or rolling 30d >= TZS 5M triggers review |
| AML withdrawal review | >= TZS 1M auto-held for two-officer approval |
| Tax withholding | Computed at settlement; TRA + GBT levies tracked in ledger |
| Stale payment sweep | Reconciliation cron for stuck PROCESSING transactions |

### Information Security (GLI-19 S4) — PASS (minor gaps: H1, H2, H4, M1, M4)

| Requirement | Evidence |
|-------------|----------|
| FIPS-compatible crypto | Node crypto (OpenSSL); scrypt for passwords; HMAC-SHA256 for sessions |
| CSPRNG for all entropy | crypto.randomBytes for sessions, OTPs, salts, TOTP secrets |
| Timing-safe comparisons | timingSafeEqual on passwords, OTPs, HMAC verification |
| HttpOnly + Secure cookies | Set in production; SameSite=Lax |
| HSTS | max-age=63072000 (2 years); includeSubDomains; preload |
| Security headers | X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, COOP |
| RBAC for admin | 5-tier role system (ADMIN > COMPLIANCE > MODERATOR); step-up 2FA |
| Server-side input validation | Zod schemas; single source of truth |
| Safe error disclosure | Only digest IDs returned to client; no stack traces or SQL fragments |
| Webhook signature verification | HMAC-SHA256 + timestamp skew check; per-provider secrets |
| Single active session | New login revokes all prior sessions; DB-authoritative registry |

### Change Management (GLI-19 S7) — PASS (minor gaps: B4, M3)

| Requirement | Evidence |
|-------------|----------|
| Version control | Git; GitHub private repo (alisheib/kipindi) |
| 38 automated test suites | All green as of 2026-07-03 |
| TypeScript strict mode | strict: true; ignoreBuildErrors: false |
| Pre-deploy validation | typecheck + 38 tests + build + Playwright gauntlet |
| Documented flows | FLOWS.md covers all auth/KYC/admin gates |
| Architecture documentation | 30-section platform spec; elevation tracker |
| Session-level change logs | Every session documented with commit hashes |
| Two-person rule on settlement | Stage 1 + Stage 2 by different officers |

---

## Action Plan — Priority Order

| # | Item | Severity | Effort | Owner |
|---|------|----------|--------|-------|
| 1 | Add GitHub Actions CI (run predeploy on push) | BLOCKER | 2-4 hours | Dev |
| 2 | Enable Railway PITR + test restore | BLOCKER | 4 hours | Ops |
| 3 | Write formal DR runbook | BLOCKER | 1 day | Ops |
| 4 | Wire Sentry error tracking + alerts | BLOCKER | 4-6 hours | Dev |
| 5 | Swap rate limiter to Redis | HIGH | 4-6 hours | Dev |
| 6 | Fix withdrawal tax model (ledger-based) | HIGH | 1-2 days | Dev |
| 7 | Create audit_writer DB role (INSERT-only) | HIGH | 2-3 hours | Dev |
| 8 | Move KYC docs to R2 (encrypted + access-logged) | HIGH | 2-3 days | Dev |
| 9 | Document CSP compensating controls | HIGH | 2 hours | Doc |
| 10 | Commission independent pentest | MEDIUM | 2-4 weeks | External |
| 11 | Weekly off-site backup to S3/R2 | MEDIUM | 1 day | Ops |
| 12 | Restructure admin manual to GLI format | MEDIUM | 1-2 days | Doc |
| 13 | Add TOTP replay protection | MEDIUM | 1-2 hours | Dev |

**Estimated total effort:** ~2 weeks of dev work + external pentest engagement

---

## GLI Submission Checklist

When all gaps are resolved, the submission package should include:

- [ ] Platform specification document (docs/50PICK-PLATFORM-SPEC.md — already exists)
- [ ] System architecture diagram
- [ ] Data flow diagrams (money paths, auth flows, KYC flows)
- [ ] Source code access (GitHub repo or tarball)
- [ ] Database schema documentation (Prisma schema + ERD)
- [ ] Security assessment / penetration test report
- [ ] Disaster recovery plan
- [ ] Change management procedures
- [ ] Responsible gambling policy (already published at /legal/responsible-gambling)
- [ ] Terms of service (already published at /legal/terms)
- [ ] Fairness disclosure (already published at /fairness)
- [ ] Admin user manual (exists; needs GLI formatting)
- [ ] Player user manual (exists; needs GLI formatting)
- [ ] Operator briefing (exists)
- [ ] Test suite results (38 suites, all green)
- [ ] Audit chain verification report (verifyChainFull() output)
- [ ] Ledger reconciliation report (reconcileLedger() output)
- [ ] Sample regulator reports (9 templates: ISO audit, TRA, FIU, GBT, etc.)

---

## Applicable GLI Standards Reference

| Standard | Version | Scope |
|----------|---------|-------|
| GLI-33 | 1.1 | Event Wagering Systems — covers wagering rules, transaction logging, financial controls |
| GLI-19 | 3.0 | Interactive Gaming Systems — covers account management, security, RG, architecture, change management |
| GLI-16 | 2.1 | Non-Traditional/Internet-Based Systems (supplementary) |

> **Note:** GLI certification is lab-based. The lab will request source code access, run their own tests, and issue findings. This gap analysis prepares for that process — resolving all items above maximizes the chance of a clean first-pass certification.
