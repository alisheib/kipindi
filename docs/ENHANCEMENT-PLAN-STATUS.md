# 50pick — Enhancement-Plan Status (finish-before-payment tracker)

> **Notes kept here so nothing is lost.** Consolidates what REMAINS across the
> audit (`FINAL-AUDIT-REMEDIATION.md` — all Criticals/Highs/Mediums closed),
> `perfection-plan.md` §5/§9, `feature-backlog.md`, and `ui-rollout-tracker.md`.
> Verified against live code 2026-07-16. Legend: [ ] pending · [~] partial · [x] done.
> Grouped: **(A) code-doable now · (B) needs Ali (infra/creds/assets/decision) ·
> (C) optional polish.** Work top-down within (A); update as we go.

## ⭐ WHERE WE STAND (2026-07-16, after the Session-E merge → LIVE @ 023dfbf)

**Nothing in the enhancement plan blocks payment integration or launch.** The
launch-critical work is DONE and deployed:
- **Audit** — all 11 Criticals + all Highs + all Mediums closed.
- **Money-ops (Session M)** — A1–A5, M2 exact-conservation payouts, audited
  balance-adjust + force-reverify-KYC. Money is atomic, provable (trial balance),
  fork-proof (audit chain), drift-detected.
- **Session E (§9 UI/compliance)** — A8 unified maker-checker, A9 config factory
  (affiliate), A10 money-format hygiene + guard, A11 six popups → `<Modal>`,
  A17/§9.2/§9.4 cleanups, A18 tap targets ≥44px, A19 /live + /results carousels.
  Merged zero-conflict, full gate green, prod verified (200s, logs clean, visual
  0 hard fails at 360/768/1280/1920).

**The ONE thing that unblocks real money = the payment aggregator API keys**
(item B below). Everything else remaining is *optional* admin features (A6/A7/
A13–A16) and polish — nice operational tooling, not launch gates. See
`GO-LIVE-READINESS.md` §2 for the exact keys-today wiring.

Big picture: kit rollout + feature backlog are shipped; §9 primitives-unification
is done. Real remaining surface = a few optional admin features + Ali's infra/creds.

---

## (A) Code-doable now — the finish-the-plan work queue

Ordered by value for a clean go-live + real-money ops. Update status inline.

- [x] **A1 · R2 object storage seam (H8)** — DONE. `src/lib/server/storage.ts`
      (`putKycDocument`/`readKycDocument`), env-gated: INLINE base64 (unchanged) by
      default, Cloudflare R2 (S3-compatible, optional `@aws-sdk/client-s3` via
      computed specifier so the build never requires it) when `KYC_STORAGE=r2` +
      R2 creds set. Wired into `kyc-service` upload + `/api/admin/kyc-doc` read;
      old inline rows keep working. KYC suites 15+12 green. **Ali to ACTIVATE:**
      `npm i @aws-sdk/client-s3`, set R2 env (see `.env.example`), staging round-trip.
- [~] **A2 · Player balance adjustment (audited)** — §9.3 #4. **DONE:** manual
      credit/debit with mandatory reason — `wallet-service.adminAdjustBalance`
      (atomic wallet+txn+ledger via withMoneyTx, overdraw-guarded, `COMPLIANCE`
      audit, 50M cap) + gated `adjustBalanceAction` + `BalanceAdjustControls` UI on
      `/admin/players/[id]`. Proven on PG (credit/debit move balance + ledger in
      lockstep; overdraw blocked). **Also DONE: force-reverify KYC** —
      `forceReverifyKyc` (APPROVED → ADDITIONAL_INFO_REQUIRED: re-locks withdrawals
      via the `kyc.status==="APPROVED"` gate + reopens resubmit) + gated action +
      `ForceReverifyControls` (shown when APPROVED), COMPLIANCE-audited; KYC suites
      15+12 green. *Deferred:* per-player RG limit override (needs an admin-vs-RG
      cooldown policy call — `setLimits` exists but increases are cooled-off by
      design), resend-comms (underspecified). *Hardening:* two-officer for large
      balance adjustments (like AML ≥1M).
- [x] **A3 · Reconciliation match / write-off** — §9.3 #7. DONE:
      `reconcileMatchAction` (set the PSP settlement ref → clears drift) +
      `reconcileWriteOffAction` (sentinel ref + mandatory reason), both gated +
      `COMPLIANCE`-audited (no money moves); `ReconcileControls` per unmatched item
      on `/admin/payments`.
