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
import { hasDatabase } from "@/lib/server/prisma";
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

async function ensureStressUsers(prefix: string, count: number, fundEach: number) {
  const userIds: string[] = [];
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, "").slice(0, 4) || "s1";
  for (let i = 0; i < count; i++) {
    const phone = `+25590${safePrefix.padEnd(2, "0").slice(0, 2)}${String(i).padStart(5, "0").slice(-5)}`;
    let user = await db.user.findByPhone(phone);
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
      await db.user.create(u);
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
      await db.wallet.create(w);
      user = u;
    } else {
      const w = await db.wallet.findByUserId(user.id);
      if (w) await db.wallet.update(w.id, { balance: w.balance + fundEach });
    }
    await ensureStressKyc(user.id, user.displayName ?? `stress-${safePrefix}-${i}`);
    userIds.push(user.id);
  }
  return userIds;
}

/**
 * 🔴 EVERY BET THIS HARNESS PLACED WAS REJECTED, AND IT REPORTED `poolMath: "PASS"` ANYWAY.
 *
 * Measured 2026-09-07 on a fresh dev store: `{"accepted":0,"rejected":8,"poolMath":"PASS",
 * "topErrors":[{"msg":"Identity not verified (NOT_STARTED)."}]}`. The pool invariant it exists to
 * prove — yesPool delta ≡ Σ accepted YES stake — is 0 ≡ 0 when nothing is accepted, so the check
 * passes hardest exactly when the harness has done nothing at all. ⛔ That is a vacuous control
 * (SKILL §5b rule 8: a check written against an unreachable branch proves nothing), and it had
 * been true since KYC became a money gate on 2026-09-05: these synthetic users were minted with
 * no KYC row, so `buyPosition` refused every one of them.
 *
 * ⚠️ THE GATE IS NOT THE BUG AND IS NOT WEAKENED. `buyPosition` is right to refuse an unverified
 * identity — that is the control Ali shipped, and it reads the DATABASE rather than a session
 * stamp, which is why a fixture cannot pretend its way past it. So the fixture writes a real
 * APPROVED row, exactly as `/auth/demo`'s own `ensureDemoKyc` does and for the same stated
 * reason: *"the fixture writes a real APPROVED row, and the session stamp is no longer the only
 * thing claiming approval."*
 *
 * ⛔ Dev-only. This route is 404 in production and double-gated at the edge by `proxy.ts`.
 */
async function ensureStressKyc(userId: string, fullName: string) {
  const existing = await db.kyc.findByUserId(userId);
  if (existing?.status === "APPROVED") return;
  const now = new Date().toISOString();
  await db.kyc.upsert({
    id: existing?.id ?? `kyc_${randomId(10)}`,
    userId,
    status: "APPROVED",
    rejectReason: null,
    rejectNote: null,
    idType: "NIDA",
    idNumber: "19900101700000000000",
    idExpiry: null,
    idVerifiedAt: now,
    fullName,
    dob: "1990-01-01",
    documents: [],
    reviewerId: null,
    reviewedAt: now,
    submittedAt: now,
    // The withdraw gate asks for THIS, not `status` — carried so a synthetic bettor is a
    // complete fixture rather than one that passes the bet gate and fails the payout gate.
    approvedAt: existing?.approvedAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  });
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  // IN-MEMORY PROBE ONLY. This route reads globalThis.__50PICK_* stores, which
  // exist ONLY on the in-memory path (market-dal.ts / store.ts). Point it at
  // Postgres and its position/wallet/pool checks silently read ZERO and report
  // PASS — a green test measuring nothing. Refuse rather than lie.
  // For real Postgres load testing use scripts/load/ (see `docs/NEXT-PLAN.md`).
  if (hasDatabase()) {
    return NextResponse.json({
      ok: false,
      error: "in-memory probe only — DATABASE_URL is set, so this route would report zeros as PASS. Use scripts/load/ for Postgres load tests.",
    }, { status: 409 });
  }
  const body = (await req.json().catch(() => null)) as Body | null;
  const marketId = typeof body?.marketId === "string" ? body.marketId : "";

  // Explicit finiteness check before Math.max/min — those silently
  // propagate NaN (Math.min(2000, NaN) === NaN). Defence-in-depth:
  // a future caller might pass NaN and we'd loop zero times without
  // a useful error. Same lesson as the seed-wallet Infinity bug.
  const numOrDefault = (v: unknown, dflt: number): number =>
    typeof v === "number" && Number.isFinite(v) ? v : dflt;

  const n = Math.max(1, Math.min(2000, numOrDefault(body?.n, 100)));
  const yesRatio = Math.max(0, Math.min(1, numOrDefault(body?.yesRatio, 0.5)));
  const stake = Math.max(100, Math.min(1_000_000, numOrDefault(body?.stake, 1_000)));
  const prefix = typeof body?.userPrefix === "string" ? body.userPrefix.slice(0, 4) : "s1";

  const m0 = await getMarket(marketId);
  if (!m0) return NextResponse.json({ ok: false, error: "marketId not found" }, { status: 400 });

  const yesPoolBefore = m0.yesPool;
  const noPoolBefore = m0.noPool;

  const userCount = Math.min(n, 200);
  const fundPerUser = stake * Math.ceil(n / userCount) + stake * 4;
  const userIds = await ensureStressUsers(prefix, userCount, fundPerUser);
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

  const m1 = (await getMarket(marketId))!;
  const expectedYesPool = yesPoolBefore + expectedYesAccepted * stake;
  const expectedNoPool = noPoolBefore + expectedNoAccepted * stake;
  const yesDelta = m1.yesPool - expectedYesPool;
  const noDelta = m1.noPool - expectedNoPool;
  /**
   * ⛔ THE VACUITY FLOOR. `yesDelta === 0 && noDelta === 0` is trivially true when NOTHING was
   * accepted, so this used to report `PASS` hardest exactly when the harness had done nothing —
   * which is how eight rejected bets read as a proven pool invariant for two days. A run that
   * accepted no bets has not tested the invariant; it has skipped it, and it must say so.
   */
  const poolMath = accepted === 0 && n > 0
    ? "VACUOUS — zero bets were accepted, so the pool invariant was never exercised"
    : yesDelta === 0 && noDelta === 0 ? "PASS" : "FAIL";

  // Spot-check 5 random synthetic users — their wallet debits to this
  // market should match accepted positions × stake.
  const sample = userIds.slice(0, Math.min(5, userIds.length));
  const positionsStore = (globalThis as unknown as {
    __50PICK_POSITIONS?: Map<string, { userId: string; marketId: string; stake: number; status: string }>;
  }).__50PICK_POSITIONS;
  const walletChecks = await Promise.all(sample.map(async (uid) => {
    const w = await db.wallet.findByUserId(uid);
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
  }));

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
