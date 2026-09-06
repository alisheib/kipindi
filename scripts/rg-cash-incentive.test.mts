/**
 * RESPONSIBLE-GAMBLING SUPPRESSION ON THE CASH INCENTIVE PATH (GLI-19 / LCCP SR 3.4).
 *
 * 🔴 WHAT THIS EXISTS TO CATCH, stated as the defect it was:
 * `creditBonus` carries an RG gate and its own comment claims it covers "every incentive
 * path". That was only ever true while incentives ROUTED THROUGH BONUS. `creditInternal`
 * is the fallback the same two callers (affiliate rewards, proposal prizes) take whenever
 * the bonus programme is off — and it had NO such gate.
 *
 * ⛔ THE WALLET-STATUS CHECK IS NOT A SUBSTITUTE, and that is the whole point of §2 below.
 * `selfExclude` freezes the wallet, so exclusion was refused BY ACCIDENT — a passing test
 * against a self-excluded player proves nothing about the gate. `coolOff` sets
 * `User.status = COOLED_OFF` and leaves the wallet ACTIVE. Cooling-off is the population
 * that was actually being paid, so cooling-off is the population that must be measured.
 *
 * ⭐ §1 IS THE CONTROL AND IT MUST PASS. A suite that refuses everybody would go green on
 * §2 and §3 while the product was broken. The control is what makes the refusals mean
 * something: this harness can observe a credit, so a missing credit is a decision.
 */
import { db, type StoredWallet, type StoredResponsibleGambling } from "../src/lib/server/store.ts";
import { creditInternal } from "../src/lib/server/wallet-service.ts";
import { setBonusConfig } from "../src/lib/server/bonus-config.ts";
import { bindRecruit, ensureAffiliateAccount, onRecruitBet } from "../src/lib/server/affiliate-service.ts";
import { setAffiliateConfig } from "../src/lib/server/affiliate-config.ts";

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, extra?: string) {
  if (cond) { pass++; } else { fail++; console.log(`FAIL ${label}${extra ? ` — ${extra}` : ""}`); }
}
const now = () => new Date().toISOString();
let seq = 0;

async function mkUser(id: string, walletStatus: StoredWallet["status"] = "ACTIVE", role: "PLAYER" | "AGENT" = "PLAYER"): Promise<void> {
  await db.user.create({
    id, phoneE164: `+25578${String(++seq).padStart(7, "0")}`, email: `${id}@t.tz`,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role, status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, recruitedBy: null,
    createdAt: now(), updatedAt: now(), lastLoginAt: null, closedAt: null,
  } as never);
  await db.wallet.create({
    id: `wal_${id}`, userId: id, balance: 0, pending: 0, hold: 0, bonusBalance: 0,
    currency: "TZS", status: walletStatus, createdAt: now(), updatedAt: now(),
  } as StoredWallet);
}

async function rg(userId: string, patch: Partial<StoredResponsibleGambling>): Promise<void> {
  await db.responsible.upsert({
    userId,
    dailyDepositLimit: null, weeklyDepositLimit: null, monthlyDepositLimit: null, dailyLossLimit: null,
    sessionTimeLimitMin: null, realityCheckIntervalMin: 30,
    selfExclusionUntil: null, coolingOffUntil: null,
    pendingIncreaseTo: null, pendingIncreaseEffectiveAt: null,
    pendingWeeklyIncreaseTo: null, pendingWeeklyIncreaseEffectiveAt: null,
    pendingMonthlyIncreaseTo: null, pendingMonthlyIncreaseEffectiveAt: null,
    ...patch,
  } as StoredResponsibleGambling);
}

const cash = async (uid: string) => (await db.wallet.findByUserId(uid))?.balance ?? -1;
const HOUR = 3_600_000;

// ── §1 · CONTROL — an ordinary player IS credited ───────────────────────────
// ⛔ If this fails, every refusal below is meaningless: read this first.
{
  await mkUser("ctl_clear");
  const r = await creditInternal("ctl_clear", 10_000, { description: "control credit" });
  ok("§1 CONTROL · unrestricted player is credited", r === 10_000, `returned=${r}`);
  ok("§1 CONTROL · balance actually moved", (await cash("ctl_clear")) === 10_000, `cash=${await cash("ctl_clear")}`);
}

