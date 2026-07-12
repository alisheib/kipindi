/**
 * F2b "Your activity" — money-honesty reconciliation tests (in-memory store).
 *
 * Locks the invariant that the dashboard figures are REAL aggregates of the
 * player's own CONFIRMED transactions, that net === won − staked === the exact
 * value the loss-limit gate uses, that windowing is correct, that an empty user
 * yields honest zeros (never fabricated), and that RG limits-used is computed
 * from the same sums the gate enforces. Run: npx tsx scripts/activity-summary.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";

import { db, type StoredTxn, type StoredWallet } from "../src/lib/server/store.ts";
import { getActivitySummary, getRgUsage, periodSince } from "../src/lib/server/activity-summary.ts";
import { setLimits, getRgSettings } from "../src/lib/server/responsible-gambling.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
const now = Date.now();
const iso = (ms: number) => new Date(ms).toISOString();
let seq = 0;

async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25596${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt: iso(now), updatedAt: iso(now), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(now), updatedAt: iso(now) } as StoredWallet);
}

function txn(userId: string, type: StoredTxn["type"], amount: number, atMs: number, status: StoredTxn["status"] = "CONFIRMED"): void {
  db.txn.create({
    id: `txn_${userId}_${++seq}`, walletId: `wal_${userId}`, userId, type, status,
    amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null,
    amlReason: null, createdAt: iso(atMs), updatedAt: iso(atMs), completedAt: iso(atMs),
  } as StoredTxn);
}

const HOUR = 3600_000, DAY = 86_400_000;

// ── User A: a mix of confirmed money movement inside the last month ──
await mkUser("act_a");
txn("act_a", "DEPOSIT", 50_000, now - 2 * DAY);      // money in
txn("act_a", "WITHDRAWAL", -10_000, now - 1 * DAY);  // money out (stored negative)
txn("act_a", "BET_PLACED", -8_000, now - 3 * HOUR);  // staked (negative)
txn("act_a", "BET_PLACED", -2_000, now - 2 * HOUR);
txn("act_a", "BET_PAYOUT", 15_000, now - 1 * HOUR);  // won
txn("act_a", "CASHOUT", 1_000, now - 30 * 60_000);   // won (partial)
// Noise that must be EXCLUDED: a pending deposit + an out-of-window bet.
txn("act_a", "DEPOSIT", 999_999, now - 1 * HOUR, "PENDING");
txn("act_a", "BET_PLACED", -70_000, now - 60 * DAY); // older than 30d

{
  const s = await getActivitySummary("act_a", "month", now);
  ok("deposits sum (confirmed only)", s.deposits === 50_000, `got=${s.deposits}`);
  ok("withdrawals magnitude", s.withdrawals === 10_000, `got=${s.withdrawals}`);
  ok("staked magnitude (in-window only)", s.staked === 10_000, `got=${s.staked}`);
  ok("won = payout + cashout", s.won === 16_000, `got=${s.won}`);
  ok("net === won − staked", s.net === s.won - s.staked, `net=${s.net}`);
  ok("net = +6,000", s.net === 6_000, `got=${s.net}`);
  ok("pending deposit excluded", s.deposits !== 1_049_999);
  ok("out-of-window bet excluded", s.staked === 10_000);
  ok("not empty", s.empty === false);
}

// ── Invariant: net must equal the exact loss-gate value over the same window ──
{
  const s = await getActivitySummary("act_a", "week", now);
  const gateNet = await db.txn.sumGamblingNetSince("act_a", periodSince("week", now));
  ok("net reconciles to sumGamblingNetSince (loss gate)", s.net === gateNet, `net=${s.net} gate=${gateNet}`);
}

// ── Windowing: a bet 10 days ago is out of "week" but in "month" ──
await mkUser("act_w");
txn("act_w", "BET_PLACED", -5_000, now - 10 * DAY);
txn("act_w", "BET_PAYOUT", 9_000, now - 10 * DAY);
{
  const week = await getActivitySummary("act_w", "week", now);
  const month = await getActivitySummary("act_w", "month", now);
  ok("10d-old activity absent from week", week.empty === true, `week.staked=${week.staked}`);
  ok("10d-old activity present in month", month.staked === 5_000 && month.won === 9_000);
  const all = await getActivitySummary("act_w", "all", now);
  ok("all-time includes it", all.staked === 5_000);
}

// ── Empty user → honest zeros, never fabricated ──
await mkUser("act_empty");
{
  const s = await getActivitySummary("act_empty", "month", now);
  ok("empty user → all zeros", s.deposits === 0 && s.withdrawals === 0 && s.staked === 0 && s.won === 0 && s.net === 0);
  ok("empty flag set", s.empty === true);
}

// ── RG usage reflects the same sums the gate enforces ──
await mkUser("act_rg");
txn("act_rg", "DEPOSIT", 30_000, now - 2 * HOUR);   // today
txn("act_rg", "DEPOSIT", 20_000, now - 3 * DAY);    // this week (not today)
txn("act_rg", "BET_PLACED", -12_000, now - 1 * HOUR); // loss so far today
await setLimits("act_rg", { dailyDepositLimit: 100_000, weeklyDepositLimit: 200_000, dailyLossLimit: 50_000 });
{
  const rg = await getRgUsage("act_rg", now);
  const settings = await getRgSettings("act_rg");
  ok("daily deposit used = 30,000", rg.dailyDeposit.used === 30_000, `got=${rg.dailyDeposit.used}`);
  ok("weekly deposit used = 50,000", rg.weeklyDeposit.used === 50_000, `got=${rg.weeklyDeposit.used}`);
  // getRgUsage must faithfully surface whatever getRgSettings holds (deferral-agnostic).
  ok("daily deposit limit mirrors RG settings", rg.dailyDeposit.limit === (settings.dailyDepositLimit ?? null), `usage=${rg.dailyDeposit.limit} settings=${settings.dailyDepositLimit}`);
  ok("daily loss limit mirrors RG settings", rg.dailyLoss.limit === (settings.dailyLossLimit ?? null));
  ok("daily loss used = 12,000 (floored net)", rg.dailyLoss.used === 12_000, `got=${rg.dailyLoss.used}`);
  ok("no monthly limit → null", rg.monthlyDeposit.limit === null);
}

console.log(`\nactivity-summary: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
