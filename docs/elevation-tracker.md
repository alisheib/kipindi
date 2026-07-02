# Elevation Tracker — 50pick v3.0

> Sources: Elevation Spec v3.0 (142 items) + Claude Fable External Review (2 Jul 2026)
> Baseline: v2.5 / commit 0499a42 | Started: 2 July 2026
> Status legend: `[ ]` pending | `[~]` in-progress | `[x]` done | `[-]` deferred/skipped

---

## Phase 0 — Schema Cleanup (BEFORE ledger)

Fable review: "Schema debt will sabotage item #2 unless cleaned first."
Items marked [BLOCKER] are prerequisites for the ledger migration.

| # | Item | Source | Status | Commit | Notes |
|---|------|--------|--------|--------|-------|
| 0a | Split `betId` → `positionId` FK + classify existing rows | Fable 1.1 [BLOCKER] | [ ] | | Polymorphic soft ref makes ledger backfill impossible |
| 0b | Drop legacy sports models (Bet/Window/Pool/Match/MatchEvent/BetBundle/Sport/League/Team) | Fable 1.2 [BLOCKER] | [ ] | | Ali: KILL. Remove permanently. Archive SQL in migration comment. |
| 0c | CHECK constraints: balance>=0, hold>=0, bonusBalance>=0, pending>=0 | Fable 1.3 [BLOCKER] | [ ] | | Currently comments only — verify prod data first |
| 0d | Plan HousePoolLedger retirement into double-entry | Fable 1.4 [BLOCKER] | [ ] | | Must fold into chart of accounts, not stay parallel |
| 0e | Drop StoreSnapshot model | Fable 1.5 | [ ] | | Dead code from pre-DAL era |
| 0f | Fix `AiUsageEvent.costUsd` Float → Decimal(10,6) | Fable 1.6 | [ ] | | Never Float for money |
| 0g | Wire market-config to SystemConfig table | Fable 1.11 | [ ] | | Memory-only config loses on restart |

## Phase 1A — Pure Correctness (P0 money-path)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 1 | Postgres advisory locks (replace in-memory `withLock()`) | S01,S07 | [x] | 4c869f4 | pg_advisory_xact_lock in $transaction, 31 call sites |
| 2 | Double-entry ledger (dual-write → prove → flip) | S01,S07 | [ ] | | AFTER Phase 0. Fable §2: no history replay, opening-balance entries |
| 3 | Client idempotency keys (bet/deposit/withdraw) | S01,S07 | [x] | 4c869f4 | UUID per intent, Position+Transaction schema |
| 4 | Transactional outbox + pg-boss jobs | S01,S07 | [ ] | | Combined: outbox for SSE/email + job runner for auto-close/expiry |
| 5 | Webhook idempotency + signature verification | S01,S07 | [ ] | | Provider txn ID as unique key + HMAC verify |
| 6 | Closed-loop withdrawal rule | S08 | [ ] | | Withdraw only to depositing phone/number |
| 7 | Marketing suppression choke point | S09 | [ ] | | Central check: no promos to excluded/cooled/at-limit users |

## Phase 1B — Infrastructure Hardening (P0 infra)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 8 | Redis: sessions + rate-limit + SSE fan-out | S07 | [ ] | | Design session registry as user→session SET (Fable 1.10) |
| 9 | Sentry + OpenTelemetry + structured logs | S07 | [ ] | | |
| 10 | Golden alerts (webhook fail, p99, ledger invariant, SSE) | S07 | [ ] | | Include write-time ledger invariant breach → read-only flag (Fable §2) |
| 11 | Database indexes (positions, markets, txns, audit) | S07 | [ ] | | |
| 12 | PITR enabled + restore drill | S07 | [ ] | | |
| 13 | pg-boss job runner | S07 | [ ] | | Merged with item #4 |
| 14 | Multi-account / bonus-ring detection | S08 | [ ] | | |
| 15 | Performance budget CI (LCP, JS size, nav time) | S07 | [ ] | | MOVED UP from Phase 2 — Fable: "budget before charts/animations land" |
| 16 | Admin date/head unification (single formatDate) + empty states | S02.4 | [ ] | | Fable: "cheap, do early — officers stare at this 8h/day" |

