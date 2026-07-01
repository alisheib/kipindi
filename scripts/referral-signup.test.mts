/**
 * Referral reward tests (in-memory store; no DATABASE_URL).
 *
 * Current rules (Management Bonus Rules §4, 2026-07-01):
 *   - Signup bonus: DISABLED by default (was SIGNUP, now off)
 *   - Prize: ENABLED, milestone FIRST_BET — recruit must register + deposit +
 *     place at least one position >= TZS 20,000 before referrer is rewarded
 *   - Self-referral blocked, unknown codes rejected
 *   - Idempotency: a recruit can only be bound once, prize paid once per recruit
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25577${String(++seq).padStart(7, "0")}`, email: `${id}@t.tz`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role: "PLAYER", status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
const cash = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;

// ── config: bonus disabled, prize enabled on FIRST_BET ───────────────────────
{
  const c = getAffiliateConfig();
  ok("program enabled", c.enabled);
  ok("signup bonus disabled (default)", !c.bonus.enabled, `enabled=${c.bonus.enabled}`);
  ok("prize enabled, milestone FIRST_BET", c.prize.enabled && c.prize.milestone === "FIRST_BET", `prize=${c.prize.enabled} milestone=${c.prize.milestone}`);
  ok("minBetAmountTzs = 20,000", c.prize.minBetAmountTzs === 20_000, `min=${c.prize.minBetAmountTzs}`);
  ok("requireDeposit = true", c.prize.requireDeposit === true);
}

// ── bind recruit → no immediate reward (FIRST_BET, not SIGNUP) ──────────────
const PRIZE = getAffiliateConfig().prize.amountTzs;
await mkUser("ref_alice");
const aliceAcct = await ensureAffiliateAccount("ref_alice");
ok("referrer has a referral code", !!aliceAcct.code);

await mkUser("rec_bob");
const r1 = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
ok("recruit bound to referrer", r1.bound === true);
ok("no reward on signup (FIRST_BET trigger)", (await bonus("ref_alice")) === 0, `bonus=${await bonus("ref_alice")}`);
ok("recruit balance untouched", (await cash("rec_bob")) === 0 && (await bonus("rec_bob")) === 0);

// ── recruit places qualifying bet → referrer gets prize ────────────────────
// Simulate a confirmed deposit (so requireDeposit check passes)
await db.txn.create({
  id: "txn_bob_dep", walletId: `wal_rec_bob`, userId: "rec_bob",
  type: "DEPOSIT", status: "CONFIRMED", amount: 50_000, fee: 0, taxWithheld: 0,
  balanceAfter: 50_000, currency: "TZS", provider: "MPESA", providerRef: null,
  msisdn: null, description: "test deposit", betId: null, amlReason: null,
  createdAt: now(), updatedAt: now(), completedAt: now(),
} as never);
// Simulate a bet >= TZS 20,000
await onRecruitBet("rec_bob", { stake: 25_000, operatorCommissionRate: 0.03 });
// Prize routes to bonus wallet when affiliateToBonus=true (default)
ok("referrer rewarded after recruit's first bet", (await bonus("ref_alice")) === PRIZE, `bonus=${await bonus("ref_alice")} expected=${PRIZE}`);

// ── idempotency: recruit can't be bound twice (no double reward) ────────────
const r1again = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
ok("re-bind same recruit rejected", r1again.bound === false);

// ── second recruit also rewards ─────────────────────────────────────────────
await mkUser("rec_carol");
await bindRecruit({ recruitUserId: "rec_carol", code: aliceAcct.code });
await db.txn.create({
  id: "txn_carol_dep", walletId: `wal_rec_carol`, userId: "rec_carol",
  type: "DEPOSIT", status: "CONFIRMED", amount: 50_000, fee: 0, taxWithheld: 0,
  balanceAfter: 50_000, currency: "TZS", provider: "MPESA", providerRef: null,
  msisdn: null, description: "test deposit", betId: null, amlReason: null,
  createdAt: now(), updatedAt: now(), completedAt: now(),
} as never);
await onRecruitBet("rec_carol", { stake: 20_000, operatorCommissionRate: 0.03 });
// Sequential enforcement: second prize grant is QUEUED, bonusBalance = PRIZE (only active)
// Verify both grants exist (ACTIVE + QUEUED)
const aliceGrants = await db.bonusGrant.listByUser("ref_alice");
ok("second recruit bet → two grants total", aliceGrants.length === 2, `grants=${aliceGrants.length}`);

// ── anti-fraud: self-referral blocked, unknown code rejected ─────────────────
await mkUser("ref_dave");
const dave = await ensureAffiliateAccount("ref_dave");
const self = await bindRecruit({ recruitUserId: "ref_dave", code: dave.code });
ok("self-referral blocked", self.bound === false);
const bad = await bindRecruit({ recruitUserId: "ref_dave", code: "NOPE9999" });
ok("unknown code rejected", bad.bound === false);
ok("blocked binds paid nothing", (await bonus("ref_dave")) === 0 && (await cash("ref_dave")) === 0);

console.log(`\nreferral-signup: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
