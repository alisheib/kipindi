/**
 * Referral reward tests (in-memory store; no DATABASE_URL).
 *
 * THE PLAYER PROMO's rules (Management Bonus Rules §4, 2026-07-01):
 *   - Signup bonus: DISABLED by default (was SIGNUP, now off)
 *   - Prize: ENABLED, milestone FIRST_BET — recruit must register + deposit +
 *     place at least one position >= TZS 20,000 before referrer is rewarded
 *   - Self-referral blocked, unknown codes rejected
 *   - Idempotency: a recruit can only be bound once, prize paid once per recruit
 *
 * 🔴 WHY §1–§5 RUN UNDER `FEATURE_INVITE=ACTIVE` (2026-09-07). Invite is WITHDRAWN from the
 * player product, so a PLAYER referrer is refused at the bind and none of the mechanics above
 * can execute. This suite used to work around that by fixturing every referrer as
 * `role: "AGENT"` — and then asserted that an "agent" earned the PLAYER PRIZE into the BONUS
 * wallet, which is two things the agent programme forbids (commission only; cash only). A role
 * with no approval is not an agent, so once `approvedAt` became the discriminator the suite
 * went red on exactly the assertions that were wrong.
 *
 * ⭐ The honest population for player-promo mechanics is a PLAYER referrer with the promo ON —
 * the same env override `withdrawn-features` §4 uses to keep the dormant ON path executable,
 * restored in a `finally`. §6 then proves the refusal with the override OFF, and §7 proves an
 * approved AGENT on the identical path earns NO prize at all.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { getAffiliateConfig } from "../src/lib/server/affiliate-config.ts";
import { approveFixtureAgent } from "./lib/agent-fixtures.mts";

import "./lib/verified-fixtures.mts";
let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;
async function mkUser(id: string, role: "PLAYER" | "AGENT" = "PLAYER"): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25577${String(++seq).padStart(7, "0")}`, email: `${id}@t.tz`, passwordHash: null, passwordSalt: null,
    failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
    displayName: null, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0, currency: "TZS", status: "ACTIVE", createdAt: now(), updatedAt: now() } as StoredWallet);
}
const bonus = async (uid: string) => (await db.wallet.findByUserId(uid))?.bonusBalance ?? -1;
const cash = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
async function confirmedDeposit(uid: string, ref: string) {
  await db.txn.create({
    id: `txn_${ref}_dep`, walletId: `wal_${uid}`, userId: uid,
    type: "DEPOSIT", status: "CONFIRMED", amount: 50_000, fee: 0, taxWithheld: 0,
    balanceAfter: 50_000, currency: "TZS", provider: "MPESA", providerRef: null,
    msisdn: null, description: "test deposit", betId: null, amlReason: null,
    createdAt: now(), updatedAt: now(), completedAt: now(),
  } as never);
}

// ── config: bonus disabled, prize enabled on FIRST_BET ───────────────────────
{
  const c = getAffiliateConfig();
  ok("program enabled", c.enabled);
  ok("signup bonus disabled (default)", !c.bonus.enabled, `enabled=${c.bonus.enabled}`);
  ok("prize enabled, milestone FIRST_BET", c.prize.enabled && c.prize.milestone === "FIRST_BET", `prize=${c.prize.enabled} milestone=${c.prize.milestone}`);
  ok("minBetAmountTzs = 20,000", c.prize.minBetAmountTzs === 20_000, `min=${c.prize.minBetAmountTzs}`);
  ok("requireDeposit = true", c.prize.requireDeposit === true);
}

const PRIZE = getAffiliateConfig().prize.amountTzs;

// ── §1–§5 · THE PLAYER PROMO, WITH THE PROMO ON ───────────────────────────────
process.env.FEATURE_INVITE = "ACTIVE";
try {
  // ── §1 · bind recruit → no immediate reward (FIRST_BET, not SIGNUP) ──────────
  await mkUser("ref_alice");                              // ⭐ a PLAYER — the promo's own population
  const aliceAcct = await ensureAffiliateAccount("ref_alice");
  ok("§1 referrer has a referral code", !!aliceAcct.code);

  await mkUser("rec_bob");
  const r1 = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
  ok("§1 recruit bound to referrer", r1.bound === true, JSON.stringify(r1));
  ok("§1 ⭐ the attribution is stamped PLAYER", (await db.user.findById("rec_bob"))?.recruitedProgramme === "PLAYER");
  ok("§1 no reward on signup (FIRST_BET trigger)", (await bonus("ref_alice")) === 0, `bonus=${await bonus("ref_alice")}`);
  ok("§1 recruit balance untouched", (await cash("rec_bob")) === 0 && (await bonus("rec_bob")) === 0);

  // ── §2 · recruit places qualifying bet → referrer gets prize ─────────────────
  await confirmedDeposit("rec_bob", "bob");
  await onRecruitBet("rec_bob", { stake: 25_000 });
  // Prize routes to bonus wallet when affiliateToBonus=true (default)
  ok("§2 referrer rewarded after recruit's first bet", (await bonus("ref_alice")) === PRIZE, `bonus=${await bonus("ref_alice")} expected=${PRIZE}`);
  ok("§2 …and the row is stamped PLAYER", (await db.referralReward.listByReferrer("ref_alice")).every((r) => r.programme === "PLAYER"));

  // ── §3 · idempotency: recruit can't be bound twice (no double reward) ────────
  const r1again = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
  ok("§3 re-bind same recruit rejected", r1again.bound === false);

  // ── §4 · second recruit also rewards ─────────────────────────────────────────
  await mkUser("rec_carol");
  await bindRecruit({ recruitUserId: "rec_carol", code: aliceAcct.code });
  await confirmedDeposit("rec_carol", "carol");
  await onRecruitBet("rec_carol", { stake: 20_000 });
  // Sequential enforcement: second prize grant is QUEUED, bonusBalance = PRIZE (only active)
  const aliceGrants = await db.bonusGrant.listByUser("ref_alice");
  ok("§4 second recruit bet → two grants total", aliceGrants.length === 2, `grants=${aliceGrants.length}`);

  // ── §5 · anti-fraud: self-referral blocked, unknown code rejected ────────────
  await mkUser("ref_dave");
  const dave = await ensureAffiliateAccount("ref_dave");
  const self = await bindRecruit({ recruitUserId: "ref_dave", code: dave.code });
  ok("§5 self-referral blocked", self.bound === false);
  const bad = await bindRecruit({ recruitUserId: "ref_dave", code: "NOPE9999" });
  ok("§5 unknown code rejected", bad.bound === false);
  // ⛔ REFUSED, NEVER TRUNCATED. A 33-character code is not shortened to a prefix that might
  // match somebody else's — a permanent mis-bind is worse than a lost attribution.
  const tooLong = await bindRecruit({ recruitUserId: "ref_dave", code: "A".repeat(33) });
  ok("§5 an over-length code is refused, not truncated", tooLong.bound === false && tooLong.reason === "no_code", JSON.stringify(tooLong));
  ok("§5 blocked binds paid nothing", (await bonus("ref_dave")) === 0 && (await cash("ref_dave")) === 0);
} finally {
  delete process.env.FEATURE_INVITE;
}
ok("§5 the override is restored, not leaked", process.env.FEATURE_INVITE === undefined);

// ── §6 · the 2026-09-06 rule: an ordinary player's code does not recruit ──────
// ⛔ WITH THE PROMO OFF (the live product), the identical code from §1 recruits nobody.
// ⭐ Note the pairing: §1–§5 above are the CONTROL — the same population, with the promo on,
// recruits and pays all the way to a real grant — so this refusal cannot be a gate that
// simply says no to everyone.
{
  await mkUser("ref_erin");                       // deliberately a PLAYER
  await mkUser("rec_frank");
  const erin = await ensureAffiliateAccount("ref_erin");
  const viaPlayer = await bindRecruit({ recruitUserId: "rec_frank", code: erin.code });
  ok("§6 a PLAYER's code does not recruit", viaPlayer.bound === false, JSON.stringify(viaPlayer));
  ok("§6 …and it says why", viaPlayer.bound === false && viaPlayer.reason === "referrer_not_eligible", JSON.stringify(viaPlayer));
  ok("§6 …and nothing was attributed", !(await db.user.findById("rec_frank"))?.recruitedBy);
  // ⛔ AND A ROLE IS NOT AN APPROVAL. `role: "AGENT"` with no `approvedAt` is exactly what this
  // suite used to fixture as an agent. It must be refused like any withdrawn player.
  await mkUser("ref_gina", "AGENT");
  await mkUser("rec_hal");
  const gina = await ensureAffiliateAccount("ref_gina");
  const viaRoleOnly = await bindRecruit({ recruitUserId: "rec_hal", code: gina.code });
  ok("§6 ⛔ role AGENT with NO approval does not recruit either", viaRoleOnly.bound === false && viaRoleOnly.reason === "referrer_not_eligible", JSON.stringify(viaRoleOnly));
}

// ── §7 · AN APPROVED AGENT ON THE IDENTICAL PATH EARNS NO PRIZE ───────────────
// 🔴 On the shipped config the prize is ON and commission is OFF, so an approved agent would
// have earned TZS 200,000 of flat prizes as withdrawable cash and zero commission — the exact
// inverse of what they were vetted and charged for. The agent programme is commission-only BY
// CONSTRUCTION: `payPrize` is reached only under a PLAYER policy.
{
  await mkUser("ref_ivy");
  const ivyCode = await approveFixtureAgent("ref_ivy", { commissionPct: 20 });
  await mkUser("rec_jon");
  const bound = await bindRecruit({ recruitUserId: "rec_jon", code: ivyCode });
  ok("§7 CONTROL · an approved agent's code recruits with the promo OFF", bound.bound === true, JSON.stringify(bound));
  ok("§7 …and the attribution is stamped AGENT", (await db.user.findById("rec_jon"))?.recruitedProgramme === "AGENT");
  await confirmedDeposit("rec_jon", "jon");
  await onRecruitBet("rec_jon", { stake: 25_000 });            // the same qualifying bet §2 paid on
  ok("§7 ⛔ the agent earns NO prize — not in bonus", (await bonus("ref_ivy")) === 0, `bonus=${await bonus("ref_ivy")}`);
  ok("§7 ⛔ …and not in cash", (await cash("ref_ivy")) === 0, `cash=${await cash("ref_ivy")}`);
  ok("§7 ⛔ …and no PRIZE row and no grant exist",
     (await db.referralReward.listByReferrer("ref_ivy")).filter((r) => r.type === "PRIZE").length === 0
     && (await db.bonusGrant.listByUser("ref_ivy")).length === 0);
}

console.log(`\nreferral-signup: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