- [x] **A4 · Withdrawal + bulk retry** — §9.3 #8. DONE: `retryWithdrawalAction`
      (Retry now shown for WITHDRAWAL rows too) + `bulkRetryAction` ("Retry all"
      on the queue card, capped 50/run) — both re-run the tested `deposit()`/
      `withdraw()` flows (no double-pay: deposits never debit; failed withdrawals
      were auto-refunded at fail-time), gated + audited. *Deferred (low value):*
      auto-retry policy config.
- [x] **A5 · Materialise heavy aggregates** — VERIFIED already handled where it
      matters. The high-traffic home `stats-band` → `getPlatformStats`
      (`platform-stats.ts`) is a DB-side SUM (`sumConfirmedByTypes`, no row scan) +
      60s `globalThis` TTL cache. `allMnoHealth` is a bounded windowed query (24h,
      DEPOSIT/WITHDRAWAL only), and a health dashboard should stay LIVE (caching it
      would show stale health), so it's correctly uncached. No full-table scans
      remain on a hot path — no change needed.
- [ ] **A6 · Featured/pinned markets** — §9.3 #3. `isPinned` + admin pin control +
      wire `/live` hero + `/results` notable (auto today).
- [ ] **A7 · Configurable compliance knobs** — §9.3 #2. Surface KYC maker-checker
      threshold (70), AML threshold (1M), KYC SLA, reject reason-codes, void reasons
      in `/admin/config` (hardcoded in `kyc-risk.ts`).
- [x] **A8 · `twoOfficerGate()` + `<AttestationRail>`** — §9.1. DONE (Session E).
      Shared `src/lib/server/two-officer.ts` + `components/admin/attestation-rail.tsx`;
      reports/kyc/resolver banners unified; **KYC self-approval now also writes a
      `conflict_blocked` COMPLIANCE audit** (was silent). objections = single-officer
      by design. *M follow-up (optional):* resolver/emergency-void B≠A gate in the
      DENYLISTED `market-service.ts` could adopt the helper — behaviourally identical.
- [~] **A9 · Migrate config modules to `defineConfig`** — §9.1. **affiliate-config
      DONE (Session E).** The other 6 deliberately NOT force-migrated with rationale
      (proposals already on it; ai-config has no setter; ai-poll-config is intentionally
      not DB-persisted; ai-ops-config has read-time coercion + unaudited setters;
      **platform-config awaits-first-read for the maintenance money-gate — migrating
      would open a post-boot OFF window (money-safety regression)**; test-overrides is
      a POCA §16 COMPLIANCE control). platform-config needs an "await-first-read"
      factory option (also touches bonus-config) — an M-side call. See session-E-notes.
- [x] **A10 · Money-format hygiene** — §9.1. DONE (Session E). Every editable-UI money
      `.toLocaleString` → `formatTzs`/`formatTzsCompact`/`formatNumber`; a precise A10
      guard added to `test:integrity` (no ESLint in repo) banning `TZS {…toLocaleString}`
      / `*Tzs.toLocaleString` in src/components + src/app (skips src/lib/server).
      *M follow-up (cosmetic):* server-side money `.toLocaleString` in `src/lib/server/**`
      (analytics/validators/RG/reports) — out of the UI guard's scope.
- [x] **A11 · Migrate 6 player popups to `<Modal>`** — §9.1. DONE (Session E).
      bet-confirm/sell-confirm/operation-result/win-celebration/first-visit-primer/
      reality-check all on the extended `<Modal>` (added `zIndex`/`ariaBusy`/`sheet`);
      wrapper-only, no bet/sell/settlement logic changed. Visual re-verified.
- [ ] **A12 · Async in-memory store** — §9.4. Kills the `Promise.resolve(db.x()).catch`
      crash class (true dev↔prod parity). Broad but mechanical. *Not a launch gate*
      (prod uses the Prisma DAL; the in-memory store is test-only + now boot-blocked
      under NODE_ENV=production).
- [ ] **A13 · Officer directory / RBAC UI** — §9.3 #11. `/admin/roles` role assignment.
- [ ] **A14 · Scheduled reports engine** — §9.3 #6. cadence/recipients/pause/delete.
- [ ] **A15 · Post-publish market edit (audited)** — §9.3 #9. copy/source/criterion +
      merge/dup detection.
- [ ] **A16 · Bonus start/end windows + targeting** — §9.3 #10.
- [~] **A17 · Live-ops matches feed** — §9.3 #12. **DONE (Session E):** the empty
      "no live matches" card is hidden (renders only on a real feed); scaffolding
      stays ready for the signed Sportradar feed; never fabricates. (Wiring a real
      feed is a (B) integration.)
- [~] **A18 · L6 tap targets (visual)** — §9.1. **DONE (Session E) for the named set:**
      top-bar Wallet/Deposit pill, dial Lock/Unlock (112×44, no overlap), language
      switcher, admin tabs/sort/period → ≥44px (height-only, no reflow; touch-warns
      756→473, 0 hard fails). *Remaining (out of scope, flagged):* logo Home link,
      desktop nav links, /proposals buttons still <44px — a future L6 sweep. AA met.