## Phase 2 — Trusted & Loved (P1)

Reordered per Fable §4: withdrawal SLA first, WhatsApp before USSD.

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 17 | Withdrawal SLA + status timeline + public stats | S06 | [ ] | | FIRST in Phase 2 — Fable: "the actual trust moat" |
| 18 | Anchored proofs (OpenTimestamps) + "Verify this market" | S06 | [ ] | | Frame as "auditable" not "provably fair" (Fable §4.9) |
| 19 | Dispute/objection flow (UI + evidence upload + rulings) | S06 | [ ] | | |
| 20 | Practice mode (TZS 10k practice shillings) | S03.1 | [ ] | | |
| 21 | Watchlist + price alerts + discovery rails | S03.2 | [ ] | | |
| 22 | Calibration engine + Pick Score + profiles | S04 | [ ] | | NEEDS SCORING SPEC FIRST: shrinkage, min-n gate, closing-price scoring (Fable 3.5) |
| 23 | WhatsApp Business API channel | S05.2 | [ ] | | Before USSD (Fable §4.3) |
| 24 | Share cards (WhatsApp status sized) | S10 | [ ] | | |
| 25 | Payout-math transparency (live itemized breakdown) | S03.3 | [ ] | | |
| 26 | Resolution ceremony (4-beat: sweep → signatures → drain → verify link) | S02.1 | [ ] | | Added 4th beat per Fable §4.8 |
| 27 | Swahili voice pass (native copy, tone guide) | S05.4 | [ ] | | |
| 28 | Tanzania leo shelf + local market program | S05.5 | [ ] | | |
| 29 | Glare mode (sunlight-readable) | S02.6 | [ ] | | |
| 30 | Data-saver mode (Save-Data, locale-split bundles) | S02.7 | [ ] | | Before USSD (Fable §4.3) |
| 31 | Markers-of-harm engine v1 | S09 | [ ] | | |
| 32 | Positive-play dashboard (monthly honest statement) | S09 | [ ] | | |
| 33 | Support console (player-context view + safe actions) | S11 | [ ] | | |
| 34 | Status page (status.50pick.co.tz) | S11 | [ ] | | |
| 35 | Signature motion: live needle tilt, seal-press, detents | S02.1 | [ ] | | |
| 36 | Data-visualization system (probability river, pool depth, etc.) | S02.2 | [ ] | | |
| 37 | Icon grammar standardization (24px grid, 1.75px stroke) | S02.3 | [x] | 33ca139 | 17 priority icons + badges + empty states redesigned |
| 38 | Admin design parity (DataTable, Zod client-side, cmd-K) | S02.9 | [ ] | | |
| 39 | Regulator read-only mode | S02.9 | [ ] | | |
| 40 | Off-platform surface parity (MJML emails, OG images, PDFs) | S02.10 | [ ] | | |
| 41 | Search upgrade (typo-tolerant Swahili/English, pg_trgm) | S03.2 | [ ] | | |
| 42 | Pool history + recent activity feed | S03.3 | [ ] | | |
| 43 | Cash-out transparency (fee + implied exit price) | S03.3 | [ ] | | NEEDS cash-out counterparty model first (Fable 3.3) |
| 44 | Session hardening (step-up re-auth, new-device notification) | S08 | [ ] | | |
| 45 | Market-integrity monitoring (late-swing, officer-conflict block) | S08 | [ ] | | Log officer-vs-sentinel disagreement rates (Fable 3.4) |
| 46 | Program hygiene (pen-test, secrets manager, WAF, disclosure page) | S08 | [ ] | | |
| 47 | Tax transparency (itemized TRA withholding on receipts) | S09 | [ ] | | |
| 48 | Compliance automation (8 report templates scheduled) | S09 | [ ] | | |
| 49 | Shareable moments (win/badge/rank share cards) | S10 | [ ] | | |
| 50 | Lifecycle messaging (event-keyed journeys) | S10 | [ ] | | |
| 51 | PostHog analytics + event taxonomy + funnel dashboards | S10 | [ ] | | |
| 52 | Incident runbooks (top 8 failure modes) | S11 | [ ] | | Only as good as the human on the pager (Fable 3.6) |
| 53 | Playwright E2E money path + k6 load test | S07 | [ ] | | |
| 54 | Closing-soon rail + big-movers rail on /markets | S03.2 | [ ] | | |
| 55 | Resolution criterion up front (source, time, officer slot) | S03.3 | [ ] | | |

