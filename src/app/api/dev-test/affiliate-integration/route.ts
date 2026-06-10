/**
 * /api/dev-test/affiliate-integration — Sprint 5. Proves the affiliate hooks
 * are wired into the REAL money flows (not just the engine): it calls the
 * actual wallet-service `deposit()` and market-service `buyPosition()` and
 * checks the referrer is credited as a side-effect.
 *
 * 404 in production. POST, no body.
 */
import { NextResponse } from "next/server";
import { db, type StoredUser, type StoredNotification } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setAffiliateConfig, getAffiliateConfig, type AffiliateConfig } from "@/lib/server/affiliate-config";
import { ensureAffiliateAccount, bindRecruit } from "@/lib/server/affiliate-service";
import { deposit } from "@/lib/server/wallet-service";
import { buyPosition, createMarket } from "@/lib/server/market-service";
import { listForUser } from "@/lib/server/notification-service";

const OFFICER = "system_integ";

async function mkUser() {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25579${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance: 0, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}
const bal = async (id: string) => (await db.wallet.findByUserId(id))?.balance ?? 0;

export async function POST() {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getAffiliateConfig();

  try {
    setAffiliateConfig({
      enabled: true,
      commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: 250_000 },
      bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 1_000, trigger: "FIRST_DEPOSIT" },
      prize: { enabled: true, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 5_000, capPerReferrer: 100 },
    } as Partial<AffiliateConfig>, OFFICER);

    const R = await mkUser();
    const acctR = await ensureAffiliateAccount(R.id);
    const C = await mkUser();
    const bind = await bindRecruit({ recruitUserId: C.id, code: acctR.code });
    ok("recruit bound to referrer", bind.bound === true);

    // ── REAL DEPOSIT through wallet-service.deposit() ────────────────────
    const rBeforeDep = await bal(R.id);
    const cBeforeDep = await bal(C.id);
    const dep = await deposit(C.id, { provider: "MPESA", amount: 20_000, msisdn: C.phoneE164 });
    ok("real deposit() succeeded", dep.ok === true, dep.ok ? "" : (dep as { error: string }).error);
    if (dep.ok) {
      await ok("deposit credited recruit wallet (20,000 + 2,000 bonus)", await bal(C.id) - cBeforeDep === 22_000, `Δ=${await bal(C.id) - cBeforeDep}`);
      await ok("deposit fired referrer bonus (+1,000)", await bal(R.id) - rBeforeDep === 1_000, `Δ=${await bal(R.id) - rBeforeDep}`);
    }

    // ── REAL BET through market-service.buyPosition() ───────────────────
    const market = await createMarket({
      titleEn: "Integration test market", titleSw: "Soko la majaribio",
      category: "sports", sourceUrl: "https://example.org/test",
      resolutionCriterion: "Test.", resolutionAt: new Date(Date.now() + 3600_000).toISOString(),
      proposedBy: OFFICER,
    });
    const rBeforeBet = await bal(R.id);
    const bet = await buyPosition(C.id, { marketId: market.id, side: "YES", stake: 5_000 });
    ok("real buyPosition() succeeded", bet.ok === true, bet.ok ? "" : (bet as { error: string }).error);
    if (bet.ok) {
      // commission = round(5000 × marketCommissionRate × 0.5) + first-bet prize 5000
      const rDelta = await bal(R.id) - rBeforeBet;
      const commissionRows = (await db.referralReward.listByRecruit(C.id)).filter((r) => r.type === "COMMISSION").length;
      const prizeRows = (await db.referralReward.listByRecruit(C.id)).filter((r) => r.type === "PRIZE").length;
      ok("bet fired referrer commission", commissionRows >= 1, `rows=${commissionRows}`);
      ok("bet fired first-bet prize (+5,000)", prizeRows === 1 && rDelta >= 5_000, `Δ=${rDelta} prizeRows=${prizeRows}`);
    }

    // ── Notifications reached the referrer ──────────────────────────────
    const notifs = ((await listForUser(R.id, 50)) as StoredNotification[]).filter((n) => n.kind === "AFFILIATE");
    ok("referrer received affiliate notifications (join + rewards)", notifs.length >= 2, `count=${notifs.length}`);

    // ── Ledger ↔ wallet consistency for this referrer ───────────────────
    const paidToR = (await db.referralReward.listByReferrer(R.id)).filter((r) => r.recipientUserId === R.id && r.status === "PAID").reduce((s, r) => s + r.amountTzs, 0);
    await ok("referrer wallet gain == sum of PAID rewards to them", await bal(R.id) === paidToR, `wallet=${await bal(R.id)} ledger=${paidToR}`);

    const passed = checks.filter((c) => c.pass).length;
    return NextResponse.json({ ok: passed === checks.length, summary: `${passed}/${checks.length} integration checks held`, checks }, { status: passed === checks.length ? 200 : 500 });
  } finally {
    setAffiliateConfig(saved, OFFICER);
  }
}