// ── §2 · COOLING-OFF — the population that was actually being paid ──────────
// The wallet stays ACTIVE here on purpose. Before the fix this credit SUCCEEDED.
{
  await mkUser("rg_cooling");
  await rg("rg_cooling", { coolingOffUntil: new Date(Date.now() + HOUR).toISOString() });
  const w = await db.wallet.findByUserId("rg_cooling");
  ok("§2 PRECONDITION · wallet is ACTIVE (so only the RG gate can refuse)", w?.status === "ACTIVE", `status=${w?.status}`);

  const r = await creditInternal("rg_cooling", 10_000, { description: "referral prize" });
  ok("§2 cooling-off player is REFUSED", r === null, `returned=${r}`);
  ok("§2 no cash moved", (await cash("rg_cooling")) === 0, `cash=${await cash("rg_cooling")}`);
}

// ── §3 · SELF-EXCLUSION — refused BY THE GATE, not by the frozen wallet ────
// ⚠️ READ WHAT THIS MEASURES. In production `selfExclude()` ALSO freezes the wallet, so the
// old code refused an excluded player by accident, one check further down. This case sets
// the RG row directly and leaves the wallet ACTIVE, which strips that accident away and
// leaves only the gate under test. So §3 proves the gate covers exclusion ON ITS OWN — it
// deliberately does NOT re-prove the frozen-wallet path, which was never the broken one.
{
  await mkUser("rg_excluded");
  await rg("rg_excluded", { selfExclusionUntil: new Date(Date.now() + 24 * HOUR).toISOString() });
  const r = await creditInternal("rg_excluded", 10_000, { description: "referral prize" });
  ok("§3 self-excluded player is REFUSED", r === null, `returned=${r}`);
  ok("§3 no cash moved", (await cash("rg_excluded")) === 0, `cash=${await cash("rg_excluded")}`);
}

// ── §4 · AN EXPIRED BREAK IS NOT A LOCK ────────────────────────────────────
// A served cooling-off must not refuse forever — otherwise the gate is a trap,
// not a control. (`isLockedOut` compares against now; this proves we use it.)
{
  await mkUser("rg_served");
  await rg("rg_served", { coolingOffUntil: new Date(Date.now() - HOUR).toISOString() });
  const r = await creditInternal("rg_served", 10_000, { description: "referral prize" });
  ok("§4 served cooling-off is credited again", r === 10_000, `returned=${r}`);
}

// ── §5 · THROUGH THE REAL AFFILIATE PATH, with bonus routing OFF ────────────
// This is the live configuration once the bonus wallet is withdrawn: the reward
// falls through creditBonus to creditInternal. The reward must be recorded HELD,
// never PAID — "otherwise the ledger claims money was paid that never moved".
{
  const bonusSnap = setBonusConfig({ enabled: false }, "test-officer");
  ok("§5 SETUP · bonus programme switched off", bonusSnap.ok === true);
  const affSnap = setAffiliateConfig(
    { enabled: true, prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 10_000, requireDeposit: false, minBetAmountTzs: 1_000 } },
    "test-officer",
  );
  ok("§5 SETUP · prize enabled on FIRST_BET", affSnap.ok === true);

  // ⚠️ AGENT on purpose. Since 2026-09-06 a code only recruits if its owner may refer, so a
  // PLAYER referrer would be refused by the ATTRIBUTION gate and this section would pass for
  // entirely the wrong reason — never reaching the RG gate it exists to measure.
  await mkUser("aff_referrer", "ACTIVE", "AGENT");
  await rg("aff_referrer", { coolingOffUntil: new Date(Date.now() + HOUR).toISOString() });
  const acct = await ensureAffiliateAccount("aff_referrer");

  await mkUser("aff_recruit");
  const bound = await bindRecruit({ recruitUserId: "aff_recruit", code: acct.code });
  ok("§5 recruit bound", bound.bound === true);

  await onRecruitBet("aff_recruit", { stake: 25_000 });

  ok("§5 cooling-off referrer received NO cash", (await cash("aff_referrer")) === 0, `cash=${await cash("aff_referrer")}`);
  const rewards = await db.referralReward.listByReferrer("aff_referrer");
  const paid = rewards.filter((r) => r.status === "PAID");
  ok("§5 no reward is recorded PAID", paid.length === 0, `paid=${paid.length}`);
  ok("§5 the reward is recorded HELD, not silently dropped", rewards.some((r) => r.status === "HELD"), `rows=${JSON.stringify(rewards.map((r) => r.status))}`);
}

console.log(`\n${pass} passed · ${fail} failed`);
if (pass === 0) { console.log("⛔ 0 passed — treat a zero-assertion run as a SKIPPED run, never a green one."); process.exit(1); }
process.exit(fail === 0 ? 0 : 1);
