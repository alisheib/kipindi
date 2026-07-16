/**
 * Trial-balance unit tests (pure, no DATABASE_URL) — audit C3.
 *
 * Exercises computeTrialBalance(), the wallet↔ledger reconciliation core:
 *   ledger(PLAYER)       == balance + hold      (hold-netting for in-flight withdrawals)
 *   ledger(PLAYER_BONUS) == bonusBalance == Σ active grants
 *   Σ all entries        == 0
 *   no imbalanced group
 * The DB gather (trialBalance()) is a thin wrapper verified on the local PG.
 */
import { computeTrialBalance, type WalletSnapshot } from "../src/lib/server/ledger.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}`); }
}

const M = (o: Record<string, number>) => new Map(Object.entries(o));

// ── 1. Fully reconciled: no drift, balanced, no imbalanced groups ───────────
{
  const wallets: WalletSnapshot[] = [
    { userId: "a", balance: 10_000, hold: 0, bonusBalance: 500 },
    { userId: "b", balance: 3_000, hold: 0, bonusBalance: 0 },
  ];
  const r = computeTrialBalance({
    wallets,
    ledgerRealByUser: M({ a: 10_000, b: 3_000 }),
    ledgerBonusByUser: M({ a: 500 }),
    activeGrantsByUser: M({ a: 500 }),
    globalSum: 0,
    imbalancedGroups: [],
  });
  ok("clean: ok", r.ok);
  ok("clean: 2 wallets checked", r.checkedWallets === 2);
  ok("clean: 0 drifting", r.driftingWallets === 0);
  ok("clean: global balanced", r.globalBalanced);
  ok("clean: worst is null", r.worst === null);
}

// ── 2. Hold-netting: an in-flight withdrawal (balance↓, hold↑, ledger not yet
//    debited) must NOT show as drift — ledger(PLAYER) == balance + hold. ──────
{
  // Player had 10,000; a 4,000 withdrawal is in flight → balance 6,000, hold 4,000.
  // The ledger still shows 10,000 (WITHDRAWAL posts only on confirm).
  const r = computeTrialBalance({
    wallets: [{ userId: "w", balance: 6_000, hold: 4_000, bonusBalance: 0 }],
    ledgerRealByUser: M({ w: 10_000 }),
    ledgerBonusByUser: M({}),
    activeGrantsByUser: M({}),
    globalSum: 0,
    imbalancedGroups: [],
  });
  ok("hold-netting: in-flight withdrawal is NOT drift", r.ok && r.driftingWallets === 0);
}

// ── 3. Missing ledger group (fire-and-forget failure) → detected as drift ────
{
  // Wallet says 10,000 but the ledger only recorded 6,000 (a stake_ group was lost).
  const r = computeTrialBalance({
    wallets: [{ userId: "x", balance: 10_000, hold: 0, bonusBalance: 0 }],
    ledgerRealByUser: M({ x: 6_000 }),
    ledgerBonusByUser: M({}),
    activeGrantsByUser: M({}),
    globalSum: -4_000, // the lost group also unbalances the global sum
    imbalancedGroups: [],
  });
  ok("missing group: not ok", !r.ok);
  ok("missing group: 1 drifting", r.driftingWallets === 1);
  ok("missing group: realDrift = +4000", r.worst?.realDrift === 4_000);
  ok("missing group: global NOT balanced", !r.globalBalanced);
}

// ── 4. Bonus drift: ledger bonus and active grants disagree with bonusBalance ─
{
  const r = computeTrialBalance({
    wallets: [{ userId: "y", balance: 0, hold: 0, bonusBalance: 500 }],
    ledgerRealByUser: M({ y: 0 }),
    ledgerBonusByUser: M({ y: 300 }),   // ledger says 300
    activeGrantsByUser: M({ y: 200 }),  // grants say 200
    globalSum: 0,
    imbalancedGroups: [],
  });
  ok("bonus drift: not ok", !r.ok);
  ok("bonus drift: bonusDrift = +200 (500−300)", r.worst?.bonusDrift === 200);
  ok("bonus drift: grantDrift = +300 (500−200)", r.worst?.grantDrift === 300);
}

// ── 5. Ledger money for a ghost user (no wallet row) → drift ─────────────────
{
  const r = computeTrialBalance({
    wallets: [],
    ledgerRealByUser: M({ ghost: 5_000 }),
    ledgerBonusByUser: M({}),
    activeGrantsByUser: M({}),
    globalSum: 5_000,
    imbalancedGroups: [],
  });
  ok("ghost: detected", r.driftingWallets === 1 && r.worst?.userId === "ghost");
  ok("ghost: realDrift = −5000 (0 wallet − 5000 ledger)", r.worst?.realDrift === -5_000);
}

// ── 6. Imbalanced group alone flips ok=false even with no per-wallet drift ───
{
  const r = computeTrialBalance({
    wallets: [{ userId: "z", balance: 100, hold: 0, bonusBalance: 0 }],
    ledgerRealByUser: M({ z: 100 }),
    ledgerBonusByUser: M({}),
    activeGrantsByUser: M({}),
    globalSum: 0,
    imbalancedGroups: [{ groupId: "settle_bad", sum: 3 }],
  });
  ok("imbalanced group: not ok", !r.ok);
  ok("imbalanced group: 0 wallet drift", r.driftingWallets === 0);
}

// ── 7. Sub-shilling noise within tolerance is NOT flagged ────────────────────
{
  const r = computeTrialBalance({
    wallets: [{ userId: "t", balance: 1_000.004, hold: 0, bonusBalance: 0 }],
    ledgerRealByUser: M({ t: 1_000 }),
    ledgerBonusByUser: M({}),
    activeGrantsByUser: M({}),
    globalSum: 0.004,
    imbalancedGroups: [],
  });
  ok("tolerance: 0.004 drift ignored", r.ok);
}

console.log(`\ntrial-balance: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
