# 50pick — Enhancement-Plan Status (finish-before-payment tracker)

> **Notes kept here so nothing is lost.** Consolidates what REMAINS across the
> audit (`FINAL-AUDIT-REMEDIATION.md` — all Criticals/Highs/Mediums closed),
> `perfection-plan.md` §5/§9, `feature-backlog.md`, and `ui-rollout-tracker.md`.
> Verified against live code 2026-07-16. Legend: [ ] pending · [~] partial · [x] done.
> Grouped: **(A) code-doable now · (B) needs Ali (infra/creds/assets/decision) ·
> (C) optional polish.** Work top-down within (A); update as we go.

Big picture: kit rollout + feature backlog are essentially shipped. Real remaining
surface = §9 (unify primitives + missing admin controls) + a few infra/assets.

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
      lockstep; overdraw blocked). *Deferred (lower value):* per-player limit
      override, force-reverify KYC, resend-comms. *Hardening:* two-officer for
      large adjustments (like AML ≥1M).
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
- [ ] **A8 · `twoOfficerGate()` + `<AttestationRail>`** — §9.1. Unify maker-checker
      duplicated in reports/kyc/resolver/objections.
- [ ] **A9 · Migrate config modules to `defineConfig`** — §9.1. ~8 modules still
      hand-roll globalThis-cache + ensureHydrated (only bonus/proposals migrated).
- [ ] **A10 · Money-format hygiene** — §9.1. Convert remaining ~9 component
      `.toLocaleString` on money → `formatTzs`; add a lint rule banning it.
- [ ] **A11 · Migrate 6 player popups to `<Modal>`** — §9.1 (bet-confirm, sell-confirm,
      operation-result, win-celebration, first-visit-primer, reality-check). Needs
      visual re-verify at 360/768/1280/1920.
- [ ] **A12 · Async in-memory store** — §9.4. Kills the `Promise.resolve(db.x()).catch`
      crash class (true dev↔prod parity). Broad but mechanical.
- [ ] **A13 · Officer directory / RBAC UI** — §9.3 #11. `/admin/roles` role assignment.
- [ ] **A14 · Scheduled reports engine** — §9.3 #6. cadence/recipients/pause/delete.
- [ ] **A15 · Post-publish market edit (audited)** — §9.3 #9. copy/source/criterion +
      merge/dup detection.
- [ ] **A16 · Bonus start/end windows + targeting** — §9.3 #10.
- [ ] **A17 · Live-ops matches feed** — §9.3 #12. Decide: hide the empty section, or
      wire a real feed (never fabricate). (Currently shows empty "no live matches".)
- [ ] **A18 · L6 remainder (visual)** — top-bar Wallet/Deposit pill, dial Lock/Unlock,
      lang switcher, admin tabs → ≥44px; re-run responsive-audit. AAA (AA met).
- [ ] **A19 · P1 delighters** — `/live` carousel auto-advance + swipe; `/results`
      notable arrows/swipe.
- [~] **A20 · Audit hardenings** —
      • **C5 webhook nonce — WON'T BUILD (verified 2026-07-16):** redundant AND
        harmful. Settlement is already idempotent (status-gated + amount-verify +
        5-min timestamp window), and the webhook returns 200 on verified posts so
        providers stop retrying. A signature-nonce would REJECT a provider's
        legitimate retry-after-failure → the txn would never settle. Status-gating
        already prevents replay double-credit. So C5 as specified is closed as
        not-needed.
      • **M2 largest-remainder payout — DEFERRED (safe to build, do fresh):**
        re-analysis shows the winner-floor CANNOT break under largest-remainder —
        the fee cap guarantees `netPool ≥ winningPool`, so `share·netPool ≥ stake`
        and `floor(share·netPool) ≥ stake` (stake is integer). It restructures the
        settlement payout loop (pre-pass allocation), so it's a fresh focused change,
        not a session-tail edit. Current dust is bounded + tested (money-invariants).
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
- [ ] **Payment aggregator** (Selcom/AzamPay/Mixx) integration → then `AUTO_SETTLE=true`. See `GO-LIVE-READINESS.md` §2.
- [ ] **VAPID keys** for web-push (F4 in stub mode).
- [ ] **⊘ bitmap assets:** TZ hero-bg.webp, 4 MNO logos, regulator seal, propose/bonus/invite banners, navy-weave texture, category *.webp.
- [ ] **F6 seeded liquidity** — business/compliance decision (+ TRA tax-base ruling; unused `HousePoolLedger`).
- [ ] **DNS repoint** 50pick.tz → Railway · **Sentry DSN** · **Redis (H2)** · **pentest** · **DR-restore rehearsal**.
- [ ] Env: real SMS sender ID, deploy domain, `TOTP_ENC_KEY` before rotating `SESSION_SECRET`.
- [ ] CI tooling: install axe-core + add `next build`/Lighthouse to the gate.

---

## (C) Optional polish (low value / covered another way)
- win-seal.png (RewardBurst is SVG) · category section-toppers (glyph tier covers it)
  · OG brand fonts · per-locale manifest · collapse overlapping Chip variants ·
  remove dead KPI `tone`/`gold` branch in admin-shell.
