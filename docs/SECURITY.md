# Kipindi — Security Posture

**Maintained for:** Gaming Board of Tanzania (GBT), Financial Intelligence Unit (FIU), Personal Data Protection Commission (PDP), GLI / iTech Labs auditors, ISO 27001 Stage 1.

**Status:** Sprint 1 implementation. Test environment. No real user data; no live money flows. All controls below are wired in code and verifiable by inspecting the named files.

---

## 1. Identity & Access (ISO 27001 A.9)

| Control | Implementation | File |
|---|---|---|
| Phone-first authentication, no password initially | OTP-only flow over signed cookies | `src/lib/server/auth-service.ts` |
| OTP generation | `crypto.randomBytes(4)` CSPRNG, modulo-bias guarded, 6 digits | `src/lib/server/crypto.ts` |
| OTP at-rest | scrypt + per-OTP salt + global pepper. Cleartext code never persisted | `src/lib/server/crypto.ts` (`hashOtp`) |
| OTP TTL | 5 minutes hard cap | `src/lib/server/auth-service.ts` (`OTP_TTL_MS`) |
| OTP attempts | 5 wrong attempts → cool-down, audited | `auth-service.ts` (`verifyOtpAndAuth`) |
| Session integrity | HMAC-SHA-256 signed payload, HttpOnly + SameSite=Lax + Secure (prod) | `src/lib/server/session.ts` |
| Session lifetime | 7-day max, sliding-refresh ready | `session.ts` (`SESSION_TTL_MS`) |
| Constant-time comparisons | `crypto.timingSafeEqual` for HMAC + OTP verify | `crypto.ts` |
| Existence enumeration | Login OTP returns success even for unknown phones — audited as `otp.send_to_unknown_phone`, no SMS dispatched | `auth-service.ts` (`requestLoginOtp`) |
| Account suspension | Self-excluded / suspended / closed accounts blocked at OTP request, not after credential check | `auth-service.ts` |

## 2. Rate limiting (OWASP ASVS 2.2.1)

Token-bucket per `(actor_key, action)` pair. In-memory dev; production swaps to Redis. Defined rules:

| Action | Capacity | Refill (per min) |
|---|---:|---:|
| `otp.send` | 5 | 0.5 |
| `otp.verify` | 5 | 1 |
| `auth.login` | 8 | 2 |
| `auth.register` | 3 | 0.2 |
| `kyc.submit` | 5 | 0.5 |
| `wallet.deposit` | 20 | 4 |
| `wallet.withdraw` | 6 | 0.5 |
| `bet.place` | 30 | 10 |

File: `src/lib/server/rate-limit.ts`.

## 3. Input validation

All server-bound inputs validated by Zod schemas before any DB write. Client-side validation is convenience only.

- Tanzania phone normalization (E.164 enforced) — rejects non-TZ + invalid leading digits
- NIDA — 20-digit numeric (NIDA Act 2008 format)
- Date-of-birth — 18+ enforcement at validator level (Gaming Act 2003)
- Stake / deposit / withdrawal — bounded to GBT-approved limits
- All OTP codes regex-matched to `^\d{6}$`

File: `src/lib/server/validators.ts`.

## 4. KYC workflow (GBT-aligned)

3-step flow: NIDA → Documents → Compliance review.

- NIDA verified through abstraction (`src/lib/server/nida.ts`) — production swap to mTLS + signed envelope per NIDA agreement
- PII never appears in audit logs (only `nidaLast4` + correlation ID)
- Documents are storage keys only; binaries never enter app database
- Status transitions: `NOT_STARTED → IN_PROGRESS → PENDING_REVIEW → APPROVED | REJECTED`
- Reject reasons: `BLURRY_DOC | DETAILS_MISMATCH | EXPIRED_ID | UNDERAGE | SANCTIONED | DUPLICATE_IDENTITY | OTHER`
- Underage and sanctioned matches block the account entirely and are flagged for compliance review
- Withdrawal blocked until status = APPROVED

Files: `src/lib/server/kyc-service.ts`, `src/app/profile/kyc/`.

## 5. Audit log (ISO 27001 A.12.4, GBT inspection requirement)

Append-only event store. Every state-changing action emits an entry with category, action verb-noun, actor, target, optional payload, IP, user-agent, timestamp.

Categories: `AUTH | KYC | WALLET | BET | ADMIN | COMPLIANCE | SECURITY | SYSTEM`.

Currently in-memory ring (10k entries) for dev; production persists to Postgres `AuditLog` (Prisma model `AuditLog` already defined in `prisma/schema.prisma`).

All security-sensitive auth events logged:

