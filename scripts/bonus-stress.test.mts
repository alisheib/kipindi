/**
 * Bonus-wallet STRESS / concurrency tests (in-memory store; no DATABASE_URL).
 *
 * Fires many operations concurrently through the same per-user lock to prove the
 * money-safety primitives hold under race conditions:
 *   - idempotent credit (no double-grant on concurrent same-sourceRef)
 *   - no over-spend of bonus under concurrent spend
 *   - atomic overdraw guard never goes negative
 *   - wagering fulfilment credits real EXACTLY ONCE under concurrent wagering
 *   - global invariant (bonusBalance == Σ remaining ACTIVE) under mixed load
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { creditBonus, spendBonus, recordWagering, getBonusSummary } from "../src/lib/server/bonus-service.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function fundedUser(id: string, balance = 0, bonus = 0): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25574${String(++seq).padStart(7, "0")}`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance, pending: 0, hold: 0, bonusBalance: bonus, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const real = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
async function invariant(uid: string): Promise<boolean> {
  const w = await db.wallet.findByUserId(uid);
  const active = await db.bonusGrant.listActiveByUser(uid);
  return (w?.bonusBalance ?? 0) === active.reduce((s, g) => s + g.remainingTzs, 0);
}

// ── 1. Concurrent same-sourceRef credit → exactly one grant ───────────────────
{
  await fundedUser("usr_st_idem");
  await Promise.all(Array.from({ length: 25 }, () => creditBonus("usr_st_idem", { amountTzs: 5_000, source: "ADMIN", sourceRef: "RACE-1" })));
  const grants = await db.bonusGrant.listByUser("usr_st_idem");
  ok("25 concurrent same-ref credits → 1 grant", grants.length === 1, `grants=${grants.length}`);
  ok("bonusBalance == 5,000 (no double credit)", (await bonus("usr_st_idem")) === 5_000, `bonus=${await bonus("usr_st_idem")}`);
  ok("invariant holds", await invariant("usr_st_idem"));
}

// ── 2. Concurrent spend never over-spends ─────────────────────────────────────
{
  await fundedUser("usr_st_spend");
  await creditBonus("usr_st_spend", { amountTzs: 10_000, source: "ADMIN", wagerMultiplier: 5 });
  const results = await Promise.all(Array.from({ length: 30 }, () => spendBonus("usr_st_spend", 1_000)));
  const totalSpent = results.reduce((s, r) => s + r.spent, 0);
  ok("total spent == 10,000 (capped at available)", totalSpent === 10_000, `spent=${totalSpent}`);
  ok("bonusBalance == 0", (await bonus("usr_st_spend")) === 0, `bonus=${await bonus("usr_st_spend")}`);
  ok("bonusBalance never negative", (await bonus("usr_st_spend")) >= 0);
  ok("invariant holds", await invariant("usr_st_spend"));
}

// ── 3. Atomic overdraw guard never goes negative ──────────────────────────────
{
  await fundedUser("usr_st_guard", 10_000);
  const w = (await db.wallet.findByUserId("usr_st_guard"))!;
  const res = await Promise.all(Array.from({ length: 40 }, () => Promise.resolve(db.wallet.adjust(w.id, { balance: -1_000 }, { requireBalanceGte: 1_000 }))));
  const successes = res.filter((r) => r !== null).length;
  ok("exactly 10 debits succeeded (40 raced for 10k)", successes === 10, `successes=${successes}`);
  ok("balance == 0, never negative", (await real("usr_st_guard")) === 0, `real=${await real("usr_st_guard")}`);
}

// ── 4. Concurrent wagering fulfils EXACTLY ONCE (no double real credit) ────────
{
  await fundedUser("usr_st_fulfil");
  await creditBonus("usr_st_fulfil", { amountTzs: 10_000, source: "PROPOSAL", wagerMultiplier: 1 }); // req 10,000
  const results = await Promise.all(Array.from({ length: 20 }, () => recordWagering("usr_st_fulfil", 10_000)));
  const totalCreditedToReal = results.reduce((s, r) => s + r.creditedToRealTzs, 0);
  ok("real credited EXACTLY 10,000 total (not 20×)", totalCreditedToReal === 10_000, `credited=${totalCreditedToReal}`);
  ok("real balance == 10,000", (await real("usr_st_fulfil")) === 10_000, `real=${await real("usr_st_fulfil")}`);
  ok("bonusBalance == 0", (await bonus("usr_st_fulfil")) === 0);
  const fulfilled = (await db.bonusGrant.listByUser("usr_st_fulfil")).filter((g) => g.status === "FULFILLED");
  ok("exactly 1 grant FULFILLED", fulfilled.length === 1, `fulfilled=${fulfilled.length}`);
  const credits = (await db.txn.findByUser("usr_st_fulfil", 100)).filter((t) => t.type === "BONUS_CREDIT");
  ok("exactly 1 BONUS_CREDIT txn", credits.length === 1, `credits=${credits.length}`);
  ok("invariant holds", await invariant("usr_st_fulfil"));
}

// ── 5. Mixed concurrent load across many users → global invariant holds ────────
{
  const ids = Array.from({ length: 25 }, (_, i) => `usr_st_mix_${i}`);
  await Promise.all(ids.map((id, i) => fundedUser(id, 0, 0).then(() => creditBonus(id, { amountTzs: 8_000 + i * 100, source: "INVITE", wagerMultiplier: 5 }))));
  // Each user: concurrent extra credit + spend + wagering, all racing.
  await Promise.all(ids.flatMap((id) => [
    creditBonus(id, { amountTzs: 3_000, source: "ADMIN" }),
    spendBonus(id, 2_000),
    recordWagering(id, 5_000),
    spendBonus(id, 1_500),
    recordWagering(id, 7_000),
  ]));
  let allOk = true; let negative = false;
  for (const id of ids) {
    if (!(await invariant(id))) allOk = false;
    const sum = await getBonusSummary(id);
    if (sum.bonusBalance < 0) negative = true;
    if ((await real(id)) < 0) negative = true;
  }
  ok("global invariant holds for all 25 users under mixed load", allOk);
  ok("no negative real/bonus balances", !negative);
}

console.log(`\nbonus-stress: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
