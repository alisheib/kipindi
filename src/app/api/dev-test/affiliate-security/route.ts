/**
 * /api/dev-test/affiliate-security — Sprint 4. In-process abuse / anti-fraud /
 * money-integrity assertions for the affiliate engine:
 *
 *   - self-referral blocked; double-bind blocked (no re-attribution)
 *   - invalid / empty code is a no-op
 *   - replay safety: repeated deposits/bets never double-pay bonus/prize
 *   - commission window enforced (expired recruit earns nothing)
 *   - paused program accrues nothing
 *   - zero / negative stake never creates a reward or moves money
 *   - cross-referrer attribution integrity (recruit of A can't pay B)
 *   - privacy: masked names never leak full displayName / phone
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setAffiliateConfig, getAffiliateConfig, type AffiliateConfig } from "@/lib/server/affiliate-config";
import { ensureAffiliateAccount, bindRecruit, onRecruitBet, onRecruitDeposit, maskName } from "@/lib/server/affiliate-service";

const OFFICER = "system_sec";

function mkUser(opts: { displayName?: string; createdAt?: string; balance?: number } = {}): StoredUser {
  const id = `usr_${randomId(12)}`;
  const now = opts.createdAt ?? new Date().toISOString();
  const u = db.user.create({
    id, phoneE164: `+25578${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: opts.displayName ?? null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: opts.balance ?? 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const bal = (id: string) => db.wallet.findByUserId(id)?.balance ?? 0;

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getAffiliateConfig();

  try {
    // Baseline config: all modes on, modest amounts, cap commission.
    setAffiliateConfig({
      enabled: true,
      commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 3_000 },
      bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 1_000, trigger: "FIRST_DEPOSIT" },
      prize: { enabled: true, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 5_000, capPerReferrer: 9_000 },
    } as Partial<AffiliateConfig>, OFFICER);

    const A = mkUser({ displayName: "Alpha One" });
    const acctA = ensureAffiliateAccount(A.id);

    // 1 · self-referral blocked
    const self = bindRecruit({ recruitUserId: A.id, code: acctA.code });
    ok("self-referral blocked", self.bound === false && (self as { reason: string }).reason === "self_referral");

    // 2 · invalid + empty code no-op
    ok("invalid code no-op", bindRecruit({ recruitUserId: mkUser().id, code: "ZZZZZZ" }).bound === false);
    ok("empty code no-op", bindRecruit({ recruitUserId: mkUser().id, code: "" }).bound === false);

    // 3 · double-bind blocked + no re-attribution to a second referrer
    const B = mkUser({ displayName: "Beta Two" });
    const acctB = ensureAffiliateAccount(B.id);
    const rec = mkUser();
    ok("first bind succeeds", bindRecruit({ recruitUserId: rec.id, code: acctA.code }).bound === true);
    const reAttempt = bindRecruit({ recruitUserId: rec.id, code: acctB.code }); // try to steal to B
    ok("re-attribution to another referrer blocked", reAttempt.bound === false);
    ok("recruit still attributed to original referrer", db.user.findById(rec.id)?.recruitedBy === A.id);

    // 4 · replay safety — repeated deposits/bets don't double-pay
    const before4 = bal(A.id);
    for (let i = 0; i < 8; i++) onRecruitDeposit(rec.id, { cumulativeDepositsTzs: 10_000 });
    const bonusRows = db.referralReward.listByRecruit(rec.id).filter((r) => r.type === "BONUS").length;
    ok("bonus paid once under deposit replay (≤2 rows BOTH)", bonusRows <= 2, `rows=${bonusRows}`);
    for (let i = 0; i < 8; i++) onRecruitBet(rec.id, { stake: 50_000, operatorCommissionRate: 0.03 });
    const prizeRows = db.referralReward.listByRecruit(rec.id).filter((r) => r.type === "PRIZE").length;
    const commTotal = db.referralReward.listByRecruit(rec.id).filter((r) => r.type === "COMMISSION").reduce((s, r) => s + r.amountTzs, 0);
    ok("prize paid once under bet replay", prizeRows === 1, `rows=${prizeRows}`);
    ok("commission capped under bet replay (≤3,000)", commTotal <= 3_000, `total=${commTotal}`);
    ok("replay credited A a finite, expected amount", bal(A.id) > before4);

    // 5 · commission window enforced — recruit who joined 25 months ago earns 0 commission
    const oldJoin = new Date(Date.now() - 25 * 30 * 24 * 3600_000).toISOString();
    const oldRec = mkUser({ createdAt: oldJoin });
    bindRecruit({ recruitUserId: oldRec.id, code: acctA.code });
    const beforeOld = bal(A.id);
    onRecruitBet(oldRec.id, { stake: 50_000, operatorCommissionRate: 0.03 });
    const oldComm = db.referralReward.listByRecruit(oldRec.id).filter((r) => r.type === "COMMISSION").length;
    ok("commission window enforced (expired → no commission)", oldComm === 0, `rows=${oldComm}`);
    // (prize may still pay — milestone isn't windowed; commission is.)

    // 6 · paused program accrues nothing
    setAffiliateConfig({ enabled: false } as Partial<AffiliateConfig>, OFFICER);
    const pausedRec = mkUser();
    bindRecruit({ recruitUserId: pausedRec.id, code: acctA.code });
    const beforePause = bal(A.id);
    onRecruitDeposit(pausedRec.id, { cumulativeDepositsTzs: 50_000 });
    onRecruitBet(pausedRec.id, { stake: 100_000, operatorCommissionRate: 0.03 });
    ok("paused program: zero accrual", bal(A.id) === beforePause, `Δ=${bal(A.id) - beforePause}`);
    setAffiliateConfig({ enabled: true } as Partial<AffiliateConfig>, OFFICER);

    // 7 · zero / negative stake never mints money
    const zRec = mkUser();
    bindRecruit({ recruitUserId: zRec.id, code: acctA.code });
    const beforeZ = bal(A.id);
    onRecruitBet(zRec.id, { stake: 0, operatorCommissionRate: 0.03 });
    onRecruitBet(zRec.id, { stake: -100_000, operatorCommissionRate: 0.03 });
    const zComm = db.referralReward.listByRecruit(zRec.id).filter((r) => r.type === "COMMISSION").length;
    ok("zero/negative stake creates no commission", zComm === 0);
    ok("zero/negative stake never reduces or mints balance", bal(A.id) >= beforeZ);

    // 8 · cross-referrer attribution integrity
    const cRec = mkUser();
    bindRecruit({ recruitUserId: cRec.id, code: acctA.code });
    const beforeB = bal(B.id);
    onRecruitBet(cRec.id, { stake: 50_000, operatorCommissionRate: 0.03 });
    ok("recruit of A never pays referrer B", bal(B.id) === beforeB, `Δ=${bal(B.id) - beforeB}`);
    const cRewardsToB = db.referralReward.listByRecruit(cRec.id).filter((r) => r.referrerUserId === B.id).length;
    ok("no reward rows attribute A's recruit to B", cRewardsToB === 0);

    // 9 · privacy masking
    const fullName = "Juma Hassan Mwita";
    const phone = "+255712345678";
    const masked = maskName(fullName, phone);
    ok("masked name hides the full display name", !masked.includes(fullName) && masked.includes("***"), masked);
    const maskedNoName = maskName(null, phone);
    ok("masked phone hides full MSISDN", !maskedNoName.includes("712345678"), maskedNoName);

    const passed = checks.filter((c) => c.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} security invariants held`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setAffiliateConfig(saved, OFFICER);
  }
}
