# Elevation Tracker — 50pick v3.0

> Source: `NEW PHASE DESIGN/50pick Elevation Spec.dc.html` (142 recommendations)
> Baseline: v2.5 / commit 0499a42 | Started: 2 July 2026
> Status legend: `[ ]` pending | `[~]` in-progress | `[x]` done | `[-]` deferred/skipped

---

## Phase 1A — Pure Correctness (P0 money-path)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 1 | Postgres advisory locks (replace in-memory `withLock()`) | S01,S07 | [x] | 4c869f4 | pg_advisory_xact_lock in $transaction, 31 call sites, all tests green |
| 2 | Double-entry ledger schema + migration | S01,S07 | [ ] | | |
| 3 | Client idempotency keys (bet/deposit/withdraw) | S01,S07 | [x] | 4c869f4 | UUID per intent, Position+Transaction schema, 9 suites green |
| 4 | Transactional outbox (SSE/email/notifications) | S01,S07 | [ ] | | |
| 5 | Webhook idempotency + signature verification | S01,S07 | [ ] | | |
| 6 | Closed-loop withdrawal rule | S08 | [ ] | | |
| 7 | Marketing suppression choke point | S09 | [ ] | | |

## Phase 1B — Infrastructure Hardening (P0 infra)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 8 | Redis: sessions + rate-limit + SSE fan-out | S07 | [ ] | | |
| 9 | Sentry + OpenTelemetry + structured logs | S07 | [ ] | | |
| 10 | Golden alerts (webhook fail, p99, ledger, SSE) | S07 | [ ] | | |
| 11 | Database indexes (positions, markets, txns, audit) | S07 | [ ] | | |
| 12 | PITR enabled + restore drill | S07 | [ ] | | |
| 13 | pg-boss job runner (market auto-close, bonus expiry, reconciliation) | S07 | [ ] | | |
| 14 | Multi-account / bonus-ring detection | S08 | [ ] | | |
| 15 | State coverage matrix + a11y CI gates | S02.4,S02.5 | [ ] | | |
| 16 | Admin date/head unification (single formatDate) | S02.4 | [ ] | | |

## Phase 2 — Trusted & Loved (P1, weeks 8-20)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 17 | Withdrawal SLA + status timeline + public stats | S06 | [ ] | | |
| 18 | Anchored proofs (OpenTimestamps) + "Verify this market" | S06 | [ ] | | |
| 19 | Dispute/objection flow (UI + evidence upload + rulings) | S06 | [ ] | | |
| 20 | Practice mode (TZS 10k practice shillings) | S03.1 | [ ] | | |
| 21 | Watchlist + price alerts + discovery rails | S03.2 | [ ] | | |
| 22 | Calibration engine + Pick Score + profiles | S04 | [ ] | | |
| 23 | WhatsApp Business API channel | S05.2 | [ ] | | |
| 24 | Share cards (WhatsApp status sized) | S10 | [ ] | | |
| 25 | Payout-math transparency (live itemized breakdown) | S03.3 | [ ] | | |
| 26 | Resolution ceremony (3-beat animation) | S02.1 | [ ] | | |
| 27 | Swahili voice pass (native copy, tone guide) | S05.4 | [ ] | | |
| 28 | Tanzania leo shelf + local market program | S05.5 | [ ] | | |
| 29 | Glare mode (sunlight-readable) | S02.6 | [ ] | | |
| 30 | Data-saver mode (Save-Data, locale-split bundles) | S02.7 | [ ] | | |
| 31 | Markers-of-harm engine v1 | S09 | [ ] | | |
| 32 | Positive-play dashboard (monthly honest statement) | S09 | [ ] | | |
| 33 | Support console (player-context view + safe actions) | S11 | [ ] | | |
| 34 | Status page (status.50pick.co.tz) | S11 | [ ] | | |
| 35 | Signature motion: live needle tilt, seal-press, detents | S02.1 | [ ] | | |
| 36 | Data-visualization system (probability river, pool depth, etc.) | S02.2 | [ ] | | |
| 37 | Icon grammar standardization (24px grid, 1.75px stroke) | S02.3 | [ ] | | |
| 38 | Admin design parity (DataTable, Zod client-side, cmd-K) | S02.9 | [ ] | | |
| 39 | Regulator read-only mode | S02.9 | [ ] | | |
| 40 | Off-platform surface parity (MJML emails, OG images, PDFs) | S02.10 | [ ] | | |
| 41 | Search upgrade (typo-tolerant Swahili/English, pg_trgm) | S03.2 | [ ] | | |
| 42 | Pool history + recent activity feed | S03.3 | [ ] | | |
| 43 | Cash-out transparency (fee + implied exit price) | S03.3 | [ ] | | |
| 44 | Session hardening (step-up re-auth, new-device notification) | S08 | [ ] | | |
| 45 | Market-integrity monitoring (late-swing, officer-conflict block) | S08 | [ ] | | |
| 46 | Program hygiene (pen-test, secrets manager, WAF, disclosure page) | S08 | [ ] | | |
| 47 | Tax transparency (itemized TRA withholding on receipts) | S09 | [ ] | | |
| 48 | Compliance automation (8 report templates scheduled) | S09 | [ ] | | |
| 49 | Shareable moments (win/badge/rank share cards) | S10 | [ ] | | |
| 50 | Lifecycle messaging (event-keyed journeys) | S10 | [ ] | | |
| 51 | PostHog analytics + event taxonomy + funnel dashboards | S10 | [ ] | | |
| 52 | Incident runbooks (top 8 failure modes) | S11 | [ ] | | |
| 53 | Playwright E2E money path + k6 load test | S07 | [ ] | | |
| 54 | Performance budgets in CI (LCP, JS size, nav time) | S07 | [ ] | | |
| 55 | Closing-soon rail + big-movers rail on /markets | S03.2 | [ ] | | |
| 56 | Resolution criterion up front (source, time, officer slot) | S03.3 | [ ] | | |

