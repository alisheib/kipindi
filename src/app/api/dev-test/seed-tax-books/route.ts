/**
 * /api/dev-test/seed-tax-books — dev-only: real books in a FINISHED period, for the Government Tax
 * Report's local drive (`docs/TAX-REPORT.md` §9, `npm run qa:tax-report`).
 *
 * ⭐ WHY A DRIVE NEEDS IT. The page opens on the last COMPLETE month, and every seeder in this tree
 * writes money NOW — so a fresh local store shows an empty September, and a drive would "verify"
 * the lock, the export and the check against a period with nothing in it.
 *
 * ⭐ NOTHING IS INVENTED; ONLY TIMESTAMPS MOVE. The books are made by the REAL services —
 * `buyPosition`, `resolveMarket` + `settleMarket`, `emergencyVoidMarket`, `cashOutPosition` — exactly
 * as the product makes them (the `seed-player-portfolio` principle). Then every row this call created
 * is moved, in place and in order, into the target day: the bets and results of the closed rounds
 * onto `day` (default: the 10th of the last complete month), and one LATE round's result onto the 1st
 * of the current month, so the current month opens with stakes brought forward.
 * `defect: true` also plants a winnings record with no bet behind it (an exception to find).
 *
 * ⛔ 404 in production — checked before anything else is read.
 * ⛔ 409 when a database is configured: this rewrites the process's own memory store, never a database.
 *
 *   POST { day?: "YYYY-MM-DD", defect?: boolean }  →  { ok, day, lateDay, markets, sales, payout }
 */
