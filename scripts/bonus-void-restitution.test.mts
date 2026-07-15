/**
 * Bonus void-restitution tests (audit C2). Proves the money-evaporation bug is
 * fixed: refundBonusToActive NEVER returns less than requested, and when the
 * player has no ACTIVE grant to hold the refunded bonus it mints a zero-wagering
 * restitution grant — so a voided bet's bonus stake can never be silently
 * forfeited (the `bonus.refund_forfeited` branch is unreachable in the normal,
 * has-a-wallet path).
 *
 * In-memory store; no DATABASE_URL.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { creditBonus, recordWagering, refundBonusToActive } from "../src/lib/server/bonus-service.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}
const bonusBal = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
async function invariantHolds(uid: string): Promise<boolean> {
  const w = await db.wallet.findByUserId(uid);
  const active = await db.bonusGrant.listActiveByUser(uid);
  const sum = active.reduce((s, g) => s + g.remainingTzs, 0);
  return (w?.bonusBalance ?? 0) === sum;
}

setBonusConfig({ enabled: true } as never);

// ── 1) No active grant → restitution grant minted, full amount returned ──────
{
  await fundedUser("usr_restitute_none");
  // Player has a wallet but zero grants (e.g. the original grant was fulfilled).
  const before = await bonusBal("usr_restitute_none");
  const r = await refundBonusToActive("usr_restitute_none", 10_000);
  ok("C2: refund returns the FULL amount (not 0)", r.refundedToBonus === 10_000, `got ${r.refundedToBonus}`);
  ok("C2: bonusBalance credited by the refund", (await bonusBal("usr_restitute_none")) === before + 10_000);
  const active = await db.bonusGrant.listActiveByUser("usr_restitute_none");
  ok("C2: a restitution grant now exists", active.length === 1);
  if (active[0]) {
    ok("C2: restitution grant holds the amount", active[0].remainingTzs === 10_000, `rem=${active[0].remainingTzs}`);
    ok("C2: restitution grant has ZERO wagering", active[0].wagerRequiredTzs === 0, `req=${active[0].wagerRequiredTzs}`);
    ok("C2: restitution grant sourceRef marks it", (active[0].sourceRef ?? "").startsWith("void-restitution:"), active[0].sourceRef ?? "null");
    ok("C2: restitution grant is ACTIVE", active[0].status === "ACTIVE");
  }
  ok("C2: invariant bonusBalance == Σ ACTIVE remaining", await invariantHolds("usr_restitute_none"));
}

// ── 2) Classic audit scenario: grant fully wagered → fulfilled → void refund ──
{
  await fundedUser("usr_restitute_wagered");
  // Grant 10,000 at 1× so a single 10,000 turnover fulfils it.
  const g = await creditBonus("usr_restitute_wagered", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 1, expiryDays: 0 });
  ok("setup: grant credited", g.ok);
  // Wager the full requirement → grant becomes FULFILLED, remaining → real, no ACTIVE grant.
  await recordWagering("usr_restitute_wagered", 10_000);
  const activeAfterWager = await db.bonusGrant.listActiveByUser("usr_restitute_wagered");
  ok("setup: no ACTIVE grant after full wagering", activeAfterWager.length === 0, `active=${activeAfterWager.length}`);
  // The market that bet rode on is VOIDED → the bonus stake must come back.
  const r = await refundBonusToActive("usr_restitute_wagered", 10_000);
  ok("C2: voided bonus stake is restituted, not evaporated", r.refundedToBonus === 10_000, `got ${r.refundedToBonus}`);
  ok("C2: invariant holds after restitution", await invariantHolds("usr_restitute_wagered"));
}

// ── 3) Regression: an existing ACTIVE grant still receives the refund in place ─
{
  await fundedUser("usr_restitute_active");
  await creditBonus("usr_restitute_active", { amountTzs: 5_000, source: "ADMIN", wagerMultiplier: 2 });
  const activeBefore = await db.bonusGrant.listActiveByUser("usr_restitute_active");
  const r = await refundBonusToActive("usr_restitute_active", 3_000);
  ok("regression: refund returns full amount", r.refundedToBonus === 3_000);
  const activeAfter = await db.bonusGrant.listActiveByUser("usr_restitute_active");
  ok("regression: no NEW grant minted (added to existing)", activeAfter.length === activeBefore.length, `before=${activeBefore.length} after=${activeAfter.length}`);
  ok("regression: existing grant grew by the refund", (activeAfter[0]?.remainingTzs ?? 0) === 5_000 + 3_000);
  ok("regression: invariant holds", await invariantHolds("usr_restitute_active"));
}

console.log(`\nbonus-void-restitution: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
