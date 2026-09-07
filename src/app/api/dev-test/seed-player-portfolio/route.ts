/**
 * /api/dev-test/seed-player-portfolio — dev-only. Gives the SIGNED-IN player a portfolio that
 * spans every `PositionStatus`, so the player-facing query surfaces can be driven against real
 * rows instead of an empty page.
 *
 * ⭐ WHY THIS EXISTS. The PLAYER QUERY campaign's whole complaint is that a player cannot tell
 * won from lost from voided-and-refunded. Verifying the fix needs a player who actually holds one
 * of each — and nothing in the tree produced that:
 *
 *   · `/auth/demo` funds a wallet and approves KYC, but places no bets.
 *   · `stress-bulk-bet` bets as SYNTHETIC users nobody can sign in as.
 *   · `resolve-seed-markets` resolves markets, but its bettors are synthetic too.
 *
 * So `/positions` renders its rail behind `positions.length > 0` and a filter scan reported
 * *"0 [data-filter-rail], expected 1"* — the instrument reaching a real page and finding nothing,
 * which is indistinguishable from the rail being missing. ⛔ A fixture gap and a defect look
 * identical from the outside; that is the reason to close the gap rather than to read past it.
 *
 * ⚠️ IT MOVES REAL MONEY THROUGH THE REAL SERVICE. `buyPosition`, `cashOutPosition`,
 * `resolveMarket` and `emergencyVoidMarket` are called exactly as the product calls them — no
 * store writes behind their backs. A fixture that stamped statuses directly would produce rows
 * the product can never produce, and the lens filtering them would be proved against fiction.
 *
 * ⛔ 404 in production, double-gated at the edge by `proxy.ts`.
 *
 *   POST { markets?: number, stake?: number }  →  { ok, placed, byStatus, marketIds }
 */
import { NextResponse } from "next/server";
import { db, type StoredUser, type StoredWallet } from "@/lib/server/store";
import { getSession } from "@/lib/server/session";
import {
  buyPosition,
  cashOutPosition,
  emergencyVoidMarket,
  isDemoMarket,
  listMarkets,
  listPositionsForUser,
  resolveMarket,
  settleMarket,
  type Side,
} from "@/lib/server/market-service";
import { randomId } from "@/lib/server/crypto";