import { NextResponse } from "next/server";
import { hasDatabase } from "@/lib/server/prisma";
import { db, type StoredTxn } from "@/lib/server/store";
import { positionStore, marketStore } from "@/lib/server/market-dal";
import {
  buyPosition,
  cashOutPosition,
  createMarket,
  emergencyVoidMarket,
  listPositionsForMarket,
  resolveMarket,
  settleMarket,
} from "@/lib/server/market-service";
import { randomId } from "@/lib/server/crypto";
import { eatDayStartMs } from "@/lib/eat-day";
import { isDayKey, lastCompleteMonth, monthKeyOf } from "@/lib/tax-report";

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (hasDatabase() && process.env.USE_PRISMA_DAL !== "false") {
    return NextResponse.json({ ok: false, error: "a database is configured; this drive only moves the in-memory store" }, { status: 409 });
  }
  const body = (await req.json().catch(() => ({}))) as { day?: string; defect?: boolean };
  const nowMs = Date.now();
  const last = lastCompleteMonth(nowMs);
  const day = body.day && isDayKey(body.day) ? body.day : `${last.key}-10`;
  const lateDay = `${monthKeyOf(nowMs)}-01`;
  const tag = randomId(5);
  const iso = () => new Date().toISOString();
  let seq = 0;

  const person = async (role: "PLAYER" | "ADMIN") => {
    const id = `usr_tax_${tag}_${++seq}`;
    await db.user.create({
      id, phoneE164: `+25594${String(Date.now()).slice(-5)}${String(seq).padStart(2, "0")}`, passwordHash: null, passwordSalt: null,
      failedLoginCount: 0, lockedUntil: null, role, status: "ACTIVE", locale: "EN",
      displayName: role === "ADMIN" ? `Tax officer ${seq}` : `Tax player ${seq}`, dob: null, region: null, acceptedTermsVersion: null, acceptedTermsAt: null,
      marketingOptIn: false, twoFactorEnabled: false, avatarDataUrl: null,
      createdAt: iso(), updatedAt: iso(), lastLoginAt: null, closedAt: null,
    } as never);
    await db.wallet.create({ id: `wal_${id}`, userId: id, balance: 5_000_000, pending: 0, hold: 0, currency: "TZS", status: "ACTIVE", createdAt: iso(), updatedAt: iso() } as never);
    return id;
  };
  const officerA = await person("ADMIN");
  const officerB = await person("ADMIN");
  const market = (title: string) => createMarket({
    titleEn: `${title} · tax drive ${tag}`, titleSw: "Soko", category: "macro", sourceUrl: "https://bot.go.tz",
    resolutionCriterion: "Resolves at the official date.", resolutionAt: new Date(nowMs + 7 * 864e5).toISOString(), proposedBy: "tax-drive",
  } as never);
  const bet = async (marketId: string, side: "YES" | "NO", stake: number) => {
    const uid = await person("PLAYER");
    const r = await buyPosition(uid, { marketId, side, stake });
    if (!r.ok) throw new Error(`bet refused: ${JSON.stringify(r).slice(0, 160)}`);
    return { uid, positionId: (r as { data: { positionId: string } }).data.positionId };
  };
  const settle = async (marketId: string, outcome: "YES" | "NO" | "VOID") => {
    const first = await resolveMarket({ marketId, outcome, officerId: officerA });
    if (first.ok && first.data?.stage === "stage1") await resolveMarket({ marketId, outcome, officerId: officerB });
    const s = await settleMarket(marketId, { force: true });
    if (!s.ok) throw new Error(`settle refused: ${JSON.stringify(s).slice(0, 160)}`);
  };

  try {
    const t0 = Date.now();
    const m1 = await market("Will the Bank of Tanzania hold the rate");
    await bet(m1.id, "YES", 50_000); await bet(m1.id, "YES", 30_000); await bet(m1.id, "NO", 120_000);
    const m2 = await market("Will the shilling close above 2,600");
    await bet(m2.id, "YES", 40_000); await bet(m2.id, "YES", 60_000);
    const m3 = await market("Will the ferry timetable change");
    await bet(m3.id, "YES", 25_000); await bet(m3.id, "NO", 15_000);
    const m4 = await market("Will the port clear 300 vessels");
    const exit = await bet(m4.id, "NO", 20_000);
    const m5 = await market("Will Simba win the derby");
    await bet(m5.id, "YES", 70_000); await bet(m5.id, "NO", 30_000);
    const m6 = await market("BTC up or down");
    await bet(m6.id, "YES", 10_000); await bet(m6.id, "NO", 10_500);
    { const m = await marketStore.get(m6.id); await marketStore.set({ ...m!, productLine: "UPDOWN" } as never); }
    const m7 = await market("Will rainfall exceed 50mm");
    await bet(m7.id, "YES", 35_000); await bet(m7.id, "NO", 15_000);
    await settle(m1.id, "NO");
    await settle(m2.id, "YES");
    const ev = await emergencyVoidMarket({ marketId: m3.id, officerId: officerA, reason: "Source withdrew the timetable (tax drive)" });
    if (!ev.ok) throw new Error(`void refused: ${JSON.stringify(ev).slice(0, 160)}`);
    const co = await cashOutPosition(exit.uid, exit.positionId);
    if (!co.ok) throw new Error(`exit refused: ${JSON.stringify(co).slice(0, 160)}`);
    await settle(m6.id, "YES");
    await settle(m7.id, "YES");
    const tMain = Date.now();
    await settle(m5.id, "YES"); // the LATE round — its result moves to the next month
    const tLate = Date.now();

    if (body.defect) {
      await db.txn.create({
        id: `txn_tax_defect_${tag}`, walletId: `wal_${officerA}`, userId: officerA, type: "BET_PAYOUT", status: "CONFIRMED",
        amount: 19_999, fee: 0, taxWithheld: 0, balanceAfter: null, currency: "TZS", provider: "INTERNAL", providerRef: null,
        msisdn: null, description: "Planted by the tax drive: winnings with no bet", positionId: `pos_missing_${tag}`, amlReason: null,
        createdAt: new Date(tMain - 1).toISOString(), updatedAt: iso(), completedAt: iso(),
      } as StoredTxn);
    }

    // ── Move every row this call made: [t0, tMain) → the target day; [tMain, tLate] → the 1st of this month.
    const mainTo = eatDayStartMs(day) + 10 * 3_600_000;       // 10:00 EAT on the target day
    const lateTo = eatDayStartMs(lateDay) + 9 * 3_600_000;    // 09:00 EAT on the 1st
    const shiftOf = (ms: number) => (ms < tMain ? mainTo - t0 : lateTo - tMain);
    const move = (v: string | null | undefined) => (v ? new Date(Date.parse(v) + shiftOf(Date.parse(v))).toISOString() : v ?? null);
    const marketIds = [m1.id, m2.id, m3.id, m4.id, m5.id, m6.id, m7.id];
    const positionIds = new Set<string>();
    for (const id of marketIds) {
      for (const p of await listPositionsForMarket(id)) {
        positionIds.add(p.id);
        const stored = await positionStore.get(p.id);
        if (!stored) continue;
        // A bet keeps its own placing shift even when its round resulted late.
        const placed = Date.parse(stored.placedAt);
        stored.placedAt = new Date(placed + (mainTo - t0)).toISOString();
        if (stored.settledAt) stored.settledAt = move(stored.settledAt);
        await positionStore.set(stored);
      }
      const m = await marketStore.get(id);
      if (m) {
        await marketStore.set({
          ...m,
          createdAt: new Date(Date.parse(m.createdAt) + (mainTo - t0)).toISOString(),
          settledAt: move(m.settledAt),
          resolutionStage1At: move(m.resolutionStage1At),
          resolutionStage2At: move(m.resolutionStage2At),
        } as never);
      }
    }
    // The money records: in place (the memory store hands back its own objects).
    for (const t of (await db.txn.listInRange(t0 - 1, tLate + 1)) as StoredTxn[]) {
      if (!(t.positionId && positionIds.has(t.positionId)) && t.id !== `txn_tax_defect_${tag}`) continue;
      const at = Date.parse(t.createdAt);
      t.createdAt = new Date(at + shiftOf(at)).toISOString();
      t.updatedAt = t.createdAt;
      if (t.completedAt) t.completedAt = t.createdAt;
    }
    return NextResponse.json({ ok: true, day, lateDay, markets: marketIds, defect: !!body.defect });
  } catch (err) {
    return NextResponse.json({ ok: false, error: String((err as Error)?.message ?? err) }, { status: 500 });
  }
}
