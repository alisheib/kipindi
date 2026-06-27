/**
 * Referral-on-SIGNUP test (in-memory store; no DATABASE_URL).
 *
 * Verifies the testing config (2026-06-28): the referrer is rewarded the moment
 * an invited friend JOINS — no deposit, no bet required (deposits aren't wired
 * yet, so the reward must NOT depend on play/funding). The reward lands in the
 * referrer's BONUS wallet (non-withdrawable), so no real cash is minted.
 */
import { db, type StoredWallet } from "../src/lib/server/store.ts";
import { bindRecruit, ensureAffiliateAccount } from "../src/lib/server/affiliate-service.ts";
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

// ── config: reward fires on SIGNUP, to the referrer, play not required ───────
{
  const c = getAffiliateConfig();
  ok("program enabled", c.enabled);
  ok("bonus enabled + trigger SIGNUP", c.bonus.enabled && c.bonus.trigger === "SIGNUP", `enabled=${c.bonus.enabled} trigger=${c.bonus.trigger}`);
  ok("reward goes to referrer", c.bonus.recipient === "REFERRER" || c.bonus.recipient === "BOTH");
  ok("play-required prize disabled", !c.prize.enabled);
}

// ── a friend JOINS → referrer rewarded immediately (no deposit/bet) ──────────
const REWARD = getAffiliateConfig().bonus.referrerAmountTzs;
await mkUser("ref_alice");
const aliceAcct = await ensureAffiliateAccount("ref_alice");
ok("referrer has a referral code", !!aliceAcct.code);

await mkUser("rec_bob");
const r1 = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
ok("recruit bound to referrer", r1.bound === true);
ok("referrer rewarded on signup (bonus wallet)", (await bonus("ref_alice")) === REWARD, `bonus=${await bonus("ref_alice")} expected=${REWARD}`);
ok("reward is BONUS (non-withdrawable), not cash", (await cash("ref_alice")) === 0);
ok("recruit did NOT need to deposit/play — recruit balance untouched", (await cash("rec_bob")) === 0 && (await bonus("rec_bob")) === 0);

// ── idempotency: a recruit can't be bound twice (no double reward) ───────────
const r1again = await bindRecruit({ recruitUserId: "rec_bob", code: aliceAcct.code });
ok("re-bind same recruit rejected", r1again.bound === false);
ok("no double reward on re-bind", (await bonus("ref_alice")) === REWARD);

// ── a second friend joins → second reward ────────────────────────────────────
await mkUser("rec_carol");
await bindRecruit({ recruitUserId: "rec_carol", code: aliceAcct.code });
ok("second signup → second reward", (await bonus("ref_alice")) === REWARD * 2, `bonus=${await bonus("ref_alice")}`);

// ── anti-fraud: self-referral blocked, unknown code rejected ─────────────────
await mkUser("ref_dave");
const dave = await ensureAffiliateAccount("ref_dave");
const self = await bindRecruit({ recruitUserId: "ref_dave", code: dave.code });
ok("self-referral blocked", self.bound === false);
const bad = await bindRecruit({ recruitUserId: "ref_dave", code: "NOPE9999" });
ok("unknown code rejected", bad.bound === false);
ok("blocked binds paid nothing", (await bonus("ref_dave")) === 0);

console.log(`\nreferral-signup: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