/** An officer who holds no position, so the conflict block passes. */
async function makeOfficer(tag: string, seq: number): Promise<string> {
  const phone = `+25597${String(seq).padStart(7, "0").slice(-7)}`;
  const found = await db.user.findByPhone(phone);
  if (found) {
    if (found.role !== "ADMIN") await db.user.update(found.id, { role: "ADMIN" });
    return found.id;
  }
  const now = new Date().toISOString();
  const id = `usr_${tag}_${randomId(8)}`;
  const u: StoredUser = {
    id, phoneE164: phone, email: null,
    passwordHash: null, passwordSalt: null, failedLoginCount: 0, lockedUntil: null,
    role: "ADMIN", status: "ACTIVE", locale: "EN", displayName: `Officer ${tag.toUpperCase()}`,
    dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
    marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null, emailVerifiedAt: null,
    createdAt: now, updatedAt: now, lastLoginAt: null, closedAt: null,
  };
  await db.user.create(u);
  const w: StoredWallet = {
    id: `wal_${randomId(10)}`, userId: id, balance: 0, pending: 0, hold: 0,
    currency: "TZS", status: "ACTIVE", createdAt: now, updatedAt: now,
  };
  await db.wallet.create(w);
  return id;
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  const session = await getSession();
  if (!session) return NextResponse.json({ ok: false, error: "sign in first (/auth/demo)" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { markets?: number; stake?: number };
  const WANT = Math.max(5, Math.min(20, body.markets ?? 12));
  const BASE_STAKE = body.stake ?? 1500;
  const uid = session.userId;

  // The player needs funds for every stake below, plus room for the opposing bets that make a
  // pool two-sided. ⛔ Topped up rather than set, so a re-run does not erase a real balance.
  const wallet = await db.wallet.findByUserId(uid);
  if (!wallet) return NextResponse.json({ ok: false, error: "no wallet" }, { status: 400 });
  const need = BASE_STAKE * WANT * 4;
  if (wallet.balance < need) await db.wallet.update(wallet.id, { balance: need });

  const live = (await listMarkets({ status: "LIVE" }).catch(() => []))
    .filter((m) => !isDemoMarket(m))
    .slice(0, WANT);
  if (live.length < 5) {
    return NextResponse.json(
      { ok: false, error: `only ${live.length} live non-demo markets — POST /api/dev-test/seed-real-markets first` },
      { status: 400 },
    );
  }

  const officerA = await makeOfficer("pqa", 9100001);
  const officerB = await makeOfficer("pqb", 9100002);

  /**
   * ⚠️ THE STAKES VARY AND THE SIDES ALTERNATE, DELIBERATELY. A portfolio where every row carries
   * the same stake on the same side cannot tell a working sort from a broken one — every ordering
   * looks identical, which is the fixture equivalent of the vacuous control this campaign keeps
   * finding. Titles also differ, so the locale-collated title sort has something to order.
   */
  const placed: Array<{ marketId: string; positionId: string; stake: number; side: Side }> = [];
  for (const [i, m] of live.entries()) {
    const side: Side = i % 2 === 0 ? "YES" : "NO";
    const stake = BASE_STAKE + ((i * 700) % 5000);
    const r = await buyPosition(uid, { marketId: m.id, side, stake });
    if (!r.ok) continue;
    // Give the market an opposing pool, or a winning side has nothing to be paid from.
    const foil = await makeOfficer(`pqf${i}`, 9200000 + i);
    await db.user.update(foil, { role: "PLAYER" });
    const fw = await db.wallet.findByUserId(foil);
    if (fw) await db.wallet.update(fw.id, { balance: stake * 4 });
    await db.kyc.upsert({
      id: `kyc_${randomId(10)}`, userId: foil, status: "APPROVED", rejectReason: null, rejectNote: null,
      idType: "NIDA", idNumber: "19900101700000000000", idExpiry: null, idVerifiedAt: new Date().toISOString(),
      fullName: "Foil Bettor", dob: "1990-01-01", documents: [], reviewerId: null,
      reviewedAt: new Date().toISOString(), submittedAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
    await buyPosition(foil, { marketId: m.id, side: side === "YES" ? "NO" : "YES", stake: stake * 2 });

    const mine = (await listPositionsForUser(uid, 500, "MARKET")).find((p) => p.marketId === m.id && p.status === "OPEN");
    if (mine) placed.push({ marketId: m.id, positionId: mine.id, stake, side });
  }

  /**
   * The five states, produced through the real money paths:
   *
   *   OPEN        — left alone.
   *   CASHED_OUT  — `cashOutPosition`, the player's own exit.
   *   WIN / LOSS  — `resolveMarket` twice (stage 1 then stage 2) on the player's side / the
   *                 other side. ⚠️ Two officers, because a market the PLAYER holds is exactly
   *                 the conflict the block exists for.
   *   VOID        — `emergencyVoidMarket`, which refunds every open stake.
   *
   * ⛔ The plan is written as data first so the arithmetic is checkable: 12 markets gives
   * 4 open · 2 cashed · 3 won · 2 lost · 1 void. Every lens the campaign adds has rows.
   */
  const plan = placed.map((p, i) => ({
    ...p,
    want: i < 4 ? "OPEN" : i < 6 ? "CASHED_OUT" : i < 9 ? "WIN" : i < 11 ? "LOSS" : "VOID",
  }));

  /**
   * ⛔ EVERY REFUSAL IS COLLECTED AND RETURNED. The first version of this fixture ignored each
   * `ServiceResult`, and it reported `placed: 12` over a portfolio holding ZERO won and ZERO lost
   * positions — the two states the campaign's sharpest complaint is about. The money paths had
   * refused, in a way nothing printed. A fixture that hides its own failures manufactures the
   * "green over nothing" result this whole programme keeps finding.
   */
  const refusals: string[] = [];
  const note = (what: string, r: { ok: boolean; error?: string; code?: string }) => {
    if (!r.ok) refusals.push(`${what}: ${r.code ?? ""} ${r.error ?? "refused"}`.trim());
    return r;
  };

  for (const p of plan) {
    if (p.want === "CASHED_OUT") {
      note(`cashOut ${p.marketId}`, await cashOutPosition(uid, p.positionId));
    } else if (p.want === "WIN" || p.want === "LOSS") {
      const outcome: Side = p.want === "WIN" ? p.side : (p.side === "YES" ? "NO" : "YES");
      note(`stage1 ${p.marketId}`, await resolveMarket({
        marketId: p.marketId, outcome, officerId: officerA,
        evidence: `Dev fixture — official source records ${outcome}. Quoted: "final settlement value recorded ${outcome}".`,
      }));
      /**
       * ⚠️ RESOLVING IS NOT SETTLING, AND THE FIRST VERSION OF THIS FIXTURE CONFLATED THEM.
       * It called `resolveMarket` twice and reported a portfolio with ZERO won and ZERO lost
       * positions. Two separate facts, both learned from the refusals this now collects:
       *   · the second call came back `INVALID Market already resolved` — single-officer
       *     resolution completes at stage 1 (Ali's dated decision; `test:two-admin` asserts the
       *     ABSENCE of a two-officer hard-lock), so the second officer was never needed;
       *   · and a resolved market still pays nothing until its OBJECTION WINDOW closes —
       *     `market-scheduler.ts:164` settles on `objectionsClosedAt`, which is hours away.
       * ⛔ So the positions were correctly OPEN and the product was right. `force` skips the
       * window and the objection check — and ONLY those (`market-service.ts:3096`) — so the
       * money still moves through the real settlement.
       */
      note(`settle ${p.marketId}`, await settleMarket(p.marketId, { force: true, actorId: officerB }));
    } else if (p.want === "VOID") {
      note(`void ${p.marketId}`, await emergencyVoidMarket({ marketId: p.marketId, officerId: officerA, reason: "Dev fixture — source withdrawn before settlement." }));
    }
  }

  // ⛔ REPORTED FROM THE STORE, NOT FROM THE PLAN. What was intended and what the money paths
  //    actually produced are different questions, and only the second one is evidence.
  const after = await listPositionsForUser(uid, 500, "MARKET");
  const byStatus: Record<string, number> = {};
  for (const p of after) byStatus[p.status] = (byStatus[p.status] ?? 0) + 1;

  return NextResponse.json({
    ok: true,
    placed: placed.length,
    intended: plan.reduce<Record<string, number>>((a, p) => ({ ...a, [p.want]: (a[p.want] ?? 0) + 1 }), {}),
    byStatus,
    refusals,
    marketIds: placed.map((p) => p.marketId),
  });
}