- [x] **A19 · P1 delighters** — §9.1. DONE (Session E). `/live` FeaturedContest
      auto-advance (6s, reduced-motion aware) + swipe; `/results` notable-carousel
      (gold arrows + ←/→ + dots + swipe, no auto-advance). Verified live on prod.
- [~] **A20 · Audit hardenings** —
      • **C5 webhook nonce — WON'T BUILD (verified 2026-07-16):** redundant AND
        harmful. Settlement is already idempotent (status-gated + amount-verify +
        5-min timestamp window), and the webhook returns 200 on verified posts so
        providers stop retrying. A signature-nonce would REJECT a provider's
        legitimate retry-after-failure → the txn would never settle. Status-gating
        already prevents replay double-credit. So C5 as specified is closed as
        not-needed.
      • **M2 largest-remainder payout — DONE (2026-07-16).** `allocateWinnerPayouts`
        (payout.ts) allocates across ALL winning-side positions so **Σ payouts ==
        floor(netPool) EXACTLY** (no per-winner rounding drift → the operator's fee
        is exact; no "pool a shilling off"). Deterministic (stable id tiebreak) so a
        resumed settlement reproduces each amount; winner floor asserted per
        allocation (proven safe by the fee cap). `settleMarket` computes it once and
        credits each OPEN winner the allocated amount. New `test:payout-alloc` 12/12;
        money-invariants 78/78, ledger 89/89, markets/solo/emergency/settlement-gate
        green; **money-e2e on PG 57/57, conservation drift 0.00**.
      • **bet-STAKE single-`$transaction` — DEFERRED:** highest blast radius (nested
        wallet→market lock + pool unwind + bonus spend); money is already correct +
        drift detected. Fresh focused session with the load harness.
      • 1 `eslint-disable` in market-service — cosmetic, leave.
- [ ] **A21 · F10 lite mode · F12 live odds via SSE** (SSE bus exists, notifications-only).

**Already DONE (do not redo):** empty-state copy (B3), micro-interactions (B4),
money-module `any`/eslint-disable ≈0, finance tax single-source (D1), status-label
lexicon, ConfirmDialog `gold` retired, maintenance mode (#1), announcement (#5),
`<Modal>`/`ConfirmModal` primitive + admin/confirm migration, `defineConfig` (built),
F1–F5/F7–F9/F11/F13, regulator-pack maker-checker.

---

## (B) Needs Ali — infra / credentials / assets / decision
- [ ] **R2 bucket + credentials** (activates A1). Cloudflare R2 (S3-compatible).
- [ ] **⭐ Payment aggregator API keys (Selcom/AzamPay) — IN PROGRESS (keys today).**
      Wire `PAYMENT_AGGREGATOR`/`PAYMENT_API_KEY`/`PAYMENT_API_SECRET` + the two
      outbound calls in `payments.ts` → then `AUTO_SETTLE=true`. Inbound webhook,
      settlement state-machine, ledger, ops are ALL built. `SELCOM_WEBHOOK_SECRET`
      is set in prod; `AZAMPAY_`/`MIXX_WEBHOOK_SECRET` still to set per provider
      enabled. See `GO-LIVE-READINESS.md` §2 for the exact wiring.
- [ ] **VAPID keys** for web-push (F4 in stub mode).
- [ ] **⊘ bitmap assets:** TZ hero-bg.webp, 4 MNO logos, regulator seal, propose/bonus/invite banners, navy-weave texture, category *.webp.
- [ ] **F6 seeded liquidity** — business/compliance decision (+ TRA tax-base ruling; unused `HousePoolLedger`).
- [ ] **DNS repoint** 50pick.tz → Railway · **Sentry DSN** · **Redis (H2)** · **pentest** · **DR-restore rehearsal**.
- [ ] Env: real SMS sender ID, deploy domain, `TOTP_ENC_KEY` before rotating `SESSION_SECRET`.
- [ ] CI tooling: install axe-core + add `next build`/Lighthouse to the gate.

---

## (C) Optional polish (low value / covered another way)
- win-seal.png (RewardBurst is SVG) · category section-toppers (glyph tier covers it)
  · OG brand fonts · per-locale manifest.
- **DONE (Session E):** dead KPI `tone="gold"` alias removed from `AdminKpi` (§9.4).
- **Gated on Ali:** collapse overlapping Chip call-site variants — chip.tsx already
  solves the overlap structurally; collapsing the aliases is a design decision
  pending Ali's sign-off (§9.2).
