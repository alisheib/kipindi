/**
 * /api/dev-test/affiliate-stress — Sprint 1. High-volume load + invariant
 * checks for the affiliate engine. Runs R referrers × N recruits × E events
 * (deposits + bets) and asserts the money-safety invariants under scale:
 *
 *   - MONEY CONSERVATION: Σ wallet balance deltas == Σ PAID reward amounts
 *   - per-recruit commission CAP is never exceeded
 *   - BONUS paid at most once per recruit (idempotent under burst)
 *   - PRIZE paid at most once per recruit (idempotent under burst)
 *   - recruitCount denormaliser matches actual binds
 *   - no NaN / negative balances
 *   - throughput within a soft performance budget
 *
 * 404 in production. POST ?referrers=&recruits=&events= (all optional).
 */
import { NextResponse, type NextRequest } from "next/server";
import { db, type StoredUser } from "@/lib/server/store";
import { randomId } from "@/lib/server/crypto";
import { setAffiliateConfig, getAffiliateConfig, type AffiliateConfig } from "@/lib/server/affiliate-config";
import { ensureAffiliateAccount, bindRecruit, onRecruitBet, onRecruitSettlement, onRecruitDeposit } from "@/lib/server/affiliate-service";

const OFFICER = "system_stress";
const COMMISSION_CAP = 5_000;

async function mkUser(balance = 0) {
  const id = `usr_${randomId(12)}`;
  const now = new Date().toISOString();
  const u = await db.user.create({
    id, phoneE164: `+25572${Math.floor(Math.random() * 9_000_000 + 1_000_000)}`,
    passwordHash: "x", passwordSalt: "x", failedLoginCount: 0, lockedUntil: null,
    role: "PLAYER", status: "ACTIVE", locale: "SW", displayName: null, dob: "1995-01-01",
    region: null, acceptedTermsVersion: "v1", acceptedTermsAt: now, marketingOptIn: false,
    twoFactorEnabled: false, avatarDataUrl: null, createdAt: now, updatedAt: now,
    lastLoginAt: now, closedAt: null, recruitedBy: null,
  });
  await db.wallet.create({ id: `wlt_${randomId(12)}`, userId: id, balance, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now });
  return u;
}

