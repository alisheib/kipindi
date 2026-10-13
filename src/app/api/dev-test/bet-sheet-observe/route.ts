/** Local, read-only WP11a evidence: the session's own positions and BET_PLACED rows on one question.
 * Production and every configured database are refused before a session or a record is read. */
import { NextResponse } from "next/server";
import { currentSession } from "@/lib/server/auth-service";
import { hasDatabase } from "@/lib/server/prisma";
import { positionStore } from "@/lib/server/market-dal";
import { db } from "@/lib/server/store";

export async function GET(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ ok: false, error: "Not available" }, { status: 404 });
  }
  if (process.env.DATABASE_URL || hasDatabase()) {
    return NextResponse.json({ ok: false, error: "In-memory local evidence only" }, { status: 409 });
  }
  const session = await currentSession();
  if (!session) return NextResponse.json({ ok: false, error: "Sign in required" }, { status: 401 });
  const params = new URL(req.url).searchParams;
  const marketId = params.get("marketId");
  if (!marketId || !/^[A-Za-z0-9_-]{1,160}$/.test(marketId) || [...params.keys()].some((key) => key !== "marketId")) {
    return NextResponse.json({ ok: false, error: "One marketId required" }, { status: 400 });
  }
  const positions = (await positionStore.listForUserAndMarket(session.userId, marketId))
    .filter((position) => position.userId === session.userId && position.houseBotId == null);
  const ids = new Set(positions.map((position) => position.id));
  // This route is memory-only; read the entire own-user population rather than counting an arbitrary newest-N page.
  const transactions = (await db.txn.findByUserTypes(session.userId, ["BET_PLACED"], Number.MAX_SAFE_INTEGER))
    .filter((txn) => txn.userId === session.userId && txn.houseBotId == null && txn.positionId !== null && ids.has(txn.positionId));
  return NextResponse.json({
    ok: true, marketId, positionCount: positions.length, betPlacedCount: transactions.length,
    positions: positions.map((position) => ({ positionId: position.id, key: position.idempotencyKey ?? null })),
    transactionIds: transactions.map((txn) => txn.id),
  }, { headers: { "Cache-Control": "no-store" } });
}
