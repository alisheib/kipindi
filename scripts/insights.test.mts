/**
 * F7 — owner insight aggregates (in-memory store).
 *
 * Locks the honesty + correctness of a decision-grade money surface:
 *  - the funnel has NO "visit" stage (there is no analytics instrumentation, so a
 *    visit number would be fabricated) and its 4 stages count real users
 *  - staff/admin accounts are excluded — they are not customers and would skew everything
 *  - cohort retention is ACTIVITY retention (did they actually bet in month k),
 *    derived from confirmed stakes
 *  - LTV = lifetime (stakes − payouts), i.e. real GGR contribution
 *  - PENDING transactions never count
 *  - an empty platform returns honest zeros, never filler
 *  - role gating: MONEY_ROLES excludes MODERATOR (the hole this batch closed)
 *
 * Run: npx tsx scripts/insights.test.mts
 */
process.env.SESSION_SECRET ??= "test-only-session-secret-32chars-aaaa";
process.env.OTP_PEPPER ??= "test-only-otp-pepper-16chars";

import { db, type StoredTxn, type StoredWallet } from "../src/lib/server/store.ts";
import { getInsights } from "../src/lib/server/insights.ts";
import { hasRole, MONEY_ROLES, CONFIG_ROLES, ADMIN_CONSOLE_ROLES } from "../src/lib/server/roles.ts";

let pass = 0, fail = 0;
const ok = (l: string, c: boolean, x = "") => { c ? pass++ : fail++; console.log(`${c ? "PASS" : "FAIL"} ${l} ${x}`); };
let seq = 0;

