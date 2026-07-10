/**
 * /api/dev-test/resolve-seed-markets — dev-only. Produces REAL resolved-market
 * money so the reporting/finance surfaces can be verified with genuine
 * stakes + payouts (the dev store has no resolved markets by default).
 *
 * Per market: funds N synthetic bettors, has them bet BOTH sides (two-sided pool
 * → real winner payouts), then runs the genuine two-officer resolve
 * (officer A stage-1, officer B stage-2 → settles + pays winners). This creates
 * CONFIRMED BET_PLACED + BET_PAYOUT txns, so GGR = Stakes − Payouts is a real,
 * non-trivial figure across /admin, /admin/finance and /admin/reports.
 *
 * The two officers are dedicated users who hold NO position (the officer-conflict
 * block would otherwise reject them). Returns 404 in production. UNCOMMITTED dev
 * tool — delete at cleanup.
 *
 *   POST { markets?: number, bettors?: number, stake?: number, outcome?: "YES"|"NO" }
 */
import { NextResponse } from "next/server";
import { db, type StoredWallet, type StoredUser } from "@/lib/server/store";
import {
  seedDemoMarkets, listMarkets, buyPosition, resolveMarket, isDemoMarket, type Side,
} from "@/lib/server/market-service";
import { randomId } from "@/lib/server/crypto";

async function makeUser(prefix: string, i: number, balance: number): Promise<string> {
  const now = new Date().toISOString();
  const id = `usr_${prefix}_${randomId(8)}`;
  const u: StoredUser = {
    id, phoneE164: `+25598${String(i).padStart(7, "0").slice(-7)}`, email: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "EN", displayName: null, dob: null, region: null,
    acceptedTermsVersion: null, acceptedTermsAt: null, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(10)}`, userId: id, balance, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);
  return id;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false }, { status: 404 });
  const body = (await req.json().catch(() => ({}))) as {
    markets?: number; bettors?: number; stake?: number; outcome?: Side;
  };
  const MARKETS = Math.max(1, Math.min(6, body.markets ?? 3));
  const BETTORS = Math.max(2, Math.min(40, body.bettors ?? 8));
  const STAKE = body.stake ?? 5000;
  const OUTCOME: Side = body.outcome === "NO" ? "NO" : "YES";

  await seedDemoMarkets();
  const live = (await listMarkets({ status: "LIVE" }).catch(() => []))
    .filter((m) => !isDemoMarket(m))
    .slice(0, MARKETS);
  if (live.length === 0) return NextResponse.json({ ok: false, error: "no live non-demo markets" }, { status: 400 });

  // Two dedicated officers who never bet (so the conflict-block passes).
  const officerA = await makeUser("offa", 900001, 0);
  const officerB = await makeUser("offb", 900002, 0);
  await db.user.update(officerA, { role: "ADMIN", displayName: "Officer A. Mushi" });
  await db.user.update(officerB, { role: "ADMIN", displayName: "Officer B. Kimaro" });

  // Optionally leave each seeded market at a different ceremony stage so the
  // /admin/resolver/[id] page can be screenshotted in every state:
  //   "bets"     — bets on both sides, no attestation (stage-1 pending)
  //   "stage1"   — officer A has staged the verdict (awaiting officer B)
  //   "complete" — both officers sealed (settled + paid)
  // Default cycles bets → stage1 → complete across the seeded markets.
  const stageMode = (body as { stage?: string }).stage;
  const results: Array<{ id: string; title: string; stakes: number; bettors: number; state: string }> = [];
  let userIdx = 0;
  for (let idx = 0; idx < live.length; idx++) {
    const m = live[idx];
    let stakes = 0;
    // Both sides get action so the winning side has an opposing pool to be paid from.
    for (let i = 0; i < BETTORS; i++) {
      const uid = await makeUser("bet", userIdx++, STAKE * 3);
      const side: Side = i % 2 === 0 ? "YES" : "NO";
      const r = await buyPosition(uid, { marketId: m.id, side, stake: STAKE });
      if (r.ok) stakes += STAKE;
    }
    const state = stageMode ?? (["bets", "stage1", "complete"][idx % 3]);
    if (state === "stage1" || state === "complete") {
      await resolveMarket({ marketId: m.id, outcome: OUTCOME, officerId: officerA, evidence: `Official source confirms ${OUTCOME}. Quoted: "final settlement value recorded ${OUTCOME}".` });
    }
    if (state === "complete") {
      await resolveMarket({ marketId: m.id, outcome: OUTCOME, officerId: officerB });
    }
    results.push({ id: m.id, title: m.titleEn.slice(0, 48), stakes, bettors: BETTORS, state });
  }

  // Optional: make a REAL user (e.g. the demo admin) hold a position on the
  // first seeded market, so the officer-conflict block / testing-override can be
  // exercised end-to-end. Leaves that market unresolved.
  const conflictPhone = (body as { conflictBettorPhone?: string }).conflictBettorPhone;
  let conflictMarketId: string | null = null;
  if (conflictPhone && live[0]) {
    const u = await db.user.findByPhone(conflictPhone);
    if (u) {
      const w = await db.wallet.findByUserId(u.id);
      if (w && w.balance < STAKE) await db.wallet.update(w.id, { balance: STAKE * 5 });
      const r = await buyPosition(u.id, { marketId: live[0].id, side: "YES", stake: STAKE });
      if (r.ok) conflictMarketId = live[0].id;
    }
  }

  // Report the resulting money so the caller can eyeball GGR = Stakes − Payouts.
  const all = await db.txn.listAll();
  const conf = all.filter((t) => t.status === "CONFIRMED");
  const stakesTotal = conf.filter((t) => t.type === "BET_PLACED").reduce((s, t) => s + Math.abs(t.amount), 0);
  const payoutsTotal = conf.filter((t) => t.type === "BET_PAYOUT" || t.type === "CASHOUT").reduce((s, t) => s + Math.abs(t.amount), 0);

  return NextResponse.json({
    ok: true,
    resolved: results.length,
    outcome: OUTCOME,
    markets: results,
    conflictMarketId,
    money: { stakes: stakesTotal, payouts: payoutsTotal, ggr: stakesTotal - payoutsTotal },
  });
}