export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const R = Math.min(200, Math.max(1, Number(sp.get("referrers") ?? 40)));
  const N = Math.min(100, Math.max(1, Number(sp.get("recruits") ?? 15)));
  const E = Math.min(50, Math.max(1, Number(sp.get("events") ?? 8)));

  const checks: Array<{ name: string; pass: boolean; detail: string }> = [];
  const ok = (name: string, pass: boolean, detail = "") => checks.push({ name, pass, detail });
  const saved = getAffiliateConfig();

  const t0 = Date.now();
  let eventCount = 0;
  const referrerIds: string[] = [];
  const recruitIds: string[] = [];

  try {
    const applied = setAffiliateConfig(
      {
        enabled: true,
        commission: { enabled: true, rate: 0.5, windowMonths: 24, capPerRecruitTzs: COMMISSION_CAP },
        bonus: { enabled: true, recipient: "BOTH", newAmountTzs: 2_000, referrerAmountTzs: 1_000, trigger: "FIRST_DEPOSIT" },
        prize: { enabled: true, milestone: "FIRST_BET", depositThresholdTzs: 10_000, amountTzs: 5_000, capPerReferrer: 10_000 },
      } as Partial<AffiliateConfig>,
      OFFICER,
    );
    // Guard: an invalid config silently falls back to defaults and would make
    // every downstream assertion meaningless — fail loudly instead.
    ok("stress config applied (setAffiliateConfig ok)", applied.ok === true, applied.ok ? "" : applied.error);

    // Build the graph: R referrers, each with N recruits.
    const binds: number[] = [];
    for (let r = 0; r < R; r++) {
      const ref = await mkUser();
      referrerIds.push(ref.id);
      const acct = await ensureAffiliateAccount(ref.id);
      let bound = 0;
      for (let n = 0; n < N; n++) {
        const rec = await mkUser();
        recruitIds.push(rec.id);
        const res = await bindRecruit({ recruitUserId: rec.id, code: acct.code });
        if (res.bound) bound++;
        // A single recruit's deposits + bets — in production these are
        // serialized by the recruit's wallet lock (withLock in buyPosition),
        // so the per-recruit cap + once-only milestones see a consistent
        // ledger. We model that here (sequential per recruit) and stress
        // CROSS-recruit concurrency separately below.
        for (let e = 0; e < E; e++) {
          await onRecruitDeposit(rec.id, { cumulativeDepositsTzs: 10_000 * (e + 1) });
          await onRecruitSettlement(rec.id, { operatorFee: 1_500 });
          eventCount += 2;
        }
      }
      binds.push(bound);
    }

    const elapsedMs = Date.now() - t0;
    const opsPerSec = Math.round((eventCount / elapsedMs) * 1000);

    // ── Invariant 1: money conservation ──────────────────────────────
    const userSet = new Set([...referrerIds, ...recruitIds]);
    let walletDeltaTotal = 0;
    let anyNaN = false, anyNegative = false;
    for (const uid of userSet) {
      const bal = (await db.wallet.findByUserId(uid))?.balance ?? 0;
      if (Number.isNaN(bal)) anyNaN = true;
      if (bal < 0) anyNegative = true;
      walletDeltaTotal += bal; // all started at 0
    }
    const runRewards = (await db.referralReward.list(1_000_000)).filter((r) => userSet.has(r.recipientUserId) && r.status === "PAID");
    const paidTotal = runRewards.reduce((s, r) => s + r.amountTzs, 0);
    ok("money conservation: Σ wallet deltas == Σ PAID rewards", walletDeltaTotal === paidTotal, `wallets=${walletDeltaTotal} rewards=${paidTotal}`);
    ok("no NaN balances", !anyNaN);
    ok("no negative balances", !anyNegative);

    // ── Invariant 2: commission cap per recruit ──────────────────────
    let capBreaches = 0, maxCommissionPerRecruit = 0;
    for (const rec of recruitIds) {
      const comm = (await db.referralReward.listByRecruit(rec)).filter((r) => r.type === "COMMISSION").reduce((s, r) => s + r.amountTzs, 0);
      maxCommissionPerRecruit = Math.max(maxCommissionPerRecruit, comm);
      if (comm > COMMISSION_CAP) capBreaches++;
    }
    ok("per-recruit commission cap never exceeded", capBreaches === 0, `breaches=${capBreaches} max=${maxCommissionPerRecruit}/${COMMISSION_CAP}`);

    // ── Invariant 3 + 4: bonus/prize idempotency under burst ─────────
    let bonusOver = 0, prizeOver = 0;
    for (const rec of recruitIds) {
      const rewards = await db.referralReward.listByRecruit(rec);
      const bonusRows = rewards.filter((r) => r.type === "BONUS").length;       // BOTH → up to 2 (new + referrer)
      const prizeRows = rewards.filter((r) => r.type === "PRIZE").length;       // up to 1
      if (bonusRows > 2) bonusOver++;
      if (prizeRows > 1) prizeOver++;
    }
    ok("bonus paid at most once per recruit (≤2 rows for BOTH)", bonusOver === 0, `violations=${bonusOver}`);
    ok("prize paid at most once per recruit", prizeOver === 0, `violations=${prizeOver}`);

    // ── Invariant 5: recruitCount denormaliser ───────────────────────
    let countMismatch = 0;
    for (let i = 0; i < referrerIds.length; i++) {
      const acct = await db.affiliate.findByUserId(referrerIds[i]);
      const actual = (await db.user.list()).filter((u) => u.recruitedBy === referrerIds[i]).length;
      if (!acct || acct.recruitCount !== actual || actual !== binds[i]) countMismatch++;
    }
    ok("recruitCount matches actual binds for every referrer", countMismatch === 0, `mismatches=${countMismatch}`);

    // ── Invariant 6: totalEarned denormaliser == ledger ──────────────
    let earnedMismatch = 0;
    for (const ref of referrerIds) {
      const acct = await db.affiliate.findByUserId(ref);
      const ledger = (await db.referralReward.listByReferrer(ref)).filter((r) => r.recipientUserId === ref && r.status === "PAID").reduce((s, r) => s + r.amountTzs, 0);
      if (!acct || acct.totalEarnedTzs !== ledger) earnedMismatch++;
    }
    ok("totalEarned denormaliser matches ledger for every referrer", earnedMismatch === 0, `mismatches=${earnedMismatch}`);

    // ── Cross-recruit CONCURRENCY: many recruits credit ONE referrer at
    //    once (interleaved microtasks). Tests the referrer wallet +
    //    totalEarned read-modify-write for lost updates. ───────────────
    {
      const cref = await mkUser();
      const cacct = await ensureAffiliateAccount(cref.id);
      const crecs: string[] = [];
      for (let i = 0; i < 150; i++) {
        const r = await mkUser();
        crecs.push(r.id);
        await bindRecruit({ recruitUserId: r.id, code: cacct.code });
      }
      const before = (await db.wallet.findByUserId(cref.id))?.balance ?? 0;
      const earnedBefore = (await db.affiliate.findByUserId(cref.id))?.totalEarnedTzs ?? 0;
      // Each recruit's FIRST bet → commission 750 + first-bet prize 5000 = 5750.
      await Promise.all(crecs.map((rid) => Promise.resolve().then(() => onRecruitSettlement(rid, { operatorFee: 1_500 }))));
      const after = (await db.wallet.findByUserId(cref.id))?.balance ?? 0;
      const earnedAfter = (await db.affiliate.findByUserId(cref.id))?.totalEarnedTzs ?? 0;
      const expected = crecs.length * (750 + 5_000);
      ok("concurrent credits to one referrer: no lost wallet updates", after - before === expected, `Δwallet=${after - before} expected=${expected}`);
      ok("concurrent credits to one referrer: totalEarned consistent", earnedAfter - earnedBefore === expected, `Δearned=${earnedAfter - earnedBefore} expected=${expected}`);
    }

    // ── Performance budget ───────────────────────────────────────────
    ok("throughput within budget (≥ 300 ops/sec)", opsPerSec >= 300, `${opsPerSec} ops/sec over ${eventCount} events in ${elapsedMs}ms`);

    const passed = checks.filter((c) => c.pass).length;
    return NextResponse.json(
      {
        ok: passed === checks.length,
        scale: { referrers: R, recruitsPerReferrer: N, eventsPerRecruit: E * 2, totalEvents: eventCount, users: userSet.size, rewardsCreated: runRewards.length },
        perf: { elapsedMs, opsPerSec },
        summary: `${passed}/${checks.length} invariants held`,
        checks,
      },
      { status: passed === checks.length ? 200 : 500 },
    );
  } finally {
    setAffiliateConfig(saved, OFFICER);
  }
}