## Phase 3 — Without Peer (P2)

| # | Item | Spec | Status | Commit | Notes |
|---|------|------|--------|--------|-------|
| 56 | USSD companion (*150*XX#) | S05.1 | [ ] | | After WhatsApp + data-saver (Fable §4.3) |
| 57 | Vikundi — private prediction circles | S03.5 | [ ] | | |
| 58 | Multi-outcome & range markets | S03.4 | [ ] | | FROZEN until ledger stable in prod for months (Fable §4.5) |
| 59 | Seasons + heraldic tiers + streaks | S04 | [ ] | | |
| 60 | Agent (wakala) cash-in program | S05.3 | [ ] | | Fable: arguably matters more than USSD |
| 61 | Argument threads + calibration-weighted votes | S03.6 | [ ] | | |
| 62 | Sound design (5 sounds, opt-in) | S02.8 | [-] | | Fable: candidate for cut. Keep haptic only. |
| 63 | Passkeys for players (WebAuthn) | S08 | [ ] | | |
| 64 | Pool-solvency proof (daily automated statement) | S06 | [ ] | | Segregated funds arrangement first (Fable 3.7) |
| 65 | Annual third-party fairness audit | S06 | [ ] | | |
| 66 | Money-flow sankey (admin dashboard) | S02.2 | [ ] | | |
| 67 | Regulator mode (read-only role for GBT inspections) | S02.9 | [ ] | | |
| 68 | Officer training + four-eyes tooling (source snapshot) | S11 | [ ] | | |
| 69 | Prediction streaks (daily free prediction) | S10 | [ ] | | |
| 70 | Referral upgrade (settled-bet trigger, kikundi-aware) | S10 | [ ] | | |

---

## Ali Decision Memo — RESOLVED (2 July 2026)

| # | Decision | Engineering Impact |
|---|----------|-------------------|
| A1 | **KILL legacy sports models.** Remove permanently. | Drop Bet/Window/Pool/Match/MatchEvent/BetBundle/Sport/League/Team in Phase 0b |
| A2 | **Math handles lopsided pools.** Winners get proportional share minus 9%. Lean warning covers UX. No void-if-one-sided. | Ensure lean warning visible at all thresholds. No new code. |
| A3 | **Simple cash-out exit.** Player exits pool, pays 9% fee, money returned. No complex counterparty model for MVP. | Current cashOut logic correct. Document the model. |
| A4 | **Yes, on-call human.** Ali will arrange. | Document who + ensure runbook + secrets access before real deposits. |
| A5 | **Yes, segregated funds.** Separate bank account from operator. | Document arrangement with aggregator/bank. GBT prerequisite. |
| A6 | **Cloudflare R2.** S3-compatible, cheapest, encrypted at rest by default. | Set up R2 bucket + access logging. Move avatars + KYC docs together. |

---

## Data Protection — PDPA 2022 (Fable §3.1)

Tanzania Personal Data Protection Act 2022 — regulator asks before SSE.

| # | Item | Status | Notes |
|---|------|--------|-------|
| P1 | Written retention schedule per data class | [ ] | |
| P2 | Deletion/anonymization pipeline (extend AuditLog no-FK pattern) | [ ] | |
| P3 | DSAR (subject access request) flow, tested | [ ] | |
| P4 | Breach-notification runbook | [ ] | |
| P5 | Encryption-at-rest + access logging for KYC documents | [ ] | Blocks on A6 (storage provider) |

---

## Evidence Table — Path to 10/10 (Fable §5)

Features get to 9. The 10th point is proof.

| # | Proof | Evidence | Status |
|---|-------|----------|--------|
| E1 | Ledger zero-sum survives k6 500-bet run on 2 instances | k6 output + invariant query | [ ] |
| E2 | Write-time invariant breach flips money-paths read-only + pages | fault-injection test log | [ ] |
| E3 | 72h on two instances, zero lock/SSE anomalies | monitoring export | [ ] |
| E4 | Restore drill performed inside RTO | dated drill doc with timings | [ ] |
| E5 | Duplicate/out-of-order/delayed/forged webhooks all handled | test suite + payload archive | [ ] |
| E6 | PDPA binder: retention, DSAR tested, breach runbook, encrypted KYC | docs + test run | [ ] |
| E7 | Segregated funds documented; daily solvency published | bank letter + /fairness page | [ ] |
| E8 | Median withdrawal published live, sustained >= 1 month | /fairness stats history | [ ] |
| E9 | One real dispute filed→ruled→published end-to-end in prod | published ruling | [ ] |
| E10 | Officer-vs-sentinel disagreement rate monitored | dashboard + audit entries | [ ] |
| E11 | Calibration scoring spec: shrinkage + min-n + closing-price scoring | spec + simulation | [ ] |
| E12 | Named human on-call with rehearsed game day | rota + postmortem | [ ] |
| E13 | Keyboard-only + TalkBack full bet flow verified by human | recorded pass | [ ] |
| E14 | Third-party pen-test report published | the report | [ ] |
| E15 | GBT license live; 8 reports auto-filing with receipts | delivery receipts | [ ] |

---

## Definition of Done (updated with Evidence column)

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| D1 | Real deposit via all providers, incl. forced duplicate webhook | [ ] | |
| D2 | Ledger sums to zero after k6 500-concurrent-bet run | [ ] | |
| D3 | Two instances, no lock/SSE anomalies for 72h | [ ] | |
| D4 | Restore drill inside RTO, documented | [ ] | |
| D5 | Median withdrawal < 60 min over 2-week pilot | [ ] | |
| D6 | "Log out all sessions" kills a live token | [ ] | |
| D7 | Self-excluded account receives zero messages on all channels | [ ] | |
| D8 | Full bet flow keyboard-only and with TalkBack | [ ] | |
| D9 | First visit < 150KB JS; LCP < 2.5s on throttled 3G | [ ] | |
| D10 | Every route passes 7-state coverage matrix in CI | [ ] | |
| D11 | Native-speaker sign-off on all SW + ZH strings | [ ] | |
| D12 | Pen-test findings >= high severity closed | [ ] | |
| D13 | GBT license number live; 8 reports scheduled with receipts | [ ] | |
| D14 | Incident runbooks rehearsed once (game day) | [ ] | |
| D15 | Resolution dispute filed→ruled→published end-to-end | [ ] | |
| D16 | Officer cannot resolve market they hold a position in | [ ] | |

---

## Session Log

| Date | Session | Items Worked | Commits | Notes |
|------|---------|-------------|---------|-------|
| 2026-07-02 | #1 | Items 1,3 (locks + idempotency) | 4c869f4 | Advisory locks + idempotency keys. 900+ tests green |
| 2026-07-02 | #1 | Item 37 (icon redesign) | 33ca139 | 17 priority glyphs + 11 badges + 7 empty states redesigned |
| 2026-07-02 | #1 | Tracker rewrite | pending | Merged Fable review, added Phase 0 + Ali Memo + PDPA + Evidence |
