# Elevation Tracker — 50pick v3.0

> Status: `[ ]` pending | `[x]` done

---

## Phase 0 — Schema Cleanup (before ledger)

| # | Item | Status | Commit |
|---|------|--------|--------|
| 0a | Rename `betId` → `positionId` across schema + codebase | [x] | pending |
| 0b | Drop legacy sports models (9 tables, 5 enums, all dead code) | [x] | pending |
| 0c | CHECK constraints: balance>=0, hold>=0, bonusBalance>=0 | [x] | pending |
| 0d | Drop StoreSnapshot model + update health check | [x] | pending |

## Phase 1 — Ledger

| # | Item | Status | Commit |
|---|------|--------|--------|
| 1 | Postgres advisory locks | [x] | 4c869f4 |
| 2 | Client idempotency keys | [x] | 4c869f4 |
| 3 | Double-entry ledger (dual-write → prove → flip) | [ ] | |
| 4 | Transactional outbox + pg-boss jobs | [ ] | |

## Phase 2 — Payment Integration

Do these together when M-Pesa/Airtel aggregator is signed.

| # | Item | Status | Commit |
|---|------|--------|--------|
| 5 | Webhook signatures + idempotency (provider HMAC) | [ ] | |
| 6 | Closed-loop withdrawals (only to depositing number) | [ ] | |
| 7 | Step-up re-auth on withdrawal (OTP) | [ ] | |
| 8 | Tax line on payout receipts (taxWithheld already computed) | [ ] | |
| 9 | E2E money-path test (register → deposit → bet → resolve → withdraw) | [ ] | |

## Phase 3 — Production Readiness

| # | Item | Status | Commit |
|---|------|--------|--------|
| 10 | Sentry + structured logs + golden alerts | [ ] | |
| 11 | Verify Railway PITR backups are on | [ ] | |
| 12 | Officer-conflict hard-block (can't resolve market you hold position in) | [ ] | |
| 13 | KYC storage on Cloudflare R2 (encrypted, access-logged) | [ ] | |
| 14 | Icon redesign | [x] | 33ca139 |

## Post-Launch

Everything else. Pick based on user feedback and regulator requests.

- PDPA (retention schedule, deletion pipeline) — before regulator audit
- Compliance automation (8 report templates) — before first GBT filing
- Marketing suppression choke point — before any promotional campaigns
- Markers-of-harm v1 — before public launch
- Dispute/objection flow — when volume justifies it
- Withdrawal SLA + public stats — when withdrawal volume is meaningful
- WhatsApp notifications — when Business API contract signed
- Data-saver mode, practice mode, watchlist, calibration engine
- Redis (sessions/SSE fan-out) — when scaling to 2+ instances
- Database indexes — when query perf becomes an issue
- Performance budget CI — when bundle size drifts
- Admin date/format unification
- Everything from the original 142-item spec that's not above

---

## Ali Decisions (2 July 2026)

| Decision |
|----------|
| Kill legacy sports models permanently |
| Lopsided pools: math handles it, lean warning covers UX |
| Cash-out: simple 9% fee exit |
| On-call human: yes |
| Segregated player funds: yes |
| KYC storage: Cloudflare R2 |

---

## Session Log

| Date | Items | Commits |
|------|-------|---------|
| 2026-07-02 | Advisory locks, idempotency, icon redesign, tracker setup | 4c869f4, 33ca139 |
