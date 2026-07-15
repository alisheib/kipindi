/**
 * /api/dev-test/affiliate-e2e — dev-only, in-process end-to-end test of the
 * affiliate / referral engine. Runs against the real in-memory store + real
 * services (config, binding, accrual, wallet credits, notifications, read
 * models, anti-fraud, pause gating) and returns a per-assertion report.
 *
 * Returns 404 in production. POST with no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser, type StoredNotification, type StoredTxn } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import {
  setAffiliateConfig,
  getAffiliateConfig,
  DEFAULT_AFFILIATE_CONFIG,
  type AffiliateConfig,
} from "@/lib/server/affiliate-config";
import {
  ensureAffiliateAccount,
  bindRecruit,
  onRecruitBet,
  onRecruitSettlement,
  onRecruitDeposit,
  getPlayerReferralSummary,
  getAdminAffiliateStats,
  referralLinkFor,
} from "@/lib/server/affiliate-service";

type Check = { name: string; pass: boolean; detail: string };

const OFFICER = "system_test";

async function mkUser(opts?: { displayName?: string; balance?: number }) {
  const id = `usr_${randomId(12)}`;
  const phone = `+25571${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id,
    phoneE164: phone,
    passwordHash: "x",
    passwordSalt: "x",
    failedLoginCount: 0,
    lockedUntil: null,
    role: "PLAYER",
    status: "ACTIVE",
    locale: "SW",
    displayName: opts?.displayName ?? null,
    dob: "1995-01-01",
    region: null,
    acceptedTermsVersion: "v1",
    acceptedTermsAt: now,
    marketingOptIn: false,
    twoFactorEnabled: false,
    avatarDataUrl: null,
    createdAt: now,
    updatedAt: now,
    lastLoginAt: now,
    closedAt: null,
    recruitedBy: null,
  });
  await db.wallet.create({
    id: `wlt_${randomId(12)}`,
    userId: id,
    balance: opts?.balance ?? 0,
    pending: 0,
    hold: 0,
    currency: "TZS",
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
  return u;
}

const balOf = async (userId: string) => (await db.wallet.findByUserId(userId))?.balance ?? 0;
const rewardsTo = async (userId: string) =>
  (await db.referralReward.list(5000)).filter((r) => r.recipientUserId === userId && r.status === "PAID");
const notifsFor = async (userId: string) => ((await db.notification.findByUser(userId, 50)) as StoredNotification[]).filter((n) => n.kind === "AFFILIATE");

export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }

  const checks: Check[] = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });

  // Snapshot current config so we restore it at the end (don't disturb the demo).
  const savedConfig = getAffiliateConfig();

  try {
    // ── 1. Code generation + idempotency ────────────────────────────────
    const refUser = await mkUser({ displayName: "Asha Mwangi" });
    const a1 = await ensureAffiliateAccount(refUser.id);
    const a2 = await ensureAffiliateAccount(refUser.id);
    await ok("code generated", !!a1.code && a1.code.length >= 4, `code=${a1.code}`);
    await ok("code idempotent", a1.code === a2.code, `${a1.code} === ${a2.code}`);
    await ok("link well-formed", (await referralLinkFor(a1.code)).includes(`ref=${a1.code}`), await referralLinkFor(a1.code));
    await ok("code lookup works", (await db.affiliate.findByCode(a1.code))?.userId === refUser.id);

    // ── 2. Binding + anti-fraud ─────────────────────────────────────────
    // Program ON, all modes OFF first so binding tests are isolated.
    setAffiliateConfig(
      { enabled: true, commission: { enabled: false }, bonus: { enabled: false }, prize: { enabled: false } } as Partial<AffiliateConfig>,
      OFFICER,
    );
    const recruit = await mkUser({ displayName: "Juma Said" });
    const bind = await bindRecruit({ recruitUserId: recruit.id, code: a1.code });
    await ok("bind succeeds", bind.bound === true && (bind as { referrerUserId: string }).referrerUserId === refUser.id);
    await ok("recruit.recruitedBy set", (await db.user.findById(recruit.id))?.recruitedBy === refUser.id);
    ok("recruitCount incremented", (await db.affiliate.findByUserId(refUser.id))?.recruitCount === 1);
    ok("referrer notified of join", (await notifsFor(refUser.id)).some((n) => /joined/i.test(n.titleEn)));

    const rebind = await bindRecruit({ recruitUserId: recruit.id, code: a1.code });
    ok("double-bind blocked", rebind.bound === false && (rebind as { reason: string }).reason === "already_bound");

    const self = await bindRecruit({ recruitUserId: refUser.id, code: a1.code });
    ok("self-referral blocked", self.bound === false && (self as { reason: string }).reason === "self_referral");

    const badCode = await bindRecruit({ recruitUserId: (await mkUser()).id, code: "NOPE99" });
    ok("invalid code no-op", badCode.bound === false && (badCode as { reason: string }).reason === "invalid_code");

    // ── 3. Commission accrual + cap ─────────────────────────────────────
    setAffiliateConfig(
      {
        enabled: true,
        commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 2_000 },
        bonus: { enabled: false },
        prize: { enabled: false },
      } as Partial<AffiliateConfig>,
      OFFICER,
    );
    const before3 = await balOf(refUser.id);
    // stake 100,000 × opRate 0.03 = 3,000 fee × 0.5 = 1,500 commission.
    await onRecruitSettlement(recruit.id, { operatorFee: 3_000 });
    const after1Bet = await balOf(refUser.id);
    ok("commission credited", after1Bet - before3 === 1_500, `Δ=${after1Bet - before3} expected 1500`);
    // Second identical bet would add 1,500 → total 3,000, but cap is 2,000,
    // so only 500 more should accrue.
    await onRecruitSettlement(recruit.id, { operatorFee: 3_000 });
    const after2Bets = await balOf(refUser.id);
    ok("commission respects per-recruit cap", after2Bets - before3 === 2_000, `Δ=${after2Bets - before3} expected 2000 (cap)`);
    // Third bet → nothing more (cap hit).
    await onRecruitSettlement(recruit.id, { operatorFee: 3_000 });
    ok("commission stops at cap", await balOf(refUser.id) - before3 === 2_000);

    // ── 4. First-bet prize (once per recruit) ───────────────────────────
    setAffiliateConfig(
      {
        enabled: true,
        commission: { enabled: false },
        bonus: { enabled: false },
        prize: { enabled: true, milestone: "FIRST_BET", amountTzs: 5_000, capPerReferrer: 20 },
      } as Partial<AffiliateConfig>,
      OFFICER,
    );
    const prizeRecruit = await mkUser({ displayName: "Neema Kato" });
    await bindRecruit({ recruitUserId: prizeRecruit.id, code: a1.code });
    const beforePrize = await balOf(refUser.id);
    await onRecruitBet(prizeRecruit.id, { stake: 50_000 });
    ok("first-bet prize paid", await balOf(refUser.id) - beforePrize === 5_000, `Δ=${await balOf(refUser.id) - beforePrize}`);
    await onRecruitBet(prizeRecruit.id, { stake: 50_000 });
    ok("prize not double-paid", await balOf(refUser.id) - beforePrize === 5_000);

    // ── 5. Bonus on first deposit (BOTH recipients, once) ───────────────
    setAffiliateConfig(
      {
        enabled: true,
        commission: { enabled: false },
        bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 1_000, trigger: "FIRST_DEPOSIT" },
        prize: { enabled: false },
      } as Partial<AffiliateConfig>,
      OFFICER,
    );
    const bonusRecruit = await mkUser({ displayName: "Emanuel Toi" });
    await bindRecruit({ recruitUserId: bonusRecruit.id, code: a1.code });
    const refBeforeBonus = await balOf(refUser.id);
    const recBeforeBonus = await balOf(bonusRecruit.id);
    await onRecruitDeposit(bonusRecruit.id, { cumulativeDepositsTzs: 10_000 });
    ok("referrer bonus credited", await balOf(refUser.id) - refBeforeBonus === 1_000, `Δ=${await balOf(refUser.id) - refBeforeBonus}`);
    ok("new-player bonus credited", await balOf(bonusRecruit.id) - recBeforeBonus === 2_000, `Δ=${await balOf(bonusRecruit.id) - recBeforeBonus}`);
    await onRecruitDeposit(bonusRecruit.id, { cumulativeDepositsTzs: 20_000 });
    ok("bonus not double-paid", await balOf(refUser.id) - refBeforeBonus === 1_000 && await balOf(bonusRecruit.id) - recBeforeBonus === 2_000);

    // ── 6. Pause gating ─────────────────────────────────────────────────
    setAffiliateConfig({ enabled: false } as Partial<AffiliateConfig>, OFFICER);
    const pausedRecruit = await mkUser({ displayName: "Rashidi Said" });
    await bindRecruit({ recruitUserId: pausedRecruit.id, code: a1.code });
    const refBeforePause = await balOf(refUser.id);
    await onRecruitSettlement(pausedRecruit.id, { operatorFee: 3_000 });
    await onRecruitDeposit(pausedRecruit.id, { cumulativeDepositsTzs: 50_000 });
    ok("no accrual while paused", await balOf(refUser.id) === refBeforePause, `Δ=${await balOf(refUser.id) - refBeforePause}`);

    // ── 7. Wallet/ledger integrity ──────────────────────────────────────
    const paidToRef = (await rewardsTo(refUser.id)).reduce((s, r) => s + r.amountTzs, 0);
    const acctEarned = (await db.affiliate.findByUserId(refUser.id))?.totalEarnedTzs ?? -1;
    ok("account.totalEarned == sum(PAID to referrer)", acctEarned === paidToRef, `acct=${acctEarned} ledger=${paidToRef}`);
    const bonusTxns = (await db.txn
      .findByUser(refUser.id, 500))
      .filter((t: StoredTxn) => t.type === "BONUS_CREDIT" && t.status === "CONFIRMED");
    ok("every credit posted a CONFIRMED BONUS_CREDIT txn", bonusTxns.length >= 3, `txns=${bonusTxns.length}`);
    ok("referrer got reward notifications", (await notifsFor(refUser.id)).some((n) => /earned|reward|bonus/i.test(n.titleEn)));

    // ── 8. Read models ──────────────────────────────────────────────────
    const summary = await getPlayerReferralSummary(refUser.id);
    await ok("player summary code matches", summary.code === a1.code);
    ok("player summary recruit count", summary.recruitCount >= 4, `count=${summary.recruitCount}`);
    ok("player summary earned > 0", summary.earnedTzs > 0, `earned=${summary.earnedTzs}`);
    ok("player summary lists recruits", summary.recruits.length >= 4, `rows=${summary.recruits.length}`);

    const stats = await getAdminAffiliateStats();
    await ok("admin stats counts referrals", stats.totalReferrals >= 4, `total=${stats.totalReferrals}`);
    await ok("admin stats commission paid > 0", stats.commissionPaidTzs > 0, `comm=${stats.commissionPaidTzs}`);
    await ok("admin leaderboard has top referrer", !!stats.topReferrer && stats.topReferrer.recruits >= 4);
    await ok("admin ledger non-empty", stats.ledger.length > 0, `entries=${stats.ledger.length}`);
    await ok("ledger masks recruit names", stats.ledger.every((r) => !/Juma Said|Neema Kato/.test(r.recruitMasked)));

    // ── 9. Config validation ────────────────────────────────────────────
    const bad = setAffiliateConfig({ commission: { rate: 5 } } as Partial<AffiliateConfig>, OFFICER);
    ok("rejects out-of-range commission rate", bad.ok === false);

  } finally {
    // Restore the operator's real config exactly.
    setAffiliateConfig(savedConfig, OFFICER);
    // Sanity: restored
    const restored = getAffiliateConfig();
    ok("config restored after test", restored.enabled === savedConfig.enabled);
  }

  const passed = checks.filter((c) => c.pass).length;
  const failed = checks.length - passed;
  return NextResponse.json(
    {
      ok: failed === 0,
      summary: `${passed}/${checks.length} checks passed`,
      passed,
      failed,
      defaults: DEFAULT_AFFILIATE_CONFIG,
      checks,
    },
    { status: failed === 0 ? 200 : 500 },
  );
}
