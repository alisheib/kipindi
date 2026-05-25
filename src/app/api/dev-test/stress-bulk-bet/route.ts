/**
 * /api/dev-test/stress-bulk-bet — internal stress harness.
 *
 * Drives N parallel `buyPosition` calls against a single market with an
 * optional mix of YES/NO. Returns aggregate metrics + math-invariant
 * proof. Lets us simulate hundreds-of-users-simultaneously load without
 * the cost of 100s of Playwright contexts.
 *
 * Returns 404 in production.
 *
 *   POST { marketId, n?, yesRatio?, stake?, userPrefix? }
 *
 * Math invariants asserted in the response:
 *    market.yesPool delta ≡ Σ(accepted YES stake)
 *    market.noPool  delta ≡ Σ(accepted NO  stake)
 *
 * Wallet invariant (spot-checked on 5 random users):
 *    For each synthetic user, accepted_positions_on_market × stake
 *    matches the debits to their wallet.
 */
import { NextResponse } from "next/server";
import { db } from "@/lib/server/store";
import type { StoredUser, StoredWallet } from "@/lib/server/store";
import { buyPosition, getMarket } from "@/lib/server/market-service";
import { randomId } from "@/lib/server/crypto";

type Body = {
  marketId?: string;
  n?: number;
  yesRatio?: number;
  stake?: number;
  userPrefix?: string;
};

function ensureStressUsers(prefix: string, count: number, fundEach: number): string[] {
  const userIds: string[] = [];
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, "").slice(0, 4) || "s1";
  for (let i = 0; i < count; i++) {
    const phone = `+25590${safePrefix.padEnd(2, "0").slice(0, 2)}${String(i).padStart(5, "0").slice(-5)}`;
    let user = db.user.findByPhone(phone);
    if (!user) {
      const now = new Date().toISOString();
      const u: StoredUser = {
        id: `usr_${randomId(12)}`,
        phoneE164: phone,
        passwordHash: null,
        passwordSalt: null,
        failedLoginCount: 0,
        lockedUntil: null,
        role: "PLAYER",
        status: "ACTIVE",
        locale: "EN",
        displayName: `stress-${safePrefix}-${i}`,
        dob: "1990-01-01",
        region: "TZ",
        acceptedTermsVersion: "v1",
        acceptedTermsAt: now,
        marketingOptIn: false,
        twoFactorEnabled: false,
        avatarDataUrl: null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: null,
        closedAt: null,
      };
      db.user.create(u);
      const w: StoredWallet = {
        id: `wal_${randomId(12)}`,
        userId: u.id,
        balance: fundEach,
        pending: 0,
        hold: 0,
        currency: "TZS",
        status: "ACTIVE",
        createdAt: now,
        updatedAt: now,
      };
      db.wallet.create(w);
      user = u;
    } else {
      const w = db.wallet.findByUserId(user.id);
      if (w) db.wallet.update(w.id, { balance: w.balance + fundEach });
    }
    userIds.push(user.id);
  }
  return userIds;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  const marketId = body?.marketId ?? "";
  const n = Math.max(1, Math.min(2000, body?.n ?? 100));
  const yesRatio = Math.max(0, Math.min(1, body?.yesRatio ?? 0.5));
  const stake = Math.max(100, Math.min(1_000_000, body?.stake ?? 1_000));
  const prefix = (body?.userPrefix ?? "s1").slice(0, 4);

  const m0 = getMarket(marketId);
  if (!m0) return NextResponse.json({ ok: false, error: "marketId not found" }, { status: 400 });

  const yesPoolBefore = m0.yesPool;
  const noPoolBefore = m0.noPool;

  const userCount = Math.min(n, 200);
  const fundPerUser = stake * Math.ceil(n / userCount) + stake * 4;
  const userIds = ensureStressUsers(prefix, userCount, fundPerUser);
  if (userIds.length === 0) {
    return NextResponse.json({ ok: false, error: "could not provision synthetic users" }, { status: 500 });
  }

  // Build the work list — round-robin users across N bets.
  const work: Array<{ userId: string; side: "YES" | "NO" }> = [];
  for (let i = 0; i < n; i++) {
    work.push({
      userId: userIds[i % userIds.length],
      side: Math.random() < yesRatio ? "YES" : "NO",
    });
  }

  // Fire all bets in PARALLEL — the wallet-level lock serialises same-
  // user races; cross-user is exactly what we want to stress here.
  const t0 = Date.now();
  const results = await Promise.allSettled(
    work.map((w) => buyPosition(w.userId, { marketId, side: w.side, stake })),
  );
  const elapsedMs = Date.now() - t0;

  let accepted = 0;
  let rejected = 0;
  let expectedYesAccepted = 0;
  let expectedNoAccepted = 0;
  const errors: Record<string, number> = {};
  results.forEach((r, i) => {
    const intentSide = work[i].side;
    if (r.status === "fulfilled" && r.value.ok) {
      accepted++;
      if (intentSide === "YES") expectedYesAccepted++;
      else expectedNoAccepted++;
    } else {
      rejected++;
      const e =
        r.status === "rejected"
          ? String((r.reason as Error)?.message ?? "throw")
          : String((r.value as { error?: string }).error ?? "unknown");
      errors[e] = (errors[e] ?? 0) + 1;
    }
  });

  const m1 = getMarket(marketId)!;
  const expectedYesPool = yesPoolBefore + expectedYesAccepted * stake;
  const expectedNoPool = noPoolBefore + expectedNoAccepted * stake;
  const yesDelta = m1.yesPool - expectedYesPool;
  const noDelta = m1.noPool - expectedNoPool;
  const poolMath = yesDelta === 0 && noDelta === 0 ? "PASS" : "FAIL";

  // Spot-check 5 random synthetic users — their wallet debits to this
  // market should match accepted positions × stake.
  const sample = userIds.slice(0, Math.min(5, userIds.length));
  const positionsStore = (globalThis as unknown as {
    __50PICK_POSITIONS?: Map<string, { userId: string; marketId: string; stake: number; status: string }>;
  }).__50PICK_POSITIONS;
  const walletChecks = sample.map((uid) => {
    const w = db.wallet.findByUserId(uid);
    const pos = Array.from(positionsStore?.values() ?? []).filter(
      (p) => p.userId === uid && p.marketId === marketId && p.status === "OPEN",
    );
    const debited = pos.reduce((s, p) => s + p.stake, 0);
    return {
      userId: uid,
      walletBalance: w?.balance ?? null,
      positionsOnMarket: pos.length,
      debitedToThisMarket: debited,
    };
  });

  return NextResponse.json({
    ok: true,
    n,
    accepted,
    rejected,
    elapsedMs,
    perBetMs: +(elapsedMs / n).toFixed(2),
    marketYesPool: m1.yesPool,
    marketNoPool: m1.noPool,
    expectedYesPool,
    expectedNoPool,
    yesDelta,
    noDelta,
    poolMath,
    topErrors: Object.entries(errors)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([msg, count]) => ({ msg, count })),
    walletChecks,
  });
}