## Phase 3 — Without Peer (P2, weeks 20-36)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 57 | USSD companion (*150*XX#) | S05.1 | [ ] | | |
| 58 | Vikundi — private prediction circles | S03.5 | [ ] | | |
| 59 | Multi-outcome & range markets | S03.4 | [ ] | | |
| 60 | Seasons + heraldic tiers + streaks | S04 | [ ] | | |
| 61 | Agent (wakala) cash-in program | S05.3 | [ ] | | |
| 62 | Argument threads + calibration-weighted votes | S03.6 | [ ] | | |
| 63 | Sound design (5 sounds, opt-in) | S02.8 | [ ] | | |
| 64 | Passkeys for players (WebAuthn) | S08 | [ ] | | |
| 65 | Pool-solvency proof (daily automated statement) | S06 | [ ] | | |
| 66 | Annual third-party fairness audit | S06 | [ ] | | |
| 67 | Money-flow sankey (admin dashboard) | S02.2 | [ ] | | |
| 68 | Regulator mode (read-only role for GBT inspections) | S02.9 | [ ] | | |
| 69 | Officer training + four-eyes tooling (source snapshot) | S11 | [ ] | | |
| 70 | Prediction streaks (daily free prediction) | S10 | [ ] | | |
| 71 | Referral upgrade (settled-bet trigger, kikundi-aware) | S10 | [ ] | | |

---

## Definition of Done (S13)

| # | Check | Status |
|---|-------|--------|
| D1 | Real deposit lands via all 5 providers, incl. forced duplicate webhook | [ ] |
| D2 | Ledger sums to zero after k6 500-concurrent-bet run | [ ] |
| D3 | Two instances serve traffic with no lock/SSE anomalies for 72h | [ ] |
| D4 | Restore drill completed inside RTO, documented | [ ] |
| D5 | Median withdrawal < 60 min over 2-week pilot, published | [ ] |
| D6 | "Log out all sessions" verifiably kills a live token | [ ] |
| D7 | Self-excluded test account receives zero messages across all channels | [ ] |
| D8 | Full bet flow completed keyboard-only and with TalkBack | [ ] |
| D9 | First visit < 150KB JS; LCP < 2.5s on throttled 3G profile | [ ] |
| D10 | Every route passes 7-state coverage matrix in CI | [ ] |
| D11 | Native-speaker sign-off on all SW + ZH strings | [ ] |
| D12 | Pen-test findings >= high severity closed | [ ] |
| D13 | GBT license number live; 8 reports scheduled with delivery receipts | [ ] |
| D14 | Incident runbooks rehearsed once (game day) | [ ] |
| D15 | Resolution dispute filed, ruled, published end-to-end in staging | [ ] |
| D16 | Officer cannot resolve a market they hold a position in (hard-block) | [ ] |

---

## Session Log

| Date | Session | Items Worked | Commits | Notes |
|------|---------|-------------|---------|-------|
| 2026-07-02 | #1 | Setup tracker + Items 1,3 (locks + idempotency) | 4c869f4 | Advisory locks + idempotency keys. 201 tests green across 9 suites |
