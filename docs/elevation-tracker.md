# Elevation Tracker — 50pick v3.0

> Baseline: v2.5 / commit 0499a42 | Started: 2 July 2026
> Status: `[ ]` pending | `[x]` done

---

## Phase 0 — Schema Cleanup (before ledger)

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 0a | Split `betId` → `positionId` FK + classify rows | [ ] | | Polymorphic ref blocks ledger |
| 0b | Drop legacy sports models (Bet/Window/Pool/Match/Sport/League/Team) | [ ] | | Ali: kill permanently |
| 0c | CHECK constraints: balance>=0, hold>=0, bonusBalance>=0 | [ ] | | Verify prod data first |
| 0d | Drop StoreSnapshot model | [ ] | | Dead code |
| 0e | Fix costUsd Float → Decimal(10,6) | [ ] | | Never Float for money |
| 0f | Wire market-config to SystemConfig table | [ ] | | Memory-only loses on restart |

## Phase 1A — Money-Path Correctness

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 1 | Postgres advisory locks | [x] | 4c869f4 | pg_advisory_xact_lock, 31 call sites |
| 2 | Double-entry ledger (dual-write → prove → flip) | [ ] | | After Phase 0. No history replay, opening-balance entries |
| 3 | Client idempotency keys | [x] | 4c869f4 | UUID per intent on bet/deposit/withdraw |
| 4 | Transactional outbox + pg-boss jobs | [ ] | | Outbox for SSE/email + jobs for auto-close/expiry |
| 5 | Webhook idempotency + signature verification | [ ] | | Provider txn ID unique key + HMAC |
| 6 | Closed-loop withdrawal rule | [ ] | | Withdraw only to depositing number |
| 7 | Marketing suppression choke point | [ ] | | No promos to excluded/cooled/at-limit |

## Phase 1B — Infrastructure

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 8 | Redis: sessions + rate-limit + SSE fan-out | [ ] | | Session registry as user→session set |
| 9 | Sentry + structured logs | [ ] | | |
| 10 | Golden alerts (webhook fail, p99, ledger breach) | [ ] | | Ledger breach → money-paths read-only |
| 11 | Database indexes | [ ] | | positions, markets, txns, audit |
| 12 | PITR + restore drill | [ ] | | |
| 13 | Performance budget CI | [ ] | | LCP < 2.5s, JS < 150KB — before features land |
| 14 | Admin date/format unification | [ ] | | Single formatDate, officers use this 8h/day |

## Phase 2 — Launch Essentials

Only what's needed before real money flows.

| # | Item | Status | Commit | Notes |
|---|------|--------|--------|-------|
| 15 | Withdrawal SLA + status timeline | [ ] | | The actual trust moat — "median 14 min" |
| 16 | Dispute/objection flow (UI + evidence + rulings) | [ ] | | 24h window exists, needs UI |
| 17 | Payout-math transparency (live itemized breakdown) | [ ] | | Show tax/commission/share before confirm |
| 18 | Cash-out transparency (fee + exit price shown) | [ ] | | Simple: 9% fee, exit amount |
| 19 | WhatsApp notifications (win/deposit/withdraw) | [ ] | | WhatsApp Business API, opt-in |
| 20 | Data-saver mode | [ ] | | Honor Save-Data header, locale-split bundles |
| 21 | Markers-of-harm engine v1 | [ ] | | Nightly risk score, tiered response |
| 22 | Session hardening (step-up re-auth on withdraw) | [ ] | | OTP on withdrawal + payout-number change |
| 23 | Market-integrity monitoring | [ ] | | Late-swing detection, officer-conflict hard-block |
| 24 | Incident runbooks (top 8 failure modes) | [ ] | | |
| 25 | Playwright E2E money path + k6 load test | [ ] | | Full register→deposit→bet→resolve→withdraw |
| 26 | Tax transparency (TRA withholding on receipts) | [ ] | | taxWithheld field exists — show it |
| 27 | Compliance automation (8 report templates) | [ ] | | GBT monthly, TRA, FIU SAR scheduled |
| 28 | Icon redesign | [x] | 33ca139 | 17 glyphs + 11 badges + 7 empty states |

## Post-Launch — Build When Needed

Not tracked per-session. Pick from this list after launch based on user feedback.

- Practice mode (TZS 10k practice shillings)
- Watchlist + price alerts
- Calibration engine + Pick Score (needs scoring spec: shrinkage, min-n, closing-price)
- Share cards (WhatsApp status sized)
- Resolution ceremony animation
- Glare mode (sunlight-readable)
- Swahili voice pass (native copy review)
- Tanzania leo shelf (local market curation)
- Support console (player-context view)
- Status page (status.50pick.co.tz)
- Signature motion (needle tilt, seal-press, detents)
- Data-visualization system (probability river, pool depth)
- Admin design parity (DataTable, cmd-K)
- Search upgrade (pg_trgm, typo-tolerant)
- PostHog analytics
- Anchored proofs (OpenTimestamps)
- USSD companion
- Vikundi (private prediction circles)
- Multi-outcome markets (FROZEN until ledger stable months)
- Agent (wakala) cash-in
- Seasons + heraldic tiers
- Pool-solvency proof
- Regulator read-only mode
- Passkeys (WebAuthn)

---

## Data Protection — PDPA 2022

Regulator asks about this before they ask about SSE.

| # | Item | Status |
|---|------|--------|
| P1 | Retention schedule per data class | [ ] |
| P2 | Deletion/anonymization pipeline | [ ] |
| P3 | KYC storage on Cloudflare R2 (encrypted, access-logged) | [ ] |

---

## Definition of Done (with evidence)

| # | Check | Status |
|---|-------|--------|
| D1 | Real deposit via all providers, incl. forced duplicate webhook | [ ] |
| D2 | Ledger sums to zero after k6 500-concurrent-bet run | [ ] |
| D3 | Two instances, no lock/SSE anomalies for 72h | [ ] |
| D4 | Restore drill inside RTO, documented | [ ] |
| D5 | Median withdrawal < 60 min over 2-week pilot | [ ] |
| D6 | "Log out all sessions" kills a live token | [ ] |
| D7 | Self-excluded account receives zero messages | [ ] |
| D8 | Full bet flow keyboard-only + TalkBack | [ ] |
| D9 | First visit < 150KB JS; LCP < 2.5s on 3G | [ ] |
| D10 | Pen-test findings >= high closed | [ ] |
| D11 | GBT license live; reports scheduled | [ ] |
| D12 | Officer cannot resolve market they hold position in | [ ] |

---

## Ali Decisions (2 July 2026)

| # | Decision |
|---|----------|
| A1 | Kill legacy sports models permanently |
| A2 | Lopsided pools: math handles it, lean warning covers UX |
| A3 | Cash-out: simple 9% fee exit, no counterparty model |
| A4 | On-call human: yes, Ali will arrange |
| A5 | Segregated player funds: yes |
| A6 | KYC storage: Cloudflare R2 |

---

## Session Log

| Date | Items | Commits |
|------|-------|---------|
| 2026-07-02 | Items 1, 3, 28 + tracker setup | 4c869f4, 33ca139 |
