# 50pick — next-session brief

Read the two always-on skills first (`.claude/skills/50pick-standards` +
`.claude/skills/50pick-audit`), then this. Last updated 2026-07-16.

## State at handoff
- **The Final Audit is COMPLETE** — all 11 Criticals + all Highs + all Mediums
  closed. Record: `docs/FINAL-AUDIT-REMEDIATION.md`.
- **Prod HEALTHY.** Verify against **`https://50pick.tz`** — the live app
  (re-confirmed 2026-07-20). `www.50pick.tz` and `kipindi-production.up.railway.app`
  serve the same Railway instance. The old "custom domain parks on an Apache page"
  note was true on 2026-07-16 and was fixed by the DNS cutover on 2026-07-17 — it is
  **obsolete, do not re-raise it.** Railway CLI = alisheib07 (`railway logs -s 50pick`).
- Now finishing the **perfection-plan §9 enhancement work** before the payment
  gateway. Live tracker: **`docs/ENHANCEMENT-PLAN-STATUS.md`** (grouped: (A)
  code-doable / (B) needs-Ali / (C) optional).
- Go-live + payment-gateway map: **`docs/GO-LIVE-READINESS.md`**.

## Done (Session N — 2026-07-20, visual + a user-reported settlement bug)

- 🔴 **Resolved market cards showed the WRONG outcome.** `market-card.tsx` derived the settled
  side from `yesPct >= 50` (the crowd's money split) instead of `resolvedOutcome`, so every
  upset rendered the opposite of the truth and contradicted the detail page. Card now takes a
  `resolvedOutcome` prop, wired at all resolvable call sites (`/markets`, `/results`,
  `/watchlist`); unknown outcome renders "RESOLVED" with **no** side rather than a guess.
  New invariant **B6** + `npm run test:outcome` (verified to fail on the original line).
  **Measured on prod before the fix: 4 of 8 sampled resolved markets showed the wrong side**
  (worst on lopsided 100%-YES pools that settled NO). After: 8/8 card↔detail agreement live.
- **Motion tokens were colliding across stylesheets** — see invariant **B5** and
  `npm run test:tokens`. Read B5's scope table before citing that fix; several repaired rules
  are dead CSS. Real delta = chat panel, countdown ring, probability chart.
- 4 loading-skeleton widths aligned to their pages; `appUrl()` deduplicated and defaulted to
  the live domain; dead `lucide-react` removed.
- `npm run qa:visual` — new post-deploy live check (10 routes × 360/1280, screenshots).

⚠️ **Open, worth deciding:** `/markets` defaults to the "Today" filter and can render an empty
board while the same header reads "6 live · TZS 501k in play". Ali chose leave-as-is on
2026-07-20, before seeing it rendered. It is the first screen a tester hits.

✅ **FIXED 2026-07-20 @ `6b1975b`** — was: "the MarketCard sparkline draws on zero live cards;
`market-history.ts` is an in-memory Map on both store paths". That diagnosis was right but
incomplete. The same root cause was *also* making `/markets/[id]` render a **fabricated** price
chart: with history wiped on every deploy, `seedHistory()` generated a synthetic LCG random walk
for every market and drew it as real. The card was blank because it obeyed the A-5
no-fabrication rule; the detail page did not. Now persisted in a `MarketSnapshot` table,
`seedHistory` deleted, charts start empty and fill with real bets. Guard: `npm run test:history`.

## Done (Session M — money-ops, all live + verified)
A1 R2 storage seam (H8) · A2 audited balance-adjust + force-reverify KYC · A3 PSP
reconcile match/write-off · A4 withdrawal + bulk retry · A5 aggregates (verified
materialized) · M2 largest-remainder payouts (Σ == floor(netPool) exactly;
money-e2e drift 0.00). New tests: `test:payout-alloc`, `test:admin-money-ops`.

## Do next (code) — in priority order
1. **When a parallel Session E branch (`enhance/perfection-9`) is ready:** fetch it,
   run the full gate (`tsc` + `build` + `test:all` + `test:integrity`), merge to
   `main`, deploy, verify. (Coordination contract: `docs/PARALLEL-SESSION-COORDINATION.md`.)
2. **Cross-cutting features (best AFTER E merges — they touch money/schema + UI):**
   A6 featured/pinned markets · A7 configurable compliance knobs (KYC/AML thresholds
   → `/admin/config`) · A13 officer/RBAC UI · A14 scheduled-reports engine · A15
   post-publish market edit · A16 bonus start/end windows · two-officer for large
   balance adjustments (reuse E's `twoOfficerGate`).
3. **Dedicated focused session (highest blast radius):** bet-STAKE
   single-`$transaction` — thread `tx` through bonus-service + a pool-unwind path;
   verify with the load harness. (Money already correct + durable + detected.)

## Guardrails (do not violate)
- Every push = LIVE deploy. **Full `npm run test:all` before ANY money push** (M2
  once shipped on a subset and a stale test slipped through).
- `tsc` + `next build` green before pushing. Never `throw` at boot on a non-fatal.
- Money lock order wallet→market; claim rows; migrations on the local PG first.
- Keep the trackers + `CLAUDE.md` banner + memory in sync as you go.

## Ali / ops (not code) — the real go-live gate
Repoint DNS 50pick.tz→Railway · turn OFF `TEST_FUNDING` + format/rebaseline the DB
at go-live · set `SELCOM_/AZAMPAY_/MIXX_WEBHOOK_SECRET` · R2 creds (activates A1) +
`npm i @aws-sdk/client-s3` · Sentry DSN + `npm i @sentry/node` · VAPID keys · ⊘
bitmap assets · Redis (H2) · TRA ruling + F6 decision · pentest. Then integrate the
aggregator (only the outbound call in `payments.ts` is a stub) → `AUTO_SETTLE=true`.