- `otp.{purpose}.sent` / `otp.send_to_unknown_phone` / `otp.rate_limited`
- `otp.verify.no_active` / `otp.verify.wrong_code` / `otp.verify.too_many_attempts`
- `user.registered` / `user.login` / `auth.blocked_self_excluded`
- `session.created` / `session.destroyed`
- `nida.verify.requested` / `nida.verify.success` / `nida.verify.invalid_format`
- `kyc.started` / `kyc.nida.verified` / `kyc.nida.rejected` / `kyc.document.uploaded` / `kyc.submitted`

File: `src/lib/server/audit.ts`.

## 6. Transport security & HTTP headers (OWASP ASVS 14)

Edge middleware applies the following on every dynamic response:

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' ws: wss:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (production only) |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | `accelerometer=()`, `autoplay=()`, `camera=(self)`, `microphone=()`, `geolocation=()`, `payment=()`, `usb=()`, `fullscreen=(self)` |
| Cross-Origin-Opener-Policy | `same-origin` |
| X-Permitted-Cross-Domain-Policies | `none` |

File: `src/middleware.ts`.

CSP currently allows `'unsafe-inline'` and `'unsafe-eval'` in dev mode for Next.js Turbopack. Production build will replace these with per-request nonces — tracked in Sprint 9 polish.

## 7. Data protection (Personal Data Protection Act 2022)

- Data controller registration with PDP Commission — operational item
- All PII fields (`User.phoneE164`, `KycSubmission.nidaNumber`, `KycSubmission.fullName`, `dob`) are stored only in their dedicated columns; never written to logs or sent to client
- Audit log payloads truncate sensitive fields (e.g. `nidaLast4` only)
- Right-to-export and right-to-deletion are scheduled for Sprint 7 (compliance UI)
- Cookie consent surface scheduled for Sprint 9 launch polish

## 8. AML / CFT readiness (FIU reporting)

- Prisma schema includes `Transaction.amlReviewedById`, `Transaction.amlReviewedAt`, `Transaction.amlReason`, status `AML_REVIEW`
- Withdrawal threshold UI flags AML-bound transactions to user with neutral copy ("Under review")
- `AntiFraudFlag` model with severity / status / reviewer for STR (Suspicious Transaction Report) preparation
- Velocity, multi-account, IP-overlap flag types defined in schema
- SAR/STR export flow scheduled for Sprint 6 (admin compliance dashboard)

Schema: `prisma/schema.prisma`.

## 9. Responsible gambling (GBT mandatory)

- `ResponsibleGambling` table stores deposit / loss / session limits, self-exclusion until, cooling-off period, pending-increase grace period
- Limit decreases apply immediately; increases gated by 24-hour cool-down (regulator-friendly)
- Self-exclusion blocks at OTP-request layer (account cannot even authenticate while excluded)
- Reality-check overlay scheduled at 30/60-minute thresholds — UI in `src/app/profile/page.tsx` Step 3

## 10. Match integrity

- Mapigo's 60-second windows are higher-risk for match-fixing — `MatchIntegrityCheck` model captures anomaly score, evidence JSON, reviewer notes
- Sportradar Integrity Services partnership scheduled before live launch
- IBIA membership pursued in parallel

## 11. Cryptographic inventory

| Function | Algorithm | Where |
|---|---|---|
| Session signature | HMAC-SHA-256 | `crypto.ts:signSession/verifySession` |
| OTP at-rest | scrypt (N=2^14, default cost) + per-record salt + global pepper | `crypto.ts:hashOtp/verifyOtp` |
| Password at-rest (when added) | scrypt (cost=64KB), per-user salt | `crypto.ts:hashPassword/verifyPassword` |
| Random ID | `crypto.randomBytes(16)` → hex (128-bit) | `crypto.ts:randomId` |
| Constant-time compare | `crypto.timingSafeEqual` | All verify paths |

Cleartext secrets required from environment in production:

```
SESSION_SECRET   — ≥ 32 chars, used to HMAC session cookies
OTP_PEPPER       — ≥ 16 chars, used to bind OTP hashes to this deployment
```

If `NODE_ENV=production` and either is missing, the app refuses to start (`crypto.ts:6-9`).

## 12. Incident response

- TZ-CERT (Tanzania Computer Emergency Response Team) coordination — operational item
- Audit log allows actor + time + IP forensics
- Session `sessionId` enables targeted revocation across devices
- All payment events have provider correlation IDs (`providerRef`) for chargeback / dispute traceability

## 13. Out of scope for this sprint

- Real database persistence (in-memory store; swap to Prisma + Postgres in Sprint 2)
- Real SMS dispatch (console-only; swap to Selcom / Beem in Sprint 1.5)
- Real NIDA API (mock; live integration after NIDA agreement signed)
- File upload pipeline for KYC docs (storage key stub; live S3-compatible bucket in Sprint 2)
- Re-auth modal for sensitive actions (planned Sprint 5)
- Two-factor authentication beyond OTP (planned Sprint 6)
- Per-deployment CSP nonces (planned Sprint 9)

---

**This document is reproducible from the codebase. Every claim above maps to a file and line.**