/** Register a user in a specific month, e.g. "2026-01". */
async function mkUser(id: string, month: string, role: "PLAYER" | "ADMIN" = "PLAYER"): Promise<void> {
  const createdAt = `${month}-05T10:00:00.000Z`;
  await db.user.create({
    id, phoneE164: `+25591${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, email: null,
    createdAt, updatedAt: createdAt, lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt, updatedAt: createdAt } as StoredWallet);
}

function txn(userId: string, type: StoredTxn["type"], amount: number, month: string, status: StoredTxn["status"] = "CONFIRMED"): void {
  const at = `${month}-15T12:00:00.000Z`;
  db.txn.create({
    id: `txn_${userId}_${++seq}`, walletId: `wal_${userId}`, userId, type, status,
    amount, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS",
    provider: "INTERNAL", providerRef: null, msisdn: null, description: null, positionId: null,
    amlReason: null, createdAt: at, updatedAt: at, completedAt: at,
  } as StoredTxn);
}

// ── 0. Role tiers — the hole this batch closed ───────────────────────────
{
  ok("MODERATOR can open the console", hasRole("MODERATOR", ADMIN_CONSOLE_ROLES));
  ok("MODERATOR is NOT in MONEY_ROLES (finance/insights)", !hasRole("MODERATOR", MONEY_ROLES));
  ok("MODERATOR is NOT in CONFIG_ROLES (reports/exports)", !hasRole("MODERATOR", CONFIG_ROLES));
  ok("ADMIN is in MONEY_ROLES", hasRole("ADMIN", MONEY_ROLES));
  ok("COMPLIANCE is in MONEY_ROLES", hasRole("COMPLIANCE", MONEY_ROLES));
  ok("a PLAYER is in nothing", !hasRole("PLAYER", MONEY_ROLES) && !hasRole("PLAYER", ADMIN_CONSOLE_ROLES));
}

// ── 1. Empty platform → honest zeros ─────────────────────────────────────
{
  const i = await getInsights(true);
  ok("empty: 0 players", i.totals.players === 0);
  ok("empty: 0 bettors", i.totals.bettors === 0);
  ok("empty: 0 LTV", i.totals.ltvTotal === 0 && i.totals.ltvPerPlayer === 0);
  ok("empty: no cohorts", i.cohorts.length === 0);
  ok("empty: no top markets (no filler)", i.topMarkets.length === 0);
  ok("funnel exists with 4 stages even when empty", i.funnel.length === 4);
}

// ── 2. The funnel has NO "visit" stage — it would be fabricated ──────────
{
  const i = await getInsights(true);
  const keys = i.funnel.map((s) => s.key);
  ok("funnel keys are register→kyc→deposit→bet", JSON.stringify(keys) === JSON.stringify(["register", "kyc", "deposit", "bet"]), keys.join(","));
  ok("there is NO 'visit' stage (not instrumented → would be fabrication)", !keys.includes("visit"));
}

// ── 3. Funnel counts real users; staff excluded; PENDING ignored ─────────
await mkUser("in_staff", "2026-01", "ADMIN");   // staff — must be excluded everywhere
await mkUser("in_a", "2026-01");                // registers, deposits, bets
await mkUser("in_b", "2026-01");                // registers, deposits, never bets
await mkUser("in_c", "2026-01");                // registers only
await mkUser("in_d", "2026-02");                // later cohort, bets

txn("in_a", "DEPOSIT", 50_000, "2026-01");
txn("in_b", "DEPOSIT", 20_000, "2026-01");
txn("in_c", "DEPOSIT", 99_999, "2026-01", "PENDING");   // PENDING → must NOT count
txn("in_staff", "DEPOSIT", 500_000, "2026-01");         // staff → must NOT count
txn("in_staff", "BET_PLACED", -100_000, "2026-01");     // staff → must NOT count

// in_a bets in M0 and again in M2 (retained)
txn("in_a", "BET_PLACED", -10_000, "2026-01");
txn("in_a", "BET_PAYOUT", 4_000, "2026-01");
txn("in_a", "BET_PLACED", -6_000, "2026-03");
// in_d bets in its own M0
txn("in_d", "BET_PLACED", -8_000, "2026-02");

{
  const i = await getInsights(true);
  const f = Object.fromEntries(i.funnel.map((s) => [s.key, s.value]));
  ok("registered = 4 players (staff excluded)", f.register === 4, `got=${f.register}`);
  ok("deposited = 2 (PENDING + staff excluded)", f.deposit === 2, `got=${f.deposit}`);
  ok("placed a bet = 2 (staff excluded)", f.bet === 2, `got=${f.bet}`);
  ok("kyc approved = 0 (none approved)", f.kyc === 0);
  ok("totals.players excludes staff", i.totals.players === 4);
  ok("totals.bettors = 2", i.totals.bettors === 2);
}

// ── 4. LTV = lifetime stakes − payouts (real GGR contribution) ───────────
{
  const i = await getInsights(true);
  // in_a: staked 10,000 + 6,000 = 16,000; paid out 4,000 → contributes 12,000
  // in_d: staked 8,000; paid 0 → contributes 8,000
  ok("lifetime GGR = 20,000 (staff never counted)", i.totals.ltvTotal === 20_000, `got=${i.totals.ltvTotal}`);
  ok("GGR per player = 20,000 / 4 = 5,000", i.totals.ltvPerPlayer === 5_000, `got=${i.totals.ltvPerPlayer}`);

  const jan = i.cohorts.find((c) => c.cohort === "2026-01")!;
  ok("Jan cohort has 3 players (staff excluded)", jan.players === 3, `got=${jan.players}`);
  ok("Jan cohort LTV = 12,000 (only in_a contributed)", jan.ltvTotal === 12_000, `got=${jan.ltvTotal}`);
  ok("Jan cohort LTV/player = 4,000", jan.ltvPerPlayer === 4_000, `got=${jan.ltvPerPlayer}`);
}

// ── 5. Retention is ACTIVITY retention, indexed from the signup month ────
{
  const i = await getInsights(true);
  const jan = i.cohorts.find((c) => c.cohort === "2026-01")!;
  ok("Jan M0 = 1 (in_a bet in its signup month)", (jan.retained[0] ?? 0) === 1, `got=${jan.retained[0]}`);
  ok("Jan M1 = 0 (nobody bet in Feb)", (jan.retained[1] ?? 0) === 0, `got=${jan.retained[1]}`);
  ok("Jan M2 = 1 (in_a came back in March)", (jan.retained[2] ?? 0) === 1, `got=${jan.retained[2]}`);

  const feb = i.cohorts.find((c) => c.cohort === "2026-02")!;
  ok("Feb cohort has 1 player", feb.players === 1);
  ok("Feb M0 = 1 (in_d bet in its own signup month)", (feb.retained[0] ?? 0) === 1);
  ok("retention never exceeds cohort size", i.cohorts.every((c) => c.retained.every((n) => n <= c.players)));
  ok("maxMonthOffset = 2", i.maxMonthOffset === 2, `got=${i.maxMonthOffset}`);
}

// ── 6. Cache behaves + is honestly labelled ─────────────────────────────
{
  const fresh = await getInsights(true);
  ok("forced recompute is not marked cached", fresh.cached === false);
  const cached = await getInsights();
  ok("second call within TTL is marked cached", cached.cached === true);
  ok("cached data matches", cached.totals.ltvTotal === fresh.totals.ltvTotal);
}

console.log(`\ninsights: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
