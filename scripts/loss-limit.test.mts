/**
 * Daily loss-limit enforcement tests (in-memory store; no DATABASE_URL).
 *
 * Proves the RG loss-limit gate in buyPosition (GLI-19 / LCCP SR 3.4):
 *   - net real-money loss over rolling 24h = −Σ(BET_PLACED, BET_PAYOUT,
 *     BET_REFUND, CASHOUT), floored at 0
 *   - a bet that would push (netLoss + stake) past dailyLossLimit is refused
 *     BEFORE any funding/debit, with a COMPLIANCE audit
 *   - BET_PAYOUT credits offset prior losses
 *   - losses older than 24h don't count
 *   - no limit set → bets flow freely
 *
 * Seeds prior activity as CONFIRMED transactions directly, so the gate is
 * exercised in isolation (no market resolution, no rapid-bet rate-limit noise).
 */
import { db, type StoredWallet, type StoredTxn } from "../src/lib/server/store.ts";
import { createMarket, buyPosition } from "../src/lib/server/market-service.ts";
import { setLimits } from "../src/lib/server/responsible-gambling.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function fundedUser(id: string, balance = 100_000): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25579${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

/** Seed a CONFIRMED gambling txn `ageMs` in the past (default: now). */
async function seedTxn(userId: string, type: StoredTxn["type"], amount: number, ageMs = 0): Promise<void> {
  const at = new Date(Date.now() - ageMs).toISOString();
  await db.txn.create({
    id: `txn_seed_${++seq}`, walletId: `wal_${userId}`, userId,
    type, status: "CONFIRMED", amount, fee: 0, taxWithheld: 0,
    balanceAfter: 0, currency: "TZS", provider: "INTERNAL", providerRef: null, msisdn: null,
    description: "seed", positionId: null, amlReason: null,
    createdAt: at, updatedAt: at, completedAt: at,
  } as StoredTxn);
}

async function makeMarket() {
  return createMarket({
    titleEn: "Loss-limit market", titleSw: "Soko la majaribio", category: "macro",
    sourceUrl: "https://bot.go.tz", resolutionCriterion: "Resolves at the official date.",
    resolutionAt: new Date(Date.now() + 7 * 864e5).toISOString(), proposedBy: "test",
  } as never);
}

// ── A. Prior loss + new stake exceeds cap → BLOCKED ──────────────────────────
{
  await fundedUser("usr_ll_block");
  await setLimits("usr_ll_block", { dailyLossLimit: 10_000 });
  await seedTxn("usr_ll_block", "BET_PLACED", -8_000); // netLoss so far = 8,000
  const m = await makeMarket();
  const r = await buyPosition("usr_ll_block", { marketId: m.id, side: "YES", stake: 5_000 });
  ok("A: bet blocked when 8,000 + 5,000 > 10,000 cap", !r.ok);
  ok("A: reason mentions loss limit", !r.ok && /loss limit/i.test(r.error ?? ""), r.ok ? "" : r.error);
  ok("A: no debit — balance untouched", (await db.wallet.findByUserId("usr_ll_block"))?.balance === 100_000);
}

// ── B. Prior loss + new stake exactly at cap → ALLOWED (boundary) ────────────
{
  await fundedUser("usr_ll_edge");
  await setLimits("usr_ll_edge", { dailyLossLimit: 10_000 });
  await seedTxn("usr_ll_edge", "BET_PLACED", -6_000); // netLoss so far = 6,000
  const m = await makeMarket();
  const r = await buyPosition("usr_ll_edge", { marketId: m.id, side: "YES", stake: 4_000 }); // 6k+4k = 10k, not > 10k
  ok("B: bet allowed at exact cap boundary (6,000 + 4,000 = 10,000)", r.ok, r.ok ? "" : r.error);
}

// ── C. A winning payout offsets prior loss → ALLOWED ─────────────────────────
{
  await fundedUser("usr_ll_payout");
  await setLimits("usr_ll_payout", { dailyLossLimit: 10_000 });
  await seedTxn("usr_ll_payout", "BET_PLACED", -8_000);
  await seedTxn("usr_ll_payout", "BET_PAYOUT", 5_000); // net = -3,000 → loss so far 3,000
  const m = await makeMarket();
  const r = await buyPosition("usr_ll_payout", { marketId: m.id, side: "YES", stake: 6_000 }); // 3k+6k = 9k <= 10k
  ok("C: payout offsets loss → bet allowed (3,000 + 6,000 = 9,000)", r.ok, r.ok ? "" : r.error);
}

// ── D. Loss older than 24h is ignored ────────────────────────────────────────
{
  await fundedUser("usr_ll_old");
  await setLimits("usr_ll_old", { dailyLossLimit: 10_000 });
  await seedTxn("usr_ll_old", "BET_PLACED", -20_000, 25 * 3600e3); // 25h ago → outside window
  const m = await makeMarket();
  const r = await buyPosition("usr_ll_old", { marketId: m.id, side: "YES", stake: 5_000 });
  ok("D: loss older than 24h ignored → bet allowed", r.ok, r.ok ? "" : r.error);
}

// ── E. No limit set → bets flow freely ───────────────────────────────────────
{
  await fundedUser("usr_ll_nolimit");
  await seedTxn("usr_ll_nolimit", "BET_PLACED", -50_000);
  const m = await makeMarket();
  const r = await buyPosition("usr_ll_nolimit", { marketId: m.id, side: "YES", stake: 20_000 });
  ok("E: no dailyLossLimit → large bet allowed", r.ok, r.ok ? "" : r.error);
}

console.log(`\nloss-limit: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
