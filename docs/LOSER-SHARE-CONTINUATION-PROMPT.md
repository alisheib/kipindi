# Loser-share fee model — continuation prompt

Copy the block below into a fresh Claude Code session (repo `F:\kipindi-main`) to continue
work on, or extend, the loser-share fee model with full context. Replace the **YOUR NEW
REQUEST** line with what you want done.

---

```
Context: 50pick (F:\kipindi-main) has a second fee model, "loser-share", LIVE on main
(@79fd4fd, https://50pick.tz, currently TEST money-mode). It is versioned per poll and must
STAY that way. Read docs/COMPLIANCE-DECISIONS.md (2026-07-23), docs/FEE-MODEL-DECISION.md,
and docs/F6-LIQUIDITY-DESIGN.md §3.1 before touching money.

Ground rules (do not break):
- NO MIXED MATHS. The fee model is frozen per poll in feeSnapshot.feeModel (schema v2,
  src/lib/payout.ts). A poll with no feeModel reads as capped-commission FOREVER
  (snapshotOrLegacy in src/lib/server/market-config.ts). New polls default to loser-share
  (DEFAULT_FEE_MODEL). Never reprice an existing poll; never delete capped-commission.
- loser-share fee = (platformFeeRate + operatorFeeRate) × the LOSING pool (default 13%),
  outcome-dependent — poolFee(yes,no,rates,winningSide) is passed the winner at settlement
  (market-service.ts ~1765) and the bettor's own side for projections.
- Winner floor holds (netPool ≥ winningPool); TRA+GBT come out of the fee, not the player.
- Do NOT brand the model "Jay" anywhere in product/UI/code — it is "loser-share". Jay is the
  accountant who proposed it; provenance stays only in docs/COMPLIANCE-DECISIONS.md.
- Every popup/modal must be a kit primitive (@/components/ui/modal ConfirmModal, Toggle,
  Select, InfoHint, Callout). No raw checkboxes/alerts. No new glyphs — reuse @/components/ui/glyphs.
- Admin controls live at /admin/config → Fee model (Select + per-model description + rate
  inputs + Toggle + a ConfirmModal that warns on EITHER model switch).
- Accountants reconcile per poll at /admin/finance → "Settlement fees by poll" card
  (analytics.settlementFeesByPoll(period)). Per-poll model + both-outcome fees also at
  /admin/markets/[id].

Key files: src/lib/payout.ts · src/lib/server/market-config.ts · src/lib/server/market-service.ts
· src/lib/server/analytics.ts (settlementFeesByPoll) · src/app/admin/config/{config-form,actions,
page,fee-simulator}.tsx · src/app/admin/finance/page.tsx · src/app/admin/markets/new/{page,wizard}.tsx
· src/components/markets/{conviction-dial,bet-confirm-modal}.tsx · src/lib/i18n-dict.ts.

Verify (money-critical — run before any commit, more than once):
  npx tsc --noEmit
  npm run test:loser-share-fee   # golden: reproduces the reference sheet + accountant view
  npm run test:money-invariants && npm run test:ledger && npm run test:cashout
  node scripts/test-all.mjs --skip responsive     # full board (expect all green)
  # real Postgres (see scripts/load/README.md — cluster F:\pg-loadtest, port 5433):
  $env:DATABASE_URL=... ; node scripts/load/reset-db.mjs ; npm run e2e:money   # expect 57/0, drift 0.00
  # visual (start dev, DISABLE_ADMIN_TOTP=true): node scripts/loser-share-fee-shots.mjs ;
  #   node scripts/loser-share-player-shots.mjs  — then LOOK at .50pick-shots/loser-share-*.png
  # money-stress: npx tsx scripts/load/spike-c-settlement-cliff.mts ; npx tsx scripts/load/s10-cross-instance.mts

Every push to main auto-deploys LIVE. Full test:all before every money push. Site is
alisheib07's Railway project (50pick); currently TEST money-mode (TEST_FUNDING=true).

YOUR NEW REQUEST: <describe it here>
```

---

## Current state (2026-07-23)
- **LIVE** on main `@79fd4fd`, verified on https://50pick.tz.
- Full gate **85/85**, golden **23/0**, money-e2e **57/0** (real Postgres, drift 0.00), stress
  (spike-c exactly-once, s10 no double-spend) all green.
- Admin config, market wizard, fee simulator, market view, /admin/finance "Settlement fees by
  poll", player dial + confirm modal, help FAQ + hedge copy — all model-aware and kit-conformant.
- Known pre-existing (NOT from this work): spike-c "voidhole" mint on emergencyVoid of a
  mid-settlement market — model-independent; separate ticket if pursued.
